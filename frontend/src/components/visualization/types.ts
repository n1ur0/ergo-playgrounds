/**
 * Enhanced TypeScript types for Ergo blockchain UTXO visualization
 * 
 * This type system models real-world Ergo blockchain patterns including:
 * - DEX order books with partial/full matching
 * - Atomic swaps with settlement patterns
 * - Smart contract state transitions
 * - Register-based box linking and validation
 * - Token conservation and flow tracking
 */

// ============================================================================
// CORE ERGO PRIMITIVES
// ============================================================================

/**
 * Ergo box (UTXO) identifier - 32-byte hex string
 */
export type BoxId = string;

/**
 * Ergo transaction identifier - 32-byte hex string
 */
export type TxId = string;

/**
 * Token identifier - 32-byte hex string
 */
export type TokenId = string;

/**
 * NanoERG value (Ergo's base unit: 1 ERG = 10^9 nanoERG)
 */
export type NanoErg = string | number;

/**
 * Token amount (as string for large numbers)
 */
export type TokenAmount = string | number;

/**
 * Blockchain height
 */
export type Height = number;

/**
 * Public key bytes as hex string
 */
export type PublicKey = string;

/**
 * ErgoTree bytes as hex string
 */
export type ErgoTree = string;

// ============================================================================
// TOKEN SYSTEM
// ============================================================================

/**
 * Represents a token within an Ergo box
 * Following Ergo's (tokenId, amount) tuple pattern
 */
export interface ErgoToken {
  /** Token identifier (32-byte hex) */
  id: TokenId;
  /** Amount of tokens */
  amount: TokenAmount;
  /** Token metadata (name, description, decimals) */
  metadata?: {
    name?: string;
    description?: string;
    decimals?: number;
    type?: 'NFT' | 'STANDARD' | 'WRAPPED';
  };
}

/**
 * Token flow tracking for conservation validation
 */
export interface TokenFlow {
  /** Token being tracked */
  tokenId: TokenId;
  /** Input amount from consumed boxes */
  inputAmount: TokenAmount;
  /** Output amount to created boxes */
  outputAmount: TokenAmount;
  /** Whether token conservation is maintained */
  isConserved: boolean;
  /** DEX fees or burns that explain discrepancies */
  fees?: TokenAmount;
}

// ============================================================================
// REGISTER SYSTEM
// ============================================================================

/**
 * Ergo box registers R4-R9 with semantic typing
 * Following observed patterns from DEX and atomic exchange contracts
 */
export interface ErgoRegisters {
  /** R4: Often contains parent box ID for state linking */
  R4?: BoxLinkageData;
  /** R5: Contract-specific state or configuration */
  R5?: ContractStateData;
  /** R6: Additional contract parameters */
  R6?: ContractParameterData;
  /** R7: Timestamp or height-based conditions */
  R7?: TemporalData;
  /** R8: Multi-party coordination data */
  R8?: PartyCoordinationData;
  /** R9: Extended metadata or complex state */
  R9?: ExtendedMetadata;
}

/**
 * Box linkage data stored in R4 register
 * Creates parent-child relationships between boxes
 */
export interface BoxLinkageData {
  /** Type of linkage relationship */
  type: 'parent_box_id' | 'order_book_link' | 'atomic_swap_link' | 'refund_link';
  /** Referenced box ID */
  boxId: BoxId;
  /** Additional context for the relationship */
  context?: string;
}

/**
 * Contract state data for complex smart contracts
 */
export interface ContractStateData {
  /** Current state of the contract */
  state: 'active' | 'partially_filled' | 'completed' | 'cancelled' | 'expired';
  /** State-specific parameters */
  parameters?: Record<string, any>;
}

/**
 * Contract parameters stored in registers
 */
export interface ContractParameterData {
  /** Parameter type */
  type: 'price_data' | 'deadline' | 'threshold' | 'configuration';
  /** Parameter value */
  value: any;
  /** Parameter encoding (Int, Long, Coll[Byte], etc.) */
  encoding?: string;
}

/**
 * Temporal data for time-based contracts
 */
export interface TemporalData {
  /** Type of temporal constraint */
  type: 'deadline' | 'start_height' | 'lock_time' | 'timeout';
  /** Height or timestamp value */
  value: Height | number;
}

/**
 * Multi-party coordination data
 */
export interface PartyCoordinationData {
  /** Coordination type */
  type: 'multisig' | 'atomic_swap' | 'dex_matching' | 'dispute_resolution';
  /** Participating parties */
  parties: PublicKey[];
  /** Coordination parameters */
  parameters?: Record<string, any>;
}

