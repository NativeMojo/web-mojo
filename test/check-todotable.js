#!/usr/bin/env node

/**
 * Diagnostic script to check TodoTablePage functionality
 * Run with: node test/check-todotable.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// JSDOM setup for browser environment simulation
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
</head>
<body>
    <div id="container"></div>
</body>
</html>
`, {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable'
});

// Set up global browser environment
global.window = dom.window;
global.document = dom.window.document;
// global.navigator = dom.window.navigator; // Already has a getter
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.customElements = dom.window.customElements;
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
};

// Import the modules
async function runDiagnostics() {
    console.log('🔍 TodoTablePage Diagnostic Check\n');
    console.log('=' .repeat(50));

    try {
        // Import required modules
        console.log('\n📦 Importing modules...');
        
        const { default: TodoTablePage } = await import('../examples/pages/todos/TodoTablePage.js');
        const { default: TodoCollection } = await import('../examples/models/TodoCollection.js');
        const { default: TablePage } = await import('../src/components/TablePage.js');
        const { default: Router } = await import('../src/core/Router.js');
        
        console.log('✅ Modules imported successfully');

        // Check class inheritance
        console.log('\n🧬 Checking inheritance chain...');
        console.log(`TodoTablePage extends TablePage: ${Object.getPrototypeOf(TodoTablePage.prototype) === TablePage.prototype}`);
        
        // Create router instance
        console.log('\n🛠 Creating Router instance...');
        const router = new Router({
            mode: 'param',
            container: document.getElementById('container')
        });
        global.window.MOJO = { router };
        console.log('✅ Router created');

        // Create TodoTablePage instance
        console.log('\n🛠 Creating TodoTablePage instance...');
        const page = new TodoTablePage({
            container: document.getElementById('container')
        });
        console.log('✅ TodoTablePage instance created');

        // Check properties
        console.log('\n📋 Checking properties:');
        console.log(`  - pageName: ${page.pageName}`);
        console.log(`  - title: ${page.title}`);
        console.log(`  - route: ${page.route}`);
        console.log(`  - collection exists: ${!!page.collection}`);
        console.log(`  - collection type: ${page.collection?.constructor.name}`);
        console.log(`  - columns defined: ${page.columns?.length || 0} columns`);

        // Check critical methods
        console.log('\n🔧 Checking critical methods:');
        const methods = [
            'setLoadingState',
            'updateStatusDisplay', 
            'loadData',
            'onInit',
            'onAfterMount',
            'formatCheckbox',
            'formatKind',
            'formatDescription',
            'formatPriority',
            'formatDate',
            'formatNote',
            'formatActions'
        ];

        const methodCheck = methods.map(method => {
            const exists = typeof page[method] === 'function';
            const inherited = exists && !page.hasOwnProperty(method);
            return {
                name: method,
                exists,
                inherited,
                status: exists ? '✅' : '❌'
            };
        });

        methodCheck.forEach(({ name, exists, inherited, status }) => {
            const source = inherited ? '(inherited)' : '(own)';
            console.log(`  ${status} ${name} ${exists ? source : '- MISSING!'}`);
        });

        // Check for problematic method calls
        console.log('\n⚠️  Checking for problematic method calls:');
        const pageSource = page.loadData.toString();
        
        if (pageSource.includes('this.setLoading(')) {
            console.log('  ❌ Found incorrect call to this.setLoading() - should be this.setLoadingState()');
        } else {
            console.log('  ✅ No calls to this.setLoading() found');
        }

        if (pageSource.includes('this.updateStatus(')) {
            console.log('  ❌ Found incorrect call to this.updateStatus() - should be this.updateStatusDisplay()');
        } else {
            console.log('  ✅ No calls to this.updateStatus() found');
        }

        if (pageSource.includes('this.getQueryParams(')) {
            console.log('  ❌ Found call to non-existent this.getQueryParams()');
        } else {
            console.log('  ✅ No calls to this.getQueryParams() found');
        }

        // Test TodoCollection
        console.log('\n📚 Testing TodoCollection:');
        const collection = new TodoCollection();
        console.log(`  ✅ Collection created`);
        console.log(`  - fetch method exists: ${typeof collection.fetch === 'function'}`);
        console.log(`  - toJSON method exists: ${typeof collection.toJSON === 'function'}`);

        // Test loadData method signature
        console.log('\n🔍 Testing loadData method:');
        try {
            // Create a mock for testing
            page.setLoadingState = (state) => {
                console.log(`  ✅ setLoadingState called with: ${state}`);
            };
            page.updateStatusDisplay = () => {
                console.log(`  ✅ updateStatusDisplay called`);
            };
            page.showError = (msg) => {
                console.log(`  ℹ️  showError called with: ${msg}`);
            };
            
            // Mock the table
            page.table = {
                setData: () => console.log('  ✅ table.setData called'),
                updatePagination: () => console.log('  ✅ table.updatePagination called')
            };

            // Try calling loadData
            console.log('  Calling loadData with test parameters...');
            await page.loadData({ page: 1, perPage: 10 });
            console.log('  ✅ loadData executed without throwing');
        } catch (error) {
            console.log(`  ❌ loadData threw error: ${error.message}`);
        }

        // Summary
        console.log('\n' + '=' .repeat(50));
        console.log('📊 DIAGNOSTIC SUMMARY:');
        
        const missingMethods = methodCheck.filter(m => !m.exists);
        if (missingMethods.length === 0) {
            console.log('✅ All required methods are available');
        } else {
            console.log(`⚠️  ${missingMethods.length} methods are missing:`);
            missingMethods.forEach(m => console.log(`   - ${m.name}`));
        }

        console.log('\n✅ Diagnostic check complete!');

    } catch (error) {
        console.error('\n❌ Diagnostic failed with error:');
        console.error(error.message);
        console.error('\nStack trace:');
        console.error(error.stack);
        process.exit(1);
    }
}

// Run diagnostics
runDiagnostics().catch(error => {
    console.error('Failed to run diagnostics:', error);
    process.exit(1);
});