#!/usr/bin/env node

/**
 * MOJO Framework Test Diagnostics
 * Identifies which tests are defined but not executing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 MOJO Framework Test Diagnostics');
console.log('=====================================\n');

/**
 * Parse test files to extract all test definitions
 */
function parseTestDefinitions(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const tests = [];
    
    // Extract all 'it(' calls with their names
    const itRegex = /\s+it\(\s*['"](.*?)['"]\s*,/g;
    let match;
    
    while ((match = itRegex.exec(content)) !== null) {
        tests.push({
            name: match[1],
            line: content.substring(0, match.index).split('\n').length,
            file: path.basename(filePath)
        });
    }
    
    return tests;
}

/**
 * Extract test names from describe blocks
 */
function parseDescribeBlocks(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const describes = [];
    
    const describeRegex = /\s*describe\(\s*['"](.*?)['"]\s*,/g;
    let match;
    
    while ((match = describeRegex.exec(content)) !== null) {
        describes.push({
            name: match[1],
            line: content.substring(0, match.index).split('\n').length,
            file: path.basename(filePath)
        });
    }
    
    return describes;
}

/**
 * Run a test file and capture which tests actually execute
 */
function getExecutedTests() {
    // Create a mock test runner that tracks executed tests
    const mockRunnerCode = `
const executedTests = [];
const testHelpers = require('./test/utils/test-helpers');

// Mock the test context
const mockContext = {
    describe: (name, fn) => {
        console.log('DESCRIBE:' + name);
        try {
            return fn();
        } catch (error) {
            console.log('DESCRIBE_ERROR:' + name + ':' + error.message);
        }
    },
    it: (name, fn) => {
        console.log('TEST_EXECUTED:' + name);
        executedTests.push(name);
        return Promise.resolve();
    },
    expect: (actual) => ({
        toBe: () => true,
        toEqual: () => true,
        toMatch: () => true,
        toContain: () => true,
        toHaveLength: () => true,
        not: { toBe: () => true }
    }),
    assert: () => true
};

// Try to run the test files with mocked context
try {
    const viewTest = require('./test/unit/View.test.js');
    if (typeof viewTest === 'function') {
        viewTest(mockContext);
    }
} catch (error) {
    console.log('VIEW_TEST_ERROR:' + error.message);
}

try {
    const eventBusTest = require('./test/unit/EventBus.test.js');
    if (typeof eventBusTest === 'function') {
        eventBusTest(mockContext);
    }
} catch (error) {
    console.log('EVENTBUS_TEST_ERROR:' + error.message);
}
`;
    
    try {
        const output = execSync('node -e "' + mockRunnerCode.replace(/"/g, '\\"') + '"', {
            cwd: path.resolve(__dirname),
            encoding: 'utf8'
        });
        
        const executedTests = [];
        const describes = [];
        const errors = [];
        
        output.split('\n').forEach(line => {
            if (line.startsWith('TEST_EXECUTED:')) {
                executedTests.push(line.replace('TEST_EXECUTED:', ''));
            } else if (line.startsWith('DESCRIBE:')) {
                describes.push(line.replace('DESCRIBE:', ''));
            } else if (line.includes('_ERROR:')) {
                errors.push(line);
            }
        });
        
        return { executedTests, describes, errors };
    } catch (error) {
        return { executedTests: [], describes: [], errors: [error.message] };
    }
}

/**
 * Main diagnostic function
 */
function runDiagnostics() {
    const testDir = path.join(__dirname, 'test', 'unit');
    const testFiles = [
        path.join(testDir, 'View.test.js'),
        path.join(testDir, 'EventBus.test.js')
    ];
    
    console.log('📁 Scanning test files...');
    
    let allDefinedTests = [];
    let allDescribeBlocks = [];
    
    // Parse all test definitions
    testFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`   📄 ${path.basename(file)}`);
            const tests = parseTestDefinitions(file);
            const describes = parseDescribeBlocks(file);
            
            console.log(`      - ${describes.length} describe blocks`);
            console.log(`      - ${tests.length} test cases`);
            
            allDefinedTests = allDefinedTests.concat(tests);
            allDescribeBlocks = allDescribeBlocks.concat(describes);
        }
    });
    
    console.log(`\n📊 Total defined tests: ${allDefinedTests.length}`);
    console.log(`📊 Total describe blocks: ${allDescribeBlocks.length}\n`);
    
    // Get actually executed tests
    console.log('🏃 Analyzing test execution...');
    const { executedTests, describes, errors } = getExecutedTests();
    
    console.log(`   ✅ Executed tests: ${executedTests.length}`);
    console.log(`   📝 Executed describes: ${describes.length}`);
    console.log(`   ❌ Errors: ${errors.length}\n`);
    
    // Compare defined vs executed
    console.log('🔍 Comparing defined vs executed tests...\n');
    
    const notExecuted = allDefinedTests.filter(definedTest => 
        !executedTests.includes(definedTest.name)
    );
    
    if (notExecuted.length > 0) {
        console.log(`❌ ${notExecuted.length} tests not executed:`);
        console.log('─'.repeat(50));
        
        notExecuted.forEach((test, index) => {
            console.log(`${index + 1}. "${test.name}"`);
            console.log(`   📄 File: ${test.file}`);
            console.log(`   📍 Line: ~${test.line}`);
            console.log('');
        });
    } else {
        console.log('✅ All defined tests were executed!');
    }
    
    // Show any errors
    if (errors.length > 0) {
        console.log('🚨 Execution Errors:');
        console.log('─'.repeat(30));
        errors.forEach(error => {
            console.log(`   ${error}`);
        });
        console.log('');
    }
    
    // Show describe blocks that executed
    console.log('📝 Executed describe blocks:');
    console.log('─'.repeat(30));
    describes.forEach(desc => {
        console.log(`   ✓ ${desc}`);
    });
    
    console.log('\n🎯 Summary:');
    console.log(`   Total defined: ${allDefinedTests.length}`);
    console.log(`   Actually executed: ${executedTests.length}`);
    console.log(`   Not executed: ${notExecuted.length}`);
    console.log(`   Success rate: ${Math.round((executedTests.length / allDefinedTests.length) * 100)}%`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (notExecuted.length > 0) {
        console.log('   1. Check syntax errors in non-executing tests');
        console.log('   2. Verify test structure and async/await usage');
        console.log('   3. Check for missing dependencies or imports');
        console.log('   4. Look for tests that throw errors during setup');
    } else {
        console.log('   ✅ All tests are executing correctly!');
    }
    
    return {
        totalDefined: allDefinedTests.length,
        totalExecuted: executedTests.length,
        notExecuted: notExecuted.length,
        errors: errors.length
    };
}

// Run diagnostics if called directly
if (require.main === module) {
    try {
        const results = runDiagnostics();
        process.exit(results.notExecuted > 0 ? 1 : 0);
    } catch (error) {
        console.error('🚨 Diagnostic error:', error.message);
        process.exit(1);
    }
}

module.exports = { runDiagnostics, parseTestDefinitions, parseDescribeBlocks };