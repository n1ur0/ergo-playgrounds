/**
 * GraphConnectionEngine - Sophisticated UTXO Graph Connection Logic for Ergo Blockchain
 * 
 * This engine implements advanced relationship detection and graph construction for Ergo blockchain
 * UTXO visualization, with special focus on:
 * - Register-based linking (R4 parent-child relationships)
 * - DEX contract patterns (order → settlement → new order flows)
 * - Atomic exchange coordination
 * - Multi-stage transaction protocols
 * - Pattern recognition for common Ergo smart contract interactions
 */

import type {
  BoxId,
  TxId,
  EnhancedUTXOBox,
  EnhancedUTXOTransaction,
  BoxRelationship,
  BoxRelationshipType,
  BoxLinkageData,
  ErgoBoxType,
  BoxLifecycleState,
} from './types';
import {
  isDEXBox,
  isAtomicExchangeBox,
  isContractBox,
} from './types';

// ============================================================================
// GRAPH CONTEXT AND ANALYSIS TYPES
// ============================================================================

/**
 * Context for relationship strength calculation and pattern analysis
 */
interface GraphContext {
  /** All boxes in the graph */
  allBoxes: Map<BoxId, EnhancedUTXOBox>;
  /** All transactions in the graph */
  allTransactions: Map<TxId, EnhancedUTXOTransaction>;
  /** Transaction input-output mappings */
  txInputOutputMap: Map<TxId, { inputs: BoxId[]; outputs: BoxId[] }>;
  /** Box creation transaction mapping */
  boxCreationMap: Map<BoxId, TxId>;
  /** Party ownership mapping */
  partyBoxMap: Map<string, BoxId[]>;
  /** Token flow analysis */
  tokenFlows: Map<string, TokenFlowAnalysis>;
}

/**
 * Token flow analysis for relationship detection
 */
interface TokenFlowAnalysis {
  tokenId: string;
  inputBoxes: BoxId[];
  outputBoxes: BoxId[];
  flowType: 'conservation' | 'creation' | 'burn' | 'fee_extraction';
  conservationRatio: number;
}

/**
 * Pattern matching result for complex relationships
 */
interface PatternMatch {
  pattern: 'dex_order_flow' | 'atomic_exchange' | 'partial_settlement' | 'refund_flow' | 'fee_collection';
  confidence: number;
  boxes: BoxId[];
  relationships: Omit<BoxRelationship, 'id'>[];
  metadata: Record<string, any>;
}

/**
 * Relationship clustering for multi-box patterns
 */
interface RelationshipCluster {
  clusterId: string;
  type: 'transaction_group' | 'dex_order_chain' | 'atomic_protocol' | 'refund_sequence';
  boxes: BoxId[];
  centralBox?: BoxId;
  relationships: BoxRelationship[];
  strength: 'weak' | 'medium' | 'strong';
}

// ============================================================================
// MAIN GRAPH CONNECTION ENGINE
// ============================================================================

/**
 * Advanced graph connection engine for Ergo UTXO relationships
 */
export class GraphConnectionEngine {
  private context: GraphContext;
  private relationshipCounter: number = 0;

  constructor() {
    this.context = {
      allBoxes: new Map(),
      allTransactions: new Map(),
      txInputOutputMap: new Map(),
      boxCreationMap: new Map(),
      partyBoxMap: new Map(),
      tokenFlows: new Map(),
    };
  }

  // ============================================================================
  // PUBLIC API - MAIN GRAPH BUILDING METHODS
  // ============================================================================

  /**
   * Build comprehensive graph from boxes and transactions
   * This is the main entry point for graph construction
   */
  public buildGraph(
    boxes: EnhancedUTXOBox[], 
    transactions: EnhancedUTXOTransaction[]
  ): BoxRelationship[] {
    try {
      // Validate input parameters
      if (!this.validateInputs(boxes, transactions)) {
        console.warn('[GraphConnectionEngine] Invalid inputs, returning empty relationships');
        return [];
      }
      
      console.log(`[GraphConnectionEngine] Building graph with ${boxes.length} boxes and ${transactions.length} transactions`);
      
      // Initialize context
      this.initializeContext(boxes, transactions);

      // Build relationships through multiple passes with error handling
      const relationships: BoxRelationship[] = [];

      // Pass 1: Direct transaction flow relationships
      try {
        const txFlowRels = this.createTransactionFlows(transactions);
        relationships.push(...txFlowRels);
        console.log(`[GraphConnectionEngine] Pass 1: Created ${txFlowRels.length} transaction flow relationships`);
      } catch (error) {
        console.error('[GraphConnectionEngine] Error in Pass 1 (transaction flows):', error);
      }

      // Pass 2: Register-based linkages (R4 patterns)
      try {
        const registerRels = this.detectRegisterLinkages(boxes);
        relationships.push(...registerRels);
        console.log(`[GraphConnectionEngine] Pass 2: Created ${registerRels.length} register linkage relationships`);
      } catch (error) {
        console.error('[GraphConnectionEngine] Error in Pass 2 (register linkages):', error);
      }

      // Pass 3: DEX-specific patterns
      try {
        const dexRels = this.identifyDEXPatterns(boxes, relationships);
        relationships.push(...dexRels);
        console.log(`[GraphConnectionEngine] Pass 3: Created ${dexRels.length} DEX pattern relationships`);
      } catch (error) {
        console.error('[GraphConnectionEngine] Error in Pass 3 (DEX patterns):', error);
      }

      // Pass 4: Atomic exchange patterns
      try {
        const atomicRels = this.identifyAtomicExchangePatterns(boxes, relationships);
        relationships.push(...atomicRels);
        console.log(`[GraphConnectionEngine] Pass 4: Created ${atomicRels.length} atomic exchange relationships`);
      } catch (error) {
        console.error('[GraphConnectionEngine] Error in Pass 4 (atomic patterns):', error);
      }

      // Pass 5: Multi-stage protocol patterns
      try {
        const protocolRels = this.identifyMultiStageProtocols(boxes, transactions);
        relationships.push(...protocolRels);
        console.log(`[GraphConnectionEngine] Pass 5: Created ${protocolRels.length} multi-stage protocol relationships`);
      } catch (error) {
        console.error('[GraphConnectionEngine] Error in Pass 5 (multi-stage protocols):', error);
      }

      // Pass 6: Fee and change relationships
      try {
        const feeRels = this.identifyFeeAndChangeRelationships(boxes, transactions);
        relationships.push(...feeRels);
        console.log(`[GraphConnectionEngine] Pass 6: Created ${feeRels.length} fee and change relationships`);
      } catch (error) {
        console.error('[GraphConnectionEngine] Error in Pass 6 (fee and change):', error);
      }

      // Pass 7: Temporal sequence relationships
      try {
        const temporalRels = this.identifyTemporalSequences(boxes);
        relationships.push(...temporalRels);
        console.log(`[GraphConnectionEngine] Pass 7: Created ${temporalRels.length} temporal sequence relationships`);
      } catch (error) {
        console.error('[GraphConnectionEngine] Error in Pass 7 (temporal sequences):', error);
      }

      // Calculate final relationship strengths with full context
      try {
        this.recalculateRelationshipStrengths(relationships);
        console.log(`[GraphConnectionEngine] Recalculated strengths for ${relationships.length} relationships`);
      } catch (error) {
        console.error('[GraphConnectionEngine] Error recalculating relationship strengths:', error);
      }

      // Remove duplicate relationships and optimize
      try {
        const optimizedRels = this.optimizeRelationships(relationships);
        console.log(`[GraphConnectionEngine] Optimized relationships: ${relationships.length} → ${optimizedRels.length}`);
        return optimizedRels;
      } catch (error) {
        console.error('[GraphConnectionEngine] Error optimizing relationships:', error);
        return relationships; // Return unoptimized if optimization fails
      }
      
    } catch (error) {
      console.error('[GraphConnectionEngine] Critical error in buildGraph:', error);
      return []; // Return empty array on critical failure
    }
  }

