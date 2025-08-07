#!/usr/bin/env node

/**
 * MOJO Framework Test Runner
 * A lightweight test runner for the MOJO framework
 */

const fs = require('fs');
const path = require('path');

class TestRunner {
    constructor(options = {}) {
        this.options = {
            verbose: false,
            bail: false,
            grep: null,
            suite: null,
            debug: false,
            coverage: false,
            ...options
        };

        this.stats = {
            suites: [],
            total: 0,
            passed: 0,
            failed: 0,
            duration: 0,
            startTime: 0
        };
    }

    /**
     * Main entry point - run all tests
     */
    async run() {
        console.log('🧪 MOJO Framework Test Runner');
        console.log('==============================\n');

        this.stats.startTime = Date.now();

        // Discover test files
        const testSuites = this.discoverTests();
        
        if (testSuites.length === 0) {
            console.log('❌ No test files found');
            return;
        }

        console.log('📋 Discovered test suites:');
        testSuites.forEach(suite => {
            console.log(`   ${suite.name}: ${suite.files.length} test files`);
        });

        console.log('\n🚀 Running test suites...\n');

        // Run test suites
        for (const suite of testSuites) {
            if (this.options.suite && this.options.suite !== suite.name) {
                continue;
            }
            await this.runTestSuite(suite.name, suite.files);
        }

        // Calculate total duration
        this.stats.duration = Date.now() - this.stats.startTime;

        // Generate report
        this.generateReport();

        // Exit with appropriate code
        process.exit(this.stats.failed > 0 ? 1 : 0);
    }

    /**
     * Discover test files in test directory
     */
    discoverTests() {
        const testDir = path.join(process.cwd(), 'test');
        const suites = [];

        if (!fs.existsSync(testDir)) {
            return suites;
        }

        // Look for test subdirectories
        const subdirs = ['unit', 'integration', 'build'];
        
        subdirs.forEach(subdir => {
            const suiteDir = path.join(testDir, subdir);
            if (fs.existsSync(suiteDir)) {
                const files = fs.readdirSync(suiteDir)
                    .filter(file => file.endsWith('.test.js') || file.endsWith('.js'))
                    .map(file => path.join(suiteDir, file));
                
                if (files.length > 0) {
                    suites.push({
                        name: subdir,
                        files: files
                    });
                }
            }
        });

        return suites;
    }

    /**
     * Run a test suite (collection of test files)
     */
    async runTestSuite(suiteType, testFiles) {
        console.log(`📋 Running ${suiteType} tests...`);
        console.log('─'.repeat(40));

        const suiteStats = {
            name: suiteType,
            tests: [],
            total: 0,
            passed: 0,
            failed: 0,
            duration: 0,
            startTime: Date.now()
        };

        for (const testFile of testFiles) {
            try {
                const testResult = await this.runTestFile(testFile);
                suiteStats.tests.push(testResult);
                suiteStats.total += testResult.total;
                suiteStats.passed += testResult.passed;
                suiteStats.failed += testResult.failed;
                suiteStats.unknown = (suiteStats.unknown || 0) + (testResult.unknown || 0);
            } catch (error) {
                console.error(`❌ Error running test file ${path.basename(testFile)}: ${error.message}`);
                suiteStats.failed++;
                suiteStats.total++;
            }

            if (this.options.bail && suiteStats.failed > 0) {
                break;
            }
        }

        suiteStats.duration = Date.now() - suiteStats.startTime;
        
        // Update overall stats
        this.stats.total += suiteStats.total;
        this.stats.passed += suiteStats.passed;
        this.stats.failed += suiteStats.failed;
        this.stats.unknown = (this.stats.unknown || 0) + (suiteStats.unknown || 0);

        if (this.options.debug) {
            console.log(`🔍 DEBUG: Suite ${suiteType} completed`);
            console.log(`   Suite stats: ${suiteStats.passed} passed, ${suiteStats.failed} failed, ${suiteStats.total} total`);
            console.log(`   Overall stats: ${this.stats.passed} passed, ${this.stats.failed} failed, ${this.stats.total} total`);
        }

        const unknownCount = suiteStats.unknown || 0;
        if (unknownCount > 0) {
            console.log(`✅ ${suiteType} tests: ${suiteStats.passed}/${suiteStats.total} passed, ${unknownCount} unknown (${suiteStats.duration.toFixed(2)}ms)\n`);
        } else {
            console.log(`✅ ${suiteType} tests: ${suiteStats.passed}/${suiteStats.total} passed (${suiteStats.duration.toFixed(2)}ms)\n`);
        }
    }

