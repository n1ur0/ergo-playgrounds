import { useEffect, useRef, useCallback } from 'react';

// Type definitions for memory management
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Memory leak detection and cleanup utilities
export class MemoryManager {
  private static listeners = new Map<string, { target: EventTarget; type: string; handler: EventListener }>();
  private static timers = new Map<string, NodeJS.Timeout>();
  private static observers = new Map<string, { observer: IntersectionObserver | ResizeObserver | MutationObserver; cleanup: () => void }>();
  private static animationFrames = new Set<number>();

  // Event listener management with automatic cleanup
  static addEventListenerWithCleanup(
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): () => void {
    const id = `${Math.random().toString(36).substr(2, 9)}-${type}`;
    
    target.addEventListener(type, handler, options);
    this.listeners.set(id, { target, type, handler });

    return () => {
      target.removeEventListener(type, handler, options);
      this.listeners.delete(id);
    };
  }

  // Timer management with automatic cleanup
  static setTimeoutWithCleanup(callback: () => void, delay: number): () => void {
    const id = Math.random().toString(36).substr(2, 9);
    const timeoutId = setTimeout(() => {
      callback();
      this.timers.delete(id);
    }, delay);

    this.timers.set(id, timeoutId);

    return () => {
      const timer = this.timers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(id);
      }
    };
  }

  static setIntervalWithCleanup(callback: () => void, interval: number): () => void {
    const id = Math.random().toString(36).substr(2, 9);
    const intervalId = setInterval(callback, interval);

    this.timers.set(id, intervalId);

    return () => {
      const timer = this.timers.get(id);
      if (timer) {
        clearInterval(timer);
        this.timers.delete(id);
      }
    };
  }

  // Observer management (IntersectionObserver, ResizeObserver, etc.)
  static addObserverWithCleanup(
    observerType: string,
    createObserver: () => { observer: IntersectionObserver | ResizeObserver | MutationObserver; cleanup: () => void }
  ): () => void {
    const id = `${observerType}-${Math.random().toString(36).substr(2, 9)}`;
    const { observer, cleanup } = createObserver();

    this.observers.set(id, { observer, cleanup });

    return () => {
      const observerData = this.observers.get(id);
      if (observerData) {
        observerData.cleanup();
        this.observers.delete(id);
      }
    };
  }

  // Animation frame management
  static requestAnimationFrameWithCleanup(callback: FrameRequestCallback): () => void {
    const frameId = requestAnimationFrame((time) => {
      callback(time);
      this.animationFrames.delete(frameId);
    });

    this.animationFrames.add(frameId);

    return () => {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(frameId);
    };
  }

  // Global cleanup for all managed resources
  static cleanupAll(): void {
    // Clean up event listeners
    this.listeners.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler);
    });
    this.listeners.clear();

    // Clean up timers
    this.timers.forEach((timer) => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    this.timers.clear();

    // Clean up observers
    this.observers.forEach(({ cleanup }) => {
      cleanup();
    });
    this.observers.clear();

    // Clean up animation frames
    this.animationFrames.forEach(frameId => {
      cancelAnimationFrame(frameId);
    });
    this.animationFrames.clear();
  }

  // Memory usage monitoring (secure implementation with fingerprinting protection)
  static getMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } | null {
    try {
      // Only access memory API in secure contexts with proper feature detection
      if (typeof performance !== 'undefined' && 
          'memory' in performance && 
          performance.memory &&
          typeof performance.memory === 'object') {
        const memory = performance.memory as PerformanceMemory;
        
        // Add fingerprinting protection by rounding values and adding noise
        const roundToMB = (bytes: number) => Math.round(bytes / (1024 * 1024)) * (1024 * 1024);
        const addNoise = (value: number) => value + (Math.random() * 1024 * 1024 - 512 * 1024); // ±512KB noise
        
        return {
          usedJSHeapSize: roundToMB(addNoise(memory.usedJSHeapSize)),
          totalJSHeapSize: roundToMB(memory.totalJSHeapSize),
          jsHeapSizeLimit: roundToMB(memory.jsHeapSizeLimit)
        };
      }
    } catch (error) {
      console.warn('Memory API not available or access denied:', error);
    }
    return null;
  }

  // Removed automatic GC scheduling for security - let browser manage memory

  // Secure deep cloning function with prototype pollution protection
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Use native structuredClone if available (modern browsers)
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(obj);
      } catch (error) {
        // Fallback to safe manual cloning if structuredClone fails
        console.warn('structuredClone failed, falling back to manual cloning:', error);
      }
    }

    // Safe manual cloning with prototype pollution protection
    return this.safeDeepClone(obj);
  }

  private static safeDeepClone<T>(obj: T): T {
    // Handle primitive types
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Handle Date objects
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    // Handle RegExp objects
    if (obj instanceof RegExp) {
      return new RegExp(obj.source, obj.flags) as unknown as T;
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.safeDeepClone(item)) as unknown as T;
    }

    // Handle Map objects
    if (obj instanceof Map) {
      const clonedMap = new Map();
      for (const [key, value] of obj) {
        clonedMap.set(this.safeDeepClone(key), this.safeDeepClone(value));
      }
      return clonedMap as unknown as T;
    }

    // Handle Set objects
    if (obj instanceof Set) {
      const clonedSet = new Set();
      for (const value of obj) {
        clonedSet.add(this.safeDeepClone(value));
      }
      return clonedSet as unknown as T;
    }

    // Handle plain objects with prototype pollution protection
    if (this.isPlainObject(obj)) {
      const cloned = Object.create(null) as Record<string, any>; // Create object without prototype
      
      for (const key in obj) {
        // Security: Prevent prototype pollution by blocking dangerous keys
        if (this.isDangerousKey(key)) {
          console.warn(`Skipping dangerous key during cloning: ${key}`);
          continue;
        }

        // Only clone own properties (not inherited)
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          cloned[key] = this.safeDeepClone((obj as any)[key]);
        }
      }

      // Convert back to regular object while preserving constructor
      const result = Object.create(Object.getPrototypeOf(obj));
      Object.assign(result, cloned);
      return result as T;
    }

    // For other object types, try to clone conservatively
    try {
      if (typeof (obj as any).constructor === 'function') {
        const cloned = Object.create(Object.getPrototypeOf(obj));
        for (const key in obj) {
          if (this.isDangerousKey(key)) {
            continue;
          }
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = this.safeDeepClone((obj as any)[key]);
          }
        }
        return cloned as T;
      }
    } catch (error) {
      console.warn('Failed to clone object, returning original:', error);
    }

    // Last resort: return the original object (shallow)
    return obj;
  }

  private static isPlainObject(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    // Check if it's a plain object (created with {} or new Object())
    const proto = Object.getPrototypeOf(obj);
    return proto === Object.prototype || proto === null;
  }

  private static isDangerousKey(key: string): boolean {
    // List of dangerous keys that could lead to prototype pollution
    const dangerousKeys = [
      '__proto__',
      'constructor',
      'prototype',
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toLocaleString',
      'toString',
      'valueOf'
    ];

    return dangerousKeys.includes(key) || key.startsWith('__');
  }

  // Secure object merging with prototype pollution protection
  static secureMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
    const result = this.deepClone(target);

    for (const source of sources) {
      if (source && typeof source === 'object') {
        for (const key in source) {
          if (this.isDangerousKey(key)) {
            console.warn(`Skipping dangerous key during merge: ${key}`);
            continue;
          }

          if (Object.prototype.hasOwnProperty.call(source, key)) {
            if (source[key] !== undefined) {
              result[key] = this.deepClone(source[key]);
            }
          }
        }
      }
    }

    return result;
  }

  // Secure property setter with validation
  static setProperty<T extends Record<string, any>>(obj: T, key: keyof T, value: T[keyof T]): boolean {
    if (this.isDangerousKey(String(key))) {
      console.warn(`Attempt to set dangerous property blocked: ${String(key)}`);
      return false;
    }

    try {
      obj[key] = value;
      return true;
    } catch (error) {
      console.warn(`Failed to set property ${String(key)}:`, error);
      return false;
    }
  }
}

