/**
 * Lightweight, non-blocking error hint on the host page (content script only).
 */

const TOAST_ID = 'fdh-content-toast';
const TOAST_DURATION_MS = 4500;

export function showContentErrorToast(message: string): void {
  try {
    const existing = document.getElementById(TOAST_ID);
    existing?.remove();

    const el = document.createElement('div');
    el.id = TOAST_ID;
    el.setAttribute('role', 'status');
    el.textContent = message;
    el.style.cssText = [
      'position:fixed',
      'bottom:16px',
      'right:16px',
      'max-width:min(360px,calc(100vw - 32px))',
      'z-index:2147483647',
      'padding:10px 14px',
      'border-radius:8px',
      'font:12px/1.4 system-ui,sans-serif',
      'color:#f8fafc',
      'background:rgba(15,23,42,0.92)',
      'border:1px solid rgba(148,163,184,0.35)',
      'box-shadow:0 8px 24px rgba(0,0,0,0.35)',
      'pointer-events:none',
    ].join(';');

    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), TOAST_DURATION_MS);
  } catch {
    // Never throw from notification path
  }
}
