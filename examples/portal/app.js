/**
 * Portal Example - Main Application
 * Demonstrates WebApp with Portal layout (sidebar + topnav)
 */

import WebApp from '../../src/app/WebApp.js';
import HomePage from './pages/HomePage.js';
import DashboardPage from './pages/DashboardPage.js';
import TemplatesPage from './pages/TemplatesPage.js';
import TodosPage from './pages/TodosPage.js';
import FormsPage from './pages/FormsPage.js';
import DialogsPage from './pages/DialogsPage.js';


// Detect page reloads
if (window.performance && window.performance.navigation.type === 1) {
    console.warn('⚠️ Page was reloaded!');
} else {
    console.log('✅ Initial page load (not a reload)');
}

// Add beforeunload listener to detect when page is about to reload
window.addEventListener('beforeunload', () => {
    console.warn('⚠️ Page is about to reload/navigate away!');
});

// Create and configure the app
const app = new WebApp({
    name: 'Portal Example',
    version: '1.0.0',
    debug: true,
    basePath: '/examples/portal',

    // Layout configuration
    layout: 'portal',
    container: '#app',
    pageContainer: '#page-container',

    // API configuration (optional - for demo purposes)
    api: {
        baseUrl: 'http://localhost:8881',
        timeout: 30000
    },

    // Default brand configuration
    brand: 'Portal App',
    brandIcon: 'bi-lightning-charge',

    // Sidebar configuration with one collapsible menu
    sidebar: {
        className: 'sidebar sidebar-light',
        header: '<div class="fs-5 fw-bold text-center pt-3">Main Menu</div>',
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
            },
            {
                text: 'Todos',
                route: '?page=todos',
                icon: 'bi-check2-square'
            },
            {
                text: 'Forms',
                route: '?page=forms',
                icon: 'bi-input-cursor-text'
            },
            {
                text: 'Dialogs',
                route: '?page=dialogs',
                icon: 'bi-input-cursor-text'
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
        displayMode: 'both',
        // Left navigation items
        // leftItems: [
        //     {
        //         label: 'Projects',
        //         page: 'projects',
        //         icon: 'bi-folder'
        //     },
        //     {
        //         label: 'Team',
        //         page: 'team',
        //         icon: 'bi-people'
        //     }
        // ],
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

// Register pages using clean API: registerPage(name, PageClass, options)
app.registerPage('home', HomePage);
app.registerPage('dashboard', DashboardPage);
app.registerPage('templates', TemplatesPage);
app.registerPage('todos', TodosPage);
app.registerPage('forms', FormsPage);
app.registerPage('dialogs', DialogsPage);

// Register ReportsPage for all report-related routes
// Handle portal actions
app.events.on('portal:action', ({ action }) => {
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

// Debug helper function
window.debugApp = () => {
    console.log('=== App Debug Info ===');
    console.log('Pages registered:', Array.from(app.pageClasses.keys()));
    console.log('Pages cached:', Array.from(app.pageCache.keys()));
    console.log('Current page:', app.currentPage?.pageName || 'none');
    console.log('Router mode:', app.router?.options?.mode);

    const routes = Array.from(app.router.routes.entries())
        .filter(([key]) => !key.startsWith('@'))
        .map(([pattern, info]) => ({
            pattern,
            pageName: info.pageName,
            regex: info.regex.toString()
        }));
    console.table(routes);

    return {
        pageClasses: app.pageClasses,
        pageCache: app.pageCache,
        router: app.router,
        currentPage: app.currentPage
    };
};
