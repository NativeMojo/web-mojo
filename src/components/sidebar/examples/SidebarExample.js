/**
 * SidebarExample - Comprehensive example showing advanced sidebar usage
 * Demonstrates configuration switching, group selection, and custom setups
 */

import Sidebar from '../Sidebar.js';
import SidebarManager from '../SidebarManager.js';
import DefaultSidebarConfig from '../configs/DefaultSidebarConfig.js';
import AdminSidebarConfig from '../configs/AdminSidebarConfig.js';
import SidebarConfig from '../SidebarConfig.js';
import Page from '../../core/Page.js';

// Example: Custom E-commerce Sidebar Configuration
class EcommerceSidebarConfig extends SidebarConfig {
    constructor(options = {}) {
        super('ecommerce', options);
    }

    getBrandConfig() {
        return {
            text: 'ShopMaster',
            subtext: 'E-commerce Platform',
            icon: 'bi bi-shop',
            clickable: true,
            route: '/dashboard'
        };
    }

    getNavigationConfig() {
        return {
            items: [
                this.createNavItem({
                    text: 'Dashboard',
                    route: '/dashboard',
                    icon: 'bi bi-speedometer2'
                }),

                this.createNavDivider('Sales & Orders'),

                this.createNavItem({
                    text: 'Orders',
                    icon: 'bi bi-cart-check',
                    children: [
                        { text: 'All Orders', route: '/orders', icon: 'bi bi-list-ul' },
                        { text: 'Pending', route: '/orders/pending', icon: 'bi bi-clock' },
                        { text: 'Processing', route: '/orders/processing', icon: 'bi bi-gear' },
                        { text: 'Shipped', route: '/orders/shipped', icon: 'bi bi-truck' },
                        { text: 'Returns', route: '/orders/returns', icon: 'bi bi-arrow-return-left' }
                    ]
                }),

                this.createNavItem({
                    text: 'Products',
                    icon: 'bi bi-box-seam',
                    children: [
                        { text: 'All Products', route: '/products', icon: 'bi bi-grid' },
                        { text: 'Categories', route: '/products/categories', icon: 'bi bi-tags' },
                        { text: 'Inventory', route: '/products/inventory', icon: 'bi bi-boxes' },
                        { text: 'Pricing', route: '/products/pricing', icon: 'bi bi-currency-dollar' }
                    ]
                }),

                this.createNavItem({
                    text: 'Customers',
                    route: '/customers',
                    icon: 'bi bi-people',
                    badge: { text: 'New', class: 'badge bg-info' }
                }),

                this.createNavDivider('Analytics'),

                this.createNavItem({
                    text: 'Reports',
                    icon: 'bi bi-graph-up',
                    children: [
                        { text: 'Sales Report', route: '/reports/sales', icon: 'bi bi-bar-chart' },
                        { text: 'Revenue', route: '/reports/revenue', icon: 'bi bi-currency-exchange' },
                        { text: 'Customer Analytics', route: '/reports/customers', icon: 'bi bi-person-lines-fill' }
                    ]
                }),

                this.createNavDivider('System'),

                this.createNavItem({
                    text: 'Settings',
                    icon: 'bi bi-gear',
                    children: [
                        { text: 'Store Settings', route: '/settings/store', icon: 'bi bi-shop' },
                        { text: 'Payment Methods', route: '/settings/payments', icon: 'bi bi-credit-card' },
                        { text: 'Shipping', route: '/settings/shipping', icon: 'bi bi-truck' }
                    ]
                })
            ],
            defaultActiveRoute: '/dashboard'
        };
    }

    getFooterConfig() {
        return {
            enabled: true,
            template: `
                <div class="sidebar-footer p-3">
                    <div class="d-flex justify-content-between align-items-center text-muted small">
                        <span>ShopMaster v3.1</span>
                        <span class="badge bg-success">Online</span>
                    </div>
                </div>
            `
        };
    }
}

