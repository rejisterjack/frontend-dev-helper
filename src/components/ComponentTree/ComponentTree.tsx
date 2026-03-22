/**
 * Component Tree Visualizer - React Component
 *
 * React-based UI for the Component Tree Visualizer feature.
 * Provides a rich interface for viewing and interacting with
 * component hierarchies from React, Vue, Angular, and Svelte.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentNode, ComponentTreeState, FrameworkType } from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Props Interface
// ============================================

interface ComponentTreeProps {
  isOpen: boolean;
  onClose: () => void;
  framework?: FrameworkType;
}

// ============================================
// Icons
// ============================================

const FrameworkIcon: React.FC<{ framework: FrameworkType }> = ({ framework }) => {
  switch (framework) {
    case 'react':
      return <span title="React">⚛️</span>;
    case 'vue':
      return <span title="Vue">🟢</span>;
    case 'angular':
      return <span title="Angular">🅰️</span>;
    case 'svelte':
      return <span title="Svelte">🔶</span>;
    default:
      return <span title="Unknown">🌲</span>;
  }
};

const TypeIcon: React.FC<{ type: ComponentNode['type'] }> = ({ type }) => {
  switch (type) {
    case 'component':
      return <span title="Component">⚙️</span>;
    case 'element':
      return <span title="Element">📄</span>;
    case 'text':
      return <span title="Text">📝</span>;
    case 'fragment':
      return <span title="Fragment">🧩</span>;
    default:
      return <span title="Unknown">📦</span>;
  }
};

// ============================================
// Tree Node Component
// ============================================

interface TreeNodeProps {
  node: ComponentNode;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (nodeId: string) => void;
  onSelect: (node: ComponentNode) => void;
  searchQuery: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  searchQuery,
}) => {
  const hasChildren = node.hasChildren && node.children.length > 0;
  const indent = node.depth * 16;

  // Check if node matches search
  const matchesSearch = useMemo(() => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      node.name.toLowerCase().includes(query) ||
      Object.keys(node.props || {}).some((key) => key.toLowerCase().includes(query)) ||
      Object.values(node.props || {}).some((val) =>
        String(val).toLowerCase().includes(query)
      )
    );
  }, [node, searchQuery]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(node.id);
    },
    [node.id, onToggle]
  );

  const handleSelect = useCallback(() => {
    onSelect(node);
  }, [node, onSelect]);

  if (!matchesSearch && !hasChildren) {
    return null;
  }

  return (
    <>
      <div
        className={`
          flex cursor-pointer select-none items-center gap-1.5 py-1.5 pr-4
          transition-colors hover:bg-slate-800
          ${isSelected ? 'bg-indigo-600 text-white' : 'text-slate-300'}
        `}
        style={{ paddingLeft: `${indent + 16}px` }}
        onClick={handleSelect}
      >
        {/* Toggle button */}
        <button
          onClick={handleToggle}
          className={`
            flex h-4 w-4 items-center justify-center rounded text-xs
            ${hasChildren ? 'text-slate-500 hover:text-slate-300' : 'invisible'}
          `}
          disabled={!hasChildren}
        >
          {hasChildren && (isExpanded ? '▼' : '▶')}
        </button>

        {/* Type icon */}
        <TypeIcon type={node.type} />

        {/* Framework icon */}
        <FrameworkIcon framework={node.framework} />

        {/* Node name */}
        <span
          className="flex-1 truncate font-mono text-sm"
          title={getNodeTooltip(node)}
        >
          {highlightMatch(node.name, searchQuery)}
        </span>

        {/* Props badge */}
        {node.props && Object.keys(node.props).length > 0 && (
          <span
            className={`
              rounded-full px-2 py-0.5 text-[10px]
              ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}
            `}
          >
            {Object.keys(node.props).length}
          </span>
        )}
      </div>

      {/* Children */}
      {isExpanded &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            isExpanded={false} // Managed by parent
            isSelected={false}
            onToggle={onToggle}
            onSelect={onSelect}
            searchQuery={searchQuery}
          />
        ))}
    </>
  );
};

