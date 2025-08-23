// Performance testing utilities to verify improvements
import React from 'react';

// Extend PerformanceEntry for specific entry types
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  startTime: number;
}

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  initialLoad: number;
  componentCount: number;
  reRenderCount: number;
  errors: string[];
}

export class PerformanceTester {
  private static metrics: Map<string, PerformanceMetrics[]> = new Map();
  private static observers: PerformanceObserver[] = [];

  // Start performance monitoring for a component
  static startMonitoring(componentName: string): () => PerformanceMetrics {
    const startTime = performance.now();
    const initialMemory = this.getMemoryUsage();

    return () => {
      const endTime = performance.now();
      const finalMemory = this.getMemoryUsage();

      const metrics: PerformanceMetrics = {
        renderTime: endTime - startTime,
        memoryUsage: finalMemory - initialMemory,
        bundleSize: this.getBundleSize(),
        initialLoad: endTime - startTime,
        componentCount: 1,
        reRenderCount: 0,
        errors: []
      };

      if (!this.metrics.has(componentName)) {
        this.metrics.set(componentName, []);
      }
      this.metrics.get(componentName)!.push(metrics);

      return metrics;
    };
  }

  // Monitor Core Web Vitals
  static initCoreWebVitals(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      const lcp = lastEntry.startTime;
      
      console.log('LCP:', lcp, 'ms');
      if (lcp > 2500) {
        console.warn('LCP is poor (>2.5s):', lcp);
      } else if (lcp > 1000) {
        console.warn('LCP needs improvement (>1s):', lcp);
      }
    });

    // First Input Delay (FID) - approximation using event timing
    this.observePerformanceEntry('first-input', (entries) => {
      const firstInput = entries[0] as PerformanceEventTiming;
      const fid = firstInput.processingStart - firstInput.startTime;
      
      console.log('FID:', fid, 'ms');
      if (fid > 100) {
        console.warn('FID is poor (>100ms):', fid);
      }
    });

    // Cumulative Layout Shift (CLS)
    this.observePerformanceEntry('layout-shift', (entries) => {
      let cls = 0;
      
      for (const entry of entries) {
        const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value: number };
        if (!layoutShiftEntry.hadRecentInput) {
          cls += layoutShiftEntry.value;
        }
      }
      
      console.log('CLS:', cls);
      if (cls > 0.25) {
        console.warn('CLS is poor (>0.25):', cls);
      } else if (cls > 0.1) {
        console.warn('CLS needs improvement (>0.1):', cls);
      }
    });

    // Long Tasks (blocking main thread)
    this.observePerformanceEntry('longtask', (entries) => {
      for (const entry of entries) {
        const duration = entry.duration;
        console.warn('Long task detected:', duration, 'ms');
        
        if (duration > 100) {
          console.warn('Long task blocking main thread:', {
            duration,
            startTime: entry.startTime,
            name: entry.name
          });
        }
      }
    });
  }

  // Memory leak detection
  static detectMemoryLeaks(componentName: string, threshold: number = 50): boolean {
    const metrics = this.metrics.get(componentName);
    if (!metrics || metrics.length < 10) return false;

    const recent = metrics.slice(-10);
    const average = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;

    if (average > threshold) {
      console.warn(`Memory leak detected in ${componentName}:`, {
        averageMemoryIncrease: average,
        threshold,
        measurements: recent.length
      });
      return true;
    }

    return false;
  }

  // Bundle size analysis
  static analyzeBundleSize(): {
    total: number;
    chunks: Record<string, number>;
    recommendations: string[];
  } {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    let totalSize = 0;
    const chunks: Record<string, number> = {};
    const recommendations: string[] = [];

    entries.forEach((entry: PerformanceResourceTiming) => {
      if (entry.name.includes('.js') || entry.name.includes('.css')) {
        const size = entry.transferSize || 0;
        totalSize += size;
        
        const filename = entry.name.split('/').pop() || 'unknown';
        chunks[filename] = size;

        // Recommendations based on size
        if (size > 500 * 1024) { // > 500KB
          recommendations.push(`Large chunk detected: ${filename} (${(size / 1024).toFixed(1)}KB)`);
        }
      }
    });

    // General recommendations
    if (totalSize > 1024 * 1024) { // > 1MB
      recommendations.push('Total bundle size exceeds 1MB - consider code splitting');
    }

    return {
      total: totalSize,
      chunks,
      recommendations
    };
  }

  // Performance report generation
  static generateReport(): {
    summary: {
      avgRenderTime: number;
      avgMemoryUsage: number;
      totalComponents: number;
      memoryLeaks: number;
    };
    details: Record<string, {
      avgRenderTime: number;
      avgMemoryUsage: number;
      measurements: number;
      hasMemoryLeak: boolean;
    }>;
    coreWebVitals: {
      lcp?: number;
      fid?: number;
      cls?: number;
    };
    bundleAnalysis: ReturnType<typeof PerformanceTester.analyzeBundleSize>;
  } {
    const summary = {
      avgRenderTime: 0,
      avgMemoryUsage: 0,
      totalComponents: this.metrics.size,
      memoryLeaks: 0
    };

    const details: Record<string, {
      avgRenderTime: number;
      avgMemoryUsage: number;
      measurements: number;
      hasMemoryLeak: boolean;
    }> = {};

    for (const [componentName, metrics] of this.metrics.entries()) {
      const avgRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;
      const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
      const hasMemoryLeak = this.detectMemoryLeaks(componentName);

      if (hasMemoryLeak) {
        summary.memoryLeaks++;
      }

      summary.avgRenderTime += avgRenderTime;
      summary.avgMemoryUsage += avgMemoryUsage;

      details[componentName] = {
        avgRenderTime,
        avgMemoryUsage,
        measurements: metrics.length,
        hasMemoryLeak
      };
    }

    summary.avgRenderTime /= this.metrics.size || 1;
    summary.avgMemoryUsage /= this.metrics.size || 1;

    return {
      summary,
      details,
      coreWebVitals: this.getCoreWebVitals(),
      bundleAnalysis: this.analyzeBundleSize()
    };
  }

  // Automated performance testing
  static runAutomatedTests(): Promise<{
    passed: number;
    failed: number;
    results: Array<{ test: string; passed: boolean; message: string }>;
  }> {
    return new Promise((resolve) => {
      const results: Array<{ test: string; passed: boolean; message: string }> = [];
      let passed = 0;
      let failed = 0;

      // Test 1: Initial render time
      const renderStart = performance.now();
      setTimeout(() => {
        const renderTime = performance.now() - renderStart;
        const testPassed = renderTime < 100; // Should render in <100ms
        
        if (testPassed) passed++; else failed++;
        results.push({
          test: 'Initial Render Time',
          passed: testPassed,
          message: `Render time: ${renderTime.toFixed(2)}ms (target: <100ms)`
        });

        // Test 2: Memory usage
        const memoryUsage = this.getMemoryUsage();
        const memoryTestPassed = memoryUsage < 50 * 1024 * 1024; // <50MB
        
        if (memoryTestPassed) passed++; else failed++;
        results.push({
          test: 'Memory Usage',
          passed: memoryTestPassed,
          message: `Memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB (target: <50MB)`
        });

        // Test 3: Bundle size
        const bundleAnalysis = this.analyzeBundleSize();
        const bundleTestPassed = bundleAnalysis.total < 1024 * 1024; // <1MB
        
        if (bundleTestPassed) passed++; else failed++;
        results.push({
          test: 'Bundle Size',
          passed: bundleTestPassed,
          message: `Bundle size: ${(bundleAnalysis.total / 1024).toFixed(1)}KB (target: <1MB)`
        });

        // Test 4: Memory leaks
        const totalComponents = this.metrics.size;
        const componentsWithLeaks = Array.from(this.metrics.keys())
          .filter(name => this.detectMemoryLeaks(name)).length;
        const leakTestPassed = componentsWithLeaks === 0;
        
        if (leakTestPassed) passed++; else failed++;
        results.push({
          test: 'Memory Leaks',
          passed: leakTestPassed,
          message: `Components with leaks: ${componentsWithLeaks}/${totalComponents}`
        });

        resolve({ passed, failed, results });
      }, 1000);
    });
  }

  // Utility methods
  private static getMemoryUsage(): number {
    try {
      if ('memory' in performance) {
        const memoryInfo = (performance as Performance & {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
        }).memory;
        return memoryInfo?.usedJSHeapSize || 0;
      }
    } catch (_error) {
      // Memory API not available or restricted
    }
    return 0;
  }

  private static getBundleSize(): number {
    try {
      const entries = performance.getEntriesByType('resource');
      return entries
        .filter((entry: PerformanceResourceTiming) => 
          entry.name.includes('.js') || entry.name.includes('.css'))
        .reduce((total, entry) => total + (entry.transferSize || 0), 0);
    } catch {
      return 0;
    }
  }

  private static observePerformanceEntry(
    type: string,
    callback: (entries: PerformanceEntry[]) => void
  ): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ entryTypes: [type] });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error);
    }
  }

  private static getCoreWebVitals(): {
    lcp?: number;
    fid?: number;
    cls?: number;
  } {
    const vitals: { lcp?: number; fid?: number; cls?: number } = {};

    try {
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        vitals.lcp = lcpEntries[lcpEntries.length - 1].startTime;
      }

      const fidEntries = performance.getEntriesByType('first-input');
      if (fidEntries.length > 0) {
        const firstInput = fidEntries[0] as PerformanceEventTiming;
        vitals.fid = firstInput.processingStart - firstInput.startTime;
      }

      const clsEntries = performance.getEntriesByType('layout-shift');
      if (clsEntries.length > 0) {
        vitals.cls = clsEntries.reduce((cls, entry) => {
          const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value: number };
          if (!layoutShiftEntry.hadRecentInput) {
            cls += layoutShiftEntry.value;
          }
          return cls;
        }, 0);
      }
    } catch (error) {
      console.warn('Failed to get Core Web Vitals:', error);
    }

    return vitals;
  }

  // Cleanup method
  static cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// React hook for performance testing
