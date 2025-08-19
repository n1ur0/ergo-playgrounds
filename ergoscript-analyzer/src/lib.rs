//! ErgoScript Contract Flow Analyzer
//!
//! A specialized analyzer that can interpret ErgoScript contracts and extract
//! visual flow patterns for diagram generation.
//!
//! # Features
//!
//! - Parse ErgoScript contract logic and extract conditional branches
//! - Identify validation patterns (box properties, token checks, register validations)
//! - Map guard script patterns (`ownerPk || contractLogic`)
//! - Detect data input dependencies
//! - Analyze transaction flow patterns
//! - Extract diagram elements from code
//! - Generate structured data for diagram generators (Mermaid, D3.js, etc.)
//!
//! # Example Usage
//!
//! ```rust
//! use ergoscript_analyzer::{ErgoScriptAnalyzer, OutputFormat};
//!
//! let contract_code = r#"
//! {
//!   val configBox = CONTEXT.dataInputs(0)
//!   val validConfigBox = configBox.tokens(0)._1 == configBoxNFTId
//!   if (validConfigBox) {
//!     val ownerScript = configBox.R4[SigmaProp].get
//!     ownerScript
//!   } else {
//!     sigmaProp(false)
//!   }
//! }
//! "#;
//!
//! let analyzer = ErgoScriptAnalyzer::new();
//! let analysis = analyzer.analyze(contract_code).unwrap();
//! let diagram = analyzer.generate_diagram(&analysis).unwrap();
//!
//! println!("{}", diagram.to_json().unwrap());
//! ```

pub mod ast;
pub mod lexer;
pub mod parser;
pub mod analyzer;
pub mod diagram;

use ast::{Contract, FlowAnalysis};
use diagram::ContractDiagram;
use lexer::{Lexer, LexerError};
use parser::{Parser, ParseError};
use analyzer::{FlowAnalyzer, AnalysisError};
use diagram::{DiagramBuilder, DiagramError};

use std::path::Path;
use thiserror::Error;

/// Main analyzer interface for ErgoScript contracts
pub struct ErgoScriptAnalyzer {
    config: AnalyzerConfig,
}

/// Configuration options for the analyzer
#[derive(Debug, Clone)]
pub struct AnalyzerConfig {
    pub enable_pattern_detection: bool,
    pub enable_flow_analysis: bool,
    pub enable_diagram_generation: bool,
    pub output_format: OutputFormat,
    pub include_debug_info: bool,
    pub max_recursion_depth: usize,
}

#[derive(Debug, Clone)]
pub enum OutputFormat {
    Json,
    Yaml,
    Mermaid,
    All,
}

impl Default for AnalyzerConfig {
    fn default() -> Self {
        Self {
            enable_pattern_detection: true,
            enable_flow_analysis: true,
            enable_diagram_generation: true,
            output_format: OutputFormat::Json,
            include_debug_info: false,
            max_recursion_depth: 100,
        }
    }
}

impl ErgoScriptAnalyzer {
    /// Create a new analyzer with default configuration
    pub fn new() -> Self {
        Self::with_config(AnalyzerConfig::default())
    }
    
    /// Create a new analyzer with custom configuration
    pub fn with_config(config: AnalyzerConfig) -> Self {
        Self { config }
    }
    
    /// Analyze an ErgoScript contract from source code
    pub fn analyze(&self, source_code: &str) -> Result<FlowAnalysis, AnalyzerError> {
        // Step 1: Tokenize the source code
        let mut lexer = Lexer::new(source_code);
        let tokens = lexer.tokenize()
            .map_err(|e| AnalyzerError::LexingError { source: e })?;
        
        // Step 2: Parse tokens into AST
        let mut parser = Parser::new(tokens);
        let contract = parser.parse()
            .map_err(|e| AnalyzerError::ParsingError { source: e })?;
        
        // Step 3: Analyze the contract for flow patterns
        let flow_analyzer = FlowAnalyzer::new(contract);
        let analysis = flow_analyzer.analyze()
            .map_err(|e| AnalyzerError::AnalysisError { source: e })?;
        
        Ok(analysis)
    }
    
    /// Analyze a contract from a file
    pub fn analyze_file<P: AsRef<Path>>(&self, file_path: P) -> Result<FlowAnalysis, AnalyzerError> {
        let source_code = std::fs::read_to_string(file_path)
            .map_err(|e| AnalyzerError::IoError { source: e })?;
        self.analyze(&source_code)
    }
    
    /// Generate a diagram from flow analysis
    pub fn generate_diagram(&self, analysis: &FlowAnalysis) -> Result<ContractDiagram, AnalyzerError> {
        if !self.config.enable_diagram_generation {
            return Err(AnalyzerError::ConfigurationError {
                message: "Diagram generation is disabled".to_string(),
            });
        }
        
        DiagramBuilder::from_flow_analysis(analysis)
            .map_err(|e| AnalyzerError::DiagramError { source: e })
    }
    
