/**
 * ConsoleSilencer
 * 
 * Purpose:
 * - Reduce console noise by filtering out non-critical logs in production.
 * - Keep critical logs (warn, error) by default in production.
 * - Allow runtime override via API, URL params, or localStorage without rebuilding.
 *
 * Usage:
 *   import ConsoleSilencer from '@core/utils/ConsoleSilencer.js';
 *   ConsoleSilencer.install(); // defaults to 'warn' in production, 'debug' in dev
 *
 *   // Optional: set level at install-time
 *   ConsoleSilencer.install({ level: 'error' });
 *
 *   // Change level at runtime (optionally persist to localStorage)
 *   ConsoleSilencer.setLevel('debug', { persist: true });
 *
 *   // Temporarily change level around a block
 *   ConsoleSilencer.withTemporaryLevel('debug', () => {
 *     // noisy diagnostics here
 *   });
 *
 * Runtime overrides (no code changes needed):
 *   - URL: ?logLevel=debug|info|warn|error|silent
 *          also accepts mojoLog and loglevel as param names
 *   - localStorage: localStorage.setItem('MOJO_LOG_LEVEL', 'debug')
 *
 * Notes:
 * - This module is side-effect free until install() is called.
 * - Idempotent: calling install() multiple times won't double-wrap console.
 */

const LEVELS = Object.freeze({
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  log: 3,    // alias to info
  debug: 4,
  trace: 5,
  all: 5,    // alias
});

// Resolve environment in a bundler/browser-safe way
// __DEV__ can be injected by bundlers (e.g., Vite define)
const isDev = (() => {
  // Vite/ESM: import.meta.env.DEV if available
  try {
    /* eslint-disable-next-line no-undef */
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env && typeof import.meta.env.DEV !== 'undefined') {
      return !!import.meta.env.DEV;
    }
  } catch {
    // ignore
  }

  // Prefer global __DEV__ if present (e.g., defined via bundler define)
  if (typeof globalThis !== 'undefined' && typeof globalThis.__DEV__ !== 'undefined') {
    try {
      return !!globalThis.__DEV__;
    } catch {
      // fall through if __DEV__ is not directly evaluable
    }
  }

  // Fallback detection (best effort)
  const hasProcess = typeof process !== 'undefined' && process && typeof process.env === 'object';
  if (hasProcess && typeof process.env.NODE_ENV === 'string') {
    return process.env.NODE_ENV !== 'production';
  }
  // Default conservative behavior: assume production if unknown
  return false;
})();

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const GLOBAL = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global);

// Capture the original console just once
const ORIGINAL_CONSOLE = GLOBAL.console || {};
const ORIGINALS = {};
let INSTALLED = false;
let CURRENT_LEVEL = null;

// Default levels
const DEFAULT_DEV_LEVEL = 'debug';
const DEFAULT_PROD_LEVEL = 'warn'; // keep warn + error by default

// Helper: normalize/parse level
function parseLevel(level) {
  if (typeof level === 'number') {
    // Clamp to bounds
    const min = LEVELS.silent;
    const max = LEVELS.trace;
    return Math.min(Math.max(level, min), max);
  }
  if (typeof level === 'string') {
    const key = level.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(LEVELS, key)) {
      return LEVELS[key];
    }
  }
  return null;
}

