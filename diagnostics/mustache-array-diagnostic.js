/**
 * MOJO Mustache Array Loop Diagnostic Script
 * 
 * USAGE: 
 * 1. Open browser console on http://localhost:3000/examples/basic-nav
 * 2. Copy and paste this entire script
 * 3. Run: runMustacheDiagnostic()
 * 
 * This will identify exactly where array loop processing is failing.
 */

console.log('🔬 MOJO Mustache Array Diagnostic Script Loaded');
console.log('📋 Usage: runMustacheDiagnostic()');

async function runMustacheDiagnostic() {
    console.log('\n' + '=' .repeat(80));
    console.log('🧪 MOJO MUSTACHE ARRAY LOOP DIAGNOSTIC');
    console.log('=' .repeat(80));
    console.log('🎯 Goal: Identify exact failure point in array processing\n');

    try {
        // Import Mustache
        const { default: Mustache } = await import('./src/utils/mustache.js');
        console.log('✅ Mustache loaded:', Mustache.name, Mustache.version);

        // Test Suite - Progressive Complexity
        const diagnosticTests = [
            {
                name: 'Basic Variable',
                template: 'Hello {{name}}!',
                data: { name: 'World' },
                expected: 'Hello World!',
                critical: false
            },
            {
                name: 'Boolean True',
                template: '{{#show}}Visible{{/show}}',
                data: { show: true },
                expected: 'Visible',
                critical: false
            },
            {
                name: 'Boolean False', 
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
                name: 'CRITICAL: Two Array Items (THE BUG)',
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
                name: 'CRITICAL: TopNav Real Case',
                template: '{{#navItems}}<li>{{text}}</li>{{/navItems}}',
                data: {
                    navItems: [
                        { text: 'Home' },
                        { text: 'About' },  
                        { text: 'Contact' },
                        { text: 'Users' }
                    ]
                },
                expected: '<li>Home</li><li>About</li><li>Contact</li><li>Users</li>',
                critical: true
            },
            {
                name: 'CRITICAL: Nested Conditionals in Array',
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
            }
        ];

        let totalTests = 0;
        let passedTests = 0;
        let criticalFailures = 0;
        const failures = [];

        // Run each test
        for (const test of diagnosticTests) {
            totalTests++;
            console.log(`\n🔍 Test: ${test.name}`);
            console.log(`   Template: ${test.template}`);
            console.log(`   Data:`, test.data);
            console.log(`   Expected: "${test.expected}"`);

            try {
                const result = Mustache.render(test.template, test.data);
                console.log(`   Result: "${result}"`);
                
                if (result === test.expected) {
                    console.log(`   ✅ PASS`);
                    passedTests++;
                } else {
                    console.log(`   ❌ FAIL`);
                    console.log(`   Expected length: ${test.expected.length}`);
                    console.log(`   Result length: ${result.length}`);
                    
                    if (test.critical) criticalFailures++;
                    failures.push({ test, result, expected: test.expected });

                    // Deep analysis for critical array failures
                    if (test.critical && test.name.includes('Array')) {
                        console.log(`   🔬 DEEP ANALYSIS:`);
                        
                        // Count expected vs actual items
                        if (test.template.includes('#items')) {
                            const expectedItems = test.data.items.length;
                            const expectedMatches = (test.expected.match(/\[/g) || []).length;
                            const actualMatches = (result.match(/\[/g) || []).length;
                            
                            console.log(`     Input array length: ${expectedItems}`);
                            console.log(`     Expected items rendered: ${expectedMatches}`);
                            console.log(`     Actual items rendered: ${actualMatches}`);
                            
                            if (actualMatches < expectedMatches) {
                                console.log(`     🚨 CONFIRMED: Array loop terminates early!`);
                                console.log(`     🚨 Only ${actualMatches}/${expectedMatches} items processed`);
                            }
                        }

                        // Token analysis
                        console.log(`   📝 TOKEN ANALYSIS:`);
                        const tokens = Mustache.parse(test.template);
                        console.log(`     Parsed tokens:`, tokens);
                        
                        const sectionToken = tokens.find(t => t[0] === '#');
                        if (sectionToken) {
                            console.log(`     Section token:`, sectionToken);
                            console.log(`     Child tokens:`, sectionToken[4]);
                            console.log(`     Child token count: ${sectionToken[4] ? sectionToken[4].length : 0}`);
                        }
                    }
                }

            } catch (error) {
                console.log(`   💥 ERROR: ${error.message}`);
                console.log(`   Stack:`, error.stack);
                if (test.critical) criticalFailures++;
                failures.push({ test, error: error.message });
            }
        }

        // Summary Report
        console.log('\n' + '=' .repeat(80));
        console.log('📊 DIAGNOSTIC RESULTS SUMMARY');
        console.log('=' .repeat(80));
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${totalTests - passedTests}`);
        console.log(`Critical Failures: ${criticalFailures}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        // Root Cause Analysis
        console.log('\n🎯 ROOT CAUSE ANALYSIS:');
        console.log('─'.repeat(40));

        const arrayFailures = failures.filter(f => f.test.name.includes('Array'));
        
        if (arrayFailures.length > 0) {
            console.log('🚨 IDENTIFIED ISSUE: Array loop processing is BROKEN');
            console.log('\n📋 Evidence:');
            
            arrayFailures.forEach(failure => {
                if (!failure.error) {
                    const shortResult = failure.result.length > 50 ? 
                        failure.result.substring(0, 50) + '...' : failure.result;
                    console.log(`   • ${failure.test.name}:`);
                    console.log(`     Expected ${failure.expected.length} chars, got ${failure.result.length} chars`);
                    console.log(`     Result: "${shortResult}"`);
                }
            });

            console.log('\n🔧 RECOMMENDED FIX LOCATIONS:');
            console.log('   1. 📍 File: src/utils/mustache.js');
            console.log('   2. 📍 Method: Writer.renderTokens() - case "#"');
            console.log('   3. 📍 Lines: ~350-370 (array processing loop)');
            console.log('   4. 📍 Check: Context.push() method for array items');
            console.log('   5. 📍 Check: Token structure token[4] for child tokens');

            console.log('\n⚡ QUICK DEBUG STEPS:');
            console.log('   1. Add console.log to array processing loop');
            console.log('   2. Verify loop iterates through ALL array items');
            console.log('   3. Check if context.push() creates proper child contexts');
            console.log('   4. Ensure renderTokens() is called for each array item');
            
            console.log('\n🚨 IMPACT:');
            console.log('   • TopNav will only show first navigation item');
            console.log('   • Any component using arrays will be broken');
            console.log('   • All table/list components will fail');

        } else if (passedTests === totalTests) {
            console.log('✅ NO ISSUES FOUND: Array processing works correctly!');
            console.log('   This suggests the issue may be elsewhere.');
        } else {
            console.log('⚠️  Some tests failed, but not array-specific ones.');
            console.log('   Check individual failure details above.');
        }

        // Next Steps
        console.log('\n🚀 NEXT STEPS:');
        console.log('─'.repeat(20));
        if (criticalFailures > 0) {
            console.log('1. 🔧 Fix the renderTokens array loop logic');
            console.log('2. 🧪 Re-run this diagnostic to verify fix');
            console.log('3. 🏃 Test TopNav component in basic-nav example');
            console.log('4. ✅ Verify all 4 navigation items appear');
        } else {
            console.log('1. ✅ All tests passed - Mustache is working!');
            console.log('2. 🔍 Look for issues in TopNav component usage');
            console.log('3. 🔍 Check TopNav data structure and rendering');
        }

        console.log('\n' + '=' .repeat(80));
        console.log('🎯 Diagnostic Complete!');
        console.log('=' .repeat(80));

        return {
            total: totalTests,
            passed: passedTests,
            failed: totalTests - passedTests,
            critical: criticalFailures,
            issues: arrayFailures.length > 0 ? 'Array loops broken' : 'No major issues'
        };

    } catch (error) {
        console.error('💥 Diagnostic failed to load Mustache:', error);
        console.error('   Make sure you\'re on the basic-nav example page');
        console.error('   URL should be: http://localhost:3000/examples/basic-nav');
        return { error: error.message };
    }
}

// Quick test functions for immediate use
async function quickArrayTest() {
    try {
        console.log('\n⚡ QUICK ARRAY TEST');
        const { default: Mustache } = await import('./src/utils/mustache.js');
        
        const template = '{{#items}}[{{name}}]{{/items}}';
        const data = { items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] };
        const expected = '[A][B][C]';
        
        console.log('Template:', template);
        console.log('Data:', data);
        console.log('Expected:', expected);
        
        const result = Mustache.render(template, data);
        console.log('Result:', result);
        console.log('Match:', result === expected ? '✅ PASS' : '❌ FAIL');
        
        if (result !== expected) {
            console.log('🚨 Array loop is BROKEN!');
            const expectedCount = expected.match(/\[/g).length;
            const actualCount = result.match(/\[/g).length;
            console.log(`   Expected ${expectedCount} items, got ${actualCount} items`);
        }
        
        return result === expected;
    } catch (error) {
        console.error('Quick test error:', error);
        return false;
    }
}

async function testTopNavCase() {
    try {
        console.log('\n🧭 TOPNAV SPECIFIC TEST');
        const { default: Mustache } = await import('./src/utils/mustache.js');
        
        const template = '{{#navItems}}<li class="nav-item">{{text}}</li>{{/navItems}}';
        const data = {
            navItems: [
                { text: 'Home' },
                { text: 'About' }, 
                { text: 'Contact' },
                { text: 'Users' }
            ]
        };
        
        console.log('TopNav Template:', template);
        console.log('NavItems count:', data.navItems.length);
        
        const result = Mustache.render(template, data);
        console.log('Result:', result);
        
        const expectedItems = 4;
        const actualItems = (result.match(/<li/g) || []).length;
        console.log(`Expected ${expectedItems} nav items, got ${actualItems} nav items`);
        
        if (actualItems < expectedItems) {
            console.log('🚨 TopNav will be BROKEN! Only first item will show.');
        } else {
            console.log('✅ TopNav should work correctly!');
        }
        
        return actualItems === expectedItems;
    } catch (error) {
        console.error('TopNav test error:', error);
        return false;
    }
}

// Make functions globally available
window.runMustacheDiagnostic = runMustacheDiagnostic;
window.quickArrayTest = quickArrayTest;
window.testTopNavCase = testTopNavCase;

// Instructions
console.log('\n🎯 Available functions:');
console.log('   • runMustacheDiagnostic() - Full diagnostic suite'); 
console.log('   • quickArrayTest() - Quick array test');
console.log('   • testTopNavCase() - Test TopNav specific case');
console.log('\n🚀 Start with: runMustacheDiagnostic()');