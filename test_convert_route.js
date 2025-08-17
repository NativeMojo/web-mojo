#!/usr/bin/env node

// Test script for Router.convertRoute method
// Tests universal route conversion between different formats

console.log('🧪 Testing Router.convertRoute Universal Converter\n');

// Mock Router class with just the convertRoute method
class TestRouter {
  constructor(mode = 'history', basePath = '') {
    this.mode = mode;
    this.basePath = basePath;
  }

  convertRoute(route) {
    if (!route) {
      return this.mode === 'params' ? '?page=home' : '/';
    }
    
    let cleanPath = '';
    
    // Parse input route to extract the actual path
    if (route.includes('?page=')) {
      // Input: "?page=admin" or "/?page=admin" 
      const match = route.match(/\?page=([^&]+)/);
      if (match) {
        cleanPath = '/' + decodeURIComponent(match[1]);
      }
    } else if (route.startsWith('http')) {
      // Input: "http://localhost:3000/admin" or "http://localhost:3000/?page=admin"
      try {
        const url = new URL(route);
        if (url.searchParams.has('page')) {
          cleanPath = '/' + url.searchParams.get('page');
        } else {
          cleanPath = url.pathname.replace(this.basePath, '') || '/';
        }
      } catch {
        cleanPath = '/';
      }
    } else {
      // Input: "/admin" or "admin"
      cleanPath = route.startsWith('/') ? route : `/${route}`;
    }
    
    // Normalize path
    if (cleanPath !== '/' && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }
    
    // Convert to current mode format
    if (this.mode === 'params') {
      // Return ?page=path format for params mode
      const pageValue = cleanPath === '/' ? 'home' : cleanPath.substring(1);
      return `?page=${pageValue}`;
    } else {
      // Return /path format for history mode
      return cleanPath;
    }
  }
}

// Test cases
const testCases = [
  // Basic path formats
  { input: '/admin', paramsExpected: '?page=admin', historyExpected: '/admin' },
  { input: 'admin', paramsExpected: '?page=admin', historyExpected: '/admin' },
  { input: '/', paramsExpected: '?page=home', historyExpected: '/' },
  { input: '/dashboard/settings', paramsExpected: '?page=dashboard/settings', historyExpected: '/dashboard/settings' },
  
  // Query parameter formats
  { input: '?page=admin', paramsExpected: '?page=admin', historyExpected: '/admin' },
  { input: '/?page=dashboard', paramsExpected: '?page=dashboard', historyExpected: '/dashboard' },
  { input: '?page=users/123', paramsExpected: '?page=users/123', historyExpected: '/users/123' },
  
  // Full URLs - params format
  { input: 'http://localhost:3000/?page=admin', paramsExpected: '?page=admin', historyExpected: '/admin' },
  { input: 'http://localhost:3000/app/?page=settings', paramsExpected: '?page=settings', historyExpected: '/settings' },
  
  // Full URLs - history format
  { input: 'http://localhost:3000/admin', paramsExpected: '?page=admin', historyExpected: '/admin' },
  { input: 'http://localhost:3000/app/dashboard', paramsExpected: '?page=app/dashboard', historyExpected: '/app/dashboard' },
  
  // Edge cases
  { input: '', paramsExpected: '?page=home', historyExpected: '/' },
  { input: null, paramsExpected: '?page=home', historyExpected: '/' },
  { input: undefined, paramsExpected: '?page=home', historyExpected: '/' },
  { input: '/admin/', paramsExpected: '?page=admin', historyExpected: '/admin' }, // trailing slash
  { input: '?page=admin%2Fsettings', paramsExpected: '?page=admin/settings', historyExpected: '/admin/settings' }, // URL encoded
];

