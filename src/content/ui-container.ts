/**
 * UI Container
 *
 * Creates and manages the root container for content script UI elements.
 */

const CONTAINER_ID = 'frontend-dev-helper-root';

/**
 * Create the root container for content script UI
 */
export function createRootContainer(): HTMLElement {
  // Check if already exists
  const existing = document.getElementById(CONTAINER_ID);
  if (existing) {
    return existing;
  }

  // Create shadow DOM container
  const container = document.createElement('div');
  container.id = CONTAINER_ID;

  // Attach shadow root for style isolation
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Create inner container
  const inner = document.createElement('div');
  inner.id = 'fdh-inner';
  inner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
  `;

  shadowRoot.appendChild(inner);

  // Inject styles into shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
  `;
  shadowRoot.appendChild(style);

  // Append to document
  if (document.body) {
    document.body.appendChild(container);
  } else {
    // If body not ready, wait for it
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(container);
    });
  }

  return inner;
}

/**
 * Get the existing root container
 */
export function getRootContainer(): HTMLElement | null {
  const container = document.getElementById(CONTAINER_ID);
  return container?.shadowRoot?.getElementById('fdh-inner') ?? null;
}

/**
 * Remove the root container
 */
export function removeRootContainer(): void {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.remove();
  }
}
