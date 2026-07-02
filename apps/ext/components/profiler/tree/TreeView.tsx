/**
 * TreeView — virtualized component hierarchy with perf badges.
 *
 * Ported from react-perf-profiler/apps/ext/src/panel/components/tree/TreeView.tsx.
 */

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type KeyboardEvent,
} from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { FiberData, WastedRenderReport } from "@repo/profiler-contract";
import { TreeNode } from "./TreeNode";
import { TreeSearch } from "./TreeSearch";
import { TreeContextMenu } from "./TreeContextMenu";
import { useDebounce } from "@/hooks/profiler/useDebounce";
import { useResizeObserver } from "@/hooks/profiler/useResizeObserver";

interface TreeViewProps {
  fibers: FiberData[];
  selectedComponent: string | null;
  onSelectComponent: (id: string) => void;
  filterText: string;
  wastedRenderReports?: WastedRenderReport[];
  onViewAnalysis?: (componentName: string) => void;
}

interface FlatNode {
  fiber: FiberData;
  depth: number;
  hasChildren: boolean;
}

const ROW_HEIGHT = 24;
const OVERSCAN = 10;

type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";

function findRoots(fibers: FiberData[]): FiberData[] {
  const idSet = new Set(fibers.map((f) => f.id));
  return fibers.filter((f) => !f.return || !idSet.has(f.return.id));
}

function flattenVisibleTree(
  roots: FiberData[],
  expanded: Set<string>,
): FlatNode[] {
  const result: FlatNode[] = [];

  function walk(fiber: FiberData, depth: number) {
    const child = fiber.child;
    const hasChildren = child !== null;
    result.push({ fiber, depth, hasChildren });

    if (hasChildren && expanded.has(fiber.id)) {
      let sibling: FiberData | null = child;
      while (sibling !== null) {
        walk(sibling, depth + 1);
        sibling = sibling.sibling;
      }
    }
  }

  for (const root of roots) {
    walk(root, 0);
  }
  return result;
}

function filterFlatNodes(nodes: FlatNode[], filter: string): FlatNode[] {
  if (!filter) return nodes;

  const lower = filter.toLowerCase();
  const matched = new Set<number>();
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].fiber.displayName.toLowerCase().includes(lower)) {
      matched.add(i);
    }
  }

  const visible = new Set<number>(matched);
  const depthStack: number[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    while (
      depthStack.length > 0 &&
      nodes[depthStack[depthStack.length - 1]!]!.depth >= node.depth
    ) {
      depthStack.pop();
    }
    depthStack.push(i);

    if (matched.has(i)) {
      for (const ancestorIdx of depthStack) {
        visible.add(ancestorIdx);
      }
    }
  }

  return nodes.filter((_, i) => visible.has(i));
}

