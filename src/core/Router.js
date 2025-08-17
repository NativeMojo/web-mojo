class Router {
  constructor(options = {}) {
    this.mode = options.mode || 'history'; // 'history' or 'params'
    this.basePath = options.basePath || '';
    this.defaultRoute = options.defaultRoute || 'home';
    this.routes = [];
    this.currentRoute = null;
    this.eventEmitter = options.eventEmitter || null; // WebApp.events
    
    this.boundHandlePopState = this.handlePopState.bind(this);
  }

  start() {
    // Listen for browser navigation
    window.addEventListener('popstate', this.boundHandlePopState);

    // Handle current location
    this.handleCurrentLocation();
  }

  stop() {
    window.removeEventListener('popstate', this.boundHandlePopState);
  }

  addRoute(pattern, pageName) {
    this.routes.push({
      pattern: this.normalizePattern(pattern),
      regex: this.patternToRegex(pattern),
      pageName,
      paramNames: this.extractParamNames(pattern)
    });
  }

  // Simple navigation - just one method needed
  async navigate(path, options = {}) {
    const { replace = false, state = null, trigger = true } = options;

    // Clean and normalize path to prevent double-encoding
    let cleanPath = path;

    // If in params mode and path looks like a full URL or already contains ?page=, clean it
    if (this.mode === 'params' && cleanPath.includes('?page=')) {
      const match = cleanPath.match(/\?page=([^&]+)/);
      if (match) {
        cleanPath = '/' + decodeURIComponent(match[1]);
      }
    }

    const normalizedPath = this.normalizePath(cleanPath);

    // Update browser history first
    this.updateHistory(normalizedPath, replace, state);

    // Handle the route change
    if (trigger) {
      await this.handleRouteChange(normalizedPath);
    }
  }

  // Browser navigation
  back() {
    window.history.back();
  }

  forward() {
    window.history.forward();
  }

  // Get current route info
  getCurrentRoute() {
    return this.currentRoute;
  }

  getCurrentPath() {
    if (this.mode === 'params') {
      const params = new URLSearchParams(window.location.search);
      let page = params.get('page');
      
      // Use defaultRoute if no page parameter
      if (!page) {
        page = this.defaultRoute;
      }
      
      // Ensure page starts with / to match route patterns
      if (page !== '/' && !page.startsWith('/')) {
        page = `/${page}`;
      }
      
      return page;
    } else {
      let path = window.location.pathname.replace(new RegExp(`^${this.basePath}`), '') || '/';
      
      // Use defaultRoute if we're at root
      if (path === '/') {
        path = `/${this.defaultRoute}`;
      }
      
      return path;
    }
  }

  // Private methods
  handlePopState(_event) {
    this.handleCurrentLocation();
  }

  async handleCurrentLocation() {
    const path = this.getCurrentPath();
    await this.handleRouteChange(path);
  }

  async handleRouteChange(path) {
    let route = this.matchRoute(path);
    
    // If no route matched and we're not already on default route, try default route
    if (!route && path !== `/${this.defaultRoute}`) {
      const defaultPath = `/${this.defaultRoute}`;
      route = this.matchRoute(defaultPath);
      
      if (route) {
        // Navigate to default route
        this.updateHistory(defaultPath, true, null);
        path = defaultPath;
      }
    }
    
    if (route) {
      this.currentRoute = route;
      
      // Emit route change event for Sidebar and other listeners
      if (this.eventEmitter) {
        this.eventEmitter.emit('route:changed', {
          path,
          pageName: route.pageName,
          params: route.params,
          query: route.query,
          route: route
        });
      }
      
      // Return route info for WebApp to handle
      return route;
    } else {
      // Emit not found event
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
      // Clean path - remove any existing ?page= format to prevent double-encoding
      let cleanPath = path;

      // If path contains ?page=, extract just the page value
      if (cleanPath.includes('?page=')) {
        const match = cleanPath.match(/\?page=([^&]+)/);
        if (match) {
          cleanPath = '/' + decodeURIComponent(match[1]);
        }
      }

      // Remove leading slash for page parameter (keep it for pattern matching)
      const pageValue = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath;

      // Build URL with page parameter
      const currentUrl = new URL(window.location.origin + window.location.pathname);
      currentUrl.searchParams.set('page', pageValue);
      url = currentUrl.toString();
    } else {
      // History mode - use full path
      url = `${window.location.origin}${this.basePath}${path}`;
    }

    if (replace) {
      window.history.replaceState(state, '', url);
    } else {
      window.history.pushState(state, '', url);
    }
  }

  // Route pattern utilities
  patternToRegex(pattern) {
    // Convert /users/:id to /users/([^/]+)
    // Handle optional parameters like /:id? -> (?:/([^/]+))?
    let regexPattern = pattern
      .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') // Escape regex chars
      .replace(/\/:([^/?]+)\?/g, '(?:/([^/]+))?') // Optional params /:id? -> (?:/([^/]+))?
      .replace(/:([^/]+)/g, '([^/]+)'); // Required params :id

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
    const params = new URLSearchParams(window.location.search);
    const query = {};

    // Don't include the 'page' parameter in params mode
    for (const [key, value] of params) {
      if (this.mode !== 'params' || key !== 'page') {
        query[key] = value;
      }
    }

    return query;
  }

  // Utility method to build URLs
  buildUrl(path, query = {}) {
    const queryString = Object.keys(query).length > 0
      ? '?' + new URLSearchParams(query).toString()
      : '';

    if (this.mode === 'params') {
      const currentUrl = new URL(window.location);
      currentUrl.searchParams.set('page', path);
      // Add additional query params
      Object.keys(query).forEach(key => {
        currentUrl.searchParams.set(key, query[key]);
      });
      return currentUrl.toString();
    } else {
      return `${this.basePath}${path}${queryString}`;
    }
  }

  /**
   * Update URL parameters without triggering navigation
   * @param {object} params - Parameters to update in URL
   * @param {object} options - Options like { replace: true }
   */
  updateUrl(params = {}, options = {}) {
    const { replace = false } = options;
    
    if (this.mode === 'params') {
      // In params mode, update query parameters
      const currentUrl = new URL(window.location);
      
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
        window.history.replaceState(null, '', url);
      } else {
        window.history.pushState(null, '', url);
      }
    } else {
      // In history mode, update query parameters on current path
      const currentUrl = new URL(window.location);
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          currentUrl.searchParams.set(key, String(value));
        } else {
          currentUrl.searchParams.delete(key);
        }
      });
      
      const url = currentUrl.toString();
      if (replace) {
        window.history.replaceState(null, '', url);
      } else {
        window.history.pushState(null, '', url);
      }
    }
  }

  // Universal route converter - handles any input format and converts to current mode
  convertRoute(route) {
    if (!route) {
      return this.mode === 'params' ? `?page=${this.defaultRoute}` : `/${this.defaultRoute}`;
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
      const pageValue = cleanPath === '/' ? this.defaultRoute : cleanPath.substring(1);
      return `?page=${pageValue}`;
    } else {
      // Return /path format for history mode
      return cleanPath === '/' ? `/${this.defaultRoute}` : cleanPath;
    }
  }
}

export default Router;
