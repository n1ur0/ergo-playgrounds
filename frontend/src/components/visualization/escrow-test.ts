/**
 * Escrow contract test to validate multi-scenario parsing capabilities
 */

// Complex escrow contract with three parties and multiple resolution scenarios
export const escrowContractCode = `
object EscrowPlayground {
  import org.ergoplatform.compiler.ErgoScalaCompiler._
  import org.ergoplatform.playground._

  val buyerParty = blockchainSim.newParty("Buyer")
  val sellerParty = blockchainSim.newParty("Seller") 
  val arbiterParty = blockchainSim.newParty("Arbiter")

  val escrowAmount = 100000000L
  val arbiterFee = 5000000L
  val timeoutHeight = 1000L
  val disputeTimeWindow = 100L

  // Escrow contract with three resolution paths
  def escrowContract(
    buyerPk: SigmaProp,
    sellerPk: SigmaProp,
    arbiterPk: SigmaProp,
    timeoutHeight: Long,
    disputeTimeWindow: Long
  ) = {
    val escrowContractEnv: ScriptEnv = Map(
      "buyerPk" -> buyerPk,
      "sellerPk" -> sellerPk, 
      "arbiterPk" -> arbiterPk,
      "timeoutHeight" -> timeoutHeight,
      "disputeTimeWindow" -> disputeTimeWindow
    )

    val escrowScript = s"""
    // Scenario A: Normal completion (buyer + seller agreement)
    (buyerPk && sellerPk) || 

    // Scenario B: Dispute resolution (arbiter decision)
    (arbiterPk && HEIGHT > (SELF.creationInfo._1 + disputeTimeWindow)) ||

    // Scenario C: Timeout refund (buyer only, after timeout)
    (buyerPk && HEIGHT > timeoutHeight) || 

    // Contract logic for state transitions
    {
      val isNormalCompletion = OUTPUTS.exists { (box: Box) =>
        box.R4[Coll[Byte]].isDefined && 
        box.R4[Coll[Byte]].get == SELF.id &&
        box.propositionBytes == sellerPk.propBytes
      }

      val isDisputeResolution = OUTPUTS.exists { (box: Box) =>
        box.R5[Long].isDefined && 
        box.R5[Long].get == 1L && // Dispute resolution flag
        box.R6[Coll[Byte]].isDefined &&
        box.R6[Coll[Byte]].get == arbiterPk.propBytes
      }

      val isTimeoutRefund = HEIGHT > timeoutHeight && OUTPUTS.exists { (box: Box) =>
        box.R7[Long].isDefined && 
        box.R7[Long].get == 2L && // Timeout flag
        box.propositionBytes == buyerPk.propBytes
      }

      isNormalCompletion || isDisputeResolution || isTimeoutRefund
    }
    """.stripMargin

    ErgoScriptCompiler.compile(escrowContractEnv, escrowScript)
  }

  // Initial deposit transaction
  val initialDepositBox = Box(
    value = escrowAmount + arbiterFee,
    script = escrowContract(
      buyerParty.wallet.getAddress.pubKey,
      sellerParty.wallet.getAddress.pubKey,
      arbiterParty.wallet.getAddress.pubKey,
      timeoutHeight,
      disputeTimeWindow
    ),
    registers = Map(
      R4 -> depositTransactionSigned.outputs(0).id,
      R5 -> 0L, // State: 0=active, 1=dispute, 2=timeout
      R6 -> buyerParty.wallet.getAddress.pubKey.propBytes
    )
  )

  val depositTransaction = Transaction(
    inputs = buyerParty.selectUnspentBoxes(toSpend = escrowAmount + arbiterFee + MinTxFee),
    outputs = List(initialDepositBox),
    fee = MinTxFee,
    sendChangeTo = buyerParty.wallet.getAddress
  )

  val depositTransactionSigned = buyerParty.wallet.sign(depositTransaction)
  blockchainSim.send(depositTransactionSigned)

  // Scenario A: Normal completion (both parties agree)
  val normalCompletionSellerBox = Box(
    value = escrowAmount,
    script = contract(sellerParty.wallet.getAddress.pubKey),
    registers = Map(
      R4 -> depositTransactionSigned.outputs(0).id,
      R5 -> 0L // Normal completion
    )
  )

  val normalCompletionArbiterBox = Box(
    value = arbiterFee,
    script = contract(arbiterParty.wallet.getAddress.pubKey)
  )

  val normalCompletionTransaction = Transaction(
    inputs = List(depositTransactionSigned.outputs(0)),
    outputs = List(normalCompletionSellerBox, normalCompletionArbiterBox),
    fee = MinTxFee,
    sendChangeTo = buyerParty.wallet.getAddress
  )

  // Scenario B: Dispute resolution (arbiter decides for seller)
  val disputeResolutionSellerBox = Box(
    value = escrowAmount - (arbiterFee / 2), // Seller pays half arbiter fee
    script = contract(sellerParty.wallet.getAddress.pubKey),
    registers = Map(
      R4 -> depositTransactionSigned.outputs(0).id,
      R5 -> 1L, // Dispute resolution
      R6 -> arbiterParty.wallet.getAddress.pubKey.propBytes
    )
  )

  val disputeResolutionArbiterBox = Box(
    value = arbiterFee + (arbiterFee / 2), // Gets full fee plus penalty
    script = contract(arbiterParty.wallet.getAddress.pubKey),
    registers = Map(
      R5 -> 1L // Dispute resolution flag
    )
  )

  val disputeResolutionTransaction = Transaction(
    inputs = List(depositTransactionSigned.outputs(0)),
    outputs = List(disputeResolutionSellerBox, disputeResolutionArbiterBox),
    fee = MinTxFee,
    sendChangeTo = arbiterParty.wallet.getAddress
  )

  // Scenario C: Timeout refund (buyer gets money back)
  val timeoutRefundBuyerBox = Box(
    value = escrowAmount,
    script = contract(buyerParty.wallet.getAddress.pubKey),
    registers = Map(
      R4 -> depositTransactionSigned.outputs(0).id,
      R7 -> 2L // Timeout flag
    )
  )

  val timeoutRefundArbiterBox = Box(
    value = arbiterFee,
    script = contract(arbiterParty.wallet.getAddress.pubKey)
  )

  val timeoutRefundTransaction = Transaction(
    inputs = List(depositTransactionSigned.outputs(0)),
    outputs = List(timeoutRefundBuyerBox, timeoutRefundArbiterBox),
    fee = MinTxFee,
    sendChangeTo = buyerParty.wallet.getAddress
  )

  // Demonstrate different execution paths
  // Path 1: Normal execution (signed by both buyer and seller)
  val normalTxSigned = Transaction(
    inputs = List(depositTransactionSigned.outputs(0)),
    outputs = List(normalCompletionSellerBox, normalCompletionArbiterBox),
    fee = MinTxFee,
    sendChangeTo = buyerParty.wallet.getAddress
  )
  val normalTxBuyerSigned = buyerParty.wallet.sign(normalTxSigned)
  val normalTxFullySigned = sellerParty.wallet.sign(normalTxBuyerSigned)

  // Path 2: Dispute resolution (signed by arbiter)
  val disputeTxSigned = arbiterParty.wallet.sign(disputeResolutionTransaction)

  // Path 3: Timeout refund (signed by buyer after timeout)
  val timeoutTxSigned = buyerParty.wallet.sign(timeoutRefundTransaction)
}
`;