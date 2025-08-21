import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { enhancedContractParser } from './ContractParser';
import type { 
  EnhancedVisualizationData,
  EnhancedUTXOBox,
  EnhancedUTXOTransaction,
  BoxRelationship
} from './types';
import './SimplifiedUTXOVisualization.css';

interface SimplifiedUTXOVisualizationProps {
  contractCode: string;
  isRunning?: boolean;
  executionStep?: number;
  maxSteps?: number;
}

interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

interface TooltipProps {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

interface FlowElement {
  type: 'box' | 'transaction' | 'arrow';
  id: string;
  data?: EnhancedUTXOBox | EnhancedUTXOTransaction;
  direction?: 'right' | 'down' | 'split';
  connections?: string[];
  position?: { x: number; y: number };
  isMultiOutput?: boolean;
}

interface UTXOBoxProps {
  box: EnhancedUTXOBox;
  isActive?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
}

interface TransactionNodeProps {
  transaction: EnhancedUTXOTransaction;
  isActive?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
}

interface FlowArrowProps {
  direction?: 'right' | 'down' | 'split';
  isAnimated?: boolean;
  label?: string;
  'aria-label'?: string;
}

// ============================================================================
// Tooltip Component
// ============================================================================

const TooltipComponent: React.FC<TooltipProps> = React.memo(({ visible, content, x, y }) => {
  if (!visible || !content) return null;

  return (
    <div 
      className="utxo-tooltip"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y - 10}px`,
        transform: 'translateX(-50%)',
        zIndex: 1000,
        pointerEvents: 'none'
      }}
      role="tooltip"
      aria-hidden={!visible}
    >
      <div className="tooltip-content">
        {content}
      </div>
    </div>
  );
});

// ============================================================================
// UTXO Box Component
// ============================================================================

const UTXOBoxComponent: React.FC<UTXOBoxProps> = React.memo(({ 
  box, 
  isActive, 
  isHighlighted, 
  onClick 
}) => {
  const getBoxTypeClass = (boxType: string) => {
    switch (boxType) {
      case 'wallet': return 'utxo-box sender';
      case 'contract_state': return 'utxo-box contract';
      case 'change': return 'utxo-box change';
      case 'buy_order': return 'utxo-box dex-buy';
      case 'sell_order': return 'utxo-box dex-sell';
      default: return 'utxo-box sender';
    }
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      return `${(value / 1000000000).toFixed(3)} ERG`;
    }
    return value?.toString() || '0 ERG';
  };

  const formatNanoERG = (value: any): string => {
    if (typeof value === 'number') {
      return `${value.toLocaleString()} nERG`;
    }
    return '0 nERG';
  };

  const getPartyLabel = () => {
    if (box.boxType === 'contract_state') return 'CONTRACT';
    if (box.boxType === 'change') return 'SENDER';
    return box.owner?.toUpperCase() || 'SENDER';
  };

  const getBoxTitle = () => {
    switch (box.boxType) {
      case 'wallet': return "Sender's Box";
      case 'contract_state': return "True Contract";
      case 'change': return "Change Output";
      case 'buy_order': return "DEX Buy Order";
      case 'sell_order': return "DEX Sell Order";
      case 'partial_buy_order': return "Partial Buy Order";
      case 'partial_sell_order': return "Partial Sell Order";
      case 'atomic_bid': return "Atomic Bid";
      case 'atomic_ask': return "Atomic Ask";
      case 'settlement': return "Settlement Box";
      case 'refund': return "Refund Box";
      case 'time_locked': return "Time-Locked Box";
      default: return box.description || `Box ${box.id.substring(0, 8)}...`;
    }
  };

  const getBoxSubtitle = () => {
    switch (box.boxType) {
      case 'wallet': return "Initial Wallet UTXO";
      case 'contract_state': return "Smart Contract UTXO";
      case 'change': return "Wallet Change UTXO";
      case 'buy_order': return "DEX Buy Position";
      case 'sell_order': return "DEX Sell Position";
      case 'partial_buy_order': return "Partially Filled Buy";
      case 'partial_sell_order': return "Partially Filled Sell";
      case 'atomic_bid': return "Atomic Exchange Bid";
      case 'atomic_ask': return "Atomic Exchange Ask";
      case 'settlement': return "Trade Settlement";
      case 'refund': return "Refund Recovery";
      case 'time_locked': return "Temporally Locked";
      default: return box.boxType.replace(/_/g, ' ').toUpperCase();
    }
  };

  return (
    <div 
      className={`${getBoxTypeClass(box.boxType)} ${isActive ? 'active' : ''} ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${getBoxTitle()}. Value: ${formatValue(box.value)}. ${box.tokens?.length ? `Contains ${box.tokens.length} tokens. ` : ''}Click to ${isHighlighted ? 'deselect' : 'select'}.`}
      aria-pressed={isHighlighted}
      aria-describedby={`box-details-${box.id}`}
      data-tooltip={`UTXO containing ${formatValue(box.value)} with ${box.script || 'P2PK script'}`}
    >
      {/* Party Indicator */}
      <div className="party-indicator">{getPartyLabel()}</div>
      
      {/* State Badge */}
      <div className={`state-badge ${box.state || 'unspent'}`}>
        {(box.state || 'unspent').toUpperCase()}
      </div>

      {/* Box Header */}
      <div className="box-header">
        <div className="box-icon">
          {box.boxType === 'wallet' && '👤'}
          {box.boxType === 'contract_state' && '📜'}
          {box.boxType === 'change' && '🔄'}
          {box.boxType === 'buy_order' && '🟢'}
          {box.boxType === 'sell_order' && '🔴'}
          {box.boxType === 'partial_buy_order' && '🟡'}
          {box.boxType === 'partial_sell_order' && '🟠'}
          {box.boxType === 'atomic_bid' && '⚡'}
          {box.boxType === 'atomic_ask' && '🔋'}
          {box.boxType === 'settlement' && '✅'}
          {box.boxType === 'refund' && '↩️'}
          {box.boxType === 'time_locked' && '🕒'}
          {!['wallet', 'contract_state', 'change', 'buy_order', 'sell_order', 'partial_buy_order', 'partial_sell_order', 'atomic_bid', 'atomic_ask', 'settlement', 'refund', 'time_locked'].includes(box.boxType) && '📦'}
        </div>
        <div className="box-info">
          <h3>{getBoxTitle()}</h3>
          <div className="box-type">{getBoxSubtitle()}</div>
        </div>
      </div>

      {/* Box Value */}
      <div className="box-value">
        {formatValue(box.value)}
      </div>

      {/* Box Details */}
      <div className="box-details" id={`box-details-${box.id}`}>
        <div className="detail-row">
          <span className="detail-label">Box ID:</span>
          <span className="detail-value">{box.id.length > 12 ? box.id.substring(0, 12) + '...' : box.id}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Value:</span>
          <span className="detail-value">{formatNanoERG(box.value)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Script:</span>
          <span className="detail-value">
            {box.script || (box.boxType === 'contract_state' ? 'sigmaProp(1==1)' : 'P2PK(senderPk)')}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Tokens:</span>
          <span className="detail-value">{box.tokens && box.tokens.length > 0 ? box.tokens.length : 'None'}</span>
        </div>
        {box.state && (
          <div className="detail-row">
            <span className="detail-label">State:</span>
            <span className="detail-value">{box.state.replace(/_/g, ' ').toUpperCase()}</span>
          </div>
        )}
        {box.creationHeight && (
          <div className="detail-row">
            <span className="detail-label">Height:</span>
            <span className="detail-value">{box.creationHeight.toLocaleString()}</span>
          </div>
        )}
        
        {box.script && box.boxType === 'contract_state' && (
          <div className="script-preview" title={box.script}>
            {box.script.length > 30 ? `${box.script.substring(0, 30)}...` : box.script}
          </div>
        )}
        
        {box.tokens && box.tokens.length > 0 && (
          <div className="token-chips">
            {box.tokens.slice(0, 3).map((token, index) => (
              <div key={token.id} className="token-chip" title={`Token ID: ${token.id}`}>
                <span className="token-symbol">
                  {token.metadata?.name || `T${index + 1}`}
                </span>
                <span className="token-amount">
                  {typeof token.amount === 'number' ? token.amount.toLocaleString() : token.amount}
                </span>
              </div>
            ))}
            {box.tokens.length > 3 && (
              <div className="token-chip more-tokens">
                +{box.tokens.length - 3} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// Transaction Node Component
// ============================================================================

const TransactionNodeComponent: React.FC<TransactionNodeProps> = React.memo(({ 
  transaction, 
  isActive, 
  isHighlighted, 
  onClick 
}) => {
  const getTransactionTitle = () => {
    switch (transaction.type) {
      case 'simple_transfer': return 'Simple Transfer';
      case 'dex_order_placement': return 'DEX Order Placement';
      case 'dex_partial_match': return 'DEX Partial Match';
      case 'dex_full_match': return 'DEX Full Match';
      case 'dex_order_cancel': return 'DEX Order Cancel';
      case 'atomic_bid_placement': return 'Atomic Bid Placement';
      case 'atomic_ask_placement': return 'Atomic Ask Placement';
      case 'atomic_settlement': return 'Atomic Settlement';
      case 'contract_deployment': return 'Contract Deployment';
      case 'contract_interaction': return 'Contract Interaction';
      case 'refund_operation': return 'Refund Operation';
      default:
        if (transaction.id.toLowerCase().includes('deposit')) return 'Deposit Transaction';
        if (transaction.id.toLowerCase().includes('withdraw')) return 'Withdraw Transaction';
        return transaction.description || `Transaction ${transaction.id.substring(0, 8)}...`;
    }
  };

  const getTransactionSubtitle = () => {
    switch (transaction.type) {
      case 'simple_transfer': return 'Basic Value Transfer';
      case 'dex_order_placement': return 'Order Book Entry';
      case 'dex_partial_match': return 'Partial Order Fill';
      case 'dex_full_match': return 'Complete Order Fill';
      case 'dex_order_cancel': return 'Order Cancellation';
      case 'atomic_bid_placement': return 'Atomic Bid Entry';
      case 'atomic_ask_placement': return 'Atomic Ask Entry';
      case 'atomic_settlement': return 'Atomic Exchange';
      case 'contract_deployment': return 'Smart Contract Setup';
      case 'contract_interaction': return 'Contract Execution';
      case 'refund_operation': return 'Fund Recovery';
      default:
        if (transaction.id.toLowerCase().includes('deposit')) return 'Contract Creation';
        if (transaction.id.toLowerCase().includes('withdraw')) return 'Fund Recovery';
        return transaction.type.replace(/_/g, ' ').toUpperCase();
    }
  };

  const formatFee = (fee: any): string => {
    if (typeof fee === 'number') {
      return `${fee.toLocaleString()}`;
    }
    return '1,000';
  };

  return (
    <div 
      className={`transaction-node ${isActive ? 'active' : ''} ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${getTransactionTitle()}. ${transaction.inputs.length} inputs and ${transaction.outputs.length} outputs. Fee: ${formatFee(transaction.fee)} nanoERG. Click to ${isHighlighted ? 'deselect' : 'select'}.`}
      aria-pressed={isHighlighted}
      aria-describedby={`tx-details-${transaction.id}`}
      data-tooltip={`${getTransactionTitle()} with ${transaction.inputs.length} input(s) and ${transaction.outputs.length} output(s)`}
    >
      {/* Transaction Header */}
      <div className="tx-header">
        <h3>{getTransactionTitle()}</h3>
        <div className="tx-type">{getTransactionSubtitle()}</div>
      </div>

      {/* Transaction Summary */}
      <div className="tx-summary" id={`tx-details-${transaction.id}`}>
        <div className="tx-io-count">
          <div className="io-group">
            <span className="io-label">Inputs</span>
            <div className="io-value">{transaction.inputs.length}</div>
          </div>
          <div className="io-separator">→</div>
          <div className="io-group">
            <span className="io-label">Outputs</span>
            <div className="io-value">{transaction.outputs.length}</div>
          </div>
        </div>
        <div className="tx-fee-summary">
          <span className="fee-label">Fee:</span>
          <span className="fee-value">{formatFee(transaction.fee)} nERG</span>
        </div>
        {transaction.status && (
          <div className={`status-badge status-${transaction.status}`}>
            {transaction.status.replace(/_/g, ' ').toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// Flow Arrow Component
// ============================================================================

const FlowArrowComponent: React.FC<FlowArrowProps> = React.memo(({ 
  direction = 'right', 
  isAnimated = false,
  label,
  'aria-label': ariaLabel
}) => {
  const getArrowClass = () => {
    switch (direction) {
      case 'down': return 'arrow-down';
      case 'split': return 'arrow-split';
      default: return 'arrow-right';
    }
  };

  const arrowId = `arrow-${direction}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div 
      className={`flow-arrow ${getArrowClass()} ${isAnimated ? 'animated' : ''}`}
      role="img"
      aria-label={ariaLabel || label || `Arrow pointing ${direction}`}
      title={label}
    >
      {direction === 'right' && (
        <svg 
          viewBox="0 0 120 24" 
          className="arrow-svg"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <marker 
              id={`arrowhead-${arrowId}`} 
              markerWidth="12" 
              markerHeight="8" 
              refX="12" 
              refY="4" 
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path 
                d="M 0 0 L 12 4 L 0 8 Z" 
                fill="currentColor" 
                stroke="none"
              />
            </marker>
            {isAnimated && (
              <linearGradient id={`gradient-${arrowId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.3">
                  <animate attributeName="stop-opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
                </stop>
                <stop offset="50%" stopColor="currentColor" stopOpacity="1">
                  <animate attributeName="stop-opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
                </stop>
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.3">
                  <animate attributeName="stop-opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
                </stop>
              </linearGradient>
            )}
          </defs>
          <line 
            x1="8" 
            y1="12" 
            x2="104" 
            y2="12" 
            stroke={isAnimated ? `url(#gradient-${arrowId})` : 'currentColor'}
            strokeWidth="3" 
            strokeLinecap="round"
            markerEnd={`url(#arrowhead-${arrowId})`}
          />
          {label && (
            <text 
              x="60" 
              y="20" 
              textAnchor="middle" 
              fontSize="10" 
              fill="currentColor" 
              opacity="0.8"
            >
              {label}
            </text>
          )}
        </svg>
      )}
      
      {direction === 'down' && (
        <svg 
          viewBox="0 0 24 120" 
          className="arrow-svg"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <marker 
              id={`arrowhead-down-${arrowId}`} 
              markerWidth="8" 
              markerHeight="12" 
              refX="4" 
              refY="12" 
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path 
                d="M 0 0 L 8 0 L 4 12 Z" 
                fill="currentColor" 
                stroke="none"
              />
            </marker>
          </defs>
          <line 
            x1="12" 
            y1="8" 
            x2="12" 
            y2="104" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round"
            markerEnd={`url(#arrowhead-down-${arrowId})`}
          />
        </svg>
      )}

      {direction === 'split' && (
        <svg 
          viewBox="0 0 140 80" 
          className="arrow-svg"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <marker 
              id={`arrowhead-split1-${arrowId}`} 
              markerWidth="12" 
              markerHeight="8" 
              refX="12" 
              refY="4" 
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path 
                d="M 0 0 L 12 4 L 0 8 Z" 
                fill="currentColor" 
                stroke="none"
              />
            </marker>
            <marker 
              id={`arrowhead-split2-${arrowId}`} 
              markerWidth="12" 
              markerHeight="8" 
              refX="12" 
              refY="4" 
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path 
                d="M 0 0 L 12 4 L 0 8 Z" 
                fill="currentColor" 
                stroke="none"
              />
            </marker>
          </defs>
          <line 
            x1="8" 
            y1="40" 
            x2="60" 
            y2="40" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round"
          />
          <line 
            x1="60" 
            y1="40" 
            x2="124" 
            y2="20" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round"
            markerEnd={`url(#arrowhead-split1-${arrowId})`}
          />
          <line 
            x1="60" 
            y1="40" 
            x2="124" 
            y2="60" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round"
            markerEnd={`url(#arrowhead-split2-${arrowId})`}
          />
          <circle 
            cx="60" 
            cy="40" 
            r="4" 
            fill="currentColor" 
            opacity="0.8"
          />
        </svg>
      )}
    </div>
  );
});

// ============================================================================
// Main Simplified UTXO Visualization Component
// ============================================================================

const SimplifiedUTXOVisualization: React.FC<SimplifiedUTXOVisualizationProps> = React.memo(({
  contractCode,
  isRunning = false,
  executionStep = 0,
  maxSteps = 0
}) => {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: '',
    x: 0,
    y: 0
  });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const visualizationData = useMemo(() => {
    if (!contractCode) return null;
    try {
      return enhancedContractParser.parseContract(contractCode);
    } catch (error) {
      console.error('Error parsing contract:', error);
      return null;
    }
  }, [contractCode]);

  const flowElements = useMemo(() => {
    if (!visualizationData) return [];
    
    const elements: FlowElement[] = [];
    const { boxes, transactions, relationships } = visualizationData;
    
    // Create a proper flow structure: Input Boxes → Arrow → Transaction → Arrow → Output Boxes
    const processedTxs = new Set<string>();
    
    for (const tx of transactions) {
      if (processedTxs.has(tx.id)) continue;
      
      // Find input and output boxes for this transaction
      const inputBoxes = tx.inputs.map(inputId => 
        boxes.find(box => box.id === inputId)
      ).filter(Boolean) as EnhancedUTXOBox[];
      
      const outputBoxes = tx.outputs.map(outputId => 
        boxes.find(box => box.id === outputId)
      ).filter(Boolean) as EnhancedUTXOBox[];
      
      // Add input boxes first
      inputBoxes.forEach(inputBox => {
        elements.push({
          type: 'box',
          id: `input_${inputBox.id}`,
          data: inputBox
        });
      });
      
      // Add arrow from inputs to transaction
      if (inputBoxes.length > 0) {
        elements.push({
          type: 'arrow',
          id: `arrow_to_${tx.id}`,
          direction: 'right'
        });
      }
      
      // Add transaction node
      elements.push({
        type: 'transaction',
        id: tx.id,
        data: tx
      });
      
      // Add arrow from transaction to outputs
      if (outputBoxes.length > 0) {
        elements.push({
          type: 'arrow',
          id: `arrow_from_${tx.id}`,
          direction: outputBoxes.length > 1 ? 'split' : 'right',
          isMultiOutput: outputBoxes.length > 1
        });
      }
      
      // Add output boxes
      outputBoxes.forEach((outputBox, index) => {
        elements.push({
          type: 'box',
          id: `output_${outputBox.id}`,
          data: outputBox,
          position: outputBoxes.length > 1 ? 
            { x: 0, y: index * 120 - (outputBoxes.length - 1) * 60 } : 
            undefined
        });
      });
      
      processedTxs.add(tx.id);
    }
    
    return elements;
  }, [visualizationData]);

  const handleElementClick = useCallback((elementId: string) => {
    setSelectedElement(selectedElement === elementId ? null : elementId);
  }, [selectedElement]);

  const handleMouseEnter = useCallback((event: React.MouseEvent<HTMLElement>, content: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      content,
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  // Add global mouse move handler to update tooltip position
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (tooltip.visible) {
        setTooltip(prev => ({
          ...prev,
          x: event.clientX,
          y: event.clientY - 10
        }));
      }
    };

    if (tooltip.visible) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  }, [tooltip.visible]);

  // Optimize tooltip content generation
  const generateBoxTooltip = useCallback((box: EnhancedUTXOBox): string => {
    return `${box.boxType.replace(/_/g, ' ').toUpperCase()}: ${(Number(box.value) / 1000000000).toFixed(3)} ERG${box.tokens?.length ? ` + ${box.tokens.length} token(s)` : ''}`;
  }, []);

  const generateTransactionTooltip = useCallback((tx: EnhancedUTXOTransaction): string => {
    return `${tx.type.replace(/_/g, ' ').toUpperCase()}: ${tx.inputs.length} input(s) → ${tx.outputs.length} output(s) | Fee: ${Number(tx.fee).toLocaleString()} nERG`;
  }, []);

  if (!contractCode) {
    return (
      <div className="simplified-utxo-visualization empty">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>UTXO Flow Visualization</h3>
          <p>Select a contract example to see the transaction flow</p>
        </div>
      </div>
    );
  }

  if (!visualizationData) {
    return (
      <div className="simplified-utxo-visualization empty">
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>Parse Error</h3>
          <p>Could not parse the contract code for visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="simplified-utxo-visualization" 
      ref={containerRef}
      role="application"
      aria-label="UTXO Transaction Flow Visualization"
      aria-describedby="flow-description"
    >
      <div 
        className="flow-container"
        role="diagram"
        aria-label="Transaction flow diagram showing boxes, transactions, and their relationships"
      >
        <div id="flow-description" className="sr-only">
          This diagram shows the flow of UTXO boxes through transactions. 
          Navigate with tab key to interact with boxes and transactions. 
          Press enter or space to select elements for detailed information.
        </div>
        {flowElements.map((element, index) => {
          const style = element.position ? {
            transform: `translate(${element.position.x}px, ${element.position.y}px)`
          } : undefined;

          return (
            <React.Fragment key={`${element.type}_${element.id}_${index}`}>
              {element.type === 'box' && element.data && (
                <div 
                  style={style}
                  onMouseEnter={(e) => {
                    const box = element.data as EnhancedUTXOBox;
                    const tooltipContent = generateBoxTooltip(box);
                    handleMouseEnter(e, tooltipContent);
                  }}
                  onMouseLeave={handleMouseLeave}
                >
                  <UTXOBoxComponent
                    box={element.data as EnhancedUTXOBox}
                    isActive={isRunning && index <= executionStep}
                    isHighlighted={selectedElement === element.id}
                    onClick={() => handleElementClick(element.id)}
                  />
                </div>
              )}
              
              {element.type === 'transaction' && element.data && (
                <div 
                  style={style}
                  onMouseEnter={(e) => {
                    const tx = element.data as EnhancedUTXOTransaction;
                    const tooltipContent = generateTransactionTooltip(tx);
                    handleMouseEnter(e, tooltipContent);
                  }}
                  onMouseLeave={handleMouseLeave}
                >
                  <TransactionNodeComponent
                    transaction={element.data as EnhancedUTXOTransaction}
                    isActive={isRunning && index <= executionStep}
                    isHighlighted={selectedElement === element.id}
                    onClick={() => handleElementClick(element.id)}
                  />
                </div>
              )}
              
              {element.type === 'arrow' && (
                <FlowArrowComponent
                  direction={element.direction}
                  isAnimated={isRunning && index <= executionStep}
                  label={element.isMultiOutput ? 'Split Output' : 'Flow'}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      <TooltipComponent 
        visible={tooltip.visible}
        content={tooltip.content}
        x={tooltip.x}
        y={tooltip.y}
      />

      {/* Statistics Panel */}
      {visualizationData && (
        <div 
          className="stats-panel"
          role="complementary"
          aria-label="Flow statistics"
        >
          <h4 id="stats-heading">Flow Statistics</h4>
          <div 
            className="stats-grid"
            role="group"
            aria-labelledby="stats-heading"
          >
            <div className="stat-item">
              <span className="stat-label">Boxes:</span>
              <span className="stat-value">{visualizationData.boxes.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Transactions:</span>
              <span className="stat-value">{visualizationData.transactions.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Connections:</span>
              <span className="stat-value">{visualizationData.relationships.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Parties:</span>
              <span className="stat-value">{visualizationData.parties.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Add display names for better debugging
SimplifiedUTXOVisualization.displayName = 'SimplifiedUTXOVisualization';
UTXOBoxComponent.displayName = 'UTXOBoxComponent';
TransactionNodeComponent.displayName = 'TransactionNodeComponent';
FlowArrowComponent.displayName = 'FlowArrowComponent';
TooltipComponent.displayName = 'TooltipComponent';

export default SimplifiedUTXOVisualization;