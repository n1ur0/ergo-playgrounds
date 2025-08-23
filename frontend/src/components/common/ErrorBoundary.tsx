import React, { Component, type ReactNode } from 'react';
import type { ErrorBoundaryProps, ErrorBoundaryState, ErrorDetails, FallbackProps } from './errorBoundaryTypes';
import { generateErrorId, createErrorDetails } from './errorBoundaryUtils';

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
      if (oldestKey !== undefined) {
        this.errors.delete(oldestKey);
      }
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

// Default fallback components
const DefaultErrorFallback: React.FC<FallbackProps> = ({ error, retry }) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return (
    <div className="error-boundary-fallback">
      <div className="error-boundary-content">
        <div className="error-icon">⚠️</div>
        <h2>Something went wrong</h2>
        <p>We encountered an unexpected error. This has been logged and we're working to fix it.</p>
        
        {/* Only show error details in development */}
        {!isProduction && (
          <div className="error-details">
            <details>
              <summary>Error Details (Development Only)</summary>
              <div className="error-info">
                <p><strong>Message:</strong> {error.message}</p>
                <p><strong>Severity:</strong> {error.severity}</p>
                <p><strong>Time:</strong> {error.timestamp.toLocaleString()}</p>
                {error.stack && (
                  <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '200px' }}>
                    <strong>Stack:</strong> {error.stack}
                  </pre>
                )}
              </div>
            </details>
          </div>
        )}
        
        {/* In production, only show generic error message */}
        {isProduction && (
          <div className="error-message-production">
            <p><strong>Error:</strong> {error.message}</p>
            <p><strong>Time:</strong> {error.timestamp.toLocaleString()}</p>
          </div>
        )}
        
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
};

const ComponentErrorFallback: React.FC<FallbackProps> = ({ retry }) => (
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

const SectionErrorFallback: React.FC<FallbackProps> = ({ retry }) => (
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
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
    const { hasError, error, errorInfo } = this.state;
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
    additionalInfo?: Record<string, any>
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

export default ErrorBoundary;