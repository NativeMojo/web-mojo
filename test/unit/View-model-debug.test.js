/**
 * Diagnostic test to understand model array wrapping issue
 * This test is designed to isolate why model.items works in browser but fails in test environment
 */

const path = require('path');
const { testHelpers } = require('../utils/test-helpers');
const { setupModules } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect, assert } = testContext;
    
    // Set up test environment
    await testHelpers.setup();
    
    // Load View and Model classes
    let View, Model, MOJOUtils;
    try {
        const modules = setupModules(testContext);
        View = modules.View;
        Model = modules.Model;
        MOJOUtils = modules.MOJOUtils;
        
        if (!View || !Model) {
            throw new Error('View or Model module could not be loaded');
        }
    } catch (error) {
        throw new Error(`Failed to load modules: ${error.message}`);
    }

    describe('Model Array Wrapping Debug', () => {
        it('should access model array without pipes', async () => {
            const model = new Model({
                items: [
                    { name: 'test1', value: 100 },
                    { name: 'test2', value: 200 }
                ]
            });
            
            const view = new View({
                id: 'test-view',
                template: `
                    <ul>
                        {{#model.items}}
                        <li>{{name}} - {{value}}</li>
                        {{/model.items}}
                    </ul>
                `
            });
            
            view.setModel(model);
            
            // Log what we get when accessing model.items
            console.log('\n=== Basic Access Test ===');
            const items = view.get('model.items');
            console.log('view.get("model.items") type:', typeof items);
            console.log('Is array?:', Array.isArray(items));
            console.log('Has get method?:', typeof items.get === 'function');
            if (Array.isArray(items) && items.length > 0) {
                console.log('First item type:', typeof items[0]);
                console.log('First item has get?:', typeof items[0]?.get === 'function');
                console.log('First item constructor:', items[0]?.constructor?.name);
            }
            
            await view.render();
            
            // Should work without pipes
            expect(view.element.innerHTML).toContain('<li>test1 - 100</li>');
            expect(view.element.innerHTML).toContain('<li>test2 - 200</li>');
        });

        it('should test MOJOUtils.wrapData directly', () => {
            console.log('\n=== Direct wrapData Test ===');
            
            const data = [
                { name: 'item1', value: 100 },
                { name: 'item2', value: 200 }
            ];
            
            // Test wrapping without rootContext
            const wrapped = MOJOUtils.wrapData(data, null);
            console.log('Wrapped type:', typeof wrapped);
            console.log('Is array?:', Array.isArray(wrapped));
            
            if (Array.isArray(wrapped) && wrapped.length > 0) {
                const firstItem = wrapped[0];
                console.log('First wrapped item type:', typeof firstItem);
                console.log('First wrapped item has get?:', typeof firstItem?.get === 'function');
                console.log('First wrapped item constructor:', firstItem?.constructor?.name);
                
                // Test if get method works
                if (typeof firstItem.get === 'function') {
                    try {
                        const name = firstItem.get('name');
                        console.log('firstItem.get("name"):', name);
                        expect(name).toBe('item1');
                    } catch (e) {
                        console.log('Error calling get:', e.message);
                    }
                }
            }
        });

        it('should test View.get with model namespace', async () => {
            console.log('\n=== View.get Model Namespace Test ===');
            
            const model = new Model({
                simple: 'text',
                items: [
                    { name: 'item1', value: 100 }
                ]
            });
            
            const view = new View({
                id: 'test-view',
                template: '<div>test</div>'
            });
            
            view.setModel(model);
            
            // Test simple property
            const simple = view.get('model.simple');
            console.log('model.simple:', simple);
            expect(simple).toBe('text');
            
            // Test array property
            console.log('About to get model.items...');
            let items;
            try {
                items = view.get('model.items');
                console.log('Successfully got model.items');
                console.log('Items type:', typeof items);
                console.log('Is array?:', Array.isArray(items));
            } catch (e) {
                console.log('Error getting model.items:', e.message);
                console.log('Stack trace:', e.stack);
            }
        });

        it('should test minimal template with single item', async () => {
            console.log('\n=== Minimal Template Test ===');
            
            const model = new Model({
                items: [{ name: 'test' }]
            });
            
            const view = new View({
                id: 'test-view',
                template: '{{#model.items}}{{name}}{{/model.items}}'
            });
            
            view.setModel(model);
            
            try {
                await view.render();
                console.log('Render successful!');
                console.log('Output:', view.element.innerHTML);
                expect(view.element.innerHTML).toContain('test');
            } catch (e) {
                console.log('Render failed:', e.message);
                if (e.stack.includes('Maximum call stack')) {
                    console.log('Stack overflow detected!');
                    // Try to understand where the recursion is
                    const stackLines = e.stack.split('\n').slice(0, 10);
                    console.log('First 10 stack frames:');
                    stackLines.forEach(line => console.log('  ', line));
                }
            }
        });

        it('should compare wrapped vs unwrapped behavior', async () => {
            console.log('\n=== Wrapped vs Unwrapped Comparison ===');
            
            const model = new Model({
                items: [{ name: 'test', value: 100 }]
            });
            
            const view = new View({
                id: 'test-view',
                template: '<div>test</div>'
            });
            
            view.setModel(model);
            
            // Get items through model directly
            const itemsDirect = model.get('items');
            console.log('Direct from model:');
            console.log('  Type:', typeof itemsDirect);
            console.log('  Is array?:', Array.isArray(itemsDirect));
            console.log('  First item:', itemsDirect[0]);
            
            // Get items through view
            console.log('Through view.get:');
            try {
                const itemsViaView = view.get('model.items');
                console.log('  Type:', typeof itemsViaView);
                console.log('  Is array?:', Array.isArray(itemsViaView));
                if (Array.isArray(itemsViaView) && itemsViaView[0]) {
                    console.log('  First item type:', typeof itemsViaView[0]);
                    console.log('  First item constructor:', itemsViaView[0].constructor.name);
                    console.log('  First item has _data?:', itemsViaView[0]._data !== undefined);
                }
            } catch (e) {
                console.log('  Error:', e.message);
            }
        });
    });
};