import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { 
  ArrowDownUp, 
  ArrowUpDown, 
  RefreshCw, 
  Zap, 
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Gavel,
  Database,
  AlertTriangle,
  Shield,
  Link2,
  ChevronDown,
  ChevronRight,
  Activity,
  Layers,
  Coins,
  Hash
} from 'lucide-react';
import type { UTXOTransaction, EnhancedUTXOTransaction } from './types';
import './TransactionNode.css';

interface TransactionNodeData extends EnhancedUTXOTransaction {
  isHighlighted?: boolean;
  isActive?: boolean;
  showDetails?: boolean;
}

const formatERGValue = (value: string | number): string => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.]/g, '')) : value;
  if (isNaN(numValue)) return value.toString();
  const ergValue = numValue / 1000000000;
  if (ergValue >= 1000) return `${(ergValue / 1000).toFixed(2)}K ERG`;
  if (ergValue >= 1) return `${ergValue.toFixed(3)} ERG`;
  return `${(ergValue * 1000).toFixed(0)}m ERG`;
};

const getTransactionIcon = (type: string) => {
  switch (type) {
    // Basic transfers
    case 'simple_transfer':
      return <ArrowDownUp size={16} />;
    case 'multi_output':
      return <Layers size={16} />;
    case 'consolidation':
      return <ArrowUpDown size={16} />;
    
    // DEX operations
    case 'dex_order_placement':
      return <Target size={16} />;
    case 'dex_partial_match':
      return <TrendingUp size={14} />;
    case 'dex_full_match':
      return <TrendingUp size={16} />;
    case 'dex_order_cancel':
      return <XCircle size={16} />;
    case 'dex_fee_collection':
      return <DollarSign size={16} />;
    
    // Atomic exchanges
    case 'atomic_bid_placement':
      return <Zap size={16} />;
    case 'atomic_ask_placement':
      return <RefreshCw size={16} />;
    case 'atomic_settlement':
      return <Award size={16} />;
    case 'atomic_refund':
      return <AlertTriangle size={16} />;
    
    // Contract interactions
    case 'contract_deployment':
      return <Settings size={16} />;
    case 'contract_interaction':
      return <Activity size={16} />;
    case 'contract_upgrade':
      return <RefreshCw size={16} />;
    case 'contract_termination':
      return <XCircle size={16} />;
    
    // System operations
    case 'coinbase':
      return <Award size={16} />;
    case 'fee_collection':
      return <DollarSign size={16} />;
    case 'governance':
      return <Gavel size={16} />;
    case 'oracle_update':
      return <Database size={16} />;
    
    // Multi-party operations
    case 'multisig_setup':
      return <Shield size={16} />;
    case 'multisig_execution':
      return <Users size={16} />;
    case 'proxy_operation':
      return <Link2 size={16} />;
    
    // Error and recovery
    case 'refund_operation':
      return <AlertTriangle size={16} />;
    case 'emergency_action':
      return <AlertTriangle size={16} />;
    case 'dispute_resolution':
      return <Gavel size={16} />;
    
    // Legacy types
    case 'deposit':
      return <ArrowDownUp size={16} />;
    case 'withdraw':
      return <ArrowUpDown size={16} />;
    case 'swap':
      return <RefreshCw size={16} />;
    case 'setup':
      return <Settings size={16} />;
    
    default:
      return <Hash size={16} />;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'confirmed':
    case 'deeply_confirmed':
      return <CheckCircle size={12} />;
    case 'failed':
    case 'rejected':
      return <XCircle size={12} />;
    case 'expired':
    case 'conflicted':
      return <AlertTriangle size={12} />;
    case 'building':
    case 'signed':
    case 'broadcast':
    case 'pending':
    default:
      return <Clock size={12} />;
  }
};

const getTransactionColor = (type: string, status: string) => {
  // Status-based colors override type colors
  if (status === 'failed' || status === 'rejected') return '#ef4444'; // Red
  if (status === 'pending' || status === 'building') return '#f59e0b'; // Yellow
  if (status === 'expired' || status === 'conflicted') return '#dc2626'; // Dark red
  if (status === 'deeply_confirmed') return '#10b981'; // Green
  
  // Transaction type colors
  switch (type) {
    // DEX operations
    case 'dex_order_placement':
    case 'dex_partial_match':
    case 'dex_full_match':
      return '#059669'; // Green
    case 'dex_order_cancel':
      return '#dc2626'; // Red
    case 'dex_fee_collection':
      return '#ea580c'; // Orange
    
    // Atomic exchanges
    case 'atomic_bid_placement':
      return '#0891b2'; // Teal
    case 'atomic_ask_placement':
      return '#7c3aed'; // Purple
    case 'atomic_settlement':
      return '#d97706'; // Gold
    case 'atomic_refund':
      return '#dc2626'; // Red
    
    // Contract operations
    case 'contract_deployment':
    case 'contract_interaction':
      return '#7c3aed'; // Purple
    case 'contract_upgrade':
      return '#2563eb'; // Blue
    case 'contract_termination':
      return '#dc2626'; // Red
    
    // System operations
    case 'coinbase':
    case 'fee_collection':
      return '#6b7280'; // Gray
    case 'governance':
      return '#2563eb'; // Blue
    case 'oracle_update':
      return '#7c3aed'; // Purple
    
    // Multi-party
    case 'multisig_setup':
    case 'multisig_execution':
      return '#059669'; // Green
    case 'proxy_operation':
      return '#4f46e5'; // Indigo
    
    // Basic transfers
    case 'simple_transfer':
    case 'multi_output':
      return '#2563eb'; // Blue
    case 'consolidation':
      return '#6b7280'; // Gray
    
    // Legacy types
    case 'deposit':
      return '#059669'; // Green
    case 'withdraw':
      return '#dc2626'; // Red
    case 'swap':
      return '#7c3aed'; // Purple
    case 'setup':
      return '#2563eb'; // Blue
    
    default:
      return '#6b7280'; // Gray
  }
};

