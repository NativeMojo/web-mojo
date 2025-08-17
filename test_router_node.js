#!/usr/bin/env node

// Node.js compatible test for simplified MOJO router
// Tests core functionality without DOM dependencies

import { EventEmitter } from 'events';

// Mock DOM environment for Node.js
global.window = {
  location: {
    pathname: '/',
    search: '',
    hash: '',
    origin: 'http://localhost:3000'
  },
  history: {
    pushState: (state, title, url) => {
      console.log(`📍 History: pushState -> ${url}`);
    },
    replaceState: (state, title, url) => {
      console.log(`📍 History: replaceState -> ${url}`);
    },
    back: () => console.log('📍 History: back()'),
    forward: () => console.log('📍 History: forward()')
  },
  addEventListener: (type, handler) => {
    console.log(`📍 Window: addEventListener(${type})`);
  },
  removeEventListener: (type, handler) => {
    console.log(`📍 Window: removeEventListener(${type})`);
  }
};

global.document = {
  querySelector: (selector) => ({
    innerHTML: '',
    style: { display: 'block' },
    appendChild: () => {},
    removeChild: () => {}
  }),
  createElement: (tag) => ({
    id: '',
    style: { display: 'none' },
    appendChild: () => {}
  }),
  body: {
    appendChild: () => {}
  },
  readyState: 'complete',
  addEventListener: () => {}
};

// Simple EventBus implementation for testing
class TestEventBus extends EventEmitter {
  emit(event, data) {
    console.log(`🎯 Event: ${event}`, data ? `(${Object.keys(data).join(', ')})` : '');
    return super.emit(event, data);
  }
}

