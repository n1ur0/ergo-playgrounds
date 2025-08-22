import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'clover', 'json'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/**/*.d.ts',
        '**/*.config.*',
        'dist/',
        '.storybook/'
      ]
    },
    // Performance testing configuration
    testTimeout: 10000,
    // Browser testing for responsive design tests
    browser: {
      enabled: false,
      name: 'chromium',
      provider: 'playwright',
      headless: true,
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})