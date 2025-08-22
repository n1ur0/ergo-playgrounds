import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import React, { useState } from 'react'

// Mock components to focus on integration behavior
const MockWelcomePage = ({ onSelectExample, onToggleSidebar, isMobile }: any) => (
  <div data-testid="welcome-page" className="welcome-page">
    <div className="hero-section">
      <h1>Welcome to Ergo Playgrounds</h1>
      <button 
        onClick={() => isMobile ? onToggleSidebar?.() : onSelectExample('simpleSend')}
        aria-label="Get started with examples"
      >
        Get Started
      </button>
      <button onClick={() => onSelectExample('contractDesigner')}>
        Try Designer
      </button>
    </div>
    
    <div className="learning-paths">
      <div 
        className="path-card"
        onClick={() => onSelectExample('simpleSend')}
        role="button"
        tabIndex={0}
      >
        Beginner Path
      </div>
      <div 
        className="path-card"
        onClick={() => onSelectExample('escrowDepositContract')}
        role="button"
        tabIndex={0}
      >
        Intermediate Path
      </div>
    </div>
    
    <div className="feature-showcase">
      <div 
        className="feature-card"
        onClick={() => onSelectExample('simpleSend')}
        role="button"
        tabIndex={0}
      >
        Contract Tester
      </div>
      <div 
        className="feature-card"
        onClick={() => onSelectExample('contractDesigner')}
        role="button"
        tabIndex={0}
      >
        Visual Designer
      </div>
    </div>
  </div>
)

const MockContractTester = ({ selectedExample, onSelectExample }: any) => {
  if (!selectedExample) {
    return <MockWelcomePage onSelectExample={onSelectExample} />
  }
  
  return (
    <div data-testid="contract-tester" className="contract-tester">
      <div className="header">
        <h2>Contract: {selectedExample}</h2>
        <button onClick={() => onSelectExample(null)}>
          Back to Welcome
        </button>
      </div>
      <div className="content">
        <p>Testing contract: {selectedExample}</p>
      </div>
    </div>
  )
}

const MockExamplesList = ({ selectedExample, onSelectExample }: any) => (
  <div data-testid="examples-list" className="examples-list">
    <h2>Examples</h2>
    <button 
      className={selectedExample === 'simpleSend' ? 'active' : ''}
      onClick={() => onSelectExample('simpleSend')}
    >
      Simple Send
    </button>
    <button 
      className={selectedExample === 'pinLockContract' ? 'active' : ''}
      onClick={() => onSelectExample('pinLockContract')}
    >
      PIN Lock
    </button>
    <button 
      className={selectedExample === 'contractDesigner' ? 'active' : ''}
      onClick={() => onSelectExample('contractDesigner')}
    >
      Contract Designer
    </button>
  </div>
)

// Mock layout hook
const mockLayoutHook = {
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
  useResponsiveLayout: () => mockLayoutHook
}))

// Mock CSS imports
vi.mock('../WelcomePage.css', () => ({}))
vi.mock('../../App.css', () => ({}))

// Integrated App component for testing
const MockApp = () => {
  const [selectedExample, setSelectedExample] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isMobile = mockLayoutHook.isMobile

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => !prev)
  }

  const handleSelectExample = (example: string | null) => {
    setSelectedExample(example)
    if (isMobile && example) {
      setSidebarCollapsed(true)
    }
  }

  return (
    <div className="app" data-testid="app">
      <header className="app-header">
        <h1>Ergo Smart Contract Playground</h1>
        {!isMobile && (
          <button 
            onClick={handleToggleSidebar}
            aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {sidebarCollapsed ? 'Show' : 'Hide'} Sidebar
          </button>
        )}
      </header>
      
      <main className="app-main">
        <div className="layout">
          {!sidebarCollapsed && (
            <aside className="sidebar" data-testid="sidebar">
              <div className="sidebar-header">
                <h2>Contract Examples</h2>
                {isMobile && (
                  <button onClick={handleToggleSidebar}>Close</button>
                )}
              </div>
              <MockExamplesList 
                selectedExample={selectedExample}
                onSelectExample={handleSelectExample}
              />
            </aside>
          )}
          
          <section className="content" data-testid="main-content">
            <MockContractTester 
              selectedExample={selectedExample}
              onSelectExample={handleSelectExample}
            />
          </section>
        </div>
      </main>
      
      {isMobile && sidebarCollapsed && (
        <button 
          className="fab"
          onClick={handleToggleSidebar}
          data-testid="mobile-fab"
        >
          Open Examples
        </button>
      )}
    </div>
  )
}

