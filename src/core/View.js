/**
 * View - Base class for all visual components in MOJO framework
 *
 * Core Features:
 * - Parent-child hierarchy with automatic container resolution
 * - Model binding with automatic re-rendering on changes
 * - Lifecycle hooks: onInit, onBeforeRender, onAfterRender, onBeforeMount, onAfterMount, onBeforeDestroy
 * - Event handling with action system
 * - Template rendering with Mustache.js
 * - Built-in event system via EventEmitter mixin
 *
 * Event System:
 * - Uses EventEmitter mixin for instance-level events (emit, on, off, once)
 * - Automatically emits lifecycle events during render, mount, unmount, destroy
 * - Custom events can be emitted for component-specific logic
 *
 * Standard Events:
 * - 'render' - Emitted after view renders
 * - 'mount' - Emitted after view mounts to DOM
 * - 'unmount' - Emitted after view unmounts from DOM
 * - 'destroy' - Emitted when view is destroyed
 *
 * Container Resolution:
 * - If no parent: searches for element with view's ID in document.body, or uses body as container
 * - If has parent: searches for element with view's ID in parent's element, or appends to parent
 *
 * Model Support:
 * - setModel(model) binds a model to the view
 * - Automatically re-renders when model fires 'change' event
 * - Model data is merged into template data
 *
 * Parent-Child Relationships:
 * - addChild(view) establishes parent-child relationship
 * - Children have access to parent via this.parent
 * - Parent renders and mounts children automatically
 * - Children look for placeholder elements with their ID in parent's DOM
 *
 * @example
 * // Basic view with model
 * const view = new View({
 *   id: 'my-view',
 *   template: '<div>{{name}}</div>'
 * });
 * view.setModel(myModel);
 * view.render(); // Will find #my-view in body or append to body
 *
 * @example
 * // Parent-child views
 * const parent = new ParentView({ id: 'parent' });
 * const child = new ChildView({ id: 'child' });
 * parent.addChild(child);
 * parent.render(); // Parent renders, then renders and mounts child
 *
 * @example
 * // Using view events
 * const view = new MyView();
 * view.on('render', (view) => {
 *   console.log('View rendered');
 *   initializeWidgets(view.element);
 * });
 * view.on('destroy', (view) => {
 *   cleanup();
 * });
 */

import Mustache from '../utils/mustache.js';
if (typeof window !== 'undefined') {
  window.Mustache = Mustache;
}
import MOJOUtils from '../utils/MOJOUtils.js';

/*!
 * MOJO Framework
 * Copyright (c) 2024 MOJO Framework Team
 * Licensed under MIT License
 */