const getProtocolBadge = (type: string): { label: string; color: string } | null => {
  if (type.startsWith('dex_')) {
    return { label: 'DEX', color: '#059669' };
  }
  if (type.startsWith('atomic_')) {
    return { label: 'ATOMIC', color: '#7c3aed' };
  }
  if (type.startsWith('contract_')) {
    return { label: 'CONTRACT', color: '#7c3aed' };
  }
  if (type.startsWith('multisig_')) {
    return { label: 'MULTISIG', color: '#059669' };
  }
  if (type === 'governance') {
    return { label: 'GOV', color: '#2563eb' };
  }
  if (type === 'oracle_update') {
    return { label: 'ORACLE', color: '#7c3aed' };
  }
  return null;
};

const getStatusIndicator = (status: string) => {
  switch (status) {
    case 'confirmed':
      return { color: '#10b981', label: 'Confirmed' };
    case 'deeply_confirmed':
      return { color: '#059669', label: 'Deep Conf' };
    case 'pending':
    case 'broadcast':
      return { color: '#f59e0b', label: 'Pending' };
    case 'building':
    case 'signed':
      return { color: '#3b82f6', label: 'Building' };
    case 'failed':
    case 'rejected':
      return { color: '#ef4444', label: 'Failed' };
    case 'expired':
      return { color: '#dc2626', label: 'Expired' };
    case 'replaced':
      return { color: '#6b7280', label: 'Replaced' };
    case 'conflicted':
      return { color: '#dc2626', label: 'Conflict' };
    default:
      return { color: '#6b7280', label: 'Unknown' };
  }
};

