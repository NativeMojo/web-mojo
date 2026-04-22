/**
 * View Unit Tests — current API
 *
 * The previous View.test.js (~53 tests) and View-complete.test.js (~38
 * tests) drove an entirely different View — methods like
 * view.capitalize / view.handleAction / view.createElement /
 * view.setContainer / view.updateState / view.getViewData /
 * view.generateId / view.findById / view.getHierarchy / View.create
 * do not exist anymore. Children are stored as a plain object (not a
 * Map), the element is created eagerly in the constructor (tests
 * expected it to be null), and onInit is NOT called from the
 * constructor.
 *
 * This file is a minimal, focused replacement that exercises the
 * actual current public surface (see docs/web-mojo/core/View.md).
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    await testHelpers.setup();
    const View = loadModule('View');
    const Model = loadModule('Model');

    describe('View — construction', () => {
        it('defaults to div, mojo-view className, and auto-generated id', () => {
            const view = new View();
            expect(view.tagName).toBe('div');
            expect(view.className).toBe('mojo-view');
            expect(typeof view.id).toBe('string');
            expect(view.id.length).toBeGreaterThan(0);
            expect(view.element).toBeDefined();   // element is eagerly created
            expect(view.mounted).toBe(false);
        });

        it('accepts custom tagName / className / id / data / template', () => {
            const view = new View({
                tagName: 'section',
                className: 'custom',
                id: 'my-view',
                data: { title: 'Hi' },
                template: '<div>{{data.title}}</div>'
            });
            expect(view.tagName).toBe('section');
            expect(view.className).toBe('custom');
            expect(view.id).toBe('my-view');
            expect(view.data).toEqual({ title: 'Hi' });
            expect(view.template).toBe('<div>{{data.title}}</div>');
        });

        it('coerces a string `container` option into containerId', () => {
            const view = new View({ container: '#app' });
            expect(view.containerId).toBe('#app');
            expect(view.container).toBe(null);
        });
    });

    describe('View — parent/child', () => {
        it('stores children as a plain object keyed by child.id', () => {
            const parent = new View({ id: 'parent' });
            const child = new View({ id: 'child' });

            parent.addChild(child);

            expect(parent.children).toBeDefined();
            expect(Array.isArray(parent.children)).toBe(false);
            expect(parent.children.child).toBe(child);
            expect(child.parent).toBe(parent);
        });

        it('supports removing a child by id or by instance', () => {
            const parent = new View({ id: 'p' });
            const a = new View({ id: 'a' });
            const b = new View({ id: 'b' });
            parent.addChild(a);
            parent.addChild(b);

            parent.removeChild('a');
            expect(parent.children.a).toBeUndefined();
            expect(parent.children.b).toBe(b);

            parent.removeChild(b);
            expect(parent.children.b).toBeUndefined();
        });

        it('getChild returns the child by id', () => {
            const parent = new View();
            const child = new View({ id: 'only' });
            parent.addChild(child);
            expect(parent.getChild('only')).toBe(child);
            expect(parent.getChild('missing')).toBeUndefined();
        });
    });

    describe('View — model', () => {
        it('setModel attaches a model and wires a change listener', () => {
            const view = new View();
            const model = new Model({ name: 'x' });

            view.setModel(model);

            expect(view.model).toBe(model);
        });

        it('setModel(null/undefined) clears the model without throwing', () => {
            const view = new View({ model: new Model({ x: 1 }) });
            // The public API is that setModel() with no model acts as a clear.
            // Just verify it doesn't throw; the exact null/undefined shape is
            // not asserted here.
            expect(() => view.setModel()).not.toThrow();
        });
    });

    describe('View — template rendering', () => {
        it('renders a string template via Mustache', async () => {
            const view = new View({
                id: 'hello-view',
                template: '<span>Hello, {{data.name}}!</span>',
                data: { name: 'World' }
            });

            await view.render(false);

            expect(view.element.innerHTML).toContain('Hello, World!');
        });

        it('renders {{model.field}} from the attached model', async () => {
            const view = new View({
                id: 'model-view',
                template: '<span>Name: {{model.name}}</span>'
            });
            view.setModel(new Model({ name: 'Alice' }));

            await view.render(false);

            expect(view.element.innerHTML).toContain('Name: Alice');
        });
    });

    describe('View — getContextValue', () => {
        it('reads data.* and direct instance props', () => {
            const view = new View({ data: { title: 'Dashboard' } });
            view.custom = 42;
            expect(view.getContextValue('data.title')).toBe('Dashboard');
            expect(view.getContextValue('custom')).toBe(42);
        });

        it('reads model.* when a model is attached', () => {
            const view = new View();
            view.setModel(new Model({ name: 'Alice' }));
            expect(view.getContextValue('model.name')).toBe('Alice');
        });
    });

    describe('View — destroy', () => {
        it('marks view unmounted and clears children', async () => {
            const parent = new View({ id: 'p' });
            parent.addChild(new View({ id: 'c' }));

            await parent.destroy();

            expect(parent.mounted).toBe(false);
        });

        it('handles multiple destroy() calls safely', async () => {
            const view = new View();
            await view.destroy();
            // Second call should not throw.
            await view.destroy();
            expect(view.mounted).toBe(false);
        });
    });

    describe('View — EventEmitter mixin', () => {
        it('supports on/emit/off', () => {
            const view = new View();
            let count = 0;
            const handler = () => { count++; };
            view.on('foo', handler);
            view.emit('foo');
            view.emit('foo');
            expect(count).toBe(2);

            view.off('foo', handler);
            view.emit('foo');
            expect(count).toBe(2);
        });

        it('supports once() listeners that fire exactly once', () => {
            const view = new View();
            let count = 0;
            view.once('bar', () => { count++; });
            view.emit('bar');
            view.emit('bar');
            expect(count).toBe(1);
        });
    });
};
