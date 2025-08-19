//! Example usage of the ErgoScript Contract Flow Analyzer
//!
//! This example demonstrates how to use the analyzer to parse and analyze
//! various ErgoScript contracts, generate diagrams, and extract insights.

use ergoscript_analyzer::{
    ErgoScriptAnalyzer, AnalyzerConfig, OutputFormat,
    ContractPattern, utils,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging for better visibility
    env_logger::init();

    println!("ErgoScript Contract Flow Analyzer - Example Usage");
    println!("==================================================\n");

    // Example 1: Simple guard script analysis
    analyze_guard_script()?;

    // Example 2: Token sales service analysis
    analyze_token_sales_service()?;

    // Example 3: DEX contract analysis
    analyze_dex_contract()?;

    // Example 4: Time-locked contract analysis
    analyze_time_lock_contract()?;

    // Example 5: Batch analysis
    demonstrate_batch_analysis()?;

    // Example 6: Contract validation
    demonstrate_contract_validation()?;

    // Example 7: Contract comparison
    demonstrate_contract_comparison()?;

    // Example 8: Configuration options
    demonstrate_configuration_options()?;

    Ok(())
}

fn analyze_guard_script() -> Result<(), Box<dyn std::error::Error>> {
    println!("1. Guard Script Analysis");
    println!("-----------------------");

    let contract = "ownerPk || sigmaProp(OUTPUTS(0).value >= 1000)";
    
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(contract)?;
    
    println!("Contract: {}", contract);
    println!("Identified Patterns: {:?}", analysis.contract.metadata.identified_patterns);
    println!("Flow Patterns: {}", analysis.flow_patterns.len());
    println!("Validation Checks: {}", analysis.validation_checks.len());
    
    // Generate pattern summary
    let summary = analyzer.get_pattern_summary(&analysis);
    println!("Complexity Score: {:.2}", summary.complexity_score);
    
    // Generate diagram
    let diagram = analyzer.generate_diagram(&analysis)?;
    println!("Diagram Nodes: {}", diagram.nodes.len());
    println!("Diagram Edges: {}", diagram.edges.len());
    
    // Output Mermaid diagram
    println!("\nMermaid Diagram:");
    println!("{}", diagram.to_mermaid());
    
    println!();
    Ok(())
}

fn analyze_token_sales_service() -> Result<(), Box<dyn std::error::Error>> {
    println!("2. Token Sales Service Analysis");
    println!("-------------------------------");

    let contract = r#"
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
    
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(contract)?;
    
    println!("Identified Patterns: {:?}", analysis.contract.metadata.identified_patterns);
    println!("Conditional Paths: {}", analysis.conditional_paths.len());
    println!("Token Operations: {}", analysis.token_operations.len());
    println!("ERG Flows: {}", analysis.erg_flows.len());
    
    // Show detailed validation checks
    println!("\nValidation Checks:");
    for (i, check) in analysis.validation_checks.iter().enumerate() {
        println!("  {}. {:?}: {}", i + 1, check.check_type, check.description);
    }
    
    // Show conditional paths
    println!("\nConditional Paths:");
    for (i, path) in analysis.conditional_paths.iter().enumerate() {
        println!("  {}. Type: {:?}", i + 1, path.path_type);
        println!("     Condition: {}", path.condition);
        println!("     Then Actions: {}", path.then_actions.len());
        println!("     Else Actions: {}", path.else_actions.len());
    }
    
    println!();
    Ok(())
}

fn analyze_dex_contract() -> Result<(), Box<dyn std::error::Error>> {
    println!("3. DEX Contract Analysis");
    println!("------------------------");

    let contract = r#"
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
    
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(contract)?;
    
    println!("Identified Patterns: {:?}", analysis.contract.metadata.identified_patterns);
    
    // Show token operations
    println!("\nToken Operations:");
    for (i, op) in analysis.token_operations.iter().enumerate() {
        println!("  {}. {:?}: {}", i + 1, op.operation_type, op.description);
        println!("     Source: {:?}", op.source_box);
        if let Some(target) = &op.target_box {
            println!("     Target: {:?}", target);
        }
    }
    
    // Generate and show partial JSON output
    let diagram = analyzer.generate_diagram(&analysis)?;
    let json = diagram.to_json()?;
    let parsed: serde_json::Value = serde_json::from_str(&json)?;
    
    println!("\nDiagram Metadata:");
    if let Some(metadata) = parsed.get("metadata") {
        println!("{}", serde_json::to_string_pretty(metadata)?);
    }
    
    println!();
    Ok(())
}

fn analyze_time_lock_contract() -> Result<(), Box<dyn std::error::Error>> {
    println!("4. Time Lock Contract Analysis");
    println!("------------------------------");

    let contract = r#"
    {
      val unlockHeight = SELF.R4[Long].get
      val beneficiary = SELF.R5[SigmaProp].get
      
      if (HEIGHT >= unlockHeight) {
        beneficiary
      } else {
        sigmaProp(false)
      }
    }
    "#;
    
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(contract)?;
    
    println!("Identified Patterns: {:?}", analysis.contract.metadata.identified_patterns);
    
    // Check if time lock pattern is detected
    if analysis.contract.metadata.identified_patterns.contains(&ContractPattern::TimeLock) {
        println!("✅ Time lock pattern successfully detected!");
    } else {
        println!("❌ Time lock pattern not detected (may need parser improvements)");
    }
    
    // Show analysis details
    let summary = analyzer.get_pattern_summary(&analysis);
    println!("Complexity Score: {:.2}", summary.complexity_score);
    println!("Conditional Paths: {}", summary.conditional_paths);
    
    println!();
    Ok(())
}

fn demonstrate_batch_analysis() -> Result<(), Box<dyn std::error::Error>> {
    println!("5. Batch Analysis Demonstration");
    println!("-------------------------------");

    // Create sample contracts in memory (simulating file analysis)
    let contracts = vec![
        ("guard_script.es", "ownerPk || sigmaProp(true)"),
        ("simple_payment.es", "sigmaProp(OUTPUTS(0).value >= 1000)"),
        ("time_lock.es", r#"{
            val deadline = SELF.R4[Long].get
            if (HEIGHT >= deadline) {
                SELF.R5[SigmaProp].get
            } else {
                sigmaProp(false)
            }
        }"#),
    ];
    
    let analyzer = ErgoScriptAnalyzer::new();
    let mut analyses = Vec::new();
    
    for (name, contract) in &contracts {
        let analysis = analyzer.analyze(contract)?;
        analyses.push((name.to_string(), analysis));
        println!("Analyzed: {}", name);
    }
    
    // Generate batch report
    let report = utils::generate_batch_report(&analyses);
    
    println!("\nBatch Report:");
    println!("Total Contracts: {}", report.total_contracts);
    println!("Average Validations: {:.1}", report.average_validations);
    println!("Average Token Operations: {:.1}", report.average_token_operations);
    
    println!("\nPattern Frequency:");
    for (pattern, count) in &report.pattern_frequency {
        let percentage = (*count as f32 / report.total_contracts as f32) * 100.0;
        println!("  {:?}: {} ({:.1}%)", pattern, count, percentage);
    }
    
    println!();
    Ok(())
}

fn demonstrate_contract_validation() -> Result<(), Box<dyn std::error::Error>> {
    println!("6. Contract Validation Demonstration");
    println!("------------------------------------");

    let contracts = vec![
        ("Good: Guard script with refund", "ownerPk || sigmaProp(OUTPUTS(0).value >= 1000)"),
        ("Problematic: No refund mechanism", "sigmaProp(OUTPUTS(0).value >= 1000)"),
        ("Complex: Multiple patterns", r#"{
            val configBox = CONTEXT.dataInputs(0)
            if (configBox.tokens.size > 0) {
                val owner = configBox.R4[SigmaProp].get
                owner || sigmaProp(OUTPUTS(0).value >= 1000)
            } else {
                sigmaProp(false)
            }
        }"#),
    ];
    
    let analyzer = ErgoScriptAnalyzer::new();
    
    for (description, contract) in &contracts {
        println!("Validating: {}", description);
        
        let analysis = analyzer.analyze(contract)?;
        let validation = analyzer.validate_contract(&analysis);
        
        println!("  Status: {}", if validation.is_valid { "✅ Valid" } else { "⚠️ Has Issues" });
        println!("  Complexity: {:.2}", validation.complexity_score);
        
        if !validation.issues.is_empty() {
            println!("  Issues:");
            for issue in &validation.issues {
                println!("    - {}", issue);
            }
        }
        
        if !validation.suggestions.is_empty() {
            println!("  Suggestions:");
            for suggestion in &validation.suggestions {
                println!("    - {}", suggestion);
            }
        }
        
        println!();
    }
    
    Ok(())
}

fn demonstrate_contract_comparison() -> Result<(), Box<dyn std::error::Error>> {
    println!("7. Contract Comparison Demonstration");
    println!("------------------------------------");

    let contract1 = "ownerPk || sigmaProp(OUTPUTS(0).value >= 1000)";
    let contract2 = r#"{
        val configBox = CONTEXT.dataInputs(0)
        val owner = configBox.R4[SigmaProp].get
        owner || sigmaProp(OUTPUTS(0).tokens(0)._2 >= 100)
    }"#;
    
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis1 = analyzer.analyze(contract1)?;
    let analysis2 = analyzer.analyze(contract2)?;
    
    let comparison = utils::compare_contracts(&analysis1, &analysis2);
    
    println!("Contract 1 patterns: {:?}", analysis1.contract.metadata.identified_patterns);
    println!("Contract 2 patterns: {:?}", analysis2.contract.metadata.identified_patterns);
    
    println!("\nComparison Results:");
    println!("Common patterns: {:?}", comparison.common_patterns);
    println!("Unique to contract 1: {:?}", comparison.unique_to_first);
    println!("Unique to contract 2: {:?}", comparison.unique_to_second);
    println!("Validation count difference: {}", comparison.validation_count_diff);
    
    println!();
    Ok(())
}

fn demonstrate_configuration_options() -> Result<(), Box<dyn std::error::Error>> {
    println!("8. Configuration Options Demonstration");
    println!("-------------------------------------");

    let contract = r#"{
        val owner = SELF.R4[SigmaProp].get
        val deadline = SELF.R5[Long].get
        if (HEIGHT >= deadline) {
            owner
        } else {
            sigmaProp(OUTPUTS(0).value >= 1000)
        }
    }"#;
    
    let configs = vec![
        ("Default Configuration", AnalyzerConfig::default()),
        ("Patterns Only", AnalyzerConfig {
            enable_pattern_detection: true,
            enable_flow_analysis: false,
            enable_diagram_generation: false,
            output_format: OutputFormat::Json,
            include_debug_info: false,
            max_recursion_depth: 50,
        }),
        ("Full Analysis + Debug", AnalyzerConfig {
            enable_pattern_detection: true,
            enable_flow_analysis: true,
            enable_diagram_generation: true,
            output_format: OutputFormat::All,
            include_debug_info: true,
            max_recursion_depth: 200,
        }),
    ];
    
    for (name, config) in configs {
        println!("Testing: {}", name);
        
        let analyzer = ErgoScriptAnalyzer::with_config(config);
        let analysis = analyzer.analyze(contract)?;
        
        println!("  Patterns: {:?}", analysis.contract.metadata.identified_patterns);
        println!("  Flow Patterns: {}", analysis.flow_patterns.len());
        println!("  Validation Checks: {}", analysis.validation_checks.len());
        println!("  Conditional Paths: {}", analysis.conditional_paths.len());
        
        if analyzer.config.enable_diagram_generation {
            match analyzer.generate_diagram(&analysis) {
                Ok(diagram) => println!("  Diagram: {} nodes, {} edges", diagram.nodes.len(), diagram.edges.len()),
                Err(_) => println!("  Diagram: Generation failed"),
            }
        } else {
            println!("  Diagram: Disabled");
        }
        
        println!();
    }
    
    Ok(())
}

// Environment variable based logger for simple demonstration
mod env_logger {
    pub fn init() {
        // Simple no-op logger for this example
        // In a real application, you'd use the tracing-subscriber crate
    }
}

// Extension trait to access config for demonstration
trait ConfigAccess {
    fn config(&self) -> &AnalyzerConfig;
}

impl ConfigAccess for ErgoScriptAnalyzer {
    fn config(&self) -> &AnalyzerConfig {
        // In a real implementation, this would access the actual config
        // For demonstration, return a default
        &AnalyzerConfig::default()
    }
}