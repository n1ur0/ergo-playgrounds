import React, { useState, useEffect } from 'react';
import { Code, Play, RefreshCw, CheckCircle, XCircle, Settings, Users, Network, BookOpen } from '../utils/icons';
import CodeEditor from './CodeEditor';
import SimulationResults from './SimulationResults';
import ContractParameters from './ContractParameters';
// import UTXOVisualization from './visualization/UTXOVisualization';
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const ContractEducation = lazy(() => import('./education/ContractEducation'));
const ContractDesigner = lazy(() => import('./designer/LazyContractDesigner'));
import './ContractTester.css';

interface ContractTesterProps {
  selectedExample: string | null;
  layout?: 'vertical' | 'horizontal' | 'responsive'; // Optional layout prop for responsive behavior
}

interface SimulationResult {
  success: boolean;
  message: string;
  transactions: Array<{
    id: string;
    type: 'deposit' | 'withdraw' | 'swap';
    from: string;
    to: string;
    amount: string;
    status: 'success' | 'failed';
  }>;
  balances: Record<string, string>;
  logs: string[];
}

const exampleCodes = {
  simpleSend: `// Simple Send Contract
val trueScript = "sigmaProp(1 == 1)"

// Create blockchain simulation
val blockchainSim = newBlockChainSimulationScenario("Send Scenario")

// Define parties
val senderParty = blockchainSim.newParty("sender")
val receiverParty = blockchainSim.newParty("receiver")

// Set initial funds
val senderFunds = 100000000L // 0.1 ERG
val receiverFunds = 0L

// Generate initial funds for sender
senderParty.generateUnspentBoxes(toSpend = senderFunds)

// Create deposit transaction
val trueContract = ErgoScriptCompiler.compile(Map(), trueScript)
val trueBox = Box(value = 50000000L, script = trueContract)

val depositTransaction = Transaction(
  inputs = senderParty.selectUnspentBoxes(toSpend = senderFunds),
  outputs = List(trueBox),
  fee = MinTxFee,
  sendChangeTo = senderParty.wallet.getAddress
)

// Execute transaction
val depositTransactionSigned = senderParty.wallet.sign(depositTransaction)
blockchainSim.send(depositTransactionSigned)`,

  pinLockContract: `// Pin Lock Contract
val pinNumber = "1293"
val hashedPin = Blake2b256(pinNumber.getBytes())

val pinLockScript = s"""
  sigmaProp(SELF.R4[Coll[Byte]].get == blake2b256(OUTPUTS(0).R4[Coll[Byte]].get))
""".stripMargin

val pinLockContract = ErgoScriptCompiler.compile(Map(), pinLockScript)

// Create blockchain simulation
val blockchainSim = newBlockChainSimulationScenario("PinLock Scenario")
val userParty = blockchainSim.newParty("user")
val userFunds = 100000000L

userParty.generateUnspentBoxes(toSpend = userFunds)

// Create pin-locked box
val pinLockBox = Box(
  value = userFunds/2,
  script = pinLockContract,
  register = (R4 -> hashedPin)
)

// Deposit transaction
val depositTransaction = Transaction(
  inputs = userParty.selectUnspentBoxes(toSpend = userFunds),
  outputs = List(pinLockBox),
  fee = MinTxFee,
  sendChangeTo = userParty.wallet.getAddress
)

val depositTransactionSigned = userParty.wallet.sign(depositTransaction)
blockchainSim.send(depositTransactionSigned)

// Withdraw with correct pin
val withdrawBox = Box(
  value = userFunds/2 - MinTxFee,
  script = contract(userParty.wallet.getAddress.pubKey),
  register = (R4 -> pinNumber.getBytes())
)

val withdrawTransaction = Transaction(
  inputs = List(depositTransactionSigned.outputs(0)),
  outputs = List(withdrawBox),
  fee = MinTxFee
)

val withdrawTransactionSigned = userParty.wallet.sign(withdrawTransaction)
blockchainSim.send(withdrawTransactionSigned)`,

  escrowDepositContract: `// Escrow Deposit Contract
// A three-party escrow where buyer deposits funds, seller provides goods,
// and an arbiter can resolve disputes
val buyerPubKey = "buyer_public_key_here"
val sellerPubKey = "seller_public_key_here"
val arbiterPubKey = "arbiter_public_key_here"
val timeoutBlocks = 100L

val escrowScript = s"""
{
  // Either buyer and seller both agree (normal completion)
  val normalCompletion = sigmaProp(buyerPubKey) && sigmaProp(sellerPubKey)
  
  // Or arbiter makes decision in case of dispute
  val arbiterDecision = sigmaProp(arbiterPubKey)
  
  // Or timeout reached and buyer can reclaim funds
  val timeoutRefund = sigmaProp(buyerPubKey) && (HEIGHT > SELF.creationInfo._1 + $timeoutBlocks)
  
  normalCompletion || arbiterDecision || timeoutRefund
}
""".stripMargin

val escrowContract = ErgoScriptCompiler.compile(Map(), escrowScript)

// Create blockchain simulation
val blockchainSim = newBlockChainSimulationScenario("Escrow Scenario")
val buyerParty = blockchainSim.newParty("buyer")
val sellerParty = blockchainSim.newParty("seller")
val arbiterParty = blockchainSim.newParty("arbiter")

// Initial funds
val buyerFunds = 200000000L // 0.2 ERG
val escrowAmount = 100000000L // 0.1 ERG

buyerParty.generateUnspentBoxes(toSpend = buyerFunds)
sellerParty.generateUnspentBoxes(toSpend = 50000000L)

// Create escrow box
val escrowBox = Box(
  value = escrowAmount,
  script = escrowContract
)

// Buyer deposits into escrow
val depositTransaction = Transaction(
  inputs = buyerParty.selectUnspentBoxes(toSpend = buyerFunds),
  outputs = List(escrowBox),
  fee = MinTxFee,
  sendChangeTo = buyerParty.wallet.getAddress
)

val depositTransactionSigned = buyerParty.wallet.sign(depositTransaction)
blockchainSim.send(depositTransactionSigned)

// Successful completion - funds released to seller
val releaseBox = Box(
  value = escrowAmount - MinTxFee,
  script = contract(sellerParty.wallet.getAddress.pubKey)
)

val releaseTransaction = Transaction(
  inputs = List(depositTransactionSigned.outputs(0)),
  outputs = List(releaseBox),
  fee = MinTxFee
)

// Both buyer and seller sign for normal completion
val releaseTransactionSigned = buyerParty.wallet.sign(
  sellerParty.wallet.sign(releaseTransaction)
)
blockchainSim.send(releaseTransactionSigned)`,

  tokenSalesService: `// Token Sales Service Contract
// Comprehensive token sales platform with dynamic pricing and multiple buyer support
val tokenId = "SALES_TOKEN_001" 
val sellerPubKey = "seller_public_key_here"
val initialPrice = 1000000L // 0.001 ERG per token
val priceIncrement = 100000L // Price increases by 0.0001 ERG per 1000 tokens sold
val maxTokensPerPurchase = 10000L
val minPurchaseAmount = 100L

val tokenSalesScript = s"""
{
  // Sales contract state tracking
  val tokensSold = SELF.R4[Long].get
  val currentPrice = SELF.R5[Long].get
  val totalErgCollected = SELF.R6[Long].get
  
  val validPurchase = {
    // Buyer provides payment and specifies token amount
    val tokensRequested = INPUTS(1).R7[Long].get // Buyer specifies amount in register
    val paymentProvided = INPUTS(1).value
    
    // Calculate current price based on tokens already sold
    val expectedPrice = $initialPrice + (tokensSold / 1000L) * $priceIncrement
    val requiredPayment = tokensRequested * expectedPrice
    
    // Validate purchase constraints
    val validAmount = tokensRequested >= $minPurchaseAmount && tokensRequested <= $maxTokensPerPurchase
    val sufficientPayment = paymentProvided >= requiredPayment
    val tokensAvailable = SELF.tokens(0)._2 >= tokensRequested
    
    // Check outputs: buyer gets tokens, sales contract is updated
    val buyerGetsTokens = OUTPUTS(0).tokens(0)._1 == SELF.tokens(0)._1 && 
                         OUTPUTS(0).tokens(0)._2 == tokensRequested &&
                         OUTPUTS(0).propositionBytes != SELF.propositionBytes
    
    // Sales contract updated with new state
    val updatedSalesContract = {
      val newTokensSold = tokensSold + tokensRequested
      val newPrice = $initialPrice + (newTokensSold / 1000L) * $priceIncrement  
      val newErgBalance = totalErgCollected + requiredPayment
      val remainingTokens = SELF.tokens(0)._2 - tokensRequested
      
      OUTPUTS(1).R4[Long].get == newTokensSold &&
      OUTPUTS(1).R5[Long].get == newPrice &&
      OUTPUTS(1).R6[Long].get == newErgBalance &&
      OUTPUTS(1).tokens(0)._2 == remainingTokens
    }
    
    validAmount && sufficientPayment && tokensAvailable && buyerGetsTokens && updatedSalesContract
  }
  
  val sellerWithdrawal = {
    // Seller can withdraw accumulated ERG proceeds
    sigmaProp("$sellerPubKey") && {
      val withdrawAmount = SELF.R6[Long].get // Total ERG collected
      OUTPUTS(0).value >= withdrawAmount - MinTxFee &&
      OUTPUTS(0).propositionBytes == fromBase64("$sellerPubKey") &&
      // Reset collected ERG counter but preserve token state
      OUTPUTS(1).R6[Long].get == 0L &&
      OUTPUTS(1).R4[Long].get == SELF.R4[Long].get && // Keep tokens sold count
      OUTPUTS(1).R5[Long].get == SELF.R5[Long].get    // Keep current price
    }
  }
  
  val priceUpdate = {
    // Seller can manually adjust pricing parameters
    sigmaProp("$sellerPubKey") && {
      val newPrice = INPUTS(0).R8[Long].get // New price in input register
      newPrice > 0L &&
      OUTPUTS(0).R5[Long].get == newPrice
    }
  }
  
  validPurchase || sellerWithdrawal || priceUpdate
}
""".stripMargin

val tokenSalesContract = ErgoScriptCompiler.compile(Map(), tokenSalesScript)

// Create blockchain simulation with multiple participants
val blockchainSim = newBlockChainSimulationScenario("Comprehensive Token Sales")
val sellerParty = blockchainSim.newParty("TokenSeller")
val buyer1Party = blockchainSim.newParty("Buyer1_Alice")
val buyer2Party = blockchainSim.newParty("Buyer2_Bob") 
val buyer3Party = blockchainSim.newParty("Buyer3_Carol")

// Initial funding
val sellerFunds = 100000000L // 0.1 ERG for setup
val buyer1Funds = 200000000L // 0.2 ERG
val buyer2Funds = 150000000L // 0.15 ERG  
val buyer3Funds = 300000000L // 0.3 ERG
val initialTokenSupply = 1000000L // 1 million tokens

sellerParty.generateUnspentBoxes(toSpend = sellerFunds)
buyer1Party.generateUnspentBoxes(toSpend = buyer1Funds)
buyer2Party.generateUnspentBoxes(toSpend = buyer2Funds)
buyer3Party.generateUnspentBoxes(toSpend = buyer3Funds)

// Generate initial token supply for seller
sellerParty.generateUnspentBoxes(
  toSpend = MinBoxValue,
  tokens = List((tokenId -> initialTokenSupply))
)

// STEP 1: Seller deploys token sales contract
val initialSalesBox = Box(
  value = 50000000L, // Contract operational funds
  script = tokenSalesContract,
  tokens = List((tokenId -> initialTokenSupply)),
  registers = Map(
    R4 -> 0L,           // Tokens sold counter
    R5 -> initialPrice, // Current price per token
    R6 -> 0L            // Total ERG collected
  )
)

val deployTransaction = Transaction(
  inputs = sellerParty.selectUnspentBoxes(toSpend = sellerFunds) ++
           sellerParty.selectUnspentBoxes(tokens = List((tokenId -> initialTokenSupply))),
  outputs = List(initialSalesBox),
  fee = MinTxFee,
  sendChangeTo = sellerParty.wallet.getAddress
)

val deployTransactionSigned = sellerParty.wallet.sign(deployTransaction)
blockchainSim.send(deployTransactionSigned)

// STEP 2: First buyer (Alice) purchases 5000 tokens at initial price
val buyer1TokensToBuy = 5000L
val buyer1ExpectedPrice = initialPrice
val buyer1PaymentRequired = buyer1TokensToBuy * buyer1ExpectedPrice

val buyer1PaymentBox = Box(
  value = buyer1PaymentRequired + MinTxFee,
  script = contract(buyer1Party.wallet.getAddress.pubKey),
  registers = Map(R7 -> buyer1TokensToBuy) // Specify tokens to buy
)

val buyer1TokenBox = Box(
  value = MinBoxValue,
  script = contract(buyer1Party.wallet.getAddress.pubKey),
  tokens = List((tokenId -> buyer1TokensToBuy))
)

val updatedSalesBox1 = Box(
  value = 50000000L + buyer1PaymentRequired - MinTxFee,
  script = tokenSalesContract,
  tokens = List((tokenId -> (initialTokenSupply - buyer1TokensToBuy))),
  registers = Map(
    R4 -> buyer1TokensToBuy,                                           // Tokens sold
    R5 -> (initialPrice + (buyer1TokensToBuy / 1000L) * priceIncrement), // Updated price
    R6 -> buyer1PaymentRequired                                        // ERG collected
  )
)

val buyer1Transaction = Transaction(
  inputs = List(deployTransactionSigned.outputs(0)) ++
           buyer1Party.selectUnspentBoxes(toSpend = buyer1PaymentRequired + MinTxFee),
  outputs = List(buyer1TokenBox, updatedSalesBox1),
  fee = MinTxFee,
  sendChangeTo = buyer1Party.wallet.getAddress
)

val buyer1TransactionSigned = buyer1Party.wallet.sign(buyer1Transaction)
blockchainSim.send(buyer1TransactionSigned)

// STEP 3: Second buyer (Bob) purchases 8000 tokens at increased price
val buyer2TokensToBuy = 8000L
val buyer2ExpectedPrice = initialPrice + (buyer1TokensToBuy / 1000L) * priceIncrement
val buyer2PaymentRequired = buyer2TokensToBuy * buyer2ExpectedPrice

val buyer2PaymentBox = Box(
  value = buyer2PaymentRequired + MinTxFee,
  script = contract(buyer2Party.wallet.getAddress.pubKey),
  registers = Map(R7 -> buyer2TokensToBuy)
)

val buyer2TokenBox = Box(
  value = MinBoxValue,
  script = contract(buyer2Party.wallet.getAddress.pubKey),
  tokens = List((tokenId -> buyer2TokensToBuy))
)

val totalTokensSoldAfterBuyer2 = buyer1TokensToBuy + buyer2TokensToBuy
val updatedSalesBox2 = Box(
  value = 50000000L + buyer1PaymentRequired + buyer2PaymentRequired - (2 * MinTxFee),
  script = tokenSalesContract,
  tokens = List((tokenId -> (initialTokenSupply - totalTokensSoldAfterBuyer2))),
  registers = Map(
    R4 -> totalTokensSoldAfterBuyer2,
    R5 -> (initialPrice + (totalTokensSoldAfterBuyer2 / 1000L) * priceIncrement),
    R6 -> (buyer1PaymentRequired + buyer2PaymentRequired)
  )
)

val buyer2Transaction = Transaction(
  inputs = List(buyer1TransactionSigned.outputs(1)) ++
           buyer2Party.selectUnspentBoxes(toSpend = buyer2PaymentRequired + MinTxFee),
  outputs = List(buyer2TokenBox, updatedSalesBox2),
  fee = MinTxFee,
  sendChangeTo = buyer2Party.wallet.getAddress
)

val buyer2TransactionSigned = buyer2Party.wallet.sign(buyer2Transaction)
blockchainSim.send(buyer2TransactionSigned)

// STEP 4: Third buyer (Carol) purchases 12000 tokens (testing max limit)
val buyer3TokensToBuy = maxTokensPerPurchase // 10000L (max allowed)
val buyer3ExpectedPrice = initialPrice + (totalTokensSoldAfterBuyer2 / 1000L) * priceIncrement
val buyer3PaymentRequired = buyer3TokensToBuy * buyer3ExpectedPrice

val buyer3TokenBox = Box(
  value = MinBoxValue,
  script = contract(buyer3Party.wallet.getAddress.pubKey),
  tokens = List((tokenId -> buyer3TokensToBuy))
)

val totalTokensSoldAfterBuyer3 = totalTokensSoldAfterBuyer2 + buyer3TokensToBuy
val updatedSalesBox3 = Box(
  value = 50000000L + buyer1PaymentRequired + buyer2PaymentRequired + buyer3PaymentRequired - (3 * MinTxFee),
  script = tokenSalesContract,
  tokens = List((tokenId -> (initialTokenSupply - totalTokensSoldAfterBuyer3))),
  registers = Map(
    R4 -> totalTokensSoldAfterBuyer3,
    R5 -> (initialPrice + (totalTokensSoldAfterBuyer3 / 1000L) * priceIncrement),
    R6 -> (buyer1PaymentRequired + buyer2PaymentRequired + buyer3PaymentRequired)
  )
)

val buyer3Transaction = Transaction(
  inputs = List(buyer2TransactionSigned.outputs(1)) ++
           buyer3Party.selectUnspentBoxes(toSpend = buyer3PaymentRequired + MinTxFee),
  outputs = List(buyer3TokenBox, updatedSalesBox3),
  fee = MinTxFee,
  sendChangeTo = buyer3Party.wallet.getAddress
)

val buyer3TransactionSigned = buyer3Party.wallet.sign(buyer3Transaction)
blockchainSim.send(buyer3TransactionSigned)

// STEP 5: Seller withdraws accumulated ERG proceeds
val totalErgCollected = buyer1PaymentRequired + buyer2PaymentRequired + buyer3PaymentRequired

val sellerWithdrawalBox = Box(
  value = totalErgCollected - MinTxFee,
  script = contract(sellerParty.wallet.getAddress.pubKey)
)

val finalSalesBox = Box(
  value = 50000000L, // Reset to original operational balance
  script = tokenSalesContract,
  tokens = List((tokenId -> (initialTokenSupply - totalTokensSoldAfterBuyer3))),
  registers = Map(
    R4 -> totalTokensSoldAfterBuyer3, // Keep tokens sold count
    R5 -> (initialPrice + (totalTokensSoldAfterBuyer3 / 1000L) * priceIncrement), // Keep current price
    R6 -> 0L // Reset ERG collected counter
  )
)

val withdrawalTransaction = Transaction(
  inputs = List(buyer3TransactionSigned.outputs(1)),
  outputs = List(sellerWithdrawalBox, finalSalesBox),
  fee = MinTxFee
)

val withdrawalTransactionSigned = sellerParty.wallet.sign(withdrawalTransaction)
blockchainSim.send(withdrawalTransactionSigned)

// SUMMARY: Complete token sales flow demonstrated
// - Seller deploys sales contract with 1M tokens
// - Alice buys 5K tokens at base price (0.001 ERG/token)
// - Bob buys 8K tokens at increased price
// - Carol buys 10K tokens at further increased price  
// - Seller withdraws all accumulated ERG proceeds
// - Sales contract continues operating with remaining tokens`,

  headsOrTails: `// COMPREHENSIVE HEADS OR TAILS GAMING CONTRACT
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
// MULTI-PHASE GAME CONTRACT
// ========================================
val headsOrTailsScript = s"""
{
  // =====================================
  // GAME STATE TRACKING (Register R4)
  // =====================================
  // States: 0=setup, 1=player1_committed, 2=player2_called, 3=revealed, 4=finished
  val gameState = SELF.R4[Int].get
  val creationHeight = SELF.creationInfo._1
  
  // =====================================
  // GAME DATA STORAGE
  // =====================================
  val player1Commitment = SELF.R5[Coll[Byte]].getOrElse(Coll[Byte]()) // Hash of (choice + nonce)
  val player2Call = SELF.R6[Int].getOrElse(-1) // 0=heads, 1=tails, -1=not set
  val gameId = SELF.R7[Coll[Byte]].getOrElse(Coll[Byte]()) // Unique game identifier
  val betAmountStored = SELF.R8[Long].getOrElse(0L) // Stored bet amount
  
  // =====================================
  // PHASE 1: SETUP AND INITIAL DEPOSIT
  // =====================================
  val setupPhase = {
    gameState == 0 && {
      // Both players must deposit their bets
      val totalValue = SELF.value
      val correctBetAmount = totalValue == ($betAmount * 2)
      
      // Game can proceed to commitment phase
      correctBetAmount && HEIGHT <= creationHeight + $commitmentDeadline
    }
  }
  
  // =====================================
  // PHASE 2: PLAYER 1 COMMITMENT
  // =====================================  
  val commitmentPhase = {
    (gameState == 0 || gameState == 1) && {
      // Player 1 commits hash of (choice + nonce)
      val newCommitment = INPUTS(0).R5[Coll[Byte]].getOrElse(Coll[Byte]())
      val validCommitment = newCommitment.size == 32 // Blake2b256 hash size
      
      // Update game state to committed
      validCommitment &&
      HEIGHT <= creationHeight + $commitmentDeadline &&
      OUTPUTS(0).R4[Int].get == 1 && // Update state to committed
      OUTPUTS(0).R5[Coll[Byte]].get == newCommitment && // Store commitment
      OUTPUTS(0).value == SELF.value // Preserve bet funds
    }
  }
  
  // =====================================
  // PHASE 3: PLAYER 2 CALLS HEADS/TAILS
  // =====================================
  val callingPhase = {
    gameState == 1 && {
      // Player 2 makes their call (0=heads, 1=tails)
      val player2Choice = INPUTS(0).R6[Int].getOrElse(-1)
      val validCall = player2Choice == 0 || player2Choice == 1
      
      // Update game state with player 2's call
      validCall &&
      HEIGHT <= creationHeight + $callDeadline &&
      OUTPUTS(0).R4[Int].get == 2 && // Update state to called
      OUTPUTS(0).R6[Int].get == player2Choice && // Store player 2's call
      OUTPUTS(0).R5[Coll[Byte]].get == player1Commitment && // Preserve commitment
      OUTPUTS(0).value == SELF.value // Preserve bet funds
    }
  }
  
  // =====================================
  // PHASE 4: PLAYER 1 REVEAL AND RESOLUTION
  // =====================================
  val revealPhase = {
    gameState == 2 && {
      // Player 1 reveals their choice and nonce
      val player1Choice = INPUTS(0).R7[Int].getOrElse(-1) // 0=heads, 1=tails
      val player1Nonce = INPUTS(0).R8[Coll[Byte]].getOrElse(Coll[Byte]())
      val player2Choice = player2Call
      
      // Validate reveal data
      val validChoice = player1Choice == 0 || player1Choice == 1
      val validNonce = player1Nonce.size > 0
      
      // Verify commitment integrity (provably fair mechanism)
      val choiceBytes = if (player1Choice == 0) Coll[Byte](0x00) else Coll[Byte](0x01)
      val computedHash = blake2b256(choiceBytes ++ player1Nonce)
      val validCommitment = computedHash == player1Commitment
      
      // Determine winner using game rules:
      // - If choices match (both heads or both tails): Player 1 wins
      // - If choices differ: Player 2 wins
      val player1Wins = player1Choice == player2Choice
      val player2Wins = !player1Wins
      
      // Validate reveal and determine payout
      validChoice && validNonce && validCommitment && 
      HEIGHT <= creationHeight + $revealDeadline && {
        if (player1Wins) {
          // Player 1 takes all funds
          OUTPUTS(0).value >= ($betAmount * 2) - MinTxFee &&
          OUTPUTS(0).propositionBytes == sigmaProp("$player1PubKey").propBytes
        } else {
          // Player 2 takes all funds  
          OUTPUTS(0).value >= ($betAmount * 2) - MinTxFee &&
          OUTPUTS(0).propositionBytes == sigmaProp("$player2PubKey").propBytes
        }
      }
    }
  }
  
  // =====================================
  // TIMEOUT AND REFUND MECHANISMS
  // =====================================
  val timeoutRefunds = {
    val currentHeight = HEIGHT
    
    // Commitment timeout - refund both players equally
    val commitmentTimeout = {
      gameState == 0 && 
      currentHeight > creationHeight + $commitmentDeadline &&
      OUTPUTS.size == 2 &&
      OUTPUTS(0).value >= $betAmount - MinTxFee &&
      OUTPUTS(1).value >= $betAmount - MinTxFee &&
      OUTPUTS(0).propositionBytes == sigmaProp("$player1PubKey").propBytes &&
      OUTPUTS(1).propositionBytes == sigmaProp("$player2PubKey").propBytes
    }
    
    // Call timeout - Player 1 can claim all (Player 2 forfeits)
    val callTimeout = {
      gameState == 1 && 
      currentHeight > creationHeight + $callDeadline &&
      OUTPUTS(0).value >= ($betAmount * 2) - MinTxFee &&
      OUTPUTS(0).propositionBytes == sigmaProp("$player1PubKey").propBytes
    }
    
    // Reveal timeout - Player 2 can claim all (Player 1 forfeits)
    val revealTimeout = {
      gameState == 2 && 
      currentHeight > creationHeight + $revealDeadline &&
      OUTPUTS(0).value >= ($betAmount * 2) - MinTxFee &&
      OUTPUTS(0).propositionBytes == sigmaProp("$player2PubKey").propBytes
    }
    
    // Emergency timeout - Anyone can claim after very long delay
    val emergencyTimeout = {
      currentHeight > creationHeight + $timeoutGracePeriod
    }
    
    commitmentTimeout || callTimeout || revealTimeout || emergencyTimeout
  }
  
  // =====================================
  // CONTRACT VALIDATION LOGIC
  // =====================================
  setupPhase || commitmentPhase || callingPhase || revealPhase || timeoutRefunds
}
""".stripMargin

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

// Compile the game contract
val gameContract = ErgoScriptCompiler.compile(Map(), headsOrTailsScript)

// ========================================
// GAME EXECUTION FLOW
// ========================================

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

// Add commitment data to transaction context
val commitmentTransactionWithData = commitmentTransaction.copy(
  inputs = commitmentTransaction.inputs.map(_.copy(
    extension = Map(R5 -> player1Commitment)
  ))
)

val commitmentTransactionSigned = player1Party.wallet.sign(commitmentTransactionWithData)
blockchainSim.send(commitmentTransactionSigned)
println("✓ PHASE 2 COMPLETE: Player 1 committed hash of choice")

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

// Add player 2's call to transaction context
val callTransactionWithData = callTransaction.copy(
  inputs = callTransaction.inputs.map(_.copy(
    extension = Map(R6 -> player2Choice)
  ))
)

val callTransactionSigned = player2Party.wallet.sign(callTransactionWithData)
blockchainSim.send(callTransactionSigned)
println("✓ PHASE 3 COMPLETE: Player 2 called tails")

// PHASE 4: REVEAL AND RESOLUTION - Player 1 reveals, game resolves
// ================================================================
// Player 1 reveals their choice and nonce to prove fairness
// Winner determination: same choices = Player 1 wins, different = Player 2 wins

val player1Wins = player1Choice == player2Choice // 0 != 1, so Player 2 wins
val winnerPubKey = if (player1Wins) player1PubKey else player2PubKey
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

// Add reveal data to prove commitment validity
val revealTransactionWithData = revealTransaction.copy(
  inputs = revealTransaction.inputs.map(_.copy(
    extension = Map(
      R7 -> player1Choice, // Player 1's actual choice
      R8 -> player1Nonce   // Player 1's nonce for verification
    )
  ))
)

val revealTransactionSigned = winnerParty.wallet.sign(revealTransactionWithData)
blockchainSim.send(revealTransactionSigned)
println("✓ PHASE 4 COMPLETE: Game resolved - Player 2 (Bob) wins!")

// ========================================
// ALTERNATIVE SCENARIO: TIMEOUT EXAMPLE
// ========================================

// Start a second game to demonstrate timeout mechanism
val setupGameBox2 = Box(
  value = betAmount * 2,
  script = gameContract,
  registers = Map(
    R4 -> 0, // Setup state
    R5 -> Coll[Byte](),
    R6 -> -1,
    R7 -> Blake2b256("game_002".getBytes()),
    R8 -> betAmount
  )
)

val setupTransaction2 = Transaction(
  inputs = player1Party.selectUnspentBoxes(toSpend = betAmount + MinTxFee) ++
           player2Party.selectUnspentBoxes(toSpend = betAmount + MinTxFee),
  outputs = List(setupGameBox2),
  fee = MinTxFee
)

val setupTransaction2Signed = player1Party.wallet.sign(
  player2Party.wallet.sign(setupTransaction2)
)
blockchainSim.send(setupTransaction2Signed)

// Simulate timeout scenario - advance blocks beyond commitment deadline
blockchainSim.advanceTime(commitmentDeadline + 10)

// Create timeout refund transaction - both players get their bets back
val refundBox1 = Box(
  value = betAmount - MinTxFee,
  script = contract(player1Party.wallet.getAddress.pubKey)
)

val refundBox2 = Box(
  value = betAmount - MinTxFee,  
  script = contract(player2Party.wallet.getAddress.pubKey)
)

val timeoutRefundTransaction = Transaction(
  inputs = List(setupTransaction2Signed.outputs(0)),
  outputs = List(refundBox1, refundBox2),
  fee = MinTxFee
)

val timeoutRefundSigned = player1Party.wallet.sign(
  player2Party.wallet.sign(timeoutRefundTransaction)
)
blockchainSim.send(timeoutRefundSigned)
println("✓ TIMEOUT SCENARIO: Both players refunded due to commitment timeout")

// ========================================
// GAME SUMMARY AND VERIFICATION
// ========================================
println("\\n=== HEADS OR TAILS GAME COMPLETE ===")
val player1ChoiceStr = if (player1Choice == 0) "HEADS" else "TAILS"
val player2ChoiceStr = if (player2Choice == 0) "HEADS" else "TAILS"
val winnerStr = if (player1Wins) "Player 1 (Alice)" else "Player 2 (Bob)"
val payoutAmount = (betAmount * 2) - MinTxFee

println(s"Game 1 Result: Player 1 chose $player1ChoiceStr")
println(s"               Player 2 called $player2ChoiceStr") 
println(s"               Winner: $winnerStr")
println(s"               Payout: $payoutAmount nanoERGs")
println("Game 2 Result: Timeout refund scenario demonstrated")
println("\\nKey Features Demonstrated:")
println("- Multi-phase UTXO flow (Setup → Commit → Call → Reveal)")
println("- Provably fair commit-reveal scheme with hash verification")
println("- Timeout mechanisms protecting both players")
println("- Complete transaction lifecycle with proper state transitions")
println("- Educational value showing blockchain gaming principles")`,

  singleChainSwap: `// COMPREHENSIVE SINGLE CHAIN ATOMIC SWAP CONTRACT
// Demonstrates trustless cross-asset exchange using hash locks and timeouts
// Educational implementation showing complete UTXO flow and atomic execution

// ========================================
// ATOMIC SWAP CONFIGURATION
// ========================================
val swapAmount = 100000000L // 0.1 ERG (Party A offers)
val tokenId = "ATOM_SWAP_TOKEN_001" // Token ID for demonstration
val tokenAmount = 5000L // 5000 tokens (Party B offers)
val secretPhrase = "atomic_swap_secret_12345_demo"
val secretHash = Blake2b256(secretPhrase.getBytes())
val shortTimeout = 100L // blocks for Party B to claim
val longTimeout = 200L // blocks for Party A to reclaim

// Party public keys (in real implementation these would be actual keys)
val partyAPubKey = "03a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3"
val partyBPubKey = "03f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9f0a1b2e3d4c5f6a7b8c9d0e1f2a3b4c5d6"

// ========================================
// HASH-LOCKED SWAP CONTRACT
// ========================================
val atomicSwapScript = s"""
{
  // =====================================
  // CONTRACT STATE AND VALIDATION
  // =====================================
  val creationHeight = SELF.creationInfo._1
  val hasTokens = SELF.tokens.size > 0
  
  // Extract swap parameters from registers
  val swapSecretHash = SELF.R4[Coll[Byte]].get // Hash of secret
  val swapTimeout = SELF.R5[Long].get // Timeout height
  val counterpartyPubKey = SELF.R6[Coll[Byte]].get // Counterparty public key
  val originalOwnerPubKey = SELF.R7[Coll[Byte]].get // Original depositor
  val swapType = SELF.R8[Coll[Byte]].get // "ERG_LOCK" or "TOKEN_LOCK"
  
  // =====================================
  // SECRET REVEAL MECHANISM
  // =====================================
  val secretReveal = {
    // Check if input contains the secret that hashes to stored hash
    val providedSecret = INPUTS(0).R4[Coll[Byte]].getOrElse(Coll[Byte]())
    val validSecret = providedSecret.size > 0 && blake2b256(providedSecret) == swapSecretHash
    
    validSecret
  }
  
  // =====================================
  // COUNTERPARTY CLAIM PATH
  // =====================================
  val counterpartyClaim = {
    secretReveal && {
      // Counterparty reveals secret and claims the locked asset
      val claimerPubKey = OUTPUTS(0).propositionBytes
      val validCounterparty = claimerPubKey == counterpartyPubKey
      
      // Ensure proper asset transfer
      val properTransfer = {
        if (hasTokens) {
          // This is a token lock, counterparty gets tokens
          OUTPUTS(0).tokens.size > 0 &&
          OUTPUTS(0).tokens(0)._1 == SELF.tokens(0)._1 && // Same token ID
          OUTPUTS(0).tokens(0)._2 == SELF.tokens(0)._2    // Same amount
        } else {
          // This is an ERG lock, counterparty gets ERG
          OUTPUTS(0).value >= SELF.value - MinTxFee
        }
      }
      
      validCounterparty && properTransfer && HEIGHT <= creationHeight + swapTimeout
    }
  }
  
  // =====================================
  // TIMEOUT REFUND MECHANISM
  // =====================================
  val timeoutRefund = {
    // Original owner can reclaim after timeout
    val isTimeout = HEIGHT > creationHeight + swapTimeout
    val originalOwnerClaim = OUTPUTS(0).propositionBytes == originalOwnerPubKey
    
    val properRefund = {
      if (hasTokens) {
        // Refund tokens to original owner
        OUTPUTS(0).tokens.size > 0 &&
        OUTPUTS(0).tokens(0)._1 == SELF.tokens(0)._1 &&
        OUTPUTS(0).tokens(0)._2 == SELF.tokens(0)._2
      } else {
        // Refund ERG to original owner
        OUTPUTS(0).value >= SELF.value - MinTxFee
      }
    }
    
    isTimeout && originalOwnerClaim && properRefund
  }
  
  // =====================================
  // CONTRACT VALIDATION LOGIC
  // =====================================
  counterpartyClaim || timeoutRefund
}
""".stripMargin

// Compile the atomic swap contract
val atomicSwapContract = ErgoScriptCompiler.compile(Map(), atomicSwapScript)

// ========================================
// BLOCKCHAIN SIMULATION SETUP
// ========================================
val blockchainSim = newBlockChainSimulationScenario("Comprehensive Single Chain Atomic Swap")
val partyA = blockchainSim.newParty("Alice_ERG_Trader") // Offers ERG, wants tokens
val partyB = blockchainSim.newParty("Bob_Token_Trader") // Offers tokens, wants ERG

// Initialize party funds
val partyAFunds = 300000000L // 0.3 ERG (for swap + fees + change)
val partyBFunds = 100000000L // 0.1 ERG (for fees)

partyA.generateUnspentBoxes(toSpend = partyAFunds)
partyB.generateUnspentBoxes(toSpend = partyBFunds)

// Party B generates tokens to offer in swap
partyB.generateUnspentBoxes(
  toSpend = MinBoxValue,
  tokens = List((tokenId -> tokenAmount))
)

val alicePubKeyBytes = partyA.wallet.getAddress.pubKey.getEncoded()
val bobPubKeyBytes = partyB.wallet.getAddress.pubKey.getEncoded()

// ========================================
// PHASE 1: PARTY A DEPOSITS ERG (INITIATOR)
// ========================================
println("=== PHASE 1: ALICE DEPOSITS ERG ===\n")

// Alice creates hash-locked ERG deposit box
val ergLockBox = Box(
  value = swapAmount,
  script = atomicSwapContract,
  registers = Map(
    R4 -> secretHash,              // Hash of the secret
    R5 -> longTimeout,             // Alice gets longer timeout
    R6 -> bobPubKeyBytes,          // Bob can claim with secret
    R7 -> alicePubKeyBytes,        // Alice can reclaim after timeout
    R8 -> "ERG_LOCK".getBytes()    // Identifies this as ERG lock
  )
)

// Alice's deposit transaction
val ergDepositTransaction = Transaction(
  inputs = partyA.selectUnspentBoxes(toSpend = swapAmount + MinTxFee),
  outputs = List(ergLockBox),
  fee = MinTxFee,
  sendChangeTo = partyA.wallet.getAddress
)

val ergDepositSigned = partyA.wallet.sign(ergDepositTransaction)
blockchainSim.send(ergDepositSigned)
println(s"✓ Alice deposited \${swapAmount/1000000000.0} ERG into hash-locked box")
println(s"  Secret Hash: \${secretHash.take(16)}...")
println(s"  Timeout: \${longTimeout} blocks\n")

// ========================================
// PHASE 2: PARTY B DEPOSITS TOKENS (RESPONDER)
// ========================================
println("=== PHASE 2: BOB DEPOSITS TOKENS ===\n")

// Bob sees Alice's deposit and creates matching token deposit
val tokenLockBox = Box(
  value = MinBoxValue,
  script = atomicSwapContract,
  tokens = List((tokenId -> tokenAmount)),
  registers = Map(
    R4 -> secretHash,              // Same secret hash as Alice's
    R5 -> shortTimeout,            // Bob gets shorter timeout for security
    R6 -> alicePubKeyBytes,        // Alice can claim tokens with secret
    R7 -> bobPubKeyBytes,          // Bob can reclaim after timeout
    R8 -> "TOKEN_LOCK".getBytes()  // Identifies this as token lock
  )
)

// Bob's token deposit transaction
val tokenDepositTransaction = Transaction(
  inputs = partyB.selectUnspentBoxes(tokens = List((tokenId -> tokenAmount))) ++
           partyB.selectUnspentBoxes(toSpend = MinBoxValue + MinTxFee),
  outputs = List(tokenLockBox),
  fee = MinTxFee,
  sendChangeTo = partyB.wallet.getAddress
)

val tokenDepositSigned = partyB.wallet.sign(tokenDepositTransaction)
blockchainSim.send(tokenDepositSigned)
println(s"✓ Bob deposited \${tokenAmount} tokens into hash-locked box")
println(s"  Same Secret Hash: \${secretHash.take(16)}...")
println(s"  Timeout: \${shortTimeout} blocks (shorter for security)\n")

// ========================================
// PHASE 3: PARTY A CLAIMS TOKENS (REVEALS SECRET)
// ========================================
println("=== PHASE 3: ALICE CLAIMS TOKENS (REVEALS SECRET) ===\n")

// Alice claims Bob's tokens by revealing the secret
val aliceTokenBox = Box(
  value = MinBoxValue - MinTxFee,
  script = contract(partyA.wallet.getAddress.pubKey),
  tokens = List((tokenId -> tokenAmount))
)

val aliceClaimTransaction = Transaction(
  inputs = List(tokenDepositSigned.outputs(0)),
  outputs = List(aliceTokenBox),
  fee = MinTxFee
)

// Alice provides the secret to claim tokens
val aliceClaimWithSecret = aliceClaimTransaction.copy(
  inputs = aliceClaimTransaction.inputs.map(_.copy(
    extension = Map(R4 -> secretPhrase.getBytes()) // Alice reveals secret
  ))
)

val aliceClaimSigned = partyA.wallet.sign(aliceClaimWithSecret)
blockchainSim.send(aliceClaimSigned)
println(s"✓ Alice claimed \${tokenAmount} tokens by revealing secret")
println(s"  Revealed Secret: '\${secretPhrase}'")
println(s"  Alice now has the tokens she wanted\n")

// ========================================
// PHASE 4: PARTY B CLAIMS ERG (USES REVEALED SECRET)
// ========================================
println("=== PHASE 4: BOB CLAIMS ERG (USES REVEALED SECRET) ===\n")

// Bob can now see the revealed secret from Alice's transaction
// and use it to claim Alice's ERG deposit
val bobErgBox = Box(
  value = swapAmount - MinTxFee,
  script = contract(partyB.wallet.getAddress.pubKey)
)

val bobClaimTransaction = Transaction(
  inputs = List(ergDepositSigned.outputs(0)),
  outputs = List(bobErgBox),
  fee = MinTxFee
)

// Bob uses the now-revealed secret to claim ERG
val bobClaimWithSecret = bobClaimTransaction.copy(
  inputs = bobClaimTransaction.inputs.map(_.copy(
    extension = Map(R4 -> secretPhrase.getBytes()) // Bob uses revealed secret
  ))
)

val bobClaimSigned = partyB.wallet.sign(bobClaimWithSecret)
blockchainSim.send(bobClaimSigned)
println(s"✓ Bob claimed \${swapAmount/1000000000.0} ERG using revealed secret")
println(s"  Bob now has the ERG he wanted\n")

// ========================================
// SWAP COMPLETION SUMMARY
// ========================================
println("=== ATOMIC SWAP COMPLETED SUCCESSFULLY! ===\n")
println("Final State:")
println(s"  Alice: Started with \${partyAFunds/1000000000.0} ERG → Now has \${tokenAmount} tokens")
println(s"  Bob:   Started with \${tokenAmount} tokens → Now has \${(swapAmount-MinTxFee)/1000000000.0} ERG")
println("\nKey Features Demonstrated:")
println("  ✓ Hash lock mechanism ensures atomicity")
println("  ✓ Secret reveal enables both parties to claim")
println("  ✓ Timeout protections prevent fund lock-up")
println("  ✓ Cross-asset exchange without trusted intermediary")
println("  ✓ Complete UTXO flow: Deposits → Claims → Completion")

// ========================================
// ALTERNATIVE SCENARIO: TIMEOUT REFUND
// ========================================
println("\n=== DEMONSTRATING TIMEOUT SCENARIO ===\n")

// Create a second swap to show timeout behavior
val timeoutSecretHash = Blake2b256("different_secret_for_timeout".getBytes())

val timeoutErgBox = Box(
  value = 50000000L, // 0.05 ERG
  script = atomicSwapContract,
  registers = Map(
    R4 -> timeoutSecretHash,
    R5 -> 50L, // Short timeout for demo
    R6 -> bobPubKeyBytes,
    R7 -> alicePubKeyBytes,
    R8 -> "ERG_LOCK".getBytes()
  )
)

val timeoutDepositTx = Transaction(
  inputs = partyA.selectUnspentBoxes(toSpend = 50000000L + MinTxFee),
  outputs = List(timeoutErgBox),
  fee = MinTxFee,
  sendChangeTo = partyA.wallet.getAddress
)

val timeoutDepositSigned = partyA.wallet.sign(timeoutDepositTx)
blockchainSim.send(timeoutDepositSigned)

// Simulate time passing beyond timeout
blockchainSim.advanceTime(60L) // Advance past timeout

// Alice reclaims her ERG after timeout
val aliceRefundBox = Box(
  value = 50000000L - MinTxFee,
  script = contract(partyA.wallet.getAddress.pubKey)
)

val refundTransaction = Transaction(
  inputs = List(timeoutDepositSigned.outputs(0)),
  outputs = List(aliceRefundBox),
  fee = MinTxFee
)

val refundSigned = partyA.wallet.sign(refundTransaction)
blockchainSim.send(refundSigned)

println("✓ Alice reclaimed her ERG after timeout (no counterparty response)")
println("  This demonstrates the safety mechanism for failed swaps\n")

// ========================================
// EDUCATIONAL SUMMARY
// ========================================
println("=== EDUCATIONAL INSIGHTS ===\n")
println("Hash Time-Locked Contracts (HTLCs) enable:")
println("  • Trustless atomic swaps between any assets")
println("  • Cross-chain compatibility with same hash")
println("  • Timeout safety preventing permanent fund locks")
println("  • Secret revelation creating claim atomicity")
println("\nUTXO Flow Pattern:")
println("  PartyA ERG → Hash-locked ERG → PartyB ERG")
println("  PartyB Tokens → Hash-locked Tokens → PartyA Tokens")
println("  Secret: Created by PartyA, revealed when claiming, used by PartyB")
println("\nSecurity Properties:")
println("  • Either both parties get what they want, or both get refunds")
println("  • No single point of failure or trusted third party")
println("  • Timeout mechanisms prevent indefinite locks")
println("  • Hash commitment prevents front-running")`,

  doubleChainSwap: `// COMPREHENSIVE DOUBLE CHAIN ATOMIC SWAP CONTRACT
// Demonstrates complete trustless cross-chain asset exchange using Hash Time Lock Contracts (HTLCs)
// Educational implementation showing Ergo ↔ Bitcoin-style atomic swap with proper security mechanisms

// ========================================
// CROSS-CHAIN SWAP CONFIGURATION
// ========================================
val ergSwapAmount = 100000000L // 0.1 ERG (Party A offers on Ergo chain)
val btcTokenId = "BTC_TOKEN_SIM_001" // Simulated Bitcoin token on Chain B
val btcSwapAmount = 50000L // 0.0005 BTC equivalent (Party B offers)
val crossChainSecret = "atomic_swap_secret_ergo_btc_2024"
val crossChainSecretHash = Blake2b256(crossChainSecret.getBytes())

// Different timeout periods for cross-chain security
val ergoTimeout = 288L // 288 blocks ≈ 9.6 hours (initiator gets longer timeout)
val btcTimeout = 144L // 144 blocks ≈ 4.8 hours (responder gets shorter timeout for protection)

// Party identities (in real implementation these would be actual cross-chain addresses)
val aliceErgoPubKey = "03a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3"
val bobBtcPubKey = "03f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9f0a1b2e3d4c5f6a7b8c9d0e1f2a3b4c5d6"

// ========================================
// ERGO CHAIN HTLC CONTRACT (CHAIN A)
// ========================================
val ergoChainHTLCScript = s"""
{
  // =====================================
  // CONTRACT STATE AND METADATA
  // =====================================
  val creationHeight = SELF.creationInfo._1
  val swapSecretHash = SELF.R4[Coll[Byte]].get // Hash of cross-chain secret
  val counterpartyChain = SELF.R5[Coll[Byte]].get // "BTC_CHAIN" identifier
  val counterpartyPubKey = SELF.R6[Coll[Byte]].get // Bob's BTC public key
  val initiatorPubKey = SELF.R7[Coll[Byte]].get // Alice's Ergo public key
  val swapTimeout = SELF.R8[Long].get // Timeout block height
  
  // =====================================
  // SECRET REVELATION MECHANISM
  // =====================================
  val secretReveal = {
    // Extract secret from transaction input
    val providedSecret = INPUTS(0).R4[Coll[Byte]].getOrElse(Coll[Byte]())
    val validSecret = providedSecret.size > 0 && blake2b256(providedSecret) == swapSecretHash
    
    validSecret
  }
  
  // =====================================
  // CROSS-CHAIN CLAIM PATH
  // =====================================
  val crossChainClaim = {
    secretReveal && {
      // Bob (counterparty) reveals secret and claims Alice's ERG
      val claimerPubKey = OUTPUTS(0).propositionBytes
      val validCounterparty = claimerPubKey == counterpartyPubKey
      
      // Ensure proper ERG transfer to Bob
      val properTransfer = OUTPUTS(0).value >= SELF.value - MinTxFee
      
      // Additional cross-chain validation
      val withinTimeout = HEIGHT <= creationHeight + swapTimeout
      val crossChainProof = {
        // In real implementation, this would verify proof from other chain
        // For simulation, we validate the chain identifier
        counterpartyChain == "BTC_CHAIN".getBytes()
      }
      
      validCounterparty && properTransfer && withinTimeout && crossChainProof
    }
  }
  
  // =====================================
  // TIMEOUT REFUND MECHANISM
  // =====================================
  val timeoutRefund = {
    // Alice can reclaim her ERG after timeout if Bob never claimed
    val isTimeout = HEIGHT > creationHeight + swapTimeout
    val originalInitiatorClaim = OUTPUTS(0).propositionBytes == initiatorPubKey
    val properRefund = OUTPUTS(0).value >= SELF.value - MinTxFee
    
    isTimeout && originalInitiatorClaim && properRefund
  }
  
  // =====================================
  // CONTRACT VALIDATION LOGIC
  // =====================================
  crossChainClaim || timeoutRefund
}
""".stripMargin

// ========================================
// BITCOIN CHAIN HTLC CONTRACT (CHAIN B SIMULATION)
// ========================================
val btcChainHTLCScript = s"""
{
  // =====================================
  // CONTRACT STATE AND METADATA
  // =====================================
  val creationHeight = SELF.creationInfo._1
  val hasTokens = SELF.tokens.size > 0
  val swapSecretHash = SELF.R4[Coll[Byte]].get // Same hash as Ergo chain
  val counterpartyChain = SELF.R5[Coll[Byte]].get // "ERGO_CHAIN" identifier
  val counterpartyPubKey = SELF.R6[Coll[Byte]].get // Alice's Ergo public key
  val responderPubKey = SELF.R7[Coll[Byte]].get // Bob's BTC public key
  val swapTimeout = SELF.R8[Long].get // Shorter timeout for security
  
  // =====================================
  // SECRET REVELATION MECHANISM
  // =====================================
  val secretReveal = {
    val providedSecret = INPUTS(0).R4[Coll[Byte]].getOrElse(Coll[Byte]())
    val validSecret = providedSecret.size > 0 && blake2b256(providedSecret) == swapSecretHash
    
    validSecret
  }
  
  // =====================================
  // CROSS-CHAIN CLAIM PATH
  // =====================================
  val crossChainClaim = {
    secretReveal && {
      // Alice (counterparty) reveals secret and claims Bob's BTC tokens
      val claimerPubKey = OUTPUTS(0).propositionBytes
      val validCounterparty = claimerPubKey == counterpartyPubKey
      
      // Ensure proper token transfer to Alice
      val properTokenTransfer = {
        if (hasTokens) {
          OUTPUTS(0).tokens.size > 0 &&
          OUTPUTS(0).tokens(0)._1 == SELF.tokens(0)._1 && // Same token ID
          OUTPUTS(0).tokens(0)._2 == SELF.tokens(0)._2    // Same amount
        } else {
          false // This contract should always have tokens
        }
      }
      
      // Shorter timeout for responder chain security
      val withinTimeout = HEIGHT <= creationHeight + swapTimeout
      val crossChainProof = counterpartyChain == "ERGO_CHAIN".getBytes()
      
      validCounterparty && properTokenTransfer && withinTimeout && crossChainProof
    }
  }
  
  // =====================================
  // TIMEOUT REFUND MECHANISM
  // =====================================
  val timeoutRefund = {
    // Bob can reclaim his BTC tokens after shorter timeout
    val isTimeout = HEIGHT > creationHeight + swapTimeout
    val originalResponderClaim = OUTPUTS(0).propositionBytes == responderPubKey
    val properTokenRefund = {
      if (hasTokens) {
        OUTPUTS(0).tokens.size > 0 &&
        OUTPUTS(0).tokens(0)._1 == SELF.tokens(0)._1 &&
        OUTPUTS(0).tokens(0)._2 == SELF.tokens(0)._2
      } else {
        true
      }
    }
    
    isTimeout && originalResponderClaim && properTokenRefund
  }
  
  // =====================================
  // CONTRACT VALIDATION LOGIC
  // =====================================
  crossChainClaim || timeoutRefund
}
""".stripMargin

// Compile both cross-chain HTLC contracts
val ergoChainHTLC = ErgoScriptCompiler.compile(Map(), ergoChainHTLCScript)
val btcChainHTLC = ErgoScriptCompiler.compile(Map(), btcChainHTLCScript)

// ========================================
// DUAL BLOCKCHAIN SIMULATION SETUP
// ========================================
val ergoChainSim = newBlockChainSimulationScenario("Ergo Chain - Cross-Chain Atomic Swap")
val btcChainSim = newBlockChainSimulationScenario("Bitcoin Chain - Cross-Chain Atomic Swap")

// Cross-chain participants
val alice = ergoChainSim.newParty("Alice_ERG_Holder") // Has ERG, wants BTC
val bob = btcChainSim.newParty("Bob_BTC_Holder") // Has BTC, wants ERG

// Initialize cross-chain funds
val aliceInitialERG = 300000000L // 0.3 ERG for swap + fees + change
val bobInitialERG = 50000000L // 0.05 ERG for fees on BTC chain simulation

alice.generateUnspentBoxes(toSpend = aliceInitialERG)
bob.generateUnspentBoxes(toSpend = bobInitialERG)

// Bob generates simulated BTC tokens
bob.generateUnspentBoxes(
  toSpend = MinBoxValue,
  tokens = List((btcTokenId -> btcSwapAmount))
)

// Get public key bytes for cross-chain references
val alicePubKeyBytes = alice.wallet.getAddress.pubKey.getEncoded()
val bobPubKeyBytes = bob.wallet.getAddress.pubKey.getEncoded()

// ========================================
// PHASE 1: ALICE INITIATES ON ERGO CHAIN
// ========================================
println("=== PHASE 1: ALICE LOCKS ERG ON ERGO CHAIN (INITIATOR) ===\n")

// Alice creates the hash-locked ERG deposit
val ergoHTLCBox = Box(
  value = ergSwapAmount,
  script = ergoChainHTLC,
  registers = Map(
    R4 -> crossChainSecretHash,          // Secret hash (same for both chains)
    R5 -> "BTC_CHAIN".getBytes(),       // Counterparty chain identifier
    R6 -> bobPubKeyBytes,               // Bob's public key (can claim with secret)
    R7 -> alicePubKeyBytes,             // Alice's public key (can reclaim after timeout)
    R8 -> ergoTimeout                   // Longer timeout for initiator
  )
)

// Alice's ERG lock transaction
val ergoLockTransaction = Transaction(
  inputs = alice.selectUnspentBoxes(toSpend = ergSwapAmount + MinTxFee),
  outputs = List(ergoHTLCBox),
  fee = MinTxFee,
  sendChangeTo = alice.wallet.getAddress
)

val ergoLockSigned = alice.wallet.sign(ergoLockTransaction)
ergoChainSim.send(ergoLockSigned)
println(s"✓ Alice locked \${ergSwapAmount/1000000000.0} ERG on Ergo chain")
println(s"  Secret Hash: \${crossChainSecretHash.take(16)}...")
println(s"  Ergo Timeout: \${ergoTimeout} blocks (~\${ergoTimeout*2/60.0} hours)")
println(s"  Bob can claim with secret, Alice can reclaim after timeout\n")

// ========================================
// PHASE 2: BOB RESPONDS ON BTC CHAIN
// ========================================
println("=== PHASE 2: BOB LOCKS BTC TOKENS ON BTC CHAIN (RESPONDER) ===\n")

// Bob sees Alice's commitment and creates matching BTC lock
val btcHTLCBox = Box(
  value = MinBoxValue,
  script = btcChainHTLC,
  tokens = List((btcTokenId -> btcSwapAmount)),
  registers = Map(
    R4 -> crossChainSecretHash,          // Same secret hash as Alice's
    R5 -> "ERGO_CHAIN".getBytes(),       // Counterparty chain identifier
    R6 -> alicePubKeyBytes,             // Alice's public key (can claim with secret)
    R7 -> bobPubKeyBytes,               // Bob's public key (can reclaim after timeout)
    R8 -> btcTimeout                    // Shorter timeout for responder security
  )
)

// Bob's BTC token lock transaction
val btcLockTransaction = Transaction(
  inputs = bob.selectUnspentBoxes(tokens = List((btcTokenId -> btcSwapAmount))) ++
           bob.selectUnspentBoxes(toSpend = MinBoxValue + MinTxFee),
  outputs = List(btcHTLCBox),
  fee = MinTxFee,
  sendChangeTo = bob.wallet.getAddress
)

val btcLockSigned = bob.wallet.sign(btcLockTransaction)
btcChainSim.send(btcLockSigned)
println(s"✓ Bob locked \${btcSwapAmount} BTC tokens on BTC chain")
println(s"  Same Secret Hash: \${crossChainSecretHash.take(16)}...")
println(s"  BTC Timeout: \${btcTimeout} blocks (~\${btcTimeout*2/60.0} hours)")
println(s"  Alice can claim with secret, Bob can reclaim after timeout\n")

// ========================================
// PHASE 3: ALICE CLAIMS ON BTC CHAIN (REVEALS SECRET)
// ========================================
println("=== PHASE 3: ALICE CLAIMS BTC TOKENS (REVEALS SECRET) ===\n")

// Alice claims Bob's BTC tokens by revealing the cross-chain secret
val aliceBtcClaimBox = Box(
  value = MinBoxValue - MinTxFee,
  script = contract(alice.wallet.getAddress.pubKey),
  tokens = List((btcTokenId -> btcSwapAmount))
)

val aliceBtcClaimTransaction = Transaction(
  inputs = List(btcLockSigned.outputs(0)),
  outputs = List(aliceBtcClaimBox),
  fee = MinTxFee
)

// Alice provides the secret to claim BTC tokens
val aliceBtcClaimWithSecret = aliceBtcClaimTransaction.copy(
  inputs = aliceBtcClaimTransaction.inputs.map(_.copy(
    extension = Map(R4 -> crossChainSecret.getBytes()) // Alice reveals the secret!
  ))
)

val aliceBtcClaimSigned = alice.wallet.sign(aliceBtcClaimWithSecret)
btcChainSim.send(aliceBtcClaimSigned)
println(s"✓ Alice claimed \${btcSwapAmount} BTC tokens by revealing secret")
println(s"  Revealed Secret: '\${crossChainSecret}'")
println(s"  Secret is now PUBLIC on BTC chain blockchain!\n")

// ========================================
// PHASE 4: BOB CLAIMS ON ERGO CHAIN (USES REVEALED SECRET)
// ========================================
println("=== PHASE 4: BOB CLAIMS ERG USING REVEALED SECRET ===\n")

// Bob monitors BTC chain, sees the revealed secret, uses it to claim ERG
val bobErgClaimBox = Box(
  value = ergSwapAmount - MinTxFee,
  script = contract(bob.wallet.getAddress.pubKey)
)

val bobErgClaimTransaction = Transaction(
  inputs = List(ergoLockSigned.outputs(0)),
  outputs = List(bobErgClaimBox),
  fee = MinTxFee
)

// Bob uses the now-revealed secret from Alice's BTC chain transaction
val bobErgClaimWithSecret = bobErgClaimTransaction.copy(
  inputs = bobErgClaimTransaction.inputs.map(_.copy(
    extension = Map(R4 -> crossChainSecret.getBytes()) // Bob uses revealed secret
  ))
)

val bobErgClaimSigned = bob.wallet.sign(bobErgClaimWithSecret)
ergoChainSim.send(bobErgClaimSigned)
println(s"✓ Bob claimed \${ergSwapAmount/1000000000.0} ERG using revealed secret")
println(s"  Bob extracted secret from Alice's BTC chain transaction\n")

// ========================================
// CROSS-CHAIN ATOMIC SWAP COMPLETED!
// ========================================
println("=== CROSS-CHAIN ATOMIC SWAP SUCCESSFULLY COMPLETED! ===\n")
println("Final State:")
println(s"  Alice: Started with \${ergSwapAmount/1000000000.0} ERG → Now has \${btcSwapAmount} BTC tokens")
println(s"  Bob:   Started with \${btcSwapAmount} BTC tokens → Now has \${(ergSwapAmount-MinTxFee)/1000000000.0} ERG")
println("\nCross-Chain Atomic Properties Demonstrated:")
println("  ✓ Same secret hash used on both chains")
println("  ✓ Secret revelation on one chain enables claim on other")
println("  ✓ Different timeout periods protect responder from timing attacks")
println("  ✓ Atomic execution: either both parties get assets or both get refunds")
println("  ✓ No trusted intermediaries required")
println("  ✓ Complete cross-chain value transfer")

// ========================================
// DEMONSTRATION: TIMEOUT SCENARIO
// ========================================
println("\n=== DEMONSTRATING TIMEOUT PROTECTION MECHANISM ===\n")

// Create a second swap to demonstrate timeout behavior
val timeoutSecretHash = Blake2b256("different_secret_timeout_demo".getBytes())

// Alice initiates another swap but won't reveal secret this time
val timeoutErgoBox = Box(
  value = 50000000L, // 0.05 ERG
  script = ergoChainHTLC,
  registers = Map(
    R4 -> timeoutSecretHash,
    R5 -> "BTC_CHAIN".getBytes(),
    R6 -> bobPubKeyBytes,
    R7 -> alicePubKeyBytes,
    R8 -> 20L // Very short timeout for demo
  )
)

val timeoutErgoTx = Transaction(
  inputs = alice.selectUnspentBoxes(toSpend = 50000000L + MinTxFee),
  outputs = List(timeoutErgoBox),
  fee = MinTxFee,
  sendChangeTo = alice.wallet.getAddress
)

val timeoutErgoSigned = alice.wallet.sign(timeoutErgoTx)
ergoChainSim.send(timeoutErgoSigned)

// Bob responds with BTC lock
val timeoutBtcBox = Box(
  value = MinBoxValue,
  script = btcChainHTLC,
  tokens = List((btcTokenId -> 1000L)),
  registers = Map(
    R4 -> timeoutSecretHash,
    R5 -> "ERGO_CHAIN".getBytes(),
    R6 -> alicePubKeyBytes,
    R7 -> bobPubKeyBytes,
    R8 -> 10L // Even shorter timeout
  )
)

val timeoutBtcTx = Transaction(
  inputs = bob.selectUnspentBoxes(tokens = List((btcTokenId -> 1000L))) ++
           bob.selectUnspentBoxes(toSpend = MinBoxValue + MinTxFee),
  outputs = List(timeoutBtcBox),
  fee = MinTxFee,
  sendChangeTo = bob.wallet.getAddress
)

val timeoutBtcSigned = bob.wallet.sign(timeoutBtcTx)
btcChainSim.send(timeoutBtcSigned)

// Simulate time passing beyond both timeouts
ergoChainSim.advanceTime(30L)
btcChainSim.advanceTime(30L)

// Alice reclaims her ERG after timeout
val aliceRefundBox = Box(
  value = 50000000L - MinTxFee,
  script = contract(alice.wallet.getAddress.pubKey)
)

val aliceRefundTx = Transaction(
  inputs = List(timeoutErgoSigned.outputs(0)),
  outputs = List(aliceRefundBox),
  fee = MinTxFee
)

val aliceRefundSigned = alice.wallet.sign(aliceRefundTx)
ergoChainSim.send(aliceRefundSigned)

// Bob reclaims his BTC tokens after timeout
val bobRefundBox = Box(
  value = MinBoxValue - MinTxFee,
  script = contract(bob.wallet.getAddress.pubKey),
  tokens = List((btcTokenId -> 1000L))
)

val bobRefundTx = Transaction(
  inputs = List(timeoutBtcSigned.outputs(0)),
  outputs = List(bobRefundBox),
  fee = MinTxFee
)

val bobRefundSigned = bob.wallet.sign(bobRefundTx)
btcChainSim.send(bobRefundSigned)

println("✓ Both parties reclaimed their assets after timeout")
println("  This demonstrates the safety mechanism for incomplete swaps\n")

// ========================================
// EDUCATIONAL INSIGHTS
// ========================================
println("=== CROSS-CHAIN ATOMIC SWAP INSIGHTS ===\n")
println("Key Cross-Chain Concepts:")
println("  • Hash Time Lock Contracts (HTLCs) enable trustless cross-chain swaps")
println("  • Same secret hash coordinates both chains without direct communication")
println("  • Initiator (Alice) must move first to protect responder (Bob)")
println("  • Different timeout periods prevent timing attacks")
println("  • Secret revelation creates atomic claim mechanism")
println("\nSecurity Model:")
println("  • Longer timeout for Chain A protects initiator from quick timeout")
println("  • Shorter timeout for Chain B protects responder from timing attacks")
println("  • Timeout refunds prevent permanent fund locks")
println("  • Hash commitment prevents front-running and ensures fairness")
println("\nReal-World Applications:")
println("  • Bitcoin ↔ Ethereum trustless trading")
println("  • Cross-chain arbitrage opportunities")
println("  • Decentralized cross-chain bridges")
println("  • Multi-blockchain DeFi protocols")
println("  • Privacy-focused cross-chain transactions")
println("\nUTXO Flow Pattern:")
println("  Chain A: Alice ERG → HTLC → Bob ERG")
println("  Chain B: Bob BTC → HTLC → Alice BTC")
println("  Coordination: Secret created by Alice, revealed when claiming, used by Bob")
println("  Atomicity: Either both chains complete or both chains refund")`,

  stealthAddress: `// COMPREHENSIVE STEALTH ADDRESS CONTRACT
// Demonstrates complete privacy-preserving payment protocol with one-time addresses
// Educational implementation showing cryptographic foundations and multi-phase UTXO flow

// ========================================
// STEALTH ADDRESS PROTOCOL CONFIGURATION
// ========================================
val stealthAmount = 100000000L // 0.1 ERG stealth payment
val notificationFee = 1000000L // 0.001 ERG for notification box
val detectionTimeout = 500L // blocks for payment detection phase
val emergencyTimeout = 8640L // blocks for emergency recovery (~12 hours)

// Cryptographic Parameters (in real implementation these would be actual EC points)
val recipientViewKeyPriv = "view_key_d1e5f2a8b9c0e1f4a7b6c9d2e3f8a5b4c7d0e9f2a1b8c5d6e3f0a9b2c7d4e1f8"
val recipientSpendKeyPriv = "spend_key_e7f1a4b5c8d9e2f5a0b3c6d9e4f7a2b5c8d1e6f9a4b7c0d3e8f1a6b9c2d5e0f3"
val recipientViewKeyPub = "03view_pub_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
val recipientSpendKeyPub = "03spend_pub_f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9f0a1b2e3d4c5f6a7b8c9d0e1f2a3b4"

// ========================================
// STEALTH META-ADDRESS PUBLICATION CONTRACT
// ========================================
val stealthMetaAddressScript = s"""
{
  // =====================================
  // STEALTH META-ADDRESS DATA STRUCTURE
  // =====================================
  // This contract stores the recipient's public keys for stealth address generation
  // Format: (viewPubKey, spendPubKey, version, metadata)
  val recipientViewKey = SELF.R4[Coll[Byte]].get // Recipient's view public key
  val recipientSpendKey = SELF.R5[Coll[Byte]].get // Recipient's spend public key
  val stealthVersion = SELF.R6[Int].get // Protocol version (for upgradability)
  val metaAddressId = SELF.R7[Coll[Byte]].get // Unique meta-address identifier
  
  // =====================================
  // META-ADDRESS OPERATIONS
  // =====================================
  val updateMetaAddress = {
    // Recipient can update their meta-address (new keys, version upgrade)
    val newViewKey = INPUTS(0).R4[Coll[Byte]].getOrElse(Coll[Byte]())
    val newSpendKey = INPUTS(0).R5[Coll[Byte]].getOrElse(Coll[Byte]())
    val newVersion = INPUTS(0).R6[Int].getOrElse(0)
    val authorizedUpdate = sigmaProp("$recipientSpendKeyPriv") // Owner authorization
    
    authorizedUpdate && {
      // Preserve meta-address ID and update keys/version
      OUTPUTS(0).R4[Coll[Byte]].get == newViewKey &&
      OUTPUTS(0).R5[Coll[Byte]].get == newSpendKey &&
      OUTPUTS(0).R6[Int].get == newVersion &&
      OUTPUTS(0).R7[Coll[Byte]].get == metaAddressId &&
      OUTPUTS(0).value >= SELF.value - MinTxFee
    }
  }
  
  val queryMetaAddress = {
    // Anyone can query the meta-address for stealth address generation
    // This is read-only operation that doesn't change the box
    OUTPUTS(0).propositionBytes == SELF.propositionBytes &&
    OUTPUTS(0).value == SELF.value &&
    OUTPUTS(0).R4[Coll[Byte]].get == recipientViewKey &&
    OUTPUTS(0).R5[Coll[Byte]].get == recipientSpendKey &&
    OUTPUTS(0).R6[Int].get == stealthVersion &&
    OUTPUTS(0).R7[Coll[Byte]].get == metaAddressId
  }
  
  updateMetaAddress || queryMetaAddress
}
""".stripMargin

// ========================================
// ONE-TIME STEALTH ADDRESS CONTRACT
// ========================================
val stealthAddressScript = s"""
{
  // =====================================
  // STEALTH ADDRESS STATE AND CRYPTOGRAPHY
  // =====================================
  val ephemeralPubKey = SELF.R4[Coll[Byte]].get // Sender's ephemeral public key
  val encryptedPayload = SELF.R5[Coll[Byte]].get // Encrypted payment metadata
  val stealthVersion = SELF.R6[Int].get // Protocol version
  val paymentNonce = SELF.R7[Coll[Byte]].get // Unique payment nonce
  val detectionDeadline = SELF.R8[Long].get // Recipient detection timeout
  
  // =====================================
  // RECIPIENT CLAIM MECHANISM
  // =====================================
  val recipientClaim = {
    // Recipient proves knowledge of one-time private key derived from shared secret
    val providedSharedSecret = INPUTS(0).R4[Coll[Byte]].getOrElse(Coll[Byte]())
    val providedOneTimeKey = INPUTS(0).R5[Coll[Byte]].getOrElse(Coll[Byte]())
    
    // Verify shared secret derivation: ECDH(ephemeralPub, recipientViewPriv)
    // In real implementation this would use actual elliptic curve operations
    val expectedSharedSecret = blake2b256(ephemeralPubKey ++ "$recipientViewKeyPriv".getBytes())
    val validSharedSecret = blake2b256(providedSharedSecret) == blake2b256(expectedSharedSecret)
    
    // Verify one-time key derivation: Hash(sharedSecret || recipientSpendPriv)
    val expectedOneTimeKey = blake2b256(expectedSharedSecret ++ "$recipientSpendKeyPriv".getBytes())
    val validOneTimeKey = blake2b256(providedOneTimeKey) == blake2b256(expectedOneTimeKey)
    
    // Validate recipient's ability to spend
    val recipientSpend = {
      // Recipient gets the stealth amount minus fees
      OUTPUTS(0).value >= SELF.value - MinTxFee &&
      // Output can be to any address (recipient's choice)
      OUTPUTS(0).propositionBytes != SELF.propositionBytes
    }
    
    // Additional privacy protections
    val withinDetectionWindow = HEIGHT <= SELF.creationInfo._1 + detectionDeadline
    val validVersion = stealthVersion == 1 // Current protocol version
    
    validSharedSecret && validOneTimeKey && recipientSpend && withinDetectionWindow && validVersion
  }
  
  // =====================================
  // EMERGENCY RECOVERY MECHANISM
  // =====================================
  val emergencyRecovery = {
    // Long timeout allows recipient to recover funds even if detection fails
    val isEmergencyTimeout = HEIGHT > SELF.creationInfo._1 + $emergencyTimeout
    val emergencySpendKey = sigmaProp("$recipientSpendKeyPriv")
    
    isEmergencyTimeout && emergencySpendKey && {
      // Emergency recovery with reduced amount due to timeout penalty
      val penaltyAmount = MinTxFee * 2 // Small penalty for timeout recovery
      OUTPUTS(0).value >= SELF.value - penaltyAmount
    }
  }
  
  // =====================================
  // FORWARD SECRECY PROTECTION
  // =====================================
  val forwardSecrecyCleanup = {
    // After successful claim, ensure no cryptographic material is leaked
    // This would involve zero-knowledge proofs in real implementation
    OUTPUTS.forall(output => {
      // Ensure no stealth-related registers in outputs
      output.R4[Coll[Byte]].isEmpty &&
      output.R5[Coll[Byte]].isEmpty &&
      output.R6[Int].isEmpty &&
      output.R7[Coll[Byte]].isEmpty
    })
  }
  
  // =====================================
  // CONTRACT VALIDATION LOGIC
  // =====================================
  (recipientClaim && forwardSecrecyCleanup) || emergencyRecovery
}
""".stripMargin

// ========================================
// NOTIFICATION SYSTEM CONTRACT
// ========================================
val notificationScript = s"""
{
  // =====================================
  // STEALTH PAYMENT NOTIFICATION
  // =====================================
  // This contract creates a notification for the recipient to scan for payments
  // It contains encrypted information about the stealth payment
  
  val notificationData = SELF.R4[Coll[Byte]].get // Encrypted notification data
  val recipientHint = SELF.R5[Coll[Byte]].get // Hint for recipient scanning
  val paymentReference = SELF.R6[Coll[Byte]].get // Reference to stealth payment box
  val notificationVersion = SELF.R7[Int].get // Notification protocol version
  
  // =====================================
  // NOTIFICATION CONSUMPTION
  // =====================================
  val consumeNotification = {
    // Anyone can consume notification (it's public information)
    // But only meaningful to the intended recipient
    val validConsumption = {
      // Notification is burned after consumption for privacy
      OUTPUTS.size >= 0 && // Can have zero outputs (notification burned)
      // Or outputs don't contain notification data
      OUTPUTS.forall(output => {
        output.R4[Coll[Byte]].isEmpty &&
        output.R5[Coll[Byte]].isEmpty &&
        output.R6[Coll[Byte]].isEmpty &&
        output.R7[Int].isEmpty
      })
    }
    
    validConsumption
  }
  
  // =====================================
  // NOTIFICATION TIMEOUT
  // =====================================
  val notificationTimeout = {
    // After detection timeout, notification can be cleaned up
    HEIGHT > SELF.creationInfo._1 + $detectionTimeout
  }
  
  consumeNotification || notificationTimeout
}
""".stripMargin

// Compile all stealth address contracts
val stealthMetaContract = ErgoScriptCompiler.compile(Map(), stealthMetaAddressScript)
val stealthAddressContract = ErgoScriptCompiler.compile(Map(), stealthAddressScript)
val notificationContract = ErgoScriptCompiler.compile(Map(), notificationScript)

// ========================================
// BLOCKCHAIN SIMULATION SETUP
// ========================================
val blockchainSim = newBlockChainSimulationScenario("Comprehensive Stealth Address Protocol")
val recipientParty = blockchainSim.newParty("Alice_Recipient") // Publishes meta-address
val senderParty = blockchainSim.newParty("Bob_Sender") // Makes stealth payment
val scannerParty = blockchainSim.newParty("Charlie_Scanner") // Demonstrates scanning

// Initialize party funds
val recipientInitialFunds = 50000000L // 0.05 ERG for meta-address setup
val senderInitialFunds = 300000000L // 0.3 ERG for payment + fees
val scannerFunds = 20000000L // 0.02 ERG for scanning fees

recipientParty.generateUnspentBoxes(toSpend = recipientInitialFunds)
senderParty.generateUnspentBoxes(toSpend = senderInitialFunds)
scannerParty.generateUnspentBoxes(toSpend = scannerFunds)

// ========================================
// PHASE 1: RECIPIENT PUBLISHES STEALTH META-ADDRESS
// ========================================
println("=== PHASE 1: ALICE PUBLISHES STEALTH META-ADDRESS ===\n")

val metaAddressId = Blake2b256("alice_stealth_meta_address_v1".getBytes())

val metaAddressBox = Box(
  value = 20000000L, // 0.02 ERG for meta-address storage
  script = stealthMetaContract,
  registers = Map(
    R4 -> recipientViewKeyPub.getBytes(), // Alice's view public key
    R5 -> recipientSpendKeyPub.getBytes(), // Alice's spend public key
    R6 -> 1, // Protocol version 1
    R7 -> metaAddressId // Unique meta-address identifier
  )
)

val metaAddressTransaction = Transaction(
  inputs = recipientParty.selectUnspentBoxes(toSpend = 25000000L),
  outputs = List(metaAddressBox),
  fee = MinTxFee,
  sendChangeTo = recipientParty.wallet.getAddress
)

val metaAddressTransactionSigned = recipientParty.wallet.sign(metaAddressTransaction)
blockchainSim.send(metaAddressTransactionSigned)
println("✓ Alice published stealth meta-address on blockchain")
println(s"  Meta-Address ID: \${metaAddressId.take(16)}...")
println(s"  View Key: \${recipientViewKeyPub.take(20)}...")
println(s"  Spend Key: \${recipientSpendKeyPub.take(20)}...")
println(s"  Protocol Version: 1\n")

// ========================================
// PHASE 2: SENDER GENERATES STEALTH ADDRESS
// ========================================
println("=== PHASE 2: BOB GENERATES ONE-TIME STEALTH ADDRESS ===\n")

// Bob queries Alice's meta-address from the blockchain
val aliceViewKey = recipientViewKeyPub.getBytes()
val aliceSpendKey = recipientSpendKeyPub.getBytes()

// Bob generates ephemeral key pair
val ephemeralPrivKey = Blake2b256("bob_ephemeral_random_seed_12345".getBytes())
val ephemeralPubKey = "03ephemeral_" + ephemeralPrivKey.take(32).map("%02x".format(_)).mkString

// Bob computes shared secret using ECDH
val sharedSecret = Blake2b256(ephemeralPubKey.getBytes() ++ recipientViewKeyPriv.getBytes())

// Bob derives one-time stealth address
val oneTimeAddress = Blake2b256(sharedSecret ++ recipientSpendKeyPriv.getBytes())

// Bob creates encrypted payload with payment metadata
val paymentMetadata = "stealth_payment_0.1_ERG_from_Bob_to_Alice"
val encryptedPayload = Blake2b256(paymentMetadata.getBytes() ++ sharedSecret)
val paymentNonce = Blake2b256("payment_nonce_unique_12345".getBytes())

println("✓ Bob generated ephemeral key pair")
println(s"  Ephemeral Public Key: \${ephemeralPubKey.take(32)}...")
println("✓ Bob computed shared secret using ECDH")
println(s"  Shared Secret: \${sharedSecret.take(16)}...")
println("✓ Bob derived one-time stealth address")
println(s"  One-time Address: \${oneTimeAddress.take(16)}...\n")

// ========================================
// PHASE 3: SENDER CREATES STEALTH PAYMENT
// ========================================
println("=== PHASE 3: BOB CREATES STEALTH PAYMENT ===\n")

// Create stealth payment box
val stealthPaymentBox = Box(
  value = stealthAmount,
  script = stealthAddressContract,
  registers = Map(
    R4 -> ephemeralPubKey.getBytes(), // Ephemeral public key for ECDH
    R5 -> encryptedPayload, // Encrypted payment metadata
    R6 -> 1, // Protocol version
    R7 -> paymentNonce, // Unique payment identifier
    R8 -> detectionTimeout // Detection deadline
  )
)

// Create notification box for recipient scanning
val notificationHint = Blake2b256(aliceViewKey ++ paymentNonce)
val notificationData = Blake2b256(ephemeralPubKey.getBytes() ++ encryptedPayload)

val notificationBox = Box(
  value = notificationFee,
  script = notificationContract,
  registers = Map(
    R4 -> notificationData, // Encrypted notification data
    R5 -> notificationHint, // Hint for recipient scanning
    R6 -> paymentNonce, // Reference to payment
    R7 -> 1 // Notification version
  )
)

val stealthPaymentTransaction = Transaction(
  inputs = senderParty.selectUnspentBoxes(toSpend = stealthAmount + notificationFee + (2 * MinTxFee)),
  outputs = List(stealthPaymentBox, notificationBox),
  fee = MinTxFee,
  sendChangeTo = senderParty.wallet.getAddress
)

val stealthPaymentSigned = senderParty.wallet.sign(stealthPaymentTransaction)
blockchainSim.send(stealthPaymentSigned)
println(s"✓ Bob created stealth payment of \${stealthAmount/1000000000.0} ERG")
println(s"  Payment Box Value: \${stealthAmount/1000000000.0} ERG")
println(s"  Notification Box Value: \${notificationFee/1000000000.0} ERG")
println(s"  Encrypted Payload: \${encryptedPayload.take(16)}...")
println(s"  Payment Nonce: \${paymentNonce.take(16)}...")
println("✓ Payment is now anonymous - no direct link to Alice visible\n")

// ========================================
// PHASE 4: RECIPIENT SCANS AND DETECTS PAYMENT
// ========================================
println("=== PHASE 4: ALICE SCANS BLOCKCHAIN AND DETECTS PAYMENT ===\n")

// Alice scans notification boxes for potential payments
val detectedNotificationHint = Blake2b256(aliceViewKey ++ paymentNonce) 
val expectedNotificationHint = notificationHint

// Alice detects the notification matches her view key
val notificationMatches = detectedNotificationHint.sameElements(expectedNotificationHint)

// Alice reconstructs the shared secret from the ephemeral public key
val aliceComputedSharedSecret = Blake2b256(
  ephemeralPubKey.getBytes() ++ recipientViewKeyPriv.getBytes()
)

// Alice derives the one-time private key
val aliceOneTimePrivKey = Blake2b256(
  aliceComputedSharedSecret ++ recipientSpendKeyPriv.getBytes()
)

// Alice decrypts the payment metadata
val aliceDecryptedPayload = Blake2b256(paymentMetadata.getBytes() ++ aliceComputedSharedSecret)
val payloadMatches = aliceDecryptedPayload.sameElements(encryptedPayload)

println("✓ Alice scanned blockchain for stealth payments")
println(s"  Notification Detection: \${if (notificationMatches) "SUCCESS" else "FAILED"}")
println(s"  Shared Secret Reconstruction: \${aliceComputedSharedSecret.take(16)}...")
println(s"  One-time Private Key: \${aliceOneTimePrivKey.take(16)}...")
println(s"  Payload Decryption: \${if (payloadMatches) "SUCCESS" else "FAILED"}")
println(s"  Detected Payment Amount: \${stealthAmount/1000000000.0} ERG\n")

// ========================================
// PHASE 5: RECIPIENT CLAIMS STEALTH PAYMENT
// ========================================
println("=== PHASE 5: ALICE CLAIMS STEALTH PAYMENT ===\n")

// Alice creates claim transaction
val aliceFinalBox = Box(
  value = stealthAmount - MinTxFee,
  script = contract(recipientParty.wallet.getAddress.pubKey)
)

val stealthClaimTransaction = Transaction(
  inputs = List(stealthPaymentSigned.outputs(0)), // Stealth payment box
  outputs = List(aliceFinalBox),
  fee = MinTxFee
)

// Alice provides cryptographic proof of ownership
val stealthClaimWithProof = stealthClaimTransaction.copy(
  inputs = stealthClaimTransaction.inputs.map(_.copy(
    extension = Map(
      R4 -> aliceComputedSharedSecret, // Proof of shared secret knowledge
      R5 -> aliceOneTimePrivKey // Proof of one-time private key derivation
    )
  ))
)

val stealthClaimSigned = recipientParty.wallet.sign(stealthClaimWithProof)
blockchainSim.send(stealthClaimSigned)
println("✓ Alice successfully claimed stealth payment")
println(s"  Claimed Amount: \${(stealthAmount - MinTxFee)/1000000000.0} ERG")
println("✓ Cryptographic proofs validated")
println("✓ Forward secrecy maintained - no stealth data in outputs\n")

// ========================================
// PHASE 6: NOTIFICATION CLEANUP
// ========================================
println("=== PHASE 6: NOTIFICATION CLEANUP ===\n")

// Clean up notification box for privacy
val notificationCleanupTransaction = Transaction(
  inputs = List(stealthPaymentSigned.outputs(1)), // Notification box
  outputs = List(), // No outputs - notification burned for privacy
  fee = notificationFee // Use notification value as fee
)

val notificationCleanupSigned = scannerParty.wallet.sign(notificationCleanupTransaction)
blockchainSim.send(notificationCleanupSigned)
println("✓ Notification box cleaned up for enhanced privacy")
println("✓ No permanent record of stealth payment linkage\n")

// ========================================
// STEALTH ADDRESS PROTOCOL COMPLETED
// ========================================
println("=== STEALTH ADDRESS PROTOCOL COMPLETED SUCCESSFULLY! ===\n")
println("Final Privacy Analysis:")
println(s"  Alice: Received \${(stealthAmount - MinTxFee)/1000000000.0} ERG with full privacy")
println(s"  Bob: Sent \${stealthAmount/1000000000.0} ERG without revealing recipient")
println("  Blockchain Observers: Cannot link Bob's payment to Alice without view keys")
println("\nPrivacy Properties Demonstrated:")
println("  ✓ One-time addresses prevent address reuse")
println("  ✓ Ephemeral keys provide forward secrecy")
println("  ✓ Encrypted payloads hide payment metadata")
println("  ✓ ECDH shared secrets enable secure communication")
println("  ✓ Notification system enables efficient scanning")
println("  ✓ No permanent linkability between sender and recipient")

// ========================================
// EDUCATIONAL INSIGHTS AND IMPLICATIONS
// ========================================
println("\n=== EDUCATIONAL INSIGHTS ===\n")
println("Stealth Address Cryptographic Foundations:")
println("  • ECDH (Elliptic Curve Diffie-Hellman) for shared secret derivation")
println("  • One-time key generation using cryptographic hashing")
println("  • View keys for payment detection, spend keys for fund access")
println("  • Ephemeral keys prevent long-term key compromise")
println("\nPrivacy vs Usability Trade-offs:")
println("  • Enhanced privacy requires more complex scanning processes")
println("  • Notification system reduces scanning overhead")
println("  • Meta-address publication enables discoverability")
println("  • Emergency recovery mechanisms prevent fund loss")
println("\nUTXO Flow Pattern:")
println("  Meta-Address → Stealth Payment + Notification → Recipient Claim")
println("  Privacy Metadata: Ephemeral keys, encrypted payloads, shared secrets")
println("  Unlinkability: Observer cannot connect sender to recipient")
println("\nReal-World Applications:")
println("  • Private donations and payments")
println("  • Corporate privacy for business transactions")
println("  • Protection against transaction graph analysis")
println("  • Enhanced fungibility for digital assets")
println("  • Privacy-preserving recurring payments")
println("\nSecurity Considerations:")
println("  • View key sharing enables payment detection")
println("  • Spend key compromise allows fund access")
println("  • Ephemeral key generation must be truly random")
println("  • Notification scanning reveals potential recipients")
println("  • Emergency timeouts balance recovery with privacy")`
};

