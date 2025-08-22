import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,      // Default Vite port
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React and core libraries
          'react-vendor': ['react', 'react-dom'],
          // UI libraries
          'ui-vendor': ['framer-motion', 'lucide-react', 'react-syntax-highlighter'],
          // React Flow for canvas operations
          'canvas-vendor': ['reactflow'],
          // Contract designer components (lazy load)
          'designer': [
            './src/components/designer/ContractDesigner',
            './src/components/designer/OptimizedContractDesigner',
            './src/components/designer/DesignCanvas',
            './src/components/designer/ComponentPalette'
          ]
        }
      }
    },
    // Enable source maps for better debugging
    sourcemap: true,
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable minification (using esbuild for compatibility)
    minify: 'esbuild'
  },
  // Performance optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
    exclude: ['@vite/client', '@vite/env']
  },
  // CSS optimizations
  css: {
    devSourcemap: false
  },
  // Note: experimental features disabled for compatibility
})