/**
 * Extended metadata for complex use cases
 */
export interface ExtendedMetadata {
  /** Metadata type */
  type: 'oracle_data' | 'governance' | 'identity' | 'custom';
  /** Metadata payload */
  data: any;
  /** Schema version for backward compatibility */
  version?: string;
}

// ============================================================================
// BOX LIFECYCLE AND STATES
// ============================================================================

/**
 * Comprehensive box lifecycle states reflecting real Ergo usage patterns
 */
export type BoxLifecycleState = 
  | 'unspent'              // Available for spending
  | 'pending_spend'        // In mempool, waiting for confirmation
  | 'spending'             // Being consumed in a transaction
  | 'spent'                // Consumed and confirmed
  | 'locked'               // Temporarily locked (e.g., in multi-stage protocol)
  | 'partial_match'        // DEX order partially matched
  | 'awaiting_settlement'  // Atomic swap awaiting counterparty
  | 'expired'              // Time-locked box that expired
  | 'cancelled';           // Order or contract cancelled

/**
 * Box interaction patterns for relationship modeling
 */
export type BoxInteractionType =
  | 'creation'             // Box was created
  | 'consumption'          // Box was consumed
  | 'state_transition'     // Contract state changed
  | 'partial_consumption'  // DEX partial order fill
  | 'fee_collection'       // Fee extracted
  | 'refund_trigger'       // Refund condition met
  | 'oracle_update'        // Oracle data updated
  | 'governance_action';   // Governance decision executed

// ============================================================================
// ENHANCED BOX TYPES
// ============================================================================

/**
 * Comprehensive box type system based on observed Ergo patterns
 */
export type ErgoBoxType =
  // Basic wallet boxes
  | 'wallet'               // Standard P2PK box
  | 'change'               // Change output from transaction
  
  // DEX-specific boxes
  | 'buy_order'            // DEX buy order box
  | 'sell_order'           // DEX sell order box
  | 'partial_buy_order'    // Partially matched buy order
  | 'partial_sell_order'   // Partially matched sell order
  | 'settlement'           // DEX trade settlement box
  | 'dex_fee'              // DEX fee collection box
  
  // Atomic exchange boxes
  | 'atomic_bid'           // Atomic exchange buyer bid
  | 'atomic_ask'           // Atomic exchange seller ask
  | 'atomic_settlement'    // Atomic exchange completion
  
  // Escrow boxes
  | 'escrow_deposit'       // Initial escrow deposit box
  | 'escrow_completion'    // Normal escrow completion box
  | 'escrow_dispute'       // Disputed escrow box
  | 'escrow_timeout'       // Timed-out escrow box
  | 'arbiter_fee'          // Arbiter fee collection box
  
  // System and protocol boxes
  | 'fee_collection'       // Network fee collection
  | 'miner_reward'         // Mining reward box
  | 'contract_state'       // Generic contract state box
  | 'oracle_pool'          // Oracle data box
  | 'governance'           // DAO governance box
  
  // Stealth address privacy boxes
  | 'stealth_meta_address' // Published meta-address box
  | 'stealth_payment'      // One-time stealth payment box
  | 'stealth_notification' // Payment notification box
  | 'stealth_claim'        // Stealth payment claim box
  
  // Utility boxes
  | 'refund'               // Refund box for cancelled orders
  | 'time_locked'          // Time-locked box
  | 'multi_sig'            // Multi-signature box
  | 'proxy'                // Proxy contract box
  | 'data_input'           // Read-only data input
  | 'unknown';             // Unclassified box type

/**
 * Smart contract spending condition types
 */
export type SpendingCondition =
  | 'public_key'           // Standard P2PK
  | 'owner_or_contract'    // ownerPk || contractLogic pattern
  | 'contract_only'        // Pure contract logic
  | 'time_locked'          // Height or time-based lock
  | 'multi_signature'      // Multiple signature requirement
  | 'threshold_signature'  // K-of-N signature scheme
  | 'oracle_condition'     // Oracle data dependency
  | 'cross_chain'          // Cross-chain bridge condition
  | 'complex_script';      // Complex ErgoScript logic

// ============================================================================
// ENHANCED UTXO BOX INTERFACE
// ============================================================================

/**
 * Enhanced UTXO box interface modeling comprehensive Ergo blockchain patterns
 */
