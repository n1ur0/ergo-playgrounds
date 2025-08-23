import React, { type ReactNode } from 'react';
import ErrorBoundary, { useErrorHandler } from './ErrorBoundary';
import type { ErrorDetails } from './errorBoundaryTypes';
import type { ContractComponent, Connection } from '../../types/contractDesigner';

// Specialized error fallback for contract designer
interface ContractDesignerErrorFallbackProps {
  error: ErrorDetails;
  retry: () => void;
  context?: {
    componentCount?: number;
    connectionCount?: number;
    selectedComponent?: string;
    lastAction?: string;
  };
}

const ContractDesignerErrorFallback: React.FC<ContractDesignerErrorFallbackProps> = ({
  error,
  retry,
  context
}) => {
  const { reportError } = useErrorHandler();

  const handleSaveState = () => {
    try {
      // Attempt to save current state to localStorage before retry
      const currentState = {
        timestamp: new Date().toISOString(),
        context,
        error: {
          message: error.message,
          severity: error.severity
        }
      };
      
      localStorage.setItem('contract-designer-error-state', JSON.stringify(currentState));
      retry();
    } catch (saveError) {
      reportError(saveError as Error, { 
        context: 'Failed to save state during error recovery',
        originalError: error.message 
      });
      // Fallback to simple retry
      retry();
    }
  };

  const handleResetWorkspace = () => {
    try {
      // Clear any corrupted state
      localStorage.removeItem('ergo-playgrounds-contract-state');
      localStorage.removeItem('ergo-playgrounds-contract-state-scenarios');
      window.location.reload();
    } catch (resetError) {
      reportError(resetError as Error, { 
        context: 'Failed to reset workspace',
        originalError: error.message 
      });
    }
  };

  const getSuggestions = () => {
    const suggestions = [];
    
    if (error.message.includes('Cannot read property') || error.message.includes('undefined')) {
      suggestions.push('This might be caused by corrupted component data. Try resetting the workspace.');
    }
    
    if (error.message.includes('JSON')) {
      suggestions.push('There may be an issue with saved contract data. Consider resetting the workspace.');
    }
    
    if (error.message.includes('canvas') || error.message.includes('rendering')) {
      suggestions.push('Try zooming out or resetting the canvas view.');
    }
    
    if (context?.componentCount && context.componentCount > 20) {
      suggestions.push('Large number of components detected. Consider simplifying your contract design.');
    }
    
    return suggestions;
  };

  return (
    <div className="contract-designer-error">
      <div className="error-container">
        <div className="error-header">
          <div className="error-icon">🛠️</div>
          <div className="error-title">
            <h2>Contract Designer Error</h2>
            <p className="error-severity severity-{error.severity}">
              Severity: {error.severity.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="error-content">
          <div className="error-message">
            <h3>What happened?</h3>
            <p>{error.message}</p>
          </div>

          {context && (
            <div className="error-context">
              <h3>Contract State</h3>
              <div className="context-details">
                {context.componentCount !== undefined && (
                  <div className="context-item">
                    <span className="context-label">Components:</span>
                    <span className="context-value">{context.componentCount}</span>
                  </div>
                )}
                {context.connectionCount !== undefined && (
                  <div className="context-item">
                    <span className="context-label">Connections:</span>
                    <span className="context-value">{context.connectionCount}</span>
                  </div>
                )}
                {context.selectedComponent && (
                  <div className="context-item">
                    <span className="context-label">Selected:</span>
                    <span className="context-value">{context.selectedComponent}</span>
                  </div>
                )}
                {context.lastAction && (
                  <div className="context-item">
                    <span className="context-label">Last Action:</span>
                    <span className="context-value">{context.lastAction}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="error-suggestions">
            <h3>Suggestions</h3>
            <ul>
              {getSuggestions().map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
              <li>If the problem persists, try refreshing the page or contact support.</li>
            </ul>
          </div>

          <div className="error-actions">
            <button onClick={handleSaveState} className="action-button primary">
              🔄 Try Again
            </button>
            <button onClick={handleResetWorkspace} className="action-button secondary">
              🗑️ Reset Workspace
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="action-button tertiary"
            >
              🔃 Reload Page
            </button>
          </div>

          <div className="error-details">
            <details>
              <summary>Technical Details</summary>
              <div className="technical-info">
                <div className="info-row">
                  <span className="info-label">Error ID:</span>
                  <span className="info-value">{Date.now()}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Timestamp:</span>
                  <span className="info-value">{error.timestamp.toLocaleString()}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">User Agent:</span>
                  <span className="info-value">{error.userAgent}</span>
                </div>
                {error.stack && (
                  <div className="info-row">
                    <span className="info-label">Stack Trace:</span>
                    <pre className="stack-trace">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

// Props for the contract designer error boundary
interface ContractDesignerErrorBoundaryProps {
  children: ReactNode;
  components?: ContractComponent[];
  connections?: Connection[];
  selectedComponent?: string | null;
  lastAction?: string;
  onError?: (error: ErrorDetails, errorId: string) => void;
}

// Specialized error boundary for contract designer
export const ContractDesignerErrorBoundary: React.FC<ContractDesignerErrorBoundaryProps> = ({
  children,
  components = [],
  connections = [],
  selectedComponent,
  lastAction,
  onError
}) => {
  const handleError = (error: ErrorDetails, errorId: string) => {
    // Add contract-specific context to error
    const enhancedError = {
      ...error,
      additionalInfo: {
        ...error.additionalInfo,
        contractContext: {
          componentCount: components.length,
          connectionCount: connections.length,
          selectedComponent: selectedComponent || 'none',
          lastAction: lastAction || 'unknown',
          componentTypes: components.map(c => c.type),
          hasConnections: connections.length > 0,
          complexity: components.length + connections.length * 0.5
        }
      }
    };

    // Call provided error handler
    if (onError) {
      onError(enhancedError, errorId);
    }

    // Additional contract-specific error logging
    console.group('🎨 Contract Designer Error Details');
    console.log('Components:', components.length);
    console.log('Connections:', connections.length);
    console.log('Selected Component:', selectedComponent);
    console.log('Last Action:', lastAction);
    console.groupEnd();
  };

  const fallback = (error: ErrorDetails, retry: () => void) => (
    <ContractDesignerErrorFallback
      error={error}
      retry={retry}
      context={{
        componentCount: components.length,
        connectionCount: connections.length,
        selectedComponent: selectedComponent || undefined,
        lastAction
      }}
    />
  );

  return (
    <ErrorBoundary
      fallback={fallback}
      onError={handleError}
      level="section"
      maxRetries={2}
      resetOnPropsChange={true}
      resetKeys={[components.length, connections.length]}
    >
      {children}
    </ErrorBoundary>
  );
};

// Hook for contract designer error handling
export function useContractDesignerErrorHandler() {
  const { reportError } = useErrorHandler();

  const reportContractError = React.useCallback((
    error: Error | string,
    context: {
      action?: string;
      componentType?: string;
      componentId?: string;
      additionalData?: any;
    }
  ) => {
    reportError(error, {
      context: 'contract-designer',
      action: context.action,
      componentType: context.componentType,
      componentId: context.componentId,
      additionalData: context.additionalData,
      timestamp: Date.now()
    });
  }, [reportError]);

  return { reportContractError };
}

// CSS styles for contract designer error boundary
export const contractDesignerErrorStyles = `
.contract-designer-error {
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.error-container {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  color: #333;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.error-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
}

.error-icon {
  font-size: 3rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.error-title h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.5rem;
}

.error-severity {
  margin: 0;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.severity-low { background: #d4edda; color: #155724; }
.severity-medium { background: #fff3cd; color: #856404; }
.severity-high { background: #f8d7da; color: #721c24; }
.severity-critical { background: #d1ecf1; color: #0c5460; }

.error-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.error-message h3,
.error-context h3,
.error-suggestions h3 {
  margin: 0 0 1rem 0;
  color: #495057;
  font-size: 1.1rem;
}

.error-message p {
  margin: 0;
  color: #6c757d;
  line-height: 1.5;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  border-left: 4px solid #dc3545;
}

.context-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.context-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.context-label {
  font-weight: 500;
  color: #495057;
}

.context-value {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: #6c757d;
  font-size: 0.9rem;
}

.error-suggestions ul {
  margin: 0;
  padding-left: 1.5rem;
  list-style-type: none;
}

.error-suggestions li {
  margin-bottom: 0.5rem;
  color: #6c757d;
  line-height: 1.5;
  position: relative;
}

.error-suggestions li::before {
  content: '💡';
  position: absolute;
  left: -1.5rem;
}

.error-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-button.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.action-button.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.action-button.secondary {
  background: #6c757d;
  color: white;
}

.action-button.secondary:hover {
  background: #5a6268;
  transform: translateY(-1px);
}

.action-button.tertiary {
  background: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
}

.action-button.tertiary:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.error-details {
  margin-top: 1rem;
}

.error-details details {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 1rem;
}

.error-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #495057;
  margin-bottom: 1rem;
}

.technical-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-weight: 500;
  color: #495057;
  font-size: 0.9rem;
}

.info-value {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: #6c757d;
  font-size: 0.8rem;
  background: white;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.stack-trace {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .contract-designer-error {
    padding: 1rem;
  }
  
  .error-container {
    padding: 1.5rem;
  }
  
  .error-header {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
  
  .context-details {
    grid-template-columns: 1fr;
  }
  
  .error-actions {
    flex-direction: column;
  }
  
  .action-button {
    justify-content: center;
  }
}
`;

export default ContractDesignerErrorBoundary;