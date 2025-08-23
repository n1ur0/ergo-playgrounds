// Optimized imports with tree-shaking support
// This file centralizes imports to improve tree-shaking and reduce bundle size

// React imports - use granular imports
export { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef, 
  useReducer,
  useContext,
  memo,
  lazy,
  Suspense,
  forwardRef,
  createContext
} from 'react';

// React DOM imports
export { createRoot } from 'react-dom/client';

// Lucide React - import only needed icons to reduce bundle size
export {
  // Core UI icons
  Plus,
  Minus,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  
  // File operations
  Save,
  Download,
  Upload,
  FileText,
  Copy,
  
  // Navigation
  Menu,
  Search,
  Filter,
  Settings,
  
  // Actions
  Play,
  Pause,
  RefreshCw as Refresh,
  Trash2,
  Edit,
  
  // Status indicators
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  
  // Designer specific
  Box,
  Circle,
  Square,
  Triangle,
  
  // Code related
  Code,
  Terminal,
  GitBranch,
  
  // Layout
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

// Framer Motion - use granular imports for better tree-shaking
export {
  motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
  useDragControls,
} from 'framer-motion';

// React Syntax Highlighter - lazy load specific languages
export const LazyPrism = () => import('react-syntax-highlighter/dist/esm/prism-async-light').then(mod => mod.default);
export const LazyScala = () => import('react-syntax-highlighter/dist/esm/languages/prism/scala');
export const LazyJson = () => import('react-syntax-highlighter/dist/esm/languages/prism/json');
export const LazyJavascript = () => import('react-syntax-highlighter/dist/esm/languages/prism/javascript');

// React Syntax Highlighter styles - lazy load
export const LazyDarkTheme = () => import('react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus');
export const LazyLightTheme = () => import('react-syntax-highlighter/dist/esm/styles/prism/vs');

// ReactFlow - lazy load components
export const LazyReactFlow = () => import('reactflow').then(mod => ({
  ReactFlow: mod.ReactFlow || mod.default,
  Background: mod.Background,
  Controls: mod.Controls,
  MiniMap: mod.MiniMap,
  Panel: mod.Panel,
  useReactFlow: mod.useReactFlow,
  useNodesState: mod.useNodesState,
  useEdgesState: mod.useEdgesState,
  addEdge: mod.addEdge,
  MarkerType: mod.MarkerType,
  Position: mod.Position,
}));

// Type-only imports to prevent runtime imports
export type { 
  ReactNode, 
  ComponentType, 
  PropsWithChildren,
  RefObject,
  CSSProperties,
  HTMLAttributes,
  HTMLProps,
} from 'react';

export type {
  Node,
  Edge,
  Connection,
  NodeProps,
  EdgeProps,
  ReactFlowInstance,
  Viewport,
} from 'reactflow';

export type { 
  Variants,
  Target,
  Transition,
  MotionProps,
} from 'framer-motion';

// Internal type imports
export type {
  ContractComponent,
  ContractDesignState,
  ComponentType as ContractComponentType,
  Position as ComponentPosition,
  ValidationError,
  TestScenario,
  GeneratedContract,
} from '../types/contractDesigner';

// Utility functions for dynamic imports
export const importUtils = {
  // Dynamic import with error handling and retry
  async dynamicImport<T>(
    importFn: () => Promise<{ default: T } | T>,
    retries: number = 3
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        const module = await importFn();
        return 'default' in (module as any) && typeof module === 'object' ? (module as any).default : module as T;
      } catch (error) {
        if (i === retries - 1) {
          console.error(`Failed to load module after ${retries} attempts:`, error);
          throw error;
        }
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    throw new Error('Dynamic import failed');
  },

  // Preload modules for better performance
  preloadModule(importFn: () => Promise<any>): void {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        importFn().catch(error => {
          console.warn('Failed to preload module:', error);
        });
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        importFn().catch(error => {
          console.warn('Failed to preload module:', error);
        });
      }, 2000);
    }
  },

  // Batch import multiple modules
  async batchImport<T extends Record<string, () => Promise<any>>>(
    imports: T
  ): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
    const entries = Object.entries(imports);
    const promises = entries.map(async ([key, importFn]) => {
      try {
        const module = await importFn();
        return [key, 'default' in module ? module.default : module];
      } catch (error) {
        console.error(`Failed to import ${key}:`, error);
        return [key, null];
      }
    });

    const results = await Promise.all(promises);
    return Object.fromEntries(results) as any;
  },

  // Check if module is already loaded
  isModuleLoaded(moduleName: string): boolean {
    try {
      return !!(window as any)[moduleName] || 
             !!(require as any).cache[require.resolve(moduleName)];
    } catch {
      return false;
    }
  },
};

// Bundle size optimization utilities
export const bundleOptimization = {
  // Check if we should load heavy dependencies
  shouldLoadHeavyDeps(): boolean {
    // Load heavy dependencies only on larger screens and faster connections
    const hasGoodPerformance = 
      window.innerWidth >= 1024 && // Desktop or tablet
      navigator.hardwareConcurrency >= 4 && // Multi-core device
      !(navigator as any).userAgentData?.mobile; // Not mobile

    const connection = (navigator as any).connection;
    const hasGoodConnection = 
      connection?.effectiveType === '4g' ||
      connection?.downlink >= 10; // >= 10 Mbps

    return hasGoodPerformance && (hasGoodConnection ?? true);
  },

  // Get optimal chunk loading strategy
  getLoadingStrategy(): 'eager' | 'lazy' | 'idle' {
    const shouldLoadHeavy = this.shouldLoadHeavyDeps();
    
    if (!shouldLoadHeavy) {
      return 'lazy';
    }
    
    // Use idle loading for non-critical components
    if ('requestIdleCallback' in window) {
      return 'idle';
    }
    
    return 'eager';
  },

  // Monitor bundle loading performance
  trackLoadingPerformance(moduleName: string, startTime: number): void {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    if (loadTime > 1000) { // > 1 second
      console.warn(`Slow module loading detected: ${moduleName} took ${loadTime.toFixed(2)}ms`);
    }
    
    // Store performance data
    if (!window.bundlePerformance) {
      window.bundlePerformance = {};
    }
    window.bundlePerformance[moduleName] = loadTime;
  },
};

// Development-only imports
export const devImports = process.env.NODE_ENV === 'development' ? {
  // React DevTools
  async loadReactDevTools() {
    if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      return (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    }
    return null;
  },
  
  // Performance profiling
  async loadProfiler() {
    const { Profiler } = await import('react');
    return Profiler;
  },
} : {};

// Export optimization metadata
export const optimizationMetadata = {
  // Bundle splitting points
  chunkBoundaries: [
    'reactflow',
    'framer-motion', 
    'react-syntax-highlighter',
    'components/designer',
    'utils',
    'hooks',
  ],
  
  // Critical path modules (should be in main bundle)
  critical: [
    'react',
    'react-dom',
    'hooks/useContractDesigner',
    'types/contractDesigner',
  ],
  
  // Lazy-loadable modules
  lazy: [
    'reactflow',
    'framer-motion/animations',
    'react-syntax-highlighter/languages',
    'components/designer/advanced',
  ],
  
  // Bundle size targets (in KB)
  sizeTargets: {
    main: 250,
    vendor: 500,
    designer: 300,
    total: 1000,
  },
};

// Declare global types for bundle performance tracking
declare global {
  interface Window {
    bundlePerformance?: Record<string, number>;
  }
}

export default {
  importUtils,
  bundleOptimization,
  devImports,
  optimizationMetadata,
};