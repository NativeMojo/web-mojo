/**
 * Sidebar - Simple sidebar navigation component for MOJO framework
 * Provides easy menu switching and dynamic configuration
 */

import View from '../core/View.js';

class Sidebar extends View {
    constructor(options = {}) {
        super({
            tagName: 'nav',
            className: 'sidebar',
            id: options.id || 'sidebar',
            template: `
                <div class="sidebar-container">
                    {{#data.currentMenu}}
                    <!-- Header -->
                    {{#header}}
                    <div class="sidebar-header">
                        {{{header}}}
                    </div>
                    {{/header}}

                    <!-- Navigation Items -->
                    <div class="sidebar-body">
                        <ul class="nav nav-pills flex-column sidebar-nav">
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
            `,
            ...options
        });

        this.menus = new Map();
        this.activeMenuName = null;
        this.currentRoute = null;

        // Setup route change listeners like TopNav
        this.setupRouteListeners();
    }

    /**
     * Get template partials for rendering
     */
    getPartials() {
        return {
            'nav-item': `
                <li class="nav-item">
                    {{#hasChildren}}
                    <!-- Item with submenu -->
                    <a class="nav-link {{#active}}active{{/active}} has-children"
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
                    <div class="collapse {{#active}}show{{/active}}" id="collapse-{{id}}">
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
            `
        };
    }

    /**
     * Add a menu configuration
     */
    addMenu(name, config) {
        this.menus.set(name, {
            name,
            header: config.header || null,
            footer: config.footer || null,
            items: config.items || [],
            data: config.data || {}
        });

        // Set as active if it's the first menu
        if (!this.activeMenuName) {
            this.activeMenuName = name;
        }

        return this;
    }

    /**
     * Set the active menu
     */
    async setActiveMenu(name) {
        if (!this.menus.has(name)) {
            console.warn(`Menu '${name}' not found`);
            return this;
        }

        this.activeMenuName = name;
        await this.render();

        // Emit event
        this.emit('menu-changed', {
            menuName: name,
            config: this.menus.get(name),
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

        // Process menu data through template if it contains handlebars
        this.data = {
            currentMenu: {
                header: this.processTemplate(currentMenu.header, currentMenu.data),
                footer: this.processTemplate(currentMenu.footer, currentMenu.data),
                items: this.processNavItems(currentMenu.items),
                data: currentMenu.data
            }
        };
    }

    /**
     * Process template strings with data
     */
    processTemplate(template, data) {
        if (!template || typeof template !== 'string') {
            return template;
        }

        // Simple template processing for {{data.property}} syntax
        return template.replace(/\{\{data\.(\w+)\}\}/g, (match, prop) => {
            return data[prop] || '';
        });
    }

    /**
     * Process navigation items - add IDs, active states, and proper hrefs
     */
    processNavItems(items) {
        const app = this.getApp();
        const activeUser = app?.activeUser;
        
        return items.map((item, index) => {
            const processedItem = { ...item };

            // Check permissions - skip item if user doesn't have required permissions
            if (processedItem.permissions && activeUser) {
                if (!activeUser.hasPermission(processedItem.permissions)) {
                    return null; // Will be filtered out
                }
            }

            // Generate ID if not provided
            if (!processedItem.id) {
                processedItem.id = `nav-${index}`;
            }

            // Use route directly as href (like TopNav does)
            if (processedItem.route) {
                processedItem.href = processedItem.route;
            } else if (processedItem.page) {
                // If only page is provided, convert to route format
                processedItem.href = processedItem.page.startsWith('/') ? processedItem.page : `/${processedItem.page}`;
                processedItem.route = processedItem.href; // Store for active matching
            }

            // Set active state based on current route
            processedItem.active = this.isItemActive(processedItem);

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
                    
                    // Use route directly as href
                    if (processedChild.route) {
                        processedChild.href = processedChild.route;
                    } else if (processedChild.page) {
                        processedChild.href = processedChild.page.startsWith('/') ? processedChild.page : `/${processedChild.page}`;
                        processedChild.route = processedChild.href;
                    }
                    
                    processedChild.active = this.isItemActive(processedChild);
                    return processedChild;
                }).filter(child => child !== null); // Filter out permission-denied children

                // Update hasChildren flag after filtering children
                processedItem.hasChildren = !!(processedItem.children && processedItem.children.length > 0);

                // Parent is active if any child is active
                if (!processedItem.active) {
                    processedItem.active = processedItem.children.some(child => child.active);
                }
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
            return route.startsWith('/') ? route : `/${route}`;
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

    async onActionDefault(action, event, el) {
        const config = this.getCurrentMenuConfig();
        if (!config) return;

        for (const item of config.items) {
            if ((item.action == action) && item.handler) {
                item.handler(action, event, el);
                return true;
            }
        }

        return false;
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
            app.events.on("route:change", (data) => {
                this.onRouteChanged(data);
            });
        }
    }

    /**
     * Handle route changed event
     */
    onRouteChanged(data) {
        if (data.page && data.page.route) {
            this.updateActiveItem(data.page.route);
        }
    }
}

export default Sidebar;
