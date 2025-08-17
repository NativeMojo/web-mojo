/**
 * WebApp - Central application container for MOJO framework
 * Handles configuration, routing, pages, REST interface, layout management, and global events
 *
 * Global Event System:
 *   Provides a global EventBus at this.events for cross-cutting application concerns
 *   Emits framework-wide events that any component can subscribe to
 *   Enables loose coupling between different parts of the application
 *
 * Standard Global Events Emitted:
 *   - 'app:ready' - When application has fully started
 *   - 'notification' - For all user notifications (error, success, info, warning)
 *   - 'loading:show' - When loading indicator should be shown
 *   - 'loading:hide' - When loading indicator should be hidden
 *   - 'state:changed' - When application state changes
 *   - Router events are also emitted via this.events (see Router documentation)
 */

import Router from '../core/Router.js';
import EventBus from '../utils/EventBus.js';
import rest from '../core/Rest.js';
import Portal from './Portal.js';

class WebApp {
    constructor(config = {}) {
        // Core configuration
        this.name = config.name || 'MOJO App';
        this.version = config.version || '1.0.0';
        this.debug = config.debug || false;
        this.container = config.container || '#app';

        // Layout configuration
        this.layoutType = config.layout || 'portal'; // 'portal', 'single', 'custom', 'none'
        this.layoutConfig = config.layoutConfig || {};
        if (config.sidebar) {
            this.layoutConfig.sidebarConfig = config.sidebar;
        }
        if (config.topbar) {
            this.layoutConfig.topbarConfig = config.topbar;
        }
        this.layout = null;

        this.layoutConfig.containerId = this.container || this.containerId || '#app';
        this.pageContainer = config.pageContainer || '#page-container';
        this.basePath = config.basePath || '';

        // Router configuration
        this.routerMode = config.routerMode || config.router?.mode || 'param'; // 'param', 'hash', 'history'
        this.basePath = config.basePath || config.router?.base || '';
        this.defaultRoute = config.defaultRoute || 'home';

        // Store session config if provided
        this.session = config.session || {};

        // Initialize router placeholder
        this.router = null;

        // Navigation configuration - support both old and new structure
        this.navigation = config.navigation || {};

        // State management
        this.state = {
            currentPage: null,
            previousPage: null,
            loading: false
        };

        // Global event bus (singleton for the app)
        this.events = new EventBus();
        this.rest = rest;
        if (config.api) {
            this.rest.configure(config.api);
        }

        // Initialize router with event integration after EventBus is ready
        this.router = new Router({
            mode: this.routerMode === 'param' ? 'params' : this.routerMode,
            basePath: this.basePath,
            defaultRoute: this.defaultRoute,
            eventEmitter: this.events
        });

        // Listen for route changes to update pages
        this.events.on('route:changed', async (routeInfo) => {
            await this.handleRouteChange(routeInfo);
        });

        this.events.on('route:notfound', async (info) => {
            console.warn(`Route not found: ${info.path}`);

            // Try to navigate to default route instead of showing error
            if (info.path !== `/${this.defaultRoute}`) {
                console.log(`🔄 Redirecting to default route: ${this.defaultRoute}`);
                await this.navigateToDefault({ replace: true });
            } else {
                // If default route also not found, show error
                this.showError(`Page not found: ${info.path}`);
            }
        });

        // Make router globally accessible
        if (typeof window !== 'undefined') {
            window.MOJO = window.MOJO || {};
            window.MOJO.router = this.router;
        }

        // Component registries
        this.pageCache = new Map();     // pageName -> page instance (cached)
        this.pageClasses = new Map();   // pageName -> {PageClass, constructorOptions}
        this.componentClasses = new Map(); // componentName -> ComponentClass
        this.modelClasses = new Map();  // modelName -> ModelClass

        // Current page reference
        this.currentPage = null;

        // Runtime flags
        this.isStarted = false;

        if (window.matchUUID) {
            window[window.matchUUID] = this;
        } else if (window.MOJO) {
            window.MOJO.app = this;
        } else {
            window.__app__ = this;
        }
        console.log(`WebApp initialized: ${this.name} v${this.version}`);
    }