// Mock Router (simplified version of our Router for testing)
class TestRouter {
  constructor(options = {}) {
    this.mode = options.mode || 'history';
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

  stop() {
    this.isStarted = false;
    console.log('🛑 Router stopped');
  }

  addRoute(pattern, pageName) {
    this.routes.push({
      pattern: this.normalizePattern(pattern),
      regex: this.patternToRegex(pattern),
      pageName,
      paramNames: this.extractParamNames(pattern)
    });
    console.log(`📋 Route added: ${pattern} -> ${pageName}`);
  }

  async navigate(path, options = {}) {
    const { replace = false, state = null, trigger = true } = options;
    
    console.log(`🧭 Navigate to: ${path} (replace: ${replace})`);
    
    const normalizedPath = this.normalizePath(path);
    
    // Update browser history (mocked)
    this.updateHistory(normalizedPath, replace, state);
    
    // Handle the route change
    if (trigger) {
      await this.handleRouteChange(normalizedPath);
    }
  }

  back() {
    global.window.history.back();
  }

  forward() {
    global.window.history.forward();
  }

  getCurrentPath() {
    if (this.mode === 'params') {
      const params = new URLSearchParams(global.window.location.search);
      return params.get('page') || '/';
    } else {
      return global.window.location.pathname.replace(new RegExp(`^${this.basePath}`), '') || '/';
    }
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
    for (const route of this.routes) {
      console.log(`🔍 Testing route ${route.pattern} (${route.regex}) against ${path}`);
      const match = path.match(route.regex);
      console.log(`   Match result:`, match);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        console.log(`   Extracted params:`, params);
        
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
      currentUrl.searchParams.set('page', path);
      url = currentUrl.toString();
    } else {
      url = `${global.window.location.origin}${this.basePath}${path}`;
    }
    
    if (replace) {
      global.window.history.replaceState(state, '', url);
    } else {
      global.window.history.pushState(state, '', url);
    }
    
    // Update mock location
    const urlObj = new URL(url);
    global.window.location.pathname = urlObj.pathname;
    global.window.location.search = urlObj.search;
  }

  patternToRegex(pattern) {
    let regexPattern = pattern
      .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
      .replace(/\/:([^/?]+)\?/g, '(?:/([^/]+))?')  // Fixed: match the slash before optional param
      .replace(/:([^/]+)/g, '([^/]+)');
    
    console.log(`🔧 Pattern ${pattern} -> ${regexPattern}`);
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

// Mock WebApp for testing
class TestWebApp {
  constructor(config = {}) {
    this.name = config.name || 'Test App';
    this.routerMode = config.routerMode || 'history';
    this.basePath = config.basePath || '';
    this.pageClasses = new Map();
    this.pageCache = new Map();
    this.currentPage = null;
    this.isStarted = false;
    
    // Initialize event bus
    this.events = new TestEventBus();
    
    // Initialize router
    this.router = new TestRouter({
      mode: this.routerMode === 'param' ? 'params' : this.routerMode,
      basePath: this.basePath,
      eventEmitter: this.events
    });

    // Listen for route changes
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
    if (!options.route) options.route = `/${pageName}`;
    
    this.pageClasses.set(pageName, {
      PageClass,
      constructorOptions: options
    });

    if (this.router) {
      const route = options.route || `/${pageName}`;
      this.router.addRoute(route, pageName);
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
    
    // Mock page creation and showing
    this.currentPage = { pageName, params, query };
    
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

  back() {
    this.router.back();
  }

  forward() {
    this.router.forward();
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

// Test Suite
class RouterTestSuite {
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
    console.log('🧪 Starting Simplified Router Tests\n');
    
    try {
      await this.testBasicSetup();
      await this.testRouteRegistration();
      await this.testNavigation();
      await this.testParameterRoutes();
      await this.testEvents();
      await this.testSidebarCompatibility();
      await this.testParamsMode();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  async testBasicSetup() {
    console.log('📋 Testing Basic Setup...');
    
    this.app = new TestWebApp({
      name: 'Router Test',
      routerMode: 'history',
      basePath: '/test'
    });

    this.assert(this.app, 'WebApp created');
    this.assert(this.app.router, 'Router initialized');
    this.assert(this.app.events, 'EventBus initialized');
    this.assert(this.app.router.mode === 'history', 'Router mode set correctly');
    
    await this.app.start();
    this.assert(this.app.isStarted, 'App started');
    this.assert(this.app.router.isStarted, 'Router started');
  }

  async testRouteRegistration() {
    console.log('\n📝 Testing Route Registration...');
    
    // Mock page classes
    class HomePage {}
    class UsersPage {}
    class SettingsPage {}
    
    this.app.registerPage('home', HomePage, { route: '/' });
    this.app.registerPage('users', UsersPage, { route: '/users/:id?' });
    this.app.registerPage('settings', SettingsPage, { route: '/settings' });

    this.assert(this.app.pageClasses.size === 3, 'All pages registered');
    this.assert(this.app.router.routes.length === 3, 'All routes added to router');
    
    const userRoute = this.app.router.routes.find(r => r.pageName === 'users');
    this.assert(userRoute, 'User route found');
    this.assert(userRoute.paramNames.includes('id'), 'Route parameter extracted');
  }

  async testNavigation() {
    console.log('\n🧭 Testing Navigation...');
    
    let routeEvents = 0;
    let pageEvents = 0;
    
    this.app.events.on('route:changed', () => routeEvents++);
    this.app.events.on('page:show', () => pageEvents++);
    
    await this.app.navigate('/');
    this.assert(routeEvents >= 1, 'Route change event fired');
    this.assert(pageEvents >= 1, 'Page show event fired');
    
    await this.app.navigate('/settings');
    this.assert(this.app.currentPage.pageName === 'settings', 'Current page updated');
  }

  async testParameterRoutes() {
    console.log('\n🎯 Testing Parameter Routes...');
    
    let lastParams = null;
    this.app.events.on('route:changed', (info) => {
      lastParams = info.params;
    });
    
    await this.app.navigate('/users/123');
    this.assert(lastParams && lastParams.id === '123', 'Route parameters captured');
    
    await this.app.navigate('/users');
    this.assert(lastParams && !lastParams.id, 'Optional parameters work');
  }

  async testEvents() {
    console.log('\n📡 Testing Event System...');
    
    const events = [];
    
    this.app.events.on('route:changed', (data) => {
      events.push({ type: 'route:changed', data });
    });
    
    this.app.events.on('route:change', (data) => {
      events.push({ type: 'route:change', data });
    });

    this.app.events.on('page:show', (data) => {
      events.push({ type: 'page:show', data });
    });
    
    events.length = 0; // Clear
    await this.app.navigate('/settings');
    
    this.assert(events.length > 0, 'Events were emitted');
    
    const routeChanged = events.find(e => e.type === 'route:changed');
    const routeChange = events.find(e => e.type === 'route:change');
    const pageShow = events.find(e => e.type === 'page:show');
    
    this.assert(routeChanged, 'route:changed event emitted');
    this.assert(routeChange, 'route:change event emitted (Sidebar compat)');
    this.assert(pageShow, 'page:show event emitted');
  }

  async testSidebarCompatibility() {
    console.log('\n📋 Testing Sidebar Compatibility...');
    
    let sidebarData = null;
    
    // Simulate Sidebar listener
    this.app.events.on('route:change', (data) => {
      if (data.page && data.page.route) {
        const route = this.app.router.convertRoute(data.page.route);
        sidebarData = { route, pageName: data.page.pageName };
      }
    });
    
    await this.app.navigate('/settings');
    
    this.assert(sidebarData, 'Sidebar received event data');
    this.assert(sidebarData.route === '/settings', 'Route conversion works');
    this.assert(sidebarData.pageName === 'settings', 'Page name captured');
    
    // Test convertRoute method directly
    const converted = this.app.router.convertRoute('/test/route');
    this.assert(converted === '/test/route', 'convertRoute method works');
  }

  async testParamsMode() {
    console.log('\n🔄 Testing Params Mode...');
    
    const paramsApp = new TestWebApp({
      routerMode: 'params',
      name: 'Params Test'
    });
    
    class TestPage {}
    paramsApp.registerPage('home', TestPage, { route: '/' });
    
    await paramsApp.start();
    
    this.assert(paramsApp.router.mode === 'params', 'Params mode set correctly');
    
    // Test params mode navigation
    global.window.location.search = '?page=/test';
    const path = paramsApp.router.getCurrentPath();
    this.assert(path === '/test', 'Params mode path extraction works');
    
    await paramsApp.destroy();
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
      console.log('\n🎉 All tests passed! Simplified router is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the logs above for details.');
      
      // Show failed tests
      const failed = this.results.filter(r => !r.success);
      if (failed.length > 0) {
        console.log('\nFailed tests:');
        failed.forEach(test => console.log(`  ❌ ${test.message}`));
      }
    }
  }

  async cleanup() {
    if (this.app) {
      await this.app.destroy();
    }
  }
}

// Run tests
async function runTests() {
  const suite = new RouterTestSuite();
  await suite.runAllTests();
}

// Auto-run tests
runTests().catch(console.error);