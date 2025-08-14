/**
 * Portal - Application layout with sidebar and top navigation
 * Provides a complete application shell with navigation and content area
 */

import TopNav from '../components/TopNav.js';
import Sidebar from '../components/Sidebar.js';
import './portal.css';

class Portal {
    constructor(options = {}) {
        this.app = options.app;
        this.container = options.container || document.body;

        // Clean configuration structure
        this.config = {
            showTopbar: options.showTopbar !== false,
            showSidebar: options.showSidebar !== false,
            sidebarCollapsible: options.sidebarCollapsible !== false,
            sidebarDefaultCollapsed: options.sidebarDefaultCollapsed || false,
            responsive: options.responsive !== false,
            ...options.config
        };

        // Sidebar configuration (all sidebar-related settings in one place)
        const defaultBrand = options.brand || this.app?.name || 'MOJO App';
        const defaultIcon = options.brandIcon || 'bi-lightning-charge';

        this.sidebarConfig = {
            brand: defaultBrand,
            brandIcon: defaultIcon,
            brandSubtext: '',
            items: [],
            footer: null,
            width: 250,
            ...options.sidebar
        };

        // Topbar configuration (all topbar-related settings in one place)
        this.topbarConfig = {
            brand: defaultBrand,
            brandIcon: defaultIcon,
            brandRoute: '?page=home',
            leftItems: [],  // Navigation items on the left
            rightItems: [], // User menu, notifications, etc on the right
            showHamburger: this.config.showSidebar,
            theme: 'navbar-dark bg-primary',
            ...options.topbar
        };

        // Component instances
        this.topNav = null;
        this.sidebar = null;

        // State
        this.currentPage = null;
        this.sidebarCollapsed = false;
    }

    /**
     * Render the portal layout
     */
    async render() {
        // Create portal structure - sidebar and topnav at same level
        this.container.innerHTML = `
            <div class="portal-container">
                ${this.config.showSidebar ? '<div id="portal-sidebar"></div>' : ''}
                <div class="portal-body">
                    ${this.config.showTopbar ? '<div id="portal-topnav"></div>' : ''}
                    <div id="portal-content" class="portal-content">
                        <!-- Pages render here -->
                    </div>
                </div>
                <div id="portal-notifications"></div>
            </div>
        `;

        // Add portal styles
        // this.addPortalStyles();

        // Setup components
        await this.setupComponents();

        // Setup event listeners
        this.setupEventListeners();

        // Handle responsive layout
        this.handleResponsive();

        return this;
    }

    /**
     * Setup all portal components
     */
    async setupComponents() {
        // Setup in order: Sidebar, Topbar
        if (this.config.showSidebar) {
            await this.setupSidebar();
        }

        if (this.config.showTopbar) {
            await this.setupTopbar();
        }

        // Adjust layout after components are setup
        this.adjustLayout();
    }

    /**
     * Setup topbar navigation
     */
    async setupTopbar() {
        const topbarContainer = document.getElementById('portal-topnav');
        if (!topbarContainer) return;

        // Prepare left nav items
        const leftNavItems = this.topbarConfig.leftItems.map(item => ({
            text: item.label || item.text,
            route: item.page ? `?page=${item.page}` : (item.route || item.href || '#'),
            icon: item.icon,
            active: false
        }));

        // Process right nav items
        let rightNavItems = null;
        if (this.topbarConfig.rightItems && this.topbarConfig.rightItems.length > 0) {
            rightNavItems = {
                items: this.topbarConfig.rightItems.map(item => {
                    // Dropdown menu (like user menu)
                    if (item.items) {
                        return {
                            text: item.label || item.text,
                            icon: item.icon,
                            isDropdown: true,
                            items: item.items.map(subItem => {
                                if (subItem.divider) {
                                    return { divider: true };
                                }
                                return {
                                    text: subItem.label || subItem.text,
                                    icon: subItem.icon,
                                    action: subItem.action,
                                    href: subItem.href || '#'
                                };
                            })
                        };
                    }
                    // Icon button (like notifications)
                    if (item.action && !item.items) {
                        const isIconOnly = !item.label || item.label === '';
                        return {
                            text: isIconOnly ? '' : (item.label || item.text),
                            icon: item.icon,
                            isButton: true,
                            buttonClass: item.buttonClass || (isIconOnly ? 'btn btn-link nav-link' : 'btn btn-sm btn-outline-light ms-2'),
                            action: item.action,
                            href: item.href || '#',
                            external: item.external
                        };
                    }
                    // Regular link
                    return {
                        text: item.label || item.text,
                        icon: item.icon,
                        isButton: false,
                        action: item.action,
                        href: item.href || '#',
                        external: item.external
                    };
                })
            };
        }

        // Create TopNav component
        this.topNav = new TopNav({
            className: `navbar navbar-expand-lg ${this.topbarConfig.theme}`,
            data: {
                brandText: this.topbarConfig.brand,
                brandRoute: this.topbarConfig.brandRoute,
                brandIcon: this.topbarConfig.brandIcon,
                navItems: leftNavItems,
                rightItems: rightNavItems,
                displayMode: 'menu',
                showNavItems: true,
                showSidebarToggle: this.topbarConfig.showHamburger,
                sidebarToggleAction: 'toggle-sidebar'
            }
        });

        // Set container and render
        this.topNav.setContainer(topbarContainer);
        await this.topNav.render();
        await this.topNav.mount();
    }

