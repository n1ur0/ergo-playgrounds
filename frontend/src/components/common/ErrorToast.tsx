import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import type { ErrorDetails } from './errorBoundaryTypes';

// Toast notification types
export type ToastType = 'error' | 'warning' | 'info' | 'success';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: ToastAction[];
  onClose?: () => void;
  metadata?: Record<string, any>;
}

export interface ToastAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

// Toast context for managing global toast state
interface ToastContextValue {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  showError: (error: ErrorDetails | Error | string, options?: Partial<ToastMessage>) => string;
  showWarning: (message: string, options?: Partial<ToastMessage>) => string;
  showInfo: (message: string, options?: Partial<ToastMessage>) => string;
  showSuccess: (message: string, options?: Partial<ToastMessage>) => string;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

// Hook to use toast functionality
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Individual toast component
interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
  position: ToastPosition;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose, position }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast.persistent && toast.duration !== 0) {
      const duration = toast.duration || (toast.type === 'error' ? 8000 : 5000);
      const timer = setTimeout(() => handleClose(), duration);
      return () => clearTimeout(timer);
    }
  }, [toast.persistent, toast.duration, toast.type]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
      if (toast.onClose) {
        toast.onClose();
      }
    }, 300); // Match exit animation duration
  }, [toast.id, toast.onClose, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'error':
        return <AlertCircle className="toast-icon error" size={20} />;
      case 'warning':
        return <AlertTriangle className="toast-icon warning" size={20} />;
      case 'success':
        return <CheckCircle className="toast-icon success" size={20} />;
      case 'info':
      default:
        return <Info className="toast-icon info" size={20} />;
    }
  };

  const getToastClasses = () => {
    const baseClasses = ['error-toast', `toast-${toast.type}`];
    
    if (isVisible && !isExiting) {
      baseClasses.push('toast-enter');
    }
    
    if (isExiting) {
      baseClasses.push('toast-exit');
    }
    
    // Add position-specific classes for animation direction
    if (position.includes('right')) {
      baseClasses.push('toast-from-right');
    } else if (position.includes('left')) {
      baseClasses.push('toast-from-left');
    } else {
      baseClasses.push('toast-from-center');
    }
    
    return baseClasses.join(' ');
  };

  return (
    <div className={getToastClasses()}>
      <div className="toast-content">
        <div className="toast-header">
          {getIcon()}
          <div className="toast-text">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button
            onClick={handleClose}
            className="toast-close"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
        
        {toast.actions && toast.actions.length > 0 && (
          <div className="toast-actions">
            {toast.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.action();
                  if (action.variant !== 'secondary') {
                    handleClose();
                  }
                }}
                className={`toast-action ${action.variant || 'primary'}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Progress bar for non-persistent toasts */}
      {!toast.persistent && toast.duration !== 0 && (
        <div 
          className="toast-progress" 
          style={{
            animationDuration: `${toast.duration || (toast.type === 'error' ? 8000 : 5000)}ms`
          }}
        />
      )}
    </div>
  );
};

// Toast container component
interface ToastContainerProps {
  position?: ToastPosition;
  maxToasts?: number;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ 
  position = 'top-right',
  maxToasts = 5 
}) => {
  const { toasts, removeToast } = useToast();
  
  // Limit the number of visible toasts
  const visibleToasts = toasts.slice(-maxToasts);

  if (visibleToasts.length === 0) {
    return null;
  }

  const getContainerClasses = () => {
    return `toast-container toast-container-${position}`;
  };

  return (
    <div className={getContainerClasses()}>
      {visibleToasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={removeToast}
          position={position}
        />
      ))}
    </div>
  );
};

// Toast provider component
interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  position = 'top-right',
  maxToasts = 5 
}) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showError = useCallback((
    error: ErrorDetails | Error | string, 
    options: Partial<ToastMessage> = {}
  ) => {
    let title = 'Error';
    let message = '';
    let metadata: Record<string, any> = {};

    if (typeof error === 'string') {
      message = error;
    } else if (error instanceof Error) {
      title = error.name || 'Error';
      message = error.message;
      metadata = { stack: error.stack };
    } else {
      // ErrorDetails
      title = `${error.severity.charAt(0).toUpperCase()}${error.severity.slice(1)} Error`;
      message = error.message;
      metadata = {
        severity: error.severity,
        timestamp: error.timestamp,
        stack: error.stack,
        ...error.additionalInfo
      };
    }

    return addToast({
      type: 'error',
      title,
      message,
      duration: 8000,
      persistent: false,
      metadata,
      ...options
    });
  }, [addToast]);

  const showWarning = useCallback((message: string, options: Partial<ToastMessage> = {}) => {
    return addToast({
      type: 'warning',
      title: 'Warning',
      message,
      duration: 6000,
      ...options
    });
  }, [addToast]);

  const showInfo = useCallback((message: string, options: Partial<ToastMessage> = {}) => {
    return addToast({
      type: 'info',
      title: 'Information',
      message,
      duration: 5000,
      ...options
    });
  }, [addToast]);

  const showSuccess = useCallback((message: string, options: Partial<ToastMessage> = {}) => {
    return addToast({
      type: 'success',
      title: 'Success',
      message,
      duration: 4000,
      ...options
    });
  }, [addToast]);

  const contextValue: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    showError,
    showWarning,
    showInfo,
    showSuccess
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer position={position} maxToasts={maxToasts} />
    </ToastContext.Provider>
  );
};

// CSS styles for toast notifications
export const toastStyles = `
.toast-container {
  position: fixed;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  pointer-events: none;
  max-width: 400px;
}

.toast-container-top-right {
  top: 0;
  right: 0;
}

.toast-container-top-left {
  top: 0;
  left: 0;
}

.toast-container-bottom-right {
  bottom: 0;
  right: 0;
}

.toast-container-bottom-left {
  bottom: 0;
  left: 0;
}

.toast-container-top-center {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

.toast-container-bottom-center {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}

.error-toast {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 4px solid;
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: translateX(100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.error-toast.toast-from-left {
  transform: translateX(-100%);
}

.error-toast.toast-from-center {
  transform: translateY(-100%);
}

.error-toast.toast-enter {
  opacity: 1;
  transform: translateX(0) translateY(0);
}

.error-toast.toast-exit {
  opacity: 0;
  transform: scale(0.8);
}

.toast-error {
  border-left-color: #dc3545;
}

.toast-warning {
  border-left-color: #ffc107;
}

.toast-info {
  border-left-color: #17a2b8;
}

.toast-success {
  border-left-color: #28a745;
}

.toast-content {
  padding: 16px;
}

.toast-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.toast-icon.error {
  color: #dc3545;
}

.toast-icon.warning {
  color: #ffc107;
}

.toast-icon.info {
  color: #17a2b8;
}

.toast-icon.success {
  color: #28a745;
}

.toast-text {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
  line-height: 1.2;
}

.toast-message {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  word-break: break-word;
}

.toast-close {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.toast-close:hover {
  color: #666;
}

.toast-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.toast-action {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toast-action.primary {
  background: #007bff;
  color: white;
}

.toast-action.primary:hover {
  background: #0056b3;
}

.toast-action.secondary {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
}

.toast-action.secondary:hover {
  background: #e9ecef;
  color: #495057;
}

.toast-action.danger {
  background: #dc3545;
  color: white;
}

.toast-action.danger:hover {
  background: #c82333;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: currentColor;
  opacity: 0.3;
  animation: toast-progress linear forwards;
  transform-origin: left;
}

@keyframes toast-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .toast-container {
    left: 16px !important;
    right: 16px !important;
    max-width: none;
    padding: 16px 0;
  }
  
  .toast-container-top-center,
  .toast-container-bottom-center {
    transform: none;
  }
  
  .error-toast {
    min-width: auto;
    max-width: none;
  }
  
  .toast-actions {
    flex-wrap: wrap;
  }
  
  .toast-action {
    flex: 1;
    min-width: 80px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .error-toast {
    background: #2d3748;
    color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .toast-title {
    color: #f7fafc;
  }
  
  .toast-message {
    color: #cbd5e0;
  }
  
  .toast-close {
    color: #a0aec0;
  }
  
  .toast-close:hover {
    color: #e2e8f0;
  }
  
  .toast-action.secondary {
    background: #4a5568;
    color: #e2e8f0;
    border-color: #2d3748;
  }
  
  .toast-action.secondary:hover {
    background: #2d3748;
    color: #f7fafc;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .error-toast {
    border: 2px solid;
    border-left-width: 6px;
  }
  
  .toast-error {
    border-color: #dc3545;
  }
  
  .toast-warning {
    border-color: #ffc107;
  }
  
  .toast-info {
    border-color: #17a2b8;
  }
  
  .toast-success {
    border-color: #28a745;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .error-toast {
    transition: opacity 0.2s ease;
  }
  
  .error-toast.toast-enter {
    transform: none;
  }
  
  .toast-progress {
    animation: none;
  }
}
`;

export default Toast;