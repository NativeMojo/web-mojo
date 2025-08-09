/**
 * MOJO Mustache Test Suite
 * Comprehensive testing for Mustache template functionality
 * Focus: Identify and fix array loop rendering issues
 */

import Mustache from '../../src/utils/mustache.js';

// Test cases for different Mustache features
const testCases = {
    // 1. Basic Variable Interpolation
    'variable_interpolation': {
        name: 'Variable Interpolation',
        template: 'Hello {{name}}!',
        data: { name: 'World' },
        expected: 'Hello World!',
        critical: false
    },

    // 2. Missing Variable (should render empty)
    'missing_variable': {
        name: 'Missing Variable',
        template: 'Hello {{missing}}!',
        data: { name: 'World' },
        expected: 'Hello !',
        critical: false
    },

    // 3. Boolean Conditional - True
    'boolean_true': {
        name: 'Boolean Conditional - True',
        template: '{{#show}}Visible{{/show}}',
        data: { show: true },
        expected: 'Visible',
        critical: false
    },

    // 4. Boolean Conditional - False
    'boolean_false': {
        name: 'Boolean Conditional - False',
        template: '{{#show}}Visible{{/show}}',
        data: { show: false },
        expected: '',
        critical: false
    },

    // 5. Boolean Conditional - Truthy String
    'boolean_truthy': {
        name: 'Boolean Conditional - Truthy String',
        template: '{{#show}}Visible{{/show}}',
        data: { show: 'yes' },
        expected: 'Visible',
        critical: false
    },

    // 6. CRITICAL: Array Loop - Single Item
    'array_single': {
        name: 'Array Loop - Single Item',
        template: '{{#items}}{{name}}{{/items}}',
        data: { items: [{ name: 'Item1' }] },
        expected: 'Item1',
        critical: true
    },

    // 7. CRITICAL: Array Loop - Multiple Items (THIS IS THE BUG)
    'array_multiple': {
        name: 'Array Loop - Multiple Items',
        template: '{{#items}}{{name}}{{/items}}',
        data: { items: [{ name: 'Item1' }, { name: 'Item2' }, { name: 'Item3' }] },
        expected: 'Item1Item2Item3',
        critical: true
    },

    // 8. Array Loop with Separators
    'array_with_separators': {
        name: 'Array Loop with Separators',
        template: '{{#items}}{{name}}, {{/items}}',
        data: { items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] },
        expected: 'A, B, C, ',
        critical: true
    },

    // 9. Empty Array (should render nothing)
    'array_empty': {
        name: 'Empty Array',
        template: '{{#items}}{{name}}{{/items}}',
        data: { items: [] },
        expected: '',
        critical: false
    },

    // 10. CRITICAL: Nested Conditionals in Array (TopNav use case)
    'array_nested_conditionals': {
        name: 'Nested Conditionals in Array',
        template: '{{#items}}{{#active}}[{{/active}}{{name}}{{#active}}]{{/active}}{{/items}}',
        data: { 
            items: [
                { name: 'Home', active: true },
                { name: 'About', active: false },
                { name: 'Contact', active: true }
            ]
        },
        expected: '[Home]About[Contact]',
        critical: true
    },

    // 11. TopNav-like Complex Template (Real-world case)
    'topnav_like': {
        name: 'TopNav-like Complex Template',
        template: `{{#navItems}}<li><a href="{{route}}">{{#icon}}{{icon}} {{/icon}}{{text}}</a></li>{{/navItems}}`,
        data: {
            navItems: [
                { route: '/', text: 'Home', icon: 'home' },
                { route: '/about', text: 'About' },
                { route: '/contact', text: 'Contact', icon: 'mail' },
                { route: '/users', text: 'Users', icon: 'people' }
            ]
        },
        expected: '<li><a href="/">home Home</a></li><li><a href="/about">About</a></li><li><a href="/contact">mail Contact</a></li><li><a href="/users">people Users</a></li>',
        critical: true
    },

    // 12. Exact TopNav Case from basic-nav example
    'exact_topnav_case': {
        name: 'Exact TopNav Case from basic-nav',
        template: `{{#navItems}}<li class="nav-item"><a class="nav-link {{#active}}active{{/active}}" href="{{route}}">{{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}{{text}}</a></li>{{/navItems}}`,
        data: {
            navItems: [
                { route: '/', text: 'Home', icon: 'bi bi-house', active: true },
                { route: '/about', text: 'About', icon: 'bi bi-info-circle' },
                { route: '/contact', text: 'Contact', icon: 'bi bi-envelope' },
                { route: '/users', text: 'Users', icon: 'bi bi-people' }
            ]
        },
        expected: '<li class="nav-item"><a class="nav-link active" href="/"><i class="bi bi-house me-1"></i>Home</a></li><li class="nav-item"><a class="nav-link " href="/about"><i class="bi bi-info-circle me-1"></i>About</a></li><li class="nav-item"><a class="nav-link " href="/contact"><i class="bi bi-envelope me-1"></i>Contact</a></li><li class="nav-item"><a class="nav-link " href="/users"><i class="bi bi-people me-1"></i>Users</a></li>',
        critical: true
    },

    // 13. Object Property Access
    'object_property': {
        name: 'Object Property Access',
        template: '{{user.name}} - {{user.email}}',
        data: { user: { name: 'John', email: 'john@example.com' } },
        expected: 'John - john@example.com',
        critical: false
    },

    // 14. HTML Escaping
    'html_escaping': {
        name: 'HTML Escaping',
        template: '{{content}}',
        data: { content: '<script>alert("xss")</script>' },
        expected: '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
        critical: false
    },

    // 15. HTML Unescaping
    'html_unescaping': {
        name: 'HTML Unescaping',
        template: '{{{content}}}',
        data: { content: '<strong>Bold</strong>' },
        expected: '<strong>Bold</strong>',
        critical: false
    },

    // 16. Inverted Section - Empty Array
    'inverted_empty': {
        name: 'Inverted Section - Empty Array',
        template: '{{^items}}No items{{/items}}',
        data: { items: [] },
        expected: 'No items',
        critical: false
    },

    // 17. Inverted Section - Non-empty Array
    'inverted_nonempty': {
        name: 'Inverted Section - Non-empty Array',
        template: '{{^items}}No items{{/items}}',
        data: { items: ['item1'] },
        expected: '',
        critical: false
    },

    // 18. Nested Array Processing
    'nested_arrays': {
        name: 'Nested Array Processing',
        template: '{{#sections}}{{title}}:{{#items}}{{name}},{{/items}};{{/sections}}',
        data: {
            sections: [
                { title: 'Section1', items: [{ name: 'A' }, { name: 'B' }] },
                { title: 'Section2', items: [{ name: 'C' }, { name: 'D' }] }
            ]
        },
        expected: 'Section1:A,B,;Section2:C,D,;',
        critical: true
    }
};

