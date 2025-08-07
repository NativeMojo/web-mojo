#!/usr/bin/env node

/**
 * MOJO Framework Missing Test Finder
 * Identifies which tests are defined but not executing
 */

const fs = require('fs');
const path = require('path');

class MissingTestFinder {
    constructor() {
        this.definedTests = [];
        this.executedTests = [];
        this.testContext = this.createMockContext();
    }

    async analyze() {
        console.log('🔍 MOJO Missing Test Analyzer');
        console.log('==============================\n');

        // Step 1: Parse all test definitions
        await this.parseTestDefinitions();
        
        // Step 2: Run tests and track execution
        await this.trackTestExecution();
        
        // Step 3: Compare and report
        this.generateReport();
    }

    /**
     * Parse test files to find all test definitions
     */
    async parseTestDefinitions() {
        console.log('📄 Parsing test definitions...');
        
        const testFiles = [
            'test/unit/EventBus.test.js',
            'test/unit/View.test.js'
        ];

        for (const filePath of testFiles) {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const fileName = path.basename(filePath);
                
                // Find all describe blocks first to get context
                const describes = this.extractDescribeBlocks(content);
                
                // Find all it() calls with their context
                const tests = this.extractTestCases(content, describes);
                
                tests.forEach(test => {
                    this.definedTests.push({
                        name: test.name,
                        file: fileName,
                        context: test.context,
                        line: test.line,
                        fullName: `${test.context} > ${test.name}`
                    });
                });
                
                console.log(`   ✓ ${fileName}: ${tests.length} tests found`);
            }
        }
        
