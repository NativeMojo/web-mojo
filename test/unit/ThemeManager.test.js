/**
 * ThemeManager Unit Tests
 *
 * Covers: storage round-trip, system resolution via mocked matchMedia,
 * matchMedia listener attach/detach when toggling between explicit and
 * 'system', and 'theme:changed' emission via a stub EventBus.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    await testHelpers.setup();
    const ThemeManager = loadModule('ThemeManager');

    if (!ThemeManager) {
        throw new Error('ThemeManager module could not be loaded');
    }

    // ──────────────────────────────────────────────────────────────────
    // matchMedia mock — JSDOM doesn't ship one. Each test installs the
    // mock fresh, so cross-test bleed is impossible.
    // ──────────────────────────────────────────────────────────────────
    let mediaListeners = [];
    let mediaMatches = false;

    function installMatchMedia(matches = false) {
        mediaMatches = matches;
        mediaListeners = [];
        global.window.matchMedia = (_query) => ({
            matches: mediaMatches,
            media: _query,
            addEventListener: (_event, cb) => { mediaListeners.push(cb); },
            removeEventListener: (_event, cb) => {
                const idx = mediaListeners.indexOf(cb);
                if (idx !== -1) mediaListeners.splice(idx, 1);
            }
        });
    }

    function uninstallMatchMedia() {
        delete global.window.matchMedia;
        mediaListeners = [];
        mediaMatches = false;
    }

    function fireSystemChange(matches) {
        mediaMatches = matches;
        for (const cb of mediaListeners) cb({ matches });
    }

    function makeStubBus() {
        const calls = [];
        return {
            calls,
            emit(event, data) { calls.push({ event, data }); }
        };
    }

    beforeEach(() => {
        // Reset DOM + storage between tests
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.removeAttribute('data-bs-theme');
        }
        if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
            localStorage.clear();
        }
        installMatchMedia(false);
    });

    afterEach(() => {
        uninstallMatchMedia();
    });

    describe('initial application', () => {
        it('defaults to system preference when nothing is stored', () => {
            const tm = new ThemeManager({ storageKey: 'test:theme', eventBus: makeStubBus() });
            tm.init();
            expect(tm.getPreference()).toBe('system');
        });

        it("resolves 'system' to 'light' when prefers-color-scheme: dark is false", () => {
            installMatchMedia(false);
            const tm = new ThemeManager({ storageKey: 'test:theme' });
            tm.init();
            expect(tm.getResolved()).toBe('light');
            expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
        });

        it("resolves 'system' to 'dark' when prefers-color-scheme: dark is true", () => {
            installMatchMedia(true);
            const tm = new ThemeManager({ storageKey: 'test:theme' });
            tm.init();
            expect(tm.getResolved()).toBe('dark');
            expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
        });

        it('restores a stored explicit preference', () => {
            localStorage.setItem('test:theme', 'dark');
            installMatchMedia(false);
            const tm = new ThemeManager({ storageKey: 'test:theme' });
            tm.init();
            expect(tm.getPreference()).toBe('dark');
            expect(tm.getResolved()).toBe('dark');
            expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
        });

        it('falls back to system when stored value is invalid', () => {
            localStorage.setItem('test:theme', 'something-bogus');
            const tm = new ThemeManager({ storageKey: 'test:theme' });
            tm.init();
            expect(tm.getPreference()).toBe('system');
        });
    });

    describe('set()', () => {
        it('persists the preference to localStorage', () => {
            const tm = new ThemeManager({ storageKey: 'test:theme', eventBus: makeStubBus() });
            tm.init();
            tm.set('dark');
            expect(localStorage.getItem('test:theme')).toBe('dark');
        });

        it("applies data-bs-theme on <html>", () => {
            const tm = new ThemeManager({ storageKey: 'test:theme', eventBus: makeStubBus() });
            tm.init();
            tm.set('dark');
            expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
            tm.set('light');
            expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
        });

        it("emits 'theme:changed' on the EventBus with { theme, resolved }", () => {
            const bus = makeStubBus();
            const tm = new ThemeManager({ storageKey: 'test:theme', eventBus: bus });
            tm.init();
            bus.calls.length = 0;
            tm.set('dark');
            expect(bus.calls.length).toBe(1);
            expect(bus.calls[0].event).toBe('theme:changed');
            expect(bus.calls[0].data).toEqual({ theme: 'dark', resolved: 'dark' });
        });

        it("ignores invalid preferences with a warning", () => {
            const tm = new ThemeManager({ storageKey: 'test:theme', eventBus: makeStubBus() });
            tm.init();
            tm.set('purple');
            expect(tm.getPreference()).toBe('system');
            expect(localStorage.getItem('test:theme')).toBe(null);
        });
    });

    describe('matchMedia listener lifecycle', () => {
        it("attaches a listener while preference is 'system'", () => {
            const tm = new ThemeManager({ storageKey: 'test:theme' });
            tm.init();
            expect(mediaListeners.length).toBe(1);
        });

        it("detaches the listener when switching to an explicit theme", () => {
            const tm = new ThemeManager({ storageKey: 'test:theme', eventBus: makeStubBus() });
            tm.init();
            expect(mediaListeners.length).toBe(1);
            tm.set('dark');
            expect(mediaListeners.length).toBe(0);
        });

        it("re-attaches the listener when switching back to 'system'", () => {
            const tm = new ThemeManager({ storageKey: 'test:theme', eventBus: makeStubBus() });
            tm.init();
            tm.set('dark');
            expect(mediaListeners.length).toBe(0);
            tm.set('system');
            expect(mediaListeners.length).toBe(1);
        });

        it("updates the resolved theme live when OS preference changes (preference='system')", () => {
            const bus = makeStubBus();
            const tm = new ThemeManager({ storageKey: 'test:theme', eventBus: bus });
            tm.init();
            expect(tm.getResolved()).toBe('light');

            bus.calls.length = 0;
            fireSystemChange(true);
            expect(tm.getResolved()).toBe('dark');
            expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
            const themeChange = bus.calls.find(c => c.event === 'theme:changed');
            expect(themeChange).toBeTruthy();
            expect(themeChange.data).toEqual({ theme: 'system', resolved: 'dark' });
        });

        it("ignores OS changes once the user picked an explicit theme", () => {
            const tm = new ThemeManager({ storageKey: 'test:theme', eventBus: makeStubBus() });
            tm.init();
            tm.set('light');
            // The listener was detached, but even if a stale callback fired,
            // the manager should ignore it because preference !== 'system'.
            const beforeAttr = document.documentElement.getAttribute('data-bs-theme');
            fireSystemChange(true);
            expect(document.documentElement.getAttribute('data-bs-theme')).toBe(beforeAttr);
            expect(tm.getResolved()).toBe('light');
        });
    });

    describe('destroy()', () => {
        it('detaches the matchMedia listener', () => {
            const tm = new ThemeManager({ storageKey: 'test:theme' });
            tm.init();
            expect(mediaListeners.length).toBe(1);
            tm.destroy();
            expect(mediaListeners.length).toBe(0);
        });
    });

    describe('graceful degradation', () => {
        it('still applies a theme when matchMedia is unavailable', () => {
            uninstallMatchMedia();
            const tm = new ThemeManager({ storageKey: 'test:theme' });
            tm.init();
            // No matchMedia → 'system' resolves to 'light'
            expect(tm.getResolved()).toBe('light');
            expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
        });
    });
};
