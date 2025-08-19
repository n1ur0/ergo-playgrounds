//! Abstract Syntax Tree (AST) definitions for ErgoScript contracts.
//!
//! This module defines the structure of parsed ErgoScript contracts,
//! focusing on elements that are important for flow analysis and diagram generation.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Contract {
    pub body: Expression,
    pub metadata: ContractMetadata,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ContractMetadata {
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub identified_patterns: Vec<ContractPattern>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ContractPattern {
    DEX,
    Escrow,
    TimeLock,
    AtomicSwap,
    TokenSale,
    Refund,
    GuardScript,
    SelfReplicating,
    Oracle,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Expression {
    // Literals
    Boolean(bool),
    Integer(i64),
    ByteArray(Vec<u8>),
    
    // Identifiers
    Identifier(String),
    
    // Collections
    Tuple(Vec<Expression>),
    Collection(Vec<Expression>),
    
    // Context access
    ContextAccess(ContextField),
    
    // Box operations
    BoxAccess(Box<Expression>, BoxField),
    
    // Control flow
    IfElse {
        condition: Box<Expression>,
        then_branch: Box<Expression>,
        else_branch: Option<Box<Expression>>,
    },
    
    // Logical operations
    LogicalAnd(Box<Expression>, Box<Expression>),
    LogicalOr(Box<Expression>, Box<Expression>),
    Not(Box<Expression>),
    
    // Comparison operations
    Equal(Box<Expression>, Box<Expression>),
    NotEqual(Box<Expression>, Box<Expression>),
    Greater(Box<Expression>, Box<Expression>),
    GreaterEqual(Box<Expression>, Box<Expression>),
    Less(Box<Expression>, Box<Expression>),
    LessEqual(Box<Expression>, Box<Expression>),
    
    // Arithmetic operations
    Add(Box<Expression>, Box<Expression>),
    Subtract(Box<Expression>, Box<Expression>),
    Multiply(Box<Expression>, Box<Expression>),
    Divide(Box<Expression>, Box<Expression>),
    Modulo(Box<Expression>, Box<Expression>),
    
    // Collection operations
    Size(Box<Expression>),
    Get(Box<Expression>, Box<Expression>), // collection.get(index)
    Slice(Box<Expression>, Box<Expression>, Box<Expression>), // collection.slice(from, until)
    Exists(Box<Expression>, String, Box<Expression>), // collection.exists(lambda)
    ForAll(Box<Expression>, String, Box<Expression>), // collection.forAll(lambda)
    
    // Ergo-specific operations
    SigmaProp(Box<Expression>),
    AllOf(Box<Expression>), // allOf(collection)
    AnyOf(Box<Expression>), // anyOf(collection)
    
    // Function calls
    FunctionCall {
        name: String,
        args: Vec<Expression>,
    },
    
    // Lambda expressions
    Lambda {
        param: String,
        body: Box<Expression>,
    },
    
    // Variable binding
    Let {
        name: String,
        value: Box<Expression>,
        body: Box<Expression>,
    },
    
    // Type operations
    IsDefined(Box<Expression>),
    Get(Box<Expression>), // option.get
    
    // Cast operations
    ToLong(Box<Expression>),
    ToByteArray(Box<Expression>),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ContextField {
    DataInputs,
    Headers,
    PreHeader,
    LastBlockUtxoRootHash,
    MinerPubKey,
    SelfOutIndex,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum BoxField {
    Value,
    PropositionBytes,
    Id,
    Tokens,
    CreationInfo,
    Register(u8), // R4, R5, etc.
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum OutputsAccess {
    Index(usize),
    All,
}

/// Represents different types of box references in ErgoScript
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum BoxReference {
    Self_,
    Outputs(OutputsAccess),
    DataInputs(usize),
    Input(usize),
}

/// Analysis result containing flow information extracted from the contract
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FlowAnalysis {
    pub contract: Contract,
    pub flow_patterns: Vec<FlowPattern>,
    pub validation_checks: Vec<ValidationCheck>,
    pub party_interactions: Vec<PartyInteraction>,
    pub token_operations: Vec<TokenOperation>,
    pub erg_flows: Vec<ErgFlow>,
    pub conditional_paths: Vec<ConditionalPath>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FlowPattern {
    pub pattern_type: ContractPattern,
    pub description: String,
    pub involved_boxes: Vec<BoxReference>,
    pub conditions: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ValidationCheck {
    pub check_type: ValidationType,
    pub description: String,
    pub target: BoxReference,
    pub field: Option<BoxField>,
    pub expected_value: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ValidationType {
    TokenValidation,
    ValueValidation,
    RegisterValidation,
    PropositionValidation,
    SizeValidation,
    ExistenceCheck,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PartyInteraction {
    pub party_name: String,
    pub interaction_type: InteractionType,
    pub boxes_involved: Vec<BoxReference>,
    pub description: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum InteractionType {
    Spend,
    Create,
    Sign,
    Validate,
    Refund,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TokenOperation {
    pub operation_type: TokenOpType,
    pub token_id: Option<String>,
    pub amount_expression: String,
    pub source_box: BoxReference,
    pub target_box: Option<BoxReference>,
    pub description: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TokenOpType {
    Transfer,
    Mint,
    Burn,
    Validate,
    Split,
    Merge,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ErgFlow {
    pub source_box: BoxReference,
    pub target_box: BoxReference,
    pub amount_expression: String,
    pub flow_type: ErgFlowType,
    pub description: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ErgFlowType {
    Payment,
    Fee,
    Refund,
    Change,
    Reward,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConditionalPath {
    pub condition: String,
    pub then_actions: Vec<Action>,
    pub else_actions: Vec<Action>,
    pub path_type: PathType,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum PathType {
    MainFlow,
    RefundPath,
    ErrorPath,
    GuardPath,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Action {
    pub action_type: ActionType,
    pub description: String,
    pub target: Option<BoxReference>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ActionType {
    ValidateBox,
    TransferTokens,
    TransferErg,
    CreateOutput,
    ExecuteRefund,
    CheckSignature,
    ValidateTime,
    ValidateData,
}

impl Contract {
    pub fn new(body: Expression) -> Self {
        Self {
            body,
            metadata: ContractMetadata {
                name: None,
                description: None,
                version: None,
                identified_patterns: Vec::new(),
            },
        }
    }
    
    pub fn with_metadata(mut self, metadata: ContractMetadata) -> Self {
        self.metadata = metadata;
        self
    }
}

impl FlowAnalysis {
    pub fn new(contract: Contract) -> Self {
        Self {
            contract,
            flow_patterns: Vec::new(),
            validation_checks: Vec::new(),
            party_interactions: Vec::new(),
            token_operations: Vec::new(),
            erg_flows: Vec::new(),
            conditional_paths: Vec::new(),
        }
    }
}