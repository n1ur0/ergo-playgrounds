import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Custom hook for debounced values
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook for throttled callbacks
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttleTimer = useRef<NodeJS.Timeout | null>(null);
  const lastExecuted = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastExecuted.current >= delay) {
        callback(...args);
        lastExecuted.current = now;
      } else {
        if (throttleTimer.current) {
          clearTimeout(throttleTimer.current);
        }

        throttleTimer.current = setTimeout(() => {
          callback(...args);
          lastExecuted.current = Date.now();
        }, delay - (now - lastExecuted.current));
      }
    },
    [callback, delay]
  ) as T;
}

// Custom hook for memoized shallow comparison
export function useShallowMemo<T>(value: T, deps: React.DependencyList): T {
  const prevValue = useRef<T>(value);
  const prevDeps = useRef<React.DependencyList>(deps);

  return useMemo(() => {
    // Shallow compare dependencies
    if (deps.length !== prevDeps.current.length) {
      prevValue.current = value;
      prevDeps.current = deps;
      return value;
    }

    for (let i = 0; i < deps.length; i++) {
      if (deps[i] !== prevDeps.current[i]) {
        prevValue.current = value;
        prevDeps.current = deps;
        return value;
      }
    }

    return prevValue.current;
  }, deps);
}

// Custom hook for deep comparison memo
export function useDeepMemo<T>(value: T, deps: React.DependencyList): T {
  const prevValue = useRef<T>(value);
  const prevDeps = useRef<React.DependencyList>(deps);

  return useMemo(() => {
    // Deep compare dependencies
    const isEqual = (a: any, b: any): boolean => {
      if (a === b) return true;
      if (a == null || b == null) return false;
      if (typeof a !== typeof b) return false;
      if (typeof a !== 'object') return false;

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!isEqual(a[key], b[key])) return false;
      }

      return true;
    };

    if (!isEqual(deps, prevDeps.current)) {
      prevValue.current = value;
      prevDeps.current = deps;
      return value;
    }

    return prevValue.current;
  }, deps);
}

// Custom hook for stable callback references
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef<T>(callback);
  const stableCallback = useRef<T>(callback);

  // Update the callback ref when the callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Create stable callback reference only once
  if (!stableCallback.current) {
    stableCallback.current = ((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }) as T;
  }

  return stableCallback.current;
}

// Custom hook for intersection observer (virtual scrolling support)
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, options]);

  return isIntersecting;
}

// Custom hook for resize observer
export function useResizeObserver(
  elementRef: React.RefObject<Element>
): DOMRectReadOnly | null {
  const [dimensions, setDimensions] = useState<DOMRectReadOnly | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions(entry.contentRect);
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef]);

  return dimensions;
}

// Custom hook for memoized event handlers
export function useMemoizedEventHandlers<T extends Record<string, (...args: any[]) => any>>(
  handlers: T,
  deps: React.DependencyList
): T {
  return useMemo(() => {
    const memoizedHandlers = {} as T;
    
    for (const [key, handler] of Object.entries(handlers)) {
      memoizedHandlers[key as keyof T] = handler as T[keyof T];
    }
    
    return memoizedHandlers;
  }, deps);
}

// Custom hook for performance monitoring
export function usePerformanceMonitor(name: string, enabled: boolean = false) {
  const startTime = useRef<number>(0);

  const start = useCallback(() => {
    if (enabled) {
      startTime.current = performance.now();
    }
  }, [enabled]);

  const end = useCallback(() => {
    if (enabled && startTime.current > 0) {
      const duration = performance.now() - startTime.current;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      startTime.current = 0;
    }
  }, [enabled, name]);

  const measure = useCallback((fn: () => void) => {
    start();
    fn();
    end();
  }, [start, end]);

  return { start, end, measure };
}

// Custom hook for batch updates
export function useBatchUpdates<T>() {
  const [queue, setQueue] = useState<T[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addToQueue = useCallback((item: T) => {
    setQueue(prev => [...prev, item]);
  }, []);

  const processBatch = useCallback((processor: (items: T[]) => void) => {
    if (queue.length === 0) return;

    setIsProcessing(true);
    processor([...queue]);
    setQueue([]);
    setIsProcessing(false);
  }, [queue]);

  const processBatchDelayed = useCallback(
    (processor: (items: T[]) => void, delay: number = 100) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        processBatch(processor);
      }, delay);
    },
    [processBatch]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    queue,
    isProcessing,
    addToQueue,
    processBatch,
    processBatchDelayed,
    queueSize: queue.length
  };
}

// Custom hook for virtual scrolling
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    startIndex,
    endIndex
  };
}

// Performance optimization utilities
export const performanceUtils = {
  // Create a memoized selector
  createMemoizedSelector: <TInput, TOutput>(
    selector: (input: TInput) => TOutput,
    equalityFn?: (a: TOutput, b: TOutput) => boolean
  ) => {
    let lastInput: TInput | undefined;
    let lastOutput: TOutput;

    return (input: TInput): TOutput => {
      if (lastInput === undefined || input !== lastInput) {
        const output = selector(input);
        
        if (equalityFn && lastInput !== undefined) {
          if (!equalityFn(output, lastOutput)) {
            lastOutput = output;
          }
        } else {
          lastOutput = output;
        }
        
        lastInput = input;
      }
      
      return lastOutput;
    };
  },

  // Shallow equality check for objects
  shallowEqual: (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (a[key] !== b[key]) return false;
    }

    return true;
  },

  // Create a batch processor for state updates
  createBatchProcessor: <T>(
    processor: (items: T[]) => void,
    batchSize: number = 10,
    delay: number = 16 // ~60fps
  ) => {
    let queue: T[] = [];
    let timeoutId: NodeJS.Timeout | null = null;

    const process = () => {
      if (queue.length === 0) return;
      
      const batch = queue.splice(0, batchSize);
      processor(batch);
      
      if (queue.length > 0) {
        timeoutId = setTimeout(process, delay);
      }
    };

    return {
      add: (item: T) => {
        queue.push(item);
        
        if (timeoutId === null) {
          timeoutId = setTimeout(process, delay);
        }
      },
      flush: () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        process();
      },
      clear: () => {
        queue = [];
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    };
  }
};

// HOC for memo with custom comparison
export function memoWithComparison<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  compareFn?: (prevProps: T, nextProps: T) => boolean
) {
  return React.memo(Component, compareFn);
}

// HOC for adding performance monitoring
export function withPerformanceMonitoring<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return React.memo((props: T) => {
    const monitor = usePerformanceMonitor(componentName, process.env.NODE_ENV === 'development');
    
    useEffect(() => {
      monitor.start();
      return () => monitor.end();
    }, [monitor]);

    return React.createElement(Component, props);
  });
}