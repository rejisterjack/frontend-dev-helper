/**
 * Animation Inspector UI
 *
 * UI component creation and panel management.
 */

import { escapeHtml } from '@/utils/sanitize';
import { PANEL_MAX_HEIGHT, PANEL_MIN_HEIGHT, PANEL_WIDTH, SPEED_OPTIONS } from './constants';
import type { AnimationInfo } from './types';

// Module state (controlled by main module)
let panel: HTMLElement | null = null;
let animationsRef: AnimationInfo[] = [];
let isPausedRef = false;
let playbackSpeedRef = 1;
let highlightEnabledRef = false;
let selectedAnimationIdRef: string | null = null;

// Panel position state
export const panelPosition = { x: 20, y: 20 };
let isDragging = false;
const dragOffset = { x: 0, y: 0 };

// Callbacks
interface UICallbacks {
  onClose?: () => void;
  onPlayPauseAll?: () => void;
  onToggleHighlight?: () => void;
  onSetSpeed?: (speed: number) => void;
  onSelectAnimation?: (id: string) => void;
  onToggleAnimation?: (id: string) => void;
  onScrollToElement?: (id: string) => void;
  onRefresh?: () => void;
}

let callbacks: UICallbacks = {};

/**
 * Initialize UI module
 */
export function initUI(
  animations: AnimationInfo[],
  isPaused: boolean,
  playbackSpeed: number,
  highlightEnabled: boolean,
  selectedAnimationId: string | null,
  uiCallbacks: UICallbacks
): void {
  animationsRef = animations;
  isPausedRef = isPaused;
  playbackSpeedRef = playbackSpeed;
  highlightEnabledRef = highlightEnabled;
  selectedAnimationIdRef = selectedAnimationId;
  callbacks = uiCallbacks;
}

/**
 * Update UI state references
 */
export function updateUIState(
  animations: AnimationInfo[],
  isPaused: boolean,
  playbackSpeed: number,
  highlightEnabled: boolean,
  selectedAnimationId: string | null
): void {
  animationsRef = animations;
  isPausedRef = isPaused;
  playbackSpeedRef = playbackSpeed;
  highlightEnabledRef = highlightEnabled;
  selectedAnimationIdRef = selectedAnimationId;
}

/**
 * Get panel element
 */
export function getPanel(): HTMLElement | null {
  return panel;
}

/**
 * Set panel element
 */
export function setPanel(el: HTMLElement | null): void {
  panel = el;
}

/**
 * Create the animation inspector panel
 */
export function createPanel(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'fdh-animation-inspector';
  el.className = 'fdh-anim-panel';
  el.style.cssText = `
    position: fixed;
    top: ${panelPosition.y}px;
    right: ${panelPosition.x}px;
    width: ${PANEL_WIDTH}px;
    min-height: ${PANEL_MIN_HEIGHT}px;
    max-height: ${PANEL_MAX_HEIGHT}px;
    background: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 12px;
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    font-size: 12px;
    color: #e2e8f0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
  `;

  document.body.appendChild(el);
  panel = el;
  return el;
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms === Infinity) return '∞';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

/**
 * Format iteration count
 */
export function formatIterationCount(count: number | string): string {
  if (count === 'infinite' || count === Infinity) return '∞';
  return String(count);
}

/**
 * Get element selector
 */
export function getElementSelector(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList)
    .filter((c) => !c.startsWith('fdh-'))
    .slice(0, 2)
    .map((c) => `.${c}`)
    .join('');
  return `${tag}${id}${classes}`;
}

/**
 * Build panel header
 */
