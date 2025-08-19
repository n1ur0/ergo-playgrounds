//! Flow analyzer for extracting patterns and behavior from ErgoScript contracts.
//!
//! This module analyzes the parsed AST to identify contract patterns,
//! validation flows, token operations, and other diagram-worthy elements.

use crate::ast::*;
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

pub struct FlowAnalyzer {
    current_analysis: FlowAnalysis,
    context_stack: Vec<AnalysisContext>,
    variable_bindings: HashMap<String, Expression>,
}

#[derive(Debug, Clone)]
struct AnalysisContext {
    context_type: ContextType,
    depth: usize,
    parent_condition: Option<String>,
}

#[derive(Debug, Clone)]
enum ContextType {
    MainFlow,
    IfBranch,
    ElseBranch,
    LetBinding,
    FunctionCall,
}

impl FlowAnalyzer {
    pub fn new(contract: Contract) -> Self {
        Self {
            current_analysis: FlowAnalysis::new(contract),
            context_stack: vec![AnalysisContext {
                context_type: ContextType::MainFlow,
                depth: 0,
                parent_condition: None,
            }],
            variable_bindings: HashMap::new(),
        }
    }
    
    pub fn analyze(mut self) -> Result<FlowAnalysis, AnalysisError> {
        // First pass: identify basic patterns
        self.identify_contract_patterns()?;
        
        // Second pass: analyze the main expression for flow patterns
        self.analyze_expression(&self.current_analysis.contract.body.clone())?;
        
        // Third pass: extract high-level patterns and relationships
        self.extract_flow_patterns()?;
        
        Ok(self.current_analysis)
    }
    
    fn identify_contract_patterns(&mut self) -> Result<(), AnalysisError> {
        let expr = &self.current_analysis.contract.body;
        let mut patterns = Vec::new();
        
        // Analyze for common patterns
        if self.has_guard_script_pattern(expr) {
            patterns.push(ContractPattern::GuardScript);
        }
        
        if self.has_dex_pattern(expr) {
            patterns.push(ContractPattern::DEX);
        }
        
        if self.has_escrow_pattern(expr) {
            patterns.push(ContractPattern::Escrow);
        }
        
        if self.has_time_lock_pattern(expr) {
            patterns.push(ContractPattern::TimeLock);
        }
        
        if self.has_token_sale_pattern(expr) {
            patterns.push(ContractPattern::TokenSale);
        }
        
        if self.has_atomic_swap_pattern(expr) {
            patterns.push(ContractPattern::AtomicSwap);
        }
        
        if self.has_refund_pattern(expr) {
            patterns.push(ContractPattern::Refund);
        }
        
        self.current_analysis.contract.metadata.identified_patterns = patterns;
        Ok(())
    }
    
    fn analyze_expression(&mut self, expr: &Expression) -> Result<(), AnalysisError> {
        match expr {
            Expression::IfElse { condition, then_branch, else_branch } => {
                self.analyze_conditional(condition, then_branch, else_branch.as_deref())?;
            }
            Expression::LogicalOr(left, right) => {
                self.analyze_guard_pattern(left, right)?;
            }
            Expression::LogicalAnd(left, right) => {
                self.analyze_validation_chain(left, right)?;
            }
            Expression::AllOf(collection) => {
                self.analyze_all_of_pattern(collection)?;
            }
            Expression::AnyOf(collection) => {
                self.analyze_any_of_pattern(collection)?;
            }
            Expression::Let { name, value, body } => {
                self.analyze_let_binding(name, value, body)?;
            }
            Expression::Equal(left, right) => {
                self.analyze_equality_check(left, right)?;
            }
            Expression::BoxAccess(box_expr, field) => {
                self.analyze_box_access(box_expr, field)?;
            }
            Expression::SigmaProp(inner) => {
                self.analyze_sigma_prop(inner)?;
            }
            _ => {
                // Recursively analyze sub-expressions
                self.analyze_sub_expressions(expr)?;
            }
        }
        
        Ok(())
    }
    
