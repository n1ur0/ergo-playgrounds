import { useEffect, useRef, useCallback } from 'react';

// Memory leak detection and cleanup utilities
export class MemoryManager {
  private static listeners = new Map<string, { target: EventTarget; type: string; handler: EventListener }>();
  private static timers = new Map<string, NodeJS.Timeout>();
  private static observers = new Map<string, { observer: any; cleanup: () => void }>();
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
    createObserver: () => { observer: any; cleanup: () => void }
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

  // Memory usage monitoring (secure implementation)
  static getMemoryUsage(): { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } | null {
    try {
      // Only access memory API in secure contexts with proper feature detection
      if (typeof performance !== 'undefined' && 
          'memory' in performance && 
          performance.memory &&
          typeof performance.memory === 'object') {
        const memory = performance.memory as any;
        // Only return safe, non-fingerprinting memory stats
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        };
      }
    } catch (error) {
      console.warn('Memory API not available or access denied:', error);
    }
    return null;
  }

  // Removed automatic GC scheduling for security - let browser manage memory
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
  callback: (entries: any[]) => void,
  observerType: 'intersection' | 'resize' | 'mutation',
  options?: any
): void {
  const savedCallback = useRef<((entries: any[]) => void) | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!target || !savedCallback.current) return;

    const observerCallback = (entries: any[]) => savedCallback.current?.(entries);

    return MemoryManager.addObserverWithCleanup(
      observerType,
      () => {
        let observer: any;
        let cleanup: () => void;

        switch (observerType) {
          case 'intersection':
            observer = new IntersectionObserver(observerCallback, options);
            observer.observe(target);
            cleanup = () => observer.disconnect();
            break;

          case 'resize':
            observer = new ResizeObserver(observerCallback);
            observer.observe(target);
            cleanup = () => observer.disconnect();
            break;

          case 'mutation':
            observer = new MutationObserver(observerCallback);
            observer.observe(target, options);
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
  const initialMemory = useRef<any | null>(null);

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
        
        if (initialMemory.current && finalMemory) {
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

  // Periodic cleanup (every 5 minutes)
  useTimer(() => {
    MemoryManager.scheduleGC();
  }, 5 * 60 * 1000, 'interval');
}

export default MemoryManager;