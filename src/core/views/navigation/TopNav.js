/**
 * TopNav - Bootstrap navbar component for MOJO framework
 * Provides clean, responsive top navigation
 */

import View from '@core/View.js';
import GroupSelectorButton from '@core/views/navigation/GroupSelectorButton.js';

class TopNav extends View {
    constructor(options = {}) {
        // Define theme-to-class mappings
        const themes = {
            light: 'navbar navbar-expand-lg navbar-light topnav-light',
            dark: 'navbar navbar-expand-lg navbar-dark topnav-dark',
            clean: 'navbar navbar-expand-lg navbar-light topnav-clean',
            gradient: 'navbar navbar-expand-lg navbar-dark topnav-gradient',
        };

        // Set a default theme and determine the final class string
        const themeName = options.theme || 'light';
        let navbarClass = themes[themeName] || themes.light;

        // Add shadow class if specified
        if (options.shadow) {
            navbarClass += ` topnav-shadow-${options.shadow}`;
        }

        super({
            tagName: 'nav',
            className: navbarClass,
            style: 'position: relative; z-index: 1030;',
            ...options
        });

        // Display mode configuration
        // 'menu' | 'page' | 'both' | 'group' | 'group_page_titles'
        this.displayMode = options.displayMode || 'both';
        this.showPageIcon = options.showPageIcon !== false;
        this.showPageDescription = options.showPageDescription || false;
        this.showBreadcrumbs = options.showBreadcrumbs || false;
        this.groupIcon = options.groupIcon || 'bi-building';

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
        this.userMenu = options.userMenu || this.findMenuItem('user');
        if (this.userMenu) this.userMenu.id = "user";
        this.loginMenu = options.loginMenu || this.findMenuItem('login');

        // Setup page event listeners
        this.setupPageListeners();

        // Setup group event listeners for group display modes
        this.setupGroupListeners();

        // Store reference to group selector for click-to-open functionality
        this.groupSelectorButton = null;

        // Track current group for display modes
        this.currentGroup = null;
    }

    findMenuItem(id) {
        let item = this.config.navItems.find(item => item.id === id);
        if (!item) {
            item = this.config.rightItems.find(item => item.id === id);
        }
        return item || null;
    }

    replaceMenuItem(id, new_menu) {
        // Find and replace in navItems
        const navIndex = this.config.navItems.findIndex(item => item.id === id);
        if (navIndex !== -1) {
            this.config.navItems[navIndex] = new_menu;
            return true;
        }

        // Find and replace in rightItems
        const rightIndex = this.config.rightItems.findIndex(item => item.id === id);
        if (rightIndex !== -1) {
            this.config.rightItems[rightIndex] = new_menu;
            return true;
        }

        return false;
    }

    setBrand(brand, icon=null) {
        this.config.brand = brand;
        this.config.brandIcon = icon || this.config.brandIcon;
        this.render();
    }

    setUser(user) {
        if (!user) {
            this.replaceMenuItem('user', this.loginMenu);
        } else {
            this.userMenu.label = user.get("display_name");
            this.replaceMenuItem('login', this.userMenu);
        }
        this.setModel(user);
    }

