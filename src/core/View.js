/**
 * View - Base class for all visual components in MOJO framework
 * Provides children support, lifecycle management, and event handling
 */

import Mustache from '../utils/mustache.js';

class View {
  constructor(options = {}) {
    // Core properties
    this.id = options.id || this.generateId();
    this.template = options.template || this.constructor.template || null;
    this.container = null;
    this.element = null;
    
    // Hierarchy
    this.parent = null;
    this.children = new Map();
    this.childOrder = [];
    
    // Data and state
    this.data = options.data || {};
    this.state = options.state || {};
    this.loading = false;
    this.rendered = false;
    this.mounted = false;
    this.destroyed = false;
    
    // Rendering loop protection
    this.isRendering = false;
    this.lastRenderTime = 0;
    this.renderCooldown = 100; // Minimum 100ms between renders
    this.renderCount = 0;
    this.maxRenderCount = 10; // Maximum renders before blocking
    
    // Configuration
    this.options = {
      autoRender: true,
      cacheTemplate: true,
      tagName: 'div',
      className: '',
      ...options
    };
    
    // Template cache
    this._templateCache = null;
    
    // Event system
    this.listeners = {};
    this.domListeners = [];
    
    // Lifecycle hooks
    this.hooks = {
      beforeInit: options.beforeInit || (() => {}),
      afterInit: options.afterInit || (() => {}),
      beforeRender: options.beforeRender || (() => {}),
      afterRender: options.afterRender || (() => {}),
      beforeMount: options.beforeMount || (() => {}),
      afterMount: options.afterMount || (() => {}),
      beforeDestroy: options.beforeDestroy || (() => {}),
      afterDestroy: options.afterDestroy || (() => {})
    };
    
    // Initialize
    this.init();
  }

  /**
   * Initialize the view
   */
  init() {
    if (this.destroyed) {
      throw new Error('Cannot initialize destroyed view');
    }
    
    // Call before init hook
    this.hooks.beforeInit.call(this);
    
    // Call overridable init method
    this.onInit();
    
    // Call after init hook
    this.hooks.afterInit.call(this);
    
    console.log(`View ${this.id} initialized`);
  }

  /**
   * Overridable initialization method
   */
  onInit() {
    // Default implementation - override in subclasses
  }

  /**
   * Render the view
   * @param {HTMLElement|string} container - Container element or selector
   * @returns {Promise<View>} Promise that resolves with this view
   */
  async render(container = null) {
    if (this.destroyed) {
      throw new Error('Cannot render destroyed view');
    }
    
    // Rendering loop protection
    const now = Date.now();
    if (this.isRendering) {
      console.warn(`View ${this.id}: Render already in progress, skipping`);
      return this;
    }
    
    if (now - this.lastRenderTime < this.renderCooldown) {
      console.warn(`View ${this.id}: Render called too quickly, cooldown active`);
      return this;
    }
    
    this.renderCount++;
    if (this.renderCount > this.maxRenderCount) {
      console.error(`View ${this.id}: Infinite render loop detected (${this.renderCount} renders), stopping`);
      return this;
    }
    
    this.isRendering = true;
    this.lastRenderTime = now;
    
    if (container) {
      this.setContainer(container);
    }
    
    if (!this.container) {
      this.isRendering = false;
      throw new Error('No container specified for view rendering');
    }

    this.loading = true;
    
    try {
      // Call before render hook
      await this.hooks.beforeRender.call(this);
      
      // Call overridable before render method
      await this.onBeforeRender();
      
      // Get template and render
      const html = await this.renderTemplate();
      console.log(`View ${this.id}: Rendered template HTML length:`, html.length);
      
      // Create or update element
      if (!this.element) {
        this.createElement();
      }
      
      // Set innerHTML
      this.element.innerHTML = html;
      
      // Verify element has content
      if (!this.element.innerHTML.trim()) {
        console.warn(`View ${this.id}: Element has no content after rendering`);
      }
      
      // Render children
      await this.renderChildren();
      
      // Mount to container if not already mounted
      if (!this.mounted) {
        await this.mount();
      }
      
      // Bind events
      this.bindEvents();
      
      // Mark as rendered
      this.rendered = true;
      
      // Verify rendering was successful
      if (this.element && this.container) {
        console.log(`View ${this.id}: Render completed successfully`);
      } else {
        console.error(`View ${this.id}: Render incomplete - element:`, !!this.element, 'container:', !!this.container);
      }
      
      // Call after render hook
      await this.hooks.afterRender.call(this);
      
      // Call overridable after render method
      await this.onAfterRender();
      
      return this;
      
    } catch (error) {
      this.showError(`Failed to render: ${error.message}`);
      
      // Clear loading screen on error
      if (typeof window !== 'undefined' && window.MOJO && window.MOJO.clearLoadingScreen) {
        window.MOJO.clearLoadingScreen();
      }
      
      throw error;
    } finally {
      this.loading = false;
      this.isRendering = false;
      
      // Reset render count after successful render
      if (this.renderCount < this.maxRenderCount) {
        setTimeout(() => {
          this.renderCount = Math.max(0, this.renderCount - 1);
        }, 1000);
      }
    }
  }

