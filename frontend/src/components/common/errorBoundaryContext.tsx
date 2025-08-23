import React from 'react';
import type { ReactNode } from 'react';
import type { ErrorDetails } from './errorBoundaryTypes';

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