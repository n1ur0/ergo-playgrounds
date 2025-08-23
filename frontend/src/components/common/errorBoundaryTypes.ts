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
  additionalInfo?: Record<string, any>;
}

// Error boundary state interface
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

// Error boundary props interface
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: ErrorDetails, retry: () => void) => ReactNode;
  onError?: (error: ErrorDetails, errorId: string) => void;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

// Fallback props interface
export interface FallbackProps {
  error: ErrorDetails;
  retry: () => void;
}

// Import React types
import { ReactNode, ErrorInfo } from 'react';