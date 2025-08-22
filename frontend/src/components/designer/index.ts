/**
 * Optimized Contract Designer Component Exports
 * 
 * This index file provides the main entry points for the performance-optimized
 * contract designer system. Components are exported based on performance
 * characteristics and use cases.
 */

// Core designer components
export { default as ContractDesigner } from './ContractDesigner';
export { default as OptimizedContractDesigner } from './OptimizedContractDesigner';
export { default as LazyContractDesigner } from './LazyContractDesigner';

// Canvas components
export { default as DesignCanvas } from './DesignCanvas';
export { default as CanvasComponent } from './CanvasComponent';
export { default as CanvasPerformanceManager, useCanvasPerformance } from './CanvasPerformanceManager';

// UI components
export { default as ComponentPalette } from './ComponentPalette';
export { default as PropertyPanel } from './PropertyPanel';
export { default as OptimizedPropertyPanel } from './OptimizedPropertyPanel';
export { default as CodePreview } from './CodePreview';
export { default as EnhancedCodePreview } from './EnhancedCodePreview';
export { default as TestScenarioPanel } from './TestScenarioPanel';
export { default as ContractValidation } from './ContractValidation';
export { default as ConnectionLine } from './ConnectionLine';

// Performance utilities
export * from './CanvasPerformanceManager';

// Recommended component selection based on use case
export const getRecommendedDesigner = (requirements: {
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  performanceMode?: 'high' | 'balanced' | 'eco';
  complexity?: 'simple' | 'moderate' | 'complex';
  features?: string[];
}) => {
  const { deviceType = 'desktop', performanceMode = 'balanced', complexity = 'moderate' } = requirements;
  
  // High-performance desktop environment with complex contracts
  if (deviceType === 'desktop' && performanceMode === 'high' && complexity === 'complex') {
    return {
      component: 'OptimizedContractDesigner',
      features: ['all', 'advanced-rendering', 'full-history', 'performance-monitoring'],
      preload: true
    };
  }
  
  // Balanced performance for general use
  if (performanceMode === 'balanced') {
    return {
      component: 'LazyContractDesigner',
      features: ['core', 'progressive-loading', 'adaptive-performance'],
      preload: false
    };
  }
  
  // Eco mode for low-end devices
  if (performanceMode === 'eco' || deviceType === 'mobile') {
    return {
      component: 'LazyContractDesigner',
      features: ['core-only', 'minimal-animations', 'simple-rendering'],
      preload: false,
      config: { loadingMode: 'progressive', enableDeviceOptimization: true }
    };
  }
  
  // Default to lazy loading with progressive enhancement
  return {
    component: 'LazyContractDesigner',
    features: ['core', 'progressive-loading'],
    preload: false
  };
};

// Performance configuration presets
export const PERFORMANCE_PRESETS = {
  HIGH_PERFORMANCE: {
    enableBatching: true,
    enableCaching: true,
    renderMode: 'immediate',
    optimizations: ['gpu-acceleration', 'viewport-culling', 'memo-optimization'],
    memoryManagement: 'aggressive'
  },
  
  BALANCED: {
    enableBatching: true,
    enableCaching: true,
    renderMode: 'lazy',
    optimizations: ['viewport-culling', 'memo-optimization'],
    memoryManagement: 'standard'
  },
  
  ECO_MODE: {
    enableBatching: false,
    enableCaching: false,
    renderMode: 'simple',
    optimizations: ['memo-optimization'],
    memoryManagement: 'minimal'
  }
} as const;

// Type exports for TypeScript integration
export type {
  ContractComponent,
  Connection,
  Position,
  Size,
  ComponentType,
  ContractDesignState,
  ValidationError,
  ComponentTemplate,
  TestScenario
} from '../../types/contractDesigner';

export type PerformanceConfig = typeof PERFORMANCE_PRESETS[keyof typeof PERFORMANCE_PRESETS];

// Integration helpers
export const createOptimizedDesigner = (config: {
  performance?: keyof typeof PERFORMANCE_PRESETS;
  features?: string[];
  deviceCapabilities?: {
    touchSupported: boolean;
    maxTouchPoints: number;
    screenSize: { width: number; height: number };
    pixelRatio: number;
  };
}) => {
  const recommendation = getRecommendedDesigner({
    performanceMode: config.performance === 'HIGH_PERFORMANCE' ? 'high' : 
                    config.performance === 'ECO_MODE' ? 'eco' : 'balanced'
  });
  
  return {
    ...recommendation,
    config: {
      ...PERFORMANCE_PRESETS[config.performance || 'BALANCED'],
      ...config
    }
  };
};