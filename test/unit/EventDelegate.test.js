/**
 * EventDelegate Unit Tests
 *
 * Regression coverage for the input-events-need-data-filter bug:
 *   <input data-action="filter"> must dispatch onActionFilter on input/change
 *   events, not only on click. Verifies the new behavior plus the existing
 *   data-change-action live-search path still works.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    await testHelpers.setup();
    const View = loadModule('View');

    /**
     * Build a minimal View with the given inner HTML, mount it, and return it.
     * The View is appended to #test-container so EventDelegate can bind to a
     * DOM-attached root.
     */
    async function mountView(html, viewProps = {}) {
        const container = testHelpers.createTestContainer();
        const view = new View({ tagName: 'div', template: html, ...viewProps });
        await view.render();
        container.appendChild(view.element);
        view.bindEvents();
        view.mounted = true;
        return view;
    }

    function fireEvent(el, type) {
        const ev = new Event(type, { bubbles: true, cancelable: true });
        el.dispatchEvent(ev);
        return ev;
    }

    /**
     * Build a parent View with a child View nested inside it. The parent's
     * template must include a `<div data-slot></div>` where the child's
     * element is inserted. Both Views get their delegates bound, and the
     * child is registered via `addChild` so EventDelegate.shouldHandle's
     * `owns` / `contains` distinction works correctly.
     */
    async function mountNested({ parentTemplate, childTemplate, parentProps = {}, childProps = {} }) {
        const container = testHelpers.createTestContainer();

        const child = new View({ tagName: 'div', template: childTemplate, ...childProps });
        await child.render();

        const parent = new View({ tagName: 'div', template: parentTemplate, ...parentProps });
        await parent.render();

        const slot = parent.element.querySelector('[data-slot]');
        slot.appendChild(child.element);

        container.appendChild(parent.element);

        parent.addChild(child);

        parent.bindEvents();
        child.bindEvents();
        parent.mounted = true;
        child.mounted = true;

        return { parent, child };
    }

    describe('EventDelegate — nested delegate isolation', () => {
        let parent, child;

        afterEach(() => {
            if (child) { child.unbindEvents(); child = null; }
            if (parent) {
                parent.unbindEvents();
                if (parent.element && parent.element.parentNode) {
                    parent.element.parentNode.removeChild(parent.element);
                }
                parent = null;
            }
            testHelpers.cleanupTestContainer();
        });

        async function settle() {
            for (let i = 0; i < 5; i++) await Promise.resolve();
        }

        it('inner truthy onAction* (sync) stops parent dispatch', async () => {
            ({ parent, child } = await mountNested({
                parentTemplate: '<div><div data-slot></div></div>',
                childTemplate: '<button data-action="edit-meta">Edit</button>',
            }));
            const calls = { parent: 0, child: 0 };
            parent.onActionEditMeta = function() { calls.parent++; return true; };
            child.onActionEditMeta = function() { calls.child++; return true; };

            child.element.querySelector('button').click();
            await settle();

            expect(calls.child).toBe(1);
            expect(calls.parent).toBe(0);
        });

        it('inner truthy onAction* (async) stops parent dispatch — regression for async race', async () => {
            ({ parent, child } = await mountNested({
                parentTemplate: '<div><div data-slot></div></div>',
                childTemplate: '<button data-action="edit-meta">Edit</button>',
            }));
            const calls = { parent: 0, child: 0 };
            parent.onActionEditMeta = async function() { calls.parent++; return true; };
            child.onActionEditMeta = async function() {
                await Promise.resolve();
                await Promise.resolve();
                calls.child++;
                return true;
            };

            child.element.querySelector('button').click();
            await settle();

            expect(calls.child).toBe(1);
            expect(calls.parent).toBe(0);
        });

        it('inner falsy onAction* lets parent dispatch (preserves existing delegate-up contract)', async () => {
            ({ parent, child } = await mountNested({
                parentTemplate: '<div><div data-slot></div></div>',
                childTemplate: '<button data-action="edit-meta">Edit</button>',
            }));
            const order = [];
            parent.onActionEditMeta = async function() { order.push('parent'); return true; };
            child.onActionEditMeta = async function() { order.push('child'); return false; };

            child.element.querySelector('button').click();
            await settle();

            expect(order).toEqual(['child', 'parent']);
        });

        it('inner handleAction* (always-consume) stops parent dispatch', async () => {
            ({ parent, child } = await mountNested({
                parentTemplate: '<div><div data-slot></div></div>',
                childTemplate: '<button data-action="save">Save</button>',
            }));
            const calls = { parent: 0, child: 0 };
            parent.onActionSave = async function() { calls.parent++; return true; };
            child.handleActionSave = async function() { calls.child++; };

            child.element.querySelector('button').click();
            await settle();

            expect(calls.child).toBe(1);
            expect(calls.parent).toBe(0);
        });

        it('inner onPassThruAction* never consumes — parent still fires', async () => {
            ({ parent, child } = await mountNested({
                parentTemplate: '<div><div data-slot></div></div>',
                childTemplate: '<button data-action="track">Track</button>',
            }));
            const order = [];
            parent.onActionTrack = async function() { order.push('parent'); return true; };
            child.onPassThruActionTrack = async function() { order.push('child'); };

            child.element.querySelector('button').click();
            await settle();

            expect(order).toEqual(['child', 'parent']);
        });

        it('only parent has the handler — parent fires once', async () => {
            ({ parent, child } = await mountNested({
                parentTemplate: '<div><div data-slot></div></div>',
                childTemplate: '<button data-action="edit-meta">Edit</button>',
            }));
            const calls = { parent: 0 };
            parent.onActionEditMeta = async function() { calls.parent++; return true; };

            child.element.querySelector('button').click();
            await settle();

            expect(calls.parent).toBe(1);
        });

        it('three-level nesting: deepest truthy consume stops both ancestors', async () => {
            const container = testHelpers.createTestContainer();
            const leaf = new View({ tagName: 'div', template: '<button data-action="edit-meta">x</button>' });
            await leaf.render();
            const mid = new View({ tagName: 'div', template: '<div><div data-slot></div></div>' });
            await mid.render();
            const grand = new View({ tagName: 'div', template: '<div><div data-slot></div></div>' });
            await grand.render();

            mid.element.querySelector('[data-slot]').appendChild(leaf.element);
            grand.element.querySelector('[data-slot]').appendChild(mid.element);
            container.appendChild(grand.element);

            mid.addChild(leaf);
            grand.addChild(mid);

            grand.bindEvents(); mid.bindEvents(); leaf.bindEvents();
            grand.mounted = mid.mounted = leaf.mounted = true;

            const calls = { grand: 0, mid: 0, leaf: 0 };
            grand.onActionEditMeta = async function() { calls.grand++; return true; };
            mid.onActionEditMeta   = async function() { calls.mid++;   return true; };
            leaf.onActionEditMeta  = async function() { calls.leaf++;  return true; };

            try {
                leaf.element.querySelector('button').click();
                await settle();
                expect(calls.leaf).toBe(1);
                expect(calls.mid).toBe(0);
                expect(calls.grand).toBe(0);
            } finally {
                leaf.unbindEvents(); mid.unbindEvents(); grand.unbindEvents();
                if (grand.element.parentNode) grand.element.parentNode.removeChild(grand.element);
            }
        });
    });

    describe('EventDelegate — data-action on form controls', () => {
        let view;

        afterEach(() => {
            if (view) {
                view.unbindEvents();
                if (view.element && view.element.parentNode) {
                    view.element.parentNode.removeChild(view.element);
                }
                view = null;
            }
            testHelpers.cleanupTestContainer();
        });

        it('fires onActionFilter when an input event hits <input data-action="filter">', async () => {
            const calls = [];
            view = await mountView('<input data-action="filter" />');
            view.onActionFilter = function(event, el) {
                calls.push({ type: event.type, tag: el.tagName });
                return true;
            };

            const input = view.element.querySelector('input');
            input.value = 'a';
            fireEvent(input, 'input');

            // dispatch resolves on a microtask
            await Promise.resolve();
            await Promise.resolve();

            expect(calls.length).toBe(1);
            expect(calls[0].type).toBe('input');
            expect(calls[0].tag).toBe('INPUT');
        });

        it('fires onActionFilter on change for <select data-action="filter">', async () => {
            const calls = [];
            view = await mountView(
                '<select data-action="filter">' +
                '  <option value="a">A</option>' +
                '  <option value="b">B</option>' +
                '</select>'
            );
            view.onActionFilter = function(event, el) {
                calls.push({ type: event.type, value: el.value });
                return true;
            };

            const select = view.element.querySelector('select');
            select.value = 'b';
            fireEvent(select, 'change');

            await Promise.resolve();
            await Promise.resolve();

            expect(calls.length).toBe(1);
            expect(calls[0].type).toBe('change');
            expect(calls[0].value).toBe('b');
        });

        it('fires onActionFilter on input for <textarea data-action="filter">', async () => {
            const calls = [];
            view = await mountView('<textarea data-action="filter"></textarea>');
            view.onActionFilter = function(event, el) {
                calls.push({ type: event.type });
                return true;
            };

            const ta = view.element.querySelector('textarea');
            ta.value = 'hello';
            fireEvent(ta, 'input');

            await Promise.resolve();
            await Promise.resolve();

            expect(calls.length).toBe(1);
            expect(calls[0].type).toBe('input');
        });

        it('does NOT fire onActionFilter on input for non-form-control elements', async () => {
            const calls = [];
            view = await mountView('<button data-action="filter">Filter</button>');
            view.onActionFilter = function() {
                calls.push(1);
                return true;
            };

            const btn = view.element.querySelector('button');
            // Synthesizing input on a button (which never naturally fires it)
            // must not be picked up by the new path.
            fireEvent(btn, 'input');

            await Promise.resolve();
            await Promise.resolve();

            expect(calls.length).toBe(0);
        });

        it('still fires onActionFilter on click for buttons (existing behavior)', async () => {
            const calls = [];
            view = await mountView('<button data-action="filter">Filter</button>');
            view.onActionFilter = function() {
                calls.push(1);
                return true;
            };

            const btn = view.element.querySelector('button');
            btn.click();

            // click handler is async; let it resolve
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();

            expect(calls.length).toBe(1);
        });

        it('debounces input dispatch when data-action-debounce is set', async () => {
            const calls = [];
            view = await mountView('<input data-action="filter" data-action-debounce="50" />');
            view.onActionFilter = function() {
                calls.push(1);
                return true;
            };

            const input = view.element.querySelector('input');
            fireEvent(input, 'input');
            fireEvent(input, 'input');
            fireEvent(input, 'input');

            // Immediately after rapid input events, no dispatch yet.
            await Promise.resolve();
            expect(calls.length).toBe(0);

            // Wait past the debounce window.
            await new Promise((resolve) => setTimeout(resolve, 80));
            await Promise.resolve();

            expect(calls.length).toBe(1);
        });

        it('prefers data-change-action over data-action on a form control (change event)', async () => {
            // change events run a non-debounced path, so we don't need timers.
            const actionCalls = [];
            const changeCalls = [];
            view = await mountView(
                '<input data-change-action="search" data-action="filter" />'
            );
            view.onActionFilter = function() { actionCalls.push(1); return true; };
            view.onChangeSearch = function() { changeCalls.push(1); return true; };

            const input = view.element.querySelector('input');
            fireEvent(input, 'change');

            await Promise.resolve();
            await Promise.resolve();

            expect(changeCalls.length).toBe(1);
            expect(actionCalls.length).toBe(0);
        });

        it('does not fire onChange handlers when only data-action is set (no data-change-action)', async () => {
            const actionCalls = [];
            const changeCalls = [];
            view = await mountView('<input data-action="filter" />');
            view.onActionFilter = function() { actionCalls.push(1); return true; };
            view.onChangeFilter = function() { changeCalls.push(1); return true; };

            const input = view.element.querySelector('input');
            fireEvent(input, 'input');

            await Promise.resolve();
            await Promise.resolve();

            expect(actionCalls.length).toBe(1);
            expect(changeCalls.length).toBe(0);
        });
    });
};
