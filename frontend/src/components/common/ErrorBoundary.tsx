import React, { Component, type ErrorInfo, type ReactNode } from 'react';

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Error details interface
export interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  severity: ErrorSeverity;
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  additionalInfo?: Record<string, unknown>;
}

// Error boundary state interface
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

// Error boundary props interface
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: ErrorDetails, retry: () => void) => ReactNode;
  onError?: (error: ErrorDetails, errorId: string) => void;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

// Error logging service
class ErrorLogger {
  private static instance: ErrorLogger | null = null;
  private errors: Map<string, ErrorDetails> = new Map();
  private maxErrors = 100;

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  logError(error: ErrorDetails, errorId: string): void {
    // Add to local storage for debugging
    this.errors.set(errorId, error);
    
    // Keep only the most recent errors
    if (this.errors.size > this.maxErrors) {
      const oldestKey = this.errors.keys().next().value;
      this.errors.delete(oldestKey);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔴 Error ${errorId}`);
      console.error('Message:', error.message);
      console.error('Severity:', error.severity);
      console.error('Timestamp:', error.timestamp);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
      if (error.componentStack) {
        console.error('Component Stack:', error.componentStack);
      }
      if (error.additionalInfo) {
        console.error('Additional Info:', error.additionalInfo);
      }
      console.groupEnd();
    }

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorService(error, errorId);
    }
  }

  private async sendToErrorService(error: ErrorDetails, errorId: string): Promise<void> {
    try {
      // Replace with your actual error reporting service
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorId,
          ...error,
        }),
      });
    } catch (reportingError) {
      console.warn('Failed to report error to service:', reportingError);
    }
  }

  getErrors(): ErrorDetails[] {
    return Array.from(this.errors.values());
  }

  clearErrors(): void {
    this.errors.clear();
  }

  getErrorById(errorId: string): ErrorDetails | undefined {
    return this.errors.get(errorId);
  }
}

// Utility functions
function generateErrorId(): string {
  return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function determineErrorSeverity(error: Error): ErrorSeverity {
  const message = error.message.toLowerCase();
  
  if (message.includes('chunkloaderror') || message.includes('loading chunk')) {
    return 'low'; // Network/loading issues
  }
  
  if (message.includes('permission') || message.includes('unauthorized')) {
    return 'medium'; // Permission issues
  }
  
  if (message.includes('typeerror') || message.includes('referenceerror')) {
    return 'high'; // Code errors
  }
  
  if (message.includes('out of memory') || message.includes('quota exceeded')) {
    return 'critical'; // System issues
  }
  
  return 'medium'; // Default severity
}

function createErrorDetails(
  error: Error, 
  errorInfo: ErrorInfo, 
  additionalInfo?: Record<string, unknown>
): ErrorDetails {
  return {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    severity: determineErrorSeverity(error),
    timestamp: new Date(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    additionalInfo
  };
}

// Default fallback components
interface FallbackProps {
  error: ErrorDetails;
  retry: () => void;
}

const DefaultErrorFallback: React.FC<FallbackProps> = ({ error, retry }) => (
  <div className="error-boundary-fallback">
    <div className="error-boundary-content">
      <div className="error-icon">⚠️</div>
      <h2>Something went wrong</h2>
      <p>We encountered an unexpected error. This has been logged and we're working to fix it.</p>
      
      <div className="error-details">
        <details>
          <summary>Error Details</summary>
          <div className="error-info">
            <p><strong>Message:</strong> {error.message}</p>
            <p><strong>Severity:</strong> {error.severity}</p>
            <p><strong>Time:</strong> {error.timestamp.toLocaleString()}</p>
          </div>
        </details>
      </div>
      
      <div className="error-actions">
        <button onClick={retry} className="retry-button">
          Try Again
        </button>
        <button 
          onClick={() => window.location.reload()} 
          className="reload-button"
        >
          Reload Page
        </button>
      </div>
    </div>
  </div>
);

const ComponentErrorFallback: React.FC<FallbackProps> = ({ error, retry }) => (
  <div className="component-error-fallback">
    <div className="error-message">
      <span className="error-icon">⚠️</span>
      <span>Component failed to load</span>
      <button onClick={retry} className="retry-button-small">
        Retry
      </button>
    </div>
  </div>
);

const SectionErrorFallback: React.FC<FallbackProps> = ({ error, retry }) => (
  <div className="section-error-fallback">
    <div className="error-content">
      <div className="error-header">
        <span className="error-icon">⚠️</span>
        <h3>Section Unavailable</h3>
      </div>
      <p>This section encountered an error and couldn't load properly.</p>
      <button onClick={retry} className="retry-button">
        Try Again
      </button>
    </div>
  </div>
);

// Main ErrorBoundary component
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;
  private errorLogger = ErrorLogger.getInstance();

  static defaultProps: Partial<ErrorBoundaryProps> = {
    maxRetries: 3,
    resetOnPropsChange: true,
    isolate: false,
    level: 'component'
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorId = generateErrorId();
    const errorDetails = createErrorDetails(error, errorInfo, {
      retryCount: this.state.retryCount,
      level: this.props.level,
      resetKeys: this.props.resetKeys
    });

    this.setState({
      errorInfo,
      errorId
    });

    // Log the error
    this.errorLogger.logError(errorDetails, errorId);

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(errorDetails, errorId);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange) {
      if (resetKeys) {
        // Check if any reset keys have changed
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => key !== prevProps.resetKeys?.[index]
        );
        
        if (hasResetKeyChanged) {
          this.resetBoundary();
        }
      }
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetBoundary = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    });
  };

  retry = (): void => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      // Max retries reached, reload the page
      window.location.reload();
    }
  };

  getFallbackComponent(): React.ComponentType<FallbackProps> {
    const { level = 'component' } = this.props;
    
    switch (level) {
      case 'page':
        return DefaultErrorFallback;
      case 'section':
        return SectionErrorFallback;
      case 'component':
      default:
        return ComponentErrorFallback;
    }
  }

  render(): ReactNode {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error && errorInfo) {
      const errorDetails = createErrorDetails(error, errorInfo);
      
      if (fallback) {
        return fallback(errorDetails, this.retry);
      }

      const FallbackComponent = this.getFallbackComponent();
      return <FallbackComponent error={errorDetails} retry={this.retry} />;
    }

    return children;
  }
}

// Higher-order component for adding error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error reporting
export function useErrorHandler() {
  const errorLogger = ErrorLogger.getInstance();

  const reportError = React.useCallback((
    error: Error | string,
    additionalInfo?: Record<string, unknown>
  ) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const errorId = generateErrorId();
    const errorDetails = createErrorDetails(
      errorObj,
      { componentStack: '' },
      additionalInfo
    );

    errorLogger.logError(errorDetails, errorId);
  }, [errorLogger]);

  return { reportError, errorLogger };
}

// Context for error boundary configuration
export const ErrorBoundaryContext = React.createContext<{
  onError?: (error: ErrorDetails, errorId: string) => void;
  maxRetries?: number;
}>({});

// Provider component for error boundary configuration
export const ErrorBoundaryProvider: React.FC<{
  children: ReactNode;
  onError?: (error: ErrorDetails, errorId: string) => void;
  maxRetries?: number;
}> = ({ children, onError, maxRetries }) => (
  <ErrorBoundaryContext.Provider value={{ onError, maxRetries }}>
    {children}
  </ErrorBoundaryContext.Provider>
);

// CSS styles (to be imported)
export const errorBoundaryStyles = `
.error-boundary-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
}

.error-boundary-content {
  max-width: 500px;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-boundary-content h2 {
  color: #dc3545;
  margin-bottom: 1rem;
}

.error-boundary-content p {
  color: #6c757d;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.error-details {
  margin: 1.5rem 0;
  text-align: left;
}

.error-details details {
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 1rem;
}

.error-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #495057;
}

.error-info {
  margin-top: 1rem;
  font-family: monospace;
  font-size: 0.875rem;
  color: #6c757d;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.retry-button,
.reload-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button {
  background: #007bff;
  color: white;
}

.retry-button:hover {
  background: #0056b3;
}

.reload-button {
  background: #6c757d;
  color: white;
}

.reload-button:hover {
  background: #545b62;
}

.component-error-fallback {
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  margin: 0.5rem 0;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #856404;
}

.retry-button-small {
  padding: 0.25rem 0.5rem;
  background: #ffc107;
  border: none;
  border-radius: 3px;
  font-size: 0.75rem;
  cursor: pointer;
  color: #212529;
}

.retry-button-small:hover {
  background: #e0a800;
}

.section-error-fallback {
  padding: 2rem;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  margin: 1rem 0;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.error-header h3 {
  margin: 0;
  color: #721c24;
}

.section-error-fallback p {
  color: #721c24;
  margin-bottom: 1.5rem;
}
`;

export default ErrorBoundary;