export interface EnhancedUTXOBox {
  // Core identifiers
  /** Unique box identifier (32-byte hex) */
  id: BoxId;
  /** Transaction that created this box */
  creationTxId: TxId;
  /** Box index within the creating transaction */
  creationIndex: number;
  
  // Value and tokens
  /** NanoERG value in the box */
  value: NanoErg;
  /** Tokens stored in the box */
  tokens: ErgoToken[];
  
  // Contract and script data
  /** ErgoTree (contract) protecting this box */
  ergoTree: ErgoTree;
  /** ErgoTree hash for efficient comparison */
  ergoTreeHash: string;
  /** Human-readable script (if available) */
  script?: string;
  /** Type of spending condition */
  spendingCondition: SpendingCondition;
  
  // Register data with semantic typing
  /** Box registers R4-R9 with semantic interpretation */
  registers: ErgoRegisters;
  
  // Lifecycle and state
  /** Current lifecycle state */
  state: BoxLifecycleState;
  /** Box type classification */
  boxType: ErgoBoxType;
  /** Blockchain height when created */
  creationHeight: Height;
  /** Height when spent (if applicable) */
  spentHeight?: Height;
  
  // Ownership and parties
  /** Owning party (if identifiable) */
  owner?: string;
  /** All parties involved in this box */
  parties: string[];
  
  // Relationships and linking
  /** Parent box (linked via R4 or other mechanism) */
  parentBoxId?: BoxId;
  /** Child boxes created from this box */
  childBoxIds: BoxId[];
  /** Related boxes in the same transaction context */
  relatedBoxIds: BoxId[];
  
  // DEX-specific data
  /** DEX order information (if applicable) */
  dexOrder?: {
    orderType: 'buy' | 'sell';
    tokenPair: [TokenId, TokenId]; // [base, quote]
    price: number;
    originalAmount: TokenAmount;
    remainingAmount: TokenAmount;
    filled: number; // Percentage 0-100
    partialFills: Array<{
      txId: TxId;
      amount: TokenAmount;
      price: number;
      timestamp: number;
    }>;
  };
  
  // Atomic exchange data
  /** Atomic exchange information (if applicable) */
  atomicExchange?: {
    exchangeType: 'bid' | 'ask' | 'settlement';
    desiredToken: TokenId;
    offeredAsset: { type: 'ERG' | 'TOKEN'; id?: TokenId; amount: TokenAmount };
    requestedAsset: { type: 'ERG' | 'TOKEN'; id?: TokenId; amount: TokenAmount };
    deadline?: Height;
    counterparty?: PublicKey;
  };
  
  /** Stealth address privacy features */
  stealthAddress?: {
    stealthType: 'meta_address' | 'stealth_payment' | 'notification' | 'one_time_address';
    privacyLevel: 'high' | 'medium' | 'low';
    ephemeralKey?: string;
    viewKey?: string;
    spendKey?: string;
    encryptedPayload?: string;
    detectionHint?: string;
    oneTimeAddress?: string;
    sharedSecret?: string;
    forwardSecrecy: boolean;
  };
  
  // Temporal constraints
  /** Time-based constraints */
  temporalConstraints?: {
    lockHeight?: Height;
    deadline?: Height;
    timeout?: Height;
    startHeight?: Height;
  };
  
  // Metadata and context
  /** Human-readable description */
  description?: string;
  /** Additional context or notes */
  context?: Record<string, any>;
  /** Visual styling hints for UI */
  displayHints?: {
    color?: string;
    icon?: string;
    priority?: 'low' | 'medium' | 'high';
    highlight?: boolean;
  };
}

// ============================================================================
// TRANSACTION PATTERNS AND TYPES
// ============================================================================

/**
 * Comprehensive transaction type system based on Ergo usage patterns
 */
