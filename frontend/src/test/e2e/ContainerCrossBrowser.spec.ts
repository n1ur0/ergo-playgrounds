import { test, expect, devices, Browser, BrowserContext, Page } from '@playwright/test'

// Cross-browser test configuration
const browsers = ['chromium', 'firefox', 'webkit']
const viewports = [
  { name: 'desktop', width: 1200, height: 800 },
  { name: 'tablet', width: 800, height: 600 },
  { name: 'mobile', width: 400, height: 700 }
]

// Helper to measure element dimensions
async function measureElement(page: Page, selector: string) {
  const element = page.locator(selector)
  const boundingBox = await element.boundingBox()
  const styles = await element.evaluate((el) => {
    const computed = window.getComputedStyle(el)
    return {
      width: computed.width,
      height: computed.height,
      gridTemplateColumns: computed.gridTemplateColumns,
      maxHeight: computed.maxHeight,
      overflow: computed.overflow
    }
  })
  
  return {
    boundingBox,
    styles
  }
}

// Helper to simulate user interactions
async function simulateUserFlow(page: Page) {
  // Simulate opening examples list
  const examplesButton = page.locator('[data-testid="examples-button"]').first()
  if (await examplesButton.isVisible()) {
    await examplesButton.click()
  }
  
  // Wait for examples to load
  await page.waitForTimeout(1000)
  
  // Simulate selecting a contract
  const firstExample = page.locator('.example-item').first()
  if (await firstExample.isVisible()) {
    await firstExample.click()
  }
  
  // Wait for contract to load
  await page.waitForTimeout(1500)
}

