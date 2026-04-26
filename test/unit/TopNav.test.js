/**
 * TopNav Unit Tests
 *
 * Focused on the dropdown auto-attach behavior added to fix
 * planning/issues/topnav-dropdown-no-auto-attach.md (now in done/).
 *
 * Bootstrap's data-API doesn't reliably auto-attach to TopNav's
 * dynamically-rendered dropdown toggles, so TopNav now eagerly calls
 * bootstrap.Dropdown.getOrCreateInstance(...) for every toggle inside
 * its element after each render.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    await testHelpers.setup();
    const TopNav = loadModule('TopNav');

    // Minimal app stub satisfying the bits TopNav touches in its
    // constructor (setupPageListeners, setupGroupListeners) and
    // anything _attachDropdowns might transitively trigger.
    function makeAppStub() {
        const handlers = [];
        return {
            events: {
                on: (...args) => handlers.push(args),
                emit: () => {},
                off: () => {}
            },
            activeUser: null,
            activeGroup: null,
            showPage: () => {} // makes getApp() recognize this as the app
        };
    }

    function makeTopNav() {
        const app = makeAppStub();
        // getApp() looks at window.__app__ first
        global.window.__app__ = app;
        const nav = new TopNav({});
        // Belt-and-suspenders: set explicit reference too
        nav.app = app;
        return nav;
    }

    describe('TopNav._attachDropdowns', () => {
        let savedBootstrap;

        beforeEach(() => {
            savedBootstrap = global.window.bootstrap;
            // Reset the once-flag between tests
            TopNav._warnedNoBootstrap = false;
        });

        afterEach(() => {
            global.window.bootstrap = savedBootstrap;
            delete global.window.__app__;
        });

        it('calls bootstrap.Dropdown.getOrCreateInstance once per dropdown toggle', () => {
            const getOrCreateInstance = jest.fn(() => ({}));
            global.window.bootstrap = { Dropdown: { getOrCreateInstance } };

            const nav = makeTopNav();
            // Stand in for what render() would produce
            nav.element.innerHTML = `
                <div class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown"></a>
                    <ul class="dropdown-menu"><li>x</li></ul>
                </div>
                <div class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown"></a>
                    <ul class="dropdown-menu"><li>y</li></ul>
                </div>
                <a class="nav-link" href="/foo">not a dropdown</a>
            `;

            nav._attachDropdowns();

            expect(getOrCreateInstance).toHaveBeenCalledTimes(2);
        });

        it('is invoked from onAfterRender', async () => {
            const getOrCreateInstance = jest.fn(() => ({}));
            global.window.bootstrap = { Dropdown: { getOrCreateInstance } };

            const nav = makeTopNav();
            nav.element.innerHTML = `
                <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown"></a>
            `;

            await nav.onAfterRender();

            expect(getOrCreateInstance).toHaveBeenCalledTimes(1);
        });

        it('skips silently when window.bootstrap.Dropdown is missing', () => {
            global.window.bootstrap = undefined;

            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const nav = makeTopNav();
            nav.element.innerHTML = `
                <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown"></a>
            `;

            // Should not throw
            nav._attachDropdowns();
            // And should warn at most once across multiple calls
            nav._attachDropdowns();
            nav._attachDropdowns();

            expect(warnSpy).toHaveBeenCalledTimes(1);

            warnSpy.mockRestore();
        });

        it('ignores elements that are not dropdown toggles', () => {
            const getOrCreateInstance = jest.fn(() => ({}));
            global.window.bootstrap = { Dropdown: { getOrCreateInstance } };

            const nav = makeTopNav();
            nav.element.innerHTML = `
                <button data-bs-toggle="collapse">collapse, not dropdown</button>
                <a data-bs-toggle="tooltip">tooltip, not dropdown</a>
                <a data-bs-toggle="dropdown">the only dropdown</a>
            `;

            nav._attachDropdowns();

            expect(getOrCreateInstance).toHaveBeenCalledTimes(1);
        });
    });
};
