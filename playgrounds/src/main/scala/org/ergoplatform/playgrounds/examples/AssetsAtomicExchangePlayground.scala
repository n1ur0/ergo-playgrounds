package org.ergoplatform.playgrounds.examples

object AssetsAtomicExchangePlayground {
  import org.ergoplatform.compiler.ErgoScalaCompiler._
  import org.ergoplatform.playground._
  
  // Order states for enhanced pattern
  object OrderState {
    val ACTIVE = 0L
    val PARTIAL = 1L
    val COMPLETE = 2L
    val CANCELLED = 3L
  }

  // Enhanced buyer contract with multi-register UTXO linking
  def enhancedBuyerOrder(
    buyerParty: Party,
    token: TokenInfo,
    tokenAmount: Long,
    ergAmount: Long,
    txFee: Long
  ) = {

    val buyerPk = buyerParty.wallet.getAddress.pubKey

    val BuyerContract = contract {
      buyerPk || {
        // Enhanced validation with multi-register pattern
        def validateEnhancedBox(box: Box): Boolean = {
          val hasValidParent = box.R4[Coll[Byte]].isDefined && box.R4[Coll[Byte]].get == SELF.id
          val hasValidRoot = box.R5[Coll[Byte]].isDefined && {
            val rootId = box.R5[Coll[Byte]].get
            rootId == SELF.R5[Coll[Byte]].getOrElse(SELF.id)
          }
          val hasValidSequence = box.R6[Long].isDefined && {
            val currentSeq = SELF.R6[Long].getOrElse(0L)
            box.R6[Long].get == currentSeq + 1
          }
          val hasValidState = box.R7[Coll[Long]].isDefined && {
            val stateData = box.R7[Coll[Long]].get
            val status = stateData(0)
            val fillAmount = stateData(1)
            val totalAmount = stateData(2)
            status >= 0 && status <= 3 && fillAmount > 0 && fillAmount <= totalAmount
          }
          
          hasValidParent && hasValidRoot && hasValidSequence && hasValidState
        }
        
        // Legacy validation for backward compatibility
        def validateLegacyBox(box: Box): Boolean = {
          box.R4[Coll[Byte]].isDefined && box.R4[Coll[Byte]].get == SELF.id
        }
        
        // Validate box using enhanced pattern if available, otherwise legacy
        def validateBox(box: Box): Boolean = {
          if (box.R5[Coll[Byte]].isDefined) {
            validateEnhancedBox(box)
          } else {
            validateLegacyBox(box)
          }
        }
        
        (OUTPUTS.nonEmpty && validateBox(OUTPUTS(0))) && {
          val tokens = OUTPUTS(0).tokens
          val tokenDataCorrect = tokens.nonEmpty &&
            tokens(0)._1 == token.tokenId &&
            tokens(0)._2 >= tokenAmount

          tokenDataCorrect && OUTPUTS(0).propositionBytes == buyerPk.propBytes
        }
      }
    }

    val buyerBidBox = Box(value = ergAmount, script = BuyerContract)

    Transaction(
      inputs       = buyerParty.selectUnspentBoxes(toSpend = ergAmount + txFee),
      outputs      = List(buyerBidBox),
      fee          = txFee,
      sendChangeTo = buyerParty.wallet.getAddress
    )
  }

