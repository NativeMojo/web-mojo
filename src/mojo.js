/**
 * MOJO Framework v2.0.0 - Phase 1: Core Architecture & View System
 * A lightweight JavaScript framework for building data-driven web applications
 */

import View from './core/View.js';
import Page from './core/Page.js';
import Router from './core/Router.js';
import EventBus from './utils/EventBus.js';
import Rest from './core/Rest.js';
import Model from './core/Model.js';
import Collection from './core/Collection.js';

// Alias Model as RestModel for backward compatibility
const RestModel = Model;
import Table from './components/Table.js';
import TablePage from './components/TablePage.js';
import Dialog from './components/Dialog.js';
import NotFoundPage from './pages/NotFoundPage.js';
import ErrorPage from './pages/ErrorPage.js';

/**
 * Main MOJO Framework Class
 */
class MOJO {
  constructor(config = {}) {
    this.version = '2.0.0-phase2';
    this.config = config;
    
    // Core systems
    this.eventBus = new EventBus();
    const routerConfig = { mode: 'param', ...config.router || {} };
    this.routerEnabled = routerConfig.enabled !== false; // Default to enabled
    this.router = this.routerEnabled ? new Router(routerConfig) : null;
    this.views = new Map();
    this.pages = new Map();
    this.models = new Map();
    this.collections = new Map();
    
    // Data layer setup
    this.rest = Rest;
    this.setupDataLayer();
    
    // State
    this.started = false;
    this.rootView = null;
    this.currentPage = null;
    
    // Configuration defaults
    this.config = {
      container: '#app',
      autoStart: true,
      debug: false,
      ...config
    };
    
    // Initialize framework
    this.init();
  }

  /**
   * Set up the data layer (Phase 2)
   */
  setupDataLayer() {
    // Configure REST client from app config
    if (this.config.api) {
      this.rest.configure(this.config.api);
    }
    
    // Inject Rest client into model classes
    Model.Rest = this.rest;
    Collection.Rest = this.rest;
    
    // Set up authentication if configured
    if (this.config.auth && this.config.auth.token) {
      this.rest.setAuthToken(this.config.auth.token, this.config.auth.type || 'Bearer');
    }
  }

