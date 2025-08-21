import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { 
  Wallet, 
  Lock, 
  Users, 
  Coins, 
  Settings, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  DollarSign, 
  Shield, 
  Clock, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight,
  Database,
  Link2,
  Target,
  Award,
  Gavel,
  RefreshCw,
  Eye,
  EyeOff,
  Key,
  Fingerprint,
  Mail,
  UserCheck
} from 'lucide-react';
import type { UTXOBox, EnhancedUTXOBox, ErgoToken } from './types';
import './UTXOBoxNode.css';

interface UTXOBoxNodeData extends EnhancedUTXOBox {
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

const formatTokenAmount = (token: ErgoToken): string => {
  const amount = typeof token.amount === 'string' ? parseFloat(token.amount) : token.amount;
  const decimals = token.metadata?.decimals || 0;
  const formattedAmount = decimals > 0 ? (amount / Math.pow(10, decimals)) : amount;
  
  if (formattedAmount >= 1000000) return `${(formattedAmount / 1000000).toFixed(2)}M`;
  if (formattedAmount >= 1000) return `${(formattedAmount / 1000).toFixed(2)}K`;
  return formattedAmount.toFixed(decimals > 0 ? 2 : 0);
};

const getBoxIcon = (boxType: string) => {
  switch (boxType) {
    // DEX boxes
    case 'buy_order':
      return <TrendingUp size={16} />;
    case 'sell_order':
      return <TrendingDown size={16} />;
    case 'partial_buy_order':
      return <TrendingUp size={14} />;
    case 'partial_sell_order':
      return <TrendingDown size={14} />;
    case 'settlement':
      return <Target size={16} />;
    case 'dex_fee':
      return <DollarSign size={16} />;
    
    // Atomic exchange boxes
    case 'atomic_bid':
      return <Zap size={16} />;
    case 'atomic_ask':
      return <RefreshCw size={16} />;
    case 'atomic_settlement':
      return <Award size={16} />;
    
    // System boxes
    case 'fee_collection':
      return <DollarSign size={16} />;
    case 'miner_reward':
      return <Award size={16} />;
    case 'governance':
      return <Gavel size={16} />;
    case 'oracle_pool':
      return <Database size={16} />;
    
    // Utility boxes
    case 'contract_state':
      return <Settings size={16} />;
    case 'refund':
      return <AlertTriangle size={16} />;
    case 'time_locked':
      return <Clock size={16} />;
    case 'multi_sig':
      return <Shield size={16} />;
    case 'proxy':
      return <Link2 size={16} />;
    
    // Stealth address privacy boxes
    case 'stealth_meta_address':
      return <UserCheck size={16} />;
    case 'stealth_payment':
      return <EyeOff size={16} />;
    case 'stealth_notification':
      return <Mail size={16} />;
    case 'stealth_claim':
      return <Key size={16} />;
    
    // Basic boxes
    case 'wallet':
      return <Wallet size={16} />;
    case 'change':
      return <Coins size={16} />;
    
    default:
      return <Coins size={16} />;
  }
};

const getBoxColor = (state: string, boxType: string) => {
  // State-based colors override type colors
  if (state === 'spending' || state === 'pending_spend') return '#ea580c'; // Orange
  if (state === 'spent') return '#6b7280'; // Gray
  if (state === 'expired') return '#dc2626'; // Red
  if (state === 'cancelled') return '#7c2d12'; // Dark red
  if (state === 'locked') return '#f59e0b'; // Yellow
  
  // Box type colors
  switch (boxType) {
    // DEX boxes
    case 'buy_order':
    case 'partial_buy_order':
      return '#059669'; // Green
    case 'sell_order':
    case 'partial_sell_order':
      return '#dc2626'; // Red
    case 'settlement':
      return '#2563eb'; // Blue
    case 'dex_fee':
      return '#ea580c'; // Orange
    
    // Atomic exchange boxes
    case 'atomic_bid':
      return '#0891b2'; // Teal
    case 'atomic_ask':
      return '#7c3aed'; // Purple
    case 'atomic_settlement':
      return '#d97706'; // Gold
    
    // System boxes
    case 'fee_collection':
      return '#6b7280'; // Gray
    case 'miner_reward':
      return '#a3a3a3'; // Silver
    case 'governance':
      return '#2563eb'; // Blue
    case 'oracle_pool':
      return '#7c3aed'; // Purple
    
    // Utility boxes
    case 'contract_state':
      return '#7c3aed'; // Purple
    case 'refund':
      return '#dc2626'; // Red
    case 'time_locked':
      return '#f59e0b'; // Yellow
    case 'multi_sig':
      return '#059669'; // Green
    case 'proxy':
      return '#4f46e5'; // Indigo
    
    // Stealth address privacy boxes
    case 'stealth_meta_address':
      return '#6366f1'; // Indigo-blue
    case 'stealth_payment':
      return '#8b5cf6'; // Purple
    case 'stealth_notification':
      return '#06b6d4'; // Cyan
    case 'stealth_claim':
      return '#10b981'; // Green
    
    // Basic boxes
    case 'wallet':
      return '#2563eb'; // Blue
    case 'change':
      return '#6b7280'; // Gray
    
    default:
      return '#2563eb';
  }
};

const getStateIndicator = (state: string) => {
  switch (state) {
    case 'unspent':
      return { color: '#10b981', label: 'Available' };
    case 'spending':
    case 'pending_spend':
      return { color: '#ea580c', label: 'Spending' };
    case 'spent':
      return { color: '#6b7280', label: 'Spent' };
    case 'locked':
      return { color: '#f59e0b', label: 'Locked' };
    case 'partial_match':
      return { color: '#8b5cf6', label: 'Partial' };
    case 'awaiting_settlement':
      return { color: '#06b6d4', label: 'Awaiting' };
    case 'expired':
      return { color: '#dc2626', label: 'Expired' };
    case 'cancelled':
      return { color: '#7c2d12', label: 'Cancelled' };
    default:
      return { color: '#6b7280', label: 'Unknown' };
  }
};

const getProtocolBadge = (boxType: string): { label: string; color: string } | null => {
  if (['buy_order', 'sell_order', 'partial_buy_order', 'partial_sell_order', 'settlement', 'dex_fee'].includes(boxType)) {
    return { label: 'DEX', color: '#059669' };
  }
  if (['atomic_bid', 'atomic_ask', 'atomic_settlement'].includes(boxType)) {
    return { label: 'ATOMIC', color: '#7c3aed' };
  }
  if (['governance'].includes(boxType)) {
    return { label: 'GOV', color: '#2563eb' };
  }
  if (['oracle_pool'].includes(boxType)) {
    return { label: 'ORACLE', color: '#7c3aed' };
  }
  return null;
};

const UTXOBoxNode: React.FC<NodeProps<UTXOBoxNodeData>> = ({ data, selected }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showRegisters, setShowRegisters] = useState(false);
  
