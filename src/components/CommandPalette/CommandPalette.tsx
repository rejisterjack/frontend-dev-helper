/**
 * Command Palette Component
 *
 * VS Code-style command palette for quick access to all FrontendDevHelper tools.
 * Features fuzzy search, keyboard navigation, recent commands, and categorized results.
 */

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Command } from '@/types';
import { logger } from '@/utils/logger';
import { addRecentCommand, getRecentCommands, searchCommands } from './commands';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get filtered commands based on search
  const filteredCommands = useMemo(() => {
    return searchCommands(searchQuery);
  }, [searchQuery]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setRecentCommands(getRecentCommands());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter': {
          e.preventDefault();
          const command = filteredCommands[selectedIndex];
          if (command) {
            handleExecuteCommand(command);
          }
          break;
        }
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Home':
          e.preventDefault();
          setSelectedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setSelectedIndex(filteredCommands.length - 1);
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  // Execute command
  const handleExecuteCommand = useCallback(
    async (command: Command) => {
      try {
        await command.execute();
        addRecentCommand(command.id);
        onClose();
      } catch (error) {
        logger.error('[CommandPalette] Failed to execute command:', error);
      }
    },
    [onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Group commands by category for display
  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: Command[] } = {};

    filteredCommands.forEach((cmd) => {
      const category = cmd.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(cmd);
    });

    // Define category order
    const categoryOrder = ['tool', 'action', 'setting', 'navigation'];
    const orderedGroups: { category: string; commands: Command[] }[] = [];

    categoryOrder.forEach((cat) => {
      if (groups[cat]) {
        orderedGroups.push({ category: cat, commands: groups[cat] });
        delete groups[cat];
      }
    });

    // Add any remaining categories
    Object.entries(groups).forEach(([category, commands]) => {
      orderedGroups.push({ category, commands });
    });

    return orderedGroups;
  }, [filteredCommands]);

  // Get category label
  const getCategoryLabel = (category: string): string => {
    const labels: { [key: string]: string } = {
      tool: '🔧 Tools',
      action: '⚡ Actions',
      setting: '⚙️ Settings',
      navigation: '🧭 Navigation',
    };
    return labels[category] || category;
  };

  // Calculate flat index from grouped commands
  const getFlatIndex = (groupIndex: number, commandIndex: number): number => {
    let flatIndex = 0;
    for (let i = 0; i < groupIndex; i++) {
      flatIndex += groupedCommands[i].commands.length;
    }
    return flatIndex + commandIndex;
  };

  if (!isOpen) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[2147483647] flex items-start justify-center bg-black/50 p-4 pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      role="dialog"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-white/10"
        onKeyDown={handleKeyDown}
        role="application"
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-slate-700 px-4 py-3">
          <span className="mr-3 text-xl text-slate-400">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-lg text-white placeholder-slate-500 outline-none"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="ml-2 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          <div className="ml-4 flex items-center gap-1 text-xs text-slate-500">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5">↑↓</kbd>
            <span>to navigate</span>
            <kbd className="ml-2 rounded bg-slate-800 px-1.5 py-0.5">↵</kbd>
            <span>to select</span>
          </div>
        </div>

        {/* Command List */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <div className="mb-2 text-4xl">🔍</div>
              <p>No commands found for &quot;{searchQuery}&quot;</p>
              <p className="mt-1 text-sm">Try a different search term</p>
            </div>
          ) : (
            groupedCommands.map((group, groupIndex) => (
              <div key={group.category} className="mb-2">
                {/* Category Header */}
                <div className="sticky top-0 z-10 bg-slate-900/95 px-3 py-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                  {getCategoryLabel(group.category)}
                </div>

                {/* Commands in this category */}
                {group.commands.map((command, commandIndex) => {
                  const flatIndex = getFlatIndex(groupIndex, commandIndex);
                  const isSelected = flatIndex === selectedIndex;
                  const isRecent = recentCommands.includes(command.id);

                  return (
                    <button
                      type="button"
                      key={command.id}
                      onClick={() => handleExecuteCommand(command)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                      className={`
                        flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors
                        ${isSelected ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}
                      `}
                    >
                      {/* Icon */}
                      <span className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-lg">
                        {command.icon}
                      </span>

                      {/* Title & Description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{command.title}</span>
                          {isRecent && (
                            <span
                              className={`
                                rounded px-1.5 py-0.5 text-[10px] uppercase
                                ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'}
                              `}
                            >
                              Recent
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-sm truncate ${
                            isSelected ? 'text-indigo-200' : 'text-slate-500'
                          }`}
                        >
                          {command.description}
                        </div>
                      </div>

                      {/* Shortcut */}
                      {command.shortcut && (
                        <kbd
                          className={`
                            rounded px-2 py-1 text-xs font-mono
                            ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-500'}
                          `}
                        >
                          {command.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-700 bg-slate-900/50 px-4 py-2 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>{filteredCommands.length} commands</span>
            {recentCommands.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setRecentCommands([]);
                }}
                className="text-slate-400 hover:text-white"
              >
                Clear recent
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>FrontendDevHelper</span>
            <span className="text-slate-600">•</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