    /**
     * Start the application
     */
    async start() {
        if (this.isStarted) {
            console.warn('WebApp already started');
            return;
        }

        try {
            console.log(`Starting ${this.name}...`);

            // Setup global REST configuration
            // this.setupRest();
            // Setup layout
            console.log('Setting up layout...');
            await this.setupLayout();

            // Setup router
            console.log('Setting up router...');
            await this.setupRouter();


            // Mark as started
            this.isStarted = true;

            // Emit app ready event
            this.events.emit('app:ready', { app: this });

            console.log(`✅ ${this.name} started successfully`);
        } catch (error) {
            console.error(`Failed to start ${this.name}:`, error);
            this.showError('Failed to start application');
            throw error;
        }
    }

    /**
     * Setup router with configuration
     */
    async setupRouter() {
        if (!this.router) {
            console.error('Router not initialized');
            return;
        }

        // Start the router to begin handling routes
        this.router.start();
        console.log(`Router started in ${this.routerMode} mode`);
    }

    /**
     * Setup layout based on configuration
     */
    async setupLayout() {
        // Dynamic layout loading based on type
        switch (this.layoutType) {
            case 'portal': {
                // const { Portal } = await import('./Portal.js');
                this.layout = new Portal({
                    app: this,
                    ...this.layoutConfig
                });
                await this.layout.render();
                break;
            }

            case 'single': {
                // Single page layout - minimal container
                const container = typeof this.container === 'string'
                    ? document.querySelector(this.container)
                    : this.container;
                if (container) {
                    container.innerHTML = '<div id="page-container"></div>';
                    this.pageContainer = '#page-container';
                }
                break;
            }

            case 'custom': {
                // Custom layout - user provides their own
                if (this.layoutConfig.layoutClass) {
                    this.layout = new this.layoutConfig.layoutClass({
                        container: this.container,
                        config: this.layoutConfig,
                        app: this
                    });
                    await this.layout.init();
                }
                break;
            }

            case 'none':
                // No layout, pages render directly
                break;
        }
    }


    /**
     * Register a page with the app
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

        if (!options.containerId) options.containerId = this.pageContainer;
        // Store the page class and options
        if(!options.route) options.route = `/${pageName}`;
        this.pageClasses.set(pageName, {
            PageClass,
            constructorOptions: options
        });

        // If router is initialized, add route
        if (this.router) {
            // Get route from options or use default
            let route = options.route || `/${pageName}`;

            // Normalize route based on router mode
            if (this.router.mode === 'params') {
                // In params mode, ensure route starts with / for consistent pattern matching
                route = route.startsWith('/') ? route : `/${route}`;
            } else {
                // In history mode, ensure route starts with /
                route = route.startsWith('/') ? route : `/${route}`;
            }

            // Store the route back in options so page instances can access it
            options.route = route;

            // Register route with router
            this.router.addRoute(route, pageName);

            console.log(`📝 Registered route: "${route}" -> ${pageName} (${this.router.mode} mode)`);
        }

        return this;
    }

    /**
     * Get page instance (cached)
     */
    getPage(pageName) {
        return this.pageCache.get(pageName);
    }

    /**
     * Get or create page instance (with caching)
     */
    getOrCreatePage(pageName) {
        // Check cache first
        if (this.pageCache.has(pageName)) {
            return this.pageCache.get(pageName);
        }

        // Check if page class is registered
        const pageInfo = this.pageClasses.get(pageName);
        if (!pageInfo) {
            console.error(`Page not registered: ${pageName}`);
            return null;
        }

        const { PageClass, constructorOptions } = pageInfo;

        try {
            // Create page instance with merged options
            const pageOptions = {
                pageName,
                ...constructorOptions,
                app: this
            };

            const page = new PageClass(pageOptions);

            // Store route information on page instance for easy access
            if (constructorOptions.route) {
                page.route = constructorOptions.route;
            }

            // Cache the instance
            this.pageCache.set(pageName, page);

            console.log(`Created page: ${pageName} with route: ${page.route}`);
            return page;

        } catch (error) {
            console.error(`Failed to create page ${pageName}:`, error);
            return null;
        }
    }