// Deep diagnostic functions
function runDeepDiagnostic(testCase) {
    console.log(`\n🔬 DEEP DIAGNOSTIC: ${testCase.name}`);
    console.log('━'.repeat(60));
    
    try {
        // Step 1: Parse tokens
        console.log('📝 Step 1: Parsing template...');
        const tokens = Mustache.parse(testCase.template);
        console.log('   Parsed tokens:', tokens);
        
        // Step 2: Find array sections
        console.log('\n📝 Step 2: Analyzing sections...');
        const sections = tokens.filter(t => t[0] === '#' || t[0] === '^');
        sections.forEach((section, idx) => {
            console.log(`   Section ${idx + 1}: ${section[0]} "${section[1]}"`);
            console.log(`     Start: ${section[2]}, End: ${section[3]}`);
            console.log(`     Child tokens: ${section[4] ? section[4].length : 'none'}`);
            if (section[4]) {
                console.log(`     Children:`, section[4]);
            }
        });
        
        // Step 3: Check data lookup
        console.log('\n📝 Step 3: Data lookup test...');
        const context = new Mustache.Context(testCase.data);
        sections.forEach(section => {
            const value = context.lookup(section[1]);
            console.log(`   "${section[1]}" resolves to:`, value);
            if (Array.isArray(value)) {
                console.log(`     Array length: ${value.length}`);
                console.log(`     Array items:`, value);
            }
        });
        
        // Step 4: Manual render with logging
        console.log('\n📝 Step 4: Manual render with debug...');
        const originalRender = Mustache.Writer.prototype.renderTokens;
        let renderCallCount = 0;
        
        Mustache.Writer.prototype.renderTokens = function(tokens, context, partials, originalTemplate, config) {
            renderCallCount++;
            console.log(`     renderTokens call #${renderCallCount}`);
            console.log(`     Processing ${tokens.length} tokens`);
            
            const result = originalRender.call(this, tokens, context, partials, originalTemplate, config);
            console.log(`     renderTokens #${renderCallCount} result:`, JSON.stringify(result));
            return result;
        };
        
        const result = Mustache.render(testCase.template, testCase.data);
        console.log(`   Final result: "${result}"`);
        
        // Restore original method
        Mustache.Writer.prototype.renderTokens = originalRender;
        
        return {
            tokens,
            sections,
            result,
            renderCalls: renderCallCount
        };
        
    } catch (error) {
        console.log(`   💥 Diagnostic error: ${error.message}`);
        console.log(`   Stack:`, error.stack);
        return { error: error.message };
    }
}

