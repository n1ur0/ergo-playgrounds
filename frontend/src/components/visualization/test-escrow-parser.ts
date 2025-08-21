/**
 * Test script for enhanced escrow contract parsing capabilities
 */

import { enhancedContractParser } from './ContractParser';
import { escrowContractCode } from './escrow-test';

/**
 * Test escrow contract parsing with multi-scenario detection
 */
export function testEscrowParsing(): void {
  console.log('='.repeat(80));
  console.log('ENHANCED ESCROW CONTRACT PARSER TEST');
  console.log('='.repeat(80));

  console.log('\n🏦 Analyzing Enhanced Escrow Contract...\n');
  const escrowAnalysis = enhancedContractParser.parseContract(escrowContractCode);
  
  // Expected results for escrow:
  // - 3 parties (buyer, seller, arbiter)
  // - 6-8 boxes (initial deposit + 3 resolution scenarios)
  // - 3-4 transactions (deposit + 3 resolution paths)
  // - 8-12 connections between elements

  console.log('📊 Escrow Analysis Results:');
  console.log(`- Protocol: ${escrowAnalysis.protocolContext?.protocolName}`);
  console.log(`- Parties: ${escrowAnalysis.parties.length} (expected: 3)`);
  
  escrowAnalysis.parties.forEach(party => {
    console.log(`  • ${party.name} (${party.role})`);
    if (party.metadata?.scenarioParticipation?.length > 0) {
      console.log(`    📋 Participates in: ${party.metadata.scenarioParticipation.join(', ')}`);
    }
  });
  
  console.log(`\n- Boxes: ${escrowAnalysis.boxes.length} (expected: 6-8)`);
  const boxTypeCount = new Map<string, number>();
  
  escrowAnalysis.boxes.forEach(box => {
    const count = boxTypeCount.get(box.boxType) || 0;
    boxTypeCount.set(box.boxType, count + 1);
    
    console.log(`  • ${box.id} (${box.boxType}) - ${box.description}`);
    
    if (box.registers.R4) {
      console.log(`    🔗 R4 Register: ${box.registers.R4.type} -> ${box.registers.R4.boxId || box.registers.R4.value}`);
    }
    if (box.registers.R5) {
      console.log(`    📊 R5 Register: ${box.registers.R5.type} -> ${box.registers.R5.value} (state flag)`);
    }
    if (box.registers.R6 || box.registers.R7) {
      console.log(`    🏷️ Additional Registers: R6=${!!box.registers.R6}, R7=${!!box.registers.R7}`);
    }
    
    if (box.owner) {
      console.log(`    👤 Owner: ${box.owner}`);
    }
    
    if (box.temporalConstraints) {
      console.log(`    ⏰ Temporal Constraints: ${Object.keys(box.temporalConstraints).join(', ')}`);
    }
  });
  
  console.log('\n📈 Box Type Distribution:');
  boxTypeCount.forEach((count, type) => {
    console.log(`  - ${type}: ${count}`);
  });
  
  console.log(`\n- Transactions: ${escrowAnalysis.transactions.length} (expected: 3-4)`);
  const txTypeCount = new Map<string, number>();
  
  escrowAnalysis.transactions.forEach(tx => {
    const count = txTypeCount.get(tx.type) || 0;
    txTypeCount.set(tx.type, count + 1);
    
    console.log(`  • ${tx.id} (${tx.type}) - ${tx.status}`);
    
    if (tx.scenario) {
      console.log(`    🎭 Scenario: ${tx.scenario}`);
    }
    
    if (tx.requiredSignatures?.length > 0) {
      console.log(`    ✍️ Required Signatures: ${tx.requiredSignatures.length}`);
    }
    
    if (tx.protocolStage) {
      console.log(`    🔄 Stage ${tx.protocolStage.currentStage}/${tx.protocolStage.totalStages} of ${tx.protocolStage.protocol}`);
    }

    console.log(`    📥 Inputs: ${tx.inputs.length}, 📤 Outputs: ${tx.outputs.length}`);
  });
  
  console.log('\n📈 Transaction Type Distribution:');
  txTypeCount.forEach((count, type) => {
    console.log(`  - ${type}: ${count}`);
  });
  
  console.log(`\n- Relationships: ${escrowAnalysis.relationships.length} (expected: 8-12)`);
  const relationshipTypeCount = new Map<string, number>();
  
  escrowAnalysis.relationships.forEach(rel => {
    const count = relationshipTypeCount.get(rel.type) || 0;
    relationshipTypeCount.set(rel.type, count + 1);
    
    console.log(`  • ${rel.fromBoxId} -[${rel.type}]-> ${rel.toBoxId} (${rel.strength})`);
    if (rel.metadata?.description) {
      console.log(`    💬 ${rel.metadata.description}`);
    }
  });
  
  console.log('\n📈 Relationship Type Distribution:');
  relationshipTypeCount.forEach((count, type) => {
    console.log(`  - ${type}: ${count}`);
  });

  console.log(`\n- Contracts: ${escrowAnalysis.contracts.length}`);
  escrowAnalysis.contracts.forEach(contract => {
    console.log(`  • ${contract.name} (${contract.type}): ${contract.description}`);
    
    if (contract.analysis) {
      console.log(`    🛡️ Spending: ${contract.analysis.spendingConditions.join(', ')}`);
      console.log(`    📝 Registers: ${contract.analysis.registerValidations.length} validations`);
      console.log(`    🪙 Tokens: ${contract.analysis.tokenValidations.length} validations`);
      
      if (contract.analysis.scenarioBranches?.length > 0) {
        console.log(`    🎭 Scenario Branches: ${contract.analysis.scenarioBranches.length}`);
        contract.analysis.scenarioBranches.forEach(branch => {
          console.log(`      - ${branch.name}: ${branch.description}`);
          console.log(`        Condition: ${branch.condition}`);
          console.log(`        Required Sigs: ${branch.requiredSignatures.join(', ')}`);
        });
      }
      
      if (contract.analysis.temporalConstraints?.length > 0) {
        console.log(`    ⏰ Temporal Constraints: ${contract.analysis.temporalConstraints.length}`);
        contract.analysis.temporalConstraints.forEach(constraint => {
          console.log(`      - ${constraint.description} (${constraint.type} ${constraint.operator} ${constraint.value})`);
        });
      }
      
      if (contract.analysis.multiPartyRequirements?.length > 0) {
        console.log(`    👥 Multi-Party Requirements: ${contract.analysis.multiPartyRequirements.length}`);
        contract.analysis.multiPartyRequirements.forEach(req => {
          console.log(`      - ${req.scenario}: ${req.description}`);
          console.log(`        Parties: ${req.requiredParties.join(', ')} (${req.signatureType})`);
        });
      }
    }
  });

  // Summary validation
  console.log('\n✅ ESCROW PARSING VALIDATION:');
  console.log(`- Three-party system: ${escrowAnalysis.parties.length >= 3 ? '✓' : '✗'} (${escrowAnalysis.parties.length}/3)`);
  console.log(`- Multiple scenarios: ${escrowAnalysis.transactions.filter(tx => tx.scenario).length >= 3 ? '✓' : '✗'} (${escrowAnalysis.transactions.filter(tx => tx.scenario).length}/3)`);
  console.log(`- Complex relationships: ${escrowAnalysis.relationships.length >= 8 ? '✓' : '✗'} (${escrowAnalysis.relationships.length}/8)`);
  console.log(`- Escrow box types: ${Array.from(boxTypeCount.keys()).some(type => type.includes('escrow')) ? '✓' : '✗'}`);
  console.log(`- Multi-party contracts: ${escrowAnalysis.contracts.some(c => c.analysis?.multiPartyRequirements?.length > 0) ? '✓' : '✗'}`);
  console.log(`- Temporal constraints: ${escrowAnalysis.contracts.some(c => c.analysis?.temporalConstraints?.length > 0) ? '✓' : '✗'}`);

  console.log('\n✅ Enhanced escrow parsing test complete!');
  console.log('='.repeat(80));
}

// Run test if this file is executed directly
if (typeof window === 'undefined') {
  testEscrowParsing();
}