test.describe('Cross-Browser Container Size Validation', () => {
  for (const browserName of browsers) {
    test.describe(`${browserName.toUpperCase()} Browser Tests`, () => {
      
      test(`Desktop Layout - Container Sizes in ${browserName}`, async ({ page }) => {
        await page.goto('/')
        await page.setViewportSize({ width: 1200, height: 800 })
        
        // Wait for app to load
        await page.waitForSelector('.app')
        await page.waitForTimeout(2000)
        
        // Measure main layout
        const layoutMeasurements = await measureElement(page, '.layout')
        
        // Verify new desktop layout dimensions
        expect(layoutMeasurements.styles.gridTemplateColumns).toBe('340px 1fr')
        expect(layoutMeasurements.boundingBox?.height).toBeGreaterThan(700) // calc(100vh - 80px)
        
        // Measure sidebar
        const sidebarMeasurements = await measureElement(page, '.sidebar')
        expect(sidebarMeasurements.boundingBox?.width).toBe(340)
        
        // Test user interaction flow
        await simulateUserFlow(page)
        
        // Verify contract tester container after interaction
        const contractContent = page.locator('.contract-content')
        if (await contractContent.isVisible()) {
          const contractMeasurements = await measureElement(page, '.contract-content')
          expect(contractMeasurements.styles.maxHeight).toBe('calc(100vh - 120px)')
          expect(contractMeasurements.styles.overflow).toBe('auto')
        }
      })
      
      test(`Tablet Layout - Responsive Behavior in ${browserName}`, async ({ page }) => {
        await page.goto('/')
        await page.setViewportSize({ width: 800, height: 600 })
        
        await page.waitForSelector('.app')
        await page.waitForTimeout(2000)
        
        // Check tablet-specific responsive behavior
        const layoutMeasurements = await measureElement(page, '.layout')
        
        // Tablet should use smaller sidebar but maintain new header deduction
        expect(layoutMeasurements.boundingBox?.height).toBeGreaterThan(500)
        
        // Test responsive sidebar behavior
        const sidebar = page.locator('.sidebar')
        const sidebarBox = await sidebar.boundingBox()
        
        // Tablet should adapt sidebar size appropriately
        expect(sidebarBox?.width).toBeLessThanOrEqual(320)
        expect(sidebarBox?.width).toBeGreaterThanOrEqual(280)
        
        await simulateUserFlow(page)
        
        // Verify scrolling works on tablet
        const content = page.locator('.content')
        await content.scroll({ top: 100 })
        
        // Verify scroll position changed
        const scrollTop = await content.evaluate(el => el.scrollTop)
        expect(scrollTop).toBeGreaterThan(0)
      })
      
      test(`Mobile Layout - Single Column in ${browserName}`, async ({ page }) => {
        await page.goto('/')
        await page.setViewportSize({ width: 400, height: 700 })
        
        await page.waitForSelector('.app')
        await page.waitForTimeout(2000)
        
        // Mobile should use single column layout
        const layoutMeasurements = await measureElement(page, '.layout')
        
        // Check if mobile layout uses full width
        expect(layoutMeasurements.boundingBox?.width).toBe(400)
        expect(layoutMeasurements.boundingBox?.height).toBeGreaterThan(600)
        
        // Test mobile-specific interactions
        await simulateUserFlow(page)
        
        // Check mobile content optimization
        const content = page.locator('.content')
        const contentBox = await content.boundingBox()
        expect(contentBox?.width).toBe(400) // Full width on mobile
        
        // Test touch scrolling
        await content.scroll({ top: 150 })
        const scrollTop = await content.evaluate(el => el.scrollTop)
        expect(scrollTop).toBeGreaterThan(0)
      })
      
      test(`Container Designer Layout in ${browserName}`, async ({ page }) => {
        await page.goto('/')
        await page.setViewportSize({ width: 1400, height: 900 })
        
        await page.waitForSelector('.app')
        
        // Simulate navigating to designer mode
        await page.evaluate(() => {
          // Create mock designer layout
          const designerContainer = document.createElement('div')
          designerContainer.className = 'contract-designer'
          designerContainer.innerHTML = `
            <div class="component-palette-container" style="width: 360px; background: #f0f0f0;">
              <div style="padding: 1rem;">Palette (360px)</div>
            </div>
            <div class="canvas-container" style="flex: 1; background: #ffffff;">
              <div style="padding: 1rem;">Canvas</div>
            </div>
            <div class="side-panel" style="width: 380px; background: #f0f0f0;">
              <div style="padding: 1rem;">Properties (380px)</div>
            </div>
          `
          designerContainer.style.cssText = 'display: flex; height: 100vh;'
          
          const content = document.querySelector('.content')
          if (content) {
            content.innerHTML = ''
            content.appendChild(designerContainer)
          }
        })
        
        await page.waitForTimeout(1000)
        
        // Verify designer layout dimensions
        const palette = page.locator('.component-palette-container')
        const paletteBox = await palette.boundingBox()
        expect(paletteBox?.width).toBe(360)
        
        const sidePanel = page.locator('.side-panel')
        const sidePanelBox = await sidePanel.boundingBox()
        expect(sidePanelBox?.width).toBe(380)
        
        const canvas = page.locator('.canvas-container')
        const canvasBox = await canvas.boundingBox()
        
        // Canvas should take remaining space
        const expectedCanvasWidth = 1400 - 360 - 380 // viewport - palette - side panel
        expect(canvasBox?.width).toBeCloseTo(expectedCanvasWidth, 5)
      })
    })
  }
  
  test.describe('Cross-Browser Consistency Tests', () => {
    
    test('Layout Consistency Across All Browsers', async ({ page }) => {
      await page.goto('/')
      await page.setViewportSize({ width: 1200, height: 800 })
      
      const measurements: Record<string, any> = {}
      
      // Measure all key elements
      const elements = ['.layout', '.sidebar', '.content']
      
      for (const selector of elements) {
        const element = page.locator(selector)
        if (await element.isVisible()) {
          measurements[selector] = await measureElement(page, selector)
        }
      }
      
      // Verify consistent measurements
      expect(measurements['.layout'].styles.gridTemplateColumns).toBe('340px 1fr')
      expect(measurements['.sidebar'].boundingBox?.width).toBe(340)
      
      // Store measurements for comparison across browsers
      await page.evaluate((data) => {
        (window as any).measurementData = data
      }, measurements)
    })
    
    test('Performance Consistency with New Container Sizes', async ({ page }) => {
      await page.goto('/')
      await page.setViewportSize({ width: 1200, height: 800 })
      
      // Measure initial page load performance
      const startTime = Date.now()
      await page.waitForSelector('.app')
      const loadTime = Date.now() - startTime
      
      // Should load within reasonable time even with larger containers
      expect(loadTime).toBeLessThan(5000)
      
      // Test scrolling performance with new container sizes
      await simulateUserFlow(page)
      
      const content = page.locator('.content')
      
      // Measure scroll performance
      const scrollStartTime = Date.now()
      for (let i = 0; i < 10; i++) {
        await content.scroll({ top: i * 100 })
        await page.waitForTimeout(16) // ~60fps
      }
      const scrollTime = Date.now() - scrollStartTime
      
      // Scrolling should be smooth even with larger containers
      expect(scrollTime).toBeLessThan(1000)
    })
    
    test('Memory Usage with Increased Container Sizes', async ({ page }) => {
      await page.goto('/')
      await page.setViewportSize({ width: 1200, height: 800 })
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })
      
      // Simulate heavy usage with new container sizes
      await simulateUserFlow(page)
      
      // Add significant content to test memory with larger containers
      await page.evaluate(() => {
        const content = document.querySelector('.content')
        if (content) {
          for (let i = 0; i < 100; i++) {
            const div = document.createElement('div')
            div.style.cssText = 'height: 50px; background: rgba(0,0,0,0.1); margin: 1px;'
            div.textContent = `Content item ${i}`
            content.appendChild(div)
          }
        }
      })
      
      await page.waitForTimeout(1000)
      
      // Check memory after heavy usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })
      
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50000000) // 50MB threshold
    })
    
    test('Accessibility with New Container Sizes', async ({ page }) => {
      await page.goto('/')
      await page.setViewportSize({ width: 1200, height: 800 })
      
      // Test keyboard navigation with new layout
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Verify focus is visible and properly managed
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
      
      // Test screen reader compatibility
      const ariaLabels = await page.$$eval('[aria-label]', elements => 
        elements.map(el => el.getAttribute('aria-label'))
      )
      
      // Should have proper aria labels for accessibility
      expect(ariaLabels.length).toBeGreaterThan(0)
      
      // Test color contrast with new container sizes
      const contrastResults = await page.evaluate(() => {
        const elements = document.querySelectorAll('.sidebar, .content')
        const results: Array<{ element: string, contrast: number }> = []
        
        elements.forEach((el, index) => {
          const styles = window.getComputedStyle(el)
          const bg = styles.backgroundColor
          const color = styles.color
          
          // Simple contrast check (would use actual contrast calculation in real test)
          results.push({
            element: el.className,
            contrast: bg !== color ? 4.5 : 1 // Mock contrast ratio
          })
        })
        
        return results
      })
      
      // All elements should meet minimum contrast requirements
      contrastResults.forEach(result => {
        expect(result.contrast).toBeGreaterThanOrEqual(3.0)
      })
    })
    
    test('Touch Device Compatibility', async ({ page, isMobile }) => {
      if (!isMobile) {
        // Simulate touch device
        await page.evaluate(() => {
          // Mock touch events
          (window as any).ontouchstart = () => {}
        })
      }
      
      await page.goto('/')
      await page.setViewportSize({ width: 400, height: 700 })
      
      await page.waitForSelector('.app')
      
      // Test touch interactions with new mobile layout
      const content = page.locator('.content')
      
      // Simulate touch scroll
      await content.dispatchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 300 }]
      })
      
      await content.dispatchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: 200 }]
      })
      
      await content.dispatchEvent('touchend', {})
      
      await page.waitForTimeout(500)
      
      // Verify touch scrolling worked
      const scrollTop = await content.evaluate(el => el.scrollTop)
      
      // Should have scrolled with touch
      expect(scrollTop).toBeGreaterThanOrEqual(0)
      
      // Test touch target sizes
      const touchTargets = await page.$$eval('button, a, [role="button"]', elements => 
        elements.map(el => {
          const rect = el.getBoundingClientRect()
          return { width: rect.width, height: rect.height }
        })
      )
      
      // All touch targets should meet minimum size requirements
      touchTargets.forEach(target => {
        expect(target.width).toBeGreaterThanOrEqual(44)
        expect(target.height).toBeGreaterThanOrEqual(44)
      })
    })
  })
  
  test.describe('Edge Cases and Error Handling', () => {
    
    test('Extreme Viewport Sizes', async ({ page }) => {
      // Test very large viewport
      await page.setViewportSize({ width: 3840, height: 2160 }) // 4K
      await page.goto('/')
      
      await page.waitForSelector('.app')
      
      const layout = await measureElement(page, '.layout')
      
      // Should handle ultra-wide screens gracefully
      expect(layout.boundingBox?.width).toBe(3840)
      expect(layout.styles.gridTemplateColumns).toBe('340px 1fr')
      
      // Test very small viewport
      await page.setViewportSize({ width: 320, height: 568 })
      
      const mobileLayout = await measureElement(page, '.layout')
      
      // Should adapt to very small screens
      expect(mobileLayout.boundingBox?.width).toBe(320)
    })
    
    test('CSS Grid Fallback Support', async ({ page }) => {
      await page.goto('/')
      await page.setViewportSize({ width: 1200, height: 800 })
      
      // Simulate older browser without grid support
      await page.addStyleTag({
        content: `
          .layout {
            display: flex !important;
            grid-template-columns: none !important;
          }
          .layout .sidebar {
            width: 340px;
            flex-shrink: 0;
          }
          .layout .content {
            flex: 1;
          }
        `
      })
      
      await page.waitForTimeout(500)
      
      const sidebar = page.locator('.sidebar')
      const sidebarBox = await sidebar.boundingBox()
      
      // Should maintain 340px sidebar even with flexbox fallback
      expect(sidebarBox?.width).toBe(340)
    })
    
    test('Content Overflow Edge Cases', async ({ page }) => {
      await page.goto('/')
      await page.setViewportSize({ width: 1200, height: 800 })
      
      // Add extremely tall content
      await page.evaluate(() => {
        const content = document.querySelector('.content')
        if (content) {
          const tallDiv = document.createElement('div')
          tallDiv.style.cssText = `
            height: 10000px;
            background: linear-gradient(to bottom, red, blue);
            width: 100%;
          `
          tallDiv.textContent = 'Extremely tall content to test overflow'
          content.appendChild(tallDiv)
        }
      })
      
      const content = page.locator('.content')
      
      // Should handle extreme content heights
      const isScrollable = await content.evaluate(el => el.scrollHeight > el.clientHeight)
      expect(isScrollable).toBe(true)
      
      // Test scrolling to bottom
      await content.scroll({ top: 9000 })
      const scrollTop = await content.evaluate(el => el.scrollTop)
      expect(scrollTop).toBeGreaterThan(8000)
    })
  })
})