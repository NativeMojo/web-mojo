/**
 * Router - Simplified client-side routing for MOJO framework
 * Focuses purely on route matching and browser history management
 */

class Router {
  constructor(app, options = {}) {
    this.app = app; // Reference to WebApp instance
    this.routes = new Map(); // pattern -> { pageName, pattern, regex, keys }
    this.currentPath = null;
    
    // Configuration
    this.options = {
      mode: 'param', // 'history', 'hash', or 'param'
      base: '/',
      pageParam: 'page',
      defaultPage: 'home',
      ...options
    };
    
    // Guards
    this.guards = {
      beforeEach: [],
      afterEach: []
    };
    
    // State
    this.started = false;
    
    // Bind event handlers
    this.handlePopState = this.handlePopState.bind(this);
    this.handleHashChange = this.handleHashChange.bind(this);
  }
  
  /**
   * Start the router
   */
  start() {
    if (this.started) return;
    
    this.started = true;
    
    // Add event listeners based on mode
    if (this.options.mode === 'history') {
      window.addEventListener('popstate', this.handlePopState);
    } else if (this.options.mode === 'hash') {
      window.addEventListener('hashchange', this.handleHashChange);
    } else if (this.options.mode === 'param') {
      window.addEventListener('popstate', this.handlePopState);
    }
    
    // Handle initial route
    this.handleCurrentLocation();
    
    console.log(`Router started in ${this.options.mode} mode`);
  }
  
  /**
   * Stop the router
   */
  stop() {
    if (!this.started) return;
    
    this.started = false;
    window.removeEventListener('popstate', this.handlePopState);
    window.removeEventListener('hashchange', this.handleHashChange);
    
    console.log('Router stopped');
  }
  
  /**
   * Register a route with a page name
   * @param {string} pattern - Route pattern (e.g., '/user/:id')
   * @param {string} pageName - Name of the page to load
   */
  addRoute(pattern, pageName) {
    const { regex, keys } = this.patternToRegex(pattern);
    
    this.routes.set(pattern, {
      pageName,
      pattern,
      regex,
      keys
    });
    
    console.log(`Route registered: ${pattern} -> ${pageName}`);
    return this;
  }
  
  /**
   * Register a page name for data-page attribute support
   * @param {string} pageName - Page name
   * @param {string} route - Associated route
   */
  registerPageName(pageName, route) {
    this.routes.set(`@${pageName}`, route);
  }
  
  /**
   * Core navigation method - simplified to under 30 lines
   * @param {string} path - Path to navigate to
   * @param {object} options - Navigation options
   */
  async navigate(path, options = {}) {
    // 1. Match route
    const match = this.matchRoute(path);
    if (!match) {
      return this.handleNotFound(path);
    }
    
    // 2. Get or create page instance (cached)
    const page = this.app.getOrCreatePage(match.pageName);
    if (!page) {
      return this.handleError(`Page ${match.pageName} not found`);
    }
    
    // 3. Run guards
    if (!await this.runGuards(match, page)) {
      return false;
    }
    
    // 4. Transition pages
    await this.transitionToPage(page, match.params, match.query);
    
    // 5. Update browser history
    if (!options.silent) {
      this.updateHistory(path, options.replace);
    }
    
    // 6. Run after guards
    await this.runAfterGuards(match, page);
    
    this.currentPath = path;
    return true;
  }
  
