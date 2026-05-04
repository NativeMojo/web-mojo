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