  // Enhanced seller contract with multi-register UTXO linking
  def enhancedSellerOrder(
    sellerParty: Party,
    token: TokenInfo,
    tokenAmount: Long,
    ergAmount: Long,
    dexFee: Long,
    txFee: Long
  ) = {

    val sellerPk = sellerParty.wallet.getAddress.pubKey

    val SellerContract = contract {
      sellerPk || (
        OUTPUTS.size > 1 &&
        OUTPUTS(1).R4[Coll[Byte]].isDefined
      ) && {
        // Enhanced validation with multi-register pattern
        def validateEnhancedBox(box: Box): Boolean = {
          val hasValidParent = box.R4[Coll[Byte]].isDefined && box.R4[Coll[Byte]].get == SELF.id
          val hasValidRoot = box.R5[Coll[Byte]].isDefined && {
            val rootId = box.R5[Coll[Byte]].get
            rootId == SELF.R5[Coll[Byte]].getOrElse(SELF.id)
          }
          val hasValidSequence = box.R6[Long].isDefined && {
            val currentSeq = SELF.R6[Long].getOrElse(0L)
            box.R6[Long].get == currentSeq + 1
          }
          val hasValidState = box.R7[Coll[Long]].isDefined && {
            val stateData = box.R7[Coll[Long]].get
            val status = stateData(0)
            val fillAmount = stateData(1)
            val totalAmount = stateData(2)
            status >= 0 && status <= 3 && fillAmount > 0 && fillAmount <= totalAmount
          }
          
          hasValidParent && hasValidRoot && hasValidSequence && hasValidState
        }
        
        // Legacy validation for backward compatibility
        def validateLegacyBox(box: Box): Boolean = {
          box.R4[Coll[Byte]].isDefined && box.R4[Coll[Byte]].get == SELF.id
        }
        
        // Validate box using enhanced pattern if available, otherwise legacy
        def validateBox(box: Box): Boolean = {
          if (box.R5[Coll[Byte]].isDefined) {
            validateEnhancedBox(box)
          } else {
            validateLegacyBox(box)
          }
        }
        
        val isValidBox = validateBox(OUTPUTS(1))
        OUTPUTS(1).value >= ergAmount &&
        isValidBox &&
        OUTPUTS(1).propositionBytes == sellerPk.propBytes
      }
    }

    val sellerBalanceBoxes = sellerParty.selectUnspentBoxes(
      toSpend       = dexFee + txFee,
      tokensToSpend = List(token -> tokenAmount)
    )

    val sellerAskBox = Box(
      value  = dexFee,
      token  = (token -> tokenAmount),
      script = SellerContract
    )

    Transaction(
      inputs       = sellerBalanceBoxes,
      outputs      = List(sellerAskBox),
      fee          = txFee,
      sendChangeTo = sellerParty.wallet.getAddress
    )
  }
  
  // Legacy methods for backward compatibility
  def buyerOrder(
    buyerParty: Party,
    token: TokenInfo,
    tokenAmount: Long,
    ergAmount: Long,
    txFee: Long
  ) = enhancedBuyerOrder(buyerParty, token, tokenAmount, ergAmount, txFee)
  
  def sellerOrder(
    sellerParty: Party,
    token: TokenInfo,
    tokenAmount: Long,
    ergAmount: Long,
    dexFee: Long,
    txFee: Long
  ) = enhancedSellerOrder(sellerParty, token, tokenAmount, ergAmount, dexFee, txFee)

  def swapScenario = {

    val blockchainSim = newBlockChainSimulationScenario("Swap")

    val token = blockchainSim.newToken("TKN")

    val buyerParty          = blockchainSim.newParty("buyer")
    val buyerBidTokenAmount = 100L
    val buyersBidNanoErgs   = 50000000L
    val buyerDexFee         = 1000000L
    val buyOrderTxFee       = MinTxFee
    val buyerSwapBoxValue   = MinErg

    buyerParty
      .generateUnspentBoxes(
        toSpend = buyersBidNanoErgs + buyOrderTxFee + buyerDexFee + buyerSwapBoxValue
      )

    val buyOrderTransaction =
      buyerOrder(
        buyerParty,
        token,
        buyerBidTokenAmount,
        buyersBidNanoErgs + buyerDexFee + buyerSwapBoxValue,
        buyOrderTxFee
      )

    val buyOrderTransactionSigned = buyerParty.wallet.sign(buyOrderTransaction)

    blockchainSim.send(buyOrderTransactionSigned)

    val sellerParty          = blockchainSim.newParty("seller")
    val sellerAskNanoErgs    = 50000000L
    val sellerAskTokenAmount = 100L
    val sellerDexFee         = 1000000L
    val sellOrderTxFee       = MinTxFee

    sellerParty.generateUnspentBoxes(
      toSpend       = sellOrderTxFee + sellerDexFee,
      tokensToSpend = List(token -> sellerAskTokenAmount)
    )

    val sellOrderTransaction =
      sellerOrder(
        sellerParty,
        token,
        sellerAskTokenAmount,
        sellerAskNanoErgs,
        sellerDexFee,
        sellOrderTxFee
      )

    val sellOrderTransactionSigned = sellerParty.wallet.sign(sellOrderTransaction)

    blockchainSim.send(sellOrderTransactionSigned)

    val sellerOutBox =
      Box(
        value    = sellerAskNanoErgs,
        registers = Map(
          R4 -> sellOrderTransactionSigned.outputs(0).id,
          R5 -> sellOrderTransactionSigned.outputs(0).id, // Root order reference
          R6 -> 1L, // First transaction in chain
          R7 -> Coll(OrderState.COMPLETE, sellerAskTokenAmount, sellerAskTokenAmount, System.currentTimeMillis())
        ),
        script   = contract(sellerParty.wallet.getAddress.pubKey)
      )

    val buyerOutBox = Box(
      value    = buyerSwapBoxValue,
      token    = (token -> buyerBidTokenAmount),
      registers = Map(
        R4 -> buyOrderTransactionSigned.outputs(0).id,
        R5 -> buyOrderTransactionSigned.outputs(0).id, // Root order reference
        R6 -> 1L, // First transaction in chain
        R7 -> Coll(OrderState.COMPLETE, buyerBidTokenAmount, buyerBidTokenAmount, System.currentTimeMillis())
      ),
      script   = contract(buyerParty.wallet.getAddress.pubKey)
    )

    val dexParty = blockchainSim.newParty("DEX")

    val dexFee    = sellerDexFee + buyerDexFee
    val swapTxFee = MinTxFee

    val dexFeeOutBox = Box(
      value  = dexFee - swapTxFee,
      script = contract(dexParty.wallet.getAddress.pubKey)
    )

    val swapTransaction = Transaction(
      inputs =
        List(buyOrderTransactionSigned.outputs(0), sellOrderTransactionSigned.outputs(0)),
      outputs = List(buyerOutBox, sellerOutBox, dexFeeOutBox),
      fee     = swapTxFee
    )

    val swapTransactionSigned = dexParty.wallet.sign(swapTransaction)

    blockchainSim.send(swapTransactionSigned)

    sellerParty.printUnspentAssets()
    buyerParty.printUnspentAssets()
    dexParty.printUnspentAssets()
  }

