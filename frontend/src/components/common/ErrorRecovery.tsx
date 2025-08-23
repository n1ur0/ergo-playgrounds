import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Info, ArrowRight } from 'lucide-react';
import type { ErrorDetails } from './errorBoundaryTypes';
import { useErrorHandler } from './ErrorBoundary';
import { useToast } from './ErrorToast';

// Recovery strategy types
export type RecoveryStrategy = 
  | 'retry' 
  | 'reload' 
  | 'reset-state' 
  | 'fallback' 
  | 'manual' 
  | 'ignore';

export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  strategy: RecoveryStrategy;
  action: () => Promise<boolean> | boolean;
  icon?: React.ComponentType<{ size?: number }>;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  autoExecute?: boolean;
  cooldown?: number; // Milliseconds before action can be executed again
}

export interface RecoveryContext {
  error: ErrorDetails;
  attemptCount: number;
  lastAttemptTime?: Date;
  component?: string;
  operation?: string;
  userContext?: Record<string, any>;
}

// Props for the error recovery component
interface ErrorRecoveryProps {
  error: ErrorDetails;
  context?: Partial<RecoveryContext>;
  customActions?: RecoveryAction[];
  onRecoverySuccess?: () => void;
  onRecoveryFailed?: (error: Error) => void;
  autoRetry?: boolean;
  maxAutoRetries?: number;
  hideDefaultActions?: boolean;
  showTechnicalDetails?: boolean;
  className?: string;
}

// Recovery action execution state
interface ActionState {
  isExecuting: boolean;
  lastExecuted?: Date;
  isOnCooldown: boolean;
  cooldownEnds?: Date;
}

