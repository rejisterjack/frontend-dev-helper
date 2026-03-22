/**
 * Command Palette Content Script
 *
 * Injects the Command Palette into the page and handles keyboard shortcuts.
 * Uses a Shadow DOM to isolate styles from the host page.
 */

import { logger } from '@/utils/logger';
import { executeCommandById, getAllCommands } from '@/components/CommandPalette/commands';

// ============================================
// State
// ============================================

let isEnabled = false;
let isOpen = false;
let paletteContainer: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;

// ============================================
// Constants
// ============================================

const PREFIX = 'fdh-command-palette';

// ============================================
// Public API
// ============================================

/**
 * Enable the command palette
 */
export function enable(): void {
  if (isEnabled) return;
  isEnabled = true;

  document.addEventListener('keydown', handleKeyDown, true);
  logger.log('[CommandPalette] Enabled');
}

/**
 * Disable the command palette
 */
export function disable(): void {
  if (!isEnabled) return;
  isEnabled = false;

  document.removeEventListener('keydown', handleKeyDown, true);
  closePalette();
  logger.log('[CommandPalette] Disabled');
}

/**
 * Toggle the command palette
 */
export function toggle(): void {
  if (isEnabled) {
    disable();
  } else {
    enable();
  }
}

/**
 * Get current state
 */
export function getState(): { enabled: boolean; isOpen: boolean } {
  return { enabled: isEnabled, isOpen };
}

/**
 * Open the command palette
 */
export function openPalette(): void {
  if (!isEnabled || isOpen) return;
  isOpen = true;
  createPalette();
}

/**
 * Close the command palette
 */
export function closePalette(): void {
  if (!isOpen) return;
  isOpen = false;
  destroyPalette();
}

// ============================================
// Event Handlers
// ============================================

function handleKeyDown(e: KeyboardEvent): void {
  // Check for Ctrl/Cmd + Shift + P
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      closePalette();
    } else {
      openPalette();
    }
    return;
  }

  // Close on Escape when open
  if (e.key === 'Escape' && isOpen) {
    e.preventDefault();
    e.stopPropagation();
    closePalette();
  }
}

// ============================================
// UI Creation
// ============================================

function createPalette(): void {
  if (paletteContainer) return;

  // Create container
  paletteContainer = document.createElement('div');
  paletteContainer.id = `${PREFIX}-container`;
  paletteContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: auto;
  `;

  // Create shadow DOM for style isolation
  shadowRoot = paletteContainer.attachShadow({ mode: 'open' });

  // Add styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = getStyles();
  shadowRoot.appendChild(styleSheet);

  // Create palette UI
  const palette = createPaletteUI();
  shadowRoot.appendChild(palette);

  document.body.appendChild(paletteContainer);

  // Focus search input
  setTimeout(() => {
    const searchInput = shadowRoot?.querySelector(`#${PREFIX}-search`) as HTMLInputElement;
    searchInput?.focus();
  }, 50);
}

function destroyPalette(): void {
  if (!paletteContainer) return;
  paletteContainer.remove();
  paletteContainer = null;
  shadowRoot = null;
}

function createPaletteUI(): HTMLElement {
  const palette = document.createElement('div');
  palette.id = `${PREFIX}-overlay`;
  palette.innerHTML = `
    <div id="${PREFIX}-backdrop"></div>
    <div id="${PREFIX}-modal">
      <div id="${PREFIX}-search-container">
        <span id="${PREFIX}-search-icon">🔍</span>
        <input 
          type="text" 
          id="${PREFIX}-search" 
          placeholder="Type a command or search..."
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <div id="${PREFIX}-shortcuts">
          <kbd>↑↓</kbd><span>navigate</span>
          <kbd>↵</kbd><span>select</span>
          <kbd>esc</kbd><span>close</span>
        </div>
      </div>
      <div id="${PREFIX}-results"></div>
      <div id="${PREFIX}-footer">
        <span id="${PREFIX}-count">0 commands</span>
        <span>FrontendDevHelper v1.0.0</span>
      </div>
    </div>
  `;

  // Add event listeners
  const backdrop = palette.querySelector(`#${PREFIX}-backdrop`);
  backdrop?.addEventListener('click', closePalette);

  const searchInput = palette.querySelector(`#${PREFIX}-search`) as HTMLInputElement;
  searchInput?.addEventListener('input', handleSearch);
  searchInput?.addEventListener('keydown', handlePaletteKeyDown);

  // Initial render
  renderCommands(getAllCommands());

  return palette;
}

// ============================================
// Search & Navigation
// ============================================

let filteredCommands = getAllCommands();
let selectedIndex = 0;

function handleSearch(e: Event): void {
  const query = (e.target as HTMLInputElement).value.toLowerCase().trim();
  
  if (!query) {
    filteredCommands = getAllCommands();
  } else {
    const queryTerms = query.split(/\s+/);
    filteredCommands = getAllCommands()
      .map((command) => {
        const searchText = `${command.title} ${command.description} ${command.keywords.join(' ')}`.toLowerCase();
        const matchCount = queryTerms.filter((term) => searchText.includes(term)).length;
        return { command, matchCount };
      })
      .filter(({ matchCount }) => matchCount > 0)
      .sort((a, b) => {
        if (b.matchCount !== a.matchCount) {
          return b.matchCount - a.matchCount;
        }
        return a.command.title.localeCompare(b.command.title);
      })
      .map(({ command }) => command);
  }

  selectedIndex = 0;
  renderCommands(filteredCommands);
}

function handlePaletteKeyDown(e: KeyboardEvent): void {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
      updateSelection();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection();
      break;
    case 'Enter':
      e.preventDefault();
      const command = filteredCommands[selectedIndex];
      if (command) {
        executeCommand(command.id);
      }
      break;
    case 'Escape':
      e.preventDefault();
      closePalette();
      break;
  }
}

function updateSelection(): void {
  const items = shadowRoot?.querySelectorAll(`.${PREFIX}-item`);
  items?.forEach((item, index) => {
    item.classList.toggle(`${PREFIX}-selected`, index === selectedIndex);
    if (index === selectedIndex) {
      item.scrollIntoView({ block: 'nearest' });
    }
  });
}

function renderCommands(commands: ReturnType<typeof getAllCommands>): void {
  const resultsContainer = shadowRoot?.querySelector(`#${PREFIX}-results`);
  const countLabel = shadowRoot?.querySelector(`#${PREFIX}-count`);

  if (!resultsContainer) return;

  countLabel!.textContent = `${commands.length} command${commands.length !== 1 ? 's' : ''}`;

  if (commands.length === 0) {
    resultsContainer.innerHTML = `
      <div class="${PREFIX}-empty">
        <div class="${PREFIX}-empty-icon">🔍</div>
        <div>No commands found</div>
        <div class="${PREFIX}-empty-hint">Try a different search term</div>
      </div>
    `;
    return;
  }

  // Group by category
  const grouped = commands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, typeof commands>);

  const categoryOrder = ['tool', 'action', 'setting', 'navigation'];
  const categoryLabels: Record<string, string> = {
    tool: '🔧 Tools',
    action: '⚡ Actions',
    setting: '⚙️ Settings',
    navigation: '🧭 Navigation',
  };

  let html = '';
  let flatIndex = 0;

  categoryOrder.forEach((category) => {
    const categoryCommands = grouped[category];
    if (!categoryCommands?.length) return;

    html += `<div class="${PREFIX}-category">${categoryLabels[category]}</div>`;

    categoryCommands.forEach((cmd) => {
      const isSelected = flatIndex === selectedIndex;
      html += `
        <div 
          class="${PREFIX}-item ${isSelected ? `${PREFIX}-selected` : ''}" 
          data-id="${cmd.id}"
          data-index="${flatIndex}"
        >
          <span class="${PREFIX}-item-icon">${cmd.icon}</span>
          <div class="${PREFIX}-item-content">
            <div class="${PREFIX}-item-title">${escapeHtml(cmd.title)}</div>
            <div class="${PREFIX}-item-description">${escapeHtml(cmd.description)}</div>
          </div>
          ${cmd.shortcut ? `<kbd class="${PREFIX}-item-shortcut">${escapeHtml(cmd.shortcut)}</kbd>` : ''}
        </div>
      `;
      flatIndex++;
    });
  });

  resultsContainer.innerHTML = html;

  // Add click handlers
  resultsContainer.querySelectorAll(`.${PREFIX}-item`).forEach((item) => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      if (id) executeCommand(id);
    });
    item.addEventListener('mouseenter', () => {
      selectedIndex = parseInt(item.getAttribute('data-index') || '0');
      updateSelection();
    });
  });
}

