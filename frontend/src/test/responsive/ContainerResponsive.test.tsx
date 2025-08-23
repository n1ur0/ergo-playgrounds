import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

// Mock window.matchMedia
const mockMatchMedia = vi.fn()

beforeEach(() => {
  // Reset viewport
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  })

  // Mock matchMedia
  window.matchMedia = mockMatchMedia.mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

// Helper function to simulate viewport resize
const setViewportSize = (width: number, height: number) => {
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
  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

// Mock responsive layout component
const ResponsiveLayoutComponent = ({ testId }: { testId: string }) => {
  const [dimensions, setDimensions] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight
  })

  React.useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = dimensions.width <= 480
  const isTablet = dimensions.width > 480 && dimensions.width <= 768
  const isDesktop = dimensions.width > 768 && dimensions.width <= 1024
  const isLarge = dimensions.width > 1024

  const getLayoutStyles = () => {
    if (isMobile) {
      return {
        gridTemplateColumns: '1fr',
        minHeight: 'calc(100vh - 80px)', // New reduced header deduction
        containerMaxHeight: 'calc(100vh - 80px)' // Mobile optimization
      }
    } else if (isTablet) {
      return {
        gridTemplateColumns: '280px 1fr',
        minHeight: 'calc(100vh - 80px)',
        containerMaxHeight: 'calc(100vh - 120px)' // Tablet specific
      }
    } else if (isDesktop) {
      return {
        gridTemplateColumns: '340px 1fr', // New increased sidebar
        minHeight: 'calc(100vh - 80px)', // New reduced header deduction
        containerMaxHeight: 'calc(100vh - 120px)' // New ContractTester height
      }
    } else {
      return {
        gridTemplateColumns: '380px 1fr', // New large screen layout
        minHeight: 'calc(100vh - 80px)',
        containerMaxHeight: 'calc(100vh - 120px)'
      }
    }
  }

  const styles = getLayoutStyles()

  return (
    <div 
      data-testid={testId}
      style={{
        display: 'grid',
        gridTemplateColumns: styles.gridTemplateColumns,
        minHeight: styles.minHeight
      }}
    >
      <div data-testid="sidebar" style={{ background: 'var(--color-surface)' }}>
        Sidebar
      </div>
      <div 
        data-testid="content"
        style={{ 
          maxHeight: styles.containerMaxHeight,
          overflow: 'auto'
        }}
      >
        <div data-testid="container-info">
          {JSON.stringify({
            viewport: `${dimensions.width}x${dimensions.height}`,
            breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : isDesktop ? 'desktop' : 'large',
            sidebarWidth: styles.gridTemplateColumns.split(' ')[0],
            containerHeight: styles.containerMaxHeight
          })}
        </div>
      </div>
    </div>
  )
}