    _onModelChange() {
      if (this.model) {
        this.userMenu.label = this.model.get("display_name");
      }
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

                {{#data.showGroupInfo}}
                <div class="navbar-brand d-flex align-items-center">
                    {{#data.groupIcon}}<i class="{{data.groupIcon}} me-2"></i>{{/data.groupIcon}}
                    <div>
                        <span class="topnav-group-name"
                              role="button"
                              tabindex="0"
                              data-action="open-group-selector"
                              style="cursor: pointer;">
                            {{data.currentGroupName}}
                        </span>
                        {{#data.showPageTitle}}
                        <span class="text-muted mx-2">|</span>
                        <span>{{data.currentPageName}}</span>
                        {{/data.showPageTitle}}
                    </div>
                </div>
                {{/data.showGroupInfo}}

                {{#data.showPageInfo}}
                <div class="navbar-brand d-flex align-items-center">
                    {{#data.currentPageIcon}}<i class="{{data.currentPageIcon}} me-2"></i>{{/data.currentPageIcon}}
                    <div>
                        <span>{{data.currentPageName}}</span>
                        {{#data.currentPageDescription}}
                        <small class="d-block" style="font-size: 0.75rem; line-height: 1;">{{data.currentPageDescription}}</small>
                        {{/data.currentPageDescription}}
                    </div>
                </div>
                {{/data.showPageInfo}}

                {{#data.showBrand}}
                <a class="navbar-brand" href="{{data.brandRoute}}">
                    {{#data.brandIcon}}<i class="{{data.brandIcon}} me-2"></i>{{/data.brandIcon}}
                    {{data.brand}}
                </a>
                {{/data.showBrand}}

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
                        {{#isGroupSelector}}
                        <div data-container="group-selector-{{id}}"></div>
                        {{/isGroupSelector}}
                        {{^isGroupSelector}}
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
                        {{/isGroupSelector}}
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

        const app = this.getApp();
        // Use cached currentGroup or fall back to app.activeGroup
        const activeGroup = this.currentGroup || app?.activeGroup;

        // Determine what to show based on display mode
        const showGroupInfo = this.displayMode === 'group' || this.displayMode === 'group_page_titles';
        const showPageTitle = this.displayMode === 'group_page_titles';
        const showPageInfo = this.displayMode === 'page' || this.displayMode === 'both';
        const showBrand = !showGroupInfo && !showPageInfo;
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
            showBrand: showBrand,

            // Navbar configuration
            navbarId: `navbar-${this.id}`,

            // Navigation items
            navItems: navItems,
            showNavItems: showNavItems,

            // Right items
            rightItems: rightItems,
            hasRightItems: rightItems.length > 0,

            // Group display
            showGroupInfo: showGroupInfo,
            showPageTitle: showPageTitle,
            currentGroupName: activeGroup?.get?.('name') || activeGroup?.name || 'Select Group',
            groupIcon: this.groupIcon,

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

            // Check for group selector type
            if (item.type === 'group-selector') {
                processedItem.isGroupSelector = true;
                processedItem.isDropdown = false;
                processedItem.isButton = false;

                // Create group selector button with smart defaults
                // Only pass through explicitly provided options
                const groupSelectorOptions = {
                    containerId: `group-selector-${item.id || 'default'}`
                };

                // Only add options if explicitly provided (allow auto-detection to work)
                if (item.Collection !== undefined) groupSelectorOptions.Collection = item.Collection;
                if (item.collection !== undefined) groupSelectorOptions.collection = item.collection;
                if (item.currentGroup !== undefined) groupSelectorOptions.currentGroup = item.currentGroup;
                if (item.buttonClass !== undefined) groupSelectorOptions.buttonClass = item.buttonClass;
                if (item.buttonIcon !== undefined) groupSelectorOptions.buttonIcon = item.buttonIcon;
                if (item.defaultText !== undefined) groupSelectorOptions.defaultText = item.defaultText;
                if (item.itemTemplate !== undefined) groupSelectorOptions.itemTemplate = item.itemTemplate;
                if (item.searchFields !== undefined) groupSelectorOptions.searchFields = item.searchFields;
                if (item.headerText !== undefined) groupSelectorOptions.headerText = item.headerText;
                if (item.searchPlaceholder !== undefined) groupSelectorOptions.searchPlaceholder = item.searchPlaceholder;
                if (item.autoSetActiveGroup !== undefined) groupSelectorOptions.autoSetActiveGroup = item.autoSetActiveGroup;
                if (item.onGroupSelected !== undefined) groupSelectorOptions.onGroupSelected = item.onGroupSelected;

                const groupSelector = new GroupSelectorButton(groupSelectorOptions);

                // Store reference for click-to-open functionality
                this.groupSelectorButton = groupSelector;

                // Add as child view
                this.addChild(groupSelector);

            } else if (processedItem.items && processedItem.items.length > 0) {
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
        this.getApp().events.on("page:show", (data) => {
            this.onPageChanged(data);
        });
    }

    /**
     * Setup listeners for group change events
     */
    setupGroupListeners() {
        const app = this.getApp();
        if (!app?.events) return;

        // Listen for group changes and re-render if showing group info
        app.events.on(['group:changed', 'group:loaded'], (data) => {
            // Update our reference to current group
            if (data?.group) {
                this.currentGroup = data.group;
            }

            if (this.displayMode === 'group' || this.displayMode === 'group_page_titles') {
                if (this.mounted) {
                    this.render();
                }
            }
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
        this.getApp().events.emit("auth:logout", {action: "logout"});
    }

    /**
     * Handle open group selector action (from clicking group name in brand)
     */
    async onActionOpenGroupSelector(event) {
        // If we have a group selector button, trigger its dialog
        if (this.groupSelectorButton) {
            await this.groupSelectorButton.onActionShowSelector(event);
            return true;
        }

        // If no group selector in rightItems, create a temporary one
        const { GroupList } = await import('@core/models/Group.js');
        const tempSelector = new GroupSelectorButton({
            Collection: GroupList,
            currentGroup: this.getApp()?.activeGroup
        });

        await tempSelector.onActionShowSelector(event);
        return true;
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

        this.getApp().events.emit("portal:action", { action, event, el });

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
