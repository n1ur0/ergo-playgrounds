/**
 * Test script for the Heads or Tails Gaming Contract parsing
 * 
 * This validates that the enhanced parser can properly extract the complex
 * multi-phase gaming flow from our comprehensive Heads or Tails contract.
 */

import { enhancedContractParser } from './ContractParser.js';

// Heads or Tails contract code for testing
const headsOrTailsCode = `// COMPREHENSIVE HEADS OR TAILS GAMING CONTRACT
// A complete provably fair coin flip game with multi-phase UTXO flow
// Demonstrates commit-reveal schemes, timeout mechanisms, and fair gaming principles

// ========================================
// GAME CONFIGURATION
// ========================================
val betAmount = 50000000L // 0.05 ERG per player
val commitmentDeadline = 50L // blocks for commitment phase
val callDeadline = 100L // blocks for player 2 to call
val revealDeadline = 150L // blocks for player 1 to reveal
val timeoutGracePeriod = 200L // blocks for final timeout claims

// Player public keys (in real implementation these would be actual keys)
val player1PubKey = "03a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3"
val player2PubKey = "03f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9f0a1b2e3d4c5f6a7b8c9d0e1f2a3b4c5d6"

// ========================================
// BLOCKCHAIN SIMULATION SETUP
// ========================================
val blockchainSim = newBlockChainSimulationScenario("Provably Fair Heads or Tails Game")
val player1Party = blockchainSim.newParty("Alice_Player1")
val player2Party = blockchainSim.newParty("Bob_Player2")

// Initialize player funds
val player1Funds = 200000000L // 0.2 ERG (enough for multiple games)
val player2Funds = 200000000L // 0.2 ERG

player1Party.generateUnspentBoxes(toSpend = player1Funds)
player2Party.generateUnspentBoxes(toSpend = player2Funds)

// PHASE 1: GAME SETUP - Both players deposit bets
// ===============================================
val gameId = Blake2b256("heads_or_tails_game_001".getBytes())

val setupGameBox = Box(
  value = betAmount * 2, // Combined bets from both players
  script = gameContract,
  registers = Map(
    R4 -> 0,        // Initial game state: setup
    R5 -> Coll[Byte](), // Player 1 commitment (empty initially)
    R6 -> -1,       // Player 2 call (not set)
    R7 -> gameId,   // Unique game identifier
    R8 -> betAmount // Bet amount per player
  )
)

val setupTransaction = Transaction(
  inputs = player1Party.selectUnspentBoxes(toSpend = betAmount + MinTxFee) ++
           player2Party.selectUnspentBoxes(toSpend = betAmount + MinTxFee),
  outputs = List(setupGameBox),
  fee = MinTxFee,
  sendChangeTo = player1Party.wallet.getAddress
)

val setupTransactionSigned = player1Party.wallet.sign(
  player2Party.wallet.sign(setupTransaction)
)
blockchainSim.send(setupTransactionSigned)
println("✓ PHASE 1 COMPLETE: Game setup with both player deposits")

// PHASE 2: PLAYER 1 COMMITMENT - Hash commitment of choice
// =======================================================
val player1Choice = 0 // 0 = heads, 1 = tails
val player1Nonce = Blake2b256("player1_secret_nonce_12345".getBytes()) // Random nonce
val choiceBytes = if (player1Choice == 0) Coll[Byte](0x00) else Coll[Byte](0x01)
val player1Commitment = Blake2b256(choiceBytes ++ player1Nonce)

val committedGameBox = Box(
  value = betAmount * 2,
  script = gameContract,
  registers = Map(
    R4 -> 1, // Game state: player1 committed
    R5 -> player1Commitment, // Player 1's hashed choice
    R6 -> -1, // Player 2 call (not set yet)
    R7 -> gameId,
    R8 -> betAmount
  )
)

val commitmentTransaction = Transaction(
  inputs = List(setupTransactionSigned.outputs(0)),
  outputs = List(committedGameBox),
  fee = MinTxFee
)

val commitmentTransactionSigned = player1Party.wallet.sign(commitmentTransaction)
blockchainSim.send(commitmentTransactionSigned)

// PHASE 3: PLAYER 2 CALL - Player 2 calls heads or tails
// ======================================================
val player2Choice = 1 // 0 = heads, 1 = tails (calling tails)

val calledGameBox = Box(
  value = betAmount * 2,
  script = gameContract,
  registers = Map(
    R4 -> 2, // Game state: player2 called
    R5 -> player1Commitment, // Preserve player 1's commitment
    R6 -> player2Choice, // Player 2's call
    R7 -> gameId,
    R8 -> betAmount
  )
)

val callTransaction = Transaction(
  inputs = List(commitmentTransactionSigned.outputs(0)),
  outputs = List(calledGameBox),
  fee = MinTxFee
)

val callTransactionSigned = player2Party.wallet.sign(callTransaction)
blockchainSim.send(callTransactionSigned)

// PHASE 4: REVEAL AND RESOLUTION - Player 1 reveals, game resolves
// ================================================================
val player1Wins = player1Choice == player2Choice // 0 != 1, so Player 2 wins
val winnerParty = if (player1Wins) player1Party else player2Party

val winnerBox = Box(
  value = (betAmount * 2) - MinTxFee,
  script = contract(winnerParty.wallet.getAddress.pubKey)
)

val revealTransaction = Transaction(
  inputs = List(callTransactionSigned.outputs(0)),
  outputs = List(winnerBox),
  fee = MinTxFee
)

val revealTransactionSigned = winnerParty.wallet.sign(revealTransaction)
blockchainSim.send(revealTransactionSigned)
println("✓ PHASE 4 COMPLETE: Game resolved - Player 2 (Bob) wins!")`;

