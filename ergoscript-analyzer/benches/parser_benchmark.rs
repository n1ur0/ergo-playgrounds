//! Performance benchmarks for the ErgoScript analyzer
//!
//! Measures parsing, analysis, and diagram generation performance
//! across different contract sizes and complexities.

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use ergoscript_analyzer::{ErgoScriptAnalyzer, AnalyzerConfig, OutputFormat};

const SIMPLE_CONTRACT: &str = "sigmaProp(true)";

const MEDIUM_CONTRACT: &str = r#"
{
  val condition = OUTPUTS(0).value >= 1000
  if (condition) {
    val owner = SELF.R4[SigmaProp].get
    owner
  } else {
    sigmaProp(false)
  }
}
"#;

const COMPLEX_CONTRACT: &str = r#"
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

fn benchmark_parsing(c: &mut Criterion) {
    let mut group = c.benchmark_group("parsing");
    
    let contracts = vec![
        ("simple", SIMPLE_CONTRACT),
        ("medium", MEDIUM_CONTRACT),  
        ("complex", COMPLEX_CONTRACT),
    ];
    
    for (name, contract) in contracts {
        group.bench_with_input(
            BenchmarkId::new("parse_contract", name),
            contract,
            |b, contract| {
                let analyzer = ErgoScriptAnalyzer::new();
                b.iter(|| {
                    let result = analyzer.analyze(black_box(contract));
                    black_box(result)
                });
            },
        );
    }
    
    group.finish();
}

fn benchmark_analysis(c: &mut Criterion) {
    let mut group = c.benchmark_group("analysis");
    
    let analyzer = ErgoScriptAnalyzer::new();
    let contracts = vec![
        ("simple", SIMPLE_CONTRACT),
        ("medium", MEDIUM_CONTRACT),
        ("complex", COMPLEX_CONTRACT),
    ];
    
    for (name, contract) in contracts {
        // Pre-parse the contract to isolate analysis performance
        let analysis = analyzer.analyze(contract).unwrap();
        
        group.bench_with_input(
            BenchmarkId::new("pattern_summary", name),
            &analysis,
            |b, analysis| {
                b.iter(|| {
                    let summary = analyzer.get_pattern_summary(black_box(analysis));
                    black_box(summary)
                });
            },
        );
        
        group.bench_with_input(
            BenchmarkId::new("contract_validation", name),
            &analysis,
            |b, analysis| {
                b.iter(|| {
                    let validation = analyzer.validate_contract(black_box(analysis));
                    black_box(validation)
                });
            },
        );
    }
    
    group.finish();
}

fn benchmark_diagram_generation(c: &mut Criterion) {
    let mut group = c.benchmark_group("diagram_generation");
    
    let analyzer = ErgoScriptAnalyzer::new();
    let contracts = vec![
        ("simple", SIMPLE_CONTRACT),
        ("medium", MEDIUM_CONTRACT),
        ("complex", COMPLEX_CONTRACT),
    ];
    
    for (name, contract) in contracts {
        let analysis = analyzer.analyze(contract).unwrap();
        
        group.bench_with_input(
            BenchmarkId::new("generate_diagram", name),
            &analysis,
            |b, analysis| {
                b.iter(|| {
                    let diagram = analyzer.generate_diagram(black_box(analysis));
                    black_box(diagram)
                });
            },
        );
    }
    
    group.finish();
}

fn benchmark_serialization(c: &mut Criterion) {
    let mut group = c.benchmark_group("serialization");
    
    let analyzer = ErgoScriptAnalyzer::new();
    let analysis = analyzer.analyze(COMPLEX_CONTRACT).unwrap();
    let diagram = analyzer.generate_diagram(&analysis).unwrap();
    
    group.bench_function("json_serialization", |b| {
        b.iter(|| {
            let json = diagram.to_json();
            black_box(json)
        });
    });
    
    group.bench_function("yaml_serialization", |b| {
        b.iter(|| {
            let yaml = diagram.to_yaml();
            black_box(yaml)
        });
    });
    
    group.bench_function("mermaid_generation", |b| {
        b.iter(|| {
            let mermaid = diagram.to_mermaid();
            black_box(mermaid)
        });
    });
    
    group.finish();
}

