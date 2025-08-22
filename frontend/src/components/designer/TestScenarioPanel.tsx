import { useState } from 'react';
import type { TestScenario } from '../../types/contractDesigner';

interface TestScenarioPanelProps {
  testScenarios: TestScenario[];
  isTestingContract: boolean;
  contractValid: boolean;
  onAddScenario: (scenario: Omit<TestScenario, 'id'>) => void;
  onRemoveScenario: (scenarioId: string) => void;
  onRunScenario: (scenarioId: string) => void;
  onLoad?: () => void;
}

export default function TestScenarioPanel({
  testScenarios,
  isTestingContract,
  contractValid,
  onAddScenario,
  onRemoveScenario,
  onRunScenario
}: TestScenarioPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddScenario = () => {
    const newScenario: Omit<TestScenario, 'id'> = {
      name: 'Test Scenario',
      description: 'Basic test scenario',
      inputs: [],
      expectedOutputs: [],
      context: {
        blockHeight: 1000000,
        networkType: 'testnet',
        parties: []
      },
      status: 'pending'
    };
    
    onAddScenario(newScenario);
    setShowAddForm(false);
  };

  return (
    <div className="test-scenario-panel">
      <div className="panel-header">
        <h3>Test Scenarios</h3>
        <button
          className="add-scenario-button"
          onClick={() => setShowAddForm(true)}
          disabled={!contractValid}
          title={!contractValid ? 'Fix contract errors first' : 'Add test scenario'}
        >
          ➕ Add Test
        </button>
      </div>

      {!contractValid && (
        <div className="validation-warning">
          ⚠️ Contract has validation errors. Fix them before testing.
        </div>
      )}

      <div className="scenarios-list">
        {testScenarios.length === 0 ? (
          <div className="empty-state">
            <p>No test scenarios yet.</p>
            <p>Add scenarios to validate your contract.</p>
          </div>
        ) : (
          testScenarios.map(scenario => (
            <div key={scenario.id} className={`scenario-item ${scenario.status}`}>
              <div className="scenario-header">
                <h4>{scenario.name}</h4>
                <div className="scenario-status">
                  {scenario.status === 'pending' && '⏸️'}
                  {scenario.status === 'running' && '⏳'}
                  {scenario.status === 'passed' && '✅'}
                  {scenario.status === 'failed' && '❌'}
                </div>
              </div>
              
              <p className="scenario-description">
                {scenario.description}
              </p>

              <div className="scenario-actions">
                <button
                  className="run-button"
                  onClick={() => onRunScenario(scenario.id)}
                  disabled={isTestingContract || !contractValid}
                >
                  {scenario.status === 'running' ? '⏳ Running' : '▶️ Run'}
                </button>
                
                <button
                  className="remove-button"
                  onClick={() => onRemoveScenario(scenario.id)}
                  disabled={isTestingContract}
                >
                  🗑️
                </button>
              </div>

              {scenario.results && (
                <div className="scenario-results">
                  <div className="results-summary">
                    <span>Execution: {scenario.results.executionTime.toFixed(2)}ms</span>
                    <span>Gas: {scenario.results.gasUsed}</span>
                  </div>
                  
                  {scenario.results.logs.length > 0 && (
                    <div className="results-logs">
                      <h5>Logs:</h5>
                      <ul>
                        {scenario.results.logs.map((log, index) => (
                          <li key={index}>{log}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {scenario.results.error && (
                    <div className="results-error">
                      <h5>Error:</h5>
                      <p>{scenario.results.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showAddForm && (
        <div className="add-scenario-modal">
          <div className="modal-content">
            <h4>Add Test Scenario</h4>
            <p>Quick test scenario will be added with default configuration.</p>
            <div className="modal-actions">
              <button onClick={handleAddScenario}>Add</button>
              <button onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="panel-footer">
        <button
          className="run-all-button"
          onClick={() => testScenarios.forEach(s => onRunScenario(s.id))}
          disabled={isTestingContract || !contractValid || testScenarios.length === 0}
        >
          ▶️ Run All Tests
        </button>
      </div>
    </div>
  );
}