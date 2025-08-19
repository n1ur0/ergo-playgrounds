import React, { useState, useEffect } from 'react';
import { Code, Play, RefreshCw, CheckCircle, XCircle, Settings, Users, Network, BookOpen } from 'lucide-react';
import CodeEditor from './CodeEditor';
import SimulationResults from './SimulationResults';
import ContractParameters from './ContractParameters';
import UTXOVisualization from './visualization/UTXOVisualization';
import ContractEducation from './education/ContractEducation';
import './ContractTester.css';

interface ContractTesterProps {
  selectedExample: string | null;
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
// Automated token sales with dynamic pricing based on supply
val tokenId = "sales_token_id_here"
val initialPrice = 1000000L // 0.001 ERG per token
val priceIncrement = 100000L // Price increases by 0.0001 ERG per 1000 tokens sold
val maxTokensPerPurchase = 10000L

val tokenSalesScript = s"""
{
  val validPurchase = {
    val tokensSold = SELF.R4[Long].get
    val tokensRequested = INPUTS(0).R5[Long].get
    val currentPrice = $initialPrice + (tokensSold / 1000L) * $priceIncrement
    val requiredPayment = tokensRequested * currentPrice
    
    // Validate purchase constraints
    val validAmount = tokensRequested > 0L && tokensRequested <= $maxTokensPerPurchase
    val validPayment = INPUTS(0).value >= requiredPayment
    val correctTokenOutput = OUTPUTS(0).tokens(0)._1 == fromBase64("$tokenId") && 
                            OUTPUTS(0).tokens(0)._2 == tokensRequested
    
    // Update sales contract state
    val updatedSalesBox = OUTPUTS(1).R4[Long].get == tokensSold + tokensRequested
    
    validAmount && validPayment && correctTokenOutput && updatedSalesBox
  }
  
  // Allow owner to withdraw proceeds or update parameters
  val ownerWithdraw = sigmaProp("owner_public_key_here")
  
  validPurchase || ownerWithdraw
}
""".stripMargin

val tokenSalesContract = ErgoScriptCompiler.compile(Map(), tokenSalesScript)

// Create blockchain simulation
val blockchainSim = newBlockChainSimulationScenario("Token Sales Scenario")
val sellerParty = blockchainSim.newParty("seller")
val buyerParty = blockchainSim.newParty("buyer")

// Initial setup
val initialTokenSupply = 1000000L
val buyerFunds = 100000000L // 0.1 ERG

sellerParty.generateUnspentBoxes(toSpend = 50000000L)
buyerParty.generateUnspentBoxes(toSpend = buyerFunds)

// Create initial token sales box
val salesBox = Box(
  value = 10000000L, // Contract maintenance fee
  script = tokenSalesContract,
  tokens = List((tokenId -> initialTokenSupply)),
  registers = Map(R4 -> 0L) // Tokens sold counter
)

// Deploy sales contract
val deployTransaction = Transaction(
  inputs = sellerParty.selectUnspentBoxes(toSpend = 50000000L),
  outputs = List(salesBox),
  fee = MinTxFee,
  sendChangeTo = sellerParty.wallet.getAddress
)

val deployTransactionSigned = sellerParty.wallet.sign(deployTransaction)
blockchainSim.send(deployTransactionSigned)

// Purchase tokens
val tokensToBuy = 5000L
val currentPrice = initialPrice // First purchase at initial price
val paymentAmount = tokensToBuy * currentPrice

val purchaseBox = Box(
  value = paymentAmount,
  registers = Map(R5 -> tokensToBuy) // Tokens requested
)

val buyerTokenBox = Box(
  value = MinBoxValue,
  script = contract(buyerParty.wallet.getAddress.pubKey),
  tokens = List((tokenId -> tokensToBuy))
)

val updatedSalesBox = Box(
  value = 10000000L + paymentAmount - MinTxFee,
  script = tokenSalesContract,
  tokens = List((tokenId -> (initialTokenSupply - tokensToBuy))),
  registers = Map(R4 -> tokensToBuy) // Updated tokens sold counter
)

val purchaseTransaction = Transaction(
  inputs = List(purchaseBox, deployTransactionSigned.outputs(0)),
  outputs = List(buyerTokenBox, updatedSalesBox),
  fee = MinTxFee
)

val purchaseTransactionSigned = buyerParty.wallet.sign(purchaseTransaction)
blockchainSim.send(purchaseTransactionSigned)`,

  headsOrTails: `// Heads or Tails Gaming Contract
// A provably fair coin flip game between two players
val player1PubKey = "player1_public_key_here"
val player2PubKey = "player2_public_key_here"
val betAmount = 50000000L // 0.05 ERG
val commitmentDeadline = 50L // blocks
val revealDeadline = 100L // blocks

val gameScript = s"""
{
  // Game states: 0=setup, 1=committed, 2=revealed, 3=finished
  val gameState = SELF.R4[Int].get
  val player1Commitment = SELF.R5[Coll[Byte]].getOrElse(Coll[Byte]())
  val player2Commitment = SELF.R6[Coll[Byte]].getOrElse(Coll[Byte]())
  
  val setupComplete = {
    // Both players commit their hashed choices
    gameState == 0 && 
    player1Commitment.size > 0 && 
    player2Commitment.size > 0 &&
    HEIGHT <= SELF.creationInfo._1 + $commitmentDeadline
  }
  
  val revealPhase = {
    // Players reveal their choices and determine winner
    gameState == 1 &&
    HEIGHT <= SELF.creationInfo._1 + $revealDeadline &&
    {
      val player1Choice = INPUTS(0).R7[Int].get // 0 for heads, 1 for tails
      val player2Choice = INPUTS(0).R8[Int].get
      val player1Nonce = INPUTS(0).R9[Coll[Byte]].get
      val player2Nonce = INPUTS(0).R10[Coll[Byte]].get
      
      // Verify commitments
      val validCommitment1 = blake2b256(player1Choice.toByteArray ++ player1Nonce) == player1Commitment
      val validCommitment2 = blake2b256(player2Choice.toByteArray ++ player2Nonce) == player2Commitment
      
      // Determine winner (XOR of choices: same = player1 wins, different = player2 wins)
      val player1Wins = player1Choice == player2Choice
      
      validCommitment1 && validCommitment2 && {
        if (player1Wins) {
          OUTPUTS(0).value == $betAmount * 2 - MinTxFee &&
          OUTPUTS(0).propositionBytes == fromBase64("$player1PubKey")
        } else {
          OUTPUTS(0).value == $betAmount * 2 - MinTxFee &&
          OUTPUTS(0).propositionBytes == fromBase64("$player2PubKey")
        }
      }
    }
  }
  
  val timeoutRefund = {
    // Refund if deadlines are missed
    (gameState == 0 && HEIGHT > SELF.creationInfo._1 + $commitmentDeadline) ||
    (gameState == 1 && HEIGHT > SELF.creationInfo._1 + $revealDeadline)
  }
  
  setupComplete || revealPhase || timeoutRefund
}
""".stripMargin

val gameContract = ErgoScriptCompiler.compile(Map(), gameScript)

// Create blockchain simulation
val blockchainSim = newBlockChainSimulationScenario("Heads or Tails Game")
val player1Party = blockchainSim.newParty("player1")
val player2Party = blockchainSim.newParty("player2")

// Initial funds
val player1Funds = 100000000L // 0.1 ERG
val player2Funds = 100000000L // 0.1 ERG

player1Party.generateUnspentBoxes(toSpend = player1Funds)
player2Party.generateUnspentBoxes(toSpend = player2Funds)

// Create game setup
val player1Choice = 0 // heads
val player2Choice = 1 // tails
val player1Nonce = "random_nonce_1".getBytes()
val player2Nonce = "random_nonce_2".getBytes()

// Create commitments (hash of choice + nonce)
val player1Commitment = Blake2b256(player1Choice.toByteArray ++ player1Nonce)
val player2Commitment = Blake2b256(player2Choice.toByteArray ++ player2Nonce)

// Create game box with both players' bets
val gameBox = Box(
  value = betAmount * 2,
  script = gameContract,
  registers = Map(
    R4 -> 1, // Game state: committed
    R5 -> player1Commitment,
    R6 -> player2Commitment
  )
)

// Both players fund the game
val fundingTransaction = Transaction(
  inputs = player1Party.selectUnspentBoxes(toSpend = betAmount + MinTxFee) ++
           player2Party.selectUnspentBoxes(toSpend = betAmount + MinTxFee),
  outputs = List(gameBox),
  fee = MinTxFee
)

val fundingTransactionSigned = player1Party.wallet.sign(
  player2Party.wallet.sign(fundingTransaction)
)
blockchainSim.send(fundingTransactionSigned)

// Reveal phase - player1 wins (both chose same)
val winnerBox = Box(
  value = betAmount * 2 - MinTxFee,
  script = contract(player1Party.wallet.getAddress.pubKey)
)

val revealTransaction = Transaction(
  inputs = List(fundingTransactionSigned.outputs(0)),
  outputs = List(winnerBox),
  fee = MinTxFee
)

// Add reveal data to transaction
val revealTransactionWithData = revealTransaction.copy(
  inputs = revealTransaction.inputs.map(_.copy(
    extension = Map(
      R7 -> player1Choice,
      R8 -> player2Choice,
      R9 -> player1Nonce,
      R10 -> player2Nonce
    )
  ))
)

val revealTransactionSigned = player1Party.wallet.sign(
  player2Party.wallet.sign(revealTransactionWithData)
)
blockchainSim.send(revealTransactionSigned)`,

  singleChainSwap: `// Single Chain Atomic Swap Contract
// Enables trustless exchange of assets on the same blockchain using hash locks
val partyAPubKey = "partyA_public_key_here"
val partyBPubKey = "partyB_public_key_here"
val secretHash = Blake2b256("secret_phrase_here".getBytes())
val timeoutBlocks = 100L
val swapAmount = 50000000L // 0.05 ERG
val tokenId = "swap_token_id_here"
val tokenAmount = 1000L

val swapScript = s"""
{
  // Party A locks ERG, Party B locks tokens
  // Either party can claim with the secret, or reclaim after timeout
  
  val secretReveal = {
    val providedSecret = INPUTS(0).R4[Coll[Byte]].get
    blake2b256(providedSecret) == fromBase64("$secretHash")
  }
  
  val validClaim = {
    secretReveal && {
      // Check if this is Party B claiming ERG or Party A claiming tokens
      val claimerPubKey = OUTPUTS(0).propositionBytes
      (claimerPubKey == fromBase64("$partyBPubKey")) || 
      (claimerPubKey == fromBase64("$partyAPubKey"))
    }
  }
  
  val timeoutRefund = {
    val isTimeout = HEIGHT > SELF.creationInfo._1 + $timeoutBlocks
    val originalOwner = {
      // Refund to original depositor
      if (SELF.tokens.size > 0) {
        // This box has tokens, so refund to Party B
        OUTPUTS(0).propositionBytes == fromBase64("$partyBPubKey")
      } else {
        // This box has ERG, so refund to Party A
        OUTPUTS(0).propositionBytes == fromBase64("$partyAPubKey")
      }
    }
    isTimeout && originalOwner
  }
  
  validClaim || timeoutRefund
}
""".stripMargin

val swapContract = ErgoScriptCompiler.compile(Map(), swapScript)

// Create blockchain simulation
val blockchainSim = newBlockChainSimulationScenario("Single Chain Swap")
val partyA = blockchainSim.newParty("partyA")
val partyB = blockchainSim.newParty("partyB")

// Initial funds and tokens
val partyAFunds = 100000000L // 0.1 ERG
val partyBFunds = 50000000L // 0.05 ERG for fees

partyA.generateUnspentBoxes(toSpend = partyAFunds)
partyB.generateUnspentBoxes(toSpend = partyBFunds)
// Party B also has tokens to swap
partyB.generateUnspentBoxes(toSpend = MinBoxValue, tokens = List((tokenId -> tokenAmount)))

// Party A creates ERG lock box
val ergLockBox = Box(
  value = swapAmount,
  script = swapContract
)

val ergLockTransaction = Transaction(
  inputs = partyA.selectUnspentBoxes(toSpend = swapAmount + MinTxFee),
  outputs = List(ergLockBox),
  fee = MinTxFee,
  sendChangeTo = partyA.wallet.getAddress
)

val ergLockTransactionSigned = partyA.wallet.sign(ergLockTransaction)
blockchainSim.send(ergLockTransactionSigned)

// Party B creates token lock box
val tokenLockBox = Box(
  value = MinBoxValue,
  script = swapContract,
  tokens = List((tokenId -> tokenAmount))
)

val tokenLockTransaction = Transaction(
  inputs = partyB.selectUnspentBoxes(tokens = List((tokenId -> tokenAmount))),
  outputs = List(tokenLockBox),
  fee = MinTxFee,
  sendChangeTo = partyB.wallet.getAddress
)

val tokenLockTransactionSigned = partyB.wallet.sign(tokenLockTransaction)
blockchainSim.send(tokenLockTransactionSigned)

// Party B claims ERG by revealing secret
val ergClaimBox = Box(
  value = swapAmount - MinTxFee,
  script = contract(partyB.wallet.getAddress.pubKey)
)

val ergClaimTransaction = Transaction(
  inputs = List(ergLockTransactionSigned.outputs(0)),
  outputs = List(ergClaimBox),
  fee = MinTxFee
)

// Add secret to transaction context
val ergClaimWithSecret = ergClaimTransaction.copy(
  inputs = ergClaimTransaction.inputs.map(_.copy(
    extension = Map(R4 -> "secret_phrase_here".getBytes())
  ))
)

val ergClaimTransactionSigned = partyB.wallet.sign(ergClaimWithSecret)
blockchainSim.send(ergClaimTransactionSigned)

// Party A claims tokens using the same secret (now revealed)
val tokenClaimBox = Box(
  value = MinBoxValue,
  script = contract(partyA.wallet.getAddress.pubKey),
  tokens = List((tokenId -> tokenAmount))
)

val tokenClaimTransaction = Transaction(
  inputs = List(tokenLockTransactionSigned.outputs(0)),
  outputs = List(tokenClaimBox),
  fee = MinTxFee
)

val tokenClaimWithSecret = tokenClaimTransaction.copy(
  inputs = tokenClaimTransaction.inputs.map(_.copy(
    extension = Map(R4 -> "secret_phrase_here".getBytes())
  ))
)

val tokenClaimTransactionSigned = partyA.wallet.sign(tokenClaimWithSecret)
blockchainSim.send(tokenClaimTransactionSigned)`,

  doubleChainSwap: `// Double Chain (Cross-Chain) Atomic Swap Contract
// Enables trustless exchange between different blockchains using hash time locks
val chainAPartyPubKey = "chainA_party_public_key_here"
val chainBPartyPubKey = "chainB_party_public_key_here"
val secretHash = Blake2b256("cross_chain_secret_here".getBytes())
val chainATimeout = 200L // blocks
val chainBTimeout = 100L // blocks (shorter timeout for second chain)
val swapAmount = 50000000L // 0.05 ERG on chain A
val chainBTokenId = "chainB_token_id_here"
val chainBTokenAmount = 1000L

// Contract for Chain A (longer timeout)
val chainASwapScript = s"""
{
  val secretReveal = {
    val providedSecret = INPUTS(0).R4[Coll[Byte]].get
    blake2b256(providedSecret) == fromBase64("$secretHash")
  }
  
  val validClaim = {
    // Chain B party claims with secret
    secretReveal && 
    OUTPUTS(0).propositionBytes == fromBase64("$chainBPartyPubKey")
  }
  
  val timeoutRefund = {
    // Chain A party can reclaim after timeout
    HEIGHT > SELF.creationInfo._1 + $chainATimeout &&
    OUTPUTS(0).propositionBytes == fromBase64("$chainAPartyPubKey")
  }
  
  validClaim || timeoutRefund
}
""".stripMargin

// Contract for Chain B (shorter timeout for security)
val chainBSwapScript = s"""
{
  val secretReveal = {
    val providedSecret = INPUTS(0).R4[Coll[Byte]].get
    blake2b256(providedSecret) == fromBase64("$secretHash")
  }
  
  val validClaim = {
    // Chain A party claims with secret
    secretReveal && 
    OUTPUTS(0).propositionBytes == fromBase64("$chainAPartyPubKey")
  }
  
  val timeoutRefund = {
    // Chain B party can reclaim after shorter timeout
    HEIGHT > SELF.creationInfo._1 + $chainBTimeout &&
    OUTPUTS(0).propositionBytes == fromBase64("$chainBPartyPubKey")
  }
  
  validClaim || timeoutRefund
}
""".stripMargin

val chainAContract = ErgoScriptCompiler.compile(Map(), chainASwapScript)
val chainBContract = ErgoScriptCompiler.compile(Map(), chainBSwapScript)

// Simulate both chains
val chainASim = newBlockChainSimulationScenario("Chain A Simulation")
val chainBSim = newBlockChainSimulationScenario("Chain B Simulation")

// Parties on both chains
val chainAParty = chainASim.newParty("chainAParty")
val chainBParty = chainBSim.newParty("chainBParty")

// Initial funds
val chainAFunds = 100000000L // 0.1 ERG
val chainBFunds = 50000000L // 0.05 ERG for fees

chainAParty.generateUnspentBoxes(toSpend = chainAFunds)
chainBParty.generateUnspentBoxes(toSpend = chainBFunds)
// Chain B party has tokens to swap
chainBParty.generateUnspentBoxes(
  toSpend = MinBoxValue, 
  tokens = List((chainBTokenId -> chainBTokenAmount))
)

// Step 1: Chain A party locks ERG (initiates swap)
val chainALockBox = Box(
  value = swapAmount,
  script = chainAContract
)

val chainALockTransaction = Transaction(
  inputs = chainAParty.selectUnspentBoxes(toSpend = swapAmount + MinTxFee),
  outputs = List(chainALockBox),
  fee = MinTxFee,
  sendChangeTo = chainAParty.wallet.getAddress
)

val chainALockSigned = chainAParty.wallet.sign(chainALockTransaction)
chainASim.send(chainALockSigned)

// Step 2: Chain B party locks tokens (responds to swap)
val chainBLockBox = Box(
  value = MinBoxValue,
  script = chainBContract,
  tokens = List((chainBTokenId -> chainBTokenAmount))
)

val chainBLockTransaction = Transaction(
  inputs = chainBParty.selectUnspentBoxes(
    tokens = List((chainBTokenId -> chainBTokenAmount))
  ),
  outputs = List(chainBLockBox),
  fee = MinTxFee,
  sendChangeTo = chainBParty.wallet.getAddress
)

val chainBLockSigned = chainBParty.wallet.sign(chainBLockTransaction)
chainBSim.send(chainBLockSigned)

// Step 3: Chain A party claims tokens on Chain B (reveals secret)
val chainBClaimBox = Box(
  value = MinBoxValue - MinTxFee,
  script = contract(chainAParty.wallet.getAddress.pubKey),
  tokens = List((chainBTokenId -> chainBTokenAmount))
)

val chainBClaimTransaction = Transaction(
  inputs = List(chainBLockSigned.outputs(0)),
  outputs = List(chainBClaimBox),
  fee = MinTxFee
)

val chainBClaimWithSecret = chainBClaimTransaction.copy(
  inputs = chainBClaimTransaction.inputs.map(_.copy(
    extension = Map(R4 -> "cross_chain_secret_here".getBytes())
  ))
)

val chainBClaimSigned = chainAParty.wallet.sign(chainBClaimWithSecret)
chainBSim.send(chainBClaimSigned)

// Step 4: Chain B party claims ERG on Chain A (using revealed secret)
val chainAClaimBox = Box(
  value = swapAmount - MinTxFee,
  script = contract(chainBParty.wallet.getAddress.pubKey)
)

val chainAClaimTransaction = Transaction(
  inputs = List(chainALockSigned.outputs(0)),
  outputs = List(chainAClaimBox),
  fee = MinTxFee
)

val chainAClaimWithSecret = chainAClaimTransaction.copy(
  inputs = chainAClaimTransaction.inputs.map(_.copy(
    extension = Map(R4 -> "cross_chain_secret_here".getBytes())
  ))
)

val chainAClaimSigned = chainBParty.wallet.sign(chainAClaimWithSecret)
chainASim.send(chainAClaimSigned)

// Swap completed successfully on both chains!`,

