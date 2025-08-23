import { test, expect, Page } from '@playwright/test'

test.describe('Visual Regression Tests - Scrollbar Appearance', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Navigate to the app
    await page.goto('http://localhost:5173')
    
    // Wait for the app to load
    await page.waitForSelector('.app-main')
    
    // Select a contract and navigate to learn section
    await page.click('[data-testid="example-simple-payment"]')
    await page.click('button:has-text("Learn")')
    await page.waitForSelector('.contract-education')
  })

  test.describe('Desktop Scrollbar Styling', () => {
    test('should display custom scrollbar in webkit browsers', async () => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1024, height: 768 })
      
      const educationContent = page.locator('.education-content')
      
      // Force scrollbar to appear by adding content
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        const div = document.createElement('div')
        div.style.height = '1000px'
        div.textContent = 'Scrollable content'
        el.appendChild(div)
      })
      
      // Take screenshot of the scrollable area
      await expect(educationContent).toHaveScreenshot('desktop-scrollbar.png')
    })

    test('should maintain scrollbar styling consistency across sections', async () => {
      const sections = ['Overview', 'Key Concepts', 'How It Works', 'Quiz Time']
      
      for (const section of sections) {
        await page.click(`button:has-text("${section}")`)
        await page.waitForTimeout(200) // Allow transition
        
        const educationContent = page.locator('.education-content')
        
        // Force content overflow
        await educationContent.evaluate(el => {
          const div = document.createElement('div')
          div.style.height = '800px'
          div.className = 'test-overflow-content'
          div.textContent = `${section} overflow content`
          el.appendChild(div)
        })
        
        // Screenshot each section's scrollbar
        await expect(educationContent).toHaveScreenshot(`scrollbar-${section.toLowerCase().replace(/\s+/g, '-')}.png`)
        
        // Clean up
        await educationContent.evaluate(el => {
          const testContent = el.querySelector('.test-overflow-content')
          if (testContent) testContent.remove()
        })
      }
    })

    test('should show hover effects on scrollbar thumb', async () => {
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        const div = document.createElement('div')
        div.style.height = '1000px'
        div.textContent = 'Content to make scrollable'
        el.appendChild(div)
      })
      
      // Hover over scrollbar area (approximate position)
      await page.hover('.education-content', { 
        position: { x: 392, y: 100 } // Right edge where scrollbar should be
      })
      
      // Take screenshot showing hover effect
      await expect(educationContent).toHaveScreenshot('scrollbar-hover-effect.png')
    })
  })

  test.describe('Mobile Scrollbar Styling', () => {
    test('should handle touch scrolling indicators on mobile', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content
      await educationContent.evaluate(el => {
        el.style.height = '500px'
        const div = document.createElement('div')
        div.style.height = '1200px'
        div.textContent = 'Mobile scrollable content'
        el.appendChild(div)
      })
      
      // Screenshot mobile scrolling state
      await expect(educationContent).toHaveScreenshot('mobile-scrollbar.png')
    })

    test('should maintain scrollbar visibility on tablet', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content
      await educationContent.evaluate(el => {
        el.style.height = '600px'
        const div = document.createElement('div')
        div.style.height = '1400px'
        div.textContent = 'Tablet scrollable content'
        el.appendChild(div)
      })
      
      // Screenshot tablet scrollbar
      await expect(educationContent).toHaveScreenshot('tablet-scrollbar.png')
    })
  })

  test.describe('Theme-based Scrollbar Variations', () => {
    test('should display scrollbar in dark theme', async () => {
      // The app appears to use a dark theme by default based on CSS
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        const div = document.createElement('div')
        div.style.height = '1000px'
        div.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
        div.style.padding = '1rem'
        div.textContent = 'Dark theme scrollable content'
        el.appendChild(div)
      })
      
      // Screenshot dark theme scrollbar
      await expect(educationContent).toHaveScreenshot('dark-theme-scrollbar.png')
    })

    test('should handle high contrast mode scrollbars', async () => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
      
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content with high contrast
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        el.style.border = '2px solid white'
        const div = document.createElement('div')
        div.style.height = '1000px'
        div.style.backgroundColor = '#000'
        div.style.color = '#fff'
        div.style.padding = '1rem'
        div.textContent = 'High contrast scrollable content'
        el.appendChild(div)
      })
      
      // Screenshot high contrast scrollbar
      await expect(educationContent).toHaveScreenshot('high-contrast-scrollbar.png')
    })
  })

  test.describe('Scrollbar State Variations', () => {
    test('should show scrollbar in active scrolling state', async () => {
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        const div = document.createElement('div')
        div.style.height = '1000px'
        div.textContent = 'Content for active scrolling test'
        el.appendChild(div)
      })
      
      // Scroll to middle position
      await educationContent.evaluate(el => el.scrollTo(0, 300))
      
      // Wait for scroll to complete
      await page.waitForTimeout(100)
      
      // Screenshot scrollbar in active state
      await expect(educationContent).toHaveScreenshot('scrollbar-active-state.png')
    })

    test('should show scrollbar at different scroll positions', async () => {
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        const div = document.createElement('div')
        div.style.height = '1000px'
        div.textContent = 'Content for scroll position test'
        el.appendChild(div)
      })
      
      const positions = [
        { name: 'top', scroll: 0 },
        { name: 'middle', scroll: 300 },
        { name: 'bottom', scroll: 600 }
      ]
      
      for (const position of positions) {
        await educationContent.evaluate((el, scrollPos) => el.scrollTo(0, scrollPos), position.scroll)
        await page.waitForTimeout(100)
        
        await expect(educationContent).toHaveScreenshot(`scrollbar-${position.name}-position.png`)
      }
    })

    test('should handle overflow scenarios correctly', async () => {
      const educationContent = page.locator('.education-content')
      
      // Test no overflow (no scrollbar)
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        const div = document.createElement('div')
        div.style.height = '200px'
        div.textContent = 'Short content - no overflow'
        el.appendChild(div)
      })
      
      await expect(educationContent).toHaveScreenshot('no-overflow-scrollbar.png')
      
      // Test just overflow (scrollbar appears)
      await educationContent.evaluate(el => {
        el.innerHTML = ''
        const div = document.createElement('div')
        div.style.height = '450px'
        div.textContent = 'Just enough content to trigger overflow'
        el.appendChild(div)
      })
      
      await expect(educationContent).toHaveScreenshot('just-overflow-scrollbar.png')
      
      // Test heavy overflow (full scrollbar)
      await educationContent.evaluate(el => {
        el.innerHTML = ''
        const div = document.createElement('div')
        div.style.height = '1500px'
        div.textContent = 'Heavy overflow content'
        el.appendChild(div)
      })
      
      await expect(educationContent).toHaveScreenshot('heavy-overflow-scrollbar.png')
    })
  })

  test.describe('Cross-Browser Scrollbar Comparison', () => {
    test('should maintain consistent appearance in webkit browsers', async () => {
      // This test would run specifically on webkit browsers
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        const div = document.createElement('div')
        div.style.height = '1000px'
        div.style.background = 'linear-gradient(45deg, rgba(100,181,246,0.1), rgba(156,39,176,0.1))'
        div.style.padding = '2rem'
        div.innerHTML = `
          <h3>Webkit Scrollbar Test</h3>
          <p>This content should display custom webkit scrollbar styling.</p>
          <div style="height: 200px; background: rgba(255,255,255,0.05); margin: 1rem 0;"></div>
          <p>More content to ensure scrolling is necessary.</p>
        `
        el.appendChild(div)
      })
      
      // Screenshot webkit scrollbar
      await expect(educationContent).toHaveScreenshot('webkit-scrollbar-styling.png')
    })

    test('should handle fallback scrollbar styling', async () => {
      // Simulate non-webkit browser by temporarily removing webkit-specific styles
      await page.addStyleTag({
        content: `
          .education-content::-webkit-scrollbar { display: none !important; }
          .education-content { scrollbar-width: thin; scrollbar-color: rgba(100, 181, 246, 0.5) rgba(255, 255, 255, 0.1); }
        `
      })
      
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        const div = document.createElement('div')
        div.style.height = '1000px'
        div.textContent = 'Fallback scrollbar styling test'
        el.appendChild(div)
      })
      
      // Screenshot fallback scrollbar
      await expect(educationContent).toHaveScreenshot('fallback-scrollbar-styling.png')
    })
  })

  test.describe('Animation and Transition Effects', () => {
    test('should show smooth scrollbar transitions', async () => {
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        const div = document.createElement('div')
        div.style.height = '1000px'
        div.textContent = 'Content for transition test'
        el.appendChild(div)
      })
      
      // Scroll smoothly and capture at different points
      await educationContent.evaluate(el => {
        el.scrollTo({ top: 200, behavior: 'smooth' })
      })
      
      // Wait for smooth scroll to begin
      await page.waitForTimeout(50)
      
      // Screenshot during transition
      await expect(educationContent).toHaveScreenshot('scrollbar-during-transition.png')
      
      // Wait for smooth scroll to complete
      await page.waitForTimeout(300)
      
      // Screenshot after transition
      await expect(educationContent).toHaveScreenshot('scrollbar-after-transition.png')
    })

    test('should handle rapid scroll changes visually', async () => {
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        const div = document.createElement('div')
        div.style.height = '1200px'
        div.innerHTML = `
          <div style="height: 200px; background: rgba(255,0,0,0.1); margin: 10px 0;">Section 1</div>
          <div style="height: 200px; background: rgba(0,255,0,0.1); margin: 10px 0;">Section 2</div>
          <div style="height: 200px; background: rgba(0,0,255,0.1); margin: 10px 0;">Section 3</div>
          <div style="height: 200px; background: rgba(255,255,0,0.1); margin: 10px 0;">Section 4</div>
          <div style="height: 200px; background: rgba(255,0,255,0.1); margin: 10px 0;">Section 5</div>
        `
        el.appendChild(div)
      })
      
      // Rapid scroll changes
      await educationContent.evaluate(el => el.scrollTo(0, 100))
      await page.waitForTimeout(50)
      await educationContent.evaluate(el => el.scrollTo(0, 300))
      await page.waitForTimeout(50)
      await educationContent.evaluate(el => el.scrollTo(0, 500))
      await page.waitForTimeout(50)
      
      // Screenshot final state
      await expect(educationContent).toHaveScreenshot('scrollbar-rapid-changes.png')
    })
  })

  test.describe('Accessibility Visual Indicators', () => {
    test('should show focus indicators when scrollbar is keyboard-accessible', async () => {
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        el.setAttribute('tabindex', '0') // Make focusable
        const div = document.createElement('div')
        div.style.height = '1000px'
        div.textContent = 'Keyboard accessible scrollable content'
        el.appendChild(div)
      })
      
      // Focus the scrollable element
      await educationContent.focus()
      
      // Screenshot with focus
      await expect(educationContent).toHaveScreenshot('scrollbar-with-focus.png')
    })

    test('should maintain visibility for reduced motion preferences', async () => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })
      
      const educationContent = page.locator('.education-content')
      
      // Create scrollable content
      await educationContent.evaluate(el => {
        el.style.height = '400px'
        const div = document.createElement('div')
        div.style.height = '1000px'
        div.textContent = 'Reduced motion scrollable content'
        el.appendChild(div)
      })
      
      // Scroll without animation
      await educationContent.evaluate(el => el.scrollTo(0, 200))
      
      // Screenshot reduced motion scrollbar
      await expect(educationContent).toHaveScreenshot('scrollbar-reduced-motion.png')
    })
  })
})