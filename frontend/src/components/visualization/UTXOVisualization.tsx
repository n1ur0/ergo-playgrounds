import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  type Node,
  type Edge,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

import UTXOBoxNode from './UTXOBoxNode';
import TransactionNode from './TransactionNode';
import { contractParser } from './ContractParser';
import type { VisualizationData, UTXOBox, UTXOTransaction } from './types';
import './UTXOVisualization.css';

interface UTXOVisualizationProps {
  contractCode: string;
  isRunning: boolean;
  executionStep?: number;
  maxSteps?: number;
}

const nodeTypes = {
  utxoBox: UTXOBoxNode,
  transaction: TransactionNode,
};

const UTXOVisualization: React.FC<UTXOVisualizationProps> = ({ 
  contractCode, 
  isRunning,
  executionStep = 0,
  maxSteps = 0
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [visualizationData, setVisualizationData] = useState<VisualizationData | null>(null);

  // Parse contract code and create visualization data
  useEffect(() => {
    if (contractCode) {
      try {
        const parsedData = contractParser.parseContract(contractCode);
        setVisualizationData(parsedData);
      } catch (error) {
        console.error('Error parsing contract code:', error);
        setVisualizationData(null);
      }
    } else {
      setVisualizationData(null);
    }
  }, [contractCode]);

  // Create layout using a simple horizontal flow algorithm
  const createLayout = useCallback((boxes: UTXOBox[], transactions: UTXOTransaction[]) => {
    const nodeSpacing = 280;
    const levelSpacing = 200;
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Create a simple horizontal layout
    let currentX = 0;
    let currentY = 0;
    
    // Add boxes first
    boxes.forEach((box, index) => {
      const y = (index % 3) * levelSpacing; // Stack in rows of 3
      const x = Math.floor(index / 3) * nodeSpacing;
      
      nodes.push({
        id: box.id,
        type: 'utxoBox',
        position: { x, y },
        data: {
          ...box,
          isActive: isRunning && executionStep > index,
          isHighlighted: !isRunning && selectedNodeId === box.id,
        },
      });
    });

    // Add transactions
    transactions.forEach((tx, index) => {
      const y = 100 + (index % 2) * (levelSpacing + 50); // Offset from boxes
      const x = 150 + index * nodeSpacing;
      
      nodes.push({
        id: tx.id,
        type: 'transaction',
        position: { x, y },
        data: {
          ...tx,
          isActive: isRunning && executionStep > boxes.length + index,
          isHighlighted: !isRunning && selectedNodeId === tx.id,
        },
      });

      // Create edges from inputs to transaction
      tx.inputs.forEach((input, inputIndex) => {
        const sourceBox = boxes.find(box => 
          box.id === input || 
          input.includes(box.id) ||
          (box.party && input.includes(box.party))
        );
        
        if (sourceBox) {
          edges.push({
            id: `${sourceBox.id}-to-${tx.id}-${inputIndex}`,
            source: sourceBox.id,
            target: tx.id,
            type: 'smoothstep',
            animated: isRunning && executionStep > boxes.length + index,
            style: { stroke: '#64b5f6', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#64b5f6',
            },
          });
        }
      });

      // Create edges from transaction to outputs
      tx.outputs.forEach((output, outputIndex) => {
        const targetBox = boxes.find(box => 
          box.id === output || 
          output.includes(box.id)
        );
        
        if (targetBox) {
          edges.push({
            id: `${tx.id}-to-${targetBox.id}-${outputIndex}`,
            source: tx.id,
            target: targetBox.id,
            type: 'smoothstep',
            animated: isRunning && executionStep > boxes.length + index,
            style: { stroke: '#4ade80', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#4ade80',
            },
          });
        }
      });
    });

    return { nodes, edges };
  }, [isRunning, executionStep, selectedNodeId]);

  // Update nodes and edges when data changes
  useEffect(() => {
    if (visualizationData) {
      const { nodes: newNodes, edges: newEdges } = createLayout(
        visualizationData.boxes, 
        visualizationData.transactions
      );
      setNodes(newNodes);
      setEdges(newEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [visualizationData, createLayout, setNodes, setEdges]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(selectedNodeId === node.id ? null : node.id);
  }, [selectedNodeId]);

  // Get selected node data for the sidebar
  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId || !visualizationData) return null;
    
    const box = visualizationData.boxes.find(b => b.id === selectedNodeId);
    if (box) return { type: 'box', data: box };
    
    const tx = visualizationData.transactions.find(t => t.id === selectedNodeId);
    if (tx) return { type: 'transaction', data: tx };
    
    return null;
  }, [selectedNodeId, visualizationData]);

  if (!contractCode) {
    return (
      <div className="utxo-visualization-empty">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>UTXO Flow Diagram</h3>
          <p>Select a contract example and run it to see the UTXO box flow visualization</p>
        </div>
      </div>
    );
  }

  if (!visualizationData || (visualizationData.boxes.length === 0 && visualizationData.transactions.length === 0)) {
    return (
      <div className="utxo-visualization-empty">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No UTXO Data Found</h3>
          <p>This contract doesn't contain recognizable UTXO box or transaction patterns</p>
        </div>
      </div>
    );
  }

  return (
    <div className="utxo-visualization">
      <div className="visualization-main">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Strict}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls position="top-left" />
          <MiniMap 
            position="bottom-right"
            nodeStrokeWidth={3}
            nodeColor={(node) => {
              if (node.type === 'utxoBox') {
                switch (node.data.type) {
                  case 'user': return '#2563eb';
                  case 'contract': return '#7c3aed';
                  case 'system': return '#059669';
                  default: return '#2563eb';
                }
              }
              return '#6b7280';
            }}
          />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </div>

      {selectedNodeData && (
        <div className="visualization-sidebar">
          <div className="sidebar-header">
            <h3>{selectedNodeData.type === 'box' ? 'UTXO Box Details' : 'Transaction Details'}</h3>
            <button 
              className="close-button"
              onClick={() => setSelectedNodeId(null)}
            >
              ×
            </button>
          </div>
          
          <div className="sidebar-content">
            {selectedNodeData.type === 'box' ? (
              <div className="box-details-panel">
                <div className="detail-group">
                  <label>Box ID:</label>
                  <span className="monospace">{selectedNodeData.data.id}</span>
                </div>
                
                <div className="detail-group">
                  <label>Value:</label>
                  <span className="value">{typeof selectedNodeData.data.value === 'number' ? 
                    `${(selectedNodeData.data.value / 1000000000).toFixed(3)} ERG` : 
                    selectedNodeData.data.value}
                  </span>
                </div>
                
                <div className="detail-group">
                  <label>Type:</label>
                  <span className={`badge ${selectedNodeData.data.type}`}>{selectedNodeData.data.type}</span>
                </div>
                
                <div className="detail-group">
                  <label>State:</label>
                  <span className={`badge ${selectedNodeData.data.state}`}>{selectedNodeData.data.state}</span>
                </div>
                
                {selectedNodeData.data.party && (
                  <div className="detail-group">
                    <label>Owner:</label>
                    <span>{selectedNodeData.data.party}</span>
                  </div>
                )}
                
                {selectedNodeData.data.script && (
                  <div className="detail-group">
                    <label>Script:</label>
                    <span className="monospace">{selectedNodeData.data.script}</span>
                  </div>
                )}
                
                {selectedNodeData.data.tokens && selectedNodeData.data.tokens.length > 0 && (
                  <div className="detail-group">
                    <label>Tokens:</label>
                    <div className="tokens-list">
                      {selectedNodeData.data.tokens.map((token, index) => (
                        <div key={index} className="token-item">
                          <span className="token-id">{token.id}</span>
                          <span className="token-amount">{token.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedNodeData.data.registers && Object.keys(selectedNodeData.data.registers).length > 0 && (
                  <div className="detail-group">
                    <label>Registers:</label>
                    <div className="registers-list">
                      {Object.entries(selectedNodeData.data.registers).map(([reg, value]) => (
                        <div key={reg} className="register-item">
                          <span className="register-name">{reg}:</span>
                          <span className="register-value monospace">{JSON.stringify(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="transaction-details-panel">
                <div className="detail-group">
                  <label>Transaction ID:</label>
                  <span className="monospace">{selectedNodeData.data.id}</span>
                </div>
                
                <div className="detail-group">
                  <label>Type:</label>
                  <span className={`badge ${selectedNodeData.data.type}`}>{selectedNodeData.data.type}</span>
                </div>
                
                <div className="detail-group">
                  <label>Status:</label>
                  <span className={`badge ${selectedNodeData.data.status}`}>{selectedNodeData.data.status}</span>
                </div>
                
                <div className="detail-group">
                  <label>Inputs:</label>
                  <span>{selectedNodeData.data.inputs.length}</span>
                </div>
                
                <div className="detail-group">
                  <label>Outputs:</label>
                  <span>{selectedNodeData.data.outputs.length}</span>
                </div>
                
                <div className="detail-group">
                  <label>Fee:</label>
                  <span className="value">
                    {typeof selectedNodeData.data.fee === 'number' ? 
                      `${(selectedNodeData.data.fee / 1000000000).toFixed(6)} ERG` : 
                      selectedNodeData.data.fee}
                  </span>
                </div>
                
                {selectedNodeData.data.signer && (
                  <div className="detail-group">
                    <label>Signer:</label>
                    <span>{selectedNodeData.data.signer}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {visualizationData && (
        <div className="visualization-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#2563eb' }}></div>
            <span>User Box</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#7c3aed' }}></div>
            <span>Contract Box</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#6b7280' }}></div>
            <span>Transaction</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ea580c' }}></div>
            <span>Spending</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UTXOVisualization;