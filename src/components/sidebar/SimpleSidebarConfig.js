/**
 * SimpleSidebarConfig - Simplification wrapper for easy sidebar configuration
 * Converts simple config format to advanced SidebarConfig system
 *
 * Usage:
 * sidebar.addMenu("default", {
 *   brand: 'My App',
 *   items: [...]
 * });
 */

import SidebarConfig from './SidebarConfig.js';

class SimpleSidebarConfig extends SidebarConfig {
    constructor(name, simpleConfig = {}) {
        super(name, {
            enableCollapse: simpleConfig.enableCollapse !== false,
            enableSearch: simpleConfig.enableSearch || false,
            enableGroupSelector: simpleConfig.enableGroupSelector || false
        });
        this.simpleConfig = simpleConfig;
    }

    /**
     * Convert simple brand config to advanced format
     */
    getBrandConfig() {
        const simple = this.simpleConfig;

        return {
            text: simple.brand || simple.brandText || 'MOJO App',
            subtext: simple.brandSubtext || null,
            icon: simple.brandIcon || 'bi bi-app',
            logo: simple.brandLogo || null,
            clickable: simple.brandClickable !== false,
            route: simple.brandRoute || '/'
        };
    }

    /**
     * Convert simple navigation items to advanced format
     */
    getNavigationConfig() {
        const items = this.simpleConfig.items || this.simpleConfig.navItems || [];

        return {
            items: this.convertSimpleItems(items),
            defaultActiveRoute: this.simpleConfig.defaultActiveRoute || '/',
            collapseSubmenus: this.simpleConfig.collapseSubmenus !== false
        };
    }

    /**
     * Convert simple footer to advanced format
     */
    getFooterConfig() {
        const simple = this.simpleConfig;

        if (simple.footer || simple.footerContent) {
            return {
                enabled: true,
                content: simple.footer || simple.footerContent,
                template: simple.footerTemplate || null
            };
        }

        return {
            enabled: false,
            content: null,
            template: null
        };
    }

    /**
     * Convert simple group config to advanced format
     */
    getGroupConfig() {
        const simple = this.simpleConfig;

        if (simple.groups || simple.enableGroupSelector) {
            const groupConfig = simple.groups || {};

            return {
                enabled: true,
                endpoint: groupConfig.endpoint || '/api/groups',
                placeholder: groupConfig.placeholder || 'Select Group...',
                searchMinLength: groupConfig.searchMinLength || 2,
                searchDebounce: groupConfig.searchDebounce || 300,
                currentGroup: groupConfig.currentGroup || null,
                allowGroupCreation: groupConfig.allowGroupCreation || false,
                showAllGroups: groupConfig.showAllGroups !== false
            };
        }

        return {
            enabled: false
        };
    }

    /**
     * Convert simple items array to advanced navigation items
     */
    convertSimpleItems(items) {
        return items.map(item => this.convertSimpleItem(item));
    }

    /**
     * Convert a single simple item to advanced format
     */
    convertSimpleItem(item) {
        // Handle dividers
        if (item.type === 'divider') {
            return this.createNavDivider(item.label || item.text);
        }

        // Handle sections
        if (item.type === 'section') {
            return this.createNavSection(
                item.title || item.text,
                this.convertSimpleItems(item.items || []),
                {
                    collapsible: item.collapsible,
                    collapsed: item.collapsed
                }
            );
        }

        // Handle regular nav items
        const navItem = {
            text: item.text,
            route: item.route,
            action: item.action,
            icon: item.icon,
            badge: item.badge,
            active: item.active,
            disabled: item.disabled,
            visible: item.visible !== false,
            permissions: item.permissions,
            external: item.external,
            target: item.target || '_self'
        };

        // Handle children
        if (item.children && Array.isArray(item.children)) {
            navItem.children = item.children.map(child => this.convertSimpleItem(child));
        }

        return this.createNavItem(navItem);
    }

    /**
     * Add a divider to the simple config
     */
    addDivider(label = null) {
        if (!this.simpleConfig.items) {
            this.simpleConfig.items = [];
        }

        this.simpleConfig.items.push({
            type: 'divider',
            label: label
        });

        return this;
    }

    /**
     * Add a section to the simple config
     */
    addSection(title, items = [], options = {}) {
        if (!this.simpleConfig.items) {
            this.simpleConfig.items = [];
        }

        this.simpleConfig.items.push({
            type: 'section',
            title: title,
            items: items,
            collapsible: options.collapsible,
            collapsed: options.collapsed
        });

        return this;
    }

    /**
     * Add a nav item to the simple config
     */
    addItem(item) {
        if (!this.simpleConfig.items) {
            this.simpleConfig.items = [];
        }

        this.simpleConfig.items.push(item);
        return this;
    }

    /**
     * Update brand configuration
     */
    setBrand(brand, icon = null, subtext = null) {
        this.simpleConfig.brand = brand;
        if (icon) this.simpleConfig.brandIcon = icon;
        if (subtext) this.simpleConfig.brandSubtext = subtext;
        return this;
    }

    /**
     * Set footer content
     */
    setFooter(content) {
        this.simpleConfig.footer = content;
        return this;
    }

    /**
     * Enable group selector with simple config
     */
    enableGroups(config = {}) {
        this.simpleConfig.enableGroupSelector = true;
        this.simpleConfig.groups = {
            endpoint: config.endpoint || '/api/groups',
            placeholder: config.placeholder || 'Select Group...',
            ...config
        };
        return this;
    }

    /**
     * Get the simple config (for debugging or export)
     */
    getSimpleConfig() {
        return { ...this.simpleConfig };
    }

    /**
     * Update the simple config
     */
    updateSimpleConfig(updates) {
        this.simpleConfig = { ...this.simpleConfig, ...updates };
        return this;
    }

    /**
     * Static helper to create from simple config
     */
    static fromConfig(name, config) {
        return new SimpleSidebarConfig(name, config);
    }

    /**
     * Static helper to create a basic config
     */
    static createBasic(name, brand = 'MOJO App', items = []) {
        return new SimpleSidebarConfig(name, {
            brand: brand,
            items: items
        });
    }
}

export default SimpleSidebarConfig;