// Example: Portal Page with Advanced Sidebar
class PortalPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'Portal',
            route: '/:section?/:subsection?',
            template: `
                <div class="portal-layout">
                    <div id="portal-sidebar" data-container="sidebar"></div>
                    <div class="portal-body">
                        <div id="portal-topnav" data-container="topnav"></div>
                        <div class="portal-content">
                            <h1>{{pageTitle}}</h1>
                            <p>Current Section: {{currentSection}}</p>
                            <p>Current Sidebar: {{currentSidebar}}</p>
                            
                            <div class="row mt-4">
                                <div class="col-md-6">
                                    <h3>Sidebar Controls</h3>
                                    <div class="btn-group-vertical w-100">
                                        <button class="btn btn-outline-primary" data-action="switch-to-default">
                                            Switch to Default
                                        </button>
                                        <button class="btn btn-outline-success" data-action="switch-to-admin">
                                            Switch to Admin
                                        </button>
                                        <button class="btn btn-outline-info" data-action="switch-to-ecommerce">
                                            Switch to E-commerce
                                        </button>
                                        <button class="btn btn-outline-warning" data-action="enable-groups">
                                            Enable Group Selector
                                        </button>
                                        <button class="btn btn-outline-secondary" data-action="toggle-config-switcher">
                                            Toggle Config Switcher
                                        </button>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <h3>User Simulation</h3>
                                    <div class="btn-group-vertical w-100">
                                        <button class="btn btn-outline-primary" data-action="simulate-regular-user">
                                            Regular User
                                        </button>
                                        <button class="btn btn-outline-danger" data-action="simulate-admin-user">
                                            Admin User
                                        </button>
                                        <button class="btn btn-outline-success" data-action="simulate-manager-user">
                                            Manager User
                                        </button>
                                        <button class="btn btn-outline-secondary" data-action="clear-user">
                                            Clear User
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="row mt-4">
                                <div class="col-12">
                                    <h3>Event Log</h3>
                                    <div class="border p-3" style="height: 200px; overflow-y: auto;">
                                        <div data-container="event-log"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            ...options
        });

        this.eventLog = [];
        this.currentUser = null;
        this.configSwitcherEnabled = false;
    }

    async onInit() {
        await super.onInit();

        // Create and setup sidebar
        this.sidebar = new Sidebar({
            container: '[data-container="sidebar"]',
            enableConfigSwitcher: this.configSwitcherEnabled,
            persistConfig: true,
            autoSwitchByRole: true
        });

        // Register custom e-commerce configuration
        this.sidebar.getSidebarManager().registerConfiguration(
            'ecommerce', 
            EcommerceSidebarConfig,
            {
                description: 'E-commerce Management',
                roles: ['store_manager', 'admin'],
                priority: 5
            }
        );

        this.addChild(this.sidebar);

        // Setup event listeners
        this.setupSidebarEvents();
    }

    setupSidebarEvents() {
        // Listen for configuration changes
        this.sidebar.on('configuration-changed', (data) => {
            this.logEvent(`Configuration changed to: ${data.configName}`);
            this.updateData({ currentSidebar: data.configName });
        });

        // Listen for group selections (Phase 2)
        this.sidebar.on('group-selected', (data) => {
            this.logEvent(`Group selected: ${data.group.name}`);
        });

        // Listen for navigation
        this.sidebar.on('navigate', (data) => {
            this.logEvent(`Navigate to: ${data.route}`);
        });
    }

    async getViewData() {
        const currentConfig = this.sidebar ? this.sidebar.getCurrentConfig() : null;
        
        return {
            pageTitle: 'Advanced Sidebar Demo',
            currentSection: this.params?.section || 'dashboard',
            currentSidebar: currentConfig?.name || 'none',
            eventLog: this.eventLog.slice(-10).reverse() // Last 10 events
        };
    }

    logEvent(message) {
        this.eventLog.push({
            timestamp: new Date().toLocaleTimeString(),
            message
        });
        
        // Update event log display
        const container = this.element.querySelector('[data-container="event-log"]');
        if (container) {
            container.innerHTML = this.eventLog.slice(-10).reverse()
                .map(event => `<div class="small text-muted">${event.timestamp}: ${event.message}</div>`)
                .join('');
        }
    }

    // Action handlers for demo controls
    async handleActionSwitchToDefault(event, element) {
        await this.sidebar.switchConfiguration('default');
    }

    async handleActionSwitchToAdmin(event, element) {
        await this.sidebar.switchConfiguration('admin');
    }

    async handleActionSwitchToEcommerce(event, element) {
        await this.sidebar.switchConfiguration('ecommerce');
    }

    async handleActionEnableGroups(event, element) {
        await this.sidebar.enableGroupSelector({
            endpoint: '/api/demo/groups',
            placeholder: 'Search groups...'
        });
        this.logEvent('Group selector enabled');
    }

    async handleActionToggleConfigSwitcher(event, element) {
        this.configSwitcherEnabled = !this.configSwitcherEnabled;
        await this.sidebar.enableConfigSwitcher();
        this.logEvent(`Config switcher ${this.configSwitcherEnabled ? 'enabled' : 'disabled'}`);
    }

    // User simulation methods
    async handleActionSimulateRegularUser(event, element) {
        const user = {
            id: 'user123',
            name: 'John Doe',
            roles: ['user'],
            permissions: ['read']
        };
        await this.setUser(user);
    }

    async handleActionSimulateAdminUser(event, element) {
        const user = {
            id: 'admin123',
            name: 'Admin User',
            roles: ['admin', 'super-admin'],
            permissions: ['read', 'write', 'admin', 'developer']
        };
        await this.setUser(user);
    }

    async handleActionSimulateManagerUser(event, element) {
        const user = {
            id: 'manager123',
            name: 'Store Manager',
            roles: ['store_manager', 'user'],
            permissions: ['read', 'write', 'manage_store']
        };
        await this.setUser(user);
    }

    async handleActionClearUser(event, element) {
        await this.setUser(null);
    }

    async setUser(user) {
        this.currentUser = user;
        await this.sidebar.setUser(user);
        this.logEvent(`User set to: ${user ? user.name : 'anonymous'}`);
    }

    // Route parameter handling
    async onParams(params) {
        await super.onParams(params);
        
        // Update sidebar active item based on current route
        const route = this.buildCurrentRoute(params);
        await this.sidebar.updateActiveItem(route);
        
        this.logEvent(`Route changed to: ${route}`);
    }

    buildCurrentRoute(params) {
        const parts = [];
        if (params.section) parts.push(params.section);
        if (params.subsection) parts.push(params.subsection);
        return parts.length > 0 ? `/${parts.join('/')}` : '/dashboard';
    }
}

// Example: Standalone Sidebar Usage
class StandaloneSidebarExample {
    constructor() {
        this.sidebar = null;
    }

    async initialize() {
        // Create sidebar with advanced features
        this.sidebar = new Sidebar({
            container: '#sidebar-container',
            enableConfigSwitcher: true,
            persistConfig: true,
            autoSwitchByRole: true,
            user: {
                id: 'demo123',
                name: 'Demo User',
                roles: ['admin'],
                permissions: ['read', 'write', 'admin']
            }
        });

        // Register custom configurations
        const manager = this.sidebar.getSidebarManager();
        
        // Custom CRM configuration
        manager.registerConfiguration('crm', class extends SidebarConfig {
            getBrandConfig() {
                return {
                    text: 'CRM Pro',
                    subtext: 'Customer Management',
                    icon: 'bi bi-person-rolodex'
                };
            }

            getNavigationConfig() {
                return {
                    items: [
                        this.createNavItem({
                            text: 'Contacts',
                            route: '/contacts',
                            icon: 'bi bi-person-lines-fill'
                        }),
                        this.createNavItem({
                            text: 'Companies',
                            route: '/companies',
                            icon: 'bi bi-building'
                        }),
                        this.createNavItem({
                            text: 'Deals',
                            route: '/deals',
                            icon: 'bi bi-currency-dollar'
                        }),
                        this.createNavItem({
                            text: 'Reports',
                            route: '/reports',
                            icon: 'bi bi-graph-up'
                        })
                    ]
                };
            }
        });

        // Enable Phase 2 group selector
        await this.sidebar.enableGroupSelector({
            endpoint: '/api/organizations',
            placeholder: 'Select Organization...',
            searchMinLength: 1
        });

        // Setup event handlers
        this.sidebar.on('configuration-changed', (data) => {
            console.log('Configuration changed:', data);
        });

        this.sidebar.on('group-selected', (data) => {
            console.log('Group selected:', data.group);
        });

        return this.sidebar;
    }

    // Method to switch configurations programmatically
    async switchToConfig(configName) {
        await this.sidebar.switchConfiguration(configName);
    }

    // Method to update user context
    async updateUser(user) {
        await this.sidebar.setUser(user);
    }

    // Method to add dynamic badge to navigation item
    addNotificationBadge(itemId, count) {
        const manager = this.sidebar.getSidebarManager();
        const currentConfig = manager.getCurrentConfiguration();
        
        if (currentConfig.config) {
            currentConfig.config.addNotificationBadge(itemId, count, 'danger');
        }
    }
}

// Export classes for use
export default PortalPage;
export { EcommerceSidebarConfig, StandaloneSidebarExample };

// Usage Examples:

/* 
// Basic usage in an app
const app = WebApp.create({
    container: '#app',
    title: 'Advanced Sidebar Demo'
});

app.registerPage('portal', PortalPage);
await app.start();

// Standalone usage
const sidebarExample = new StandaloneSidebarExample();
await sidebarExample.initialize();

// Switch configurations
await sidebarExample.switchToConfig('admin');

// Update user
await sidebarExample.updateUser({
    id: 'user456',
    name: 'Jane Smith',
    roles: ['manager'],
    permissions: ['read', 'write']
});

// Add notification
sidebarExample.addNotificationBadge('orders', 5);
*/