// Test function
function runTests() {
  let totalTests = 0;
  let passedTests = 0;
  
  console.log('📋 Testing Params Mode Conversion:\n');
  
  const paramsRouter = new TestRouter('params');
  
  testCases.forEach((testCase, index) => {
    totalTests++;
    const result = paramsRouter.convertRoute(testCase.input);
    const passed = result === testCase.paramsExpected;
    
    const emoji = passed ? '✅' : '❌';
    console.log(`${emoji} Test ${index + 1}: "${testCase.input}" -> "${result}" (expected "${testCase.paramsExpected}")`);
    
    if (passed) passedTests++;
    else console.log(`   ⚠️  FAILED: Got "${result}", expected "${testCase.paramsExpected}"`);
  });
  
  console.log('\n📋 Testing History Mode Conversion:\n');
  
  const historyRouter = new TestRouter('history');
  
  testCases.forEach((testCase, index) => {
    totalTests++;
    const result = historyRouter.convertRoute(testCase.input);
    const passed = result === testCase.historyExpected;
    
    const emoji = passed ? '✅' : '❌';
    console.log(`${emoji} Test ${index + 1}: "${testCase.input}" -> "${result}" (expected "${testCase.historyExpected}")`);
    
    if (passed) passedTests++;
    else console.log(`   ⚠️  FAILED: Got "${result}", expected "${testCase.historyExpected}"`);
  });
  
  // Test with base path
  console.log('\n📋 Testing with Base Path:\n');
  
  const basePathRouter = new TestRouter('history', '/app');
  
  const basePathTests = [
    { input: 'http://localhost:3000/app/admin', expected: '/admin' },
    { input: 'http://localhost:3000/app/', expected: '/' },
    { input: '/admin', expected: '/admin' } // should not change
  ];
  
  basePathTests.forEach((test, index) => {
    totalTests++;
    const result = basePathRouter.convertRoute(test.input);
    const passed = result === test.expected;
    
    const emoji = passed ? '✅' : '❌';
    console.log(`${emoji} BasePath Test ${index + 1}: "${test.input}" -> "${result}" (expected "${test.expected}")`);
    
    if (passed) passedTests++;
    else console.log(`   ⚠️  FAILED: Got "${result}", expected "${test.expected}"`);
  });
  
  // Results
  console.log('\n📊 Test Results Summary:');
  console.log('=' + '='.repeat(49));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All convertRoute tests passed! Universal conversion is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the implementation.');
  }
  
  // Usage examples
  console.log('\n💡 Usage Examples:');
  console.log('```javascript');
  console.log('// Params mode router');
  console.log('router.mode = "params";');
  console.log('router.convertRoute("/admin");          // -> "?page=admin"');
  console.log('router.convertRoute("?page=settings");  // -> "?page=settings"');
  console.log('router.convertRoute("dashboard");       // -> "?page=dashboard"');
  console.log('');
  console.log('// History mode router');
  console.log('router.mode = "history";');
  console.log('router.convertRoute("?page=admin");     // -> "/admin"');
  console.log('router.convertRoute("/settings");       // -> "/settings"');
  console.log('router.convertRoute("dashboard");       // -> "/dashboard"');
  console.log('```');
}

// Manual test function for browser console
function createManualTestFunction() {
  console.log('\n🛠️ Manual Testing Function:');
  console.log('Copy this into your browser console to test with actual router:');
  console.log('');
  console.log('```javascript');
  console.log('function testConvertRoute() {');
  console.log('  const router = window.MOJO?.router || window.app?.router;');
  console.log('  if (!router) { console.log("Router not found!"); return; }');
  console.log('  ');
  console.log('  console.log("Current mode:", router.mode);');
  console.log('  console.log("");');
  console.log('  ');
  console.log('  const tests = [');
  console.log('    "/admin", "admin", "?page=settings", ');
  console.log('    "http://localhost:3000/?page=dashboard",');
  console.log('    "http://localhost:3000/users"');
  console.log('  ];');
  console.log('  ');
  console.log('  tests.forEach(test => {');
  console.log('    const result = router.convertRoute(test);');
  console.log('    console.log(`"${test}" -> "${result}"`);');
  console.log('  });');
  console.log('}');
  console.log('testConvertRoute();');
  console.log('```');
}

// Run the tests
runTests();
createManualTestFunction();