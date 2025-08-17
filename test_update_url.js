#!/usr/bin/env node

// Test for Router.updateUrl method
// Tests URL parameter updates without triggering navigation

console.log('🧪 Testing Router.updateUrl Method\n');

// Mock DOM environment for Node.js
global.window = {
  location: {
    pathname: '/examples/portal/',
    search: '?page=dashboard',
    hash: '',
    origin: 'http://localhost:3000',
    toString() {
      return `${this.origin}${this.pathname}${this.search}${this.hash}`;
    }
  },
  history: {
    pushState: (state, title, url) => {
      console.log(`📍 History: pushState -> ${url}`);
      const urlObj = new URL(url);
      global.window.location.pathname = urlObj.pathname;
      global.window.location.search = urlObj.search;
      global.window.location.hash = urlObj.hash;
    },
    replaceState: (state, title, url) => {
      console.log(`📍 History: replaceState -> ${url}`);
      const urlObj = new URL(url);
      global.window.location.pathname = urlObj.pathname;
      global.window.location.search = urlObj.search;
      global.window.location.hash = urlObj.hash;
    },
    back: () => console.log('📍 History: back()'),
    forward: () => console.log('📍 History: forward()')
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};

// Mock Router with updateUrl method
class TestRouter {
  constructor(mode = 'params', defaultRoute = 'home') {
    this.mode = mode;
    this.defaultRoute = defaultRoute;
  }

  updateUrl(params = {}, options = {}) {
    const { replace = false } = options;
    
    if (this.mode === 'params') {
      // In params mode, update query parameters
      const currentUrl = new URL(global.window.location.toString());
      
      // Keep existing page parameter
      const currentPage = currentUrl.searchParams.get('page') || this.defaultRoute;
      currentUrl.searchParams.set('page', currentPage);
      
      // Update other parameters
      Object.entries(params).forEach(([key, value]) => {
        if (key !== 'page' && value !== null && value !== undefined && value !== '') {
          currentUrl.searchParams.set(key, String(value));
        } else if (key !== 'page') {
          currentUrl.searchParams.delete(key);
        }
      });
      
      const url = currentUrl.toString();
      if (replace) {
        global.window.history.replaceState(null, '', url);
      } else {
        global.window.history.pushState(null, '', url);
      }
    } else {
      // In history mode, update query parameters on current path
      const currentUrl = new URL(global.window.location.toString());
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          currentUrl.searchParams.set(key, String(value));
        } else {
          currentUrl.searchParams.delete(key);
        }
      });
      
      const url = currentUrl.toString();
      if (replace) {
        global.window.history.replaceState(null, '', url);
      } else {
        global.window.history.pushState(null, '', url);
      }
    }
  }
}

// Test Suite
class UpdateUrlTestSuite {
  constructor() {
    this.results = [];
    this.router = null;
  }

  assert(condition, message) {
    const success = !!condition;
    const emoji = success ? '✅' : '❌';
    console.log(`${emoji} ${message}`);
    this.results.push({ message, success });
    return success;
  }

  resetUrl(pathname = '/examples/portal/', search = '?page=dashboard') {
    global.window.location.pathname = pathname;
    global.window.location.search = search;
    global.window.location.hash = '';
  }

  getCurrentUrl() {
    return global.window.location.toString();
  }

  getUrlParams() {
    const url = new URL(this.getCurrentUrl());
    const params = {};
    for (const [key, value] of url.searchParams) {
      params[key] = value;
    }
    return params;
  }

