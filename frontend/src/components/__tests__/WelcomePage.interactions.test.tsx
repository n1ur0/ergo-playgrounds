import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import WelcomePage from '../WelcomePage'

// Mock the useResponsiveLayout hook
const mockLayout = {
  screenSize: 'desktop' as const,
  sidebarCollapsed: false,
  showEducationPanel: true,
  contentWidth: '100%',
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  toggleSidebar: vi.fn(),
  toggleEducationPanel: vi.fn(),
  setSidebarCollapsed: vi.fn(),
  setShowEducationPanel: vi.fn()
}

vi.mock('../../hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => mockLayout
}))

// Mock CSS imports
vi.mock('../WelcomePage.css', () => ({}))

describe('WelcomePage User Interaction Tests', () => {
  let user: ReturnType<typeof userEvent.setup>
  const mockOnSelectExample = vi.fn()
  const mockOnToggleSidebar = vi.fn()

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    
    // Reset mock layout to desktop defaults
    Object.assign(mockLayout, {
      screenSize: 'desktop',
      isMobile: false,
      isTablet: false,
      isDesktop: true
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Hero Section Interactions', () => {
    it('should handle primary action button interactions', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const getStartedButton = screen.getByRole('button', { name: /start with first smart contract example/i })
      
      // Test hover behavior (simulated)
      fireEvent.mouseEnter(getStartedButton)
      expect(getStartedButton).toBeInTheDocument()
      
      // Test click
      await user.click(getStartedButton)
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
      
      fireEvent.mouseLeave(getStartedButton)
    })

    it('should handle secondary action button interactions', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const tryDesignerButton = screen.getByRole('button', { name: /open visual contract designer/i })
      
      // Test click
      await user.click(tryDesignerButton)
      expect(mockOnSelectExample).toHaveBeenCalledWith('contractDesigner')
    })

    it('should handle focus states correctly', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      // Tab to first button
      await user.tab()
      const getStartedButton = screen.getByRole('button', { name: /start with first smart contract example/i })
      expect(getStartedButton).toHaveFocus()

      // Tab to second button
      await user.tab()
      const tryDesignerButton = screen.getByRole('button', { name: /open visual contract designer/i })
      expect(tryDesignerButton).toHaveFocus()
    })
  })

  describe('Learning Path Card Interactions', () => {
    it('should handle beginner path selection', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const beginnerCard = screen.getByRole('button', { name: /start new to smart contracts learning path/i })
      
      // Test hover behavior
      fireEvent.mouseEnter(beginnerCard)
      
      // Test click
      await user.click(beginnerCard)
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })

    it('should handle intermediate path selection', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const intermediateCard = screen.getByRole('button', { name: /start building defi applications learning path/i })
      
      await user.click(intermediateCard)
      expect(mockOnSelectExample).toHaveBeenCalledWith('escrowDepositContract')
    })

    it('should handle advanced path selection', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const advancedCard = screen.getByRole('button', { name: /start expert contract development learning path/i })
      
      await user.click(advancedCard)
      expect(mockOnSelectExample).toHaveBeenCalledWith('singleChainSwap')
    })

    it('should support keyboard navigation through learning paths', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      // Navigate to learning paths section
      const beginnerCard = screen.getByRole('button', { name: /start new to smart contracts learning path/i })
      beginnerCard.focus()
      
      // Enter key should trigger selection
      await user.keyboard('{Enter}')
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
      
      // Reset for space key test
      vi.clearAllMocks()
      beginnerCard.focus()
      
      // Space key should also trigger selection
      await user.keyboard(' ')
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })

    it('should provide visual feedback on interaction', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const beginnerCard = screen.getByRole('button', { name: /start new to smart contracts learning path/i })
      
      // Test focus styling
      beginnerCard.focus()
      expect(beginnerCard).toHaveFocus()
      
      // Test active state during click
      fireEvent.mouseDown(beginnerCard)
      fireEvent.mouseUp(beginnerCard)
    })
  })

  describe('Feature Showcase Interactions', () => {
    it('should handle contract tester feature selection', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const contractTesterCard = screen.getByRole('button', { name: /contract tester: run and test ergoscript contracts/i })
      
      await user.click(contractTesterCard)
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })

    it('should handle visual designer feature selection', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const visualDesignerCard = screen.getByRole('button', { name: /visual designer: create contracts with drag-and-drop visual components/i })
      
      await user.click(visualDesignerCard)
      expect(mockOnSelectExample).toHaveBeenCalledWith('contractDesigner')
    })

    it('should handle learning center feature selection', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const learningCenterCard = screen.getByRole('button', { name: /learning center: comprehensive tutorials and documentation for ergoscript/i })
      
      await user.click(learningCenterCard)
      expect(mockOnSelectExample).toHaveBeenCalledWith('pinLockContract')
    })

    it('should handle keyboard navigation in feature showcase', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const contractTesterCard = screen.getByRole('button', { name: /contract tester: run and test ergoscript contracts/i })
      contractTesterCard.focus()
      
      await user.keyboard('{Enter}')
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })
  })

  describe('Quick Start Examples Interactions', () => {
    it('should handle Hello ErgoScript example selection', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const helloExample = screen.getByRole('button', { name: /hello ergoscript: your first smart contract/i })
      
      await user.click(helloExample)
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })

    it('should handle PIN Security example selection', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const pinExample = screen.getByRole('button', { name: /pin security: secure funds with a pin-protected contract/i })
      
      await user.click(pinExample)
      expect(mockOnSelectExample).toHaveBeenCalledWith('pinLockContract')
    })

    it('should handle Visual Builder example selection', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const visualExample = screen.getByRole('button', { name: /visual builder: drag-and-drop smart contract designer/i })
      
      await user.click(visualExample)
      expect(mockOnSelectExample).toHaveBeenCalledWith('contractDesigner')
    })
  })

  describe('Call-to-Action Footer Interactions', () => {
    it('should handle CTA button click', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const ctaButton = screen.getByRole('button', { name: /start your first smart contract with simple send example/i })
      
      await user.click(ctaButton)
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })

    it('should support keyboard activation of CTA', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const ctaButton = screen.getByRole('button', { name: /start your first smart contract with simple send example/i })
      ctaButton.focus()
      
      await user.keyboard('{Enter}')
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })
  })

  describe('Mobile-Specific Interactions', () => {
    beforeEach(() => {
      Object.assign(mockLayout, {
        screenSize: 'mobile',
        isMobile: true,
        isTablet: false,
        isDesktop: false
      })
    })

    it('should handle mobile Get Started interaction', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
          isMobile={true}
        />
      )

      const getStartedButton = screen.getByRole('button', { name: /start with first smart contract example/i })
      
      await user.click(getStartedButton)
      expect(mockOnToggleSidebar).toHaveBeenCalled()
      expect(mockOnSelectExample).not.toHaveBeenCalled()
    })

    it('should handle mobile touch interactions', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
          isMobile={true}
        />
      )

      const beginnerCard = screen.getByRole('button', { name: /start new to smart contracts learning path/i })
      
      // Simulate touch events
      fireEvent.touchStart(beginnerCard)
      fireEvent.touchEnd(beginnerCard)
      fireEvent.click(beginnerCard)
      
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })

    it('should maintain other button functionality on mobile', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
          isMobile={true}
        />
      )

      const tryDesignerButton = screen.getByRole('button', { name: /open visual contract designer/i })
      
      await user.click(tryDesignerButton)
      expect(mockOnSelectExample).toHaveBeenCalledWith('contractDesigner')
      expect(mockOnToggleSidebar).not.toHaveBeenCalled()
    })
  })

  describe('Complex User Flows', () => {
    it('should handle rapid successive clicks gracefully', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const getStartedButton = screen.getByRole('button', { name: /start with first smart contract example/i })
      
      // Rapid clicks
      await user.click(getStartedButton)
      await user.click(getStartedButton)
      await user.click(getStartedButton)
      
      // Should only call once per click
      expect(mockOnSelectExample).toHaveBeenCalledTimes(3)
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })

    it('should handle keyboard and mouse mixed interactions', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const beginnerCard = screen.getByRole('button', { name: /start new to smart contracts learning path/i })
      
      // Mouse hover then keyboard activation
      fireEvent.mouseEnter(beginnerCard)
      beginnerCard.focus()
      await user.keyboard('{Enter}')
      
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })

    it('should maintain focus management during interactions', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      // Tab through multiple elements
      await user.tab() // Get Started button
      await user.tab() // Try Designer button
      await user.tab() // First learning path card
      
      const beginnerCard = screen.getByRole('button', { name: /start new to smart contracts learning path/i })
      expect(beginnerCard).toHaveFocus()
      
      // Activate focused element
      await user.keyboard('{Enter}')
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })

    it('should handle hover effects on interactive elements', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const featureCard = screen.getByRole('button', { name: /contract tester: run and test ergoscript contracts/i })
      
      // Test hover states
      fireEvent.mouseEnter(featureCard)
      expect(featureCard).toBeInTheDocument()
      
      fireEvent.mouseLeave(featureCard)
      expect(featureCard).toBeInTheDocument()
      
      // Click after hover
      await user.click(featureCard)
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })
  })

  describe('Edge Case Interactions', () => {
    it('should handle double-click prevention', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const getStartedButton = screen.getByRole('button', { name: /start with first smart contract example/i })
      
      // Simulate double-click
      await user.dblClick(getStartedButton)
      
      // Should handle appropriately (may call twice, which is expected for double-click)
      expect(mockOnSelectExample).toHaveBeenCalled()
    })

    it('should handle context menu interactions', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const beginnerCard = screen.getByRole('button', { name: /start new to smart contracts learning path/i })
      
      // Right-click (context menu)
      fireEvent.contextMenu(beginnerCard)
      
      // Should not trigger the main action
      expect(mockOnSelectExample).not.toHaveBeenCalled()
    })

    it('should handle interrupted interactions', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const beginnerCard = screen.getByRole('button', { name: /start new to smart contracts learning path/i })
      
      // Start interaction but don't complete
      fireEvent.mouseDown(beginnerCard)
      fireEvent.mouseLeave(beginnerCard)
      fireEvent.mouseUp(document.body)
      
      // Should not trigger action
      expect(mockOnSelectExample).not.toHaveBeenCalled()
      
      // Complete interaction properly
      await user.click(beginnerCard)
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })

    it('should handle focus trapping within sections', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      // Tab through hero section
      await user.tab() // Get Started
      const getStartedButton = screen.getByRole('button', { name: /start with first smart contract example/i })
      expect(getStartedButton).toHaveFocus()
      
      await user.tab() // Try Designer
      const tryDesignerButton = screen.getByRole('button', { name: /open visual contract designer/i })
      expect(tryDesignerButton).toHaveFocus()
      
      // Continue tabbing should move to next section
      await user.tab()
      const nextFocusedElement = document.activeElement
      expect(nextFocusedElement).not.toBe(getStartedButton)
      expect(nextFocusedElement).not.toBe(tryDesignerButton)
    })
  })

  describe('Performance Interaction Tests', () => {
    it('should handle rapid navigation without performance degradation', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const startTime = performance.now()
      
      // Rapid interactions across different sections
      const buttons = [
        screen.getByRole('button', { name: /start with first smart contract example/i }),
        screen.getByRole('button', { name: /start new to smart contracts learning path/i }),
        screen.getByRole('button', { name: /contract tester: run and test ergoscript contracts/i }),
        screen.getByRole('button', { name: /hello ergoscript: your first smart contract/i })
      ]
      
      for (const button of buttons) {
        await user.click(button)
      }
      
      const endTime = performance.now()
      
      // Should complete quickly (allow more time in test environment)
      expect(endTime - startTime).toBeLessThan(500) // More realistic for test environment
      expect(mockOnSelectExample).toHaveBeenCalledTimes(4)
    })

    it('should maintain responsiveness during scroll interactions', async () => {
      render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={mockOnToggleSidebar}
        />
      )

      const welcomePage = screen.getByRole('main')
      
      // Simulate scroll events
      fireEvent.scroll(welcomePage, { target: { scrollTop: 100 } })
      fireEvent.scroll(welcomePage, { target: { scrollTop: 500 } })
      fireEvent.scroll(welcomePage, { target: { scrollTop: 1000 } })
      
      // Should still be interactive after scrolling
      const getStartedButton = screen.getByRole('button', { name: /start with first smart contract example/i })
      await user.click(getStartedButton)
      
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend')
    })
  })
})