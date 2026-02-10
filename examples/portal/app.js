/**
 * Portal Example - Main Application
 * Demonstrates WebApp with Portal layout (sidebar + topnav)
 */

import { VERSION_INFO } from '/src/version.js'
import Page from '/src/core/Page.js';
import PortalApp from '/src/core/PortalApp.js'
import HomePage from './pages/HomePage.js';
import DashboardPage from './pages/DashboardPage.js';
import TemplatesPage from './pages/TemplatesPage.js';
import TodosPage from './pages/TodosPage.js';
import FormsPage from './pages/FormsPage.js';
import FormInputsPage from './pages/FormInputsPage.js';
import FormValidationPage from './pages/FormValidationPage.js';
import DialogsPage from './pages/DialogsPage.js';
import FormDialogsPage from './pages/FormDialogsPage.js';
import TabViewPage from './pages/TabViewPage.js';
import ChartsPage from './pages/ChartsPage.js';
import ImagePage from './pages/ImagePage.js';
import FileDropPage from './pages/FileDropPage.js';
import ImageViewer from '/src/extensions/lightbox/ImageViewer.js';
import ConsoleSilencer from '/src/core/utils/ConsoleSilencer.js';
import { registerAdminPages, FileTablePage } from '/src/admin.js';

ConsoleSilencer.setLevel('debug');

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
const app = new PortalApp({
    name: 'Portal Example',
    version: '1.0.0',
    debug: true,
    basePath: '/examples/portal',

    showPageHeader: true,
    pageHeader: {
        style: 'default', // 'default' | 'minimal' | 'breadcrumb'
        showIcon: true,
        showDescription: true,
        showBreadcrumbs: false
    },

    // Layout configuration
    layout: 'portal',
    container: '#app',
    pageContainer: '#page-container',

    // API configuration (optional - for demo purposes)
    api: {
        baseUrl: 'http://localhost:9009',
        timeout: 30000
    },

    // Default brand configuration
    brand: 'Portal App',
    brandIcon: 'bi-lightning-charge',

    // Sidebar configuration with one collapsible menu
    sidebar: {
        groupSelectorMode: 'dialog',
        menus: [{
            name: "default",
            className: 'sidebar sidebar-dark',
            header: '<div class="fs-5 fw-bold text-center pt-3 sidebar-collapse-hide">Main Menu</div>',
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
                    text: 'Extensions',
                    icon: 'bi-graph-up',
                    children: [
                        {
                            text: 'Charts',
                            route: '?page=charts',
                            icon: 'bi-graph-up'
                        },
                        {
                            text: 'Image Processing',
                            route: '?page=image',
                            icon: 'bi-image'
                        },
                        {
                            text: 'File Drop Examples',
                            route: '?page=file-drop',
                            icon: 'bi-cloud-arrow-up'
                        }
                    ]
                },
                {
                    text: 'Special Pages',
                    icon: 'bi-exclamation-circle',
                    children: [
                        {
                            text: 'Not Found',
                            route: '?page=settings',
                            icon: 'bi-question-circle'
                        },
                        {
                            text: 'Need Permissions',
                            route: '?page=noperms',
                            icon: 'bi-shield'
                        },
                    ]
                },
                { divider: true },
                {
                    text: 'Templates',
                    route: '?page=templates',
                    icon: 'bi-code-slash'
                },
                {
                    text: 'Todos (Table Page)',
                    route: '?page=todos',
                    icon: 'bi-check2-square'
                },
                {
                    text: 'Forms',
                    icon: 'bi-input-cursor-text',
                    children: [
                        {
                            text: 'Form Examples',
                            route: '?page=forms',
                            icon: 'bi-clipboard-data'
                        },
                        {
                            text: 'Input Types',
                            route: '?page=form-inputs',
                            icon: 'bi-ui-checks-grid'
                        },
                        {
                            text: 'Validation',
                            route: '?page=form-validation',
                            icon: 'bi-shield-check'
                        },
                        {
                            text: 'Form Dialogs',
                            route: '?page=form-dialogs',
                            icon: 'bi-chat-square-text'
                        }
                    ]
                },
                {
                    text: 'Navigation',
                    icon: 'bi-signpost-split',
                    children: [
                        {
                            text: 'TabView',
                            route: '?page=tabview',
                            icon: 'bi-ui-checks-grid'
                        }
                    ]
                },
                {
                    text: 'Dialogs',
                    route: '?page=dialogs',
                    icon: 'bi-input-cursor-text'
                },
                {
                    kind: "label",
                    text: "This is a label",
                    className: "mt-3"
                },
                {
                    text: 'Simple',
                    route: '?page=simple',
                    icon: 'bi-input-cursor-text'
                },
                {
                    text: 'Show Group Menu',
                    action: 'show-group-menu',
                    icon: 'bi-menu-down'
                }
            ],
            footer: '<div class="text-center text-muted small collapsed-hidden">v1.0.0</div>'
        },
        {
           name: "group_default",
           groupKind: "any",
           className: 'sidebar sidebar-light sidebar-global',
           // header: "<div class='pt-3 text-center fs-5 fw-bold'><i class='bi bi-wrench pe-2'></i> <span class='collapsed-hidden'>Group</span></div>",
           items: [
               {
                   text: 'Dashboard',
                   route: '?page=group_simple',
                   icon: 'bi-input-cursor-text'
               },
               {
             		icon: "bi-folder-fill",
             		text:"Files",
             		route: "?page=group/files"
              	},
               {
                   spacer: true
               },
               {
                   text: 'Exit Menu',
                   action: 'exit_menu',
                   icon: 'bi-arrow-bar-left',
                   handler: async (action, event, el) => {
                       console.log("EXIT CLICKED");
                       app.sidebar.setActiveMenu("default");
                   }
               }
           ],
           footer: `
               <div class="text-center text-light small p-2" style="height: 56px;">
                   <div class="mt-1">v${VERSION_INFO.full}</div>
                   <div class="text-muted" style="font-size: 0.75em;">${VERSION_INFO.buildTime.split('T')[0]}</div>
               </div>
           `
        },
        {
           name: "system",
           className: 'sidebar sidebar-light sidebar-admin',
           header: "<div class='pt-3 text-center fs-5 fw-bold'><i class='bi bi-wrench pe-2'></i> <span class='collapsed-hidden'>System</span></div>",
           items: [
               {
                   spacer: true
               },
               {
                   text: 'Exit Menu',
                   action: 'exit_admin',
                   icon: 'bi-arrow-bar-left',
                   handler: async (action, event, el) => {
                       console.log("EXIT CLICKED");
                       app.sidebar.setActiveMenu("default");
                   }
               }
           ],
           footer: `
               <div class="text-center text-light small p-2 collapsed-hidden" style="height: 56px;">
                   <div class="mt-1">v${VERSION_INFO.full}</div>
                   <div class="text-muted" style="font-size: 0.75em;">${VERSION_INFO.buildTime.split('T')[0]}</div>
               </div>
           `
        }]
    },

    // Topbar configuration
    topbar: {
        brand: 'MOJO Portal',
        brandIcon: 'bi-lightning-charge',
        brandRoute: '?page=home',
        // theme: 'navbar-dark bg-primary',
        displayMode: 'group',
        theme: "dark",
        shadow: "dark",
        showSidebarToggle: true,
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
            // {
            //     type: 'group-selector',
            //     id: 'group-selector',
            // },
            {
                icon: 'bi-cloud-upload',
                action: 'test-upload',
                buttonClass: 'btn btn-link',
                tooltip: "Test File Upload Progress",
                title: 'Test File Upload Progress'
            },
            {
                icon: 'bi-bell',
                action: 'notifications',
                tooltip: "View Notifications",
                buttonClass: 'btn btn-link'
            },
            {
                id: "system",
                icon: 'bi-wrench',
                action: 'system-menu',
                buttonClass: 'btn btn-link',
                permissions: "view_admin",
                tooltip: "View System Menu",
                handler: async (action, event, el) => {
                    console.log("ADMIN CLICKED");
                    app.sidebar.setActiveMenu("system");
                }
            },
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
                },                {
                    label: 'Change Password',
                    icon: 'bi-shield-lock',
                    action: 'change-password'
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

    // Default route
    defaultRoute: 'home'
});

