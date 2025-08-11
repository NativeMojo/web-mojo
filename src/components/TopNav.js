/**
 * TopNav - Bootstrap navbar component for MOJO framework
 * Provides clean, responsive top navigation
 */

import View from '../core/View.js';

class TopNav extends View {
    constructor(options = {}) {
        super({
            tagName: 'nav',
            className: 'navbar navbar-expand-lg navbar-dark bg-primary',
            style: 'position: relative; z-index: 1030;',
            ...options
        });

        // Display mode configuration
        this.displayMode = options.displayMode || 'menu'; // 'menu' | 'page' | 'both'
        this.showPageIcon = options.showPageIcon !== false;
        this.showPageDescription = options.showPageDescription || false;
        this.showBreadcrumbs = options.showBreadcrumbs || false;
        
        // Current page tracking
        this.currentPage = null;
        this.previousPage = null;

        // Default configuration - merge with passed data
        this.data = {
            brandText: 'MOJO App',
            brandRoute: '/',
            brandIcon: 'bi bi-play-circle',
            navbarId: `navbar-${this.id}`,
            navItems: [],
            rightItems: null,
            showPageInfo: false,
            currentPageName: '',
            currentPageIcon: '',
            currentPageDescription: '',
            displayMode: this.displayMode,
            ...this.data  // This will override defaults with passed data
        };

        // Setup page event listeners
        this.setupPageListeners();
    }

    /**
     * Get template based on display mode
     */
    async getTemplate() {
        return `
            <div class="container-fluid">
                {{#data.showSidebarToggle}}
                <button class="btn btn-sm btn-outline-light me-2" data-action="{{data.sidebarToggleAction}}">
                    <i class="bi bi-list"></i>
                </button>
                {{/data.showSidebarToggle}}
                
                {{#data.showPageInfo}}
                <div class="navbar-brand d-flex align-items-center">
                    {{#data.currentPageIcon}}<i class="{{data.currentPageIcon}} me-2"></i>{{/data.currentPageIcon}}
                    <div>
                        <span>{{data.currentPageName}}</span>
                        {{#data.currentPageDescription}}
                        <small class="d-block text-white-50" style="font-size: 0.75rem; line-height: 1;">{{data.currentPageDescription}}</small>
                        {{/data.currentPageDescription}}
                    </div>
                </div>
                {{/data.showPageInfo}}
                
                {{^data.showPageInfo}}
                <a class="navbar-brand" href="{{data.brandRoute}}">
                    {{#data.brandIcon}}<i class="{{data.brandIcon}} me-2"></i>{{/data.brandIcon}}
                    {{data.brandText}}
                </a>
                {{/data.showPageInfo}}

                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#{{data.navbarId}}">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="{{data.navbarId}}">
                    {{#data.showNavItems}}
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                        {{#data.navItems}}
                        <li class="nav-item">
                            <a class="nav-link {{#active}}active{{/active}}" href="{{route}}">
                                {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                                {{text}}
                            </a>
                        </li>
                        {{/data.navItems}}
                    </ul>
                    {{/data.showNavItems}}

                    {{#data.rightItems}}
                    <div class="navbar-nav ms-auto">
                        {{#items}}
                        {{#isDropdown}}
                        <div class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                                {{text}}
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end">
                                {{#items}}
                                {{#divider}}
                                <li><hr class="dropdown-divider"></li>
                                {{/divider}}
                                {{^divider}}
                                <li>
                                    <a class="dropdown-item" href="{{href}}" {{#action}}data-action="{{action}}"{{/action}}>
                                        {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                                        {{text}}
                                    </a>
                                </li>
                                {{/divider}}
                                {{/items}}
                            </ul>
                        </div>
                        {{/isDropdown}}
                        {{^isDropdown}}
                        {{#isButton}}
                        <button class="{{buttonClass}}" data-action="{{action}}" {{#data}}{{name}}="{{value}}"{{/data}}>
                            {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                            {{{text}}}
                        </button>
                        {{/isButton}}
                        {{^isButton}}
                        <a class="nav-link" href="{{href}}" {{#action}}data-action="{{action}}"{{/action}} {{#external}}data-external{{/external}}>
                            {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                            {{{text}}}
                        </a>
                        {{/isButton}}
                        {{/isDropdown}}
                        {{/items}}
                    </div>
                    {{/data.rightItems}}
                </div>
            </div>
        `;
    }

    /**
     * Setup listeners for page change events
     */
    setupPageListeners() {
        // Use global MOJO event bus if available
        if (typeof window !== 'undefined' && window.MOJO && window.MOJO.eventBus) {
            window.MOJO.eventBus.on('page:changed', (data) => {
                this.onPageChanged(data);
            });

            window.MOJO.eventBus.on('page:before-change', (data) => {
                this.onPageBeforeChange(data);
            });
        }
    }

    /**
     * Handle page before change event
     * @param {object} data - Event data
     */
    onPageBeforeChange(data) {
        // Can be used to show loading state
        if (this.displayMode === 'page' || this.displayMode === 'both') {
            // Optionally show loading indicator
        }
    }

    /**
     * Handle page changed event
     * @param {object} data - Event data with previousPage and currentPage
     */
    onPageChanged(data) {
        this.previousPage = data.previousPage;
        this.currentPage = data.currentPage;
        
        // Update display based on mode
        if (this.displayMode === 'page' || this.displayMode === 'both') {
            this.updatePageDisplay();
        }
        
        // Update active menu items
        if (this.displayMode === 'menu' || this.displayMode === 'both') {
            if (this.currentPage && this.currentPage.route) {
                this.updateActiveItem(this.currentPage.route);
            }
        }
    }

    /**
     * Update the display to show current page info
     */
    updatePageDisplay() {
        if (!this.currentPage) return;
        
        const showPageInfo = this.displayMode === 'page' || this.displayMode === 'both';
        const showNavItems = this.displayMode === 'menu' || this.displayMode === 'both';
        
        this.updateData({
            ...this.data,
            showPageInfo: showPageInfo,
            showNavItems: showNavItems,
            currentPageName: this.currentPage.displayName || this.currentPage.name || 'Page',
            currentPageIcon: this.showPageIcon ? this.currentPage.icon : '',
            currentPageDescription: this.showPageDescription ? this.currentPage.description : ''
        });
        
        // Re-render with new data
        if (this.mounted) {
            this.render();
        }
    }

    updateActiveItem(currentRoute) {
        // Normalize routes for comparison
        const normalizeRoute = (route) => {
            if (!route) return '/';
            return route.startsWith('/') ? route : `/${route}`;
        };

        const normalizedCurrentRoute = normalizeRoute(currentRoute);
        
        // Update active states with improved matching
        const navItems = this.data.navItems.map(item => {
            const normalizedItemRoute = normalizeRoute(item.route);
            
            // Check for active state
            let isActive = false;
            
            if (normalizedItemRoute === '/' && normalizedCurrentRoute === '/') {
                // Exact match for home route
                isActive = true;
            } else if (normalizedItemRoute !== '/' && normalizedCurrentRoute !== '/') {
                // For non-home routes, check if current route starts with nav item route
                // This allows /users to be active when on /users/123
                isActive = normalizedCurrentRoute.startsWith(normalizedItemRoute) || 
                          normalizedCurrentRoute === normalizedItemRoute;
            }
            
            return {
                ...item,
                active: isActive
            };
        });

        this.updateData({ navItems }, true);
    }


}

export default TopNav;