  def refundBuyOrderScenario = {

    val blockchainSim = newBlockChainSimulationScenario("Refund buy order")

    val buyerParty          = blockchainSim.newParty("buyer")
    val buyerBidTokenAmount = 100
    val buyersBidNanoErgs   = 100000000
    val buyOrderTxFee       = MinTxFee
    val buyerDexFee         = 1000000L
    val buyerSwapBoxValue   = MinErg
    val cancelTxFee         = MinTxFee

    buyerParty
      .generateUnspentBoxes(
        toSpend = buyersBidNanoErgs + buyerDexFee + buyOrderTxFee + buyerSwapBoxValue + cancelTxFee
      )
    val token = blockchainSim.newToken("TKN")

    val buyOrderTransaction =
      buyerOrder(
        buyerParty,
        token,
        buyerBidTokenAmount,
        buyersBidNanoErgs + buyerDexFee + buyerSwapBoxValue,
        buyOrderTxFee
      )

    val buyOrderTransactionSigned = buyerParty.wallet.sign(buyOrderTransaction)

    blockchainSim.send(buyOrderTransactionSigned)

    val buyerRefundBox =
      Box(
        value  = buyersBidNanoErgs,
        token  = (blockchainSim.newToken("DEXCNCL") -> 1L),
        script = contract(buyerParty.wallet.getAddress.pubKey)
      )

    val cancelBuyTransaction = Transaction(
      inputs       = List(buyOrderTransactionSigned.outputs(0)),
      outputs      = List(buyerRefundBox),
      fee          = cancelTxFee,
      sendChangeTo = buyerParty.wallet.getAddress
    )

    val cancelBuyTransactionSigned = buyerParty.wallet.sign(cancelBuyTransaction)
    blockchainSim.send(cancelBuyTransactionSigned)

    buyerParty.printUnspentAssets()
  }

  def refundSellOrderScenario = {

    val blockchainSim = newBlockChainSimulationScenario("Refund sell order")

    val token                = blockchainSim.newToken("TKN")
    val sellerParty          = blockchainSim.newParty("seller")
    val sellerAskNanoErgs    = 50000000L
    val sellerAskTokenAmount = 100L
    val sellerDexFee         = 1000000L
    val sellOrderTxFee       = MinTxFee
    val cancelTxFee          = MinTxFee

    sellerParty.generateUnspentBoxes(
      toSpend       = sellerDexFee + sellOrderTxFee + cancelTxFee,
      tokensToSpend = List(token -> sellerAskTokenAmount)
    )

    val sellOrderTransaction =
      sellerOrder(
        sellerParty,
        token,
        sellerAskTokenAmount,
        sellerAskNanoErgs,
        sellerDexFee,
        sellOrderTxFee
      )

    val sellOrderTransactionSigned = sellerParty.wallet.sign(sellOrderTransaction)

    blockchainSim.send(sellOrderTransactionSigned)
    val sellerRefundBox =
      Box(
        value  = sellerDexFee,
        token  = (token -> sellerAskTokenAmount),
        script = contract(sellerParty.wallet.getAddress.pubKey)
      )

    val cancelSellTransaction = Transaction(
      inputs = List(sellOrderTransactionSigned.outputs(0)) ++ sellerParty
          .selectUnspentBoxes(cancelTxFee),
      outputs = List(sellerRefundBox),
      fee     = cancelTxFee
    )

    val cancelSellTransactionSigned = sellerParty.wallet.sign(cancelSellTransaction)

    blockchainSim.send(cancelSellTransactionSigned)

    sellerParty.printUnspentAssets()
  }

