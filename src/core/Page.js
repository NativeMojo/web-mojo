/**
 * Page - Extends View with routing capabilities for MOJO framework
 * Handles URL routing, parameters, and page-specific actions
 */

import View from './View.js';

class Page extends View {
  constructor(options = {}) {
    // Set default tag name for pages
    options.tagName = options.tagName || 'main';
    options.className = options.className || 'mojo-page';
    
    // Set page ID based on page name
    const pageName = options.page_name || '';
    if (pageName && !options.id) {
      options.id = 'page_' + pageName.toLowerCase().replace(/\s+/g, '_');
    }
    
    super(options);
    
    // Core page properties from design doc
    this.page_name = options.page_name || this.constructor.page_name || '';
    this.route = options.route || this.constructor.route || '';
    
    // Set page ID if not already set and we have a page_name from constructor
    if (!this.id && this.constructor.page_name && !options.page_name) {
      this.id = 'page_' + this.constructor.page_name.toLowerCase().replace(/\s+/g, '_');
    }
    
    // Page metadata for event system
    this.pageIcon = options.pageIcon || this.constructor.pageIcon || 'bi bi-file-text';
    this.displayName = options.displayName || this.constructor.displayName || this.page_name || '';
    this.pageDescription = options.pageDescription || this.constructor.pageDescription || '';
    
    // Routing state
    this.params = {};
    this.query = {};
    this.matched = false;
    this.isActive = false;
    
    // Page-specific options
    this.pageOptions = {
      title: options.title || this.page_name || 'Untitled Page',
      description: options.description || '',
      requiresAuth: options.requiresAuth || false,
      ...options.pageOptions
    };
    
    console.log(`Page ${this.page_name} constructed with route: ${this.route}`);
  }

  /**
   * Initialize page - called during View construction
   * Calls the design doc's on_init() method
   */
  onInit() {
    super.onInit();
    
    // Call design doc lifecycle method
    this.on_init();
  }

  /**
   * Design doc lifecycle method - override in subclasses
   */
  on_init() {
    console.log(`Initializing page: ${this.page_name}`);
  }

  /**
   * Handle route parameters - from design doc
   * @param {object} params - Route parameters
   * @param {object} query - Query string parameters  
   */
  on_params(params = {}, query = {}) {
    this.params = params;
    this.query = query;
    
    console.log(`Page ${this.page_name} received params:`, params, 'query:', query);
    
    // Update page data with params and query
    this.updateData({
      ...this.data,
      params: this.params,
      query: this.query
    });
  }

  /**
   * Called when page becomes active
   * Override in subclasses for custom activation logic
   */
  async onActivate() {
    this.isActive = true;
    
    // Set page title if provided
    if (this.pageOptions && this.pageOptions.title && typeof document !== 'undefined') {
      document.title = this.pageOptions.title;
    }
    
    // Emit activation event
    this.emit('activated', { 
      page: this.getMetadata() 
    });
    
    console.log(`Page ${this.page_name} activated`);
  }

  /**
   * Called when page becomes inactive
   * Override in subclasses for cleanup logic
   */
  async onDeactivate() {
    this.isActive = false;
    
    // Emit deactivation event
    this.emit('deactivated', { 
      page: this.getMetadata() 
    });
    
    console.log(`Page ${this.page_name} deactivated`);
  }

  /**
   * Get page metadata for display and events
   * @returns {object} Page metadata
   */
  getMetadata() {
    return {
      name: this.page_name,
      displayName: this.displayName || this.page_name,
      icon: this.pageIcon,
      description: this.pageDescription,
      route: this.route,
      isActive: this.isActive
    };
  }

  /**
   * Handle hello action - example from design doc
   */
  async on_action_hello() {
    console.log(`Hello action triggered on page: ${this.page_name}`);
    this.showSuccess('Hello from ' + this.page_name);
  }

  /**
   * Handle default action - fallback from design doc  
   */
  async on_action_default() {
    console.log(`Default action triggered on page: ${this.page_name}`);
  }

