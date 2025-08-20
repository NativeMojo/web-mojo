class Router {
  constructor(options = {}) {
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

  async navigate(path, options = {}) {
    const { replace = false, state = null, trigger = true } = options;

    // Parse input to extract page name and query parameters
    const { pageName, queryParams } = this.parseInput(path);

    // Update browser URL
    this.updateBrowserUrl(pageName, queryParams, replace, state);

    // Handle the route change
    if (trigger) {
      await this.handleRouteChange(pageName, queryParams);
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
    const { pageName, queryParams } = this.parseCurrentUrl();
    return this.buildPublicUrl(pageName, queryParams);
  }

  // Private methods
  handlePopState(_event) {
    this.handleCurrentLocation();
  }

  async handleCurrentLocation() {
    const { pageName, queryParams } = this.parseCurrentUrl();
    await this.handleRouteChange(pageName, queryParams);
  }

  async handleRouteChange(pageName, queryParams) {
    // Convert page name to route path for matching
    const routePath = '/' + pageName;
    const route = this.matchRoute(routePath);

    // Build public URL for events
    const publicUrl = this.buildPublicUrl(pageName, queryParams);

    // If no route matched, emit 404
    if (!route) {
      console.log('No route matched for page:', pageName);
      if (this.eventEmitter) {
        this.eventEmitter.emit('route:notfound', { path: publicUrl });
      }
      return null;
    }

    // Route was found, process it
    this.currentRoute = route;

    // Emit route change event
    if (this.eventEmitter) {
      this.eventEmitter.emit('route:changed', {
        path: publicUrl,
        pageName: route.pageName,
        params: route.params,
        query: queryParams,
        route: route
      });
    }

    // Return route info for WebApp to handle
    return route;
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
          path
        };
      }
    }
    return null;
  }

  // Parse any input format and extract page name + query params
  parseInput(input) {
    let pageName = this.defaultRoute;
    let queryParams = {};

    if (!input) {
      return { pageName, queryParams };
    }

    try {
      // First, check if input contains search params (regardless of format)
      if (input.includes('?')) {
        const [pathPart, queryPart] = input.split('?', 2);
        const urlParams = new URLSearchParams(queryPart);
        
        // If page parameter exists in search params, use it
        if (urlParams.has('page')) {
          pageName = urlParams.get('page') || this.defaultRoute;
          
          // Get all other parameters
          for (const [key, value] of urlParams) {
            if (key !== 'page') {
              queryParams[key] = value;
            }
          }
        } else {
          // No page parameter in search params, extract from path part
          if (pathPart.startsWith('/')) {
            pageName = pathPart.substring(1) || this.defaultRoute;
          } else {
            pageName = pathPart || this.defaultRoute;
          }
          
          // Still collect query parameters
          for (const [key, value] of urlParams) {
            queryParams[key] = value;
          }
        }
      } else if (input.startsWith('/')) {
        // Input: "/admin" (no query params)
        pageName = input.substring(1) || this.defaultRoute;
      } else {
        // Input: "admin" (plain page name)
        pageName = input;
      }
    } catch (error) {
      console.warn('Failed to parse input:', input, error);
      pageName = this.defaultRoute;
      queryParams = {};
    }

    return { pageName, queryParams };
  }

  // Parse current browser URL
  parseCurrentUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageName = urlParams.get('page') || this.defaultRoute;

    const queryParams = {};
    for (const [key, value] of urlParams) {
      if (key !== 'page') {
        queryParams[key] = value;
      }
    }

    return { pageName, queryParams };
  }

  // Build public URL format: ?page=admin&group=123
  buildPublicUrl(pageName, queryParams = {}) {
    const urlParams = new URLSearchParams();
    urlParams.set('page', pageName);

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        urlParams.set(key, String(value));
      }
    });

    return '?' + urlParams.toString();
  }

  // Update browser URL
  updateBrowserUrl(pageName, queryParams, replace, state) {
    const currentUrl = new URL(window.location.origin + window.location.pathname);
    currentUrl.searchParams.set('page', pageName);

    // Add all query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        currentUrl.searchParams.set(key, String(value));
      }
    });

    const url = currentUrl.toString();

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

  /**
   * Update URL parameters without triggering navigation
   * @param {object} params - Parameters to update in URL
   * @param {object} options - Options like { replace: true }
   */
  updateUrl(params = {}, options = {}) {
    const { replace = false } = options;

    const { pageName } = this.parseCurrentUrl();
    this.updateBrowserUrl(pageName, params, replace);
  }

  /**
   * Build URL for given page and query parameters
   */
  buildUrl(page, query = {}) {
    return this.buildPublicUrl(page, query);
  }

  /**
   * Check if two routes match (ignoring query parameters)
   * @param {string} route1 - First route in any format ("/admin", "?page=admin", "admin")
   * @param {string} route2 - Second route in any format
   * @returns {boolean} - True if routes point to the same page
   */
  doRoutesMatch(route1, route2) {
    if (!route1 || !route2) return false;

    // Parse both routes to extract page names
    const { pageName: pageName1 } = this.parseInput(route1);
    const { pageName: pageName2 } = this.parseInput(route2);

    // Compare normalized page names
    return pageName1 === pageName2;
  }
}

export default Router;