  /**
   * Mount view to container
   * @returns {Promise<View>} Promise that resolves with this view
   */
  async mount() {
    if (this.destroyed || this.mounted) {
      return this;
    }
    
    if (!this.element || !this.container) {
      throw new Error('Cannot mount without element and container');
    }
    
    // Call before mount hook
    await this.hooks.beforeMount.call(this);
    
    // Call overridable before mount method
    await this.onBeforeMount();
    
    // Verify container still exists and is in DOM
    if (!this.container || !document.body.contains(this.container)) {
      console.error(`View ${this.id}: Container missing or detached during mount`);
      throw new Error('Container is not available for mounting');
    }
    
    // Clear container if this is a page or if explicitly replacing
    if (this.constructor.name.includes('Page') || this.replaceContent) {
      console.log(`View ${this.id}: Clearing container content`);
      this.container.innerHTML = '';
    }
    
    // Verify element exists and has content
    if (!this.element) {
      console.error(`View ${this.id}: No element to mount`);
      throw new Error('No element available for mounting');
    }
    
    if (!this.element.innerHTML.trim()) {
      console.warn(`View ${this.id}: Mounting element with no content`);
    }
    
    // Append to container
    console.log(`View ${this.id}: Appending element to container`);
    this.container.appendChild(this.element);
    
    // Verify element was successfully added and is visible
    if (!document.body.contains(this.element)) {
      console.error(`View ${this.id}: Element not found in DOM after mounting`);
    } else {
      console.log(`View ${this.id}: Successfully mounted and visible in DOM`);
    }
    
    // Mark as mounted
    this.mounted = true;
    
    // Mount children
    await this.mountChildren();
    
    // Call after mount hook
    await this.hooks.afterMount.call(this);
    
    // Call overridable after mount method
    await this.onAfterMount();
    
    console.log(`View ${this.id} mounted`);
    
    return this;
  }

  /**
   * Unmount view from container
   * @returns {Promise<View>} Promise that resolves with this view
   */
  async unmount() {
    if (!this.mounted) {
      return this;
    }
    
    // Unmount children first
    await this.unmountChildren();
    
    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    // Unbind events
    this.unbindEvents();
    
    // Mark as unmounted
    this.mounted = false;
    
    console.log(`View ${this.id} unmounted`);
    
    return this;
  }

  /**
   * Destroy the view and clean up resources
   * @returns {Promise<View>} Promise that resolves with this view
   */
  async destroy() {
    if (this.destroyed) {
      return this;
    }
    
    // Call before destroy hook
    await this.hooks.beforeDestroy.call(this);
    
    // Call overridable before destroy method
    await this.onBeforeDestroy();
    
    // Destroy children first
    await this.destroyChildren();
    
    // Unmount if mounted
    if (this.mounted) {
      await this.unmount();
    }
    
    // Remove from parent
    if (this.parent) {
      this.parent.removeChild(this);
    }
    
    // Clear data
    this.data = {};
    this.state = {};
    
    // Clear template cache
    this._templateCache = null;
    
    // Clear listeners
    this.listeners = {};
    
    // Mark as destroyed
    this.destroyed = true;
    
    // Call after destroy hook
    await this.hooks.afterDestroy.call(this);
    
    // Call overridable after destroy method
    await this.onAfterDestroy();
    
    console.log(`View ${this.id} destroyed`);
    
    return this;
  }

