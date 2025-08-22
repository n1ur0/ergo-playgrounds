import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { useThrottle, useDebounce, performanceUtils } from '../../hooks/usePerformanceOptimizations';
import type { ContractComponent, Connection, Position } from '../../types/contractDesigner';

// Performance-optimized canvas renderer
interface CanvasPerformanceManagerProps {
  components: ContractComponent[];
  connections: Connection[];
  selectedComponent: string | null;
  zoomLevel: number;
  canvasOffset: Position;
  onRender?: (metrics: RenderMetrics) => void;
  enableOptimizations?: boolean;
}

interface RenderMetrics {
  renderTime: number;
  componentCount: number;
  connectionCount: number;
  visibleComponents: number;
  skippedComponents: number;
  frameRate: number;
}

interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Canvas optimization strategies
export class CanvasOptimizer {
  private static viewportBounds: ViewportBounds = { left: 0, top: 0, right: 0, bottom: 0 };
  private static renderCache = new Map<string, { component: ContractComponent; renderedElement: React.ReactNode }>();
  private static frameTime: number[] = [];
  private static lastRenderTime = 0;

  // Calculate viewport bounds for culling
  static updateViewportBounds(
    containerWidth: number, 
    containerHeight: number, 
    zoomLevel: number, 
    canvasOffset: Position
  ): ViewportBounds {
    const buffer = 200; // Extra buffer for smooth scrolling
    
    this.viewportBounds = {
      left: (-canvasOffset.x - buffer) / zoomLevel,
      top: (-canvasOffset.y - buffer) / zoomLevel,
      right: (-canvasOffset.x + containerWidth + buffer) / zoomLevel,
      bottom: (-canvasOffset.y + containerHeight + buffer) / zoomLevel
    };
    
    return this.viewportBounds;
  }

  // Check if component is visible in viewport
  static isComponentVisible(component: ContractComponent): boolean {
    const { position, size } = component;
    const bounds = this.viewportBounds;
    
    return !(
      position.x > bounds.right ||
      position.x + size.width < bounds.left ||
      position.y > bounds.bottom ||
      position.y + size.height < bounds.top
    );
  }

  // Level of Detail (LOD) rendering based on zoom
  static getComponentLOD(zoomLevel: number): 'high' | 'medium' | 'low' {
    if (zoomLevel >= 1) return 'high';
    if (zoomLevel >= 0.5) return 'medium';
    return 'low';
  }

  // Batch render operations
  static batchRender<T>(
    items: T[], 
    renderFn: (item: T) => React.ReactNode,
    batchSize: number = 10
  ): React.ReactNode[] {
    const results: React.ReactNode[] = [];
    const processor = performanceUtils.createBatchProcessor(
      (batch: T[]) => {
        batch.forEach(item => results.push(renderFn(item)));
      },
      batchSize
    );

    items.forEach(item => processor.add(item));
    processor.flush();
    
    return results;
  }

  // Connection path optimization
  static optimizeConnectionPath(
    start: Position, 
    end: Position, 
    complexity: 'simple' | 'curved' | 'orthogonal'
  ): string {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    switch (complexity) {
      case 'simple':
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      
      case 'curved': {
        const cp1x = start.x + dx * 0.5;
        const cp1y = start.y;
        const cp2x = end.x - dx * 0.5;
        const cp2y = end.y;
        return `M ${start.x} ${start.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${end.x} ${end.y}`;
      }
      
      case 'orthogonal': {
        const midX = start.x + dx * 0.5;
        return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
      }
      
      default:
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }
  }

  // Frame rate tracking
  static trackFrameRate(): number {
    const now = performance.now();
    if (this.lastRenderTime > 0) {
      const frameTime = now - this.lastRenderTime;
      this.frameTime.push(frameTime);
      
      // Keep last 60 frames
      if (this.frameTime.length > 60) {
        this.frameTime.shift();
      }
    }
    
    this.lastRenderTime = now;
    
    // Calculate average FPS
    if (this.frameTime.length > 0) {
      const avgFrameTime = this.frameTime.reduce((a, b) => a + b, 0) / this.frameTime.length;
      return Math.round(1000 / avgFrameTime);
    }
    
    return 60;
  }

  // Clear caches for memory management
  static clearCaches(): void {
    this.renderCache.clear();
    this.frameTime = [];
  }
}

