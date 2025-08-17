#!/usr/bin/env node

// Test for default route functionality in simplified MOJO router
// Tests default route handling in both params and history modes

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

// Mock Router with default route support
class DefaultRouteRouter {
  constructor(options = {}) {
    this.mode = options.mode || 'history';
    this.basePath = options.basePath || '';
    this.defaultRoute = options.defaultRoute || 'home';
    this.routes = [];
    this.currentRoute = null;
    this.eventEmitter = options.eventEmitter || null;
    this.isStarted = false;
  }

  start() {
    this.isStarted = true;
    console.log(`🚀 Router started in ${this.mode} mode with default route: ${this.defaultRoute}`);
  }

  addRoute(pattern, pageName) {
    const route = {
      pattern: this.normalizePattern(pattern),
      regex: this.patternToRegex(pattern),
      pageName,
      paramNames: this.extractParamNames(pattern)
    };
    
    this.routes.push(route);
    console.log(`📝 Route added: "${pattern}" -> ${pageName}`);
  }

  getCurrentPath() {
    if (this.mode === 'params') {
      const params = new URLSearchParams(global.window.location.search);
      let page = params.get('page');
      
      // Use defaultRoute if no page parameter
      if (!page) {
        page = this.defaultRoute;
      }
      
      // Ensure page starts with / to match route patterns
      if (page !== '/' && !page.startsWith('/')) {
        page = `/${page}`;
      }
      
      console.log(`📍 getCurrentPath (params mode): "${page}" (default: ${this.defaultRoute})`);
      return page;
    } else {
      let path = global.window.location.pathname.replace(new RegExp(`^${this.basePath}`), '') || '/';
      
      // Use defaultRoute if we're at root
      if (path === '/') {
        path = `/${this.defaultRoute}`;
      }
      
      console.log(`📍 getCurrentPath (history mode): "${path}" (default: ${this.defaultRoute})`);
      return path;
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
    let route = this.matchRoute(path);
    
    // If no route matched and we're not already on default route, try default route
    if (!route && path !== `/${this.defaultRoute}`) {
      console.log(`⚠️ No route matched for "${path}", trying default route: ${this.defaultRoute}`);
      const defaultPath = `/${this.defaultRoute}`;
      route = this.matchRoute(defaultPath);
      
      if (route) {
        // Navigate to default route
        this.updateHistory(defaultPath, true, null);
        path = defaultPath;
        console.log(`🔄 Redirected to default route: ${defaultPath}`);
      }
    }
    
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
      const match = path.match(route.regex);
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
      const pageValue = path.startsWith('/') ? path.substring(1) : path;
      currentUrl.searchParams.set('page', pageValue);
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

  convertRoute(route) {
    if (!route) {
      return this.mode === 'params' ? `?page=${this.defaultRoute}` : `/${this.defaultRoute}`;
    }
    
    let cleanPath = '';
    
    // Parse input route to extract the actual path
    if (route.includes('?page=')) {
      const match = route.match(/\?page=([^&]+)/);
      if (match) {
        cleanPath = '/' + decodeURIComponent(match[1]);
      }
    } else if (route.startsWith('http')) {
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
      cleanPath = route.startsWith('/') ? route : `/${route}`;
    }
    
    // Normalize path
    if (cleanPath !== '/' && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }
    
    // Convert to current mode format
    if (this.mode === 'params') {
      const pageValue = cleanPath === '/' ? this.defaultRoute : cleanPath.substring(1);
      return `?page=${pageValue}`;
    } else {
      return cleanPath === '/' ? `/${this.defaultRoute}` : cleanPath;
    }
  }

  patternToRegex(pattern) {
    let regexPattern = pattern
      .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
      .replace(/\/:([^/?]+)\?/g, '(?:/([^/]+))?')
      .replace(/:([^/]+)/g, '([^/]+)');
    
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
}

// Mock WebApp with default route support
class DefaultRouteWebApp {
  constructor(config = {}) {
    this.name = config.name || 'Default Route Test App';
    this.routerMode = config.routerMode || 'history';
    this.basePath = config.basePath || '';
    this.defaultRoute = config.defaultRoute || 'home';
    this.pageClasses = new Map();
    this.currentPage = null;
    this.isStarted = false;
    
    this.events = new TestEventBus();
    
    this.router = new DefaultRouteRouter({
      mode: this.routerMode === 'param' ? 'params' : this.routerMode,
      basePath: this.basePath,
      defaultRoute: this.defaultRoute,
      eventEmitter: this.events
    });

    this.events.on('route:changed', async (routeInfo) => {
      await this.handleRouteChange(routeInfo);
    });
    
    this.events.on('route:notfound', async (info) => {
      console.warn(`Route not found: ${info.path}`);
      
      // Try to navigate to default route instead of showing error
      if (info.path !== `/${this.defaultRoute}`) {
        console.log(`🔄 Redirecting to default route: ${this.defaultRoute}`);
        await this.navigateToDefault({ replace: true });
      } else {
        console.log(`❌ Default route also not found: ${info.path}`);
      }
    });
  }

  async start() {
    if (this.isStarted) return;
    
    console.log(`🚀 Starting ${this.name} with default route: ${this.defaultRoute}...`);
    this.router.start();
    this.isStarted = true;
    this.events.emit('app:ready', { app: this });
    console.log(`✅ ${this.name} started successfully`);
  }

  registerPage(pageName, PageClass, options = {}) {
    let route = options.route || `/${pageName}`;
    
    options.route = route;
    
    this.pageClasses.set(pageName, {
      PageClass,
      constructorOptions: options
    });

    if (this.router) {
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

  async navigateToDefault(options = {}) {
    console.log(`🏠 Navigating to default route: ${this.defaultRoute}`);
    return await this.navigate(`/${this.defaultRoute}`, {}, options);
  }

  async handleRouteChange(routeInfo) {
    const { pageName, params, query, path } = routeInfo;
    
    console.log(`📄 Handling route change: ${path} -> ${pageName}`);
    
    this.currentPage = { pageName, params, query, route: path };
    
    this.events.emit('page:show', { 
      page: this.currentPage, 
      pageName, 
      params, 
      query, 
      path 
    });
  }

  getCurrentPage() {
    return this.currentPage;
  }

  async destroy() {
    console.log('🧹 Destroying app...');
    this.pageClasses.clear();
    this.isStarted = false;
  }
}

// Test Suite for Default Route
class DefaultRouteTestSuite {
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
    console.log('🧪 Testing Default Route Functionality\n');
    
    try {
      await this.testCustomDefaultRoute();
      await this.testParamsModeDefaultRoute();
      await this.testHistoryModeDefaultRoute();
      await this.testConvertRouteWithDefault();
      await this.testNotFoundRedirection();
      await this.testNavigateToDefault();
      await this.testEmptyUrlHandling();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  async testCustomDefaultRoute() {
    console.log('📋 Testing Custom Default Route...');
    
    this.app = new DefaultRouteWebApp({
      name: 'Custom Default Route Test',
      routerMode: 'history',
      defaultRoute: 'dashboard' // Custom default route
    });

    this.assert(this.app.defaultRoute === 'dashboard', 'Custom default route set');
    this.assert(this.app.router.defaultRoute === 'dashboard', 'Router has custom default route');
    
    await this.app.start();
    this.assert(this.app.isStarted, 'App started with custom default route');
  }

  async testParamsModeDefaultRoute() {
    console.log('\n🔄 Testing Params Mode Default Route...');
    
    // Test empty search params
    global.window.location.search = '';
    
    const paramsApp = new DefaultRouteWebApp({
      routerMode: 'params',
      defaultRoute: 'welcome'
    });
    
    class WelcomePage {}
    paramsApp.registerPage('welcome', WelcomePage, { route: '/welcome' });
    
    await paramsApp.start();
    
    const currentPath = paramsApp.router.getCurrentPath();
    this.assert(currentPath === '/welcome', 'Params mode uses default route when no page param');
    
    // Test with page param
    global.window.location.search = '?page=settings';
    const pathWithParam = paramsApp.router.getCurrentPath();
    this.assert(pathWithParam === '/settings', 'Params mode respects page param when present');
    
    await paramsApp.destroy();
  }

  async testHistoryModeDefaultRoute() {
    console.log('\n🏠 Testing History Mode Default Route...');
    
    // Test root path
    global.window.location.pathname = '/';
    
    const historyApp = new DefaultRouteWebApp({
      routerMode: 'history',
      defaultRoute: 'home'
    });
    
    class HomePage {}
    historyApp.registerPage('home', HomePage, { route: '/home' });
    
    await historyApp.start();
    
    const currentPath = historyApp.router.getCurrentPath();
    this.assert(currentPath === '/home', 'History mode uses default route for root path');
    
    // Test specific path
    global.window.location.pathname = '/admin';
    const pathWithRoute = historyApp.router.getCurrentPath();
    this.assert(pathWithRoute === '/admin', 'History mode respects specific paths');
    
    await historyApp.destroy();
  }

  async testConvertRouteWithDefault() {
    console.log('\n🔧 Testing convertRoute with Default Route...');
    
    // Test convertRoute empty input
    const emptyRouteParams = this.app.router.convertRoute('');
    this.assert(emptyRouteParams === '/dashboard', 'convertRoute uses default for empty input (history mode)');
    
    const nullRoute = this.app.router.convertRoute(null);
    this.assert(nullRoute === '/dashboard', 'convertRoute uses default for null input');
    
    // Test params mode
    const paramsRouter = new DefaultRouteRouter({
      mode: 'params',
      defaultRoute: 'main'
    });
    
    const emptyRouteParamsMode = paramsRouter.convertRoute('');
    this.assert(emptyRouteParamsMode === '?page=main', 'convertRoute uses default for empty input (params mode)');
  }

  async testNotFoundRedirection() {
    console.log('\n🚫 Testing Not Found Redirection...');
    
    // Register only the default route
    class DashboardPage {}
    this.app.registerPage('dashboard', DashboardPage, { route: '/dashboard' });
    
    let redirectionOccurred = false;
    this.app.events.on('route:notfound', () => {
      redirectionOccurred = true;
    });
    
    // Try to navigate to non-existent route
    await this.app.navigate('/nonexistent');
    
    this.assert(redirectionOccurred, 'Route not found event fired');
    
    // Should end up on default route
    const finalPage = this.app.getCurrentPage();
    this.assert(finalPage?.pageName === 'dashboard', 'Redirected to default route page');
  }

  async testNavigateToDefault() {
    console.log('\n🎯 Testing NavigateToDefault Method...');
    
    let navigationOccurred = false;
    this.app.events.on('route:changed', (info) => {
      if (info.pageName === 'dashboard') {
        navigationOccurred = true;
      }
    });
    
    await this.app.navigateToDefault();
    
    this.assert(navigationOccurred, 'navigateToDefault triggered navigation');
    
    const currentPage = this.app.getCurrentPage();
    this.assert(currentPage?.pageName === 'dashboard', 'navigateToDefault went to correct page');
  }

  async testEmptyUrlHandling() {
    console.log('\n🌐 Testing Empty URL Handling...');
    
    // Reset URL to empty state
    global.window.location.pathname = '/';
    global.window.location.search = '';
    
    const emptyApp = new DefaultRouteWebApp({
      routerMode: 'history',
      defaultRoute: 'start'
    });
    
    class StartPage {}
    emptyApp.registerPage('start', StartPage, { route: '/start' });
    
    await emptyApp.start();
    
    // Simulate handling current location (empty URL)
    await emptyApp.router.handleRouteChange('/');
    
    const finalPage = emptyApp.getCurrentPage();
    this.assert(finalPage?.pageName === 'start', 'Empty URL redirects to default route');
    
    await emptyApp.destroy();
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
      console.log('\n🎉 All default route tests passed! Default route functionality is working correctly.');
      console.log('\n💡 Default Route Features:');
      console.log('  - Custom default routes supported');
      console.log('  - Works in both params and history modes');
      console.log('  - Automatic redirection on route not found');
      console.log('  - convertRoute respects default route');
      console.log('  - navigateToDefault method available');
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
async function runDefaultRouteTests() {
  const suite = new DefaultRouteTestSuite();
  await suite.runAllTests();
}

// Auto-run
runDefaultRouteTests().catch(console.error);