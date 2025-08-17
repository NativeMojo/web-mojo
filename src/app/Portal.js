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
            hideSidebar: options.hideSidebar !== true,
            sidebarDefaultCollapsed: options.sidebarDefaultCollapsed || false,
            responsive: options.responsive !== false,
        };

        // Sidebar configuration from WebApp
        const defaultBrand = options.brand || this.app?.name || 'MOJO App';
        const defaultIcon = options.brandIcon || 'bi-lightning-charge';

        this.sidebarConfig = options.sidebarConfig;

        // Topbar configuration from WebApp
        this.topbarConfig = {
            brand: defaultBrand,
            brandIcon: defaultIcon,
            brandRoute: options.topbar?.brandRoute || '?page=home',
            leftItems: options.topbar?.leftItems || [],
            rightItems: options.topbar?.rightItems || [],
            showHamburger: this.config.showSidebar && (options.topbar?.showHamburger !== false),
            theme: options.topbar?.theme || 'navbar-dark bg-primary',
            ...options.topbarConfig
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
        // Create TopNav component as child
        this.topnav = this.addChild(new TopNav({
            id: 'portal-topnav',
            className: `navbar navbar-expand-lg ${this.topbarConfig.theme}`,
            brandText: this.topbarConfig.brand,
            brandRoute: this.topbarConfig.brandRoute,
            brandIcon: this.topbarConfig.brandIcon,
            navItems: this.topbarConfig.leftItems,
            rightItems: this.topbarConfig.rightItems,
            displayMode: this.topbarConfig.displayMode,
            showNavItems: true,
            showSidebarToggle: this.topbarConfig.showHamburger,
            sidebarToggleAction: 'toggle-sidebar'
        }), {
            container: '.portal-topnav'
        });

        if (this.app.activeUser) {
            this.topnav.setModel(this.app.activeUser);
        }
    }

    async setupSidebar() {

        this.sidebar = new Sidebar({
            id: 'portal-sidebar'
        });

        if (this.sidebarConfig.items) {
            // simple the config is just a single Menu
            this.sidebar.addMenu("default", this.sidebarConfig);
        } else if (this.sidebarConfig.menus) {
            for (const menuConfig of this.sidebarConfig.menus) {
                this.sidebar.addMenu(menuConfig.name, menuConfig);
            }
        }

        this.addChild(this.sidebar);
    }

    /**
     * Handle portal-specific actions
     */
    async onActionDefault(action, event, element) {
        switch (action) {
            case 'toggle-sidebar':
                event.preventDefault();
                this.handleSidebarToggle();
                return true;

            case 'collapse-sidebar':
                event.preventDefault();
                this.collapseSidebar();
                return true;

        }
        return false;
    }

    /**
     * Handle sidebar toggle
     */
    handleSidebarToggle() {
        const sidebar = this.getChild('portal-sidebar');
        if (!sidebar || !this.config.showSidebar) return;

        const sidebarElement = sidebar.element;
        const isMobile = window.innerWidth < 768;

        if (isMobile || this.config.hideSidebar) {
            // On mobile, toggle visibility
            this.toggleClass("hide-sidebar");
            // sidebarElement.classList.toggle('show');
        } else {
            // On desktop, toggle collapse state
            this.toggleClass("collapse-sidebar");
            // sidebarElement.classList.toggle('collapsed');
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

        // if (this.config.showSidebar && !this.sidebarCollapsed && window.innerWidth >= 768) {
        //     content.style.marginLeft = `${sidebarWidth}px`;
        // } else {
        //     content.style.marginLeft = '0';
        // }

        this.emit('layout:adjusted', {
            sidebarCollapsed: this.sidebarCollapsed,
            sidebarWidth: sidebarWidth
        });
    }

    /**
     * Set active page in navigation - called by WebApp
     */
    setActivePage(page) {
        // Update sidebar active state
        const sidebar = this.getChild('portal-sidebar');
        if (sidebar && sidebar.updateActiveItem) {
            // sidebar.updateActiveItem(page.route);
        }

        // Update topnav active state
        const topNav = this.getChild('portal-topnav');
        if (topNav && topNav.updateActiveItem) {
            topNav.updateActiveItem(page.route);
        }

        // Emit page change event
        this.emit('page:changed', { page: page });
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
