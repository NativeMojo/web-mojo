#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the modules as text and evaluate them
const loadModule = (path) => {
    const code = readFileSync(join(__dirname, path), 'utf8');
    const module = {};
    const exports = {};
    
    // Create a minimal context
    const context = {
        console,
        setTimeout: (fn, ms) => { /* mock */ },
        clearTimeout: () => { /* mock */ },
        document: {
            createElement: (tag) => ({
                tagName: tag.toUpperCase(),
                innerHTML: '',
                style: {},
                classList: {
                    add: () => {},
                    remove: () => {},
                    contains: () => false
                },
                appendChild: () => {},
                querySelector: () => null,
                querySelectorAll: () => [],
                addEventListener: () => {},
                removeEventListener: () => {},
                setAttribute: () => {},
                getAttribute: () => null
            })
        },
        window: {
            MOJO: {}
        }
    };
    
    // Use Function constructor to evaluate in context
    const fn = new Function('module', 'exports', ...Object.keys(context), code + '\nreturn module.exports || exports.default || exports;');
    return fn(module, exports, ...Object.values(context));
};

// Load dependencies
console.log('Loading modules...');
const Mustache = loadModule('src/utils/mustache.js');
const dataFormatter = loadModule('src/utils/DataFormatter.js');
const MOJOUtils = loadModule('src/utils/MOJOUtils.js');

// Inject dependencies
global.Mustache = Mustache;
global.dataFormatter = dataFormatter;

// Load core modules
const Model = loadModule('src/core/Model.js');
const View = loadModule('src/core/View.js');

console.log('\n=== Testing Model Arrays with Pipes ===\n');

// Create a test model with array data
const model = new Model({
    items: [
        { name: 'laptop pro', price: 1299.99 },
        { name: 'wireless mouse', price: 29.99 },
        { name: 'usb cable', price: 9.99 }
    ]
});

console.log('Created model with items:', model.get('items'));

// Create a view with template using pipes
const view = new View({
    id: 'test-view',
    template: `
        <ul>
            {{#model.items}}
            <li>{{name|capitalize}} - {{price|currency}}</li>
            {{/model.items}}
        </ul>
    `
});

// Mock element for View
view.element = {
    innerHTML: '',
    style: {},
    classList: {
        add: () => {},
        remove: () => {}
    }
};

view.setModel(model);

console.log('\nAttempting to render template...');

try {
    // Test View.get directly
    const items = view.get('model.items');
    console.log('view.get("model.items") returned:', typeof items, Array.isArray(items) ? `[array of ${items.length}]` : '');
    
    if (Array.isArray(items) && items.length > 0) {
        const firstItem = items[0];
        console.log('First item type:', typeof firstItem);
        console.log('First item has get method?:', typeof firstItem.get === 'function');
        
        if (typeof firstItem.get === 'function') {
            console.log('Testing firstItem.get("name"):', firstItem.get('name'));
            console.log('Testing firstItem.get("name|capitalize"):', firstItem.get('name|capitalize'));
        }
    }
    
    // Test template rendering
    const templateContent = view.template;
    const rendered = Mustache.render(templateContent, view, {});
    
    console.log('\n✅ Template rendered successfully!');
    console.log('Output:', rendered);
    
    // Check if output is correct
    const expected = [
        'Laptop Pro - $1,299.99',
        'Wireless Mouse - $29.99',
        'Usb Cable - $9.99'
    ];
    
    let allFound = true;
    for (const exp of expected) {
        if (!rendered.includes(exp)) {
            console.log(`❌ Missing expected output: "${exp}"`);
            allFound = false;
        }
    }
    
    if (allFound) {
        console.log('\n✅ All expected outputs found! Model arrays with pipes work correctly.');
    } else {
        console.log('\n❌ Some expected outputs missing. Check the rendered output above.');
    }
    
} catch (error) {
    console.error('\n❌ Error during rendering:', error.message);
    if (error.stack.includes('Maximum call stack')) {
        console.error('Stack overflow detected!');
    }
    console.error('Stack trace:', error.stack);
}

console.log('\n=== Test Complete ===');