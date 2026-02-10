/**
 * Sidebar - Simple sidebar navigation component for MOJO framework
 * Provides easy menu switching and dynamic configuration
 */

import View from '@core/View.js';
import GroupSearchView from './GroupSearchView.js';
import {GroupList, Group} from '@core/models/Group.js';
import Dialog from '@core/views/feedback/Dialog.js';


class Sidebar extends View {
    constructor(options = {}) {
        super({
            tagName: 'nav',
            className: 'sidebar',
            id: 'sidebar',
            ...options
        });

        this.menus = new Map();
        this.activeMenuName = null;
        this.currentRoute = null;
        this.showToggle = options.showToggle; // Default to true
        this.isCollapsed = false;
        this.sidebarTheme = options.theme || 'sidebar-light';
        this.customView = null;
        if (this.options.groupHeader) this.groupHeader = this.options.groupHeader;

        // Group selector configuration
        // 'inline' (default) - replaces sidebar view
        // 'dialog' - opens in a modal dialog like TopNav
        this.groupSelectorMode = options.groupSelectorMode || 'inline';
        this.groupSelectorDialog = null;
        // Apply sidebar theme
        if (this.sidebarTheme) {
            this.addClass(this.sidebarTheme);
        }

        // Initialize menus
        this.initializeMenus(options);

        // Setup route change listeners like TopNav
        this.setupRouteListeners();

        // Auto-collapse on mobile if specified
        if (options.autoCollapseMobile !== false) {
            this.setupResponsiveBehavior();
        }
    }

    groupHeader = `
        {{#group.parent}}
        <div class="sidebar-parent-bar" data-action="select-group-parent">
            <div class="parent-info">
                <span class="parent-label">{{group.parent.kind}}:</span>
                <span class="parent-name collapsed-hidden">{{group.parent.name}}</span>
            </div>
            <i class="bi bi-chevron-down parent-expand collapsed-hidden"></i>
        </div>
        {{/group.parent}}
        <div class="sidebar-selected-group-row" data-action="show-group-search">
            <div class="selected-group-info">
                <div class='selected-group-name collapsed-hidden'>{{group.name}}</div>
                <div class='selected-group-meta collapsed-hidden'>
                    <span class="selected-group-kind">{{group.kind}}</span>
                </div>
            </div>
            <i class="bi bi-chevron-down selected-group-chevron collapsed-hidden"></i>
        </div>
        `;

    /**
     * Initialize sidebar and auto-switch to correct menu based on current route
     */
    async onInit() {
        await super.onInit();

        // Get current route from router
        const app = this.getApp();
        const router = app?.router;

        if (router) {
            const currentPath = router.getCurrentPath();
            if (currentPath) {
                this.autoSwitchToMenuForRoute(currentPath);
            }
        }

        // Initialize tooltips for nav items
        this.initializeTooltips();

        this.searchView = new GroupSearchView({
            noAppend: true,
            showExitButton: true,
            headerText: "Select Group",
            containerId: "sidebar-search-container",
            Collection: GroupList,
            itemTemplate: `
            <div class="p-3 border-bottom">
                <div class="fw-semibold text-dark">{{name}}</div>
                <small class="text-muted">#{{id}}  {{kind}}</small>
            </div>
            `
        });
        this.addChild(this.searchView);
        this.searchView.on("item:selected", (evt) => {
            console.log(evt);
            this.getApp().setActiveGroup(evt.model);
        });
        this.searchView.on("exit", (item) => {
            console.log(item);
            this.hideGroupSearch();
        });
    }

    showGroupSearch() {
        if (this.groupSelectorMode === 'dialog') {
            this.showGroupSearchDialog();
        } else {
            // Inline mode (default)
            this.setClass('sidebar');
            this.showSearch = true;
            this.render();
        }
    }

    hideGroupSearch() {
        if (this.groupSelectorMode === 'dialog') {
            if (this.groupSelectorDialog) {
                this.groupSelectorDialog.hide();
            }
        } else {
            // Inline mode
            this.setClass('sidebar');
            this.showSearch = false;
            this.render();
        }
    }

    onActionShowGroupSearch() {
        this.showGroupSearch();
    }

    async onActionSelectGroupParent() {
        // select-group-parent
        const group = this.getApp().activeGroup;
        const result = await Dialog.confirm(`Are you sure you want to navigate to the '${group.get("parent.name")}'?`);
        if (result) {
            this.getApp().showLoading();
            let parent = new Group({id: group.get("parent.id")});
            await parent.fetch();
            this.getApp().setActiveGroup(parent);
            this.getApp().hideLoading();
        }
    }

