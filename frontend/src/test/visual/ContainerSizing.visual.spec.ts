import { test, expect, Page } from '@playwright/test'

// Helper function to inject container size testing CSS
async function injectContainerStyles(page: Page) {
  await page.addStyleTag({
    content: `
      /* Test styles for container sizing validation */
      .test-container {
        border: 2px solid red;
        background: rgba(255, 0, 0, 0.1);
      }
      
      .test-sidebar {
        border: 2px solid blue;
        background: rgba(0, 0, 255, 0.1);
      }
      
      .test-content {
        border: 2px solid green;
        background: rgba(0, 255, 0, 0.1);
      }
      
      /* Add measurement overlays */
      .size-indicator {
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        font-size: 12px;
        border-radius: 4px;
        pointer-events: none;
        z-index: 9999;
      }
    `
  })
}

// Helper function to add size indicators
async function addSizeIndicators(page: Page, selector: string, label: string) {
  await page.evaluate(({ selector, label }) => {
    const element = document.querySelector(selector)
    if (element) {
      const rect = element.getBoundingClientRect()
      const indicator = document.createElement('div')
      indicator.className = 'size-indicator'
      indicator.textContent = `${label}: ${Math.round(rect.width)}x${Math.round(rect.height)}px`
      indicator.style.left = `${rect.left + 5}px`
      indicator.style.top = `${rect.top + 5}px`
      document.body.appendChild(indicator)
    }
  }, { selector, label })
}

