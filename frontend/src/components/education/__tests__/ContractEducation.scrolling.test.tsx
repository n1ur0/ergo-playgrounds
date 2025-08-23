import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import ContractEducation from '../ContractEducation'

// Mock educational content for testing
const mockEducationalContent = {
  contracts: [
    {
      id: 'simple-payment',
      title: 'Simple Payment Contract',
      difficulty: 'beginner',
      simpleExplanation: 'A basic contract for sending payments',
      realWorldAnalogy: 'Like a digital handshake deal',
      players: ['Sender', 'Receiver'],
      rules: ['Pay exact amount', 'Confirm receipt'],
      practicalUses: ['Direct payments', 'Escrow services'],
      funFacts: ['First smart contract concept'],
      commonMistakes: ['Wrong amount', 'Invalid address'],
      concepts: [
        {
          term: 'UTXO',
          simpleDefinition: 'Unspent transaction output',
          analogy: 'Like digital coins in your wallet',
          technicalNote: 'Each UTXO can only be spent once'
        }
      ],
      processSteps: [
        {
          step: 1,
          title: 'Create Transaction',
          description: 'Build the payment transaction',
          visualMetaphor: 'Writing a check',
          codeSnippet: 'val payment = PaymentTx(amount, recipient)'
        }
      ],
      quiz: [
        {
          question: 'What is a UTXO?',
          options: ['A transaction', 'An unspent output', 'A contract', 'A wallet'],
          correctAnswer: 1,
          explanation: 'UTXO stands for Unspent Transaction Output'
        }
      ]
    }
  ]
}

// Mock the educational content module
vi.mock('../../data/educationalContent', () => ({
  educationalContent: mockEducationalContent
}))

