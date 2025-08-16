/**
 * AdminSidebarConfig - Advanced sidebar configuration for administrative users
 * Provides comprehensive admin navigation with system management capabilities
 */

import SidebarConfig from '../SidebarConfig.js';

class AdminSidebarConfig extends SidebarConfig {
    constructor(options = {}) {
        super('admin', {
            enableCollapse: true,
            enableSearch: true,
            enableGroupSelector: true,
            ...options
        });
    }

    /**
     * Get brand/header configuration for admin layout
     */
    getBrandConfig() {
        return {
            text: 'Admin Portal',
            subtext: 'System Administration',
            icon: 'bi bi-shield-check',
            logo: null,
            clickable: true,
            route: '/admin/dashboard'
        };
    }

    /**
     * Get navigation items for admin portal layout
     */
    getNavigationConfig() {
        return {
            items: [
                // Admin Dashboard
                this.createNavItem({
                    text: 'Admin Dashboard',
                    route: '/admin/dashboard',
                    icon: 'bi bi-speedometer2',
                    badge: {
                        text: 'Admin',
                        class: 'badge bg-danger'
                    }
                }),

                // Divider
                this.createNavDivider('User Management'),

                // Advanced User Management
                this.createNavItem({
                    text: 'User Management',
                    icon: 'bi bi-people',
                    children: [
                        {
                            text: 'All Users',
                            route: '/admin/users',
                            icon: 'bi bi-people-fill'
                        },
                        {
                            text: 'User Roles',
                            route: '/admin/users/roles',
                            icon: 'bi bi-person-badge'
                        },
                        {
                            text: 'Permissions',
                            route: '/admin/users/permissions',
                            icon: 'bi bi-shield-lock'
                        },
                        {
                            text: 'User Sessions',
                            route: '/admin/users/sessions',
                            icon: 'bi bi-clock-history'
                        },
                        {
                            text: 'Bulk Operations',
                            route: '/admin/users/bulk',
                            icon: 'bi bi-tools'
                        }
                    ]
                }),

                // Group Management (Phase 2 ready)
                this.createNavItem({
                    text: 'Group Management',
                    icon: 'bi bi-diagram-3',
                    children: [
                        {
                            text: 'All Groups',
                            route: '/admin/groups',
                            icon: 'bi bi-collection'
                        },
                        {
                            text: 'Group Hierarchy',
                            route: '/admin/groups/hierarchy',
                            icon: 'bi bi-diagram-2'
                        },
                        {
                            text: 'Group Settings',
                            route: '/admin/groups/settings',
                            icon: 'bi bi-gear-wide'
                        },
                        {
                            text: 'Access Control',
                            route: '/admin/groups/access',
                            icon: 'bi bi-key'
                        }
                    ]
                }),

                // Divider
                this.createNavDivider('System Administration'),

                // System Management
                this.createNavItem({
                    text: 'System',
                    icon: 'bi bi-cpu',
                    children: [
                        {
                            text: 'System Health',
                            route: '/admin/system/health',
                            icon: 'bi bi-heart-pulse',
                            badge: {
                                text: 'Live',
                                class: 'badge bg-success'
                            }
                        },
                        {
                            text: 'Server Monitoring',
                            route: '/admin/system/monitoring',
                            icon: 'bi bi-activity'
                        },
                        {
                            text: 'Database',
                            route: '/admin/system/database',
                            icon: 'bi bi-database'
                        },
                        {
                            text: 'Cache Management',
                            route: '/admin/system/cache',
                            icon: 'bi bi-lightning'
                        },
                        {
                            text: 'Background Jobs',
                            route: '/admin/system/jobs',
                            icon: 'bi bi-play-circle'
                        }
                    ]
                }),

                // Security & Audit
                this.createNavItem({
                    text: 'Security',
                    icon: 'bi bi-shield-exclamation',
                    children: [
                        {
                            text: 'Security Dashboard',
                            route: '/admin/security/dashboard',
                            icon: 'bi bi-shield-check'
                        },
                        {
                            text: 'Audit Logs',
                            route: '/admin/security/audit',
                            icon: 'bi bi-journal-check'
                        },
                        {
                            text: 'Login Attempts',
                            route: '/admin/security/logins',
                            icon: 'bi bi-door-open'
                        },
                        {
                            text: 'API Keys',
                            route: '/admin/security/api-keys',
                            icon: 'bi bi-key-fill'
                        },
                        {
                            text: 'Firewall Rules',
                            route: '/admin/security/firewall',
                            icon: 'bi bi-shield-slash'
                        }
                    ]
                }),

                // Application Management
                this.createNavItem({
                    text: 'Applications',
                    icon: 'bi bi-grid-3x3-gap',
                    children: [
                        {
                            text: 'App Configuration',
                            route: '/admin/apps/config',
                            icon: 'bi bi-sliders'
                        },
                        {
                            text: 'Feature Flags',
                            route: '/admin/apps/features',
                            icon: 'bi bi-toggles'
                        },
                        {
                            text: 'API Management',
                            route: '/admin/apps/api',
                            icon: 'bi bi-cloud-arrow-up'
                        },
                        {
                            text: 'Integrations',
                            route: '/admin/apps/integrations',
                            icon: 'bi bi-puzzle'
                        }
                    ]
                }),

                // Divider
                this.createNavDivider('Data & Analytics'),

                // Advanced Reports & Analytics
                this.createNavItem({
                    text: 'Analytics',
                    icon: 'bi bi-graph-up-arrow',
                    children: [
                        {
                            text: 'Usage Analytics',
                            route: '/admin/analytics/usage',
                            icon: 'bi bi-bar-chart'
                        },
                        {
                            text: 'Performance Metrics',
                            route: '/admin/analytics/performance',
                            icon: 'bi bi-speedometer'
                        },
                        {
                            text: 'User Behavior',
                            route: '/admin/analytics/behavior',
                            icon: 'bi bi-graph-down'
                        },
                        {
                            text: 'Custom Reports',
                            route: '/admin/analytics/reports',
                            icon: 'bi bi-file-earmark-bar-graph'
                        }
                    ]
                }),

                // Data Management
                this.createNavItem({
                    text: 'Data Management',
                    icon: 'bi bi-database-gear',
                    children: [
                        {
                            text: 'Data Import/Export',
                            route: '/admin/data/import-export',
                            icon: 'bi bi-arrow-down-up'
                        },
                        {
                            text: 'Data Cleanup',
                            route: '/admin/data/cleanup',
                            icon: 'bi bi-trash3'
                        },
                        {
                            text: 'Backup Management',
                            route: '/admin/data/backups',
                            icon: 'bi bi-archive'
                        },
                        {
                            text: 'Migration Tools',
                            route: '/admin/data/migrations',
                            icon: 'bi bi-arrow-right-circle'
                        }
                    ]
                }),

                // Divider
                this.createNavDivider('Developer Tools'),

                // Developer & Debug Tools
                this.createNavItem({
                    text: 'Developer Tools',
                    icon: 'bi bi-code-slash',
                    permissions: ['developer', 'super-admin'],
                    children: [
                        {
                            text: 'API Explorer',
                            route: '/admin/dev/api-explorer',
                            icon: 'bi bi-router'
                        },
                        {
                            text: 'Debug Console',
                            route: '/admin/dev/debug',
                            icon: 'bi bi-bug'
                        },
                        {
                            text: 'System Logs',
                            route: '/admin/dev/logs',
                            icon: 'bi bi-journal-text'
                        },
                        {
                            text: 'Queue Monitor',
                            route: '/admin/dev/queues',
                            icon: 'bi bi-list-task'
                        },
                        {
                            text: 'Performance Profiler',
                            route: '/admin/dev/profiler',
                            icon: 'bi bi-stopwatch'
                        }
                    ]
                }),

                // System Settings
                this.createNavItem({
                    text: 'System Settings',
                    icon: 'bi bi-gear-wide-connected',
                    children: [
                        {
                            text: 'Global Settings',
                            route: '/admin/settings/global',
                            icon: 'bi bi-globe'
                        },
                        {
                            text: 'Email Configuration',
                            route: '/admin/settings/email',
                            icon: 'bi bi-envelope-at'
                        },
                        {
                            text: 'Notification Settings',
                            route: '/admin/settings/notifications',
                            icon: 'bi bi-bell'
                        },
                        {
                            text: 'Theme & Branding',
                            route: '/admin/settings/theme',
                            icon: 'bi bi-palette'
                        },
                        {
                            text: 'Maintenance Mode',
                            route: '/admin/settings/maintenance',
                            icon: 'bi bi-tools'
                        }
                    ]
                })
            ],
            defaultActiveRoute: '/admin/dashboard',
            collapseSubmenus: true
        };
    }

