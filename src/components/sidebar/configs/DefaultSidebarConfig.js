/**
 * DefaultSidebarConfig - Standard sidebar configuration for MOJO applications
 * Provides a typical portal navigation layout with common sections
 */

import SidebarConfig from '../SidebarConfig.js';

class DefaultSidebarConfig extends SidebarConfig {
    constructor(options = {}) {
        super('default', {
            enableCollapse: true,
            enableSearch: false,
            enableGroupSelector: false,
            ...options
        });
    }

    /**
     * Get brand/header configuration for default layout
     */
    getBrandConfig() {
        return {
            text: 'MOJO Portal',
            subtext: 'Management System',
            icon: 'bi bi-speedometer2',
            logo: null,
            clickable: true,
            route: '/dashboard'
        };
    }

    /**
     * Get navigation items for default portal layout
     */
    getNavigationConfig() {
        return {
            items: [
                // Dashboard
                this.createNavItem({
                    text: 'Dashboard',
                    route: '/dashboard',
                    icon: 'bi bi-speedometer2'
                }),

                // Divider
                this.createNavDivider('Management'),

                // Users Section
                this.createNavItem({
                    text: 'Users',
                    icon: 'bi bi-people',
                    children: [
                        {
                            text: 'All Users',
                            route: '/users',
                            icon: 'bi bi-list'
                        },
                        {
                            text: 'Add User',
                            route: '/users/new',
                            icon: 'bi bi-person-plus'
                        },
                        {
                            text: 'User Groups',
                            route: '/users/groups',
                            icon: 'bi bi-people-fill'
                        }
                    ]
                }),

                // Content Management
                this.createNavItem({
                    text: 'Content',
                    icon: 'bi bi-folder',
                    children: [
                        {
                            text: 'Pages',
                            route: '/content/pages',
                            icon: 'bi bi-file-text'
                        },
                        {
                            text: 'Media Library',
                            route: '/content/media',
                            icon: 'bi bi-images'
                        },
                        {
                            text: 'Templates',
                            route: '/content/templates',
                            icon: 'bi bi-layout-text-window'
                        }
                    ]
                }),

                // Reports
                this.createNavItem({
                    text: 'Reports',
                    route: '/reports',
                    icon: 'bi bi-graph-up',
                    badge: {
                        text: 'New',
                        class: 'badge bg-success'
                    }
                }),

                // Divider
                this.createNavDivider('System'),

                // Settings
                this.createNavItem({
                    text: 'Settings',
                    icon: 'bi bi-gear',
                    children: [
                        {
                            text: 'General',
                            route: '/settings/general',
                            icon: 'bi bi-sliders'
                        },
                        {
                            text: 'Security',
                            route: '/settings/security',
                            icon: 'bi bi-shield-check',
                            permissions: ['admin']
                        },
                        {
                            text: 'Integrations',
                            route: '/settings/integrations',
                            icon: 'bi bi-plug'
                        }
                    ]
                }),

                // System Logs (Admin only)
                this.createNavItem({
                    text: 'System Logs',
                    route: '/logs',
                    icon: 'bi bi-journal-text',
                    permissions: ['admin', 'developer']
                })
            ],
            defaultActiveRoute: '/dashboard',
            collapseSubmenus: true
        };
    }

    /**
     * Get footer configuration for default layout
     */
    getFooterConfig() {
        return {
            enabled: true,
            template: `
                <div class="sidebar-footer p-3">
                    <div class="d-flex align-items-center text-muted">
                        <i class="bi bi-info-circle me-2"></i>
                        <small>Version 2.0.0</small>
                    </div>
                </div>
            `
        };
    }

    /**
     * Get feature configuration for default layout
     */
    getFeatureConfig() {
        return {
            ...super.getFeatureConfig(),
            notifications: true,
            userMenu: false,
            breadcrumbs: false
        };
    }

    /**
     * Create navigation items with common patterns for this config
     */
    createManagementSection(title, items) {
        return this.createNavSection(title, items, {
            collapsible: true,
            collapsed: false
        });
    }

    /**
     * Add notification badge to specific nav items
     */
    addNotificationBadge(itemId, count, type = 'info') {
        const config = this.getConfig();
        const findAndUpdate = (items) => {
            for (const item of items) {
                if (item.id === itemId) {
                    item.badge = {
                        text: count.toString(),
                        class: `badge bg-${type}`
                    };
                    return true;
                }
                if (item.children && findAndUpdate(item.children)) {
                    return true;
                }
            }
            return false;
        };

        findAndUpdate(config.navigation.items);
        return this;
    }

    /**
     * Enable/disable specific features at runtime
     */
    setFeature(featureName, enabled) {
        this.config.features[featureName] = enabled;
        return this;
    }

    /**
     * Quick method to enable group selector for Phase 2
     */
    enableGroupSelector(groupConfig = {}) {
        this.config.groups = {
            ...this.config.groups,
            enabled: true,
            ...groupConfig
        };
        this.options.enableGroupSelector = true;
        return this;
    }
}

export default DefaultSidebarConfig;