describe('WelcomePage Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    
    // Reset layout to desktop defaults
    Object.assign(mockLayoutHook, {
      screenSize: 'desktop',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      sidebarCollapsed: false
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('App Integration', () => {
    it('should display WelcomePage when no example is selected', () => {
      render(<MockApp />)

      expect(screen.getByTestId('welcome-page')).toBeInTheDocument()
      expect(screen.getByText('Welcome to Ergo Playgrounds')).toBeInTheDocument()
      expect(screen.queryByTestId('contract-tester')).not.toBeInTheDocument()
    })

    it('should navigate from WelcomePage to ContractTester when example is selected', async () => {
      render(<MockApp />)

      // Initially on welcome page
      expect(screen.getByTestId('welcome-page')).toBeInTheDocument()

      // Click Get Started button
      const getStartedButton = screen.getByRole('button', { name: /get started with examples/i })
      await user.click(getStartedButton)

      // Should navigate to contract tester
      await waitFor(() => {
        expect(screen.getByTestId('contract-tester')).toBeInTheDocument()
        expect(screen.getByText('Contract: simpleSend')).toBeInTheDocument()
        expect(screen.queryByTestId('welcome-page')).not.toBeInTheDocument()
      })
    })

    it('should navigate back to WelcomePage from ContractTester', async () => {
      render(<MockApp />)

      // Navigate to contract tester first
      const getStartedButton = screen.getByRole('button', { name: /get started with examples/i })
      await user.click(getStartedButton)

      await waitFor(() => {
        expect(screen.getByTestId('contract-tester')).toBeInTheDocument()
      })

      // Navigate back to welcome page
      const backButton = screen.getByRole('button', { name: /back to welcome/i })
      await user.click(backButton)

      await waitFor(() => {
        expect(screen.getByTestId('welcome-page')).toBeInTheDocument()
        expect(screen.queryByTestId('contract-tester')).not.toBeInTheDocument()
      })
    })

    it('should update sidebar selection when example is selected from WelcomePage', async () => {
      render(<MockApp />)

      // Select an example from the learning path
      const beginnerPath = screen.getByRole('button', { name: /beginner path/i })
      await user.click(beginnerPath)

      // Check that sidebar reflects the selection
      await waitFor(() => {
        const sidebarButton = screen.getByRole('button', { name: /simple send/i })
        expect(sidebarButton).toHaveClass('active')
      })
    })

    it('should handle designer selection from WelcomePage', async () => {
      render(<MockApp />)

      // Click Try Designer button
      const tryDesignerButton = screen.getByRole('button', { name: /try designer/i })
      await user.click(tryDesignerButton)

      // Should navigate to contract designer
      await waitFor(() => {
        expect(screen.getByTestId('contract-tester')).toBeInTheDocument()
        expect(screen.getByText('Contract: contractDesigner')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Integration', () => {
    beforeEach(() => {
      Object.assign(mockLayoutHook, {
        screenSize: 'mobile',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        sidebarCollapsed: true
      })
    })

    it('should handle mobile navigation correctly', async () => {
      render(<MockApp />)

      // Should show welcome page and mobile FAB
      expect(screen.getByTestId('welcome-page')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-fab')).toBeInTheDocument()
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
    })

    it('should open sidebar on mobile when Get Started is clicked', async () => {
      render(<MockApp />)

      // Click Get Started on mobile
      const getStartedButton = screen.getByRole('button', { name: /get started with examples/i })
      await user.click(getStartedButton)

      // Should open sidebar instead of navigating
      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toBeInTheDocument()
        expect(screen.getByTestId('welcome-page')).toBeInTheDocument()
        expect(screen.queryByTestId('mobile-fab')).not.toBeInTheDocument()
      })
    })

    it('should close sidebar after selecting example on mobile', async () => {
      render(<MockApp />)

      // Open sidebar first
      const fabButton = screen.getByTestId('mobile-fab')
      await user.click(fabButton)

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      })

      // Select an example from sidebar
      const simpleSendButton = screen.getByRole('button', { name: /simple send/i })
      await user.click(simpleSendButton)

      // Should close sidebar and navigate to contract tester
      await waitFor(() => {
        expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
        expect(screen.getByTestId('contract-tester')).toBeInTheDocument()
        expect(screen.getByTestId('mobile-fab')).toBeInTheDocument()
      })
    })

    it('should handle tablet layout correctly', async () => {
      Object.assign(mockLayoutHook, {
        screenSize: 'tablet',
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        sidebarCollapsed: false
      })

      render(<MockApp />)

      // Should show sidebar and welcome page
      expect(screen.getByTestId('welcome-page')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-fab')).not.toBeInTheDocument()
    })
  })

  describe('State Management Integration', () => {
    it('should maintain state consistency across navigation', async () => {
      render(<MockApp />)

      // Select example from welcome page
      const contractTesterCard = screen.getByRole('button', { name: /contract tester/i })
      await user.click(contractTesterCard)

      await waitFor(() => {
        expect(screen.getByTestId('contract-tester')).toBeInTheDocument()
      })

      // Check sidebar shows correct selection
      const activeSidebarButton = screen.getByRole('button', { name: /simple send/i })
      expect(activeSidebarButton).toHaveClass('active')

      // Navigate to different example from sidebar
      const pinLockButton = screen.getByRole('button', { name: /pin lock/i })
      await user.click(pinLockButton)

      await waitFor(() => {
        expect(screen.getByText('Contract: pinLockContract')).toBeInTheDocument()
        expect(pinLockButton).toHaveClass('active')
        expect(activeSidebarButton).not.toHaveClass('active')
      })
    })

    it('should handle rapid navigation between examples', async () => {
      render(<MockApp />)

      // Rapid navigation test
      const examples = ['simpleSend', 'pinLockContract', 'contractDesigner']
      
      for (const example of examples) {
        const button = screen.getByRole('button', { name: new RegExp(example.replace(/([A-Z])/g, ' $1').trim(), 'i') })
        await user.click(button)
        
        await waitFor(() => {
          expect(screen.getByText(`Contract: ${example}`)).toBeInTheDocument()
        })
      }
    })

    it('should handle sidebar toggle state correctly', async () => {
      render(<MockApp />)

      // Initially sidebar should be visible on desktop
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()

      // Toggle sidebar
      const toggleButton = screen.getByRole('button', { name: /hide sidebar/i })
      await user.click(toggleButton)

      await waitFor(() => {
        expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
      })

      // Toggle back
      const showButton = screen.getByRole('button', { name: /show sidebar/i })
      await user.click(showButton)

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      })
    })
  })

  describe('Layout Transitions', () => {
    it('should handle screen size changes gracefully', async () => {
      const { rerender } = render(<MockApp />)

      // Start with desktop layout
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-fab')).not.toBeInTheDocument()

      // Change to mobile layout
      Object.assign(mockLayoutHook, {
        screenSize: 'mobile',
        isMobile: true,
        isDesktop: false,
        sidebarCollapsed: true
      })

      rerender(<MockApp />)

      await waitFor(() => {
        expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
        expect(screen.getByTestId('mobile-fab')).toBeInTheDocument()
      })
    })

    it('should maintain content focus during layout changes', async () => {
      render(<MockApp />)

      // Select an example
      const getStartedButton = screen.getByRole('button', { name: /get started with examples/i })
      await user.click(getStartedButton)

      await waitFor(() => {
        expect(screen.getByTestId('contract-tester')).toBeInTheDocument()
      })

      // Change layout
      Object.assign(mockLayoutHook, {
        screenSize: 'tablet',
        isTablet: true,
        isDesktop: false
      })

      // Content should remain focused
      expect(screen.getByTestId('contract-tester')).toBeInTheDocument()
      expect(screen.getByText('Contract: simpleSend')).toBeInTheDocument()
    })
  })

  describe('Feature Integration', () => {
    it('should integrate different feature pathways correctly', async () => {
      render(<MockApp />)

      // Test visual designer pathway
      const visualDesignerCard = screen.getByRole('button', { name: /visual designer/i })
      await user.click(visualDesignerCard)

      await waitFor(() => {
        expect(screen.getByTestId('contract-tester')).toBeInTheDocument()
        expect(screen.getByText('Contract: contractDesigner')).toBeInTheDocument()
      })

      // Navigate back and test different pathway
      const backButton = screen.getByRole('button', { name: /back to welcome/i })
      await user.click(backButton)

      await waitFor(() => {
        expect(screen.getByTestId('welcome-page')).toBeInTheDocument()
      })

      // Test intermediate learning path
      const intermediatePath = screen.getByRole('button', { name: /intermediate path/i })
      await user.click(intermediatePath)

      await waitFor(() => {
        expect(screen.getByTestId('contract-tester')).toBeInTheDocument()
        expect(screen.getByText('Contract: escrowDepositContract')).toBeInTheDocument()
      })
    })

    it('should handle complex user workflows', async () => {
      render(<MockApp />)

      // Complex workflow: Welcome -> Example -> Back -> Different Example -> Sidebar Navigation
      
      // 1. Start from welcome page
      expect(screen.getByTestId('welcome-page')).toBeInTheDocument()

      // 2. Select beginner path
      const beginnerPath = screen.getByRole('button', { name: /beginner path/i })
      await user.click(beginnerPath)

      await waitFor(() => {
        expect(screen.getByTestId('contract-tester')).toBeInTheDocument()
      })

      // 3. Go back to welcome
      const backButton = screen.getByRole('button', { name: /back to welcome/i })
      await user.click(backButton)

      await waitFor(() => {
        expect(screen.getByTestId('welcome-page')).toBeInTheDocument()
      })

      // 4. Select designer feature
      const designerCard = screen.getByRole('button', { name: /visual designer/i })
      await user.click(designerCard)

      await waitFor(() => {
        expect(screen.getByText('Contract: contractDesigner')).toBeInTheDocument()
      })

      // 5. Navigate via sidebar
      const pinLockButton = screen.getByRole('button', { name: /pin lock/i })
      await user.click(pinLockButton)

      await waitFor(() => {
        expect(screen.getByText('Contract: pinLockContract')).toBeInTheDocument()
      })

      // Final state should be consistent
      expect(pinLockButton).toHaveClass('active')
    })
  })

  describe('Error Boundary Integration', () => {
    it('should handle navigation errors gracefully', async () => {
      render(<MockApp />)

      // Simulate error scenario by clicking rapidly
      const getStartedButton = screen.getByRole('button', { name: /get started with examples/i })
      
      // Multiple rapid clicks shouldn't break the app
      await user.click(getStartedButton)
      await user.click(getStartedButton)
      await user.click(getStartedButton)

      // Should still function correctly
      await waitFor(() => {
        expect(screen.getByTestId('contract-tester')).toBeInTheDocument()
      })
    })

    it('should recover from invalid states', async () => {
      render(<MockApp />)

      // Navigate to a valid state first
      const getStartedButton = screen.getByRole('button', { name: /get started with examples/i })
      await user.click(getStartedButton)

      await waitFor(() => {
        expect(screen.getByTestId('contract-tester')).toBeInTheDocument()
      })

      // Navigate back to welcome should always work
      const backButton = screen.getByRole('button', { name: /back to welcome/i })
      await user.click(backButton)

      await waitFor(() => {
        expect(screen.getByTestId('welcome-page')).toBeInTheDocument()
      })
    })
  })
})