  /**
   * Create the view's DOM element
   */
  createElement() {
    if (this.element) {
      return this.element;
    }
    
    this.element = document.createElement(this.options.tagName);
    this.element.id = this.id;
    
    if (this.options.className) {
      this.element.className = this.options.className;
    }
    
    // Store view reference on element
    this.element._mojoView = this;
    
    return this.element;
  }

  /**
   * Set container element
   * @param {HTMLElement|string} container - Container element or selector
   */
  setContainer(container) {
    if (typeof container === 'string') {
      this.container = document.querySelector(container);
      if (!this.container) {
        console.error(`Container not found: ${container}. Available elements:`, 
          Array.from(document.querySelectorAll('*')).map(el => el.id || el.className).filter(Boolean));
        throw new Error(`Container not found: ${container}`);
      }
    } else if (container instanceof HTMLElement) {
      this.container = container;
    } else {
      throw new Error('Invalid container type');
    }
    
    // Verify container is in DOM and visible
    if (!document.body.contains(this.container)) {
      console.warn(`Container ${container} is not attached to the DOM`);
    }
    
    console.log(`View ${this.id}: Container set to`, this.container);
  }

  /**
   * Add child view
   * @param {View} child - Child view to add
   * @param {string} key - Optional key for the child
   * @returns {View} This view for chaining
   */
  addChild(child, key = null) {
    if (!(child instanceof View)) {
      throw new Error('Child must be a View instance');
    }
    
    if (child.parent) {
      child.parent.removeChild(child);
    }
    
    const childKey = key || child.id;
    
    // Set parent relationship
    child.parent = this;
    
    // Store child
    this.children.set(childKey, child);
    this.childOrder.push(childKey);
    
    // If this view is already rendered, render the child
    if (this.rendered && this.element) {
      child.render(this.element);
    }
    
    return this;
  }

  /**
   * Remove child view
   * @param {View|string} child - Child view instance or key
   * @returns {View} This view for chaining
   */
  removeChild(child) {
    let childKey;
    let childView;
    
    if (typeof child === 'string') {
      childKey = child;
      childView = this.children.get(childKey);
    } else if (child instanceof View) {
      childView = child;
      // Find the key
      for (const [key, view] of this.children.entries()) {
        if (view === child) {
          childKey = key;
          break;
        }
      }
    }
    
    if (!childView || !childKey) {
      return this;
    }
    
    // Remove parent relationship
    childView.parent = null;
    
    // Remove from collections
    this.children.delete(childKey);
    const orderIndex = this.childOrder.indexOf(childKey);
    if (orderIndex !== -1) {
      this.childOrder.splice(orderIndex, 1);
    }
    
    // Destroy child
    childView.destroy();
    
    return this;
  }

  /**
   * Get child view by key
   * @param {string} key - Child key
   * @returns {View|undefined} Child view or undefined
   */
  getChild(key) {
    return this.children.get(key);
  }

  /**
   * Get all children as array
   * @returns {Array<View>} Array of child views
   */
  getChildren() {
    return this.childOrder.map(key => this.children.get(key));
  }

  /**
   * Render all children
   * @returns {Promise} Promise that resolves when all children are rendered
   */
  async renderChildren() {
    const renderPromises = this.childOrder.map(key => {
      const child = this.children.get(key);
      return child.render(this.element);
    });
    
    await Promise.all(renderPromises);
  }

  /**
   * Mount all children
   * @returns {Promise} Promise that resolves when all children are mounted
   */
  async mountChildren() {
    const mountPromises = this.childOrder.map(key => {
      const child = this.children.get(key);
      return child.mount();
    });
    
    await Promise.all(mountPromises);
  }

