/**
 * Portal - Application layout container extending View
 * Provides a complete application shell with navigation and content area
 * Used by WebApp when layout='portal'
 */

import View from '../core/View.js';
import TopNav from '../components/TopNav.js';
import Sidebar from '../components/Sidebar.js';

class Portal extends View {
    constructor(options = {}) {
        super({
            tagName: 'div',
            className: 'portal-container',
            ...options
        });

        this.app = options.app;

        // Configuration with sensible defaults
        this.config = {
            showTopbar: options.showTopbar !== false,
            showSidebar: options.showSidebar !== false,
            sidebarCollapsible: options.sidebarCollapsible !== false,
            sidebarDefaultCollapsed: options.sidebarDefaultCollapsed || false,
            responsive: options.responsive !== false,
            ...options.config
        };

        // Sidebar configuration from WebApp
        const defaultBrand = options.brand || this.app?.name || 'MOJO App';
        const defaultIcon = options.brandIcon || 'bi-lightning-charge';

        this.sidebarConfig = {
            brand: defaultBrand,
            brandIcon: defaultIcon,
            brandSubtext: options.sidebar?.brandSubtext || '',
            items: options.sidebar?.items || [],
            footer: options.sidebar?.footer || null,
            ...options.sidebar
        };

        // Topbar configuration from WebApp
        this.topbarConfig = {
            brand: defaultBrand,
            brandIcon: defaultIcon,
            brandRoute: options.topbar?.brandRoute || '?page=home',
            leftItems: options.topbar?.leftItems || [],
            rightItems: options.topbar?.rightItems || [],
            showHamburger: this.config.showSidebar && (options.topbar?.showHamburger !== false),
            theme: options.topbar?.theme || 'navbar-dark bg-primary',
            ...options.topbar
        };

        // State
        this.currentPage = null;
        this.sidebarCollapsed = this.config.sidebarDefaultCollapsed;
    }