const ContractTester: React.FC<ContractTesterProps> = ({ selectedExample }) => {
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'params' | 'results' | 'diagram' | 'learn'>('learn');
  const [parameters, setParameters] = useState<Record<string, string | number | boolean>>({});

  useEffect(() => {
    console.log('ContractTester: selectedExample changed to:', selectedExample);
    
    if (selectedExample) {
      const exampleCode = exampleCodes[selectedExample as keyof typeof exampleCodes];
      
      if (exampleCode) {
        console.log('ContractTester: Loading code for', selectedExample);
        setCode(exampleCode);
        setSimulationResult(null);
      } else {
        console.warn('ContractTester: No code found for example:', selectedExample);
        // Provide fallback code for missing implementations
        const fallbackCode = `// ${selectedExample.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Contract\n// Implementation coming soon...\n\nval placeholder = "Contract implementation for ${selectedExample} will be available soon"\n\n// Create blockchain simulation\nval blockchainSim = newBlockChainSimulationScenario("${selectedExample} Scenario")\nval party = blockchainSim.newParty("user")\nval funds = 100000000L // 0.1 ERG\n\nparty.generateUnspentBoxes(toSpend = funds)\n\n// TODO: Implement ${selectedExample} logic here`;
        setCode(fallbackCode);
        setSimulationResult(null);
      }
    } else {
      console.log('ContractTester: No example selected, clearing code');
      setCode('');
      setSimulationResult(null);
    }
  }, [selectedExample]);

  const handleRunContract = async () => {
    setIsRunning(true);
    setActiveTab('results');
    
    // Simulate contract execution
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate compilation/execution time
      
      const mockResult: SimulationResult = {
        success: true,
        message: 'Contract executed successfully',
        transactions: [
          {
            id: 'tx-001',
            type: 'deposit',
            from: 'sender',
            to: 'contract',
            amount: '50000000',
            status: 'success'
          },
          {
            id: 'tx-002',
            type: 'withdraw',
            from: 'contract',
            to: 'receiver',
            amount: '49000000',
            status: 'success'
          }
        ],
        balances: {
          sender: '49000000',
          receiver: '49000000',
          contract: '0'
        },
        logs: [
          'Creating blockchain simulation scenario...',
          'Initializing parties: sender, receiver',
          'Compiling ErgoScript contract...',
          'Creating deposit transaction...',
          'Transaction signed and submitted',
          'Creating withdrawal transaction...',
          'Contract validation successful',
          'Final balances updated'
        ]
      };

      setSimulationResult(mockResult);
    } catch (error) {
      setSimulationResult({
        success: false,
        message: 'Contract execution failed: ' + (error as Error).message,
        transactions: [],
        balances: {},
        logs: ['Error occurred during contract execution']
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (!selectedExample) {
    return (
      <div className="contract-tester-empty">
        <div className="empty-state">
          <Code size={48} />
          <h2>Select a Smart Contract Example</h2>
          <p>Choose an example from the sidebar to start testing smart contracts</p>
        </div>
      </div>
    );
  }

  // Handle contract designer mode
  if (selectedExample === 'contractDesigner') {
    return (
      <Suspense fallback={<div className="loading-state">Loading Contract Designer...</div>}>
        <ContractDesigner className="contract-designer-full" />
      </Suspense>
    );
  }

  return (
    <div className="contract-tester">
      <div className="contract-header">
        <div className="header-info">
          <h2>{selectedExample.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h2>
          <div className="header-actions">
            <button
              className="run-button primary"
              onClick={handleRunContract}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <RefreshCw size={16} className="spinning" />
                  Running...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Run Contract
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="contract-tabs">
        <button
          className={`tab ${activeTab === 'learn' ? 'active' : ''}`}
          onClick={() => setActiveTab('learn')}
        >
          <BookOpen size={16} />
          Learn
        </button>
        <button
          className={`tab ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          <Code size={16} />
          Code Editor
        </button>
        <button
          className={`tab ${activeTab === 'params' ? 'active' : ''}`}
          onClick={() => setActiveTab('params')}
        >
          <Settings size={16} />
          Parameters
        </button>
        <button
          className={`tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          {simulationResult?.success ? (
            <CheckCircle size={16} />
          ) : simulationResult?.success === false ? (
            <XCircle size={16} />
          ) : (
            <Users size={16} />
          )}
          Simulation Results
        </button>
        <button
          className={`tab ${activeTab === 'diagram' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagram')}
        >
          <Network size={16} />
          Diagram Viz
        </button>
      </div>

      <div className="contract-content">
        {activeTab === 'learn' && (
          <Suspense fallback={<div className="loading-state">Loading Educational Content...</div>}>
            <ContractEducation 
              selectedExample={selectedExample}
            />
          </Suspense>
        )}
        
        {activeTab === 'code' && (
          <CodeEditor
            value={code}
            onChange={setCode}
            language="ergoscript"
          />
        )}
        
        {activeTab === 'params' && (
          <ContractParameters
            parameters={parameters}
            onChange={setParameters}
            contractType={selectedExample}
          />
        )}
        
        {activeTab === 'results' && (
          <SimulationResults
            result={simulationResult}
            isRunning={isRunning}
          />
        )}
        
        {activeTab === 'diagram' && (
          <div className="coming-soon">
            <h3>UTXO Visualization</h3>
            <p>This feature is temporarily disabled while fixing type issues.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractTester;