/**
 * Piped-section regression tests — `{{#x|bool}}` / `{{^x|bool}}` with empty
 * arrays.
 *
 * Root cause: DataFormatter.apply() supports an alternate call shape
 * `apply(value, [...pipeNames])`, detected by "value is an array of
 * strings". An EMPTY array vacuously satisfies `every(p => typeof p ===
 * 'string')`, so `pipe([], 'bool')` took the swapped branch, reduced over
 * zero formatter names, and returned the seed — the formatter NAME string
 * ('bool'), which is truthy. Net effect in templates: with `x = []`,
 * `{{#x|bool}}` rendered its body and `{{^x|bool}}` rendered nothing —
 * both inverted from the documented behavior (Templates.md recommends
 * `{{^items|bool}}` for empty-state blocks).
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    const dataFormatter = loadModule('dataFormatter');
    const Mustache = loadModule('MojoMustache');

    // Mirror setupModules(): MojoMustache resolves pipes through
    // window.dataFormatter / window.MOJO.dataFormatter.
    if (global.window) {
        global.window.dataFormatter = dataFormatter;
        global.window.MOJO = global.window.MOJO || {};
        global.window.MOJO.dataFormatter = dataFormatter;
    }

    describe('DataFormatter pipes on empty arrays', () => {
        it('pipe([], "bool") is false, not the formatter name', () => {
            expect(dataFormatter.pipe([], 'bool')).toBe(false);
        });

        it('apply("bool", []) runs the formatter instead of the arg-swap branch', () => {
            expect(dataFormatter.apply('bool', [])).toBe(false);
        });

        it('the alternate apply(value, [...pipeNames]) shape still works', () => {
            expect(dataFormatter.apply('hello', ['uppercase'])).toBe('HELLO');
        });

        it('pipe on a non-empty array still applies the formatter', () => {
            expect(dataFormatter.pipe([1], 'bool')).toBe(true);
        });
    });

    describe('piped sections over arrays and booleans', () => {
        const render = (tpl, data) => Mustache.render(tpl, data);

        it('{{^x|bool}} renders for an empty array', () => {
            expect(render('{{^x|bool}}EMPTY{{/x|bool}}', { x: [] })).toBe('EMPTY');
        });

        it('{{^x|bool}} renders for false and for a missing key', () => {
            expect(render('{{^x|bool}}EMPTY{{/x|bool}}', { x: false })).toBe('EMPTY');
            expect(render('{{^x|bool}}EMPTY{{/x|bool}}', {})).toBe('EMPTY');
        });

        it('{{^x|bool}} renders nothing for truthy values', () => {
            expect(render('{{^x|bool}}EMPTY{{/x|bool}}', { x: [1] })).toBe('');
            expect(render('{{^x|bool}}EMPTY{{/x|bool}}', { x: true })).toBe('');
        });

        it('{{#x|bool}} renders nothing for an empty array', () => {
            expect(render('{{#x|bool}}FULL{{/x|bool}}', { x: [] })).toBe('');
        });

        it('{{#x|bool}} renders once (no iteration) for truthy values', () => {
            expect(render('{{#x|bool}}FULL{{/x|bool}}', { x: [1, 2, 3] })).toBe('FULL');
            expect(render('{{#x|bool}}FULL{{/x|bool}}', { x: true })).toBe('FULL');
        });

        it('plain inverted sections keep working', () => {
            expect(render('{{^x}}EMPTY{{/x}}', { x: [] })).toBe('EMPTY');
            expect(render('{{^x}}EMPTY{{/x}}', { x: [1] })).toBe('');
        });
    });
};