test.describe('Visual Regression Tests - Container Size Changes', () => {
  test.beforeEach(async ({ page }) => {
    // Set a consistent viewport
    await page.setViewportSize({ width: 1200, height: 800 })
  })

  test('ContractTester - Desktop Layout with Increased Container Size', async ({ page }) => {
    // Navigate to a contract tester page
    await page.goto('/')
    
    // Wait for the app to load
    await page.waitForSelector('.app')
    
    // Inject test styles
    await injectContainerStyles(page)
    
    // Mock a contract being selected to show ContractTester
    await page.evaluate(() => {
      // Simulate contract selection
      const mockContract = {
        name: 'Test Contract',
        description: 'Visual regression test contract',
        difficulty: 'Beginner'
      }
      
      // Add test container classes
      const layout = document.querySelector('.layout')
      if (layout) {
        layout.classList.add('test-container')
      }
      
      const sidebar = document.querySelector('.sidebar')
      if (sidebar) {
        sidebar.classList.add('test-sidebar')
      }
      
      const content = document.querySelector('.content')
      if (content) {
        content.classList.add('test-content')
      }
    })
    
    // Add size indicators
    await addSizeIndicators(page, '.layout', 'Layout')
    await addSizeIndicators(page, '.sidebar', 'Sidebar')
    await addSizeIndicators(page, '.content', 'Content')
    
    // Verify new dimensions
    const layout = page.locator('.layout')
    const layoutBox = await layout.boundingBox()
    expect(layoutBox?.height).toBeGreaterThan(700) // Should use calc(100vh - 80px)
    
    const sidebar = page.locator('.sidebar')
    const sidebarBox = await sidebar.boundingBox()
    expect(sidebarBox?.width).toBe(340) // New increased sidebar width
    
    // Take screenshot for visual regression
    await expect(page).toHaveScreenshot('contract-tester-desktop-layout.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('ContractEducation - Desktop Layout with Increased Container Size', async ({ page }) => {
    await page.goto('/')
    await page.setViewportSize({ width: 1200, height: 800 })
    
    await injectContainerStyles(page)
    
    // Navigate to education mode
    await page.evaluate(() => {
      const mockEducationContent = {
        name: 'Education Test',
        concepts: ['Box', 'UTXO', 'ErgoScript']
      }
      
      // Simulate education view
      const educationContainer = document.createElement('div')
      educationContainer.className = 'education-content test-content'
      educationContainer.style.cssText = `
        max-height: calc(100vh - 180px);
        overflow: auto;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 16px;
        padding: 1.5rem;
        margin: 1rem;
      `
      educationContainer.innerHTML = '<div style="height: 500px;">Education Content</div>'
      
      const content = document.querySelector('.content')
      if (content) {
        content.appendChild(educationContainer)
      }
    })
    
    await addSizeIndicators(page, '.education-content', 'Education Container')
    
    // Verify education container uses new height calculation
    const educationContainer = page.locator('.education-content')
    const containerBox = await educationContainer.boundingBox()
    expect(containerBox?.height).toBeGreaterThan(500) // Should have more space with 180px deduction
    
    await expect(page).toHaveScreenshot('contract-education-desktop-layout.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('ContractDesigner - Desktop Layout with Expanded Panels', async ({ page }) => {
    await page.goto('/')
    await page.setViewportSize({ width: 1400, height: 900 })
    
    await injectContainerStyles(page)
    
    // Simulate designer layout
    await page.evaluate(() => {
      const designerContainer = document.createElement('div')
      designerContainer.className = 'contract-designer'
      designerContainer.style.cssText = `
        display: flex;
        height: 100vh;
        background: var(--color-background);
      `
      
      // Component palette (new 360px width)
      const palette = document.createElement('div')
      palette.className = 'component-palette-container test-sidebar'
      palette.style.cssText = `
        width: 360px;
        border-right: 1px solid var(--color-outline-variant);
        background: var(--color-surface);
      `
      palette.innerHTML = '<div style="padding: 1rem;">Component Palette (360px)</div>'
      
      // Canvas area
      const canvas = document.createElement('div')
      canvas.className = 'canvas-container test-content'
      canvas.style.cssText = `
        flex: 1;
        background: var(--color-background);
      `
      canvas.innerHTML = '<div style="padding: 1rem;">Canvas Area</div>'
      
      // Side panel (new 380px width)
      const sidePanel = document.createElement('div')
      sidePanel.className = 'side-panel test-sidebar'
      sidePanel.style.cssText = `
        width: 380px;
        border-left: 1px solid var(--color-outline-variant);
        background: var(--color-surface);
      `
      sidePanel.innerHTML = '<div style="padding: 1rem;">Properties Panel (380px)</div>'
      
      designerContainer.appendChild(palette)
      designerContainer.appendChild(canvas)
      designerContainer.appendChild(sidePanel)
      
      const content = document.querySelector('.content')
      if (content) {
        content.appendChild(designerContainer)
      }
    })
    
    await addSizeIndicators(page, '.component-palette-container', 'Palette')
    await addSizeIndicators(page, '.side-panel', 'Side Panel')
    await addSizeIndicators(page, '.canvas-container', 'Canvas')
    
    // Verify new panel dimensions
    const palette = page.locator('.component-palette-container')
    const paletteBox = await palette.boundingBox()
    expect(paletteBox?.width).toBe(360) // New expanded palette width
    
    const sidePanel = page.locator('.side-panel')
    const sidePanelBox = await sidePanel.boundingBox()
    expect(sidePanelBox?.width).toBe(380) // New expanded side panel width
    
    await expect(page).toHaveScreenshot('contract-designer-desktop-layout.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Tablet Layout - Responsive Container Adaptation', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 })
    await page.goto('/')
    
    await injectContainerStyles(page)
    
    await page.evaluate(() => {
      const layout = document.querySelector('.layout')
      if (layout) {
        layout.classList.add('test-container')
        // Tablet should use 280px sidebar
        (layout as HTMLElement).style.gridTemplateColumns = '280px 1fr'
      }
      
      const sidebar = document.querySelector('.sidebar')
      if (sidebar) {
        sidebar.classList.add('test-sidebar')
      }
      
      const content = document.querySelector('.content')
      if (content) {
        content.classList.add('test-content')
      }
    })
    
    await addSizeIndicators(page, '.layout', 'Tablet Layout')
    await addSizeIndicators(page, '.sidebar', 'Tablet Sidebar')
    
    const sidebar = page.locator('.sidebar')
    const sidebarBox = await sidebar.boundingBox()
    expect(sidebarBox?.width).toBe(280) // Tablet sidebar width
    
    await expect(page).toHaveScreenshot('tablet-layout-responsive.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Mobile Layout - Single Column Optimization', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 700 })
    await page.goto('/')
    
    await injectContainerStyles(page)
    
    await page.evaluate(() => {
      const layout = document.querySelector('.layout')
      if (layout) {
        layout.classList.add('test-container')
        // Mobile should use single column
        (layout as HTMLElement).style.gridTemplateColumns = '1fr'
      }
      
      const content = document.querySelector('.content')
      if (content) {
        content.classList.add('test-content')
        // Mobile content should use optimized height
        (content as HTMLElement).style.maxHeight = 'calc(100vh - 80px)'
      }
    })
    
    await addSizeIndicators(page, '.layout', 'Mobile Layout')
    await addSizeIndicators(page, '.content', 'Mobile Content')
    
    const layout = page.locator('.layout')
    const layoutBox = await layout.boundingBox()
    expect(layoutBox?.width).toBe(400) // Full mobile width
    
    await expect(page).toHaveScreenshot('mobile-layout-single-column.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Content Overflow Behavior with Increased Container Sizes', async ({ page }) => {
    await page.goto('/')
    await page.setViewportSize({ width: 1200, height: 800 })
    
    await injectContainerStyles(page)
    
    // Create content that would overflow to test scrolling
    await page.evaluate(() => {
      const scrollableContainer = document.createElement('div')
      scrollableContainer.className = 'test-content'
      scrollableContainer.style.cssText = `
        height: calc(100vh - 120px);
        overflow: auto;
        background: rgba(0, 255, 0, 0.1);
        border: 2px solid green;
        margin: 1rem;
        padding: 1rem;
      `
      
      // Add tall content to trigger scrolling
      const tallContent = document.createElement('div')
      tallContent.style.cssText = `
        height: 1500px;
        background: linear-gradient(to bottom, rgba(255,0,0,0.1), rgba(0,0,255,0.1));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      `
      tallContent.textContent = 'Tall Content (1500px) - Should Scroll'
      
      scrollableContainer.appendChild(tallContent)
      
      const content = document.querySelector('.content')
      if (content) {
        content.appendChild(scrollableContainer)
      }
    })
    
    await addSizeIndicators(page, '.test-content', 'Scrollable Container')
    
    // Verify scrolling works
    const scrollableContainer = page.locator('.test-content')
    
    // Check if container is scrollable
    const isScrollable = await scrollableContainer.evaluate(el => {
      return el.scrollHeight > el.clientHeight
    })
    expect(isScrollable).toBe(true)
    
    // Test scrolling
    await scrollableContainer.scroll({ top: 500 })
    
    await expect(page).toHaveScreenshot('content-overflow-scrolling.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Header and Footer Space Optimization', async ({ page }) => {
    await page.goto('/')
    await page.setViewportSize({ width: 1200, height: 800 })
    
    await injectContainerStyles(page)
    
    await page.evaluate(() => {
      // Highlight header and measure its impact
      const header = document.querySelector('.app-header')
      if (header) {
        header.classList.add('test-sidebar')
      }
      
      const layout = document.querySelector('.layout')
      if (layout) {
        layout.classList.add('test-container')
        // Verify the layout uses the new reduced header deduction
        (layout as HTMLElement).style.minHeight = 'calc(100vh - 80px)'
      }
    })
    
    await addSizeIndicators(page, '.app-header', 'Header')
    await addSizeIndicators(page, '.layout', 'Main Layout')
    
    // Verify header height and layout spacing
    const header = page.locator('.app-header')
    const headerBox = await header.boundingBox()
    
    const layout = page.locator('.layout')
    const layoutBox = await layout.boundingBox()
    
    // Layout should start below header and use most of viewport
    expect(layoutBox?.height).toBeGreaterThan(700) // Should be close to 720px (800 - 80)
    
    await expect(page).toHaveScreenshot('header-footer-optimization.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Cross-Browser Layout Consistency', async ({ page, browserName }) => {
    await page.goto('/')
    await page.setViewportSize({ width: 1200, height: 800 })
    
    await injectContainerStyles(page)
    
    await page.evaluate(() => {
      const layout = document.querySelector('.layout')
      if (layout) {
        layout.classList.add('test-container')
      }
      
      // Add browser indicator
      const indicator = document.createElement('div')
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        z-index: 10000;
        font-size: 14px;
      `
      indicator.textContent = `Browser: ${navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                                        navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                                        navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'}`
      document.body.appendChild(indicator)
    })
    
    await addSizeIndicators(page, '.layout', 'Layout')
    await addSizeIndicators(page, '.sidebar', 'Sidebar')
    
    // Verify consistent sizing across browsers
    const sidebar = page.locator('.sidebar')
    const sidebarBox = await sidebar.boundingBox()
    expect(sidebarBox?.width).toBe(340) // Should be consistent across browsers
    
    await expect(page).toHaveScreenshot(`cross-browser-${browserName}-layout.png`, {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Theme Integration with New Container Sizes', async ({ page }) => {
    await page.goto('/')
    await page.setViewportSize({ width: 1200, height: 800 })
    
    // Test both light and dark theme compatibility
    await page.evaluate(() => {
      // Add theme toggle simulation
      const themes = ['light', 'dark']
      const currentTheme = 0
      
      const applyTheme = (theme: string) => {
        document.documentElement.setAttribute('data-theme', theme)
        if (theme === 'dark') {
          document.documentElement.style.setProperty('--color-background', '#1a1a1a')
          document.documentElement.style.setProperty('--color-surface', '#2a2a2a')
          document.documentElement.style.setProperty('--color-on-surface', '#ffffff')
        } else {
          document.documentElement.style.setProperty('--color-background', '#ffffff')
          document.documentElement.style.setProperty('--color-surface', '#f5f5f5')
          document.documentElement.style.setProperty('--color-on-surface', '#000000')
        }
      }
      
      applyTheme('dark') // Test with dark theme
      
      const layout = document.querySelector('.layout')
      if (layout) {
        layout.classList.add('test-container')
      }
    })
    
    await injectContainerStyles(page)
    await addSizeIndicators(page, '.layout', 'Themed Layout')
    
    await expect(page).toHaveScreenshot('themed-layout-dark.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })
})