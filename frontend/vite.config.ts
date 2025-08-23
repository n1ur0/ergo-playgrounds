import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
/// <reference types="vitest" />

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.NODE_ENV === 'development' ? '0.0.0.0' : 'localhost', // Restrict in production
    port: 5173,      // Default Vite port
    headers: {
      // Secure CSP without unsafe-inline and unsafe-eval
      'Content-Security-Policy': [
        "default-src 'self'",
        // Scripts: Only allow self and specific hashes for necessary inline scripts
        "script-src 'self' 'sha256-HASH_PLACEHOLDER_FOR_VITE_SCRIPTS'",
        // Styles: Allow self and specific hashes for component styles
        "style-src 'self' 'sha256-HASH_PLACEHOLDER_FOR_COMPONENT_STYLES'",
        // Images: Allow self, data URLs for icons, and HTTPS images
        "img-src 'self' data: https:",
        // Connections: Restrict to self and trusted APIs
        "connect-src 'self' https://api.ergoplatform.com https://github.com",
        // Objects and embeds: Block completely
        "object-src 'none'",
        "embed-src 'none'",
        // Base URI: Restrict to self
        "base-uri 'self'",
        // Forms: Only allow submissions to self
        "form-action 'self'",
        // Frame ancestors: Block all framing
        "frame-ancestors 'none'",
        // Upgrade insecure requests in production
        process.env.NODE_ENV === 'production' ? "upgrade-insecure-requests" : "",
        // Block mixed content in production
        process.env.NODE_ENV === 'production' ? "block-all-mixed-content" : ""
      ].filter(Boolean).join('; '),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
      // Additional security headers
      'Strict-Transport-Security': process.env.NODE_ENV === 'production' ? 'max-age=31536000; includeSubDomains; preload' : '',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks for better caching
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            
            // Large UI libraries
            if (id.includes('framer-motion')) {
              return 'framer-motion-vendor';
            }
            
            if (id.includes('lucide-react')) {
              return 'lucide-vendor';
            }
            
            if (id.includes('react-syntax-highlighter')) {
              return 'syntax-highlighter-vendor';
            }
            
            if (id.includes('reactflow')) {
              return 'reactflow-vendor';
            }
            
            if (id.includes('playwright')) {
              return 'playwright-vendor';
            }
            
            // Other vendor dependencies
            return 'vendor';
          }
          
          // App chunks by feature
          if (id.includes('src/components/designer')) {
            return 'designer';
          }
          
          if (id.includes('src/hooks')) {
            return 'hooks';
          }
          
          if (id.includes('src/utils')) {
            return 'utils';
          }
          
          if (id.includes('src/types')) {
            return 'types';
          }
        },
        
        // Optimize chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      
      // External dependencies (CDN optimization)
      external: [],
      
      // Tree-shaking optimizations
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
      },
    },
    
    // Enable source maps only for development
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 500,
    
    // Enable minification with better options
    minify: 'esbuild',
    target: 'esnext',
    
    // Asset optimization
    assetsInlineLimit: 4096, // 4kb
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Additional build options
    ...(process.env.NODE_ENV === 'production' && {
      // Remove console logs in production
      esbuildOptions: {
        drop: ['console', 'debugger'],
      },
    }),
  },
  // Performance optimizations
  optimizeDeps: {
    // Pre-bundle these dependencies for faster loading
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
    ],
    
    // Exclude heavy or problematic dependencies from pre-bundling
    exclude: [
      '@vite/client',
      '@vite/env',
      'reactflow', // Large library, lazy load instead
      'framer-motion', // Animation library, lazy load for better performance
      'react-syntax-highlighter', // Large syntax highlighting, lazy load
      'playwright', // Testing library, not needed in production
    ]
  },
  
  // CSS optimizations
  css: {
    devSourcemap: process.env.NODE_ENV === 'development',
    
    // CSS modules optimization
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: process.env.NODE_ENV === 'production' 
        ? '[hash:base64:5]'
        : '[name]__[local]__[hash:base64:5]',
    },
    
    // PostCSS optimizations
    postcss: {
      plugins: process.env.NODE_ENV === 'production' ? [
        // Add production CSS optimizations here if needed
      ] : [],
    },
  },
  
  // Test configuration
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15000, // Increase timeout for integration tests
    hookTimeout: 15000,
    teardownTimeout: 15000,
    // Exclude Playwright tests and problematic integration tests
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.ts', // Playwright tests
      '**/src/test/e2e/**',
      '**/src/test/cross-browser/**',
      '**/src/test/visual/**',
      '**/src/test/integration/ContainerSizeIntegration.test.ts',
      '**/src/test/performance/PerformanceImprovements.test.ts',
      '**/src/test/performance/scrolling.perf.test.ts'
    ],
  },
  
  // Note: experimental features disabled for compatibility
})