    /**
     * Show a page
     */
    async showPage(page, options = {}) {
        if (!page) {
            console.error('Cannot show null/undefined page');
            return;
        }

        try {
            // Set current page reference
            this.currentPage = page;

            // Mount page if needed
            if (!page.isMounted) {
                await page.mount();
            }

            // Render page
            await page.render();

            // Show page content
            if (page.element) {
                page.element.style.display = 'block';
            }

            // Sync with router if needed
            if (!options.noRoute && this.router && page.route && !this._syncingRoute) {
                // Get current path to check if we need to sync
                const currentPath = this.router.getCurrentPath();
                const targetRoute = this.router.convertRoute(page.route);

                if (currentPath !== targetRoute) {
                    // Set a flag to prevent showPage from syncing routes when called back from router
                    this._syncingRoute = true;
                    this.router.navigate(targetRoute, { replace: true, silent: false });
                    this._syncingRoute = false;
                }
            }

        } catch (error) {
            console.error('Error showing page:', error);
            throw error;
        }
    }

    /**
     * Navigate to a route
     */
    async navigate(route, params = {}, options = {}) {
        // Debug navigation to track URL generation issues
        console.log('🧭 WebApp.navigate called:');
        console.log('  - Route:', route);
        console.log('  - Params:', params);
        console.log('  - Options:', options);
        console.log('  - Router mode:', this.router?.mode);

        if (!this.router) {
            console.error('Router not initialized');
            return;
        }

        // Build path with parameters if needed
        let path = route;
        if (params && Object.keys(params).length > 0) {
            // Replace :param patterns in route
            Object.keys(params).forEach(key => {
                path = path.replace(`:${key}`, params[key]);
            });
        }

        console.log('  - Final path being sent to router:', path);

        // Update state
        this.state.previousPage = this.state.currentPage;
        this.state.currentPage = route;

        // Navigate using simplified router
        return await this.router.navigate(path, options);
    }

    /**
     * Navigate to the default route
     */
    async navigateToDefault(options = {}) {
        if (!this.router) {
            console.error('Router not initialized');
            return;
        }

        console.log(`🏠 Navigating to default route: ${this.defaultRoute}`);
        return await this.navigate(`/${this.defaultRoute}`, {}, options);
    }

    /**
     * Handle route changes from the router
     */
    async handleRouteChange(routeInfo) {
        const { pageName, params, query, path } = routeInfo;

        try {
            // Get or create page instance
            const page = this.getOrCreatePage(pageName);
            if (!page) {
                console.error(`Page not found: ${pageName}`);
                return;
            }

            // Transition to the page
            await this.transitionToPage(page, params, query);

            // Update current page reference
            this.currentPage = page;

            // Emit page show event for Sidebar and other listeners
            this.events.emit('page:show', {
                page,
                pageName,
                params,
                query,
                path
            });

            // Emit route:change event for Sidebar compatibility
            this.events.emit('route:change', {
                path,
                params,
                query,
                page,
                match: {
                    pageName,
                    params,
                    query
                }
            });

        } catch (error) {
            console.error('Error handling route change:', error);
            this.showError('Failed to load page');
        }
    }

    /**
     * Transition between pages
     */
    async transitionToPage(newPage, params = {}, query = {}) {
        const oldPage = this.currentPage;

        // Exit old page
        if (oldPage && oldPage !== newPage) {
            try {
                await oldPage.onExit();
                this.events.emit('page:hide', { page: oldPage });
            } catch (error) {
                console.error(`Error in onExit for page ${oldPage.pageName}:`, error);
            }
        }

        // Update params for new page
        if (newPage.onParams) {
            await newPage.onParams(params, query);
        }

        // Enter new page
        if (oldPage !== newPage) {
            try {
                await newPage.onEnter();
            } catch (error) {
                console.error(`Error in onEnter for page ${newPage.pageName}:`, error);
            }

            // Show page in the UI
            await this.showPage(newPage, { noRoute: true });
        }
    }