export function TreeView({
  fibers,
  selectedComponent,
  onSelectComponent,
  filterText,
  wastedRenderReports = [],
  onViewAnalysis,
}: TreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState(filterText);
  const debouncedFilter = useDebounce(searchValue, 150);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const containerSize = useResizeObserver(scrollRef);

  const wasteByComponent = useMemo(() => {
    const map = new Map<
      string,
      { renderCount: number; wasteRate: number; severity: string }
    >();
    for (const report of wastedRenderReports) {
      map.set(report.componentName, {
        renderCount: report.totalRenders,
        wasteRate: report.wastedRenderRate,
        severity: report.severity,
      });
    }
    return map;
  }, [wastedRenderReports]);

  const fiberRenderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const fiber of fibers) {
      if (fiber.displayName) {
        counts.set(fiber.displayName, (counts.get(fiber.displayName) ?? 0) + 1);
      }
    }
    return counts;
  }, [fibers]);

  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const report of wastedRenderReports) {
      counts[report.severity]++;
    }
    return counts;
  }, [wastedRenderReports]);

  useEffect(() => {
    if (fibers.length === 0) return;
    const roots = findRoots(fibers);
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;

      function expandToDepth(fiber: FiberData, depth: number) {
        if (depth <= 0) return;
        if (!next.has(fiber.id)) {
          next.add(fiber.id);
          changed = true;
        }
        let child: FiberData | null = fiber.child;
        while (child !== null) {
          expandToDepth(child, depth - 1);
          child = child.sibling;
        }
      }

      for (const root of roots) {
        expandToDepth(root, 4);
      }
      return changed ? next : prev;
    });
  }, [fibers]);

  useEffect(() => {
    setSearchValue(filterText);
  }, [filterText]);

  const flatNodes = useMemo(() => {
    const roots = findRoots(fibers);
    const visible = flattenVisibleTree(roots, expanded);
    const textFiltered = filterFlatNodes(visible, debouncedFilter);

    if (severityFilter === "all") return textFiltered;

    return textFiltered.filter((node) => {
      const waste = wasteByComponent.get(node.fiber.displayName);
      if (!waste) return false;
      return waste.severity === severityFilter;
    });
  }, [fibers, expanded, debouncedFilter, severityFilter, wasteByComponent]);

  const viewportHeight = containerSize.height || 400;
  const totalHeight = flatNodes.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    flatNodes.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  );
  const visibleNodes = flatNodes.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollToIndex = (index: number) => {
    const targetTop = index * ROW_HEIGHT;
    if (scrollRef.current) {
      const viewTop = scrollRef.current.scrollTop;
      const viewBottom = viewTop + viewportHeight;
      if (targetTop < viewTop || targetTop + ROW_HEIGHT > viewBottom) {
        scrollRef.current.scrollTop =
          targetTop - viewportHeight / 2 + ROW_HEIGHT;
      }
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const nodeCount = flatNodes.length;
      if (nodeCount === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = Math.min(prev + 1, nodeCount - 1);
            scrollToIndex(next);
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            scrollToIndex(next);
            return next;
          });
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          scrollToIndex(0);
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(nodeCount - 1);
          scrollToIndex(nodeCount - 1);
          break;
        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < nodeCount) {
            onSelectComponent(flatNodes[focusedIndex].fiber.id);
          }
          break;
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < nodeCount) {
            handleToggle(flatNodes[focusedIndex].fiber.id);
          }
          break;
        case "m":
          if (focusedIndex >= 0 && focusedIndex < nodeCount && onViewAnalysis) {
            onViewAnalysis(flatNodes[focusedIndex].fiber.displayName);
          }
          break;
        case "s": {
          if (focusedIndex >= 0 && focusedIndex < nodeCount) {
            const fiber = flatNodes[focusedIndex].fiber;
            if (fiber.sourceLocation?.fileName) {
              const line = fiber.sourceLocation.lineNumber ?? 1;
              window.open(
                `vscode://file/${fiber.sourceLocation.fileName}:${line}`,
              );
            }
          }
          break;
        }
        case "/":
          e.preventDefault();
          {
            const searchInput = containerRef.current?.querySelector("input");
            searchInput?.focus();
          }
          break;
      }
    },
    [flatNodes, focusedIndex, onSelectComponent, handleToggle, onViewAnalysis],
  );

  const handleCopyName = useCallback((name: string) => {
    navigator.clipboard.writeText(name);
  }, []);

  const severityFilters: Array<{
    value: SeverityFilter;
    label: string;
    color: string;
  }> = [
    { value: "all", label: "All", color: "" },
    {
      value: "critical",
      label: `Critical (${severityCounts.critical})`,
      color: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
    },
    {
      value: "high",
      label: `High (${severityCounts.high})`,
      color:
        "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400",
    },
    {
      value: "medium",
      label: `Medium (${severityCounts.medium})`,
      color:
        "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
    },
    {
      value: "low",
      label: `Low (${severityCounts.low})`,
      color:
        "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400",
    },
  ];

  if (fibers.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-2 py-1.5 border-b border-border">
          <TreeSearch value={searchValue} onChange={setSearchValue} />
        </div>
        <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
          No component data available.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      <div className="px-2 py-1.5 border-b border-border">
        <TreeSearch value={searchValue} onChange={setSearchValue} />
      </div>

      {wastedRenderReports.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 border-b border-border overflow-x-auto">
          {severityFilters.map((sf) => (
            <button
              key={sf.value}
              onClick={() => setSeverityFilter(sf.value)}
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium border transition-colors",
                severityFilter === sf.value
                  ? sf.color || "bg-muted text-foreground border-border"
                  : "text-muted-foreground border-transparent hover:bg-muted/50",
              )}
            >
              {sf.label}
            </button>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative"
          style={{ height: totalHeight, overflow: "hidden" }}
          role="tree"
          aria-label="Component tree"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleNodes.map((node, idx) => {
              const globalIdx = startIndex + idx;
              const wasteData = wasteByComponent.get(node.fiber.displayName);
              const renderCount =
                wasteData?.renderCount ??
                fiberRenderCounts.get(node.fiber.displayName) ??
                0;
              const wasteRate = wasteData?.wasteRate ?? 0;
              const isMemoized = node.fiber.tag === 14 || node.fiber.tag === 15;
              const isFocused = globalIdx === focusedIndex;

              return (
                <TreeContextMenu
                  key={node.fiber.id}
                  componentName={node.fiber.displayName}
                  sourceLocation={node.fiber.sourceLocation}
                  hasChildren={node.hasChildren}
                  isExpanded={expanded.has(node.fiber.id)}
                  onViewAnalysis={() =>
                    onViewAnalysis?.(node.fiber.displayName)
                  }
                  onOpenInEditor={() => {
                    if (node.fiber.sourceLocation?.fileName) {
                      window.open(
                        `vscode://file/${node.fiber.sourceLocation.fileName}:${node.fiber.sourceLocation.lineNumber ?? 1}`,
                      );
                    }
                  }}
                  onCopyName={() => handleCopyName(node.fiber.displayName)}
                  onToggleExpand={() => handleToggle(node.fiber.id)}
                >
                  <div
                    className={cn(
                      "rounded-sm transition-colors",
                      isFocused && "ring-1 ring-primary/50 bg-accent/50",
                    )}
                  >
                    <TreeNode
                      name={node.fiber.displayName}
                      duration={node.fiber.actualDuration ?? 0}
                      renderCount={renderCount}
                      isMemoized={isMemoized}
                      wasteRate={wasteRate}
                      isExpanded={expanded.has(node.fiber.id)}
                      hasChildren={node.hasChildren}
                      depth={node.depth}
                      isSelected={node.fiber.id === selectedComponent}
                      onToggle={() => handleToggle(node.fiber.id)}
                      onSelect={() => {
                        setFocusedIndex(globalIdx);
                        onSelectComponent(node.fiber.id);
                      }}
                    />
                  </div>
                </TreeContextMenu>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