    fn analyze_conditional(
        &mut self,
        condition: &Expression,
        then_branch: &Expression,
        else_branch: Option<&Expression>,
    ) -> Result<(), AnalysisError> {
        let condition_str = self.expression_to_string(condition);
        
        // Push if context
        self.context_stack.push(AnalysisContext {
            context_type: ContextType::IfBranch,
            depth: self.context_stack.len(),
            parent_condition: Some(condition_str.clone()),
        });
        
        let mut then_actions = Vec::new();
        self.extract_actions_from_expression(then_branch, &mut then_actions)?;
        self.analyze_expression(then_branch)?;
        
        self.context_stack.pop();
        
        let mut else_actions = Vec::new();
        if let Some(else_expr) = else_branch {
            // Push else context
            self.context_stack.push(AnalysisContext {
                context_type: ContextType::ElseBranch,
                depth: self.context_stack.len(),
                parent_condition: Some(format!("NOT ({})", condition_str)),
            });
            
            self.extract_actions_from_expression(else_expr, &mut else_actions)?;
            self.analyze_expression(else_expr)?;
            
            self.context_stack.pop();
        }
        
        // Determine path type
        let path_type = if self.is_refund_condition(condition) {
            PathType::RefundPath
        } else if self.is_guard_condition(condition) {
            PathType::GuardPath
        } else {
            PathType::MainFlow
        };
        
        self.current_analysis.conditional_paths.push(ConditionalPath {
            condition: condition_str,
            then_actions,
            else_actions,
            path_type,
        });
        
        Ok(())
    }
    
    fn analyze_guard_pattern(&mut self, left: &Expression, right: &Expression) -> Result<(), AnalysisError> {
        // Check if this is a guard script pattern (ownerPk || contractLogic)
        if self.is_owner_pk_expression(left) {
            self.current_analysis.flow_patterns.push(FlowPattern {
                pattern_type: ContractPattern::GuardScript,
                description: "Owner can bypass contract logic".to_string(),
                involved_boxes: vec![BoxReference::Self_],
                conditions: vec![self.expression_to_string(left)],
            });
            
            // Analyze the contract logic part
            self.analyze_expression(right)?;
        } else {
            // Analyze both sides
            self.analyze_expression(left)?;
            self.analyze_expression(right)?;
        }
        
        Ok(())
    }
    
    fn analyze_validation_chain(&mut self, left: &Expression, right: &Expression) -> Result<(), AnalysisError> {
        // Extract validation checks from AND chains
        self.extract_validation_check(left)?;
        self.extract_validation_check(right)?;
        
        // Recursively analyze sub-expressions
        self.analyze_expression(left)?;
        self.analyze_expression(right)?;
        
        Ok(())
    }
    
    fn analyze_all_of_pattern(&mut self, collection: &Expression) -> Result<(), AnalysisError> {
        // AllOf typically contains a collection of validation conditions
        if let Expression::Collection(elements) = collection {
            for element in elements {
                self.extract_validation_check(element)?;
                self.analyze_expression(element)?;
            }
        } else {
            self.analyze_expression(collection)?;
        }
        
        Ok(())
    }
    
    fn analyze_any_of_pattern(&mut self, collection: &Expression) -> Result<(), AnalysisError> {
        // AnyOf represents alternative validation paths
        if let Expression::Collection(elements) = collection {
            for element in elements {
                self.analyze_expression(element)?;
            }
        } else {
            self.analyze_expression(collection)?;
        }
        
        Ok(())
    }
    
    fn analyze_let_binding(&mut self, name: &str, value: &Expression, body: &Expression) -> Result<(), AnalysisError> {
        // Store variable binding for reference resolution
        self.variable_bindings.insert(name.to_string(), value.clone());
        
        // Push let context
        self.context_stack.push(AnalysisContext {
            context_type: ContextType::LetBinding,
            depth: self.context_stack.len(),
            parent_condition: None,
        });
        
        // Analyze value and body
        self.analyze_expression(value)?;
        self.analyze_expression(body)?;
        
        self.context_stack.pop();
        Ok(())
    }
    