  const boxColor = getBoxColor(data.state, data.boxType || 'wallet');
  const icon = getBoxIcon(data.boxType || 'wallet');
  const stateIndicator = getStateIndicator(data.state);
  const protocolBadge = getProtocolBadge(data.boxType || 'wallet');
  
  return (
    <div 
      className={`utxo-box-node enhanced ${data.state} ${data.boxType} ${selected ? 'selected' : ''} ${data.isHighlighted ? 'highlighted' : ''} ${data.isActive ? 'active' : ''}`}
      style={{ 
        borderColor: boxColor,
        backgroundColor: `${boxColor}15`
      }}
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="utxo-handle input-handle"
        style={{ backgroundColor: boxColor }}
      />
      
      {/* Protocol Badge */}
      {protocolBadge && (
        <div className="protocol-badge" style={{ backgroundColor: protocolBadge.color }}>
          {protocolBadge.label}
        </div>
      )}
      
      {/* Box Header */}
      <div className="box-header">
        <div className="box-icon" style={{ color: boxColor }}>
          {icon}
        </div>
        <div className="box-id-container">
          <div className="box-id">{data.id.slice(0, 8)}...</div>
          <div className="box-type">{data.boxType?.replace(/_/g, ' ').toUpperCase()}</div>
        </div>
        <div className="box-state-indicator" 
             style={{ backgroundColor: stateIndicator.color }}
             title={stateIndicator.label}
        />
      </div>
      
      {/* Box Value */}
      <div className="box-value-section">
        <div className="box-value">
          {formatERGValue(data.value)}
        </div>
        {data.tokens && data.tokens.length > 0 && (
          <div className="token-chips">
            {data.tokens.slice(0, 2).map((token, index) => (
              <div key={index} className="token-chip" title={`${token.metadata?.name || token.id.slice(0, 8)} - ${formatTokenAmount(token)}`}>
                <span className="token-symbol">{token.metadata?.name?.slice(0, 3) || token.id.slice(0, 3)}</span>
                <span className="token-amount">{formatTokenAmount(token)}</span>
              </div>
            ))}
            {data.tokens.length > 2 && (
              <div className="token-chip more-tokens">
                +{data.tokens.length - 2}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* DEX Order Info */}
      {data.dexOrder && (
        <div className="dex-order-info">
          <div className="order-type" style={{ color: data.dexOrder.orderType === 'buy' ? '#059669' : '#dc2626' }}>
            {data.dexOrder.orderType.toUpperCase()}
          </div>
          <div className="order-details">
            <span className="price">@{data.dexOrder.price.toFixed(4)}</span>
            <span className="filled">{data.dexOrder.filled}% filled</span>
          </div>
        </div>
      )}
      
      {/* Atomic Exchange Info */}
      {data.atomicExchange && (
        <div className="atomic-exchange-info">
          <div className="exchange-type">{data.atomicExchange.exchangeType.toUpperCase()}</div>
          <div className="exchange-assets">
            <span className="offered">Offer: {formatTokenAmount({ id: '', amount: data.atomicExchange.offeredAsset.amount } as ErgoToken)} {data.atomicExchange.offeredAsset.type}</span>
          </div>
        </div>
      )}
      
      {/* Stealth Address Info */}
      {data.stealthAddress && (
        <div className="stealth-address-info">
          <div className="stealth-header">
            <div className={`stealth-privacy-level ${data.stealthAddress.privacyLevel}`}>
              <EyeOff size={10} />
              {data.stealthAddress.privacyLevel.toUpperCase()}
            </div>
            <div className="stealth-phase">{data.stealthAddress.stealthType}</div>
          </div>
          {data.stealthAddress.ephemeralKey && (
            <div className="cryptographic-proof">
              <Key size={10} />
              <span>Ephemeral Key: {data.stealthAddress.ephemeralKey.slice(0, 16)}...</span>
            </div>
          )}
          {data.stealthAddress.viewKey && (
            <div className="cryptographic-proof">
              <Eye size={10} />
              <span>View Key: {data.stealthAddress.viewKey.slice(0, 16)}...</span>
            </div>
          )}
          {data.stealthAddress.encryptedPayload && (
            <div className="cryptographic-proof">
              <Lock size={10} />
              <span>Encrypted Payload: {data.stealthAddress.encryptedPayload.slice(0, 16)}...</span>
            </div>
          )}
          {data.stealthAddress.detectionHint && (
            <div className="cryptographic-proof">
              <Fingerprint size={10} />
              <span>Detection Hint: {data.stealthAddress.detectionHint.slice(0, 16)}...</span>
            </div>
          )}
          {data.stealthAddress.forwardSecrecy && (
            <div className="forward-secrecy-badge">
              <Shield size={8} />
              Forward Secrecy
            </div>
          )}
        </div>
      )}
      
      {/* Box Details (Expandable) */}
      {showDetails && (
        <div className="box-details-expanded">
          {data.owner && (
            <div className="detail-row">
              <Users size={12} />
              <span className="detail-label">Owner:</span>
              <span className="detail-value">{data.owner}</span>
            </div>
          )}
          
          {data.script && (
            <div className="detail-row">
              <Lock size={12} />
              <span className="detail-label">Script:</span>
              <span className="detail-value script-preview" title={data.script}>
                {data.script.slice(0, 30)}...
              </span>
            </div>
          )}
          
          {data.creationHeight && (
            <div className="detail-row">
              <Database size={12} />
              <span className="detail-label">Height:</span>
              <span className="detail-value">{data.creationHeight}</span>
            </div>
          )}
          
          {data.temporalConstraints && (
            <div className="detail-row temporal-constraints">
              <Clock size={12} />
              <span className="detail-label">Constraints:</span>
              <div className="constraints-list">
                {data.temporalConstraints.deadline && (
                  <span className="constraint">Deadline: {data.temporalConstraints.deadline}</span>
                )}
                {data.temporalConstraints.lockHeight && (
                  <span className="constraint">Lock: {data.temporalConstraints.lockHeight}</span>
                )}
              </div>
            </div>
          )}
          
          {/* Registers Section */}
          {data.registers && Object.keys(data.registers).length > 0 && (
            <div className="registers-section">
              <div className="registers-header" onClick={() => setShowRegisters(!showRegisters)}>
                <Settings size={12} />
                <span className="detail-label">Registers ({Object.keys(data.registers).length})</span>
                {showRegisters ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </div>
              {showRegisters && (
                <div className="registers-content">
                  {Object.entries(data.registers).map(([reg, value]) => (
                    <div key={reg} className="register-item">
                      <span className="register-name">{reg}:</span>
                      <span className="register-value">{JSON.stringify(value).slice(0, 20)}...</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Box Description */}
      {data.description && (
        <div className="box-description">
          {data.description}
        </div>
      )}
      
      {/* State Badge */}
      <div className="state-badge" style={{ backgroundColor: stateIndicator.color }}>
        {stateIndicator.label}
      </div>
      
      {/* Relationship Indicators */}
      {data.parentBoxId && (
        <div className="relationship-indicator parent" title="Has parent box">
          <Link2 size={10} />
        </div>
      )}
      {data.childBoxIds && data.childBoxIds.length > 0 && (
        <div className="relationship-indicator children" title={`${data.childBoxIds.length} child boxes`}>
          <span>{data.childBoxIds.length}</span>
        </div>
      )}
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="utxo-handle output-handle"
        style={{ backgroundColor: boxColor }}
      />
    </div>
  );
};

export default UTXOBoxNode;