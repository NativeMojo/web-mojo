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
