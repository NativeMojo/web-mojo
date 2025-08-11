/**
 * Portal Example - Main Application
 * Demonstrates WebApp with Portal layout (sidebar + topnav)
 */

import WebApp from '../../src/app/WebApp.js';
import HomePage from './pages/HomePage.js';
import DashboardPage from './pages/DashboardPage.js';
import TemplatesPage from './pages/TemplatesPage.js';

// Create and configure the app
const app = new WebApp({
    name: 'Portal Example',
    version: '1.0.0',
    debug: true,
    basePath: '/examples/portal',

    // Layout configuration
    layout: 'portal',
    container: '#app',

    // API configuration (optional - for demo purposes)
    api: {
        baseUrl: 'https://jsonplaceholder.typicode.com',
        timeout: 30000
    },

    // Default brand configuration
    brand: 'Portal App',
    brandIcon: 'bi-lightning-charge',

    // Sidebar configuration with one collapsible menu
    sidebar: {
        brand: 'Navigation',
        brandIcon: 'bi-grid-3x3-gap',
        brandSubtext: 'Main Menu',
        items: [
            {
                text: 'Home',
                route: '?page=home',
                icon: 'bi-house'
            },
            {
                text: 'Dashboard',
                route: '?page=dashboard',
                icon: 'bi-speedometer2'
            },
            {
                text: 'Reports',
                icon: 'bi-graph-up',
                children: [
                    {
                        text: 'Sales Report',
                        route: '?page=sales',
                        icon: 'bi-currency-dollar'
                    },
                    {
                        text: 'Analytics',
                        route: '?page=analytics',
                        icon: 'bi-bar-chart'
                    },
                    {
                        text: 'Performance',
                        route: '?page=performance',
                        icon: 'bi-speedometer'
                    }
                ]
            },
            {
                text: 'Settings',
                route: '?page=settings',
                icon: 'bi-gear'
            },
            {
                text: 'Templates',
                route: '?page=templates',
                icon: 'bi-code-slash'
            }
        ],
        footer: '<div class="text-center text-muted small">v1.0.0</div>'
    },

    // Topbar configuration
    topbar: {
        brand: 'MOJO Portal',
        brandIcon: 'bi-lightning-charge',
        brandRoute: '?page=home',
        theme: 'navbar-dark bg-primary',
        // Left navigation items
        leftItems: [
            {
                label: 'Projects',
                page: 'projects',
                icon: 'bi-folder'
            },
            {
                label: 'Team',
                page: 'team',
                icon: 'bi-people'
            }
        ],
        // Right items (user menu, notifications, etc)
        rightItems: [
            {
                icon: 'bi-bell',
                action: 'notifications',
                buttonClass: 'btn btn-link text-white'
            },
            {
                label: 'User',
                icon: 'bi-person-circle',
                items: [
                    {
                        label: 'Profile',
                        icon: 'bi-person',
                        action: 'profile'
                    },
                    {
                        divider: true
                    },
                    {
                        label: 'Logout',
                        icon: 'bi-box-arrow-right',
                        action: 'logout'
                    }
                ]
            }
        ]
    },

    // Default route
    defaultRoute: 'home'
});

// Register pages
app.addPage(HomePage);
app.addPage(DashboardPage);
app.addPage(TemplatesPage);

// Register ReportsPage for all report-related routes
// Handle portal actions
app.eventBus.on('portal:action', ({ action }) => {
    switch (action) {
        case 'notifications':
            app.showInfo('You have 3 new notifications');
            break;
        case 'profile':
            app.showInfo('Profile page coming soon!');
            break;
        case 'logout':
            app.showSuccess('Logged out successfully');
            // In a real app, you would clear session and redirect
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            break;
    }
});

// Start the application
app.start().then(() => {
    console.log('Portal app started successfully');
}).catch(error => {
    console.error('Failed to start app:', error);
});

// Make app globally available for debugging
window.app = app;