// ============================================
// Helper Functions
// ============================================

function getNodeTooltip(node: ComponentNode): string {
  let tooltip = `${node.type}: ${node.name}`;
  if (node.framework !== 'unknown') {
    tooltip += ` (${node.framework})`;
  }
  if (node.props && Object.keys(node.props).length > 0) {
    tooltip += `\nProps: ${Object.keys(node.props).join(', ')}`;
  }
  if (node.state && Object.keys(node.state).length > 0) {
    tooltip += `\nState: ${Object.keys(node.state).join(', ')}`;
  }
  return tooltip;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="rounded bg-yellow-500/30 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================
// Main Component
// ============================================

export const ComponentTree: React.FC<ComponentTreeProps> = ({
  isOpen,
  onClose,
  framework = 'unknown',
}) => {
  const [treeState, setTreeState] = useState<ComponentTreeState>({
    framework,
    root: null,
    selectedNode: null,
    expandedNodes: new Set(),
    filter: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      loadComponentTree();
    }
  }, [isOpen]);

  // Load component tree
  const loadComponentTree = useCallback(async () => {
    setIsLoading(true);
    try {
      // Send message to content script to get component tree
      const response = await chrome.runtime.sendMessage({
        type: 'GET_COMPONENT_TREE',
      });

      if (response?.success && response.data) {
        const root = response.data.root as ComponentNode;
        setTreeState((prev) => ({
          ...prev,
          root,
          framework: response.data.framework || prev.framework,
        }));

        // Auto-expand root and first level
        if (root) {
          setTreeState((prev) => {
            const expanded = new Set(prev.expandedNodes);
            expanded.add(root.id);
            for (const child of root.children) {
              expanded.add(child.id);
            }
            return { ...prev, expandedNodes: expanded };
          });
        }
      }
    } catch (error) {
      logger.error('[ComponentTree] Failed to load tree:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle node expand/collapse
  const handleToggle = useCallback((nodeId: string) => {
    setTreeState((prev) => {
      const expanded = new Set(prev.expandedNodes);
      if (expanded.has(nodeId)) {
        expanded.delete(nodeId);
      } else {
        expanded.add(nodeId);
      }
      return { ...prev, expandedNodes: expanded };
    });
  }, []);

  // Select node
  const handleSelect = useCallback(
    async (node: ComponentNode) => {
      setTreeState((prev) => ({ ...prev, selectedNode: node }));

      // Send highlight message to content script
      try {
        await chrome.runtime.sendMessage({
          type: 'HIGHLIGHT_COMPONENT',
          payload: { nodeId: node.id },
        });
      } catch (error) {
        logger.error('[ComponentTree] Failed to highlight component:', error);
      }
    },
    []
  );

  // Expand all nodes
  const expandAll = useCallback(() => {
    if (!treeState.root) return;

    const addNodeIds = (node: ComponentNode, set: Set<string>): void => {
      set.add(node.id);
      for (const child of node.children) {
        addNodeIds(child, set);
      }
    };

    setTreeState((prev) => {
      const expanded = new Set(prev.expandedNodes);
      if (prev.root) {
        addNodeIds(prev.root, expanded);
      }
      return { ...prev, expandedNodes: expanded };
    });
  }, [treeState.root]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setTreeState((prev) => ({
      ...prev,
      expandedNodes: prev.root ? new Set([prev.root.id]) : new Set(),
    }));
  }, []);

  // Refresh tree
  const refresh = useCallback(async () => {
    await loadComponentTree();
  }, [loadComponentTree]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'r':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            refresh();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, refresh]);

  // Filter nodes based on search
  const filteredRoot = useMemo(() => {
    if (!searchQuery || !treeState.root) return treeState.root;

    const filterNode = (node: ComponentNode): ComponentNode | null => {
      const matches =
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.keys(node.props || {}).some((key) =>
          key.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const filteredChildren = node.children
        .map(filterNode)
        .filter((n): n is ComponentNode => n !== null);

      if (matches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    };

    return filterNode(treeState.root);
  }, [treeState.root, searchQuery]);

  // Count total nodes
  const nodeCount = useMemo(() => {
    if (!filteredRoot) return 0;

    let count = 0;
    const countNodes = (node: ComponentNode): void => {
      count++;
      for (const child of node.children) {
        countNodes(child);
      }
    };
    countNodes(filteredRoot);
    return count;
  }, [filteredRoot]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-start justify-end p-5">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative flex max-h-[80vh] w-[420px] flex-col overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <FrameworkIcon framework={treeState.framework} />
            <span className="font-semibold text-slate-100">Component Tree</span>
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-medium text-white">
              {treeState.framework}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={refresh}
              disabled={isLoading}
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
              title="Refresh (Ctrl+R)"
            >
              <svg
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={expandAll}
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
              title="Expand All"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={collapseAll}
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
              title="Collapse All"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
              title="Close (Esc)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-slate-700 p-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter components..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <svg className="mb-3 h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-sm">Loading component tree...</p>
            </div>
          ) : !filteredRoot ? (
            <div className="py-12 text-center text-slate-500">
              <div className="mb-3 text-4xl">🌲</div>
              <p className="text-sm">
                {searchQuery ? 'No components match your filter' : 'No component tree detected'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {searchQuery ? 'Try a different search term' : 'Make sure a supported framework is running'}
              </p>
            </div>
          ) : (
            <div>
              <TreeNode
                node={filteredRoot}
                isExpanded={treeState.expandedNodes.has(filteredRoot.id)}
                isSelected={treeState.selectedNode?.id === filteredRoot.id}
                onToggle={handleToggle}
                onSelect={handleSelect}
                searchQuery={searchQuery}
              />
              {/* Render children separately since TreeNode doesn't recursively render */}
              {treeState.expandedNodes.has(filteredRoot.id) &&
                filteredRoot.children.map((child) => (
                  <TreeNode
                    key={child.id}
                    node={child}
                    isExpanded={treeState.expandedNodes.has(child.id)}
                    isSelected={treeState.selectedNode?.id === child.id}
                    onToggle={handleToggle}
                    onSelect={handleSelect}
                    searchQuery={searchQuery}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-700 bg-slate-800/50 px-4 py-2 text-xs text-slate-500">
          <span>{nodeCount} component{nodeCount !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-3">
            {treeState.selectedNode && (
              <span className="text-indigo-400">
                Selected: {treeState.selectedNode.name}
              </span>
            )}
            <span className="text-slate-600">FrontendDevHelper</span>
          </div>
        </div>

        {/* Selected Node Details Panel */}
        {treeState.selectedNode && (
          <div className="border-t border-slate-700 bg-slate-800 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">
              {treeState.selectedNode.name}
            </h3>

            {/* Props */}
            {treeState.selectedNode.props &&
              Object.keys(treeState.selectedNode.props).length > 0 && (
                <div className="mb-3">
                  <h4 className="mb-1 text-xs font-medium text-slate-500">Props</h4>
                  <div className="max-h-24 overflow-y-auto rounded bg-slate-900 p-2">
                    <pre className="font-mono text-[11px] text-slate-300">
                      {JSON.stringify(treeState.selectedNode.props, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

            {/* State */}
            {treeState.selectedNode.state &&
              Object.keys(treeState.selectedNode.state).length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-medium text-slate-500">State</h4>
                  <div className="max-h-24 overflow-y-auto rounded bg-slate-900 p-2">
                    <pre className="font-mono text-[11px] text-slate-300">
                      {JSON.stringify(treeState.selectedNode.state, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentTree;
