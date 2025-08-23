import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { performanceUtils } from '../hooks/usePerformanceOptimizations';

// Enhanced memoization utilities for complex objects and functions
export class PerformanceOptimizer {
  private static memoCache = new Map<string, { result: any; timestamp: number; dependencies: any[] }>();
  private static readonly CACHE_TTL = 60000; // 1 minute TTL
  private static readonly MAX_CACHE_SIZE = 100;

  // Advanced memoization with dependency tracking and TTL
  static memoizeWithTTL<T>(
    key: string,
    factory: () => T,
    dependencies: any[] = [],
    ttl: number = PerformanceOptimizer.CACHE_TTL
  ): T {
    const now = Date.now();
    const cached = this.memoCache.get(key);

    // Check if cached result is still valid
    if (cached) {
      const isExpired = now - cached.timestamp > ttl;
      const depsChanged = !this.shallowEqual(cached.dependencies, dependencies);

      if (!isExpired && !depsChanged) {
        return cached.result;
      }
    }

    // Clean up expired entries periodically
    if (this.memoCache.size > this.MAX_CACHE_SIZE) {
      this.cleanupExpiredEntries(now, ttl);
    }

    // Compute new result
    const result = factory();
    this.memoCache.set(key, {
      result,
      timestamp: now,
      dependencies: [...dependencies]
    });

    return result;
  }

  private static cleanupExpiredEntries(now: number, ttl: number): void {
    for (const [key, value] of this.memoCache.entries()) {
      if (now - value.timestamp > ttl) {
        this.memoCache.delete(key);
      }
    }
  }

  private static shallowEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  // Clear all cache
  static clearCache(): void {
    this.memoCache.clear();
  }

  // Get cache stats
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.memoCache.size,
      keys: Array.from(this.memoCache.keys())
    };
  }
}

// Enhanced React hooks for performance optimization
export function useStableMemo<T>(
  factory: () => T,
  dependencies: React.DependencyList,
  equalityFn?: (a: T, b: T) => boolean
): T {
  const valueRef = useRef<T>();
  const depsRef = useRef<React.DependencyList>();

  return useMemo(() => {
    // First render or dependencies changed
    if (!depsRef.current || !performanceUtils.shallowEqual(dependencies, depsRef.current)) {
      const newValue = factory();
      
      // Use custom equality function if provided
      if (equalityFn && valueRef.current !== undefined) {
        if (!equalityFn(newValue, valueRef.current)) {
          valueRef.current = newValue;
        }
      } else {
        valueRef.current = newValue;
      }
      
      depsRef.current = dependencies;
    }
    
    return valueRef.current as T;
  }, dependencies);
}

// Stable callback with automatic dependency optimization
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies?: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef<React.DependencyList>(dependencies || []);

  // Update callback ref when dependencies change
  useEffect(() => {
    if (!dependencies || !performanceUtils.shallowEqual(dependencies, depsRef.current)) {
      callbackRef.current = callback;
      depsRef.current = dependencies || [];
    }
  }, [callback, dependencies]);

  // Return stable callback reference
  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

// Memoize expensive computations with automatic cleanup
export function useComputedValue<T>(
  compute: () => T,
  dependencies: React.DependencyList,
  options?: {
    ttl?: number;
    equalityFn?: (a: T, b: T) => boolean;
    key?: string;
  }
): T {
  const key = options?.key || `computed-${dependencies.join('-')}`;
  
  return useMemo(() => {
    return PerformanceOptimizer.memoizeWithTTL(
      key,
      compute,
      dependencies,
      options?.ttl
    );
  }, dependencies);
}

// Optimize array operations with memoization
export function useOptimizedArray<T>(
  array: T[],
  transform?: (item: T, index: number) => T,
  keyExtractor?: (item: T, index: number) => string
): T[] {
  return useMemo(() => {
    const key = keyExtractor 
      ? array.map(keyExtractor).join('|')
      : JSON.stringify(array);

    return PerformanceOptimizer.memoizeWithTTL(
      `array-${key}`,
      () => transform ? array.map(transform) : array,
      [array, transform]
    );
  }, [array, transform, keyExtractor]);
}