// Helper: detect override via URLSearchParams
function getUrlLogLevel() {
  if (!isBrowser || typeof location === 'undefined' || !location.search) return null;
  try {
    const params = new URLSearchParams(location.search);
    const keys = ['logLevel', 'loglevel', 'mojoLog'];
    for (const k of keys) {
      const v = params.get(k);
      if (v != null) {
        const parsed = parseLevel(v);
        if (parsed !== null) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

// Helper: detect override via localStorage
function getStoredLogLevel() {
  if (!isBrowser || !('localStorage' in GLOBAL)) return null;
  try {
    const v = GLOBAL.localStorage.getItem('MOJO_LOG_LEVEL');
    if (v != null) {
      const parsed = parseLevel(v);
      if (parsed !== null) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function storeLogLevel(levelNumberOrName) {
  if (!isBrowser || !('localStorage' in GLOBAL)) return;
  try {
    const key = typeof levelNumberOrName === 'string'
      ? levelNumberOrName
      : levelNumberOrName === null
        ? null
        : Object.entries(LEVELS).find(([, num]) => num === levelNumberOrName)?.[0] ?? null;
    if (key) {
      GLOBAL.localStorage.setItem('MOJO_LOG_LEVEL', key);
    } else {
      GLOBAL.localStorage.removeItem('MOJO_LOG_LEVEL');
    }
  } catch {
    // ignore storage errors
  }
}

// Build a wrapped method that checks the current level before calling through
function makeWrapper(methodName, methodLevel) {
  const original = ORIGINALS[methodName] || ORIGINAL_CONSOLE[methodName] || (() => {});
  return function wrappedConsoleMethod(...args) {
    // If the method is allowed at the current level, call through
    if (CURRENT_LEVEL >= methodLevel) {
      return original.apply(ORIGINAL_CONSOLE, args);
    }
    // Otherwise, noop
    return undefined;
  };
}

// Special wrapper for assert: only logs when assertion fails
function makeAssertWrapper() {
  const original = ORIGINALS.assert || ORIGINAL_CONSOLE.assert || (() => {});
  return function wrappedAssert(condition, ...args) {
    // Only logs when condition is falsy; treat failed assert like error-level
    if (!condition) {
      if (CURRENT_LEVEL >= LEVELS.error) {
        return original.apply(ORIGINAL_CONSOLE, [condition, ...args]);
      }
      return undefined;
    }
    // When assertion passes, no-op
    return undefined;
  };
}

function determineInitialLevel(explicitLevel) {
  // 1) Explicit install option
  const explicit = parseLevel(explicitLevel);
  if (explicit !== null) return explicit;

  // 2) URL override
  const urlLevel = getUrlLogLevel();
  if (urlLevel !== null) return urlLevel;

  // 3) localStorage override
  const storedLevel = getStoredLogLevel();
  if (storedLevel !== null) return storedLevel;

  // 4) Environment default
  return parseLevel(isDev ? DEFAULT_DEV_LEVEL : DEFAULT_PROD_LEVEL);
}

// Construct a patched console that respects CURRENT_LEVEL
function buildPatchedConsole() {
  const patched = { ...ORIGINAL_CONSOLE };

  // Save originals once
  const methodLevels = {
    // Critical
    error: LEVELS.error,
    warn: LEVELS.warn,

    // Informational
    info: LEVELS.info,
    log: LEVELS.info,
    dir: LEVELS.info,
    table: LEVELS.info,

    // Verbose / Debug
    debug: LEVELS.debug,
    group: LEVELS.debug,
    groupCollapsed: LEVELS.debug,
    groupEnd: LEVELS.debug,
    time: LEVELS.debug,
    timeEnd: LEVELS.debug,
    timeLog: LEVELS.debug,
    trace: LEVELS.trace,
  };

  // Capture originals and build wrappers
  for (const name of Object.keys(methodLevels)) {
    ORIGINALS[name] = ORIGINAL_CONSOLE[name] || (() => {});
    patched[name] = makeWrapper(name, methodLevels[name]);
  }

  // Special-case assert
  ORIGINALS.assert = ORIGINAL_CONSOLE.assert || (() => {});
  patched.assert = makeAssertWrapper();

  // Preserve any other console methods as-is (clear, profile, count, etc.)
  return patched;
}

const ConsoleSilencer = {
  // Install the silencer (idempotent)
  install(options = {}) {
    if (INSTALLED) {
      // Already installed; update level if provided
      if (options && typeof options.level !== 'undefined') {
        this.setLevel(options.level, { persist: !!options.persist });
      }
      return this;
    }

    if (!GLOBAL || !ORIGINAL_CONSOLE) {
      // No console available; nothing to do
      INSTALLED = true; // Prevent re-entry
      return this;
    }

    CURRENT_LEVEL = determineInitialLevel(options.level);

    const patched = buildPatchedConsole();
    // Replace the global console
    GLOBAL.console = patched;

    INSTALLED = true;

    // Expose for quick manual access if desired
    GLOBAL.MOJOConsoleSilencer = this;

    return this;
  },

  // Uninstall and restore the original console
  uninstall() {
    if (!INSTALLED) return this;

    try {
      GLOBAL.console = ORIGINAL_CONSOLE;
    } catch {
      // ignore
    }
    INSTALLED = false;
    return this;
  },

  // Set current level at runtime; accepts string or number
  // levels: 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
  setLevel(level, { persist = false } = {}) {
    const parsed = parseLevel(level);
    if (parsed === null) return this; // ignore invalid level
    CURRENT_LEVEL = parsed;
    if (persist) {
      storeLogLevel(level);
    }
    return this;
  },

  // Get the current numeric level
  getLevel() {
    return CURRENT_LEVEL;
  },

  // Get the current level name (best-effort)
  getLevelName() {
    const entry = Object.entries(LEVELS).find(([, num]) => num === CURRENT_LEVEL);
    return entry ? entry[0] : null;
  },

  // Convenience helpers
  criticalOnly({ persist = false } = {}) {
    return this.setLevel('warn', { persist });
  },

  errorsOnly({ persist = false } = {}) {
    return this.setLevel('error', { persist });
  },

  silent({ persist = false } = {}) {
    return this.setLevel('silent', { persist });
  },

  verbose({ persist = false } = {}) {
    return this.setLevel(isDev ? 'debug' : 'info', { persist });
  },

  allowAll({ persist = false } = {}) {
    return this.setLevel('trace', { persist });
  },

  // Run a block with a temporary level, then restore
  withTemporaryLevel(level, fn) {
    const prev = CURRENT_LEVEL;
    const parsed = parseLevel(level);
    if (parsed === null || typeof fn !== 'function') return fn?.();
    CURRENT_LEVEL = parsed;
    try {
      return fn();
    } finally {
      CURRENT_LEVEL = prev;
    }
  },

  // Expose levels map for consumers
  LEVELS,
};

// Optional: convenience named export alias
export default ConsoleSilencer;
export const installConsoleSilencer = (options) => ConsoleSilencer.install(options);