  /**
   * Detect R4 register linkages - core Ergo pattern for parent-child relationships
   */
  private detectRegisterLinkages(boxes: EnhancedUTXOBox[]): BoxRelationship[] {
    const relationships: BoxRelationship[] = [];

    for (const box of boxes) {
      const r4Data = box.registers.R4;
      
      if (r4Data && this.isBoxLinkageData(r4Data)) {
        const parentBoxId = r4Data.boxId;
        const parentBox = this.context.allBoxes.get(parentBoxId);

        if (parentBox) {
          const relationship: BoxRelationship = {
            id: this.generateRelationshipId(),
            type: 'parent_child',
            fromBoxId: parentBoxId,
            toBoxId: box.id,
            strength: 'strong', // R4 linkage is always strong
            metadata: {
              description: `R4 linkage: ${r4Data.type}`,
              registerUsed: 'R4',
              conditionalLogic: r4Data.context,
            },
            displayHints: {
              color: '#2563eb', // Blue for parent-child
              style: 'solid',
              thickness: 3,
            }
          };

          relationships.push(relationship);

          // Special handling for DEX order linkages
          if (r4Data.type === 'order_book_link' && isDEXBox(box) && isDEXBox(parentBox)) {
            this.enhanceDEXLinkage(relationship, parentBox, box);
          }

          // Special handling for atomic swap linkages
          if (r4Data.type === 'atomic_swap_link' && isAtomicExchangeBox(box) && isAtomicExchangeBox(parentBox)) {
            this.enhanceAtomicSwapLinkage(relationship, parentBox, box);
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Create transaction flow relationships (input → transaction → output)
   */
  private createTransactionFlows(transactions: EnhancedUTXOTransaction[]): BoxRelationship[] {
    const relationships: BoxRelationship[] = [];

    for (const tx of transactions) {
      // Create input → output relationships through transaction
      for (const inputBoxId of tx.inputs) {
        for (const outputBoxId of tx.outputs) {
          const inputBox = this.context.allBoxes.get(inputBoxId);
          const outputBox = this.context.allBoxes.get(outputBoxId);

          if (inputBox && outputBox) {
            const relationshipType = this.determineTransactionFlowType(inputBox, outputBox, tx);
            
            const relationship: BoxRelationship = {
              id: this.generateRelationshipId(),
              type: relationshipType,
              fromBoxId: inputBoxId,
              toBoxId: outputBoxId,
              viaTxId: tx.id,
              strength: this.calculateTransactionFlowStrength(inputBox, outputBox, tx),
              metadata: {
                description: `${tx.type} flow`,
                conditionalLogic: tx.description,
              },
              displayHints: this.getTransactionFlowDisplayHints(relationshipType, tx),
            };

            relationships.push(relationship);
          }
        }
      }

      // Create relationships between outputs in the same transaction
      if (tx.outputs.length > 1) {
        relationships.push(...this.createSameTransactionRelationships(tx));
      }
    }

    return relationships;
  }

  /**
   * Identify DEX-specific patterns and relationships
   */
  private identifyDEXPatterns(boxes: EnhancedUTXOBox[], existingRelationships: BoxRelationship[]): BoxRelationship[] {
    const relationships: BoxRelationship[] = [];
    const dexBoxes = boxes.filter(isDEXBox);

    // Pattern 1: Order placement → partial settlement → new order
    const partialFillPatterns = this.detectPartialFillPatterns(dexBoxes);
    for (const pattern of partialFillPatterns) {
      relationships.push(...pattern.relationships.map(rel => ({
        ...rel,
        id: this.generateRelationshipId(),
      })));
    }

    // Pattern 2: Order cancellation → refund flows
    const refundPatterns = this.detectDEXRefundPatterns(dexBoxes);
    for (const pattern of refundPatterns) {
      relationships.push(...pattern.relationships.map(rel => ({
        ...rel,
        id: this.generateRelationshipId(),
      })));
    }

    // Pattern 3: Fee collection relationships
    const feePatterns = this.detectDEXFeePatterns(dexBoxes);
    for (const pattern of feePatterns) {
      relationships.push(...pattern.relationships.map(rel => ({
        ...rel,
        id: this.generateRelationshipId(),
      })));
    }

    // Pattern 4: Order book depth relationships
    const depthPatterns = this.detectOrderBookDepthPatterns(dexBoxes);
    for (const pattern of depthPatterns) {
      relationships.push(...pattern.relationships.map(rel => ({
        ...rel,
        id: this.generateRelationshipId(),
      })));
    }

    return relationships;
  }

  /**
   * Identify atomic exchange patterns
   */
  private identifyAtomicExchangePatterns(boxes: EnhancedUTXOBox[], existingRelationships: BoxRelationship[]): BoxRelationship[] {
    const relationships: BoxRelationship[] = [];
    const atomicBoxes = boxes.filter(isAtomicExchangeBox);

    // Pattern 1: Bid → Ask → Settlement flow
    const settlementPatterns = this.detectAtomicSettlementPatterns(atomicBoxes);
    for (const pattern of settlementPatterns) {
      relationships.push(...pattern.relationships.map(rel => ({
        ...rel,
        id: this.generateRelationshipId(),
      })));
    }

    // Pattern 2: Timeout → Refund flows
    const timeoutPatterns = this.detectAtomicTimeoutPatterns(atomicBoxes);
    for (const pattern of timeoutPatterns) {
      relationships.push(...pattern.relationships.map(rel => ({
        ...rel,
        id: this.generateRelationshipId(),
      })));
    }

    // Pattern 3: Cross-party coordination
    const coordinationPatterns = this.detectAtomicCoordinationPatterns(atomicBoxes);
    for (const pattern of coordinationPatterns) {
      relationships.push(...pattern.relationships.map(rel => ({
        ...rel,
        id: this.generateRelationshipId(),
      })));
    }

    return relationships;
  }

  /**
   * Identify multi-stage protocol patterns
   */
  private identifyMultiStageProtocols(boxes: EnhancedUTXOBox[], transactions: EnhancedUTXOTransaction[]): BoxRelationship[] {
    const relationships: BoxRelationship[] = [];

    // Group transactions by protocol stage
    const protocolGroups = this.groupTransactionsByProtocol(transactions);

    for (const [protocolType, txGroup] of protocolGroups) {
      const stageRelationships = this.analyzeProtocolStages(txGroup, boxes);
      relationships.push(...stageRelationships);
    }

    return relationships;
  }

  /**
   * Identify fee and change relationships
   */
  private identifyFeeAndChangeRelationships(boxes: EnhancedUTXOBox[], transactions: EnhancedUTXOTransaction[]): BoxRelationship[] {
    const relationships: BoxRelationship[] = [];

    for (const tx of transactions) {
      // Identify change outputs
      const changeBoxes = this.identifyChangeBoxes(tx, boxes);
      for (const changeBox of changeBoxes) {
        const sourceBox = this.identifyChangeSource(changeBox, tx, boxes);
        if (sourceBox) {
          relationships.push({
            id: this.generateRelationshipId(),
            type: 'change_return',
            fromBoxId: sourceBox.id,
            toBoxId: changeBox.id,
            viaTxId: tx.id,
            strength: 'weak',
            metadata: {
              description: 'Change return',
            },
            displayHints: {
              color: '#6b7280', // Gray for change
              style: 'dashed',
              thickness: 1,
            }
          });
        }
      }

      // Identify fee collection
      const feeRelationships = this.identifyFeeCollectionRelationships(tx, boxes);
      relationships.push(...feeRelationships);
    }

    return relationships;
  }

  /**
   * Identify temporal sequence relationships
   */
  private identifyTemporalSequences(boxes: EnhancedUTXOBox[]): BoxRelationship[] {
    const relationships: BoxRelationship[] = [];

    // Group boxes by party and sort by creation height
    for (const [party, partyBoxes] of this.context.partyBoxMap) {
      const sortedBoxes = partyBoxes
        .map(boxId => this.context.allBoxes.get(boxId)!)
        .filter(box => box !== undefined)
        .sort((a, b) => a.creationHeight - b.creationHeight);

      // Create temporal sequence relationships
      for (let i = 0; i < sortedBoxes.length - 1; i++) {
        const currentBox = sortedBoxes[i];
        const nextBox = sortedBoxes[i + 1];

        // Only create temporal relationships if there's a meaningful gap
        if (nextBox.creationHeight - currentBox.creationHeight > 1) {
          relationships.push({
            id: this.generateRelationshipId(),
            type: 'temporal_sequence',
            fromBoxId: currentBox.id,
            toBoxId: nextBox.id,
            strength: 'weak',
            metadata: {
              description: `Temporal sequence for ${party}`,
              temporalConstraint: nextBox.creationHeight,
            },
            displayHints: {
              color: '#f59e0b', // Amber for temporal
              style: 'dotted',
              thickness: 1,
            }
          });
        }
      }
    }

    return relationships;
  }

  // ============================================================================
  // PATTERN DETECTION METHODS
  // ============================================================================

  /**
   * Detect DEX partial fill patterns
   */
  private detectPartialFillPatterns(dexBoxes: EnhancedUTXOBox[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    for (const box of dexBoxes) {
      if (box.state === 'partial_match' && box.dexOrder) {
        const originalOrder = this.findOriginalDEXOrder(box);
        const newOrders = this.findResultingDEXOrders(box);

        if (originalOrder && newOrders.length > 0) {
          const relationships: Omit<BoxRelationship, 'id'>[] = [
            {
              type: 'partial_consumption',
              fromBoxId: originalOrder.id,
              toBoxId: box.id,
              strength: 'strong',
              metadata: {
                description: 'Partial order fill',
              },
              displayHints: {
                color: '#10b981', // Green for successful trades
                style: 'solid',
                thickness: 2,
              }
            },
            ...newOrders.map(newOrder => ({
              type: 'state_transition' as BoxRelationshipType,
              fromBoxId: box.id,
              toBoxId: newOrder.id,
              strength: 'strong' as const,
              metadata: {
                description: 'Remaining order',
              },
              displayHints: {
                color: '#3b82f6', // Blue for continuing orders
                style: 'solid',
                thickness: 2,
              }
            }))
          ];

          patterns.push({
            pattern: 'partial_settlement',
            confidence: 0.9,
            boxes: [originalOrder.id, box.id, ...newOrders.map(o => o.id)],
            relationships,
            metadata: {
              originalAmount: originalOrder.dexOrder?.originalAmount,
              filledAmount: box.dexOrder.originalAmount,
              fillPercentage: box.dexOrder.filled,
            }
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect DEX refund patterns
   */
  private detectDEXRefundPatterns(dexBoxes: EnhancedUTXOBox[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    for (const box of dexBoxes) {
      if (box.state === 'cancelled') {
        const refundBoxes = this.findRefundBoxes(box);
        
        if (refundBoxes.length > 0) {
          const relationships: Omit<BoxRelationship, 'id'>[] = refundBoxes.map(refundBox => ({
            type: 'refund_path',
            fromBoxId: box.id,
            toBoxId: refundBox.id,
            strength: 'medium',
            metadata: {
              description: 'Order cancellation refund',
            },
            displayHints: {
              color: '#ef4444', // Red for refunds
              style: 'dashed',
              thickness: 2,
            }
          }));

          patterns.push({
            pattern: 'refund_flow',
            confidence: 0.85,
            boxes: [box.id, ...refundBoxes.map(r => r.id)],
            relationships,
            metadata: {
              refundReason: 'order_cancellation',
              originalOrderType: box.dexOrder?.orderType,
            }
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect DEX fee collection patterns
   */
  private detectDEXFeePatterns(dexBoxes: EnhancedUTXOBox[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    const feeBoxes = dexBoxes.filter(box => box.boxType === 'dex_fee');
    
    for (const feeBox of feeBoxes) {
      const sourceOrders = this.findFeeSourceOrders(feeBox);
      
      if (sourceOrders.length > 0) {
        const relationships: Omit<BoxRelationship, 'id'>[] = sourceOrders.map(sourceOrder => ({
          type: 'fee_payment',
          fromBoxId: sourceOrder.id,
          toBoxId: feeBox.id,
          strength: 'weak',
          metadata: {
            description: 'DEX fee collection',
          },
          displayHints: {
            color: '#f59e0b', // Amber for fees
            style: 'dotted',
            thickness: 1,
          }
        }));

        patterns.push({
          pattern: 'fee_collection',
          confidence: 0.8,
          boxes: [feeBox.id, ...sourceOrders.map(s => s.id)],
          relationships,
          metadata: {
            feeType: 'dex_trading_fee',
            feeAmount: feeBox.value,
          }
        });
      }
    }

    return patterns;
  }

  /**
   * Detect order book depth patterns
   */
  private detectOrderBookDepthPatterns(dexBoxes: EnhancedUTXOBox[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Group orders by trading pair
    const ordersByPair = this.groupOrdersByTradingPair(dexBoxes);

    for (const [pairKey, orders] of ordersByPair) {
      if (orders.length > 2) {
        // Create relationships between orders at similar price levels
        const relationships = this.createPriceLevelRelationships(orders);
        
        if (relationships.length > 0) {
          patterns.push({
            pattern: 'dex_order_flow',
            confidence: 0.7,
            boxes: orders.map(o => o.id),
            relationships,
            metadata: {
              tradingPair: pairKey,
              orderCount: orders.length,
              priceSpread: this.calculatePriceSpread(orders),
            }
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect atomic settlement patterns
   */
  private detectAtomicSettlementPatterns(atomicBoxes: EnhancedUTXOBox[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    for (const box of atomicBoxes) {
      if (box.atomicExchange?.exchangeType === 'settlement') {
        const bidBox = this.findAtomicBid(box);
        const askBox = this.findAtomicAsk(box);

        if (bidBox && askBox) {
          const relationships: Omit<BoxRelationship, 'id'>[] = [
            {
              type: 'atomic_pair',
              fromBoxId: bidBox.id,
              toBoxId: box.id,
              strength: 'strong',
              metadata: {
                description: 'Atomic exchange completion (bid)',
              },
              displayHints: {
                color: '#8b5cf6', // Purple for atomic exchanges
                style: 'solid',
                thickness: 3,
              }
            },
            {
              type: 'atomic_pair',
              fromBoxId: askBox.id,
              toBoxId: box.id,
              strength: 'strong',
              metadata: {
                description: 'Atomic exchange completion (ask)',
              },
              displayHints: {
                color: '#8b5cf6',
                style: 'solid',
                thickness: 3,
              }
            }
          ];

          patterns.push({
            pattern: 'atomic_exchange',
            confidence: 0.95,
            boxes: [bidBox.id, askBox.id, box.id],
            relationships,
            metadata: {
              exchangeType: 'settlement',
              participants: box.atomicExchange.participants,
              assets: box.atomicExchange.assets,
            }
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect atomic timeout patterns
   */
  private detectAtomicTimeoutPatterns(atomicBoxes: EnhancedUTXOBox[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    for (const box of atomicBoxes) {
      if (box.state === 'expired' && box.atomicExchange) {
        const refundBoxes = this.findAtomicRefundBoxes(box);
        
        if (refundBoxes.length > 0) {
          const relationships: Omit<BoxRelationship, 'id'>[] = refundBoxes.map(refundBox => ({
            type: 'refund_path',
            fromBoxId: box.id,
            toBoxId: refundBox.id,
            strength: 'medium',
            metadata: {
              description: 'Atomic exchange timeout refund',
            },
            displayHints: {
              color: '#ef4444', // Red for timeouts
              style: 'dashed',
              thickness: 2,
            }
          }));

          patterns.push({
            pattern: 'refund_flow',
            confidence: 0.9,
            boxes: [box.id, ...refundBoxes.map(r => r.id)],
            relationships,
            metadata: {
              refundReason: 'timeout',
              deadline: box.atomicExchange.deadline,
            }
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect atomic coordination patterns
   */
  private detectAtomicCoordinationPatterns(atomicBoxes: EnhancedUTXOBox[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Group atomic boxes by participants
    const boxesByParticipants = this.groupAtomicBoxesByParticipants(atomicBoxes);

    for (const [participantKey, boxes] of boxesByParticipants) {
      if (boxes.length > 1) {
        const relationships = this.createAtomicCoordinationRelationships(boxes);
        
        if (relationships.length > 0) {
          patterns.push({
            pattern: 'atomic_exchange',
            confidence: 0.8,
            boxes: boxes.map(b => b.id),
            relationships,
            metadata: {
              coordinationType: 'multi_party',
              participants: participantKey.split(','),
            }
          });
        }
      }
    }

    return patterns;
  }

  // ============================================================================
  // RELATIONSHIP STRENGTH CALCULATION
  // ============================================================================

  /**
   * Calculate relationship strength based on context and pattern analysis
   */
  private calculateRelationshipStrength(
    relationship: BoxRelationship,
    context: GraphContext
  ): 'weak' | 'medium' | 'strong' {
    const fromBox = context.allBoxes.get(relationship.fromBoxId);
    const toBox = context.allBoxes.get(relationship.toBoxId);

    if (!fromBox || !toBox) return 'weak';

    let strengthScore = 0;

    // Base strength by relationship type
    switch (relationship.type) {
      case 'parent_child':
        strengthScore += 90; // R4 linkage is very strong
        break;
      case 'input_output':
        strengthScore += 70;
        break;
      case 'state_transition':
        strengthScore += 80;
        break;
      case 'partial_consumption':
        strengthScore += 85;
        break;
      case 'atomic_pair':
        strengthScore += 85;
        break;
      case 'fee_payment':
        strengthScore += 30;
        break;
      case 'change_return':
        strengthScore += 20;
        break;
      case 'temporal_sequence':
        strengthScore += 15;
        break;
      default:
        strengthScore += 50;
    }

    // Modifiers based on box types
    if (isDEXBox(fromBox) && isDEXBox(toBox)) {
      strengthScore += 15; // DEX flows are important
    }

    if (isAtomicExchangeBox(fromBox) && isAtomicExchangeBox(toBox)) {
      strengthScore += 15; // Atomic flows are important
    }

    if (isContractBox(fromBox) || isContractBox(toBox)) {
      strengthScore += 10; // Contract interactions are more important
    }

    // Modifiers based on value flow
    if (this.hasSignificantValueFlow(fromBox, toBox)) {
      strengthScore += 15;
    }

    // Modifiers based on token flow
    if (this.hasTokenFlow(fromBox, toBox)) {
      strengthScore += 20;
    }

    // Modifiers based on party relationships
    if (fromBox.owner && toBox.owner && fromBox.owner === toBox.owner) {
      strengthScore += 10; // Same party relationships
    }

    // Modifiers based on register usage
    if (relationship.metadata?.registerUsed === 'R4') {
      strengthScore += 20; // R4 linkage bonus
    }

    // Convert score to strength category
    if (strengthScore >= 80) return 'strong';
    if (strengthScore >= 50) return 'medium';
    return 'weak';
  }

  /**
   * Recalculate relationship strengths with full graph context
   */
  private recalculateRelationshipStrengths(relationships: BoxRelationship[]): void {
    for (const relationship of relationships) {
      relationship.strength = this.calculateRelationshipStrength(relationship, this.context);
    }
  }

  // ============================================================================
  // UTILITY AND HELPER METHODS
  // ============================================================================

  /**
   * Initialize analysis context from boxes and transactions
   */
  private initializeContext(boxes: EnhancedUTXOBox[], transactions: EnhancedUTXOTransaction[]): void {
    // Clear existing context
    this.context.allBoxes.clear();
    this.context.allTransactions.clear();
    this.context.txInputOutputMap.clear();
    this.context.boxCreationMap.clear();
    this.context.partyBoxMap.clear();
    this.context.tokenFlows.clear();

    // Populate box mappings
    for (const box of boxes) {
      this.context.allBoxes.set(box.id, box);
      this.context.boxCreationMap.set(box.id, box.creationTxId);

      // Group by party
      if (box.owner) {
        if (!this.context.partyBoxMap.has(box.owner)) {
          this.context.partyBoxMap.set(box.owner, []);
        }
        this.context.partyBoxMap.get(box.owner)!.push(box.id);
      }
    }

    // Populate transaction mappings
    for (const tx of transactions) {
      this.context.allTransactions.set(tx.id, tx);
      this.context.txInputOutputMap.set(tx.id, {
        inputs: tx.inputs,
        outputs: tx.outputs,
      });
    }

    // Analyze token flows
    this.analyzeTokenFlows(boxes, transactions);
  }

  /**
   * Analyze token flows for conservation and pattern detection
   */
  private analyzeTokenFlows(boxes: EnhancedUTXOBox[], transactions: EnhancedUTXOTransaction[]): void {
    const tokenFlowMap = new Map<string, TokenFlowAnalysis>();

    for (const tx of transactions) {
      const inputBoxes = tx.inputs.map(id => this.context.allBoxes.get(id)).filter(Boolean) as EnhancedUTXOBox[];
      const outputBoxes = tx.outputs.map(id => this.context.allBoxes.get(id)).filter(Boolean) as EnhancedUTXOBox[];

      // Analyze each token
      const allTokenIds = new Set<string>();
      
      for (const box of [...inputBoxes, ...outputBoxes]) {
        for (const token of box.tokens) {
          allTokenIds.add(token.id);
        }
      }

      for (const tokenId of allTokenIds) {
        if (!tokenFlowMap.has(tokenId)) {
          tokenFlowMap.set(tokenId, {
            tokenId,
            inputBoxes: [],
            outputBoxes: [],
            flowType: 'conservation',
            conservationRatio: 1,
          });
        }

        const flow = tokenFlowMap.get(tokenId)!;
        
        // Calculate input and output amounts
        let inputAmount = 0;
        let outputAmount = 0;

        for (const box of inputBoxes) {
          const token = box.tokens.find(t => t.id === tokenId);
          if (token) {
            inputAmount += Number(token.amount);
            flow.inputBoxes.push(box.id);
          }
        }

        for (const box of outputBoxes) {
          const token = box.tokens.find(t => t.id === tokenId);
          if (token) {
            outputAmount += Number(token.amount);
            flow.outputBoxes.push(box.id);
          }
        }

        // Determine flow type and conservation ratio
        if (inputAmount === 0 && outputAmount > 0) {
          flow.flowType = 'creation';
        } else if (inputAmount > 0 && outputAmount === 0) {
          flow.flowType = 'burn';
        } else if (inputAmount > outputAmount) {
          flow.flowType = 'fee_extraction';
        }

        flow.conservationRatio = inputAmount > 0 ? outputAmount / inputAmount : 1;
      }
    }

    this.context.tokenFlows = tokenFlowMap;
  }

  /**
   * Determine transaction flow relationship type
   */
  private determineTransactionFlowType(
    inputBox: EnhancedUTXOBox,
    outputBox: EnhancedUTXOBox,
    tx: EnhancedUTXOTransaction
  ): BoxRelationshipType {
    // Special DEX flow types
    if (isDEXBox(inputBox) && isDEXBox(outputBox)) {
      if (inputBox.dexOrder && outputBox.dexOrder) {
        if (outputBox.dexOrder.filled > inputBox.dexOrder.filled) {
          return 'partial_consumption';
        }
      }
      return 'state_transition';
    }

    // Special atomic exchange flow types
    if (isAtomicExchangeBox(inputBox) && isAtomicExchangeBox(outputBox)) {
      return 'atomic_pair';
    }

    // Fee collection
    if (outputBox.boxType === 'fee_collection' || outputBox.boxType === 'dex_fee') {
      return 'fee_payment';
    }

    // Change return
    if (outputBox.boxType === 'change') {
      return 'change_return';
    }

    // Contract state transition
    if (isContractBox(inputBox) && isContractBox(outputBox)) {
      return 'state_transition';
    }

    // Default input-output flow
    return 'input_output';
  }

  /**
   * Calculate transaction flow strength
   */
  private calculateTransactionFlowStrength(
    inputBox: EnhancedUTXOBox,
    outputBox: EnhancedUTXOBox,
    tx: EnhancedUTXOTransaction
  ): 'weak' | 'medium' | 'strong' {
    let score = 50; // Base score

    // Same party bonus
    if (inputBox.owner === outputBox.owner) {
      score += 15;
    }

    // Value flow bonus
    if (this.hasSignificantValueFlow(inputBox, outputBox)) {
      score += 20;
    }

    // Token flow bonus
    if (this.hasTokenFlow(inputBox, outputBox)) {
      score += 25;
    }

    // Contract interaction bonus
    if (isContractBox(inputBox) || isContractBox(outputBox)) {
      score += 15;
    }

    // DEX/Atomic bonus
    if (isDEXBox(inputBox) || isDEXBox(outputBox) || isAtomicExchangeBox(inputBox) || isAtomicExchangeBox(outputBox)) {
      score += 10;
    }

    if (score >= 80) return 'strong';
    if (score >= 55) return 'medium';
    return 'weak';
  }

  /**
   * Get display hints for transaction flow
   */
  private getTransactionFlowDisplayHints(
    relationshipType: BoxRelationshipType,
    tx: EnhancedUTXOTransaction
  ): BoxRelationship['displayHints'] {
    const baseHints = {
      style: 'solid' as const,
      thickness: 2,
    };

    switch (relationshipType) {
      case 'input_output':
        return { ...baseHints, color: '#374151' }; // Gray
      case 'state_transition':
        return { ...baseHints, color: '#3b82f6' }; // Blue
      case 'partial_consumption':
        return { ...baseHints, color: '#10b981' }; // Green
      case 'atomic_pair':
        return { ...baseHints, color: '#8b5cf6' }; // Purple
      case 'fee_payment':
        return { ...baseHints, color: '#f59e0b', style: 'dotted', thickness: 1 }; // Amber
      case 'change_return':
        return { ...baseHints, color: '#6b7280', style: 'dashed', thickness: 1 }; // Gray
      default:
        return { ...baseHints, color: '#374151' };
    }
  }

  /**
   * Create relationships between outputs in the same transaction
   */
  private createSameTransactionRelationships(tx: EnhancedUTXOTransaction): BoxRelationship[] {
    const relationships: BoxRelationship[] = [];

    // Only create relationships for meaningful multi-output transactions
    if (tx.outputs.length <= 1 || tx.outputs.length > 5) return relationships;

    for (let i = 0; i < tx.outputs.length; i++) {
      for (let j = i + 1; j < tx.outputs.length; j++) {
        const outputA = this.context.allBoxes.get(tx.outputs[i]);
        const outputB = this.context.allBoxes.get(tx.outputs[j]);

        if (outputA && outputB) {
          // Only create relationships between related outputs
          if (this.areOutputsRelated(outputA, outputB, tx)) {
            relationships.push({
              id: this.generateRelationshipId(),
              type: 'state_transition',
              fromBoxId: outputA.id,
              toBoxId: outputB.id,
              viaTxId: tx.id,
              strength: 'weak',
              metadata: {
                description: 'Same transaction outputs',
              },
              displayHints: {
                color: '#d1d5db', // Light gray for weak relationships
                style: 'dotted',
                thickness: 1,
              }
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Check if two outputs are related within the same transaction
   */
  private areOutputsRelated(
    outputA: EnhancedUTXOBox,
    outputB: EnhancedUTXOBox,
    tx: EnhancedUTXOTransaction
  ): boolean {
    // Same owner
    if (outputA.owner && outputB.owner && outputA.owner === outputB.owner) {
      return true;
    }

    // Both are DEX boxes
    if (isDEXBox(outputA) && isDEXBox(outputB)) {
      return true;
    }

    // Both are atomic exchange boxes
    if (isAtomicExchangeBox(outputA) && isAtomicExchangeBox(outputB)) {
      return true;
    }

    // One is change, related to non-change
    if ((outputA.boxType === 'change') !== (outputB.boxType === 'change')) {
      return true;
    }

    return false;
  }

  /**
   * Group transactions by protocol for multi-stage analysis
   */
  private groupTransactionsByProtocol(transactions: EnhancedUTXOTransaction[]): Map<string, EnhancedUTXOTransaction[]> {
    const groups = new Map<string, EnhancedUTXOTransaction[]>();

    for (const tx of transactions) {
      if (tx.protocolStage) {
        const key = tx.protocolStage.protocol;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(tx);
      }
    }

    return groups;
  }

  /**
   * Analyze protocol stages for relationships
   */
  private analyzeProtocolStages(txGroup: EnhancedUTXOTransaction[], boxes: EnhancedUTXOBox[]): BoxRelationship[] {
    const relationships: BoxRelationship[] = [];

    // Sort by stage
    const sortedTxs = txGroup.sort((a, b) => 
      (a.protocolStage?.currentStage || 0) - (b.protocolStage?.currentStage || 0)
    );

    // Create stage progression relationships
    for (let i = 0; i < sortedTxs.length - 1; i++) {
      const currentTx = sortedTxs[i];
      const nextTx = sortedTxs[i + 1];

      // Link outputs of current stage to inputs of next stage
      for (const outputId of currentTx.outputs) {
        if (nextTx.inputs.includes(outputId)) {
          const outputBox = this.context.allBoxes.get(outputId);
          if (outputBox) {
            for (const nextOutputId of nextTx.outputs) {
              const nextOutputBox = this.context.allBoxes.get(nextOutputId);
              if (nextOutputBox) {
                relationships.push({
                  id: this.generateRelationshipId(),
                  type: 'state_transition',
                  fromBoxId: outputId,
                  toBoxId: nextOutputId,
                  viaTxId: nextTx.id,
                  strength: 'medium',
                  metadata: {
                    description: `Protocol stage ${currentTx.protocolStage?.currentStage} → ${nextTx.protocolStage?.currentStage}`,
                  },
                  displayHints: {
                    color: '#7c3aed', // Violet for protocol stages
                    style: 'solid',
                    thickness: 2,
                  }
                });
              }
            }
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Identify change boxes in a transaction
   */
  private identifyChangeBoxes(tx: EnhancedUTXOTransaction, boxes: EnhancedUTXOBox[]): EnhancedUTXOBox[] {
    return (tx.outputs
      .map(id => this.context.allBoxes.get(id))
      .filter(box => box && box.boxType === 'change')
    ) as EnhancedUTXOBox[];
  }

  /**
   * Identify change source box
   */
  private identifyChangeSource(
    changeBox: EnhancedUTXOBox,
    tx: EnhancedUTXOTransaction,
    boxes: EnhancedUTXOBox[]
  ): EnhancedUTXOBox | null {
    // Find input box with same owner
    for (const inputId of tx.inputs) {
      const inputBox = this.context.allBoxes.get(inputId);
      if (inputBox && inputBox.owner === changeBox.owner) {
        return inputBox;
      }
    }
    return null;
  }

  /**
   * Identify fee collection relationships
   */
  private identifyFeeCollectionRelationships(
    tx: EnhancedUTXOTransaction,
    boxes: EnhancedUTXOBox[]
  ): BoxRelationship[] {
    const relationships: BoxRelationship[] = [];

    const feeBoxes = (tx.outputs
      .map(id => this.context.allBoxes.get(id))
      .filter(box => box && (box.boxType === 'fee_collection' || box.boxType === 'dex_fee'))
    ) as EnhancedUTXOBox[];

    for (const feeBox of feeBoxes) {
      // Link fee boxes to input boxes
      for (const inputId of tx.inputs) {
        const inputBox = this.context.allBoxes.get(inputId);
        if (inputBox) {
          relationships.push({
            id: this.generateRelationshipId(),
            type: 'fee_payment',
            fromBoxId: inputId,
            toBoxId: feeBox.id,
            viaTxId: tx.id,
            strength: 'weak',
            metadata: {
              description: 'Fee collection',
            },
            displayHints: {
              color: '#f59e0b', // Amber for fees
              style: 'dotted',
              thickness: 1,
            }
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Generate unique relationship ID
   */
  private generateRelationshipId(): string {
    return `rel_${this.relationshipCounter++}_${Date.now()}`;
  }

  /**
   * Optimize relationships by removing duplicates and low-value connections
   */
  private optimizeRelationships(relationships: BoxRelationship[]): BoxRelationship[] {
    // Remove duplicates based on from/to box IDs and type
    const uniqueRelationships = new Map<string, BoxRelationship>();

    for (const rel of relationships) {
      const key = `${rel.fromBoxId}->${rel.toBoxId}:${rel.type}`;
      
      if (!uniqueRelationships.has(key) || 
          this.getStrengthValue(rel.strength) > this.getStrengthValue(uniqueRelationships.get(key)!.strength)) {
        uniqueRelationships.set(key, rel);
      }
    }

    // Filter out very weak relationships if there are too many
    const optimizedRelationships = Array.from(uniqueRelationships.values());
    
    if (optimizedRelationships.length > 1000) {
      return optimizedRelationships.filter(rel => rel.strength !== 'weak');
    }

    return optimizedRelationships;
  }

  /**
   * Get numeric value for relationship strength
   */
  private getStrengthValue(strength: 'weak' | 'medium' | 'strong'): number {
    switch (strength) {
      case 'weak': return 1;
      case 'medium': return 2;
      case 'strong': return 3;
    }
  }

  // ============================================================================
  // TYPE GUARDS AND VALIDATION
  // ============================================================================

  /**
   * Type guard for box linkage data
   */
  private isBoxLinkageData(data: any): data is BoxLinkageData {
    return data && 
           typeof data === 'object' && 
           'type' in data && 
           'boxId' in data &&
           typeof data.boxId === 'string';
  }

  /**
   * Check if there's significant value flow between boxes
   */
  private hasSignificantValueFlow(fromBox: EnhancedUTXOBox, toBox: EnhancedUTXOBox): boolean {
    const fromValue = Number(fromBox.value);
    const toValue = Number(toBox.value);
    
    // Consider significant if flow is > 0.01 ERG
    return Math.abs(fromValue - toValue) > 10000000; // 0.01 ERG in nanoERG
  }

  /**
   * Check if there's token flow between boxes
   */
  private hasTokenFlow(fromBox: EnhancedUTXOBox, toBox: EnhancedUTXOBox): boolean {
    const fromTokenIds = new Set(fromBox.tokens.map(t => t.id));
    const toTokenIds = new Set(toBox.tokens.map(t => t.id));
    
    // Check for common tokens
    for (const tokenId of fromTokenIds) {
      if (toTokenIds.has(tokenId)) {
        return true;
      }
    }
    
    return false;
  }

  // ============================================================================
  // HELPER METHODS FOR PATTERN DETECTION
  // ============================================================================

  private findOriginalDEXOrder(partialBox: EnhancedUTXOBox): EnhancedUTXOBox | null {
    // Look for parent box via R4 linkage
    const r4Data = partialBox.registers.R4;
    if (r4Data && this.isBoxLinkageData(r4Data) && r4Data.type === 'order_book_link') {
      return this.context.allBoxes.get(r4Data.boxId) || null;
    }
    return null;
  }

  private findResultingDEXOrders(settlementBox: EnhancedUTXOBox): EnhancedUTXOBox[] {
    // Find boxes that reference this settlement box in their R4
    const resultingOrders: EnhancedUTXOBox[] = [];
    
    for (const box of this.context.allBoxes.values()) {
      const r4Data = box.registers.R4;
      if (r4Data && this.isBoxLinkageData(r4Data) && r4Data.boxId === settlementBox.id) {
        resultingOrders.push(box);
      }
    }
    
    return resultingOrders;
  }

  private findRefundBoxes(cancelledBox: EnhancedUTXOBox): EnhancedUTXOBox[] {
    // Find boxes that were created in the same transaction as the cancellation
    const creationTx = this.context.allTransactions.get(cancelledBox.creationTxId);
    if (!creationTx) return [];

    return (creationTx.outputs
      .map(id => this.context.allBoxes.get(id))
      .filter(box => box && 
                     box.id !== cancelledBox.id && 
                     box.owner === cancelledBox.owner &&
                     (box.boxType === 'refund' || box.boxType === 'wallet'))
    ) as EnhancedUTXOBox[];
  }

  private findFeeSourceOrders(feeBox: EnhancedUTXOBox): EnhancedUTXOBox[] {
    // Find the transaction that created this fee box
    const creationTx = this.context.allTransactions.get(feeBox.creationTxId);
    if (!creationTx) return [];

    // Look at input boxes that are DEX orders
    return (creationTx.inputs
      .map(id => this.context.allBoxes.get(id))
      .filter(box => box && isDEXBox(box))
    ) as EnhancedUTXOBox[];
  }

  private groupOrdersByTradingPair(dexBoxes: EnhancedUTXOBox[]): Map<string, EnhancedUTXOBox[]> {
    const pairs = new Map<string, EnhancedUTXOBox[]>();

    for (const box of dexBoxes) {
      if (box.dexOrder) {
        const pairKey = `${box.dexOrder.tokenPair[0]}-${box.dexOrder.tokenPair[1]}`;
        if (!pairs.has(pairKey)) {
          pairs.set(pairKey, []);
        }
        pairs.get(pairKey)!.push(box);
      }
    }

    return pairs;
  }

  private createPriceLevelRelationships(orders: EnhancedUTXOBox[]): Omit<BoxRelationship, 'id'>[] {
    const relationships: Omit<BoxRelationship, 'id'>[] = [];

    // Sort orders by price
    const sortedOrders = orders
      .filter(order => order.dexOrder)
      .sort((a, b) => a.dexOrder!.price - b.dexOrder!.price);

    // Create relationships between orders at similar price levels
    for (let i = 0; i < sortedOrders.length - 1; i++) {
      const currentOrder = sortedOrders[i];
      const nextOrder = sortedOrders[i + 1];

      const priceDiff = Math.abs(currentOrder.dexOrder!.price - nextOrder.dexOrder!.price);
      const avgPrice = (currentOrder.dexOrder!.price + nextOrder.dexOrder!.price) / 2;
      const priceSpread = priceDiff / avgPrice;

      // Only create relationships for orders with similar prices (< 5% spread)
      if (priceSpread < 0.05) {
        relationships.push({
          type: 'state_transition',
          fromBoxId: currentOrder.id,
          toBoxId: nextOrder.id,
          strength: 'weak',
          metadata: {
            description: 'Similar price level',
          },
          displayHints: {
            color: '#d1d5db',
            style: 'dotted',
            thickness: 1,
          }
        });
      }
    }

    return relationships;
  }

  private calculatePriceSpread(orders: EnhancedUTXOBox[]): number {
    const prices = orders
      .filter(order => order.dexOrder)
      .map(order => order.dexOrder!.price);

    if (prices.length < 2) return 0;

    return Math.max(...prices) - Math.min(...prices);
  }

  private findAtomicBid(settlementBox: EnhancedUTXOBox): EnhancedUTXOBox | null {
    if (!settlementBox.atomicExchange?.participants) return null;

    for (const box of this.context.allBoxes.values()) {
      if (box.atomicExchange?.exchangeType === 'bid' &&
          box.atomicExchange.participants &&
          this.arraysEqual(box.atomicExchange.participants, settlementBox.atomicExchange.participants)) {
        return box;
      }
    }
    return null;
  }

  private findAtomicAsk(settlementBox: EnhancedUTXOBox): EnhancedUTXOBox | null {
    if (!settlementBox.atomicExchange?.participants) return null;

    for (const box of this.context.allBoxes.values()) {
      if (box.atomicExchange?.exchangeType === 'ask' &&
          box.atomicExchange.participants &&
          this.arraysEqual(box.atomicExchange.participants, settlementBox.atomicExchange.participants)) {
        return box;
      }
    }
    return null;
  }

  private findAtomicRefundBoxes(expiredBox: EnhancedUTXOBox): EnhancedUTXOBox[] {
    // Similar to DEX refund logic but for atomic exchanges
    const creationTx = this.context.allTransactions.get(expiredBox.creationTxId);
    if (!creationTx) return [];

    return (creationTx.outputs
      .map(id => this.context.allBoxes.get(id))
      .filter(box => box && 
                     box.id !== expiredBox.id && 
                     box.boxType === 'refund')
    ) as EnhancedUTXOBox[];
  }

  private groupAtomicBoxesByParticipants(atomicBoxes: EnhancedUTXOBox[]): Map<string, EnhancedUTXOBox[]> {
    const groups = new Map<string, EnhancedUTXOBox[]>();

    for (const box of atomicBoxes) {
      if (box.atomicExchange?.participants) {
        const key = box.atomicExchange.participants.sort().join(',');
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(box);
      }
    }

    return groups;
  }

  private createAtomicCoordinationRelationships(boxes: EnhancedUTXOBox[]): Omit<BoxRelationship, 'id'>[] {
    const relationships: Omit<BoxRelationship, 'id'>[] = [];

    // Create relationships between all atomic boxes with same participants
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        relationships.push({
          type: 'multisig_coordination',
          fromBoxId: boxes[i].id,
          toBoxId: boxes[j].id,
          strength: 'medium',
          metadata: {
            description: 'Atomic exchange coordination',
          },
          displayHints: {
            color: '#8b5cf6',
            style: 'dashed',
            thickness: 2,
          }
        });
      }
    }

    return relationships;
  }

  private enhanceDEXLinkage(relationship: BoxRelationship, parentBox: EnhancedUTXOBox, childBox: EnhancedUTXOBox): void {
    if (parentBox.dexOrder && childBox.dexOrder) {
      relationship.metadata = {
        ...relationship.metadata,
        description: `DEX order flow: ${parentBox.dexOrder.orderType} → ${childBox.dexOrder.orderType}`,
        originalAmount: parentBox.dexOrder.originalAmount,
        remainingAmount: childBox.dexOrder.remainingAmount,
        fillPercentage: childBox.dexOrder.filled,
      };

      relationship.displayHints = {
        color: '#10b981', // Green for successful DEX operations
        style: 'solid',
        thickness: 3,
        animated: true,
      };
    }
  }

  private enhanceAtomicSwapLinkage(relationship: BoxRelationship, parentBox: EnhancedUTXOBox, childBox: EnhancedUTXOBox): void {
    if (parentBox.atomicExchange && childBox.atomicExchange) {
      relationship.metadata = {
        ...relationship.metadata,
        description: `Atomic swap: ${parentBox.atomicExchange.exchangeType} → ${childBox.atomicExchange.exchangeType}`,
        participants: childBox.atomicExchange.participants,
        deadline: childBox.atomicExchange.deadline,
      };

      relationship.displayHints = {
        color: '#8b5cf6', // Purple for atomic swaps
        style: 'solid',
        thickness: 3,
        animated: true,
      };
    }
  }

  private arraysEqual(a: any[], b: any[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  // ============================================================================
  // VALIDATION AND ERROR HANDLING
  // ============================================================================

  /**
   * Validate input parameters for graph building
   */
  private validateInputs(boxes: EnhancedUTXOBox[], transactions: EnhancedUTXOTransaction[]): boolean {
    if (!Array.isArray(boxes)) {
      console.error('[GraphConnectionEngine] Invalid boxes parameter: not an array');
      return false;
    }
    
    if (!Array.isArray(transactions)) {
      console.error('[GraphConnectionEngine] Invalid transactions parameter: not an array');
      return false;
    }
    
    // Validate box structure
    for (const [index, box] of boxes.entries()) {
      if (!this.validateBoxStructure(box, index)) {
        return false;
      }
    }
    
    // Validate transaction structure
    for (const [index, tx] of transactions.entries()) {
      if (!this.validateTransactionStructure(tx, index)) {
        return false;
      }
    }
    
    console.log(`[GraphConnectionEngine] Input validation passed: ${boxes.length} boxes, ${transactions.length} transactions`);
    return true;
  }

  /**
   * Validate box structure
   */
  private validateBoxStructure(box: EnhancedUTXOBox, index: number): boolean {
    if (!box || typeof box !== 'object') {
      console.error(`[GraphConnectionEngine] Invalid box at index ${index}: not an object`);
      return false;
    }
    
    if (!box.id || typeof box.id !== 'string') {
      console.error(`[GraphConnectionEngine] Invalid box at index ${index}: missing or invalid id`);
      return false;
    }
    
    if (typeof box.value !== 'number' && typeof box.value !== 'string') {
      console.warn(`[GraphConnectionEngine] Box ${box.id}: value is not a number or string`);
    }
    
    if (!Array.isArray(box.tokens)) {
      console.warn(`[GraphConnectionEngine] Box ${box.id}: tokens is not an array`);
      box.tokens = [];
    }
    
    if (!box.registers || typeof box.registers !== 'object') {
      console.warn(`[GraphConnectionEngine] Box ${box.id}: registers is not an object`);
      box.registers = {};
    }
    
    return true;
  }

  /**
   * Validate transaction structure
   */
  private validateTransactionStructure(tx: EnhancedUTXOTransaction, index: number): boolean {
    if (!tx || typeof tx !== 'object') {
      console.error(`[GraphConnectionEngine] Invalid transaction at index ${index}: not an object`);
      return false;
    }
    
    if (!tx.id || typeof tx.id !== 'string') {
      console.error(`[GraphConnectionEngine] Invalid transaction at index ${index}: missing or invalid id`);
      return false;
    }
    
    if (!Array.isArray(tx.inputs)) {
      console.warn(`[GraphConnectionEngine] Transaction ${tx.id}: inputs is not an array`);
      tx.inputs = [];
    }
    
    if (!Array.isArray(tx.outputs)) {
      console.warn(`[GraphConnectionEngine] Transaction ${tx.id}: outputs is not an array`);
      tx.outputs = [];
    }
    
    if (!Array.isArray(tx.dataInputs)) {
      console.warn(`[GraphConnectionEngine] Transaction ${tx.id}: dataInputs is not an array`);
      tx.dataInputs = [];
    }
    
    return true;
  }

  /**
   * Validate relationship before creating
   */
  private validateRelationship(relationship: Omit<BoxRelationship, 'id'>): boolean {
    if (!relationship.fromBoxId || typeof relationship.fromBoxId !== 'string') {
      console.warn('[GraphConnectionEngine] Invalid relationship: missing fromBoxId');
      return false;
    }
    
    if (!relationship.toBoxId || typeof relationship.toBoxId !== 'string') {
      console.warn('[GraphConnectionEngine] Invalid relationship: missing toBoxId');
      return false;
    }
    
    if (!relationship.type) {
      console.warn('[GraphConnectionEngine] Invalid relationship: missing type');
      return false;
    }
    
    if (!['weak', 'medium', 'strong'].includes(relationship.strength)) {
      console.warn(`[GraphConnectionEngine] Invalid relationship strength: ${relationship.strength}`);
      return false;
    }
    
    return true;
  }

  /**
   * Safe array push with validation
   */
  private safeAddRelationship(relationships: BoxRelationship[], relationship: Omit<BoxRelationship, 'id'>): void {
    try {
      if (this.validateRelationship(relationship)) {
        const fullRelationship: BoxRelationship = {
          id: this.generateRelationshipId(),
          ...relationship
        };
        relationships.push(fullRelationship);
      }
    } catch (error) {
      console.error('[GraphConnectionEngine] Error adding relationship:', error);
    }
  }

  /**
   * Get engine statistics for monitoring
   */
  public getEngineStats(): {
    contextSize: {
      boxes: number;
      transactions: number;
      partyBoxMap: number;
      tokenFlows: number;
    };
    relationshipCounter: number;
  } {
    return {
      contextSize: {
        boxes: this.context.allBoxes.size,
        transactions: this.context.allTransactions.size,
        partyBoxMap: this.context.partyBoxMap.size,
        tokenFlows: this.context.tokenFlows.size
      },
      relationshipCounter: this.relationshipCounter
    };
  }
}

// Export additional utility functions for external use

/**
 * Utility function to create a graph connection engine instance
 */
export const createGraphConnectionEngine = (): GraphConnectionEngine => {
  return new GraphConnectionEngine();
};

/**
 * Utility function for quick relationship building
 */
export const buildGraphRelationships = (
  boxes: EnhancedUTXOBox[],
  transactions: EnhancedUTXOTransaction[]
): BoxRelationship[] => {
  const engine = new GraphConnectionEngine();
  return engine.buildGraph(boxes, transactions);
};