    /**
     * Run a single test file
     */
    async runTestFile(testFile) {
        const testResult = {
            file: path.basename(testFile),
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };

        try {
            // Create test context
            const testContext = this.createTestContext();

            // Require and run the test module
            delete require.cache[require.resolve(testFile)];
            const testModule = require(testFile);
            
            if (typeof testModule === 'function') {
                await testModule(testContext);
                
                // Wait for all test promises to complete
                if (testContext.stats.testPromises.length > 0) {
                    await Promise.all(testContext.stats.testPromises);
                }
            } else {
                throw new Error('Test module must export a function');
            }

            // Calculate unknown tests (started but never completed)
            testContext.stats.unknown = testContext.stats.total - testContext.stats.passed - testContext.stats.failed;

            // Collect results from context
            testResult.total = testContext.stats.total;
            testResult.passed = testContext.stats.passed;
            testResult.failed = testContext.stats.failed;
            testResult.errors = testContext.stats.errors;
            testResult.unknown = testContext.stats.unknown || 0;
            
            if (this.options.debug) {
                console.log(`🔍 DEBUG: File ${path.basename(testFile)} results:`);
                console.log(`   Total: ${testResult.total}, Passed: ${testResult.passed}, Failed: ${testResult.failed}`);
            }

        } catch (error) {
            console.error(`❌ Error in test file ${path.basename(testFile)}: ${error.message}`);
            testResult.failed = 1;
            testResult.total = 1;
            testResult.errors.push({
                test: 'Module Load',
                message: error.message,
                stack: error.stack
            });
        }

        return testResult;
    }

    /**
     * Create isolated test context for each test file
     */
    createTestContext() {
        const stats = {
            total: 0,
            passed: 0,
            failed: 0,
            unknown: 0,
            testPromises: []
        };

        const context = {
            stats,
            
            describe: (name, fn) => {
                console.log(`  📝 ${name}`);
                try {
                    return fn();
                } catch (error) {
                    console.log(`    ❌ DESCRIBE ERROR in "${name}": ${error.message}`);
                    if (this.options.debug) {
                        console.log(`       ${error.stack}`);
                    }
                }
            },

            it: (name, fn) => {
                stats.total++;
                if (this.options.debug) {
                    console.log(`    🧪 COUNTING: Test ${stats.total} - ${name}`);
                }
                
                // Create a promise for this test and track it
                const testPromise = (async () => {
                    try {
                        await fn();
                        console.log(`    ✅ ${name}`);
                        stats.passed++;
                        if (this.options.debug) {
                            console.log(`    📊 PASSED: ${stats.passed}/${stats.total}`);
                        }
                    } catch (error) {
                        console.log(`    ❌ ${name}`);
                        console.log(`       ${error.message}`);
                        stats.failed++;
                        stats.errors.push({
                            test: name,
                            message: error.message,
                            stack: error.stack
                        });
                        if (this.options.debug) {
                            console.log(`    📊 FAILED: ${stats.failed}/${stats.total}`);
                        }
                    }
                })();
                
                // Track the test promise so we can wait for it
                stats.testPromises.push(testPromise);
            },

            test: function(name, fn) {
                return this.it(name, fn);
            },

            expect: this.createExpectMatcher(),

            assert: (condition, message) => {
                if (!condition) {
                    throw new Error(message || 'Assertion failed');
                }
            }
        };

        return context;
    }