export type ErgoTransactionType =
  // Basic transfers
  | 'simple_transfer'      // Basic ERG or token transfer
  | 'multi_output'         // One-to-many transfer
  | 'consolidation'        // Many-to-one UTXO consolidation
  
  // DEX operations
  | 'dex_order_placement'  // Place buy/sell order
  | 'dex_partial_match'    // Partial order matching
  | 'dex_full_match'       // Complete order matching
  | 'dex_order_cancel'     // Cancel existing order
  | 'dex_fee_collection'   // Collect DEX fees
  
  // Atomic exchanges
  | 'atomic_bid_placement' // Place atomic exchange bid
  | 'atomic_ask_placement' // Place atomic exchange ask
  | 'atomic_settlement'    // Complete atomic exchange
  | 'atomic_refund'        // Refund failed atomic exchange
  
  // Escrow operations
  | 'escrow_deposit'       // Initial escrow deposit
  | 'escrow_normal_completion' // Normal escrow completion
  | 'escrow_dispute_resolution' // Arbiter resolves dispute
  | 'escrow_timeout_refund' // Timeout-based refund
  | 'escrow_interaction'   // Generic escrow interaction
  
  // Contract interactions
  | 'contract_deployment'  // Deploy new contract
  | 'contract_interaction' // Interact with existing contract
  | 'contract_upgrade'     // Upgrade contract logic
  | 'contract_termination' // Terminate contract
  
  // System operations
  | 'coinbase'             // Mining reward transaction
  | 'fee_collection'       // Fee collection by miners
  | 'governance'           // DAO governance action
  | 'oracle_update'        // Oracle data update
  
  // Multi-party operations
  | 'multisig_setup'       // Create multisig arrangement
  | 'multisig_execution'   // Execute multisig transaction
  | 'proxy_operation'      // Proxy contract operation
  
  // Error and recovery
  | 'refund_operation'     // Refund failed operation
  | 'emergency_action'     // Emergency contract action
  | 'dispute_resolution'   // Dispute resolution action
  
  | 'unknown';             // Unclassified transaction

/**
 * Transaction execution status with detailed states
 */
export type TransactionStatus =
  | 'building'             // Transaction being constructed
  | 'signed'               // Transaction signed but not broadcast
  | 'broadcast'            // Transaction broadcast to network
  | 'pending'              // In mempool, waiting for inclusion
  | 'confirmed'            // Included in block
  | 'deeply_confirmed'     // Multiple confirmations
  | 'failed'               // Failed validation or execution
  | 'rejected'             // Rejected by network
  | 'expired'              // Expired before inclusion
  | 'replaced'             // Replaced by higher fee transaction
  | 'conflicted';          // Conflicted with another transaction

/**
 * Transaction validation result
 */
export interface TransactionValidation {
  /** Whether transaction is valid */
  isValid: boolean;
  /** Validation errors (if any) */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** ERG conservation check */
  ergConservation: {
    input: NanoErg;
    output: NanoErg;
    fee: NanoErg;
    isConserved: boolean;
  };
  /** Token conservation checks */
  tokenConservation: TokenFlow[];
}

// ============================================================================
// ENHANCED TRANSACTION INTERFACE
// ============================================================================

/**
 * Enhanced transaction interface modeling complex Ergo transaction patterns
 */
export interface EnhancedUTXOTransaction {
  // Core identifiers
  /** Transaction identifier (32-byte hex) */
  id: TxId;
  /** Transaction type classification */
  type: ErgoTransactionType;
  
  // Transaction structure
  /** Input box IDs being consumed */
  inputs: BoxId[];
  /** Output box IDs being created */
  outputs: BoxId[];
  /** Data input box IDs (read-only) */
  dataInputs: BoxId[];
  
  // Financial data
  /** Transaction fee in nanoERG */
  fee: NanoErg;
  /** Total input value */
  inputValue: NanoErg;
  /** Total output value */
  outputValue: NanoErg;
  
  // Execution and validation
  /** Current transaction status */
  status: TransactionStatus;
  /** Validation results */
  validation: TransactionValidation;
  /** Execution context */
  executionContext?: {
    gasUsed?: number;
    scriptComplexity?: number;
    contractsInvolved: string[];
  };
  
  // Parties and signatures
  /** Primary transaction signer */
  signer: PublicKey;
  /** All parties involved in transaction */
  parties: string[];
  /** Required signatures for completion */
  requiredSignatures: PublicKey[];
  /** Collected signatures */
  signatures: Array<{
    publicKey: PublicKey;
    signature: string;
    timestamp: number;
  }>;
  
  // Blockchain context
  /** Block height when included */
  inclusionHeight?: Height;
  /** Confirmation count */
  confirmations: number;
  /** Blockchain timestamp */
  timestamp?: number;
  
  // DEX-specific data
  /** DEX operation details (if applicable) */
  dexOperation?: {
    operationType: 'order_placement' | 'partial_match' | 'full_match' | 'cancellation';
    tradingPair: [TokenId, TokenId];
    priceExecuted?: number;
    volumeTraded?: TokenAmount;
    fees: {
      dexFee: NanoErg;
      networkFee: NanoErg;
      totalFee: NanoErg;
    };
    orderBookImpact?: {
      priceImpact: number;
      slippage: number;
      liquidityUtilized: number;
    };
  };
  
