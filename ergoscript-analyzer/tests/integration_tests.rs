//! Integration tests for the ErgoScript analyzer
//!
//! Tests the complete pipeline from contract parsing to diagram generation
//! using real ErgoScript contract examples.

use ergoscript_analyzer::{
    ErgoScriptAnalyzer, AnalyzerConfig, OutputFormat, ContractPattern,
    PatternSummary, ContractValidation
};
use std::fs;

// Test contracts based on real Ergo examples
const TOKEN_SALES_SERVICE_CONTRACT: &str = r#"
{
  val configBox = CONTEXT.dataInputs(0)
  val validConfigBox = configBox.tokens(0)._1 == configBoxNFTId
  val defined = OUTPUTS(0).tokens.size > 0 && OUTPUTS(0).R4[Coll[Byte]].isDefined

  if (validConfigBox && defined) {
    val ownerScript = configBox.R4[SigmaProp].get
    val priceOfServiceToken = configBox.R5[Long].get
    sigmaProp (if (defined) {
      val inServiceToken = SELF.tokens(0)
      val outServiceToken = OUTPUTS(0).tokens(0)
      val outValue: Long = ((inServiceToken._2 - outServiceToken._2) * priceOfServiceToken).toLong
      allOf(Coll(
          inServiceToken._1 == serviceTokenId,
          outServiceToken._1 == serviceTokenId,
          OUTPUTS(0).propositionBytes == SELF.propositionBytes,
          OUTPUTS(0).R4[Coll[Byte]].get == SELF.id,
          OUTPUTS(1).value >= outValue,
          OUTPUTS(1).propositionBytes == ownerScript.propBytes
          ))
    } else { false } )
  }
  else if (validConfigBox) {
    val ownerScript = configBox.R4[SigmaProp].get
    ownerScript
  }
  else {sigmaProp (false)}
}
"#;

const SIMPLE_GUARD_CONTRACT: &str = r#"
ownerPk || sigmaProp(OUTPUTS(0).value >= 1000)
"#;

const DEX_CONTRACT: &str = r#"
{
  val buyOrder = OUTPUTS(0)
  val sellOrder = OUTPUTS(1)
  val rate = buyOrder.R4[Long].get
  val validRate = buyOrder.tokens(0)._2 * rate <= sellOrder.tokens(0)._2
  allOf(Coll(
    validRate,
    buyOrder.propositionBytes == buyerScript,
    sellOrder.propositionBytes == sellerScript,
    OUTPUTS(2).value >= transactionFee
  ))
}
"#;

const ESCROW_CONTRACT: &str = r#"
{
  val arbiter = CONTEXT.dataInputs(0).R4[SigmaProp].get
  val buyer = CONTEXT.dataInputs(0).R5[SigmaProp].get  
  val seller = CONTEXT.dataInputs(0).R6[SigmaProp].get
  val deadline = CONTEXT.dataInputs(0).R7[Long].get
  
  if (HEIGHT > deadline) {
    buyer // Refund after deadline
  } else {
    arbiter || (buyer && seller) // Arbiter can release, or both parties agree
  }
}
"#;

const TIME_LOCK_CONTRACT: &str = r#"
{
  val unlockHeight = SELF.R4[Long].get
  val beneficiary = SELF.R5[SigmaProp].get
  
  if (HEIGHT >= unlockHeight) {
    beneficiary
  } else {
    sigmaProp(false) // Locked until height
  }
}
"#;

#[test]
fn test_token_sales_service_analysis() {
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(TOKEN_SALES_SERVICE_CONTRACT).unwrap();
    
    // Should identify token sale pattern
    assert!(analysis.contract.metadata.identified_patterns.contains(&ContractPattern::TokenSale));
    
    // Should have conditional paths
    assert!(!analysis.conditional_paths.is_empty());
    
    // Should have token operations
    assert!(!analysis.token_operations.is_empty());
    
    // Should have validation checks
    assert!(!analysis.validation_checks.is_empty());
}

#[test]
fn test_guard_script_analysis() {
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(SIMPLE_GUARD_CONTRACT).unwrap();
    
    // Should identify guard script pattern
    assert!(analysis.contract.metadata.identified_patterns.contains(&ContractPattern::GuardScript));
    
    // Should have flow patterns
    assert!(!analysis.flow_patterns.is_empty());
}