// React hook for memory-safe event listeners
export function useEventListener<T extends EventTarget>(
  target: T | null,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): void {
  const savedHandler = useRef<EventListener | null>(null);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!target || !savedHandler.current) return;

    const eventListener = (event: Event) => savedHandler.current?.(event);
    
    return MemoryManager.addEventListenerWithCleanup(
      target,
      event,
      eventListener,
      options
    );
  }, [target, event, options]);
}

// React hook for memory-safe timers
export function useTimer(
  callback: () => void,
  delay: number | null,
  type: 'timeout' | 'interval' = 'timeout'
): void {
  const savedCallback = useRef<(() => void) | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null || !savedCallback.current) return;

    const timerCallback = () => savedCallback.current?.();

    if (type === 'timeout') {
      return MemoryManager.setTimeoutWithCleanup(timerCallback, delay);
    } else {
      return MemoryManager.setIntervalWithCleanup(timerCallback, delay);
    }
  }, [delay, type]);
}

// React hook for memory-safe observers
export function useObserver<T extends Element>(
  target: T | null,
  callback: (entries: IntersectionObserverEntry[] | ResizeObserverEntry[] | MutationRecord[]) => void,
  observerType: 'intersection' | 'resize' | 'mutation',
  options?: IntersectionObserverInit | ResizeObserverOptions | MutationObserverInit
): void {
  const savedCallback = useRef<((entries: IntersectionObserverEntry[] | ResizeObserverEntry[] | MutationRecord[]) => void) | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!target || !savedCallback.current) return;

    const observerCallback = (entries: IntersectionObserverEntry[] | ResizeObserverEntry[] | MutationRecord[]) => savedCallback.current?.(entries);

    return MemoryManager.addObserverWithCleanup(
      observerType,
      () => {
        let observer: IntersectionObserver | ResizeObserver | MutationObserver;
        let cleanup: () => void;

        switch (observerType) {
          case 'intersection':
            observer = new IntersectionObserver(
              observerCallback as IntersectionObserverCallback,
              options as IntersectionObserverInit
            );
            observer.observe(target);
            cleanup = () => observer.disconnect();
            break;

          case 'resize':
            observer = new ResizeObserver(
              observerCallback as ResizeObserverCallback
            );
            observer.observe(target);
            cleanup = () => observer.disconnect();
            break;

          case 'mutation':
            observer = new MutationObserver(
              observerCallback as MutationCallback
            );
            observer.observe(target, options as MutationObserverInit);
            cleanup = () => observer.disconnect();
            break;

          default:
            throw new Error(`Unsupported observer type: ${observerType}`);
        }

        return { observer, cleanup };
      }
    );
  }, [target, observerType, options]);
}