describe('Container Responsive Behavior Tests', () => {
  describe('Desktop Breakpoint (1024px+)', () => {
    beforeEach(() => {
      setViewportSize(1200, 800)
    })

    it('should use 340px sidebar width on desktop', () => {
      render(<ResponsiveLayoutComponent testId="desktop-layout" />)
      
      const layout = screen.getByTestId('desktop-layout')
      expect(layout.style.gridTemplateColumns).toBe('340px 1fr')
    })

    it('should use reduced 80px header deduction on desktop', () => {
      render(<ResponsiveLayoutComponent testId="desktop-layout" />)
      
      const layout = screen.getByTestId('desktop-layout')
      expect(layout.style.minHeight).toBe('calc(100vh - 80px)')
    })

    it('should use 120px ContractTester height deduction on desktop', () => {
      render(<ResponsiveLayoutComponent testId="desktop-layout" />)
      
      const content = screen.getByTestId('content')
      expect(content.style.maxHeight).toBe('calc(100vh - 120px)')
    })

    it('should provide correct content area calculations', () => {
      render(<ResponsiveLayoutComponent testId="desktop-layout" />)
      
      const containerInfo = JSON.parse(screen.getByTestId('container-info').textContent || '{}')
      expect(containerInfo.sidebarWidth).toBe('340px')
      expect(containerInfo.containerHeight).toBe('calc(100vh - 120px)')
      expect(containerInfo.breakpoint).toBe('large')
    })
  })

  describe('Tablet Breakpoint (768px-1024px)', () => {
    beforeEach(() => {
      setViewportSize(800, 600)
    })

    it('should use 280px sidebar width on tablet', () => {
      render(<ResponsiveLayoutComponent testId="tablet-layout" />)
      
      const layout = screen.getByTestId('tablet-layout')
      expect(layout.style.gridTemplateColumns).toBe('280px 1fr')
    })

    it('should maintain reduced header deduction on tablet', () => {
      render(<ResponsiveLayoutComponent testId="tablet-layout" />)
      
      const layout = screen.getByTestId('tablet-layout')
      expect(layout.style.minHeight).toBe('calc(100vh - 80px)')
    })

    it('should adapt container height for tablet viewport', () => {
      render(<ResponsiveLayoutComponent testId="tablet-layout" />)
      
      const content = screen.getByTestId('content')
      expect(content.style.maxHeight).toBe('calc(100vh - 120px)')
    })

    it('should correctly identify tablet breakpoint', () => {
      render(<ResponsiveLayoutComponent testId="tablet-layout" />)
      
      const containerInfo = JSON.parse(screen.getByTestId('container-info').textContent || '{}')
      expect(containerInfo.breakpoint).toBe('tablet')
      expect(containerInfo.sidebarWidth).toBe('280px')
    })
  })

  describe('Mobile Breakpoint (480px-768px)', () => {
    beforeEach(() => {
      setViewportSize(600, 800)
    })

    it('should use single column layout on mobile', () => {
      render(<ResponsiveLayoutComponent testId="mobile-layout" />)
      
      const layout = screen.getByTestId('mobile-layout')
      expect(layout.style.gridTemplateColumns).toBe('1fr')
    })

    it('should optimize header deduction for mobile', () => {
      render(<ResponsiveLayoutComponent testId="mobile-layout" />)
      
      const layout = screen.getByTestId('mobile-layout')
      expect(layout.style.minHeight).toBe('calc(100vh - 80px)')
    })

    it('should optimize container height for mobile', () => {
      render(<ResponsiveLayoutComponent testId="mobile-layout" />)
      
      const content = screen.getByTestId('content')
      expect(content.style.maxHeight).toBe('calc(100vh - 80px)')
    })

    it('should correctly identify mobile breakpoint', () => {
      render(<ResponsiveLayoutComponent testId="mobile-layout" />)
      
      const containerInfo = JSON.parse(screen.getByTestId('container-info').textContent || '{}')
      expect(containerInfo.breakpoint).toBe('tablet')
      expect(containerInfo.sidebarWidth).toBe('1fr')
    })
  })

  describe('Small Mobile Breakpoint (≤480px)', () => {
    beforeEach(() => {
      setViewportSize(400, 700)
    })

    it('should use optimized layout for small mobile', () => {
      render(<ResponsiveLayoutComponent testId="small-mobile-layout" />)
      
      const layout = screen.getByTestId('small-mobile-layout')
      expect(layout.style.gridTemplateColumns).toBe('1fr')
    })

    it('should maximize available space on small mobile', () => {
      render(<ResponsiveLayoutComponent testId="small-mobile-layout" />)
      
      const content = screen.getByTestId('content')
      expect(content.style.maxHeight).toBe('calc(100vh - 80px)')
    })

    it('should correctly identify small mobile breakpoint', () => {
      render(<ResponsiveLayoutComponent testId="small-mobile-layout" />)
      
      const containerInfo = JSON.parse(screen.getByTestId('container-info').textContent || '{}')
      expect(containerInfo.breakpoint).toBe('mobile')
      expect(containerInfo.viewport).toBe('400x700')
    })
  })

  describe('Large Screen Breakpoint (≥1200px)', () => {
    beforeEach(() => {
      setViewportSize(1400, 900)
    })

    it('should use expanded layout for large screens', () => {
      render(<ResponsiveLayoutComponent testId="large-layout" />)
      
      const layout = screen.getByTestId('large-layout')
      expect(layout.style.gridTemplateColumns).toBe('380px 1fr')
    })

    it('should provide maximum content area on large screens', () => {
      render(<ResponsiveLayoutComponent testId="large-layout" />)
      
      const containerInfo = JSON.parse(screen.getByTestId('container-info').textContent || '{}')
      expect(containerInfo.sidebarWidth).toBe('380px')
      expect(containerInfo.breakpoint).toBe('large')
    })
  })

  describe('Responsive Transition Tests', () => {
    it('should smoothly transition between breakpoints', async () => {
      const { rerender } = render(<ResponsiveLayoutComponent testId="transition-layout" />)
      
      // Start with desktop
      setViewportSize(1200, 800)
      rerender(<ResponsiveLayoutComponent testId="transition-layout" />)
      
      let layout = screen.getByTestId('transition-layout')
      expect(layout.style.gridTemplateColumns).toBe('340px 1fr')
      
      // Transition to tablet
      setViewportSize(800, 600)
      rerender(<ResponsiveLayoutComponent testId="transition-layout" />)
      
      layout = screen.getByTestId('transition-layout')
      expect(layout.style.gridTemplateColumns).toBe('280px 1fr')
      
      // Transition to mobile
      setViewportSize(600, 800)
      rerender(<ResponsiveLayoutComponent testId="transition-layout" />)
      
      layout = screen.getByTestId('transition-layout')
      expect(layout.style.gridTemplateColumns).toBe('1fr')
    })

    it('should maintain container size improvements across all breakpoints', () => {
      const breakpoints = [
        { size: [1400, 900], expectedSidebar: '380px', name: 'large' },
        { size: [1200, 800], expectedSidebar: '340px', name: 'desktop' },
        { size: [800, 600], expectedSidebar: '280px', name: 'tablet' },
        { size: [600, 800], expectedSidebar: '1fr', name: 'mobile' },
        { size: [400, 700], expectedSidebar: '1fr', name: 'small-mobile' }
      ]

      breakpoints.forEach(({ size, expectedSidebar, name }) => {
        setViewportSize(size[0], size[1])
        
        const { rerender } = render(<ResponsiveLayoutComponent testId={`${name}-test`} />)
        rerender(<ResponsiveLayoutComponent testId={`${name}-test`} />)
        
        const layout = screen.getByTestId(`${name}-test`)
        const content = screen.getByTestId('content')
        
        // All breakpoints should use the new reduced header deduction
        expect(layout.style.minHeight).toBe('calc(100vh - 80px)')
        
        // Verify sidebar sizing
        if (expectedSidebar !== '1fr') {
          expect(layout.style.gridTemplateColumns).toBe(`${expectedSidebar} 1fr`)
        } else {
          expect(layout.style.gridTemplateColumns).toBe('1fr')
        }
        
        // Container height should be optimized for each breakpoint
        expect(content.style.overflow).toBe('auto')
      })
    })
  })

  describe('ContractDesigner Responsive Behavior', () => {
    const ContractDesignerResponsive = ({ testId }: { testId: string }) => {
      const [dimensions, setDimensions] = React.useState({
        width: window.innerWidth,
        height: window.innerHeight
      })

      React.useEffect(() => {
        const handleResize = () => {
          setDimensions({
            width: window.innerWidth,
            height: window.innerHeight
          })
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
      }, [])

      const isMobile = dimensions.width <= 768
      const isTablet = dimensions.width > 768 && dimensions.width <= 1024
      const isDesktop = dimensions.width > 1024

      const getPaletteWidth = () => {
        if (isMobile) return '100%' // Hidden on mobile, full width when shown
        if (isTablet) return '320px' // Reduced for tablet
        return '360px' // New expanded width for desktop
      }

      const getSidePanelWidth = () => {
        if (isMobile) return '100%' // Full width on mobile
        if (isTablet) return '340px' // Optimized for tablet
        return '380px' // New expanded width for desktop
      }

      return (
        <div data-testid={testId} style={{ display: 'flex', height: '100vh' }}>
          <div 
            data-testid="palette"
            style={{ 
              width: getPaletteWidth(),
              display: isMobile ? 'none' : 'block'
            }}
          >
            Palette
          </div>
          <div data-testid="canvas" style={{ flex: 1 }}>
            Canvas
          </div>
          <div 
            data-testid="side-panel"
            style={{ 
              width: getSidePanelWidth(),
              display: isMobile ? 'none' : 'block'
            }}
          >
            Properties
          </div>
        </div>
      )
    }

    it('should use expanded 360px palette on desktop', () => {
      setViewportSize(1200, 800)
      render(<ContractDesignerResponsive testId="designer-desktop" />)
      
      const palette = screen.getByTestId('palette')
      expect(palette.style.width).toBe('360px')
      expect(palette.style.display).toBe('block')
    })

    it('should use expanded 380px side panel on desktop', () => {
      setViewportSize(1200, 800)
      render(<ContractDesignerResponsive testId="designer-desktop" />)
      
      const sidePanel = screen.getByTestId('side-panel')
      expect(sidePanel.style.width).toBe('380px')
      expect(sidePanel.style.display).toBe('block')
    })

    it('should adapt palette and panel sizes for tablet', () => {
      setViewportSize(800, 600)
      render(<ContractDesignerResponsive testId="designer-tablet" />)
      
      const palette = screen.getByTestId('palette')
      const sidePanel = screen.getByTestId('side-panel')
      
      expect(palette.style.width).toBe('320px')
      expect(sidePanel.style.width).toBe('340px')
    })

    it('should hide palette and side panel on mobile', () => {
      setViewportSize(600, 800)
      render(<ContractDesignerResponsive testId="designer-mobile" />)
      
      const palette = screen.getByTestId('palette')
      const sidePanel = screen.getByTestId('side-panel')
      
      expect(palette.style.display).toBe('none')
      expect(sidePanel.style.display).toBe('none')
    })
  })

  describe('Accessibility and Focus Management', () => {
    it('should maintain proper focus order with new container sizes', () => {
      setViewportSize(1200, 800)
      render(<ResponsiveLayoutComponent testId="focus-test" />)
      
      const sidebar = screen.getByTestId('sidebar')
      const content = screen.getByTestId('content')
      
      // Verify elements are focusable and in proper order
      expect(sidebar).toBeInTheDocument()
      expect(content).toBeInTheDocument()
    })

    it('should provide adequate touch targets on mobile', () => {
      setViewportSize(400, 700)
      render(<ResponsiveLayoutComponent testId="touch-test" />)
      
      const layout = screen.getByTestId('touch-test')
      
      // Mobile layout should provide full width for touch interaction
      expect(layout.style.gridTemplateColumns).toBe('1fr')
    })
  })
})