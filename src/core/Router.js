/**
 * Router - Client-side routing for MOJO framework
 * Handles SPA navigation with history API and hash routing
 */

class Router {
  constructor(options = {}) {
    this.routes = new Map();
    this.currentRoute = null;
    this.currentParams = {};
    this.currentQuery = {};
    
    // Configuration
    this.options = {
      mode: 'history', // 'history' or 'hash'
      base: '/',
      container: '#app',
      ...options
    };
    
    // Route guards
    this.guards = {
      beforeEach: [],
      afterEach: []
    };
    
    // State
    this.started = false;
    this.container = null;
    
    // Bind event handlers
    this.onPopState = this.onPopState.bind(this);
    this.onHashChange = this.onHashChange.bind(this);
  }

  /**
   * Start the router
   */
  start() {
    if (this.started) {
      return;
    }
    
    this.started = true;
    
    // Find container element
    this.container = document.querySelector(this.options.container);
    if (!this.container) {
      throw new Error(`Router container not found: ${this.options.container}`);
    }
    
    // Add event listeners based on mode
    if (this.options.mode === 'history') {
      window.addEventListener('popstate', this.onPopState);
    } else {
      window.addEventListener('hashchange', this.onHashChange);
    }
    
    // Handle initial route
    this.handleCurrentLocation();
    
    console.log(`🚀 MOJO Router started in ${this.options.mode} mode`);
  }

  /**
   * Stop the router
   */
  stop() {
    if (!this.started) {
      return;
    }
    
    this.started = false;
    
    // Remove event listeners
    window.removeEventListener('popstate', this.onPopState);
    window.removeEventListener('hashchange', this.onHashChange);
    
    console.log('🛑 MOJO Router stopped');
  }

  /**
   * Add a route
   * @param {string} path - Route path pattern
   * @param {function|object} handler - Route handler (Page class or function)
   * @param {object} options - Route options
   */
  addRoute(path, handler, options = {}) {
    const route = {
      path: this.normalizePath(path),
      handler,
      options: {
        name: options.name || null,
        middleware: options.middleware || [],
        meta: options.meta || {},
        ...options
      },
      regex: this.pathToRegex(path),
      keys: this.extractKeys(path)
    };
    
    this.routes.set(path, route);
    
    // Also store by name if provided
    if (options.name) {
      this.routes.set(`@${options.name}`, route);
    }
  }

  /**
   * Remove a route
   * @param {string} path - Route path or name
   */
  removeRoute(path) {
    const route = this.routes.get(path);
    if (route) {
      this.routes.delete(path);
      if (route.options.name) {
        this.routes.delete(`@${route.options.name}`);
      }
    }
  }

  /**
   * Navigate to a route
   * @param {string} path - Path to navigate to
   * @param {object} options - Navigation options
   */
  async navigate(path, options = {}) {
    const url = this.buildUrl(path);
    const currentUrl = this.getCurrentUrl();
    
    // Don't navigate if already at destination
    if (url === currentUrl && !options.force) {
      return;
    }
    
    // Update browser history
    if (options.replace) {
      this.replaceState(url);
    } else {
      this.pushState(url);
    }
    
    // Handle the route
    await this.handleRoute(path, options.params || {});
  }

  /**
   * Replace current route
   * @param {string} path - Path to replace with
   * @param {object} options - Navigation options
   */
  async replace(path, options = {}) {
    return this.navigate(path, { ...options, replace: true });
  }

  /**
   * Go back in history
   */
  back() {
    window.history.back();
  }

  /**
   * Go forward in history
   */
  forward() {
    window.history.forward();
  }

  /**
   * Go to specific history entry
   * @param {number} delta - Number of steps to go
   */
  go(delta) {
    window.history.go(delta);
  }

  /**
   * Handle current location
   */
  async handleCurrentLocation() {
    const path = this.getCurrentPath();
    const query = this.parseQuery();
    
    await this.handleRoute(path, {}, query);
  }