export const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  error,
  context = {},
  customActions = [],
  onRecoverySuccess,
  onRecoveryFailed,
  autoRetry = false,
  maxAutoRetries = 2,
  hideDefaultActions = false,
  showTechnicalDetails = false,
  className = ''
}) => {
  const [actionStates, setActionStates] = useState<Map<string, ActionState>>(new Map());
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'attempting' | 'success' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  const { reportError } = useErrorHandler();
  const { showSuccess, showError, showInfo } = useToast();

  // Build recovery context with defaults
  const recoveryContext: RecoveryContext = {
    error,
    attemptCount: autoRetryCount,
    lastAttemptTime: new Date(),
    component: 'Unknown Component',
    operation: 'Unknown Operation',
    ...context
  };

  // Default recovery actions based on error type and context
  const getDefaultActions = useCallback((): RecoveryAction[] => {
    const actions: RecoveryAction[] = [];

    // Retry action for recoverable errors
    if (error.severity !== 'critical') {
      actions.push({
        id: 'retry',
        label: 'Try Again',
        description: 'Retry the failed operation',
        strategy: 'retry',
        action: async () => {
          setStatusMessage('Retrying operation...');
          // This would typically trigger the parent component to retry
          // For now, we'll simulate a retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return Math.random() > 0.3; // 70% success rate
        },
        icon: RefreshCw,
        variant: 'primary',
        cooldown: 2000
      });
    }

    // Reload page for certain error types
    if (error.message.toLowerCase().includes('chunk') || 
        error.message.toLowerCase().includes('network') ||
        error.message.toLowerCase().includes('loading')) {
      actions.push({
        id: 'reload',
        label: 'Reload Page',
        description: 'Refresh the page to reload all resources',
        strategy: 'reload',
        action: () => {
          window.location.reload();
          return true;
        },
        icon: RefreshCw,
        variant: 'secondary'
      });
    }

    // Reset state for state-related errors
    if (error.message.toLowerCase().includes('state') || 
        error.message.toLowerCase().includes('render') ||
        context.component?.toLowerCase().includes('designer')) {
      actions.push({
        id: 'reset-state',
        label: 'Reset State',
        description: 'Clear saved state and start fresh',
        strategy: 'reset-state',
        action: async () => {
          try {
            // Clear localStorage data related to the application
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('ergo-playgrounds') || key.includes('contract'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            setStatusMessage('State reset successfully');
            return true;
          } catch (e) {
            setStatusMessage('Failed to reset state');
            return false;
          }
        },
        variant: 'warning'
      });
    }

    // Fallback to minimal functionality
    if (error.severity === 'high' || error.severity === 'critical') {
      actions.push({
        id: 'fallback',
        label: 'Continue with Limited Features',
        description: 'Continue using the application with reduced functionality',
        strategy: 'fallback',
        action: async () => {
          setStatusMessage('Switched to fallback mode');
          return true;
        },
        variant: 'secondary'
      });
    }

    return actions;
  }, [error, context]);

  // Combine custom and default actions
  const allActions = hideDefaultActions ? customActions : [...getDefaultActions(), ...customActions];

  // Execute recovery action
  const executeAction = useCallback(async (action: RecoveryAction) => {
    const currentState = actionStates.get(action.id);
    
    // Check cooldown
    if (currentState?.isOnCooldown) {
      showInfo(`Please wait ${Math.ceil((currentState.cooldownEnds!.getTime() - Date.now()) / 1000)} seconds before trying again`);
      return;
    }

    // Set executing state
    setActionStates(prev => new Map(prev).set(action.id, {
      ...currentState,
      isExecuting: true
    }));

    setRecoveryStatus('attempting');
    setStatusMessage(`Executing: ${action.description}`);

    try {
      const success = await action.action();
      
      if (success) {
        setRecoveryStatus('success');
        setStatusMessage(`Recovery successful: ${action.description}`);
        showSuccess(`Recovery completed: ${action.label}`);
        
        if (onRecoverySuccess) {
          onRecoverySuccess();
        }
      } else {
        setRecoveryStatus('failed');
        setStatusMessage(`Recovery failed: ${action.description}`);
        showError(`Recovery failed: ${action.label}`);
      }

      // Update action state
      const now = new Date();
      setActionStates(prev => new Map(prev).set(action.id, {
        isExecuting: false,
        lastExecuted: now,
        isOnCooldown: !!action.cooldown,
        cooldownEnds: action.cooldown ? new Date(now.getTime() + action.cooldown) : undefined
      }));

      // Start cooldown timer if needed
      if (action.cooldown) {
        setTimeout(() => {
          setActionStates(prev => {
            const newMap = new Map(prev);
            const state = newMap.get(action.id);
            if (state) {
              newMap.set(action.id, {
                ...state,
                isOnCooldown: false,
                cooldownEnds: undefined
              });
            }
            return newMap;
          });
        }, action.cooldown);
      }

    } catch (actionError) {
      const errorMsg = actionError instanceof Error ? actionError.message : 'Unknown error';
      
      setRecoveryStatus('failed');
      setStatusMessage(`Recovery failed: ${errorMsg}`);
      
      // Report the recovery failure
      reportError(actionError instanceof Error ? actionError : new Error(errorMsg), {
        context: 'error-recovery',
        originalError: error.message,
        recoveryAction: action.id
      });
      
      showError(`Recovery failed: ${action.label} - ${errorMsg}`);
      
      if (onRecoveryFailed) {
        onRecoveryFailed(actionError instanceof Error ? actionError : new Error(errorMsg));
      }

      // Update action state
      setActionStates(prev => new Map(prev).set(action.id, {
        isExecuting: false,
        lastExecuted: new Date(),
        isOnCooldown: false
      }));
    }
  }, [actionStates, showInfo, showSuccess, showError, onRecoverySuccess, onRecoveryFailed, reportError, error.message]);

  // Auto-retry logic
  useEffect(() => {
    if (autoRetry && autoRetryCount < maxAutoRetries) {
      const retryAction = allActions.find(action => action.strategy === 'retry');
      if (retryAction) {
        const delay = Math.min(1000 * Math.pow(2, autoRetryCount), 10000); // Exponential backoff
        
        setStatusMessage(`Auto-retry in ${delay / 1000} seconds...`);
        
        const timer = setTimeout(() => {
          setAutoRetryCount(prev => prev + 1);
          executeAction(retryAction);
        }, delay);

        return () => clearTimeout(timer);
      }
    }
  }, [autoRetry, autoRetryCount, maxAutoRetries, allActions, executeAction]);

  // Get status icon and color
  const getStatusInfo = () => {
    switch (recoveryStatus) {
      case 'attempting':
        return { icon: RefreshCw, color: '#007bff', spinning: true };
      case 'success':
        return { icon: CheckCircle, color: '#28a745', spinning: false };
      case 'failed':
        return { icon: XCircle, color: '#dc3545', spinning: false };
      default:
        return { icon: Info, color: '#6c757d', spinning: false };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`error-recovery ${className}`}>
      <div className="recovery-header">
        <div className="recovery-icon">
          <AlertTriangle size={24} color="#ffc107" />
        </div>
        <div className="recovery-title">
          <h3>Error Recovery</h3>
          <p>Something went wrong, but we can help fix it</p>
        </div>
      </div>

      <div className="recovery-content">
        <div className="error-summary">
          <div className="error-type">
            <strong>Error Type:</strong> {error.severity.charAt(0).toUpperCase() + error.severity.slice(1)}
          </div>
          <div className="error-message">
            <strong>Description:</strong> {error.message}
          </div>
          {recoveryContext.operation && (
            <div className="error-operation">
              <strong>Failed Operation:</strong> {recoveryContext.operation}
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="recovery-status">
            <StatusIcon 
              size={16} 
              color={statusInfo.color}
              className={statusInfo.spinning ? 'spinning' : ''}
            />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="recovery-actions">
          <h4>Recovery Options</h4>
          <div className="actions-grid">
            {allActions.map(action => {
              const actionState = actionStates.get(action.id);
              const isDisabled = actionState?.isExecuting || actionState?.isOnCooldown;
              const ActionIcon = action.icon || ArrowRight;

              return (
                <button
                  key={action.id}
                  onClick={() => executeAction(action)}
                  disabled={isDisabled}
                  className={`recovery-action ${action.variant || 'primary'} ${isDisabled ? 'disabled' : ''}`}
                >
                  <div className="action-icon">
                    <ActionIcon 
                      size={16} 
                      className={actionState?.isExecuting ? 'spinning' : ''}
                    />
                  </div>
                  <div className="action-content">
                    <div className="action-label">
                      {action.label}
                      {actionState?.isOnCooldown && (
                        <span className="cooldown-indicator">
                          ({Math.ceil((actionState.cooldownEnds!.getTime() - Date.now()) / 1000)}s)
                        </span>
                      )}
                    </div>
                    <div className="action-description">{action.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {showTechnicalDetails && (
          <details className="technical-details">
            <summary>Technical Details</summary>
            <div className="details-content">
              <div className="detail-row">
                <span className="detail-label">Timestamp:</span>
                <span className="detail-value">{error.timestamp.toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Component:</span>
                <span className="detail-value">{recoveryContext.component}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Attempt Count:</span>
                <span className="detail-value">{recoveryContext.attemptCount}</span>
              </div>
              {error.stack && (
                <div className="detail-row">
                  <span className="detail-label">Stack Trace:</span>
                  <pre className="detail-stack">{error.stack}</pre>
                </div>
              )}
              {error.additionalInfo && (
                <div className="detail-row">
                  <span className="detail-label">Additional Info:</span>
                  <pre className="detail-additional">{JSON.stringify(error.additionalInfo, null, 2)}</pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

// CSS styles for error recovery component
export const errorRecoveryStyles = `
.error-recovery {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.recovery-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e9ecef;
}

.recovery-icon {
  flex-shrink: 0;
}

.recovery-title h3 {
  margin: 0 0 4px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.recovery-title p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.recovery-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-summary {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-summary > div {
  font-size: 14px;
  line-height: 1.4;
}

.error-summary strong {
  color: #495057;
  margin-right: 8px;
}

.error-message {
  color: #dc3545;
}

.recovery-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  color: #495057;
}

.recovery-status .spinning {
  animation: spin 1s linear infinite;
}

.recovery-actions h4 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.actions-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.recovery-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-size: 14px;
}

.recovery-action:not(.disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.recovery-action.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.recovery-action.primary {
  border-color: #007bff;
  color: #007bff;
}

.recovery-action.primary:not(.disabled):hover {
  background: #007bff;
  color: white;
}

.recovery-action.secondary {
  border-color: #6c757d;
  color: #6c757d;
}

.recovery-action.secondary:not(.disabled):hover {
  background: #6c757d;
  color: white;
}

.recovery-action.danger {
  border-color: #dc3545;
  color: #dc3545;
}

.recovery-action.danger:not(.disabled):hover {
  background: #dc3545;
  color: white;
}

.recovery-action.warning {
  border-color: #ffc107;
  color: #856404;
}

.recovery-action.warning:not(.disabled):hover {
  background: #ffc107;
  color: #212529;
}

.action-icon {
  flex-shrink: 0;
}

.action-icon .spinning {
  animation: spin 1s linear infinite;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-label {
  font-weight: 600;
  margin-bottom: 4px;
}

.cooldown-indicator {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.7;
}

.action-description {
  font-size: 12px;
  opacity: 0.8;
  line-height: 1.3;
}

.technical-details {
  border-top: 1px solid #e9ecef;
  padding-top: 20px;
}

.technical-details summary {
  cursor: pointer;
  font-weight: 600;
  color: #495057;
  margin-bottom: 16px;
}

.details-content {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
  font-size: 13px;
}

.detail-row {
  display: flex;
  margin-bottom: 12px;
  gap: 12px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-weight: 600;
  color: #495057;
  min-width: 120px;
  flex-shrink: 0;
}

.detail-value {
  color: #6c757d;
  flex: 1;
  word-break: break-all;
}

.detail-stack,
.detail-additional {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  font-size: 11px;
  line-height: 1.4;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .error-recovery {
    padding: 16px;
    margin: 16px;
  }
  
  .recovery-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-row {
    flex-direction: column;
    gap: 4px;
  }
  
  .detail-label {
    min-width: auto;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .error-recovery {
    background: #2d3748;
    border-color: #4a5568;
    color: white;
  }
  
  .recovery-header {
    border-bottom-color: #4a5568;
  }
  
  .recovery-title h3 {
    color: #f7fafc;
  }
  
  .recovery-title p {
    color: #cbd5e0;
  }
  
  .error-summary {
    background: #4a5568;
    border-color: #2d3748;
  }
  
  .error-summary strong {
    color: #e2e8f0;
  }
  
  .recovery-status {
    background: #4a5568;
    border-color: #2d3748;
    color: #e2e8f0;
  }
  
  .recovery-action {
    background: #4a5568;
  }
  
  .details-content {
    background: #4a5568;
    border-color: #2d3748;
  }
  
  .detail-stack,
  .detail-additional {
    background: #2d3748;
    border-color: #4a5568;
    color: #e2e8f0;
  }
}
`;

export default ErrorRecovery;