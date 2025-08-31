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

        // Listen for route changes - router already resolved everything
        this.events.on('route:changed', async (routeInfo) => {
            const { pageName, params, query } = routeInfo;
            await this.showPage(pageName, query, params, { fromRouter: true });
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
            // Setup page container
            this.setupPageContainer();

            // Validate default route before starting router
            this.validateDefaultRoute();

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

        this.events.on('route:notfound', async (info) => {
            console.warn(`Route not found: ${info.path}`);
            // RENDER 404 PAGE IN PLACE: Just render, don't navigate
            this._show404(info.path);
        });

        // Start the router to begin handling routes
        this.router.start();
        console.log(`Router started in ${this.routerMode} mode`);
    }

    /**
     * Setup layout based on configuration
     */
    setupPageContainer() {
        // Simple page container setup - no complex layouts
        const container = typeof this.container === 'string'
            ? document.querySelector(this.container)
            : this.container;

        if (container && !container.querySelector('#page-container')) {
            container.innerHTML = '<div id="page-container"></div>';
        }

        this.pageContainer = '#page-container';
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
        this.pageClasses.set(pageName, {
            PageClass,
            constructorOptions: options
        });

        // If router is initialized, add route
        if (this.router) {
            // Get route pattern from options or use default (/pageName)
            let route = options.route || `/${pageName}`;

            // Ensure route starts with / for pattern matching
            if (!route.startsWith('/')) {
                route = `/${route}`;
            }

            // Store the route pattern in options so page instances can access it
            options.route = route;

            // Register route with router
            this.router.addRoute(route, pageName);

            console.log(`📝 Registered route: "${route}" -> ${pageName}`);
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
    /**
     * SIMPLIFIED UNIFIED PAGE SHOWING METHOD
     * @param {string|object} page - Page name or page instance
     * @param {object} query - URL query parameters (URL-safe)
     * @param {object} params - Any data to pass to page (can include objects)
     * @param {object} options - Options { fromRouter, replace, force }
     */
    async showPage(page, query = {}, params = {}, options = {}) {
        const { fromRouter = false, replace = false, force = false } = options;

        try {
            // 1. RESOLVE PAGE INSTANCE
            let pageInstance, pageName;
            if (typeof page === 'string') {
                pageName = page;
                pageInstance = this.getOrCreatePage(page);
            } else if (page && typeof page === 'object') {
                pageInstance = page;
                pageName = page.pageName;
            }
            const oldPage = this.currentPage;
            if (!pageInstance) {
                this._show404(pageName, params, query, fromRouter);
                return; // Keep current URL, don't update router/history
            }

            // 2. PERMISSION CHECK
            if (!pageInstance.canEnter()) {
                this._showDeniedPage(pageInstance, params, query, fromRouter);
                return; // Keep current URL, don't update router/history
            }

            // 3. EXIT CURRENT PAGE
            if (oldPage && oldPage !== pageInstance) {
                await this._exitOldPage(oldPage);
            }


            // 4. UPDATE PAGE DATA
            await pageInstance.onParams(params, query);

            // 5. ENTER NEW PAGE
            if (oldPage !== pageInstance) {
                await pageInstance.onEnter();
            }

            pageInstance.syncUrl();

            // 6. RENDER PAGE (automatically replaces DOM content)
            await pageInstance.render();
            this.currentPage = pageInstance;

            // 8. EMIT SUCCESS EVENT
            this.events.emit('page:show', {
                page: pageInstance,
                pageName: pageInstance.pageName,
                params,
                query,
                fromRouter
            });

            console.log(`✅ Showing page: ${pageInstance.pageName}`, { query, params });

        } catch (error) {
            console.error('Error in showPage:', error);
            this.showError(`Failed to load page: ${error.message}`);

            // Fallback to error page
            if (page !== 'error') {
                await this.showPage('error', {}, { error, originalPage: page }, { fromRouter });
            }
        }
    }

    async _show404(pageName, params, query, fromRouter) {
        const notFoundPage = this.getOrCreatePage('404');
        if (!notFoundPage) return;
        if (notFoundPage.setInfo) {
            notFoundPage.setInfo(pageName);
        }
        await this._exitOldPage(this.currentPage);
        await notFoundPage.render(); // Render over current page
        this.currentPage = notFoundPage;
        this.events.emit('page:404', {
            page: null,
            pageName: pageName,
            params,
            query,
            fromRouter
        });
    }

    async _showDeniedPage(pageInstance, params, query, fromRouter) {
        const deniedPage = this.getOrCreatePage('denied');
        if (deniedPage.setDeniedPage) {
            deniedPage.setDeniedPage(pageInstance);
        }
        await this._exitOldPage(this.currentPage);
        await deniedPage.render(); // Render over current page
        this.currentPage = deniedPage;
        this.events.emit('page:denied', {
            page: pageInstance,
            pageName: pageInstance.pageName,
            params,
            query,
            fromRouter
        });
    }

    async _exitOldPage(oldPage) {
        if (!oldPage) return;
        try {
            await oldPage.onExit();
            await oldPage.unmount();
            this.events.emit('page:hide', { page: oldPage });
        } catch (error) {
            console.error(`Error exiting page ${oldPage.pageName}:`, error);
        }
    }

    /**
     * SIMPLIFIED NAVIGATION - delegates to router
     * @param {string} route - Route like "/users" or "/users/123"
     * @param {object} query - Query string params { filter: 'active' }
     * @param {object} options - Navigation options { replace, force }
     */
    async navigate(route, query = {}, options = {}) {
        if (!this.router) {
            console.error('Router not initialized');
            return;
        }

        console.log('🧭 WebApp.navigate:', { route, query, options });

        // Build full path with query parameters
        let fullPath = route;
        if (Object.keys(query).length > 0) {
            const queryString = new URLSearchParams(query).toString();
            fullPath += (route.includes('?') ? '&' : '?') + queryString;
        }

        // Let router handle everything - it will emit route:changed back to us
        return await this.router.navigate(fullPath, options);
    }

    /**
     * Navigate to the default route
     */
    async navigateToDefault(options = {}) {
        return await this.showPage(this.defaultRoute, {}, {}, options);
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
        console.log(`✨ ${this.name} destroyed`);
    }

    /**
     * Build page path with params and query
     */
    buildPagePath(page, params, query) {
        let path = page.route || `/${page.pageName.toLowerCase()}`;

        // Replace :param tokens with actual values
        Object.keys(params).forEach(key => {
            if (typeof params[key] === 'string' || typeof params[key] === 'number') {
                path = path.replace(`:${key}`, params[key]);
            }
        });

        // Add query parameters
        if (query && Object.keys(query).length > 0) {
            const queryString = new URLSearchParams(query).toString();
            path += (path.includes('?') ? '&' : '?') + queryString;
        }

        return path;
    }

    /**
     * Static factory method
     */
    /**
     * Validate that default route has a registered page
     */
    validateDefaultRoute() {
        if (!this.pageClasses.has(this.defaultRoute)) {
            console.warn(`⚠️  Default route '${this.defaultRoute}' is not registered!`);
            console.warn(`   Please register a page: app.registerPage('${this.defaultRoute}', YourPageClass);`);
            console.warn(`   Or change default route: new WebApp({ defaultRoute: 'your-page' });`);
        } else {
            console.log(`✅ Default route '${this.defaultRoute}' is registered`);
        }
    }

    /**
     * Find any registered page to use as emergency fallback
     */
    findFallbackPage() {
        // Skip system pages
        const systemPages = ['404', 'error', 'denied'];

        for (const [pageName] of this.pageClasses.entries()) {
            if (!systemPages.includes(pageName)) {
                return pageName;
            }
        }

        return null; // No pages available
    }

    static create(config = {}) {
        return new WebApp(config);
    }
}

export default WebApp;