    /**
     * Create comprehensive expect matcher
     */
    createExpectMatcher() {
        const expectFn = (actual) => {
            const expectObj = {
                toBe: (expected) => {
                    if (actual !== expected) {
                        throw new Error(`Expected ${actual} to be ${expected}`);
                    }
                    return expectObj;
                },
                
                toEqual: (expected) => {
                    // Handle asymmetric matchers
                    if (expected && typeof expected.asymmetricMatch === 'function') {
                        if (!expected.asymmetricMatch(actual)) {
                            throw new Error(`Expected ${JSON.stringify(actual)} to equal ${expected.toString()}`);
                        }
                    } else if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
                    }
                    return expectObj;
                },

                toBeTruthy: () => {
                    if (!actual) {
                        throw new Error(`Expected ${actual} to be truthy`);
                    }
                    return expectObj;
                },

                toBeFalsy: () => {
                    if (actual) {
                        throw new Error(`Expected ${actual} to be falsy`);
                    }
                    return expectObj;
                },

                toThrow: (expectedMessage) => {
                    let threw = false;
                    let actualError = null;
                    
                    try {
                        if (typeof actual === 'function') {
                            actual();
                        } else {
                            throw new Error('Expected value to be a function');
                        }
                    } catch (error) {
                        threw = true;
                        actualError = error;
                    }
                    
                    if (!threw) {
                        throw new Error('Expected function to throw');
                    }
                    
                    if (expectedMessage && actualError.message !== expectedMessage) {
                        throw new Error(`Expected error message "${actualError.message}" to be "${expectedMessage}"`);
                    }
                    
                    return expectObj;
                },

                toContain: (expected) => {
                    if (Array.isArray(actual)) {
                        if (!actual.includes(expected)) {
                            throw new Error(`Expected array [${actual.join(', ')}] to contain ${expected}`);
                        }
                    } else if (typeof actual === 'string') {
                        if (actual.indexOf(expected) === -1) {
                            throw new Error(`Expected string "${actual}" to contain "${expected}"`);
                        }
                    } else {
                        throw new Error(`Expected ${actual} to be an array or string for toContain`);
                    }
                    return expectObj;
                },

                toBeInstanceOf: (expected) => {
                    if (!(actual instanceof expected)) {
                        throw new Error(`Expected ${actual} to be instance of ${expected.name}`);
                    }
                    return expectObj;
                },

                toHaveLength: (expected) => {
                    if (!actual || typeof actual.length !== 'number') {
                        throw new Error(`Expected ${actual} to have a length property`);
                    }
                    if (actual.length !== expected) {
                        throw new Error(`Expected length ${actual.length} to be ${expected}`);
                    }
                    return expectObj;
                },

                toBeGreaterThan: (expected) => {
                    if (actual <= expected) {
                        throw new Error(`Expected ${actual} to be greater than ${expected}`);
                    }
                    return expectObj;
                },

                toBeLessThan: (expected) => {
                    if (actual >= expected) {
                        throw new Error(`Expected ${actual} to be less than ${expected}`);
                    }
                    return expectObj;
                },

                toMatch: (expected) => {
                    const regex = expected instanceof RegExp ? expected : new RegExp(expected);
                    if (typeof actual !== 'string' || !regex.test(actual)) {
                        throw new Error(`Expected "${actual}" to match ${expected}`);
                    }
                    return expectObj;
                },

                toBeDefined: () => {
                    if (actual === undefined) {
                        throw new Error(`Expected ${actual} to be defined`);
                    }
                    return expectObj;
                },

                toBeUndefined: () => {
                    if (actual !== undefined) {
                        throw new Error(`Expected ${actual} to be undefined`);
                    }
                    return expectObj;
                },

                not: {
                    toBe: (expected) => {
                        if (actual === expected) {
                            throw new Error(`Expected ${actual} not to be ${expected}`);
                        }
                        return expectObj;
                    },
                    toEqual: (expected) => {
                        if (expected && typeof expected.asymmetricMatch === 'function') {
                            if (expected.asymmetricMatch(actual)) {
                                throw new Error(`Expected ${JSON.stringify(actual)} not to equal ${expected.toString()}`);
                            }
                        } else if (JSON.stringify(actual) === JSON.stringify(expected)) {
                            throw new Error(`Expected ${JSON.stringify(actual)} not to equal ${JSON.stringify(expected)}`);
                        }
                        return expectObj;
                    },
                    toBeTruthy: () => {
                        if (actual) {
                            throw new Error(`Expected ${actual} not to be truthy`);
                        }
                        return expectObj;
                    },
                    toBeFalsy: () => {
                        if (!actual) {
                            throw new Error(`Expected ${actual} not to be falsy`);
                        }
                        return expectObj;
                    },
                    toContain: (expected) => {
                        if (Array.isArray(actual)) {
                            if (actual.includes(expected)) {
                                throw new Error(`Expected array [${actual.join(', ')}] not to contain ${expected}`);
                            }
                        } else if (typeof actual === 'string') {
                            if (actual.indexOf(expected) !== -1) {
                                throw new Error(`Expected string "${actual}" not to contain "${expected}"`);
                            }
                        }
                        return expectObj;
                    },
                    toThrow: () => {
                        let threw = false;
                        try {
                            if (typeof actual === 'function') {
                                actual();
                            }
                        } catch {
                            threw = true;
                        }
                        if (threw) {
                            throw new Error('Expected function not to throw');
                        }
                        return expectObj;
                    }
                }
            };
            return expectObj;
        };