/**
 * Tests the enhanced parser with the Heads or Tails gaming contract
 */
export function testHeadsOrTailsParsing(): void {
  console.log('='.repeat(80));
  console.log('HEADS OR TAILS GAMING CONTRACT PARSER TEST');
  console.log('='.repeat(80));

  console.log('\n🎲 Analyzing Heads or Tails Gaming Contract...\n');
  const analysis = enhancedContractParser.parseContract(headsOrTailsCode);
  
  console.log('📊 Gaming Contract Analysis Results:');
  
  // Parties analysis
  console.log(`\n👥 Parties: ${analysis.parties.length}`);
  analysis.parties.forEach(party => {
    console.log(`  • ${party.name} (${party.role})`);
    if (party.role === 'player') {
      console.log(`    🎮 Gaming role detected`);
    }
  });
  
  // Boxes analysis - should show multi-phase game states
  console.log(`\n📦 Boxes: ${analysis.boxes.length}`);
  analysis.boxes.forEach(box => {
    console.log(`  • ${box.id} (${box.boxType}) - ${box.description}`);
    
    // Check for gaming-specific metadata
    if (box.registers.R4) {
      console.log(`    🎮 Game State (R4): ${box.registers.R4.description}`);
    }
    if (box.registers.R5) {
      console.log(`    🔒 Player 1 Commitment (R5): ${box.registers.R5.description}`);
    }
    if (box.registers.R6) {
      console.log(`    📞 Player 2 Call (R6): ${box.registers.R6.description}`);
    }
    if (box.registers.R7) {
      console.log(`    🆔 Game ID (R7): ${box.registers.R7.description}`);
    }
    if (box.registers.R8) {
      console.log(`    💰 Bet Amount (R8): ${box.registers.R8.description}`);
    }

    if (box.value) {
      const ergValue = (parseInt(box.value) / 1000000000).toFixed(3);
      console.log(`    💎 Value: ${ergValue} ERG`);
    }
  });
  
  // Transactions analysis - should show 4-phase flow
  console.log(`\n🔄 Transactions: ${analysis.transactions.length}`);
  analysis.transactions.forEach((tx, index) => {
    console.log(`  • ${tx.id} (${tx.type}) - ${tx.status}`);
    
    // Infer game phase from transaction pattern
    const phaseNames = [
      'Game Setup & Deposit',
      'Player 1 Commitment',
      'Player 2 Call',
      'Reveal & Resolution'
    ];
    
    if (index < phaseNames.length) {
      console.log(`    🎯 Game Phase: ${phaseNames[index]}`);
    }
    
    if (tx.protocolStage) {
      console.log(`    📊 Protocol Stage: ${tx.protocolStage.currentStage}/${tx.protocolStage.totalStages}`);
    }
  });
  
  // Relationships analysis
  console.log(`\n🔗 Relationships: ${analysis.relationships.length}`);
  analysis.relationships.forEach(rel => {
    console.log(`  • ${rel.fromBoxId} -[${rel.type}]-> ${rel.toBoxId}`);
    console.log(`    💪 Strength: ${rel.strength}, 📝 Description: ${rel.description}`);
  });

  // Protocol context
  if (analysis.protocolContext) {
    console.log(`\n🎲 Protocol Context:`);
    console.log(`  • Protocol: ${analysis.protocolContext.protocolName}`);
    console.log(`  • Type: ${analysis.protocolContext.protocolType}`);
    console.log(`  • Version: ${analysis.protocolContext.version}`);
    console.log(`  • Features: ${analysis.protocolContext.features.join(', ')}`);
  }

  // Gaming-specific metrics
  console.log(`\n🎮 Gaming Metrics:`);
  console.log(`  • Token Flows: ${analysis.tokenFlows.length}`);
  console.log(`  • ERG Flows: ${analysis.ergFlows.length}`);
  
  const gamingBoxes = analysis.boxes.filter(box => 
    box.registers.R4 || box.registers.R5 || box.description.toLowerCase().includes('game')
  );
  console.log(`  • Gaming-related Boxes: ${gamingBoxes.length}`);
  
  const commitRevealBoxes = analysis.boxes.filter(box =>
    box.registers.R5 && box.registers.R5.description.toLowerCase().includes('commitment')
  );
  console.log(`  • Commit-Reveal Boxes: ${commitRevealBoxes.length}`);

  // Analyze contract complexity
  console.log(`\n📈 Contract Complexity:`);
  console.log(`  • Multi-phase Flow: ${analysis.transactions.length >= 4 ? 'YES' : 'NO'}`);
  console.log(`  • State Management: ${analysis.boxes.some(b => b.registers.R4) ? 'YES' : 'NO'}`);
  console.log(`  • Provably Fair: ${analysis.boxes.some(b => b.registers.R5) ? 'YES' : 'NO'}`);
  console.log(`  • Timeout Protection: ${headsOrTailsCode.includes('timeout') ? 'YES' : 'NO'}`);

  console.log('\n✅ Heads or Tails parsing test complete!');
  console.log('='.repeat(80));
  
  return analysis;
}

// Run test if this file is executed directly
if (typeof window === 'undefined' && typeof module !== 'undefined') {
  testHeadsOrTailsParsing();
}

export default testHeadsOrTailsParsing;