  /**
   * Unmount all children
   * @returns {Promise} Promise that resolves when all children are unmounted
   */
  async unmountChildren() {
    const unmountPromises = this.childOrder.map(key => {
      const child = this.children.get(key);
      return child.unmount();
    });
    
    await Promise.all(unmountPromises);
  }

  /**
   * Destroy all children
   * @returns {Promise} Promise that resolves when all children are destroyed
   */
  async destroyChildren() {
    const destroyPromises = this.childOrder.map(key => {
      const child = this.children.get(key);
      return child.destroy();
    });
    
    await Promise.all(destroyPromises);
    
    this.children.clear();
    this.childOrder = [];
  }

  /**
   * Render template with data
   * @returns {Promise<string>} Rendered HTML
   */
  async renderTemplate() {
    const templateContent = await this.getTemplate();
    
    if (!templateContent) {
      return '';
    }
    
    const viewData = await this.getViewData();
    const partials = this.getPartials();
    
    return Mustache.render(templateContent, viewData, partials);
  }

  /**
   * Get template content
   * @returns {Promise<string>} Template content
   */
  async getTemplate() {
    if (this._templateCache && this.options.cacheTemplate) {
      return this._templateCache;
    }

    let templateContent = '';

    if (typeof this.template === 'string') {
      if (this.template.includes('<') || this.template.includes('{')) {
        // Inline template
        templateContent = this.template;
      } else {
        // Template file path
        try {
          const response = await fetch(this.template);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          templateContent = await response.text();
        } catch (error) {
          console.error(`Failed to load template from ${this.template}:`, error);
          throw error;
        }
      }
    } else if (typeof this.template === 'function') {
      // Template generator function
      templateContent = await this.template(this.data, this.state);
    }

    if (this.options.cacheTemplate && templateContent) {
      this._templateCache = templateContent;
    }

    return templateContent;
  }

  /**
   * Get view data for template rendering
   * @returns {Promise<object>} View data object
   */
  async getViewData() {
    return {
      ...this.data,
      ...this.state,
      id: this.id,
      loading: this.loading,
      rendered: this.rendered,
      mounted: this.mounted
    };
  }

  /**
   * Get template partials
   * @returns {object} Object containing partial templates
   */
  getPartials() {
    return {};
  }

  /**
   * Update view data
   * @param {object} newData - New data to merge
   * @param {boolean} rerender - Whether to re-render
   * @returns {Promise<View>} Promise that resolves with this view
   */
  async updateData(newData, rerender = false) {
    Object.assign(this.data, newData);
    
    if (rerender && this.rendered) {
      await this.render();
    }
    
    return this;
  }

  /**
   * Update view state
   * @param {object} newState - New state to merge
   * @param {boolean} rerender - Whether to re-render
   * @returns {Promise<View>} Promise that resolves with this view
   */
  async updateState(newState, rerender = true) {
    Object.assign(this.state, newState);
    
    if (rerender && this.rendered) {
      await this.render();
    }
    
    return this;
  }

  /**
   * Bind DOM event listeners
   */
  bindEvents() {
    if (!this.element) return;
    
    // Remove existing listeners
    this.unbindEvents();
    
    // Bind click events with data-action
    const actionElements = this.element.querySelectorAll('[data-action]');
    actionElements.forEach(element => {
      const action = element.getAttribute('data-action');
      const handler = (event) => {
        event.preventDefault();
        this.handleAction(action, event, element);
      };
      
      element.addEventListener('click', handler);
      this.domListeners.push({ element, event: 'click', handler });
    });
    
    // Handle navigation - data-page takes precedence over href
    const navElements = this.element.querySelectorAll('[data-page], a[href]');
    navElements.forEach(element => {
      // Skip if it already has data-action (avoid conflicts)
      if (element.hasAttribute('data-action')) return;
      
      const handler = async (event) => {
        // Allow default browser behavior for special cases
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
          return; // Let browser handle Ctrl+click, middle-click, etc.
        }
        
        // Check for external links before preventing default
        if (element.tagName === 'A') {
          const href = element.getAttribute('href');
          if (this.isExternalLink(href) || element.hasAttribute('data-external')) {
            return; // Let browser handle external links normally
          }
        }
        
        event.preventDefault();
        
        // data-page takes precedence
        if (element.hasAttribute('data-page')) {
          await this.handlePageNavigation(element);
        } else {
          await this.handleHrefNavigation(element);
        }
      };
      
      element.addEventListener('click', handler);
      this.domListeners.push({ element, event: 'click', handler });
    });
    
