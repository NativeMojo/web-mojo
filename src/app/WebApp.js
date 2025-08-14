/**
 * WebApp - Central application container for MOJO framework
 * Handles configuration, routing, pages, REST interface, and layout management
 */

import Router from '../core/Router.js';
import Page from '../core/Page.js';
import EventBus from '../utils/EventBus.js';
import rest from '../core/Rest.js';

/*!
 * MOJO Framework
 * Copyright (c) 2024 MOJO Framework Team
 * Licensed under MIT License
 */

class WebApp {
    constructor(config = {}) {
        // Core configuration
        this.name = config.name || 'MOJO App';
        this.version = config.version || '1.0.0';
        this.debug = config.debug || false;
        this.container = config.container || '#app';
        this.basePath = config.basePath || '';

        // Router configuration
        this.routerMode = config.routerMode || 'param'; // 'param', 'hash', 'history'
        this.basePath = config.basePath || '';
        this.defaultRoute = config.defaultRoute || 'home';

        // Store session config if provided
        this.session = config.session || {};

        // Initialize router immediately so it's available for page registration
        this.router = new Router(this, {
            mode: this.routerMode,
            base: this.basePath,
            defaultPage: this.defaultRoute
        });

        // Make router globally accessible
        if (typeof window !== 'undefined') {
            window.MOJO = window.MOJO || {};
            window.MOJO.router = this.router;
        }

        // Layout configuration
        this.layoutType = config.layout || 'portal'; // 'portal', 'single', 'custom', 'none'
        this.layoutConfig = config.layoutConfig || {};
        this.layout = null;

        // Navigation configuration - support both old and new structure
        this.navigation = config.navigation || {};
        this.sidebar = config.sidebar || {};
        this.topbar = config.topbar || {};
        this.brand = config.brand;
        this.brandIcon = config.brandIcon;

        // REST configuration
        this.rest = rest;
        if (config.api) {
            this.rest.configure({
                baseURL: config.api?.baseUrl || '/api',
                headers: config.api?.headers || {},
                timeout: config.api?.timeout || 30000
            });
        }

        // Global event bus
        this.eventBus = new EventBus();

        // Component registries
        this.pageCache = new Map();     // pageName -> page instance (cached)
        this.pageClasses = new Map();   // pageName -> Page class
        this.components = new Map();
        this.models = new Map();
        this.currentPage = null;        // Currently active page instance

        // State management
        this.state = {
            currentPage: null,
            previousPage: null,
            isLoading: false,
            user: null,
            ...config.initialState
        };

        // Make globally accessible (singleton pattern)
        if (typeof window !== 'undefined') {
            window.APP = this;
            window.MOJO = window.MOJO || {};
            window.MOJO.app = this;
        }

        // Bind methods
        this.start = this.start.bind(this);
        this.navigate = this.navigate.bind(this);
        this.showError = this.showError.bind(this);
        this.showSuccess = this.showSuccess.bind(this);
    }

    /**
     * Initialize and start the application
     */
    async start() {
        try {
            console.log(`Starting ${this.name} v${this.version}`);

            // Setup error handling
            this.setupErrorHandling();

            // Initialize router
            await this.setupRouter();

            // Setup layout
            await this.setupLayout();

            // Start router
            this.router.start();

            // Navigate to default route or current URL
            const currentPath = this.router.getCurrentPath();
            if (!currentPath || currentPath === '/' || currentPath === '') {
                // Navigate to default route when on root
                await this.navigate(this.defaultRoute);
            } else {
                // Try to handle current location
                await this.router.handleCurrentLocation();
            }

            // Emit app ready event
            this.eventBus.emit('app:ready', { app: this });

            console.log(`${this.name} started successfully`);

        } catch (error) {
            console.error('Failed to start application:', error);
            this.showError('Failed to start application');
            throw error;
        }
    }

    /**
     * Setup router with configuration
     */
    async setupRouter() {
        // Router is now created in constructor, just setup events
        if (!this.router) {
            console.error('Router not initialized');
            return;
        }

        // Setup router events
        this.router.onBeforeRoute = async (route) => {
            this.eventBus.emit('route:before', { route });
            return true;
        };

        this.router.onAfterRoute = async (route) => {
            this.eventBus.emit('route:after', { route });
        };

        this.router.onError = (error) => {
            console.error('Router error:', error);
            this.showError('Navigation error');
        };
    }

