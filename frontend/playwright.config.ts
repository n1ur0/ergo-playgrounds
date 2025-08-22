import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/test',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:5173',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.(spec|test)\.(js|ts|jsx|tsx)$/,
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /.*\.(spec|test)\.(js|ts|jsx|tsx)$/,
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /.*\.(spec|test)\.(js|ts|jsx|tsx)$/,
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /.*responsive.*\.(spec|test)\.(js|ts|jsx|tsx)$/,
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testMatch: /.*responsive.*\.(spec|test)\.(js|ts|jsx|tsx)$/,
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
      testMatch: /.*cross-browser.*\.(spec|test)\.(js|ts|jsx|tsx)$/,
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
      testMatch: /.*cross-browser.*\.(spec|test)\.(js|ts|jsx|tsx)$/,
    },

    /* Performance testing project */
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        // Disable animations for consistent performance testing
        reducedMotion: 'reduce'
      },
      testMatch: /.*perf.*\.(spec|test)\.(js|ts|jsx|tsx)$/,
    },

    /* Visual testing project */
    {
      name: 'visual-regression',
      use: { 
        ...devices['Desktop Chrome'],
        // Consistent viewport for visual tests
        viewport: { width: 1280, height: 720 }
      },
      testMatch: /.*visual.*\.(spec|test)\.(js|ts|jsx|tsx)$/,
    }
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global test timeout */
  timeout: 30 * 1000,
  expect: {
    /* Timeout for expect() assertions */
    timeout: 10 * 1000,
    /* Visual comparison threshold */
    threshold: 0.2,
  },

  /* Output directory for test results */
  outputDir: 'test-results/',

  /* Global setup and teardown */
  globalSetup: require.resolve('./src/test/global-setup.ts'),
  globalTeardown: require.resolve('./src/test/global-teardown.ts'),
})