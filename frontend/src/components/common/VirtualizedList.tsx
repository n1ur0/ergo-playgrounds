import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useVirtualScrolling } from '../../hooks/usePerformanceOptimizations';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  isLoading?: boolean;
}

interface VirtualizedListHandle {
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

export const VirtualizedList = React.forwardRef<VirtualizedListHandle, VirtualizedListProps<unknown>>((props, ref) => {
  const {
    items,
    itemHeight,
    containerHeight,
    renderItem,
  keyExtractor,
  overscan = 5,
  className = '',
    onScroll,
    loadingComponent,
    emptyComponent,
    isLoading = false
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  const { visibleItems, totalHeight, handleScroll, startIndex, endIndex } = useVirtualScrolling(
    items,
    itemHeight,
    containerHeight,
    overscan
  );

  // Memoized scroll handler
  const optimizedScrollHandler = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    handleScroll(event);
    onScroll?.(newScrollTop);
  }, [handleScroll, onScroll]);

  // Memoized visible items rendering
  const renderedItems = useMemo(() => {
    if (isLoading) return loadingComponent || <div className="loading">Loading...</div>;
    if (items.length === 0) return emptyComponent || <div className="empty">No items</div>;

    return visibleItems.map(({ item, index, top }) => (
      <div
        key={keyExtractor(item, index)}
        style={{
          position: 'absolute',
          top: top,
          left: 0,
          right: 0,
          height: itemHeight,
        }}
        className="virtualized-item"
      >
        {renderItem(item, index)}
      </div>
    ));
  }, [visibleItems, renderItem, keyExtractor, itemHeight, isLoading, loadingComponent, emptyComponent, items.length]);

  // Scroll to item programmatically
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const scrollTop = Math.max(0, Math.min(index * itemHeight, totalHeight - containerHeight));
      containerRef.current.scrollTop = scrollTop;
    }
  }, [itemHeight, totalHeight, containerHeight]);

  // Expose scroll methods via imperative API
  React.useImperativeHandle(ref, () => ({
    scrollToIndex,
    scrollToTop: () => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }),
    scrollToBottom: () => containerRef.current?.scrollTo({ top: totalHeight, behavior: 'smooth' })
  }), [scrollToIndex, totalHeight]);

  return (
    <div
      ref={containerRef}
      className={`virtualized-list ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={optimizedScrollHandler}
      role="listbox"
      aria-label={`Virtual list with ${items.length} items`}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
        className="virtualized-content"
      >
        {renderedItems}
      </div>
      
      {/* Scroll indicators */}
      {items.length > 0 && (
        <div className="scroll-indicators">
          <div 
            className="scroll-thumb"
            style={{
              position: 'absolute',
              right: 2,
              width: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 2,
              top: `${(scrollTop / totalHeight) * 100}%`,
              height: `${(containerHeight / totalHeight) * 100}%`,
              minHeight: 20,
              pointerEvents: 'none'
            }}
          />
        </div>
      )}
    </div>
  );
});

// Optimized grid virtualization for 2D layouts
interface VirtualizedGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  gap?: number;
  className?: string;
}

export function VirtualizedGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  keyExtractor,
  gap = 0,
  className = ''
}: VirtualizedGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  
  // Calculate grid dimensions
  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowsCount = Math.ceil(items.length / columnsCount);
  const totalHeight = rowsCount * (itemHeight + gap) - gap;
  
  // Calculate visible range
  const startRow = Math.floor(scrollTop / (itemHeight + gap));
  const endRow = Math.min(
    rowsCount - 1,
    Math.ceil((scrollTop + containerHeight) / (itemHeight + gap))
  );
  
  const visibleItems = useMemo(() => {
    const visible = [];
    for (let row = Math.max(0, startRow - 1); row <= Math.min(rowsCount - 1, endRow + 1); row++) {
      for (let col = 0; col < columnsCount; col++) {
        const index = row * columnsCount + col;
        if (index < items.length) {
          visible.push({
            item: items[index],
            index,
            row,
            col,
            top: row * (itemHeight + gap),
            left: col * (itemWidth + gap)
          });
        }
      }
    }
    return visible;
  }, [items, startRow, endRow, columnsCount, itemHeight, itemWidth, gap, rowsCount]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return (
    <div
      className={`virtualized-grid ${className}`}
      style={{
        height: containerHeight,
        width: containerWidth,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
      role="grid"
      aria-label={`Virtual grid with ${items.length} items`}
    >
      <div
        style={{
          height: totalHeight,
          width: '100%',
          position: 'relative',
        }}
        className="virtualized-grid-content"
      >
        {visibleItems.map(({ item, index, top, left }) => (
          <div
            key={keyExtractor(item, index)}
            style={{
              position: 'absolute',
              top,
              left,
              width: itemWidth,
              height: itemHeight,
            }}
            className="virtualized-grid-item"
            role="gridcell"
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VirtualizedList;