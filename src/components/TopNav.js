/**
 * TopNav - Bootstrap navbar component for MOJO framework
 * Provides clean, responsive top navigation
 */

import View from '../core/View.js';

class TopNav extends View {
    constructor(options = {}) {
        // Handle theme/className from config
        const navbarClass = options.theme || 'navbar navbar-expand-lg navbar-dark bg-primary';

        super({
            tagName: 'nav',
            className: navbarClass,
            style: 'position: relative; z-index: 1030;',
            ...options
        });

        // Display mode configuration
        this.displayMode = options.displayMode || 'both'; // 'menu' | 'page' | 'both'
        this.showPageIcon = options.showPageIcon !== false;
        this.showPageDescription = options.showPageDescription || false;
        this.showBreadcrumbs = options.showBreadcrumbs || false;

        // Current page tracking
        this.currentPage = null;
        this.previousPage = null;

        // Store raw config for processing in onBeforeRender
        this.config = {
            brand: options.brand || 'MOJO App',
            brandIcon: options.brandIcon || 'bi bi-play-circle',
            brandRoute: options.brandRoute || '/',
            navItems: options.navItems || [],
            rightItems: options.rightItems || [],
            showSidebarToggle: options.showSidebarToggle || false,
            sidebarToggleAction: options.sidebarToggleAction || 'toggle-sidebar',
            ...options
        };

        // Setup page event listeners
        this.setupPageListeners();
    }

    findMenuItem(id) {
        let item = this.config.navItems.find(item => item.id === id);
        if (!item) {
            item = this.config.rightItems.find(item => item.id === id);
        }
        return item || null;
    }

    setUserName(username) {
        let item = this.findMenuItem('user');
        if (item) {
            item.label = username;
            this.render();
        }
    }

    _onModelChange() {
      this.setUserName(this.model.get("display_name"));
      if (this.isMounted()) {
          this.render();
      }
    }

    /**
     * Get template based on display mode
     */
    async getTemplate() {
        return `
            <div class="container-fluid">
                {{#data.showSidebarToggle}}
                <button class="topnav-sidebar-toggle me-2" data-action="{{data.sidebarToggleAction}}" aria-label="Toggle Sidebar">
                    <i class="bi bi-chevron-right toggle-chevron"></i>
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
                    {{data.brand}}
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

                    {{#data.hasRightItems}}
                    <div class="navbar-nav ms-auto">
                        {{#data.rightItems}}
                        {{#isDropdown}}
                        <div class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                                {{label}}
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end">
                                {{#items}}
                                {{#divider}}
                                <li><hr class="dropdown-divider"></li>
                                {{/divider}}
                                {{^divider}}
                                <li>
                                    <a class="dropdown-item" role="button" {{#action}}data-action="{{action}}"{{/action}}>
                                        {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                                        {{label}}
                                    </a>
                                </li>
                                {{/divider}}
                                {{/items}}
                            </ul>
                        </div>
                        {{/isDropdown}}
                        {{^isDropdown}}
                        {{#isButton}}
                        <button class="{{buttonClass}}" data-action="{{action}}" data-id="{{id}}">
                            {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                            {{label}}
                        </button>
                        {{/isButton}}
                        {{^isButton}}
                        <a class="nav-link" href="{{href}}" {{#action}}data-action="{{action}}"{{/action}}>
                            {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                            {{label}}
                        </a>
                        {{/isButton}}
                        {{/isDropdown}}
                        {{/data.rightItems}}
                    </div>
                    {{/data.hasRightItems}}
                </div>
            </div>
        `;
    }

    /**
     * Process and normalize data before rendering (like Sidebar)
     */
    async onBeforeRender() {
        await super.onBeforeRender();

        const showPageInfo = this.displayMode === 'page' || this.displayMode === 'both';
        const showNavItems = this.displayMode === 'menu' || this.displayMode === 'both';

        // Filter navItems based on permissions
        const navItems = this.filterItemsByPermissions(this.config.navItems || []);

        // Process right items
        const rightItems = this.processRightItems(this.config.rightItems || []);

        this.data = {
            // Brand information
            brand: this.config.brand,
            brandIcon: this.config.brandIcon,
            brandRoute: this.config.brandRoute,

            // Navbar configuration
            navbarId: `navbar-${this.id}`,

            // Navigation items
            navItems: navItems,
            showNavItems: showNavItems,

            // Right items
            rightItems: rightItems,
            hasRightItems: rightItems.length > 0,

            // Page display
            showPageInfo: showPageInfo,
            currentPageName: this.currentPage?.title || this.currentPage?.name || '',
            currentPageIcon: this.currentPage?.icon || this.currentPage?.pageIcon || '',
            currentPageDescription: this.showPageDescription ? this.currentPage?.description : '',

            // Sidebar toggle
            showSidebarToggle: this.config.showSidebarToggle,
            sidebarToggleAction: this.config.sidebarToggleAction,

            // Display mode
            displayMode: this.displayMode
        };
    }

    /**
     * Process right items configuration
     */
    processRightItems(rightItems) {
        return this.filterItemsByPermissions(rightItems).map(item => {
            const processedItem = { ...item };

            // Filter dropdown items by permissions if they exist
            if (item.items) {
                processedItem.items = this.filterItemsByPermissions(item.items);
            }

            // Determine item type
            if (processedItem.items && processedItem.items.length > 0) {
                // Dropdown menu
                processedItem.isDropdown = true;
                processedItem.isButton = false;
            } else if (item.buttonClass) {
                // Button
                processedItem.isButton = true;
                processedItem.isDropdown = false;
            } else {
                // Link
                processedItem.isButton = false;
                processedItem.isDropdown = false;
            }

            // Store handler if provided
            if (item.handler) {
                this.rightItemHandlers = this.rightItemHandlers || new Map();
                this.rightItemHandlers.set(item.id, item.handler);
            }

            return processedItem;
        });
    }

    /**
     * Setup listeners for page change events
     */
    setupPageListeners() {
        // Use global MOJO event bus if available
        this.getApp().events.on("route:change", (data) => {
            this.onPageChanged(data);
        });
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
        this.previousPage = this.currentPage;
        this.currentPage = data.page;

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

        // Just trigger re-render, onBeforeRender will handle the data processing
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

    onPassThruActionProfile() {
        // Implement profile functionality here
        this.getApp().events.emit("portal:action", {action: "profile"});
    }

    onActionSettings() {
        // Implement settings functionality here
        this.getApp().events.emit("portal:action", {action: "settings"});
    }

    onActionLogout() {
        // Implement logout functionality here
        this.getApp().events.emit("portal:action", {action: "logout"});
    }

    /**
     * Handle dynamic action dispatch for right items
     */
    async handleAction(actionName, event, element) {
        // Check for custom handler first
        const itemId = element.getAttribute('data-id');
        if (itemId && this.rightItemHandlers && this.rightItemHandlers.has(itemId)) {
            const handler = this.rightItemHandlers.get(itemId);
            if (typeof handler === 'function') {
                return await handler.call(this, actionName, event, element);
            }
        }

        // Fallback to default action methods
        const methodName = `onAction${actionName.charAt(0).toUpperCase() + actionName.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`;
        if (typeof this[methodName] === 'function') {
            return await this[methodName](event, element);
        }

        // Emit action event if no handler found
        this.emit('action', {
            action: actionName,
            event: event,
            element: element,
            topnav: this
        });
    }

    /**
     * Handle default actions by searching through rightItems and navItems
     */
    async onActionDefault(action, event, el) {
        // Check navItems first
        if (this.config.navItems) {
            for (const item of this.config.navItems) {
                if (item.action === action && item.handler) {
                    await item.handler.call(this, action, event, el);
                    return true;
                }
            }
        }

        // Check rightItems
        if (this.config.rightItems) {
            for (const item of this.config.rightItems) {
                if (item.action === action && item.handler) {
                    await item.handler.call(this, action, event, el);
                    return true;
                }
                // Also check dropdown items
                if (item.items) {
                    for (const subItem of item.items) {
                        if (subItem.action === action && subItem.handler) {
                            await subItem.handler.call(this, action, event, el);
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    /**
     * Filter items by user permissions
     */
    filterItemsByPermissions(items) {
        if (!items) return [];

        const app = this.getApp();
        const activeUser = app?.activeUser;

        return items.filter(item => {
            // If item has permissions and user exists, check permissions
            if (item.permissions && activeUser) {
                return activeUser.hasPermission(item.permissions);
            }
            // If no permissions required or no user, show the item
            return true;
        });
    }

}

export default TopNav;