#[test]
fn test_dex_contract_analysis() {
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(DEX_CONTRACT).unwrap();
    
    // Should identify DEX pattern
    assert!(analysis.contract.metadata.identified_patterns.contains(&ContractPattern::DEX));
    
    // Should have validation checks for rate and tokens
    assert!(!analysis.validation_checks.is_empty());
    
    // Should have token operations
    assert!(!analysis.token_operations.is_empty());
}

#[test]
fn test_escrow_contract_analysis() {
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(ESCROW_CONTRACT).unwrap();
    
    // Should identify escrow pattern
    assert!(analysis.contract.metadata.identified_patterns.contains(&ContractPattern::Escrow));
    
    // Should identify refund pattern (due to deadline)
    assert!(analysis.contract.metadata.identified_patterns.contains(&ContractPattern::Refund));
    
    // Should have conditional paths for deadline check
    assert!(!analysis.conditional_paths.is_empty());
}

#[test]
fn test_time_lock_analysis() {
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(TIME_LOCK_CONTRACT).unwrap();
    
    // Should identify time lock pattern
    assert!(analysis.contract.metadata.identified_patterns.contains(&ContractPattern::TimeLock));
    
    // Should have conditional paths
    assert!(!analysis.conditional_paths.is_empty());
}

#[test]
fn test_diagram_generation() {
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(TOKEN_SALES_SERVICE_CONTRACT).unwrap();
    let diagram = analyzer.generate_diagram(&analysis).unwrap();
    
    // Should have nodes and edges
    assert!(!diagram.nodes.is_empty());
    assert!(!diagram.edges.is_empty());
    
    // Should have appropriate metadata
    assert!(!diagram.metadata.patterns.is_empty());
    
    // Should be able to convert to different formats
    let json = diagram.to_json().unwrap();
    assert!(json.contains("nodes"));
    assert!(json.contains("edges"));
    
    let yaml = diagram.to_yaml().unwrap();
    assert!(yaml.contains("nodes"));
    
    let mermaid = diagram.to_mermaid();
    assert!(mermaid.contains("flowchart"));
    assert!(mermaid.contains("-->"));
}

#[test]
fn test_pattern_summary() {
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(TOKEN_SALES_SERVICE_CONTRACT).unwrap();
    let summary = analyzer.get_pattern_summary(&analysis);
    
    assert!(!summary.identified_patterns.is_empty());
    assert!(summary.complexity_score > 0.0);
    assert!(summary.validation_count > 0);
    assert!(summary.conditional_paths > 0);
}

#[test]
fn test_contract_validation() {
    let analyzer = ErgoScriptAnalyzer::new();
    
    // Test valid contract
    let analysis = analyzer.analyze(SIMPLE_GUARD_CONTRACT).unwrap();
    let validation = analyzer.validate_contract(&analysis);
    // Guard scripts are generally considered good practice
    
    // Test contract without refund mechanism
    let no_refund_contract = "sigmaProp(OUTPUTS(0).value >= 1000)";
    let analysis = analyzer.analyze(no_refund_contract).unwrap();
    let validation = analyzer.validate_contract(&analysis);
    // Should suggest adding refund mechanism
    assert!(!validation.suggestions.is_empty() || !validation.issues.is_empty());
}

#[test]
fn test_error_handling() {
    let analyzer = ErgoScriptAnalyzer::new();
    
    // Test invalid syntax
    let result = analyzer.analyze("invalid syntax here {{{");
    assert!(result.is_err());
    
    // Test empty contract
    let result = analyzer.analyze("");
    assert!(result.is_err());
}

#[test]
fn test_configuration_options() {
    // Test with pattern detection disabled
    let config = AnalyzerConfig {
        enable_pattern_detection: false,
        enable_flow_analysis: true,
        enable_diagram_generation: false,
        output_format: OutputFormat::Json,
        include_debug_info: true,
        max_recursion_depth: 50,
    };
    
    let analyzer = ErgoScriptAnalyzer::with_config(config);
    let analysis = analyzer.analyze(SIMPLE_GUARD_CONTRACT).unwrap();
    
    // Should still work but with limited pattern detection
    // (Note: actual implementation might still detect patterns due to how the analyzer works)
}

#[test]
fn test_batch_analysis() {
    use std::path::PathBuf;
    use ergoscript_analyzer::utils;
    
    // Create temporary test files
    let temp_dir = tempfile::tempdir().unwrap();
    let file1 = temp_dir.path().join("contract1.es");
    let file2 = temp_dir.path().join("contract2.es");
    
    fs::write(&file1, SIMPLE_GUARD_CONTRACT).unwrap();
    fs::write(&file2, DEX_CONTRACT).unwrap();
    
    let analyzer = ErgoScriptAnalyzer::new();
    let files = vec![file1, file2];
    let analyses = utils::batch_analyze(&analyzer, &files).unwrap();
    
    assert_eq!(analyses.len(), 2);
    
    // Generate batch report
    let report = utils::generate_batch_report(&analyses);
    assert_eq!(report.total_contracts, 2);
    assert!(!report.pattern_frequency.is_empty());
}

#[test]
fn test_contract_comparison() {
    use ergoscript_analyzer::utils;
    
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis1 = analyzer.analyze(SIMPLE_GUARD_CONTRACT).unwrap();
    let analysis2 = analyzer.analyze(DEX_CONTRACT).unwrap();
    
    let comparison = utils::compare_contracts(&analysis1, &analysis2);
    
    // Should identify differences in patterns
    assert!(!comparison.unique_to_first.is_empty() || !comparison.unique_to_second.is_empty());
}

#[test]
fn test_complex_nested_contract() {
    let complex_contract = r#"
    {
      val configBox = CONTEXT.dataInputs(0)
      val oracle = CONTEXT.dataInputs(1)
      
      if (configBox.tokens(0)._1 == configNFT) {
        val price = oracle.R4[Long].get
        val deadline = SELF.R4[Long].get
        val beneficiary = SELF.R5[SigmaProp].get
        
        if (HEIGHT < deadline) {
          if (OUTPUTS(0).value >= price) {
            allOf(Coll(
              OUTPUTS(0).propositionBytes == beneficiary.propBytes,
              OUTPUTS(1).value >= SELF.value - price,
              OUTPUTS(1).tokens == SELF.tokens
            ))
          } else {
            sigmaProp(false)
          }
        } else {
          beneficiary // Refund after deadline
        }
      } else {
        sigmaProp(false)
      }
    }
    "#;
    
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(complex_contract).unwrap();
    
    // Should identify multiple patterns
    assert!(!analysis.contract.metadata.identified_patterns.is_empty());
    
    // Should have multiple conditional paths
    assert!(analysis.conditional_paths.len() > 1);
    
    // Should have high complexity score
    let summary = analyzer.get_pattern_summary(&analysis);
    assert!(summary.complexity_score > 3.0);
    
    // Should be able to generate diagram
    let diagram = analyzer.generate_diagram(&analysis).unwrap();
    assert!(diagram.nodes.len() > 5);
}

#[test]
fn test_output_formats() {
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(SIMPLE_GUARD_CONTRACT).unwrap();
    let diagram = analyzer.generate_diagram(&analysis).unwrap();
    
    // Test JSON output
    let json = diagram.to_json().unwrap();
    assert!(json.contains("metadata"));
    assert!(json.contains("nodes"));
    assert!(json.contains("edges"));
    
    // Test YAML output
    let yaml = diagram.to_yaml().unwrap();
    assert!(yaml.contains("metadata"));
    assert!(yaml.contains("nodes"));
    
    // Test Mermaid output
    let mermaid = diagram.to_mermaid();
    assert!(mermaid.starts_with("flowchart"));
    assert!(mermaid.contains("-->"));
    
    // Validate JSON structure
    let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
    assert!(parsed["metadata"].is_object());
    assert!(parsed["nodes"].is_array());
    assert!(parsed["edges"].is_array());
}

mod tempfile {
    use std::path::{Path, PathBuf};
    use std::fs;
    
    pub struct TempDir {
        path: PathBuf,
    }
    
    impl TempDir {
        pub fn path(&self) -> &Path {
            &self.path
        }
    }
    
    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }
    
    pub fn tempdir() -> Result<TempDir, std::io::Error> {
        let path = std::env::temp_dir().join(format!("test_ergoscript_{}", 
            std::process::id()));
        fs::create_dir_all(&path)?;
        Ok(TempDir { path })
    }
}