// Test runner function
function runMustacheTests() {
    console.log('🧪 MOJO Mustache Test Suite Starting...\n');
    console.log('=' .repeat(80));

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        critical_failed: 0,
        failures: [],
        diagnostics: {}
    };

    for (const [key, test] of Object.entries(testCases)) {
        results.total++;
        
        console.log(`\n🔍 Testing: ${test.name} ${test.critical ? '🚨 CRITICAL' : ''}`);
        console.log(`   Template: ${test.template}`);
        console.log(`   Data:`, test.data);
        console.log(`   Expected: "${test.expected}"`);
        
        try {
            const result = Mustache.render(test.template, test.data);
            console.log(`   Result: "${result}"`);
            
            if (result === test.expected) {
                console.log(`   ✅ PASS`);
                results.passed++;
            } else {
                console.log(`   ❌ FAIL`);
                console.log(`   Length difference: Expected ${test.expected.length}, got ${result.length}`);
                results.failed++;
                if (test.critical) results.critical_failed++;
                
                const failure = {
                    key,
                    test,
                    result,
                    expected: test.expected,
                    critical: test.critical
                };
                results.failures.push(failure);
                
                // Run deep diagnostic for critical failures
                if (test.critical) {
                    results.diagnostics[key] = runDeepDiagnostic(test);
                }
            }
        } catch (error) {
            console.log(`   💥 ERROR: ${error.message}`);
            results.failed++;
            if (test.critical) results.critical_failed++;
            
            results.failures.push({
                key,
                test,
                error: error.message,
                critical: test.critical
            });
        }
    }

    // Summary Report
    console.log('\n' + '=' .repeat(80));
    console.log('📊 MOJO Mustache Test Results Summary');
    console.log('=' .repeat(80));
    console.log(`   Total Tests: ${results.total}`);
    console.log(`   Passed: ${results.passed} (${((results.passed / results.total) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${results.failed} (${((results.failed / results.total) * 100).toFixed(1)}%)`);
    console.log(`   Critical Failures: ${results.critical_failed}`);

    if (results.failures.length > 0) {
        console.log('\n🚨 Failed Tests Analysis:');
        console.log('─'.repeat(50));
        
        const criticalFailures = results.failures.filter(f => f.critical);
        const nonCriticalFailures = results.failures.filter(f => !f.critical);
        
        if (criticalFailures.length > 0) {
            console.log(`\n💥 ${criticalFailures.length} CRITICAL Failures (Core functionality broken):`);
            criticalFailures.forEach((failure, idx) => {
                console.log(`   ${idx + 1}. ${failure.test.name}`);
                if (failure.error) {
                    console.log(`      Error: ${failure.error}`);
                } else {
                    const expectedLen = failure.expected.length;
                    const resultLen = failure.result.length;
                    console.log(`      Expected (${expectedLen} chars): "${failure.expected}"`);
                    console.log(`      Got (${resultLen} chars): "${failure.result}"`);
                    
                    // Analyze the difference
                    if (failure.test.name.includes('Array') && resultLen < expectedLen) {
                        const expectedItems = (failure.expected.match(/<li>/g) || []).length;
                        const actualItems = (failure.result.match(/<li>/g) || []).length;
                        if (expectedItems > actualItems) {
                            console.log(`      🎯 ISSUE: Expected ${expectedItems} items, only got ${actualItems}`);
                            console.log(`      🎯 DIAGNOSIS: Array loop is terminating early!`);
                        }
                    }
                }
            });
        }
        
        if (nonCriticalFailures.length > 0) {
            console.log(`\n⚠️  ${nonCriticalFailures.length} Non-Critical Failures:`);
            nonCriticalFailures.forEach((failure, idx) => {
                console.log(`   ${idx + 1}. ${failure.test.name}`);
                if (failure.error) {
                    console.log(`      Error: ${failure.error}`);
                }
            });
        }
    }

    // Root Cause Analysis
    console.log('\n🎯 Root Cause Analysis:');
    console.log('─'.repeat(30));
    
    const arrayFailures = results.failures.filter(f => 
        f.test.name.includes('Array') || 
        f.test.name.includes('TopNav')
    );
    
    if (arrayFailures.length > 0) {
        console.log('🔍 IDENTIFIED ISSUE: Array loop processing is broken');
        console.log('   Evidence:');
        arrayFailures.forEach(failure => {
            if (!failure.error && failure.result.length < failure.expected.length) {
                console.log(`   - ${failure.test.name}: Got shorter result than expected`);
            }
        });
        
        console.log('\n📋 Recommended Fix Steps:');
        console.log('   1. Check renderTokens method array loop logic');
        console.log('   2. Verify Context.push method creates proper contexts');
        console.log('   3. Check token[4] child token structure for arrays');
        console.log('   4. Test context.lookup resolves correctly in loops');
        console.log('   5. Add debug logging to array processing loop');
    }

    // Success Metrics
    if (results.critical_failed === 0) {
        console.log('\n🎉 All critical tests passed! Core functionality working.');
    } else {
        console.log(`\n⚠️  ${results.critical_failed} critical issues need fixing before TopNav will work.`);
    }

    console.log('\n' + '=' .repeat(80));
    
    return results;
}

