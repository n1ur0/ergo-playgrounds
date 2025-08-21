import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import UTXOBoxNode from './UTXOBoxNode';
import TransactionNode from './TransactionNode';
import { enhancedContractParser } from './ContractParser';
import { GraphConnectionEngine, buildGraphRelationships } from './GraphConnectionEngine';
import type { 
  VisualizationData, 
  UTXOBox, 
  UTXOTransaction,
  EnhancedVisualizationData,
  EnhancedUTXOBox,
  EnhancedUTXOTransaction,
  BoxRelationship,
  BoxRelationshipType
} from './types';
import { 
  Search, 
  Filter, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Settings,
  Eye,
  EyeOff,
  RotateCcw,
  Play,
  Pause,
  Square,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';
import './UTXOVisualization.css';

interface UTXOVisualizationProps {
  contractCode: string;
  isRunning: boolean;
  executionStep?: number;
  maxSteps?: number;
}

interface ViewportState {
  zoom: number;
  center: { x: number; y: number };
}

interface FilterOptions {
  boxTypes: string[];
  transactionTypes: string[];
  states: string[];
  protocols: string[];
  showRelationships: boolean;
  showTokens: boolean;
  showRegisters: boolean;
}

interface LayoutOptions {
  algorithm: 'force' | 'hierarchical' | 'circular' | 'timeline';
  groupBy: 'party' | 'type' | 'height' | 'protocol' | 'none';
  spacing: 'compact' | 'normal' | 'wide';
  direction: 'horizontal' | 'vertical';
}

const nodeTypes = {
  utxoBox: UTXOBoxNode,
  transaction: TransactionNode,
};

const defaultFilterOptions: FilterOptions = {
  boxTypes: [],
  transactionTypes: [],
  states: [],
  protocols: [],
  showRelationships: true,
  showTokens: true,
  showRegisters: false,
};

const defaultLayoutOptions: LayoutOptions = {
  algorithm: 'hierarchical',
  groupBy: 'type',
  spacing: 'normal',
  direction: 'horizontal',
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(defaultFilterOptions);
  const [layoutOptions, setLayoutOptions] = useState<LayoutOptions>(defaultLayoutOptions);
  const [showControls, setShowControls] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [currentStep, setCurrentStep] = useState(0);
  const [viewport, setViewport] = useState<ViewportState>({ zoom: 1, center: { x: 0, y: 0 } });
  const [enhancedVisualizationData, setEnhancedVisualizationData] = useState<EnhancedVisualizationData | null>(null);
  
  const playbackInterval = useRef<NodeJS.Timeout>();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const graphEngine = useRef(new GraphConnectionEngine());

  // Parse contract code and create enhanced visualization data with advanced relationships
  useEffect(() => {
    if (contractCode) {
      try {
        console.log('[UTXOVisualization] Parsing contract with enhanced engine...');
        const parsedData = enhancedContractParser.parseContract(contractCode);
        
        // Convert to legacy format for backward compatibility
        const legacyData: VisualizationData = {
          boxes: parsedData.boxes.map(box => ({
            id: box.id,
            value: box.value,
            tokens: box.tokens,
            ergoTree: box.ergoTree,
            script: box.script,
            registers: box.registers,
            description: box.description || '',
            type: box.boxType as any,
            state: box.state as any,
            party: box.owner || undefined
          })),
          transactions: parsedData.transactions.map(tx => ({
            id: tx.id,
            inputs: tx.inputs,
            outputs: tx.outputs,
            fee: tx.fee,
            status: tx.status as any,
            description: tx.description,
            type: tx.type as any,
            signer: tx.signer,
            dataInputs: tx.dataInputs
          })),
          relationships: parsedData.relationships || []
        };
        
        setVisualizationData(legacyData);
        setEnhancedVisualizationData(parsedData);
        setCurrentStep(0);
        
        console.log(`[UTXOVisualization] Parsed ${parsedData.boxes.length} boxes, ${parsedData.transactions.length} transactions, ${parsedData.relationships?.length || 0} relationships`);
      } catch (error) {
        console.error('Error parsing contract code:', error);
        setVisualizationData(null);
        setEnhancedVisualizationData(null);
      }
    } else {
      setVisualizationData(null);
      setEnhancedVisualizationData(null);
    }
  }, [contractCode]);

  // Enhanced layout algorithm that considers relationships and grouping
  const createEnhancedLayout = useCallback((
    boxes: UTXOBox[], 
    transactions: UTXOTransaction[],
    relationships: BoxRelationship[] = []
  ) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const spacingMap = {
      compact: { node: 200, level: 150 },
      normal: { node: 280, level: 200 },
      wide: { node: 360, level: 250 }
    };
    
    const spacing = spacingMap[layoutOptions.spacing];
    
    // Group entities based on groupBy option
    const groupBoxes = (boxes: UTXOBox[]) => {
      switch (layoutOptions.groupBy) {
        case 'party':
          return boxes.reduce((acc, box) => {
            const key = box.party || 'unknown';
            acc[key] = acc[key] || [];
            acc[key].push(box);
            return acc;
          }, {} as Record<string, UTXOBox[]>);
        case 'type':
          return boxes.reduce((acc, box) => {
            const key = box.type || 'unknown';
            acc[key] = acc[key] || [];
            acc[key].push(box);
            return acc;
          }, {} as Record<string, UTXOBox[]>);
        case 'protocol':
          return boxes.reduce((acc, box) => {
            // Determine protocol from box type
            let protocol = 'basic';
            if (['buy_order', 'sell_order', 'settlement', 'dex_fee'].includes(box.type)) {
              protocol = 'dex';
            } else if (['atomic_bid', 'atomic_ask', 'atomic_settlement'].includes(box.type)) {
              protocol = 'atomic';
            } else if (box.type === 'governance') {
              protocol = 'governance';
            }
            acc[protocol] = acc[protocol] || [];
            acc[protocol].push(box);
            return acc;
          }, {} as Record<string, UTXOBox[]>);
        default:
          return { all: boxes };
      }
    };

    const boxGroups = groupBoxes(boxes);
    let currentY = 0;
    const groupSpacing = spacing.level * 1.5;

    // Layout boxes by groups
    Object.entries(boxGroups).forEach(([groupName, groupBoxes], groupIndex) => {
      const groupStartY = currentY;
      let maxX = 0;
      
      groupBoxes.forEach((box, boxIndex) => {
        const row = Math.floor(boxIndex / 4); // 4 boxes per row
        const col = boxIndex % 4;
        const x = col * spacing.node;
        const y = groupStartY + row * spacing.level;
        
        maxX = Math.max(maxX, x);
        
        // Create enhanced box node with proper typing
        const enhancedBox: EnhancedUTXOBox = {
          ...box,
          // Add required fields with defaults
          creationTxId: box.id + '_creation',
          creationIndex: 0,
          ergoTree: box.ergoTreeHash || '',
          ergoTreeHash: box.ergoTreeHash || '',
          spendingCondition: 'public_key',
          boxType: (box.type as any) || 'wallet',
          creationHeight: box.creationHeight || 0,
          parties: box.party ? [box.party] : [],
          parentBoxId: undefined,
          childBoxIds: [],
          relatedBoxIds: [],
          tokens: box.tokens || [],
          registers: box.registers || {},
          // Map existing fields
          state: box.state as any,
          owner: box.party,
          description: box.description
        };
        
        nodes.push({
          id: box.id,
          type: 'utxoBox',
          position: { 
            x: layoutOptions.direction === 'horizontal' ? x : y, 
            y: layoutOptions.direction === 'horizontal' ? y : x 
          },
          data: {
            ...enhancedBox,
            isActive: isRunning && currentStep > boxIndex,
            isHighlighted: !isRunning && selectedNodeId === box.id,
          },
        });
      });
      
      currentY += Math.ceil(groupBoxes.length / 4) * spacing.level + groupSpacing;
    });

    // Layout transactions
    const txStartX = Math.max(spacing.node * 5, 600);
    transactions.forEach((tx, index) => {
      const y = index * spacing.level + 100;
      
      // Create enhanced transaction
      const enhancedTx: EnhancedUTXOTransaction = {
        ...tx,
        // Add required fields with defaults
        type: (tx.type as any) || 'simple_transfer',
        inputValue: '0',
        outputValue: '0',
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          ergConservation: {
            input: '0',
            output: '0',
            fee: tx.fee || '0',
            isConserved: true
          },
          tokenConservation: []
        },
        signer: tx.signer || '',
        parties: tx.signer ? [tx.signer] : [],
        requiredSignatures: [],
        signatures: [],
        confirmations: 0,
        dataInputs: tx.dataInputs || [],
        // Map existing fields
        status: tx.status as any,
        inputs: tx.inputs || [],
        outputs: tx.outputs || [],
        fee: tx.fee || '0',
        description: tx.description
      };
      
      nodes.push({
        id: tx.id,
        type: 'transaction',
        position: { 
          x: layoutOptions.direction === 'horizontal' ? txStartX : y, 
          y: layoutOptions.direction === 'horizontal' ? y : txStartX 
        },
        data: {
          ...enhancedTx,
          isActive: isRunning && currentStep > boxes.length + index,
          isHighlighted: !isRunning && selectedNodeId === tx.id,
        },
      });

      // Enhanced relationship creation will be handled after all nodes are created
      // This ensures we have complete context for the GraphConnectionEngine
    });

    // ============================================================================
    // ENHANCED RELATIONSHIP CREATION WITH GRAPH CONNECTION ENGINE
    // ============================================================================
    
    // Use advanced relationship detection if enhanced data is available
    if (relationships && relationships.length > 0) {
      console.log(`[CreateLayout] Using ${relationships.length} pre-computed relationships from enhanced parser`);
      
      relationships.forEach(relationship => {
        const sourceNode = nodes.find(n => n.id === relationship.fromBoxId);
        const targetNode = nodes.find(n => n.id === relationship.toBoxId);
        
        if (sourceNode && targetNode && filterOptions.showRelationships) {
          const edge: Edge = {
            id: relationship.id,
            source: relationship.fromBoxId,
            target: relationship.toBoxId,
            type: 'smoothstep',
            animated: isRunning && relationship.strength === 'strong',
            style: {
              stroke: relationship.displayHints?.color || getRelationshipColor(relationship.type),
              strokeWidth: relationship.displayHints?.thickness || getRelationshipWidth(relationship.type),
              strokeDasharray: relationship.displayHints?.style === 'dashed' ? '5,5' : 
                              relationship.displayHints?.style === 'dotted' ? '2,3' : 
                              getRelationshipPattern(relationship.type),
              opacity: relationship.strength === 'weak' ? 0.5 : relationship.strength === 'medium' ? 0.7 : 1.0
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: relationship.displayHints?.color || getRelationshipColor(relationship.type),
            },
            label: relationship.metadata?.description || getRelationshipLabel(relationship.type),
            data: {
              relationshipType: relationship.type,
              strength: relationship.strength,
              metadata: relationship.metadata,
              viaTxId: relationship.viaTxId
            }
          };
          
          edges.push(edge);
        }
      });
      
      console.log(`[CreateLayout] Created ${edges.length} enhanced relationship edges`);
    } else {
      // Fallback: Create basic relationships using GraphConnectionEngine
      console.log('[CreateLayout] No pre-computed relationships, using fallback relationship detection');
      
      try {
        // Convert boxes to enhanced format for the engine
        const enhancedBoxes = boxes.map((box, index): EnhancedUTXOBox => ({
          id: box.id,
          creationTxId: '',
          creationIndex: index,
          value: typeof box.value === 'string' ? parseInt(box.value) : box.value,
          tokens: box.tokens || [],
          ergoTree: box.ergoTree || '',
          ergoTreeHash: '',
          script: box.script || '',
          spendingCondition: 'public_key',
          registers: box.registers || {},
          state: box.state as any,
          boxType: box.type as any,
          creationHeight: 1,
          owner: box.party,
          parties: box.party ? [box.party] : [],
          parentBoxId: undefined,
          childBoxIds: [],
          relatedBoxIds: [],
          description: box.description
        }));
        
        const enhancedTransactions = transactions.map((tx): EnhancedUTXOTransaction => ({
          id: tx.id,
          type: tx.type as any,
          inputs: tx.inputs,
          outputs: tx.outputs,
          dataInputs: tx.dataInputs || [],
          fee: tx.fee || '0',
          status: tx.status as any,
          description: tx.description,
          inputValue: '0',
          outputValue: '0',
          validation: {
            isValid: true,
            errors: [],
            warnings: [],
            ergConservation: {
              input: '0',
              output: '0',
              fee: tx.fee || '0',
              isConserved: true
            },
            tokenConservation: []
          },
          signer: tx.signer || '',
          parties: tx.signer ? [tx.signer] : [],
          requiredSignatures: [],
          signatures: [],
          confirmations: 0
        }));
        
        // Build relationships using the GraphConnectionEngine
        const generatedRelationships = graphEngine.current.buildGraph(enhancedBoxes, enhancedTransactions);
        
        console.log(`[CreateLayout] Generated ${generatedRelationships.length} fallback relationships`);
        
        // Convert to edges
        generatedRelationships.forEach(relationship => {
          const sourceNode = nodes.find(n => n.id === relationship.fromBoxId);
          const targetNode = nodes.find(n => n.id === relationship.toBoxId);
          
          if (sourceNode && targetNode && filterOptions.showRelationships) {
            const edge: Edge = {
              id: relationship.id,
              source: relationship.fromBoxId,
              target: relationship.toBoxId,
              type: 'smoothstep',
              animated: isRunning && relationship.strength === 'strong',
              style: {
                stroke: relationship.displayHints?.color || getRelationshipColor(relationship.type),
                strokeWidth: relationship.displayHints?.thickness || getRelationshipWidth(relationship.type),
                strokeDasharray: relationship.displayHints?.style === 'dashed' ? '5,5' : 
                                relationship.displayHints?.style === 'dotted' ? '2,3' : 
                                getRelationshipPattern(relationship.type),
                opacity: relationship.strength === 'weak' ? 0.5 : relationship.strength === 'medium' ? 0.7 : 1.0
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: relationship.displayHints?.color || getRelationshipColor(relationship.type),
              },
              label: relationship.metadata?.description || getRelationshipLabel(relationship.type),
              data: {
                relationshipType: relationship.type,
                strength: relationship.strength,
                metadata: relationship.metadata,
                viaTxId: relationship.viaTxId
              }
            };
            
            edges.push(edge);
          }
        });
        
        console.log(`[CreateLayout] Created ${edges.length} fallback relationship edges`);
      } catch (error) {
        console.error('[CreateLayout] Error in fallback relationship creation:', error);
        // Continue without relationships rather than failing completely
      }
    }

    return { nodes, edges };
  }, [layoutOptions, isRunning, currentStep, selectedNodeId, filterOptions.showRelationships]);

  // Relationship styling functions
  const getRelationshipColor = (type: BoxRelationshipType): string => {
    switch (type) {
      case 'parent_child': return '#8b5cf6';
      case 'input_output': return '#3b82f6';
      case 'state_transition': return '#10b981';
      case 'partial_consumption': return '#f59e0b';
      case 'atomic_pair': return '#7c3aed';
      case 'fee_payment': return '#ea580c';
      case 'refund_path': return '#dc2626';
      default: return '#64b5f6';
    }
  };

  const getRelationshipWidth = (type: BoxRelationshipType): number => {
    switch (type) {
      case 'parent_child': return 3;
      case 'input_output': return 2;
      case 'fee_payment': return 1;
      default: return 2;
    }
  };

  const getRelationshipPattern = (type: BoxRelationshipType): string => {
    switch (type) {
      case 'parent_child': return '5,5';
      case 'refund_path': return '10,5';
      case 'fee_payment': return '2,3';
      default: return '';
    }
  };

  const getRelationshipLabel = (type: BoxRelationshipType): string => {
    switch (type) {
      case 'parent_child': return 'R4 Link';
      case 'fee_payment': return 'Fee';
      case 'refund_path': return 'Refund';
      default: return '';
    }
  };

  // Filter nodes and edges based on search and filter options
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      // Search filter
      if (searchTerm && !node.id.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(node.data.description?.toLowerCase().includes(searchTerm.toLowerCase()))) {
        return false;
      }
      
      // Type filters
      if (node.type === 'utxoBox') {
        if (filterOptions.boxTypes.length > 0 && !filterOptions.boxTypes.includes(node.data.boxType)) {
          return false;
        }
        if (filterOptions.states.length > 0 && !filterOptions.states.includes(node.data.state)) {
          return false;
        }
      } else if (node.type === 'transaction') {
        if (filterOptions.transactionTypes.length > 0 && !filterOptions.transactionTypes.includes(node.data.type)) {
          return false;
        }
      }
      
      return true;
    });
  }, [nodes, searchTerm, filterOptions]);

  // Update nodes and edges when data changes with enhanced relationship support
  useEffect(() => {
    if (visualizationData) {
      const relationships = enhancedVisualizationData?.relationships || visualizationData.relationships || [];
      console.log(`[UTXOVisualization] Creating layout with ${relationships.length} relationships`);
      
      const { nodes: newNodes, edges: newEdges } = createEnhancedLayout(
        visualizationData.boxes, 
        visualizationData.transactions,
        relationships
      );
      
      setNodes(newNodes);
      setEdges(newEdges);
      
      console.log(`[UTXOVisualization] Layout created: ${newNodes.length} nodes, ${newEdges.length} edges`);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [visualizationData, enhancedVisualizationData, createEnhancedLayout, setNodes, setEdges]);

  // Playback control
  useEffect(() => {
    if (isPlaying && visualizationData) {
      playbackInterval.current = setInterval(() => {
        setCurrentStep(prev => {
          const maxSteps = visualizationData.boxes.length + visualizationData.transactions.length;
          if (prev >= maxSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    }
    
    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, [isPlaying, playbackSpeed, visualizationData]);

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

  // Get unique values for filter options
  const getFilterOptions = useMemo(() => {
    if (!visualizationData) return { boxTypes: [], transactionTypes: [], states: [], protocols: [] };
    
    const boxTypes = [...new Set(visualizationData.boxes.map(b => b.type))];
    const transactionTypes = [...new Set(visualizationData.transactions.map(t => t.type))];
    const states = [...new Set(visualizationData.boxes.map(b => b.state))];
    const protocols = ['dex', 'atomic', 'governance', 'basic'];
    
    return { boxTypes, transactionTypes, states, protocols };
  }, [visualizationData]);

  const resetView = useCallback(() => {
    setViewport({ zoom: 1, center: { x: 0, y: 0 } });
    setSelectedNodeId(null);
    setSearchTerm('');
    setFilterOptions(defaultFilterOptions);
  }, []);

  if (!contractCode) {
    return (
      <div className="utxo-visualization-empty">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>Enhanced UTXO Flow Visualization</h3>
          <p>Select a contract example and run it to see the interactive blockchain visualization with advanced features</p>
          <div className="feature-list">
            <div className="feature">🎯 Protocol-specific styling</div>
            <div className="feature">🔍 Advanced filtering</div>
            <div className="feature">📐 Multiple layout algorithms</div>
            <div className="feature">🎬 Playback controls</div>
          </div>
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
    <div className="utxo-visualization enhanced" ref={reactFlowWrapper}>
      <div className="visualization-main">
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Strict}
          fitView
          attributionPosition="bottom-left"
          className="react-flow-enhanced"
        >
          {/* Enhanced Controls Panel */}
          <Panel position="top-left" className="controls-panel">
            <div className="control-group">
              <button 
                className="control-button"
                onClick={() => setShowControls(!showControls)}
                title="Toggle Controls"
              >
                <Settings size={16} />
              </button>
              <button 
                className="control-button"
                onClick={resetView}
                title="Reset View"
              >
                <RotateCcw size={16} />
              </button>
              <button 
                className="control-button"
                onClick={() => setShowFilters(!showFilters)}
                title="Toggle Filters"
              >
                <Filter size={16} />
              </button>
            </div>

            {showControls && (
              <div className="expanded-controls">
                {/* Search */}
                <div className="search-section">
                  <div className="search-input">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Search boxes, transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="playback-controls">
                  <button 
                    className="control-button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button 
                    className="control-button"
                    onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                    title="Stop"
                  >
                    <Square size={16} />
                  </button>
                  <div className="step-info">
                    Step: {currentStep}/{visualizationData.boxes.length + visualizationData.transactions.length}
                  </div>
                </div>

                {/* Layout Controls */}
                <div className="layout-controls">
                  <select 
                    value={layoutOptions.algorithm}
                    onChange={(e) => setLayoutOptions(prev => ({ ...prev, algorithm: e.target.value as any }))}
                    className="layout-select"
                  >
                    <option value="hierarchical">Hierarchical</option>
                    <option value="force">Force-directed</option>
                    <option value="circular">Circular</option>
                    <option value="timeline">Timeline</option>
                  </select>
                  
                  <select 
                    value={layoutOptions.groupBy}
                    onChange={(e) => setLayoutOptions(prev => ({ ...prev, groupBy: e.target.value as any }))}
                    className="layout-select"
                  >
                    <option value="none">No Grouping</option>
                    <option value="type">By Type</option>
                    <option value="party">By Party</option>
                    <option value="protocol">By Protocol</option>
                  </select>
                </div>
              </div>
            )}
          </Panel>

          {/* Filters Panel */}
          {showFilters && (
            <Panel position="top-right" className="filters-panel">
              <div className="filter-section">
                <h4>Box Types</h4>
                {getFilterOptions.boxTypes.map(type => (
                  <label key={type} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filterOptions.boxTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilterOptions(prev => ({
                            ...prev,
                            boxTypes: [...prev.boxTypes, type]
                          }));
                        } else {
                          setFilterOptions(prev => ({
                            ...prev,
                            boxTypes: prev.boxTypes.filter(t => t !== type)
                          }));
                        }
                      }}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </Panel>
          )}

          <Controls position="bottom-left" />
          <MiniMap 
            position="bottom-right"
            className="enhanced-minimap"
            nodeStrokeWidth={3}
            nodeColor={(node) => {
              if (node.type === 'utxoBox') {
                switch (node.data.boxType) {
                  case 'buy_order': return '#059669';
                  case 'sell_order': return '#dc2626';
                  case 'atomic_bid': return '#0891b2';
                  case 'atomic_ask': return '#7c3aed';
                  case 'governance': return '#2563eb';
                  case 'wallet': return '#2563eb';
                  default: return '#6b7280';
                }
              }
              return '#6b7280';
            }}
          />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </div>

      {/* Enhanced Sidebar */}
      {selectedNodeData && (
        <div className="visualization-sidebar enhanced">
          <div className="sidebar-header">
            <h3>
              {selectedNodeData.type === 'box' ? 'UTXO Box Details' : 'Transaction Details'}
            </h3>
            <button 
              className="close-button"
              onClick={() => setSelectedNodeId(null)}
            >
              ×
            </button>
          </div>
          
          <div className="sidebar-content">
            {selectedNodeData.type === 'box' ? (
              <div className="box-details-panel enhanced">
                <div className="detail-group primary">
                  <div className="detail-item">
                    <label>Box ID:</label>
                    <span className="monospace">{selectedNodeData.data.id}</span>
                  </div>
                  
                  <div className="detail-item">
                    <label>Value:</label>
                    <span className="value">{typeof selectedNodeData.data.value === 'number' ? 
                      `${(selectedNodeData.data.value / 1000000000).toFixed(3)} ERG` : 
                      selectedNodeData.data.value}
                    </span>
                  </div>
                  
                  <div className="detail-item">
                    <label>Type:</label>
                    <span className={`badge ${selectedNodeData.data.type}`}>{selectedNodeData.data.type}</span>
                  </div>
                  
                  <div className="detail-item">
                    <label>State:</label>
                    <span className={`badge ${selectedNodeData.data.state}`}>{selectedNodeData.data.state}</span>
                  </div>
                </div>

                {selectedNodeData.data.party && (
                  <div className="detail-group">
                    <div className="detail-item">
                      <label>Owner:</label>
                      <span>{selectedNodeData.data.party}</span>
                    </div>
                  </div>
                )}
                
                {selectedNodeData.data.script && (
                  <div className="detail-group">
                    <div className="detail-item">
                      <label>Script:</label>
                      <span className="monospace script-preview">{selectedNodeData.data.script}</span>
                    </div>
                  </div>
                )}
                
                {selectedNodeData.data.tokens && selectedNodeData.data.tokens.length > 0 && (
                  <div className="detail-group tokens">
                    <label>Tokens:</label>
                    <div className="tokens-list">
                      {selectedNodeData.data.tokens.map((token, index) => (
                        <div key={index} className="token-item">
                          <span className="token-id">{token.id.slice(0, 8)}...</span>
                          <span className="token-amount">{token.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedNodeData.data.registers && Object.keys(selectedNodeData.data.registers).length > 0 && (
                  <div className="detail-group registers">
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
              <div className="transaction-details-panel enhanced">
                <div className="detail-group primary">
                  <div className="detail-item">
                    <label>Transaction ID:</label>
                    <span className="monospace">{selectedNodeData.data.id}</span>
                  </div>
                  
                  <div className="detail-item">
                    <label>Type:</label>
                    <span className={`badge ${selectedNodeData.data.type}`}>{selectedNodeData.data.type}</span>
                  </div>
                  
                  <div className="detail-item">
                    <label>Status:</label>
                    <span className={`badge ${selectedNodeData.data.status}`}>{selectedNodeData.data.status}</span>
                  </div>
                </div>
                
                <div className="detail-group">
                  <div className="detail-item">
                    <label>Inputs:</label>
                    <span>{selectedNodeData.data.inputs.length}</span>
                  </div>
                  
                  <div className="detail-item">
                    <label>Outputs:</label>
                    <span>{selectedNodeData.data.outputs.length}</span>
                  </div>
                  
                  <div className="detail-item">
                    <label>Fee:</label>
                    <span className="value">
                      {typeof selectedNodeData.data.fee === 'number' ? 
                        `${(selectedNodeData.data.fee / 1000000000).toFixed(6)} ERG` : 
                        selectedNodeData.data.fee}
                    </span>
                  </div>
                </div>

                {selectedNodeData.data.signer && (
                  <div className="detail-group">
                    <div className="detail-item">
                      <label>Signer:</label>
                      <span className="monospace">{selectedNodeData.data.signer}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Enhanced Legend */}
      {visualizationData && (
        <div className="visualization-legend enhanced">
          <h4>Legend</h4>
          <div className="legend-section">
            <h5>Box Types</h5>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#059669' }}></div>
              <span>DEX Orders</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#7c3aed' }}></div>
              <span>Atomic Exchange</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#2563eb' }}></div>
              <span>Governance</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#6b7280' }}></div>
              <span>System</span>
            </div>
          </div>
          
          <div className="legend-section">
            <h5>Relationships</h5>
            <div className="legend-item">
              <div className="legend-line" style={{ backgroundColor: '#8b5cf6', filter: 'dashed' }}></div>
              <span>R4 Links</span>
            </div>
            <div className="legend-item">
              <div className="legend-line" style={{ backgroundColor: '#3b82f6' }}></div>
              <span>Transactions</span>
            </div>
            <div className="legend-item">
              <div className="legend-line" style={{ backgroundColor: '#ea580c' }}></div>
              <span>Fees</span>
            </div>
          </div>

          {/* Statistics */}
          <div className="legend-section stats">
            <h5>Statistics</h5>
            <div className="stat-item">
              <span className="stat-label">Boxes:</span>
              <span className="stat-value">{visualizationData.boxes.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Transactions:</span>
              <span className="stat-value">{visualizationData.transactions.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Parties:</span>
              <span className="stat-value">{visualizationData.parties?.length || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UTXOVisualization;