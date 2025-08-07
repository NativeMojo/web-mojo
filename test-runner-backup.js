#!/usr/bin/env node

/**
 * MOJO Framework Test Runner
 * Comprehensive test suite runner for all test types
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { performance } = require('perf_hooks');

class TestRunner {
    constructor(options = {}) {
        this.options = {
            verbose: false,
            bail: false,
            timeout: 30000,
            pattern: '**/*.test.js',
            reporter: 'spec',
            parallel: false,
            coverage: false,
            ...options
        };

        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            suites: []
        };

        this.testSuites = new Map();
        this.setupComplete = false;
    }

    /**
     * Initialize test runner and discover tests
     */
    async init() {
        console.log('🧪 MOJO Framework Test Runner');
        console.log('==============================\n');

        try {
            await this.setupEnvironment();
            await this.discoverTests();
            this.setupComplete = true;
        } catch (error) {
            console.error('❌ Test runner initialization failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Set up test environment
     */
    async setupEnvironment() {
        // Ensure required directories exist
        const testDirs = ['test', 'test/unit', 'test/integration', 'test/build', 'test/utils', 'test/fixtures'];
        for (const dir of testDirs) {
            const dirPath = path.join(process.cwd(), dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        }

        // Check for required dependencies
        const requiredDeps = ['jsdom', 'node-fetch'];
        const missingDeps = [];

        for (const dep of requiredDeps) {
            try {
                require(dep);
            } catch {
                missingDeps.push(dep);
            }
        }

        if (missingDeps.length > 0) {
            console.log('📦 Installing missing test dependencies...');
            await this.installDependencies(missingDeps);
        }

        // Set up DOM environment for tests
        this.setupDOMEnvironment();
    }

    /**
     * Set up DOM environment for browser-like testing
     */
    setupDOMEnvironment() {
        try {
            const { JSDOM } = require('jsdom');
            
            const dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <head><title>MOJO Test Environment</title></head>
                <body>
                    <div id="app"></div>
                    <div id="test-container"></div>
                </body>
                </html>
            `, { 
                url: "http://localhost:3000",
                pretendToBeVisual: true,
                resources: "usable"
            });

            global.window = dom.window;
            global.document = dom.window.document;
            global.HTMLElement = dom.window.HTMLElement;
            global.Event = dom.window.Event;
            global.CustomEvent = dom.window.CustomEvent;
            global.fetch = require('node-fetch');

            // Mock Mustache for testing
            global.Mustache = {
                render: (template, data) => {
                    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '');
                }
            };

        } catch (error) {
            console.warn('⚠️  Could not set up DOM environment:', error.message);
        }
    }

    /**
     * Install missing dependencies
     */
    async installDependencies(deps) {
        return new Promise((resolve, reject) => {
            const cmd = `npm install ${deps.join(' ')}`;
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Failed to install dependencies: ${error.message}`));
                } else {
                    console.log('✅ Dependencies installed successfully');
                    resolve();
                }
            });
        });
    }

    /**
     * Discover and categorize test files
     */
    async discoverTests() {
        const testTypes = {
            unit: path.join(process.cwd(), 'test/unit'),
            integration: path.join(process.cwd(), 'test/integration'),
            build: path.join(process.cwd(), 'test/build')
        };

        for (const [type, dir] of Object.entries(testTypes)) {
            const tests = await this.findTestFiles(dir);
            if (tests.length > 0) {
                this.testSuites.set(type, tests);
            }
        }

        // Check for legacy test files and suggest migration
        await this.checkLegacyTests();

        console.log(`📋 Discovered test suites:`);
        for (const [type, tests] of this.testSuites) {
            console.log(`   ${type}: ${tests.length} test files`);
        }
        console.log('');
    }

    /**
     * Find test files in directory
     */
    async findTestFiles(dir) {
        const testFiles = [];

        if (!fs.existsSync(dir)) {
            return testFiles;
        }

        const files = fs.readdirSync(dir, { withFileTypes: true });

        for (const file of files) {
            const fullPath = path.join(dir, file.name);

            if (file.isDirectory()) {
                const subTests = await this.findTestFiles(fullPath);
                testFiles.push(...subTests);
            } else if (file.name.endsWith('.test.js') || file.name.endsWith('.spec.js')) {
                testFiles.push(fullPath);
            }
        }

        return testFiles;
    }

    /**
     * Check for legacy test files and suggest migration
     */
    async checkLegacyTests() {
        const legacyTests = [
            'test-mojo.js',
            'simple-test.js', 
            'verify-build.js'
        ];

        const foundLegacy = [];
        for (const testFile of legacyTests) {
            const testPath = path.join(process.cwd(), testFile);
            if (fs.existsSync(testPath)) {
                foundLegacy.push(testFile);
            }
        }

        if (foundLegacy.length > 0) {
            console.log('📦 Found legacy test files:');
            foundLegacy.forEach(file => console.log(`   ${file}`));
            console.log('   Consider migrating these to the test/ directory\n');
        }
    }

    /**
     * Run all test suites
     */
    async run(suiteFilter = null) {
        if (!this.setupComplete) {
            await this.init();
        }

        const startTime = performance.now();

        console.log('🚀 Running test suites...\n');

        // Run each test suite
        for (const [suiteType, testFiles] of this.testSuites) {
            if (suiteFilter && suiteFilter !== suiteType) {
                continue;
            }

            await this.runTestSuite(suiteType, testFiles);
        }

        this.stats.duration = performance.now() - startTime;

        // Generate report
        this.generateReport();

        // Exit with appropriate code
        process.exit(this.stats.failed > 0 ? 1 : 0);
    }

    /**
     * Run a specific test suite
     */
    async runTestSuite(suiteType, testFiles) {
        console.log(`📋 Running ${suiteType} tests...`);
        console.log('─'.repeat(40));

        const suiteStats = {
            type: suiteType,
            total: 0,
            passed: 0,
            failed: 0,
            duration: 0,
            tests: []
        };

        const suiteStartTime = performance.now();

        for (const testFile of testFiles) {
            try {
                const testResult = await this.runTestFile(testFile);
                suiteStats.tests.push(testResult);
                suiteStats.total += testResult.total;
                suiteStats.passed += testResult.passed;
                suiteStats.failed += testResult.failed;
            } catch (error) {
                console.error(`❌ Error running test file ${path.basename(testFile)}: ${error.message}`);
                suiteStats.failed++;
                suiteStats.total++;
            }

            if (this.options.bail && suiteStats.failed > 0) {
                break;
            }
        }

        suiteStats.duration = performance.now() - suiteStartTime;
        this.stats.suites.push(suiteStats);
        
        // Update overall stats
        this.stats.total += suiteStats.total;
        this.stats.passed += suiteStats.passed;
        this.stats.failed += suiteStats.failed;

        console.log(`✅ ${suiteType} tests: ${suiteStats.passed}/${suiteStats.total} passed (${suiteStats.duration.toFixed(2)}ms)\n`);
    }

    /**
     * Run a single test file
     */
    async runTestFile(testFile) {
        const fileName = path.basename(testFile);
        const testResult = {
            file: fileName,
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };

        try {
            // Clear require cache to ensure fresh test runs
            delete require.cache[testFile];
            
            // Create isolated test context
            const testContext = this.createTestContext();
            
            // Load and run test file
            const testModule = require(testFile);
            
            if (typeof testModule === 'function') {
                await testModule(testContext);
            } else if (testModule.default && typeof testModule.default === 'function') {
                await testModule.default(testContext);
            }

            // Collect results from context
            testResult.total = testContext.stats.total;
            testResult.passed = testContext.stats.passed;
            testResult.failed = testContext.stats.failed;
            testResult.errors = testContext.stats.errors;

        } catch (error) {
            testResult.failed = 1;
            testResult.total = 1;
            testResult.errors.push({
                test: fileName,
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
            errors: []
        };

        const context = {
            stats,
            
            describe: (name, fn) => {
                console.log(`  📝 ${name}`);
                return fn();
            },

            it: async (name, fn) => {
                try {
                    stats.total++;
                    await fn();
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
            },

            test: function(name, fn) {
                return this.it(name, fn);
            },

            expect: (() => {
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
                            toBeInstanceOf: (expected) => {
                                if (actual instanceof expected) {
                                    throw new Error(`Expected ${actual} not to be instance of ${expected.name}`);
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
                            if (!actual || typeof actual !== 'object') {
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

                return expectFn;
            })(),
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

            expectFn.any = (constructor) => {
                return {
                    asymmetricMatch: (actual) => {
                        return actual instanceof constructor;
                    },
                    toString: () => `Any<${constructor.name}>`
                };
            };

            return expectFn;
            })(),

            assert: (condition, message) => {
                if (!condition) {
                    throw new Error(message || 'Assertion failed');
                }
            },

            // Global test utilities
            window: global.window,
            document: global.document,
            fetch: global.fetch,
            Mustache: global.Mustache
        };

        return context;
    }

    /**
     * Generate and display test report
     */
    generateReport() {
        console.log('🏁 Test Results Summary');
        console.log('========================');
        console.log(`Total Tests: ${this.stats.total}`);
        console.log(`✅ Passed: ${this.stats.passed}`);
        console.log(`❌ Failed: ${this.stats.failed}`);
        console.log(`⏱️  Duration: ${this.stats.duration.toFixed(2)}ms`);
        
        if (this.stats.total > 0) {
            const successRate = ((this.stats.passed / this.stats.total) * 100).toFixed(1);
            console.log(`🎯 Success Rate: ${successRate}%`);
        }

        console.log('\n📊 Test Suite Breakdown:');
        for (const suite of this.stats.suites) {
            const rate = suite.total > 0 ? ((suite.passed / suite.total) * 100).toFixed(1) : '0.0';
            console.log(`   ${suite.type}: ${suite.passed}/${suite.total} (${rate}%)`);
        }

        if (this.stats.failed > 0) {
            console.log('\n❌ Failed Tests:');
            for (const suite of this.stats.suites) {
                for (const test of suite.tests) {
                    for (const error of test.errors) {
                        console.log(`   • ${error.test}: ${error.message}`);
                    }
                }
            }
        }

        console.log('\n' + (this.stats.failed === 0 ? 
            '🎉 All tests passed!' : 
            `⚠️  ${this.stats.failed} test(s) failed.`
        ));
    }

    /**
     * Run specific test suite by name
     */
    async runSuite(suiteName) {
        return this.run(suiteName);
    }

    /**
     * Run tests with coverage (if available)
     */
    async runWithCoverage() {
        console.log('📊 Running tests with coverage analysis...');
        this.options.coverage = true;
        return this.run();
    }

    /**
     * Migrate legacy test files to new structure
     */
    async migrateLegacyTests() {
        console.log('🔄 Migrating legacy test files...');
        
        const migrations = [
            { from: 'simple-test.js', to: 'test/build/build.test.js', type: 'build' },
            { from: 'verify-build.js', to: 'test/build/verification.test.js', type: 'build' },
            { from: 'test-mojo.js', to: 'test/unit/framework.test.js', type: 'unit' }
        ];

        for (const migration of migrations) {
            const fromPath = path.join(process.cwd(), migration.from);
            const toPath = path.join(process.cwd(), migration.to);

            if (fs.existsSync(fromPath)) {
                // Ensure target directory exists
                const targetDir = path.dirname(toPath);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                // Copy file content and wrap in test format
                const content = fs.readFileSync(fromPath, 'utf8');
                const wrappedContent = this.wrapLegacyTest(content, migration.type);
                
                fs.writeFileSync(toPath, wrappedContent);
                console.log(`   ✅ Migrated ${migration.from} → ${migration.to}`);
            }
        }

        console.log('🎉 Migration complete!');
    }

    /**
     * Wrap legacy test in new format
     */
    wrapLegacyTest(content, type) {
        return `// Migrated ${type} test
module.exports = async function(testContext) {
    const { describe, it, expect, assert } = testContext;
    
    describe('${type.charAt(0).toUpperCase() + type.slice(1)} Tests', () => {
        // Legacy test code wrapped in modern format
        ${content.replace(/console\.log/g, '// console.log')}
    });
};`;
    }
}

// CLI functionality
async function main() {
    const args = process.argv.slice(2);
    const options = {};

    // Parse command line arguments
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
            case '--coverage':
            case '-c':
                options.coverage = true;
                break;
            case '--help':
            case '-h':
                showHelp();
                return;
            case '--migrate':
                const runner = new TestRunner(options);
                await runner.migrateLegacyTests();
                return;
            case '--suite':
            case '-s':
                options.suite = args[++i];
                break;
        }
    }

    // Create and run test runner
    const runner = new TestRunner(options);
    
    if (options.suite) {
        await runner.runSuite(options.suite);
    } else if (options.coverage) {
        await runner.runWithCoverage();
    } else {
        await runner.run();
    }
}

function showHelp() {
    console.log(`
MOJO Framework Test Runner

Usage: node test/test-runner.js [options]

Options:
  --verbose, -v      Verbose output
  --bail, -b         Stop on first failure  
  --coverage, -c     Run with coverage
  --suite, -s <name> Run specific test suite (unit|integration|build)
  --migrate          Migrate legacy test files
  --help, -h         Show this help

Examples:
  node test/test-runner.js                    # Run all tests
  node test/test-runner.js --suite unit       # Run only unit tests
  node test/test-runner.js --verbose --bail   # Verbose output, stop on failure
  node test/test-runner.js --migrate          # Migrate legacy tests
`);
}

// Export for programmatic use
module.exports = TestRunner;

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Test runner error:', error);
        process.exit(1);
    });
}