#!/usr/bin/env node

// Specific test for params mode route handling
// Tests the fixes for mode-aware route registration and params mode path handling

import { EventEmitter } from 'events';

// Mock DOM environment for Node.js
global.window = {
  location: {
    pathname: '/examples/portal/',
    search: '?page=home',
    hash: '',
    origin: 'http://localhost:3000'
  },
  history: {
    pushState: (state, title, url) => {
      console.log(`📍 History: pushState -> ${url}`);
      // Update mock location
      const urlObj = new URL(url);
      global.window.location.pathname = urlObj.pathname;
      global.window.location.search = urlObj.search;
    },
    replaceState: (state, title, url) => {
      console.log(`📍 History: replaceState -> ${url}`);
      const urlObj = new URL(url);
      global.window.location.pathname = urlObj.pathname;
      global.window.location.search = urlObj.search;
    },
    back: () => console.log('📍 History: back()'),
    forward: () => console.log('📍 History: forward()')
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};

global.document = {
  querySelector: () => ({ innerHTML: '', style: { display: 'block' } }),
  createElement: () => ({ id: '', style: { display: 'none' } }),
  body: { appendChild: () => {} }
};

// Test EventBus
class TestEventBus extends EventEmitter {
  emit(event, data) {
    console.log(`🎯 Event: ${event}`, data ? `(${Object.keys(data).join(', ')})` : '');
    return super.emit(event, data);
  }
}

// Mock Router with params mode fixes
class ParamsModeRouter {
  constructor(options = {}) {
    this.mode = options.mode || 'params';
    this.basePath = options.basePath || '';
    this.routes = [];
    this.currentRoute = null;
    this.eventEmitter = options.eventEmitter || null;
    this.isStarted = false;
  }

  start() {
    this.isStarted = true;
    console.log(`🚀 Router started in ${this.mode} mode`);
  }

  addRoute(pattern, pageName) {
    const route = {
      pattern: this.normalizePattern(pattern),
      regex: this.patternToRegex(pattern),
      pageName,
      paramNames: this.extractParamNames(pattern)
    };
    
    this.routes.push(route);
    console.log(`📝 Route added: "${pattern}" -> ${pageName} (regex: ${route.regex})`);
  }

  getCurrentPath() {
    if (this.mode === 'params') {
      const params = new URLSearchParams(global.window.location.search);
      let page = params.get('page') || '/';
      
      // Ensure page starts with / to match route patterns
      if (page !== '/' && !page.startsWith('/')) {
        page = `/${page}`;
      }
      
      console.log(`📍 getCurrentPath (params mode): "${page}" from search: "${global.window.location.search}"`);
      return page;
    } else {
      return global.window.location.pathname.replace(new RegExp(`^${this.basePath}`), '') || '/';
    }
  }

  async navigate(path, options = {}) {
    const { replace = false, state = null } = options;
    
    console.log(`🧭 Navigate to: ${path} (replace: ${replace})`);
    
    const normalizedPath = this.normalizePath(path);
    this.updateHistory(normalizedPath, replace, state);
    
    await this.handleRouteChange(normalizedPath);
  }

  async handleRouteChange(path) {
    const route = this.matchRoute(path);
    
    if (route) {
      this.currentRoute = route;
      
      if (this.eventEmitter) {
        this.eventEmitter.emit('route:changed', {
          path,
          pageName: route.pageName,
          params: route.params,
          query: route.query,
          route: route
        });
      }
      
      return route;
    } else {
      if (this.eventEmitter) {
        this.eventEmitter.emit('route:notfound', { path });
      }
      return null;
    }
  }

  matchRoute(path) {
    console.log(`🔍 Matching path "${path}" against ${this.routes.length} routes:`);
    
    for (const route of this.routes) {
      console.log(`  Testing: ${route.pattern} (${route.regex})`);
      const match = path.match(route.regex);
      console.log(`  Result: ${match ? 'MATCH' : 'no match'}`);
      
      if (match) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        
        return {
          ...route,
          params,
          query: this.parseQuery(),
          path
        };
      }
    }
    return null;
  }

  updateHistory(path, replace, state) {
    let url;
    
    if (this.mode === 'params') {
      const currentUrl = new URL(global.window.location.origin + global.window.location.pathname);
      currentUrl.searchParams.set('page', path.startsWith('/') ? path.substring(1) : path);
      url = currentUrl.toString();
    } else {
      url = `${global.window.location.origin}${this.basePath}${path}`;
    }
    
    if (replace) {
      global.window.history.replaceState(state, '', url);
    } else {
      global.window.history.pushState(state, '', url);
    }
  }

  patternToRegex(pattern) {
    let regexPattern = pattern
      .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
      .replace(/\/:([^/?]+)\?/g, '(?:/([^/]+))?')
      .replace(/:([^/]+)/g, '([^/]+)');
    
    console.log(`🔧 Pattern "${pattern}" -> regex: ${regexPattern}`);
    return new RegExp(`^${regexPattern}$`);
  }

  extractParamNames(pattern) {
    const matches = pattern.match(/:([^/?]+)\??/g) || [];
    return matches.map(match => match.replace(/[:?]/g, ''));
  }

  normalizePattern(pattern) {
    return pattern.startsWith('/') ? pattern : `/${pattern}`;
  }

  normalizePath(path) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  parseQuery() {
    const params = new URLSearchParams(global.window.location.search);
    const query = {};
    
    for (const [key, value] of params) {
      if (this.mode !== 'params' || key !== 'page') {
        query[key] = value;
      }
    }
    
    return query;
  }

  convertRoute(route) {
    if (!route) return '/';
    return route.startsWith('/') ? route : `/${route}`;
  }
}