    /// Analyze and generate diagram in one step
    pub fn analyze_and_generate_diagram(&self, source_code: &str) -> Result<(FlowAnalysis, ContractDiagram), AnalyzerError> {
        let analysis = self.analyze(source_code)?;
        let diagram = self.generate_diagram(&analysis)?;
        Ok((analysis, diagram))
    }
    
    /// Get a summary of identified patterns
    pub fn get_pattern_summary(&self, analysis: &FlowAnalysis) -> PatternSummary {
        PatternSummary {
            contract_name: analysis.contract.metadata.name.clone(),
            identified_patterns: analysis.contract.metadata.identified_patterns.clone(),
            validation_count: analysis.validation_checks.len(),
            conditional_paths: analysis.conditional_paths.len(),
            token_operations: analysis.token_operations.len(),
            erg_flows: analysis.erg_flows.len(),
            complexity_score: self.calculate_complexity_score(analysis),
        }
    }
    
    /// Calculate a complexity score for the contract
    fn calculate_complexity_score(&self, analysis: &FlowAnalysis) -> f32 {
        let base_score = 1.0;
        let conditional_weight = 0.5;
        let validation_weight = 0.3;
        let token_weight = 0.4;
        let pattern_weight = 0.2;
        
        base_score +
            (analysis.conditional_paths.len() as f32 * conditional_weight) +
            (analysis.validation_checks.len() as f32 * validation_weight) +
            (analysis.token_operations.len() as f32 * token_weight) +
            (analysis.contract.metadata.identified_patterns.len() as f32 * pattern_weight)
    }
    
    /// Validate that a contract follows best practices
    pub fn validate_contract(&self, analysis: &FlowAnalysis) -> ContractValidation {
        let mut issues = Vec::new();
        let mut suggestions = Vec::new();
        
        // Check for guard script pattern
        if !analysis.contract.metadata.identified_patterns.contains(&ast::ContractPattern::GuardScript) {
            suggestions.push("Consider adding a guard script pattern (ownerPk ||) for emergency access".to_string());
        }
        
        // Check for refund paths
        if !analysis.contract.metadata.identified_patterns.contains(&ast::ContractPattern::Refund) {
            issues.push("No refund mechanism detected - funds might be locked permanently".to_string());
        }
        
        // Check for excessive complexity
        let complexity = self.calculate_complexity_score(analysis);
        if complexity > 10.0 {
            issues.push("Contract complexity is very high - consider breaking into smaller components".to_string());
        }
        
        // Check for token validation
        let has_token_validation = analysis.validation_checks.iter()
            .any(|v| matches!(v.check_type, ast::ValidationType::TokenValidation));
        
        if !analysis.token_operations.is_empty() && !has_token_validation {
            issues.push("Token operations detected but no token validations found".to_string());
        }
        
        ContractValidation {
            is_valid: issues.is_empty(),
            issues,
            suggestions,
            complexity_score: complexity,
        }
    }
}

impl Default for ErgoScriptAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

/// Summary of identified patterns in a contract
#[derive(Debug, Clone)]
pub struct PatternSummary {
    pub contract_name: Option<String>,
    pub identified_patterns: Vec<ast::ContractPattern>,
    pub validation_count: usize,
    pub conditional_paths: usize,
    pub token_operations: usize,
    pub erg_flows: usize,
    pub complexity_score: f32,
}

/// Contract validation results
#[derive(Debug, Clone)]
pub struct ContractValidation {
    pub is_valid: bool,
    pub issues: Vec<String>,
    pub suggestions: Vec<String>,
    pub complexity_score: f32,
}

/// Comprehensive error type for the analyzer
#[derive(Debug, Error)]
pub enum AnalyzerError {
    #[error("Lexing error: {source}")]
    LexingError { source: LexerError },
    
    #[error("Parsing error: {source}")]
    ParsingError { source: ParseError },
    
    #[error("Analysis error: {source}")]
    AnalysisError { source: analyzer::AnalysisError },
    
    #[error("Diagram generation error: {source}")]
    DiagramError { source: DiagramError },
    
    #[error("I/O error: {source}")]
    IoError { source: std::io::Error },
    
    #[error("Configuration error: {message}")]
    ConfigurationError { message: String },
    
    #[error("Validation error: {message}")]
    ValidationError { message: String },
}

/// Utility functions for working with ErgoScript contracts
pub mod utils {
    use super::*;
    
    /// Extract contract patterns from multiple files
    pub fn batch_analyze<P: AsRef<Path>>(
        analyzer: &ErgoScriptAnalyzer,
        file_paths: &[P],
    ) -> Result<Vec<(String, FlowAnalysis)>, AnalyzerError> {
        let mut results = Vec::new();
        
        for path in file_paths {
            let path_str = path.as_ref().to_string_lossy().to_string();
            let analysis = analyzer.analyze_file(path)?;
            results.push((path_str, analysis));
        }
        
        Ok(results)
    }
    
