/**
 * MOJO Framework Test Configuration
 * Central configuration for all test environments and settings
 */

const path = require('path');
const fs = require('fs');

class TestConfig {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.testRoot = __dirname;
        this.sourceRoot = path.join(this.projectRoot, 'src');
        this.distRoot = path.join(this.projectRoot, 'dist');
        
        this.config = this.buildConfig();
    }

    buildConfig() {
        return {
            // Environment settings
            environment: {
                node: process.version,
                platform: process.platform,
                arch: process.arch,
                testEnv: process.env.NODE_ENV || 'test'
            },

            // Paths
            paths: {
                root: this.projectRoot,
                test: this.testRoot,
                source: this.sourceRoot,
                dist: this.distRoot,
                fixtures: path.join(this.testRoot, 'fixtures'),
                utils: path.join(this.testRoot, 'utils'),
                unit: path.join(this.testRoot, 'unit'),
                integration: path.join(this.testRoot, 'integration'),
                build: path.join(this.testRoot, 'build'),
                coverage: path.join(this.projectRoot, 'coverage')
            },

            // Test runner settings
            runner: {
                timeout: 30000, // 30 seconds default timeout
                retries: 2, // Retry failed tests 2 times
                bail: false, // Continue running tests after failure
                parallel: false, // Run tests sequentially by default
                verbose: process.env.TEST_VERBOSE === 'true',
                debug: process.env.TEST_DEBUG === 'true'
            },

            // Test suites configuration
            suites: {
                unit: {
                    pattern: '**/*.test.js',
                    timeout: 10000,
                    setup: 'setupUnit',
                    teardown: 'teardownUnit'
                },
                integration: {
                    pattern: '**/*.test.js',
                    timeout: 30000,
                    setup: 'setupIntegration',
                    teardown: 'teardownIntegration'
                },
                build: {
                    pattern: '**/*.test.js',
                    timeout: 60000,
                    setup: 'setupBuild',
                    teardown: 'teardownBuild'
                }
            },

            // Mock configurations
            mocks: {
                enabled: true,
                autoMock: false,
                clearMocks: true,
                restoreAfterEach: true,
                
                // DOM mocking
                dom: {
                    enabled: true,
                    url: 'http://localhost:3000',
                    pretendToBeVisual: true,
                    resources: 'usable'
                },

                // API mocking
                api: {
                    baseURL: 'http://localhost:3000/api',
                    timeout: 5000,
                    defaultResponses: true
                },

                // External libraries
                libraries: {
                    mustache: true,
                    fetch: true,
                    chartjs: false // Only mock if needed
                }
            },

            // Coverage settings
            coverage: {
                enabled: process.env.COVERAGE === 'true',
                threshold: {
                    statements: 80,
                    branches: 75,
                    functions: 80,
                    lines: 80
                },
                include: [
                    'src/**/*.js'
                ],
                exclude: [
                    'src/**/*.test.js',
                    'src/**/*.spec.js',
                    'test/**/*',
                    'node_modules/**/*',
                    'dist/**/*'
                ],
                reporters: ['text', 'html', 'json'],
                outputDir: path.join(this.projectRoot, 'coverage')
            },

            // Reporting
            reporting: {
                format: process.env.TEST_REPORTER || 'spec',
                outputDir: path.join(this.testRoot, 'reports'),
                formats: {
                    spec: {
                        colors: true,
                        verbose: false
                    },
                    json: {
                        outputFile: 'test-results.json'
                    },
                    junit: {
                        outputFile: 'junit.xml',
                        suiteName: 'MOJO Framework Tests'
                    },
                    html: {
                        outputFile: 'test-report.html',
                        title: 'MOJO Framework Test Report'
                    }
                }
            },

            // Performance testing
            performance: {
                enabled: process.env.PERF_TESTS === 'true',
                thresholds: {
                    renderTime: 100, // ms
                    mountTime: 50,   // ms
                    updateTime: 25,  // ms
                    destroyTime: 10  // ms
                },
                samples: 10, // Number of samples for performance tests
                warmup: 3    // Warmup runs before measuring
            },

            // Test data
            testData: {
                fixtures: {
                    users: 'sample-data.json',
                    posts: 'sample-data.json',
                    forms: 'sample-data.json'
                },
                generators: {
                    user: {
                        name: () => `Test User ${Math.floor(Math.random() * 1000)}`,
                        email: () => `test${Math.floor(Math.random() * 10000)}@example.com`,
                        id: () => Math.floor(Math.random() * 100000)
                    },
                    view: {
                        id: () => `test-view-${Math.random().toString(36).substr(2, 9)}`,
                        className: () => `test-class-${Math.floor(Math.random() * 100)}`
                    }
                }
            },

            // Assertions
            assertions: {
                strict: true,
                deepEqual: true,
                customMatchers: true
            },

            // Cleanup
            cleanup: {
                afterEach: true,
                afterAll: true,
                dom: true,
                timers: true,
                mocks: true,
                memory: true
            },

            // Framework-specific settings
            mojo: {
                loadSource: true,
                mockDependencies: true,
                autoSetup: true,
                defaultContainer: '#test-container',
                
                // Core components to load
                components: {
                    eventBus: 'src/utils/EventBus.js',
                    view: 'src/core/View.js',
                    page: 'src/core/Page.js',
                    mojo: 'src/mojo.js'
                },

                // Default options for test instances
                defaults: {
                    view: {
                        template: '<div class="test-view">{{content}}</div>',
                        data: { content: 'Test Content' }
                    },
                    page: {
                        pageName: 'test-page',
                        route: '/test',
                        template: '<div class="test-page">Test Page</div>'
                    }
                }
            },

            // Development and debugging
            development: {
                watchMode: process.env.TEST_WATCH === 'true',
                debugPort: 9229,
                sourceMaps: true,
                verbose: process.env.NODE_ENV !== 'production'
            }
        };
    }

    /**
     * Get configuration value by dot notation path
     * @param {string} path - Configuration path (e.g., 'mocks.dom.enabled')
     * @param {*} defaultValue - Default value if path not found
     * @returns {*} Configuration value
     */
    get(path, defaultValue = undefined) {
        const keys = path.split('.');
        let current = this.config;
        
        for (const key of keys) {
            if (current[key] === undefined) {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current;
    }

    /**
     * Set configuration value by dot notation path
     * @param {string} path - Configuration path
     * @param {*} value - Value to set
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this.config;
        
        for (const key of keys) {
            if (current[key] === undefined) {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[lastKey] = value;
    }

    /**
     * Check if a file exists
     * @param {string} filePath - File path to check
     * @returns {boolean} True if file exists
     */
    fileExists(filePath) {
        return fs.existsSync(path.resolve(this.projectRoot, filePath));
    }

    /**
     * Get fixture data
     * @param {string} fixtureName - Name of the fixture
     * @returns {object|null} Fixture data or null
     */
    getFixture(fixtureName) {
        const fixturePath = path.join(this.config.paths.fixtures, `${fixtureName}.json`);
        
        if (!fs.existsSync(fixturePath)) {
            return null;
        }
        
        try {
            const data = fs.readFileSync(fixturePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error loading fixture ${fixtureName}:`, error);
            return null;
        }
    }

    /**
     * Create test environment settings
     * @returns {object} Environment variables for testing
     */
    getEnvironmentVars() {
        return {
            NODE_ENV: 'test',
            MOJO_ENV: 'test',
            TEST_MODE: 'true',
            DISABLE_CONSOLE_LOGS: this.get('runner.verbose') ? 'false' : 'true',
            MOCK_APIS: 'true',
            TEST_TIMEOUT: this.get('runner.timeout').toString(),
            COVERAGE: this.get('coverage.enabled').toString()
        };
    }

    /**
     * Get test suite configuration
     * @param {string} suiteName - Name of the test suite
     * @returns {object} Suite configuration
     */
    getSuiteConfig(suiteName) {
        const suiteConfig = this.get(`suites.${suiteName}`);
        if (!suiteConfig) {
            throw new Error(`Test suite '${suiteName}' not found in configuration`);
        }
        
        return {
            ...suiteConfig,
            path: path.join(this.get('paths.test'), suiteName)
        };
    }

    /**
     * Validate configuration
     * @returns {boolean} True if configuration is valid
     */
    validate() {
        const requiredPaths = [
            'paths.root',
            'paths.test', 
            'paths.source',
            'runner.timeout',
            'suites.unit',
            'suites.integration',
            'suites.build'
        ];

        for (const path of requiredPaths) {
            if (this.get(path) === undefined) {
                console.error(`Missing required configuration: ${path}`);
                return false;
            }
        }

        // Check required directories exist
        const requiredDirs = [
            this.get('paths.root'),
            this.get('paths.test'),
            this.get('paths.source')
        ];

        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                console.error(`Required directory does not exist: ${dir}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Create directory if it doesn't exist
     * @param {string} dirPath - Directory path
     */
    ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Set up test directories
     */
    setupDirectories() {
        const dirs = [
            this.get('paths.fixtures'),
            this.get('paths.utils'),
            this.get('coverage.outputDir'),
            this.get('reporting.outputDir')
        ];

        dirs.forEach(dir => this.ensureDir(dir));
    }

    /**
     * Get full configuration object
     * @returns {object} Complete configuration
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Export configuration for external tools
     * @param {string} format - Export format ('json', 'env')
     * @returns {string|object} Exported configuration
     */
    export(format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(this.config, null, 2);
                
            case 'env':
                const envVars = this.getEnvironmentVars();
                return Object.entries(envVars)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('\n');
                    
            default:
                return this.config;
        }
    }
}

// Create singleton instance
const testConfig = new TestConfig();

// Validate configuration on load
if (!testConfig.validate()) {
    console.error('Test configuration validation failed');
    process.exit(1);
}

// Set up required directories
testConfig.setupDirectories();

// Export singleton and class
module.exports = {
    TestConfig,
    testConfig,
    
    // Convenience exports
    get: (...args) => testConfig.get(...args),
    set: (...args) => testConfig.set(...args),
    getFixture: (...args) => testConfig.getFixture(...args),
    getSuiteConfig: (...args) => testConfig.getSuiteConfig(...args),
    getEnvironmentVars: (...args) => testConfig.getEnvironmentVars(...args)
};