// Mock WebApp with params mode fixes
class ParamsModeWebApp {
  constructor(config = {}) {
    this.name = config.name || 'Params Test App';
    this.routerMode = config.routerMode || 'params';
    this.basePath = config.basePath || '';
    this.pageClasses = new Map();
    this.pageCache = new Map();
    this.currentPage = null;
    this.isStarted = false;
    
    this.events = new TestEventBus();
    
    this.router = new ParamsModeRouter({
      mode: this.routerMode === 'param' ? 'params' : this.routerMode,
      basePath: this.basePath,
      eventEmitter: this.events
    });

    this.events.on('route:changed', async (routeInfo) => {
      await this.handleRouteChange(routeInfo);
    });
    
    this.events.on('route:notfound', (info) => {
      console.log(`⚠️ Route not found: ${info.path}`);
    });
  }

  async start() {
    if (this.isStarted) return;
    
    console.log(`🚀 Starting ${this.name}...`);
    this.router.start();
    this.isStarted = true;
    this.events.emit('app:ready', { app: this });
    console.log(`✅ ${this.name} started successfully`);
  }

  registerPage(pageName, PageClass, options = {}) {
    // Mode-aware route registration
    let route = options.route || `/${pageName}`;
    
    // Normalize route based on router mode
    if (this.router.mode === 'params') {
      // In params mode, ensure route starts with / for consistent pattern matching
      route = route.startsWith('/') ? route : `/${route}`;
    } else {
      // In history mode, ensure route starts with / 
      route = route.startsWith('/') ? route : `/${route}`;
    }
    
    // Store the route back in options so page instances can access it
    options.route = route;
    
    this.pageClasses.set(pageName, {
      PageClass,
      constructorOptions: options
    });

    if (this.router) {
      this.router.addRoute(route, pageName);
      console.log(`📝 Registered route: "${route}" -> ${pageName} (${this.router.mode} mode)`);
    }

    return this;
  }

  async navigate(route, params = {}, options = {}) {
    let path = route;
    if (params && Object.keys(params).length > 0) {
      Object.keys(params).forEach(key => {
        path = path.replace(`:${key}`, params[key]);
      });
    }

    return await this.router.navigate(path, options);
  }

  async handleRouteChange(routeInfo) {
    const { pageName, params, query, path } = routeInfo;
    
    console.log(`📄 Handling route change: ${path} -> ${pageName}`);
    
    // Mock page creation
    this.currentPage = { pageName, params, query, route: path };
    
    this.events.emit('page:show', { 
      page: this.currentPage, 
      pageName, 
      params, 
      query, 
      path 
    });
    
    // Emit route:change for Sidebar compatibility
    this.events.emit('route:change', {
      path,
      params,
      query,
      page: {
        route: path,
        pageName: pageName
      }
    });
  }

  getCurrentPage() {
    return this.currentPage;
  }

  async destroy() {
    console.log('🧹 Destroying app...');
    this.router.stop();
    this.pageCache.clear();
    this.pageClasses.clear();
    this.isStarted = false;
  }
}

// Test Suite for Params Mode
class ParamsModeTestSuite {
  constructor() {
    this.results = [];
    this.app = null;
  }

  assert(condition, message) {
    const success = !!condition;
    const emoji = success ? '✅' : '❌';
    console.log(`${emoji} ${message}`);
    this.results.push({ message, success });
    return success;
  }