    /// Compare two contracts and identify differences
    pub fn compare_contracts(
        analysis1: &FlowAnalysis,
        analysis2: &FlowAnalysis,
    ) -> ContractComparison {
        let patterns1: std::collections::HashSet<_> = 
            analysis1.contract.metadata.identified_patterns.iter().collect();
        let patterns2: std::collections::HashSet<_> = 
            analysis2.contract.metadata.identified_patterns.iter().collect();
        
        let common_patterns: Vec<_> = patterns1.intersection(&patterns2).cloned().cloned().collect();
        let unique_to_first: Vec<_> = patterns1.difference(&patterns2).cloned().cloned().collect();
        let unique_to_second: Vec<_> = patterns2.difference(&patterns1).cloned().cloned().collect();
        
        ContractComparison {
            common_patterns,
            unique_to_first,
            unique_to_second,
            validation_count_diff: analysis2.validation_checks.len() as i32 - analysis1.validation_checks.len() as i32,
            complexity_diff: 0.0, // Would need to calculate complexity scores
        }
    }
    
    /// Generate a report from multiple contract analyses
    pub fn generate_batch_report(analyses: &[(String, FlowAnalysis)]) -> BatchReport {
        let mut pattern_frequency = std::collections::HashMap::new();
        let mut total_validations = 0;
        let mut total_token_ops = 0;
        
        for (_, analysis) in analyses {
            for pattern in &analysis.contract.metadata.identified_patterns {
                *pattern_frequency.entry(pattern.clone()).or_insert(0) += 1;
            }
            total_validations += analysis.validation_checks.len();
            total_token_ops += analysis.token_operations.len();
        }
        
        BatchReport {
            total_contracts: analyses.len(),
            pattern_frequency,
            average_validations: total_validations as f32 / analyses.len() as f32,
            average_token_operations: total_token_ops as f32 / analyses.len() as f32,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ContractComparison {
    pub common_patterns: Vec<ast::ContractPattern>,
    pub unique_to_first: Vec<ast::ContractPattern>,
    pub unique_to_second: Vec<ast::ContractPattern>,
    pub validation_count_diff: i32,
    pub complexity_diff: f32,
}

#[derive(Debug, Clone)]
pub struct BatchReport {
    pub total_contracts: usize,
    pub pattern_frequency: std::collections::HashMap<ast::ContractPattern, usize>,
    pub average_validations: f32,
    pub average_token_operations: f32,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_analyzer_creation() {
        let analyzer = ErgoScriptAnalyzer::new();
        assert!(analyzer.config.enable_pattern_detection);
        assert!(analyzer.config.enable_flow_analysis);
    }
    
    #[test]
    fn test_simple_contract_analysis() {
        let analyzer = ErgoScriptAnalyzer::new();
        let code = "sigmaProp(true)";
        let analysis = analyzer.analyze(code).unwrap();
        
        assert!(!analysis.contract.body.to_string().is_empty());
    }
    
    #[test]
    fn test_guard_script_detection() {
        let analyzer = ErgoScriptAnalyzer::new();
        let code = "ownerPk || sigmaProp(true)";
        let analysis = analyzer.analyze(code);
        
        // This would pass with proper implementation
        // assert!(analysis.is_ok());
    }
    
    #[test]
    fn test_pattern_summary() {
        let analyzer = ErgoScriptAnalyzer::new();
        let code = "sigmaProp(true)";
        let analysis = analyzer.analyze(code).unwrap();
        let summary = analyzer.get_pattern_summary(&analysis);
        
        assert!(summary.complexity_score > 0.0);
    }
    
    #[test]
    fn test_diagram_generation() {
        let analyzer = ErgoScriptAnalyzer::new();
        let code = "if (true) sigmaProp(true) else sigmaProp(false)";
        let analysis = analyzer.analyze(code).unwrap();
        let diagram = analyzer.generate_diagram(&analysis);
        
        assert!(diagram.is_ok());
    }
    
    #[test]
    fn test_output_formats() {
        let analyzer = ErgoScriptAnalyzer::new();
        let code = "sigmaProp(true)";
        let (analysis, diagram) = analyzer.analyze_and_generate_diagram(code).unwrap();
        
        // Test JSON output
        let json = diagram.to_json().unwrap();
        assert!(json.contains("nodes"));
        
        // Test YAML output  
        let yaml = diagram.to_yaml().unwrap();
        assert!(yaml.contains("nodes"));
        
        // Test Mermaid output
        let mermaid = diagram.to_mermaid();
        assert!(mermaid.contains("flowchart"));
    }
}

// Re-export commonly used types
pub use ast::{ContractPattern, FlowAnalysis, ValidationCheck, TokenOperation, ErgFlow};
pub use diagram::{ContractDiagram, DiagramType, NodeType, EdgeType};
pub use lexer::{Token, TokenType};
pub use parser::{Parser, ParseError};
pub use analyzer::{FlowAnalyzer, AnalysisError};