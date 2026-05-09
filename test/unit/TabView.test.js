/**
 * TabView Unit Tests
 *
 * Covers the `variant` option on TabView: default value, lookup table,
 * alias resolution, unknown-variant fallback, and `tabsClass` precedence.
 *
 * TabView lives under src/core/views/navigation and imports its View dep via
 * an `@core/...` alias, so we load it through the simple-module-loader.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    await testHelpers.setup();
    const TabView = loadModule('TabView');

    describe('TabView variants', () => {
        let warnSpy;
        let originalWarn;

        beforeEach(() => {
            originalWarn = console.warn;
            warnSpy = (...args) => { warnSpy.calls.push(args); };
            warnSpy.calls = [];
            console.warn = warnSpy;
        });

        afterEach(() => {
            console.warn = originalWarn;
        });

        it('defaults variant to "underline-all" and emits the matching tabsClass', () => {
            const view = new TabView({ tabs: {} });

            expect(view.variant).toBe('underline-all');
            expect(view.tabsClass).toBe('nav tab-view-variant-underline-all mb-3');
            expect(warnSpy.calls).toHaveLength(0);
        });

        it('"traditional" preserves the legacy nav-tabs classes bit-for-bit', () => {
            const view = new TabView({ tabs: {}, variant: 'traditional' });

            expect(view.variant).toBe('traditional');
            expect(view.tabsClass).toBe('nav nav-tabs mb-3');
        });

        it('each named variant emits the expected tab-view-variant-* class', () => {
            const cases = [
                { variant: 'minimal',       expected: 'nav tab-view-variant-minimal mb-3' },
                { variant: 'traditional',   expected: 'nav nav-tabs mb-3' },
                { variant: 'underline',     expected: 'nav tab-view-variant-underline mb-3' },
                { variant: 'underline-all', expected: 'nav tab-view-variant-underline-all mb-3' },
                { variant: 'pills',         expected: 'nav tab-view-variant-pills mb-3' },
                { variant: 'pills-solid',   expected: 'nav tab-view-variant-pills-solid mb-3' },
                { variant: 'segmented',     expected: 'nav tab-view-variant-segmented mb-3' },
                { variant: 'btn-group',     expected: 'nav tab-view-variant-btn-group mb-3' }
            ];

            for (const { variant, expected } of cases) {
                const view = new TabView({ tabs: {}, variant });
                expect(view.variant).toBe(variant);
                expect(view.tabsClass).toBe(expected);
            }
        });

        it('aliases "buttongroup" and "btngroup" resolve to "btn-group"', () => {
            for (const alias of ['buttongroup', 'btngroup']) {
                const view = new TabView({ tabs: {}, variant: alias });
                expect(view.variant).toBe('btn-group');
                expect(view.tabsClass).toBe('nav tab-view-variant-btn-group mb-3');
            }
            // aliases shouldn't trip the unknown-variant warning
            expect(warnSpy.calls).toHaveLength(0);
        });

        it('warns and falls back to default on an unknown variant', () => {
            const view = new TabView({ tabs: {}, variant: 'sparkles' });

            expect(view.variant).toBe('underline-all');
            expect(view.tabsClass).toBe('nav tab-view-variant-underline-all mb-3');
            expect(warnSpy.calls).toHaveLength(1);
            expect(warnSpy.calls[0][0]).toContain('sparkles');
            expect(warnSpy.calls[0][0]).toContain('underline-all');
        });

        it('explicit tabsClass overrides variant — variant lookup is skipped', () => {
            const view = new TabView({
                tabs: {},
                variant: 'segmented',
                tabsClass: 'nav nav-tabs mb-3 d-none'
            });

            expect(view.variant).toBe('segmented');
            expect(view.tabsClass).toBe('nav nav-tabs mb-3 d-none');
        });
    });
};