  // Atomic exchange data
  /** Atomic exchange details (if applicable) */
  atomicExchange?: {
    exchangeType: 'initiation' | 'completion' | 'refund';
    participants: [PublicKey, PublicKey];
    assets: {
      offered: { type: 'ERG' | 'TOKEN'; id?: TokenId; amount: TokenAmount };
      requested: { type: 'ERG' | 'TOKEN'; id?: TokenId; amount: TokenAmount };
    };
    conditions: {
      deadline?: Height;
      secretHash?: string;
      oracleCondition?: string;
    };
  };
  
  /** Stealth transaction privacy features */
  stealthTransaction?: {
    phase: 'setup' | 'payment' | 'detection' | 'claiming' | 'cleanup';
    privacyMechanism: 'ecdh_shared_secret' | 'ephemeral_keys' | 'encrypted_payload' | 'forward_secrecy';
    cryptographicProof: 'shared_secret_knowledge' | 'one_time_key_derivation' | 'view_key_validation';
    forwardSecrecy: boolean;
    participants?: {
      sender?: PublicKey;
      recipient?: PublicKey;
      scanner?: PublicKey;
    };
    privacyMetadata?: {
      ephemeralKeys: string[];
      encryptedPayloads: string[];
      detectionHints: string[];
      sharedSecrets?: string[]; // Only for educational display
    };
  };
  
  // Multi-stage protocol tracking
  /** Multi-stage protocol information */
  protocolStage?: {
    protocol: 'dex_matching' | 'atomic_swap' | 'multisig' | 'governance' | 'stealth_address';
    currentStage: number;
    totalStages: number;
    previousStages: TxId[];
    nextStageExpected?: {
      condition: string;
      estimatedHeight?: Height;
    };
  };
  
  // Error handling and recovery
  /** Error information (if failed) */
  errorInfo?: {
    errorType: 'validation' | 'execution' | 'network' | 'timeout';
    errorMessage: string;
    errorCode?: string;
    recoveryOptions?: string[];
  };
  
  // Metadata and context
  /** Human-readable description */
  description?: string;
  /** Additional context */
  context?: Record<string, any>;
  /** Visual styling hints */
  displayHints?: {
    color?: string;
    icon?: string;
    priority?: 'low' | 'medium' | 'high';
    highlight?: boolean;
  };
}

// ============================================================================
// RELATIONSHIP AND CONNECTION TYPES
// ============================================================================

/**
 * Types of relationships between boxes in UTXO model
 */
export type BoxRelationshipType =
  | 'parent_child'         // R4 linkage pattern
  | 'input_output'         // Transaction flow
  | 'state_transition'     // Contract state change
  | 'partial_consumption'  // DEX partial order
  | 'atomic_pair'          // Atomic exchange pairing
  | 'fee_payment'          // Fee extraction
  | 'change_return'        // Change output
  | 'multisig_coordination'// Multi-signature coordination
  | 'oracle_dependency'    // Oracle data dependency
  | 'governance_link'      // Governance action link
  | 'refund_path'          // Refund mechanism
  | 'proxy_delegation'     // Proxy contract delegation
  | 'cross_chain'          // Cross-chain bridge
  | 'temporal_sequence';   // Time-based sequence

/**
 * Box relationship/connection interface
 */
export interface BoxRelationship {
  /** Unique relationship identifier */
  id: string;
  /** Type of relationship */
  type: BoxRelationshipType;
  /** Source box ID */
  fromBoxId: BoxId;
  /** Target box ID */
  toBoxId: BoxId;
  /** Transaction enabling this relationship */
  viaTxId?: TxId;
  /** Relationship strength (for visualization) */
  strength: 'weak' | 'medium' | 'strong';
  /** Additional relationship metadata */
  metadata?: {
    description?: string;
    registerUsed?: 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9';
    conditionalLogic?: string;
    temporalConstraint?: Height;
  };
  /** Visual styling for connection */
  displayHints?: {
    color?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    thickness?: number;
    animated?: boolean;
  };
}

// ============================================================================
// COMPREHENSIVE VISUALIZATION DATA
// ============================================================================

/**
 * Enhanced visualization data structure for comprehensive Ergo blockchain modeling
 */
export interface EnhancedVisualizationData {
  // Core entities
  /** All boxes in the visualization */
  boxes: EnhancedUTXOBox[];
  /** All transactions in the visualization */
  transactions: EnhancedUTXOTransaction[];
  /** All relationships between boxes */
  relationships: BoxRelationship[];
  