  // Enhanced atomic swap scenario demonstrating improved UTXO connection patterns
  def enhancedAtomicSwapScenario = {

    val blockchainSim = newBlockChainSimulationScenario("EnhancedAtomicSwap")

    val token = blockchainSim.newToken("TKN")

    val buyerParty          = blockchainSim.newParty("buyer")
    val buyerBidTokenAmount = 100L
    val buyersBidNanoErgs   = 50000000L
    val buyerDexFee         = 1000000L
    val buyOrderTxFee       = MinTxFee
    val buyerSwapBoxValue   = MinErg

    buyerParty.generateUnspentBoxes(
      toSpend = buyersBidNanoErgs + buyOrderTxFee + buyerDexFee + buyerSwapBoxValue
    )

    val buyOrderTransaction = enhancedBuyerOrder(
      buyerParty,
      token,
      buyerBidTokenAmount,
      buyersBidNanoErgs + buyerDexFee + buyerSwapBoxValue,
      buyOrderTxFee
    )

    val buyOrderTransactionSigned = buyerParty.wallet.sign(buyOrderTransaction)
    blockchainSim.send(buyOrderTransactionSigned)

    val sellerParty          = blockchainSim.newParty("seller")
    val sellerAskNanoErgs    = 50000000L
    val sellerAskTokenAmount = 100L
    val sellerDexFee         = 1000000L
    val sellOrderTxFee       = MinTxFee

    sellerParty.generateUnspentBoxes(
      toSpend       = sellOrderTxFee + sellerDexFee,
      tokensToSpend = List(token -> sellerAskTokenAmount)
    )

    val sellOrderTransaction = enhancedSellerOrder(
      sellerParty,
      token,
      sellerAskTokenAmount,
      sellerAskNanoErgs,
      sellerDexFee,
      sellOrderTxFee
    )

    val sellOrderTransactionSigned = sellerParty.wallet.sign(sellOrderTransaction)
    blockchainSim.send(sellOrderTransactionSigned)

    println("=== Enhanced Atomic Swap with Chain Tracking ===")

    // Enhanced output boxes with full register tracking
    val sellerOutBox = Box(
      value = sellerAskNanoErgs,
      registers = Map(
        R4 -> sellOrderTransactionSigned.outputs(0).id,
        R5 -> sellOrderTransactionSigned.outputs(0).id, // Root order reference
        R6 -> 1L, // First transaction in chain
        R7 -> Coll(OrderState.COMPLETE, sellerAskTokenAmount, sellerAskTokenAmount, System.currentTimeMillis())
      ),
      script = contract(sellerParty.wallet.getAddress.pubKey)
    )

    val buyerOutBox = Box(
      value = buyerSwapBoxValue,
      token = (token -> buyerBidTokenAmount),
      registers = Map(
        R4 -> buyOrderTransactionSigned.outputs(0).id,
        R5 -> buyOrderTransactionSigned.outputs(0).id, // Root order reference
        R6 -> 1L, // First transaction in chain
        R7 -> Coll(OrderState.COMPLETE, buyerBidTokenAmount, buyerBidTokenAmount, System.currentTimeMillis())
      ),
      script = contract(buyerParty.wallet.getAddress.pubKey)
    )

    val dexParty = blockchainSim.newParty("DEX")
    val dexFee = sellerDexFee + buyerDexFee
    val swapTxFee = MinTxFee

    val dexFeeOutBox = Box(
      value = dexFee - swapTxFee,
      script = contract(dexParty.wallet.getAddress.pubKey)
    )

    val swapTransaction = Transaction(
      inputs = List(buyOrderTransactionSigned.outputs(0), sellOrderTransactionSigned.outputs(0)),
      outputs = List(buyerOutBox, sellerOutBox, dexFeeOutBox),
      fee = swapTxFee
    )

    val swapTransactionSigned = dexParty.wallet.sign(swapTransaction)
    blockchainSim.send(swapTransactionSigned)

    println("=== Enhanced Atomic Swap Complete - Full Chain Tracking ===")
    println(s"Buyer: Order -> Complete (seq=1)")
    println(s"Seller: Order -> Complete (seq=1)")
    
    sellerParty.printUnspentAssets()
    buyerParty.printUnspentAssets()
    dexParty.printUnspentAssets()
  }

  swapScenario
  enhancedAtomicSwapScenario
  refundSellOrderScenario
  refundBuyOrderScenario
}
