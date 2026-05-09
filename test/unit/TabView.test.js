/**
 * TabView Unit Tests
 *
 * Covers the `variant` option added to TabView: default value, lookup table,
 * unknown-variant fallback, and `tabsClass` precedence.
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

        it('defaults variant to "minimal" and emits the matching tabsClass', () => {
            const view = new TabView({ tabs: {} });

            expect(view.variant).toBe('minimal');
            expect(view.tabsClass).toBe('nav tab-view-variant-minimal mb-3');
            expect(warnSpy.calls).toHaveLength(0);
        });

        it('"underline" preserves the legacy nav-tabs classes bit-for-bit', () => {
            const view = new TabView({ tabs: {}, variant: 'underline' });

            expect(view.variant).toBe('underline');
            expect(view.tabsClass).toBe('nav nav-tabs mb-3');
        });

        it('each named variant emits the expected tab-view-variant-* class', () => {
            const cases = [
                { variant: 'minimal',         expected: 'nav tab-view-variant-minimal mb-3' },
                { variant: 'underline',       expected: 'nav nav-tabs mb-3' },
                { variant: 'pills',           expected: 'nav tab-view-variant-pills mb-3' },
                { variant: 'segmented',       expected: 'nav tab-view-variant-segmented mb-3' },
                { variant: 'segmented-solid', expected: 'nav tab-view-variant-segmented-solid mb-3' }
            ];

            for (const { variant, expected } of cases) {
                const view = new TabView({ tabs: {}, variant });
                expect(view.variant).toBe(variant);
                expect(view.tabsClass).toBe(expected);
            }
        });

        it('warns and falls back to "minimal" on an unknown variant', () => {
            const view = new TabView({ tabs: {}, variant: 'sparkles' });

            expect(view.variant).toBe('minimal');
            expect(view.tabsClass).toBe('nav tab-view-variant-minimal mb-3');
            expect(warnSpy.calls).toHaveLength(1);
            expect(warnSpy.calls[0][0]).toContain('sparkles');
            expect(warnSpy.calls[0][0]).toContain('minimal');
        });

        it('explicit tabsClass overrides variant — variant lookup is skipped', () => {
            const view = new TabView({
                tabs: {},
                variant: 'segmented-solid',
                tabsClass: 'nav nav-tabs mb-3 d-none'
            });

            expect(view.variant).toBe('segmented-solid');
            expect(view.tabsClass).toBe('nav nav-tabs mb-3 d-none');
        });
    });
};
