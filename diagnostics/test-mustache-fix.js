#!/usr/bin/env node

/**
 * MOJO Mustache Array Fix Verification Script
 * 
 * This script tests the array loop functionality to verify the fix works.
 * Run with: node diagnostics/test-mustache-fix.js
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Import the Mustache module
const mustachePath = join(__dirname, '../src/utils/mustache.js');
let Mustache;

try {
    // Dynamic import for ES6 module
    const mustacheModule = await import(`file://${mustachePath}`);
    Mustache = mustacheModule.default;
    console.log('✅ Mustache loaded successfully');
} catch (error) {
    console.error('❌ Failed to load Mustache:', error.message);
    process.exit(1);
}

console.log('🧪 MOJO Mustache Array Fix Verification');
console.log('=' .repeat(60));

// Test cases focusing on array functionality
const testCases = [
    {
        name: 'Basic Variable Interpolation',
        template: 'Hello {{name}}!',
        data: { name: 'World' },
        expected: 'Hello World!',
        critical: false
    },
    {
        name: 'Boolean Conditional - True',
        template: '{{#show}}Visible{{/show}}',
        data: { show: true },
        expected: 'Visible',
        critical: false
    },
    {
        name: 'Boolean Conditional - False',
        template: '{{#show}}Visible{{/show}}',
        data: { show: false },
        expected: '',
        critical: false
    },
    {
        name: 'CRITICAL: Single Array Item',
        template: '{{#items}}[{{name}}]{{/items}}',
        data: { items: [{ name: 'One' }] },
        expected: '[One]',
        critical: true
    },
    {
        name: 'CRITICAL: Two Array Items',
        template: '{{#items}}[{{name}}]{{/items}}',
        data: { items: [{ name: 'One' }, { name: 'Two' }] },
        expected: '[One][Two]',
        critical: true
    },
    {
        name: 'CRITICAL: Multiple Array Items',
        template: '{{#items}}[{{name}}]{{/items}}',
        data: { items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }] },
        expected: '[A][B][C][D]',
        critical: true
    },
    {
        name: 'CRITICAL: Array with Text Separators',
        template: '{{#items}}{{name}}, {{/items}}',
        data: { items: [{ name: 'Apple' }, { name: 'Banana' }, { name: 'Cherry' }] },
        expected: 'Apple, Banana, Cherry, ',
        critical: true
    },
    {
        name: 'Empty Array',
        template: '{{#items}}[{{name}}]{{/items}}',
        data: { items: [] },
        expected: '',
        critical: false
    },
    {
        name: 'CRITICAL: TopNav Exact Case',
        template: '{{#navItems}}<li class="nav-item"><a href="{{route}}">{{text}}</a></li>{{/navItems}}',
        data: {
            navItems: [
                { route: '/', text: 'Home' },
                { route: '/about', text: 'About' },
                { route: '/contact', text: 'Contact' },
                { route: '/users', text: 'Users' }
            ]
        },
        expected: '<li class="nav-item"><a href="&#x2F;">Home</a></li><li class="nav-item"><a href="&#x2F;about">About</a></li><li class="nav-item"><a href="&#x2F;contact">Contact</a></li><li class="nav-item"><a href="&#x2F;users">Users</a></li>',
        critical: true
    },
    {
        name: 'CRITICAL: Nested Conditionals in Array',
        template: '{{#items}}{{#active}}[{{/active}}{{name}}{{#active}}]{{/active}}{{/items}}',
        data: {
            items: [
                { name: 'Home', active: true },
                { name: 'About', active: false },
                { name: 'Contact', active: true },
                { name: 'Users', active: false }
            ]
        },
        expected: '[Home]About[Contact]Users',
        critical: true
    },
    {
        name: 'CRITICAL: TopNav with Icons and Active States',
        template: '{{#navItems}}<li><a class="{{#active}}active{{/active}}" href="{{route}}">{{#icon}}{{icon}} {{/icon}}{{text}}</a></li>{{/navItems}}',
        data: {
            navItems: [
                { route: '/', text: 'Home', icon: 'home', active: true },
                { route: '/about', text: 'About', icon: 'info' },
                { route: '/contact', text: 'Contact', active: true },
                { route: '/users', text: 'Users', icon: 'people' }
            ]
        },
        expected: '<li><a class="active" href="&#x2F;">home Home</a></li><li><a class="" href="&#x2F;about">info About</a></li><li><a class="active" href="&#x2F;contact">Contact</a></li><li><a class="" href="&#x2F;users">people Users</a></li>',
        critical: true
    },
    {
        name: 'Object Property Access',
        template: '{{user.name}} - {{user.email}}',
        data: { user: { name: 'John Doe', email: 'john@example.com' } },
        expected: 'John Doe - john@example.com',
        critical: false
    },
    {
        name: 'HTML Escaping',
        template: '{{content}}',
        data: { content: '<script>alert("xss")</script>' },
        expected: '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
        critical: false
    },
    {
        name: 'HTML Unescaping',
        template: '{{{content}}}',
        data: { content: '<strong>Bold Text</strong>' },
        expected: '<strong>Bold Text</strong>',
        critical: false
    },
    {
        name: 'Inverted Section - Empty Array',
        template: '{{^items}}No items found{{/items}}',
        data: { items: [] },
        expected: 'No items found',
        critical: false
    },
    {
        name: 'Inverted Section - Non-empty Array',
        template: '{{^items}}No items found{{/items}}',
        data: { items: [{ name: 'Item' }] },
        expected: '',
        critical: false
    }
];

// Run tests
let totalTests = 0;
let passedTests = 0;
let criticalFailures = 0;
const failures = [];

console.log('\n🧪 Running Test Suite...\n');

for (const test of testCases) {
    totalTests++;
    const criticalFlag = test.critical ? ' 🚨 CRITICAL' : '';
    
    console.log(`🔍 Test: ${test.name}${criticalFlag}`);
    console.log(`   Template: ${test.template}`);
    console.log(`   Data:`, JSON.stringify(test.data));
    console.log(`   Expected: "${test.expected}"`);

    try {
        const result = Mustache.render(test.template, test.data);
        console.log(`   Result: "${result}"`);
        
        if (result === test.expected) {
            console.log(`   ✅ PASS\n`);
            passedTests++;
        } else {
            console.log(`   ❌ FAIL`);
            console.log(`   Expected length: ${test.expected.length}`);
            console.log(`   Result length: ${result.length}`);
            
            // Special analysis for array tests
            if (test.critical && test.name.includes('Array')) {
                const expectedItems = test.data.items ? test.data.items.length : test.data.navItems.length;
                const expectedMatches = (test.expected.match(/\[|\<li/g) || []).length;
                const actualMatches = (result.match(/\[|\<li/g) || []).length;
                
                console.log(`   📊 Analysis:`);
                console.log(`     Input array length: ${expectedItems}`);
                console.log(`     Expected elements: ${expectedMatches}`);
                console.log(`     Actual elements: ${actualMatches}`);
                
                if (actualMatches < expectedMatches) {
                    console.log(`     🚨 ISSUE: Array loop terminated early!`);
                }
            }
            
            console.log('');
            
            if (test.critical) criticalFailures++;
            failures.push({
                test,
                result,
                expected: test.expected
            });
        }
    } catch (error) {
        console.log(`   💥 ERROR: ${error.message}`);
        console.log(`   Stack: ${error.stack}\n`);
        
        if (test.critical) criticalFailures++;
        failures.push({
            test,
            error: error.message
        });
    }
}

// Results Summary
console.log('=' .repeat(60));
console.log('📊 TEST RESULTS SUMMARY');
console.log('=' .repeat(60));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log(`Critical Failures: ${criticalFailures}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

// Analysis
if (criticalFailures > 0) {
    console.log('\n🚨 CRITICAL ISSUES FOUND:');
    console.log('─'.repeat(40));
    
    const criticalFails = failures.filter(f => f.test.critical);
    criticalFails.forEach((failure, idx) => {
        console.log(`${idx + 1}. ${failure.test.name}`);
        if (failure.error) {
            console.log(`   Error: ${failure.error}`);
        } else {
            console.log(`   Expected: "${failure.expected}"`);
            console.log(`   Got: "${failure.result}"`);
        }
    });
    
    console.log('\n❌ FIX STATUS: Array loops are still BROKEN');
    console.log('🔧 The Mustache fix needs additional work');
    console.log('📍 Focus on renderTokens array processing logic');
    
} else if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ FIX STATUS: Array loops are working correctly');
    console.log('🚀 TopNav component should now display all navigation items');
    console.log('🎯 The Mustache fix is SUCCESSFUL');
    
} else {
    const nonCriticalFailures = totalTests - passedTests - criticalFailures;
    console.log(`\n⚠️  ${nonCriticalFailures} non-critical issues found`);
    console.log('✅ FIX STATUS: Core array functionality is working');
    console.log('🔧 Some edge cases may need attention');
}

// Next Steps
console.log('\n🚀 NEXT STEPS:');
console.log('─'.repeat(20));

if (criticalFailures === 0) {
    console.log('1. ✅ Test TopNav component in basic-nav example');
    console.log('2. ✅ Verify all 4 navigation items appear');
    console.log('3. ✅ Test other components using arrays');
    console.log('4. ✅ Run full test suite');
} else {
    console.log('1. 🔧 Debug renderTokens array processing');
    console.log('2. 🔬 Check Context.push method');
    console.log('3. 📝 Verify token structure is correct');
    console.log('4. 🧪 Re-run this test after fixes');
}

console.log('\n' + '=' .repeat(60));

// Exit with appropriate code
const exitCode = criticalFailures > 0 ? 1 : 0;
console.log(`🎯 Test Complete - Exit Code: ${exitCode}`);
process.exit(exitCode);