// React hook for memory-safe animation frames
export function useAnimationFrame(
  callback: (time: number) => void,
  active: boolean = true
): void {
  const savedCallback = useRef<((time: number) => void) | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!active) return;

    const animate = (time: number) => {
      if (savedCallback.current) {
        savedCallback.current(time);
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    return MemoryManager.requestAnimationFrameWithCleanup(animate);
  }, [active]);
}

// React hook for drag and drop memory management
export function useDragAndDropCleanup(
  isDragging: boolean,
  onCleanup?: () => void
): (cleanup: () => void) => void {
  const cleanupRef = useRef<(() => void)[]>([]);

  // Register cleanup function
  const registerCleanup = useCallback((cleanup: () => void) => {
    cleanupRef.current.push(cleanup);
  }, []);

  // Execute all cleanups
  const executeCleanups = useCallback(() => {
    cleanupRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
    cleanupRef.current = [];
    onCleanup?.();
  }, [onCleanup]);

  // Auto cleanup when dragging ends
  useEffect(() => {
    if (!isDragging && cleanupRef.current.length > 0) {
      executeCleanups();
    }
  }, [isDragging, executeCleanups]);

  // Cleanup on unmount
  useEffect(() => {
    return () => executeCleanups();
  }, [executeCleanups]);

  // Return register function for manual cleanup registration
  return registerCleanup;
}

// Memory leak detection hook
export function useMemoryLeakDetection(
  componentName: string,
  enabled: boolean = process.env.NODE_ENV === 'development'
): void {
  const mountTime = useRef<number | null>(null);
  const initialMemory = useRef<{ usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    mountTime.current = performance.now();
    initialMemory.current = MemoryManager.getMemoryUsage();

    return () => {
      if (mountTime.current) {
        const unmountTime = performance.now();
        const lifetime = unmountTime - mountTime.current;
        const finalMemory = MemoryManager.getMemoryUsage();

        console.group(`Memory Report: ${componentName}`);
        console.log(`Lifetime: ${lifetime.toFixed(2)}ms`);
        
        if (initialMemory.current && finalMemory && 
            typeof finalMemory.usedJSHeapSize === 'number' && 
            typeof initialMemory.current.usedJSHeapSize === 'number') {
          const memoryDelta = finalMemory.usedJSHeapSize - initialMemory.current.usedJSHeapSize;
          console.log(`Memory Delta: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
          
          if (memoryDelta > 5 * 1024 * 1024) { // 5MB threshold
            console.warn('Potential memory leak detected!');
          }
        }
        
        console.groupEnd();
      }
    };
  }, [componentName, enabled]);
}

// Cleanup utility for component unmount
export function useCleanupOnUnmount(cleanup: () => void): void {
  useEffect(() => cleanup, [cleanup]);
}

// Global cleanup hook for the entire application
export function useGlobalMemoryCleanup(): void {
  useEffect(() => {
    const handleBeforeUnload = () => {
      MemoryManager.cleanupAll();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      MemoryManager.cleanupAll();
    };
  }, []);

  // Note: Removed automatic GC scheduling for security reasons - let browser manage memory
}

export default MemoryManager;