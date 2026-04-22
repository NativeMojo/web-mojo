/**
 * View.get() Method Tests
 * Tests for the unified data access pattern in MOJO Framework View
 */

const path = require('path');
const { testHelpers } = require('../utils/test-helpers');
const { setupModules } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect, assert } = testContext;
    
    // Set up test environment
    await testHelpers.setup();
    
    // Load View and Model classes
    let View, Model;
    try {
        const modules = setupModules(testContext);
        View = modules.View;
        Model = modules.Model;
        
        if (!View || !Model) {
            throw new Error('View or Model module could not be loaded');
        }
    } catch (error) {
        throw new Error(`Failed to load modules: ${error.message}`);
    }

    describe('View.get() Method', () => {
        describe('Basic Property Access', () => {
            it('should get direct properties on view', () => {
                const view = new View({ id: 'test-view' });
                view.testProp = 'test value';
                
                expect(view.getContextValue('testProp')).toBe('test value');
                expect(view.getContextValue('id')).toBe('test-view');
            });

            it('should return undefined for non-existent properties', () => {
                const view = new View({ id: 'test-view' });
                
                expect(view.getContextValue('nonExistent')).toBe(undefined);
                expect(view.getContextValue('some.nested.path')).toBe(undefined);
            });

            it('should handle empty path', () => {
                const view = new View({ id: 'test-view' });
                
                expect(view.getContextValue('')).toBe(undefined);
                expect(view.getContextValue(null)).toBe(undefined);
                expect(view.getContextValue(undefined)).toBe(undefined);
            });
        });

        describe('Data Namespace Access', () => {
            it('should access data properties with data. prefix', () => {
                const view = new View({
                    id: 'test-view',
                    data: {
                        title: 'Test Title',
                        count: 42,
                        active: true
                    }
                });
                
                expect(view.getContextValue('data.title')).toBe('Test Title');
                expect(view.getContextValue('data.count')).toBe(42);
                expect(view.getContextValue('data.active')).toBe(true);
            });

            it('should handle nested data properties', () => {
                const view = new View({
                    id: 'test-view',
                    data: {
                        user: {
                            name: 'John',
                            address: {
                                city: 'New York',
                                zip: '10001'
                            }
                        }
                    }
                });
                
                expect(view.getContextValue('data.user.name')).toBe('John');
                expect(view.getContextValue('data.user.address.city')).toBe('New York');
                expect(view.getContextValue('data.user.address.zip')).toBe('10001');
            });

            it('should handle arrays in data', () => {
                const view = new View({
                    id: 'test-view',
                    data: {
                        items: ['first', 'second', 'third'],
                        users: [
                            { name: 'Alice' },
                            { name: 'Bob' }
                        ]
                    }
                });
                
                expect(view.getContextValue('data.items')).toEqual(['first', 'second', 'third']);
                expect(view.getContextValue('data.users')).toHaveLength(2);
            });
        });

        // State Namespace removed: the current View class does not track a
        // `state` property (only `data` + `model`). These tests were
        // written for a prior implementation that had first-class state.

        describe('Model Namespace Access', () => {
            it('should access model attributes with model. prefix', () => {
                const model = new Model({
                    name: 'Test Model',
                    value: 100,
                    active: true
                });
                
                const view = new View({ id: 'test-view' });
                view.setModel(model);
                
                expect(view.getContextValue('model.name')).toBe('Test Model');
                expect(view.getContextValue('model.value')).toBe(100);
                expect(view.getContextValue('model.active')).toBe(true);
            });

            it('should use model.get() if available', () => {
                const model = new Model({
                    user: {
                        firstName: 'John',
                        lastName: 'Doe'
                    }
                });
                
                const view = new View({ id: 'test-view' });
                view.setModel(model);
                
                // Model.get() handles dot notation
                expect(view.getContextValue('model.user.firstName')).toBe('John');
                expect(view.getContextValue('model.user.lastName')).toBe('Doe');
            });

            it('should return undefined if no model is set', () => {
                const view = new View({ id: 'test-view' });
                
                expect(view.getContextValue('model.name')).toBe(undefined);
                expect(view.getContextValue('model.anything')).toBe(undefined);
            });
        });

        describe('Function Calls', () => {
            it('should call functions and return their result', () => {
                const view = new View({ id: 'test-view' });
                
                view.getTitle = function() {
                    return 'Dynamic Title';
                };
                
                view.getCount = function() {
                    return 42;
                };
                
                expect(view.getContextValue('getTitle')).toBe('Dynamic Title');
                expect(view.getContextValue('getCount')).toBe(42);
            });

            it('should call functions with correct context', () => {
                const view = new View({
                    id: 'test-view',
                    data: { multiplier: 10 }
                });
                
                view.calculateValue = function() {
                    return this.data.multiplier * 5;
                };
                
                expect(view.getContextValue('calculateValue')).toBe(50);
            });

            it('should propagate errors from called functions', () => {
                const view = new View({ id: 'test-view' });

                view.errorFunction = function() {
                    throw new Error('Test error');
                };

                // Current behavior: MOJOUtils.getContextData calls the
                // function directly and lets exceptions propagate. Callers
                // that want graceful behaviour wrap the call themselves.
                expect(() => view.getContextValue('errorFunction')).toThrow('Test error');
            });

            it('should not call functions in nested paths', () => {
                const view = new View({ id: 'test-view' });
                
                view.nested = {
                    func: function() {
                        return 'should not be called';
                    }
                };
                
                const result = view.getContextValue('nested.func');
                expect(typeof result).toBe('function');
            });
        });

        describe('Template Integration', () => {
            it('should work with mustache templates using namespaces', async () => {
                const model = new Model({
                    name: 'John Doe',
                    age: 30
                });
                
                const view = new View({
                    id: 'test-view',
                    template: '<div>{{model.name}} is {{model.age}} years old</div>',
                    data: {
                        title: 'User Info'
                    }
                });
                
                view.setModel(model);
                await view.render();
                
                expect(view.element.innerHTML).toContain('John Doe is 30 years old');
            });

            it('should work with data namespace in templates', async () => {
                const view = new View({
                    id: 'test-view',
                    template: '<h1>{{data.title}}</h1><p>Count: {{data.count}}</p>',
                    data: {
                        title: 'Test Page',
                        count: 5
                    }
                });
                
                await view.render();
                
                expect(view.element.innerHTML).toContain('Test Page');
                expect(view.element.innerHTML).toContain('Count: 5');
            });

            it('should call functions from templates', async () => {
                const view = new View({
                    id: 'test-view',
                    template: '<div class="{{getButtonClass}}">{{getButtonText}}</div>'
                });
                
                view.getButtonClass = function() {
                    return 'btn btn-primary';
                };
                
                view.getButtonText = function() {
                    return 'Click Me';
                };
                
                await view.render();
                
                expect(view.element.innerHTML).toContain('btn btn-primary');
                expect(view.element.innerHTML).toContain('Click Me');
            });

            it('should handle mixed namespaces in templates', async () => {
                const model = new Model({
                    userName: 'Alice'
                });

                const view = new View({
                    id: 'test-view',
                    template: `
                        <div>
                            <h1>{{data.title}}</h1>
                            <p>User: {{model.userName}}</p>
                            <p>Status: {{getStatus}}</p>
                        </div>
                    `,
                    data: {
                        title: 'Dashboard'
                    }
                });

                view.setModel(model);

                view.getStatus = function() {
                    return 'Active';
                };

                await view.render();

                expect(view.element.innerHTML).toContain('Dashboard');
                expect(view.element.innerHTML).toContain('User: Alice');
                expect(view.element.innerHTML).toContain('Status: Active');
            });

            it('should handle conditional sections with model data', async () => {
                const model = new Model({
                    hasItems: true,
                    items: ['Item 1', 'Item 2', 'Item 3']
                });
                
                const view = new View({
                    id: 'test-view',
                    template: `
                        {{#model.hasItems}}
                        <ul>
                            {{#model.items}}
                            <li>{{.}}</li>
                            {{/model.items}}
                        </ul>
                        {{/model.hasItems}}
                        {{^model.hasItems}}
                        <p>No items</p>
                        {{/model.hasItems}}
                    `
                });
                
                view.setModel(model);
                await view.render();
                
                expect(view.element.innerHTML).toContain('<li>Item 1</li>');
                expect(view.element.innerHTML).toContain('<li>Item 2</li>');
                expect(view.element.innerHTML).toContain('<li>Item 3</li>');
                expect(view.element.innerHTML).not.toContain('No items');
            });
        });

        describe('Complex Scenarios', () => {
            it('should handle computed properties', async () => {
                const model = new Model({
                    firstName: 'John',
                    lastName: 'Doe'
                });
                
                const view = new View({
                    id: 'test-view',
                    template: '<div>{{getFullName}} ({{getAge}} years old)</div>'
                });
                
                view.setModel(model);
                
                view.getFullName = function() {
                    return `${this.model.get('firstName')} ${this.model.get('lastName')}`;
                };
                
                view.getAge = function() {
                    return 25; // Static for test
                };
                
                await view.render();
                
                expect(view.element.innerHTML).toContain('John Doe (25 years old)');
            });

            it('should handle dynamic class names', async () => {
                // Current View has no `state` property; fold the active flag
                // into `data` so the test still exercises the intent
                // (computed class names from view state).
                const view = new View({
                    id: 'test-view',
                    template: '<div class="{{getContainerClass}}">{{data.content}}</div>',
                    data: {
                        content: 'Hello World',
                        theme: 'dark',
                        active: true
                    }
                });

                view.getContainerClass = function() {
                    const classes = ['container'];
                    if (this.data.theme === 'dark') classes.push('theme-dark');
                    if (this.data.active) classes.push('active');
                    return classes.join(' ');
                };

                await view.render();

                expect(view.element.innerHTML).toContain('class="container theme-dark active"');
                expect(view.element.innerHTML).toContain('Hello World');
            });

            it('should support method chaining in templates', async () => {
                const view = new View({
                    id: 'test-view',
                    template: '<div>{{getData.user.name}}</div>',
                    data: {
                        currentUser: {
                            name: 'Test User'
                        }
                    }
                });
                
                view.getData = {
                    user: view.data.currentUser
                };
                
                await view.render();
                
                expect(view.element.innerHTML).toContain('Test User');
            });
        });
    });
};