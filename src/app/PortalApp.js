/**
 * PortalApp - Complete portal application extending WebApp
 * Provides built-in navigation, sidebar, and content management
 * Clean, simple implementation that reuses WebApp and View logic
 */

import WebApp from './WebApp.js';
import TopNav from '../components/TopNav.js';
import Sidebar from '../components/Sidebar.js';

export default class PortalApp extends WebApp {
    constructor(config = {}) {
        // Pass core WebApp config through
        super(config);

        this.sidebarConfig = {};
        // Portal-specific configuration (clean flat structure)
        if (config.sidebar && config.sidebar.menus) {
            this.sidebarConfig.menus = config.sidebar.menus;
        } else if (config.sidebar.menu) {
            this.sidebarConfig.menu = config.sidebar.menu;
        } else if (config.sidebar.items) {
            this.sidebarConfig.menu = config.sidebar;
        }

        this.topbarConfig = config.topbar || {};

        // Legacy support - topnav -> topbar
        if (config.topnav && !config.topbar) {
            this.topbarConfig = config.topnav;
        }

        // Portal components
        this.sidebar = null;
        this.topbar = null;
        this.topnav = null; // Legacy reference

        // Portal state - Load from localStorage first, then fallback to config
        if (!this.isMobile()) {
            this.sidebarCollapsed = this.loadSidebarState() ??
                (this.sidebarConfig.defaultCollapsed || false);
        } else {
            this.sidebarCollapsed = this.sidebarConfig.defaultCollapsed || false;
        }
    }

    /**
     * Override WebApp start to setup portal layout
     */
    async start() {
        // Call parent start (handles router, error handling, etc.)
        await super.start();

        // Setup portal components after WebApp is ready
        await this.setupPortalComponents();

        console.log(`${this.title} portal ready`);
    }

    /**
     * Setup layout based on configuration
     */
    setupPageContainer() {
        const container = typeof this.container === 'string'
            ? document.querySelector(this.container)
            : this.container;

        if (!container) {
            throw new Error(`Portal container not found: ${this.container}`);
        }

        // Create clean portal layout
        const showSidebar = this.sidebarConfig && Object.keys(this.sidebarConfig).length > 0;
        const showTopbar = this.topbarConfig && Object.keys(this.topbarConfig).length > 0;

        container.innerHTML = `
            <div class="portal-layout hide-sidebar">
                ${showSidebar ? '<div id="portal-sidebar"></div>' : ''}
                <div class="portal-body">
                    ${showTopbar ? '<div id="portal-topnav"></div>' : ''}
                    <div class="portal-content" id="page-container">
                        <!-- Pages render here -->
                    </div>
                </div>
            </div>
        `;

        // Set page container for WebApp
        this.pageContainer = '#page-container';

        // Add portal CSS classes and apply saved state
        container.classList.add('portal-container');

        // Apply the saved sidebar state
        this.applySidebarState(container);
    }

    /**
     * Setup portal components
     */
    async setupPortalComponents() {
        await this.setupSidebar();
        await this.setupTopbar();
        this.setupPortalEvents();
    }

    /**
     * Setup sidebar component
     */
    async setupSidebar() {
        if (!this.sidebarConfig || Object.keys(this.sidebarConfig).length === 0) return;

        this.sidebar = new Sidebar({
            containerId: 'portal-sidebar',
            ...this.sidebarConfig
        });

        await this.sidebar.render();
    }

    /**
     * Setup topbar component
     */
    async setupTopbar() {
        if (!this.topbarConfig || Object.keys(this.topbarConfig).length === 0) return;

        // Map config to TopNav format
        this.topbar = new TopNav({
            containerId: "portal-topnav",
            className: `navbar navbar-expand-lg ${this.topbarConfig.theme || 'navbar-dark bg-primary'}`,
            brandText: this.topbarConfig.brand || this.brand || this.title,
            brandRoute: this.topbarConfig.brandRoute || '/',
            brandIcon: this.topbarConfig.brandIcon || this.brandIcon,
            navItems: this.topbarConfig.leftItems || [],
            rightItems: this.topbarConfig.rightItems || [],
            displayMode: this.topbarConfig.displayMode || 'both',
            showSidebarToggle: this.topbarConfig.showSidebarToggle || false
        });

        await this.topbar.render();

        // Legacy support
        this.topnav = this.topbar;
    }

