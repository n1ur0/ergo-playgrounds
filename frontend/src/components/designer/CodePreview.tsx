import type { ValidationError } from '../../types/contractDesigner';

interface CodePreviewProps {
  generatedCode: string;
  isGenerating: boolean;
  validationErrors: ValidationError[];
  onRegenerate: () => void;
  onLoad?: () => void;
}

export default function CodePreview({ 
  generatedCode, 
  isGenerating, 
  validationErrors,
  onRegenerate 
}: CodePreviewProps) {
  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <div className="code-preview">
      <div className="panel-header">
        <h3>Generated ErgoScript</h3>
        <button 
          className="regenerate-button"
          onClick={onRegenerate}
          disabled={isGenerating}
          title="Regenerate code"
        >
          {isGenerating ? '⏳' : '🔄'} Regenerate
        </button>
      </div>

      {/* Validation Summary */}
      {validationErrors.length > 0 && (
        <div className="validation-summary">
          {errorCount > 0 && (
            <span className="error-count">
              ❌ {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="warning-count">
              ⚠️ {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Code Display */}
      <div className="code-container">
        {isGenerating ? (
          <div className="generating-state">
            <div className="spinner">⏳</div>
            <p>Generating ErgoScript code...</p>
          </div>
        ) : generatedCode ? (
          <pre className="code-display">
            <code>{generatedCode}</code>
          </pre>
        ) : (
          <div className="empty-state">
            <p>Add components to the canvas to generate ErgoScript code.</p>
          </div>
        )}
      </div>

      {/* Copy Button */}
      {generatedCode && !isGenerating && (
        <div className="code-actions">
          <button
            className="copy-button"
            onClick={() => navigator.clipboard.writeText(generatedCode)}
          >
            📋 Copy Code
          </button>
        </div>
      )}
    </div>
  );
}