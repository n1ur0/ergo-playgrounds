import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Wallet, Lock, Users, Coins, Settings } from 'lucide-react';
import type { UTXOBox } from './types';
import './UTXOBoxNode.css';

interface UTXOBoxNodeData extends UTXOBox {
  isHighlighted?: boolean;
  isActive?: boolean;
}

const formatValue = (value: string | number): string => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.]/g, '')) : value;
  if (isNaN(numValue)) return value.toString();
  return `${(numValue / 1000000000).toFixed(3)} ERG`;
};

const getBoxIcon = (type: string) => {
  switch (type) {
    case 'user':
      return <Wallet size={16} />;
    case 'contract':
      return <Lock size={16} />;
    case 'system':
      return <Settings size={16} />;
    default:
      return <Coins size={16} />;
  }
};

const getBoxColor = (state: string, type: string) => {
  if (state === 'spending') return '#ea580c'; // Orange
  if (state === 'spent') return '#6b7280'; // Gray
  
  switch (type) {
    case 'user':
      return '#2563eb'; // Blue
    case 'contract':
      return '#7c3aed'; // Purple
    case 'system':
      return '#059669'; // Green
    default:
      return '#2563eb';
  }
};

const UTXOBoxNode: React.FC<NodeProps<UTXOBoxNodeData>> = ({ data, selected }) => {
  const boxColor = getBoxColor(data.state, data.type);
  const icon = getBoxIcon(data.type);
  
  return (
    <div 
      className={`utxo-box-node ${data.state} ${data.type} ${selected ? 'selected' : ''} ${data.isHighlighted ? 'highlighted' : ''} ${data.isActive ? 'active' : ''}`}
      style={{ 
        borderColor: boxColor,
        backgroundColor: `${boxColor}15`
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="utxo-handle input-handle"
      />
      
      {/* Box Header */}
      <div className="box-header">
        <div className="box-icon" style={{ color: boxColor }}>
          {icon}
        </div>
        <div className="box-id">{data.id.replace(/Box$/, '')}</div>
        <div className="box-state-indicator" style={{ backgroundColor: boxColor }} />
      </div>
      
      {/* Box Value */}
      <div className="box-value">
        {formatValue(data.value)}
      </div>
      
      {/* Box Details */}
      <div className="box-details">
        {data.script && (
          <div className="box-script">
            <span className="detail-label">Script:</span>
            <span className="detail-value">{data.script}</span>
          </div>
        )}
        
        {data.party && (
          <div className="box-party">
            <Users size={12} />
            <span>{data.party}</span>
          </div>
        )}
        
        {data.tokens && data.tokens.length > 0 && (
          <div className="box-tokens">
            <Coins size={12} />
            <span>{data.tokens.length} token{data.tokens.length !== 1 ? 's' : ''}</span>
          </div>
        )}
        
        {data.registers && Object.keys(data.registers).length > 0 && (
          <div className="box-registers">
            <Settings size={12} />
            <span>{Object.keys(data.registers).length} register{Object.keys(data.registers).length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
      
      {/* Box Description */}
      {data.description && (
        <div className="box-description">
          {data.description}
        </div>
      )}
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="utxo-handle output-handle"
      />
    </div>
  );
};

export default UTXOBoxNode;