  async runAllTests() {
    console.log('🧪 Testing Params Mode Route Handling\n');
    
    try {
      await this.testParamsModeSetup();
      await this.testRouteRegistration();
      await this.testCurrentPathParsing();
      await this.testRouteMatching();
      await this.testNavigation();
      await this.testSidebarCompatibility();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  async testParamsModeSetup() {
    console.log('📋 Testing Params Mode Setup...');
    
    // Simulate URL: http://localhost:3000/examples/portal/?page=home
    global.window.location.search = '?page=home';
    
    this.app = new ParamsModeWebApp({
      name: 'Params Mode Test',
      routerMode: 'params'
    });

    this.assert(this.app, 'WebApp created');
    this.assert(this.app.router, 'Router initialized');
    this.assert(this.app.router.mode === 'params', 'Router mode set to params');
    
    await this.app.start();
    this.assert(this.app.isStarted, 'App started');
  }

  async testRouteRegistration() {
    console.log('\n📝 Testing Route Registration...');
    
    // Mock page classes
    class HomePage {}
    class DashboardPage {}
    
    this.app.registerPage('home', HomePage, { route: '/home' });
    this.app.registerPage('dashboard', DashboardPage, { route: '/dashboard' });

    this.assert(this.app.pageClasses.size === 2, 'Pages registered');
    this.assert(this.app.router.routes.length === 2, 'Routes added to router');
    
    // Check that routes have proper regex objects
    const homeRoute = this.app.router.routes.find(r => r.pageName === 'home');
    this.assert(homeRoute, 'Home route exists');
    this.assert(homeRoute.regex instanceof RegExp, 'Home route has valid regex');
    this.assert(homeRoute.pattern === '/home', 'Home route pattern correct');
  }

  async testCurrentPathParsing() {
    console.log('\n🔍 Testing Current Path Parsing...');
    
    // Test different URL formats
    const testCases = [
      { search: '?page=home', expected: '/home' },
      { search: '?page=/dashboard', expected: '/dashboard' },
      { search: '?page=settings', expected: '/settings' },
      { search: '', expected: '/' }
    ];

    for (const testCase of testCases) {
      global.window.location.search = testCase.search;
      const currentPath = this.app.router.getCurrentPath();
      this.assert(
        currentPath === testCase.expected, 
        `"${testCase.search}" -> "${currentPath}" (expected "${testCase.expected}")`
      );
    }
  }

  async testRouteMatching() {
    console.log('\n🎯 Testing Route Matching...');
    
    // Reset to home page
    global.window.location.search = '?page=home';
    
    const currentPath = this.app.router.getCurrentPath();
    const match = this.app.router.matchRoute(currentPath);
    
    this.assert(match !== null, 'Route matched');
    if (match) {
      this.assert(match.pageName === 'home', 'Correct page matched');
      this.assert(match.path === '/home', 'Correct path in match');
    }
    
    // Test dashboard
    global.window.location.search = '?page=dashboard';
    const dashboardPath = this.app.router.getCurrentPath();
    const dashboardMatch = this.app.router.matchRoute(dashboardPath);
    
    this.assert(dashboardMatch !== null, 'Dashboard route matched');
    if (dashboardMatch) {
      this.assert(dashboardMatch.pageName === 'dashboard', 'Correct dashboard page matched');
    }
  }

  async testNavigation() {
    console.log('\n🧭 Testing Navigation...');
    
    let routeChangeCount = 0;
    this.app.events.on('route:changed', () => routeChangeCount++);
    
    // Navigate to dashboard
    await this.app.navigate('/dashboard');
    
    this.assert(routeChangeCount > 0, 'Route change event fired');
    this.assert(this.app.currentPage?.pageName === 'dashboard', 'Current page updated');
    
    // Check URL was updated
    const urlParams = new URLSearchParams(global.window.location.search);
    this.assert(urlParams.get('page') === 'dashboard', 'URL updated correctly');
  }

  async testSidebarCompatibility() {
    console.log('\n📋 Testing Sidebar Compatibility...');
    
    let sidebarEventData = null;
    
    this.app.events.on('route:change', (data) => {
      sidebarEventData = data;
    });
    
    await this.app.navigate('/home');
    
    this.assert(sidebarEventData !== null, 'Sidebar event fired');
    if (sidebarEventData) {
      this.assert(sidebarEventData.page?.route === '/home', 'Sidebar event has correct route');
      this.assert(sidebarEventData.page?.pageName === 'home', 'Sidebar event has correct page name');
    }
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
      console.log('\n🎉 All params mode tests passed! Route handling is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the logs above for details.');
      
      const failed = this.results.filter(r => !r.success);
      console.log('\nFailed tests:');
      failed.forEach(test => console.log(`  ❌ ${test.message}`));
    }
  }

  async cleanup() {
    if (this.app) {
      await this.app.destroy();
    }
  }
}

// Run the tests
async function runParamsModeTests() {
  const suite = new ParamsModeTestSuite();
  await suite.runAllTests();
}

// Auto-run
runParamsModeTests().catch(console.error);