  /**
   * Handle a specific route
   * @param {string} path - Route path
   * @param {object} params - Route parameters
   * @param {object} query - Query parameters
   */
  async handleRoute(path, params = {}, query = {}) {
    const route = this.matchRoute(path);
    
    if (!route) {
      console.error(`No route found for path: ${path}`);
      await this.handleNotFound(path);
      return;
    }
    
    // Extract parameters from path
    const extractedParams = this.extractParams(route, path);
    const allParams = { ...extractedParams, ...params };
    
    // Run before guards
    for (const guard of this.guards.beforeEach) {
      const result = await guard(route, allParams, query);
      if (result === false) {
        console.log('Navigation cancelled by guard');
        return;
      }
    }
    
    try {
      // Handle the route
      await this.executeRoute(route, allParams, query);
      
      // Update current route info
      this.currentRoute = route;
      this.currentParams = allParams;
      this.currentQuery = query;
      
      // Run after guards
      for (const guard of this.guards.afterEach) {
        await guard(route, allParams, query);
      }
      
    } catch (error) {
      console.error('Route execution error:', error);
      await this.handleError(error, route, allParams, query);
    }
  }

  /**
   * Execute a route handler
   * @param {object} route - Route object
   * @param {object} params - Route parameters
   * @param {object} query - Query parameters
   */
  async executeRoute(route, params, query) {
    const { handler } = route;
    
    if (typeof handler === 'function') {
      // Page class constructor
      if (handler.prototype && handler.prototype.render) {
        const pageInstance = new handler();
        
        // Set parameters
        pageInstance.on_params(params, query);
        
        // Render the page
        await pageInstance.render(this.container);
        
        // Store reference for cleanup
        this.currentPageInstance = pageInstance;
      } else {
        // Regular function handler
        await handler(params, query, this.container);
      }
    } else if (typeof handler === 'object' && handler.render) {
      // Page instance
      handler.on_params(params, query);
      await handler.render(this.container);
      this.currentPageInstance = handler;
    } else {
      throw new Error(`Invalid route handler for ${route.path}`);
    }
  }