    fn analyze_equality_check(&mut self, left: &Expression, right: &Expression) -> Result<(), AnalysisError> {
        // Identify what kind of equality check this is
        let check_description = format!("{} == {}", 
            self.expression_to_string(left), 
            self.expression_to_string(right)
        );
        
        // Determine validation type based on the expressions
        let validation_type = if self.is_token_related(left) || self.is_token_related(right) {
            ValidationType::TokenValidation
        } else if self.is_value_related(left) || self.is_value_related(right) {
            ValidationType::ValueValidation
        } else if self.is_register_related(left) || self.is_register_related(right) {
            ValidationType::RegisterValidation
        } else if self.is_proposition_related(left) || self.is_proposition_related(right) {
            ValidationType::PropositionValidation
        } else {
            ValidationType::ExistenceCheck
        };
        
        let target_box = self.extract_box_reference(left).unwrap_or(BoxReference::Self_);
        
        self.current_analysis.validation_checks.push(ValidationCheck {
            check_type: validation_type,
            description: check_description,
            target: target_box,
            field: self.extract_box_field(left),
            expected_value: Some(self.expression_to_string(right)),
        });
        
        Ok(())
    }
    
    fn analyze_box_access(&mut self, box_expr: &Expression, field: &BoxField) -> Result<(), AnalysisError> {
        let box_ref = self.extract_box_reference(box_expr).unwrap_or(BoxReference::Self_);
        
        // Track box access patterns for flow analysis
        match field {
            BoxField::Tokens => {
                self.analyze_token_access(&box_ref)?;
            }
            BoxField::Value => {
                self.analyze_value_access(&box_ref)?;
            }
            BoxField::Register(_) => {
                self.analyze_register_access(&box_ref, field)?;
            }
            _ => {}
        }
        
        Ok(())
    }
    
    fn analyze_sigma_prop(&mut self, inner: &Expression) -> Result<(), AnalysisError> {
        // SigmaProp wrapping typically indicates the final contract result
        self.analyze_expression(inner)?;
        Ok(())
    }
    
    fn analyze_sub_expressions(&mut self, expr: &Expression) -> Result<(), AnalysisError> {
        match expr {
            Expression::Add(left, right) |
            Expression::Subtract(left, right) |
            Expression::Multiply(left, right) |
            Expression::Divide(left, right) |
            Expression::Modulo(left, right) |
            Expression::Greater(left, right) |
            Expression::GreaterEqual(left, right) |
            Expression::Less(left, right) |
            Expression::LessEqual(left, right) |
            Expression::NotEqual(left, right) => {
                self.analyze_expression(left)?;
                self.analyze_expression(right)?;
            }
            Expression::Not(expr) |
            Expression::Size(expr) |
            Expression::IsDefined(expr) |
            Expression::ToLong(expr) |
            Expression::ToByteArray(expr) => {
                self.analyze_expression(expr)?;
            }
            Expression::Get(collection, index) => {
                self.analyze_expression(collection)?;
                self.analyze_expression(index)?;
            }
            Expression::Collection(elements) |
            Expression::Tuple(elements) => {
                for element in elements {
                    self.analyze_expression(element)?;
                }
            }
            Expression::FunctionCall { name: _, args } => {
                for arg in args {
                    self.analyze_expression(arg)?;
                }
            }
            Expression::Lambda { param: _, body } => {
                self.analyze_expression(body)?;
            }
            _ => {}
        }
        
        Ok(())
    }
    
    // Pattern detection methods
    fn has_guard_script_pattern(&self, expr: &Expression) -> bool {
        matches!(expr, Expression::LogicalOr(left, _) if self.is_owner_pk_expression(left))
    }
    
    fn has_dex_pattern(&self, expr: &Expression) -> bool {
        let expr_str = self.expression_to_string(expr);
        expr_str.contains("OUTPUTS") && 
        expr_str.contains("tokens") && 
        (expr_str.contains("price") || expr_str.contains("rate") || expr_str.contains("exchange"))
    }
    
    fn has_escrow_pattern(&self, expr: &Expression) -> bool {
        let expr_str = self.expression_to_string(expr);
        expr_str.contains("OUTPUTS") && 
        (expr_str.contains("arbiter") || expr_str.contains("escrow") || 
         expr_str.contains("release") || expr_str.contains("dispute"))
    }
    
    fn has_time_lock_pattern(&self, expr: &Expression) -> bool {
        let expr_str = self.expression_to_string(expr);
        expr_str.contains("HEIGHT") || expr_str.contains("timestamp") || 
        expr_str.contains("creationInfo") || expr_str.contains("CONTEXT.headers")
    }
    