  /**
   * Navigate to a page by name (for data-page support)
   * @param {string} pageName - Page name
   * @param {object} params - Route parameters
   * @param {object} options - Navigation options
   */
  async navigateToPage(pageName, params = {}, options = {}) {
    // Find route pattern for this page
    const route = this.routes.get(`@${pageName}`);
    if (!route) {
      // Try to find by iterating routes
      for (const [pattern, routeInfo] of this.routes) {
        if (routeInfo.pageName === pageName) {
          const path = this.buildPath(pattern, params);
          return this.navigate(path, options);
        }
      }
      console.error(`No route found for page: ${pageName}`);
      return false;
    }
    
    const path = this.buildPath(route, params);
    return this.navigate(path, options);
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
   * @param {number} delta - Number of entries to go
   */
  go(delta) {
    window.history.go(delta);
  }
  
  /**
   * Handle current browser location
   */
  async handleCurrentLocation() {
    const path = this.getCurrentPath();
    await this.navigate(path, { silent: true });
  }
  
  /**
   * Clean page transition
   * @param {Page} newPage - Page instance to transition to
   * @param {object} params - Route parameters
   * @param {object} query - Query parameters
   */
  async transitionToPage(newPage, params, query) {
    const oldPage = this.app.currentPage;
    
    // Exit old page
    if (oldPage && oldPage !== newPage) {
      try {
        await oldPage.onExit();
      } catch (error) {
        console.error(`Error in onExit for page ${oldPage.pageName}:`, error);
      }
    }
    
    // Update params (smart - only re-render if changed)
    await newPage.onParams(params, query);
    
    // Enter new page (only if different)
    if (oldPage !== newPage) {
      try {
        await newPage.onEnter();
      } catch (error) {
        console.error(`Error in onEnter for page ${newPage.pageName}:`, error);
      }
      
      // Show page through WebApp
      await this.app.showPage(newPage);
    }
  }
  
  /**
   * Match a path against registered routes
   * @param {string} path - Path to match
   * @returns {object|null} Match object with pageName, params, query
   */
  matchRoute(path) {
    // Parse query string
    const [pathname, queryString] = path.split('?');
    const query = this.parseQuery(queryString);
    
    // In param mode, extract page from query
    if (this.options.mode === 'param') {
      const pageName = query[this.options.pageParam] || this.options.defaultPage;
      delete query[this.options.pageParam];
      
      // Find route for this page
      for (const [_pattern, route] of this.routes) {
        if (route.pageName === pageName) {
          return {
            pageName,
            params: {},
            query,
            pattern: route.pattern
          };
        }
      }
      
      return null;
    }
    
    // Standard path matching
    const normalizedPath = this.normalizePath(pathname);
    
    for (const [pattern, route] of this.routes) {
      if (pattern.startsWith('@')) continue; // Skip page name entries
      
      const matches = normalizedPath.match(route.regex);
      if (matches) {
        const params = this.extractParams(matches, route.keys);
        return {
          pageName: route.pageName,
          params,
          query,
          pattern: route.pattern
        };
      }
    }
    
    return null;
  }
  
  /**
   * Convert route pattern to regex
   * @param {string} pattern - Route pattern
   * @returns {object} Object with regex and parameter keys
   */
  patternToRegex(pattern) {
    const keys = [];
    
    // Extract parameter names
    const regex = new RegExp(
      '^' + pattern
        .replace(/:[^\s/]+/g, (match) => {
          keys.push(match.substring(1));
          return '([^/]+)';
        })
        .replace(/\{([^}]+)\}/g, (match, key) => {
          keys.push(key);
          return '([^/]+)';
        })
        .replace(/\*/g, '.*') + '$'
    );
    
    return { regex, keys };
  }
  
  /**
   * Extract parameters from regex matches
   * @param {Array} matches - Regex matches
   * @param {Array} keys - Parameter keys
   * @returns {object} Parameters object
   */
  extractParams(matches, keys) {
    const params = {};
    keys.forEach((key, index) => {
      params[key] = decodeURIComponent(matches[index + 1] || '');
    });
    return params;
  }
  