    /**
     * Setup layout based on configuration
     */
    async setupLayout() {
        const container = document.querySelector(this.container);
        if (!container) {
            throw new Error(`Container '${this.container}' not found`);
        }

        // Clear container
        container.innerHTML = '';

        switch (this.layoutType) {
            case 'portal':
                const Portal = (await import('./Portal.js')).default;
                this.layout = new Portal({
                    app: this,
                    container: container,
                    sidebar: this.sidebar,
                    topbar: this.topbar,
                    brand: this.brand,
                    brandIcon: this.brandIcon,
                    ...this.layoutConfig
                });
                await this.layout.render();
                break;

            case 'single':
                // Simple single page layout
                container.innerHTML = '<div id="page-container"></div>';
                break;

            case 'custom':
                // Allow custom layout class
                if (this.layoutConfig.layoutClass) {
                    this.layout = new this.layoutConfig.layoutClass({
                        app: this,
                        container: container,
                        ...this.layoutConfig
                    });
                    await this.layout.render();
                }
                break;

            case 'none':
                // No layout, pages render directly
                break;
        }
    }

    /**
     * Register a page with the app
     * @param {string} pageName - Name of the page
     * @param {class} PageClass - Page class constructor
     * @param {object} options - Optional constructor options
     */
    registerPage(pageName, PageClass, options = {}) {
        // Validate inputs
        if (typeof pageName !== 'string' || !pageName) {
            console.error('registerPage: pageName must be a non-empty string');
            return this;
        }

        if (typeof PageClass !== 'function') {
            console.error('registerPage: PageClass must be a constructor function');
            return this;
        }

        // Store the page class and options
        this.pageClasses.set(pageName, {
            PageClass,
            constructorOptions: options
        });

        // If router is initialized, add route
        if (this.router) {
            // Get route from options or use default
            const route = options.route || `/${pageName}`;
            this.router.addRoute(route, pageName);

            // Also register page name for data-page navigation
            this.router.registerPageName(pageName, route);
        }

        return this;
    }

    /**
     * Get a page if already created (does not instantiate)
     * @param {string} pageName
     * @returns {Page|null}
     */
    getPage(pageName) {
      return this.pageCache.has(pageName) ? this.pageCache.get(pageName) : null;
    }

    /**
     * Get or create a page instance (cached)
     * @param {string} pageName - Name of the page
     * @returns {Page|null} Page instance or null if not found
     */
    getOrCreatePage(pageName) {
        // Return cached instance if exists
        if (this.pageCache.has(pageName)) {
            return this.pageCache.get(pageName);
        }

        // Get registered page info
        const pageInfo = this.pageClasses.get(pageName);
        if (!pageInfo) {
            console.warn(`Page class not found for: ${pageName}`);
            return null;
        }

        // Extract PageClass and options
        const { PageClass, constructorOptions = {} } = pageInfo;

        // Defensive: Ensure PageClass is a valid constructor
        if (typeof PageClass !== 'function') {
            console.error(`Page class for '${pageName}' is not a valid constructor:`, PageClass);
            return null;
        }

        let page = null;

        try {
            // Create and cache the instance with constructor options
            page = new PageClass(constructorOptions);
            page.app = this; // Give page reference to app

            // Ensure pageName is set
            if (!page.pageName) {
                page.pageName = pageName;
            }

            // Initialize if needed
            if (page.onInit && !page.initialized) {
                try {
                    page.onInit();
                    page.initialized = true;
                } catch (initError) {
                    console.error(`Error initializing page '${pageName}':`, initError);
                    // Continue anyway - page may still be usable
                    page.initialized = true;
                }
            }

            // Cache the instance only if creation was successful
            this.pageCache.set(pageName, page);
            return page;

        } catch (error) {
            console.error(`Error creating page instance for '${pageName}':`, error);

            // If page was partially created, try to clean it up
            if (page && page.destroy) {
                try {
                    page.destroy();
                } catch (destroyError) {
                    console.warn(`Error cleaning up failed page '${pageName}':`, destroyError);
                }
            }

            return null;
        }
    }