// Register pages using clean API: registerPage(name, PageClass, options)
app.registerPage('home', HomePage);
app.registerPage('dashboard', DashboardPage);
app.registerPage('charts', ChartsPage);
app.registerPage('templates', TemplatesPage);
app.registerPage('todos', TodosPage);
app.registerPage('forms', FormsPage);
app.registerPage('form-inputs', FormInputsPage);
app.registerPage('form-validation', FormValidationPage);
app.registerPage('dialogs', DialogsPage);
app.registerPage('form-dialogs', FormDialogsPage);
app.registerPage('tabview', TabViewPage);
app.registerPage('image', ImagePage);
app.registerPage('file-drop', FileDropPage);
app.registerPage('simple', Page, {
    id: 'simple',
    title: "Simple",
    icon: 'bi bi-circle',
    headerActions: [
        {
            label: 'Export',
            icon: 'bi-download',
            action: 'export',
            buttonClass: 'btn-primary'
        }
    ],
    template: '<div class="fs-5 mt-4 text-center">Simple page</div>'
});
app.registerPage('group_simple', Page, {
    id: 'group_simple',
    title: "Group Simple",
    requiresGroup: true,
    template: '<div class="fs-5 mt-4 text-center">Group Simple page</div>'
});
app.registerPage('noperms', Page, {
    id: 'noperms',
    title: "Simple",
    permissions: ['not_real_permission'],
    template: '<div class="fs-5 mt-4 text-center">Simple page</div>'
});

