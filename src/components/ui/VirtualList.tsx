/**
 * Virtual List Component
 *
 * Efficiently renders large lists by only rendering visible items.
 * Uses intersection observer for viewport detection.
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Container height (optional, defaults to 100%) */
  height?: number | string;
  /** Number of items to render above/below viewport (for smooth scrolling) */
  overscan?: number;
  /** Unique key extractor for items */
  keyExtractor: (item: T, index: number) => string;
  /** Optional className for container */
  className?: string;
  /** Callback when scroll reaches end */
  onEndReached?: () => void;
  /** Threshold from bottom to trigger onEndReached (px) */
  endReachedThreshold?: number;
}

interface VisibleRange {
  startIndex: number;
  endIndex: number;
}

/**
 * VirtualList - Renders only visible items for performance
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  height = '100%',
  overscan = 5,
  keyExtractor,
  className,
  onEndReached,
  endReachedThreshold = 100,
}: VirtualListProps<T>): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState<VisibleRange>({ startIndex: 0, endIndex: 20 });
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate total height of all items
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  // Calculate visible range based on scroll position
  const calculateVisibleRange = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, clientHeight } = container;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + clientHeight) / itemHeight) + overscan
    );

    setVisibleRange({ startIndex, endIndex });
    setContainerHeight(clientHeight);

    // Check if we've reached the end
    if (onEndReached) {
      const scrollBottom = scrollTop + clientHeight;
      const totalContentHeight = items.length * itemHeight;
      if (totalContentHeight - scrollBottom < endReachedThreshold) {
        onEndReached();
      }
    }
  }, [items.length, itemHeight, overscan, onEndReached, endReachedThreshold]);

  // Update container height on mount and resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
        calculateVisibleRange();
      }
    });

    resizeObserver.observe(container);
    calculateVisibleRange();

    return () => resizeObserver.disconnect();
  }, [calculateVisibleRange]);

  // Handle scroll events with RAF for performance
  const scrollTimeoutRef = useRef<number | null>(null);
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      cancelAnimationFrame(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = requestAnimationFrame(calculateVisibleRange);
  }, [calculateVisibleRange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Memoize visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  // Calculate offset for the first visible item
  const topOffset = visibleRange.startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      {/* Spacer to maintain scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Render only visible items */}
        <div
          style={{
            position: 'absolute',
            top: topOffset,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.startIndex + index;
            return (
              <div
                key={keyExtractor(item, actualIndex)}
                style={{ height: itemHeight }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VirtualList;
