/**
 * Mustache dot-prefix lookup regression tests
 *
 * Inside an iteration `{{#items}} ... {{/items}}`, a leading dot means
 * "look up on the current iteration item only, do not walk the parent
 * context chain."
 *
 * Single-segment dot paths (`{{.rank}}`) work, and bare multi-segment
 * paths (`{{group.name}}`) work via the non-prefix branch, but
 * dot-prefixed multi-segment paths (`{{.group.name}}`) currently render
 * empty because the dot-prefix branch in Context.lookup only does a
 * single property access on `actualName` and never splits on `.` to
 * walk nested objects.
 *
 * This regression bites when the iteration item is a plain object (no
 * `getContextValue`). When the top-level context has `getContextValue`
 * (e.g. a View instance), `Mustache.render`'s auto-wrap is skipped, so
 * iteration items stay unwrapped and the bug surfaces.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    const Mustache = loadModule('MojoMustache');

    describe('Mustache dot-prefix lookup', () => {
        const data = {
            merchants: [
                { rank: 1, group: { id: 'g1', name: 'Acme' }, total_transactions: 42 },
                { rank: 2, group: { id: 'g2', name: 'Globex' }, total_transactions: 17 }
            ]
        };

        // Simulates a View instance: presence of `getContextValue` on the
        // top-level context bypasses Mustache.render's auto-wrap, so
        // iteration items remain plain objects (no getContextValue).
        function viewLike(extra) {
            return Object.assign({
                getContextValue(path) {
                    const parts = path.split('.');
                    let v = this;
                    for (const p of parts) {
                        if (v == null) return undefined;
                        v = v[p];
                    }
                    return v;
                }
            }, extra);
        }

        it('resolves single-segment dot path inside iteration', () => {
            const tpl = '{{#merchants}}[{{.rank}}]{{/merchants}}';
            expect(Mustache.render(tpl, viewLike(data))).toBe('[1][2]');
        });

        it('resolves bare multi-segment path inside iteration', () => {
            const tpl = '{{#merchants}}[{{group.name}}|{{group.id}}]{{/merchants}}';
            expect(Mustache.render(tpl, viewLike(data))).toBe('[Acme|g1][Globex|g2]');
        });

        // Regression: this is the bug. Currently renders "[||][||]".
        it('resolves dot-prefixed multi-segment path inside iteration', () => {
            const tpl = '{{#merchants}}[{{.group.name}}|{{.group.id}}]{{/merchants}}';
            expect(Mustache.render(tpl, viewLike(data))).toBe('[Acme|g1][Globex|g2]');
        });

        it('resolves dot-prefixed multi-segment path with three segments', () => {
            const nested = viewLike({
                rows: [
                    { user: { profile: { name: 'Alice' } } },
                    { user: { profile: { name: 'Bob' } } }
                ]
            });
            const tpl = '{{#rows}}[{{.user.profile.name}}]{{/rows}}';
            expect(Mustache.render(tpl, nested)).toBe('[Alice][Bob]');
        });

        // Adversarial: the multi-segment dot-prefix walk must not let templates
        // read prototype-chain properties on iteration items. `getNestedValue`'s
        // first-key `hasOwnProperty` guard blocks `__proto__` and `constructor`
        // at depth 0; intermediate-step access does not return the bare
        // prototype object either. These tests lock in the safe behavior so a
        // future refactor of the lookup path can't silently regress it.
        it('does not expose __proto__ via dot-prefix multi-segment lookup', () => {
            const tpl = '{{#merchants}}|{{.__proto__.polluted}}|{{/merchants}}';
            expect(Mustache.render(tpl, viewLike(data))).toBe('||||');
        });

        it('does not expose constructor.name via dot-prefix lookup', () => {
            const tpl = '{{#merchants}}|{{.constructor.name}}|{{/merchants}}';
            expect(Mustache.render(tpl, viewLike(data))).toBe('||||');
        });

        it('does not expose nested.constructor.prototype via dot-prefix lookup', () => {
            const tpl = '{{#merchants}}|{{.group.constructor.prototype}}|{{/merchants}}';
            expect(Mustache.render(tpl, viewLike(data))).toBe('||||');
        });

        it('does not expose nested.__proto__ via dot-prefix lookup', () => {
            const tpl = '{{#merchants}}|{{.group.__proto__.x}}|{{/merchants}}';
            expect(Mustache.render(tpl, viewLike(data))).toBe('||||');
        });
    });
};