export function buildHeader(): string {
  return `
    <div class="fdh-anim-header" style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      cursor: move;
    ">
      <div style="display: flex; align-items: center; gap: 10px;">
        <svg
          aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span style="font-weight: 600; font-size: 14px; color: #f1f5f9;">Animation Inspector</span>
        <span style="
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        ">${animationsRef.length} found</span>
      </div>
      <button
        type="button" class="fdh-anim-close" style="
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      " title="Close (Esc)">
        <svg
          aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
}

/**
 * Build toolbar
 */
export function buildToolbar(): string {
  return `
    <div class="fdh-anim-toolbar" style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      gap: 12px;
    ">
      <div style="display: flex; gap: 8px;">
        <button
          type="button" class="fdh-anim-play-pause" style="
          background: ${isPausedRef ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
          border: 1px solid ${isPausedRef ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'};
          color: ${isPausedRef ? '#4ade80' : '#f87171'};
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        ">
          ${
            isPausedRef
              ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play All`
              : `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause All`
          }
        </button>
        
        <button
          type="button" class="fdh-anim-highlight-toggle" style="
          background: ${highlightEnabledRef ? 'rgba(99, 102, 241, 0.3)' : 'rgba(30, 41, 59, 0.8)'};
          border: 1px solid ${highlightEnabledRef ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.3)'};
          color: ${highlightEnabledRef ? '#818cf8' : '#94a3b8'};
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        ">
          <svg
            aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
            <path d="M12 4v1M17.66 6.344l-.828.828M20.005 12.004h-1M17.66 17.664l-.828-.828M12 20.01V19M6.34 17.664l.828-.828M3.995 12.004h1M6.34 6.344l.828.828"/>
          </svg>
          ${highlightEnabledRef ? 'Hide' : 'Show'}
        </button>
      </div>
      
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="color: #64748b; font-size: 11px;">Speed:</span>
        <div style="display: flex; background: rgba(30, 41, 59, 0.8); border-radius: 6px; padding: 2px;">
          ${SPEED_OPTIONS.map(
            (speed) => `
            <button
              type="button" class="fdh-anim-speed" data-speed="${speed}" style="
              background: ${playbackSpeedRef === speed ? 'rgba(99, 102, 241, 0.4)' : 'transparent'};
              border: none;
              color: ${playbackSpeedRef === speed ? '#e2e8f0' : '#64748b'};
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
              transition: all 0.2s;
              font-weight: ${playbackSpeedRef === speed ? '500' : 'normal'};
            ">${speed}x</button>
          `
          ).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Build animation list
 */
export function buildAnimationList(): string {
  if (animationsRef.length === 0) {
    return `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        color: #64748b;
        text-align: center;
      ">
        <svg
          aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; opacity: 0.5;">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <p style="margin: 0; font-size: 13px;">No animations detected</p>
        <p style="margin: 8px 0 0; font-size: 11px; opacity: 0.7;">Try interacting with the page or refreshing</p>
      </div>
    `;
  }

  return `
    <div class="fdh-anim-list" style="
      flex: 1;
      overflow-y: auto;
      max-height: 350px;
    ">
      ${animationsRef
        .map(
          (anim) => `
        <div class="fdh-anim-item" data-id="${anim.id}" style="
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: background 0.2s;
          background: ${selectedAnimationIdRef === anim.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent'};
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
              <span style="
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${anim.type === 'css-animation' ? '#3b82f6' : '#10b981'};
                flex-shrink: 0;
              "></span>
              <span style="
                font-weight: 500;
                color: #f1f5f9;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              ">${escapeHtml(anim.name)}</span>
              <span style="
                background: rgba(30, 41, 59, 0.8);
                color: #64748b;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                text-transform: uppercase;
                flex-shrink: 0;
              ">${anim.type === 'css-animation' ? 'CSS' : 'Trans'}</span>
            </div>
            <button
              type="button" class="fdh-anim-item-play" data-id="${anim.id}" style="
              background: transparent;
              border: none;
              color: ${anim.playState === 'running' ? '#f87171' : '#4ade80'};
              cursor: pointer;
              padding: 4px;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            " title="${anim.playState === 'running' ? 'Pause' : 'Play'}">
              ${
                anim.playState === 'running'
                  ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
                  : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
              }
            </button>
          </div>
          
          <div style="display: flex; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
            <span style="color: #94a3b8; font-size: 11px;">
              <span style="color: #64748b;">Duration:</span> ${formatDuration(anim.duration)}
            </span>
            <span style="color: #94a3b8; font-size: 11px;">
              <span style="color: #64748b;">Delay:</span> ${formatDuration(anim.delay)}
            </span>
            ${
              anim.type === 'css-animation'
                ? `
              <span style="color: #94a3b8; font-size: 11px;">
                <span style="color: #64748b;">Iterations:</span> ${formatIterationCount(anim.iterationCount)}
              </span>
            `
                : ''
            }
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #64748b; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">
              ${escapeHtml(getElementSelector(anim.element))}
            </span>
            <span style="color: #93c5fd; font-size: 10px;">${escapeHtml(anim.easing)}</span>
          </div>
          
          ${selectedAnimationIdRef === anim.id ? buildAnimationDetails(anim) : ''}
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Build animation details view
 */
export function buildAnimationDetails(anim: AnimationInfo): string {
  let keyframesHtml = '';

  if (anim.cssRule && anim.cssRule.length > 0) {
    keyframesHtml = `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
        <div style="color: #64748b; font-size: 10px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Keyframes</div>
        <div style="background: rgba(30, 41, 59, 0.8); border-radius: 6px; padding: 10px; font-size: 10px; max-height: 150px; overflow-y: auto;">
          ${anim.cssRule
            .map(
              (rule) => `
            <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: #c084fc; margin-bottom: 4px; font-weight: 500;">${escapeHtml(rule.keyText)}</div>
              <div style="color: #94a3b8; line-height: 1.5;">${escapeHtml(rule.style.cssText).replace(/; /g, ';<br>')}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  return `
    <div style="margin-top: 12px; padding: 12px; background: rgba(30, 41, 59, 0.5); border-radius: 8px;">
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">
        <div>
          <div style="color: #64748b; font-size: 10px; margin-bottom: 2px;">Direction</div>
          <div style="color: #e2e8f0; font-size: 11px;">${escapeHtml(anim.direction)}</div>
        </div>
        <div>
          <div style="color: #64748b; font-size: 10px; margin-bottom: 2px;">Fill Mode</div>
          <div style="color: #e2e8f0; font-size: 11px;">${escapeHtml(anim.fillMode)}</div>
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="color: #64748b; font-size: 10px; margin-bottom: 4px;">Timeline</div>
        <div style="background: rgba(15, 23, 42, 0.8); height: 24px; border-radius: 4px; overflow: hidden; position: relative;">
          <div style="
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: ${anim.progress}%;
            background: linear-gradient(90deg, rgba(99, 102, 241, 0.6), rgba(99, 102, 241, 0.8));
            transition: width 0.1s linear;
          "></div>
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8;">
            ${Math.round(anim.progress)}%
          </div>
        </div>
      </div>
      
      ${keyframesHtml}
      
      <button
        type="button" class="fdh-anim-scroll-to" data-id="${anim.id}" style="
        width: 100%;
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.4);
        color: #818cf8;
        padding: 8px;
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        margin-top: 12px;
        transition: all 0.2s;
      ">Scroll to Element</button>
    </div>
  `;
}

/**
 * Build panel footer
 */
export function buildFooter(): string {
  return `
    <div class="fdh-anim-footer" style="
      padding: 12px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748b;
    ">
      <span>Press <kbd style="background: rgba(30, 41, 59, 0.8); padding: 2px 6px; border-radius: 4px; font-family: inherit;">Esc</kbd> to close</span>
      <button
        type="button" class="fdh-anim-refresh" style="
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
      ">
        <svg
          aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        Refresh
      </button>
    </div>
  `;
}

/**
 * Build complete panel HTML
 */
export function buildPanelHTML(): string {
  return `
    ${buildHeader()}
    ${buildToolbar()}
    ${buildAnimationList()}
    ${buildFooter()}
  `;
}

/**
 * Update panel content
 */
export function updatePanel(): void {
  if (!panel) return;
  panel.innerHTML = buildPanelHTML();
  setupPanelEventListeners();
}

/**
 * Setup panel event listeners
 */
export function setupPanelEventListeners(): void {
  if (!panel) return;

  // Close button
  const closeBtn = panel.querySelector('.fdh-anim-close');
  closeBtn?.addEventListener('click', () => callbacks.onClose?.());

  // Play/Pause all button
  const playPauseBtn = panel.querySelector('.fdh-anim-play-pause');
  playPauseBtn?.addEventListener('click', () => callbacks.onPlayPauseAll?.());

  // Highlight toggle
  const highlightBtn = panel.querySelector('.fdh-anim-highlight-toggle');
  highlightBtn?.addEventListener('click', () => callbacks.onToggleHighlight?.());

  // Speed buttons
  const speedBtns = panel.querySelectorAll('.fdh-anim-speed');
  speedBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = parseFloat((btn as HTMLElement).dataset.speed || '1');
      callbacks.onSetSpeed?.(speed);
    });
  });

  // Animation item click
  const animItems = panel.querySelectorAll('.fdh-anim-item');
  animItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      // Don't select if clicking play button
      if ((e.target as HTMLElement).closest('.fdh-anim-item-play')) return;

      const id = (item as HTMLElement).dataset.id;
      if (id) {
        callbacks.onSelectAnimation?.(id);
      }
    });
  });

  // Individual play/pause buttons
  const itemPlayBtns = panel.querySelectorAll('.fdh-anim-item-play');
  itemPlayBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.id;
      if (id) {
        callbacks.onToggleAnimation?.(id);
      }
    });
  });

  // Scroll to element buttons
  const scrollBtns = panel.querySelectorAll('.fdh-anim-scroll-to');
  scrollBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id;
      if (id) {
        callbacks.onScrollToElement?.(id);
      }
    });
  });

  // Refresh button
  const refreshBtn = panel.querySelector('.fdh-anim-refresh');
  refreshBtn?.addEventListener('click', () => callbacks.onRefresh?.());

  // Header drag
  const header = panel.querySelector('.fdh-anim-header');
  header?.addEventListener('mousedown', handleDragStart as EventListener);
}

/**
 * Handle drag start
 */
function handleDragStart(e: MouseEvent): void {
  if (!panel) return;

  const target = e.target as HTMLElement;
  if (target.closest('.fdh-anim-close')) return;

  isDragging = true;
  const rect = panel.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;

  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
}

/**
 * Handle drag move
 */
function handleDragMove(e: MouseEvent): void {
  if (!isDragging || !panel) return;

  const x = e.clientX - dragOffset.x;
  const y = e.clientY - dragOffset.y;

  panel.style.left = `${x}px`;
  panel.style.top = `${y}px`;
  panel.style.right = 'auto';

  panelPosition.x = window.innerWidth - (x + PANEL_WIDTH);
  panelPosition.y = y;
}

/**
 * Handle drag end
 */
function handleDragEnd(): void {
  isDragging = false;
  document.removeEventListener('mousemove', handleDragMove);
  document.removeEventListener('mouseup', handleDragEnd);
}

/**
 * Update progress bar for selected animation
 */
export function updateProgressBar(animationId: string, progress: number): void {
  if (!panel) return;
  const progressBar = panel.querySelector(
    `.fdh-anim-item[data-id="${animationId}"] [style*="width"]`
  );
  if (progressBar) {
    (progressBar as HTMLElement).style.width = `${progress}%`;
  }
}