// Performance monitoring component
const PerformanceMonitor: React.FC<{
  metrics: RenderMetrics;
  onToggle: () => void;
  visible: boolean;
}> = React.memo(({ metrics, onToggle, visible }) => {
  if (!visible) {
    return (
      <button 
        className="performance-toggle" 
        onClick={onToggle}
        title="Show Performance Metrics"
      >
        📊
      </button>
    );
  }

  return (
    <div className="performance-monitor">
      <div className="monitor-header">
        <span>Performance Metrics</span>
        <button onClick={onToggle}>✕</button>
      </div>
      <div className="monitor-content">
        <div className="metric">
          <span className="metric-label">Render Time:</span>
          <span className="metric-value">{metrics.renderTime.toFixed(2)}ms</span>
        </div>
        <div className="metric">
          <span className="metric-label">Frame Rate:</span>
          <span className={`metric-value ${metrics.frameRate < 30 ? 'warning' : 'good'}`}>
            {metrics.frameRate}fps
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Components:</span>
          <span className="metric-value">{metrics.componentCount}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Visible:</span>
          <span className="metric-value">{metrics.visibleComponents}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Culled:</span>
          <span className="metric-value">{metrics.skippedComponents}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Connections:</span>
          <span className="metric-value">{metrics.connectionCount}</span>
        </div>
      </div>
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

// Main performance manager hook
export function useCanvasPerformance({
  components,
  connections,
  zoomLevel,
  canvasOffset,
  containerWidth = 800,
  containerHeight = 600,
  enableOptimizations = true
}: {
  components: ContractComponent[];
  connections: Connection[];
  zoomLevel: number;
  canvasOffset: Position;
  containerWidth?: number;
  containerHeight?: number;
  enableOptimizations?: boolean;
}) {
  const renderStartTime = useRef<number>(0);
  const [showMetrics, setShowMetrics] = React.useState(false);
  const [renderMetrics, setRenderMetrics] = React.useState<RenderMetrics>({
    renderTime: 0,
    componentCount: 0,
    connectionCount: 0,
    visibleComponents: 0,
    skippedComponents: 0,
    frameRate: 60
  });

  // Update viewport bounds when view changes
  useEffect(() => {
    if (enableOptimizations) {
      CanvasOptimizer.updateViewportBounds(containerWidth, containerHeight, zoomLevel, canvasOffset);
    }
  }, [containerWidth, containerHeight, zoomLevel, canvasOffset, enableOptimizations]);

  // Throttled render function to prevent excessive re-renders
  const throttledRender = useThrottle((callback: () => void) => {
    renderStartTime.current = performance.now();
    callback();
    
    const renderTime = performance.now() - renderStartTime.current;
    const frameRate = CanvasOptimizer.trackFrameRate();
    
    setRenderMetrics(prev => ({
      ...prev,
      renderTime,
      frameRate
    }));
  }, 16); // ~60fps

  // Memoized visible components for culling
  const visibleComponents = useMemo(() => {
    if (!enableOptimizations) return components;
    
    const visible = components.filter(component => 
      CanvasOptimizer.isComponentVisible(component)
    );
    
    setRenderMetrics(prev => ({
      ...prev,
      componentCount: components.length,
      visibleComponents: visible.length,
      skippedComponents: components.length - visible.length
    }));
    
    return visible;
  }, [components, enableOptimizations, zoomLevel, canvasOffset]);

  // Memoized visible connections
  const visibleConnections = useMemo(() => {
    if (!enableOptimizations) return connections;
    
    const visibleComponentIds = new Set(visibleComponents.map(c => c.id));
    const visible = connections.filter(connection => 
      visibleComponentIds.has(connection.sourceId) || 
      visibleComponentIds.has(connection.targetId)
    );
    
    setRenderMetrics(prev => ({
      ...prev,
      connectionCount: visible.length
    }));
    
    return visible;
  }, [connections, visibleComponents, enableOptimizations]);

  // Level of detail for rendering
  const renderLOD = useMemo(() => {
    return CanvasOptimizer.getComponentLOD(zoomLevel);
  }, [zoomLevel]);

  // Optimized render function with batching
  const renderWithBatching = useCallback(<T,>(
    items: T[],
    renderFn: (item: T) => React.ReactNode,
    batchSize?: number
  ) => {
    if (!enableOptimizations) {
      return items.map(renderFn);
    }
    
    return CanvasOptimizer.batchRender(items, renderFn, batchSize);
  }, [enableOptimizations]);

  // Memory cleanup
  useEffect(() => {
    return () => {
      CanvasOptimizer.clearCaches();
    };
  }, []);

  return {
    visibleComponents,
    visibleConnections,
    renderLOD,
    renderMetrics,
    showMetrics,
    throttledRender,
    renderWithBatching,
    setShowMetrics,
    PerformanceMonitor: useCallback(
      () => (
        <PerformanceMonitor
          metrics={renderMetrics}
          onToggle={() => setShowMetrics(!showMetrics)}
          visible={showMetrics}
        />
      ),
      [renderMetrics, showMetrics]
    )
  };
}

export default CanvasOptimizer;