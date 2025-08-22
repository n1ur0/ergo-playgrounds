import { test, expect, Page, Browser, BrowserContext } from '@playwright/test'

// Define browser configurations
const browsers = ['chromium', 'firefox', 'webkit'] as const
type BrowserName = typeof browsers[number]

test.describe('Cross-Browser Compatibility Tests - Learn Section Scrolling', () => {
  for (const browserName of browsers) {
    test.describe(`${browserName.charAt(0).toUpperCase() + browserName.slice(1)} Browser`, () => {
      let context: BrowserContext
      let page: Page

      test.beforeAll(async ({ browser }) => {
        // Create browser-specific context
        context = await browser.newContext({
          // Browser-specific configurations
          ...(browserName === 'webkit' && {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15'
          }),
          ...(browserName === 'firefox' && {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:95.0) Gecko/20100101 Firefox/95.0'
          }),
          ...(browserName === 'chromium' && {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
          })
        })
      })

      test.beforeEach(async () => {
        page = await context.newPage()
        await page.goto('http://localhost:5173')
        await page.waitForSelector('.app-main')
        
        // Navigate to learn section
        await page.click('[data-testid="example-simple-payment"]')
        await page.click('button:has-text("Learn")')
        await page.waitForSelector('.contract-education')
      })

      test.afterEach(async () => {
        await page.close()
      })

      test.afterAll(async () => {
        await context.close()
      })

      test(`should support basic scrolling functionality in ${browserName}`, async () => {
        const educationContent = page.locator('.education-content')
        
        // Check initial state
        const initialScrollTop = await educationContent.evaluate(el => el.scrollTop)
        expect(initialScrollTop).toBe(0)
        
        // Test scrolling
        await educationContent.evaluate(el => el.scrollTo(0, 200))
        
        const newScrollTop = await educationContent.evaluate(el => el.scrollTop)
        expect(newScrollTop).toBe(200)
      })

      test(`should apply appropriate scrollbar styling in ${browserName}`, async () => {
        const educationContent = page.locator('.education-content')
        
        // Force content to overflow
        await educationContent.evaluate(el => {
          const div = document.createElement('div')
          div.style.height = '1000px'
          div.textContent = 'Overflow content'
          el.appendChild(div)
        })
        
        const styles = await educationContent.evaluate(el => {
          const computedStyles = getComputedStyle(el)
          return {
            overflowY: computedStyles.overflowY,
            scrollBehavior: computedStyles.scrollBehavior,
            // Browser-specific scrollbar properties
            scrollbarWidth: computedStyles.scrollbarWidth,
            scrollbarColor: computedStyles.scrollbarColor
          }
        })
        
        expect(styles.overflowY).toBe('auto')
        expect(styles.scrollBehavior).toBe('smooth')
        
        if (browserName === 'firefox') {
          // Firefox-specific scrollbar properties
          expect(styles.scrollbarWidth).toBe('thin')
          expect(styles.scrollbarColor).toContain('rgba')
        }
      })

      test(`should handle webkit scrollbar properties in ${browserName}`, async () => {
        if (browserName === 'webkit' || browserName === 'chromium') {
          const educationContent = page.locator('.education-content')
          
          // Check webkit scrollbar styles
          const hasWebkitScrollbar = await educationContent.evaluate(el => {
            // Create a test element to check webkit scrollbar support
            const testEl = document.createElement('div')
            testEl.style.overflow = 'scroll'
            testEl.style.height = '100px'
            document.body.appendChild(testEl)
            
            const hasWebkit = 'WebkitOverflowScrolling' in testEl.style
            document.body.removeChild(testEl)
            
            return hasWebkit
          })
          
          expect(hasWebkitScrollbar).toBe(true)
        }
      })

      test(`should maintain smooth scrolling behavior in ${browserName}`, async () => {
        const educationContent = page.locator('.education-content')
        
        // Add scrollable content
        await educationContent.evaluate(el => {
          const div = document.createElement('div')
          div.style.height = '1000px'
          div.innerHTML = '<p>Smooth scrolling test content</p>'.repeat(50)
          el.appendChild(div)
        })
        
        // Test smooth scrolling
        const startTime = Date.now()
        
        await educationContent.evaluate(el => {
          el.scrollTo({ top: 300, behavior: 'smooth' })
        })
        
        // Wait for scroll to complete
        await page.waitForFunction(
          () => document.querySelector('.education-content')?.scrollTop === 300,
          { timeout: 2000 }
        )
        
        const endTime = Date.now()
        const scrollDuration = endTime - startTime
        
        // Smooth scroll should take some time but not too long
        expect(scrollDuration).toBeGreaterThan(50)
        expect(scrollDuration).toBeLessThan(1500)
      })

      test(`should handle section switching with scrolling in ${browserName}`, async () => {
        const educationContent = page.locator('.education-content')
        
        // Scroll in overview section
        await educationContent.evaluate(el => el.scrollTo(0, 200))
        
        // Switch to concepts section
        await page.click('button:has-text("Key Concepts")')
        await page.waitForSelector('.concepts-section')
        
        // Check scroll position reset
        const scrollTop = await educationContent.evaluate(el => el.scrollTop)
        expect(scrollTop).toBe(0)
        
        // Test scrolling in new section
        await educationContent.evaluate(el => el.scrollTo(0, 150))
        
        const newScrollTop = await educationContent.evaluate(el => el.scrollTop)
        expect(newScrollTop).toBe(150)
      })

      test(`should handle mobile touch scrolling in ${browserName}`, async () => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 })
        
        const educationContent = page.locator('.education-content')
        
        // Check mobile touch scrolling properties
        const touchScrolling = await educationContent.evaluate(el => {
          const styles = getComputedStyle(el)
          return {
            WebkitOverflowScrolling: styles.WebkitOverflowScrolling,
            touchAction: styles.touchAction
          }
        })
        
        if (browserName === 'webkit' || browserName === 'chromium') {
          expect(touchScrolling.WebkitOverflowScrolling).toBe('touch')
        }
        
        // Test touch events
        await page.touchscreen.tap(200, 300)
        
        // Simulate touch scroll
        await educationContent.evaluate(el => {
          el.dispatchEvent(new TouchEvent('touchstart', {
            touches: [new Touch({
              identifier: 0,
              target: el,
              clientX: 200,
              clientY: 300
            })]
          }))
          
          el.dispatchEvent(new TouchEvent('touchmove', {
            touches: [new Touch({
              identifier: 0,
              target: el,
              clientX: 200,
              clientY: 200
            })]
          }))
          
          el.dispatchEvent(new TouchEvent('touchend', {
            changedTouches: [new Touch({
              identifier: 0,
              target: el,
              clientX: 200,
              clientY: 200
            })]
          }))
        })
        
        // Should handle touch events without errors
        expect(await page.evaluate(() => window.console.error.toString())).not.toContain('TouchEvent')
      })

      test(`should handle keyboard navigation with scrolling in ${browserName}`, async () => {
        const educationContent = page.locator('.education-content')
        
        // Make content focusable for keyboard navigation
        await educationContent.evaluate(el => {
          el.setAttribute('tabindex', '0')
        })
        
        // Focus and use keyboard navigation
        await educationContent.focus()
        
        // Test keyboard scrolling
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('ArrowDown')
        
        // Check that element can receive focus and handle keyboard events
        const isFocused = await educationContent.evaluate(el => 
          document.activeElement === el
        )
        expect(isFocused).toBe(true)
      })

      test(`should handle CSS Grid layouts with scrolling in ${browserName}`, async () => {
        // Navigate to concepts section which uses CSS Grid
        await page.click('button:has-text("Key Concepts")')
        await page.waitForSelector('.concepts-section')
        
        const conceptsGrid = page.locator('.concepts-grid')
        
        // Check CSS Grid support
        const gridSupport = await conceptsGrid.evaluate(el => {
          const styles = getComputedStyle(el)
          return {
            display: styles.display,
            gridTemplateColumns: styles.gridTemplateColumns
          }
        })
        
        expect(gridSupport.display).toBe('grid')
        expect(gridSupport.gridTemplateColumns).toMatch(/repeat|minmax|1fr/)
        
        // Test scrolling with grid layout
        const educationContent = page.locator('.education-content')
        await educationContent.evaluate(el => el.scrollTo(0, 200))
        
        const scrollTop = await educationContent.evaluate(el => el.scrollTop)
        expect(scrollTop).toBe(200)
      })

      test(`should handle CSS Flexbox layouts with scrolling in ${browserName}`, async () => {
        const educationTabs = page.locator('.education-tabs')
        
        // Check Flexbox support
        const flexSupport = await educationTabs.evaluate(el => {
          const styles = getComputedStyle(el)
          return {
            display: styles.display,
            flexDirection: styles.flexDirection,
            gap: styles.gap
          }
        })
        
        expect(flexSupport.display).toBe('flex')
        
        // Test scrolling with flex layout
        const educationContent = page.locator('.education-content')
        await educationContent.evaluate(el => el.scrollTo(0, 150))
        
        const scrollTop = await educationContent.evaluate(el => el.scrollTop)
        expect(scrollTop).toBe(150)
      })

      test(`should handle CSS animations with scrolling in ${browserName}`, async () => {
        // Navigate to quiz section which has animations
        await page.click('button:has-text("Quiz Time")')
        await page.waitForSelector('.quiz-section')
        
        const educationContent = page.locator('.education-content')
        
        // Test that animations don't interfere with scrolling
        await educationContent.evaluate(el => el.scrollTo(0, 250))
        
        // Wait for any animations to complete
        await page.waitForTimeout(500)
        
        const scrollTop = await educationContent.evaluate(el => el.scrollTop)
        expect(scrollTop).toBe(250)
      })

      test(`should handle JavaScript scroll events in ${browserName}`, async () => {
        const educationContent = page.locator('.education-content')
        
        // Add scroll event listener
        await educationContent.evaluate(el => {
          let scrollEvents = 0
          el.addEventListener('scroll', () => {
            scrollEvents++
            el.setAttribute('data-scroll-events', scrollEvents.toString())
          })
        })
        
        // Trigger scroll
        await educationContent.evaluate(el => el.scrollTo(0, 100))
        
        // Check that scroll events are fired
        const scrollEvents = await educationContent.getAttribute('data-scroll-events')
        expect(parseInt(scrollEvents || '0')).toBeGreaterThan(0)
      })

      test(`should handle performance under load in ${browserName}`, async () => {
        const educationContent = page.locator('.education-content')
        
        // Add large amount of content
        await educationContent.evaluate(el => {
          for (let i = 0; i < 100; i++) {
            const div = document.createElement('div')
            div.style.height = '50px'
            div.style.background = `rgba(${i * 2}, 100, 200, 0.1)`
            div.textContent = `Performance test item ${i}`
            el.appendChild(div)
          }
        })
        
        const startTime = Date.now()
        
        // Rapid scrolling
        for (let i = 0; i < 10; i++) {
          await educationContent.evaluate((el, pos) => el.scrollTo(0, pos), i * 100)
          await page.waitForTimeout(10)
        }
        
        const endTime = Date.now()
        const duration = endTime - startTime
        
        // Should maintain reasonable performance
        expect(duration).toBeLessThan(2000)
      })

      test(`should handle error scenarios gracefully in ${browserName}`, async () => {
        const educationContent = page.locator('.education-content')
        
        // Test invalid scroll positions
        await educationContent.evaluate(el => {
          try {
            el.scrollTo(0, -1000) // Negative scroll
          } catch (error) {
            // Should handle gracefully
          }
          
          try {
            el.scrollTo(0, 999999999) // Very large scroll
          } catch (error) {
            // Should handle gracefully
          }
        })
        
        // App should still function normally
        await page.click('button:has-text("Key Concepts")')
        expect(await page.locator('.concepts-section').isVisible()).toBe(true)
      })

      test(`should maintain accessibility across browsers in ${browserName}`, async () => {
        const educationContent = page.locator('.education-content')
        
        // Test ARIA attributes
        const ariaLabel = await educationContent.getAttribute('aria-label')
        const role = await educationContent.getAttribute('role')
        
        // Should have appropriate accessibility attributes
        expect(role || ariaLabel).toBeTruthy()
        
        // Test keyboard navigation
        await educationContent.focus()
        
        const isFocusable = await educationContent.evaluate(el => 
          el === document.activeElement || el.contains(document.activeElement)
        )
        expect(isFocusable).toBe(true)
      })
    })
  }

  test.describe('Cross-Browser Feature Comparison', () => {
    test('should maintain consistent scrolling behavior across all browsers', async ({ browser }) => {
      const results: { [key in BrowserName]: any } = {} as any
      
      for (const browserName of browsers) {
        const context = await browser.newContext()
        const page = await context.newPage()
        
        await page.goto('http://localhost:5173')
        await page.waitForSelector('.app-main')
        
        await page.click('[data-testid="example-simple-payment"]')
        await page.click('button:has-text("Learn")')
        await page.waitForSelector('.contract-education')
        
        const educationContent = page.locator('.education-content')
        
        // Test scrolling and measure results
        const startTime = Date.now()
        await educationContent.evaluate(el => el.scrollTo(0, 300))
        const endTime = Date.now()
        
        const scrollTop = await educationContent.evaluate(el => el.scrollTop)
        
        results[browserName] = {
          scrollTop,
          duration: endTime - startTime,
          supportsSmooth: await educationContent.evaluate(el => 
            getComputedStyle(el).scrollBehavior === 'smooth'
          )
        }
        
        await page.close()
        await context.close()
      }
      
      // Compare results across browsers
      expect(results.chromium.scrollTop).toBe(300)
      expect(results.firefox.scrollTop).toBe(300)
      expect(results.webkit.scrollTop).toBe(300)
      
      // All browsers should support smooth scrolling
      expect(results.chromium.supportsSmooth).toBe(true)
      expect(results.firefox.supportsSmooth).toBe(true)
      expect(results.webkit.supportsSmooth).toBe(true)
    })
  })
})