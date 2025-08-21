/**
 * UTXOLayoutEngine - Sophisticated Graph Layout Algorithm for Ergo UTXO Visualization
 * 
 * This engine implements advanced layout algorithms specifically designed for Ergo blockchain
 * UTXO patterns, providing optimal visualization for:
 * - DEX order flows and order book structures
 * - Atomic exchange coordination patterns
 * - Multi-stage transaction protocols
 * - Register-based box linking (R4 parent-child relationships)
 * - Fee collection and change flow patterns
 * - Temporal transaction sequences
 * 
 * Supports multiple layout strategies with smooth transitions and protocol-aware positioning.
 */

import type {
  BoxId,
  TxId,
  EnhancedUTXOBox,
  EnhancedUTXOTransaction,
  BoxRelationship,
  BoxRelationshipType,
  ErgoBoxType,
  BoxLifecycleState,
} from './types';
import {
  isDEXBox,
  isAtomicExchangeBox,
  isContractBox,
} from './types';

// ============================================================================
// LAYOUT CONFIGURATION AND OPTIONS
// ============================================================================

/**
 * Available layout algorithm strategies
 */
export type LayoutAlgorithm = 
  | 'temporal_flow'      // Chronological arrangement based on block height
  | 'force_directed'     // Physics-based organic clustering
  | 'hierarchical'       // Layered by transaction flow roles
  | 'protocol_aware'     // Specialized layouts for specific protocols
  | 'circular'           // Circular arrangement for closed-loop patterns
  | 'grid'               // Regular grid layout for systematic analysis
  | 'hybrid';            // Combination of multiple algorithms

/**
 * Protocol-specific layout sub-types for protocol_aware algorithm
 */
export type ProtocolLayoutType =
  | 'dex_order_book'     // DEX order book with bid/ask separation
  | 'dex_flow_linear'    // Linear DEX order → settlement → new order flow
  | 'atomic_bidirectional' // Bidirectional atomic exchange layout
  | 'partial_order_tree' // Tree structure for partial order fills
  | 'fee_collection_radial' // Radial pattern around fee collectors
  | 'refund_star'        // Star pattern for refund scenarios
  | 'multisig_coordination' // Coordination patterns for multi-party
  | 'temporal_chain';    // Chain layout for temporal sequences

/**
 * Grouping strategy for related boxes
 */
export type GroupingStrategy =
  | 'none'               // No grouping
  | 'by_party'           // Group by owning party
  | 'by_transaction'     // Group by transaction
  | 'by_protocol'        // Group by protocol type
  | 'by_box_type'        // Group by box type
  | 'by_height'          // Group by creation height
  | 'by_relationship';   // Group by relationship clusters

/**
 * Comprehensive layout options
 */
export interface LayoutOptions {
  // Core algorithm settings
  algorithm: LayoutAlgorithm;
  protocolType?: ProtocolLayoutType;
  grouping: GroupingStrategy;
  
  // Viewport and spacing
  viewport: {
    width: number;
    height: number;
    zoom: number;
    centerX: number;
    centerY: number;
  };
  
  spacing: {
    nodeSpacing: number;        // Minimum distance between nodes
    groupSpacing: number;       // Distance between groups
    layerSpacing: number;       // Distance between hierarchical layers
    edgeLength: number;         // Preferred edge length for force-directed
  };
  
  // Visual optimization
  optimization: {
    minimizeEdgeCrossings: boolean;
    prioritizeReadability: boolean;
    maintainAspectRatio: boolean;
    useAdaptiveSpacing: boolean;
  };
  
  // Focus and highlighting
  focus?: {
    centerBox?: BoxId;          // Box to center the layout around
    highlightPath?: BoxId[];    // Path to highlight with special positioning
    emphasizeProtocol?: string; // Protocol to emphasize in layout
  };
  
  // Animation and transitions
  animation: {
    enableTransitions: boolean;
    transitionDuration: number; // milliseconds
    easingFunction: 'linear' | 'ease-in-out' | 'cubic-bezier';
  };
  
  // Advanced settings
  advanced: {
    maxIterations: number;      // For iterative algorithms
    convergenceThreshold: number; // When to stop iterating
    temperatureCooling: number; // Force-directed cooling rate
    clusteringThreshold: number; // Threshold for automatic clustering
  };
}

/**
 * Default layout options
 */
export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  algorithm: 'force_directed',
  grouping: 'by_protocol',
  viewport: {
    width: 1200,
    height: 800,
    zoom: 1,
    centerX: 600,
    centerY: 400,
  },
  spacing: {
    nodeSpacing: 100,
    groupSpacing: 200,
    layerSpacing: 150,
    edgeLength: 120,
  },
  optimization: {
    minimizeEdgeCrossings: true,
    prioritizeReadability: true,
    maintainAspectRatio: false,
    useAdaptiveSpacing: true,
  },
  animation: {
    enableTransitions: true,
    transitionDuration: 800,
    easingFunction: 'ease-in-out',
  },
  advanced: {
    maxIterations: 500,
    convergenceThreshold: 0.01,
    temperatureCooling: 0.95,
    clusteringThreshold: 0.7,
  },
};

// ============================================================================
// LAYOUT DATA STRUCTURES
// ============================================================================

/**
 * Node position with additional metadata
 */
export interface NodePosition {
  id: BoxId;
  x: number;
  y: number;
  z?: number; // For 3D layouts (future)
  
  // Metadata for layout algorithm
  fixed?: boolean;           // Whether position is fixed
  weight?: number;           // Node weight for force calculations
  group?: string;            // Group identifier
  layer?: number;            // Hierarchical layer
  cluster?: string;          // Cluster identifier
  
  // Visual properties
  size?: {
    width: number;
    height: number;
  };
  
  // Animation properties
  animation?: {
    fromX?: number;
    fromY?: number;
    progress?: number;
  };
}

/**
 * Edge information for layout calculations
 */
export interface LayoutEdge {
  id: string;
  from: BoxId;
  to: BoxId;
  relationship: BoxRelationship;
  
  // Layout properties
  length: number;            // Desired edge length
  weight: number;            // Edge weight/strength
  type: 'primary' | 'secondary' | 'weak';
  
  // Visual properties
  curvature?: number;        // For curved edges
  controlPoints?: Array<{x: number; y: number}>; // For complex paths
}

/**
 * Group definition for clustered layouts
 */
export interface LayoutGroup {
  id: string;
  type: GroupingStrategy;
  boxes: BoxId[];
  
  // Group properties
  center: {x: number; y: number};
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  
  // Metadata
  protocol?: string;
  party?: string;
  boxType?: ErgoBoxType;
  metadata?: Record<string, any>;
}

/**
 * Complete layout result
 */
export interface LayoutResult {
  // Node positions
  positions: NodePosition[];
  