export function usePerformanceTesting(componentName: string) {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);
  const endMonitoring = React.useRef<(() => PerformanceMetrics) | null>(null);

  React.useEffect(() => {
    endMonitoring.current = PerformanceTester.startMonitoring(componentName);

    return () => {
      if (endMonitoring.current) {
        const finalMetrics = endMonitoring.current();
        setMetrics(finalMetrics);
      }
    };
  }, [componentName]);

  return {
    metrics,
    generateReport: () => PerformanceTester.generateReport(),
    runTests: () => PerformanceTester.runAutomatedTests(),
  };
}

// Performance testing for development
export function initPerformanceTesting(): void {
  if (process.env.NODE_ENV === 'development') {
    PerformanceTester.initCoreWebVitals();
    
    // Run tests after app loads
    setTimeout(async () => {
      const results = await PerformanceTester.runAutomatedTests();
      console.group('Performance Test Results');
      console.log(`Passed: ${results.passed}, Failed: ${results.failed}`);
      results.results.forEach(result => {
        const method = result.passed ? 'log' : 'warn';
        console[method](`${result.passed ? '✅' : '❌'} ${result.test}: ${result.message}`);
      });
      console.groupEnd();
    }, 3000);

    // Generate report after 10 seconds
    setTimeout(() => {
      const report = PerformanceTester.generateReport();
      console.group('Performance Report');
      console.table(report.summary);
      console.table(report.details);
      console.log('Core Web Vitals:', report.coreWebVitals);
      console.log('Bundle Analysis:', report.bundleAnalysis);
      console.groupEnd();
    }, 10000);
  }
}

export default PerformanceTester;