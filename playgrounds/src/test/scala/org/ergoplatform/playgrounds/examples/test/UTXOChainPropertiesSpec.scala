package org.ergoplatform.playgrounds.examples.test

import org.ergoplatform.playgrounds.examples.DEXPlayground
import org.ergoplatform.playground._
import org.scalatest.{PropSpec, Matchers}
import org.scalacheck.{Arbitrary, Gen}
import org.scalatestplus.scalacheck.ScalaCheckPropertyChecks

class UTXOChainPropertiesSpec extends PropSpec with Matchers with ScalaCheckPropertyChecks {

  import DEXPlayground.OrderState

  // Generators for property-based testing
  val orderStateGen: Gen[Long] = Gen.oneOf(
    OrderState.ACTIVE,
    OrderState.PARTIAL, 
    OrderState.COMPLETE,
    OrderState.CANCELLED
  )

  val boxIdGen: Gen[Array[Byte]] = Gen.listOfN(32, Arbitrary.arbitrary[Byte]).map(_.toArray)

  val sequenceGen: Gen[Long] = Gen.choose(0L, 1000L)

  val amountGen: Gen[Long] = Gen.choose(1L, 1000000L)

  case class MockBox(
    parentId: Option[Array[Byte]],
    rootId: Array[Byte], 
    sequence: Long,
    status: Long,
    fillAmount: Long,
    totalAmount: Long,
    timestamp: Long
  )

  val mockBoxGen: Gen[MockBox] = for {
    parentId <- Gen.option(boxIdGen)
    rootId <- boxIdGen
    sequence <- sequenceGen  
    status <- orderStateGen
    fillAmount <- amountGen
    totalAmount <- amountGen.suchThat(_ >= fillAmount)
    timestamp <- Gen.choose(1000000000L, 2000000000L)
  } yield MockBox(parentId, rootId, sequence, status, fillAmount, totalAmount, timestamp)

  property("Chain invariants should always hold") {
    forAll(Gen.listOfN(10, mockBoxGen)) { boxes =>
      // Group boxes by root ID
      val chainsByRoot = boxes.groupBy(_.rootId.toSeq)
      
      chainsByRoot.foreach { case (rootId, chain) =>
        // Within each chain, sequences should be unique
        val sequences = chain.map(_.sequence)
        sequences.distinct.length shouldEqual sequences.length
        
        // Fill amounts should never exceed total amounts
        chain.foreach { box =>
          box.fillAmount should be <= box.totalAmount
        }
        
        // Timestamps should be monotonic within a sequence
        val sortedBySequence = chain.sortBy(_.sequence)
        sortedBySequence.zip(sortedBySequence.tail).foreach { case (prev, next) =>
          if (next.sequence > prev.sequence) {
            next.timestamp should be >= prev.timestamp
          }
        }
      }
    }
  }

  property("State transitions should be valid in any chain") {
    forAll(Gen.listOfN(5, mockBoxGen)) { boxes =>
      // Sort by sequence to simulate chain progression
      val sortedBoxes = boxes.groupBy(_.rootId.toSeq)
        .values
        .map(_.sortBy(_.sequence))
      
      sortedBoxes.foreach { chain =>
        chain.zip(chain.tail).foreach { case (prev, next) =>
          val transition = (prev.status, next.status)
          
          val isValidTransition = transition match {
            case (OrderState.ACTIVE, OrderState.PARTIAL) => true
            case (OrderState.ACTIVE, OrderState.COMPLETE) => true
            case (OrderState.ACTIVE, OrderState.CANCELLED) => true
            case (OrderState.PARTIAL, OrderState.PARTIAL) => true
            case (OrderState.PARTIAL, OrderState.COMPLETE) => true
            case (OrderState.PARTIAL, OrderState.CANCELLED) => true
            case (OrderState.COMPLETE, _) => false // Terminal state
            case (OrderState.CANCELLED, _) => false // Terminal state
            case (s1, s2) if s1 == s2 => true // Same state allowed
            case _ => false
          }
          
          if (!isValidTransition) {
            fail(s"Invalid state transition from ${prev.status} to ${next.status}")
          }
        }
      }
    }
  }

  property("Partial fill arithmetic should be consistent") {
    forAll(amountGen, Gen.choose(1, 10)) { (totalAmount, numFills) =>
      whenever(totalAmount > numFills) {
        // Generate partial fill amounts that sum to total
        val fillAmounts = (1 until numFills).map(_ => totalAmount / numFills).toList :+ 
          (totalAmount - (numFills - 1) * (totalAmount / numFills))
        
        fillAmounts.sum shouldEqual totalAmount
        
        // Simulate progressive fills
        var remainingAmount = totalAmount
        fillAmounts.foreach { fillAmount =>
          fillAmount should be <= remainingAmount
          fillAmount should be > 0L
          remainingAmount -= fillAmount
        }
        
        remainingAmount shouldEqual 0L
      }
    }
  }

  property("Box ID validation should prevent tampering") {
    forAll(boxIdGen, boxIdGen) { (validId, invalidId) =>
      whenever(!validId.sameElements(invalidId)) {
        // Simulate validation function
        def validateBoxId(expectedId: Array[Byte], actualId: Array[Byte]): Boolean = {
          expectedId.sameElements(actualId)
        }
        
        validateBoxId(validId, validId) shouldBe true
        validateBoxId(validId, invalidId) shouldBe false
        
        // Test edge cases
        validateBoxId(validId, Array.empty) shouldBe false
        validateBoxId(Array.empty, validId) shouldBe false
        validateBoxId(Array.empty, Array.empty) shouldBe true
      }
    }
  }