    /**
     * Show a page with detach/reattach strategy
     * @param {Page} page - Page instance to show
     */
    async showPage(page, options = {}) {
        const container = this.getPageContainer();
        if (!container) {
            console.error('No page container found');
            return;
        }

        if (typeof(page) === 'string') {
            page = this.getOrCreatePage(page);
        }

        // Defensive: If page is invalid/null, do not proceed
        if (!page) {
            console.warn("WebApp: Attempted to show a null/undefined page. Operation cancelled.");
            return;
        }

        // Detach current page if different
        if (this.currentPage && this.currentPage !== page) {
            if (this.currentPage.element?.parentNode) {
                this.currentPage.element.remove();
            }
        }

        console.log(`Showing page: ${page.pageName}`);
        // Ensure page has a container set
        if (!page.container) {
            page.setContainer(container);
        }

        // Ensure page is rendered and has an element
        if (!page.element) {
            try {
                await page.render();
            } catch (error) {
                console.error(`Failed to render page ${page.pageName}:`, error);
                return;
            }
        }

        // Double-check element was created
        if (!page.element) {
            console.warn(`Page ${page.pageName} has no element after render, creating manually`);
            page.createElement();
        }

        // Attach new page if not already in DOM
        if (page.element && !page.element.parentNode) {
            container.appendChild(page.element);
            // Only mount if not already mounted
            if (!page.mounted) {
                await page.mount();
            }
        }

        console.log(`Current page now: ${page.pageName}`);
        this.currentPage = page;

        // Update state
        this.setState({
            currentPage: page.pageName,
            previousPage: this.state.currentPage
        });

        // Try to keep the route in sync (but not if we're already syncing to prevent loops)
        if (!options.noRoute && !this._syncingRoute && this.router && page.route) {
            // Figure out what the correct URL would be for this page
            let targetRoute = typeof page.route === "function"
                ? page.route(page) : page.route;
            // In 'param' mode, synthesize the URL accordingly (optional, based on your param handling logic)
            if (this.router.options.mode === "param" && targetRoute && !targetRoute.startsWith('?')) {
                targetRoute = `?page=${page.pageName}`;
            }
            // If URL is not current, update (avoid infinite loops)
            if (targetRoute && window.location.pathname + window.location.search !== targetRoute) {
                // Set a flag to prevent showPage from syncing routes when called back from router
                this._syncingRoute = true;
                this.router.navigate(targetRoute, { replace: true, silent: true });
                this._syncingRoute = false;
            }
        }
    }



    /**
     * Navigate to a route
     */
    async navigate(route, params = {}, options = {}) {
        if (!this.router) {
            console.error('Router not initialized');
            return;
        }

        // Ergonomic patch: If in 'param' mode and route is a bare page name, convert to ?page=pageName
        if (this.router.options.mode === 'param') {
            // If route does not start with '?' or '/', treat as a pageName and convert to param style
            if (typeof route === 'string' && !route.startsWith('?') && !route.startsWith('/')) {
                route = `?page=${route}`;
            }
        }

        // Update state with route name
        this.state.previousPage = this.state.currentPage;
        this.state.currentPage = route;

        // Notify layout of navigation
        if (this.layout && this.layout.setActivePage) {
            this.layout.setActivePage(route);
        }

        // Perform navigation - router will handle the page instance
        const result = await this.router.navigate(route, { params, ...options });

        // Store reference to current page instance for convenience
        this.currentPage = this.router.currentPageInstance;

        return result;
    }

    /**
     * Navigate back
     */
    back() {
        if (this.router) {
            this.router.back();
        } else {
            window.history.back();
        }
    }

    /**
     * Navigate forward
     */
    forward() {
        if (this.router) {
            this.router.forward();
        } else {
            window.history.forward();
        }
    }

    /**
     * Get current page
     */
    getCurrentPage() {
        // Return the actual page instance from the router
        return this.router ? this.router.currentPageInstance : null;
    }

    /**
     * Get page container element
     */
    getPageContainer() {
        // Try layout first
        if (this.layout && this.layout.getPageContainer) {
            return this.layout.getPageContainer();
        }

        // Fallback to standard container
        return document.querySelector('#page-container') ||
               document.querySelector(this.container);
    }