  // Participants and metadata
  /** All parties involved */
  parties: Array<{
    id: string;
    name: string;
    publicKey?: PublicKey;
    role?: 'buyer' | 'seller' | 'dex' | 'oracle' | 'miner' | 'user';
    metadata?: Record<string, any>;
  }>;
  
  /** All tokens referenced */
  tokens: Array<{
    id: TokenId;
    name?: string;
    decimals?: number;
    totalSupply?: TokenAmount;
    metadata?: Record<string, any>;
  }>;
  
  // Protocol and context
  /** Smart contracts involved */
  contracts: Array<{
    ergoTreeHash: string;
    name?: string;
    type?: string;
    description?: string;
    sourceCode?: string;
  }>;
  
  /** Protocol-specific metadata */
  protocolContext?: {
    protocolName?: string;
    protocolVersion?: string;
    networkType?: 'mainnet' | 'testnet';
    heightRange?: [Height, Height];
    specialRules?: Record<string, any>;
  };
  
  // Flow analysis
  /** Token flows for conservation analysis */
  tokenFlows: TokenFlow[];
  /** ERG flows */
  ergFlows: Array<{
    fromParty?: string;
    toParty?: string;
    amount: NanoErg;
    purpose: 'payment' | 'fee' | 'refund' | 'change' | 'reward';
  }>;
  
  // Visualization metadata
  /** Layout hints for visualization engine */
  layoutHints?: {
    algorithm?: 'force' | 'hierarchical' | 'circular' | 'timeline';
    grouping?: 'party' | 'type' | 'height' | 'protocol';
    focusBox?: BoxId;
    highlightPath?: BoxId[];
  };
  
  /** Time range for temporal visualization */
  timeRange?: {
    startHeight?: Height;
    endHeight?: Height;
    currentHeight?: Height;
  };
}

// ============================================================================
// UTILITY TYPES AND TYPE GUARDS
// ============================================================================

/**
 * Type guard for DEX-related boxes
 */
export const isDEXBox = (box: EnhancedUTXOBox): boolean => {
  return ['buy_order', 'sell_order', 'partial_buy_order', 'partial_sell_order', 'settlement', 'dex_fee'].includes(box.boxType);
};

/**
 * Type guard for atomic exchange boxes
 */
export const isAtomicExchangeBox = (box: EnhancedUTXOBox): boolean => {
  return ['atomic_bid', 'atomic_ask', 'atomic_settlement'].includes(box.boxType);
};

/**
 * Type guard for contract boxes
 */
export const isContractBox = (box: EnhancedUTXOBox): boolean => {
  return !['wallet', 'change', 'miner_reward'].includes(box.boxType);
};

/**
 * Type guard for spendable boxes
 */
export const isSpendableBox = (box: EnhancedUTXOBox): boolean => {
  return ['unspent', 'locked', 'partial_match'].includes(box.state);
};

/**
 * Utility type for box filtering
 */
export type BoxFilter = {
  boxType?: ErgoBoxType[];
  state?: BoxLifecycleState[];
  party?: string[];
  hasTokens?: boolean;
  heightRange?: [Height, Height];
};

/**
 * Utility type for transaction filtering
 */
export type TransactionFilter = {
  type?: ErgoTransactionType[];
  status?: TransactionStatus[];
  signer?: string[];
  heightRange?: [Height, Height];
  involvesBoxes?: BoxId[];
};

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

/**
 * Legacy types for backwards compatibility with existing code
 * @deprecated Use EnhancedUTXOBox instead
 */
export type UTXOBox = {
  id: string;
  value: string | number;
  ergoTreeHash?: string;
  script?: string;
  tokens?: Array<{ id: string; amount: string | number }>;
  registers?: Record<string, any>;
  creationHeight?: number;
  state: 'unspent' | 'spending' | 'spent';
  party?: string;
  type: 'user' | 'contract' | 'system';
  description?: string;
};

/**
 * @deprecated Use EnhancedUTXOTransaction instead
 */
export type UTXOTransaction = {
  id: string;
  type: 'deposit' | 'withdraw' | 'swap' | 'transfer' | 'setup';
  inputs: string[];
  outputs: string[];
  dataInputs?: string[];
  fee: string | number;
  status: 'pending' | 'confirmed' | 'failed';
  signer?: string;
  description?: string;
};

/**
 * @deprecated Use EnhancedVisualizationData instead
 */
export type VisualizationData = {
  boxes: UTXOBox[];
  transactions: UTXOTransaction[];
  parties: string[];
};