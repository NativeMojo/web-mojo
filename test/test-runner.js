#!/usr/bin/env node

/**
 * MOJO Framework Test Runner
 * A lightweight test runner for the MOJO framework
 */

const fs = require('fs');
const path = require('path');

// Install up-front browser-environment stubs BEFORE any test file is loaded
// so source modules imported at require-time (e.g. Rest.js constructs a
// singleton, DataFormatter.js assigns to window) don't crash. Individual
// tests may override these with richer mocks.
(function installBrowserStubs() {
    if (typeof globalThis.window === 'undefined') {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM(
            '<!DOCTYPE html><html><body><div id="app"></div><div id="test-container"></div></body></html>',
            { url: 'http://localhost:3000', pretendToBeVisual: true }
        );
        globalThis.window = dom.window;
        globalThis.document = dom.window.document;
        globalThis.HTMLElement = dom.window.HTMLElement;
        globalThis.Event = dom.window.Event;
        globalThis.CustomEvent = dom.window.CustomEvent;
        globalThis.Node = dom.window.Node;
        globalThis.FormData = dom.window.FormData;
        globalThis.File = dom.window.File;
        globalThis.Blob = dom.window.Blob;
        globalThis.navigator = dom.window.navigator;
    }
    if (typeof globalThis.localStorage === 'undefined' ||
        typeof globalThis.localStorage.getItem !== 'function') {
        const store = new Map();
        globalThis.localStorage = {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => { store.set(k, String(v)); },
            removeItem: (k) => { store.delete(k); },
            clear: () => { store.clear(); }
        };
    }
})();

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
     * Run a single test file. Supports both CommonJS (module.exports = fn)
     * and ESM (export default fn) test files.
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
            const testContext = this.createTestContext();

            // Detect ESM by reading the file; top-level `import` makes it ESM.
            const source = fs.readFileSync(testFile, 'utf8');
            const isESM = /^\s*import\s+[^('"\s]/m.test(source);

            let testModule;
            if (isESM) {
                // Expose the test context as globals so ESM test files can use
                // describe/it/expect/beforeEach/afterEach without boilerplate.
                this.installGlobalTestContext(testContext);
                const mod = await import(`file://${testFile}?t=${Date.now()}`);
                testModule = mod.default || mod;
            } else {
                delete require.cache[require.resolve(testFile)];
                testModule = require(testFile);
            }

            if (typeof testModule === 'function') {
                await testModule(testContext);
            } else if (isESM) {
                // ESM tests that don't export a function declare their tests
                // at module scope against the installed globals.
            } else {
                throw new Error('Test module must export a function');
            }

            // Wait for the sequential test chain to fully drain.
            await testContext.__awaitAll();

            if (isESM) {
                this.uninstallGlobalTestContext();
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
            errors: [],
            testPromises: []
        };

        // Stack of [beforeEach[], afterEach[]] frames, one per describe scope.
        // This mirrors Jest/Mocha: hooks declared inside a describe only apply
        // to tests inside that describe.
        const hookStack = [[[], []]];
        const currentHooks = () => hookStack[hookStack.length - 1];

        // Serialize test execution: each `it()` is chained onto a single
        // promise so tests inside a file never run concurrently. Shared
        // globals (fetch, localStorage, AbortSignal) are safe with this model.
        let testChain = Promise.resolve();

        const describe = (name, fn) => {
            console.log(`  📝 ${name}`);
            hookStack.push([[], []]);
            try {
                return fn();
            } catch (error) {
                console.log(`    ❌ DESCRIBE ERROR in "${name}": ${error.message}`);
                if (this.options.debug) {
                    console.log(`       ${error.stack}`);
                }
            } finally {
                hookStack.pop();
            }
        };

        // Snapshot of which hook arrays are visible at the time `it()` is
        // declared. All ancestor beforeEach/afterEach callbacks run for that test.
        const it = (name, fn) => {
            stats.total++;
            const activeBefore = hookStack.map(frame => frame[0]);
            const activeAfter = hookStack.map(frame => frame[1]);

            testChain = testChain.then(async () => {
                try {
                    for (const arr of activeBefore) {
                        for (const cb of arr) await cb();
                    }

                    await fn();

                    // afterEach runs inside-out (reverse of beforeEach)
                    for (let i = activeAfter.length - 1; i >= 0; i--) {
                        for (const cb of activeAfter[i]) await cb();
                    }

                    console.log(`    ✅ ${name}`);
                    stats.passed++;
                } catch (error) {
                    console.log(`    ❌ ${name}`);
                    console.log(`       ${error.message}`);
                    stats.failed++;
                    stats.errors.push({
                        test: name,
                        message: error.message,
                        stack: error.stack
                    });
                }
            });

            stats.testPromises.push(testChain);
        };

        const context = {
            stats,
            describe,
            it,
            test: it,
            beforeEach: (fn) => { currentHooks()[0].push(fn); },
            afterEach: (fn) => { currentHooks()[1].push(fn); },
            expect: this.createExpectMatcher(),
            assert: (condition, message) => {
                if (!condition) {
                    throw new Error(message || 'Assertion failed');
                }
            }
        };

        // Expose a waiter so the runner can await the final test in the chain.
        context.__awaitAll = () => testChain;

        return context;
    }

    /**
     * Install the test context onto `globalThis` so ESM test files (which
     * can't receive a testContext argument via module.exports) can use
     * describe/it/expect/etc. as bare globals.
     */
    installGlobalTestContext(ctx) {
        this._globalKeys = ['describe', 'it', 'test', 'beforeEach', 'afterEach', 'expect', 'assert'];
        this._savedGlobals = {};
        for (const k of this._globalKeys) {
            this._savedGlobals[k] = globalThis[k];
            globalThis[k] = ctx[k];
        }
        this._currentCtx = ctx;
    }

    uninstallGlobalTestContext() {
        if (!this._globalKeys) return;
        for (const k of this._globalKeys) {
            if (this._savedGlobals[k] === undefined) {
                delete globalThis[k];
            } else {
                globalThis[k] = this._savedGlobals[k];
            }
        }
        this._globalKeys = null;
        this._savedGlobals = null;
        this._currentCtx = null;
    }

    /**
     * Create comprehensive expect matcher
     */
    createExpectMatcher() {
        // Deep-equality helper used by toEqual / toHaveBeenCalledWith /
        // asymmetric matcher recursion. Supports nested asymmetric matchers
        // so you can pass e.g. `expect.objectContaining({ headers: expect.any(Object) })`.
        const deepEqual = (a, b) => {
            if (b && typeof b.asymmetricMatch === 'function') return b.asymmetricMatch(a);
            if (a && typeof a.asymmetricMatch === 'function') return a.asymmetricMatch(b);
            if (Object.is(a, b)) return true;
            if (a === null || b === null) return false;
            if (typeof a !== 'object' || typeof b !== 'object') return false;
            if (Array.isArray(a) !== Array.isArray(b)) return false;
            if (Array.isArray(a)) {
                if (a.length !== b.length) return false;
                return a.every((v, i) => deepEqual(v, b[i]));
            }
            const aKeys = Object.keys(a);
            const bKeys = Object.keys(b);
            if (aKeys.length !== bKeys.length) return false;
            return aKeys.every(k => deepEqual(a[k], b[k]));
        };

        const fmt = (v) => {
            try { return JSON.stringify(v); } catch { return String(v); }
        };

        const expectFn = (actual) => {
            const expectObj = {
                toBe: (expected) => {
                    if (!Object.is(actual, expected)) {
                        throw new Error(`Expected ${actual} to be ${expected}`);
                    }
                    return expectObj;
                },
                
                toEqual: (expected) => {
                    if (!deepEqual(actual, expected)) {
                        throw new Error(`Expected ${fmt(actual)} to equal ${fmt(expected)}`);
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

                toBeNull: () => {
                    if (actual !== null) throw new Error(`Expected ${fmt(actual)} to be null`);
                    return expectObj;
                },

                toBeGreaterThanOrEqual: (expected) => {
                    if (!(actual >= expected)) {
                        throw new Error(`Expected ${actual} to be >= ${expected}`);
                    }
                    return expectObj;
                },

                toBeLessThanOrEqual: (expected) => {
                    if (!(actual <= expected)) {
                        throw new Error(`Expected ${actual} to be <= ${expected}`);
                    }
                    return expectObj;
                },

                toHaveBeenCalled: () => {
                    if (!actual || !actual.mock) throw new Error('Expected a jest.fn mock');
                    if (actual.mock.calls.length === 0) {
                        throw new Error('Expected mock to have been called');
                    }
                    return expectObj;
                },

                toHaveBeenCalledTimes: (n) => {
                    if (!actual || !actual.mock) throw new Error('Expected a jest.fn mock');
                    if (actual.mock.calls.length !== n) {
                        throw new Error(`Expected mock to have been called ${n} times, got ${actual.mock.calls.length}`);
                    }
                    return expectObj;
                },

                toHaveBeenCalledWith: (...expectedArgs) => {
                    if (!actual || !actual.mock) throw new Error('Expected a jest.fn mock');
                    const matched = actual.mock.calls.some(callArgs =>
                        callArgs.length === expectedArgs.length &&
                        callArgs.every((a, i) => deepEqual(a, expectedArgs[i]))
                    );
                    if (!matched) {
                        throw new Error(
                            `Expected mock to have been called with ${fmt(expectedArgs)}. ` +
                            `Actual calls: ${fmt(actual.mock.calls)}`
                        );
                    }
                    return expectObj;
                },

                toHaveProperty: (propPath, expectedValue) => {
                    const keys = Array.isArray(propPath) ? propPath : String(propPath).split('.');
                    let cur = actual;
                    for (const k of keys) {
                        if (cur === null || cur === undefined || !(k in cur)) {
                            throw new Error(`Expected ${fmt(actual)} to have property ${propPath}`);
                        }
                        cur = cur[k];
                    }
                    if (arguments.length >= 2 && !deepEqual(cur, expectedValue)) {
                        throw new Error(
                            `Expected property ${propPath} to equal ${fmt(expectedValue)}, got ${fmt(cur)}`
                        );
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
                    },
                    toHaveBeenCalled: () => {
                        if (!actual || !actual.mock) throw new Error('Expected a jest.fn mock');
                        if (actual.mock.calls.length > 0) {
                            throw new Error('Expected mock NOT to have been called');
                        }
                        return expectObj;
                    },
                    toHaveProperty: (propPath) => {
                        const keys = Array.isArray(propPath) ? propPath : String(propPath).split('.');
                        let cur = actual;
                        for (const k of keys) {
                            if (cur === null || cur === undefined || !(k in cur)) return expectObj;
                            cur = cur[k];
                        }
                        throw new Error(`Expected ${fmt(actual)} NOT to have property ${propPath}`);
                    }
                }
            };
            return expectObj;
        };

        // Add static methods to expect
        expectFn.any = (expectedType) => {
            return {
                asymmetricMatch: (actual) => {
                    if (expectedType === String) return typeof actual === 'string';
                    if (expectedType === Number) return typeof actual === 'number';
                    if (expectedType === Boolean) return typeof actual === 'boolean';
                    if (expectedType === Function) return typeof actual === 'function';
                    if (expectedType === Object) return typeof actual === 'object' && actual !== null;
                    if (expectedType === Array) return Array.isArray(actual);
                    return actual instanceof expectedType;
                },
                toString: () => `Any<${expectedType && expectedType.name || expectedType}>`
            };
        };

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
                    const match = (a, b) => {
                        if (b && typeof b.asymmetricMatch === 'function') return b.asymmetricMatch(a);
                        if (Object.is(a, b)) return true;
                        if (a === null || b === null) return false;
                        if (typeof a !== 'object' || typeof b !== 'object') return false;
                        if (Array.isArray(a) !== Array.isArray(b)) return false;
                        if (Array.isArray(a)) {
                            if (a.length !== b.length) return false;
                            return a.every((v, i) => match(v, b[i]));
                        }
                        return Object.keys(b).every(k => match(a[k], b[k]));
                    };
                    return Object.keys(expected).every(key => match(actual[key], expected[key]));
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