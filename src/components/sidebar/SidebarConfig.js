/**
 * SidebarConfig - Base class for managing sidebar configurations
 * Provides a structured way to define different sidebar layouts and navigation patterns
 */

class SidebarConfig {
    constructor(configName = 'default', options = {}) {
        this.configName = configName;
        this.options = {
            enableGroupSelector: false,
            enableCollapse: true,
            enableSearch: false,
            ...options
        };

        // Base configuration structure
        this.config = {
            brand: this.getBrandConfig(),
            navigation: this.getNavigationConfig(),
            groups: this.getGroupConfig(),
            footer: this.getFooterConfig(),
            features: this.getFeatureConfig()
        };
    }

    /**
     * Get brand/header configuration
     * Override in subclasses for specific branding
     */
    getBrandConfig() {
        return {
            text: 'MOJO Portal',
            subtext: null,
            icon: 'bi bi-play-circle',
            logo: null,
            clickable: true,
            route: '/'
        };
    }

    /**
     * Get navigation items configuration
     * Override in subclasses for specific navigation
     */
    getNavigationConfig() {
        return {
            items: [],
            defaultActiveRoute: '/',
            collapseSubmenus: true
        };
    }

    /**
     * Get group selector configuration
     * Used for Phase 2 multi-group support
     */
    getGroupConfig() {
        return {
            enabled: this.options.enableGroupSelector,
            endpoint: '/api/groups',
            searchEnabled: true,
            placeholder: 'Select Group...',
            currentGroup: null,
            collection: null,
            searchMinLength: 2,
            searchDebounce: 300
        };
    }

    /**
     * Get footer configuration
     * Override in subclasses for custom footer content
     */
    getFooterConfig() {
        return {
            enabled: false,
            content: null,
            template: null
        };
    }

    /**
     * Get feature flags and configuration
     */
    getFeatureConfig() {
        return {
            collapse: this.options.enableCollapse,
            search: this.options.enableSearch,
            breadcrumbs: false,
            notifications: false,
            userMenu: false
        };
    }

    /**
     * Create navigation item with standard structure
     */
    createNavItem(config) {
        const defaults = {
            id: null,
            text: '',
            route: null,
            action: null,
            icon: null,
            badge: null,
            active: false,
            children: null,
            permissions: null,
            visible: true,
            disabled: false,
            external: false,
            target: '_self'
        };

        const item = { ...defaults, ...config };

        // Auto-generate ID if not provided
        if (!item.id && item.text) {
            item.id = item.text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }

        // Process children if they exist
        if (item.children && Array.isArray(item.children)) {
            item.children = item.children.map(child => this.createNavItem(child));
        }

        return item;
    }

    /**
     * Create navigation section/group
     */
    createNavSection(title, items = [], options = {}) {
        return {
            type: 'section',
            title,
            items: items.map(item => this.createNavItem(item)),
            collapsible: options.collapsible || false,
            collapsed: options.collapsed || false,
            permissions: options.permissions || null,
            visible: options.visible !== false
        };
    }

    /**
     * Create navigation divider
     */
    createNavDivider(label = null) {
        return {
            type: 'divider',
            label,
            visible: true
        };
    }

    /**
     * Get complete configuration object
     */
    getConfig() {
        return this.config;
    }

    /**
     * Update configuration at runtime
     */
    updateConfig(updates) {
        this.config = this.deepMerge(this.config, updates);
        return this.config;
    }

    /**
     * Set current group (for Phase 2)
     */
    setCurrentGroup(group) {
        this.config.groups.currentGroup = group;
        return this;
    }

    /**
     * Get current group (for Phase 2)
     */
    getCurrentGroup() {
        return this.config.groups.currentGroup;
    }

    /**
     * Check if user has permission for nav item
     */
    hasPermission(item, userPermissions = []) {
        if (!item.permissions || !Array.isArray(item.permissions)) {
            return true;
        }

        return item.permissions.some(permission =>
            userPermissions.includes(permission)
        );
    }

    /**
     * Filter navigation items by permissions
     */
    filterByPermissions(items, userPermissions = []) {
        return items.filter(item => {
            if (!this.hasPermission(item, userPermissions)) {
                return false;
            }

            // Filter children recursively
            if (item.children && Array.isArray(item.children)) {
                item.children = this.filterByPermissions(item.children, userPermissions);
                // Hide parent if no visible children
                if (item.children.length === 0) {
                    return false;
                }
            }

            return item.visible !== false;
        });
    }

    /**
     * Deep merge utility for configuration updates
     */
    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    /**
     * Create a copy of this configuration
     */
    clone(newName = null) {
        const ClonedClass = this.constructor;
        const cloned = new ClonedClass(newName || `${this.configName}-copy`, this.options);
        cloned.config = this.deepMerge({}, this.config);
        return cloned;
    }

    /**
     * Export configuration as JSON
     */
    toJSON() {
        return {
            configName: this.configName,
            options: this.options,
            config: this.config
        };
    }

    /**
     * Static method to create configuration from JSON
     */
    static fromJSON(data) {
        const config = new this(data.configName, data.options);
        config.config = data.config;
        return config;
    }
}

export default SidebarConfig;
