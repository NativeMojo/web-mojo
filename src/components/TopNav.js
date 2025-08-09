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

        // Default configuration
        this.updateData({
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
            ...this.data
        });

        // Setup page event listeners
        this.setupPageListeners();
    }

    /**
     * Get template based on display mode
     */
    async getTemplate() {
        return `
            <div class="container-fluid">
                {{#showPageInfo}}
                <div class="navbar-brand d-flex align-items-center">
                    {{#currentPageIcon}}<i class="{{currentPageIcon}} me-2"></i>{{/currentPageIcon}}
                    <div>
                        <span>{{currentPageName}}</span>
                        {{#currentPageDescription}}
                        <small class="d-block text-white-50" style="font-size: 0.75rem; line-height: 1;">{{currentPageDescription}}</small>
                        {{/currentPageDescription}}
                    </div>
                </div>
                {{/showPageInfo}}
                
                {{^showPageInfo}}
                <a class="navbar-brand" href="{{brandRoute}}">
                    {{#brandIcon}}<i class="{{brandIcon}} me-2"></i>{{/brandIcon}}
                    {{brandText}}
                </a>
                {{/showPageInfo}}

                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#{{navbarId}}">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="{{navbarId}}">
                    {{#showNavItems}}
                    <ul class="navbar-nav me-auto">
                        {{#navItems}}
                        <li class="nav-item">
                            <a class="nav-link {{#active}}active{{/active}}" href="{{route}}">
                                {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                                {{text}}
                            </a>
                        </li>
                        {{/navItems}}
                    </ul>
                    {{/showNavItems}}

                    {{#rightItems}}
                    <div class="navbar-nav {{^showNavItems}}ms-auto{{/showNavItems}}">
                        {{#items}}
                        {{#isButton}}
                        <button class="{{buttonClass}}" data-action="{{action}}" {{#data}}{{name}}="{{value}}"{{/data}}>
                            {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                            {{text}}
                        </button>
                        {{/isButton}}
                        {{^isButton}}
                        <a class="nav-link" href="{{href}}" {{#action}}data-action="{{action}}"{{/action}} {{#external}}data-external{{/external}}>
                            {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                            {{text}}
                        </a>
                        {{/isButton}}
                        {{/items}}
                    </div>
                    {{/rightItems}}
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