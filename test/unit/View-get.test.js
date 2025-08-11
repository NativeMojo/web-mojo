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
                
                expect(view.get('testProp')).toBe('test value');
                expect(view.get('id')).toBe('test-view');
            });

            it('should return undefined for non-existent properties', () => {
                const view = new View({ id: 'test-view' });
                
                expect(view.get('nonExistent')).toBe(undefined);
                expect(view.get('some.nested.path')).toBe(undefined);
            });

            it('should handle empty path', () => {
                const view = new View({ id: 'test-view' });
                
                expect(view.get('')).toBe(undefined);
                expect(view.get(null)).toBe(undefined);
                expect(view.get(undefined)).toBe(undefined);
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
                
                expect(view.get('data.title')).toBe('Test Title');
                expect(view.get('data.count')).toBe(42);
                expect(view.get('data.active')).toBe(true);
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
                
                expect(view.get('data.user.name')).toBe('John');
                expect(view.get('data.user.address.city')).toBe('New York');
                expect(view.get('data.user.address.zip')).toBe('10001');
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
                
                expect(view.get('data.items')).toEqual(['first', 'second', 'third']);
                expect(view.get('data.users')).toHaveLength(2);
            });
        });

        describe('State Namespace Access', () => {
            it('should access state properties with state. prefix', () => {
                const view = new View({
                    id: 'test-view',
                    state: {
                        loading: false,
                        error: null,
                        selectedId: 123
                    }
                });
                
                expect(view.get('state.loading')).toBe(false);
                expect(view.get('state.error')).toBe(null);
                expect(view.get('state.selectedId')).toBe(123);
            });

            it('should handle nested state properties', () => {
                const view = new View({
                    id: 'test-view',
                    state: {
                        ui: {
                            sidebarOpen: true,
                            theme: 'dark'
                        }
                    }
                });
                
                expect(view.get('state.ui.sidebarOpen')).toBe(true);
                expect(view.get('state.ui.theme')).toBe('dark');
            });
        });

        describe('Model Namespace Access', () => {
            it('should access model attributes with model. prefix', () => {
                const model = new Model({
                    name: 'Test Model',
                    value: 100,
                    active: true
                });
                
                const view = new View({ id: 'test-view' });
                view.setModel(model);
                
                expect(view.get('model.name')).toBe('Test Model');
                expect(view.get('model.value')).toBe(100);
                expect(view.get('model.active')).toBe(true);
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
                expect(view.get('model.user.firstName')).toBe('John');
                expect(view.get('model.user.lastName')).toBe('Doe');
            });

            it('should return undefined if no model is set', () => {
                const view = new View({ id: 'test-view' });
                
                expect(view.get('model.name')).toBe(undefined);
                expect(view.get('model.anything')).toBe(undefined);
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
                
                expect(view.get('getTitle')).toBe('Dynamic Title');
                expect(view.get('getCount')).toBe(42);
            });

            it('should call functions with correct context', () => {
                const view = new View({
                    id: 'test-view',
                    data: { multiplier: 10 }
                });
                
                view.calculateValue = function() {
                    return this.data.multiplier * 5;
                };
                
                expect(view.get('calculateValue')).toBe(50);
            });

            it('should handle function errors gracefully', () => {
                const view = new View({ id: 'test-view' });
                
                view.errorFunction = function() {
                    throw new Error('Test error');
                };
                
                // Should return undefined on error
                expect(view.get('errorFunction')).toBe(undefined);
            });

            it('should not call functions in nested paths', () => {
                const view = new View({ id: 'test-view' });
                
                view.nested = {
                    func: function() {
                        return 'should not be called';
                    }
                };
                
                const result = view.get('nested.func');
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
                            <p>Loading: {{state.loading}}</p>
                        </div>
                    `,
                    data: {
                        title: 'Dashboard'
                    },
                    state: {
                        loading: false
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
                expect(view.element.innerHTML).toContain('Loading: false');
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
                const view = new View({
                    id: 'test-view',
                    template: '<div class="{{getContainerClass}}">{{data.content}}</div>',
                    data: {
                        content: 'Hello World',
                        theme: 'dark'
                    },
                    state: {
                        active: true
                    }
                });
                
                view.getContainerClass = function() {
                    const classes = ['container'];
                    if (this.data.theme === 'dark') classes.push('theme-dark');
                    if (this.state.active) classes.push('active');
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