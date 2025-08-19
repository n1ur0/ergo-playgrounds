import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ArrowRight, 
  Wallet, 
  FileText, 
  Activity,
  TrendingUp,
  Clock
} from 'lucide-react';
import './SimulationResults.css';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'swap';
  from: string;
  to: string;
  amount: string;
  status: 'success' | 'failed';
}

interface SimulationResult {
  success: boolean;
  message: string;
  transactions: Transaction[];
  balances: Record<string, string>;
  logs: string[];
}

interface SimulationResultsProps {
  result: SimulationResult | null;
  isRunning: boolean;
}

const formatAmount = (amount: string): string => {
  const num = parseInt(amount);
  return `${(num / 1000000000).toFixed(3)} ERG`;
};

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'deposit': return '📥';
    case 'withdraw': return '📤';
    case 'swap': return '🔄';
    default: return '💫';
  }
};

const SimulationResults: React.FC<SimulationResultsProps> = ({ result, isRunning }) => {
  if (isRunning) {
    return (
      <div className="simulation-results">
        <div className="running-state">
          <RefreshCw size={32} className="spinning" />
          <h3>Executing Contract...</h3>
          <div className="running-steps">
            <div className="step active">
              <div className="step-indicator">1</div>
              <span>Compiling ErgoScript</span>
            </div>
            <div className="step active">
              <div className="step-indicator">2</div>
              <span>Creating blockchain simulation</span>
            </div>
            <div className="step">
              <div className="step-indicator">3</div>
              <span>Executing transactions</span>
            </div>
            <div className="step">
              <div className="step-indicator">4</div>
              <span>Validating results</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="simulation-results">
        <div className="no-results">
          <Activity size={48} />
          <h3>Ready to Execute</h3>
          <p>Click "Run Contract" to see simulation results here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="simulation-results">
      <div className="results-header">
        <div className={`status-indicator ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <>
              <CheckCircle size={20} />
              <span>Execution Successful</span>
            </>
          ) : (
            <>
              <XCircle size={20} />
              <span>Execution Failed</span>
            </>
          )}
        </div>
        <div className="execution-time">
          <Clock size={16} />
          <span>Executed at {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="results-content">
        {result.message && (
          <div className={`message-box ${result.success ? 'success' : 'error'}`}>
            <p>{result.message}</p>
          </div>
        )}

        {result.transactions && result.transactions.length > 0 && (
          <div className="results-section">
            <h4>
              <TrendingUp size={18} />
              Transaction Flow
            </h4>
            <div className="transactions-list">
              {result.transactions.map((tx, index) => (
                <div key={tx.id} className={`transaction-item ${tx.status}`}>
                  <div className="tx-icon">{getTransactionIcon(tx.type)}</div>
                  <div className="tx-details">
                    <div className="tx-flow">
                      <span className="tx-party">{tx.from}</span>
                      <ArrowRight size={14} />
                      <span className="tx-party">{tx.to}</span>
                    </div>
                    <div className="tx-info">
                      <span className="tx-type">{tx.type.toUpperCase()}</span>
                      <span className="tx-amount">{formatAmount(tx.amount)}</span>
                    </div>
                  </div>
                  <div className={`tx-status ${tx.status}`}>
                    {tx.status === 'success' ? (
                      <CheckCircle size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.balances && Object.keys(result.balances).length > 0 && (
          <div className="results-section">
            <h4>
              <Wallet size={18} />
              Final Balances
            </h4>
            <div className="balances-grid">
              {Object.entries(result.balances).map(([party, balance]) => (
                <div key={party} className="balance-item">
                  <div className="balance-party">
                    <Wallet size={16} />
                    <span>{party}</span>
                  </div>
                  <div className="balance-amount">
                    {formatAmount(balance)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.logs && result.logs.length > 0 && (
          <div className="results-section">
            <h4>
              <FileText size={18} />
              Execution Logs
            </h4>
            <div className="logs-container">
              {result.logs.map((log, index) => (
                <div key={index} className="log-entry">
                  <span className="log-timestamp">{index + 1}.</span>
                  <span className="log-message">{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="results-footer">
        <div className="stats">
          <div className="stat">
            <strong>{result.transactions?.length || 0}</strong>
            <span>Transactions</span>
          </div>
          <div className="stat">
            <strong>{Object.keys(result.balances || {}).length}</strong>
            <span>Parties</span>
          </div>
          <div className="stat">
            <strong>{result.logs?.length || 0}</strong>
            <span>Log Entries</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationResults;