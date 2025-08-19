//! ErgoScript Contract Flow Analyzer CLI
//!
//! Command-line interface for analyzing ErgoScript contracts and generating
//! visual flow diagrams.

use clap::{Arg, Command, ArgMatches, ValueEnum};
use ergoscript_analyzer::{
    ErgoScriptAnalyzer, AnalyzerConfig, OutputFormat, AnalyzerError,
    PatternSummary, ContractValidation,
};
use std::path::{Path, PathBuf};
use std::fs;
use tracing::{info, warn, error, debug};
use tracing_subscriber::{EnvFilter, FmtSubscriber};

#[derive(Debug, Clone, ValueEnum)]
enum CliOutputFormat {
    Json,
    Yaml,
    Mermaid,
    All,
}

impl From<CliOutputFormat> for OutputFormat {
    fn from(format: CliOutputFormat) -> Self {
        match format {
            CliOutputFormat::Json => OutputFormat::Json,
            CliOutputFormat::Yaml => OutputFormat::Yaml,
            CliOutputFormat::Mermaid => OutputFormat::Mermaid,
            CliOutputFormat::All => OutputFormat::All,
        }
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    init_logging();

    // Parse command line arguments
    let matches = build_cli().get_matches();
    
    // Execute the appropriate subcommand
    match matches.subcommand() {
        Some(("analyze", sub_matches)) => {
            info!("Starting ErgoScript contract analysis");
            analyze_command(sub_matches)?;
        }
        Some(("validate", sub_matches)) => {
            info!("Starting contract validation");
            validate_command(sub_matches)?;
        }
        Some(("batch", sub_matches)) => {
            info!("Starting batch analysis");
            batch_command(sub_matches)?;
        }
        Some(("patterns", sub_matches)) => {
            info!("Listing contract patterns");
            patterns_command(sub_matches)?;
        }
        _ => {
            eprintln!("No subcommand provided. Use --help for usage information.");
            std::process::exit(1);
        }
    }

    Ok(())
}

fn build_cli() -> Command {
    Command::new("ergo-analyzer")
        .version(env!("CARGO_PKG_VERSION"))
        .author("Ergo Playgrounds Contributors")
        .about("ErgoScript contract flow analyzer and diagram generator")
        .long_about("Analyzes ErgoScript smart contracts to extract flow patterns, \
                    identify contract types, and generate visual diagrams for \
                    better understanding and documentation.")
        .subcommand_required(true)
        .arg_required_else_help(true)
        .subcommand(
            Command::new("analyze")
                .about("Analyze a single ErgoScript contract")
                .arg(
                    Arg::new("input")
                        .help("Input ErgoScript file or contract code")
                        .required(true)
                        .value_name("FILE_OR_CODE")
                        .index(1)
                )
                .arg(
                    Arg::new("output")
                        .short('o')
                        .long("output")
                        .help("Output file path")
                        .value_name("FILE")
                )
                .arg(
                    Arg::new("format")
                        .short('f')
                        .long("format")
                        .help("Output format")
                        .value_enum::<CliOutputFormat>()
                        .default_value("json")
                )
                .arg(
                    Arg::new("patterns-only")
                        .long("patterns-only")
                        .help("Only show identified patterns")
                        .action(clap::ArgAction::SetTrue)
                )
                .arg(
                    Arg::new("diagram")
                        .short('d')
                        .long("diagram")
                        .help("Generate and output diagram")
                        .action(clap::ArgAction::SetTrue)
                )
                .arg(
                    Arg::new("name")
                        .short('n')
                        .long("name")
                        .help("Contract name for metadata")
                        .value_name("NAME")
                )
                .arg(
                    Arg::new("debug")
                        .long("debug")
                        .help("Include debug information in output")
                        .action(clap::ArgAction::SetTrue)
                )
        )
        .subcommand(
            Command::new("validate")
                .about("Validate contract against best practices")
                .arg(
                    Arg::new("input")
                        .help("Input ErgoScript file")
                        .required(true)
                        .value_name("FILE")
                        .index(1)
                )
                .arg(
                    Arg::new("strict")
                        .short('s')
                        .long("strict")
                        .help("Enable strict validation mode")
                        .action(clap::ArgAction::SetTrue)
                )
                .arg(
                    Arg::new("output")
                        .short('o')
                        .long("output")
                        .help("Output validation report to file")
                        .value_name("FILE")
                )
        )
        .subcommand(
            Command::new("batch")
                .about("Analyze multiple contracts in a directory")
                .arg(
                    Arg::new("directory")
                        .help("Directory containing ErgoScript files")
                        .required(true)
                        .value_name("DIR")
                        .index(1)
                )
                .arg(
                    Arg::new("output")
                        .short('o')
                        .long("output")
                        .help("Output directory for results")
                        .value_name("DIR")
                )
                .arg(
                    Arg::new("format")
                        .short('f')
                        .long("format")
                        .help("Output format for each file")
                        .value_enum::<CliOutputFormat>()
                        .default_value("json")
                )
                .arg(
                    Arg::new("pattern")
                        .short('p')
                        .long("pattern")
                        .help("File pattern to match (e.g., '*.es')")
                        .default_value("*.es")
                        .value_name("PATTERN")
                )
                .arg(
                    Arg::new("summary")
                        .long("summary")
                        .help("Generate batch summary report")
                        .action(clap::ArgAction::SetTrue)
                )
        )
        .subcommand(
            Command::new("patterns")
                .about("List all supported contract patterns")
                .arg(
                    Arg::new("detailed")
                        .short('d')
                        .long("detailed")
                        .help("Show detailed pattern descriptions")
                        .action(clap::ArgAction::SetTrue)
                )
        )
        .arg(
            Arg::new("verbose")
                .short('v')
                .long("verbose")
                .help("Enable verbose output")
                .action(clap::ArgAction::Count)
                .global(true)
        )
        .arg(
            Arg::new("quiet")
                .short('q')
                .long("quiet")
                .help("Suppress non-essential output")
                .action(clap::ArgAction::SetTrue)
                .global(true)
                .conflicts_with("verbose")
        )
}

fn init_logging() {
    let filter = EnvFilter::from_default_env()
        .add_directive("ergo_analyzer=info".parse().unwrap());

    FmtSubscriber::builder()
        .with_env_filter(filter)
        .with_target(false)
        .init();
}

fn analyze_command(matches: &ArgMatches) -> Result<(), AnalyzerError> {
    let input = matches.get_one::<String>("input").unwrap();
    let output_format: CliOutputFormat = matches.get_one("format").cloned().unwrap_or(CliOutputFormat::Json);
    let patterns_only = matches.get_flag("patterns-only");
    let generate_diagram = matches.get_flag("diagram");
    let include_debug = matches.get_flag("debug");
    let contract_name = matches.get_one::<String>("name").cloned();

    // Create analyzer configuration
    let config = AnalyzerConfig {
        enable_pattern_detection: true,
        enable_flow_analysis: !patterns_only,
        enable_diagram_generation: generate_diagram,
        output_format: output_format.clone().into(),
        include_debug_info: include_debug,
        max_recursion_depth: 100,
    };

    let analyzer = ErgoScriptAnalyzer::with_config(config);

    // Determine if input is a file path or contract code
    let source_code = if Path::new(input).exists() {
        info!("Reading contract from file: {}", input);
        fs::read_to_string(input)
            .map_err(|e| AnalyzerError::IoError { source: e })?
    } else {
        info!("Treating input as contract code");
        input.clone()
    };

    // Perform analysis
    debug!("Starting contract analysis");
    let analysis = analyzer.analyze(&source_code)?;
    info!("Analysis completed successfully");

    // Generate output based on requested format and options
    if patterns_only {
        let summary = analyzer.get_pattern_summary(&analysis);
        output_pattern_summary(&summary)?;
    } else if generate_diagram {
        let diagram = analyzer.generate_diagram(&analysis)?;
        output_diagram(&diagram, &output_format, matches.get_one::<String>("output"))?;
    } else {
        output_analysis(&analysis, &output_format, matches.get_one::<String>("output"))?;
    }

    Ok(())
}

fn validate_command(matches: &ArgMatches) -> Result<(), AnalyzerError> {
    let input_file = matches.get_one::<String>("input").unwrap();
    let strict_mode = matches.get_flag("strict");
    let output_file = matches.get_one::<String>("output");

    info!("Validating contract: {}", input_file);

    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze_file(input_file)?;
    let validation = analyzer.validate_contract(&analysis);

    if strict_mode && !validation.is_valid {
        error!("Contract validation failed in strict mode");
        std::process::exit(1);
    }

    output_validation(&validation, output_file)?;

    if validation.is_valid {
        info!("✅ Contract validation passed");
    } else {
        warn!("⚠️ Contract validation found issues");
    }

    Ok(())
}

fn batch_command(matches: &ArgMatches) -> Result<(), AnalyzerError> {
    let input_dir = matches.get_one::<String>("directory").unwrap();
    let output_dir = matches.get_one::<String>("output");
    let format: CliOutputFormat = matches.get_one("format").cloned().unwrap_or(CliOutputFormat::Json);
    let file_pattern = matches.get_one::<String>("pattern").unwrap();
    let generate_summary = matches.get_flag("summary");

    info!("Starting batch analysis of directory: {}", input_dir);

    // Find all matching files
    let files = find_ergoscript_files(input_dir, file_pattern)?;
    info!("Found {} files to analyze", files.len());

    if files.is_empty() {
        warn!("No ErgoScript files found matching pattern: {}", file_pattern);
        return Ok(());
    }

    let analyzer = ErgoScriptAnalyzer::new();
    let analyses = ergoscript_analyzer::utils::batch_analyze(&analyzer, &files)?;

    // Output individual results
    for (file_path, analysis) in &analyses {
        let output_path = if let Some(out_dir) = output_dir {
            let file_name = Path::new(file_path)
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy();
            let extension = match format {
                CliOutputFormat::Json => "json",
                CliOutputFormat::Yaml => "yaml", 
                CliOutputFormat::Mermaid => "mmd",
                CliOutputFormat::All => "json", // Default for batch
            };
            Some(PathBuf::from(out_dir).join(format!("{}.{}", file_name, extension)))
        } else {
            None
        };

        output_analysis(analysis, &format, output_path.as_ref().map(|p| p.to_string_lossy().as_ref()))?;
    }

    // Generate summary report if requested
    if generate_summary {
        let report = ergoscript_analyzer::utils::generate_batch_report(&analyses);
        output_batch_report(&report, output_dir)?;
    }

    info!("Batch analysis completed successfully");
    Ok(())
}

fn patterns_command(matches: &ArgMatches) -> Result<(), AnalyzerError> {
    let detailed = matches.get_flag("detailed");

    println!("Supported ErgoScript Contract Patterns:\n");

    let patterns = [
        ("GuardScript", "Owner bypass pattern (ownerPk || contractLogic)"),
        ("DEX", "Decentralized exchange functionality"),
        ("Escrow", "Third-party mediated transactions"),
        ("TimeLock", "Time-based access control"),
        ("AtomicSwap", "Cross-chain atomic exchanges"),
        ("TokenSale", "Token distribution mechanisms"),
        ("Refund", "Fund recovery mechanisms"),
        ("SelfReplicating", "State-preserving contracts"),
        ("Oracle", "External data integration"),
    ];

    for (name, description) in &patterns {
        if detailed {
            println!("🔧 {}", name);
            println!("   {}", description);
            println!("   Example usage: Contract allows {} functionality\n", name.to_lowercase());
        } else {
            println!("• {} - {}", name, description);
        }
    }

    if !detailed {
        println!("\nUse --detailed for more information about each pattern.");
    }

    Ok(())
}

// Helper functions for output formatting

fn output_pattern_summary(summary: &PatternSummary) -> Result<(), AnalyzerError> {
    println!("Contract Pattern Summary");
    println!("=======================");
    
    if let Some(name) = &summary.contract_name {
        println!("Contract: {}", name);
    }
    
    println!("Complexity Score: {:.2}", summary.complexity_score);
    println!();
    
    if summary.identified_patterns.is_empty() {
        println!("No specific patterns identified");
    } else {
        println!("Identified Patterns:");
        for pattern in &summary.identified_patterns {
            println!("  • {:?}", pattern);
        }
    }
    
    println!();
    println!("Analysis Metrics:");
    println!("  • Validation Checks: {}", summary.validation_count);
    println!("  • Conditional Paths: {}", summary.conditional_paths);
    println!("  • Token Operations: {}", summary.token_operations);
    println!("  • ERG Flows: {}", summary.erg_flows);

    Ok(())
}

fn output_analysis(
    analysis: &ergoscript_analyzer::FlowAnalysis,
    format: &CliOutputFormat,
    output_file: Option<&str>,
) -> Result<(), AnalyzerError> {
    let content = match format {
        CliOutputFormat::Json => serde_json::to_string_pretty(analysis)
            .map_err(|e| AnalyzerError::ConfigurationError {
                message: format!("JSON serialization failed: {}", e),
            })?,
        CliOutputFormat::Yaml => serde_yaml::to_string(analysis)
            .map_err(|e| AnalyzerError::ConfigurationError {
                message: format!("YAML serialization failed: {}", e),
            })?,
        CliOutputFormat::Mermaid => {
            return Err(AnalyzerError::ConfigurationError {
                message: "Mermaid format requires diagram generation (--diagram flag)".to_string(),
            });
        }
        CliOutputFormat::All => {
            // Output JSON by default for analysis
            serde_json::to_string_pretty(analysis)
                .map_err(|e| AnalyzerError::ConfigurationError {
                    message: format!("JSON serialization failed: {}", e),
                })?
        }
    };

    write_output(&content, output_file)?;
    Ok(())
}

fn output_diagram(
    diagram: &ergoscript_analyzer::ContractDiagram,
    format: &CliOutputFormat,
    output_file: Option<&str>,
) -> Result<(), AnalyzerError> {
    let content = match format {
        CliOutputFormat::Json => diagram.to_json()
            .map_err(|e| AnalyzerError::DiagramError { source: e })?,
        CliOutputFormat::Yaml => diagram.to_yaml()
            .map_err(|e| AnalyzerError::ConfigurationError {
                message: format!("YAML serialization failed: {}", e),
            })?,
        CliOutputFormat::Mermaid => diagram.to_mermaid(),
        CliOutputFormat::All => {
            // Output all formats to separate files
            if let Some(base_path) = output_file {
                let base = Path::new(base_path).with_extension("");
                
                // JSON
                let json_content = diagram.to_json()
                    .map_err(|e| AnalyzerError::DiagramError { source: e })?;
                write_output(&json_content, Some(&format!("{}.json", base.display())))?;
                
                // YAML
                let yaml_content = diagram.to_yaml()
                    .map_err(|e| AnalyzerError::ConfigurationError {
                        message: format!("YAML serialization failed: {}", e),
                    })?;
                write_output(&yaml_content, Some(&format!("{}.yaml", base.display())))?;
                
                // Mermaid
                let mermaid_content = diagram.to_mermaid();
                write_output(&mermaid_content, Some(&format!("{}.mmd", base.display())))?;
                
                println!("Diagram exported in all formats to: {}", base.display());
                return Ok(());
            } else {
                diagram.to_json()
                    .map_err(|e| AnalyzerError::DiagramError { source: e })?
            }
        }
    };

    write_output(&content, output_file)?;
    Ok(())
}

fn output_validation(
    validation: &ContractValidation,
    output_file: Option<&str>,
) -> Result<(), AnalyzerError> {
    let mut content = String::new();
    
    content.push_str("Contract Validation Report\n");
    content.push_str("=========================\n\n");
    
    content.push_str(&format!("Status: {}\n", 
        if validation.is_valid { "✅ PASSED" } else { "❌ FAILED" }));
    content.push_str(&format!("Complexity Score: {:.2}\n\n", validation.complexity_score));
    
    if !validation.issues.is_empty() {
        content.push_str("Issues Found:\n");
        for issue in &validation.issues {
            content.push_str(&format!("  ❌ {}\n", issue));
        }
        content.push('\n');
    }
    
    if !validation.suggestions.is_empty() {
        content.push_str("Suggestions:\n");
        for suggestion in &validation.suggestions {
            content.push_str(&format!("  💡 {}\n", suggestion));
        }
    }

    write_output(&content, output_file)?;
    Ok(())
}

fn output_batch_report(
    report: &ergoscript_analyzer::BatchReport,
    output_dir: Option<&str>,
) -> Result<(), AnalyzerError> {
    let mut content = String::new();
    
    content.push_str("Batch Analysis Report\n");
    content.push_str("====================\n\n");
    
    content.push_str(&format!("Total Contracts Analyzed: {}\n", report.total_contracts));
    content.push_str(&format!("Average Validations per Contract: {:.1}\n", report.average_validations));
    content.push_str(&format!("Average Token Operations per Contract: {:.1}\n\n", report.average_token_operations));
    
    content.push_str("Pattern Frequency:\n");
    for (pattern, count) in &report.pattern_frequency {
        let percentage = (*count as f32 / report.total_contracts as f32) * 100.0;
        content.push_str(&format!("  {:?}: {} contracts ({:.1}%)\n", pattern, count, percentage));
    }

    let output_file = if let Some(dir) = output_dir {
        Some(PathBuf::from(dir).join("batch_report.txt").to_string_lossy().to_string())
    } else {
        None
    };

    write_output(&content, output_file.as_deref())?;
    println!("Batch report generated");
    Ok(())
}

fn write_output(content: &str, output_file: Option<&str>) -> Result<(), AnalyzerError> {
    if let Some(file_path) = output_file {
        info!("Writing output to file: {}", file_path);
        
        // Create parent directory if it doesn't exist
        if let Some(parent) = Path::new(file_path).parent() {
            fs::create_dir_all(parent)
                .map_err(|e| AnalyzerError::IoError { source: e })?;
        }
        
        fs::write(file_path, content)
            .map_err(|e| AnalyzerError::IoError { source: e })?;
        
        println!("Output written to: {}", file_path);
    } else {
        println!("{}", content);
    }
    Ok(())
}

fn find_ergoscript_files(dir: &str, pattern: &str) -> Result<Vec<PathBuf>, AnalyzerError> {
    let mut files = Vec::new();
    let dir_path = Path::new(dir);
    
    if !dir_path.exists() {
        return Err(AnalyzerError::ConfigurationError {
            message: format!("Directory does not exist: {}", dir),
        });
    }
    
    let entries = fs::read_dir(dir_path)
        .map_err(|e| AnalyzerError::IoError { source: e })?;
    
    for entry in entries {
        let entry = entry.map_err(|e| AnalyzerError::IoError { source: e })?;
        let path = entry.path();
        
        if path.is_file() {
            if let Some(extension) = path.extension() {
                // Simple pattern matching - could be enhanced with glob patterns
                if pattern == "*.es" && extension == "es" ||
                   pattern == "*.ergoscript" && extension == "ergoscript" ||
                   pattern == "*.*" {
                    files.push(path);
                }
            }
        }
    }
    
    Ok(files)
}