import type { ErrorDetails, ErrorSeverity } from './errorBoundaryTypes';
import type { ErrorInfo } from 'react';

// Utility functions
export function generateErrorId(): string {
  return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function determineErrorSeverity(error: Error): ErrorSeverity {
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

export function sanitizeErrorMessage(message: string, isProduction: boolean): string {
  if (!isProduction) {
    return message; // Full error details in development
  }
  
  // In production, sanitize sensitive information
  const sensitivePatterns = [
    /\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/g, // File paths
    /at [A-Za-z0-9_.-]+\.[A-Za-z0-9_.-]+/g, // Function names in stack traces
    /localhost:\d+/g, // Local development URLs
    /127\.0\.0\.1:\d+/g, // Local IP addresses
    /key|token|secret|password/gi, // Potential secrets
    /[A-Za-z0-9]{32,}/g // Long alphanumeric strings that might be sensitive
  ];
  
  let sanitized = message;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Provide generic error messages for common error types
  const genericMessages: Record<string, string> = {
    'ChunkLoadError': 'Failed to load application component. Please refresh the page.',
    'TypeError': 'An unexpected error occurred in the application.',
    'ReferenceError': 'An application component is not available.',
    'SyntaxError': 'The application encountered a processing error.',
    'NetworkError': 'Network connectivity issue. Please check your connection.',
    'SecurityError': 'Security policy prevented this action.'
  };
  
  // Check if we should use a generic message
  for (const [errorType, genericMessage] of Object.entries(genericMessages)) {
    if (sanitized.toLowerCase().includes(errorType.toLowerCase())) {
      return genericMessage;
    }
  }
  
  return sanitized.substring(0, 200); // Limit message length
}

export function sanitizeStackTrace(stack: string | undefined, isProduction: boolean): string | undefined {
  if (!stack) return undefined;
  
  if (!isProduction) {
    return stack; // Full stack trace in development
  }
  
  // In production, completely remove stack traces to prevent information disclosure
  return undefined;
}

export function sanitizeUserAgent(userAgent: string, isProduction: boolean): string {
  if (!isProduction) {
    return userAgent;
  }
  
  // In production, only include basic browser info without detailed version/system info
  const basicInfo = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i);
  return basicInfo ? basicInfo[0] : 'Unknown Browser';
}

export function sanitizeUrl(url: string, isProduction: boolean): string {
  if (!isProduction) {
    return url;
  }
  
  try {
    const urlObj = new URL(url);
    // Only include the pathname, remove query params and hash that might contain sensitive data
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return '[URL_REDACTED]';
  }
}

export function createErrorDetails(
  error: Error, 
  errorInfo: ErrorInfo, 
  additionalInfo?: Record<string, any>
): ErrorDetails {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    message: sanitizeErrorMessage(error.message, isProduction),
    stack: sanitizeStackTrace(error.stack, isProduction),
    componentStack: isProduction ? undefined : (errorInfo.componentStack ?? undefined),
    severity: determineErrorSeverity(error),
    timestamp: new Date(),
    userAgent: sanitizeUserAgent(navigator.userAgent, isProduction),
    url: sanitizeUrl(window.location.href, isProduction),
    // In production, don't include additional info that might contain sensitive data
    additionalInfo: isProduction ? undefined : additionalInfo
  };
}