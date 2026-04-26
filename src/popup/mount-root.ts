/**
 * Ensures a mount node exists for popup UIs (index.html, popup.html, HMR edge cases).
 */
export function getOrCreatePopupRoot(): HTMLElement {
  const found = document.getElementById('root');
  if (found) return found;
  const el = document.createElement('div');
  el.id = 'root';
  document.body.appendChild(el);
  return el;
}