    /**
     * Navigate back
     */
    back() {
        if (this.router) {
            this.router.back();
        } else {
            console.warn('Router not initialized');
        }
    }

    /**
     * Navigate forward
     */
    forward() {
        if (this.router) {
            this.router.forward();
        } else {
            console.warn('Router not initialized');
        }
    }

    /**
     * Get current page
     */
    getCurrentPage() {
        return this.currentPage;
    }

    /**
     * Get page container element
     */
    getPageContainer() {
        // Try layout first
        if (this.layout && this.layout.getPageContainer) {
            return this.layout.getPageContainer();
        }

        // Fallback to configured container
        const container = typeof this.pageContainer === 'string'
            ? document.querySelector(this.pageContainer)
            : this.pageContainer;

        return container;
    }

    /**
     * Show error notification
     */
    showError(message) {
        this.events.emit('notification', { message, type: 'error' });
    }

    /**
     * Show success notification
     */
    showSuccess(message) {
        this.events.emit('notification', { message, type: 'success' });
    }

    /**
     * Show info notification
     */
    showInfo(message) {
        this.events.emit('notification', { message, type: 'info' });
    }

    /**
     * Show warning notification
     */
    showWarning(message) {
        this.events.emit('notification', { message, type: 'warning' });
    }

    /**
     * Show generic notification
     */
    showNotification(message, type = 'info') {
        this.events.emit('notification', { message, type });
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Loading...') {
        this.state.loading = true;
        this.events.emit('loading:show', { message });
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.state.loading = false;
        this.events.emit('loading:hide');
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            if (this.debug) {
                this.showError(`Error: ${event.error?.message || 'Unknown error'}`);
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (this.debug) {
                this.showError(`Promise rejected: ${event.reason?.message || 'Unknown error'}`);
            }
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Get application state
     */
    getState(key) {
        return key ? this.state[key] : this.state;
    }

    /**
     * Set application state
     */
    setState(updates) {
        const oldState = { ...this.state };
        Object.assign(this.state, updates);

        // Emit state change event
        this.events.emit('state:changed', {
            oldState,
            newState: this.state,
            updates
        });
    }

    /**
     * Register component class
     */
    registerComponent(name, ComponentClass) {
        this.componentClasses.set(name, ComponentClass);
    }

    /**
     * Get component class
     */
    getComponent(name) {
        return this.componentClasses.get(name);
    }

    /**
     * Register model class
     */
    registerModel(name, ModelClass) {
        this.modelClasses.set(name, ModelClass);
    }

    /**
     * Get model class
     */
    getModel(name) {
        return this.modelClasses.get(name);
    }

    /**
     * Setup REST configuration
     */
    setupRest() {
        this.rest = rest;
        rest.configure(this.api);
    }

    /**
     * Destroy the application
     */
    async destroy() {
        console.log('Destroying WebApp...');

        // Stop router
        if (this.router) {
            this.router.stop();
        }

        // Destroy all cached pages
        const pages = Array.from(this.pageCache.values());
        await Promise.allSettled(
            pages.map(async (page) => {
                try {
                    if (page.destroy) {
                        await page.destroy();
                    }
                } catch (error) {
                    console.error('Error destroying page:', error);
                }
            })
        );

        // Destroy layout
        if (this.layout && this.layout.destroy) {
            try {
                await this.layout.destroy();
            } catch (error) {
                console.error('Error destroying layout:', error);
            }
        }

        // Clear all registries
        this.pageCache.clear();
        this.pageClasses.clear();
        this.componentClasses.clear();
        this.modelClasses.clear();

        // Remove global references
        if (typeof window !== 'undefined' && window.MOJO) {
            delete window.MOJO.router;
        }

        this.isStarted = false;
        console.log('WebApp destroyed');
    }

    /**
     * Static factory method
     */
    static create(config) {
        return new WebApp(config);
    }
}

export default WebApp;