  runAllTests() {
    console.log('🧪 Testing updateUrl Method\n');

    try {
      this.testParamsModeBasic();
      this.testParamsModePreservePage();
      this.testParamsModeRemoveParams();
      this.testParamsModeReplaceOption();
      this.testHistoryModeBasic();
      this.testHistoryModeRemoveParams();
      this.testHistoryModeReplaceOption();
      this.testEdgeCases();

      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  testParamsModeBasic() {
    console.log('📋 Testing Params Mode - Basic Updates...');
    
    this.router = new TestRouter('params', 'home');
    this.resetUrl('/examples/portal/', '?page=dashboard');
    
    // Test adding new parameters
    this.router.updateUrl({ sort: 'name', size: 20 });
    
    const params = this.getUrlParams();
    this.assert(params.page === 'dashboard', 'Page parameter preserved');
    this.assert(params.sort === 'name', 'Sort parameter added');
    this.assert(params.size === '20', 'Size parameter added');
  }

  testParamsModePreservePage() {
    console.log('\n🔒 Testing Params Mode - Preserve Page Parameter...');
    
    this.resetUrl('/examples/portal/', '?page=users&existing=value');
    
    // Update parameters should keep page and remove existing
    this.router.updateUrl({ filter: 'active', search: 'john' });
    
    const params = this.getUrlParams();
    this.assert(params.page === 'users', 'Page parameter preserved');
    this.assert(params.filter === 'active', 'Filter parameter added');
    this.assert(params.search === 'john', 'Search parameter added');
    this.assert(!params.existing, 'Previous parameters removed');
  }

  testParamsModeRemoveParams() {
    console.log('\n🗑️ Testing Params Mode - Remove Parameters...');
    
    this.resetUrl('/examples/portal/', '?page=settings&sort=name&size=10&filter=active');
    
    // Remove parameters by passing null/undefined/empty
    this.router.updateUrl({ sort: null, size: '', filter: undefined, newParam: 'value' });
    
    const params = this.getUrlParams();
    this.assert(params.page === 'settings', 'Page parameter preserved');
    this.assert(!params.sort, 'Sort parameter removed (null)');
    this.assert(!params.size, 'Size parameter removed (empty string)');
    this.assert(!params.filter, 'Filter parameter removed (undefined)');
    this.assert(params.newParam === 'value', 'New parameter added');
  }

  testParamsModeReplaceOption() {
    console.log('\n🔄 Testing Params Mode - Replace Option...');
    
    this.resetUrl('/examples/portal/', '?page=admin');
    
    // Test replace vs push
    this.router.updateUrl({ action: 'edit' }, { replace: false });
    // Should use pushState
    
    this.router.updateUrl({ action: 'save' }, { replace: true });
    // Should use replaceState
    
    const params = this.getUrlParams();
    this.assert(params.page === 'admin', 'Page preserved with replace option');
    this.assert(params.action === 'save', 'Parameter updated with replace option');
  }

  testHistoryModeBasic() {
    console.log('\n🏠 Testing History Mode - Basic Updates...');
    
    this.router = new TestRouter('history', 'home');
    this.resetUrl('/admin/users', '');
    
    // Add parameters to current path
    this.router.updateUrl({ sort: 'created', page: 1, size: 25 });
    
    const url = this.getCurrentUrl();
    const urlObj = new URL(url);
    this.assert(urlObj.pathname === '/admin/users', 'Path unchanged in history mode');
    this.assert(urlObj.searchParams.get('sort') === 'created', 'Sort parameter added');
    this.assert(urlObj.searchParams.get('page') === '1', 'Page parameter added');
    this.assert(urlObj.searchParams.get('size') === '25', 'Size parameter added');
  }

  testHistoryModeRemoveParams() {
    console.log('\n🗑️ Testing History Mode - Remove Parameters...');
    
    this.resetUrl('/dashboard', '?sort=name&filter=active&search=test');
    
    // Remove some parameters
    this.router.updateUrl({ sort: null, filter: '', search: 'updated', newParam: 'added' });
    
    const params = this.getUrlParams();
    this.assert(!params.sort, 'Sort parameter removed');
    this.assert(!params.filter, 'Filter parameter removed'); 
    this.assert(params.search === 'updated', 'Search parameter updated');
    this.assert(params.newParam === 'added', 'New parameter added');
  }

  testHistoryModeReplaceOption() {
    console.log('\n🔄 Testing History Mode - Replace Option...');
    
    this.resetUrl('/settings', '');
    
    // Test replace vs push
    this.router.updateUrl({ tab: 'general' }, { replace: false });
    this.router.updateUrl({ tab: 'security' }, { replace: true });
    
    const params = this.getUrlParams();
    this.assert(params.tab === 'security', 'Parameter updated with replace option');
  }

  testEdgeCases() {
    console.log('\n⚠️ Testing Edge Cases...');
    
    // Test empty parameters object
    this.resetUrl('/test', '?existing=value');
    this.router.updateUrl({});
    
    let params = this.getUrlParams();
    this.assert(!params.existing, 'Empty params object removes existing params');
    
    // Test with special characters
    this.router.updateUrl({ 
      search: 'hello world', 
      filter: 'type=admin&status=active',
      unicode: '测试'
    });
    
    params = this.getUrlParams();
    this.assert(params.search === 'hello world', 'Spaces handled correctly');
    this.assert(params.filter === 'type=admin&status=active', 'Special chars handled');
    this.assert(params.unicode === '测试', 'Unicode handled correctly');
    
    // Test with numbers and booleans
    this.router.updateUrl({ 
      count: 42, 
      active: true, 
      ratio: 3.14 
    });
    
    params = this.getUrlParams();
    this.assert(params.count === '42', 'Numbers converted to strings');
    this.assert(params.active === 'true', 'Booleans converted to strings');
    this.assert(params.ratio === '3.14', 'Floats converted to strings');
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('=' + '='.repeat(49));
    
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${total - passed}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (passed === total) {
      console.log('\n🎉 All updateUrl tests passed! URL updating is working correctly.');
      console.log('\n💡 updateUrl Features:');
      console.log('  - Updates query parameters without navigation');
      console.log('  - Preserves page parameter in params mode');
      console.log('  - Removes parameters when set to null/undefined/empty');
      console.log('  - Supports both replace and push history operations');
      console.log('  - Works in both params and history modes');
      console.log('  - Handles special characters and data types');
    } else {
      console.log('\n⚠️ Some tests failed. Check the implementation.');
      
      const failed = this.results.filter(r => !r.success);
      console.log('\nFailed tests:');
      failed.forEach(test => console.log(`  ❌ ${test.message}`));
    }
    
    console.log('\n🛠️ Usage Examples:');
    console.log('```javascript');
    console.log('// Basic usage - add/update parameters');
    console.log('router.updateUrl({ sort: "name", size: 20 });');
    console.log('');
    console.log('// Remove parameters');
    console.log('router.updateUrl({ filter: null, search: "" });');
    console.log('');
    console.log('// Use replace instead of push');
    console.log('router.updateUrl({ page: 2 }, { replace: true });');
    console.log('');
    console.log('// TablePage usage (params mode)');
    console.log('this.app.router.updateUrl(this.table.collection.params, { replace: true });');
    console.log('```');
  }
}

// Run the tests
const suite = new UpdateUrlTestSuite();
suite.runAllTests();