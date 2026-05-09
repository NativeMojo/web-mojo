/**
 * MetricsMiniChartWidget / MetricsMiniChart — setAccount() contract.
 *
 * The widget exposes setAccount(account) so dashboards can switch the
 * account context with a single call (mutates chartOptions.account AND
 * triggers an internal refetch). Same shape as setGranularity / setMetrics
 * on MetricsMiniChart itself.
 */

const path = require('path');
const fs = require('fs');
const { testHelpers } = require('../utils/test-helpers');
const { setupModules, moduleLoader } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach } = testContext;

    await testHelpers.setup();
    setupModules(testContext);

    if (typeof global.ResizeObserver === 'undefined') {
        global.ResizeObserver = class { observe() {} disconnect() {} };
    }

    // Rewrite `export default class Foo ...` → `class Foo ...` plus a
    // trailing `export default Foo;`, which the loader's transformer
    // recognizes (it only handles `export default <expr>;`, not the inline
    // class form).
    function normalizeDefaultExport(src) {
        const m = src.match(/export\s+default\s+class\s+(\w+)/);
        if (!m) return src;
        const className = m[1];
        return src.replace(/export\s+default\s+class\s+/, 'class ')
            + `\nexport default ${className};\n`;
    }

    function loadFromSrc(relPath, name, transform = (s) => s) {
        const filePath = path.resolve(__dirname, '../../src', relPath);
        const src = normalizeDefaultExport(transform(fs.readFileSync(filePath, 'utf8')));
        const transformed = moduleLoader.transformModule(src, name);
        const sandbox = {
            require, module: { exports: {} }, exports: {},
            __filename: filePath, __dirname: path.dirname(filePath),
            console, Buffer, process, global,
            window: global.window, document: global.document,
            HTMLElement: global.HTMLElement, Event: global.Event,
            CustomEvent: global.CustomEvent, fetch: global.fetch,
            localStorage: global.localStorage,
            setTimeout: global.setTimeout, clearTimeout: global.clearTimeout,
            setInterval: global.setInterval, clearInterval: global.clearInterval,
            Promise: global.Promise
        };
        const fn = new Function(...Object.keys(sandbox), transformed);
        return fn(...Object.values(sandbox));
    }

    // Stub MiniChart so MetricsMiniChart can extend it without dragging in
    // the entire chart rendering pipeline.
    global.MiniChart = class StubMiniChart {
        constructor(opts = {}) { this._opts = opts; }
        setData() {}
    };

    const MetricsMiniChart = loadFromSrc(
        'extensions/charts/MetricsMiniChart.js',
        'MetricsMiniChart',
        (src) => src.replace(
            /import\s+MiniChart\s+from\s+['"][^'"]+['"];?/,
            'const MiniChart = global.MiniChart;'
        )
    );
    if (!MetricsMiniChart) throw new Error('MetricsMiniChart failed to load');

    // Stub View so MetricsMiniChartWidget can extend it.
    global.View = class StubView {
        constructor(opts = {}) { this._opts = opts; }
        addChild() {}
    };
    global.Modal = { form: async () => null };
    // Provide MetricsMiniChart globally for the widget's relative import.
    global.MetricsMiniChart = MetricsMiniChart;

    const MetricsMiniChartWidget = loadFromSrc(
        'extensions/charts/MetricsMiniChartWidget.js',
        'MetricsMiniChartWidget',
        (src) => src.replace(
            /import\s+MetricsMiniChart\s+from\s+['"][^'"]+['"];?/,
            'const MetricsMiniChart = global.MetricsMiniChart;'
        )
    );
    if (!MetricsMiniChartWidget) throw new Error('MetricsMiniChartWidget failed to load');

    describe('MetricsMiniChart.setAccount', () => {
        it('updates this.account and calls fetchData()', () => {
            const chart = new MetricsMiniChart({ account: 'global' });
            let fetched = false;
            chart.fetchData = () => { fetched = true; return 'fetched'; };

            const result = chart.setAccount('group-42');

            expect(chart.account).toBe('group-42');
            expect(fetched).toBe(true);
            expect(result).toBe('fetched');
        });
    });

    describe('MetricsMiniChart — group fan-out', () => {
        it('omits child_kind when childKind is unset', () => {
            const chart = new MetricsMiniChart({ slugs: ['x'], account: 'group-1' });
            const params = chart.buildApiParams();
            expect(params.child_kind).toBeUndefined();
        });

        it('emits child_kind when childKind is set', () => {
            const chart = new MetricsMiniChart({
                slugs: ['visits'],
                account: 'group-42',
                childKind: 'location'
            });
            const params = chart.buildApiParams();
            expect(params.child_kind).toBe('location');
        });

        it('setChildKind updates the field and triggers fetchData', () => {
            const chart = new MetricsMiniChart({});
            let called = 0;
            chart.fetchData = () => { called++; return 'ok'; };
            chart.setChildKind('location');
            expect(chart.childKind).toBe('location');
            expect(called).toBe(1);
        });
    });

    describe('MetricsMiniChartWidget — childKind pass-through', () => {
        it('forwards childKind from widget options into chartOptions', () => {
            const widget = Object.create(MetricsMiniChartWidget.prototype);
            // Re-run the constructor body's chartOptions assembly by invoking
            // it manually. The widget's constructor calls super(...), which
            // we don't want here — bypass with Object.create + a direct
            // constructor invocation on a fresh stand-in.
            const W = MetricsMiniChartWidget;
            const ctorCalled = new W({ childKind: 'location', slugs: ['x'] });
            expect(ctorCalled.chartOptions.childKind).toBe('location');
        });
    });

    describe('MetricsMiniChart — apiParams passthrough', () => {
        it('omitting apiParams produces no extra params', () => {
            const chart = new MetricsMiniChart({ slugs: ['x'], account: 'group-1' });
            const params = chart.buildApiParams();
            const expectedKeys = new Set([
                'granularity', 'account', 'with_labels', 'slugs[]', '_'
            ]);
            for (const key of Object.keys(params)) {
                expect(expectedKeys.has(key)).toBe(true);
            }
        });

        it('hardcoded options win over apiParams', () => {
            const chart = new MetricsMiniChart({
                slugs: ['x'],
                granularity: 'days',
                account: 'group-1',
                apiParams: { granularity: 'minutes', account: 'public', region: 'us-east' }
            });
            const params = chart.buildApiParams();
            expect(params.granularity).toBe('days');
            expect(params.account).toBe('group-1');
            expect(params.region).toBe('us-east');
        });

        it('setApiParams replaces and triggers fetchData', () => {
            const chart = new MetricsMiniChart({ apiParams: { a: 1 } });
            let called = 0;
            chart.fetchData = () => { called++; return 'ok'; };
            chart.setApiParams({ b: 2 });
            expect(chart.apiParams).toEqual({ b: 2 });
            expect(called).toBe(1);
        });
    });

    describe('MetricsMiniChartWidget — apiParams pass-through', () => {
        it('forwards apiParams from widget options into chartOptions', () => {
            const widget = new MetricsMiniChartWidget({
                apiParams: { region: 'us-east', experiment: 'b' },
                slugs: ['x']
            });
            expect(widget.chartOptions.apiParams).toEqual({ region: 'us-east', experiment: 'b' });
        });
    });

    // Regression for: now_value respects trendOffset, so a widget configured
    // with `trendOffset: 1` (per the docs example to skip an incomplete bucket)
    // displays yesterday's value while the static "Today" label in the
    // subtitle template still says "Today" — label/value mismatch.
    // See planning/issues/metrics-mini-widget-now-value-trendoffset.md
    describe('MetricsMiniChartWidget — now_value should be the latest bucket', () => {
        it('now_value is the last bucket regardless of trendOffset', () => {
            const widget = new MetricsMiniChartWidget({
                slugs: ['x'],
                trendOffset: 1,
                trendRange: 4,
                showTrending: true
            });
            // Set up just enough state for updateFromChartData to run.
            widget.chart = { data: [100, 110, 120, 130, 140] }; // today = 140
            widget.header = {};
            widget.updateFromChartData({ render: false });
            // BUG: currently this is 130 (yesterday) because trendOffset=1
            // shifts endIndex back by 1. Expected: 140 (today, the latest
            // bucket) so the "Today" subtitle label reads correctly.
            expect(widget.header.now_value).toBe(140);
        });

        it('trendOffset still shifts the trending comparison window', () => {
            // trendOffset must remain useful for skipping the incomplete
            // current bucket in the trending math — only `now_value` is
            // decoupled.
            const widget = new MetricsMiniChartWidget({
                slugs: ['x'],
                trendOffset: 1,
                trendRange: 4,
                showTrending: true
            });
            widget.chart = { data: [10, 10, 100, 100, 999] }; // today's spike
            widget.header = {};
            widget.updateFromChartData({ render: false });
            // With trendOffset=1, k=2: lastSum = nums[2]+nums[3] = 100+100 = 200,
            // prevSum = nums[0]+nums[1] = 10+10 = 20. Today's 999 must NOT
            // contaminate the trending sums.
            expect(widget.header.lastValue).toBe(200);
            expect(widget.header.prevValue).toBe(20);
        });
    });

    describe('MetricsMiniChartWidget.setAccount', () => {
        let widget;

        beforeEach(() => {
            // Bypass the View constructor entirely — we only need to verify
            // the setAccount method's contract.
            widget = Object.create(MetricsMiniChartWidget.prototype);
            widget.chartOptions = { account: 'global' };
        });

        it('mutates chartOptions.account and delegates to chart.setAccount()', async () => {
            const calls = [];
            widget.chart = {
                setAccount(account) {
                    calls.push(account);
                    return Promise.resolve('refreshed');
                }
            };

            const result = await widget.setAccount('group-7');

            expect(widget.chartOptions.account).toBe('group-7');
            expect(calls).toEqual(['group-7']);
            expect(result).toBe('refreshed');
        });

        it('updates chartOptions.account even when chart is not yet attached', async () => {
            widget.chart = null;
            const result = await widget.setAccount('group-9');
            expect(widget.chartOptions.account).toBe('group-9');
            // Returns a resolved promise so callers can await unconditionally.
            expect(result).toBeUndefined();
        });
    });
};
