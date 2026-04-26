/**
 * PieChart Unit Tests
 *
 * Verifies data normalization (3 shapes), percentage math, and color
 * resolution. Uses the project's CommonJS test runner.
 */

const path = require('path');
const { testHelpers } = require('../utils/test-helpers');
const { setupModules, moduleLoader } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    setupModules(testContext);

    const filePath = path.resolve(__dirname, '../../src/extensions/charts/PieChart.js');
    const PieChart = moduleLoader.loadModuleFromFile(filePath, 'PieChart');

    if (!PieChart) throw new Error('PieChart failed to load');

    describe('PieChart — data normalisation', () => {
        it('parses [{ label, value }] array shape', () => {
            const p = new PieChart({});
            p._parseData([
                { label: 'A', value: 10 },
                { label: 'B', value: 20 },
                { label: 'C', value: 70 }
            ]);
            expect(p._segments.length).toBe(3);
            expect(p._segments[0].label).toBe('A');
            expect(p._segments[0].pct).toBe(10);
            expect(p._segments[2].pct).toBe(70);
        });

        it('parses Chart.js shape { labels, datasets }', () => {
            const p = new PieChart({});
            p._parseData({ labels: ['X', 'Y'], datasets: [{ data: [25, 75] }] });
            expect(p._segments[0].label).toBe('X');
            expect(p._segments[0].pct).toBe(25);
            expect(p._segments[1].pct).toBe(75);
        });

        it('parses object map { A: n, B: m }', () => {
            const p = new PieChart({});
            p._parseData({ A: 5, B: 5 });
            expect(p._segments.length).toBe(2);
            expect(p._segments[0].pct).toBe(50);
            expect(p._segments[1].pct).toBe(50);
        });

        it('preserves per-item color from array shape', () => {
            const p = new PieChart({});
            p._parseData([
                { label: 'A', value: 10, color: '#deadbe' },
                { label: 'B', value: 90 }
            ]);
            expect(p._segments[0].color).toBe('#deadbe');
        });

        it('uses palette + generator for missing colors', () => {
            const p = new PieChart({
                colors: ['#aaa'],
                colorGenerator: (i) => `gen-${i}`
            });
            p._parseData([
                { label: 'A', value: 1 },
                { label: 'B', value: 1 },
                { label: 'C', value: 1 }
            ]);
            expect(p._segments[0].color).toBe('#aaa');
            expect(p._segments[1].color).toBe('gen-1');
            expect(p._segments[2].color).toBe('gen-2');
        });

        it('handles all-zero gracefully (pct = 0)', () => {
            const p = new PieChart({});
            p._parseData([{ label: 'A', value: 0 }, { label: 'B', value: 0 }]);
            expect(p._segments[0].pct).toBe(0);
            expect(p._segments[1].pct).toBe(0);
        });
    });

    describe('PieChart — geometry', () => {
        it('builds segments with sequential angles summing to 2π', () => {
            const p = new PieChart({});
            p._parseData([
                { label: 'A', value: 1 },
                { label: 'B', value: 1 },
                { label: 'C', value: 2 }
            ]);
            const geom = p._buildSegmentGeometry(p._segments);
            expect(geom.length).toBe(3);
            // last endAngle should be start (-π/2) + 2π
            const last = geom[geom.length - 1].endAngle;
            const first = geom[0].startAngle;
            expect(Math.abs((last - first) - Math.PI * 2)).toBeLessThan(1e-9);
        });
    });

    describe('PieChart — legendPosition: none', () => {
        it("hides the legend when legendPosition is 'none'", () => {
            const p = new PieChart({ legendPosition: 'none' });
            expect(p.showLegend).toBe(false);
        });
    });
};
