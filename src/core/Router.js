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

    // Page instance tracking for event system
    this.previousPageInstance = null;
    this.currentPageInstance = null;

    // Page name to route mapping for data-page support
    this.pageRegistry = new Map();

    // Configuration
    this.options = {
      mode: 'param', // 'history', 'hash', or 'param'
      base: '/',
      pageParam: 'page',
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
    this.container = this.options.container;

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

    // Validate container element exists
    const containerElement = document.querySelector(this.options.container);
    if (!containerElement) {
      throw new Error(`Router container not found: ${this.options.container}`);
    }
    // Keep container as selector string
    this.container = this.options.container;

    // Add event listeners based on mode
    if (this.options.mode === 'history') {
      window.addEventListener('popstate', this.onPopState);
    } else if (this.options.mode === 'hash') {
      window.addEventListener('hashchange', this.onHashChange);
    } else if (this.options.mode === 'param') {
      window.addEventListener('popstate', this.onPopState);
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
  addRoute(pathOrHandler, handlerOrOptions, options = {}) {
    let path, handler, finalOptions;
    
    if (typeof pathOrHandler === 'string') {
      // Manual path specification
      path = pathOrHandler;
      handler = handlerOrOptions;
      finalOptions = options;
    } else {
      // Page class or instance
      handler = pathOrHandler;
      finalOptions = handlerOrOptions || {};
      
      // If it's a class (constructor function), instantiate it
      if (typeof handler === 'function' && handler.prototype) {
        try {
          handler = new handler();
          
          // If the page has an initialization promise, wait for it to complete or fail
          if (handler._initPromise && typeof handler._initPromise.then === 'function') {
            handler._initPromise.catch(error => {
              console.error(`Async initialization failed for page class ${handler.constructor.name}:`, error);
              console.error('Page may not function correctly');
            });
          }
        } catch (error) {
          console.error(`Failed to instantiate page class ${handler.name}:`, error);
          console.error('Route not registered. Continuing...');
          return this; // Return for chaining, but don't register the route
        }
      }
      
      // Validate that we have a valid page instance
      if (!handler || typeof handler !== 'object') {
        console.error(`Invalid handler provided for route. Expected Page instance or class, got ${typeof handler}`);
        return this;
      }
      
      // Get path from the instance's route or pageName
      if (handler.route) {
        path = handler.route;
      } else if (handler.pageName) {
        path = '/' + handler.pageName
          .replace(/([A-Z])/g, '_$1')
          .toLowerCase()
          .replace(/^_/, '');
      } else {
        path = '/' + handler.constructor.name
          .toLowerCase()
          .replace(/page$/, '');
      }
      
      console.log(`Adding route for ${handler.pageName || handler.constructor.name}: ${path}`);
    }

    const route = {
      path: this.normalizePath(path),
      handler,
      options: {
        name: finalOptions.name || null,
        middleware: finalOptions.middleware || [],
        meta: finalOptions.meta || {},
        ...finalOptions
      },
      regex: this.pathToRegex(path),
      keys: this.extractKeys(path)
    };

    this.routes.set(path, route);

    // Also store by name if provided
    if (finalOptions.name) {
      this.routes.set(`@${finalOptions.name}`, route);
    }

    // Auto-register page name for data-page support
    if (handler && handler.pageName) {
      this.registerPageName(handler.pageName, path);
    }

    return this;
  }

  /**
   * Add multiple page instances at once
   * @param {Array<Page>} pages - Array of page instances or classes
   * @returns {Router} Router instance for chaining
   */
  addPages(pages) {
    pages.forEach((page, index) => {
      try {
        this.addRoute(page);
      } catch (error) {
        const pageName = page?.name || page?.constructor?.name || `page at index ${index}`;
        console.error(`Failed to add route for ${pageName}:`, error);
        console.error('Continuing with remaining pages...');
      }
    });
    return this;
  }

  /**
   * Remove a route
   * @param {string} path - Route path to remove
   * @returns {Router} Router instance for chaining
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
   * Register a page name with its route for data-page support
   * @param {string} pageName - Page name (e.g., 'home', 'about')
   * @param {string} route - Route path (e.g., '/', '/about')
   */
  registerPageName(pageName, route) {
    this.pageRegistry.set(pageName.toLowerCase(), route);
  }

  /**
   * Navigate to a page by name with optional parameters
   * @param {string} pageName - Page name to navigate to
   * @param {object} params - Optional parameters to pass to page
   */
  async navigateToPage(pageName, params = {}) {
    const route = this.pageRegistry.get(pageName.toLowerCase());
    if (route) {
      await this.navigate(route, { params });
    } else {
      console.warn(`Page '${pageName}' not found in registry. Available pages:`, Array.from(this.pageRegistry.keys()));
      await this.handleNotFound(`/page/${pageName}`);
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
    // Filter out page parameter from query for param mode
    if (this.options.mode === 'param') {
      const filteredQuery = { ...query };
      delete filteredQuery[this.options.pageParam];
      query = filteredQuery;
    }
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
    let { handler } = route;

    // If handler is a class, instantiate it
    if (typeof handler === 'function' && handler.prototype && handler.prototype.render) {
      try {
        handler = new handler();
        
        // Wait for any async initialization to complete
        if (handler._initPromise && typeof handler._initPromise.then === 'function') {
          try {
            await handler._initPromise;
          } catch (initError) {
            console.error(`Async initialization failed during navigation for ${handler.constructor.name}:`, initError);
            await this.handleError(initError, route, params, query);
            return;
          }
        }
        
        // Update the route's handler to use the instance for future navigations
        route.handler = handler;
      } catch (error) {
        console.error(`Failed to instantiate page class during navigation:`, error);
        // Try to recover by showing error page
        await this.handleError(error, route, params, query);
        return;
      }
    }

    // Handler should be a Page instance or a simple function
    if (typeof handler === 'function' && !handler.render) {
      // Simple function handler
      await handler(params, query, this.container);
      return;
    }

    // Ensure we have a Page instance
    if (!handler || typeof handler.render !== 'function') {
      throw new Error(`Invalid route handler for ${route.path}`);
    }

    // Store previous page before switching
    this.previousPageInstance = this.currentPageInstance;

    // Fire before-change event
    this.firePageEvent('page:before-change', {
      previousPage: this.getPageInfo(this.previousPageInstance),
      incomingRoute: route.path,
      params,
      query
    });

    // Exit previous page
    if (this.previousPageInstance && this.previousPageInstance !== handler) {
      // Call onExit with error handling
      if (typeof this.previousPageInstance.onExit === 'function') {
        try {
          await this.previousPageInstance.onExit();
        } catch (error) {
          console.error(`Error in onExit for page ${this.previousPageInstance.pageName || 'unknown'}:`, error);
          // Continue with navigation despite error
        }
      }
      
      this.firePageEvent('page:deactivated', {
        page: this.getPageInfo(this.previousPageInstance)
      });

      // Clear the container
      const container = document.querySelector(this.container);
      if (container) {
        container.innerHTML = '';
      }
    }

    // Update current page instance
    this.currentPageInstance = handler;

    // Update params and query
    handler.onParams(params, query);

    // Enter new page with error handling
    if (typeof handler.onEnter === 'function') {
      try {
        await handler.onEnter();
      } catch (error) {
        console.error(`Error in onEnter for page ${handler.pageName || 'unknown'}:`, error);
        // Continue with render despite error
      }
    }

    // Force re-render
    handler.mounted = false;

    // Render the page with error handling
    try {
      await handler.render(this.container);
    } catch (error) {
      console.error(`Error rendering page ${handler.pageName || 'unknown'}:`, error);
      // Try to show error page
      await this.handleError(error, route, params, query);
      return;
    }

    this.firePageEvent('page:activated', {
      page: this.getPageInfo(handler)
    });

    // Fire changed event
    this.firePageEvent('page:changed', {
      previousPage: this.getPageInfo(this.previousPageInstance),
      currentPage: this.getPageInfo(this.currentPageInstance),
      params,
      query
    });
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
      const containerElement = document.querySelector(this.container);
      if (containerElement) {
        containerElement.innerHTML = `
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

    const containerElement = document.querySelector(this.container);
    if (containerElement) {
      containerElement.innerHTML = `
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
        keys.push(match.substring(1));
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
      const pathname = window.location.pathname;
      const base = this.options.base;

      // Handle exact base match (with or without trailing slash)
      if (pathname === base || pathname === base + '/') {
        return '/';
      }

      // If pathname starts with base, remove it
      if (pathname.startsWith(base)) {
        const remainingPath = pathname.substring(base.length);
        // Ensure we always return a path starting with /
        if (remainingPath === '' || remainingPath === '/') {
          return '/';
        }
        return remainingPath.startsWith('/') ? remainingPath : '/' + remainingPath;
      }

      return pathname || '/';
    } else if (this.options.mode === 'param') {
      const params = new URLSearchParams(window.location.search);
      const page = params.get(this.options.pageParam);
      if (!page || page === 'home') {
        return '/';
      }
      return page.startsWith('/') ? page : '/' + page;
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
    } else if (this.options.mode === 'param') {
      return window.location.search;
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
      // Ensure path starts with /
      const normalizedPath = path.startsWith('/') ? path : '/' + path;
      // Ensure base ends with / if it doesn't already, then combine
      const base = this.options.base.endsWith('/') ? this.options.base.slice(0, -1) : this.options.base;
      return base + normalizedPath;
    } else if (this.options.mode === 'param') {
      // Create URL with page parameter
      const url = new URL(window.location.href);
      const pageName = path === '/' ? 'home' : path.replace(/^\//, '');
      url.searchParams.set(this.options.pageParam, pageName);
      return url.toString();
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
    } else if (this.options.mode === 'param') {
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
    } else if (this.options.mode === 'param') {
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
   * Fire page event through global event bus
   * @param {string} eventName - Event name to fire
   * @param {object} data - Event data
   */
  firePageEvent(eventName, data) {
    // Use global MOJO event bus if available
    if (typeof window !== 'undefined' && window.MOJO && window.MOJO.eventBus) {
      window.MOJO.eventBus.emit(eventName, data);
    }

    // Also emit on router instance
    if (this.emit) {
      this.emit(eventName, data);
    }
  }

  /**
   * Get page info from page instance
   * @param {object} pageInstance - Page instance
   * @returns {object|null} Page information
   */
  getPageInfo(pageInstance) {
    if (!pageInstance) return null;

    return {
      name: pageInstance.pageName || pageInstance.constructor.name,
      route: pageInstance.route || '',
      icon: pageInstance.pageIcon || 'bi bi-file-text',
      displayName: pageInstance.displayName || pageInstance.pageName || pageInstance.constructor.name,
      description: pageInstance.pageDescription || '',
      instance: pageInstance
    };
  }

  /**
   * Cleanup current page instance
   */
  cleanup() {
    // Exit current page before cleanup
    if (this.currentPageInstance) {
      if (typeof this.currentPageInstance.onExit === 'function') {
        try {
          this.currentPageInstance.onExit();
        } catch (error) {
          console.error(`Error in cleanup onExit for page ${this.currentPageInstance.pageName || 'unknown'}:`, error);
          // Continue with cleanup despite error
        }
      }
    }

    if (this.currentPageInstance && typeof this.currentPageInstance.destroy === 'function') {
      this.currentPageInstance.destroy();
      this.currentPageInstance = null;
    }

    this.previousPageInstance = null;
  }
}

export default Router;