    /**
     * Setup sidebar navigation
     */
    async setupSidebar() {
        const sidebarContainer = document.getElementById('portal-sidebar');
        if (!sidebarContainer) return;

        // Prepare nav items - preserve children structure
        const mapNavItem = (item) => {
            const mapped = {
                text: item.label || item.text,
                icon: item.icon,
                active: false
            };

            // Only add route if item doesn't have children
            // Parent items with children are just collapse toggles
            if (!item.children) {
                mapped.route = item.page ? `?page=${item.page}` : (item.route || item.href || '#');
            }

            // Preserve children if they exist
            if (item.children && item.children.length > 0) {
                mapped.children = item.children.map(mapNavItem);
            }

            return mapped;
        };

        const navItems = this.sidebarConfig.items.map(mapNavItem);

        // Create Sidebar component
        this.sidebar = new Sidebar({
            data: {
                brandText: this.sidebarConfig.brand,
                brandIcon: this.sidebarConfig.brandIcon,
                brandSubtext: this.sidebarConfig.brandSubtext,
                navItems: navItems,
                footerContent: this.sidebarConfig.footer,
                layoutMode: 'push'
            }
        });

        // Set container and render
        this.sidebar.setContainer(sidebarContainer);
        await this.sidebar.render();
        await this.sidebar.mount();

        // Set initial collapsed state
        if (this.config.sidebarDefaultCollapsed) {
            const sidebarContainer = document.getElementById('portal-sidebar');
            if (sidebarContainer) {
                sidebarContainer.classList.add('collapsed');
            }
            this.sidebarCollapsed = true;
        }
    }

    /**
     * Handle sidebar toggle
     */
    handleSidebarToggle() {
        const sidebarContainer = document.getElementById('portal-sidebar');
        if (sidebarContainer && this.sidebar) {
            const isMobile = window.innerWidth < 768;

            if (isMobile) {
                // On mobile, toggle visibility
                sidebarContainer.classList.toggle('show');
            } else {
                // On desktop, toggle collapse state
                sidebarContainer.classList.toggle('collapsed');
                this.sidebarCollapsed = !this.sidebarCollapsed;
                this.adjustLayout();
            }
        }
    }

    /**
     * Adjust layout based on sidebar state
     */
    adjustLayout() {
        const content = document.getElementById('portal-content');
        if (!content) return;

        const sidebarWidth = this.sidebarConfig.width || 250;

        if (this.config.showSidebar && !this.sidebarCollapsed) {
            content.style.marginLeft = `${sidebarWidth}px`;
        } else {
            content.style.marginLeft = '0';
        }
    }

    /**
     * Set active page in navigation
     */
    setActivePage(pageName) {
        // Update sidebar active state
        if (this.sidebar && this.sidebar.updateActiveItem) {
            this.sidebar.updateActiveItem(pageName);
        }

        // Update topnav active state
        if (this.topNav && this.topNav.updateActiveItem) {
            this.topNav.updateActiveItem(pageName);
        }

        // Emit page change event
        if (this.app) {
            this.app.eventBus.emit('portal:page-changed', { page: pageName });
        }
    }