    /**
     * Show group selector in a dialog (like TopNav)
     */
    async showGroupSearchDialog() {
        // Create or reuse collection instance (like GroupSelectorButton does)
        const collection = new GroupList();

        // Create GroupSearchView instance matching GroupSelectorButton pattern
        const searchView = new GroupSearchView({
            Collection: GroupList,
            collection: collection,  // Pass the collection instance
            searchFields: ['name'],
            headerText: null,
            searchPlaceholder: "Search groups...",
            headerIcon: null,
            maxHeight: Math.min(600, window.innerHeight - 200),
            showExitButton: false,
            showKind: true,              // Show kind badges (default: true)
            parentField: 'parent',       // Field containing parent object
            kindField: 'kind',           // Field containing kind/type
            autoExpandRoot: true,        // Auto-expand root items (default: true)
            autoExpandAll: false,        // Auto-expand all nodes (default: false)
            indentSize: 20,             // Pixels per level (default: 20)
            showLines: true,
        });

        // Create dialog
        this.groupSelectorDialog = new Dialog({
            body: searchView,
            size: 'md',
            header: null,
            noBodyPadding: true,
            scrollable: false,
            buttons: [],
            closeButton: true
        });

        // Listen for item selection
        searchView.on('item:selected', (evt) => {
            console.log(evt);
            this.getApp().setActiveGroup(evt.model);
            if (this.groupSelectorDialog) {
                this.groupSelectorDialog.hide();
            }
        });

        // Clean up dialog reference when closed
        this.groupSelectorDialog.on('hidden', () => {
            this.groupSelectorDialog.destroy();
            this.groupSelectorDialog = null;
        });

        // Render and show the dialog
        await this.groupSelectorDialog.render(true, document.body);
        this.groupSelectorDialog.show();
    }

    /**
     * Find and switch to the menu that contains the given route
     */
    autoSwitchToMenuForRoute(route) {
        // Search through all menus to find one that contains this route
        for (const [menuName, menuConfig] of this.menus) {
            if (menuConfig.groupKind && !this.getApp().activeGroup)
                continue;
            if (this.menuContainsRoute(menuConfig, route)) {
                // Switch to this menu
                this._setActiveMenu(menuName);
                this.currentRoute = route;

                // Clear all active states and set new active item
                this.clearAllActiveStates();
                this.setActiveItemByRoute(route);

                // Re-render to show changes
                this.render();

                console.log(`Auto-switched to menu '${menuName}' for route '${route}'`);

                // Emit event for any listeners
                this.emit('menu-auto-switched', {
                    menuName,
                    route,
                    config: menuConfig,
                    sidebar: this
                });

                return true;
            }
        }

        return false; // No menu found for this route
    }

    /**
     * Clear active state from all menu items in all menus
     */
    clearAllActiveStates() {
        for (const [menuName, menuConfig] of this.menus) {
            for (const item of menuConfig.items || []) {
                item.active = false;
                if (item.children) {
                    for (const child of item.children) {
                        child.active = false;
                    }
                }
            }
        }
    }

    /**
     * Set active state for item matching the given route
     */
    setActiveItemByRoute(route) {
        const normalizeRoute = (r) => {
            if (!r) return '/';
            // Decode URL-encoded characters (like %2F -> /)
            const decoded = decodeURIComponent(r);
            return decoded.startsWith('/') ? decoded : `/${decoded}`;
        };

        const targetRoute = normalizeRoute(route);

        // Search through all menus
        for (const [menuName, menuConfig] of this.menus) {
            if (menuConfig.groupKind && !this.getApp().activeGroup)
                continue;
            for (const item of menuConfig.items || []) {
                // Check main item
                if (item.route) {
                    const itemRoute = normalizeRoute(item.route);
                    if (this.routesMatch(targetRoute, itemRoute)) {
                        item.active = true;
                        this.activeMenuItem = item;
                        return true;
                    }
                }

                // Check children
                if (item.children) {
                    for (const child of item.children) {
                        if (child.route) {
                            const childRoute = normalizeRoute(child.route);
                            if (this.routesMatch(targetRoute, childRoute)) {
                                child.active = true;
                                item.active = true; // Parent also active
                                return true;
                            }
                        }
                    }
                }
            }
        }

        return false;
    }