  // Edge layout information
  edges: LayoutEdge[];
  
  // Group information
  groups: LayoutGroup[];
  
  // Layout metadata
  metadata: {
    algorithm: LayoutAlgorithm;
    iterationsUsed?: number;
    convergenceReached?: boolean;
    computationTime: number;
    boundingBox: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    };
  };
  
  // Quality metrics
  quality: {
    edgeCrossings: number;
    averageEdgeLength: number;
    nodeOverlaps: number;
    readabilityScore: number; // 0-1, higher is better
  };
}

/**
 * Internal layout data structure for algorithms
 */
interface LayoutData {
  boxes: EnhancedUTXOBox[];
  relationships: BoxRelationship[];
  groups: Map<string, EnhancedUTXOBox[]>;
  options: LayoutOptions;
  
  // Algorithm-specific data
  forces?: Map<BoxId, {fx: number; fy: number}>; // Force vectors
  layers?: Map<number, BoxId[]>;                 // Hierarchical layers
  clusters?: Map<string, BoxId[]>;               // Cluster assignments
  distances?: Map<string, number>;               // Shortest path distances
}

// ============================================================================
// MAIN LAYOUT ENGINE CLASS
// ============================================================================

/**
 * Advanced UTXO layout engine with multiple algorithm support
 */
export class UTXOLayoutEngine {
  private currentLayout: LayoutResult | null = null;
  private animationFrame: number | null = null;
  
  // Algorithm-specific caches
  private forceCache = new Map<string, {fx: number; fy: number}>();
  private distanceCache = new Map<string, number>();
  private clusterCache = new Map<string, string>();
  
  constructor() {
    // Initialize engine
  }

  // ============================================================================
  // PUBLIC API - MAIN LAYOUT COMPUTATION
  // ============================================================================

  /**
   * Compute optimal layout for given boxes and relationships
   * This is the main entry point for layout computation
   */
  public async computeLayout(
    boxes: EnhancedUTXOBox[],
    relationships: BoxRelationship[],
    options: Partial<LayoutOptions> = {}
  ): Promise<LayoutResult> {
    const startTime = performance.now();
    
    // Merge with default options
    const layoutOptions = this.mergeOptions(options);
    
    // Prepare layout data
    const layoutData = this.prepareLayoutData(boxes, relationships, layoutOptions);
    
    // Select and execute algorithm
    const positions = await this.executeLayoutAlgorithm(layoutData);
    
    // Create edge layout information
    const edges = this.createEdgeLayout(relationships, positions, layoutOptions);
    
    // Create group information
    const groups = this.createGroupLayout(layoutData, positions);
    
    // Calculate quality metrics
    const quality = this.calculateQualityMetrics(positions, edges);
    
    // Calculate bounding box
    const boundingBox = this.calculateBoundingBox(positions);
    
    const computationTime = performance.now() - startTime;
    
    // Create final result
    const result: LayoutResult = {
      positions,
      edges,
      groups,
      metadata: {
        algorithm: layoutOptions.algorithm,
        computationTime,
        boundingBox,
      },
      quality,
    };
    
    this.currentLayout = result;
    return result;
  }

  /**
   * Update layout with new focus or highlighting
   */
  public async updateLayoutFocus(
    focusOptions: {
      centerBox?: BoxId;
      highlightPath?: BoxId[];
      emphasizeProtocol?: string;
    },
    transitionDuration: number = 800
  ): Promise<LayoutResult> {
    if (!this.currentLayout) {
      throw new Error('No current layout to update. Call computeLayout first.');
    }
    
    // Create updated options with new focus
    const updatedOptions: Partial<LayoutOptions> = {
      focus: focusOptions,
      animation: {
        enableTransitions: true,
        transitionDuration,
        easingFunction: 'ease-in-out',
      },
    };
    
    // Re-compute layout with focus adjustments
    const boxes = this.extractBoxesFromLayout(this.currentLayout);
    const relationships = this.extractRelationshipsFromLayout(this.currentLayout);
    
    return this.computeLayout(boxes, relationships, updatedOptions);
  }

  /**
   * Transition between different layout algorithms
   */
  public async transitionToAlgorithm(
    newAlgorithm: LayoutAlgorithm,
    protocolType?: ProtocolLayoutType,
    transitionDuration: number = 1200
  ): Promise<LayoutResult> {
    if (!this.currentLayout) {
      throw new Error('No current layout to transition from. Call computeLayout first.');
    }
    
    const boxes = this.extractBoxesFromLayout(this.currentLayout);
    const relationships = this.extractRelationshipsFromLayout(this.currentLayout);
    
    // Store current positions for smooth transition
    const fromPositions = new Map(
      this.currentLayout.positions.map(pos => [pos.id, {x: pos.x, y: pos.y}])
    );
    
    // Compute new layout
    const newOptions: Partial<LayoutOptions> = {
      algorithm: newAlgorithm,
      protocolType,
      animation: {
        enableTransitions: true,
        transitionDuration,
        easingFunction: 'ease-in-out',
      },
    };
    
    const newLayout = await this.computeLayout(boxes, relationships, newOptions);
    
    // Add transition animation data
    newLayout.positions = newLayout.positions.map(pos => {
      const fromPos = fromPositions.get(pos.id);
      if (fromPos) {
        return {
          ...pos,
          animation: {
            fromX: fromPos.x,
            fromY: fromPos.y,
            progress: 0,
          },
        };
      }
      return pos;
    });
    
    return newLayout;
  }

  // ============================================================================
  // LAYOUT ALGORITHM IMPLEMENTATIONS
  // ============================================================================

  /**
   * Execute the selected layout algorithm
   */
  private async executeLayoutAlgorithm(data: LayoutData): Promise<NodePosition[]> {
    switch (data.options.algorithm) {
      case 'temporal_flow':
        return this.computeTemporalLayout(data);
      
      case 'force_directed':
        return this.computeForceDirectedLayout(data);
      
      case 'hierarchical':
        return this.computeHierarchicalLayout(data);
      
      case 'protocol_aware':
        return this.computeProtocolAwareLayout(data);
      
      case 'circular':
        return this.computeCircularLayout(data);
      
      case 'grid':
        return this.computeGridLayout(data);
      
      case 'hybrid':
        return this.computeHybridLayout(data);
      
      default:
        console.warn(`Unknown algorithm: ${data.options.algorithm}, falling back to force_directed`);
        return this.computeForceDirectedLayout(data);
    }
  }

  /**
   * Temporal flow layout - arrange boxes chronologically
   */
  private computeTemporalLayout(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport, spacing } = data.options;
    
    // Sort boxes by creation height
    const sortedBoxes = [...data.boxes].sort((a, b) => a.creationHeight - b.creationHeight);
    
