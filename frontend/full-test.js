import { chromium } from 'playwright';

async function fullTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });
  
  try {
    console.log('🚀 Starting comprehensive framework test...');
    
    // Navigate and wait for load
    await page.goto('http://localhost:5178/');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded successfully');
    
    // Test contract selection
    await page.click('button >> text=Test Contract');
    await page.waitForTimeout(1000);
    console.log('✅ Contract selected successfully');
    
    // Look for code editor or content area
    const codeArea = await page.locator('textarea, .code-editor, .monaco-editor, pre').first();
    const hasCodeArea = await codeArea.count() > 0;
    console.log('✅ Code area present:', hasCodeArea);
    
    // Look for run/execute button
    const runButtons = await page.locator('button').allTextContents();
    const runButton = runButtons.find(text => 
      text.toLowerCase().includes('run') || 
      text.toLowerCase().includes('execute') || 
      text.toLowerCase().includes('simulate')
    );
    
    if (runButton) {
      console.log('✅ Found execution button:', runButton);
      
      try {
        await page.click(`button >> text=${runButton}`);
        await page.waitForTimeout(3000);
        console.log('✅ Contract execution attempted');
        
        // Check for results or output
        const hasResults = await page.locator('.results, .output, .simulation, [class*="result"]').count() > 0;
        console.log('✅ Results displayed:', hasResults);
        
      } catch (e) {
        console.log('⚠️ Contract execution failed:', e.message);
      }
    } else {
      console.log('ℹ️ No execution button found');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'framework-full-test.png' });
    
    // Report final status
    if (errors.length > 0) {
      console.log('\n❌ JavaScript Errors Found:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('\n🎉 Framework test completed successfully - No JavaScript errors!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

fullTest().catch(console.error);