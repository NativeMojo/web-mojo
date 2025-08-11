/**
 * WebApp - Central application container for MOJO framework
 * Handles configuration, routing, pages, REST interface, and layout management
 */

import Router from '../core/Router.js';
import EventBus from '../utils/EventBus.js';
import rest from '../core/Rest.js';

class WebApp {
    constructor(config = {}) {
        // Core configuration
        this.name = config.name || 'MOJO App';
        this.version = config.version || '1.0.0';
        this.debug = config.debug || false;
        this.container = config.container || '#app';
        this.basePath = config.basePath || '';
        
        // Router configuration
        this.router = null;
        this.routerMode = config.routerMode || 'param'; // 'param', 'hash', 'history'
        this.basePath = config.basePath || '';
        this.defaultRoute = config.defaultRoute || 'home';
        
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
        this.pages = new Map();
        this.components = new Map();
        this.models = new Map();
        
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
            
            // Initialize registered pages
            await this.initializePages();
            
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
        this.router = new Router({
            mode: this.routerMode,
            basePath: this.basePath,
            caseSensitive: false,
            container: this.container  // Use app container but we'll intercept rendering
        });
        
        // Make router globally accessible
        if (window.MOJO) {
            window.MOJO.router = this.router;
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
     * Initialize all registered pages
     */
    async initializePages() {
        for (const [name, PageClass] of this.pages) {
            // Create a wrapper handler that renders through the layout
            const routeHandler = async (params, query) => {
                const page = new PageClass();
                page.onParams(params, query);
                
                // Call page lifecycle methods
                if (page.onInit && !page.initialized) {
                    await page.onInit();
                    page.initialized = true;
                }
                
                if (page.onEnter) {
                    await page.onEnter();
                }
                
                // Render through layout if available
                if (this.layout && this.layout.renderPage) {
                    await this.layout.renderPage(page);
                } else {
                    // Fallback to direct render
                    const container = this.getPageContainer();
                    if (container) {
                        page.setContainer(container);
                        await page.render();
                        await page.mount();
                    }
                }
                
                // Store current page instance
                this.router.currentPageInstance = page;
                
                return page;
            };
            
            // Register the wrapper handler with router
            const pageName = PageClass.pageName || new PageClass().pageName;
            if (pageName) {
                this.router.addRoute(pageName, routeHandler);
                
                // Also register root route for default page
                if (pageName === this.defaultRoute) {
                    this.router.addRoute('/', routeHandler);
                }
            }
        }
    }
    
    /**
     * Register a page class
     */
    addPage(PageClass) {
        // Support both class and instance
        const isClass = typeof PageClass === 'function';
        const pageName = isClass ? PageClass.pageName : PageClass.pageName;
        
        if (!pageName) {
            console.warn('Page must have a pageName property');
            return this;
        }
        
        this.pages.set(pageName, PageClass);
        
        // If router is already initialized, add route immediately
        if (this.router && isClass) {
            const routeHandler = async (params, query) => {
                const page = new PageClass();
                page.onParams(params, query);
                
                if (page.onInit && !page.initialized) {
                    await page.onInit();
                    page.initialized = true;
                }
                
                if (page.onEnter) {
                    await page.onEnter();
                }
                
                // Render through layout if available
                if (this.layout && this.layout.renderPage) {
                    await this.layout.renderPage(page);
                } else {
                    const container = this.getPageContainer();
                    if (container) {
                        page.setContainer(container);
                        await page.render();
                        await page.mount();
                    }
                }
                
                this.router.currentPageInstance = page;
                return page;
            };
            
            const pageName = PageClass.pageName || new PageClass().pageName;
            if (pageName) {
                this.router.addRoute(pageName, routeHandler);
            }
        }
        
        return this;
    }
    
    /**
     * Register multiple pages at once
     */
    addPages(pages) {
        if (Array.isArray(pages)) {
            pages.forEach(page => this.addPage(page));
        } else if (typeof pages === 'object') {
            Object.values(pages).forEach(page => this.addPage(page));
        }
        return this;
    }
    
    /**
     * Navigate to a route
     */
    async navigate(route, params = {}, options = {}) {
        if (!this.router) {
            console.error('Router not initialized');
            return;
        }
        
        // Update state
        this.state.previousPage = this.state.currentPage;
        this.state.currentPage = route;
        
        // Notify layout of navigation
        if (this.layout && this.layout.setActivePage) {
            this.layout.setActivePage(route);
        }
        
        // Perform navigation
        return this.router.navigate(route, { params, ...options });
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
        return this.state.currentPage;
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
        for (const [name, page] of this.pages) {
            if (page.destroy) {
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