class View {
  constructor(options = {}) {
    // Core properties
    this.id = options.id || this.generateId();
    this.template = options.template || options.templateUrl || this.constructor.template || null;
    this.container = null;
    this.element = null;

    // Hierarchy
    this.parent = null;
    this.children = new Map();
    this.childOrder = [];

    // Data and state
    this.data = options.data || {};
    this.state = options.state || {};
    this.model = null;
    this.modelListener = null;
    this.loading = false;
    this.rendered = false;
    this.mounted = false;
    this.destroyed = false;

    // Rendering loop protection
    this.isRendering = false;
    this.lastRenderTime = 0;

    // Debug mode
    this.debug = options.debug || false;

    // Configuration
    this.options = {
      autoRender: true,
      cacheTemplate: true,
      tagName: 'div',
      className: '',
      renderCooldown: 0, // Set to > 0 to enable render throttling (in ms)
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

    // Flag to track if view has been initialized
    this._initialized = false;

    // Do basic setup but defer full initialization until render
    if (!this.id) {
      this.id = this.generateId();
    }
  }

  /**
   * Initialize the view
   */
  init() {
    if (this.destroyed) {
      throw new Error('Cannot initialize destroyed view');
    }

    // Prevent duplicate initialization
    if (this._initialized) {
      return;
    }

    // Mark as initialized
    this._initialized = true;

    // // Call before init hook
    // this.hooks.beforeInit.call(this);

    // // Call overridable init method - handle async errors
    // try {
    //   const result = this.onInit();
    //   // If onInit returns a promise, catch any errors
    //   if (result && typeof result.then === 'function') {
    //     result.catch(error => {
    //       console.error(`Error in async onInit for ${this.constructor.name}:`, error);
    //       console.error('View initialization continuing despite error');
    //     });
    //   }
    // } catch (error) {
    //   // Handle synchronous errors
    //   console.error(`Error in onInit for ${this.constructor.name}:`, error);
    //   console.error('View initialization continuing despite error');
    // }

    // // Call after init hook
    // this.hooks.afterInit.call(this);

    if (this.debug) {
      console.log(`View ${this.id} initialized`);
    }
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

    // Optional render throttling
    if (this.options.renderCooldown > 0 && now - this.lastRenderTime < this.options.renderCooldown) {
      console.warn(`View ${this.id}: Render called too quickly, cooldown active`);
      return this;
    }



    this.isRendering = true;
    this.lastRenderTime = now;

    if (container) {
      this.setContainer(container);
    }

    // Discover container if not set
    if (!this.container) {
      this.discoverContainer();
    }

    this.loading = true;
    console.log(`View ${this.id}: Rendering`);
    if (window.MOJO && MOJO.debug) {
        await this._render()
        this.loading = false;
        this.isRendering = false;
    } else {
        try {
          await this._render()
          return this;
        } catch (error) {
          this.showError(`Failed to render: ${error.message}`);

          // Clear loading screen on error
          if (typeof window !== 'undefined' && window.MOJO && window.MOJO.clearLoadingScreen) {
            window.MOJO.clearLoadingScreen();
          }

          // throw error;
        } finally {
          this.loading = false;
          this.isRendering = false;
        }
    }


  }

  async _render() {
      // Call before render hook
      await this.hooks.beforeRender.call(this);

      // Call overridable before render method
      await this._onBeforeRender();

      // Create element if it doesn't exist
      if (!this.element) {
        this.createElement();
      }

      // Render template into element FIRST (creates placeholders)
      const html = await this.renderTemplate();

      // Set innerHTML
      this.element.innerHTML = html;

      // Mount to container so we're in the DOM
      if (!this.mounted) {
        await this.mount();
      }

      // Now render children - they can find their placeholders in our DOM
      await this.renderChildren();

      // Bind events
      this.bindEvents();

      // Mark as rendered
      this.rendered = true;

      // Call after render hook
      await this.hooks.afterRender.call(this);

      // Call overridable after render method
      await this.onAfterRender();

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
        console.error('Cannot mount without element and container');
      // throw new Error('Cannot mount without element and container');
      return this;
    }

    // Call before mount hook
    await this.hooks.beforeMount.call(this);

    // Call overridable before mount method
    await this.onBeforeMount();

    // Verify container still exists and is in DOM
    if (!this.container || !document.body.contains(this.container)) {
      console.error(`View ${this.id}: Container missing or detached during mount`);
      // throw new Error('Container is not available for mounting');
        return this;
    }

    // Clear container if this is a page or if explicitly replacing
    if (this.constructor.name.includes('Page') || this.replaceContent) {
      if (this.debug) {
        console.log(`View ${this.id}: Clearing container content`);
      }
      this.container.innerHTML = '';
    }

    // Verify element exists
    if (!this.element) {
      console.error(`View ${this.id}: No element to mount`);
      // throw new Error('No element available for mounting');
        return this;
    }

    // Check if we should look for a placeholder or just append
    const placeholder = this.container.querySelector(`#${this.id}`);
    if (placeholder) {
      // Replace the placeholder with our element
      placeholder.replaceWith(this.element);
      if (this.debug) {
        console.log(`View ${this.id}: Replaced placeholder in container`);
      }
    } else {
      // Append to container
      this.container.appendChild(this.element);
      if (this.debug) {
        console.log(`View ${this.id}: Appended to container`);
      }
    }

    // Verify element was successfully added and is visible
    // Final verification
    if (!document.body.contains(this.element)) {
      console.error(`View ${this.id}: Element not found in DOM after mounting`);
    } else if (this.debug) {
      console.log(`View ${this.id}: Successfully mounted and visible in DOM`);
    }

    // Mark as mounted
    this.mounted = true;

    // Call after mount hook
    await this.hooks.afterMount.call(this);

    // Call overridable after mount method
    await this.onAfterMount();

    if (this.debug) {
      console.log(`View ${this.id} mounted`);
    }

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

    if (this.debug) {
      console.log(`View ${this.id} unmounted`);
    }

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

    // Clean up model listener
    if (this.model && this.modelListener) {
      if (typeof this.model.off === 'function') {
        this.model.off('change', this.modelListener);
      }
      this.modelListener = null;
      this.model = null;
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

    if (this.debug) {
      console.log(`View ${this.id} destroyed`);
    }

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
    this.el = this.element;  // for simple access

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

    if (this.debug) {
      console.log(`View ${this.id}: Container set to`, this.container);
    }
  }

  /**
   * Discover and set container when not explicitly provided
   * @throws {Error} If parent has no element to attach to
   */
  discoverContainer() {
    if (!this.parent) {
      // No parent, look for element with this view's id in document body
      const element = document.querySelector(`#${this.id}`);
      if (element) {
        this.setContainer(element.parentElement || document.body);
      } else {
        // No element found, use body as container
        this.setContainer(document.body);
      }
    } else {
      // Has parent, use parent's element as container
      if (this.parent.element) {
        this.setContainer(this.parent.element);
      } else {
        throw new Error(`Parent view ${this.parent.id} has no element to attach child ${this.id}`);
      }
    }
  }

  /**
   * Set model for the view
   * @param {Object} model - Model object with on/off methods for event handling
   * @returns {View} This view for chaining
   */
  setModel(model) {
    // Remove listener from previous model
    if (this.model && this.modelListener) {
      if (typeof this.model.off === 'function') {
        this.model.off('change', this.modelListener);
      }
    }

    this.model = model;

    if (model) {
      // Create listener that re-renders on model changes
      this.modelListener = async () => {
        if (!this.destroyed && this.rendered) {
          await this.render();
        }
      };

      // Register for model changes if model supports events
      if (typeof model.on === 'function') {
        model.on('change', this.modelListener);
      }
    }

    return this;
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

    // If this view is already mounted in the DOM, render and mount the child
    if (this.mounted && this.element && document.body.contains(this.element)) {
      // Look for a placeholder element with the child's ID
      const childPlaceholder = this.element.querySelector(`#${child.id}`);

      if (childPlaceholder) {
        // Create a temporary container for the child
        const tempContainer = document.createElement('div');
        child.setContainer(tempContainer);

        // Render the child
        child.render().then(() => {
          // Replace the placeholder with the child's element
          if (child.element && childPlaceholder.parentNode) {
            childPlaceholder.parentNode.replaceChild(child.element, childPlaceholder);
            // Update the child's container to reflect its actual parent
            child.container = child.element.parentNode;
          }

          // Mark as mounted since it's now in the DOM
          if (this.mounted && child.element && document.body.contains(child.element)) {
            child.mounted = true;
            child.onAfterMount();
          }
        });
      } else {
        // No placeholder found, append to parent element
        child.setContainer(this.element);
        child.render().then(() => {
          if (this.mounted) {
            child.mount();
          }
        });
      }
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
    for (const key of this.childOrder) {
      const child = this.children.get(key);

      // Look for a placeholder element with the child's ID
      const childPlaceholder = this.element ? this.element.querySelector(`#${child.id}`) : null;

      if (childPlaceholder) {
        // Use the placeholder directly as the container
        child.setContainer(childPlaceholder);

        // Render the child into the placeholder
        await child.render();
      } else {
        // No placeholder found, append to parent element
        child.setContainer(this.element);
        await child.render();
      }
    }
  }

  /**
   * Mount all children
   * @returns {Promise} Promise that resolves when all children are mounted
   */
  async mountChildren() {
    const mountPromises = this.childOrder.map(key => {
      const child = this.children.get(key);
      // Only mount if not already mounted (some children might have been mounted during render)
      if (!child.mounted && child.element && document.body.contains(child.element)) {
        child.mounted = true;
        return child.onAfterMount();
      }
      return Promise.resolve();
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

    const partials = this.getPartials();

    // Pass the view itself as context - Mustache will use view.get() for lookups
    // Pipes are now handled directly by View.get() via MOJOUtils
    return Mustache.render(templateContent, this, partials);
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
          let templatePath = this.template;

          // Handle relative paths with WebApp base
          if (window.APP && window.APP.basePath) {
            // Check if it's a relative path (not absolute and not a full URL)
            if (!templatePath.startsWith('/') &&
                !templatePath.startsWith('http://') &&
                !templatePath.startsWith('https://')) {
              // Combine base path with template path
              const base = window.APP.basePath.endsWith('/')
                ? window.APP.basePath.slice(0, -1)
                : window.APP.basePath;
              templatePath = `${base}/${templatePath}`;
            }
          }

          const response = await fetch(templatePath);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          templateContent = await response.text();
        } catch (error) {
          console.error(`Failed to load template from ${this.template}:`, error);
          this.showError(`Failed to load template from ${this.template}: ${error.message}`);
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
   * Get value by path from view context
   * Handles dot notation, model/data namespaces, and function calls
   * @param {string} path - Path to value (e.g., "model.name", "data.title", "getButtonClass")
   * @returns {*} The value at the path
   */
  get(path) {
    // Use MOJOUtils for unified data access with pipes and dot notation
    // This handles:
    // - Direct properties: "title", "count"
    // - Methods: "getStatus", "getButtonClass"
    // - Namespace access: "model.name", "data.title", "state.active"
    // - Nested paths: "model.user.name", "data.items.0.title"
    // - Pipe formatting: "model.price|currency", "data.created|date('MMM DD')"
    // - Combined: "model.user.name|uppercase|truncate(20)"

    // Get the value normally
    const value = MOJOUtils.getContextData(this, path);

    // If accessing data namespace and result is object/array, wrap it
    if (path && path.startsWith('data.') && value && typeof value === 'object') {
      return MOJOUtils.wrapData(value, this);
    }

    // If accessing model namespace properties (not the model itself) and result is object/array without get(), wrap it
    // This ensures array items have get() method for pipe support in templates
    if (path && path.startsWith('model.') &&
        path !== 'model' &&
        value && typeof value === 'object' &&
        typeof value.get !== 'function') {
      // Pass null as rootContext to avoid circular references
      return MOJOUtils.wrapData(value, null);
    }

    return value;
  }

  /**
   * Get view data for template rendering
   * @deprecated Use view.get() directly instead
   * @returns {Promise<object>} View data object
   */
  async getViewData() {
    // Return the view itself as the context
    // This allows Mustache to call view.get() for all lookups
    return this;
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
   * Bind DOM event listeners using ownership-based event delegation
   */
  bindEvents() {
    if (!this.element) return;

    // Remove existing listeners
    this.unbindEvents();

    // Single delegated click handler for ALL click events
    const clickHandler = async (event) => {
      // 1. Handle data-action elements FIRST (highest priority)
      const actionElement = event.target.closest('[data-action]');
      if (actionElement && this.shouldHandleElement(actionElement, event)) {
        const action = actionElement.getAttribute('data-action');
        const handled = this.handleAction(action, event, actionElement);

        if (handled) {
          event.preventDefault(); // Prevent href="#" navigation
          event.stopPropagation();
          event.handledByChild = true;
          return; // STOP - don't process as navigation
        }
      }

      // 2. Handle navigation elements ONLY if no data-action was handled
      const navElement = event.target.closest('a[href], [data-page]');
      if (navElement && !navElement.hasAttribute('data-action') && this.shouldHandleElement(navElement, event)) {
        // Allow default browser behavior for special cases
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
          return; // Let browser handle Ctrl+click, middle-click, etc.
        }

        // Check for external links before preventing default
        if (navElement.tagName === 'A') {
          const href = navElement.getAttribute('href');
          if (href && href !== '#' && !href.startsWith('#') && (this.isExternalLink(href) || navElement.hasAttribute('data-external'))) {
            return; // Let browser handle external links normally
          }
        }

        event.preventDefault();
        event.stopPropagation();
        event.handledByChild = true;

        // data-page takes precedence over href
        if (navElement.hasAttribute('data-page')) {
          await this.handlePageNavigation(navElement);
        } else {
          await this.handleHrefNavigation(navElement);
        }
      }
    };

    this.element.addEventListener('click', clickHandler);
    this.domListeners.push({
      element: this.element,
      event: 'click',
      handler: clickHandler
    });

    // Single delegated change handler
    const changeHandler = (event) => {
      const actionElement = event.target.closest('[data-change-action]');
      if (!actionElement) return;

      if (this.shouldHandleElement(actionElement, event)) {
        const action = actionElement.getAttribute('data-change-action');
        const handled = this.handleAction(action, event, actionElement);

        if (handled) {
          event.stopPropagation();
          event.handledByChild = true;
        }
      }
    };

    this.element.addEventListener('change', changeHandler);
    this.domListeners.push({
      element: this.element,
      event: 'change',
      handler: changeHandler
    });

    // Single delegated keydown handler
    const keydownHandler = (event) => {
      // Handle Enter key in search inputs
      if (event.key === 'Enter' && event.target.matches('[data-filter="search"]')) {
        const actionElement = event.target.closest('[data-change-action]');
        if (!actionElement) return;

        if (this.shouldHandleElement(actionElement, event)) {
          event.preventDefault();
          const action = actionElement.getAttribute('data-change-action');
          const handled = this.handleAction(action, event, actionElement);

          if (handled) {
            event.stopPropagation();
            event.handledByChild = true;
          }
        }
      }
    };

    this.element.addEventListener('keydown', keydownHandler);
    this.domListeners.push({
      element: this.element,
      event: 'keydown',
      handler: keydownHandler
    });

    // Handle form submissions with delegation
    const submitHandler = (event) => {
      const form = event.target.closest('form[data-action]');
      if (!form) return;

      if (this.shouldHandleElement(form, event)) {
        event.preventDefault();
        const action = form.getAttribute('data-action');
        this.handleAction(action, event, form);
      }
    };

    this.element.addEventListener('submit', submitHandler);
    this.domListeners.push({
      element: this.element,
      event: 'submit',
      handler: submitHandler
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

    const app = this.getApp();
    if (app) {
        app.showPage(pageName, params);
        return;
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

    // if (href === '#' || href === '') {
    //   return;
    // }

    const router = this.findRouter();
    if (router) {
      // Handle different URL formats based on router mode
      if (router.options && router.options.mode === 'param' && href.startsWith('?')) {
        // In param mode with query string URLs, navigate directly
        // The router expects a path with query like "/?page=name"
        const fullPath = '/' + href;
        await router.navigate(fullPath);
        return;
      }

      // For hash mode
      if (router.options && router.options.mode === 'hash' && href.startsWith('#')) {
        await router.navigate(href);
        return;
      }

      // For history mode or regular paths
      const routePath = this.hrefToRoutePath(href);

      // Just navigate and let router handle it
      await router.navigate(routePath);
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
      window.APP?.router,
      window.app?.router,
      window.navigationApp?.router,
      window.sidebarApp?.router
    ];

    return routers.find(router => router && typeof router.navigate === 'function') || null;
  }

  /**
   * Find available router instance
   * @returns {Object|null} Router instance
   */
  getApp() {
    const apps = [
      window.APP,
      window.app,
      window.WebApp,
      window.MOJO.app,
    ];

    return apps.find(app => app && typeof app.showPage === 'function') || null;
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
   * @returns {boolean} True if action was handled, false otherwise
   */
  async handleAction(action, event, element) {
    // Try specific handler method first (handleActionSort, handleActionRefresh, etc.)
    const handleMethodName = `handleAction${this.capitalize(action)}`;
    if (typeof this[handleMethodName] === 'function') {
      try {
        event.preventDefault();
        await this[handleMethodName](event, element);
        return true; // Successfully handled
      } catch (error) {
        console.error(`Error in action ${action}:`, error);
        this.handleActionError(action, error, event, element);
        return true; // Handled with error
      }
    }

    // Try generic onAction method (onActionSort, onActionRefresh, etc.)
    const onActionMethodName = `onAction${this.capitalize(action)}`;
    if (typeof this[onActionMethodName] === 'function') {
      try {
        event.preventDefault();
        await this[onActionMethodName](event, element);
        return true; // Successfully handled
      } catch (error) {
        console.error(`Error in action ${action}:`, error);
        this.handleActionError(action, error, event, element);
        return true; // Handled with error
      }
    }

    // Try fallback handler
    if (typeof this.onActionDefault === 'function') {
      try {
        await this.onActionDefault(action, event, element);
        return true; // Handled by fallback
      } catch (error) {
        console.error(`Error in default action handler for ${action}:`, error);
        this.handleActionError(action, error, event, element);
        return true; // Handled with error
      }
    }

    // Emit as event (last resort)
    this.emit(`action:${action}`, { action, event, element });
    return false; // Not handled - let it bubble
  }

  handleActionNavigate(event, element) {
    console.error("navigate action not supported");
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
  async showError(message) {
    console.error(`View ${this.id} error:`, message);

    // Use Dialog component for better UX
    try {
      const Dialog = await import('../components/Dialog.js').then(m => m.default);
      await Dialog.alert(message, 'Error', {
        size: 'md',
        class: 'text-danger'
      });
    } catch (importError) {
      // Fallback to MOJO framework dialog if Dialog import fails
      alert(`Error: ${message}`);
    }
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  async showSuccess(message) {
    if (this.debug) {
      console.log(`View ${this.id} success:`, message);
    }

    // Use Dialog component for better UX
    try {
      const Dialog = await import('../components/Dialog.js').then(m => m.default);
      await Dialog.alert(message, 'Success', {
        size: 'md',
        class: 'text-success'
      });
    } catch (importError) {
      // Fallback to MOJO framework dialog if Dialog import fails
      if (typeof window !== 'undefined' && window.MOJO && window.MOJO.showSuccess) {
        window.MOJO.showSuccess(message);
      } else {
        // Ultimate fallback to browser alert
        alert(`Success: ${message}`);
      }
    }
  }

  /**
   * Show info message
   * @param {string} message - Info message
   */
  async showInfo(message) {
    console.info(`View ${this.id} info:`, message);

    // Use Dialog component for better UX
    try {
      const Dialog = await import('../components/Dialog.js').then(m => m.default);
      await Dialog.alert(message, 'Information', {
        size: 'md',
        class: 'text-info'
      });
    } catch (importError) {
      // Fallback to MOJO framework dialog if Dialog import fails
      if (typeof window !== 'undefined' && window.MOJO && window.MOJO.showInfo) {
        window.MOJO.showInfo(message);
      } else {
        // Ultimate fallback to browser alert
        alert(`Info: ${message}`);
      }
    }
  }

  /**
   * Show warning message
   * @param {string} message - Warning message
   */
  async showWarning(message) {
    console.warn(`View ${this.id} warning:`, message);

    // Use Dialog component for better UX
    try {
      const Dialog = await import('../components/Dialog.js').then(m => m.default);
      await Dialog.alert(message, 'Warning', {
        size: 'md',
        class: 'text-warning'
      });
    } catch (importError) {
      // Fallback to MOJO framework dialog if Dialog import fails
      if (typeof window !== 'undefined' && window.MOJO && window.MOJO.showWarning) {
        window.MOJO.showWarning(message);
      } else {
        // Ultimate fallback to browser alert
        alert(`Warning: ${message}`);
      }
    }
  }

  // Lifecycle hooks - can be overridden in subclasses
  async _onBeforeRender() {
    // Ensure view is initialized before rendering
    if (!this._initialized) {
      this.init();
    }

    await this.onBeforeRender();
  }

  async onBeforeRender() {}
  async onAfterRender() {}
  async onBeforeMount() {}
  async onAfterMount() {}
  async onBeforeDestroy() {}
  async onAfterDestroy() {}

  // Event system

  // EventEmitter API: on, off, once, emit (from mixin).

  // Utility methods

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `view_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Capitalize first letter of string and handle kebab-case
   * @param {string} str - String to capitalize (supports kebab-case)
   * @returns {string} Capitalized string (kebab-case becomes PascalCase)
   */
  capitalize(str) {
    // Handle kebab-case: 'show-modal' becomes 'ShowModal'
    if (str.includes('-')) {
      return str.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    }
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

  /**
   * Determine if this view should handle an element based on ownership logic
   * @param {HTMLElement} element - Element to check
   * @param {Event} event - Event object (to check handledByChild flag)
   * @returns {boolean} True if this view should handle the element
   */
  shouldHandleElement(element, event) {
    if (this.ownsActionElement(element)) {
      return true; // Direct ownership
    }

    if (this.containsActionElement(element) && !event.handledByChild) {
      return true; // Fallback handling - no child has handled it
    }

    return false; // Don't handle
  }

  /**
   * Determine if this view directly owns an action element
   * @param {HTMLElement} actionElement - Element with data-action attribute
   * @returns {boolean} True if this view directly owns the element
   */
  ownsActionElement(actionElement) {
    // Must be within this view's element
    if (!this.element.contains(actionElement)) {
      return false;
    }

    // Must NOT be within any child view's element
    for (const child of this.children) {
      if (child.element && child.element.contains(actionElement)) {
        return false; // Owned by child view
      }
    }

    return true; // Directly owned by this view
  }

  /**
   * Check if action element is contained within this view (including child views)
   * @param {HTMLElement} actionElement - Element with data-action attribute
   * @returns {boolean} True if element is contained within this view
   */
  containsActionElement(actionElement) {
    return this.element.contains(actionElement);
  }

  static create(options = {}) {
    return new this(options);
  }
}

import EventEmitter from '../utils/EventEmitter.js';
Object.assign(View.prototype, EventEmitter);

export default View;