    /**
     * Check if a menu contains a specific route in its items or children
     */
    menuContainsRoute(menuConfig, route) {
        const normalizeRoute = (r) => {
            if (!r) return '/';
            // Decode URL-encoded characters (like %2F -> /)
            const decoded = decodeURIComponent(r);
            return decoded.startsWith('/') ? decoded : `/${decoded}`;
        };

        const targetRoute = normalizeRoute(route);

        // Check each item in the menu
        for (const item of menuConfig.items || []) {
            // Check main item
            if (item.route) {
                const itemRoute = normalizeRoute(item.route);
                if (this.routesMatch(targetRoute, itemRoute)) {
                    return true;
                }
            }

            // Check children
            if (item.children) {
                for (const child of item.children) {
                    if (child.route) {
                        const childRoute = normalizeRoute(child.route);
                        if (this.routesMatch(targetRoute, childRoute)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    /**
     * Check if two routes match (using same logic as isItemActive)
     */
    routesMatch(currentRoute, itemRoute) {
        return this.getApp().router.doRoutesMatch(currentRoute, itemRoute);
    }

    getTemplate() {
        if (this.customView) {
            return '<div class="sidebar-container" id="sidebar-custom-view-container"></div>';
        }
        if (this.showSearch) return this.getSearchTemplate();
        return this.getMenuTemplate();
    }

    getSearchTemplate() {
        return `
            <div class="sidebar-container" id="sidebar-search-container">
            </div>
        `;
    }

    getMenuTemplate() {
        return `
            <div class="sidebar-container">
                {{#data.currentMenu}}
                <!-- Header -->
                {{#header}}
                <div class="sidebar-header">
                    {{{header}}}
                    {{#showToggle}}
                    <button class="sidebar-toggle" data-action="toggle-sidebar"
                            aria-label="Toggle Sidebar">
                        <i class="bi bi-chevron-left toggle-icon"></i>
                        <i class="bi bi-chevron-right toggle-icon"></i>
                    </button>
                    {{/showToggle}}
                </div>
                {{/header}}

                <!-- Navigation Items -->
                <div class="sidebar-body">
                    <ul class="nav nav-pills flex-column sidebar-nav" id="sidebar-nav-menu">
                        {{#items}}
                        {{>nav-item}}
                        {{/items}}
                    </ul>
                </div>

                <!-- Footer -->
                {{#footer}}
                <div class="sidebar-footer">
                    {{{footer}}}
                </div>
                {{/footer}}
                {{/data.currentMenu}}

                {{^data.currentMenu}}
                <div class="sidebar-empty">
                    <p class="text-danger text-center">No menu configured</p>
                </div>
                {{/data.currentMenu}}
            </div>
        `;
    }

    /**
     * Get template partials for rendering
     */
    getPartials() {
        return {
            'nav-item': `
                {{#isDivider}}
                    {{>nav-divider}}
                {{/isDivider}}
                {{#isSpacer}}
                    {{>nav-spacer}}
                {{/isSpacer}}
                {{#isLabel}}
                    {{>nav-label}}
                {{/isLabel}}

                {{^isDivider}}
                {{^isSpacer}}
                {{^isLabel}}
                <li class="nav-item">
                    {{#hasChildren}}
                    <!-- Item with submenu -->
                    <a class="nav-link {{#active}}active{{/active}} has-children collapsed"
                       data-bs-toggle="collapse"
                       href="#collapse-{{id}}"
                       role="button"
                       aria-expanded="{{#active}}true{{/active}}{{^active}}false{{/active}}"
                       data-action="toggle-submenu">
                        {{#icon}}<i class="{{icon}} me-2"></i>{{/icon}}
                        <span class="nav-text">{{text}}</span>
                        {{#badge}}
                        <span class="{{badge.class}} ms-auto">{{badge.text}}</span>
                        {{/badge}}
                        <i class="bi bi-chevron-down nav-arrow ms-auto"></i>
                    </a>
                    <div class="collapse {{#active}}show{{/active}}" id="collapse-{{id}}" data-bs-parent="#sidebar-nav-menu">
                        <ul class="nav flex-column nav-submenu">
                            {{#children}}
                            <li class="nav-item">
                                <a class="nav-link {{#active}}active{{/active}}"
                                   {{#action}}data-action="{{action}}"{{/action}}
                                   {{#href}}href="{{href}}"{{/href}}>
                                    {{#icon}}<i class="{{icon}} me-2"></i>{{/icon}}
                                    <span class="nav-text">{{text}}</span>
                                    {{#badge}}
                                    <span class="{{badge.class}} ms-auto">{{badge.text}}</span>
                                    {{/badge}}
                                </a>
                            </li>
                            {{/children}}
                        </ul>
                    </div>
                    {{/hasChildren}}
                    {{^hasChildren}}
                    <!-- Simple item -->
                    <a class="nav-link {{#active}}active{{/active}} {{#disabled}}disabled{{/disabled}}"
                       {{#action}}{{^disabled}}data-action="{{action}}"{{/disabled}}{{/action}}
                       {{#href}}{{^disabled}}href="{{href}}"{{/disabled}}{{/href}}>
                        {{#icon}}<i class="{{icon}} me-2"></i>{{/icon}}
                        <span class="nav-text">{{text}}</span>
                        {{#badge}}
                        <span class="{{badge.class}} ms-auto">{{badge.text}}</span>
                        {{/badge}}
                    </a>
                    {{/hasChildren}}
                </li>
                {{/isLabel}}
                {{/isSpacer}}
                {{/isDivider}}
            `,
            'nav-divider': `
                <li class="nav-divider-item">
                    <hr class="nav-divider-line">
                </li>
            `,
            'nav-spacer': `
                <li class="nav-spacer-item"></li>
            `,
            'nav-label': `
                <li class="nav-item {{className}}">
                    <div class="nav-text px-3">{{text}}</div>
                </li>
            `
        };
    }

    getGroupHeader() {
        return this.groupHeader;
    }

    /**
     * Add a menu configuration
     */
    addMenu(name, config) {
        if (config.groupKind && !config.header) {
            config.header = this.getGroupHeader();
        }

        this.menus.set(name, {
            name,
            groupKind: config.groupKind || null,
            header: config.header || null,
            footer: config.footer || null,
            items: config.items || [],
            data: config.data || {},
            className: config.className || "sidebar sidebar-dark"
        });


        // Set as active if it's the first menu
        if (!this.activeMenuName) {
            this._setActiveMenu(name);
        }

        return this;
    }

    _setActiveMenu(name) {
        this.showSearch = false;
        this.activeMenuName = name;
        const config = this.getCurrentMenuConfig();
        if (config.className) {
            this.setClass(config.className);
        } else {
            this.setClass('sidebar');
        }
    }

    /**
     * Set the active menu
     */
    async setActiveMenu(name) {
        if (!this.menus.has(name)) {
            console.warn(`Menu '${name}' not found`);
            return this;
        }

        const menuConfig = this.menus.get(name);

        if (menuConfig.groupKind) {
            this.lastGroupMenu = menuConfig;
            // Handle group kind logic here
            if (!this.getApp().activeGroup) {
                this.showGroupSearch();
                return;
            }
        }

        this._setActiveMenu(name);
        await this.render();
        // Emit event
        this.emit('menu-changed', {
            menuName: name,
            config: menuConfig,
            sidebar: this
        });

        return this;
    }

    getGroupMenu(group) {
        if (!group) {
            console.warn('No group provided');
            return null;
        }
        // Find menu by group.kind
        let targetMenu = this.lastGroupMenu;
        let anyGroupMenu = null;
        if (group._.kind) {
            for (const [menuName, menuConfig] of this.menus) {
                // Check if groupKind matches
                const matches = this._groupKindMatches(menuConfig.groupKind, group._.kind);

                if (matches) {
                    targetMenu = menuConfig;
                    break;
                } else if (menuConfig.groupKind === 'any') {
                    anyGroupMenu = menuConfig;
                }
            }
        }

        if (!targetMenu) {
            return anyGroupMenu;
        }
        return targetMenu;
    }

    /**
     * Check if a groupKind matches the group's kind
     * Supports both single string and array of strings
     * @param {string|string[]} groupKind - Single kind or array of kinds
     * @param {string} kind - The group's kind to match
     * @returns {boolean} True if matches
     */
    _groupKindMatches(groupKind, kind) {
        if (!groupKind || !kind) return false;

        // Handle array of kinds
        if (Array.isArray(groupKind)) {
            return groupKind.includes(kind);
        }

        // Handle single kind string
        return groupKind === kind;
    }

    showMenuForGroup(group) {
        if (!group) {
            console.warn('No group provided');
            return;
        }
        // Find menu by group.kind
        let targetMenu = this.getGroupMenu(group);

        if (!targetMenu) {
            console.warn(`No menu found for group kind: ${group.kind}`);
            return;
        }
        this._setActiveMenu(targetMenu.name);
        this.render();
        // Emit event
        this.emit('menu-changed', {
            menuName: targetMenu.name,
            config: targetMenu,
            sidebar: this
        });
        return this;
    }

    /**
     * Get menu configuration
     */
    getMenuConfig(name) {
        return this.menus.get(name) || null;
    }

    /**
     * Get current active menu configuration
     */
    getCurrentMenuConfig() {
        return this.activeMenuName ? this.menus.get(this.activeMenuName) : null;
    }

    /**
     * Update menu configuration
     */
    updateMenu(name, updates) {
        const menu = this.menus.get(name);
        if (!menu) {
            console.warn(`Menu '${name}' not found`);
            return this;
        }

        // Deep merge updates
        Object.assign(menu, updates);

        // Re-render if this is the active menu
        if (this.activeMenuName === name) {
            this.render();
        }

        return this;
    }

    /**
     * Remove a menu
     */
    removeMenu(name) {
        this.menus.delete(name);

        // If this was the active menu, switch to another or clear
        if (this.activeMenuName === name) {
            const remainingMenus = Array.from(this.menus.keys());
            this.activeMenuName = remainingMenus.length > 0 ? remainingMenus[0] : null;
            this.render();
        }

        return this;
    }

    /**
     * Get view data for template rendering
     */
    async onBeforeRender() {
        const currentMenu = this.getCurrentMenuConfig();

        if (!currentMenu) {
            return { currentMenu: null };
        }

        let subData = {
            version: this.getApp().version || null,
            group: this.getApp().activeGroup || null,
            user: this.getApp.activeUser || null
        };
        // Process menu data through template if it contains handlebars
        this.data = {
            currentMenu: {
                header: this.renderTemplateString(currentMenu.header || '', subData),
                footer: this.renderTemplateString(currentMenu.footer || '', subData),
                items: this.processNavItems(currentMenu.items, currentMenu.groupKind),
                data: currentMenu.data,
                showToggle: this.showToggle
            }

        };
    }

    async onAfterRender() {
        // Re-initialize tooltips after render, but only if collapsed
        if (this.isCollapsedState()) {
            // Small delay to ensure DOM is fully rendered
            setTimeout(() => this.initializeTooltips(), 50);
        } else {
            this.destroyTooltips();
        }
    }

    setCustomView(view) {
        if (this.customView) {
            this.removeChild(this.customView.id);
        }
        this.customView = view;
        if (view) {
            view.containerId = 'sidebar-custom-view-container';
            this.addChild(view);
        }
        this.render();
        return this;
    }

    clearCustomView() {
        if (this.customView) {
            this.removeChild(this.customView.id);
            this.customView = null;
        }
        this.render();
        return this;
    }

    /**
     * Process navigation items - add IDs, active states, and proper hrefs
     */
     processNavItems(items, groupKind) {
         const app = this.getApp();
         const activeUser = app?.activeUser;
         const activeGroup = app?.activeGroup;

         // Helper function to normalize and update route with group parameter
         const updateRouteWithGroup = (route) => {
             let normalizedRoute = route;
             
             // Convert path format (/forms) to query string format (?page=forms)
             if (route.startsWith('/') && !route.includes('?')) {
                 const pageName = route.substring(1) || 'home';
                 normalizedRoute = `?page=${pageName}`;
             }
             
             // Add group parameter if needed
             if (groupKind && activeGroup && activeGroup.id) {
                 const separator = normalizedRoute.includes('?') ? '&' : '?';
                 return `${normalizedRoute}${separator}group=${activeGroup.id}`;
             }
             return normalizedRoute;
         };

         return items.map((item, index) => {
             // Handle divider items
             if (item === "" || (typeof item === 'object' && item.divider)) {
                 return {
                     isDivider: true,
                     id: `divider-${index}`
                 };
             }

             // Handle spacer items
             if (typeof item === 'object' && item.spacer) {
                 return {
                     isSpacer: true,
                     id: `spacer-${index}`
                 };
             }

             const processedItem = { ...item };

             // Check permissions - skip item if user doesn't have required permissions
             if (processedItem.permissions) {
                 if (!activeUser || !activeUser.hasPermission(processedItem.permissions)) {
                     return null; // Will be filtered out
                 }
             }

             // Check requiresGroupKind - skip item if group kind doesn't match
             if (processedItem.requiresGroupKind) {
                 const groupKind = activeGroup?._.kind || activeGroup?.kind;
                 if (!groupKind || !this._groupKindMatches(processedItem.requiresGroupKind, groupKind)) {
                     return null; // Will be filtered out
                 }
             }

             if (processedItem.kind === 'label') {
                processedItem.isLabel = true;
                if (!processedItem.id) {
                    processedItem.id = `nav-label-${index}`;
                }
                return processedItem;
            }

             // Generate ID if not provided
             if (!processedItem.id) {
                 processedItem.id = `nav-${index}`;
             }

             // Use route directly as href (like TopNav does)
             if (processedItem.route) {
                 processedItem.href = updateRouteWithGroup(processedItem.route);
             } else if (processedItem.page) {
                 // If only page is provided, convert to route format
                 const baseRoute = processedItem.page.startsWith('/') ? processedItem.page : `/${processedItem.page}`;
                 processedItem.href = updateRouteWithGroup(baseRoute);
                 processedItem.route = processedItem.href; // Store for active matching
             }

             // Active state is already set on the item object, no need to calculate

             // Process children
             if (processedItem.children) {
                 processedItem.children = processedItem.children.map(child => {
                     const processedChild = { ...child };

                     // Check permissions for child items
                     if (processedChild.permissions && activeUser) {
                         if (!activeUser.hasPermission(processedChild.permissions)) {
                             return null; // Will be filtered out
                         }
                     }

                     // Check requiresGroupKind for child items
                     if (processedChild.requiresGroupKind) {
                         const groupKind = activeGroup?._.kind || activeGroup?.kind;
                         if (!groupKind || !this._groupKindMatches(processedChild.requiresGroupKind, groupKind)) {
                             return null; // Will be filtered out
                         }
                     }

                     // Use route directly as href
                     if (processedChild.route) {
                         processedChild.href = updateRouteWithGroup(processedChild.route);
                     } else if (processedChild.page) {
                         const baseRoute = processedChild.page.startsWith('/') ? processedChild.page : `/${processedChild.page}`;
                         processedChild.href = updateRouteWithGroup(baseRoute);
                         processedChild.route = processedChild.href;
                     }

                     // Active state is already set on the child object
                     return processedChild;
                 }).filter(child => child !== null); // Filter out permission-denied children

                 // Update hasChildren flag after filtering children
                 processedItem.hasChildren = !!(processedItem.children && processedItem.children.length > 0);
             } else {
                 // Add hasChildren flag for template logic
                 processedItem.hasChildren = false;
             }

             return processedItem;
         }).filter(item => item !== null); // Filter out permission-denied items
     }




    /**
     * Check if navigation item should be active (similar to TopNav)
     */
    isItemActive(item) {
        if (!item.route || !this.currentRoute) {
            return false;
        }

        const normalizeRoute = (route) => {
            if (!route) return '/';
            // Decode URL-encoded characters (like %2F -> /)
            const decoded = decodeURIComponent(route);
            return decoded.startsWith('/') ? decoded : `/${decoded}`;
        };

        const itemRoute = normalizeRoute(item.route);
        const currentRoute = normalizeRoute(this.currentRoute);

        if (itemRoute === '/' && currentRoute === '/') {
            return true;
        }

        if (itemRoute !== '/' && currentRoute !== '/') {
            return currentRoute.startsWith(itemRoute) || currentRoute === itemRoute;
        }

        return false;
    }

    /**
     * Update active item based on current route (like TopNav)
     */
    async updateActiveItem(route) {
        this.currentRoute = route;

        // Clear all active states and set new active item
        this.clearAllActiveStates();
        this.setActiveItemByRoute(route);

        await this.render();
        return this;
    }

    /**
     * Action handler: Toggle submenu
     */
    async handleActionToggleSubmenu(event, element) {
        const arrow = element.querySelector('.nav-arrow');
        if (arrow) {
            arrow.classList.toggle('rotated');
        }
    }

    /**
     * Action handler: Toggle sidebar collapsed/expanded state
     */
    async handleActionToggleSidebar(event, element) {
        this.toggleSidebar();
    }

    onActionShowGroupMenu(action, event, el) {
        this.setActiveMenu("group_default");

        return false;
    }

    async onActionDefault(action, event, el) {
        const config = this.getCurrentMenuConfig();
        if (!config) return;

        // Helper to recursively search for action in items and children
        const findAndExecuteHandler = (items) => {
            for (const item of items) {
                if ((item.action == action) && item.handler) {
                    item.handler(action, event, el, this.getApp());
                    return true;
                }
                // Check children recursively
                if (item.children && item.children.length > 0) {
                    if (findAndExecuteHandler(item.children)) {
                        return true;
                    }
                }
            }
            return false;
        };

        return findAndExecuteHandler(config.items);
    }

    /**
     * Get all menu names
     */
    getMenuNames() {
        return Array.from(this.menus.keys());
    }

    /**
     * Check if menu exists
     */
    hasMenu(name) {
        return this.menus.has(name);
    }

    /**
     * Clear all menus
     */
    clearMenus() {
        this.menus.clear();
        this.activeMenuName = null;
        this.render();
        return this;
    }

    /**
     * Set data for current menu
     */
    setMenuData(data) {
        const currentMenu = this.getCurrentMenuConfig();
        if (currentMenu) {
            currentMenu.data = { ...currentMenu.data, ...data };
            this.render();
        }
        return this;
    }

    /**
     * Get data for current menu
     */
    getMenuData() {
        const currentMenu = this.getCurrentMenuConfig();
        return currentMenu ? currentMenu.data : {};
    }

    /**
     * Setup listeners for route change events (like TopNav)
     */
    setupRouteListeners() {
        const app = this.getApp();
        if (app && app.events) {
            app.events.on(["page:showing"], (data) => {
                this.onRouteChanged(data);
            });
            app.events.on("group:changed", (data) => {
                this.showMenuForGroup(data.group);
            });
            app.events.on("portal:user-changed", (data) => {
                this.render();
            });
        }
    }

    /**
     * Handle route changed event - auto-switch menu and update active item
     */
    onRouteChanged(data) {
        if (data.page && data.page.route) {
            const route = data.page.route;
            if (this.activeMenuItem && this.routesMatch(route, this.activeMenuItem.route)) {
                return;
            }
            // First, try to auto-switch to correct menu for this route
            const switchedMenu = this.autoSwitchToMenuForRoute(route);

            // If no menu switch happened, still update active item
            if (!switchedMenu) {
                this.clearAllActiveStates();
                this.setActiveItemByRoute(route);
                this.updateActiveItem(route);
            }

            if (switchedMenu) {
                console.log(`Route changed to '${route}', auto-switched menu`);
            }
        }
    }

    /**
     * Toggle sidebar between collapsed and expanded states
     */
        toggleSidebar() {
            const portalContainer = document.querySelector('.portal-container');
            if (!portalContainer) return;

            // Hide any visible tooltips before state change
            this.hideAllTooltips();

            const isCurrentlyCollapsed = portalContainer.classList.contains('collapse-sidebar');
            const isCurrentlyHidden = portalContainer.classList.contains('hide-sidebar');

            if (isCurrentlyHidden) {
                // Hidden -> Normal
                portalContainer.classList.remove('hide-sidebar');
                this.isCollapsed = false;
                this.destroyTooltips();
            } else if (isCurrentlyCollapsed) {
                // Collapsed -> Normal
                portalContainer.classList.remove('collapse-sidebar');
                this.isCollapsed = false;
                this.destroyTooltips();
            } else {
                // Normal -> Collapsed
                portalContainer.classList.add('collapse-sidebar');
                this.isCollapsed = true;
                // Initialize tooltips with delay to ensure DOM is ready
                setTimeout(() => this.initializeTooltips(), 150);
            }

            return this;
        }

        /**
         * Set sidebar state programmatically
         */
        setSidebarState(state) {
            const portalContainer = document.querySelector('.portal-container');
            if (!portalContainer) return this;

            // Remove all state classes first
            portalContainer.classList.remove('collapse-sidebar', 'hide-sidebar');

            switch (state) {
                case 'collapsed':
                    portalContainer.classList.add('collapse-sidebar');
                    this.isCollapsed = true;
                    break;
                case 'hidden':
                    portalContainer.classList.add('hide-sidebar');
                    this.isCollapsed = false;
                    break;
                case 'normal':
                default:
                    this.isCollapsed = false;
                    break;
            }

            // Handle tooltips based on state
            if (this.isCollapsed) {
                // Hide any visible tooltips first
                this.hideAllTooltips();
                // Initialize tooltips when collapsed
                setTimeout(() => this.initializeTooltips(), 100);
            } else {
                // Destroy tooltips when not collapsed
                this.destroyTooltips();
            }

            return this;
        }

        /**
         * Initialize tooltips for nav items when sidebar is collapsed
         */
        initializeTooltips() {
            // Clean up existing tooltips first
            this.destroyTooltips();

            // Only initialize tooltips in collapsed state
            if (!this.isCollapsedState()) {
                return this;
            }

            // Auto-generate tooltips from nav-text content
            const navLinks = this.element.querySelectorAll('.sidebar-nav .nav-link');

            navLinks.forEach((link) => {
                const navText = link.querySelector('.nav-text');

                if (navText && navText.textContent.trim()) {
                    const tooltipText = navText.textContent.trim();

                    // Set Bootstrap tooltip attributes
                    link.setAttribute('data-bs-toggle', 'tooltip');
                    link.setAttribute('data-bs-placement', 'right');
                    link.setAttribute('data-bs-title', tooltipText);
                    link.setAttribute('data-bs-container', 'body');

                    // Initialize Bootstrap tooltip with better config
                    if (window.bootstrap && window.bootstrap.Tooltip) {
                        // Extract custom theme/size if specified
                        const theme = link.getAttribute('data-tooltip-theme');
                        const size = link.getAttribute('data-tooltip-size');

                        // Build custom class list
                        let customClass = '';
                        if (theme) customClass += `tooltip-${theme} `;
                        if (size) customClass += `tooltip-${size}`;

                        // Build options object
                        const tooltipOptions = {
                            placement: 'right',
                            container: 'body',
                            trigger: 'hover',
                            delay: { show: 500, hide: 100 },
                            fallbackPlacements: ['top', 'bottom', 'left']
                        };

                        // Only add customClass if it has a value
                        const trimmedClass = customClass.trim();
                        if (trimmedClass) {
                            tooltipOptions.customClass = trimmedClass;
                        }

                        const tooltip = new window.bootstrap.Tooltip(link, tooltipOptions);

                        // Store tooltip instance for better management
                        link._tooltipInstance = tooltip;

                        // Add event listeners to prevent stuck tooltips
                        link.addEventListener('click', () => {
                            tooltip.hide();
                        });

                        link.addEventListener('blur', () => {
                            tooltip.hide();
                        });
                    }
                }
            });

            // Add global event listeners to hide tooltips
            this.addTooltipHideListeners();

            return this;
        }

        destroyTooltips() {
            // Remove global tooltip hide listeners
            this.removeTooltipHideListeners();

            const navLinks = this.element.querySelectorAll('.sidebar-nav .nav-link[data-bs-toggle="tooltip"]');

            navLinks.forEach((link) => {
                // Use stored instance first, then try to get it
                const tooltipInstance = link._tooltipInstance || window.bootstrap?.Tooltip?.getInstance(link);
                if (tooltipInstance) {
                    // Force hide before dispose
                    tooltipInstance.hide();
                    tooltipInstance.dispose();
                }

                // Clean up stored reference
                delete link._tooltipInstance;

                // Remove tooltip attributes
                link.removeAttribute('data-bs-toggle');
                link.removeAttribute('data-bs-placement');
                link.removeAttribute('data-bs-title');
                link.removeAttribute('data-bs-container');
            });

            return this;
        }

        /**
         * Get current sidebar state
         */
        getSidebarState() {
            const portalContainer = document.querySelector('.portal-container');
            if (!portalContainer) return 'normal';

            if (portalContainer.classList.contains('hide-sidebar')) {
                return 'hidden';
            } else if (portalContainer.classList.contains('collapse-sidebar')) {
                return 'collapsed';
            } else {
                return 'normal';
            }
        }

        /**
         * Check if sidebar is collapsed
         */
        isCollapsedState() {
            return this.getSidebarState() === 'collapsed';
        }

        /**
         * Enable/disable toggle button
         */
        setToggleEnabled(enabled) {
            this.showToggle = enabled;
            this.render();
            return this;
        }

    /**
     * Initialize menus from options
     */
    initializeMenus(options) {
        if (options.menus) {
            for (const menu of options.menus) {
                this.addMenu(menu.name, menu);
            }
        } else if (options.menu) {
            options.menu.name = options.menu.name || "default";
            this.addMenu(options.menu.name, options.menu);
        }
    }

    /**
     * Add global listeners to hide tooltips when needed
     */
    addTooltipHideListeners() {
        // Hide tooltips on scroll
        this._tooltipScrollHandler = () => this.hideAllTooltips();
        this.element.addEventListener('scroll', this._tooltipScrollHandler, { passive: true });

        // Hide tooltips on route change
        this._tooltipRouteHandler = () => this.hideAllTooltips();
        const app = this.getApp();


        // Hide tooltips on window blur
        this._tooltipBlurHandler = () => this.hideAllTooltips();
        window.addEventListener('blur', this._tooltipBlurHandler);

        // Hide tooltips on escape key
        this._tooltipEscapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideAllTooltips();
            }
        };
        document.addEventListener('keydown', this._tooltipEscapeHandler);
    }

    /**
     * Remove global tooltip hide listeners
     */
    removeTooltipHideListeners() {
        if (this._tooltipScrollHandler) {
            this.element.removeEventListener('scroll', this._tooltipScrollHandler);
            delete this._tooltipScrollHandler;
        }

        if (this._tooltipBlurHandler) {
            window.removeEventListener('blur', this._tooltipBlurHandler);
            delete this._tooltipBlurHandler;
        }

        if (this._tooltipEscapeHandler) {
            document.removeEventListener('keydown', this._tooltipEscapeHandler);
            delete this._tooltipEscapeHandler;
        }
    }

    /**
     * Force hide all visible tooltips
     */
    hideAllTooltips() {
        const navLinks = this.element.querySelectorAll('.sidebar-nav .nav-link[data-bs-toggle="tooltip"]');
        navLinks.forEach((link) => {
            const tooltip = link._tooltipInstance || window.bootstrap?.Tooltip?.getInstance(link);
            if (tooltip) {
                tooltip.hide();
            }
        });

        // Also hide any orphaned tooltips
        const visibleTooltips = document.querySelectorAll('.tooltip.show');
        visibleTooltips.forEach(tooltip => {
            tooltip.remove();
        });
    }

    /**
     * Cleanup on destroy
     */
    async onBeforeDestroy() {
        // Clean up tooltips
        this.destroyTooltips();

        // Call parent cleanup
        await super.onBeforeDestroy();
    }

    /**
     * Setup responsive behavior for mobile
     */
    setupResponsiveBehavior() {
        const checkMobile = () => {
            const isMobile = window.innerWidth <= 768;
            const portalContainer = document.querySelector('.portal-container');

            if (portalContainer) {
                if (isMobile) {
                    portalContainer.classList.add('sidebar-mobile');
                } else {
                    portalContainer.classList.remove('sidebar-mobile', 'sidebar-open');
                }
            }
        };

        // Check on load and resize
        checkMobile();
        window.addEventListener('resize', checkMobile);
    }

    /**
     * Static method to create a sidebar with common configuration
     */
    static createDefault(options = {}) {
        return new Sidebar({
            theme: 'sidebar-clean',
            showToggle: true,
            autoCollapseMobile: true,
            ...options
        });
    }

    /**
     * Static method to create a minimal sidebar
     */
    static createMinimal(options = {}) {
        return new Sidebar({
            theme: 'sidebar-clean',
            showToggle: false,
            autoCollapseMobile: false,
            ...options
        });
    }

    /**
     * Set sidebar theme
     */
    setSidebarTheme(theme) {
        // Remove existing theme classes
        this.removeClass('sidebar-light sidebar-dark sidebar-clean');

        // Add new theme
        this.sidebarTheme = theme;
        this.addClass(theme);

        return this;
    }

    /**
     * Quick method to show/hide the sidebar
     */
    show() {
        return this.setSidebarState('normal');
    }

    hide() {
        return this.setSidebarState('hidden');
    }

    collapse() {
        return this.setSidebarState('collapsed');
    }

    expand() {
        return this.setSidebarState('normal');
    }

    /**
     * Add pulse effect to toggle button
     */
    pulseToggle() {
        const toggleButton = this.element.querySelector('.sidebar-toggle');
        if (toggleButton) {
            toggleButton.classList.add('pulse');

            // Remove pulse after 3 seconds or first click
            const removePulse = () => {
                toggleButton.classList.remove('pulse');
                toggleButton.removeEventListener('click', removePulse);
            };

            toggleButton.addEventListener('click', removePulse, { once: true });
            setTimeout(removePulse, 3000);
        }
        return this;
    }

    /**
     * Utility method to quickly add a simple menu item
     */
    addSimpleMenuItem(menuName, text, route, icon = 'bi-circle') {
        const menu = this.menus.get(menuName);
        if (menu) {
            menu.items = menu.items || [];
            menu.items.push({
                text: text,
                route: route,
                icon: icon
            });

            if (this.activeMenuName === menuName) {
                this.render();
            }
        }
        return this;
    }

    /**
     * Utility method to quickly create and set a simple menu
     */
    setSimpleMenu(name, header, items) {
        const menu = {
            name: name,
            header: header,
            items: items
        };

        this.addMenu(name, menu);
        this.setActiveMenu(name);

        return this;
    }

}

export default Sidebar;
