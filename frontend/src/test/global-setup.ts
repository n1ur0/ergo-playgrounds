import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...')
  
  // Launch a browser to check if the dev server is running
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Wait for the dev server to be ready
    console.log('⏳ Waiting for dev server to be ready...')
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
    
    // Check if the app loads correctly
    await page.waitForSelector('.app-main', { timeout: 30000 })
    console.log('✅ Dev server is ready!')
    
    // Perform any additional setup tasks
    await setupTestData()
    
  } catch (error) {
    console.error('❌ Failed to setup tests:', error)
    throw error
  } finally {
    await browser.close()
  }
  
  console.log('✅ Global setup completed!')
}

async function setupTestData() {
  // Add any test data setup here
  console.log('📝 Setting up test data...')
  
  // Example: Create test files, setup mock data, etc.
  // This could include creating mock educational content if needed
  
  console.log('✅ Test data setup completed!')
}

export default globalSetup