        // Add static methods to expect
        expectFn.arrayContaining = (expected) => {
            return {
                asymmetricMatch: (actual) => {
                    if (!Array.isArray(actual)) {
                        return false;
                    }
                    return expected.every(item => actual.includes(item));
                },
                toString: () => `ArrayContaining [${expected.join(', ')}]`
            };
        };

        expectFn.objectContaining = (expected) => {
            return {
                asymmetricMatch: (actual) => {
                    if (typeof actual !== 'object' || actual === null) {
                        return false;
                    }
                    return Object.keys(expected).every(key => 
                        actual.hasOwnProperty(key) && actual[key] === expected[key]
                    );
                },
                toString: () => `ObjectContaining ${JSON.stringify(expected)}`
            };
        };

        expectFn.stringContaining = (expected) => {
            return {
                asymmetricMatch: (actual) => {
                    return typeof actual === 'string' && actual.includes(expected);
                },
                toString: () => `StringContaining "${expected}"`
            };
        };

        expectFn.stringMatching = (expected) => {
            return {
                asymmetricMatch: (actual) => {
                    const regex = expected instanceof RegExp ? expected : new RegExp(expected);
                    return typeof actual === 'string' && regex.test(actual);
                },
                toString: () => `StringMatching ${expected}`
            };
        };

        return expectFn;
    }

    /**
     * Generate final test report
     */
    generateReport() {
        console.log('🏁 Test Results Summary');
        console.log('========================');
        console.log(`Total Tests: ${this.stats.total}`);
        console.log(`✅ Passed: ${this.stats.passed}`);
        console.log(`❌ Failed: ${this.stats.failed}`);
        if (this.stats.unknown > 0) {
            console.log(`❓ Unknown: ${this.stats.unknown} (started but never completed)`);
        }
        console.log(`⏱️  Duration: ${this.stats.duration.toFixed(2)}ms`);
        
        if (this.stats.total > 0) {
            const successRate = ((this.stats.passed / this.stats.total) * 100).toFixed(1);
            console.log(`🎯 Success Rate: ${successRate}%`);
        }

        console.log(`\n📊 Test Suite Breakdown:`);
        for (const suite of this.stats.suites) {
            const rate = suite.total > 0 ? ((suite.passed / suite.total) * 100).toFixed(1) : '0.0';
            console.log(`   ${suite.name}: ${suite.passed}/${suite.total} (${rate}%)`);
        }

        if (this.stats.failed > 0) {
            console.log('\n❌ Failed Tests:');
            for (const suite of this.stats.suites) {
                for (const test of suite.tests) {
                    if (test.errors.length > 0) {
                        console.log(`   ${test.file}:`);
                        for (const error of test.errors) {
                            console.log(`      ❌ ${error.test}: ${error.message}`);
                        }
                    }
                }
            }
        }

        console.log('\n' + (this.stats.failed === 0 ? 
            '🎉 All tests passed!' : 
            `⚠️  ${this.stats.failed} test(s) failed.`
        ));
    }
}

/**
 * CLI argument parsing
 */
function parseArgs(args) {
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--bail':
            case '-b':
                options.bail = true;
                break;
            case '--debug':
            case '-d':
                options.debug = true;
                break;
            case '--coverage':
            case '-c':
                options.coverage = true;
                break;
            case '--suite':
            case '-s':
                options.suite = args[++i];
                break;
            case '--quiet':
            case '-q':
                options.quiet = true;
                break;
            case '--grep':
            case '-g':
                options.grep = args[++i];
                break;
            case '--help':
            case '-h':
                console.log(`
MOJO Framework Test Runner

Usage: node test-runner.js [options]

Options:
  --verbose, -v     Verbose output
  --bail, -b        Stop on first failure
  --debug, -d       Debug mode
  --coverage, -c    Generate coverage report
  --suite, -s       Run specific test suite (unit|integration|build)
  --quiet, -q       Suppress non-essential output
  --grep, -g        Run tests matching pattern
  --help, -h        Show this help
                `);
                process.exit(0);
                break;
        }
    }
    
    return options;
}

// Run test runner if called directly
if (require.main === module) {
    const options = parseArgs(process.argv.slice(2));
    const runner = new TestRunner(options);
    
    runner.run().catch(error => {
        console.error('🚨 Test runner error:', error);
        process.exit(1);
    });
}

module.exports = TestRunner;