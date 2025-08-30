/**
 * DocIt Example - Main Application
 * Demonstrates using the DocIt submodule within a PortalApp layout.
 */

import PortalApp from '/src/app/PortalApp.js';
import { DocitPage } from '/src/docit/index.js';

// Create and configure the app
const app = new PortalApp({
    name: 'DocIt Example',
    version: '1.0.0',
    debug: true,
    basePath: '/examples/docit',
    container: '#app',

    api: {
        baseUrl: 'http://localhost:8881',
        timeout: 30000
    },

    brand: 'DocIt Example',
    brandIcon: 'bi-book',

    // Configure a default sidebar for the PortalApp.
    // The DocitPage will take control of this sidebar when it's active.
    sidebar: {
        menus: [{
            name: "main",
            header: '<h3>Main Menu</h3>',
            items: [
                { text: 'Home', route: '#/home', icon: 'bi-house' },
                { text: 'Documentation', route: '#/docs', icon: 'bi-book' }
            ]
        }]
    },

    topbar: {
        brand: 'DocIt Example',
        brandIcon: 'bi-book',
        brandRoute: '#/home',
        showSidebarToggle: true,
        rightItems: [
            {
                id: "login",
                icon: 'bi-box-arrow-in-right',
                href: '/examples/auth/',
                label: 'Login'
            }
        ],
        userMenu: {
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
    },

    defaultRoute: 'docs'
});

// Register DocitPage like any other page
app.registerPage('docs', DocitPage);

// Start the application
app.start().then(() => {
    console.log('DocIt example app started successfully');
}).catch(error => {
    console.error('Failed to start app:', error);
});

window.app = app;
