/**
 * Test script to reproduce JSDOM issue with model arrays and pipes
 * This script tests if the stack overflow is a JSDOM-specific problem
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Create a JSDOM instance
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

// Set up globals
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

// Load modules
function loadModule(modulePath) {
    const code = fs.readFileSync(path.join(__dirname, modulePath), 'utf8');
    
    // Transform ES6 exports to CommonJS
    const transformed = code
        .replace(/export\s+default\s+(\w+);?/g, 'module.exports = $1;')
        .replace(/export\s+{([^}]+)}/g, (match, exports) => {
            const items = exports.split(',').map(e => e.trim());
            return items.map(item => `exports.${item} = ${item};`).join('\n');
        })
        .replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, (match, name, path) => {
            const resolvedPath = path.startsWith('.') ? path : `./${path}`;
            return `const ${name} = require('${resolvedPath}')`;
        })
        .replace(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g, (match, imports, path) => {
            const resolvedPath = path.startsWith('.') ? path : `./${path}`;
            return `const {${imports}} = require('${resolvedPath}')`;
        });
    
    const moduleWrapper = new Function('require', 'module', 'exports', '__dirname', '__filename', 'console', 'global', 'window', 'document', 'HTMLElement', 'Event', 'CustomEvent', 'setTimeout', 'clearTimeout', transformed);
    
    const module = { exports: {} };
    const exports = module.exports;
    
    moduleWrapper(
        require,
        module,
        exports,
        __dirname,
        modulePath,
        console,
        global,
        global.window,
        global.document,
        global.HTMLElement,
        global.Event,
        global.CustomEvent,
        (fn, delay) => {
            console.log(`setTimeout called with delay: ${delay}ms`);
            return global.window.setTimeout(fn, delay);
        },
        global.window.clearTimeout
    );
    
    return module.exports;
}

console.log('=== JSDOM Model Array Pipes Test ===\n');

async function runTest() {
    try {
        // Load dependencies
        console.log('Loading modules...');
    
    // Load utilities first
    global.Mustache = loadModule('src/utils/mustache.js');
    global.dataFormatter = loadModule('src/utils/DataFormatter.js');
    global.MOJOUtils = loadModule('src/utils/MOJOUtils.js');
    
    // Load core modules
    const Model = loadModule('src/core/Model.js');
    const View = loadModule('src/core/View.js');
    
    console.log('Modules loaded successfully!\n');
    
    // Create test model with array
    console.log('Creating model with items array...');
    const model = new Model({
        items: [
            { name: 'laptop pro', price: 1299.99 },
            { name: 'wireless mouse', price: 29.99 }
        ]
    });
    
    console.log('Model created:', model.get('items'));
    
    // Create view with pipes in template
    console.log('\nCreating view with template using pipes...');
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
    
    // Set up container
    const container = document.createElement('div');
    container.id = 'test-view';
    document.body.appendChild(container);
    
    view.setModel(model);
    console.log('Model set on view');
    
    // Test view.get directly
    console.log('\nTesting view.get("model.items")...');
    const items = view.get('model.items');
    console.log('  Type:', typeof items);
    console.log('  Is array?:', Array.isArray(items));
    console.log('  Length:', items?.length);
    
    if (Array.isArray(items) && items.length > 0) {
        console.log('  First item type:', typeof items[0]);
        console.log('  First item has get?:', typeof items[0]?.get === 'function');
        console.log('  First item:', items[0]);
    }
    
    // Attempt to render
    console.log('\nAttempting to render view...');
    let renderTimeout;
    
    // Set a timeout to catch if render hangs
    renderTimeout = setTimeout(() => {
        console.error('❌ Render timeout - possible infinite loop!');
        process.exit(1);
    }, 5000);
    
    try {
        await view.render();
        clearTimeout(renderTimeout);
        
        console.log('✅ Render completed successfully!');
        console.log('Output HTML:', view.element.innerHTML);
        
        // Check if output is correct
        const html = view.element.innerHTML;
        if (html.includes('Laptop Pro') && html.includes('$1,299.99')) {
            console.log('\n✅ SUCCESS: Model array pipes work correctly in JSDOM!');
        } else {
            console.log('\n⚠️ WARNING: Render completed but output is incorrect');
            console.log('Expected: "Laptop Pro - $1,299.99"');
            console.log('Got:', html);
        }
        
    } catch (error) {
        clearTimeout(renderTimeout);
        
        if (error.message.includes('Maximum call stack')) {
            console.error('\n❌ STACK OVERFLOW DETECTED!');
            console.error('This confirms the JSDOM issue with model array wrapping');
            
            // Try to extract useful info from stack
            const stackLines = error.stack.split('\n').slice(0, 20);
            console.error('\nFirst 20 stack frames:');
            stackLines.forEach(line => console.error('  ', line));
            
            // Check if it's the setTimeout issue
            if (error.stack.includes('setTimeout') || error.stack.includes('timerInitializationSteps')) {
                console.error('\n⚠️ The issue is in JSDOM\'s setTimeout implementation!');
                console.error('This appears to be a JSDOM bug when handling wrapped objects.');
            }
        } else {
            console.error('\n❌ Render failed with error:', error.message);
            console.error('Stack:', error.stack);
        }
        
        process.exit(1);
    }
    
} catch (error) {
    console.error('Test setup failed:', error.message);
    console.error(error.stack);
        process.exit(1);
    }

    console.log('\n=== Test Complete ===');
    process.exit(0);
}

// Run the test
runTest().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});