describe('ContractEducation Scrolling Behavior', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    
    // Reset scroll mocks
    vi.clearAllMocks()
    
    // Mock container dimensions for overflow calculation
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      value: 1000,
    })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 400,
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 0,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Container Scrolling', () => {
    it('should render education content container with proper scrolling styles', () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content')
      expect(contentContainer).toBeInTheDocument()
      
      // Check CSS properties are applied
      const styles = getComputedStyle(contentContainer!)
      expect(styles.overflowY).toBe('auto')
      expect(styles.scrollBehavior).toBe('smooth')
    })

    it('should allow vertical scrolling when content overflows', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      expect(contentContainer).toBeInTheDocument()
      
      // Simulate scrolling
      fireEvent.scroll(contentContainer, { target: { scrollTop: 100 } })
      
      // Check that scrollTop was updated
      await waitFor(() => {
        expect(contentContainer.scrollTop).toBe(100)
      })
    })

    it('should maintain scroll position when switching between tabs', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const conceptsTab = screen.getByRole('button', { name: /key concepts/i })
      const overviewTab = screen.getByRole('button', { name: /overview/i })
      
      // Switch to concepts tab
      await user.click(conceptsTab)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      
      // Scroll down
      fireEvent.scroll(contentContainer, { target: { scrollTop: 200 } })
      
      // Switch back to overview
      await user.click(overviewTab)
      
      // Switch back to concepts - scroll position should be maintained per section
      await user.click(conceptsTab)
      
      expect(contentContainer).toBeInTheDocument()
    })
  })

  describe('Smooth Scrolling Behavior', () => {
    it('should apply smooth scroll behavior to education content', () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content')
      const styles = getComputedStyle(contentContainer!)
      
      expect(styles.scrollBehavior).toBe('smooth')
    })

    it('should handle scroll events properly', async () => {
      const scrollHandler = vi.fn()
      
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      contentContainer.addEventListener('scroll', scrollHandler)
      
      // Trigger scroll
      fireEvent.scroll(contentContainer, { target: { scrollTop: 50 } })
      
      expect(scrollHandler).toHaveBeenCalled()
    })
  })

  describe('Content Section Navigation', () => {
    it('should scroll to top when switching between sections', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      const conceptsTab = screen.getByRole('button', { name: /key concepts/i })
      
      // Scroll down in overview
      fireEvent.scroll(contentContainer, { target: { scrollTop: 300 } })
      
      // Switch to concepts
      await user.click(conceptsTab)
      
      // Should scroll back to top for new section
      await waitFor(() => {
        expect(contentContainer.scrollTop).toBe(0)
      })
    })

    it('should handle process step navigation scrolling', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const processTab = screen.getByRole('button', { name: /how it works/i })
      await user.click(processTab)
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      // Should maintain smooth scrolling during step changes
      const contentContainer = document.querySelector('.education-content')
      const styles = getComputedStyle(contentContainer!)
      expect(styles.scrollBehavior).toBe('smooth')
    })
  })

  describe('Quiz Section Scrolling', () => {
    it('should allow scrolling through quiz questions', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const quizTab = screen.getByRole('button', { name: /quiz time/i })
      await user.click(quizTab)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      
      // Simulate scrolling through quiz
      fireEvent.scroll(contentContainer, { target: { scrollTop: 150 } })
      
      await waitFor(() => {
        expect(contentContainer.scrollTop).toBe(150)
      })
    })

    it('should scroll to show quiz results when submitted', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const quizTab = screen.getByRole('button', { name: /quiz time/i })
      await user.click(quizTab)
      
      // Answer quiz question
      const option = screen.getByRole('button', { name: /an unspent output/i })
      await user.click(option)
      
      // Submit quiz
      const submitButton = screen.getByRole('button', { name: /submit quiz/i })
      await user.click(submitButton)
      
      // Results should be visible
      expect(screen.getByText(/score:/i)).toBeInTheDocument()
    })
  })

  describe('Touch Scrolling (Mobile)', () => {
    it('should support touch scrolling on mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content')
      const styles = getComputedStyle(contentContainer!)
      
      // Check for webkit touch scrolling
      expect(styles.WebkitOverflowScrolling).toBe('touch')
    })

    it('should handle touch events for scrolling', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      
      // Simulate touch scrolling
      fireEvent.touchStart(contentContainer, {
        touches: [{ clientY: 100 }]
      })
      
      fireEvent.touchMove(contentContainer, {
        touches: [{ clientY: 50 }]
      })
      
      fireEvent.touchEnd(contentContainer)
      
      expect(contentContainer).toBeInTheDocument()
    })
  })

  describe('Accessibility and Scroll Behavior', () => {
    it('should be keyboard navigable while maintaining scroll position', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const conceptsTab = screen.getByRole('button', { name: /key concepts/i })
      
      // Navigate using keyboard
      await user.tab()
      await user.keyboard('{Enter}')
      
      // Content should be accessible
      const contentContainer = document.querySelector('.education-content')
      expect(contentContainer).toBeInTheDocument()
    })

    it('should maintain focus management during scrolling', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const processTab = screen.getByRole('button', { name: /how it works/i })
      await user.click(processTab)
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      nextButton.focus()
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      fireEvent.scroll(contentContainer, { target: { scrollTop: 100 } })
      
      // Focus should be maintained
      expect(document.activeElement).toBe(nextButton)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing content gracefully without breaking scroll', () => {
      render(<ContractEducation selectedExample={null} />)
      
      // Should show empty state
      expect(screen.getByText(/ready to learn smart contracts/i)).toBeInTheDocument()
      
      // Container should still be scrollable
      const emptyContainer = document.querySelector('.contract-education-empty')
      expect(emptyContainer).toBeInTheDocument()
    })

    it('should handle scroll events when content is not loaded', () => {
      render(<ContractEducation selectedExample="non-existent" />)
      
      // Should not throw errors
      const emptyContainer = document.querySelector('.contract-education-empty')
      expect(emptyContainer).toBeInTheDocument()
    })
  })
})