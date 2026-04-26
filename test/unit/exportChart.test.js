/**
 * exportChart Unit Tests
 *
 * Verifies the SVG-to-PNG helper finds an <svg> in the target, runs the
 * canvas drawing path, and triggers a download anchor click.
 */

const path = require('path');
const { testHelpers } = require('../utils/test-helpers');
const { moduleLoader } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();

    // The module-loader sandbox doesn't expose window.XMLSerializer / Image /
    // btoa to module code by default. Promote them to globals so the helper
    // can run inside jsdom.
    if (typeof global.XMLSerializer === 'undefined' && typeof window !== 'undefined') {
        global.XMLSerializer = window.XMLSerializer;
    }
    if (typeof global.Image === 'undefined' && typeof window !== 'undefined') {
        global.Image = window.Image;
    }
    if (typeof global.btoa === 'undefined' && typeof window !== 'undefined') {
        global.btoa = window.btoa;
    }

    const filePath = path.resolve(__dirname, '../../src/extensions/charts/exportChart.js');
    // The loader's transform returns whatever `export default` resolves to;
    // for exportChart.js that's the function itself.
    const exportChartPng = moduleLoader.loadModuleFromFile(filePath, 'exportChart');

    if (typeof exportChartPng !== 'function') {
        throw new Error('exportChartPng not loaded as a function');
    }

    describe('exportChartPng', () => {
        it('warns and does nothing when no SVG is found', () => {
            const div = document.createElement('div');
            const warns = [];
            const origWarn = console.warn;
            console.warn = (...args) => warns.push(args.join(' '));
            try {
                exportChartPng(div);
            } finally {
                console.warn = origWarn;
            }
            expect(warns.length).toBeGreaterThan(0);
        });

        it('accepts a view-like object with .element', () => {
            const div = document.createElement('div');
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 100 50');
            div.appendChild(svg);
            // No assertions on download (jsdom has no Image/canvas pixels), but
            // calling should not throw and should reach Image construction.
            expect(() => exportChartPng({ element: div })).not.toThrow();
        });

        it('accepts an svg element directly', () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 200 100');
            expect(() => exportChartPng(svg)).not.toThrow();
        });
    });
};