    /**
     * Get template for portal layout
     */
    async getTemplate() {
        return `
            <div class="portal-layout">
                ${this.config.showSidebar ? '<div id="portal-sidebar"></div>' : ''}
                <div class="portal-body">
                    ${this.config.showTopbar ? '<div id="portal-topnav"></div>' : ''}
                    <div class="portal-content" id="page-container">
                        <!-- Pages render here -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize portal after construction
     */
    async onInit() {
        await super.onInit();

        // Setup child components
        await this.setupComponents();
    }

    /**
     * Setup child components (TopNav and Sidebar)
     */
    async setupComponents() {
        if (this.config.showSidebar) {
            await this.setupSidebar();
        }

        if (this.config.showTopbar) {
            await this.setupTopbar();
        }
    }

    /**
     * Setup topbar as child component
     */
    async setupTopbar() {
        // Prepare navigation data
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
                items: this.processRightNavItems(this.topbarConfig.rightItems)
            };
        }

        // Create TopNav component as child
        this.addChild(new TopNav({
            id: 'portal-topnav',
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
        }), {
            container: '.portal-topnav'
        });
    }

    /**
     * Setup sidebar as child component
     */
    async setupSidebar() {
        const navItems = this.sidebarConfig.items.map(this.mapNavItem);

        // Create Sidebar component as child
        this.addChild(new Sidebar({
            // containerId: 'portal-sidebar-container',
            id: 'portal-sidebar',
            data: {
                brandText: this.sidebarConfig.brand,
                brandIcon: this.sidebarConfig.brandIcon,
                brandSubtext: this.sidebarConfig.brandSubtext,
                navItems: navItems,
                footerContent: this.sidebarConfig.footer,
                layoutMode: 'push'
            }
        }), {
            container: '.portal-sidebar'
        });
    }

    /**
     * Process right navigation items
     */
    processRightNavItems(items) {
        return items.map(item => {
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

            // Icon button or regular link
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
        });
    }

    /**
     * Map navigation item structure
     */
    mapNavItem = (item) => {
        const mapped = {
            text: item.label || item.text,
            icon: item.icon,
            active: false
        };

        // Only add route if item doesn't have children
        if (!item.children) {
            mapped.route = item.page ? `?page=${item.page}` : (item.route || item.href || '#');
        }

        // Preserve children if they exist
        if (item.children && item.children.length > 0) {
            mapped.children = item.children.map(this.mapNavItem);
        }

        return mapped;
    }

    /**
     * Handle portal-specific actions
     */
    async handleAction(event, element) {
        const action = element.dataset.action;

        switch (action) {
            case 'toggle-sidebar':
                event.preventDefault();
                this.handleSidebarToggle();
                break;

            case 'collapse-sidebar':
                event.preventDefault();
                this.collapseSidebar();
                break;

            default:
                // Let parent handle other actions
                return await super.handleAction(event, element);
        }
    }

    /**
     * Handle sidebar toggle
     */
    handleSidebarToggle() {
        const sidebar = this.getChild('portal-sidebar');
        if (!sidebar || !this.config.showSidebar) return;

        const sidebarElement = sidebar.element;
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            // On mobile, toggle visibility
            sidebarElement.classList.toggle('show');
        } else {
            // On desktop, toggle collapse state
            sidebarElement.classList.toggle('collapsed');
            this.sidebarCollapsed = !this.sidebarCollapsed;
            this.adjustLayout();
        }

        // Emit event for other components to listen
        this.emit('sidebar:toggled', {
            collapsed: this.sidebarCollapsed,
            mobile: isMobile
        });
    }

    /**
     * Collapse sidebar
     */
    collapseSidebar() {
        const sidebar = this.getChild('portal-sidebar');
        if (!sidebar) return;

        sidebar.element.classList.add('collapsed');
        this.sidebarCollapsed = true;
        this.adjustLayout();

        this.emit('sidebar:collapsed');
    }

    /**
     * Adjust layout based on sidebar state
     */
    adjustLayout() {
        const content = this.element?.querySelector('.portal-body');
        if (!content) return;

        const sidebarWidth = this.sidebarConfig.width || 250;

        if (this.config.showSidebar && !this.sidebarCollapsed && window.innerWidth >= 768) {
            content.style.marginLeft = `${sidebarWidth}px`;
        } else {
            content.style.marginLeft = '0';
        }

        this.emit('layout:adjusted', {
            sidebarCollapsed: this.sidebarCollapsed,
            sidebarWidth: sidebarWidth
        });
    }

    /**
     * Set active page in navigation - called by WebApp
     */
    setActivePage(pageName) {
        // Update sidebar active state
        const sidebar = this.getChild('portal-sidebar');
        if (sidebar && sidebar.updateActiveItem) {
            sidebar.updateActiveItem(pageName);
        }

        // Update topnav active state
        const topNav = this.getChild('portal-topnav');
        if (topNav && topNav.updateActiveItem) {
            topNav.updateActiveItem(pageName);
        }

        // Emit page change event
        this.emit('page:changed', { page: pageName });
    }

    /**
     * Get the page container element - called by WebApp
     */
    getPageContainer() {
        return this.element?.querySelector('#page-container');
    }

    /**
     * Handle responsive layout changes
     */
    handleResponsive() {
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            // On mobile, ensure sidebar is hidden by default
            const sidebar = this.getChild('portal-sidebar');
            if (sidebar) {
                sidebar.element.classList.remove('show');
            }
        }

        this.adjustLayout();
        this.emit('responsive:changed', { mobile: isMobile });
    }

    /**
     * After mount hook - setup responsive handling
     */
    async onAfterMount() {
        await super.onAfterMount();

        // Setup responsive handling
        window.addEventListener('resize', () => this.handleResponsive());
        this.handleResponsive();

        // Initial layout adjustment
        this.adjustLayout();
    }

    /**
     * Clean up portal
     */
    async destroy() {
        // Remove responsive listener
        window.removeEventListener('resize', this.handleResponsive);

        // Remove current page reference
        this.currentPage = null;

        // Parent destroy will handle child cleanup
        await super.destroy();
    }
}

export default Portal;
