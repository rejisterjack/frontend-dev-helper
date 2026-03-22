/**
 * Flame Graph React Component
 *
 * React-based UI for the Performance Flame Graph feature.
 * Provides a more advanced interface for visualizing and analyzing
 * JavaScript execution and performance bottlenecks.
 */

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlameGraphEntry, PerformanceProfile } from '@/types';

// ============================================
// Types
// ============================================

interface FlameGraphProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: PerformanceProfile | null;
}

interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

interface FilterState {
  minDuration: number;
  types: Set<FlameGraphEntry['type']>;
  searchQuery: string;
}

// ============================================
// Constants
// ============================================

const BAR_HEIGHT = 24;
const BAR_GAP = 2;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 20;
const ZOOM_FACTOR = 1.2;

const TYPE_COLORS: Record<FlameGraphEntry['type'], { bg: string; border: string; text: string }> = {
  script: { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-400' },
  layout: { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-400' },
  paint: { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-400' },
  composite: { bg: 'bg-violet-500', border: 'border-violet-400', text: 'text-violet-400' },
  other: { bg: 'bg-slate-500', border: 'border-slate-400', text: 'text-slate-400' },
};

// ============================================
// Component
// ============================================

export const FlameGraph: React.FC<FlameGraphProps> = ({ isOpen, onClose, profile: externalProfile }) => {
  // State
  const [isProfiling] = useState(false);
  const [profile, setProfile] = useState<PerformanceProfile | null>(externalProfile || null);
  const [view, setView] = useState<ViewState>({ zoom: 1, panX: 0, panY: 0 });
  const [filter, setFilter] = useState<FilterState>({
    minDuration: 1,
    types: new Set(['script', 'layout', 'paint', 'composite', 'other']),
    searchQuery: '',
  });
  const [selectedEntry, setSelectedEntry] = useState<FlameGraphEntry | null>(null);
  const [hoveredEntry, setHoveredEntry] = useState<FlameGraphEntry | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  // ============================================
  // Effects
  // ============================================

  // Update profile when external profile changes
  useEffect(() => {
    if (externalProfile) {
      setProfile(externalProfile);
    }
  }, [externalProfile]);

  // Render canvas when dependencies change
  useEffect(() => {
    if (!isOpen || !profile) return;

    const render = () => {
      renderCanvas();
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, profile, view, filter, hoveredEntry]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      renderCanvas();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================
  // Canvas Rendering
  // ============================================

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !profile) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Filter and process entries
    const filteredEntries = filterEntries(profile.entries);
    
    if (filteredEntries.length === 0) {
      renderEmptyState(ctx, width, height);
      return;
    }

    // Calculate dimensions
    const totalDuration = profile.summary.totalDuration || 1;
    const pixelsPerMs = (width / totalDuration) * view.zoom;

    // Render time axis
    renderTimeAxis(ctx, width, pixelsPerMs, totalDuration);

    // Render flame graph bars
    renderBars(ctx, filteredEntries, width, height, pixelsPerMs);
  }, [profile, view, filter]);

  const filterEntries = (entries: FlameGraphEntry[]): FlameGraphEntry[] => {
    const result: FlameGraphEntry[] = [];

    const traverse = (entry: FlameGraphEntry) => {
      const matchesType = filter.types.has(entry.type);
      const matchesDuration = entry.duration >= filter.minDuration;
      const matchesSearch = !filter.searchQuery || 
        entry.name.toLowerCase().includes(filter.searchQuery.toLowerCase());

      if (matchesType && matchesDuration && matchesSearch) {
        result.push(entry);
      }

      entry.children.forEach(traverse);
    };

    entries.forEach(traverse);
    return result;
  };

  const renderEmptyState = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      filter.searchQuery 
        ? 'No matching entries found'
        : 'No data available. Start profiling to collect performance data.',
      width / 2,
      height / 2
    );
  };

  const renderTimeAxis = (
    ctx: CanvasRenderingContext2D,
    width: number,
    pixelsPerMs: number,
    totalDuration: number
  ) => {
    const axisY = 36;

    // Draw axis line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(width, axisY);
    ctx.stroke();

    // Draw time markers
    const timeStep = calculateTimeStep(pixelsPerMs);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';

    for (let t = 0; t <= totalDuration; t += timeStep) {
      const x = view.panX + t * pixelsPerMs;
      if (x >= -50 && x <= width + 50) {
        // Tick mark
        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(x, axisY - 5);
        ctx.lineTo(x, axisY);
        ctx.stroke();

        // Label
        ctx.fillText(formatTime(t), x, axisY - 10);
      }
    }
  };

  const renderBars = (
    ctx: CanvasRenderingContext2D,
    entries: FlameGraphEntry[],
    width: number,
    height: number,
    pixelsPerMs: number
  ) => {
    const startY = 48;

    for (const entry of entries) {
      const x = view.panX + entry.startTime * pixelsPerMs;
      const barWidth = Math.max(2, entry.duration * pixelsPerMs);
      const y = startY + entry.depth * (BAR_HEIGHT + BAR_GAP);

      // Skip if outside visible area
      if (x + barWidth < 0 || x > width || y > height) {
        continue;
      }

      const isHovered = hoveredEntry?.id === entry.id;
      const isSelected = selectedEntry?.id === entry.id;

      // Draw bar background
      const baseColor = getEntryColor(entry.type);
      ctx.fillStyle = isHovered || isSelected ? lightenColor(baseColor, 20) : baseColor;
      
      // Rounded rect
      const radius = 3;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, BAR_HEIGHT, radius);
      ctx.fill();

      // Border
      if (isSelected) {
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Text label
      if (barWidth > 60) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.textBaseline = 'middle';
        
        const text = truncateText(ctx, entry.name, barWidth - 10);
        ctx.fillText(text, x + 5, y + BAR_HEIGHT / 2);

        // Duration label
        if (barWidth > 100) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = '10px system-ui, -apple-system, sans-serif';
          const durationText = formatDuration(entry.duration);
          ctx.fillText(durationText, x + 5, y + BAR_HEIGHT / 2 + 12);
        }
      }
    }
  };

  // ============================================
  // Event Handlers
  // ============================================

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const zoomDirection = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom * zoomDirection));

    if (newZoom !== view.zoom) {
      // Zoom towards mouse position
      const newPanX = mouseX - (mouseX - view.panX) * (newZoom / view.zoom);
      
      setView(prev => ({
        ...prev,
        zoom: newZoom,
        panX: newPanX,
      }));
    }
  }, [view.zoom, view.panX]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - view.panX, y: e.clientY });
  }, [view.panX]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      setView(prev => ({
        ...prev,
        panX: e.clientX - dragStart.x,
      }));
    } else {
      // Find hovered entry
      const entry = getEntryAtPosition(x, y);
      setHoveredEntry(entry);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, view, profile, filter]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const entry = getEntryAtPosition(x, y);
    setSelectedEntry(entry);
  }, [view, profile, filter]);

  const getEntryAtPosition = (x: number, y: number): FlameGraphEntry | null => {
    if (!profile) return null;

    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const totalDuration = profile.summary.totalDuration || 1;
    const pixelsPerMs = (width / totalDuration) * view.zoom;
    const startY = 48;

    const filteredEntries = filterEntries(profile.entries);

    for (const entry of filteredEntries) {
      const entryX = view.panX + entry.startTime * pixelsPerMs;
      const entryWidth = Math.max(2, entry.duration * pixelsPerMs);
      const entryY = startY + entry.depth * (BAR_HEIGHT + BAR_GAP);

      if (x >= entryX && x <= entryX + entryWidth && y >= entryY && y <= entryY + BAR_HEIGHT) {
        return entry;
      }
    }

    return null;
  };

  // ============================================
  // Actions
  // ============================================

  const handleZoomIn = () => {
    setView(prev => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, prev.zoom * ZOOM_FACTOR),
    }));
  };

  const handleZoomOut = () => {
    setView(prev => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, prev.zoom / ZOOM_FACTOR),
    }));
  };

  const handleResetView = () => {
    setView({ zoom: 1, panX: 0, panY: 0 });
  };

  const handleToggleType = (type: FlameGraphEntry['type']) => {
    setFilter(prev => {
      const newTypes = new Set(prev.types);
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      return { ...prev, types: newTypes };
    });
  };

  const handleExport = () => {
    if (!profile) return;

    const dataStr = JSON.stringify(profile, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `flame-graph-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  // ============================================
  // Computed Values
  // ============================================

  const stats = useMemo(() => {
    if (!profile) return null;

    const { summary } = profile;
    const totalEntries = countEntries(profile.entries);

    return {
      totalDuration: summary.totalDuration.toFixed(0),
      scriptTime: summary.scriptTime.toFixed(0),
      layoutTime: summary.layoutTime.toFixed(0),
      paintTime: summary.paintTime.toFixed(0),
      longTasks: summary.longTasks,
      totalEntries,
    };
  }, [profile]);

  const countEntries = (entries: FlameGraphEntry[]): number => {
    let count = entries.length;
    for (const entry of entries) {
      count += countEntries(entry.children);
    }
    return count;
  };

  // ============================================
 // Render Helpers
  // ============================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl h-[85vh] overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-white/10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <h2 className="font-semibold text-white">Performance Flame Graph</h2>
              <p className="text-xs text-slate-400">
                {isProfiling 
                  ? 'Profiling in progress...' 
                  : profile 
                    ? `${stats?.totalEntries} entries • ${stats?.totalDuration}ms total`
                    : 'Ready to profile'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={!profile}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
            >
              <span>📤</span>
              Export
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2 bg-slate-800/50">
          {/* Type Filters */}
          <div className="flex items-center gap-3">
            {(['script', 'layout', 'paint', 'composite', 'other'] as const).map((type) => (
              <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filter.types.has(type)}
                  onChange={() => handleToggleType(type)}
                  className="rounded border-slate-600"
                />
                <span className={`text-xs capitalize ${TYPE_COLORS[type].text}`}>
                  {type}
                </span>
              </label>
            ))}
          </div>

          {/* Search & Threshold */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Min duration:</span>
              <input
                type="range"
                min="0"
                max="50"
                value={filter.minDuration}
                onChange={(e) => setFilter(prev => ({ ...prev, minDuration: Number.parseInt(e.target.value, 10) }))}
                className="w-24"
              />
              <span className="text-xs text-slate-400 w-12">{filter.minDuration}ms</span>
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={filter.searchQuery}
              onChange={(e) => setFilter(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Canvas Container */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-slate-950"
        >
          <canvas
            ref={canvasRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          />

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-slate-800 rounded-lg p-1 shadow-lg">
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 text-slate-300"
            >
              −
            </button>
            <span className="w-16 text-center text-xs text-slate-400">
              {Math.round(view.zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 text-slate-300"
            >
              +
            </button>
            <button
              onClick={handleResetView}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 text-slate-300"
              title="Reset view"
            >
              ⌖
            </button>
          </div>

          {/* Tooltip */}
          {hoveredEntry && (
            <div
              className="absolute z-50 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl pointer-events-none max-w-xs"
              style={{
                left: Math.min(tooltipPos.x - 100, (containerRef.current?.clientWidth || 0) - 220),
                top: Math.min(tooltipPos.y + 20, (containerRef.current?.clientHeight || 0) - 150),
              }}
            >
              <div className="font-medium text-white text-sm mb-1 truncate">
                {hoveredEntry.name}
              </div>
              <div className="text-xs text-slate-400 space-y-0.5">
                <div className="flex justify-between gap-4">
                  <span>Duration:</span>
                  <span className="text-slate-200">{hoveredEntry.duration.toFixed(2)}ms</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Type:</span>
                  <span className={`capitalize ${TYPE_COLORS[hoveredEntry.type].text}`}>
                    {hoveredEntry.type}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Start:</span>
                  <span className="text-slate-200">{hoveredEntry.startTime.toFixed(2)}ms</span>
                </div>
                {hoveredEntry.children.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <span>Children:</span>
                    <span className="text-slate-200">{hoveredEntry.children.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="flex items-center justify-between border-t border-slate-700 px-4 py-2 bg-slate-800/50">
            <div className="flex items-center gap-6 text-xs">
              <span className="text-slate-400">
                Total: <span className="text-slate-200">{stats.totalDuration}ms</span>
              </span>
              <span className="text-slate-400">
                Script: <span className="text-amber-400">{stats.scriptTime}ms</span>
              </span>
              <span className="text-slate-400">
                Layout: <span className="text-blue-400">{stats.layoutTime}ms</span>
              </span>
              <span className="text-slate-400">
                Paint: <span className="text-emerald-400">{stats.paintTime}ms</span>
              </span>
              <span className="text-slate-400">
                Long Tasks: <span className="text-red-400">{stats.longTasks}</span>
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Scroll to zoom • Drag to pan • Click for details
            </div>
          </div>
        )}

        {/* Selected Entry Details */}
        {selectedEntry && (
          <div className="border-t border-slate-700 bg-slate-800/50 px-4 py-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs uppercase px-2 py-0.5 rounded ${TYPE_COLORS[selectedEntry.type].bg} text-white`}>
                    {selectedEntry.type}
                  </span>
                  <span className="font-medium text-white">{selectedEntry.name}</span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Duration:</span>
                    <span className="ml-2 text-slate-200">{selectedEntry.duration.toFixed(3)}ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Start:</span>
                    <span className="ml-2 text-slate-200">{selectedEntry.startTime.toFixed(3)}ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500">End:</span>
                    <span className="ml-2 text-slate-200">{selectedEntry.endTime.toFixed(3)}ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Depth:</span>
                    <span className="ml-2 text-slate-200">{selectedEntry.depth}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// Utility Functions
// ============================================

function calculateTimeStep(pixelsPerMs: number): number {
  const minPixelSpacing = 60;
  const rawStep = minPixelSpacing / pixelsPerMs;
  
  // Round to nice numbers
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  for (const step of steps) {
    if (step >= rawStep) return step;
  }
  return steps[steps.length - 1];
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getEntryColor(type: FlameGraphEntry['type']): string {
  const colors: Record<FlameGraphEntry['type'], string> = {
    script: '#f59e0b',
    layout: '#3b82f6',
    paint: '#10b981',
    composite: '#8b5cf6',
    other: '#64748b',
  };
  return colors[type];
}

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return `#${(
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  )
    .toString(16)
    .slice(1)}`;
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  if (truncated.length < text.length) {
    truncated = `${truncated.slice(0, -3)}...`;
  }
  return truncated || text.slice(0, 1);
}

export default FlameGraph;
