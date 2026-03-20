/**
 * Production-safe logging utility
 *
 * Logs are only output when DEBUG mode is enabled via localStorage
 * or when explicitly in development environment.
 */

const DEBUG_KEY = 'fdh_debug';
const IS_DEV = process.env.NODE_ENV === 'development';

function isDebugEnabled(): boolean {
  try {
    return IS_DEV || localStorage.getItem(DEBUG_KEY) === 'true';
  } catch {
    return IS_DEV;
  }
}

export const logger = {
  log: (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]): void => {
    // Always log errors in production for critical issues
    console.error(...args);
  },

  info: (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.debug(...args);
    }
  },

  // Enable/disable debug mode at runtime
  enable: (): void => {
    try {
      localStorage.setItem(DEBUG_KEY, 'true');
    } catch {}
  },

  disable: (): void => {
    try {
      localStorage.removeItem(DEBUG_KEY);
    } catch {}
  },
};

export default logger;
