import type { ValidationError, ContractComponent, Connection } from '../../types/contractDesigner';

interface ContractValidationProps {
  validationErrors: ValidationError[];
  components: ContractComponent[];
  connections: Connection[];
  contractComplexity: number;
  hasValidContract: boolean;
  onLoad?: () => void;
}

export default function ContractValidation({
  validationErrors,
  components,
  connections,
  contractComplexity,
  hasValidContract
}: ContractValidationProps) {
  const errors = validationErrors.filter(e => e.severity === 'error');
  const warnings = validationErrors.filter(e => e.severity === 'warning');
  const info = validationErrors.filter(e => e.severity === 'info');

  const getComplexityLevel = (complexity: number) => {
    if (complexity < 20) return { level: 'Low', color: 'var(--color-success-400)' };
    if (complexity < 50) return { level: 'Medium', color: 'var(--color-warning-400)' };
    return { level: 'High', color: 'var(--color-error-400)' };
  };

  const complexityInfo = getComplexityLevel(contractComplexity);

  return (
    <div className="contract-validation">
      <div className="panel-header">
        <h3>Contract Validation</h3>
        <div className={`validation-status ${hasValidContract ? 'valid' : 'invalid'}`}>
          {hasValidContract ? '✅ Valid' : '❌ Issues Found'}
        </div>
      </div>

      {/* Overall Stats */}
      <div className="validation-stats">
        <div className="stat-item">
          <span className="stat-label">Components</span>
          <span className="stat-value">{components.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Connections</span>
          <span className="stat-value">{connections.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Complexity</span>
          <span 
            className="stat-value" 
            style={{ color: complexityInfo.color }}
          >
            {contractComplexity} ({complexityInfo.level})
          </span>
        </div>
      </div>

      {/* Validation Results */}
      <div className="validation-results">
        {/* Errors */}
        {errors.length > 0 && (
          <div className="validation-section errors">
            <h4>❌ Errors ({errors.length})</h4>
            <div className="validation-items">
              {errors.map(error => (
                <div key={error.id} className="validation-item error">
                  <div className="validation-message">
                    {error.message}
                  </div>
                  {error.suggestion && (
                    <div className="validation-suggestion">
                      💡 {error.suggestion}
                    </div>
                  )}
                  {error.componentId && (
                    <div className="validation-location">
                      Component: {components.find(c => c.id === error.componentId)?.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="validation-section warnings">
            <h4>⚠️ Warnings ({warnings.length})</h4>
            <div className="validation-items">
              {warnings.map(warning => (
                <div key={warning.id} className="validation-item warning">
                  <div className="validation-message">
                    {warning.message}
                  </div>
                  {warning.suggestion && (
                    <div className="validation-suggestion">
                      💡 {warning.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        {info.length > 0 && (
          <div className="validation-section info">
            <h4>ℹ️ Information ({info.length})</h4>
            <div className="validation-items">
              {info.map(infoItem => (
                <div key={infoItem.id} className="validation-item info">
                  <div className="validation-message">
                    {infoItem.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Issues */}
        {validationErrors.length === 0 && components.length > 0 && (
          <div className="validation-section success">
            <div className="validation-success">
              <h4>🎉 All Good!</h4>
              <p>Your contract has no validation issues.</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {components.length === 0 && (
          <div className="validation-empty">
            <p>Add components to the canvas to see validation results.</p>
          </div>
        )}
      </div>

      {/* Contract Analysis */}
      {components.length > 0 && (
        <div className="contract-analysis">
          <h4>📊 Contract Analysis</h4>
          
          <div className="analysis-grid">
            <div className="analysis-item">
              <span className="analysis-label">Security Level</span>
              <span className="analysis-value">
                {errors.length === 0 ? '🔒 Secure' : '⚠️ Needs Review'}
              </span>
            </div>
            
            <div className="analysis-item">
              <span className="analysis-label">Gas Efficiency</span>
              <span className="analysis-value">
                {contractComplexity < 30 ? '🚀 Efficient' : '⚡ Optimizable'}
              </span>
            </div>
            
            <div className="analysis-item">
              <span className="analysis-label">Maintainability</span>
              <span className="analysis-value">
                {components.length < 10 ? '👍 Good' : '📝 Complex'}
              </span>
            </div>
          </div>

          {/* Recommendations */}
          <div className="recommendations">
            <h5>💡 Recommendations</h5>
            <ul>
              {contractComplexity > 50 && (
                <li>Consider breaking down complex logic into smaller components</li>
              )}
              {connections.length === 0 && components.length > 1 && (
                <li>Connect components to create meaningful contract logic</li>
              )}
              {components.filter(c => c.category === 'validation').length === 0 && (
                <li>Add validation components to ensure contract security</li>
              )}
              {validationErrors.length === 0 && (
                <li>Great job! Your contract looks well-structured.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}