  /**
   * Build path from pattern and parameters
   * @param {string} pattern - Route pattern
   * @param {object} params - Parameters
   * @returns {string} Built path
   */
  buildPath(pattern, params = {}) {
    let path = pattern;
    
    // Replace parameters
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, encodeURIComponent(value));
      path = path.replace(`{${key}}`, encodeURIComponent(value));
    });
    
    return path;
  }
  
  /**
   * Run route guards
   * @param {object} match - Route match object
   * @param {Page} page - Page instance
   * @returns {boolean} Whether to proceed with navigation
   */
  async runGuards(match, page) {
    // eslint-disable-next-line no-await-in-loop
    for (const guard of this.guards.beforeEach) {
      try {
        const result = await guard(match, page);
        if (result === false) {
          return false;
        }
      } catch (error) {
        console.error('Guard error:', error);
        return false;
      }
    }
    return true;
  }
  
  /**
   * Run after navigation guards
   * @param {object} match - Route match object
   * @param {Page} page - Page instance
   */
  async runAfterGuards(match, page) {
    // eslint-disable-next-line no-await-in-loop
    for (const guard of this.guards.afterEach) {
      try {
        await guard(match, page);
      } catch (error) {
        console.error('After guard error:', error);
      }
    }
  }
  
  /**
   * Add a before navigation guard
   * @param {function} guard - Guard function
   */
  addGuard(guard) {
    this.guards.beforeEach.push(guard);
    return this;
  }
  
  /**
   * Get current path based on router mode
   * @returns {string} Current path
   */
  getCurrentPath() {
    switch (this.options.mode) {
      case 'hash':
        return window.location.hash.slice(1) || '/';
      
      case 'param': {
        const url = new URL(window.location);
        const pageName = url.searchParams.get(this.options.pageParam) || this.options.defaultPage;
        return `/?${this.options.pageParam}=${pageName}`;
      }
      
      case 'history':
      default:
        return window.location.pathname + window.location.search;
    }
  }
  
  /**
   * Parse query string
   * @param {string} queryString - Query string
   * @returns {object} Parsed query object
   */
  parseQuery(queryString = '') {
    const query = {};
    if (!queryString) return query;
    
    const params = new URLSearchParams(queryString);
    for (const [key, value] of params) {
      query[key] = value;
    }
    
    return query;
  }
  
  /**
   * Update browser history
   * @param {string} path - Path to push/replace
   * @param {boolean} replace - Whether to replace current state
   */
  updateHistory(path, replace = false) {
    const method = replace ? 'replaceState' : 'pushState';
    
    switch (this.options.mode) {
      case 'hash':
        window.location.hash = path;
        break;
      
      case 'param': {
        const [, queryString] = path.split('?');
        const query = this.parseQuery(queryString);
        const pageName = query[this.options.pageParam] || this.options.defaultPage;
        
        const url = new URL(window.location);
        url.searchParams.set(this.options.pageParam, pageName);
        
        // Add other query params
        Object.entries(query).forEach(([key, value]) => {
          if (key !== this.options.pageParam) {
            url.searchParams.set(key, value);
          }
        });
        
        window.history[method](null, '', url.toString());
        break;
      }
      
      case 'history':
      default:
        window.history[method](null, '', path);
        break;
    }
  }
  
  /**
   * Normalize path
   * @param {string} path - Path to normalize
   * @returns {string} Normalized path
   */
  normalizePath(path) {
    // Remove trailing slash except for root
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    return path;
  }
  
  /**
   * Handle popstate event
   */
  handlePopState(_event) {
    this.handleCurrentLocation();
  }
  
  /**
   * Handle hashchange event
   */
  handleHashChange(_event) {
    this.handleCurrentLocation();
  }
  
  /**
   * Handle 404 not found
   * @param {string} path - Path that wasn't found
   */
  async handleNotFound(path) {
    console.warn(`Route not found: ${path}`);
    
    // Try to load 404 page
    const notFoundPage = this.app.getOrCreatePage('404');
    if (notFoundPage) {
      await this.transitionToPage(notFoundPage, {}, { path });
    } else {
      // Show error in app
      this.app.showError(`Page not found: ${path}`);
    }
    
    return false;
  }
  
  /**
   * Handle routing error
   * @param {string} message - Error message
   */
  async handleError(message) {
    console.error(`Router error: ${message}`);
    
    // Try to load error page
    const errorPage = this.app.getOrCreatePage('error');
    if (errorPage) {
      await this.transitionToPage(errorPage, {}, { error: message });
    } else {
      // Show error in app
      this.app.showError(message);
    }
    
    return false;
  }
  
  /**
   * Clean up router
   */
  cleanup() {
    this.stop();
    this.routes.clear();
    this.guards.beforeEach = [];
    this.guards.afterEach = [];
    this.currentPath = null;
    console.log('Router cleaned up');
  }
}

export default Router;