async function executeCommand(id: string): Promise<void> {
  const success = await executeCommandById(id);
  if (success) {
    closePalette();
  }
}

// ============================================
// Utilities
// ============================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getStyles(): string {
  return `
    #${PREFIX}-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      animation: ${PREFIX}-fadeIn 0.15s ease;
    }

    #${PREFIX}-modal {
      position: fixed;
      top: 15vh;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 640px;
      background: #0f172a;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      animation: ${PREFIX}-slideIn 0.15s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    #${PREFIX}-search-container {
      display: flex;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #334155;
      gap: 12px;
    }

    #${PREFIX}-search-icon {
      font-size: 20px;
      color: #64748b;
    }

    #${PREFIX}-search {
      flex: 1;
      background: transparent;
      border: none;
      color: #f8fafc;
      font-size: 16px;
      outline: none;
      font-family: inherit;
    }

    #${PREFIX}-search::placeholder {
      color: #64748b;
    }

    #${PREFIX}-shortcuts {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #64748b;
    }

    #${PREFIX}-shortcuts kbd {
      background: #1e293b;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }

    #${PREFIX}-results {
      max-height: 50vh;
      overflow-y: auto;
      padding: 8px;
    }

    .${PREFIX}-category {
      padding: 8px 12px 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      position: sticky;
      top: 0;
      background: #0f172a;
    }

    .${PREFIX}-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.1s ease;
      color: #cbd5e1;
    }

    .${PREFIX}-item:hover,
    .${PREFIX}-selected {
      background: #4f46e5;
      color: white;
    }

    .${PREFIX}-item-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: #1e293b;
      border-radius: 6px;
      font-size: 16px;
    }

    .${PREFIX}-item:hover .${PREFIX}-item-icon,
    .${PREFIX}-selected .${PREFIX}-item-icon {
      background: rgba(255, 255, 255, 0.2);
    }

    .${PREFIX}-item-content {
      flex: 1;
      min-width: 0;
    }

    .${PREFIX}-item-title {
      font-weight: 500;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .${PREFIX}-item-description {
      font-size: 12px;
      opacity: 0.7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .${PREFIX}-item-shortcut {
      background: #1e293b;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: monospace;
      color: #64748b;
    }

    .${PREFIX}-item:hover .${PREFIX}-item-shortcut,
    .${PREFIX}-selected .${PREFIX}-item-shortcut {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .${PREFIX}-empty {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }

    .${PREFIX}-empty-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .${PREFIX}-empty-hint {
      font-size: 13px;
      margin-top: 4px;
      opacity: 0.7;
    }

    #${PREFIX}-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-top: 1px solid #334155;
      font-size: 11px;
      color: #64748b;
      background: rgba(0, 0, 0, 0.2);
    }

    @keyframes ${PREFIX}-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes ${PREFIX}-slideIn {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    /* Scrollbar styling */
    #${PREFIX}-results::-webkit-scrollbar {
      width: 8px;
    }

    #${PREFIX}-results::-webkit-scrollbar-track {
      background: transparent;
    }

    #${PREFIX}-results::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }

    #${PREFIX}-results::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  `;
}

// ============================================
// Export singleton
// ============================================

export const commandPalette = {
  enable,
  disable,
  toggle,
  getState,
  open: openPalette,
  close: closePalette,
};
