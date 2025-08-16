/**
 * Simple Usage Examples for MOJO Sidebar
 * Demonstrates the simplified API for easy sidebar creation
 */

import Sidebar from '../Sidebar.js';
import Page from '../../core/Page.js';

// Example 1: Most Basic Usage
class BasicExample extends Page {
    async onInit() {
        await super.onInit();
        
        // Create sidebar with simple configuration
        const sidebar = new Sidebar({
            container: '#sidebar'
        });
        
        // Set basic menu with your exact config format
        await sidebar.setSimpleConfig({
            brand: 'Navigation',
            brandIcon: 'bi bi-grid-3x3-gap',
            brandSubtext: 'Main Menu',
            items: [
                {
                    text: 'Home',
                    route: '?page=home',
                    icon: 'bi bi-house'
                },
                {
                    text: 'Dashboard',
                    route: '?page=dashboard',
                    icon: 'bi bi-speedometer2'
                },
                {
                    text: 'Reports',
                    icon: 'bi bi-graph-up',
                    children: [
                        {
                            text: 'Sales Report',
                            route: '?page=sales',
                            icon: 'bi bi-currency-dollar'
                        },
                        {
                            text: 'Analytics',
                            route: '?page=analytics',
                            icon: 'bi bi-bar-chart'
                        },
                        {
                            text: 'Performance',
                            route: '?page=performance',
                            icon: 'bi bi-speedometer'
                        }
                    ]
                },
                {
                    text: 'Settings',
                    route: '?page=settings',
                    icon: 'bi bi-gear'
                },
                {
                    text: 'Templates',
                    route: '?page=templates',
                    icon: 'bi bi-code-slash'
                },
                {
                    text: 'Todos',
                    route: '?page=todos',
                    icon: 'bi bi-check2-square'
                },
                {
                    text: 'Forms',
                    route: '?page=forms',
                    icon: 'bi bi-input-cursor-text'
                },
                {
                    text: 'Dialogs',
                    route: '?page=dialogs',
                    icon: 'bi bi-input-cursor-text'
                }
            ],
            footer: '<div class="text-center text-muted small">v1.0.0</div>'
        });
        
        this.addChild(sidebar);
    }
}

// Example 2: Multiple Menu Configurations
class MultiMenuExample extends Page {
    async onInit() {
        await super.onInit();
        
        const sidebar = new Sidebar({
            container: '#sidebar',
            enableConfigSwitcher: true // Allow switching between menus
        });
        
        // Add main menu
        sidebar.addMenu('main', {
            brand: 'My App',
            brandIcon: 'bi bi-app',
            items: [
                { text: 'Home', route: '/', icon: 'bi bi-house' },
                { text: 'About', route: '/about', icon: 'bi bi-info-circle' }
            ],
            footer: '<small>Main Menu</small>'
        });
        
        // Add admin menu
        sidebar.addMenu('admin', {
            brand: 'Admin Panel',
            brandIcon: 'bi bi-shield-check',
            brandSubtext: 'Administrator',
            items: [
                { text: 'Dashboard', route: '/admin', icon: 'bi bi-speedometer2' },
                { text: 'Users', route: '/admin/users', icon: 'bi bi-people' },
                { text: 'Settings', route: '/admin/settings', icon: 'bi bi-gear' }
            ],
            footer: '<small class="text-warning">Admin Mode</small>',
            roles: ['admin'],
            priority: 10
        });
        
        this.addChild(sidebar);
    }
}

// Example 3: Static Creation (One-liner)
const quickSidebar = Sidebar.createWithSimpleConfig({
    container: '#quick-sidebar',
    config: {
        brand: 'Quick Menu',
        items: [
            { text: 'Dashboard', route: '/dashboard', icon: 'bi bi-speedometer2' },
            { text: 'Profile', route: '/profile', icon: 'bi bi-person' }
        ]
    }
});

// Example 4: Dynamic Menu Building
class DynamicExample extends Page {
    async onInit() {
        await super.onInit();
        
        const sidebar = new Sidebar({
            container: '#sidebar'
        });
        
        // Start with basic setup
        await sidebar.setBasicMenu('Dynamic App', [
            { text: 'Home', route: '/', icon: 'bi bi-house' }
        ]);
        
        // Add more items dynamically
        sidebar.addNavItems([
            { text: 'Profile', route: '/profile', icon: 'bi bi-person' },
            { text: 'Messages', route: '/messages', icon: 'bi bi-envelope' }
        ]);
        
        // Update branding
        sidebar.setBrand('Updated App', 'bi bi-star', 'Version 2.0');
        
        // Add footer
        sidebar.setFooter('<div class="text-center">© 2024 My Company</div>');
        
        this.addChild(sidebar);
    }
}

// Example 5: With Groups/Organizations (Phase 2)
class GroupsExample extends Page {
    async onInit() {
        await super.onInit();
        
        const sidebar = new Sidebar({
            container: '#sidebar'
        });
        
        await sidebar.setSimpleConfig({
            brand: 'Multi-Org App',
            brandIcon: 'bi bi-building',
            enableGroupSelector: true,
            groups: {
                endpoint: '/api/organizations',
                placeholder: 'Select Organization...',
                allowGroupCreation: true
            },
            items: [
                { text: 'Dashboard', route: '/', icon: 'bi bi-speedometer2' },
                { text: 'Team', route: '/team', icon: 'bi bi-people' },
                { text: 'Projects', route: '/projects', icon: 'bi bi-folder' }
            ],
            footer: '<small>Multi-tenant enabled</small>'
        });
        
        // Listen for group changes
        sidebar.on('group-selected', (data) => {
            console.log('Selected organization:', data.group.name);
            // Update your app context
        });
        
        this.addChild(sidebar);
    }
}