// Optimize object operations
export function useOptimizedObject<T extends Record<string, any>>(
  object: T,
  selector?: (obj: T) => Partial<T>
): T {
  return useMemo(() => {
    const keys = Object.keys(object).sort().join('|');
    const values = Object.keys(object).sort().map(k => object[k]);
    
    return PerformanceOptimizer.memoizeWithTTL(
      `object-${keys}`,
      () => selector ? selector(object) as T : object,
      [keys, ...values, selector]
    );
  }, [object, selector]);
}

// Performance monitoring hook for components
export function useComponentPerformance(componentName: string) {
  const renderCount = useRef(0);
  const mountTime = useRef<number>(0);
  const renderTimes = useRef<number[]>([]);

  useEffect(() => {
    mountTime.current = performance.now();
  }, []);

  useEffect(() => {
    renderCount.current++;
    const renderTime = performance.now() - mountTime.current;
    renderTimes.current.push(renderTime);
    
    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    if (process.env.NODE_ENV === 'development') {
      const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
      
      if (renderCount.current > 5 && avgRenderTime > 16) { // More than one frame
        console.warn(`Performance Warning: ${componentName} average render time: ${avgRenderTime.toFixed(2)}ms`);
      }
    }
  });

  return {
    renderCount: renderCount.current,
    avgRenderTime: renderTimes.current.length > 0 
      ? renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length 
      : 0
  };
}

// HOC for automatic performance optimization
export function withPerformanceOptimization<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options?: {
    shouldUpdate?: (prevProps: T, nextProps: T) => boolean;
    displayName?: string;
    enableProfiling?: boolean;
  }
): React.ComponentType<T> {
  const MemoizedComponent = React.memo(Component, options?.shouldUpdate);
  
  const OptimizedComponent = (props: T) => {
    const componentName = options?.displayName || Component.displayName || 'Anonymous';
    const shouldProfile = options?.enableProfiling && process.env.NODE_ENV === 'development';
    
    // Always call hooks - conditionally use results
    const performance = useComponentPerformance(componentName);
    
    useEffect(() => {
      if (shouldProfile && performance.renderCount > 0 && performance.renderCount % 10 === 0) {
        console.log(`Performance Report: ${componentName}`, {
          renders: performance.renderCount,
          avgRenderTime: performance.avgRenderTime
        });
      }
    }, [shouldProfile, componentName, performance.renderCount, performance.avgRenderTime]);

    return React.createElement(MemoizedComponent, props);
  };

  OptimizedComponent.displayName = `Optimized(${options?.displayName || Component.displayName || 'Component'})`;

  return OptimizedComponent;
}

// Batch state updates for better performance
export function useBatchedUpdates<T>() {
  const [state, setState] = React.useState<T[]>([]);
  const batchRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addToBatch = useCallback((item: T) => {
    batchRef.current.push(item);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(prev => [...prev, ...batchRef.current]);
      batchRef.current = [];
    }, 16); // ~60fps batching
  }, []);

  const clearBatch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    batchRef.current = [];
    setState([]);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    items: state,
    addToBatch,
    clearBatch,
    batchSize: batchRef.current.length
  };
}

// Virtual scrolling optimization
export function useVirtualizedList<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 3
) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
      .map((item, index) => ({
        item,
        index: visibleRange.startIndex + index,
        top: (visibleRange.startIndex + index) * itemHeight
      }));
  }, [items, visibleRange.startIndex, visibleRange.endIndex, itemHeight]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight: items.length * itemHeight,
    handleScroll,
    ...visibleRange
  };
}

// Memory-efficient state management
export function useMemoryEfficientState<T>(
  initialState: T,
  maxHistorySize: number = 20
) {
  const [state, setState] = React.useState(initialState);
  const historyRef = useRef<T[]>([]);

  const setStateWithHistory = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof newState === 'function' ? (newState as (prev: T) => T)(prev) : newState;
      
      // Add to history
      historyRef.current.push(prev);
      
      // Limit history size
      if (historyRef.current.length > maxHistorySize) {
        historyRef.current.shift();
      }
      
      return next;
    });
  }, [maxHistorySize]);

  const undo = useCallback(() => {
    if (historyRef.current.length > 0) {
      const previousState = historyRef.current.pop()!;
      setState(previousState);
    }
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
  }, []);

  return {
    state,
    setState: setStateWithHistory,
    undo,
    clearHistory,
    canUndo: historyRef.current.length > 0,
    historySize: historyRef.current.length
  };
}

export default PerformanceOptimizer;