    /**
     * Show error message
     */
    showError(message, duration = 5000) {
        this.showNotification(message, 'error', duration);
    }

    /**
     * Show success message
     */
    showSuccess(message, duration = 3000) {
        this.showNotification(message, 'success', duration);
    }

    /**
     * Show info message
     */
    showInfo(message, duration = 4000) {
        this.showNotification(message, 'info', duration);
    }

    /**
     * Show warning message
     */
    showWarning(message, duration = 4000) {
        this.showNotification(message, 'warning', duration);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Check if layout handles notifications
        if (this.layout && this.layout.showNotification) {
            this.layout.showNotification(message, type, duration);
            return;
        }

        // Fallback to toast notification
        const alertClass = {
            error: 'alert-danger',
            success: 'alert-success',
            info: 'alert-info',
            warning: 'alert-warning'
        }[type] || 'alert-info';

        const toast = document.createElement('div');
        toast.className = `alert ${alertClass} position-fixed top-0 end-0 m-3`;
        toast.style.zIndex = '9999';
        toast.style.maxWidth = '350px';
        toast.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>${this.escapeHtml(message)}</span>
                <button type="button" class="btn-close btn-sm ms-2" aria-label="Close"></button>
            </div>
        `;

        document.body.appendChild(toast);

        // Add close handler
        const closeBtn = toast.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                toast.remove();
            });
        }

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, duration);
        }

        // Emit event
        this.eventBus.emit('notification:shown', { message, type });
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Loading...') {
        this.state.isLoading = true;

        if (this.layout && this.layout.showLoading) {
            this.layout.showLoading(message);
            return;
        }

        // Fallback loading indicator
        let loader = document.getElementById('app-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'app-loader';
            loader.className = 'position-fixed top-50 start-50 translate-middle text-center';
            loader.style.zIndex = '9998';
            loader.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">${this.escapeHtml(message)}</span>
                </div>
                <div class="mt-2">${this.escapeHtml(message)}</div>
            `;
            document.body.appendChild(loader);
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.state.isLoading = false;

        if (this.layout && this.layout.hideLoading) {
            this.layout.hideLoading();
            return;
        }

        // Remove fallback loader
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.remove();
        }
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
            if (this.debug) {
                this.showError(`Error: ${event.error.message}`);
            }
        });

        // Handle promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (this.debug) {
                this.showError(`Unhandled promise rejection`);
            }
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get app state
     */
    getState(key) {
        return key ? this.state[key] : this.state;
    }

    /**
     * Set app state
     */
    setState(key, value) {
        if (typeof key === 'object') {
            Object.assign(this.state, key);
            this.eventBus.emit('state:changed', this.state);
        } else {
            const oldValue = this.state[key];
            this.state[key] = value;
            this.eventBus.emit('state:changed', { key, value, oldValue });
        }
    }

    /**
     * Register a component
     */
    registerComponent(name, component) {
        this.components.set(name, component);
        return this;
    }

    /**
     * Get a component
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * Register a model
     */
    registerModel(name, model) {
        this.models.set(name, model);
        return this;
    }

    /**
     * Get a model
     */
    getModel(name) {
        return this.models.get(name);
    }

    /**
     * Destroy the application
     */
    async destroy() {
        // Stop router
        if (this.router) {
            this.router.stop();
        }

        // Destroy layout
        if (this.layout && this.layout.destroy) {
            await this.layout.destroy();
        }

        // Clear pages
        for (const [_name, page] of this.pages) {
            if (page.destroy) {
                // eslint-disable-next-line no-await-in-loop
                await page.destroy();
            }
        }

        // Clear registries
        this.pages.clear();
        this.components.clear();
        this.models.clear();

        // Clear global references
        if (window.APP === this) {
            delete window.APP;
        }
        if (window.MOJO && window.MOJO.app === this) {
            delete window.MOJO.app;
        }

        // Emit destroy event
        this.eventBus.emit('app:destroyed');
    }

    /**
     * Static factory method
     */
    static create(config) {
        return new WebApp(config);
    }
}

export default WebApp;
