// Comprehensive error classification system
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  COMPILATION = 'compilation',
  EXECUTION = 'execution',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  RESOURCE = 'resource',
  STATE = 'state',
  UI = 'ui',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface EnhancedError extends Error {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code?: string;
  context?: Record<string, any>;
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  recoverable: boolean;
  retryable: boolean;
  reportable: boolean;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: EnhancedError[];
  errorRate: number;
  lastErrorTime?: Date;
}

export interface ErrorHandlerConfig {
  enableMetrics: boolean;
  enableReporting: boolean;
  enableConsoleLogging: boolean;
  maxRecentErrors: number;
  reportingEndpoint?: string;
  reportingApiKey?: string;
  enableLocalStorage: boolean;
  localStorageKey: string;
}

// Default configuration
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableMetrics: true,
  enableReporting: process.env.NODE_ENV === 'production',
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  maxRecentErrors: 50,
  reportingEndpoint: '/api/errors',
  enableLocalStorage: true,
  localStorageKey: 'ergo-playgrounds-error-metrics'
};

// Error classification patterns
const ERROR_PATTERNS = {
  [ErrorCategory.NETWORK]: [
    /network error/i,
    /fetch failed/i,
    /connection refused/i,
    /timeout/i,
    /cors/i,
    /net::/i
  ],
  [ErrorCategory.VALIDATION]: [
    /validation/i,
    /invalid.*input/i,
    /bad request/i,
    /required.*field/i,
    /must be/i
  ],
  [ErrorCategory.COMPILATION]: [
    /compilation/i,
    /syntax error/i,
    /parse error/i,
    /ergoscript/i,
    /compiler/i
  ],
  [ErrorCategory.EXECUTION]: [
    /execution/i,
    /runtime error/i,
    /contract.*failed/i,
    /transaction.*error/i,
    /blockchain/i
  ],
  [ErrorCategory.AUTHENTICATION]: [
    /unauthorized/i,
    /authentication/i,
    /login/i,
    /token.*expired/i,
    /invalid.*credentials/i
  ],
  [ErrorCategory.PERMISSION]: [
    /permission/i,
    /forbidden/i,
    /access.*denied/i,
    /not.*allowed/i,
    /insufficient.*privileges/i
  ],
  [ErrorCategory.RESOURCE]: [
    /not found/i,
    /resource.*unavailable/i,
    /out of memory/i,
    /quota.*exceeded/i,
    /disk.*full/i
  ],
  [ErrorCategory.STATE]: [
    /state/i,
    /redux/i,
    /context/i,
    /hook/i,
    /render/i
  ],
  [ErrorCategory.UI]: [
    /component/i,
    /render/i,
    /dom/i,
    /element/i,
    /ref/i
  ]
};

// Severity classification patterns
const SEVERITY_PATTERNS = {
  [ErrorSeverity.CRITICAL]: [
    /critical/i,
    /fatal/i,
    /system.*failure/i,
    /crash/i,
    /security/i
  ],
  [ErrorSeverity.HIGH]: [
    /error/i,
    /failed/i,
    /exception/i,
    /broken/i,
    /corrupted/i
  ],
  [ErrorSeverity.MEDIUM]: [
    /warning/i,
    /deprecated/i,
    /invalid/i,
    /timeout/i,
    /retry/i
  ],
  [ErrorSeverity.LOW]: [
    /info/i,
    /notice/i,
    /minor/i,
    /cosmetic/i
  ]
};

