/**
 * MetricsChart Unit Tests
 *
 * Smoke test: verify processMetricsData converts the /api/metrics/fetch
 * payload shape into the { labels, datasets } shape the new SeriesChart expects.
 */

const path = require('path');
const { testHelpers } = require('../utils/test-helpers');
const { setupModules, moduleLoader } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    setupModules(testContext);

    if (typeof global.ResizeObserver === 'undefined') {
        global.ResizeObserver = class { observe() {} disconnect() {} };
    }

    // MetricsChart imports SeriesChart; the loader's importPathToGlobal won't
    // find a `/SeriesChart` rule, so pre-stuff a minimal stub on global.
    global.SeriesChart = class StubSeriesChart {
        constructor(opts = {}) { this._opts = opts; this._data = null; }
        setData(d) { this._data = d; }
        setChartType(t) { this._opts.chartType = t; }
        get chartType() { return this._opts.chartType; }
    };

    const filePath = path.resolve(__dirname, '../../src/extensions/charts/MetricsChart.js');
    // The loader's importPathToGlobal picks up `./SeriesChart.js` via no rule,
    // and then the transformed code becomes a comment (unresolved). We need a
    // small monkey-patch: feed the loader through a temporary file that
    // pre-defines `SeriesChart`.
    // Workaround: manually transform.
    const fs = require('fs');
    let src = fs.readFileSync(filePath, 'utf8');
    src = src.replace(/import\s+SeriesChart\s+from\s+['"][^'"]+['"];?/, 'const SeriesChart = global.SeriesChart;');

    // Then run a custom sandbox load mimicking loadModuleFromFile.
    const sandbox = {
        require, module: { exports: {} }, exports: {},
        __filename: filePath, __dirname: path.dirname(filePath),
        console, Buffer, process, global,
        window: global.window, document: global.document,
        HTMLElement: global.HTMLElement, Event: global.Event,
        CustomEvent: global.CustomEvent, fetch: global.fetch,
        localStorage: global.localStorage,
        setTimeout: global.setTimeout, clearTimeout: global.clearTimeout,
        setInterval: global.setInterval, clearInterval: global.clearInterval
    };

    // Use the same transform pipeline by calling moduleLoader.transformModule on
    // the already-pre-substituted source.
    const transformed = moduleLoader.transformModule(src, 'MetricsChart');
    const fn = new Function(...Object.keys(sandbox), transformed);
    const MetricsChart = fn(...Object.values(sandbox));

    if (!MetricsChart) throw new Error('MetricsChart failed to load');

    describe('MetricsChart — processMetricsData', () => {
        it('converts metrics payload to { labels, datasets }', () => {
            const m = new MetricsChart({ slugs: ['api_calls', 'api_errors'] });
            const out = m.processMetricsData({
                labels: ['10:00', '11:00', '12:00'],
                data: {
                    api_calls:  [100, 110, 120],
                    api_errors: [2, 1, 3]
                }
            });
            expect(out.labels).toEqual(['10:00', '11:00', '12:00']);
            expect(out.datasets.length).toBe(2);
            // Sorted by total desc — api_calls (330) before api_errors (6)
            expect(out.datasets[0].label).toBe('Api Calls');
            expect(out.datasets[0].data).toEqual([100, 110, 120]);
            expect(out.datasets[1].label).toBe('Api Errors');
        });

        it('groups remaining metrics into "Other" when maxDatasets exceeded', () => {
            const m = new MetricsChart({ maxDatasets: 2 });
            const out = m.processMetricsData({
                labels: ['t1', 't2'],
                data: {
                    a: [10, 10],   // total 20
                    b: [5, 5],     // total 10
                    c: [3, 3],     // total 6
                    d: [1, 1]      // total 2
                }
            });
            // top 2 + Other => 3 datasets
            expect(out.datasets.length).toBe(3);
            expect(out.datasets[2].label).toBe('Other');
            expect(out.datasets[2].data).toEqual([4, 4]); // 3+1, 3+1
        });

        it('formatMetricLabel humanises slugs', () => {
            const m = new MetricsChart({});
            expect(m.formatMetricLabel('user_activity_day')).toBe('User Activity Day');
            expect(m.formatMetricLabel('jobs.published')).toBe('Jobs.published');
        });
    });

    describe('MetricsChart — buildApiParams', () => {
        it('includes granularity, account, slugs, date range', () => {
            const m = new MetricsChart({
                slugs: ['x', 'y'],
                granularity: 'days',
                account: 'acme',
                dateStart: new Date(2026, 0, 1),
                dateEnd: new Date(2026, 0, 7)
            });
            const params = m.buildApiParams();
            expect(params.granularity).toBe('days');
            expect(params.account).toBe('acme');
            expect(params['slugs[]']).toEqual(['x', 'y']);
            expect(typeof params.dr_start).toBe('number');
            expect(typeof params.dr_end).toBe('number');
            expect(params.dr_end).toBeGreaterThan(params.dr_start);
        });
    });

    describe('MetricsChart — granularity → xLabelFormat default', () => {
        const granularities = [
            { granularity: 'minutes', expected: "time:'HH:mm'" },
            { granularity: 'hours',   expected: "time:'HH:mm'" },
            { granularity: 'days',    expected: "date:'MMM D'" },
            { granularity: 'weeks',   expected: "date:'MMM D'" },
            { granularity: 'months',  expected: "date:'MMM YYYY'" }
        ];

        for (const { granularity, expected } of granularities) {
            it(`maps granularity:'${granularity}' to ${expected}`, () => {
                const m = new MetricsChart({ granularity });
                expect(m._resolveXLabelFormat()).toBe(expected);
            });
        }

        it('caller-supplied tooltip.x overrides the granularity default', () => {
            const m = new MetricsChart({
                granularity: 'hours',
                tooltip: { x: "date:'YYYY-MM-DD'" }
            });
            expect(m._resolveXLabelFormat()).toBe("date:'YYYY-MM-DD'");
        });

        it('explicit tooltip.x: null preserves no-format intent', () => {
            const m = new MetricsChart({
                granularity: 'hours',
                tooltip: { x: null }
            });
            expect(m._resolveXLabelFormat()).toBeNull();
        });

        it('unrecognized granularity falls back to null', () => {
            const m = new MetricsChart({ granularity: 'fortnights' });
            expect(m._resolveXLabelFormat()).toBeNull();
        });
    });
};