    // Group by height for better visualization
    const heightGroups = new Map<number, EnhancedUTXOBox[]>();
    for (const box of sortedBoxes) {
      if (!heightGroups.has(box.creationHeight)) {
        heightGroups.set(box.creationHeight, []);
      }
      heightGroups.get(box.creationHeight)!.push(box);
    }
    
    const heights = Array.from(heightGroups.keys()).sort((a, b) => a - b);
    const layerWidth = viewport.width - 100;
    const layerHeight = spacing.layerSpacing;
    
    for (let i = 0; i < heights.length; i++) {
      const height = heights[i];
      const boxesAtHeight = heightGroups.get(height)!;
      const y = 50 + i * layerHeight;
      
      // Arrange boxes horizontally within each height layer
      const boxSpacing = Math.min(spacing.nodeSpacing, layerWidth / (boxesAtHeight.length + 1));
      
      for (let j = 0; j < boxesAtHeight.length; j++) {
        const box = boxesAtHeight[j];
        const x = 50 + (j + 1) * boxSpacing;
        
        positions.push({
          id: box.id,
          x,
          y,
          layer: i,
          group: `height_${height}`,
          weight: this.calculateNodeWeight(box),
          size: this.calculateNodeSize(box),
        });
      }
    }
    
    // Apply relationship-based adjustments
    return this.applyRelationshipAdjustments(positions, data.relationships, data.options);
  }

  /**
   * Force-directed layout - physics-based organic clustering
   */
  private computeForceDirectedLayout(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport, spacing, advanced } = data.options;
    
    // Initialize random positions
    const nodeMap = new Map<BoxId, NodePosition>();
    for (const box of data.boxes) {
      const position: NodePosition = {
        id: box.id,
        x: Math.random() * viewport.width,
        y: Math.random() * viewport.height,
        weight: this.calculateNodeWeight(box),
        size: this.calculateNodeSize(box),
      };
      nodeMap.set(box.id, position);
      positions.push(position);
    }
    
    // Force-directed simulation
    let temperature = 100;
    const coolingRate = advanced.temperatureCooling;
    
    for (let iteration = 0; iteration < advanced.maxIterations; iteration++) {
      // Calculate forces
      this.calculateRepulsiveForces(positions, spacing.nodeSpacing, temperature);
      this.calculateAttractiveForces(positions, data.relationships, spacing.edgeLength);
      this.calculateGroupForces(positions, data.groups, spacing.groupSpacing);
      
      // Apply forces and update positions
      this.applyForces(positions, temperature);
      
      // Cool down
      temperature *= coolingRate;
      
      // Check convergence
      if (temperature < advanced.convergenceThreshold) {
        break;
      }
    }
    
    // Apply bounds constraints
    return this.applyBoundsConstraints(positions, viewport);
  }

  /**
   * Hierarchical layout - layered by transaction flow roles
   */
  private computeHierarchicalLayout(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport, spacing } = data.options;
    
    // Build hierarchy based on transaction flows
    const layers = this.buildTransactionHierarchy(data.boxes, data.relationships);
    
    const layerHeight = spacing.layerSpacing;
    const layerCount = layers.size;
    
    for (const [layerIndex, layerBoxes] of layers) {
      const y = 50 + layerIndex * layerHeight;
      const layerWidth = viewport.width - 100;
      const nodeSpacing = Math.min(spacing.nodeSpacing, layerWidth / (layerBoxes.length + 1));
      
      // Sort boxes within layer for better visual flow
      const sortedBoxes = this.sortBoxesInLayer(layerBoxes, data.relationships);
      
      for (let i = 0; i < sortedBoxes.length; i++) {
        const box = sortedBoxes[i];
        const x = 50 + (i + 1) * nodeSpacing;
        
        positions.push({
          id: box.id,
          x,
          y,
          layer: layerIndex,
          group: `layer_${layerIndex}`,
          weight: this.calculateNodeWeight(box),
          size: this.calculateNodeSize(box),
        });
      }
    }
    
    // Apply relationship-based fine-tuning
    return this.optimizeLayerPositions(positions, data.relationships);
  }

  /**
   * Protocol-aware layout - specialized layouts for specific protocols
   */
  private computeProtocolAwareLayout(data: LayoutData): NodePosition[] {
    const protocolType = data.options.protocolType || 'dex_flow_linear';
    
    switch (protocolType) {
      case 'dex_order_book':
        return this.layoutDEXOrderBook(data);
      
      case 'dex_flow_linear':
        return this.layoutDEXFlowLinear(data);
      
      case 'atomic_bidirectional':
        return this.layoutAtomicBidirectional(data);
      
      case 'partial_order_tree':
        return this.layoutPartialOrderTree(data);
      
      case 'fee_collection_radial':
        return this.layoutFeeCollectionRadial(data);
      
      case 'refund_star':
        return this.layoutRefundStar(data);
      
      case 'multisig_coordination':
        return this.layoutMultisigCoordination(data);
      
      case 'temporal_chain':
        return this.layoutTemporalChain(data);
      
      default:
        return this.computeForceDirectedLayout(data);
    }
  }

  /**
   * Circular layout - arrange nodes in circular patterns
   */
  private computeCircularLayout(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport } = data.options;
    
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    const radius = Math.min(viewport.width, viewport.height) * 0.3;
    
    // Group boxes by protocol/type for multiple circles
    const groups = this.groupBoxesForCircularLayout(data.boxes, data.options.grouping);
    
    let circleIndex = 0;
    for (const [groupName, groupBoxes] of groups) {
      const groupRadius = radius + circleIndex * 80;
      const angleStep = (2 * Math.PI) / groupBoxes.length;
      
      for (let i = 0; i < groupBoxes.length; i++) {
        const box = groupBoxes[i];
        const angle = i * angleStep;
        const x = centerX + groupRadius * Math.cos(angle);
        const y = centerY + groupRadius * Math.sin(angle);
        
        positions.push({
          id: box.id,
          x,
          y,
          group: groupName,
          weight: this.calculateNodeWeight(box),
          size: this.calculateNodeSize(box),
        });
      }
      
      circleIndex++;
    }
    
    return positions;
  }

  /**
   * Grid layout - regular grid arrangement
   */
  private computeGridLayout(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport, spacing } = data.options;
    
    const cols = Math.ceil(Math.sqrt(data.boxes.length));
    const rows = Math.ceil(data.boxes.length / cols);
    
    const cellWidth = (viewport.width - 100) / cols;
    const cellHeight = (viewport.height - 100) / rows;
    
    // Sort boxes for logical grid arrangement
    const sortedBoxes = this.sortBoxesForGrid(data.boxes, data.options.grouping);
    
    for (let i = 0; i < sortedBoxes.length; i++) {
      const box = sortedBoxes[i];
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      const x = 50 + col * cellWidth + cellWidth / 2;
      const y = 50 + row * cellHeight + cellHeight / 2;
      
      positions.push({
        id: box.id,
        x,
        y,
        group: `cell_${row}_${col}`,
        weight: this.calculateNodeWeight(box),
        size: this.calculateNodeSize(box),
      });
    }
    
    return positions;
  }

  /**
   * Hybrid layout - combination of multiple algorithms
   */
  private computeHybridLayout(data: LayoutData): NodePosition[] {
    // Start with hierarchical for overall structure
    let positions = this.computeHierarchicalLayout(data);
    
    // Apply force-directed optimization within layers
    positions = this.optimizeWithForces(positions, data.relationships, data.options);
    
    // Apply protocol-specific adjustments
    if (data.options.protocolType) {
      positions = this.applyProtocolAdjustments(positions, data, data.options.protocolType);
    }
    
    return positions;
  }

  // ============================================================================
  // PROTOCOL-SPECIFIC LAYOUT IMPLEMENTATIONS
  // ============================================================================

  /**
   * DEX order book layout with bid/ask separation
   */
  private layoutDEXOrderBook(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport, spacing } = data.options;
    
    const dexBoxes = data.boxes.filter(isDEXBox);
    const otherBoxes = data.boxes.filter(box => !isDEXBox(box));
    
    // Separate bids and asks
    const buyOrders = dexBoxes.filter(box => box.dexOrder?.orderType === 'buy');
    const sellOrders = dexBoxes.filter(box => box.dexOrder?.orderType === 'sell');
    
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    
    // Layout buy orders on the left
    this.layoutOrderSide(buyOrders, positions, {
      x: centerX - 200,
      y: centerY,
      direction: 'left',
      spacing: spacing.nodeSpacing,
    });
    
    // Layout sell orders on the right
    this.layoutOrderSide(sellOrders, positions, {
      x: centerX + 200,
      y: centerY,
      direction: 'right',
      spacing: spacing.nodeSpacing,
    });
    
    // Layout other boxes around the order book
    this.layoutSupportingBoxes(otherBoxes, positions, viewport, spacing);
    
    return positions;
  }

  /**
   * Linear DEX flow layout for order → settlement → new order patterns
   */
  private layoutDEXFlowLinear(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport, spacing } = data.options;
    
    // Identify DEX flow chains
    const flowChains = this.identifyDEXFlowChains(data.boxes, data.relationships);
    
    const chainHeight = spacing.layerSpacing;
    let currentY = 50;
    
    for (const chain of flowChains) {
      const chainWidth = viewport.width - 100;
      const stepWidth = chainWidth / (chain.length + 1);
      
      for (let i = 0; i < chain.length; i++) {
        const box = chain[i];
        const x = 50 + (i + 1) * stepWidth;
        
        positions.push({
          id: box.id,
          x,
          y: currentY,
          group: `chain_${flowChains.indexOf(chain)}`,
          weight: this.calculateNodeWeight(box),
          size: this.calculateNodeSize(box),
        });
      }
      
      currentY += chainHeight;
    }
    
    return positions;
  }

  /**
   * Bidirectional atomic exchange layout
   */
  private layoutAtomicBidirectional(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport, spacing } = data.options;
    
    const atomicBoxes = data.boxes.filter(isAtomicExchangeBox);
    const otherBoxes = data.boxes.filter(box => !isAtomicExchangeBox(box));
    
    // Group atomic boxes by participants
    const exchangeGroups = this.groupAtomicExchangesByParticipants(atomicBoxes);
    
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    let groupIndex = 0;
    
    for (const [participants, exchanges] of exchangeGroups) {
      const groupY = centerY + (groupIndex - exchangeGroups.size / 2) * spacing.groupSpacing;
      
      // Layout as bidirectional flow
      this.layoutBidirectionalFlow(exchanges, positions, {
        centerX,
        centerY: groupY,
        spacing: spacing.nodeSpacing,
        group: `atomic_${groupIndex}`,
      });
      
      groupIndex++;
    }
    
    // Layout supporting boxes
    this.layoutSupportingBoxes(otherBoxes, positions, viewport, spacing);
    
    return positions;
  }

  /**
   * Partial order tree layout for DEX partial fills
   */
  private layoutPartialOrderTree(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport, spacing } = data.options;
    
    // Build partial order trees
    const orderTrees = this.buildPartialOrderTrees(data.boxes, data.relationships);
    
    let currentX = 50;
    for (const tree of orderTrees) {
      const treePositions = this.layoutTree(tree, {
        startX: currentX,
        startY: 50,
        levelHeight: spacing.layerSpacing,
        nodeSpacing: spacing.nodeSpacing,
      });
      
      positions.push(...treePositions);
      
      // Calculate tree width and move to next position
      const treeWidth = Math.max(...treePositions.map(p => p.x)) - currentX + spacing.groupSpacing;
      currentX += treeWidth;
    }
    
    return positions;
  }

  /**
   * Radial fee collection layout
   */
  private layoutFeeCollectionRadial(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport, spacing } = data.options;
    
    const feeBoxes = data.boxes.filter(box => 
      box.boxType === 'fee_collection' || box.boxType === 'dex_fee'
    );
    const sourceBoxes = data.boxes.filter(box => 
      box.boxType !== 'fee_collection' && box.boxType !== 'dex_fee'
    );
    
    // Layout fee boxes in center
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    
    this.layoutCentralNodes(feeBoxes, positions, {
      centerX,
      centerY,
      spacing: spacing.nodeSpacing / 2,
    });
    
    // Layout source boxes in rings around fee collectors
    this.layoutRadialRings(sourceBoxes, positions, {
      centerX,
      centerY,
      startRadius: 150,
      ringSpacing: 100,
      spacing: spacing.nodeSpacing,
    });
    
    return positions;
  }

  /**
   * Star pattern for refund scenarios
   */
  private layoutRefundStar(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport, spacing } = data.options;
    
    const refundBoxes = data.boxes.filter(box => box.boxType === 'refund');
    const sourceBoxes = data.boxes.filter(box => box.boxType !== 'refund');
    
    // Group by refund source
    const refundGroups = this.groupRefundsBySource(refundBoxes, data.relationships);
    
    let groupIndex = 0;
    for (const [source, refunds] of refundGroups) {
      const groupCenterX = viewport.width / 4 + (groupIndex % 2) * viewport.width / 2;
      const groupCenterY = viewport.height / 4 + Math.floor(groupIndex / 2) * viewport.height / 2;
      
      // Place source at center
      positions.push({
        id: source,
        x: groupCenterX,
        y: groupCenterY,
        group: `refund_star_${groupIndex}`,
        weight: this.calculateNodeWeight(data.boxes.find(b => b.id === source)!),
        size: this.calculateNodeSize(data.boxes.find(b => b.id === source)!),
      });
      
      // Place refunds in star pattern around source
      this.layoutStarPattern(refunds, positions, {
        centerX: groupCenterX,
        centerY: groupCenterY,
        radius: 120,
        group: `refund_star_${groupIndex}`,
      });
      
      groupIndex++;
    }
    
    return positions;
  }

  /**
   * Multi-signature coordination layout
   */
  private layoutMultisigCoordination(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport, spacing } = data.options;
    
    const multisigBoxes = data.boxes.filter(box => box.boxType === 'multi_sig');
    const coordinationGroups = this.groupMultisigByParticipants(multisigBoxes);
    
    // Layout as coordination clusters
    let clusterIndex = 0;
    for (const [participants, boxes] of coordinationGroups) {
      const clusterCenterX = viewport.width / 3 + (clusterIndex % 2) * viewport.width / 3;
      const clusterCenterY = viewport.height / 3 + Math.floor(clusterIndex / 2) * viewport.height / 3;
      
      this.layoutCoordinationCluster(boxes, positions, {
        centerX: clusterCenterX,
        centerY: clusterCenterY,
        radius: 100,
        group: `multisig_${clusterIndex}`,
      });
      
      clusterIndex++;
    }
    
    return positions;
  }

  /**
   * Temporal chain layout for time-based sequences
   */
  private layoutTemporalChain(data: LayoutData): NodePosition[] {
    const positions: NodePosition[] = [];
    const { viewport, spacing } = data.options;
    
    // Build temporal chains
    const temporalChains = this.buildTemporalChains(data.boxes, data.relationships);
    
    const chainSpacing = spacing.groupSpacing;
    let currentY = 50;
    
    for (const chain of temporalChains) {
      const chainWidth = viewport.width - 100;
      const stepWidth = chainWidth / (chain.length + 1);
      
      for (let i = 0; i < chain.length; i++) {
        const box = chain[i];
        const x = 50 + (i + 1) * stepWidth;
        
        positions.push({
          id: box.id,
          x,
          y: currentY,
          group: `temporal_${temporalChains.indexOf(chain)}`,
          weight: this.calculateNodeWeight(box),
          size: this.calculateNodeSize(box),
        });
      }
      
      currentY += chainSpacing;
    }
    
    return positions;
  }

  // ============================================================================
  // OPTIMIZATION AND HELPER METHODS
  // ============================================================================

  /**
   * Apply relationship-based adjustments to positions
   */
  private applyRelationshipAdjustments(
    positions: NodePosition[],
    relationships: BoxRelationship[],
    options: LayoutOptions
  ): NodePosition[] {
    if (!options.optimization.minimizeEdgeCrossings) {
      return positions;
    }
    
    // Create position map for quick lookup
    const positionMap = new Map(positions.map(p => [p.id, p]));
    
    // Iteratively reduce edge crossings
    for (let iteration = 0; iteration < 10; iteration++) {
      let improved = false;
      
      for (const relationship of relationships) {
        const fromPos = positionMap.get(relationship.fromBoxId);
        const toPos = positionMap.get(relationship.toBoxId);
        
        if (fromPos && toPos) {
          // Calculate current crossings for this edge
          const currentCrossings = this.countEdgeCrossings(fromPos, toPos, positions, relationships);
          
          // Try small adjustments
          const adjustments = this.generatePositionAdjustments(fromPos, toPos, options.spacing.nodeSpacing);
          
          for (const adjustment of adjustments) {
            const testCrossings = this.countEdgeCrossings(adjustment.from, adjustment.to, positions, relationships);
            
            if (testCrossings < currentCrossings) {
              fromPos.x = adjustment.from.x;
              fromPos.y = adjustment.from.y;
              toPos.x = adjustment.to.x;
              toPos.y = adjustment.to.y;
              improved = true;
              break;
            }
          }
        }
      }
      
      if (!improved) break;
    }
    
    return positions;
  }

  /**
   * Calculate repulsive forces between nodes
   */
  private calculateRepulsiveForces(
    positions: NodePosition[],
    minDistance: number,
    temperature: number
  ): void {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const node1 = positions[i];
        const node2 = positions[j];
        
        const dx = node1.x - node2.x;
        const dy = node1.y - node2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance && distance > 0) {
          const force = (minDistance - distance) / distance * temperature * 0.1;
          
          const forceX = dx * force;
          const forceY = dy * force;
          
          // Store forces in cache
          const force1 = this.forceCache.get(node1.id) || { fx: 0, fy: 0 };
          const force2 = this.forceCache.get(node2.id) || { fx: 0, fy: 0 };
          
          force1.fx += forceX;
          force1.fy += forceY;
          force2.fx -= forceX;
          force2.fy -= forceY;
          
          this.forceCache.set(node1.id, force1);
          this.forceCache.set(node2.id, force2);
        }
      }
    }
  }

  /**
   * Calculate attractive forces along edges
   */
  private calculateAttractiveForces(
    positions: NodePosition[],
    relationships: BoxRelationship[],
    desiredLength: number
  ): void {
    const positionMap = new Map(positions.map(p => [p.id, p]));
    
    for (const relationship of relationships) {
      const fromPos = positionMap.get(relationship.fromBoxId);
      const toPos = positionMap.get(relationship.toBoxId);
      
      if (fromPos && toPos) {
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const force = (distance - desiredLength) / distance * 0.1;
          const weight = this.getRelationshipWeight(relationship);
          
          const forceX = dx * force * weight;
          const forceY = dy * force * weight;
          
          // Apply forces
          const fromForce = this.forceCache.get(fromPos.id) || { fx: 0, fy: 0 };
          const toForce = this.forceCache.get(toPos.id) || { fx: 0, fy: 0 };
          
          fromForce.fx += forceX;
          fromForce.fy += forceY;
          toForce.fx -= forceX;
          toForce.fy -= forceY;
          
          this.forceCache.set(fromPos.id, fromForce);
          this.forceCache.set(toPos.id, toForce);
        }
      }
    }
  }

  /**
   * Calculate group cohesion forces
   */
  private calculateGroupForces(
    positions: NodePosition[],
    groups: Map<string, EnhancedUTXOBox[]>,
    groupSpacing: number
  ): void {
    for (const [groupName, groupBoxes] of groups) {
      const groupPositions = positions.filter(p => 
        groupBoxes.some(box => box.id === p.id)
      );
      
      if (groupPositions.length < 2) continue;
      
      // Calculate group center
      const centerX = groupPositions.reduce((sum, p) => sum + p.x, 0) / groupPositions.length;
      const centerY = groupPositions.reduce((sum, p) => sum + p.y, 0) / groupPositions.length;
      
      // Apply cohesion force
      for (const pos of groupPositions) {
        const dx = centerX - pos.x;
        const dy = centerY - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const force = distance * 0.05; // Weak cohesion force
          
          const forceX = dx / distance * force;
          const forceY = dy / distance * force;
          
          const nodeForce = this.forceCache.get(pos.id) || { fx: 0, fy: 0 };
          nodeForce.fx += forceX;
          nodeForce.fy += forceY;
          
          this.forceCache.set(pos.id, nodeForce);
        }
      }
    }
  }

  /**
   * Apply calculated forces to update positions
   */
  private applyForces(positions: NodePosition[], temperature: number): void {
    for (const position of positions) {
      if (position.fixed) continue;
      
      const force = this.forceCache.get(position.id);
      if (force) {
        // Limit force magnitude
        const magnitude = Math.sqrt(force.fx * force.fx + force.fy * force.fy);
        if (magnitude > temperature) {
          force.fx = (force.fx / magnitude) * temperature;
          force.fy = (force.fy / magnitude) * temperature;
        }
        
        position.x += force.fx;
        position.y += force.fy;
        
        // Clear force for next iteration
        this.forceCache.delete(position.id);
      }
    }
  }

  /**
   * Apply viewport bounds constraints
   */
  private applyBoundsConstraints(
    positions: NodePosition[],
    viewport: LayoutOptions['viewport']
  ): NodePosition[] {
    const margin = 50;
    
    for (const position of positions) {
      position.x = Math.max(margin, Math.min(viewport.width - margin, position.x));
      position.y = Math.max(margin, Math.min(viewport.height - margin, position.y));
    }
    
    return positions;
  }

  /**
   * Build transaction hierarchy for hierarchical layout
   */
  private buildTransactionHierarchy(
    boxes: EnhancedUTXOBox[],
    relationships: BoxRelationship[]
  ): Map<number, EnhancedUTXOBox[]> {
    const layers = new Map<number, EnhancedUTXOBox[]>();
    const visited = new Set<BoxId>();
    const boxLayers = new Map<BoxId, number>();
    
    // Find root nodes (boxes with no incoming relationships)
    const incomingCounts = new Map<BoxId, number>();
    for (const box of boxes) {
      incomingCounts.set(box.id, 0);
    }
    
    for (const rel of relationships) {
      incomingCounts.set(rel.toBoxId, (incomingCounts.get(rel.toBoxId) || 0) + 1);
    }
    
    const roots = boxes.filter(box => incomingCounts.get(box.id) === 0);
    
    // BFS to assign layers
    const queue: Array<{box: EnhancedUTXOBox; layer: number}> = roots.map(box => ({box, layer: 0}));
    
    while (queue.length > 0) {
      const {box, layer} = queue.shift()!;
      
      if (visited.has(box.id)) continue;
      visited.add(box.id);
      
      boxLayers.set(box.id, layer);
      
      if (!layers.has(layer)) {
        layers.set(layer, []);
      }
      layers.get(layer)!.push(box);
      
      // Add children to queue
      const outgoingRels = relationships.filter(rel => rel.fromBoxId === box.id);
      for (const rel of outgoingRels) {
        const childBox = boxes.find(b => b.id === rel.toBoxId);
        if (childBox && !visited.has(childBox.id)) {
          queue.push({box: childBox, layer: layer + 1});
        }
      }
    }
    
    return layers;
  }

  /**
   * Calculate node weight based on box properties
   */
  private calculateNodeWeight(box: EnhancedUTXOBox): number {
    let weight = 1;
    
    // Increase weight for important box types
    if (isDEXBox(box)) weight += 0.5;
    if (isAtomicExchangeBox(box)) weight += 0.5;
    if (isContractBox(box)) weight += 0.3;
    
    // Increase weight based on value
    const value = Number(box.value);
    if (value > 1000000000) weight += 0.5; // > 1 ERG
    if (value > 10000000000) weight += 1; // > 10 ERG
    
    // Increase weight for boxes with many tokens
    weight += box.tokens.length * 0.1;
    
    return weight;
  }

  /**
   * Calculate node size based on box properties
   */
  private calculateNodeSize(box: EnhancedUTXOBox): {width: number; height: number} {
    let baseSize = 60;
    
    // Adjust size based on box type
    if (isDEXBox(box)) baseSize += 10;
    if (isAtomicExchangeBox(box)) baseSize += 10;
    if (box.boxType === 'contract_state') baseSize += 15;
    
    // Adjust size based on value
    const value = Number(box.value);
    if (value > 1000000000) baseSize += 5;
    if (value > 10000000000) baseSize += 10;
    
    // Adjust for tokens
    baseSize += box.tokens.length * 2;
    
    return {
      width: baseSize,
      height: baseSize * 0.8,
    };
  }

  /**
   * Get relationship weight for force calculations
   */
  private getRelationshipWeight(relationship: BoxRelationship): number {
    switch (relationship.strength) {
      case 'strong': return 2.0;
      case 'medium': return 1.0;
      case 'weak': return 0.5;
      default: return 1.0;
    }
  }

  /**
   * Create edge layout information
   */
  private createEdgeLayout(
    relationships: BoxRelationship[],
    positions: NodePosition[],
    options: LayoutOptions
  ): LayoutEdge[] {
    const positionMap = new Map(positions.map(p => [p.id, p]));
    const edges: LayoutEdge[] = [];
    
    for (const relationship of relationships) {
      const fromPos = positionMap.get(relationship.fromBoxId);
      const toPos = positionMap.get(relationship.toBoxId);
      
      if (fromPos && toPos) {
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        edges.push({
          id: relationship.id,
          from: relationship.fromBoxId,
          to: relationship.toBoxId,
          relationship,
          length,
          weight: this.getRelationshipWeight(relationship),
          type: this.classifyEdgeType(relationship),
        });
      }
    }
    
    return edges;
  }

  /**
   * Classify edge type for visual styling
   */
  private classifyEdgeType(relationship: BoxRelationship): 'primary' | 'secondary' | 'weak' {
    switch (relationship.type) {
      case 'parent_child':
      case 'state_transition':
      case 'partial_consumption':
      case 'atomic_pair':
        return 'primary';
      
      case 'input_output':
      case 'multisig_coordination':
        return 'secondary';
      
      default:
        return 'weak';
    }
  }

  /**
   * Create group layout information
   */
  private createGroupLayout(data: LayoutData, positions: NodePosition[]): LayoutGroup[] {
    const groups: LayoutGroup[] = [];
    
    for (const [groupName, groupBoxes] of data.groups) {
      const groupPositions = positions.filter(p => 
        groupBoxes.some(box => box.id === p.id)
      );
      
      if (groupPositions.length === 0) continue;
      
      const xs = groupPositions.map(p => p.x);
      const ys = groupPositions.map(p => p.y);
      
      const bounds = {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      };
      
      groups.push({
        id: groupName,
        type: data.options.grouping,
        boxes: groupBoxes.map(box => box.id),
        center: {
          x: (bounds.minX + bounds.maxX) / 2,
          y: (bounds.minY + bounds.maxY) / 2,
        },
        bounds,
      });
    }
    
    return groups;
  }

  /**
   * Calculate layout quality metrics
   */
  private calculateQualityMetrics(positions: NodePosition[], edges: LayoutEdge[]): LayoutResult['quality'] {
    const edgeCrossings = this.countTotalEdgeCrossings(edges, positions);
    const averageEdgeLength = edges.reduce((sum, edge) => sum + edge.length, 0) / edges.length;
    const nodeOverlaps = this.countNodeOverlaps(positions);
    const readabilityScore = this.calculateReadabilityScore(positions, edges);
    
    return {
      edgeCrossings,
      averageEdgeLength,
      nodeOverlaps,
      readabilityScore,
    };
  }

  /**
   * Calculate bounding box of all positions
   */
  private calculateBoundingBox(positions: NodePosition[]): LayoutResult['metadata']['boundingBox'] {
    if (positions.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }

  /**
   * Count edge crossings between two specific edges
   */
  private countEdgeCrossings(
    fromPos: NodePosition,
    toPos: NodePosition,
    positions: NodePosition[],
    relationships: BoxRelationship[]
  ): number {
    let crossings = 0;
    const positionMap = new Map(positions.map(p => [p.id, p]));
    
    for (const rel of relationships) {
      const otherFromPos = positionMap.get(rel.fromBoxId);
      const otherToPos = positionMap.get(rel.toBoxId);
      
      if (otherFromPos && otherToPos &&
          (otherFromPos.id !== fromPos.id || otherToPos.id !== toPos.id)) {
        if (this.doLinesIntersect(fromPos, toPos, otherFromPos, otherToPos)) {
          crossings++;
        }
      }
    }
    
    return crossings;
  }

  /**
   * Check if two line segments intersect
   */
  private doLinesIntersect(
    p1: {x: number; y: number},
    p2: {x: number; y: number},
    p3: {x: number; y: number},
    p4: {x: number; y: number}
  ): boolean {
    const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
    if (det === 0) return false; // Parallel lines
    
    const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
    const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
    
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }

  /**
   * Count total edge crossings in layout
   */
  private countTotalEdgeCrossings(edges: LayoutEdge[], positions: NodePosition[]): number {
    let crossings = 0;
    const positionMap = new Map(positions.map(p => [p.id, p]));
    
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const edge1 = edges[i];
        const edge2 = edges[j];
        
        const p1 = positionMap.get(edge1.from);
        const p2 = positionMap.get(edge1.to);
        const p3 = positionMap.get(edge2.from);
        const p4 = positionMap.get(edge2.to);
        
        if (p1 && p2 && p3 && p4 && this.doLinesIntersect(p1, p2, p3, p4)) {
          crossings++;
        }
      }
    }
    
    return crossings;
  }

  /**
   * Count node overlaps
   */
  private countNodeOverlaps(positions: NodePosition[]): number {
    let overlaps = 0;
    
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const pos1 = positions[i];
        const pos2 = positions[j];
        
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const size1 = pos1.size || { width: 60, height: 60 };
        const size2 = pos2.size || { width: 60, height: 60 };
        const minDistance = (Math.max(size1.width, size1.height) + Math.max(size2.width, size2.height)) / 2;
        
        if (distance < minDistance) {
          overlaps++;
        }
      }
    }
    
    return overlaps;
  }

  /**
   * Calculate readability score
   */
  private calculateReadabilityScore(positions: NodePosition[], edges: LayoutEdge[]): number {
    // Readability is based on:
    // 1. Uniform spacing (higher is better)
    // 2. Few edge crossings (lower is better)
    // 3. Consistent edge lengths (lower variance is better)
    // 4. Good aspect ratio utilization
    
    const spacingScore = this.calculateSpacingUniformity(positions);
    const crossingScore = 1 / (1 + this.countTotalEdgeCrossings(edges, positions) * 0.1);
    const edgeLengthScore = this.calculateEdgeLengthConsistency(edges);
    const aspectRatioScore = this.calculateAspectRatioUtilization(positions);
    
    return (spacingScore + crossingScore + edgeLengthScore + aspectRatioScore) / 4;
  }

  /**
   * Calculate spacing uniformity score
   */
  private calculateSpacingUniformity(positions: NodePosition[]): number {
    if (positions.length < 2) return 1;
    
    const distances: number[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        distances.push(Math.sqrt(dx * dx + dy * dy));
      }
    }
    
    const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length;
    const coefficient = Math.sqrt(variance) / mean;
    
    return Math.max(0, 1 - coefficient);
  }

  /**
   * Calculate edge length consistency score
   */
  private calculateEdgeLengthConsistency(edges: LayoutEdge[]): number {
    if (edges.length === 0) return 1;
    
    const lengths = edges.map(edge => edge.length);
    const mean = lengths.reduce((sum, l) => sum + l, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length;
    const coefficient = Math.sqrt(variance) / mean;
    
    return Math.max(0, 1 - coefficient * 0.5);
  }

  /**
   * Calculate aspect ratio utilization score
   */
  private calculateAspectRatioUtilization(positions: NodePosition[]): number {
    if (positions.length === 0) return 1;
    
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    
    const aspectRatio = width / height;
    const idealRatio = 1.618; // Golden ratio
    
    return 1 / (1 + Math.abs(aspectRatio - idealRatio) * 0.2);
  }

  /**
   * Prepare layout data from inputs
   */
  private prepareLayoutData(
    boxes: EnhancedUTXOBox[],
    relationships: BoxRelationship[],
    options: LayoutOptions
  ): LayoutData {
    // Group boxes according to grouping strategy
    const groups = this.createGroups(boxes, options.grouping);
    
    return {
      boxes,
      relationships,
      groups,
      options,
    };
  }

  /**
   * Create groups based on grouping strategy
   */
  private createGroups(boxes: EnhancedUTXOBox[], strategy: GroupingStrategy): Map<string, EnhancedUTXOBox[]> {
    const groups = new Map<string, EnhancedUTXOBox[]>();
    
    for (const box of boxes) {
      let groupKey: string;
      
      switch (strategy) {
        case 'by_party':
          groupKey = box.owner || 'unknown';
          break;
        case 'by_transaction':
          groupKey = box.creationTxId;
          break;
        case 'by_protocol':
          groupKey = this.getProtocolGroup(box);
          break;
        case 'by_box_type':
          groupKey = box.boxType;
          break;
        case 'by_height':
          groupKey = `height_${Math.floor(box.creationHeight / 10) * 10}`;
          break;
        case 'by_relationship':
          groupKey = 'relationship_group'; // Will be refined later
          break;
        default:
          groupKey = 'all';
      }
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(box);
    }
    
    return groups;
  }

  /**
   * Get protocol group for a box
   */
  private getProtocolGroup(box: EnhancedUTXOBox): string {
    if (isDEXBox(box)) return 'dex';
    if (isAtomicExchangeBox(box)) return 'atomic';
    if (box.boxType === 'multi_sig') return 'multisig';
    if (box.boxType === 'oracle_pool') return 'oracle';
    if (box.boxType === 'governance') return 'governance';
    if (isContractBox(box)) return 'contract';
    return 'basic';
  }

  /**
   * Merge partial options with defaults
   */
  private mergeOptions(partial: Partial<LayoutOptions>): LayoutOptions {
    return {
      ...DEFAULT_LAYOUT_OPTIONS,
      ...partial,
      viewport: { ...DEFAULT_LAYOUT_OPTIONS.viewport, ...partial.viewport },
      spacing: { ...DEFAULT_LAYOUT_OPTIONS.spacing, ...partial.spacing },
      optimization: { ...DEFAULT_LAYOUT_OPTIONS.optimization, ...partial.optimization },
      focus: { ...DEFAULT_LAYOUT_OPTIONS.focus, ...partial.focus },
      animation: { ...DEFAULT_LAYOUT_OPTIONS.animation, ...partial.animation },
      advanced: { ...DEFAULT_LAYOUT_OPTIONS.advanced, ...partial.advanced },
    };
  }

  /**
   * Extract boxes from current layout result
   */
  private extractBoxesFromLayout(layout: LayoutResult): EnhancedUTXOBox[] {
    // This would require storing the original boxes in the layout result
    // For now, return empty array - in practice, this would be stored
    return [];
  }

  /**
   * Extract relationships from current layout result
   */
  private extractRelationshipsFromLayout(layout: LayoutResult): BoxRelationship[] {
    return layout.edges.map(edge => edge.relationship);
  }

  // ============================================================================
  // ADDITIONAL HELPER METHODS (Stub implementations for complex operations)
  // ============================================================================

  private generatePositionAdjustments(
    fromPos: NodePosition,
    toPos: NodePosition,
    spacing: number
  ): Array<{from: NodePosition; to: NodePosition}> {
    // Generate small position adjustments to test for crossing reduction
    const adjustments: Array<{from: NodePosition; to: NodePosition}> = [];
    const delta = spacing * 0.1;
    
    for (const dx of [-delta, 0, delta]) {
      for (const dy of [-delta, 0, delta]) {
        if (dx === 0 && dy === 0) continue;
        
        adjustments.push({
          from: { ...fromPos, x: fromPos.x + dx, y: fromPos.y + dy },
          to: { ...toPos, x: toPos.x - dx, y: toPos.y - dy },
        });
      }
    }
    
    return adjustments;
  }

  private sortBoxesInLayer(boxes: EnhancedUTXOBox[], relationships: BoxRelationship[]): EnhancedUTXOBox[] {
    // Sort boxes within a layer to minimize edge crossings
    return [...boxes].sort((a, b) => {
      // Simple sorting by box type and creation order
      if (a.boxType !== b.boxType) {
        return a.boxType.localeCompare(b.boxType);
      }
      return a.creationHeight - b.creationHeight;
    });
  }

  private optimizeLayerPositions(positions: NodePosition[], relationships: BoxRelationship[]): NodePosition[] {
    // Apply fine-tuning to layer positions
    return positions; // Placeholder
  }

  private groupBoxesForCircularLayout(boxes: EnhancedUTXOBox[], grouping: GroupingStrategy): Map<string, EnhancedUTXOBox[]> {
    return this.createGroups(boxes, grouping);
  }

  private sortBoxesForGrid(boxes: EnhancedUTXOBox[], grouping: GroupingStrategy): EnhancedUTXOBox[] {
    return [...boxes].sort((a, b) => {
      // Sort for logical grid arrangement
      if (a.boxType !== b.boxType) {
        return a.boxType.localeCompare(b.boxType);
      }
      return a.creationHeight - b.creationHeight;
    });
  }

  private optimizeWithForces(
    positions: NodePosition[],
    relationships: BoxRelationship[],
    options: LayoutOptions
  ): NodePosition[] {
    // Apply force-directed optimization to existing positions
    return positions; // Placeholder
  }

  private applyProtocolAdjustments(
    positions: NodePosition[],
    data: LayoutData,
    protocolType: ProtocolLayoutType
  ): NodePosition[] {
    // Apply protocol-specific position adjustments
    return positions; // Placeholder
  }

  // Additional placeholder methods for protocol-specific layouts
  private layoutOrderSide(orders: EnhancedUTXOBox[], positions: NodePosition[], config: any): void {}
  private layoutSupportingBoxes(boxes: EnhancedUTXOBox[], positions: NodePosition[], viewport: any, spacing: any): void {}
  private identifyDEXFlowChains(boxes: EnhancedUTXOBox[], relationships: BoxRelationship[]): EnhancedUTXOBox[][] { return []; }
  private groupAtomicExchangesByParticipants(boxes: EnhancedUTXOBox[]): Map<string, EnhancedUTXOBox[]> { return new Map(); }
  private layoutBidirectionalFlow(exchanges: EnhancedUTXOBox[], positions: NodePosition[], config: any): void {}
  private buildPartialOrderTrees(boxes: EnhancedUTXOBox[], relationships: BoxRelationship[]): any[] { return []; }
  private layoutTree(tree: any, config: any): NodePosition[] { return []; }
  private layoutCentralNodes(boxes: EnhancedUTXOBox[], positions: NodePosition[], config: any): void {}
  private layoutRadialRings(boxes: EnhancedUTXOBox[], positions: NodePosition[], config: any): void {}
  private groupRefundsBySource(boxes: EnhancedUTXOBox[], relationships: BoxRelationship[]): Map<BoxId, EnhancedUTXOBox[]> { return new Map(); }
  private layoutStarPattern(boxes: EnhancedUTXOBox[], positions: NodePosition[], config: any): void {}
  private groupMultisigByParticipants(boxes: EnhancedUTXOBox[]): Map<string, EnhancedUTXOBox[]> { return new Map(); }
  private layoutCoordinationCluster(boxes: EnhancedUTXOBox[], positions: NodePosition[], config: any): void {}
  private buildTemporalChains(boxes: EnhancedUTXOBox[], relationships: BoxRelationship[]): EnhancedUTXOBox[][] { return []; }
}

// Export utility functions
export const createUTXOLayoutEngine = (): UTXOLayoutEngine => {
  return new UTXOLayoutEngine();
};

export const computeUTXOLayout = async (
  boxes: EnhancedUTXOBox[],
  relationships: BoxRelationship[],
  options?: Partial<LayoutOptions>
): Promise<LayoutResult> => {
  const engine = new UTXOLayoutEngine();
  return engine.computeLayout(boxes, relationships, options);
};

export { UTXOLayoutEngine };