    /**
     * Get group selector configuration for Phase 2
     */
    getGroupConfig() {
        return {
            enabled: true,
            endpoint: '/api/admin/groups',
            searchEnabled: true,
            placeholder: 'Switch Group Context...',
            currentGroup: null,
            collection: null,
            searchMinLength: 1,
            searchDebounce: 200,
            showAllGroups: true,
            allowGroupCreation: true
        };
    }

    /**
     * Get footer configuration for admin layout
     */
    getFooterConfig() {
        return {
            enabled: true,
            template: `
                <div class="sidebar-footer p-3 border-top">
                    <div class="d-flex flex-column text-muted small">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span>Admin Mode</span>
                            <span class="badge bg-danger">LIVE</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span>Version</span>
                            <span>v2.0.0-admin</span>
                        </div>
                    </div>
                </div>
            `
        };
    }

    /**
     * Get feature configuration for admin layout
     */
    getFeatureConfig() {
        return {
            ...super.getFeatureConfig(),
            search: true,
            notifications: true,
            userMenu: true,
            breadcrumbs: true,
            quickActions: true,
            systemStatus: true
        };
    }

    /**
     * Add system status indicators to navigation items
     */
    addSystemStatus(status) {
        const statusMap = {
            healthy: { class: 'bg-success', text: 'OK' },
            warning: { class: 'bg-warning', text: 'WARN' },
            error: { class: 'bg-danger', text: 'ERR' },
            maintenance: { class: 'bg-info', text: 'MAINT' }
        };

        const statusBadge = statusMap[status] || statusMap.healthy;
        
        // Add status to System Health nav item
        this.addNotificationBadge('system-health', statusBadge.text, statusBadge.class);
        
        return this;
    }

    /**
     * Enable advanced admin features
     */
    enableAdvancedFeatures() {
        this.setFeature('quickActions', true);
        this.setFeature('systemStatus', true);
        this.setFeature('notifications', true);
        this.setFeature('breadcrumbs', true);
        
        return this;
    }

    /**
     * Configure for multi-tenant admin (Phase 2 ready)
     */
    enableMultiTenant(tenantConfig = {}) {
        this.enableGroupSelector({
            endpoint: '/api/admin/tenants',
            placeholder: 'Switch Tenant...',
            searchMinLength: 1,
            showAllGroups: true,
            allowGroupCreation: false,
            ...tenantConfig
        });
        
        // Update brand to show tenant context
        this.config.brand.subtext = 'Multi-Tenant Administration';
        
        return this;
    }
}

export default AdminSidebarConfig;