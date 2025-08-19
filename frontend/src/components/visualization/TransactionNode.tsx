import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { 
  ArrowDownUp, 
  ArrowUpDown, 
  RefreshCw, 
  Zap, 
  Settings,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import type { UTXOTransaction } from './types';
import './TransactionNode.css';

interface TransactionNodeData extends UTXOTransaction {
  isHighlighted?: boolean;
  isActive?: boolean;
}

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'deposit':
      return <ArrowDownUp size={16} />;
    case 'withdraw':
      return <ArrowUpDown size={16} />;
    case 'swap':
      return <RefreshCw size={16} />;
    case 'setup':
      return <Settings size={16} />;
    default:
      return <Zap size={16} />;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'confirmed':
      return <CheckCircle size={12} />;
    case 'failed':
      return <XCircle size={12} />;
    case 'pending':
    default:
      return <Clock size={12} />;
  }
};

const getTransactionColor = (type: string, status: string) => {
  if (status === 'failed') return '#ef4444'; // Red
  if (status === 'pending') return '#f59e0b'; // Yellow
  
  switch (type) {
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

const formatFee = (fee: string | number): string => {
  const numFee = typeof fee === 'string' ? parseFloat(fee.replace(/[^\d.]/g, '')) : fee;
  if (isNaN(numFee)) return fee.toString();
  return `${(numFee / 1000000000).toFixed(6)} ERG`;
};

const TransactionNode: React.FC<NodeProps<TransactionNodeData>> = ({ data, selected }) => {
  const txColor = getTransactionColor(data.type, data.status);
  const icon = getTransactionIcon(data.type);
  const statusIcon = getStatusIcon(data.status);
  
  return (
    <div 
      className={`transaction-node ${data.type} ${data.status} ${selected ? 'selected' : ''} ${data.isHighlighted ? 'highlighted' : ''} ${data.isActive ? 'active' : ''}`}
      style={{ 
        borderColor: txColor,
        backgroundColor: `${txColor}15`
      }}
    >
      {/* Input Handle - Left */}
      <Handle
        type="target"
        position={Position.Left}
        className="tx-handle input-handle"
        style={{ backgroundColor: txColor }}
      />
      
      {/* Transaction Header */}
      <div className="tx-header">
        <div className="tx-icon" style={{ color: txColor }}>
          {icon}
        </div>
        <div className="tx-id">{data.id.replace(/Transaction(?:Signed)?$/, '')}</div>
        <div className="tx-status" style={{ color: txColor }}>
          {statusIcon}
        </div>
      </div>
      
      {/* Transaction Type Badge */}
      <div className="tx-type-badge" style={{ backgroundColor: txColor }}>
        {data.type.toUpperCase()}
      </div>
      
      {/* Transaction Details */}
      <div className="tx-details">
        <div className="tx-io-count">
          <span className="io-label">IN:</span>
          <span className="io-value">{data.inputs.length}</span>
          <span className="io-separator">→</span>
          <span className="io-label">OUT:</span>
          <span className="io-value">{data.outputs.length}</span>
        </div>
        
        <div className="tx-fee">
          <span className="fee-label">Fee:</span>
          <span className="fee-value">{formatFee(data.fee)}</span>
        </div>
        
        {data.signer && (
          <div className="tx-signer">
            <span className="signer-label">Signer:</span>
            <span className="signer-value">{data.signer}</span>
          </div>
        )}
      </div>
      
      {/* Transaction Description */}
      {data.description && (
        <div className="tx-description">
          {data.description}
        </div>
      )}
      
      {/* Status Indicator */}
      <div 
        className={`tx-status-indicator ${data.status}`}
        style={{ backgroundColor: txColor }}
      />
      
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