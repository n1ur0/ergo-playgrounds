import { test, expect, Page, BrowserContext } from '@playwright/test'

test.describe('Learn Section Scrolling - End to End Tests', () => {
  let page: Page
  let context: BrowserContext

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
  })

  test.beforeEach(async () => {
    page = await context.newPage()
    
    // Navigate to the app
    await page.goto('http://localhost:5173')
    
    // Wait for the app to load
    await page.waitForSelector('.app-main')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test.afterAll(async () => {
    await context.close()
  })

  test.describe('Basic Scrolling Functionality', () => {
    test('should allow vertical scrolling in learn section', async () => {
      // Select an example contract
      await page.click('[data-testid="example-simple-payment"]')
      
      // Navigate to learn tab
      await page.click('button:has-text("Learn")')
      
      // Wait for content to load
      await page.waitForSelector('.contract-education')
      
      // Get the scrollable container
      const educationContent = page.locator('.education-content')
      
      // Check initial scroll position
      const initialScrollTop = await educationContent.evaluate(el => el.scrollTop)
      expect(initialScrollTop).toBe(0)
      
      // Scroll down
      await educationContent.evaluate(el => el.scrollTo(0, 200))
      
      // Check scroll position changed
      const newScrollTop = await educationContent.evaluate(el => el.scrollTop)
      expect(newScrollTop).toBe(200)
    })

    test('should maintain smooth scrolling behavior', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      
      const educationContent = page.locator('.education-content')
      
      // Check CSS scroll behavior
      const scrollBehavior = await educationContent.evaluate(el => 
        getComputedStyle(el).scrollBehavior
      )
      expect(scrollBehavior).toBe('smooth')
    })

    test('should show scrollbars when content overflows', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      
      const educationContent = page.locator('.education-content')
      
      // Check if scrollbar is visible (content overflows)
      const hasVerticalScrollbar = await educationContent.evaluate(el => 
        el.scrollHeight > el.clientHeight
      )
      expect(hasVerticalScrollbar).toBe(true)
    })
  })

  test.describe('Section Navigation Scrolling', () => {
    test('should scroll to top when switching education sections', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      
      const educationContent = page.locator('.education-content')
      
      // Scroll down in overview section
      await educationContent.evaluate(el => el.scrollTo(0, 300))
      
      // Switch to concepts section
      await page.click('button:has-text("Key Concepts")')
      
      // Wait for content to change
      await page.waitForSelector('.concepts-section')
      
      // Check scroll position reset
      const scrollTop = await educationContent.evaluate(el => el.scrollTop)
      expect(scrollTop).toBe(0)
    })

    test('should handle scrolling through all education sections', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      
      const sections = ['Overview', 'Key Concepts', 'How It Works', 'Quiz Time']
      
      for (const section of sections) {
        await page.click(`button:has-text("${section}")`)
        
        const educationContent = page.locator('.education-content')
        
        // Scroll in each section
        await educationContent.evaluate(el => el.scrollTo(0, 150))
        
        const scrollTop = await educationContent.evaluate(el => el.scrollTop)
        expect(scrollTop).toBe(150)
      }
    })

    test('should handle process step navigation without scroll issues', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      await page.click('button:has-text("How It Works")')
      
      // Navigate through process steps
      const nextButton = page.locator('button:has-text("Next")')
      const prevButton = page.locator('button:has-text("Previous")')
      
      // Step forward
      await nextButton.click()
      
      // Check content updated
      await page.waitForSelector('.process-step.active')
      
      // Step backward
      await prevButton.click()
      
      // Content should still be scrollable
      const educationContent = page.locator('.education-content')
      await educationContent.evaluate(el => el.scrollTo(0, 100))
      
      const scrollTop = await educationContent.evaluate(el => el.scrollTop)
      expect(scrollTop).toBe(100)
    })
  })

  test.describe('Quiz Section Scrolling', () => {
    test('should allow scrolling through quiz questions', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      await page.click('button:has-text("Quiz Time")')
      
      const educationContent = page.locator('.education-content')
      
      // Scroll through quiz questions
      await educationContent.evaluate(el => el.scrollTo(0, 400))
      
      const scrollTop = await educationContent.evaluate(el => el.scrollTop)
      expect(scrollTop).toBe(400)
    })

    test('should maintain scroll position during quiz interaction', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      await page.click('button:has-text("Quiz Time")')
      
      const educationContent = page.locator('.education-content')
      
      // Scroll to middle of quiz
      await educationContent.evaluate(el => el.scrollTo(0, 200))
      
      // Answer a quiz question
      await page.click('.quiz-option:first-child')
      
      // Scroll position should be maintained
      const scrollTop = await educationContent.evaluate(el => el.scrollTop)
      expect(scrollTop).toBe(200)
    })

    test('should scroll to show results when quiz is submitted', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      await page.click('button:has-text("Quiz Time")')
      
      // Answer all questions
      const options = page.locator('.quiz-option')
      const optionCount = await options.count()
      
      for (let i = 0; i < optionCount; i++) {
        await options.nth(i).click()
      }
      
      // Submit quiz
      await page.click('button:has-text("Submit Quiz")')
      
      // Results should be visible
      await page.waitForSelector('.quiz-results')
      expect(await page.locator('.quiz-results').isVisible()).toBe(true)
    })
  })

  test.describe('Responsive Scrolling', () => {
    test('should handle mobile viewport scrolling', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      
      const educationContent = page.locator('.education-content')
      
      // Test touch scrolling behavior
      const hasTouchScrolling = await educationContent.evaluate(el => 
        getComputedStyle(el).WebkitOverflowScrolling === 'touch'
      )
      expect(hasTouchScrolling).toBe(true)
      
      // Test scrolling works on mobile
      await educationContent.evaluate(el => el.scrollTo(0, 250))
      
      const scrollTop = await educationContent.evaluate(el => el.scrollTop)
      expect(scrollTop).toBe(250)
    })

    test('should handle tablet viewport scrolling', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      
      const educationContent = page.locator('.education-content')
      
      // Test scrolling on tablet
      await educationContent.evaluate(el => el.scrollTo(0, 300))
      
      const scrollTop = await educationContent.evaluate(el => el.scrollTop)
      expect(scrollTop).toBe(300)
    })

    test('should adapt max-height on different screen sizes', async () => {
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1024, height: 768 },  // Tablet
        { width: 375, height: 667 }    // Mobile
      ]
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        
        await page.click('[data-testid="example-simple-payment"]')
        await page.click('button:has-text("Learn")')
        
        const educationContent = page.locator('.education-content')
        
        // Check that max-height is properly set
        const maxHeight = await educationContent.evaluate(el => 
          getComputedStyle(el).maxHeight
        )
        
        expect(maxHeight).toMatch(/calc\(.+\)/)
      }
    })
  })

  test.describe('Accessibility and Keyboard Navigation', () => {
    test('should maintain keyboard navigation with scrolling', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      
      // Use keyboard to navigate tabs
      await page.keyboard.press('Tab')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Enter')
      
      // Content should be accessible after keyboard navigation
      const activeTab = page.locator('.education-tabs .tab.active')
      expect(await activeTab.textContent()).toContain('Key Concepts')
      
      // Scrolling should still work
      const educationContent = page.locator('.education-content')
      await educationContent.evaluate(el => el.scrollTo(0, 100))
      
      const scrollTop = await educationContent.evaluate(el => el.scrollTop)
      expect(scrollTop).toBe(100)
    })

    test('should maintain focus during scrolling', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      await page.click('button:has-text("How It Works")')
      
      // Focus on next button
      const nextButton = page.locator('button:has-text("Next")')
      await nextButton.focus()
      
      // Scroll container
      const educationContent = page.locator('.education-content')
      await educationContent.evaluate(el => el.scrollTo(0, 150))
      
      // Focus should be maintained
      const focusedElement = page.locator(':focus')
      expect(await focusedElement.textContent()).toContain('Next')
    })
  })

  test.describe('Performance and Error Handling', () => {
    test('should handle rapid scrolling without performance issues', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      
      const educationContent = page.locator('.education-content')
      
      const startTime = Date.now()
      
      // Rapid scrolling
      for (let i = 0; i < 20; i++) {
        await educationContent.evaluate((el, pos) => el.scrollTo(0, pos), i * 50)
      }
      
      const endTime = Date.now()
      
      // Should complete quickly (under 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
    })

    test('should recover from scroll errors gracefully', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      
      // Simulate scroll error by attempting to scroll to invalid position
      const educationContent = page.locator('.education-content')
      
      await educationContent.evaluate(el => {
        try {
          el.scrollTo(0, -999999) // Invalid scroll position
        } catch (error) {
          // Error should be handled gracefully
        }
      })
      
      // App should still function
      await page.click('button:has-text("Key Concepts")')
      expect(await page.locator('.concepts-section').isVisible()).toBe(true)
    })

    test('should handle memory efficiently with large content', async () => {
      await page.click('[data-testid="example-dex-playground"]') // Larger content
      await page.click('button:has-text("Learn")')
      
      // Test scrolling through large content sections
      const sections = ['Overview', 'Key Concepts', 'How It Works', 'Quiz Time']
      
      for (const section of sections) {
        await page.click(`button:has-text("${section}")`)
        
        const educationContent = page.locator('.education-content')
        
        // Scroll through entire section
        await educationContent.evaluate(el => {
          el.scrollTo(0, el.scrollHeight)
        })
        
        // Memory usage should remain reasonable
        const memoryUsage = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize
          }
          return 0
        })
        
        // Should not exceed 50MB
        expect(memoryUsage).toBeLessThan(50 * 1024 * 1024)
      }
    })
  })

  test.describe('Cross-Browser Scrollbar Styling', () => {
    test('should apply custom scrollbar styles in webkit browsers', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      
      const educationContent = page.locator('.education-content')
      
      // Check webkit scrollbar styles are applied
      const scrollbarWidth = await educationContent.evaluate(el => {
        const styles = getComputedStyle(el, '::-webkit-scrollbar')
        return styles.width
      })
      
      expect(scrollbarWidth).toBe('8px')
    })

    test('should maintain scrollbar functionality across browser engines', async () => {
      await page.click('[data-testid="example-simple-payment"]')
      await page.click('button:has-text("Learn")')
      
      const educationContent = page.locator('.education-content')
      
      // Test scrolling works regardless of browser
      await educationContent.evaluate(el => el.scrollTo(0, 200))
      
      const scrollTop = await educationContent.evaluate(el => el.scrollTop)
      expect(scrollTop).toBe(200)
    })
  })
})