    // Bind form submissions
    const forms = this.element.querySelectorAll('form[data-action]');
    forms.forEach(form => {
      const action = form.getAttribute('data-action');
      const handler = (event) => {
        event.preventDefault();
        this.handleAction(action, event, form);
      };
      
      form.addEventListener('submit', handler);
      this.domListeners.push({ element: form, event: 'submit', handler });
    });
  }

  /**
   * Handle data-page navigation with optional parameters
   * @param {HTMLElement} element - Element with data-page attribute
   */
  async handlePageNavigation(element) {
    const pageName = element.getAttribute('data-page');
    const paramsAttr = element.getAttribute('data-params');
    
    let params = {};
    if (paramsAttr) {
      try {
        params = JSON.parse(paramsAttr);
      } catch (error) {
        console.warn('Invalid JSON in data-params:', paramsAttr);
      }
    }
    
    const router = this.findRouter();
    if (router && typeof router.navigateToPage === 'function') {
      await router.navigateToPage(pageName, params);
    } else {
      console.error(`No router found for page navigation to '${pageName}'`);
    }
  }

  /**
   * Handle href-based navigation  
   * @param {HTMLElement} element - Anchor element with href
   */
  async handleHrefNavigation(element) {
    const href = element.getAttribute('href');
    
    // Skip if it's an external link or has data-external
    if (this.isExternalLink(href) || element.hasAttribute('data-external')) {
      return; // Let browser handle normally
    }
    
    const router = this.findRouter();
    if (router) {
      // Convert href to route path
      const routePath = this.hrefToRoutePath(href);
      
      // Check if this route exists
      if (router.routes && router.routes.has(routePath)) {
        await router.navigate(routePath);
      } else {
        console.warn(`Route not found: ${routePath}, allowing default navigation`);
        // Fallback to default navigation
        window.location.href = href;
      }
    } else {
      console.warn('No router found for navigation, using default behavior');
      window.location.href = href;
    }
  }

  /**
   * Check if a link is external (should not be intercepted)
   * @param {string} href - The href attribute value
   * @returns {boolean} True if external link
   */
  isExternalLink(href) {
    if (!href) return true;
    
    // Skip anchors, external protocols, mailto, tel, etc.
    return href.startsWith('#') || 
           href.startsWith('mailto:') || 
           href.startsWith('tel:') ||
           href.startsWith('http://') ||
           href.startsWith('https://') ||
           href.startsWith('//');
  }

  /**
   * Convert href to route path by removing base path
   * @param {string} href - The href attribute
   * @returns {string} Route path
   */
  hrefToRoutePath(href) {
    // Handle absolute paths
    if (href.startsWith('/')) {
      // Check if it's within our app's base path
      const router = this.findRouter();
      if (router && router.options && router.options.base) {
        const base = router.options.base;
        if (href.startsWith(base)) {
          return href.substring(base.length) || '/';
        }
      }
      return href;
    }
    
    // Handle relative paths
    return href.startsWith('./') ? href.substring(2) : href;
  }

  /**
   * Find available router instance
   * @returns {Object|null} Router instance
   */
  findRouter() {
    const routers = [
      window.MOJO?.router,
      window.app?.router,
      window.navigationApp?.router,
      window.sidebarApp?.router
    ];
    
    return routers.find(router => router && typeof router.navigate === 'function') || null;
  }

  /**
   * Unbind DOM event listeners
   */
  unbindEvents() {
    this.domListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.domListeners = [];
  }

  /**
   * Handle action dispatch
   * @param {string} action - Action name
   * @param {Event} event - DOM event
   * @param {HTMLElement} element - Source element
   */
  async handleAction(action, event, element) {
    const methodName = `onAction${this.capitalize(action)}`;
    
    if (typeof this[methodName] === 'function') {
      try {
        await this[methodName](event, element);
      } catch (error) {
        console.error(`Error in action ${action}:`, error);
        this.handleActionError(action, error, event, element);
      }
    } else {
      // Emit as event
      this.emit(`action:${action}`, { action, event, element });
    }
  }

  /**
   * Handle action errors
   * @param {string} action - Action name
   * @param {Error} error - Error object
   * @param {Event} event - DOM event
   * @param {HTMLElement} element - Source element
   */
  handleActionError(action, error, event, element) {
    console.error(`Action error in ${action}:`, error);
    this.showError(`Action failed: ${error.message}`);
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    console.error(`View ${this.id} error:`, message);
    
    // Use MOJO framework dialog if available
    if (typeof window !== 'undefined' && window.MOJO && window.MOJO.showError) {
      window.MOJO.showError(`View Error: ${message}`, {
        details: `View ID: ${this.id}`,
        technical: true
      });
    }
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    console.log(`View ${this.id} success:`, message);
    
    // Use MOJO framework dialog if available
    if (typeof window !== 'undefined' && window.MOJO && window.MOJO.showSuccess) {
      window.MOJO.showSuccess(message);
    }
  }

  /**
   * Show info message
   * @param {string} message - Info message
   */
  showInfo(message) {
    console.info(`View ${this.id} info:`, message);
    
    // Use MOJO framework dialog if available
    if (typeof window !== 'undefined' && window.MOJO && window.MOJO.showInfo) {
      window.MOJO.showInfo(message);
    }
  }

  /**
   * Show warning message
   * @param {string} message - Warning message
   */
  showWarning(message) {
    console.warn(`View ${this.id} warning:`, message);
    
    // Use MOJO framework dialog if available
    if (typeof window !== 'undefined' && window.MOJO && window.MOJO.showWarning) {
      window.MOJO.showWarning(message);
    }
  }

  // Lifecycle hooks - can be overridden in subclasses
  async onBeforeRender() {}
  async onAfterRender() {}
  async onBeforeMount() {}
  async onAfterMount() {}
  async onBeforeDestroy() {}
  async onAfterDestroy() {}

  // Event system
  
  /**
   * Emit custom event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback
   * @returns {View} This view for chaining
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this;
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback to remove
   * @returns {View} This view for chaining
   */
  off(event, callback) {
    if (!this.listeners[event]) {
      return this;
    }
    
    if (callback) {
      const index = this.listeners[event].indexOf(callback);
      if (index !== -1) {
        this.listeners[event].splice(index, 1);
        
        // Clean up empty arrays
        if (this.listeners[event].length === 0) {
          delete this.listeners[event];
        }
      }
    } else {
      delete this.listeners[event];
    }
    
    return this;
  }

  /**
   * Add one-time event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback
   * @returns {View} This view for chaining
   */
  once(event, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    return this.on(event, onceCallback);
  }

  // Utility methods
  
  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `view_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Capitalize first letter of string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Escape HTML characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return str;
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Find view by ID in hierarchy
   * @param {string} id - View ID to find
   * @returns {View|null} Found view or null
   */
  findById(id) {
    if (this.id === id) {
      return this;
    }
    
    for (const child of this.children.values()) {
      const found = child.findById(id);
      if (found) {
        return found;
      }
    }
    
    return null;
  }

  /**
   * Get view hierarchy as string for debugging
   * @param {number} indent - Indentation level
   * @returns {string} Hierarchy string
   */
  getHierarchy(indent = 0) {
    const spaces = '  '.repeat(indent);
    let result = `${spaces}${this.constructor.name}#${this.id}\n`;
    
    for (const child of this.children.values()) {
      result += child.getHierarchy(indent + 1);
    }
    
    return result;
  }

  /**
   * Static method to create view instance
   * @param {object} options - View options
   * @returns {View} New view instance
   */
  static create(options = {}) {
    return new this(options);
  }
}

export default View;