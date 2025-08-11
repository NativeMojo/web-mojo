/**
 * Model Event System Tests
 * Tests for the MOJO Framework Model event functionality
 */

const path = require('path');
const { testHelpers } = require('../utils/test-helpers');
const { setupModules } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect, assert } = testContext;
    
    // Set up test environment
    await testHelpers.setup();
    
    // Load Model class
    let Model;
    try {
        const modules = setupModules(testContext);
        Model = modules.Model;
        
        if (!Model) {
            throw new Error('Model module could not be loaded');
        }
    } catch (error) {
        throw new Error(`Failed to load Model: ${error.message}`);
    }

    describe('Model Event System', () => {
        describe('Event Registration', () => {
            it('should register event listener with on()', () => {
                const model = new Model();
                let called = false;
                
                model.on('test', () => { called = true; });
                model.trigger('test');
                
                expect(called).toBeTruthy();
            });

            it('should register multiple listeners for same event', () => {
                const model = new Model();
                const calls = [];
                
                model.on('test', () => calls.push(1));
                model.on('test', () => calls.push(2));
                model.on('test', () => calls.push(3));
                
                model.trigger('test');
                
                expect(calls).toEqual([1, 2, 3]);
            });

            it('should pass arguments to event handlers', () => {
                const model = new Model();
                let receivedArgs = null;
                
                model.on('test', (...args) => { receivedArgs = args; });
                model.trigger('test', 'arg1', 'arg2', { value: 3 });
                
                expect(receivedArgs).toEqual(['arg1', 'arg2', { value: 3 }]);
            });

            it('should support method chaining', () => {
                const model = new Model();
                
                const result = model
                    .on('event1', () => {})
                    .on('event2', () => {})
                    .trigger('event1')
                    .off('event1');
                
                expect(result).toBe(model);
            });
        });

        describe('Event Removal', () => {
            it('should remove specific listener with off()', () => {
                const model = new Model();
                let count = 0;
                
                const handler1 = () => count++;
                const handler2 = () => count += 10;
                
                model.on('test', handler1);
                model.on('test', handler2);
                
                model.trigger('test');
                expect(count).toBe(11); // Both handlers called
                
                count = 0;
                model.off('test', handler1);
                model.trigger('test');
                expect(count).toBe(10); // Only handler2 called
            });

            it('should remove all listeners when off() called without handler', () => {
                const model = new Model();
                let count = 0;
                
                model.on('test', () => count++);
                model.on('test', () => count += 10);
                model.on('test', () => count += 100);
                
                model.trigger('test');
                expect(count).toBe(111);
                
                count = 0;
                model.off('test');
                model.trigger('test');
                expect(count).toBe(0); // No handlers called
            });

            it('should handle removing non-existent event', () => {
                const model = new Model();
                
                // Should not throw error
                expect(() => model.off('nonexistent')).not.toThrow();
            });
        });

        describe('Once Event', () => {
            it('should fire once() listener only once', () => {
                const model = new Model();
                let count = 0;
                
                model.once('test', () => count++);
                
                model.trigger('test');
                model.trigger('test');
                model.trigger('test');
                
                expect(count).toBe(1);
            });

            it('should pass arguments to once() listener', () => {
                const model = new Model();
                let receivedArg = null;
                
                model.once('test', (arg) => { receivedArg = arg; });
                model.trigger('test', 'hello');
                
                expect(receivedArg).toBe('hello');
            });
        });

        describe('Change Events', () => {
            it('should trigger change event when attribute is set', () => {
                const model = new Model();
                let changeCount = 0;
                
                model.on('change', () => changeCount++);
                
                model.set('name', 'Test');
                expect(changeCount).toBe(1);
                
                model.set('value', 123);
                expect(changeCount).toBe(2);
            });

            it('should trigger specific attribute change event', () => {
                const model = new Model();
                let nameChanges = [];
                let valueChanges = [];
                
                model.on('change:name', (val) => nameChanges.push(val));
                model.on('change:value', (val) => valueChanges.push(val));
                
                model.set('name', 'First');
                model.set('value', 100);
                model.set('name', 'Second');
                
                expect(nameChanges).toEqual(['First', 'Second']);
                expect(valueChanges).toEqual([100]);
            });

            it('should not trigger change event when value is unchanged', () => {
                const model = new Model({ name: 'Test' });
                let changeCount = 0;
                
                model.on('change', () => changeCount++);
                
                model.set('name', 'Test'); // Same value
                expect(changeCount).toBe(0);
                
                model.set('name', 'New'); // Different value
                expect(changeCount).toBe(1);
            });

            it('should not trigger change event when silent option is true', () => {
                const model = new Model();
                let changeCount = 0;
                
                model.on('change', () => changeCount++);
                
                model.set('name', 'Test', { silent: true });
                expect(changeCount).toBe(0);
                
                model.set('value', 123); // Without silent
                expect(changeCount).toBe(1);
            });

            it('should trigger change events for multiple attributes', () => {
                const model = new Model();
                const changes = {};
                
                model.on('change:name', (val) => { changes.name = val; });
                model.on('change:age', (val) => { changes.age = val; });
                model.on('change:city', (val) => { changes.city = val; });
                
                model.set({
                    name: 'John',
                    age: 30,
                    city: 'New York'
                });
                
                expect(changes).toEqual({
                    name: 'John',
                    age: 30,
                    city: 'New York'
                });
            });

            it('should pass model as second argument to change events', () => {
                const model = new Model();
                let receivedModel = null;
                
                model.on('change', (m) => { receivedModel = m; });
                model.set('test', 'value');
                
                expect(receivedModel).toBe(model);
            });

            it('should pass model as second argument to attribute change events', () => {
                const model = new Model();
                let receivedValue = null;
                let receivedModel = null;
                
                model.on('change:test', (val, m) => {
                    receivedValue = val;
                    receivedModel = m;
                });
                
                model.set('test', 'value');
                
                expect(receivedValue).toBe('value');
                expect(receivedModel).toBe(model);
            });
        });

        describe('Error Handling', () => {
            it('should continue calling other handlers if one throws error', () => {
                const model = new Model();
                const calls = [];
                
                model.on('test', () => calls.push(1));
                model.on('test', () => { throw new Error('Handler error'); });
                model.on('test', () => calls.push(3));
                
                // Should not throw
                expect(() => model.trigger('test')).not.toThrow();
                
                // Other handlers should still be called
                expect(calls).toEqual([1, 3]);
            });
        });

        describe('Integration with View', () => {
            it('should work with View setModel', async () => {
                // Load View if available
                let View;
                try {
                    const modules = setupModules(testContext);
                    View = modules.View;
                } catch (error) {
                    // Skip this test if View is not available
                    return;
                }
                
                if (!View) return;
                
                const model = new Model({ title: 'Initial' });
                const view = new View({
                    id: 'test-view',
                    template: '<div>{{title}}</div>'
                });
                
                view.setModel(model);
                await view.render();
                
                expect(view.element.innerHTML).toContain('Initial');
                
                // Change model should trigger re-render
                let renderCount = 0;
                view.render = async function() {
                    renderCount++;
                    this.element = document.createElement('div');
                    this.element.innerHTML = `<div>${model.get('title')}</div>`;
                    this.rendered = true;
                    return this;
                };
                
                model.set('title', 'Updated');
                
                // Give time for async render
                await new Promise(resolve => setTimeout(resolve, 10));
                
                expect(renderCount).toBe(1);
            });
        });

        describe('Context Binding', () => {
            it('should call handlers with model as context', () => {
                const model = new Model();
                let context = null;
                
                model.on('test', function() {
                    context = this;
                });
                
                model.trigger('test');
                
                expect(context).toBe(model);
            });
        });

        describe('Multiple Event Types', () => {
            it('should handle multiple different events independently', () => {
                const model = new Model();
                const results = [];
                
                model.on('event1', () => results.push('e1'));
                model.on('event2', () => results.push('e2'));
                model.on('event3', () => results.push('e3'));
                
                model.trigger('event2');
                model.trigger('event1');
                model.trigger('event3');
                model.trigger('event2');
                
                expect(results).toEqual(['e2', 'e1', 'e3', 'e2']);
            });
        });
    });
};