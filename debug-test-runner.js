#!/usr/bin/env node

/**
 * MOJO Framework Debug Test Runner
 * Identifies exactly which tests are executing vs defined
 */

const fs = require('fs');
const path = require('path');

class DebugTestRunner {
    constructor() {
        this.definedTests = [];
        this.executedTests = [];
        this.failedTests = [];
        this.errors = [];
        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0
        };
    }

    async run() {
        console.log('🔍 MOJO Debug Test Runner');
        console.log('==========================\n');

        // Set up test environment
        await this.setupEnvironment();

        // Run EventBus tests
        console.log('📋 Running EventBus Tests...');
        await this.runEventBusTests();

        // Run View tests
        console.log('\n📋 Running View Tests...');
        await this.runViewTests();

        // Generate report
        this.generateReport();
    }

    async setupEnvironment() {
        // Set up test helpers
        const { testHelpers } = require('./test/utils/test-helpers');
        await testHelpers.setup();

        // Set up modules
        const { setupModules } = require('./test/utils/simple-module-loader');
        this.modules = setupModules();
        
        console.log('✅ Test environment set up');
    }

    createDebugContext(testFile) {
        const self = this;
        const currentFile = path.basename(testFile);

        return {
            describe: (name, fn) => {
                console.log(`  📝 ${name}`);
                
                try {
                    const result = fn();
                    if (result && typeof result.then === 'function') {
                        console.log(`    ⚠️  WARNING: describe block returned promise in ${currentFile}`);
                    }
                } catch (error) {
                    console.log(`    ❌ DESCRIBE ERROR: ${error.message}`);
                    self.errors.push({
                        type: 'describe',
                        name: name,
                        file: currentFile,
                        error: error.message
                    });
                }
            },

            it: async (name, testFn) => {
                const testInfo = {
                    name: name,
                    file: currentFile,
                    executed: false,
                    passed: false,
                    error: null
                };

                self.definedTests.push(testInfo);
                self.stats.total++;

                try {
                    console.log(`    🧪 EXECUTING: ${name}`);
                    testInfo.executed = true;
                    self.executedTests.push(testInfo);

                    await testFn();
                    
                    console.log(`    ✅ PASSED: ${name}`);
                    testInfo.passed = true;
                    self.stats.passed++;
                } catch (error) {
                    console.log(`    ❌ FAILED: ${name}`);
                    console.log(`       Error: ${error.message}`);
                    
                    testInfo.error = error.message;
                    self.failedTests.push(testInfo);
                    self.stats.failed++;
                    
                    self.errors.push({
                        type: 'test',
                        name: name,
                        file: currentFile,
                        error: error.message,
                        stack: error.stack
                    });
                }
            },

            // Test utilities
            expect: this.createExpectMatcher(),
            assert: (condition, message) => {
                if (!condition) {
                    throw new Error(message || 'Assertion failed');
                }
            }
        };
    }

    createExpectMatcher() {
        return (actual) => ({
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${actual} to be ${expected}`);
                }
            },
            toEqual: (expected) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
                }
            },
            toMatch: (regex) => {
                if (!regex.test(actual)) {
                    throw new Error(`Expected ${actual} to match ${regex}`);
                }
            },
            toContain: (item) => {
                if (actual.indexOf && actual.indexOf(item) === -1) {
                    throw new Error(`Expected ${actual} to contain ${item}`);
                } else if (actual.includes && !actual.includes(item)) {
                    throw new Error(`Expected ${actual} to contain ${item}`);
                }
            },
            toHaveLength: (length) => {
                if (actual.length !== length) {
                    throw new Error(`Expected ${actual} to have length ${length}, but got ${actual.length}`);
                }
            },
            not: {
                toBe: (expected) => {
                    if (actual === expected) {
                        throw new Error(`Expected ${actual} not to be ${expected}`);
                    }
                }
            }
        });
    }

    async runEventBusTests() {
        const testFile = path.join(__dirname, 'test', 'unit', 'EventBus.test.js');
        
        if (!fs.existsSync(testFile)) {
            console.log('❌ EventBus test file not found');
            return;
        }

        try {
            const testModule = require(testFile);
            const context = this.createDebugContext(testFile);

            if (typeof testModule === 'function') {
                await testModule(context);
            } else {
                console.log('❌ EventBus test module is not a function');
            }
        } catch (error) {
            console.log(`❌ Error loading EventBus tests: ${error.message}`);
            this.errors.push({
                type: 'module',
                file: 'EventBus.test.js',
                error: error.message
            });
        }
    }

    async runViewTests() {
        const testFile = path.join(__dirname, 'test', 'unit', 'View.test.js');
        
        if (!fs.existsSync(testFile)) {
            console.log('❌ View test file not found');
            return;
        }

        try {
            const testModule = require(testFile);
            const context = this.createDebugContext(testFile);

            if (typeof testModule === 'function') {
                await testModule(context);
            } else {
                console.log('❌ View test module is not a function');
            }
        } catch (error) {
            console.log(`❌ Error loading View tests: ${error.message}`);
            this.errors.push({
                type: 'module',
                file: 'View.test.js',
                error: error.message
            });
        }
    }

    generateReport() {
        console.log('\n🏁 Debug Test Report');
        console.log('=====================');
        
        console.log(`📊 Test Statistics:`);
        console.log(`   Total Defined: ${this.definedTests.length}`);
        console.log(`   Actually Executed: ${this.executedTests.length}`);
        console.log(`   Passed: ${this.stats.passed}`);
        console.log(`   Failed: ${this.stats.failed}`);
        console.log(`   Success Rate: ${((this.stats.passed / this.stats.total) * 100).toFixed(1)}%`);

        // Find skipped tests
        const skippedTests = this.definedTests.filter(test => !test.executed);
        
        if (skippedTests.length > 0) {
            console.log(`\n❌ ${skippedTests.length} Tests Not Executed:`);
            console.log('─'.repeat(50));
            skippedTests.forEach((test, index) => {
                console.log(`${index + 1}. "${test.name}" (${test.file})`);
            });
        }

        // Show failed tests
        if (this.failedTests.length > 0) {
            console.log(`\n💥 ${this.failedTests.length} Failed Tests:`);
            console.log('─'.repeat(50));
            this.failedTests.forEach((test, index) => {
                console.log(`${index + 1}. "${test.name}" (${test.file})`);
                console.log(`   Error: ${test.error}`);
            });
        }

        // Show errors
        if (this.errors.length > 0) {
            console.log(`\n🚨 ${this.errors.length} Errors:`);
            console.log('─'.repeat(30));
            this.errors.forEach((error, index) => {
                console.log(`${index + 1}. [${error.type.toUpperCase()}] ${error.file}`);
                console.log(`   ${error.name || 'Unknown'}`);
                console.log(`   Error: ${error.error}`);
                console.log('');
            });
        }

        // File breakdown
        console.log('\n📄 File Breakdown:');
        console.log('─'.repeat(20));
        
        const fileStats = {};
        this.definedTests.forEach(test => {
            if (!fileStats[test.file]) {
                fileStats[test.file] = { total: 0, executed: 0, passed: 0 };
            }
            fileStats[test.file].total++;
            if (test.executed) fileStats[test.file].executed++;
            if (test.passed) fileStats[test.file].passed++;
        });

        Object.keys(fileStats).forEach(file => {
            const stats = fileStats[file];
            console.log(`${file}: ${stats.passed}/${stats.executed} executed, ${stats.total} total`);
        });

        console.log('\n🎯 Recommendations:');
        if (skippedTests.length > 0) {
            console.log('   1. Check for async/await issues in describe blocks');
            console.log('   2. Look for syntax errors in test definitions');
            console.log('   3. Verify all test modules export properly');
            console.log('   4. Check for exceptions thrown during test setup');
        } else if (this.stats.failed > 0) {
            console.log('   1. All tests are executing, but some are failing');
            console.log('   2. Check test logic and expectations');
            console.log('   3. Verify mock setup and data');
        } else {
            console.log('   ✅ All tests are running and passing correctly!');
        }

        console.log(`\n${this.stats.failed === 0 ? '🎉' : '⚠️'} Debug Complete`);
        
        return {
            total: this.stats.total,
            passed: this.stats.passed,
            failed: this.stats.failed,
            executed: this.executedTests.length,
            skipped: skippedTests.length,
            errors: this.errors.length
        };
    }
}

// Run debug test runner if called directly
if (require.main === module) {
    const runner = new DebugTestRunner();
    runner.run()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('🚨 Debug runner error:', error);
            process.exit(1);
        });
}

module.exports = DebugTestRunner;