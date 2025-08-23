import { test, expect, Page } from '@playwright/test'

test.describe('Performance Tests - Smooth Scrolling Behavior', () => {
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

  test.describe('Scroll Performance Metrics', () => {
    test('should maintain 60fps during smooth scrolling', async () => {
      const educationContent = page.locator('.education-content')
      
      // Add substantial content to ensure scrolling
      await educationContent.evaluate(el => {
        for (let i = 0; i < 200; i++) {
          const div = document.createElement('div')
          div.style.height = '50px'
          div.style.background = `rgba(${i % 255}, 100, 200, 0.1)`
          div.innerHTML = `<p>Performance test content item ${i}</p>`
          el.appendChild(div)
        }
      })
      
      // Start performance measurement
      await page.evaluate(() => {
        (window as any).performanceData = {
          frameCount: 0,
          startTime: performance.now(),
          frames: []
        }
        
        function measureFrame() {
          (window as any).performanceData.frameCount++
          (window as any).performanceData.frames.push(performance.now())
          requestAnimationFrame(measureFrame)
        }
        
        measureFrame()
      })
      
      // Perform smooth scrolling
      await educationContent.evaluate(el => {
        el.scrollTo({ top: 2000, behavior: 'smooth' })
      })
      
      // Wait for scroll to complete
      await page.waitForFunction(
        () => {
          const el = document.querySelector('.education-content')
          return el && Math.abs(el.scrollTop - 2000) < 10
        },
        { timeout: 5000 }
      )
      
      // Measure performance
      const performanceData = await page.evaluate(() => {
        const data = (window as any).performanceData
        const endTime = performance.now()
        const duration = endTime - data.startTime
        const fps = (data.frameCount / duration) * 1000
        
        return { fps, duration, frameCount: data.frameCount }
      })
      
      // Should maintain close to 60fps
      expect(performanceData.fps).toBeGreaterThan(45)
      expect(performanceData.duration).toBeLessThan(3000)
    })

    test('should minimize layout thrashing during scrolling', async () => {
      const educationContent = page.locator('.education-content')
      
      // Add content with complex layouts
      await educationContent.evaluate(el => {
        for (let i = 0; i < 50; i++) {
          const div = document.createElement('div')
          div.style.cssText = `
            height: 100px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(45deg, rgba(100,181,246,0.1), rgba(156,39,176,0.1));
            margin: 10px 0;
            border-radius: 8px;
            padding: 1rem;
          `
          div.innerHTML = `
            <div style="flex: 1;">Item ${i}</div>
            <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
          `
          el.appendChild(div)
        }
      })
      
      // Monitor layout operations
      const layoutMetrics = await page.evaluate(async () => {
        let layoutCount = 0
        let paintCount = 0
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              if (entry.name.includes('layout')) layoutCount++
              if (entry.name.includes('paint')) paintCount++
            }
          }
        })
        
        observer.observe({ entryTypes: ['measure'] })
        
        // Perform scrolling
        const el = document.querySelector('.education-content')
        if (el) {
          const startTime = performance.now()
          el.scrollTo({ top: 1000, behavior: 'smooth' })
          
          // Wait for scroll to complete
          await new Promise(resolve => {
            const checkScroll = () => {
              if (Math.abs(el.scrollTop - 1000) < 10) {
                resolve(true)
              } else {
                requestAnimationFrame(checkScroll)
              }
            }
            checkScroll()
          })
          
          const endTime = performance.now()
          
          observer.disconnect()
          
          return {
            layoutCount,
            paintCount,
            duration: endTime - startTime
          }
        }
        
        return { layoutCount: 0, paintCount: 0, duration: 0 }
      })
      
      // Should minimize layout operations during scroll
      expect(layoutMetrics.layoutCount).toBeLessThan(10)
      expect(layoutMetrics.duration).toBeLessThan(2000)
    })

    test('should efficiently handle rapid scroll events', async () => {
      const educationContent = page.locator('.education-content')
      
      // Add scrollable content
      await educationContent.evaluate(el => {
        const div = document.createElement('div')
        div.style.height = '3000px'
        div.innerHTML = 'Rapid scroll test content'
        el.appendChild(div)
      })
      
      const startTime = Date.now()
      
      // Rapid scroll events
      for (let i = 0; i < 50; i++) {
        await educationContent.evaluate((el, pos) => {
          el.scrollTop = pos
        }, i * 50)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should handle rapid scroll events efficiently
      expect(duration).toBeLessThan(1000)
    })

    test('should maintain performance with large content sections', async () => {
      // Navigate to concepts section with many cards
      await page.click('button:has-text("Key Concepts")')
      await page.waitForSelector('.concepts-section')
      
      const educationContent = page.locator('.education-content')
      
      // Add many concept cards
      await educationContent.evaluate(el => {
        const conceptsGrid = el.querySelector('.concepts-grid')
        if (conceptsGrid) {
          for (let i = 0; i < 100; i++) {
            const card = document.createElement('div')
            card.className = 'concept-card'
            card.innerHTML = `
              <h4>Concept ${i}</h4>
              <p class="simple-def">Definition of concept ${i}</p>
              <div class="analogy">Analogy for concept ${i}</div>
              <div class="technical-note">Technical note ${i}</div>
            `
            conceptsGrid.appendChild(card)
          }
        }
      })
      
      const performanceTest = await page.evaluate(async () => {
        const startTime = performance.now()
        const el = document.querySelector('.education-content')
        
        if (el) {
          // Scroll through the entire content
          for (let i = 0; i < 10; i++) {
            el.scrollTo(0, i * 200)
            await new Promise(resolve => requestAnimationFrame(resolve))
          }
        }
        
        const endTime = performance.now()
        return endTime - startTime
      })
      
      // Should maintain good performance with large content
      expect(performanceTest).toBeLessThan(500)
    })
  })

  test.describe('Memory Usage During Scrolling', () => {
    test('should not leak memory during extended scrolling', async () => {
      const educationContent = page.locator('.education-content')
      
      // Add substantial content
      await educationContent.evaluate(el => {
        for (let i = 0; i < 300; i++) {
          const div = document.createElement('div')
          div.style.height = '80px'
          div.innerHTML = `<div>Memory test item ${i}</div>`
          el.appendChild(div)
        }
      })
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize
        }
        return 0
      })
      
      // Perform extensive scrolling
      for (let i = 0; i < 20; i++) {
        await educationContent.evaluate((el, pos) => el.scrollTo(0, pos), i * 100)
        await page.waitForTimeout(50)
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ('gc' in window) {
          (window as any).gc()
        }
      })
      
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize
        }
        return 0
      })
      
      // Memory usage should not increase dramatically
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // Less than 10MB increase
      }
    })

    test('should efficiently manage DOM nodes during scrolling', async () => {
      const educationContent = page.locator('.education-content')
      
      // Monitor DOM node count
      const nodeCountTest = await educationContent.evaluate(async (el) => {
        const initialNodeCount = document.querySelectorAll('*').length
        
        // Add many elements
        for (let i = 0; i < 200; i++) {
          const div = document.createElement('div')
          div.innerHTML = `<span>Node ${i}</span><p>Content ${i}</p>`
          el.appendChild(div)
        }
        
        const afterAddNodeCount = document.querySelectorAll('*').length
        
        // Scroll through content
        for (let i = 0; i < 10; i++) {
          el.scrollTo(0, i * 200)
          await new Promise(resolve => requestAnimationFrame(resolve))
        }
        
        const afterScrollNodeCount = document.querySelectorAll('*').length
        
        return {
          initial: initialNodeCount,
          afterAdd: afterAddNodeCount,
          afterScroll: afterScrollNodeCount
        }
      })
      
      // Node count should remain stable during scrolling
      expect(nodeCountTest.afterScroll).toBe(nodeCountTest.afterAdd)
    })
  })

  test.describe('CPU Usage and Efficiency', () => {
    test('should minimize CPU usage during idle scroll state', async () => {
      const educationContent = page.locator('.education-content')
      
      // Add content and scroll to middle
      await educationContent.evaluate(el => {
        const div = document.createElement('div')
        div.style.height = '2000px'
        div.innerHTML = 'CPU test content'
        el.appendChild(div)
        el.scrollTo(0, 1000)
      })
      
      // Measure CPU usage during idle state
      const cpuTest = await page.evaluate(() => {
        return new Promise(resolve => {
          const startTime = performance.now()
          let frameCount = 0
          
          function measureCPU() {
            frameCount++
            if (performance.now() - startTime > 1000) {
              // After 1 second of idle time
              resolve({ frameCount, duration: performance.now() - startTime })
            } else {
              requestAnimationFrame(measureCPU)
            }
          }
          
          measureCPU()
        })
      }) as { frameCount: number, duration: number }
      
      // Should not be constantly repainting during idle
      const fps = (cpuTest.frameCount / cpuTest.duration) * 1000
      expect(fps).toBeLessThan(65) // Should be close to 60fps, not higher
    })

    test('should optimize scroll event handling', async () => {
      const educationContent = page.locator('.education-content')
      
      // Add content
      await educationContent.evaluate(el => {
        const div = document.createElement('div')
        div.style.height = '2000px'
        div.innerHTML = 'Scroll event test'
        el.appendChild(div)
      })
      
      const eventTest = await educationContent.evaluate(async (el) => {
        let eventCount = 0
        let throttledEventCount = 0
        
        // Regular scroll listener
        el.addEventListener('scroll', () => {
          eventCount++
        })
        
        // Throttled scroll listener
        let throttleTimeout: number | null = null
        el.addEventListener('scroll', () => {
          if (!throttleTimeout) {
            throttleTimeout = window.setTimeout(() => {
              throttledEventCount++
              throttleTimeout = null
            }, 16) // ~60fps
          }
        })
        
        // Perform rapid scrolling
        for (let i = 0; i < 100; i++) {
          el.scrollTop = i * 20
          await new Promise(resolve => requestAnimationFrame(resolve))
        }
        
        // Wait for throttled events to complete
        await new Promise(resolve => setTimeout(resolve, 100))
        
        return { eventCount, throttledEventCount }
      })
      
      // Should generate many events but throttling should reduce them
      expect(eventTest.eventCount).toBeGreaterThan(50)
      expect(eventTest.throttledEventCount).toBeLessThan(eventTest.eventCount)
    })
  })

  test.describe('Rendering Performance', () => {
    test('should minimize paint and composite operations', async () => {
      const educationContent = page.locator('.education-content')
      
      // Add content with complex styles
      await educationContent.evaluate(el => {
        for (let i = 0; i < 50; i++) {
          const div = document.createElement('div')
          div.style.cssText = `
            height: 100px;
            background: linear-gradient(45deg, rgba(100,181,246,0.1), rgba(156,39,176,0.1));
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            margin: 10px 0;
            transform: translateZ(0); /* Force composite layer */
          `
          div.innerHTML = `Complex styled item ${i}`
          el.appendChild(div)
        }
      })
      
      // Monitor rendering performance
      const renderingTest = await page.evaluate(async () => {
        const startTime = performance.now()
        const el = document.querySelector('.education-content')
        
        if (el) {
          // Smooth scroll
          el.scrollTo({ top: 1000, behavior: 'smooth' })
          
          // Wait for scroll completion
          await new Promise(resolve => {
            const checkScroll = () => {
              if (Math.abs(el.scrollTop - 1000) < 10) {
                resolve(true)
              } else {
                requestAnimationFrame(checkScroll)
              }
            }
            checkScroll()
          })
        }
        
        const endTime = performance.now()
        return endTime - startTime
      })
      
      // Should complete smoothly
      expect(renderingTest).toBeLessThan(2000)
    })

    test('should handle different content types efficiently', async () => {
      const contentTypes = ['overview', 'concepts', 'process', 'quiz']
      const performanceResults: { [key: string]: number } = {}
      
      for (const contentType of contentTypes) {
        // Navigate to different sections
        switch (contentType) {
          case 'overview':
            await page.click('button:has-text("Overview")')
            break
          case 'concepts':
            await page.click('button:has-text("Key Concepts")')
            break
          case 'process':
            await page.click('button:has-text("How It Works")')
            break
          case 'quiz':
            await page.click('button:has-text("Quiz Time")')
            break
        }
        
        await page.waitForTimeout(200) // Allow content to load
        
        const educationContent = page.locator('.education-content')
        
        // Measure scrolling performance for each content type
        const perf = await educationContent.evaluate(async (el) => {
          const startTime = performance.now()
          
          // Scroll through section
          for (let i = 0; i < 5; i++) {
            el.scrollTo(0, i * 100)
            await new Promise(resolve => requestAnimationFrame(resolve))
          }
          
          return performance.now() - startTime
        })
        
        performanceResults[contentType] = perf
      }
      
      // All content types should perform well
      Object.values(performanceResults).forEach(perf => {
        expect(perf).toBeLessThan(300)
      })
    })
  })

  test.describe('Network Performance Impact', () => {
    test('should not trigger unnecessary network requests during scrolling', async () => {
      // Monitor network requests
      const requests: string[] = []
      
      page.on('request', request => {
        requests.push(request.url())
      })
      
      const educationContent = page.locator('.education-content')
      
      // Add content and scroll
      await educationContent.evaluate(el => {
        const div = document.createElement('div')
        div.style.height = '2000px'
        div.innerHTML = 'Network test content'
        el.appendChild(div)
      })
      
      const initialRequestCount = requests.length
      
      // Perform scrolling
      for (let i = 0; i < 10; i++) {
        await educationContent.evaluate((el, pos) => el.scrollTo(0, pos), i * 200)
        await page.waitForTimeout(100)
      }
      
      const finalRequestCount = requests.length
      
      // Should not trigger additional requests during scrolling
      expect(finalRequestCount).toBe(initialRequestCount)
    })
  })

  test.describe('Performance Under Stress', () => {
    test('should maintain performance with maximum content load', async () => {
      const educationContent = page.locator('.education-content')
      
      // Add maximum realistic content
      await educationContent.evaluate(el => {
        // Simulate very large educational content
        for (let section = 0; section < 10; section++) {
          const sectionDiv = document.createElement('div')
          sectionDiv.innerHTML = `<h3>Section ${section}</h3>`
          
          for (let item = 0; item < 100; item++) {
            const itemDiv = document.createElement('div')
            itemDiv.style.cssText = `
              height: 60px;
              background: rgba(${item % 255}, 100, 150, 0.1);
              margin: 5px 0;
              padding: 10px;
              border-radius: 8px;
            `
            itemDiv.innerHTML = `
              <h4>Item ${section}-${item}</h4>
              <p>Content for section ${section}, item ${item}</p>
            `
            sectionDiv.appendChild(itemDiv)
          }
          
          el.appendChild(sectionDiv)
        }
      })
      
      const stressTest = await page.evaluate(async () => {
        const startTime = performance.now()
        const el = document.querySelector('.education-content')
        
        if (el) {
          // Stress test: rapid, extensive scrolling
          for (let i = 0; i < 50; i++) {
            el.scrollTo(0, Math.random() * el.scrollHeight)
            await new Promise(resolve => requestAnimationFrame(resolve))
          }
          
          // Final smooth scroll
          el.scrollTo({ top: el.scrollHeight / 2, behavior: 'smooth' })
          
          // Wait for completion
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        return performance.now() - startTime
      })
      
      // Should handle stress test within reasonable time
      expect(stressTest).toBeLessThan(5000)
    })

    test('should recover from performance bottlenecks', async () => {
      const educationContent = page.locator('.education-content')
      
      // Create intentional bottleneck
      await educationContent.evaluate(el => {
        for (let i = 0; i < 200; i++) {
          const div = document.createElement('div')
          div.style.cssText = `
            height: 100px;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="rgba(100,181,246,0.1)"/></svg>');
            box-shadow: 0 2px 8px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.05);
            margin: 10px 0;
          `
          div.innerHTML = `Bottleneck item ${i}`
          el.appendChild(div)
        }
      })
      
      // Test recovery
      const recoveryTest = await page.evaluate(async () => {
        const el = document.querySelector('.education-content')
        
        if (el) {
          // Create bottleneck
          const startTime = performance.now()
          
          // Heavy scroll operations
          for (let i = 0; i < 20; i++) {
            el.scrollTo(0, i * 100)
            // Intentionally don't wait for RAF to create bottleneck
          }
          
          const bottleneckTime = performance.now()
          
          // Allow recovery
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Test if system recovered
          el.scrollTo({ top: 500, behavior: 'smooth' })
          await new Promise(resolve => {
            const checkScroll = () => {
              if (Math.abs(el.scrollTop - 500) < 20) {
                resolve(true)
              } else {
                requestAnimationFrame(checkScroll)
              }
            }
            checkScroll()
          })
          
          const recoveryTime = performance.now()
          
          return {
            bottleneckDuration: bottleneckTime - startTime,
            recoveryDuration: recoveryTime - bottleneckTime,
            totalTime: recoveryTime - startTime
          }
        }
        
        return { bottleneckDuration: 0, recoveryDuration: 0, totalTime: 0 }
      })
      
      // Should recover within reasonable time
      expect(recoveryTest.totalTime).toBeLessThan(3000)
      expect(recoveryTest.recoveryDuration).toBeLessThan(2000)
    })
  })
})