        console.log(`\n📊 Total defined tests: ${this.definedTests.length}\n`);
    }

    /**
     * Extract describe blocks for context
     */
    extractDescribeBlocks(content) {
        const describes = [];
        const describeRegex = /describe\(\s*['"](.*?)['"],?\s*\(\)\s*=>\s*\{/g;
        let match;
        
        while ((match = describeRegex.exec(content)) !== null) {
            const line = content.substring(0, match.index).split('\n').length;
            describes.push({
                name: match[1],
                line: line,
                index: match.index
            });
        }
        
        return describes;
    }

    /**
     * Extract test cases with their describe context
     */
    extractTestCases(content, describes) {
        const tests = [];
        const itRegex = /it\(\s*['"](.*?)['"],?\s*(?:async\s*)?\(.*?\)\s*=>\s*\{/g;
        let match;
        
        while ((match = itRegex.exec(content)) !== null) {
            const line = content.substring(0, match.index).split('\n').length;
            
            // Find the closest describe block before this test
            let context = 'Unknown';
            let closestDescribe = null;
            
            for (const desc of describes) {
                if (desc.index < match.index) {
                    if (!closestDescribe || desc.index > closestDescribe.index) {
                        closestDescribe = desc;
                    }
                }
            }
            
            if (closestDescribe) {
                context = closestDescribe.name;
            }
            
            tests.push({
                name: match[1],
                context: context,
                line: line
            });
        }
        
        return tests;
    }

    /**
     * Track which tests actually execute
     */
    async trackTestExecution() {
        console.log('🏃 Tracking test execution...');
        
        // Set up test environment
        const { testHelpers } = require('./test/utils/test-helpers');
        await testHelpers.setup();
        
        const { setupModules } = require('./test/utils/simple-module-loader');
        setupModules();
        
        // Run each test file and track execution
        const testFiles = [
            { path: './test/unit/EventBus.test.js', name: 'EventBus.test.js' },
            { path: './test/unit/View.test.js', name: 'View.test.js' }
        ];
        
        for (const testFile of testFiles) {
            console.log(`   📋 Running ${testFile.name}...`);
            await this.runTestFile(testFile.path, testFile.name);
        }
        
        console.log(`\n📊 Total executed tests: ${this.executedTests.length}\n`);
    }

    /**
     * Run a test file and track execution
     */
    async runTestFile(filePath, fileName) {
        try {
            delete require.cache[require.resolve(filePath)];
            const testModule = require(filePath);
            
            if (typeof testModule === 'function') {
                const context = this.createTrackingContext(fileName);
                await testModule(context);
            }
        } catch (error) {
            console.log(`   ❌ Error in ${fileName}: ${error.message}`);
        }
    }

    /**
     * Create test context that tracks execution
     */
    createTrackingContext(fileName) {
        let currentDescribe = 'Unknown';
        
        return {
            describe: (name, fn) => {
                const previousDescribe = currentDescribe;
                currentDescribe = name;
                
                try {
                    fn();
                } catch (error) {
                    console.log(`   ⚠️  Describe block error in ${name}: ${error.message}`);
                }
                
                currentDescribe = previousDescribe;
            },
            
            it: async (name, fn) => {
                // Track that this test was executed
                this.executedTests.push({
                    name: name,
                    file: fileName,
                    context: currentDescribe,
                    fullName: `${currentDescribe} > ${name}`
                });
                
                // Don't actually run the test to avoid errors/timeouts
                // We just want to track which ones are called
                return Promise.resolve();
            },
            
            expect: this.createMockExpect(),
            assert: () => true
        };
    }

    /**
     * Create mock context for parsing
     */
    createMockContext() {
        return {
            describe: () => {},
            it: () => {},
            expect: this.createMockExpect(),
            assert: () => true
        };
    }

    /**
     * Create mock expect function
     */
    createMockExpect() {
        const mockExpectObj = {
            toBe: () => mockExpectObj,
            toEqual: () => mockExpectObj,
            toBeTruthy: () => mockExpectObj,
            toBeFalsy: () => mockExpectObj,
            toThrow: () => mockExpectObj,
            toContain: () => mockExpectObj,
            toHaveLength: () => mockExpectObj,
            toMatch: () => mockExpectObj
        };
        
        // Add the not property after object is created to avoid circular reference
        mockExpectObj.not = mockExpectObj;
        
        const expectFn = () => mockExpectObj;
        expectFn.arrayContaining = () => ({ asymmetricMatch: () => true });
        expectFn.objectContaining = () => ({ asymmetricMatch: () => true });
        
        return expectFn;
    }

    /**
     * Generate report of missing tests
     */
    generateReport() {
        console.log('📊 Analysis Results');
        console.log('===================\n');
        
        console.log(`📋 Summary:`);
        console.log(`   Total Defined: ${this.definedTests.length}`);
        console.log(`   Total Executed: ${this.executedTests.length}`);
        console.log(`   Missing: ${this.definedTests.length - this.executedTests.length}`);
        
        if (this.executedTests.length === this.definedTests.length) {
            console.log('\n🎉 All tests are executing!');
            return;
        }
        
        // Find missing tests
        const missingTests = this.definedTests.filter(defined => {
            return !this.executedTests.some(executed => 
                executed.name === defined.name && 
                executed.context === defined.context &&
                executed.file === defined.file
            );
        });
        
        if (missingTests.length > 0) {
            console.log(`\n❌ ${missingTests.length} Tests Not Executing:`);
            console.log('─'.repeat(60));
            
            // Group by file for better readability
            const missingByFile = {};
            missingTests.forEach(test => {
                if (!missingByFile[test.file]) {
                    missingByFile[test.file] = [];
                }
                missingByFile[test.file].push(test);
            });
            
            Object.keys(missingByFile).forEach(file => {
                console.log(`\n📄 ${file}:`);
                missingByFile[file].forEach((test, index) => {
                    console.log(`   ${index + 1}. "${test.name}"`);
                    console.log(`      📍 Context: ${test.context}`);
                    console.log(`      📍 Line: ~${test.line}`);
                    console.log('');
                });
            });
        }
        
        // Show successfully executing tests by file
        console.log(`\n✅ Successfully Executing Tests by File:`);
        console.log('─'.repeat(40));
        
        const executedByFile = {};
        this.executedTests.forEach(test => {
            if (!executedByFile[test.file]) {
                executedByFile[test.file] = 0;
            }
            executedByFile[test.file]++;
        });
        
        const definedByFile = {};
        this.definedTests.forEach(test => {
            if (!definedByFile[test.file]) {
                definedByFile[test.file] = 0;
            }
            definedByFile[test.file]++;
        });
        
        Object.keys(definedByFile).forEach(file => {
            const executed = executedByFile[file] || 0;
            const defined = definedByFile[file];
            const percentage = ((executed / defined) * 100).toFixed(1);
            
            console.log(`   ${file}: ${executed}/${defined} (${percentage}%)`);
        });
        
        console.log('\n💡 Recommendations:');
        if (missingTests.length > 0) {
            console.log('   1. Check for syntax errors in non-executing tests');
            console.log('   2. Look for async/await issues in describe blocks');
            console.log('   3. Verify test structure and nesting');
            console.log('   4. Check for exceptions thrown during test setup');
            console.log('   5. Look for infinite loops or hanging operations');
        } else {
            console.log('   🎉 All tests are executing correctly!');
        }
        
        console.log(`\n🎯 Current Success Rate: ${((this.executedTests.length / this.definedTests.length) * 100).toFixed(1)}%`);
    }
}

// Run the analyzer if called directly
if (require.main === module) {
    const finder = new MissingTestFinder();
    finder.analyze().catch(error => {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    });
}

module.exports = MissingTestFinder;