// Example 6: Advanced Features with Simple Config
class AdvancedSimpleExample extends Page {
    async onInit() {
        await super.onInit();
        
        const sidebar = new Sidebar({
            container: '#sidebar',
            user: this.getCurrentUser() // Pass user for permissions
        });
        
        await sidebar.setSimpleConfig({
            brand: 'Advanced App',
            brandIcon: 'bi bi-rocket',
            brandSubtext: 'Pro Version',
            
            // Items with advanced features
            items: [
                { text: 'Dashboard', route: '/', icon: 'bi bi-speedometer2' },
                
                // Divider
                { type: 'divider', label: 'Management' },
                
                // Item with badge
                { 
                    text: 'Messages', 
                    route: '/messages', 
                    icon: 'bi bi-envelope',
                    badge: { text: '5', class: 'badge bg-danger' }
                },
                
                // Item with permissions
                { 
                    text: 'Admin Panel', 
                    route: '/admin', 
                    icon: 'bi bi-shield-lock',
                    permissions: ['admin']
                },
                
                // Complex submenu
                {
                    text: 'Reports',
                    icon: 'bi bi-graph-up',
                    children: [
                        { text: 'Sales', route: '/reports/sales', icon: 'bi bi-currency-dollar' },
                        { text: 'Users', route: '/reports/users', icon: 'bi bi-people' },
                        { text: 'Analytics', route: '/reports/analytics', icon: 'bi bi-bar-chart' }
                    ]
                },
                
                // Section
                {
                    type: 'section',
                    title: 'Tools',
                    collapsible: true,
                    items: [
                        { text: 'Calculator', route: '/tools/calc', icon: 'bi bi-calculator' },
                        { text: 'Calendar', route: '/tools/calendar', icon: 'bi bi-calendar' }
                    ]
                }
            ],
            
            footer: `
                <div class="p-3 border-top">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">v2.1.0</small>
                        <span class="badge bg-success">Online</span>
                    </div>
                </div>
            `
        });
        
        this.addChild(sidebar);
    }
}

// Example 7: Migration from Old Format
class MigrationExample extends Page {
    async onInit() {
        await super.onInit();
        
        // Your old sidebar data - works exactly the same!
        const oldSidebarData = {
            brand: 'Legacy App',
            brandIcon: 'bi bi-gear',
            navItems: [ // old property name still works
                { text: 'Home', route: '/', icon: 'bi bi-house' },
                { text: 'Settings', route: '/settings', icon: 'bi bi-gear' }
            ],
            footerContent: '<small>Legacy Mode</small>' // old property name
        };
        
        const sidebar = new Sidebar({
            container: '#sidebar'
        });
        
        // Works with old property names too!
        await sidebar.setSimpleConfig(oldSidebarData);
        
        this.addChild(sidebar);
    }
}

// Example 8: Real-world E-commerce Example
const ecommerceConfig = {
    brand: 'ShopAdmin',
    brandIcon: 'bi bi-shop',
    brandSubtext: 'Store Management',
    items: [
        { text: 'Dashboard', route: '/dashboard', icon: 'bi bi-speedometer2' },
        
        { type: 'divider', label: 'Sales' },
        { text: 'Orders', route: '/orders', icon: 'bi bi-bag-check' },
        { text: 'Customers', route: '/customers', icon: 'bi bi-people' },
        
        { type: 'divider', label: 'Inventory' },
        {
            text: 'Products',
            icon: 'bi bi-box-seam',
            children: [
                { text: 'All Products', route: '/products', icon: 'bi bi-grid' },
                { text: 'Categories', route: '/products/categories', icon: 'bi bi-tags' },
                { text: 'Inventory', route: '/products/inventory', icon: 'bi bi-boxes' }
            ]
        },
        
        { type: 'divider', label: 'Analytics' },
        { text: 'Reports', route: '/reports', icon: 'bi bi-graph-up' },
        { text: 'Analytics', route: '/analytics', icon: 'bi bi-pie-chart' },
        
        { type: 'divider', label: 'System' },
        { text: 'Settings', route: '/settings', icon: 'bi bi-gear' }
    ],
    footer: '<div class="text-center"><small>ShopAdmin v3.0</small></div>'
};

// Usage Examples for Different Scenarios:

/*
// 1. Minimal Setup
const sidebar = new Sidebar({ container: '#sidebar' });
await sidebar.setBasicMenu('My App', [
    { text: 'Home', route: '/', icon: 'bi-house' }
]);

// 2. Full Featured
sidebar.addMenu('main', {
    brand: 'App Name',
    items: [...],
    enableGroupSelector: true,
    groups: { endpoint: '/api/orgs' }
});

// 3. Static Creation
const sidebar = Sidebar.createWithSimpleConfig({
    container: '#sidebar',
    config: { brand: 'Quick App', items: [...] }
});

// 4. Your Original Format - Works Exactly the Same!
sidebar.addMenu('default', {
    brand: 'Navigation',
    brandIcon: 'bi-grid-3x3-gap',
    brandSubtext: 'Main Menu',
    items: [
        { text: 'Home', route: '?page=home', icon: 'bi-house' },
        // ... rest of your config
    ],
    footer: '<div class="text-center text-muted small">v1.0.0</div>'
});
*/

export {
    BasicExample,
    MultiMenuExample,
    DynamicExample,
    GroupsExample,
    AdvancedSimpleExample,
    MigrationExample,
    ecommerceConfig
};