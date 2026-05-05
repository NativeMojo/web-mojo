/**
 * MiniChart bar-baseline behavior.
 *
 * Bars normalize to a zero baseline by default, so minimum-value bars are
 * always visible. Caller-supplied minValue/maxValue (hard crop) and
 * softMin/softMax (soft target) are also exercised here.
 *
 * Negative-only and mixed-sign series are correct by construction in the
 * implementation but are not directly tested here — no callers in this repo
 * render negative metrics today. See the request file for the full case
 * matrix if that ever needs verification.
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

    const MiniChart = loadFromSrc('extensions/charts/MiniChart.js', 'MiniChart');
    if (!MiniChart) throw new Error('MiniChart failed to load');

    // Build a chart instance and stub the bits that depend on the DOM-mounted
    // SVG element so we can drive renderChart() directly without a real mount.
    function makeChart(opts) {
        const chart = new MiniChart({
            chartType: 'bar',
            height: 80,
            width: 200,
            padding: 2,
            color: '#0d6efd',
            animate: false,
            showTooltip: false,
            showCrosshair: false,
            ...opts
        });
        // Create an SVG element off-document; renderChart() only needs an
        // `.svg` member that supports innerHTML and appendChild.
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        chart.svg = svg;
        // Lock dimensions so we don't depend on getBoundingClientRect.
        chart.actualWidth = 200;
        chart.actualHeight = 80;
        return chart;
    }

    function rects(chart) {
        return Array.from(chart.svg.querySelectorAll('rect.mini-chart-bar'));
    }
    function emptyLines(chart) {
        return Array.from(chart.svg.querySelectorAll('line.mini-chart-empty-baseline'));
    }
    function heights(chart) {
        return rects(chart).map(r => parseFloat(r.getAttribute('height')));
    }

    describe('MiniChart bar baseline', () => {
        it('a) constant-positive small range — every bar visible (original bug)', () => {
            const chart = makeChart({ data: [3, 3, 4, 3, 4] });
            chart.renderChart();

            const hs = heights(chart);
            expect(hs).toHaveLength(5);
            hs.forEach(h => expect(h).toBeGreaterThan(0));

            const threes = [hs[0], hs[1], hs[3]];
            const fours = [hs[2], hs[4]];
            threes.forEach(h3 => fours.forEach(h4 => expect(h3).toBeLessThan(h4)));
        });

        it('b) explicit minValue is a hard crop — value-3 bars become 0-height', () => {
            const chart = makeChart({ data: [3, 3, 4, 3, 4], minValue: 3 });
            chart.renderChart();

            const hs = heights(chart);
            expect(hs[0]).toBe(0);
            expect(hs[1]).toBe(0);
            expect(hs[3]).toBe(0);
            expect(hs[2]).toBeGreaterThan(0);
            expect(hs[4]).toBeGreaterThan(0);
        });

        it('c) all-zero data renders an empty-state baseline, no bars', () => {
            const chart = makeChart({ data: [0, 0, 0] });
            chart.renderChart();

            expect(rects(chart)).toHaveLength(0);

            const lines = emptyLines(chart);
            expect(lines).toHaveLength(1);
            const line = lines[0];
            expect(parseFloat(line.getAttribute('y1'))).toBe(78); // height(80) - padding(2)
            expect(parseFloat(line.getAttribute('y2'))).toBe(78);
            expect(line.getAttribute('stroke-dasharray')).toBe('2,2');
        });

        it('d) constant non-zero data — all bars at full height, equal', () => {
            const chart = makeChart({ data: [5, 5, 5] });
            chart.renderChart();

            const hs = heights(chart);
            expect(hs).toHaveLength(3);
            hs.forEach(h => expect(h).toBeGreaterThan(0));
            expect(hs[0]).toBe(hs[1]);
            expect(hs[1]).toBe(hs[2]);
        });

        it('e) maxValue clamps out-of-range data — no negative or NaN heights', () => {
            const chart = makeChart({ data: [3, 4], maxValue: 3 });
            chart.renderChart();

            const hs = heights(chart);
            expect(hs).toHaveLength(2);
            hs.forEach(h => {
                expect(Number.isNaN(h)).toBe(false);
                expect(h).toBeGreaterThanOrEqual(0);
            });
        });

        it('f) softMax normalizes — [3,3,3] with softMax:10 gives ~30% bars', () => {
            const chart = makeChart({ data: [3, 3, 3], softMax: 10 });
            chart.renderChart();

            const hs = heights(chart);
            // drawHeight = 80 - 2*2 = 76; expected = (3/10) * 76 = 22.8
            expect(hs).toHaveLength(3);
            hs.forEach(h => {
                expect(h).toBeGreaterThan(21);
                expect(h).toBeLessThan(24);
            });
        });

        it('g) softMax expands when data exceeds it', () => {
            const chart = makeChart({ data: [3, 3, 15], softMax: 10 });
            chart.renderChart();

            const hs = heights(chart);
            expect(hs).toHaveLength(3);
            // value-15 should be the largest; value-3s smaller and equal
            expect(hs[2]).toBeGreaterThan(hs[0]);
            expect(hs[2]).toBeGreaterThan(hs[1]);
            expect(hs[0]).toBe(hs[1]);
            // value-15 should be the new full bar (effectiveMax=15 → 100%)
            // drawHeight = 76
            expect(hs[2]).toBeGreaterThan(75);
            expect(hs[2]).toBeLessThanOrEqual(76);
        });

        it('h) softMax suppresses empty-state on all-zero data', () => {
            const chart = makeChart({ data: [0, 0, 0], softMax: 10 });
            chart.renderChart();

            expect(rects(chart)).toHaveLength(3);
            heights(chart).forEach(h => expect(h).toBe(0));
            expect(emptyLines(chart)).toHaveLength(0);
        });
    });
};
