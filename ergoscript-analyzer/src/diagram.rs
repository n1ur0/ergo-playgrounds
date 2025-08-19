//! Diagram generation structures for converting flow analysis into visual representations.
//!
//! This module defines structures that can be serialized to JSON/YAML for
//! consumption by diagram generators like Mermaid or D3.js.

use crate::ast::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Main diagram structure containing all elements needed for visualization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractDiagram {
    pub metadata: DiagramMetadata,
    pub nodes: Vec<DiagramNode>,
    pub edges: Vec<DiagramEdge>,
    pub groups: Vec<DiagramGroup>,
    pub annotations: Vec<DiagramAnnotation>,
    pub layout_hints: LayoutHints,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagramMetadata {
    pub contract_name: Option<String>,
    pub description: Option<String>,
    pub patterns: Vec<ContractPattern>,
    pub diagram_type: DiagramType,
    pub generated_at: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DiagramType {
    FlowChart,
    StateTransition,
    SequenceDiagram,
    ComponentDiagram,
    HybridFlow,
}

/// Represents different types of nodes in the diagram
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagramNode {
    pub id: String,
    pub node_type: NodeType,
    pub label: String,
    pub description: Option<String>,
    pub properties: HashMap<String, String>,
    pub styling: NodeStyling,
    pub position: Option<Position>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NodeType {
    // Flow control nodes
    StartNode,
    EndNode,
    DecisionNode,
    ProcessNode,
    
    // Ergo-specific nodes
    InputBox,
    OutputBox,
    DataInput,
    ValidationCheck,
    TokenOperation,
    ErgTransfer,
    
    // Contract structure nodes
    ContractEntry,
    GuardCondition,
    RefundPath,
    MainLogic,
    
    // Party nodes
    Party,
    Owner,
    Counterparty,
    
    // State nodes
    ContractState,
    TokenState,
    ValueState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeStyling {
    pub color: Option<String>,
    pub background_color: Option<String>,
    pub border_color: Option<String>,
    pub shape: NodeShape,
    pub size: Option<Size>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NodeShape {
    Rectangle,
    Circle,
    Diamond,
    Hexagon,
    Ellipse,
    RoundedRectangle,
    Database,
    Cloud,
    Actor,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Size {
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f32,
    pub y: f32,
}

/// Represents connections between nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagramEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub edge_type: EdgeType,
    pub label: Option<String>,
    pub description: Option<String>,
    pub properties: HashMap<String, String>,
    pub styling: EdgeStyling,
    pub conditions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EdgeType {
    // Control flow
    SequentialFlow,
    ConditionalFlow,
    LoopFlow,
    
    // Data flow
    DataFlow,
    TokenFlow,
    ValueFlow,
    
    // Ergo-specific flows
    BoxCreation,
    BoxConsumption,
    ValidationCheck,
    SignatureCheck,
    
    // Relationships
    Dependency,
    Alternative,
    Composition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeStyling {
    pub color: Option<String>,
    pub width: Option<f32>,
    pub style: EdgeStyle,
    pub arrow_type: ArrowType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EdgeStyle {
    Solid,
    Dashed,
    Dotted,
    Double,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ArrowType {
    Normal,
    Open,
    Diamond,
    Circle,
    None,
}

/// Groups related nodes together visually
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagramGroup {
    pub id: String,
    pub label: String,
    pub group_type: GroupType,
    pub members: Vec<String>, // Node IDs
    pub styling: GroupStyling,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GroupType {
    ConditionalBranch,
    ValidationCluster,
    TokenOperations,
    PartyActions,
    ContractLogic,
    RefundLogic,
    GuardLogic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupStyling {
    pub background_color: Option<String>,
    pub border_color: Option<String>,
    pub border_style: EdgeStyle,
    pub padding: Option<f32>,
}

/// Additional annotations for the diagram
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagramAnnotation {
    pub id: String,
    pub annotation_type: AnnotationType,
    pub content: String,
    pub target: Option<String>, // Node or edge ID
    pub position: Option<Position>,
    pub styling: AnnotationStyling,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AnnotationType {
    Note,
    Warning,
    Information,
    Error,
    SecurityNotice,
    PerformanceHint,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnotationStyling {
    pub background_color: Option<String>,
    pub text_color: Option<String>,
    pub font_size: Option<f32>,
    pub max_width: Option<f32>,
}

/// Layout hints for diagram generators
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutHints {
    pub direction: LayoutDirection,
    pub spacing: LayoutSpacing,
    pub alignment: LayoutAlignment,
    pub grouping_strength: f32,
    pub rank_separation: f32,
    pub node_separation: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LayoutDirection {
    TopToBottom,
    BottomToTop,
    LeftToRight,
    RightToLeft,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutSpacing {
    pub horizontal: f32,
    pub vertical: f32,
    pub group_padding: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LayoutAlignment {
    Start,
    Center,
    End,
    Justify,
}

/// Builder for creating contract diagrams from flow analysis
pub struct DiagramBuilder {
    diagram: ContractDiagram,
    node_counter: usize,
    edge_counter: usize,
    group_counter: usize,
    annotation_counter: usize,
}

impl DiagramBuilder {
    pub fn new(contract_name: Option<String>) -> Self {
        Self {
            diagram: ContractDiagram {
                metadata: DiagramMetadata {
                    contract_name,
                    description: None,
                    patterns: Vec::new(),
                    diagram_type: DiagramType::FlowChart,
                    generated_at: chrono::Utc::now().to_rfc3339(),
                    version: env!("CARGO_PKG_VERSION").to_string(),
                },
                nodes: Vec::new(),
                edges: Vec::new(),
                groups: Vec::new(),
                annotations: Vec::new(),
                layout_hints: LayoutHints {
                    direction: LayoutDirection::TopToBottom,
                    spacing: LayoutSpacing {
                        horizontal: 100.0,
                        vertical: 80.0,
                        group_padding: 20.0,
                    },
                    alignment: LayoutAlignment::Center,
                    grouping_strength: 0.8,
                    rank_separation: 100.0,
                    node_separation: 80.0,
                },
            },
            node_counter: 0,
            edge_counter: 0,
            group_counter: 0,
            annotation_counter: 0,
        }
    }
    
    pub fn from_flow_analysis(analysis: &FlowAnalysis) -> Result<ContractDiagram, DiagramError> {
        let mut builder = DiagramBuilder::new(analysis.contract.metadata.name.clone());
        
        // Set metadata
        builder.diagram.metadata.patterns = analysis.contract.metadata.identified_patterns.clone();
        builder.diagram.metadata.description = analysis.contract.metadata.description.clone();
        
        // Add start node
        let start_id = builder.add_start_node()?;
        let mut current_node = start_id;
        
        // Process conditional paths
        for path in &analysis.conditional_paths {
            current_node = builder.add_conditional_path(path, &current_node)?;
        }
        
        // Add validation nodes
        for validation in &analysis.validation_checks {
            builder.add_validation_node(validation)?;
        }
        
        // Add token operation nodes
        for token_op in &analysis.token_operations {
            builder.add_token_operation_node(token_op)?;
        }
        
        // Add ERG flow nodes
        for erg_flow in &analysis.erg_flows {
            builder.add_erg_flow_node(erg_flow)?;
        }
        
        // Group related nodes
        builder.group_validation_nodes()?;
        builder.group_token_operations()?;
        
        // Add pattern-specific annotations
        builder.add_pattern_annotations(&analysis.contract.metadata.identified_patterns)?;
        
        // Add end node
        builder.add_end_node()?;
        
        Ok(builder.diagram)
    }
    
    fn add_start_node(&mut self) -> Result<String, DiagramError> {
        let id = self.next_node_id();
        self.diagram.nodes.push(DiagramNode {
            id: id.clone(),
            node_type: NodeType::StartNode,
            label: "Contract Start".to_string(),
            description: Some("Entry point of the contract execution".to_string()),
            properties: HashMap::new(),
            styling: NodeStyling {
                color: Some("#ffffff".to_string()),
                background_color: Some("#4caf50".to_string()),
                border_color: Some("#388e3c".to_string()),
                shape: NodeShape::Circle,
                size: Some(Size { width: 60.0, height: 60.0 }),
                icon: Some("play".to_string()),
            },
            position: None,
        });
        Ok(id)
    }
    
    fn add_end_node(&mut self) -> Result<String, DiagramError> {
        let id = self.next_node_id();
        self.diagram.nodes.push(DiagramNode {
            id: id.clone(),
            node_type: NodeType::EndNode,
            label: "Contract End".to_string(),
            description: Some("Contract execution completed".to_string()),
            properties: HashMap::new(),
            styling: NodeStyling {
                color: Some("#ffffff".to_string()),
                background_color: Some("#f44336".to_string()),
                border_color: Some("#d32f2f".to_string()),
                shape: NodeShape::Circle,
                size: Some(Size { width: 60.0, height: 60.0 }),
                icon: Some("stop".to_string()),
            },
            position: None,
        });
        Ok(id)
    }
    
    fn add_conditional_path(&mut self, path: &ConditionalPath, from_node: &str) -> Result<String, DiagramError> {
        // Add decision node
        let decision_id = self.next_node_id();
        self.diagram.nodes.push(DiagramNode {
            id: decision_id.clone(),
            node_type: NodeType::DecisionNode,
            label: "Decision".to_string(),
            description: Some(path.condition.clone()),
            properties: {
                let mut props = HashMap::new();
                props.insert("condition".to_string(), path.condition.clone());
                props.insert("path_type".to_string(), format!("{:?}", path.path_type));
                props
            },
            styling: NodeStyling {
                color: Some("#000000".to_string()),
                background_color: Some("#fff3e0".to_string()),
                border_color: Some("#ff9800".to_string()),
                shape: NodeShape::Diamond,
                size: Some(Size { width: 120.0, height: 80.0 }),
                icon: None,
            },
            position: None,
        });
        
        // Connect from previous node
        self.add_edge(from_node, &decision_id, EdgeType::SequentialFlow, None)?;
        
        // Add then branch
        let then_id = self.add_action_nodes(&path.then_actions, "Then")?;
        self.add_edge(&decision_id, &then_id, EdgeType::ConditionalFlow, Some("true".to_string()))?;
        
        // Add else branch if present
        if !path.else_actions.is_empty() {
            let else_id = self.add_action_nodes(&path.else_actions, "Else")?;
            self.add_edge(&decision_id, &else_id, EdgeType::ConditionalFlow, Some("false".to_string()))?;
        }
        
        Ok(decision_id)
    }
    
    fn add_action_nodes(&mut self, actions: &[Action], branch_label: &str) -> Result<String, DiagramError> {
        if actions.is_empty() {
            // Create a simple process node
            let id = self.next_node_id();
            self.diagram.nodes.push(DiagramNode {
                id: id.clone(),
                node_type: NodeType::ProcessNode,
                label: format!("{} Branch", branch_label),
                description: Some("No specific actions".to_string()),
                properties: HashMap::new(),
                styling: self.get_default_process_styling(),
                position: None,
            });
            return Ok(id);
        }
        
        let mut first_id = None;
        let mut prev_id = None;
        
        for action in actions {
            let node_id = self.next_node_id();
            let node_type = match action.action_type {
                ActionType::ValidateBox => NodeType::ValidationCheck,
                ActionType::TransferTokens => NodeType::TokenOperation,
                ActionType::TransferErg => NodeType::ErgTransfer,
                _ => NodeType::ProcessNode,
            };
            
            self.diagram.nodes.push(DiagramNode {
                id: node_id.clone(),
                node_type,
                label: action.description.clone(),
                description: Some(format!("{:?}", action.action_type)),
                properties: {
                    let mut props = HashMap::new();
                    props.insert("action_type".to_string(), format!("{:?}", action.action_type));
                    if let Some(target) = &action.target {
                        props.insert("target".to_string(), format!("{:?}", target));
                    }
                    props
                },
                styling: self.get_action_styling(&action.action_type),
                position: None,
            });
            
            if first_id.is_none() {
                first_id = Some(node_id.clone());
            }
            
            if let Some(prev) = prev_id {
                self.add_edge(&prev, &node_id, EdgeType::SequentialFlow, None)?;
            }
            
            prev_id = Some(node_id);
        }
        
        Ok(first_id.unwrap_or_else(|| "unknown".to_string()))
    }
    
    fn add_validation_node(&mut self, validation: &ValidationCheck) -> Result<String, DiagramError> {
        let id = self.next_node_id();
        
        let mut properties = HashMap::new();
        properties.insert("check_type".to_string(), format!("{:?}", validation.check_type));
        properties.insert("target".to_string(), format!("{:?}", validation.target));
        if let Some(field) = &validation.field {
            properties.insert("field".to_string(), format!("{:?}", field));
        }
        if let Some(expected) = &validation.expected_value {
            properties.insert("expected_value".to_string(), expected.clone());
        }
        
        self.diagram.nodes.push(DiagramNode {
            id: id.clone(),
            node_type: NodeType::ValidationCheck,
            label: validation.description.clone(),
            description: Some(format!("Validation: {:?}", validation.check_type)),
            properties,
            styling: NodeStyling {
                color: Some("#000000".to_string()),
                background_color: Some("#e3f2fd".to_string()),
                border_color: Some("#2196f3".to_string()),
                shape: NodeShape::Rectangle,
                size: Some(Size { width: 140.0, height: 60.0 }),
                icon: Some("check".to_string()),
            },
            position: None,
        });
        
        Ok(id)
    }
    
    fn add_token_operation_node(&mut self, token_op: &TokenOperation) -> Result<String, DiagramError> {
        let id = self.next_node_id();
        
        let mut properties = HashMap::new();
        properties.insert("operation_type".to_string(), format!("{:?}", token_op.operation_type));
        properties.insert("source_box".to_string(), format!("{:?}", token_op.source_box));
        if let Some(target) = &token_op.target_box {
            properties.insert("target_box".to_string(), format!("{:?}", target));
        }
        if let Some(token_id) = &token_op.token_id {
            properties.insert("token_id".to_string(), token_id.clone());
        }
        properties.insert("amount".to_string(), token_op.amount_expression.clone());
        
        self.diagram.nodes.push(DiagramNode {
            id: id.clone(),
            node_type: NodeType::TokenOperation,
            label: token_op.description.clone(),
            description: Some(format!("Token: {:?}", token_op.operation_type)),
            properties,
            styling: NodeStyling {
                color: Some("#ffffff".to_string()),
                background_color: Some("#9c27b0".to_string()),
                border_color: Some("#7b1fa2".to_string()),
                shape: NodeShape::RoundedRectangle,
                size: Some(Size { width: 150.0, height: 70.0 }),
                icon: Some("token".to_string()),
            },
            position: None,
        });
        
        Ok(id)
    }
    
    fn add_erg_flow_node(&mut self, erg_flow: &ErgFlow) -> Result<String, DiagramError> {
        let id = self.next_node_id();
        
        let mut properties = HashMap::new();
        properties.insert("flow_type".to_string(), format!("{:?}", erg_flow.flow_type));
        properties.insert("source_box".to_string(), format!("{:?}", erg_flow.source_box));
        properties.insert("target_box".to_string(), format!("{:?}", erg_flow.target_box));
        properties.insert("amount".to_string(), erg_flow.amount_expression.clone());
        
        self.diagram.nodes.push(DiagramNode {
            id: id.clone(),
            node_type: NodeType::ErgTransfer,
            label: erg_flow.description.clone(),
            description: Some(format!("ERG: {:?}", erg_flow.flow_type)),
            properties,
            styling: NodeStyling {
                color: Some("#ffffff".to_string()),
                background_color: Some("#ff5722".to_string()),
                border_color: Some("#d84315".to_string()),
                shape: NodeShape::Hexagon,
                size: Some(Size { width: 130.0, height: 60.0 }),
                icon: Some("currency".to_string()),
            },
            position: None,
        });
        
        Ok(id)
    }
    
    fn add_edge(&mut self, source: &str, target: &str, edge_type: EdgeType, label: Option<String>) -> Result<String, DiagramError> {
        let id = self.next_edge_id();
        
        self.diagram.edges.push(DiagramEdge {
            id: id.clone(),
            source: source.to_string(),
            target: target.to_string(),
            edge_type: edge_type.clone(),
            label,
            description: None,
            properties: HashMap::new(),
            styling: self.get_edge_styling(&edge_type),
            conditions: Vec::new(),
        });
        
        Ok(id)
    }
    
    fn group_validation_nodes(&mut self) -> Result<(), DiagramError> {
        let validation_nodes: Vec<String> = self.diagram.nodes
            .iter()
            .filter(|n| matches!(n.node_type, NodeType::ValidationCheck))
            .map(|n| n.id.clone())
            .collect();
        
        if validation_nodes.len() > 1 {
            let group_id = self.next_group_id();
            self.diagram.groups.push(DiagramGroup {
                id: group_id,
                label: "Validation Checks".to_string(),
                group_type: GroupType::ValidationCluster,
                members: validation_nodes,
                styling: GroupStyling {
                    background_color: Some("#f3e5f5".to_string()),
                    border_color: Some("#9c27b0".to_string()),
                    border_style: EdgeStyle::Dashed,
                    padding: Some(15.0),
                },
            });
        }
        
        Ok(())
    }
    
    fn group_token_operations(&mut self) -> Result<(), DiagramError> {
        let token_nodes: Vec<String> = self.diagram.nodes
            .iter()
            .filter(|n| matches!(n.node_type, NodeType::TokenOperation))
            .map(|n| n.id.clone())
            .collect();
        
        if token_nodes.len() > 1 {
            let group_id = self.next_group_id();
            self.diagram.groups.push(DiagramGroup {
                id: group_id,
                label: "Token Operations".to_string(),
                group_type: GroupType::TokenOperations,
                members: token_nodes,
                styling: GroupStyling {
                    background_color: Some("#e8f5e8".to_string()),
                    border_color: Some("#4caf50".to_string()),
                    border_style: EdgeStyle::Solid,
                    padding: Some(12.0),
                },
            });
        }
        
        Ok(())
    }
    
    fn add_pattern_annotations(&mut self, patterns: &[ContractPattern]) -> Result<(), DiagramError> {
        for pattern in patterns {
            let annotation_id = self.next_annotation_id();
            let (content, annotation_type) = match pattern {
                ContractPattern::GuardScript => (
                    "⚠️ Guard Script: Owner can bypass contract logic".to_string(),
                    AnnotationType::Warning
                ),
                ContractPattern::DEX => (
                    "💱 DEX Pattern: Token exchange functionality detected".to_string(),
                    AnnotationType::Information
                ),
                ContractPattern::Escrow => (
                    "🏦 Escrow Pattern: Third-party mediated transaction".to_string(),
                    AnnotationType::Information
                ),
                ContractPattern::TimeLock => (
                    "⏰ Time Lock: Time-based access control".to_string(),
                    AnnotationType::SecurityNotice
                ),
                ContractPattern::AtomicSwap => (
                    "🔄 Atomic Swap: Cross-chain exchange capability".to_string(),
                    AnnotationType::Information
                ),
                _ => (format!("{:?} pattern detected", pattern), AnnotationType::Note),
            };
            
            self.diagram.annotations.push(DiagramAnnotation {
                id: annotation_id,
                annotation_type,
                content,
                target: None,
                position: None,
                styling: AnnotationStyling {
                    background_color: Some("#fff9c4".to_string()),
                    text_color: Some("#f57f17".to_string()),
                    font_size: Some(12.0),
                    max_width: Some(200.0),
                },
            });
        }
        
        Ok(())
    }
    
    // Helper methods
    fn next_node_id(&mut self) -> String {
        self.node_counter += 1;
        format!("node_{}", self.node_counter)
    }
    
    fn next_edge_id(&mut self) -> String {
        self.edge_counter += 1;
        format!("edge_{}", self.edge_counter)
    }
    
    fn next_group_id(&mut self) -> String {
        self.group_counter += 1;
        format!("group_{}", self.group_counter)
    }
    
    fn next_annotation_id(&mut self) -> String {
        self.annotation_counter += 1;
        format!("annotation_{}", self.annotation_counter)
    }
    
    fn get_default_process_styling(&self) -> NodeStyling {
        NodeStyling {
            color: Some("#000000".to_string()),
            background_color: Some("#e1f5fe".to_string()),
            border_color: Some("#0277bd".to_string()),
            shape: NodeShape::Rectangle,
            size: Some(Size { width: 120.0, height: 60.0 }),
            icon: None,
        }
    }
    
    fn get_action_styling(&self, action_type: &ActionType) -> NodeStyling {
        match action_type {
            ActionType::ValidateBox => NodeStyling {
                color: Some("#000000".to_string()),
                background_color: Some("#e3f2fd".to_string()),
                border_color: Some("#2196f3".to_string()),
                shape: NodeShape::Rectangle,
                size: Some(Size { width: 140.0, height: 60.0 }),
                icon: Some("check".to_string()),
            },
            ActionType::TransferTokens => NodeStyling {
                color: Some("#ffffff".to_string()),
                background_color: Some("#9c27b0".to_string()),
                border_color: Some("#7b1fa2".to_string()),
                shape: NodeShape::RoundedRectangle,
                size: Some(Size { width: 150.0, height: 70.0 }),
                icon: Some("token".to_string()),
            },
            ActionType::TransferErg => NodeStyling {
                color: Some("#ffffff".to_string()),
                background_color: Some("#ff5722".to_string()),
                border_color: Some("#d84315".to_string()),
                shape: NodeShape::Hexagon,
                size: Some(Size { width: 130.0, height: 60.0 }),
                icon: Some("currency".to_string()),
            },
            _ => self.get_default_process_styling(),
        }
    }
    
    fn get_edge_styling(&self, edge_type: &EdgeType) -> EdgeStyling {
        match edge_type {
            EdgeType::ConditionalFlow => EdgeStyling {
                color: Some("#ff9800".to_string()),
                width: Some(2.0),
                style: EdgeStyle::Solid,
                arrow_type: ArrowType::Normal,
            },
            EdgeType::TokenFlow => EdgeStyling {
                color: Some("#9c27b0".to_string()),
                width: Some(3.0),
                style: EdgeStyle::Solid,
                arrow_type: ArrowType::Diamond,
            },
            EdgeType::ValueFlow => EdgeStyling {
                color: Some("#ff5722".to_string()),
                width: Some(3.0),
                style: EdgeStyle::Solid,
                arrow_type: ArrowType::Diamond,
            },
            EdgeType::ValidationCheck => EdgeStyling {
                color: Some("#2196f3".to_string()),
                width: Some(2.0),
                style: EdgeStyle::Dashed,
                arrow_type: ArrowType::Normal,
            },
            _ => EdgeStyling {
                color: Some("#424242".to_string()),
                width: Some(1.5),
                style: EdgeStyle::Solid,
                arrow_type: ArrowType::Normal,
            },
        }
    }
    
    pub fn build(self) -> ContractDiagram {
        self.diagram
    }
}

#[derive(Debug, thiserror::Error)]
pub enum DiagramError {
    #[error("Invalid node configuration: {message}")]
    InvalidNode { message: String },
    #[error("Invalid edge configuration: {message}")]
    InvalidEdge { message: String },
    #[error("Serialization error: {source}")]
    SerializationError { source: serde_json::Error },
}

impl ContractDiagram {
    /// Serialize to JSON format
    pub fn to_json(&self) -> Result<String, DiagramError> {
        serde_json::to_string_pretty(self)
            .map_err(|e| DiagramError::SerializationError { source: e })
    }
    
    /// Serialize to YAML format
    pub fn to_yaml(&self) -> Result<String, serde_yaml::Error> {
        serde_yaml::to_string(self)
    }
    
    /// Convert to Mermaid flowchart syntax
    pub fn to_mermaid(&self) -> String {
        let mut mermaid = String::new();
        mermaid.push_str("flowchart TD\n");
        
        // Add nodes
        for node in &self.nodes {
            let shape_open = match node.styling.shape {
                NodeShape::Rectangle => "[",
                NodeShape::Circle => "((",
                NodeShape::Diamond => "{",
                NodeShape::RoundedRectangle => "(",
                NodeShape::Hexagon => "{{",
                _ => "[",
            };
            let shape_close = match node.styling.shape {
                NodeShape::Rectangle => "]",
                NodeShape::Circle => "))",
                NodeShape::Diamond => "}",
                NodeShape::RoundedRectangle => ")",
                NodeShape::Hexagon => "}}",
                _ => "]",
            };
            
            mermaid.push_str(&format!("    {}{}{}{}\n", 
                node.id, shape_open, node.label, shape_close));
        }
        
        // Add edges
        for edge in &self.edges {
            let arrow = match edge.edge_type {
                EdgeType::ConditionalFlow => "-->",
                EdgeType::DataFlow => "-.->",
                EdgeType::TokenFlow => "==>",
                _ => "-->",
            };
            
            if let Some(label) = &edge.label {
                mermaid.push_str(&format!("    {} {}|{}| {}\n", 
                    edge.source, arrow, label, edge.target));
            } else {
                mermaid.push_str(&format!("    {} {} {}\n", 
                    edge.source, arrow, edge.target));
            }
        }
        
        // Add styling
        for node in &self.nodes {
            if let Some(bg_color) = &node.styling.background_color {
                mermaid.push_str(&format!("    style {} fill:{}\n", node.id, bg_color));
            }
        }
        
        mermaid
    }
}

// Add chrono dependency for timestamps
mod chrono {
    pub struct Utc;
    impl Utc {
        pub fn now() -> DateTime {
            DateTime
        }
    }
    
    pub struct DateTime;
    impl DateTime {
        pub fn to_rfc3339(&self) -> String {
            "2024-01-01T00:00:00Z".to_string() // Simplified for now
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_diagram_builder() {
        let builder = DiagramBuilder::new(Some("Test Contract".to_string()));
        let diagram = builder.build();
        
        assert_eq!(diagram.metadata.contract_name, Some("Test Contract".to_string()));
        assert_eq!(diagram.metadata.diagram_type, DiagramType::FlowChart);
    }
    
    #[test]
    fn test_json_serialization() {
        let builder = DiagramBuilder::new(Some("Test".to_string()));
        let diagram = builder.build();
        
        let json = diagram.to_json().unwrap();
        assert!(json.contains("Test"));
        assert!(json.contains("nodes"));
        assert!(json.contains("edges"));
    }
    
    #[test]
    fn test_mermaid_conversion() {
        let mut builder = DiagramBuilder::new(Some("Test".to_string()));
        let start_id = builder.add_start_node().unwrap();
        let end_id = builder.add_end_node().unwrap();
        builder.add_edge(&start_id, &end_id, EdgeType::SequentialFlow, None).unwrap();
        
        let diagram = builder.build();
        let mermaid = diagram.to_mermaid();
        
        assert!(mermaid.contains("flowchart TD"));
        assert!(mermaid.contains("Contract Start"));
        assert!(mermaid.contains("Contract End"));
        assert!(mermaid.contains("-->"));
    }
}