/**
 * MOJOUtils.getNestedValue hardening tests
 *
 * These tests pin the security properties added in commit
 * (this fix): no prototype-chain key reaches a template, no
 * Object.prototype builtin auto-invokes, and the walker is robust
 * against API payloads that shadow `hasOwnProperty`.
 *
 * Custom view methods (own functions, or functions defined on a
 * non-Object subclass prototype like a View extension) still
 * auto-invoke at the top level — that's existing framework behavior
 * the hardening must preserve.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    const MOJOUtils = loadModule('MOJOUtils');

    describe('MOJOUtils.getNestedValue — prototype-key blocklist', () => {
        const data = { name: 'Alice', user: { id: 1, profile: { nick: 'al' } } };

        it('returns undefined for __proto__ at depth 0', () => {
            expect(MOJOUtils.getNestedValue(data, '__proto__')).toBeUndefined();
        });

        it('returns undefined for constructor at depth 0', () => {
            expect(MOJOUtils.getNestedValue(data, 'constructor')).toBeUndefined();
        });

        it('returns undefined for prototype at depth 0', () => {
            expect(MOJOUtils.getNestedValue(data, 'prototype')).toBeUndefined();
        });

        it('returns undefined for __proto__ at depth ≥ 1', () => {
            expect(MOJOUtils.getNestedValue(data, 'user.__proto__')).toBeUndefined();
            expect(MOJOUtils.getNestedValue(data, 'user.__proto__.x')).toBeUndefined();
        });

        it('returns undefined for constructor at depth ≥ 1', () => {
            expect(MOJOUtils.getNestedValue(data, 'user.constructor')).toBeUndefined();
            expect(MOJOUtils.getNestedValue(data, 'user.constructor.name')).toBeUndefined();
        });

        it('returns undefined for prototype at depth ≥ 1', () => {
            expect(MOJOUtils.getNestedValue(data, 'user.profile.prototype')).toBeUndefined();
        });
    });

    describe('MOJOUtils.getNestedValue — Object.prototype builtins do not auto-invoke', () => {
        const data = { name: 'Alice' };

        it('returns undefined for toString', () => {
            expect(MOJOUtils.getNestedValue(data, 'toString')).toBeUndefined();
        });

        it('returns undefined for valueOf', () => {
            expect(MOJOUtils.getNestedValue(data, 'valueOf')).toBeUndefined();
        });

        it('returns undefined for hasOwnProperty', () => {
            expect(MOJOUtils.getNestedValue(data, 'hasOwnProperty')).toBeUndefined();
        });

        it('returns undefined for propertyIsEnumerable', () => {
            expect(MOJOUtils.getNestedValue(data, 'propertyIsEnumerable')).toBeUndefined();
        });

        it('returns undefined for isPrototypeOf', () => {
            expect(MOJOUtils.getNestedValue(data, 'isPrototypeOf')).toBeUndefined();
        });

        it('returns undefined for nested toString (depth ≥ 1)', () => {
            const nested = { user: { name: 'A' } };
            expect(MOJOUtils.getNestedValue(nested, 'user.toString')).toBeUndefined();
        });
    });

    describe('MOJOUtils.getNestedValue — custom methods still auto-invoke', () => {
        it('invokes own functions on a context literal', () => {
            const ctx = {
                name: 'John',
                getName() { return this.name; },
                getGreeting() { return `Hello, ${this.name}!`; }
            };
            expect(MOJOUtils.getNestedValue(ctx, 'getName')).toBe('John');
            expect(MOJOUtils.getNestedValue(ctx, 'getGreeting')).toBe('Hello, John!');
        });

        it('invokes class-defined methods reached via prototype chain', () => {
            class Foo {
                constructor() { this.name = 'instance'; }
                getStatus() { return 'ok'; }
            }
            const f = new Foo();
            expect(MOJOUtils.getNestedValue(f, 'getStatus')).toBe('ok');
            expect(MOJOUtils.getNestedValue(f, 'name')).toBe('instance');
        });

        it('invokes a user-overridden toString (different reference than Object.prototype.toString)', () => {
            const ctx = { toString() { return 'custom'; } };
            expect(MOJOUtils.getNestedValue(ctx, 'toString')).toBe('custom');
        });
    });

    describe('MOJOUtils.getNestedValue — robustness', () => {
        it('does not break when the payload shadows hasOwnProperty', () => {
            // The walker uses Object.prototype.hasOwnProperty.call(...) so a
            // payload field named `hasOwnProperty` does not break it.
            const payload = { hasOwnProperty: 1, name: 'Alice', nested: { value: 42 } };
            expect(MOJOUtils.getNestedValue(payload, 'name')).toBe('Alice');
            expect(MOJOUtils.getNestedValue(payload, 'nested.value')).toBe(42);
            // The shadowing field itself is the primitive `1` (own value,
            // not a function), so it simply reads through. Object.prototype
            // builtin protection only fires for function-typed values.
            expect(MOJOUtils.getNestedValue(payload, 'hasOwnProperty')).toBe(1);
        });

        it('preserves array-index access at depth ≥ 1', () => {
            const ctx = { items: [{ name: 'A' }, { name: 'B' }] };
            expect(MOJOUtils.getNestedValue(ctx, 'items.0.name')).toBe('A');
            expect(MOJOUtils.getNestedValue(ctx, 'items.1.name')).toBe('B');
        });

        it('returns undefined for missing paths (no change)', () => {
            const ctx = { user: { name: 'A' } };
            expect(MOJOUtils.getNestedValue(ctx, 'user.missing')).toBeUndefined();
            expect(MOJOUtils.getNestedValue(ctx, 'missing.path')).toBeUndefined();
            expect(MOJOUtils.getNestedValue(null, 'anything')).toBeUndefined();
            expect(MOJOUtils.getNestedValue({}, '')).toBeUndefined();
        });
    });

    describe('DataWrapper.getContextValue — prototype-key blocklist', () => {
        // The wrapper has its own direct-access shortcut that bypasses
        // getNestedValue when the key matches a wrapper property. Without
        // hardening, `__proto__` / `constructor` / `prototype` would return
        // wrapper internals.
        // simple-module-loader returns the default export; the class is
        // attached statically as MOJOUtils.DataWrapper.
        const Wrapper = MOJOUtils.DataWrapper;

        it('blocks __proto__ on the wrapper shortcut', () => {
            const w = new Wrapper({ name: 'A' });
            expect(w.getContextValue('__proto__')).toBeUndefined();
        });

        it('blocks constructor on the wrapper shortcut', () => {
            const w = new Wrapper({ name: 'A' });
            expect(w.getContextValue('constructor')).toBeUndefined();
        });

        it('blocks prototype on the wrapper shortcut', () => {
            const w = new Wrapper({ name: 'A' });
            expect(w.getContextValue('prototype')).toBeUndefined();
        });

        it('still resolves real fields normally', () => {
            const w = new Wrapper({ name: 'Alice', nested: { id: 7 } });
            expect(w.getContextValue('name')).toBe('Alice');
            expect(w.getContextValue('nested.id')).toBe(7);
        });
    });
};
