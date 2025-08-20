/**
 * PortalApp - Complete portal application extending WebApp
 * Provides built-in navigation, sidebar, and content management
 * Clean, simple implementation that reuses WebApp and View logic
 */

import WebApp from './WebApp.js';
import TopNav from '../components/TopNav.js';
import Sidebar from '../components/Sidebar.js';
import DeniedPage from '../components/DeniedPage.js';
import TokenManager from '../auth/TokenManager.js';
import {User} from '../models/User.js';
import {Group} from '../models/Group.js';
import NotFoundPage from '../components/NotFoundPage.js';
import ToastService from '../services/ToastService.js';

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
        this.tokenManager = new TokenManager();

        // Active group management
        this.activeGroup = null;
        // Portal state - Load from localStorage first, then fallback to config
        if (!this.isMobile()) {
            this.sidebarCollapsed = this.loadSidebarState() ??
                (this.sidebarConfig.defaultCollapsed || false);
        } else {
            this.sidebarCollapsed = this.sidebarConfig.defaultCollapsed || false;
        }
        this.setupPageContainer();

        this.toast = new ToastService();

        this.registerPage("denied", DeniedPage);
        this.registerPage("404", NotFoundPage);
    }

    /**
     * Override WebApp start to setup portal layout
     */
    async start() {
        // Call parent start (handles router, error handling, etc.)
        // Setup router
        await this.checkAuthStatus();

        this.events.on('auth:unauthorized', () => {
            this.showError("You have been logged out");
            this.setActiveUser(null);
            return;
        });

        this.events.on('auth:logout', () => {
            this.showError("You have been logged out");
            this.tokenManager.clearTokens();
            this.setActiveUser(null);
            return;
        });

        // Check and load active group after auth
        await this.checkActiveGroup();

        console.log('Setting up router...');
        await this.setupRouter();

        // Mark as started
        this.isStarted = true;

        // Emit app ready event
        this.events.emit('app:ready', { app: this });

        console.log(`${this.title} portal ready`);
    }

    async checkAuthStatus() {
        const token = this.tokenManager.getTokenInstance();
        if (!token || !token.isValid()) {
            this.events.emit('auth:unauthorized', { app: this });
            return;
        }
        if (token.isExpired()) {
            this.events.emit('auth:expired', { app: this });
            return;
        }
        if (token.isExpiringSoon()) {
            this.events.emit('auth:expiring', { app: this });
        }
        this.tokenManager.startAutoRefresh(this);
        this.rest.setAuthToken(token.token);
        const user = new User({ id: token.getUserId() });
        await user.fetch();
        this.setActiveUser(user);
    }

    /**
     * Check and load active group from storage
     */
    async checkActiveGroup() {
        // First check URL search params for group parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlGroupId = urlParams.get('group');

        // Determine which group ID to use: URL param takes priority
        const groupId = urlGroupId || this.loadActiveGroupId();

        if (groupId) {
            try {
                const group = new Group({ id: groupId });
                const resp = await group.fetch();
                if (!resp.success || !resp.data.status) {
                    this.clearActiveGroup();
                    console.warn('Failed to load active group:', resp.statusText);
                    return;
                }

                this.activeGroup = group;
                // If we got the group from URL, save it as the new active group
                if (urlGroupId) {
                    this.saveActiveGroupId(groupId);
                }

                console.log('Loaded active group:', group.get('name'));
            } catch (error) {
                console.warn('Failed to load active group:', error);
                // If URL group failed, try to clear it and fall back to stored group
                if (urlGroupId && !this.loadActiveGroupId()) {
                    // URL group failed and no stored group, clear everything
                    this.clearActiveGroupId();
                } else if (urlGroupId) {
                    // URL group failed but we have a stored group, try that instead
                    const storedGroupId = this.loadActiveGroupId();
                    if (storedGroupId && storedGroupId !== urlGroupId) {
                        try {
                            const fallbackGroup = new Group({ id: storedGroupId });
                            await fallbackGroup.fetch();
                            this.activeGroup = fallbackGroup;
                            console.log('Fell back to stored active group:', fallbackGroup.get('name'));
                        } catch (fallbackError) {
                            console.warn('Fallback to stored group also failed:', fallbackError);
                            this.clearActiveGroupId();
                        }
                    }
                }
            }
        }
    }


    /**
     * Set the active group
     */
    async setActiveGroup(group) {
        const previousGroup = this.activeGroup;
        this.activeGroup = group;

        // Save to storage
        if (group && group.get('id')) {
            this.saveActiveGroupId(group.get('id'));
        } else {
            this.clearActiveGroupId();
        }

        // Emit event
        this.events.emit('group:changed', {
            group,
            previousGroup,
            app: this
        });

        this.router.updateUrl({group:group.id}, { replace: true });
        console.log('Active group set to:', group ? group.get('name') : 'none');
        return this;
    }

    /**
     * Get the active group
     */
    getActiveGroup() {
        return this.activeGroup;
    }

    /**
     * Clear the active group
     */
    async clearActiveGroup() {
        const previousGroup = this.activeGroup;
        this.activeGroup = null;
        this.clearActiveGroupId();
        // Emit event
        this.events.emit('group:cleared', {
            previousGroup,
            app: this
        });
        return this;
    }

    /**
     * Save active group ID to localStorage
     */
    saveActiveGroupId(groupId) {
        try {
            const key = this.getActiveGroupStorageKey();
            localStorage.setItem(key, groupId.toString());
        } catch (error) {
            console.warn('Failed to save active group ID:', error);
        }
    }

    /**
     * Load active group ID from localStorage
     */
    loadActiveGroupId() {
        try {
            const key = this.getActiveGroupStorageKey();
            return localStorage.getItem(key);
        } catch (error) {
            console.warn('Failed to load active group ID:', error);
            return null;
        }
    }

    /**
     * Clear active group ID from localStorage
     */
    clearActiveGroupId() {
        try {
            const key = this.getActiveGroupStorageKey();
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('Failed to clear active group ID:', error);
        }
    }

    /**
     * Get storage key for active group ID
     */
    getActiveGroupStorageKey() {
        return `mojo_active_group_id`;
    }

    /**
     * Check if user needs to select a group
     */
    needsGroupSelection() {
        return !this.activeGroup;
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

        // Setup page container
        this.setupPortalComponents();

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
            className: this.topbarConfig.className || 'navbar navbar-expand-lg navbar-dark',
            brandText: this.topbarConfig.brand || this.brand || this.title,
            brandRoute: this.topbarConfig.brandRoute || '/',
            brandIcon: this.topbarConfig.brandIcon || this.brandIcon,
            navItems: this.topbarConfig.leftItems || [],
            rightItems: this.topbarConfig.rightItems || [],
            displayMode: this.topbarConfig.displayMode || 'both',
            showSidebarToggle: this.topbarConfig.showSidebarToggle || false,
            ...this.topbarConfig
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

        if (this.topbar) {
            this.topbar.setUser(user);
        }

        console.log("Active user set:", user);
        this.events.emit('portal:user-changed', { user });
    }

    /**
     * Get the active user (for backward compatibility)
     */
    getActiveUser() {
        return this.activeUser;
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
        // Clear active group
        this.activeGroup = null;

        // Clean up portal resources
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