    fn has_token_sale_pattern(&self, expr: &Expression) -> bool {
        let expr_str = self.expression_to_string(expr);
        expr_str.contains("tokens") && expr_str.contains("price") && 
        (expr_str.contains("sale") || expr_str.contains("service") || 
         self.contains_token_arithmetic(&expr_str))
    }
    
    fn has_atomic_swap_pattern(&self, expr: &Expression) -> bool {
        let expr_str = self.expression_to_string(expr);
        expr_str.contains("blake2b256") || expr_str.contains("sha256") ||
        (expr_str.contains("secret") && expr_str.contains("hash"))
    }
    
    fn has_refund_pattern(&self, expr: &Expression) -> bool {
        let expr_str = self.expression_to_string(expr);
        expr_str.contains("refund") || 
        (expr_str.contains("if") && expr_str.contains("else") && 
         expr_str.contains("OUTPUTS") && expr_str.contains("value"))
    }
    
    // Helper methods
    fn is_owner_pk_expression(&self, expr: &Expression) -> bool {
        let expr_str = self.expression_to_string(expr);
        expr_str.contains("ownerPk") || expr_str.contains("owner") || 
        expr_str.contains("proveDlog") || expr_str.contains("pubKey")
    }
    
    fn is_refund_condition(&self, expr: &Expression) -> bool {
        let expr_str = self.expression_to_string(expr);
        expr_str.contains("refund") || expr_str.contains("cancel") ||
        expr_str.contains("HEIGHT") || expr_str.contains("timeout")
    }
    
    fn is_guard_condition(&self, expr: &Expression) -> bool {
        self.is_owner_pk_expression(expr)
    }
    
    fn is_token_related(&self, expr: &Expression) -> bool {
        let expr_str = self.expression_to_string(expr);
        expr_str.contains("tokens") || expr_str.contains("tokenId") ||
        expr_str.contains("Token") || expr_str.contains("NFT")
    }
    
    fn is_value_related(&self, expr: &Expression) -> bool {
        let expr_str = self.expression_to_string(expr);
        expr_str.contains("value") || expr_str.contains("ERG") ||
        expr_str.contains("nanoErgs")
    }
    
    fn is_register_related(&self, expr: &Expression) -> bool {
        let expr_str = self.expression_to_string(expr);
        expr_str.contains("R4") || expr_str.contains("R5") || 
        expr_str.contains("R6") || expr_str.contains("R7") ||
        expr_str.contains("R8") || expr_str.contains("R9")
    }
    
    fn is_proposition_related(&self, expr: &Expression) -> bool {
        let expr_str = self.expression_to_string(expr);
        expr_str.contains("propositionBytes") || expr_str.contains("script") ||
        expr_str.contains("contract")
    }
    
    fn contains_token_arithmetic(&self, expr_str: &str) -> bool {
        (expr_str.contains("tokens") && expr_str.contains("-")) ||
        (expr_str.contains("tokens") && expr_str.contains("+")) ||
        (expr_str.contains("tokens") && expr_str.contains("*"))
    }
    
    fn extract_box_reference(&self, expr: &Expression) -> Option<BoxReference> {
        match expr {
            Expression::Identifier(name) => match name.as_str() {
                "SELF" => Some(BoxReference::Self_),
                "OUTPUTS" => Some(BoxReference::Outputs(OutputsAccess::All)),
                _ => None,
            },
            Expression::BoxAccess(box_expr, _) => self.extract_box_reference(box_expr),
            Expression::Get(box_expr, index) => {
                match (self.extract_box_reference(box_expr)?, index.as_ref()) {
                    (BoxReference::Outputs(_), Expression::Integer(i)) => {
                        Some(BoxReference::Outputs(OutputsAccess::Index(*i as usize)))
                    }
                    _ => None,
                }
            }
            _ => None,
        }
    }
    
    fn extract_box_field(&self, expr: &Expression) -> Option<BoxField> {
        match expr {
            Expression::BoxAccess(_, field) => Some(field.clone()),
            _ => None,
        }
    }
    
