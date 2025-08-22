import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import type { ValidationError } from '../../types/contractDesigner';
import { useDebounce } from '../../hooks/usePerformanceOptimizations';

interface CodePreviewProps {
  generatedCode?: string;
  isGenerating?: boolean;
  validationErrors?: ValidationError[];
  onRegenerate?: () => void;
  showLineNumbers?: boolean;
  enableSyntaxHighlighting?: boolean;
  allowEditing?: boolean;
  onCodeChange?: (code: string) => void;
  onLoad?: () => void;
}

// Memoized validation summary component
const ValidationSummary = memo<{
  errors: ValidationError[];
  onErrorClick?: (error: ValidationError) => void;
}>(({ errors, onErrorClick }) => {
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  const infoCount = errors.filter(e => e.severity === 'info').length;

  if (errors.length === 0) return null;

  return (
    <div className="validation-summary" role="status" aria-live="polite">
      <div className="validation-counts">
        {errorCount > 0 && (
          <button
            className="validation-count error-count"
            onClick={() => onErrorClick?.(errors.find(e => e.severity === 'error')!)}
            aria-label={`${errorCount} error${errorCount !== 1 ? 's' : ''}`}
          >
            <span className="validation-icon" aria-hidden="true">❌</span>
            <span className="validation-text">
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          </button>
        )}
        
        {warningCount > 0 && (
          <button
            className="validation-count warning-count"
            onClick={() => onErrorClick?.(errors.find(e => e.severity === 'warning')!)}
            aria-label={`${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
          >
            <span className="validation-icon" aria-hidden="true">⚠️</span>
            <span className="validation-text">
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          </button>
        )}
        
        {infoCount > 0 && (
          <button
            className="validation-count info-count"
            onClick={() => onErrorClick?.(errors.find(e => e.severity === 'info')!)}
            aria-label={`${infoCount} info message${infoCount !== 1 ? 's' : ''}`}
          >
            <span className="validation-icon" aria-hidden="true">ℹ️</span>
            <span className="validation-text">
              {infoCount} info
            </span>
          </button>
        )}
      </div>
      
      {errors.length > 0 && (
        <div className="validation-details">
          <details>
            <summary>
              View all {errors.length} issue{errors.length !== 1 ? 's' : ''}
            </summary>
            <div className="validation-list" role="list">
              {errors.map((error, index) => (
                <div
                  key={error.id || index}
                  className={`validation-item ${error.severity}`}
                  role="listitem"
                  onClick={() => onErrorClick?.(error)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onErrorClick?.(error);
                    }
                  }}
                >
                  <div className="validation-item-header">
                    <span className="validation-severity">{error.severity}</span>
                    {error.line && (
                      <span className="validation-location">Line {error.line}</span>
                    )}
                  </div>
                  <div className="validation-message">{error.message}</div>
                  {error.suggestion && (
                    <div className="validation-suggestion">
                      <strong>Suggestion:</strong> {error.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
});

ValidationSummary.displayName = 'ValidationSummary';

// Memoized code display with syntax highlighting
const CodeDisplay = memo<{
  code: string;
  showLineNumbers: boolean;
  enableSyntaxHighlighting: boolean;
  allowEditing: boolean;
  onCodeChange?: (code: string) => void;
  validationErrors: ValidationError[];
}>(({ 
  code, 
  showLineNumbers, 
  enableSyntaxHighlighting, 
  allowEditing, 
  onCodeChange,
  validationErrors 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [localCode, setLocalCode] = useState(code);
  
  // Debounce code changes to avoid excessive updates
  const debouncedCode = useDebounce(localCode, 300);
  
  useEffect(() => {
    if (debouncedCode !== code && onCodeChange) {
      onCodeChange(debouncedCode);
    }
  }, [debouncedCode, code, onCodeChange]);

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  // Syntax highlighting (simple implementation)
  const highlightedCode = useMemo(() => {
    if (!enableSyntaxHighlighting) return code;
    
    return code
      .replace(/\b(val|def|if|then|else|sigmaProp|INPUTS|OUTPUTS|HEIGHT|CONTEXT)\b/g, '<span class="keyword">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="number">$1</span>')
      .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
      .replace(/(".*?")/g, '<span class="string">$1</span>')
      .replace(/(\{|\}|\(|\)|\[|\])/g, '<span class="bracket">$1</span>');
  }, [code, enableSyntaxHighlighting]);

  // Get line numbers
  const lineNumbers = useMemo(() => {
    if (!showLineNumbers) return null;
    
    const lines = code.split('\n');
    return lines.map((_, index) => index + 1);
  }, [code, showLineNumbers]);

  // Get error annotations for lines
  const lineErrors = useMemo(() => {
    const errorMap = new Map<number, ValidationError[]>();
    
    validationErrors.forEach(error => {
      if (error.line) {
        const existing = errorMap.get(error.line) || [];
        errorMap.set(error.line, [...existing, error]);
      }
    });
    
    return errorMap;
  }, [validationErrors]);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalCode(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newValue = localCode.substring(0, start) + '  ' + localCode.substring(end);
      setLocalCode(newValue);
      
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }, [localCode]);

  if (allowEditing) {
    return (
      <div className="code-editor-container">
        {showLineNumbers && (
          <div className="line-numbers" aria-hidden="true">
            {lineNumbers?.map(lineNum => (
              <div
                key={lineNum}
                className={`line-number ${lineErrors.has(lineNum) ? 'has-error' : ''}`}
              >
                {lineNum}
                {lineErrors.has(lineNum) && (
                  <div className="line-error-indicator" title={lineErrors.get(lineNum)?.[0]?.message}>
                    ⚠
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <textarea
          ref={textareaRef}
          className="code-editor"
          value={localCode}
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="ErgoScript code editor"
          aria-describedby="code-preview-description"
        />
      </div>
    );
  }

  return (
    <div className="code-display-container">
      {showLineNumbers && (
        <div className="line-numbers" aria-hidden="true">
          {lineNumbers?.map(lineNum => (
            <div
              key={lineNum}
              className={`line-number ${lineErrors.has(lineNum) ? 'has-error' : ''}`}
            >
              {lineNum}
              {lineErrors.has(lineNum) && (
                <div className="line-error-indicator" title={lineErrors.get(lineNum)?.[0]?.message}>
                  ⚠
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <pre 
        ref={preRef}
        className="code-display"
        role="textbox"
        aria-label="Generated ErgoScript code"
        aria-readonly="true"
        tabIndex={0}
      >
        <code
          dangerouslySetInnerHTML={
            enableSyntaxHighlighting 
              ? { __html: highlightedCode }
              : undefined
          }
        >
          {!enableSyntaxHighlighting && code}
        </code>
      </pre>
    </div>
  );
});

CodeDisplay.displayName = 'CodeDisplay';

// Memoized loading state component
const GeneratingState = memo(() => (
  <div className="generating-state" role="status" aria-live="polite">
    <div className="spinner-container">
      <div className="spinner" aria-hidden="true">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
    </div>
    <div className="generating-text">
      <h4>Generating ErgoScript code...</h4>
      <p>Please wait while we compile your contract design into executable code.</p>
    </div>
  </div>
));

GeneratingState.displayName = 'GeneratingState';

// Memoized empty state component
const EmptyState = memo(() => (
  <div className="empty-state" role="status">
    <div className="empty-icon" aria-hidden="true">📝</div>
    <h4>No Code Generated</h4>
    <p>Add components to the canvas to generate ErgoScript code.</p>
    <div className="empty-hints">
      <h5>Quick Start:</h5>
      <ul>
        <li>Drag components from the palette to the canvas</li>
        <li>Connect components to define data flow</li>
        <li>Configure component properties</li>
        <li>Click "Generate" to create ErgoScript code</li>
      </ul>
    </div>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Main enhanced code preview component
const EnhancedCodePreview = memo<CodePreviewProps>(({ 
  generatedCode = '', 
  isGenerating = false, 
  validationErrors = [],
  onRegenerate = () => {},
  showLineNumbers = true,
  enableSyntaxHighlighting = true,
  allowEditing = false,
  onCodeChange,
  onLoad
}) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');
  const [selectedError, setSelectedError] = useState<ValidationError | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Call onLoad when component mounts
  useEffect(() => {
    onLoad?.();
  }, [onLoad]);

  // Copy to clipboard with feedback
  const handleCopyCode = useCallback(async () => {
    if (!generatedCode) return;
    
    setCopyStatus('copying');
    
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopyStatus('success');
      
      // Reset status after 2 seconds
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      setCopyStatus('error');
      
      // Reset status after 2 seconds
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  }, [generatedCode]);

  // Download code as file
  const handleDownloadCode = useCallback(() => {
    if (!generatedCode) return;
    
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `contract-${Date.now()}.es`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, [generatedCode]);

  // Toggle fullscreen mode
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Handle error selection
  const handleErrorClick = useCallback((error: ValidationError) => {
    setSelectedError(error);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'c':
            if (!allowEditing) {
              e.preventDefault();
              handleCopyCode();
            }
            break;
          case 's':
            e.preventDefault();
            handleDownloadCode();
            break;
          case 'f':
            e.preventDefault();
            handleToggleFullscreen();
            break;
        }
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleCopyCode, handleDownloadCode, handleToggleFullscreen, isFullscreen, allowEditing]);

  const getCopyButtonText = () => {
    switch (copyStatus) {
      case 'copying': return '📋 Copying...';
      case 'success': return '✅ Copied!';
      case 'error': return '❌ Failed';
      default: return '📋 Copy Code';
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`enhanced-code-preview ${isFullscreen ? 'fullscreen' : ''}`}
      role="region"
      aria-label="Code preview"
    >
      <div className="panel-header">
        <div className="header-left">
          <h3 id="code-preview-title">Generated ErgoScript</h3>
          {generatedCode && (
            <div className="code-stats">
              <span className="stat">
                Lines: {generatedCode.split('\n').length}
              </span>
              <span className="stat">
                Characters: {generatedCode.length}
              </span>
            </div>
          )}
        </div>
        
        <div className="header-actions">
          <button 
            className="action-button secondary"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen (Ctrl+F)'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? '⤓' : '⤢'}
          </button>
          
          <button 
            className="action-button primary"
            onClick={onRegenerate}
            disabled={isGenerating}
            title="Regenerate code (Ctrl+R)"
            aria-label="Regenerate code"
          >
            {isGenerating ? (
              <span className="button-spinner" aria-hidden="true">⏳</span>
            ) : (
              <span aria-hidden="true">🔄</span>
            )}
            Regenerate
          </button>
        </div>
      </div>

      <ValidationSummary 
        errors={validationErrors} 
        onErrorClick={handleErrorClick}
      />

      <div className="code-container">
        <div 
          className="code-viewport"
          role="main"
          aria-labelledby="code-preview-title"
        >
          {isGenerating ? (
            <GeneratingState />
          ) : generatedCode ? (
            <CodeDisplay
              code={generatedCode}
              showLineNumbers={showLineNumbers}
              enableSyntaxHighlighting={enableSyntaxHighlighting}
              allowEditing={allowEditing}
              onCodeChange={onCodeChange}
              validationErrors={validationErrors}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {generatedCode && !isGenerating && (
        <div className="code-actions">
          <div className="action-group">
            <button
              className={`action-button ${copyStatus === 'success' ? 'success' : copyStatus === 'error' ? 'error' : 'secondary'}`}
              onClick={handleCopyCode}
              disabled={copyStatus === 'copying'}
              title="Copy code to clipboard (Ctrl+C)"
              aria-label="Copy code to clipboard"
            >
              {getCopyButtonText()}
            </button>
            
            <button
              className="action-button secondary"
              onClick={handleDownloadCode}
              title="Download code as file (Ctrl+S)"
              aria-label="Download code as file"
            >
              💾 Download
            </button>
          </div>

          <div className="view-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showLineNumbers}
                onChange={(e) => {
                  // This would need to be passed as a prop or managed by parent
                  console.log('Toggle line numbers:', e.target.checked);
                }}
                aria-label="Show line numbers"
              />
              Line numbers
            </label>
            
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enableSyntaxHighlighting}
                onChange={(e) => {
                  // This would need to be passed as a prop or managed by parent
                  console.log('Toggle syntax highlighting:', e.target.checked);
                }}
                aria-label="Enable syntax highlighting"
              />
              Syntax highlighting
            </label>
          </div>
        </div>
      )}

      {selectedError && (
        <div 
          className="error-detail-modal"
          role="dialog"
          aria-labelledby="error-detail-title"
          aria-modal="true"
        >
          <div className="modal-backdrop" onClick={() => setSelectedError(null)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h4 id="error-detail-title">Validation Issue</h4>
              <button
                className="close-button"
                onClick={() => setSelectedError(null)}
                aria-label="Close error details"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="error-severity-badge">{selectedError.severity}</div>
              <p className="error-message">{selectedError.message}</p>
              {selectedError.suggestion && (
                <div className="error-suggestion">
                  <strong>Suggestion:</strong> {selectedError.suggestion}
                </div>
              )}
              {selectedError.line && (
                <p className="error-location">Line: {selectedError.line}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div id="code-preview-description" className="sr-only">
        ErgoScript code generated from your contract design. Use keyboard shortcuts to interact: 
        Ctrl+C to copy, Ctrl+S to download, Ctrl+F for fullscreen, Escape to exit fullscreen.
      </div>
    </div>
  );
});

EnhancedCodePreview.displayName = 'EnhancedCodePreview';

export default EnhancedCodePreview;