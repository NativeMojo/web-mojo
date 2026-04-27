/**
 * ThemeManager - App-level light/dark theme controller for MOJO framework
 *
 * Owns the user's theme preference (`'light' | 'dark' | 'system'`), the
 * `data-bs-theme` attribute on `<html>`, and the `prefers-color-scheme`
 * media listener that resolves `'system'` live.
 *
 * The preference is persisted to `localStorage` under the supplied
 * `storageKey` (private-mode safe — read/write are wrapped in try/catch).
 *
 * Whenever the resolved theme changes, the manager emits `'theme:changed'`
 * on the supplied EventBus with `{ theme, resolved }`.
 *
 * Used internally by WebApp; consumers interact with the thin delegates
 * `app.setTheme()`, `app.getTheme()`, and `app.getResolvedTheme()`.
 */

const VALID_PREFERENCES = ['light', 'dark', 'system'];

class ThemeManager {
    constructor({ storageKey, eventBus } = {}) {
        this.storageKey = storageKey || 'mojo:theme';
        this.eventBus = eventBus || null;

        this.preference = 'system';
        this.resolved = 'light';
        this._mediaQuery = null;
        this._mediaListener = null;
    }

    /**
     * Load the stored preference (defaulting to `'system'`), apply
     * `data-bs-theme`, and attach the system listener if applicable.
     */
    init() {
        const stored = this._readStored();
        this.preference = VALID_PREFERENCES.includes(stored) ? stored : 'system';
        this._apply(false);
        if (this.preference === 'system') {
            this._attachSystemListener();
        }
        return this;
    }

    /**
     * Get the user's stored preference.
     * @returns {'light'|'dark'|'system'}
     */
    getPreference() {
        return this.preference;
    }

    /**
     * Get the currently applied theme (resolves `'system'` via
     * `prefers-color-scheme`).
     * @returns {'light'|'dark'}
     */
    getResolved() {
        return this.resolved;
    }

    /**
     * Update the preference, persist it, apply the resulting theme, and
     * emit `'theme:changed'` if the resolved value changed.
     * @param {'light'|'dark'|'system'} pref
     */
    set(pref) {
        if (!VALID_PREFERENCES.includes(pref)) {
            console.warn(`ThemeManager: invalid preference "${pref}" — expected 'light' | 'dark' | 'system'`);
            return this;
        }

        const wasSystem = this.preference === 'system';
        this.preference = pref;
        this._writeStored(pref);

        if (pref === 'system') {
            if (!wasSystem) this._attachSystemListener();
        } else if (wasSystem) {
            this._detachSystemListener();
        }

        this._apply(true);
        return this;
    }

    /**
     * Detach the matchMedia listener. Call before discarding the manager
     * so the closure does not leak.
     */
    destroy() {
        this._detachSystemListener();
        this.eventBus = null;
    }

    // ───────────────────────────────────────────────
    // Internal
    // ───────────────────────────────────────────────

    _resolve() {
        if (this.preference === 'light' || this.preference === 'dark') {
            return this.preference;
        }
        return this._systemPrefersDark() ? 'dark' : 'light';
    }

    _apply(emit) {
        const resolved = this._resolve();
        const changed = resolved !== this.resolved;
        this.resolved = resolved;

        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.setAttribute('data-bs-theme', resolved);
        }

        if (emit && changed && this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit('theme:changed', { theme: this.preference, resolved });
        } else if (emit && this.eventBus && typeof this.eventBus.emit === 'function') {
            // Preference changed even if resolved didn't (e.g. 'dark' → 'system'
            // while OS is dark). Still notify so listeners can refresh active marks.
            this.eventBus.emit('theme:changed', { theme: this.preference, resolved });
        }
    }

    _systemPrefersDark() {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return false;
        }
        try {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        } catch {
            return false;
        }
    }

    _attachSystemListener() {
        if (this._mediaQuery || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }
        try {
            this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        } catch {
            this._mediaQuery = null;
            return;
        }
        this._mediaListener = () => {
            if (this.preference === 'system') this._apply(true);
        };
        if (typeof this._mediaQuery.addEventListener === 'function') {
            this._mediaQuery.addEventListener('change', this._mediaListener);
        } else if (typeof this._mediaQuery.addListener === 'function') {
            this._mediaQuery.addListener(this._mediaListener);
        }
    }

    _detachSystemListener() {
        if (!this._mediaQuery || !this._mediaListener) {
            this._mediaQuery = null;
            this._mediaListener = null;
            return;
        }
        if (typeof this._mediaQuery.removeEventListener === 'function') {
            this._mediaQuery.removeEventListener('change', this._mediaListener);
        } else if (typeof this._mediaQuery.removeListener === 'function') {
            this._mediaQuery.removeListener(this._mediaListener);
        }
        this._mediaQuery = null;
        this._mediaListener = null;
    }

    _readStored() {
        try {
            if (typeof localStorage === 'undefined') return null;
            return localStorage.getItem(this.storageKey);
        } catch (error) {
            console.warn('ThemeManager: failed to read stored theme:', error);
            return null;
        }
    }

    _writeStored(value) {
        try {
            if (typeof localStorage === 'undefined') return;
            localStorage.setItem(this.storageKey, value);
        } catch (error) {
            console.warn('ThemeManager: failed to persist theme:', error);
        }
    }
}

export default ThemeManager;
