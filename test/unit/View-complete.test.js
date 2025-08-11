/**
 * Complete View Unit Tests
 * Comprehensive tests for the MOJO Framework View component
 * Including parent-child relationships and model support
 */

const path = require('path');
const { testHelpers } = require('../utils/test-helpers');
const { setupModules } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect, assert } = testContext;
    
    // Set up test environment
    await testHelpers.setup();
    
    // Load View class
    let View;
    try {
        const modules = setupModules(testContext);
        View = modules.View;
        
        if (!View) {
            throw new Error('View module could not be loaded');
        }
    } catch (error) {
        throw new Error(`Failed to load View: ${error.message}`);
    }

    describe('View Core Construction', () => {
        it('should create new View instance with default options', () => {
            const view = new View();
            
            expect(view.id).toBeTruthy();
            expect(view.container).toBe(null);
            expect(view.element).toBe(null);
            expect(view.parent).toBe(null);
            expect(view.model).toBe(null);
            expect(view.children instanceof Map).toBeTruthy();
            expect(Array.isArray(view.childOrder)).toBeTruthy();
            expect(view.rendered).toBe(false);
            expect(view.mounted).toBe(false);
            expect(view.destroyed).toBe(false);
        });

        it('should create View with custom options', () => {
            const options = {
                id: 'test-view',
                template: '<div>{{title}}</div>',
                data: { title: 'Test Title' },
                className: 'test-class',
                tagName: 'section'
            };
            
            const view = new View(options);
            
            expect(view.id).toBe('test-view');
            expect(view.template).toBe('<div>{{title}}</div>');
            expect(view.data.title).toBe('Test Title');
            expect(view.options.className).toBe('test-class');
            expect(view.options.tagName).toBe('section');
        });
    });

    describe('Parent-Child Relationships', () => {
        it('should add child view correctly', () => {
            const parent = new View({ id: 'parent' });
            const child = new View({ id: 'child' });
            
            parent.addChild(child);
            
            expect(child.parent).toBe(parent);
            expect(parent.children.has('child')).toBeTruthy();
            expect(parent.children.get('child')).toBe(child);
            expect(parent.childOrder).toContain('child');
        });

        it('should add multiple children', () => {
            const parent = new View({ id: 'parent' });
            const child1 = new View({ id: 'child1' });
            const child2 = new View({ id: 'child2' });
            const child3 = new View({ id: 'child3' });
            
            parent.addChild(child1);
            parent.addChild(child2);
            parent.addChild(child3);
            
            expect(parent.children.size).toBe(3);
            expect(parent.childOrder.length).toBe(3);
            expect(child1.parent).toBe(parent);
            expect(child2.parent).toBe(parent);
            expect(child3.parent).toBe(parent);
        });

        it('should remove child from previous parent when adding to new parent', () => {
            const parent1 = new View({ id: 'parent1' });
            const parent2 = new View({ id: 'parent2' });
            const child = new View({ id: 'child' });
            
            parent1.addChild(child);
            expect(child.parent).toBe(parent1);
            expect(parent1.children.has('child')).toBeTruthy();
            
            parent2.addChild(child);
            expect(child.parent).toBe(parent2);
            expect(parent2.children.has('child')).toBeTruthy();
            expect(parent1.children.has('child')).toBeFalsy();
        });

        it('should remove child view correctly', () => {
            const parent = new View({ id: 'parent' });
            const child = new View({ id: 'child' });
            
            parent.addChild(child);
            parent.removeChild(child);
            
            expect(child.parent).toBe(null);
            expect(parent.children.has('child')).toBeFalsy();
            expect(parent.childOrder).not.toContain('child');
        });

        it('should get child by key', () => {
            const parent = new View({ id: 'parent' });
            const child = new View({ id: 'child' });
            
            parent.addChild(child);
            
            const retrieved = parent.getChild('child');
            expect(retrieved).toBe(child);
        });

        it('should get all children', () => {
            const parent = new View({ id: 'parent' });
            const child1 = new View({ id: 'child1' });
            const child2 = new View({ id: 'child2' });
            
            parent.addChild(child1);
            parent.addChild(child2);
            
            const children = parent.getChildren();
            expect(children.length).toBe(2);
            expect(children).toContain(child1);
            expect(children).toContain(child2);
        });
    });

    describe('Model Support', () => {
        it('should set model correctly', () => {
            const view = new View({ id: 'test-view' });
            const model = { name: 'Test Model', value: 42 };
            
            view.setModel(model);
            
            expect(view.model).toBe(model);
        });

        it('should register for model change events', () => {
            const view = new View({ id: 'test-view' });
            const listeners = [];
            const model = {
                name: 'Test Model',
                on: function(event, callback) {
                    listeners.push({ event, callback });
                },
                off: function() {}
            };
            
            view.setModel(model);
            
            expect(listeners.length).toBe(1);
            expect(listeners[0].event).toBe('change');
            expect(typeof listeners[0].callback).toBe('function');
        });

        it('should unregister from previous model when setting new model', () => {
            const view = new View({ id: 'test-view' });
            let model1OffCalled = false;
            
            const model1 = {
                on: function() {},
                off: function(event) {
                    if (event === 'change') {
                        model1OffCalled = true;
                    }
                }
            };
            
            const model2 = {
                on: function() {},
                off: function() {}
            };
            
            view.setModel(model1);
            view.setModel(model2);
            
            expect(model1OffCalled).toBeTruthy();
            expect(view.model).toBe(model2);
        });

        it('should include model data in view data', async () => {
            const view = new View({ 
                id: 'test-view',
                data: { title: 'View Title' }
            });
            
            const model = { 
                name: 'Model Name',
                value: 100
            };
            
            view.setModel(model);
            
            const viewData = await view.getViewData();
            
            expect(viewData.name).toBe('Model Name');
            expect(viewData.value).toBe(100);
            expect(viewData.title).toBe('View Title');
            expect(viewData.id).toBe('test-view');
        });

        it('should prioritize view data over model data', async () => {
            const view = new View({ 
                id: 'test-view',
                data: { name: 'View Name' }
            });
            
            const model = { 
                name: 'Model Name',
                value: 100
            };
            
            view.setModel(model);
            
            const viewData = await view.getViewData();
            
            expect(viewData.name).toBe('View Name'); // View data takes precedence
            expect(viewData.value).toBe(100);
        });
    });

    describe('Container Resolution', () => {
        beforeEach(() => {
            // Clear the DOM
            document.body.innerHTML = '';
        });

        it('should use body as container when no parent and no element found', async () => {
            const view = new View({ id: 'test-view' });
            
            await view.render();
            
            expect(view.container).toBe(document.body);
        });

        it('should find element in body when no parent', async () => {
            // Create a placeholder in the body
            const container = document.createElement('div');
            container.id = 'container';
            const placeholder = document.createElement('div');
            placeholder.id = 'test-view';
            container.appendChild(placeholder);
            document.body.appendChild(container);
            
            const view = new View({ id: 'test-view' });
            
            await view.render();
            
            expect(view.container).toBe(container);
        });

        it('should use parent element as container when child has parent', async () => {
            const parent = new View({ 
                id: 'parent',
                template: '<div id="child"></div>'
            });
            const child = new View({ id: 'child' });
            
            parent.addChild(child);
            
            // First render parent
            await parent.render();
            
            // Child should be rendered to parent's element
            expect(child.parent).toBe(parent);
            expect(child.container).toBe(parent.element);
        });

        it('should find placeholder in parent element', async () => {
            const parent = new View({ 
                id: 'parent',
                template: '<div class="content"><div id="child-placeholder"></div></div>'
            });
            const child = new View({ id: 'child-placeholder' });
            
            parent.addChild(child);
            
            await parent.render();
            
            // Child should find the placeholder in parent's DOM
            const placeholder = parent.element.querySelector('#child-placeholder');
            expect(placeholder).toBeTruthy();
        });
    });

    describe('Lifecycle Hooks', () => {
        it('should call lifecycle hooks in correct order', async () => {
            const calls = [];
            
            const view = new View({
                id: 'test-view',
                template: '<div>Test</div>'
            });
            
            // Override lifecycle methods
            view.onInit = () => calls.push('onInit');
            view.onBeforeRender = async () => calls.push('onBeforeRender');
            view.onAfterRender = async () => calls.push('onAfterRender');
            view.onBeforeMount = async () => calls.push('onBeforeMount');
            view.onAfterMount = async () => calls.push('onAfterMount');
            
            // onInit is called during construction
            expect(calls).toContain('onInit');
            
            await view.render();
            
            expect(calls.indexOf('onBeforeRender')).toBeLessThan(calls.indexOf('onAfterRender'));
            expect(calls.indexOf('onBeforeMount')).toBeLessThan(calls.indexOf('onAfterMount'));
            expect(calls).toEqual(['onInit', 'onBeforeRender', 'onAfterRender', 'onBeforeMount', 'onAfterMount']);
        });

        it('should call destroy lifecycle hooks', async () => {
            const calls = [];
            
            const view = new View({
                id: 'test-view',
                template: '<div>Test</div>'
            });
            
            view.onBeforeDestroy = async () => calls.push('onBeforeDestroy');
            view.onAfterDestroy = async () => calls.push('onAfterDestroy');
            
            await view.render();
            await view.destroy();
            
            expect(calls).toContain('onBeforeDestroy');
            expect(calls).toContain('onAfterDestroy');
            expect(calls.indexOf('onBeforeDestroy')).toBeLessThan(calls.indexOf('onAfterDestroy'));
        });
    });

    describe('Rendering', () => {
        it('should render template with data', async () => {
            const view = new View({
                id: 'test-view',
                template: '<div>{{title}}</div>',
                data: { title: 'Hello World' }
            });
            
            await view.render();
            
            expect(view.element).toBeTruthy();
            expect(view.element.innerHTML).toContain('Hello World');
            expect(view.rendered).toBeTruthy();
        });

        it('should render with model data', async () => {
            const view = new View({
                id: 'test-view',
                template: '<div>{{name}} - {{value}}</div>'
            });
            
            const model = {
                name: 'Test Item',
                value: 42
            };
            
            view.setModel(model);
            await view.render();
            
            expect(view.element.innerHTML).toContain('Test Item');
            expect(view.element.innerHTML).toContain('42');
        });

        it('should render children after parent', async () => {
            const parent = new View({
                id: 'parent',
                template: '<div class="parent-content">{{title}}<div id="child"></div></div>',
                data: { title: 'Parent' }
            });
            
            const child = new View({
                id: 'child',
                template: '<span>Child Content</span>'
            });
            
            parent.addChild(child);
            await parent.render();
            
            expect(parent.rendered).toBeTruthy();
            expect(child.rendered).toBeTruthy();
            expect(parent.element.innerHTML).toContain('Parent');
            expect(parent.element.innerHTML).toContain('Child Content');
        });

        it('should update data and re-render', async () => {
            const view = new View({
                id: 'test-view',
                template: '<div>{{count}}</div>',
                data: { count: 0 }
            });
            
            await view.render();
            expect(view.element.innerHTML).toContain('0');
            
            await view.updateData({ count: 5 });
            expect(view.element.innerHTML).toContain('5');
        });
    });

    describe('Destruction', () => {
        it('should clean up model listeners on destroy', async () => {
            const view = new View({ id: 'test-view' });
            let offCalled = false;
            
            const model = {
                on: function() {},
                off: function(event) {
                    if (event === 'change') {
                        offCalled = true;
                    }
                }
            };
            
            view.setModel(model);
            await view.destroy();
            
            expect(offCalled).toBeTruthy();
            expect(view.model).toBe(null);
            expect(view.modelListener).toBe(null);
        });

        it('should destroy children when parent is destroyed', async () => {
            const parent = new View({ id: 'parent' });
            const child1 = new View({ id: 'child1' });
            const child2 = new View({ id: 'child2' });
            
            parent.addChild(child1);
            parent.addChild(child2);
            
            await parent.render();
            await parent.destroy();
            
            expect(parent.destroyed).toBeTruthy();
            expect(child1.destroyed).toBeTruthy();
            expect(child2.destroyed).toBeTruthy();
            expect(parent.children.size).toBe(0);
        });

        it('should remove from parent when destroyed', async () => {
            const parent = new View({ id: 'parent' });
            const child = new View({ id: 'child' });
            
            parent.addChild(child);
            expect(parent.children.has('child')).toBeTruthy();
            
            await child.destroy();
            
            expect(child.parent).toBe(null);
            expect(parent.children.has('child')).toBeFalsy();
        });
    });

    describe('Event Handling', () => {
        it('should emit and listen to events', () => {
            const view = new View({ id: 'test-view' });
            let eventData = null;
            
            view.on('test-event', (data) => {
                eventData = data;
            });
            
            view.emit('test-event', { value: 123 });
            
            expect(eventData).toEqual({ value: 123 });
        });

        it('should remove event listeners', () => {
            const view = new View({ id: 'test-view' });
            let callCount = 0;
            
            const handler = () => callCount++;
            
            view.on('test-event', handler);
            view.emit('test-event');
            expect(callCount).toBe(1);
            
            view.off('test-event', handler);
            view.emit('test-event');
            expect(callCount).toBe(1); // Should not increment
        });

        it('should handle once listeners', () => {
            const view = new View({ id: 'test-view' });
            let callCount = 0;
            
            view.once('test-event', () => callCount++);
            
            view.emit('test-event');
            view.emit('test-event');
            view.emit('test-event');
            
            expect(callCount).toBe(1); // Should only be called once
        });
    });

    describe('View Hierarchy', () => {
        it('should get view hierarchy', () => {
            const grandparent = new View({ id: 'grandparent' });
            const parent = new View({ id: 'parent' });
            const child = new View({ id: 'child' });
            
            grandparent.addChild(parent);
            parent.addChild(child);
            
            const hierarchy = child.getHierarchy();
            
            expect(hierarchy.length).toBe(3);
            expect(hierarchy[0]).toBe(grandparent);
            expect(hierarchy[1]).toBe(parent);
            expect(hierarchy[2]).toBe(child);
        });

        it('should find view by id in hierarchy', () => {
            const parent = new View({ id: 'parent' });
            const child1 = new View({ id: 'child1' });
            const child2 = new View({ id: 'child2' });
            const grandchild = new View({ id: 'grandchild' });
            
            parent.addChild(child1);
            parent.addChild(child2);
            child2.addChild(grandchild);
            
            const found = parent.findById('grandchild');
            expect(found).toBe(grandchild);
            
            const notFound = parent.findById('nonexistent');
            expect(notFound).toBe(null);
        });
    });

    describe('Static Methods', () => {
        it('should create view using static create method', () => {
            const view = View.create({
                id: 'static-view',
                data: { test: true }
            });
            
            expect(view instanceof View).toBeTruthy();
            expect(view.id).toBe('static-view');
            expect(view.data.test).toBeTruthy();
        });
    });
};