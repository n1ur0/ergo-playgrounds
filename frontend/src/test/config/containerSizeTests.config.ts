import { TestConfig } from './types'

/**
 * Configuration for container size validation tests
 * Defines expected dimensions and behavior for the new container size increases
 */
export const containerSizeTestConfig: TestConfig = {
  // Expected container dimensions after the improvements
  expectedDimensions: {
    desktop: {
      sidebar: { width: 340, previousWidth: 320, increase: 20 },
      header: { heightDeduction: 80, previousDeduction: 120, increase: 40 },
      contractTester: { heightDeduction: 120, previousDeduction: 200, increase: 80 },
      contractEducation: { heightDeduction: 180, previousDeduction: 300, increase: 120 },
      contractDesigner: {
        palette: { width: 360, previousWidth: 320, increase: 40 },
        sidePanel: { width: 380, previousWidth: 350, increase: 30 }
      }
    },
    tablet: {
      sidebar: { width: 280, minWidth: 280, maxWidth: 320 },
      header: { heightDeduction: 80 },
      contractTester: { heightDeduction: 120 },
      contractEducation: { heightDeduction: 160 }, // Optimized for tablet
      contractDesigner: {
        palette: { width: 320 },
        sidePanel: { width: 340 }
      }
    },
    mobile: {
      sidebar: { width: '100%', display: 'none' }, // Hidden on mobile
      header: { heightDeduction: 80 },
      contractTester: { heightDeduction: 80 }, // Optimized for mobile
      contractEducation: { heightDeduction: 80 },
      contractDesigner: {
        palette: { width: '100%', display: 'none' },
        sidePanel: { width: '100%', display: 'none' }
      }
    }
  },

  // Breakpoint definitions
  breakpoints: {
    mobile: { max: 480 },
    tablet: { min: 481, max: 768 },
    desktop: { min: 769, max: 1024 },
    large: { min: 1025, max: 1440 },
    ultraWide: { min: 1441 }
  },

  // Test viewports for comprehensive testing
  testViewports: [
    { name: 'mobile-small', width: 320, height: 568 },
    { name: 'mobile-standard', width: 375, height: 667 },
    { name: 'mobile-large', width: 414, height: 896 },
    { name: 'tablet-portrait', width: 768, height: 1024 },
    { name: 'tablet-landscape', width: 1024, height: 768 },
    { name: 'desktop-small', width: 1280, height: 720 },
    { name: 'desktop-standard', width: 1920, height: 1080 },
    { name: 'desktop-large', width: 2560, height: 1440 },
    { name: 'ultrawide', width: 3440, height: 1440 }
  ],

  // Performance thresholds
  performance: {
    maxLoadTime: 5000, // ms
    maxScrollTime: 1000, // ms
    maxMemoryIncrease: 50000000, // bytes (50MB)
    minFPS: 55, // frames per second
    maxLayoutShift: 0.1 // Cumulative Layout Shift
  },

  // Accessibility requirements
  accessibility: {
    minContrastRatio: 4.5,
    minTouchTargetSize: 44, // pixels
    maxTabIndex: 10,
    requiredAriaLabels: ['navigation', 'main', 'sidebar', 'content']
  },

  // Visual regression thresholds
  visualRegression: {
    threshold: 0.1, // 10% pixel difference allowed
    maxDiffPixels: 1000,
    animations: 'disabled' as const,
    mask: ['.timestamp', '.dynamic-content', '.animation']
  },

  // Component-specific test configurations
  components: {
    contractTester: {
      selectors: {
        container: '.contract-content',
        tabs: '.contract-tabs',
        header: '.contract-header',
        runButton: '.run-button'
      },
      expectedBehavior: {
        scrollable: true,
        maxHeight: 'calc(100vh - 120px)',
        overflow: 'auto'
      }
    },
    contractEducation: {
      selectors: {
        container: '.education-content',
        tabs: '.education-tabs',
        concepts: '.concepts-grid',
        quiz: '.quiz-container'
      },
      expectedBehavior: {
        scrollable: true,
        maxHeight: 'calc(100vh - 180px)',
        overflow: 'auto'
      }
    },
    contractDesigner: {
      selectors: {
        container: '.contract-designer',
        palette: '.component-palette-container',
        canvas: '.canvas-container',
        sidePanel: '.side-panel'
      },
      expectedBehavior: {
        layout: 'flex',
        paletteWidth: 360,
        sidePanelWidth: 380
      }
    },
    layout: {
      selectors: {
        main: '.layout',
        sidebar: '.sidebar',
        content: '.content',
        header: '.app-header'
      },
      expectedBehavior: {
        gridTemplateColumns: '340px 1fr',
        minHeight: 'calc(100vh - 80px)'
      }
    }
  },

  // Error scenarios to test
  errorScenarios: [
    {
      name: 'extremely-tall-content',
      description: 'Test with content exceeding 10x viewport height',
      setup: (page: any) => page.evaluate(() => {
        const content = document.querySelector('.content')
        if (content) {
          const tallDiv = document.createElement('div')
          tallDiv.style.height = '10000px'
          tallDiv.style.background = 'linear-gradient(red, blue)'
          content.appendChild(tallDiv)
        }
      })
    },
    {
      name: 'extremely-wide-content',
      description: 'Test with content exceeding viewport width',
      setup: (page: any) => page.evaluate(() => {
        const content = document.querySelector('.content')
        if (content) {
          const wideDiv = document.createElement('div')
          wideDiv.style.width = '5000px'
          wideDiv.style.height = '100px'
          wideDiv.style.background = 'linear-gradient(to right, red, blue)'
          content.appendChild(wideDiv)
        }
      })
    },
    {
      name: 'css-grid-unsupported',
      description: 'Test fallback when CSS Grid is not supported',
      setup: (page: any) => page.addStyleTag({
        content: `.layout { display: flex !important; grid-template-columns: none !important; }`
      })
    },
    {
      name: 'high-memory-usage',
      description: 'Test with many DOM elements',
      setup: (page: any) => page.evaluate(() => {
        const content = document.querySelector('.content')
        if (content) {
          for (let i = 0; i < 1000; i++) {
            const div = document.createElement('div')
            div.textContent = `Item ${i}`
            div.style.height = '50px'
            content.appendChild(div)
          }
        }
      })
    }
  ],

  // Validation rules
  validation: {
    layout: {
      // Ensure sidebar uses new width
      sidebarWidth: (measurements: any, breakpoint: string) => {
        const expected = containerSizeTestConfig.expectedDimensions[breakpoint as keyof typeof containerSizeTestConfig.expectedDimensions]?.sidebar?.width
        return expected ? measurements.sidebar.width === expected : true
      },
      
      // Ensure header deduction is reduced
      headerDeduction: (measurements: any, breakpoint: string) => {
        const expected = containerSizeTestConfig.expectedDimensions[breakpoint as keyof typeof containerSizeTestConfig.expectedDimensions]?.header?.heightDeduction
        return expected ? measurements.layout.height >= (measurements.viewport.height - expected) : true
      },
      
      // Ensure content containers use new height calculations
      containerHeight: (measurements: any, breakpoint: string, component: string) => {
        const expected = containerSizeTestConfig.expectedDimensions[breakpoint as keyof typeof containerSizeTestConfig.expectedDimensions]?.[component as keyof any]?.heightDeduction
        return expected ? measurements[component].maxHeight.includes(expected.toString()) : true
      }
    },
    
    responsive: {
      // Ensure breakpoints trigger correctly
      breakpointBehavior: (measurements: any, viewport: any) => {
        if (viewport.width <= 480) return measurements.breakpoint === 'mobile'
        if (viewport.width <= 768) return measurements.breakpoint === 'tablet'
        if (viewport.width <= 1024) return measurements.breakpoint === 'desktop'
        return measurements.breakpoint === 'large'
      },
      
      // Ensure content is accessible at all breakpoints
      contentAccessibility: (measurements: any) => {
        return measurements.content.visible && measurements.content.scrollable
      }
    },
    
    performance: {
      // Ensure reasonable performance with larger containers
      loadTime: (timing: any) => timing.loadTime < containerSizeTestConfig.performance.maxLoadTime,
      scrollPerformance: (timing: any) => timing.scrollTime < containerSizeTestConfig.performance.maxScrollTime,
      memoryUsage: (memory: any) => memory.increase < containerSizeTestConfig.performance.maxMemoryIncrease
    }
  },

  // Test data generators
  testData: {
    // Generate test content of various sizes
    generateContent: (type: 'small' | 'medium' | 'large' | 'extreme') => {
      const sizes = {
        small: { items: 10, itemHeight: 50 },
        medium: { items: 100, itemHeight: 50 },
        large: { items: 500, itemHeight: 50 },
        extreme: { items: 1000, itemHeight: 100 }
      }
      
      const config = sizes[type]
      return Array.from({ length: config.items }, (_, i) => ({
        id: i,
        content: `Test item ${i}`,
        height: config.itemHeight
      }))
    },
    
    // Generate test contracts
    generateContracts: (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: i,
        name: `Test Contract ${i}`,
        description: `Description for test contract ${i}`,
        difficulty: ['Beginner', 'Intermediate', 'Advanced'][i % 3],
        code: `// Test contract ${i}\nval output = OUTPUTS(0)\nval validOutput = output.value >= 1000L\nvalidOutput`
      }))
    }
  }
}

// Export helper functions
export const getExpectedDimensions = (breakpoint: string, component: string) => {
  return containerSizeTestConfig.expectedDimensions[breakpoint as keyof typeof containerSizeTestConfig.expectedDimensions]?.[component as keyof any]
}

export const validateContainerSize = (actual: number, expected: number, tolerance: number = 5) => {
  return Math.abs(actual - expected) <= tolerance
}

export const getBreakpointForViewport = (width: number) => {
  const { breakpoints } = containerSizeTestConfig
  
  if (width <= breakpoints.mobile.max) return 'mobile'
  if (width <= breakpoints.tablet.max) return 'tablet'
  if (width <= breakpoints.desktop.max) return 'desktop'
  if (width <= breakpoints.large.max) return 'large'
  return 'ultraWide'
}

export default containerSizeTestConfig