import { chromium } from 'playwright';

async function debugTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for all console messages
  page.on('console', msg => {
    console.log(`Console ${msg.type()}: ${msg.text()}`);
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log(`Page Error: ${error.message}`);
  });
  
  // Navigate to the app
  await page.goto('http://localhost:5178/');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot before any interaction
  await page.screenshot({ path: 'debug-before.png' });
  
  // Get all button texts
  const buttons = await page.locator('button').allTextContents();
  console.log('All buttons found:', buttons);
  
  // Try to find and click the first button
  if (buttons.length > 0) {
    try {
      console.log('Attempting to click first button:', buttons[0]);
      await page.click(`button >> text=${buttons[0]}`, { timeout: 5000 });
      console.log('Successfully clicked button');
      
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'debug-after-click.png' });
      
    } catch (e) {
      console.log('Failed to click button:', e.message);
    }
  }
  
  await page.waitForTimeout(5000); // Keep browser open for visual inspection
  await browser.close();
}

debugTest().catch(console.error);