app.registerPage("group/files", FileTablePage, {
    requiresGroup: true,
    permissions: ["manage_group", "manage_groups"],
    tableViewOptions: {
        hideActivePillNames: ["group"],
        showAdd: true,
        addRequiresActiveGroup: true,
        addRequiresActiveUser: false
    },
});


// Register admin pages
try {
    registerAdminPages(app, true);
    console.log('Admin pages registered successfully');
} catch (error) {
    console.warn('Failed to register admin pages:', error);
}

// Register ReportsPage for all report-related routes
// Handle portal actions
app.events.on('portal:action', ({ action }) => {
    switch (action) {
        case 'test-upload':
            // Import and test file upload progress UI
            import('/src/index.js').then(({ ToastService }) => {
                import('/src/index.js').then(({ ProgressView }) => {
                    // ToastService and ProgressView are already destructured

                    const toastService = new ToastService();

                    // Create fake file upload progress
                    const progressView = new ProgressView({
                        filename: 'test-document.pdf',
                        filesize: 2560000, // 2.56 MB
                        showCancel: true,
                        onCancel: () => {
                            clearInterval(progressInterval);
                            app.showWarning('Test upload cancelled');
                        }
                    });

                    // Show progress in toast
                    const progressToast = toastService.showView(progressView, 'info', {
                        title: 'Test File Upload',
                        autohide: false,
                        dismissible: false
                    });

                    // Simulate progress
                    let progress = 0;
                    const progressInterval = setInterval(() => {
                        progress += Math.random() * 15; // Random progress increment

                        if (progress >= 100) {
                            progress = 100;
                            clearInterval(progressInterval);

                            // Mark as completed
                            progressView.markCompleted('Test upload completed!');

                            // Auto-hide after 2 seconds
                            setTimeout(() => {
                                progressToast.hide();
                            }, 2000);
                        }

                        // Update progress
                        const loaded = Math.round((progress / 100) * 2560000);
                        progressView.updateProgress({
                            progress: progress / 100,
                            loaded: loaded,
                            total: 2560000,
                            percentage: Math.round(progress)
                        });
                    }, 200); // Update every 200ms
                });
            });
            break;
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
    // Hide the initial loader once the app is ready
    if (window.hideInitialLoader) {
        window.hideInitialLoader();
    }
}).catch(error => {
    console.error('Failed to start app:', error);
    // Also hide loader on error
    if (window.hideInitialLoader) {
        window.hideInitialLoader();
    }
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