  /**
   * Navigate to another page
   * @param {string} route - Route to navigate to
   * @param {object} params - Route parameters
   * @param {object} options - Navigation options
   */
  navigate(route, params = {}, options = {}) {
    // Use global MOJO router if available
    if (typeof window !== 'undefined' && window.MOJO?.router) {
      return window.MOJO.router.navigate(route, { params, ...options });
    }
    
    // Fallback to manual navigation
    const url = this.buildUrl(route, params);
    
    if (options.replace) {
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
  }

  /**
   * Build URL with parameters
   * @param {string} route - Route pattern
   * @param {object} params - Parameters
   * @returns {string} Complete URL
   */
  buildUrl(route, params = {}) {
    let url = route;
    
    // Replace route parameters like :id with actual values
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, encodeURIComponent(value));
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    });
    
    return url;
  }

  /**
   * Go back in browser history
   */
  goBack() {
    if (typeof window !== 'undefined' && window.history) {
      window.history.back();
    }
  }

  /**
   * Go forward in browser history
   */
  goForward() {
    if (typeof window !== 'undefined' && window.history) {
      window.history.forward();
    }
  }

  /**
   * Reload the current page
   */
  reload() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  /**
   * Check if this page matches a route
   * @param {string} path - Current path
   * @returns {boolean|object} False if no match, or match result with params
   */
  matchRoute(path) {
    if (!this.route) {
      return false;
    }
    
    const regex = this.routeToRegex(this.route);
    const matches = path.match(regex);
    
    if (!matches) {
      return false;
    }
    
    // Extract parameters
    const params = {};
    const paramNames = this.extractParamNames(this.route);
    
    paramNames.forEach((name, index) => {
      params[name] = matches[index + 1];
    });
    
    return {
      route: this.route,
      params,
      page: this
    };
  }

  /**
   * Convert route pattern to regex
   * @param {string} route - Route pattern
   * @returns {RegExp} Regex for matching
   */
  routeToRegex(route) {
    // Escape special regex characters except parameter markers
    let pattern = route
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\:\w+/g, '([^/]+)')  // :param -> capturing group
      .replace(/\\\{(\w+)\\\}/g, '([^/]+)'); // {param} -> capturing group
    
    return new RegExp(`^${pattern}$`);
  }

  /**
   * Extract parameter names from route
   * @param {string} route - Route pattern
   * @returns {Array<string>} Parameter names
   */
  extractParamNames(route) {
    const params = [];
    
    // Match :param patterns
    const colonParams = route.match(/:(\w+)/g);
    if (colonParams) {
      colonParams.forEach(param => {
        params.push(param.substring(1)); // Remove the ':'
      });
    }
    
    // Match {param} patterns  
    const braceParams = route.match(/\{(\w+)\}/g);
    if (braceParams) {
      braceParams.forEach(param => {
        params.push(param.substring(1, param.length - 1)); // Remove { }
      });
    }
    
    return params;
  }

  /**
   * Set page metadata
   * @param {object} meta - Metadata object
   */
  setMeta(meta = {}) {
    if (typeof document === 'undefined') {
      return;
    }
    
    // Set title
    if (meta.title) {
      document.title = meta.title;
      this.pageOptions.title = meta.title;
    }
    
    // Set description
    if (meta.description) {
      let descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement('meta');
        descMeta.name = 'description';
        document.head.appendChild(descMeta);
      }
      descMeta.content = meta.description;
      this.pageOptions.description = meta.description;
    }
    
    // Set other meta tags
    Object.entries(meta).forEach(([key, value]) => {
      if (key !== 'title' && key !== 'description') {
        let metaEl = document.querySelector(`meta[name="${key}"]`);
        if (!metaEl) {
          metaEl = document.createElement('meta');
          metaEl.name = key;
          document.head.appendChild(metaEl);
        }
        metaEl.content = value;
      }
    });
  }

  /**
   * Override View's getViewData to include page-specific data
   * @returns {Promise<object>} View data object
   */
  async getViewData() {
    const baseData = await super.getViewData();
    
    return {
      ...baseData,
      page_name: this.page_name,
      route: this.route,
      params: this.params,
      query: this.query,
      title: this.pageOptions.title,
      description: this.pageOptions.description,
      matched: this.matched
    };
  }

  /**
   * Handle action dispatch - extends View's action handling
   * @param {string} action - Action name  
   * @param {Event} event - DOM event
   * @param {HTMLElement} element - Source element
   */
  async handleAction(action, event, element) {
    // First try page-specific action handlers using design doc naming
    const pageMethodName = `on_action_${action}`;
    
    if (typeof this[pageMethodName] === 'function') {
      try {
        await this[pageMethodName](event, element);
        return;
      } catch (error) {
        console.error(`Error in page action ${action}:`, error);
        this.handleActionError(action, error, event, element);
        return;
      }
    }
    
    // Fallback to View's action handling
    await super.handleAction(action, event, element);
  }

  /**
   * Show error message with page context
   * @param {string} message - Error message
   */
  showError(message) {
    super.showError(message);
    
    // Page-specific error display can be implemented here
    if (this.element) {
      // Example: Add error to page
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger alert-dismissible fade show';
      errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;
      
      // Insert at top of page
      this.element.insertBefore(errorDiv, this.element.firstChild);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 5000);
    }
  }

  /**
   * Show success message with page context
   * @param {string} message - Success message
   */
  showSuccess(message) {
    super.showSuccess(message);
    
    // Page-specific success display
    if (this.element) {
      const successDiv = document.createElement('div');
      successDiv.className = 'alert alert-success alert-dismissible fade show';
      successDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;
      
      // Insert at top of page
      this.element.insertBefore(successDiv, this.element.firstChild);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (successDiv.parentNode) {
          successDiv.parentNode.removeChild(successDiv);
        }
      }, 3000);
    }
  }

  /**
   * Page-specific before render hook
   */
  async onBeforeRender() {
    await super.onBeforeRender();
    
    // Set page metadata before rendering
    this.setMeta({
      title: this.pageOptions.title,
      description: this.pageOptions.description
    });
  }

  /**
   * Page-specific after mount hook
   */
  async onAfterMount() {
    await super.onAfterMount();
    
    // Add page-specific class to body
    if (typeof document !== 'undefined' && this.page_name) {
      document.body.classList.add(`page-${this.page_name.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }

  /**
   * Page-specific before destroy hook
   */
  async onBeforeDestroy() {
    await super.onBeforeDestroy();
    
    // Remove page-specific class from body
    if (typeof document !== 'undefined' && this.page_name) {
      document.body.classList.remove(`page-${this.page_name.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }

  /**
   * Static method to create page with route registration
   * @param {object} options - Page options
   * @returns {Page} New page instance
   */
  static create(options = {}) {
    const page = new this(options);
    
    // Auto-register with global router if available
    if (typeof window !== 'undefined' && window.MOJO?.router && page.route) {
      window.MOJO.router.addRoute(page.route, page);
    }
    
    return page;
  }

  /**
   * Static method to define a page class with metadata
   * @param {object} definition - Page class definition
   * @returns {class} Page class
   */
  static define(definition) {
    class DefinedPage extends Page {
      constructor(options = {}) {
        super({
          ...definition,
          ...options
        });
      }
    }
    
    // Copy static properties
    DefinedPage.template = definition.template;
    DefinedPage.page_name = definition.page_name;
    DefinedPage.route = definition.route;
    
    return DefinedPage;
  }
}

export default Page;