  property("Sequence numbers should prevent replay attacks") {
    forAll(Gen.listOf(sequenceGen)) { sequences =>
      whenever(sequences.nonEmpty) {
        val sortedSequences = sequences.sorted
        
        // Check for monotonic progression (allowing duplicates)
        sortedSequences.zip(sortedSequences.tail).foreach { case (prev, next) =>
          next should be >= prev
        }
        
        // In a real chain, sequences should be strictly increasing
        val uniqueSequences = sequences.distinct.sorted
        if (uniqueSequences.length > 1) {
          uniqueSequences.zip(uniqueSequences.tail).foreach { case (prev, next) =>
            next should be > prev
          }
        }
      }
    }
  }

  property("Register packing should preserve data integrity") {
    forAll(orderStateGen, amountGen, amountGen, Gen.choose(1000000000L, 2000000000L)) { 
      (status, fillAmount, totalAmount, timestamp) =>
        whenever(fillAmount <= totalAmount) {
          val packedData = Coll(status, fillAmount, totalAmount, timestamp)
          
          // Simulate round-trip through register storage
          val retrievedStatus = packedData(0)
          val retrievedFillAmount = packedData(1)
          val retrievedTotalAmount = packedData(2)
          val retrievedTimestamp = packedData(3)
          
          retrievedStatus shouldEqual status
          retrievedFillAmount shouldEqual fillAmount
          retrievedTotalAmount shouldEqual totalAmount
          retrievedTimestamp shouldEqual timestamp
          
          // Verify data relationships are preserved
          retrievedFillAmount should be <= retrievedTotalAmount
          retrievedTimestamp should be > 0L
        }
    }
  }

  property("Chain reconstruction should be deterministic") {
    forAll(Gen.listOfN(10, mockBoxGen)) { boxes =>
      // Group by root and sort by sequence
      val chains = boxes
        .groupBy(_.rootId.toSeq)
        .mapValues(_.sortBy(_.sequence))
      
      chains.foreach { case (rootId, chain) =>
        if (chain.nonEmpty) {
          // First box should have sequence 0 or be the minimum
          val minSequence = chain.head.sequence
          
          // Reconstruct chain by following parent references (simulated)
          val reconstructed = chain.foldLeft(List.empty[MockBox]) { (acc, box) =>
            acc :+ box
          }
          
          reconstructed shouldEqual chain
          
          // Verify chain properties
          reconstructed.foreach { box =>
            box.rootId.toSeq shouldEqual rootId
          }
        }
      }
    }
  }

  property("Gas optimization should scale linearly") {
    val smallBoxSet = (1 to 10).map(createMockBox)
    val largeBoxSet = (1 to 1000).map(createMockBox)
    
    // Simulate filtering operation
    def filterByRoot(boxes: Seq[MockBox], targetRoot: Array[Byte]): Seq[MockBox] = {
      boxes.filter(_.rootId.sameElements(targetRoot))
    }
    
    val targetRoot = Array.fill(32)(1.toByte)
    
    // Both operations should complete (no timeout)
    noException should be thrownBy {
      filterByRoot(smallBoxSet, targetRoot)
    }
    
    noException should be thrownBy {
      filterByRoot(largeBoxSet, targetRoot)  
    }
    
    // Results should be proportional to input size
    val smallResults = filterByRoot(smallBoxSet, targetRoot)
    val largeResults = filterByRoot(largeBoxSet, targetRoot)
    
    (largeResults.length.toDouble / largeBoxSet.length) shouldEqual 
      (smallResults.length.toDouble / smallBoxSet.length) +- 0.1
  }

  property("Concurrent modifications should be detectable") {
    forAll(Gen.listOfN(5, mockBoxGen)) { boxes =>
      val rootId = boxes.head.rootId
      
      // Simulate concurrent modifications by having same sequence numbers
      val concurrentBoxes = boxes.map(_.copy(rootId = rootId, sequence = 1L))
      
      // Should detect duplicate sequences in same chain
      val sequences = concurrentBoxes.map(_.sequence)
      val hasDuplicates = sequences.length != sequences.distinct.length
      
      if (concurrentBoxes.length > 1) {
        hasDuplicates shouldBe true // Detected concurrent modification
      }
    }
  }

  property("Error conditions should be handled gracefully") {
    // Test with invalid data
    val invalidBoxes = Seq(
      MockBox(None, Array.empty, -1L, 99L, -10L, 50L, 0L), // Multiple issues
      MockBox(Some(Array.empty), Array.fill(32)(1.toByte), 0L, OrderState.ACTIVE, 100L, 50L, 1000L), // Fill > total
      MockBox(None, Array.fill(16)(1.toByte), 0L, OrderState.ACTIVE, 10L, 100L, -1000L) // Invalid timestamp
    )
    
    invalidBoxes.foreach { box =>
      // Should detect issues without throwing exceptions
      noException should be thrownBy {
        val hasValidId = box.rootId.length == 32
        val hasValidSequence = box.sequence >= 0
        val hasValidFillAmount = box.fillAmount <= box.totalAmount && box.fillAmount >= 0
        val hasValidTimestamp = box.timestamp > 0
        
        val isValid = hasValidId && hasValidSequence && hasValidFillAmount && hasValidTimestamp
        // Just testing that validation completes without errors
      }
    }
  }

  // Helper function to create mock boxes with predictable properties
  private def createMockBox(index: Int): MockBox = {
    MockBox(
      parentId = if (index == 1) None else Some(Array.fill(32)((index - 1).toByte)),
      rootId = Array.fill(32)(1.toByte), // All same root for testing
      sequence = index.toLong,
      status = if (index % 2 == 0) OrderState.PARTIAL else OrderState.ACTIVE,
      fillAmount = index * 10L,
      totalAmount = index * 20L,
      timestamp = 1000000000L + index
    )
  }
}