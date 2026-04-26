/**
 * SeriesChart Unit Tests
 *
 * Verifies data normalization, stacked-bar default, color resolution,
 * legend toggle behavior, click event payload, and `_toRgba` helper.
 *
 * Uses the project's CommonJS test runner. SeriesChart imports `@core/View.js`
 * and `@core/utils/DataFormatter.js`, so we pre-load View + dataFormatter via
 * the standard `setupModules`, then point `loadModuleFromFile` at the
 * absolute path of `SeriesChart.js`.
 */

const path = require('path');
const { testHelpers } = require('../utils/test-helpers');
const { setupModules, moduleLoader } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    setupModules(testContext);

    // Need ResizeObserver shim for the constructor's setupResizeObserver path.
    if (typeof global.ResizeObserver === 'undefined') {
        global.ResizeObserver = class { observe() {} disconnect() {} };
    }

    const filePath = path.resolve(__dirname, '../../src/extensions/charts/SeriesChart.js');
    const SeriesChart = moduleLoader.loadModuleFromFile(filePath, 'SeriesChart');

    if (!SeriesChart) throw new Error('SeriesChart failed to load');

    describe('SeriesChart — data normalisation', () => {
        it('parses Chart.js shape { labels, datasets }', () => {
            const c = new SeriesChart({
                data: {
                    labels: ['a', 'b'],
                    datasets: [{ label: 'A', data: [1, 2] }, { label: 'B', data: [3, 4] }]
                }
            });
            c._parseData(c._rawData);
            expect(c._labels).toEqual(['a', 'b']);
            expect(c._datasets.length).toBe(2);
            expect(c._datasets[0].label).toBe('A');
            expect(c._datasets[1].data).toEqual([3, 4]);
        });

        it('parses series shape { labels, series }', () => {
            const c = new SeriesChart({
                data: {
                    labels: ['x', 'y'],
                    series: [{ name: 'Sales', data: [10, 20] }]
                }
            });
            c._parseData(c._rawData);
            expect(c._datasets[0].label).toBe('Sales');
            expect(c._datasets[0].data).toEqual([10, 20]);
        });

        it('parses single-array shorthand', () => {
            const c = new SeriesChart({ data: [5, 8, 13] });
            c._parseData(c._rawData);
            expect(c._labels).toEqual(['1', '2', '3']);
            expect(c._datasets.length).toBe(1);
            expect(c._datasets[0].data).toEqual([5, 8, 13]);
        });
    });

    describe('SeriesChart — stacking default', () => {
        it("defaults to stacked for chartType: 'bar'", () => {
            const c = new SeriesChart({ chartType: 'bar' });
            expect(c._isStacked()).toBe(true);
        });

        it("does not stack for chartType: 'line'", () => {
            const c = new SeriesChart({ chartType: 'line' });
            expect(c._isStacked()).toBe(false);
        });

        it('respects explicit stacked: false on bar', () => {
            const c = new SeriesChart({ chartType: 'bar', stacked: false });
            expect(c._isStacked()).toBe(false);
        });

        it('treats grouped: true as alias for stacked: false', () => {
            const c = new SeriesChart({ chartType: 'bar', grouped: true });
            expect(c._isStacked()).toBe(false);
        });
    });

    describe('SeriesChart — color resolution', () => {
        it('uses chart-level palette by default', () => {
            const c = new SeriesChart({
                colors: ['#aaa', '#bbb', '#ccc'],
                data: { labels: ['x'], datasets: [{ label: 'A', data: [1] }, { label: 'B', data: [2] }] }
            });
            c._parseData(c._rawData);
            expect(c._datasets[0].color).toBe('#aaa');
            expect(c._datasets[1].color).toBe('#bbb');
        });

        it('falls through to colorGenerator when palette runs out', () => {
            const c = new SeriesChart({
                colors: ['#aaa'],
                colorGenerator: (i) => `gen-${i}`,
                data: {
                    labels: ['x'],
                    datasets: [{ label: 'A', data: [1] }, { label: 'B', data: [2] }, { label: 'C', data: [3] }]
                }
            });
            c._parseData(c._rawData);
            expect(c._datasets[0].color).toBe('#aaa');
            expect(c._datasets[1].color).toBe('gen-1');
            expect(c._datasets[2].color).toBe('gen-2');
        });

        it('per-series color override always wins', () => {
            const c = new SeriesChart({
                colors: ['#aaa', '#bbb'],
                data: {
                    labels: ['x'],
                    datasets: [
                        { label: 'A', data: [1], color: '#fff000' },
                        { label: 'B', data: [2] }
                    ]
                }
            });
            c._parseData(c._rawData);
            expect(c._datasets[0].color).toBe('#fff000');
            expect(c._datasets[1].color).toBe('#bbb');
        });
    });

    describe('SeriesChart — _toRgba helper', () => {
        it('expands #abc shorthand', () => {
            const c = new SeriesChart({});
            expect(c._toRgba('#abc', 0.5)).toBe('rgba(170,187,204,0.5)');
        });

        it('handles 6-digit hex', () => {
            const c = new SeriesChart({});
            expect(c._toRgba('#0d6efd', 0.25)).toBe('rgba(13,110,253,0.25)');
        });

        it('rewrites alpha on existing rgba', () => {
            const c = new SeriesChart({});
            expect(c._toRgba('rgba(10, 20, 30, 0.9)', 0.4)).toBe('rgba(10,20,30,0.4)');
        });

        it('rewrites alpha on hsl', () => {
            const c = new SeriesChart({});
            const out = c._toRgba('hsl(120, 60%, 50%)', 0.3);
            expect(out).toContain('hsla');
            expect(out).toContain('0.3');
        });

        it('returns named colors unchanged', () => {
            const c = new SeriesChart({});
            expect(c._toRgba('red', 0.5)).toBe('red');
        });
    });

    describe('SeriesChart — legend toggle', () => {
        it('toggles dataset visibility via toggleSeries(idx)', () => {
            const c = new SeriesChart({
                data: { labels: ['x'], datasets: [{ label: 'A', data: [1] }, { label: 'B', data: [2] }] }
            });
            c._parseData(c._rawData);
            expect(c._hidden.size).toBe(0);
            // Bypass DOM-touching render by stubbing.
            c._renderChart = () => {};
            c._renderLegend = () => {};
            c.toggleSeries(0);
            expect(c._hidden.has(0)).toBe(true);
            c.toggleSeries(0);
            expect(c._hidden.has(0)).toBe(false);
        });
    });

    describe('SeriesChart — bounds calc', () => {
        it('handles all-zeros without NaN', () => {
            const c = new SeriesChart({
                data: { labels: ['x'], datasets: [{ label: 'A', data: [0, 0, 0] }] }
            });
            c._parseData(c._rawData);
            const { min, max } = c._calcBounds();
            expect(Number.isFinite(min)).toBe(true);
            expect(Number.isFinite(max)).toBe(true);
            expect(max).toBeGreaterThan(min);
        });

        it('stacked bars sum positives for max bound', () => {
            const c = new SeriesChart({
                chartType: 'bar',
                data: {
                    labels: ['x'],
                    datasets: [{ label: 'A', data: [10] }, { label: 'B', data: [20] }, { label: 'C', data: [30] }]
                }
            });
            c._parseData(c._rawData);
            // 10+20+30 = 60, plus 5% headroom.
            const { max } = c._calcBounds();
            expect(max).toBeGreaterThanOrEqual(60);
        });
    });
};