class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlerConfig;
  private metrics: ErrorMetrics;
  private listeners: ((error: EnhancedError) => void)[] = [];
  private reportQueue: EnhancedError[] = [];
  private isReporting = false;

  private constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recentErrors: [],
      errorRate: 0
    };

    // Initialize metrics objects
    Object.values(ErrorCategory).forEach(category => {
      this.metrics.errorsByCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      this.metrics.errorsBySeverity[severity] = 0;
    });

    // Load metrics from localStorage
    this.loadMetrics();

    // Set up periodic reporting
    if (this.config.enableReporting) {
      setInterval(() => this.processReportQueue(), 30000); // Report every 30 seconds
    }

    // Set up periodic metrics calculation
    setInterval(() => this.calculateErrorRate(), 60000); // Calculate every minute
  }

  public static getInstance(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  // Classify error category based on message content
  private classifyCategory(message: string): ErrorCategory {
    for (const [category, patterns] of Object.entries(ERROR_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(message))) {
        return category as ErrorCategory;
      }
    }
    return ErrorCategory.UNKNOWN;
  }

  // Classify error severity based on message content
  private classifySeverity(message: string): ErrorSeverity {
    for (const [severity, patterns] of Object.entries(SEVERITY_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(message))) {
        return severity as ErrorSeverity;
      }
    }
    return ErrorSeverity.MEDIUM; // Default severity
  }

  // Determine if error is recoverable
  private isRecoverable(category: ErrorCategory, severity: ErrorSeverity): boolean {
    if (severity === ErrorSeverity.CRITICAL) return false;
    if (category === ErrorCategory.COMPILATION) return false;
    if (category === ErrorCategory.AUTHENTICATION) return false;
    if (category === ErrorCategory.PERMISSION) return false;
    return true;
  }

  // Determine if error is retryable
  private isRetryable(category: ErrorCategory): boolean {
    return [
      ErrorCategory.NETWORK,
      ErrorCategory.EXECUTION,
      ErrorCategory.RESOURCE,
      ErrorCategory.STATE
    ].includes(category);
  }

  // Determine if error should be reported
  private isReportable(severity: ErrorSeverity, category: ErrorCategory): boolean {
    if (!this.config.enableReporting) return false;
    if (severity === ErrorSeverity.LOW) return false;
    if (category === ErrorCategory.UI && severity === ErrorSeverity.MEDIUM) return false;
    return true;
  }

  // Enhanced error creation
  public createError(
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ): EnhancedError {
    const category = this.classifyCategory(message);
    const severity = this.classifySeverity(message);
    
    const enhancedError = Object.assign(
      originalError || new Error(message),
      {
        category,
        severity,
        code: originalError?.name,
        context,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
        recoverable: this.isRecoverable(category, severity),
        retryable: this.isRetryable(category),
        reportable: this.isReportable(severity, category)
      }
    ) as EnhancedError;

    return enhancedError;
  }

  // Handle and process error
  public handleError(
    error: Error | string,
    context?: Record<string, any>
  ): EnhancedError {
    const enhancedError = typeof error === 'string' 
      ? this.createError(error, undefined, context)
      : this.createError(error.message, error, context);

    this.processError(enhancedError);
    return enhancedError;
  }

  // Process error through the pipeline
  private processError(error: EnhancedError): void {
    // Update metrics
    this.updateMetrics(error);

    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      this.logToConsole(error);
    }

    // Notify listeners
    this.notifyListeners(error);

    // Add to report queue if reportable
    if (error.reportable) {
      this.reportQueue.push(error);
    }

    // Save metrics to localStorage
    if (this.config.enableLocalStorage) {
      this.saveMetrics();
    }
  }

  // Update error metrics
  private updateMetrics(error: EnhancedError): void {
    this.metrics.totalErrors++;
    this.metrics.errorsByCategory[error.category]++;
    this.metrics.errorsBySeverity[error.severity]++;
    this.metrics.lastErrorTime = error.timestamp;

    // Add to recent errors list
    this.metrics.recentErrors.push(error);
    
    // Trim recent errors to max size
    if (this.metrics.recentErrors.length > this.config.maxRecentErrors) {
      this.metrics.recentErrors = this.metrics.recentErrors.slice(-this.config.maxRecentErrors);
    }
  }

  // Calculate error rate (errors per minute)
  private calculateErrorRate(): void {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentErrors = this.metrics.recentErrors.filter(
      error => error.timestamp > oneMinuteAgo
    );
    this.metrics.errorRate = recentErrors.length;
  }

  // Log error to console with formatting
  private logToConsole(error: EnhancedError): void {
    const style = this.getConsoleStyle(error.severity);
    
    console.group(`%c🚨 ${error.category.toUpperCase()} ERROR [${error.severity.toUpperCase()}]`, style);
    console.error('Message:', error.message);
    console.error('Category:', error.category);
    console.error('Severity:', error.severity);
    console.error('Timestamp:', error.timestamp.toISOString());
    console.error('URL:', error.url);
    
    if (error.context) {
      console.error('Context:', error.context);
    }
    
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    
    console.error('Recoverable:', error.recoverable);
    console.error('Retryable:', error.retryable);
    console.groupEnd();
  }

  // Get console styling for severity
  private getConsoleStyle(severity: ErrorSeverity): string {
    const styles = {
      [ErrorSeverity.CRITICAL]: 'color: white; background-color: #dc3545; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
      [ErrorSeverity.HIGH]: 'color: white; background-color: #fd7e14; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
      [ErrorSeverity.MEDIUM]: 'color: #212529; background-color: #ffc107; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
      [ErrorSeverity.LOW]: 'color: white; background-color: #6c757d; font-weight: bold; padding: 2px 6px; border-radius: 3px;'
    };
    return styles[severity];
  }

  // Notify error listeners
  private notifyListeners(error: EnhancedError): void {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.warn('Error listener failed:', listenerError);
      }
    });
  }

  // Process report queue
  private async processReportQueue(): Promise<void> {
    if (this.isReporting || this.reportQueue.length === 0 || !this.config.reportingEndpoint) {
      return;
    }

    this.isReporting = true;
    const errorsToReport = [...this.reportQueue];
    this.reportQueue = [];

    try {
      const response = await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.reportingApiKey && {
            'Authorization': `Bearer ${this.config.reportingApiKey}`
          })
        },
        body: JSON.stringify({
          errors: errorsToReport,
          metrics: this.getMetrics(),
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Reporting failed: ${response.status} ${response.statusText}`);
      }

      console.log(`Successfully reported ${errorsToReport.length} errors`);
    } catch (reportingError) {
      console.warn('Error reporting failed:', reportingError);
      // Re-add errors to queue for retry
      this.reportQueue.unshift(...errorsToReport);
    } finally {
      this.isReporting = false;
    }
  }

  // Get current metrics
  public getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  // Add error listener
  public addListener(listener: (error: EnhancedError) => void): void {
    this.listeners.push(listener);
  }

  // Remove error listener
  public removeListener(listener: (error: EnhancedError) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Clear metrics
  public clearMetrics(): void {
    this.metrics = {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recentErrors: [],
      errorRate: 0
    };

    Object.values(ErrorCategory).forEach(category => {
      this.metrics.errorsByCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      this.metrics.errorsBySeverity[severity] = 0;
    });

    if (this.config.enableLocalStorage) {
      this.saveMetrics();
    }
  }

  // Save metrics to localStorage
  private saveMetrics(): void {
    try {
      localStorage.setItem(this.config.localStorageKey, JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to save error metrics to localStorage:', error);
    }
  }

  // Load metrics from localStorage
  private loadMetrics(): void {
    try {
      const stored = localStorage.getItem(this.config.localStorageKey);
      if (stored) {
        const loadedMetrics = JSON.parse(stored);
        this.metrics = {
          ...this.metrics,
          ...loadedMetrics,
          // Convert timestamp strings back to Date objects
          recentErrors: loadedMetrics.recentErrors?.map((error: any) => ({
            ...error,
            timestamp: new Date(error.timestamp)
          })) || [],
          lastErrorTime: loadedMetrics.lastErrorTime ? new Date(loadedMetrics.lastErrorTime) : undefined
        };
      }
    } catch (error) {
      console.warn('Failed to load error metrics from localStorage:', error);
    }
  }

  // Get user ID (implement based on your auth system)
  private getUserId(): string | undefined {
    // Implement user ID retrieval based on your authentication system
    return undefined;
  }

  // Get session ID
  private getSessionId(): string | undefined {
    // Simple session ID based on session storage
    let sessionId = sessionStorage.getItem('error-handler-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-handler-session-id', sessionId);
    }
    return sessionId;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export const handleError = (error: Error | string, context?: Record<string, any>): EnhancedError => {
  return errorHandler.handleError(error, context);
};

export const getErrorMetrics = (): ErrorMetrics => {
  return errorHandler.getMetrics();
};

export const addErrorListener = (listener: (error: EnhancedError) => void): void => {
  errorHandler.addListener(listener);
};

export const removeErrorListener = (listener: (error: EnhancedError) => void): void => {
  errorHandler.removeListener(listener);
};

export const clearErrorMetrics = (): void => {
  errorHandler.clearMetrics();
};

// React hook for using error handler in components
export const useErrorHandling = () => {
  return {
    handleError,
    getMetrics: getErrorMetrics,
    addListener: addErrorListener,
    removeListener: removeErrorListener,
    clearMetrics: clearErrorMetrics
  };
};

export default errorHandler;