    /**
     * Setup portal event handling
     */
    setupPortalEvents() {
        // Handle sidebar toggle via event delegation
        document.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="toggle-sidebar"]')) {
                event.preventDefault();
                this.toggleSidebar();
            }
        });

        // Handle responsive changes
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                this.handleResponsive();
            });
            resizeObserver.observe(document.body);
            this._resizeObserver = resizeObserver;
        } else {
            // Fallback for older browsers
            this._resizeHandler = () => this.handleResponsive();
            window.addEventListener('resize', this._resizeHandler);
        }

        // Initial responsive setup
        this.handleResponsive();
    }

    /**
     * Toggle sidebar state
     */
    toggleSidebar() {
        if (!this.sidebar) return;

        const container = document.querySelector('.portal-container');
        const isMobile = this.isMobile();

        if (isMobile) {
            container.classList.toggle('hide-sidebar');
        } else {
            container.classList.toggle('collapse-sidebar');
            this.sidebarCollapsed = !this.sidebarCollapsed;

            // Save the new state
            this.saveSidebarState(this.sidebarCollapsed);
        }

        this.events.emit('sidebar:toggled', {
            collapsed: this.sidebarCollapsed,
            mobile: isMobile
        });
    }

    /**
     * Handle responsive layout
     */
    handleResponsive() {
        const container = document.querySelector('.portal-container');
        if (!container) return;
        const isMobile = this.isMobile();

        if (isMobile) {
            container.classList.add('mobile-layout');
            if (!container.classList.contains('hide-sidebar')) {
                container.classList.add('hide-sidebar');
            }
        } else {
            container.classList.remove('mobile-layout', 'hide-sidebar');
        }

        this.events.emit('responsive:changed', { mobile: isMobile });
    }

    getPortalContainer() {
        return document.querySelector('.portal-container');
    }

    isMobile() {
        return window.innerWidth < 768;
    }

    hasMobileLayout() {
        return this.getPortalContainer().classList.contains('mobile-layout');
    }

    /**
     * Override showPage to update navigation
     */
    async showPage(pageName, options = {}) {
        const result = await super.showPage(pageName, options);

        if (this.hasMobileLayout()) {
            this.getPortalContainer().classList.add('hide-sidebar');
        }

        if (result && this.currentPageInstance) {
            this.updateNavigation(this.currentPageInstance);
        }

        return result;
    }

    /**
     * Update navigation active states
     */
    updateNavigation(page) {
        // Update sidebar active state
        if (this.sidebar && this.sidebar.setActivePage) {
            this.sidebar.setActivePage(page.route);
        }

        // Update topbar active state
        if (this.topbar && this.topbar.setActivePage) {
            this.topbar.setActivePage(page.route);
        }

        this.events.emit('portal:page-changed', { page });
    }

    /**
     * Set active user
     */
    setActiveUser(user) {
        this.activeUser = user;

        if (this.topbar && this.topbar.setModel) {
            this.topbar.setModel(user);
        }

        this.events.emit('portal:user-changed', { user });
    }

    /**
     * Save sidebar state to localStorage
     */
    saveSidebarState(collapsed) {
        try {
            const key = this.getSidebarStorageKey();
            localStorage.setItem(key, JSON.stringify(collapsed));
        } catch (error) {
            console.warn('Failed to save sidebar state:', error);
        }
    }

    /**
     * Load sidebar state from localStorage
     */
    loadSidebarState() {
        try {
            const key = this.getSidebarStorageKey();
            const saved = localStorage.getItem(key);
            return saved !== null ? JSON.parse(saved) : null;
        } catch (error) {
            console.warn('Failed to load sidebar state:', error);
            return null;
        }
    }

    /**
     * Get storage key for sidebar state (allows multiple apps on same domain)
     */
    getSidebarStorageKey() {
        // Use app title/name to create unique key
        const appKey = this.title ? this.title.replace(/\s+/g, '_').toLowerCase() : 'portal_app';
        return `${appKey}_sidebar_collapsed`;
    }

    /**
     * Apply saved sidebar state to the UI
     */
    applySidebarState(container = null) {
        if (!container) {
            container = document.querySelector('.portal-container');
        }

        if (!container) return;

        if (this.sidebarCollapsed) {
            container.classList.add('collapse-sidebar');
        } else {
            container.classList.remove('collapse-sidebar');
        }
    }

    /**
     * Clear saved sidebar state
     */
    clearSidebarState() {
        try {
            const key = this.getSidebarStorageKey();
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('Failed to clear sidebar state:', error);
        }
    }

    /**
     * Clean up portal resources
     */
    async destroy() {
        // Clean up event listeners
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }

        // Destroy components using View lifecycle
        if (this.topbar) {
            await this.topbar.destroy();
            this.topbar = null;
            this.topnav = null;
        }

        if (this.sidebar) {
            await this.sidebar.destroy();
            this.sidebar = null;
        }

        // Call parent destroy
        await super.destroy();
    }

    /**
     * Static factory method
     */
    static create(config = {}) {
        return new PortalApp(config);
    }
}