fn benchmark_end_to_end(c: &mut Criterion) {
    let mut group = c.benchmark_group("end_to_end");
    
    let contracts = vec![
        ("simple", SIMPLE_CONTRACT),
        ("medium", MEDIUM_CONTRACT),
        ("complex", COMPLEX_CONTRACT),
    ];
    
    for (name, contract) in contracts {
        group.bench_with_input(
            BenchmarkId::new("full_pipeline", name),
            contract,
            |b, contract| {
                b.iter(|| {
                    let analyzer = ErgoScriptAnalyzer::new();
                    let (analysis, diagram) = analyzer
                        .analyze_and_generate_diagram(black_box(contract))
                        .unwrap();
                    let _json = diagram.to_json().unwrap();
                    black_box((analysis, diagram))
                });
            },
        );
    }
    
    group.finish();
}

fn benchmark_batch_processing(c: &mut Criterion) {
    let mut group = c.benchmark_group("batch_processing");
    
    // Simulate batch processing of multiple contracts
    let contracts = vec![
        SIMPLE_CONTRACT,
        MEDIUM_CONTRACT, 
        COMPLEX_CONTRACT,
        SIMPLE_CONTRACT, // Repeat to simulate realistic batch
        MEDIUM_CONTRACT,
    ];
    
    group.bench_function("batch_analysis", |b| {
        b.iter(|| {
            let analyzer = ErgoScriptAnalyzer::new();
            let mut results = Vec::new();
            
            for contract in &contracts {
                let analysis = analyzer.analyze(black_box(contract)).unwrap();
                results.push(analysis);
            }
            
            black_box(results)
        });
    });
    
    group.finish();
}

fn benchmark_memory_usage(c: &mut Criterion) {
    let mut group = c.benchmark_group("memory_usage");
    
    // Generate many contracts to test memory efficiency
    let large_contract = format!("{}\n{}\n{}", COMPLEX_CONTRACT, COMPLEX_CONTRACT, COMPLEX_CONTRACT);
    
    group.bench_function("large_contract_parsing", |b| {
        b.iter(|| {
            let analyzer = ErgoScriptAnalyzer::new();
            let analysis = analyzer.analyze(black_box(&large_contract));
            black_box(analysis)
        });
    });
    
    group.finish();
}

fn benchmark_different_configurations(c: &mut Criterion) {
    let mut group = c.benchmark_group("configuration_impact");
    
    let configs = vec![
        ("full_analysis", AnalyzerConfig {
            enable_pattern_detection: true,
            enable_flow_analysis: true,
            enable_diagram_generation: true,
            output_format: OutputFormat::Json,
            include_debug_info: true,
            max_recursion_depth: 100,
        }),
        ("patterns_only", AnalyzerConfig {
            enable_pattern_detection: true,
            enable_flow_analysis: false,
            enable_diagram_generation: false,
            output_format: OutputFormat::Json,
            include_debug_info: false,
            max_recursion_depth: 50,
        }),
        ("minimal", AnalyzerConfig {
            enable_pattern_detection: false,
            enable_flow_analysis: true,
            enable_diagram_generation: false,
            output_format: OutputFormat::Json,
            include_debug_info: false,
            max_recursion_depth: 25,
        }),
    ];
    
    for (name, config) in configs {
        group.bench_with_input(
            BenchmarkId::new("analyze_with_config", name),
            &config,
            |b, config| {
                b.iter(|| {
                    let analyzer = ErgoScriptAnalyzer::with_config(config.clone());
                    let analysis = analyzer.analyze(black_box(COMPLEX_CONTRACT));
                    black_box(analysis)
                });
            },
        );
    }
    
    group.finish();
}

criterion_group!(
    benches,
    benchmark_parsing,
    benchmark_analysis,
    benchmark_diagram_generation,
    benchmark_serialization,
    benchmark_end_to_end,
    benchmark_batch_processing,
    benchmark_memory_usage,
    benchmark_different_configurations
);

criterion_main!(benches);