  /**
   * Initialize the MOJO framework
   */
  init() {
    if (this.initialized) {
      return this;
    }
    
    console.log(`🔥 MOJO Framework v${this.version} - Initializing`);
    
    // Set up global configuration
    this.setupGlobals();
    
    // Set up event system
    this.setupEvents();
    
    // Apply configuration
    this.applyConfig();
    
    // Auto-start if configured
    if (this.config.autoStart !== false) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.start();
        });
      } else {
        // DOM already loaded
        this.start();
      }
    }
    
    this.initialized = true;
    console.log('✅ MOJO Framework initialized');
    
    return this;
  }

  /**
   * Start the MOJO application
   */
  start() {
    if (this.started) {
      return this;
    }
    
    console.log('🚀 MOJO Framework - Starting application');
    
    // Find container
    this.container = typeof this.config.container === 'string'
      ? document.querySelector(this.config.container)
      : this.config.container;
    
    if (!this.container) {
      throw new Error(`Container not found: ${this.config.container}`);
    }
    
    // Create root view if none exists
    if (!this.rootView) {
      this.rootView = new View({
        id: 'mojo-root',
        tagName: 'div',
        className: 'mojo-app'
      });
    }
    
    // Mount root view
    this.rootView.render(this.container);
    
    // Start router if enabled
    if (this.routerEnabled && this.router) {
      this.router.start();
    }
    
    this.started = true;
    
    // Emit application started event
    this.eventBus.emit('app:started', { mojo: this });
    
    console.log('✅ MOJO Framework started');
    
    return this;
  }

  /**
   * Set up global references
   */
  setupGlobals() {
    // Make MOJO globally available
    if (typeof window !== 'undefined') {
      window.MOJO = this;
      if (this.router) {
        window.MOJO.router = this.router;
      }
      
      // Set up global error handling
      this.setupGlobalErrorHandling();
    }
    
    // Make core classes globally accessible
    if (typeof window !== 'undefined') {
      window.MOJOView = View;
      window.MOJOPage = Page;
    }
  }

  /**
   * Set up core event system
   */
  setupEvents() {
    // Debug mode
    if (this.config.debug) {
      this.eventBus.debug(true);
    }
    
    // Handle errors
    this.eventBus.on('error', (errorData) => {
      console.error('MOJO Event Error:', errorData);
    });
    
    // Handle view lifecycle events
    this.eventBus.on('view:created', (data) => {
      console.log('View created:', data.view.id);
    });
    
    this.eventBus.on('view:destroyed', (data) => {
      console.log('View destroyed:', data.view.id);
    });
  }

  /**
   * Apply framework configuration
   */
  applyConfig() {
    // Apply theme if provided
    if (this.config.theme) {
      this.applyTheme(this.config.theme);
    }
    
    // Set up development tools
    if (this.config.debug) {
      this.setupDevTools();
    }
  }

  /**
   * Apply theme configuration
   */
  applyTheme(theme) {
    if (typeof document === 'undefined') {
      return;
    }
    
    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(theme).forEach(([key, value]) => {
      const cssKey = `--mojo-${key.replace(/[A-Z]/g, '-$&').toLowerCase()}`;
      root.style.setProperty(cssKey, value);
    });
  }

  /**
   * Set up development tools
   */
  setupDevTools() {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Add MOJO dev tools to window
    window.MOJODevTools = {
      version: this.version,
      views: () => Array.from(this.views.values()),
      pages: () => Array.from(this.pages.values()),
      eventBus: this.eventBus,
      stats: () => this.getStats(),
      hierarchy: () => this.rootView ? this.rootView.getHierarchy() : 'No root view'
    };
    
    console.log('🛠️ MOJO DevTools available at window.MOJODevTools');
  }

  /**
   * Register a view
   */
  registerView(name, viewClass) {
    if (typeof viewClass !== 'function') {
      throw new Error('View class must be a constructor function');
    }
    
    this.views.set(name, viewClass);
    this.eventBus.emit('view:registered', { name, viewClass });
    
    return this;
  }

  /**
   * Register a page
   */
  registerPage(name, pageClass) {
    if (typeof pageClass !== 'function') {
      throw new Error('Page class must be a constructor function');
    }
    
    this.pages.set(name, pageClass);
    
    // Register route with router
    try {
      // Create temporary instance to get route
      const tempInstance = new pageClass();
      const route = tempInstance.route || `/${name}`;
      
      // Register route with router if enabled
      if (this.router) {
        this.router.addRoute(route, (params, query) => {
          return this.renderPage(name, { params, query });
        });
      }
      
      console.log(`📝 Registered route: ${route} -> ${name}`);
    } catch (error) {
      console.warn(`Failed to register route for page ${name}:`, error);
    }
    
    this.eventBus.emit('page:registered', { name, pageClass });
    
    return this;
  }

  /**
   * Create a view instance
   */
  createView(name, options = {}) {
    const ViewClass = this.views.get(name);
    
    if (!ViewClass) {
      throw new Error(`View not found: ${name}`);
    }
    
    const view = new ViewClass(options);
    this.eventBus.emit('view:created', { name, view, options });
    
    return view;
  }

  /**
   * Create a page instance
   */
  createPage(name, options = {}) {
    const PageClass = this.pages.get(name);
    
    if (!PageClass) {
      throw new Error(`Page not found: ${name}`);
    }
    
    const page = new PageClass(options);
    this.eventBus.emit('page:created', { name, page, options });
    
    return page;
  }

  /**
   * Register a model class
   * @param {string} name - Model name
   * @param {class} ModelClass - Model class extending Model
   */
  registerModel(name, ModelClass) {
    if (typeof ModelClass !== 'function') {
      throw new Error('Model class must be a constructor function');
    }
    
    this.models.set(name, ModelClass);
    console.log(`Registered model: ${name}`);
  }

  /**
   * Register a collection class  
   * @param {string} name - Collection name
   * @param {class} CollectionClass - Collection class extending Collection
   */
  registerCollection(name, CollectionClass) {
    if (typeof CollectionClass !== 'function') {
      throw new Error('Collection class must be a constructor function');
    }
    
    this.collections.set(name, CollectionClass);
    console.log(`Registered collection: ${name}`);
  }

  /**
   * Create a model instance from a registered model class
   * @param {string} name - Registered model name
   * @param {object} data - Initial model data
   * @param {object} options - Model options
   * @returns {Model} Model instance
   */
  createModel(name, data = {}, options = {}) {
    const ModelClass = this.models.get(name);
    if (!ModelClass) {
      throw new Error(`Model '${name}' not registered`);
    }
    
    return new ModelClass(data, options);
  }

  /**
   * Create a collection instance from a registered collection class
   * @param {string} name - Registered collection name
   * @param {class} ModelClass - Model class for the collection
   * @param {object} options - Collection options
   * @returns {Collection} Collection instance
   */
  createCollection(name, ModelClass, options = {}) {
    const CollectionClass = this.collections.get(name);
    if (!CollectionClass) {
      throw new Error(`Collection '${name}' not registered`);
    }
    
    return new CollectionClass(ModelClass, options);
  }

  /**
   * Render a page to the specified container
   */
  async renderPage(name, options = {}) {
    try {
      // Clean up current page
      if (this.currentPage) {
        await this.currentPage.destroy();
        this.currentPage = null;
      }

      // Create new page instance
      const page = this.createPage(name, options);
      
      // Set route params
      if (options.params) {
        page.params = options.params;
      }
      if (options.query) {
        page.query = options.query;
      }

      // Render page to main container
      await page.render(this.container);
      
      // Store as current page
      this.currentPage = page;
      
      // Call page lifecycle methods
      if (typeof page.on_params === 'function') {
        page.onParams(page.params, page.query);
      }

      console.log(`📄 Rendered page: ${name}`);
      
      return page;
    } catch (error) {
      console.error(`Failed to render page ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get a registered view class
   */
  getView(name) {
    return this.views.get(name);
  }

  /**
   * Get registered page class
   */
  getPage(name) {
    return this.pages.get(name);
  }

  /**
   * Get registered model class
   */
  getModel(name) {
    return this.models.get(name);
  }

  /**
   * Get registered collection class
   */
  getCollection(name) {
    return this.collections.get(name);
  }

  /**
   * Set root view
   */
  setRootView(view) {
    if (this.rootView) {
      this.rootView.destroy();
    }
    
    this.rootView = view;
    
    if (this.started && this.container) {
      this.rootView.render(this.container);
    }
    
    return this;
  }

  /**
   * Get framework statistics
   */
  getStats() {
    return {
      version: this.version,
      initialized: this.initialized,
      started: this.started,
      registeredViews: this.views.size,
      registeredPages: this.pages.size,
      registeredModels: this.models.size,
      registeredCollections: this.collections.size,
      eventBus: this.eventBus.getStats(),
      restClient: {
        baseURL: this.rest.config.baseURL,
        timeout: this.rest.config.timeout,
        requestInterceptors: this.rest.interceptors.request.length,
        responseInterceptors: this.rest.interceptors.response.length,
        hasAuth: !!this.rest.config.headers['Authorization']
      },
      rootView: this.rootView ? {
        id: this.rootView.id,
        children: this.rootView.children.size,
        rendered: this.rootView.rendered,
        mounted: this.rootView.mounted
      } : null
    };
  }

  /**
   * Shutdown the framework
   */
  async shutdown() {
    console.log('🛑 MOJO Framework - Shutting down');
    
    // Destroy root view
    if (this.rootView) {
      await this.rootView.destroy();
      this.rootView = null;
    }
    
    // Clear registrations
    this.views.clear();
    this.pages.clear();
    
    // Clear event bus
    this.eventBus.removeAllListeners();
    
    // Reset state
    this.started = false;
    this.initialized = false;
    
    this.eventBus.emit('app:shutdown', { mojo: this });
    
    console.log('✅ MOJO Framework shut down');
    
    return this;
  }

  /**
   * Load configuration from external source
   */
  static async loadConfig(configPath = './app.json') {
    try {
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const config = await response.json();
      console.log('📄 Configuration loaded from:', configPath);
      
      return new MOJO(config);
    } catch (error) {
      console.warn('Could not load configuration from:', configPath, error.message);
      console.log('📄 Using default configuration');
      
      return new MOJO();
    }
  }

  /**
   * Create MOJO instance with inline configuration
   */
  static create(config = {}) {
    return new MOJO(config);
  }

  /**
   * Get current MOJO version
   */
  static get version() {
    return '2.0.0-phase1';
  }

  /**
   * Set up global error handling with visual dialogs
   */
  setupGlobalErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global Error:', event.error);
      this.showError(`Application Error: ${event.error?.message || 'Unknown error'}`, {
        details: event.error?.stack,
        technical: true
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      this.showError(`Promise Rejection: ${event.reason?.message || 'Unknown error'}`, {
        details: event.reason?.stack,
        technical: true
      });
    });
  }

  /**
   * Show error dialog
   */
  showError(message, options = {}) {
    this.showDialog('error', message, options);
  }

  /**
   * Show success dialog
   */
  showSuccess(message, options = {}) {
    this.showDialog('success', message, options);
  }

  /**
   * Show info dialog
   */
  showInfo(message, options = {}) {
    this.showDialog('info', message, options);
  }

  /**
   * Show warning dialog
   */
  showWarning(message, options = {}) {
    this.showDialog('warning', message, options);
  }

  /**
   * Show visual dialog overlay
   */
  showDialog(type, message, options = {}) {
    // Remove any existing dialogs
    const existingDialog = document.querySelector('.mojo-dialog-overlay');
    if (existingDialog) {
      existingDialog.remove();
    }

    // Clear loading screen if still showing
    if (options.clearLoading !== false) {
      this.clearLoadingScreen();
    }

    const colors = {
      error: { bg: '#dc3545', icon: 'fas fa-exclamation-triangle' },
      success: { bg: '#28a745', icon: 'fas fa-check-circle' },
      info: { bg: '#17a2b8', icon: 'fas fa-info-circle' },
      warning: { bg: '#ffc107', icon: 'fas fa-exclamation-triangle', text: '#000' }
    };

    const color = colors[type] || colors.info;
    const textColor = color.text || '#fff';

    const overlay = document.createElement('div');
    overlay.className = 'mojo-dialog-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      background: ${color.bg};
      color: ${textColor};
      padding: 15px 20px;
      border-radius: 8px 8px 0 0;
      display: flex;
      align-items: center;
      font-weight: bold;
    `;

    const icon = document.createElement('i');
    icon.className = color.icon;
    icon.style.marginRight = '10px';

    const title = document.createElement('span');
    title.textContent = type.charAt(0).toUpperCase() + type.slice(1);

    header.appendChild(icon);
    header.appendChild(title);

    const body = document.createElement('div');
    body.style.cssText = `
      padding: 20px;
      line-height: 1.5;
    `;

    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      margin-bottom: ${options.details ? '15px' : '0'};
      font-size: 16px;
    `;
    messageDiv.textContent = message;

    body.appendChild(messageDiv);

    if (options.details) {
      const detailsDiv = document.createElement('div');
      detailsDiv.style.cssText = `
        background: #f8f9fa;
        padding: 10px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
      `;
      detailsDiv.textContent = options.details;
      body.appendChild(detailsDiv);
    }

    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 15px 20px;
      border-top: 1px solid #eee;
      text-align: right;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
      background: ${color.bg};
      color: ${textColor};
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;

    closeButton.onclick = () => overlay.remove();

    footer.appendChild(closeButton);

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Auto-close success messages after 3 seconds
    if (type === 'success' && !options.persistent) {
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 3000);
    }

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Clear loading screen
   */
  clearLoadingScreen() {
    const loadingScreens = document.querySelectorAll('.loading-container, .d-flex.justify-content-center.align-items-center');
    loadingScreens.forEach(screen => {
      if (screen.innerHTML.includes('Loading') || screen.innerHTML.includes('loading-spinner')) {
        screen.remove();
      }
    });
  }
}

// Expose core classes
MOJO.View = View;
MOJO.Page = Page;
MOJO.Router = Router;
MOJO.EventBus = EventBus;
MOJO.Model = Model;
MOJO.Collection = Collection;
MOJO.DataList = Collection; // Alias for backward compatibility
MOJO.Rest = Rest;
MOJO.Table = Table;
MOJO.TablePage = TablePage;

// Export as both default and named export
export { View, Page, Router, EventBus, Model, RestModel, Collection, Collection as DataList, Rest, Table, TablePage, Dialog, NotFoundPage, ErrorPage };
export default MOJO;