  /**
   * Handle 404 - Not Found
   * @param {string} path - Requested path
   */
  async handleNotFound(path) {
    const notFoundRoute = this.routes.get('*') || this.routes.get('404');
    
    if (notFoundRoute) {
      await this.executeRoute(notFoundRoute, { path }, {});
    } else {
      this.container.innerHTML = `
        <div class="container mt-5">
          <div class="row">
            <div class="col-12 text-center">
              <h1 class="display-1">404</h1>
              <h2>Page Not Found</h2>
              <p class="lead">The requested page "${path}" could not be found.</p>
              <a href="/" class="btn btn-primary">Go Home</a>
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Handle route execution errors
   * @param {Error} error - Error object
   * @param {object} route - Route object
   * @param {object} params - Route parameters
   * @param {object} query - Query parameters
   */
  async handleError(error, route, params, query) {
    console.error('Route error:', error);
    
    this.container.innerHTML = `
      <div class="container mt-5">
        <div class="row">
          <div class="col-12">
            <div class="alert alert-danger">
              <h4>Route Error</h4>
              <p>An error occurred while loading this page:</p>
              <code>${error.message}</code>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Match a path against registered routes
   * @param {string} path - Path to match
   * @returns {object|null} Matched route or null
   */
  matchRoute(path) {
    const normalizedPath = this.normalizePath(path);
    
    // Try exact match first
    const exactMatch = this.routes.get(normalizedPath);
    if (exactMatch) {
      return exactMatch;
    }
    
    // Try regex matching
    for (const [, route] of this.routes) {
      if (route.regex && route.regex.test(normalizedPath)) {
        return route;
      }
    }
    
    return null;
  }

  /**
   * Extract parameters from path using route pattern
   * @param {object} route - Route object
   * @param {string} path - Current path
   * @returns {object} Extracted parameters
   */
  extractParams(route, path) {
    const params = {};
    
    if (route.regex && route.keys) {
      const matches = path.match(route.regex);
      if (matches) {
        route.keys.forEach((key, index) => {
          params[key] = matches[index + 1];
        });
      }
    }
    
    return params;
  }

  /**
   * Convert path pattern to regex
   * @param {string} path - Path pattern
   * @returns {RegExp} Regex pattern
   */
  pathToRegex(path) {
    // Simple implementation - can be enhanced
    const normalizedPath = this.normalizePath(path);
    
    if (normalizedPath === '*') {
      return /^.*$/;
    }
    
    // Replace :param with capturing group
    const regexString = normalizedPath
      .replace(/:[^\/]+/g, '([^/]+)')
      .replace(/\*/g, '.*');
    
    return new RegExp(`^${regexString}$`);
  }

  /**
   * Extract parameter keys from path pattern
   * @param {string} path - Path pattern
   * @returns {array} Array of parameter names
   */
  extractKeys(path) {
    const keys = [];
    const matches = path.match(/:([^\/]+)/g);
    
    if (matches) {
      matches.forEach(match => {
        keys.push(match.substring(1)); // Remove the ':'
      });
    }
    
    return keys;
  }

  /**
   * Add navigation guard
   * @param {string} type - 'beforeEach' or 'afterEach'
   * @param {function} guard - Guard function
   */
  addGuard(type, guard) {
    if (this.guards[type]) {
      this.guards[type].push(guard);
    }
  }

  /**
   * Get current path based on routing mode
   * @returns {string} Current path
   */
  getCurrentPath() {
    if (this.options.mode === 'history') {
      return window.location.pathname.replace(this.options.base, '') || '/';
    } else {
      return window.location.hash.replace('#', '') || '/';
    }
  }

  /**
   * Get current full URL
   * @returns {string} Current URL
   */
  getCurrentUrl() {
    if (this.options.mode === 'history') {
      return window.location.pathname + window.location.search;
    } else {
      return window.location.hash;
    }
  }

  /**
   * Parse query string
   * @returns {object} Parsed query parameters
   */
  parseQuery() {
    const query = {};
    const queryString = window.location.search.substring(1);
    
    if (queryString) {
      const pairs = queryString.split('&');
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        query[decodeURIComponent(key)] = decodeURIComponent(value || '');
      });
    }
    
    return query;
  }

  /**
   * Build URL for navigation
   * @param {string} path - Target path
   * @returns {string} Complete URL
   */
  buildUrl(path) {
    if (this.options.mode === 'history') {
      return this.options.base + path.replace(/^\//, '');
    } else {
      return `#${path}`;
    }
  }

  /**
   * Push state to history
   * @param {string} url - URL to push
   */
  pushState(url) {
    if (this.options.mode === 'history') {
      window.history.pushState({}, '', url);
    } else {
      window.location.hash = url.replace('#', '');
    }
  }

  /**
   * Replace current state
   * @param {string} url - URL to replace with
   */
  replaceState(url) {
    if (this.options.mode === 'history') {
      window.history.replaceState({}, '', url);
    } else {
      window.location.replace(url);
    }
  }

  /**
   * Normalize path
   * @param {string} path - Path to normalize
   * @returns {string} Normalized path
   */
  normalizePath(path) {
    if (!path || path === '/') {
      return '/';
    }
    
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // Remove trailing slash (except for root)
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    return path;
  }

  /**
   * Handle popstate event (browser back/forward)
   * @param {PopStateEvent} event - Popstate event
   */
  onPopState(event) {
    this.handleCurrentLocation();
  }

  /**
   * Handle hashchange event
   * @param {HashChangeEvent} event - Hashchange event
   */
  onHashChange(event) {
    this.handleCurrentLocation();
  }

  /**
   * Cleanup current page instance
   */
  cleanup() {
    if (this.currentPageInstance && typeof this.currentPageInstance.destroy === 'function') {
      this.currentPageInstance.destroy();
      this.currentPageInstance = null;
    }
  }
}

export default Router;