const TransactionNode: React.FC<NodeProps<TransactionNodeData>> = ({ data, selected }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  
  const txColor = getTransactionColor(data.type, data.status);
  const icon = getTransactionIcon(data.type);
  const statusIcon = getStatusIcon(data.status);
  const protocolBadge = getProtocolBadge(data.type);
  const statusIndicator = getStatusIndicator(data.status);
  
  return (
    <div 
      className={`transaction-node enhanced ${data.type} ${data.status} ${selected ? 'selected' : ''} ${data.isHighlighted ? 'highlighted' : ''} ${data.isActive ? 'active' : ''}`}
      style={{ 
        borderColor: txColor,
        backgroundColor: `${txColor}15`
      }}
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Input Handle - Left */}
      <Handle
        type="target"
        position={Position.Left}
        className="tx-handle input-handle"
        style={{ backgroundColor: txColor }}
      />
      
      {/* Protocol Badge */}
      {protocolBadge && (
        <div className="protocol-badge" style={{ backgroundColor: protocolBadge.color }}>
          {protocolBadge.label}
        </div>
      )}
      
      {/* Transaction Header */}
      <div className="tx-header">
        <div className="tx-icon" style={{ color: txColor }}>
          {icon}
        </div>
        <div className="tx-id-container">
          <div className="tx-id">{data.id.slice(0, 8)}...</div>
          <div className="tx-type">{data.type.replace(/_/g, ' ').toUpperCase()}</div>
        </div>
        <div className="tx-status-icon" style={{ color: statusIndicator.color }}>
          {statusIcon}
        </div>
      </div>
      
      {/* Transaction Summary */}
      <div className="tx-summary">
        <div className="tx-io-count">
          <div className="io-group">
            <span className="io-label">IN</span>
            <span className="io-value">{data.inputs.length}</span>
          </div>
          <div className="io-separator">→</div>
          <div className="io-group">
            <span className="io-label">OUT</span>
            <span className="io-value">{data.outputs.length}</span>
          </div>
        </div>
        
        <div className="tx-fee-summary">
          <span className="fee-label">Fee:</span>
          <span className="fee-value">{formatERGValue(data.fee)}</span>
        </div>
      </div>
      
      {/* DEX Operation Info */}
      {data.dexOperation && (
        <div className="dex-operation-info">
          <div className="operation-type" style={{ color: txColor }}>
            {data.dexOperation.operationType.replace(/_/g, ' ').toUpperCase()}
          </div>
          {data.dexOperation.priceExecuted && (
            <div className="operation-details">
              <span className="price">@{data.dexOperation.priceExecuted.toFixed(4)}</span>
              {data.dexOperation.volumeTraded && (
                <span className="volume">Vol: {data.dexOperation.volumeTraded}</span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Atomic Exchange Info */}
      {data.atomicExchange && (
        <div className="atomic-exchange-info">
          <div className="exchange-type">{data.atomicExchange.exchangeType.toUpperCase()}</div>
          <div className="exchange-participants">
            <span className="participants">2 parties</span>
          </div>
        </div>
      )}
      
      {/* Multi-stage Protocol Info */}
      {data.protocolStage && (
        <div className="protocol-stage-info">
          <div className="stage-indicator">
            Stage {data.protocolStage.currentStage}/{data.protocolStage.totalStages}
          </div>
          <div className="protocol-name">{data.protocolStage.protocol.replace(/_/g, ' ')}</div>
        </div>
      )}
      
      {/* Transaction Details (Expandable) */}
      {showDetails && (
        <div className="tx-details-expanded">
          {data.signer && (
            <div className="detail-row">
              <Users size={12} />
              <span className="detail-label">Signer:</span>
              <span className="detail-value">{data.signer.slice(0, 16)}...</span>
            </div>
          )}
          
          {data.inclusionHeight && (
            <div className="detail-row">
              <Database size={12} />
              <span className="detail-label">Height:</span>
              <span className="detail-value">{data.inclusionHeight}</span>
            </div>
          )}
          
          {data.confirmations > 0 && (
            <div className="detail-row">
              <CheckCircle size={12} />
              <span className="detail-label">Confirmations:</span>
              <span className="detail-value">{data.confirmations}</span>
            </div>
          )}
          
          {data.inputValue && data.outputValue && (
            <div className="detail-row value-flow">
              <Coins size={12} />
              <span className="detail-label">Value Flow:</span>
              <div className="value-breakdown">
                <span className="input-value">In: {formatERGValue(data.inputValue)}</span>
                <span className="output-value">Out: {formatERGValue(data.outputValue)}</span>
              </div>
            </div>
          )}
          
          {/* Execution Context */}
          {data.executionContext && (
            <div className="execution-context">
              <div className="detail-row">
                <Activity size={12} />
                <span className="detail-label">Execution:</span>
                <div className="execution-details">
                  {data.executionContext.gasUsed && (
                    <span className="gas-used">Gas: {data.executionContext.gasUsed}</span>
                  )}
                  {data.executionContext.contractsInvolved.length > 0 && (
                    <span className="contracts-count">{data.executionContext.contractsInvolved.length} contracts</span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Validation Section */}
          {data.validation && (
            <div className="validation-section">
              <div className="validation-header" onClick={() => setShowValidation(!showValidation)}>
                <Shield size={12} />
                <span className="detail-label">Validation</span>
                <span className={`validation-status ${data.validation.isValid ? 'valid' : 'invalid'}`}>
                  {data.validation.isValid ? '✓' : '✗'}
                </span>
                {showValidation ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </div>
              {showValidation && (
                <div className="validation-content">
                  <div className="erg-conservation">
                    <span className="conservation-label">ERG Conservation:</span>
                    <span className={`conservation-status ${data.validation.ergConservation.isConserved ? 'valid' : 'invalid'}`}>
                      {data.validation.ergConservation.isConserved ? '✓' : '✗'}
                    </span>
                  </div>
                  {data.validation.errors.length > 0 && (
                    <div className="validation-errors">
                      <span className="errors-label">Errors:</span>
                      <ul className="errors-list">
                        {data.validation.errors.slice(0, 2).map((error, index) => (
                          <li key={index} className="error-item">{error.slice(0, 40)}...</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Error Information */}
          {data.errorInfo && (
            <div className="error-info">
              <div className="detail-row error">
                <AlertTriangle size={12} />
                <span className="detail-label">Error:</span>
                <span className="detail-value error-message">{data.errorInfo.errorMessage.slice(0, 30)}...</span>
              </div>
              {data.errorInfo.recoveryOptions && data.errorInfo.recoveryOptions.length > 0 && (
                <div className="recovery-options">
                  <span className="recovery-label">Recovery:</span>
                  <span className="recovery-count">{data.errorInfo.recoveryOptions.length} options</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Transaction Description */}
      {data.description && (
        <div className="tx-description">
          {data.description}
        </div>
      )}
      
      {/* Status Badge */}
      <div className="status-badge" style={{ backgroundColor: statusIndicator.color }}>
        {statusIndicator.label}
      </div>
      
      {/* Multi-stage Progress Indicator */}
      {data.protocolStage && (
        <div className="stage-progress">
          <div 
            className="progress-bar" 
            style={{ 
              width: `${(data.protocolStage.currentStage / data.protocolStage.totalStages) * 100}%`,
              backgroundColor: txColor 
            }}
          />
        </div>
      )}
      
      {/* Output Handle - Right */}
      <Handle
        type="source"
        position={Position.Right}
        className="tx-handle output-handle"
        style={{ backgroundColor: txColor }}
      />
    </div>
  );
};

export default TransactionNode;