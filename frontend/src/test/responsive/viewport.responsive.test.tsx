import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import ContractEducation from '../../components/education/ContractEducation'

// Mock window dimensions helper
const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  
  // Trigger resize event
  fireEvent(window, new Event('resize'))
}

// Mock CSS custom properties for responsive breakpoints
const mockResponsiveCSS = (viewport: string) => {
  const responsiveValues = {
    mobile: {
      '--space-md': '0.5rem',
      '--space-lg': '1rem',
      '--text-sm': '0.75rem',
      '--text-base': '0.875rem'
    },
    tablet: {
      '--space-md': '0.75rem',
      '--space-lg': '1.5rem',
      '--text-sm': '0.875rem',
      '--text-base': '1rem'
    },
    desktop: {
      '--space-md': '1rem',
      '--space-lg': '2rem',
      '--text-sm': '1rem',
      '--text-base': '1.125rem'
    }
  }
  
  const values = responsiveValues[viewport as keyof typeof responsiveValues]
  
  const mockGetComputedStyle = vi.fn(() => ({
    getPropertyValue: vi.fn((prop: string) => values[prop as keyof typeof values] || ''),
  }))
  
  global.getComputedStyle = mockGetComputedStyle as any
}

describe('Responsive Design Tests - Learn Section Scrolling', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    
    // Reset mocks
    vi.clearAllMocks()
    
    // Default scroll properties
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      value: 1000,
    })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      writable: true,
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

  describe('Mobile Viewport (375px)', () => {
    beforeEach(() => {
      mockViewport(375, 667)
      mockResponsiveCSS('mobile')
    })

    it('should adapt scrolling container height for mobile', () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      expect(contentContainer).toBeInTheDocument()
      
      // Check mobile-specific max-height
      const styles = getComputedStyle(contentContainer)
      expect(styles.maxHeight).toMatch(/calc\(100vh - 250px\)/)
    })

    it('should enable touch scrolling on mobile devices', () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content')
      const styles = getComputedStyle(contentContainer!)
      
      // Check webkit touch scrolling
      expect(styles.WebkitOverflowScrolling).toBe('touch')
    })

    it('should handle mobile tab switching with scrolling', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      // Tabs should wrap on mobile
      const tabsContainer = document.querySelector('.education-tabs')
      const styles = getComputedStyle(tabsContainer!)
      
      expect(styles.flexWrap).toBe('wrap')
      
      const conceptsTab = screen.getByRole('button', { name: /key concepts/i })
      await user.click(conceptsTab)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      
      // Should still allow scrolling after tab switch
      fireEvent.scroll(contentContainer, { target: { scrollTop: 150 } })
      
      await waitFor(() => {
        expect(contentContainer.scrollTop).toBe(150)
      })
    })

    it('should adjust content padding for mobile', () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content')
      const styles = getComputedStyle(contentContainer!)
      
      // Mobile should have reduced padding
      expect(styles.padding).toBe('1rem')
      expect(styles.paddingBottom).toBe('2rem')
    })

    it('should handle mobile quiz scrolling', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const quizTab = screen.getByRole('button', { name: /quiz time/i })
      await user.click(quizTab)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      
      // Mobile quiz should be scrollable
      fireEvent.scroll(contentContainer, { target: { scrollTop: 200 } })
      
      await waitFor(() => {
        expect(contentContainer.scrollTop).toBe(200)
      })
      
      // Touch scrolling should be enabled
      const styles = getComputedStyle(contentContainer)
      expect(styles.WebkitOverflowScrolling).toBe('touch')
    })

    it('should maintain accessibility on mobile viewports', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      // Test keyboard navigation on mobile
      await user.tab()
      
      const firstTab = screen.getAllByRole('button')[0]
      expect(document.activeElement).toBe(firstTab)
      
      // Content should remain scrollable during keyboard navigation
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      fireEvent.scroll(contentContainer, { target: { scrollTop: 100 } })
      
      expect(contentContainer.scrollTop).toBe(100)
    })
  })

  describe('Tablet Viewport (768px)', () => {
    beforeEach(() => {
      mockViewport(768, 1024)
      mockResponsiveCSS('tablet')
    })

    it('should adapt container dimensions for tablet', () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      const styles = getComputedStyle(contentContainer)
      
      // Tablet should have intermediate max-height
      expect(styles.maxHeight).toMatch(/calc\(100vh - 250px\)/)
      expect(styles.padding).toBe('1rem')
    })

    it('should handle tablet orientation changes', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      
      // Portrait mode
      mockViewport(768, 1024)
      fireEvent.scroll(contentContainer, { target: { scrollTop: 200 } })
      
      // Landscape mode
      mockViewport(1024, 768)
      fireEvent(window, new Event('resize'))
      
      // Scrolling should still work after orientation change
      await waitFor(() => {
        expect(contentContainer.scrollTop).toBe(200)
      })
    })

    it('should maintain grid layouts on tablet', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const conceptsTab = screen.getByRole('button', { name: /key concepts/i })
      await user.click(conceptsTab)
      
      // Grid should remain functional
      const conceptsGrid = document.querySelector('.concepts-grid')
      expect(conceptsGrid).toBeInTheDocument()
      
      // Scrolling should work with grid layout
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      fireEvent.scroll(contentContainer, { target: { scrollTop: 150 } })
      
      expect(contentContainer.scrollTop).toBe(150)
    })

    it('should handle tablet touch interactions', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      
      // Simulate touch scrolling
      fireEvent.touchStart(contentContainer, {
        touches: [{ clientY: 200, clientX: 100 }]
      })
      
      fireEvent.touchMove(contentContainer, {
        touches: [{ clientY: 100, clientX: 100 }]
      })
      
      fireEvent.touchEnd(contentContainer)
      
      // Touch scrolling should be enabled
      const styles = getComputedStyle(contentContainer)
      expect(styles.WebkitOverflowScrolling).toBe('touch')
    })
  })

  describe('Desktop Viewport (1024px+)', () => {
    beforeEach(() => {
      mockViewport(1024, 768)
      mockResponsiveCSS('desktop')
    })

    it('should provide optimal scrolling experience on desktop', () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      const styles = getComputedStyle(contentContainer)
      
      // Desktop should have full padding and height
      expect(styles.maxHeight).toMatch(/calc\(100vh - 300px\)/)
      expect(styles.padding).toBe('1.5rem')
    })

    it('should display custom scrollbars on desktop', () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content')
      const styles = getComputedStyle(contentContainer!)
      
      // Custom scrollbar should be visible
      expect(styles.scrollbarWidth).toBe('thin')
    })

    it('should handle mouse wheel scrolling', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      
      // Simulate mouse wheel
      fireEvent.wheel(contentContainer, { deltaY: 100 })
      
      // Should support wheel scrolling
      expect(contentContainer).toBeInTheDocument()
    })

    it('should maintain performance with large content on desktop', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const conceptsTab = screen.getByRole('button', { name: /key concepts/i })
      await user.click(conceptsTab)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      
      const startTime = performance.now()
      
      // Rapid scrolling
      for (let i = 0; i < 20; i++) {
        fireEvent.scroll(contentContainer, { target: { scrollTop: i * 25 } })
      }
      
      const endTime = performance.now()
      
      // Should maintain good performance on desktop
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('Large Desktop Viewport (1440px+)', () => {
    beforeEach(() => {
      mockViewport(1440, 900)
      mockResponsiveCSS('desktop')
    })

    it('should optimize for large desktop displays', () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      const styles = getComputedStyle(contentContainer)
      
      // Should have maximum space utilization
      expect(styles.maxHeight).toMatch(/calc\(100vh - 300px\)/)
    })

    it('should handle wide screen content layout', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const overviewSection = document.querySelector('.overview-section')
      expect(overviewSection).toBeInTheDocument()
      
      // Grid layouts should expand appropriately
      const playersRulesGrid = document.querySelector('.players-rules-grid')
      const styles = getComputedStyle(playersRulesGrid!)
      
      expect(styles.gridTemplateColumns).toBe('1fr 1fr')
    })
  })

  describe('Ultra-wide Viewport (1920px+)', () => {
    beforeEach(() => {
      mockViewport(1920, 1080)
      mockResponsiveCSS('desktop')
    })

    it('should handle ultra-wide displays', () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content')
      expect(contentContainer).toBeInTheDocument()
      
      // Should maintain reasonable content width
      const styles = getComputedStyle(contentContainer!)
      expect(styles.maxHeight).toMatch(/calc\(100vh - 300px\)/)
    })

    it('should maintain scrolling performance on ultra-wide', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      
      // Test scrolling performance on ultra-wide
      const startTime = performance.now()
      
      fireEvent.scroll(contentContainer, { target: { scrollTop: 500 } })
      
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(50)
    })
  })

  describe('Viewport Transition Handling', () => {
    it('should handle smooth transitions between viewport sizes', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      
      // Start with desktop
      mockViewport(1024, 768)
      fireEvent.scroll(contentContainer, { target: { scrollTop: 300 } })
      
      // Transition to tablet
      mockViewport(768, 1024)
      fireEvent(window, new Event('resize'))
      
      // Should maintain scrollability
      await waitFor(() => {
        expect(contentContainer.scrollTop).toBe(300)
      })
      
      // Transition to mobile
      mockViewport(375, 667)
      fireEvent(window, new Event('resize'))
      
      // Should still be scrollable
      fireEvent.scroll(contentContainer, { target: { scrollTop: 200 } })
      expect(contentContainer.scrollTop).toBe(200)
    })

    it('should maintain content accessibility across viewport changes', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      // Test keyboard navigation across viewports
      await user.tab()
      
      const activeElement = document.activeElement
      
      // Change viewport
      mockViewport(375, 667)
      fireEvent(window, new Event('resize'))
      
      // Focus should be maintained
      expect(document.activeElement).toBe(activeElement)
    })

    it('should handle rapid viewport changes without breaking scroll', async () => {
      render(<ContractEducation selectedExample="simple-payment" />)
      
      const contentContainer = document.querySelector('.education-content') as HTMLElement
      
      const viewports = [
        [1920, 1080],
        [1024, 768],
        [768, 1024],
        [375, 667],
        [1440, 900]
      ]
      
      // Rapid viewport changes
      for (const [width, height] of viewports) {
        mockViewport(width, height)
        fireEvent(window, new Event('resize'))
        
        // Scrolling should work at each viewport
        fireEvent.scroll(contentContainer, { target: { scrollTop: 100 } })
        expect(contentContainer.scrollTop).toBe(100)
      }
    })
  })

  describe('Content Overflow Handling Across Viewports', () => {
    it('should handle content overflow appropriately on different viewport sizes', async () => {
      const viewports = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1024, height: 768, name: 'desktop' }
      ]
      
      for (const viewport of viewports) {
        mockViewport(viewport.width, viewport.height)
        
        render(<ContractEducation selectedExample="simple-payment" />)
        
        const contentContainer = document.querySelector('.education-content') as HTMLElement
        
        // Should enable scrolling when content overflows
        expect(contentContainer.scrollHeight).toBeGreaterThan(contentContainer.clientHeight)
        
        // Scrolling should work
        fireEvent.scroll(contentContainer, { target: { scrollTop: 150 } })
        expect(contentContainer.scrollTop).toBe(150)
        
        // Clean up
        document.body.innerHTML = ''
      }
    })

    it('should adapt scrollbar visibility across viewports', () => {
      const viewports = [375, 768, 1024, 1440]
      
      for (const width of viewports) {
        mockViewport(width, 800)
        
        render(<ContractEducation selectedExample="simple-payment" />)
        
        const contentContainer = document.querySelector('.education-content')
        const styles = getComputedStyle(contentContainer!)
        
        // Scrollbar should be configured for each viewport
        expect(styles.overflowY).toBe('auto')
        
        if (width <= 768) {
          // Mobile/tablet should have touch scrolling
          expect(styles.WebkitOverflowScrolling).toBe('touch')
        }
        
        // Clean up
        document.body.innerHTML = ''
      }
    })
  })
})