    /**
     * Get the page container element
     */
    getPageContainer() {
        return document.getElementById('portal-content');
    }

    /**
     * Render a page in the content area
     */
    async renderPage(page) {
        const container = this.getPageContainer();
        if (!container) {
            console.error('Portal content container not found');
            return;
        }

        try {
            // Clear current content
            container.innerHTML = '';

            // Store current page
            this.currentPage = page;

            // Set page container
            if (page.setContainer) {
                page.setContainer(container);
            } else {
                page.container = container;
            }

            // Render and mount page
            await page.render();
            await page.mount();

            // Update active navigation
            const pageName = page.pageName || page.name || page.route;
            if (pageName) {
                this.setActivePage(pageName);
            }

        } catch (error) {
            console.error('Failed to render page:', error);
            this.showNotification('Failed to load page', 'error');
        }
    }

    /**
     * Show notification message
     */
    showNotification(message, type = 'info', duration = 3000) {
        const container = this.getNotificationContainer();

        // Create notification element
        const alertClass = {
            error: 'alert-danger',
            success: 'alert-success',
            info: 'alert-info',
            warning: 'alert-warning'
        }[type] || 'alert-info';

        const notification = document.createElement('div');
        notification.className = `alert ${alertClass} alert-dismissible fade show`;
        notification.innerHTML = `
            ${this.escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        container.appendChild(notification);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }

        // Limit notifications to 5
        const notifications = container.querySelectorAll('.alert');
        if (notifications.length > 5) {
            notifications[0].remove();
        }
    }

    /**
     * Get or create notification container
     */
    getNotificationContainer() {
        let container = document.getElementById('portal-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'portal-notifications';
            container.className = 'position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Loading...') {
        let loader = document.getElementById('portal-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'portal-loader';
            loader.className = 'position-fixed top-50 start-50 translate-middle text-center';
            loader.style.zIndex = '9998';
            document.body.appendChild(loader);
        }

        loader.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">${this.escapeHtml(message)}</span>
            </div>
            <div class="mt-2">${this.escapeHtml(message)}</div>
        `;
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        const loader = document.getElementById('portal-loader');
        if (loader) {
            loader.remove();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for window resize
        window.addEventListener('resize', () => {
            this.handleResponsive();
        });

        // Listen for navigation clicks (delegated)
        document.addEventListener('click', (e) => {
            // Handle data-page navigation
            const navLink = e.target.closest('[data-page]');
            if (navLink && !navLink.closest('[data-action]')) {
                e.preventDefault();
                const page = navLink.dataset.page;
                const params = navLink.dataset.params ? JSON.parse(navLink.dataset.params) : {};

                if (this.app) {
                    this.app.navigate(page, params);
                }
            }

            // Handle data-action clicks
            const actionElement = e.target.closest('[data-action]');
            if (actionElement) {
                const action = actionElement.dataset.action;

                if (action === 'toggle-sidebar') {
                    e.preventDefault();
                    this.handleSidebarToggle();
                } else if (action === 'collapse-sidebar') {
                    e.preventDefault();
                    const sidebarContainer = document.getElementById('portal-sidebar');
                    if (sidebarContainer) {
                        sidebarContainer.classList.add('collapsed');
                        this.sidebarCollapsed = true;
                        this.adjustLayout();
                    }
                } else {
                    // Emit action for app to handle
                    if (this.app) {
                        this.app.eventBus.emit('portal:action', {
                            action,
                            element: actionElement,
                            event: e
                        });
                    }
                }
            }
        });
    }

    /**
     * Handle responsive layout changes
     */
    handleResponsive() {
        const isMobile = window.innerWidth < 768;

        const sidebarContainer = document.getElementById('portal-sidebar');
        if (isMobile && sidebarContainer) {
            // Hide sidebar on mobile by default
            if (!this.sidebarCollapsed) {
                sidebarContainer.classList.add('mobile-hidden');
            }
        } else if (!isMobile && sidebarContainer) {
            // Show sidebar on desktop
            sidebarContainer.classList.remove('mobile-hidden');
        }

        this.adjustLayout();
    }

    /**
     * Add portal styles
     */
    addPortalStyles() {
        const styleId = 'portal-styles';

        // Check if styles are already loaded
        if (document.getElementById(styleId)) {
            return;
        }

        // Try to load external CSS file
        const link = document.createElement('link');
        link.id = styleId;
        link.rel = 'stylesheet';
        link.type = 'text/css';

        // Determine the correct path based on the current location
        const currentPath = window.location.pathname;
        let cssPath = '/src/app/portal.css';

        // Adjust path for examples or other locations
        if (currentPath.includes('/examples/')) {
            cssPath = '../../src/app/portal.css';
        } else if (currentPath.includes('/dist/')) {
            cssPath = './portal.css';
        }

        link.href = cssPath;

        // Add error handling - fallback to inline styles if CSS file fails to load
        link.onerror = () => {
            console.warn('Failed to load portal.css, using inline styles as fallback');
            this.addInlineStyles();
        };

        document.head.appendChild(link);
    }

    /**
     * Fallback inline styles if external CSS fails to load
     */
    addInlineStyles() {
        const styleId = 'portal-inline-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .portal-container {
                display: flex;
                flex-direction: column;
                height: 100vh;
                overflow: hidden;
            }
            .portal-body {
                display: flex;
                flex: 1;
                overflow: hidden;
                position: relative;
            }
            #portal-topnav {
                flex-shrink: 0;
                z-index: 1030;
                position: fixed;
                top: 0;
                left: 250px;
                right: 0;
                transition: left 0.3s ease;
            }
            #portal-sidebar.collapsed ~ .portal-body #portal-topnav,
            .portal-container:has(#portal-sidebar.collapsed) #portal-topnav {
                left: 0;
            }
            #portal-sidebar {
                flex-shrink: 0;
                position: fixed;
                height: 100vh;
                top: 0;
                z-index: 1040;
                width: 250px;
                transition: transform 0.3s ease;
                background: transparent;
                pointer-events: none;
                overflow: hidden;
            }
            #portal-sidebar .sidebar {
                pointer-events: auto;
                height: 100%;
            }
            #portal-sidebar.collapsed {
                transform: translateX(-250px);
                margin-left: -250px;
                visibility: hidden;
            }
            #portal-sidebar.show {
                transform: translateX(0) !important;
                margin-left: 0;
                visibility: visible;
            }
            #portal-content {
                flex: 1;
                overflow: auto;
                transition: margin-left 0.3s ease;
                margin-top: 56px;
                padding: 0;
                background-color: #f8f9fa;
                min-height: calc(100vh - 56px);
                width: 100%;
            }
            #portal-content .mojo-page {
                background: white;
                min-height: 100%;
            }
            @media (max-width: 768px) {
                #portal-sidebar {
                    transform: translateX(-250px);
                    margin-left: -250px;
                }
                #portal-sidebar.mobile-hidden {
                    transform: translateX(-250px);
                    margin-left: -250px;
                    visibility: hidden;
                }
                #portal-sidebar.show {
                    transform: translateX(0);
                    margin-left: 0;
                    visibility: visible;
                    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
                }
                #portal-topnav {
                    left: 0 !important;
                }
                #portal-content {
                    margin-left: 0 !important;
                }
            }
            #portal-notifications .alert {
                min-width: 300px;
                max-width: 400px;
                margin-bottom: 0.5rem;
                box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
            }
            #portal-loader {
                background: rgba(255, 255, 255, 0.95);
                padding: 2rem;
                border-radius: 0.5rem;
                box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
                text-align: center;
            }
        `;
        document.head.appendChild(style);
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
     * Destroy the portal
     */
    async destroy() {
        // Destroy components
        if (this.topNav && this.topNav.destroy) {
            await this.topNav.destroy();
        }

        if (this.sidebar && this.sidebar.destroy) {
            await this.sidebar.destroy();
        }

        // Remove event listeners
        window.removeEventListener('resize', this.handleResponsive);

        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }

        // Remove styles
        const styleLink = document.getElementById('portal-styles');
        if (styleLink) {
            styleLink.remove();
        }
        const inlineStyle = document.getElementById('portal-inline-styles');
        if (inlineStyle) {
            inlineStyle.remove();
        }

        // Remove notification container
        const notifications = document.getElementById('portal-notifications');
        if (notifications) {
            notifications.remove();
        }

        // Remove loader
        const loader = document.getElementById('portal-loader');
        if (loader) {
            loader.remove();
        }
    }
}

export default Portal;