// Browser Console Helper
function createBrowserDiagnostic() {
    return `
// MUSTACHE ARRAY DIAGNOSTIC - Paste in browser console
// Run this on http://localhost:3000/examples/basic-nav

console.log('🔬 Quick Mustache Array Diagnostic');

const testTemplate = '{{#items}}[{{name}}]{{/items}}';
const testData = { 
    items: [
        { name: 'One' }, 
        { name: 'Two' }, 
        { name: 'Three' }, 
        { name: 'Four' }
    ]
};
const expected = '[One][Two][Three][Four]';

import('./src/utils/mustache.js').then(module => {
    const Mustache = module.default;
    
    console.log('Input array length:', testData.items.length);
    console.log('Template:', testTemplate);
    console.log('Expected:', expected);
    
    const result = Mustache.render(testTemplate, testData);
    console.log('Result:', result);
    
    const expectedCount = expected.match(/\\[/g).length;
    const actualCount = result.match(/\\[/g).length;
    
    console.log(\`Expected \${expectedCount} items, got \${actualCount} items\`);
    
    if (actualCount < expectedCount) {
        console.log('🚨 CONFIRMED: Array loop is broken - early termination!');
    } else if (actualCount === expectedCount) {
        console.log('✅ Array loop working correctly');
    }
});
`;
}

// Export for different environments
export { testCases, runMustacheTests, runDeepDiagnostic, createBrowserDiagnostic };

// Auto-run based on environment
if (typeof window !== 'undefined') {
    // Browser environment
    window.runMustacheTests = runMustacheTests;
    window.runDeepDiagnostic = runDeepDiagnostic;
    window.createBrowserDiagnostic = createBrowserDiagnostic;
    
    console.log('🔧 MOJO Mustache tests loaded!');
    console.log('🚀 Run with: runMustacheTests()');
    console.log('🔬 Deep diagnostic: runDeepDiagnostic(testCases.array_multiple)');
    console.log('📋 Browser helper: console.log(createBrowserDiagnostic())');
} else if (typeof module !== 'undefined' && module.exports) {
    // Node environment
    module.exports = { testCases, runMustacheTests, runDeepDiagnostic };
} else {
    // Direct execution
    runMustacheTests();
}