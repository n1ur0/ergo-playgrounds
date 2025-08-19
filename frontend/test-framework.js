import { chromium } from 'playwright';

async function testFramework() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });
  
  try {
    console.log('Navigating to http://localhost:5178/...');
    await page.goto('http://localhost:5178/', { waitUntil: 'networkidle' });
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Check if the main container loaded
    const title = await page.textContent('h1');
    console.log('Page title:', title);
    
    // Take a screenshot
    await page.screenshot({ path: 'framework-test.png' });
    
    // Log page content for debugging
    const bodyContent = await page.textContent('body');
    console.log('Page content preview:', bodyContent.substring(0, 200) + '...');
    
    // Check for all available selectors
    const allDivs = await page.locator('div').count();
    const allButtons = await page.locator('button').count();
    const allSections = await page.locator('section').count();
    
    console.log('Page elements - Divs:', allDivs, 'Buttons:', allButtons, 'Sections:', allSections);
    
    // Check for specific components
    const contractTester = await page.locator('.contract-tester').count();
    console.log('Contract tester components found:', contractTester);
    
    // Report errors
    if (errors.length > 0) {
      console.log('\n❌ JavaScript Errors Found:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ No JavaScript errors detected');
    }
    
    // Test contract selection with different selectors
    try {
      // Try different selectors for examples
      const exampleButtons = await page.locator('button:has-text("Simple Send"), button:has-text("Test Contract"), button:has-text("Pin Lock Contract")').count();
      console.log('Example buttons found:', exampleButtons);
      
      if (exampleButtons > 0) {
        console.log('Clicking "Simple Send" example...');
        await page.click('button:has-text("Simple Send")');
        await page.waitForTimeout(2000);
        
        // Check if code editor or contract tester appeared
        const codeEditor = await page.locator('textarea, .monaco-editor, .code-editor').count();
        const contractSection = await page.locator('.contract-tester, [class*="contract"], [class*="tester"]').count();
        
        console.log('Code editors found:', codeEditor);
        console.log('Contract sections found:', contractSection);
        
        // Look for run button
        const runButton = await page.locator('button:has-text("Run"), button:has-text("Execute"), [title*="run"], [title*="execute"]').count();
        console.log('Run buttons found:', runButton);
        
        // Test running a contract if button exists
        if (runButton > 0) {
          console.log('Testing contract execution...');
          await page.click('button:has-text("Run"), button:has-text("Execute")');
          await page.waitForTimeout(3000);
          
          // Look for results
          const results = await page.locator('.results, .simulation-results, [class*="result"]').count();
          console.log('Result sections found:', results);
        }
      } else {
        console.log('No example buttons found - looking for any clickable elements...');
        
        // Try to find clickable contract-related elements
        const allButtons = await page.locator('button').allTextContents();
        console.log('Available buttons:', allButtons.slice(0, 10));
        
        // Try clicking buttons that might be contract examples
        const contractButtons = allButtons.filter(text => 
          text.includes('Contract') || text.includes('Send') || text.includes('Test') || text.includes('Lock')
        );
        
        if (contractButtons.length > 0) {
          console.log('Found contract-related buttons:', contractButtons);
          await page.click(`button:has-text("${contractButtons[0]}")`);
          await page.waitForTimeout(2000);
        }
      }
    } catch (e) {
      console.log('Error testing contract selection:', e.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testFramework().catch(console.error);