  stealthAddress: `// Stealth Address Contract
// Enables privacy-preserving transactions using one-time addresses
val recipientViewKey = "recipient_view_key_here"
val recipientSpendKey = "recipient_spend_key_here"
val senderEphemeralKey = "sender_ephemeral_private_key_here"
val sharedSecret = "computed_shared_secret_here" // ECDH(senderEphemeral, recipientView)
val oneTimeAddress = "computed_one_time_address_here" // Hash(sharedSecret || recipientSpend)

val stealthScript = s"""
{
  // Only the recipient can spend from this stealth address
  // They need to prove knowledge of the one-time private key
  val validSpend = {
    val providedPubKey = OUTPUTS(0).propositionBytes
    val validRecipient = {
      // Recipient reconstructs the one-time private key and proves ownership
      // In practice, this would involve elliptic curve operations
      // Simplified here for demonstration
      val reconstructedSecret = INPUTS(0).R4[Coll[Byte]].get
      blake2b256(reconstructedSecret) == blake2b256("$sharedSecret".getBytes())
    }
    validRecipient
  }
  
  // Emergency recovery mechanism (time-locked)
  val emergencyRecovery = {
    HEIGHT > SELF.creationInfo._1 + 10000L && // Very long timeout
    sigmaProp("$recipientSpendKey")
  }
  
  validSpend || emergencyRecovery
}
""".stripMargin

val stealthContract = ErgoScriptCompiler.compile(Map(), stealthScript)

// Create blockchain simulation
val blockchainSim = newBlockChainSimulationScenario("Stealth Address Scenario")
val senderParty = blockchainSim.newParty("sender")
val recipientParty = blockchainSim.newParty("recipient")

// Initial funds
val senderFunds = 100000000L // 0.1 ERG
val stealthAmount = 50000000L // 0.05 ERG

senderParty.generateUnspentBoxes(toSpend = senderFunds)
recipientParty.generateUnspentBoxes(toSpend = 10000000L) // Small amount for fees

// Step 1: Generate ephemeral key pair (sender)
val ephemeralPrivKey = "random_ephemeral_private_key"
val ephemeralPubKey = "derived_ephemeral_public_key" // Derive from private key

// Step 2: Compute shared secret using ECDH
// sharedSecret = ECDH(ephemeralPrivKey, recipientViewKey)
val computedSharedSecret = Blake2b256(
  (ephemeralPrivKey + recipientViewKey).getBytes()
) // Simplified ECDH

// Step 3: Compute one-time address
// oneTimePrivKey = Hash(sharedSecret || recipientSpendKey)
val oneTimePrivKey = Blake2b256(
  computedSharedSecret ++ recipientSpendKey.getBytes()
)

// Step 4: Create stealth payment
val stealthBox = Box(
  value = stealthAmount,
  script = stealthContract,
  registers = Map(
    R4 -> ephemeralPubKey.getBytes(), // Public ephemeral key for recipient
    R5 -> computedSharedSecret // Shared secret (simplified)
  )
)

// Sender creates the stealth payment
val stealthPaymentTransaction = Transaction(
  inputs = senderParty.selectUnspentBoxes(toSpend = stealthAmount + MinTxFee),
  outputs = List(stealthBox),
  fee = MinTxFee,
  sendChangeTo = senderParty.wallet.getAddress
)

val stealthPaymentSigned = senderParty.wallet.sign(stealthPaymentTransaction)
blockchainSim.send(stealthPaymentSigned)

// Step 5: Recipient scans blockchain and detects payment
// They compute the shared secret using their view key and the ephemeral public key
val recipientComputedSecret = Blake2b256(
  (recipientViewKey + ephemeralPubKey).getBytes()
) // Recipient's ECDH computation

// Step 6: Recipient computes one-time private key
val recipientOneTimePrivKey = Blake2b256(
  recipientComputedSecret ++ recipientSpendKey.getBytes()
)

// Step 7: Recipient spends from stealth address
val recipientBox = Box(
  value = stealthAmount - MinTxFee,
  script = contract(recipientParty.wallet.getAddress.pubKey)
)

val stealthSpendTransaction = Transaction(
  inputs = List(stealthPaymentSigned.outputs(0)),
  outputs = List(recipientBox),
  fee = MinTxFee
)

// Recipient proves knowledge of one-time private key
val stealthSpendWithProof = stealthSpendTransaction.copy(
  inputs = stealthSpendTransaction.inputs.map(_.copy(
    extension = Map(R4 -> recipientComputedSecret) // Proof of shared secret knowledge
  ))
)

val stealthSpendSigned = recipientParty.wallet.sign(stealthSpendWithProof)
blockchainSim.send(stealthSpendSigned)

// Payment completed with enhanced privacy!
// Observer cannot link sender to recipient without view keys`
};

const ContractTester: React.FC<ContractTesterProps> = ({ selectedExample }) => {
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'params' | 'results' | 'diagram' | 'learn'>('learn');
  const [parameters, setParameters] = useState<Record<string, any>>({});

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
          <ContractEducation 
            selectedExample={selectedExample}
          />
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
          <UTXOVisualization
            contractCode={code}
            isRunning={isRunning}
            executionStep={simulationResult ? simulationResult.transactions.length : 0}
            maxSteps={simulationResult ? simulationResult.transactions.length : 0}
          />
        )}
      </div>
    </div>
  );
};

export default ContractTester;