    fn expression_to_string(&self, expr: &Expression) -> String {
        match expr {
            Expression::Boolean(b) => b.to_string(),
            Expression::Integer(i) => i.to_string(),
            Expression::ByteArray(bytes) => format!("0x{}", hex::encode(bytes)),
            Expression::Identifier(name) => name.clone(),
            Expression::Equal(left, right) => {
                format!("{} == {}", self.expression_to_string(left), self.expression_to_string(right))
            }
            Expression::LogicalAnd(left, right) => {
                format!("({} && {})", self.expression_to_string(left), self.expression_to_string(right))
            }
            Expression::LogicalOr(left, right) => {
                format!("({} || {})", self.expression_to_string(left), self.expression_to_string(right))
            }
            Expression::IfElse { condition, then_branch, else_branch } => {
                let else_part = else_branch.as_ref()
                    .map(|e| format!(" else {}", self.expression_to_string(e)))
                    .unwrap_or_default();
                format!("if ({}) {}{}", 
                    self.expression_to_string(condition),
                    self.expression_to_string(then_branch),
                    else_part)
            }
            Expression::BoxAccess(box_expr, field) => {
                format!("{}.{:?}", self.expression_to_string(box_expr), field)
            }
            Expression::AllOf(collection) => {
                format!("allOf({})", self.expression_to_string(collection))
            }
            Expression::SigmaProp(inner) => {
                format!("sigmaProp({})", self.expression_to_string(inner))
            }
            _ => "expr".to_string(),
        }
    }
    
    fn extract_actions_from_expression(&self, expr: &Expression, actions: &mut Vec<Action>) -> Result<(), AnalysisError> {
        match expr {
            Expression::Equal(left, right) => {
                if self.is_token_related(left) || self.is_token_related(right) {
                    actions.push(Action {
                        action_type: ActionType::ValidateBox,
                        description: format!("Validate token: {} == {}", 
                            self.expression_to_string(left), 
                            self.expression_to_string(right)),
                        target: self.extract_box_reference(left),
                    });
                }
            }
            Expression::GreaterEqual(left, right) => {
                if self.is_value_related(left) || self.is_value_related(right) {
                    actions.push(Action {
                        action_type: ActionType::TransferErg,
                        description: format!("Ensure minimum value: {} >= {}", 
                            self.expression_to_string(left), 
                            self.expression_to_string(right)),
                        target: self.extract_box_reference(left),
                    });
                }
            }
            Expression::LogicalAnd(left, right) => {
                self.extract_actions_from_expression(left, actions)?;
                self.extract_actions_from_expression(right, actions)?;
            }
            Expression::AllOf(collection) => {
                if let Expression::Collection(elements) = collection.as_ref() {
                    for element in elements {
                        self.extract_actions_from_expression(element, actions)?;
                    }
                }
            }
            _ => {}
        }
        Ok(())
    }
    
    fn extract_validation_check(&mut self, expr: &Expression) -> Result<(), AnalysisError> {
        match expr {
            Expression::Equal(left, right) => {
                self.analyze_equality_check(left, right)?;
            }
            Expression::GreaterEqual(left, right) |
            Expression::Greater(left, right) |
            Expression::LessEqual(left, right) |
            Expression::Less(left, right) => {
                let validation_type = if self.is_value_related(left) || self.is_value_related(right) {
                    ValidationType::ValueValidation
                } else {
                    ValidationType::SizeValidation
                };
                
                self.current_analysis.validation_checks.push(ValidationCheck {
                    check_type: validation_type,
                    description: format!("{} comparison", self.expression_to_string(expr)),
                    target: self.extract_box_reference(left).unwrap_or(BoxReference::Self_),
                    field: self.extract_box_field(left),
                    expected_value: Some(self.expression_to_string(right)),
                });
            }
            _ => {}
        }
        Ok(())
    }
    
    fn analyze_token_access(&mut self, box_ref: &BoxReference) -> Result<(), AnalysisError> {
        self.current_analysis.token_operations.push(TokenOperation {
            operation_type: TokenOpType::Validate,
            token_id: None,
            amount_expression: "tokens".to_string(),
            source_box: box_ref.clone(),
            target_box: None,
            description: format!("Token access on {:?}", box_ref),
        });
        Ok(())
    }
    
    fn analyze_value_access(&mut self, box_ref: &BoxReference) -> Result<(), AnalysisError> {
        self.current_analysis.erg_flows.push(ErgFlow {
            source_box: box_ref.clone(),
            target_box: BoxReference::Self_, // Default target
            amount_expression: "value".to_string(),
            flow_type: ErgFlowType::Payment,
            description: format!("ERG value access on {:?}", box_ref),
        });
        Ok(())
    }
    
    fn analyze_register_access(&mut self, box_ref: &BoxReference, field: &BoxField) -> Result<(), AnalysisError> {
        self.current_analysis.validation_checks.push(ValidationCheck {
            check_type: ValidationType::RegisterValidation,
            description: format!("Register access: {:?} on {:?}", field, box_ref),
            target: box_ref.clone(),
            field: Some(field.clone()),
            expected_value: None,
        });
        Ok(())
    }
    
    fn extract_flow_patterns(&mut self) -> Result<(), AnalysisError> {
        // Analyze collected data to identify high-level flow patterns
        
        // Group related validation checks into flow patterns
        let mut token_validations = 0;
        let mut value_validations = 0;
        let mut register_validations = 0;
        
        for check in &self.current_analysis.validation_checks {
            match check.check_type {
                ValidationType::TokenValidation => token_validations += 1,
                ValidationType::ValueValidation => value_validations += 1,
                ValidationType::RegisterValidation => register_validations += 1,
                _ => {}
            }
        }
        
        // Add flow patterns based on validation patterns
        if token_validations > 0 && value_validations > 0 {
            self.current_analysis.flow_patterns.push(FlowPattern {
                pattern_type: ContractPattern::DEX,
                description: "Token/ERG exchange pattern detected".to_string(),
                involved_boxes: vec![BoxReference::Self_, BoxReference::Outputs(OutputsAccess::All)],
                conditions: vec!["Token and value validations present".to_string()],
            });
        }
        
        if register_validations > 2 {
            self.current_analysis.flow_patterns.push(FlowPattern {
                pattern_type: ContractPattern::Escrow,
                description: "Complex state management pattern".to_string(),
                involved_boxes: vec![BoxReference::Self_],
                conditions: vec!["Multiple register validations".to_string()],
            });
        }
        
        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AnalysisError {
    #[error("Invalid expression structure: {message}")]
    InvalidExpression { message: String },
    #[error("Unsupported pattern: {pattern}")]
    UnsupportedPattern { pattern: String },
    #[error("Analysis context error: {message}")]
    ContextError { message: String },
}

// Add hex encoding for ByteArray display
mod hex {
    pub fn encode(bytes: &[u8]) -> String {
        bytes.iter().map(|b| format!("{:02x}", b)).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_contract(body: Expression) -> Contract {
        Contract::new(body)
    }
    
    #[test]
    fn test_guard_script_detection() {
        let contract = create_test_contract(Expression::LogicalOr(
            Box::new(Expression::Identifier("ownerPk".to_string())),
            Box::new(Expression::Boolean(true)),
        ));
        
        let analyzer = FlowAnalyzer::new(contract);
        let analysis = analyzer.analyze().unwrap();
        
        assert!(analysis.contract.metadata.identified_patterns.contains(&ContractPattern::GuardScript));
    }
    
    #[test]
    fn test_conditional_analysis() {
        let contract = create_test_contract(Expression::IfElse {
            condition: Box::new(Expression::Boolean(true)),
            then_branch: Box::new(Expression::Integer(1)),
            else_branch: Some(Box::new(Expression::Integer(0))),
        });
        
        let analyzer = FlowAnalyzer::new(contract);
        let analysis = analyzer.analyze().unwrap();
        
        assert_eq!(analysis.conditional_paths.len(), 1);
    }
    
    #[test]
    fn test_validation_extraction() {
        let contract = create_test_contract(Expression::Equal(
            Box::new(Expression::BoxAccess(
                Box::new(Expression::Identifier("SELF".to_string())),
                BoxField::Value,
            )),
            Box::new(Expression::Integer(1000)),
        ));
        
        let analyzer = FlowAnalyzer::new(contract);
        let analysis = analyzer.analyze().unwrap();
        
        assert!(!analysis.validation_checks.is_empty());
        assert_eq!(analysis.validation_checks[0].check_type, ValidationType::ValueValidation);
    }
}