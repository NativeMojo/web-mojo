/**
 * MOJO Sidebar Navigation Example
 * Demonstrates routing, pages, and navigation using framework components
 */

// Import MOJO framework modules
import Router from '../../src/core/Router.js';
import Page from '../../src/core/Page.js';
import Sidebar from '../../src/components/Sidebar.js';
import MainContent from '../../src/components/MainContent.js';

// Home Page
class HomePage extends Page {
    constructor() {
        super({
            page_name: 'Home',
            route: '/',
            title: 'MOJO Navigation - Home'
        });
    }

    async getTemplate() {
        return `
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h1 class="display-4">
                                    <i class="bi bi-house text-primary me-3"></i>
                                    Welcome Home
                                </h1>
                                <p class="lead">This is the home page of our MOJO sidebar navigation example.</p>
                                <hr>
                                <p>Use the sidebar navigation to explore different pages:</p>
                                <div class="row g-3">
                                    <div class="col-md-6 col-lg-4">
                                        <div class="card h-100">
                                            <div class="card-body text-center">
                                                <i class="bi bi-info-circle display-6 text-info"></i>
                                                <h5 class="mt-2">About Page</h5>
                                                <p class="small text-muted">Learn about this application</p>
                                                <a href="/about" class="btn btn-sm btn-outline-info">
                                                    Visit About
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6 col-lg-4">
                                        <div class="card h-100">
                                            <div class="card-body text-center">
                                                <i class="bi bi-envelope display-6 text-success"></i>
                                                <h5 class="mt-2">Contact Page</h5>
                                                <p class="small text-muted">Get in touch with us</p>
                                                <a href="/contact" class="btn btn-sm btn-outline-success">
                                                    Visit Contact
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6 col-lg-4">
                                        <div class="card h-100">
                                            <div class="card-body text-center">
                                                <i class="bi bi-people display-6 text-warning"></i>
                                                <h5 class="mt-2">Users Page</h5>
                                                <p class="small text-muted">Browse user profiles</p>
                                                <a href="/users" class="btn btn-sm btn-outline-warning">
                                                    Visit Users
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <hr>
                                <h5>Navigation Examples</h5>
                                <p>This page demonstrates both href and data-page navigation:</p>
                                
                                <div class="row g-2">
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-body p-3">
                                                <h6>Standard href Navigation</h6>
                                                <p class="small text-muted">Clean URLs, copy link support, SEO friendly</p>
                                                <a href="/about" class="btn btn-sm btn-primary me-2">About</a>
                                                <a href="/contact" class="btn btn-sm btn-success">Contact</a>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-body p-3">
                                                <h6>data-page Navigation</h6>
                                                <p class="small text-muted">Page name routing with parameters</p>
                                                <button data-page="settings" class="btn btn-sm btn-outline-secondary me-2">Settings</button>
                                                <button data-page="users" data-params='{"highlight": "new"}' class="btn btn-sm btn-outline-warning">Users*</button>
                                                <small class="d-block mt-1 text-muted">*With parameters</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// About Page
class AboutPage extends Page {
    constructor() {
        super({
            page_name: 'About',
            route: '/about',
            title: 'MOJO Navigation - About'
        });
    }

    async getTemplate() {
        return `
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h1 class="display-4">
                                    <i class="bi bi-info-circle text-info me-3"></i>
                                    About This App
                                </h1>
                                <p class="lead">A demonstration of MOJO framework sidebar navigation with components.</p>
                                <hr>
                                <div class="row">
                                    <div class="col-lg-8">
                                        <h3>Features Demonstrated</h3>
                                        <ul class="list-group list-group-flush">
                                            <li class="list-group-item">
                                                <i class="bi bi-check-circle text-success me-2"></i>
                                                Sidebar and MainContent components
                                            </li>
                                            <li class="list-group-item">
                                                <i class="bi bi-check-circle text-success me-2"></i>
                                                Client-side routing with history API
                                            </li>
                                            <li class="list-group-item">
                                                <i class="bi bi-check-circle text-success me-2"></i>
                                                Responsive collapsible sidebar
                                            </li>
                                            <li class="list-group-item">
                                                <i class="bi bi-check-circle text-success me-2"></i>
                                                Bootstrap 5 integration
                                            </li>
                                            <li class="list-group-item">
                                                <i class="bi bi-check-circle text-success me-2"></i>
                                                Clean component architecture
                                            </li>
                                        </ul>
                                        
                                        <div class="mt-4">
                                            <a href="/" class="btn btn-primary me-2">
                                                <i class="bi bi-house me-1"></i>
                                                Back to Home
                                            </a>
                                            <a href="/contact" class="btn btn-outline-secondary">
                                                <i class="bi bi-envelope me-1"></i>
                                                Contact Us
                                            </a>
                                        </div>
                                    </div>
                                    <div class="col-lg-4">
                                        <div class="card bg-light">
                                            <div class="card-body">
                                                <h5>Framework Info</h5>
                                                <p class="small text-muted mb-2">Built with MOJO framework components</p>
                                                <div class="mb-2">
                                                    <small class="text-muted">Current Route:</small><br>
                                                    <code>{{route}}</code>
                                                </div>
                                                <div>
                                                    <small class="text-muted">Page Name:</small><br>
                                                    <code>{{page_name}}</code>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Contact Page
class ContactPage extends Page {
    constructor() {
        super({
            page_name: 'Contact',
            route: '/contact',
            title: 'MOJO Navigation - Contact'
        });
    }

    async getTemplate() {
        return `
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h1 class="display-4">
                                    <i class="bi bi-envelope text-success me-3"></i>
                                    Contact Us
                                </h1>
                                <p class="lead">Get in touch with our team.</p>
                                <hr>
                                
                                <div class="row">
                                    <div class="col-lg-6">
                                        <form>
                                            <div class="mb-3">
                                                <label for="name" class="form-label">Name</label>
                                                <input type="text" class="form-control form-control-sm" id="name" placeholder="Your name">
                                            </div>
                                            <div class="mb-3">
                                                <label for="email" class="form-label">Email</label>
                                                <input type="email" class="form-control form-control-sm" id="email" placeholder="your@email.com">
                                            </div>
                                            <div class="mb-3">
                                                <label for="message" class="form-label">Message</label>
                                                <textarea class="form-control form-control-sm" id="message" rows="4" placeholder="Your message here..."></textarea>
                                            </div>
                                            <button type="button" class="btn btn-success" data-action="send-message">
                                                <i class="bi bi-send me-1"></i>
                                                Send Message
                                            </button>
                                        </form>
                                    </div>
                                    <div class="col-lg-6">
                                        <h5>Other Ways to Reach Us</h5>
                                        <div class="list-group list-group-flush">
                                            <div class="list-group-item d-flex align-items-center">
                                                <i class="bi bi-envelope-fill text-primary me-3"></i>
                                                <div>
                                                    <div class="fw-bold">Email</div>
                                                    <small class="text-muted">hello@example.com</small>
                                                </div>
                                            </div>
                                            <div class="list-group-item d-flex align-items-center">
                                                <i class="bi bi-telephone-fill text-success me-3"></i>
                                                <div>
                                                    <div class="fw-bold">Phone</div>
                                                    <small class="text-muted">+1 (555) 123-4567</small>
                                                </div>
                                            </div>
                                            <div class="list-group-item d-flex align-items-center">
                                                <i class="bi bi-geo-alt-fill text-warning me-3"></i>
                                                <div>
                                                    <div class="fw-bold">Address</div>
                                                    <small class="text-muted">123 Example St, City, ST 12345</small>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="mt-4">
                                            <a href="/" class="btn btn-outline-primary me-2">
                                                <i class="bi bi-house me-1"></i>
                                                Home
                                            </a>
                                            <a href="/about" class="btn btn-outline-secondary">
                                                <i class="bi bi-info-circle me-1"></i>
                                                About
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async on_action_send_message() {
        this.showSuccess('Message sent successfully! (This is just a demo)');
    }
}

// Users Page with parameter support
class UsersPage extends Page {
    constructor() {
        super({
            page_name: 'Users',
            route: '/users/:id?',
            title: 'MOJO Navigation - Users'
        });
    }

    async getTemplate() {
        const users = [
            { id: 1, name: 'Alice Johnson', role: 'Admin', email: 'alice@example.com' },
            { id: 2, name: 'Bob Smith', role: 'User', email: 'bob@example.com' },
            { id: 3, name: 'Carol Davis', role: 'Editor', email: 'carol@example.com' },
            { id: 4, name: 'David Wilson', role: 'User', email: 'david@example.com' }
        ];

        return `
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h1 class="display-4">
                                    <i class="bi bi-people text-warning me-3"></i>
                                    Users Directory
                                </h1>
                                <p class="lead">Browse our user directory.</p>
                                {{#params.id}}
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle me-2"></i>
                                    Viewing user ID: <strong>{{params.id}}</strong>
                                </div>
                                {{/params.id}}
                                {{#params.highlight}}
                                <div class="alert alert-success">
                                    <i class="bi bi-star me-2"></i>
                                    Highlighting: <strong>{{params.highlight}}</strong> users
                                </div>
                                {{/params.highlight}}
                                <hr>
                                
                                <div class="table-responsive">
                                    <table class="table table-sm table-hover table-bordered">
                                        <thead class="table-light">
                                            <tr>
                                                <th>#</th>
                                                <th>Name</th>
                                                <th>Role</th>
                                                <th>Email</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${users.map(user => `
                                                <tr ${this.params.id == user.id ? 'class="table-warning"' : ''}>
                                                    <td>${user.id}</td>
                                                    <td>${user.name}</td>
                                                    <td>
                                                        <span class="badge ${user.role === 'Admin' ? 'bg-danger' : user.role === 'Editor' ? 'bg-warning' : 'bg-secondary'}">
                                                            ${user.role}
                                                        </span>
                                                    </td>
                                                    <td>${user.email}</td>
                                                    <td>
                                                        <a href="/users/${user.id}" class="btn btn-sm btn-outline-primary me-1">
                                                            <i class="bi bi-eye"></i>
                                                        </a>
                                                        <button class="btn btn-sm btn-outline-secondary" 
                                                                data-action="edit-user" data-user-id="${user.id}">
                                                            <i class="bi bi-pencil"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>

                                <div class="mt-4">
                                    <a href="/" class="btn btn-primary me-2">
                                        <i class="bi bi-house me-1"></i>
                                        Home
                                    </a>
                                    {{#params.id}}
                                    <a href="/users" class="btn btn-outline-secondary">
                                        <i class="bi bi-arrow-left me-1"></i>
                                        All Users
                                    </a>
                                    {{/params.id}}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async on_action_edit_user(event, element) {
        const userId = element.dataset.userId;
        this.showSuccess(`Edit user ${userId} (This is just a demo)`);
    }
}

// Settings Page
class SettingsPage extends Page {
    constructor() {
        super({
            page_name: 'Settings',
            route: '/settings',
            title: 'MOJO Navigation - Settings'
        });
    }

    async getTemplate() {
        return `
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h1 class="display-4">
                                    <i class="bi bi-gear text-secondary me-3"></i>
                                    Application Settings
                                </h1>
                                <p class="lead">Configure your application preferences.</p>
                                <hr>
                                
                                <div class="row">
                                    <div class="col-lg-6">
                                        <h5>General Settings</h5>
                                        <form>
                                            <div class="mb-3">
                                                <label for="theme" class="form-label">Theme</label>
                                                <select class="form-select form-select-sm" id="theme">
                                                    <option value="light" selected>Light</option>
                                                    <option value="dark">Dark</option>
                                                    <option value="auto">Auto</option>
                                                </select>
                                            </div>
                                            <div class="mb-3">
                                                <label for="language" class="form-label">Language</label>
                                                <select class="form-select form-select-sm" id="language">
                                                    <option value="en" selected>English</option>
                                                    <option value="es">Spanish</option>
                                                    <option value="fr">French</option>
                                                </select>
                                            </div>
                                            <div class="mb-3 form-check">
                                                <input type="checkbox" class="form-check-input" id="notifications" checked>
                                                <label class="form-check-label" for="notifications">
                                                    Enable notifications
                                                </label>
                                            </div>
                                            <button type="button" class="btn btn-success" data-action="save-settings">
                                                <i class="bi bi-check-lg me-1"></i>
                                                Save Settings
                                            </button>
                                        </form>
                                    </div>
                                    <div class="col-lg-6">
                                        <h5>Navigation Settings</h5>
                                        <div class="list-group list-group-flush">
                                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                                <span>Sidebar Collapsed</span>
                                                <button class="btn btn-sm btn-outline-secondary" data-action="toggle-sidebar">
                                                    <i class="bi bi-layout-sidebar"></i>
                                                </button>
                                            </div>
                                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                                <span>Show Icons</span>
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" type="checkbox" id="showIcons" checked>
                                                </div>
                                            </div>
                                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                                <span>Compact Mode</span>
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" type="checkbox" id="compactMode">
                                                </div>
                                            </div>
                                        </div>

                                        <div class="mt-4">
                                            <a href="/" class="btn btn-outline-primary me-2">
                                                <i class="bi bi-house me-1"></i>
                                                Home
                                            </a>
                                            <a href="/users" class="btn btn-outline-secondary">
                                                <i class="bi bi-people me-1"></i>
                                                Users
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async on_action_save_settings() {
        this.showSuccess('Settings saved successfully! (This is just a demo)');
    }

    async on_action_toggle_sidebar(event, element) {
        // Get reference to app instance to toggle sidebar
        if (window.sidebarApp && window.sidebarApp.sidebar) {
            window.sidebarApp.sidebar.collapse();
            window.sidebarApp.mainContent.expand();
        }
        this.showSuccess('Sidebar toggled!');
    }
}

// 404 Page
class NotFoundPage extends Page {
    constructor() {
        super({
            page_name: 'NotFound',
            route: '*',
            title: 'MOJO Navigation - Page Not Found'
        });
    }

    async getTemplate() {
        return `
            <div class="container">
                <div class="row">
                    <div class="col-12 text-center">
                        <div class="card">
                            <div class="card-body py-5">
                                <i class="bi bi-exclamation-triangle display-1 text-warning"></i>
                                <h1 class="display-4 mt-3">404 - Page Not Found</h1>
                                <p class="lead">The page you're looking for doesn't exist.</p>
                                <hr class="my-4">
                                <a href="/" class="btn btn-primary btn-lg">
                                    <i class="bi bi-house me-2"></i>
                                    Go Home
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Navigation handler class
class NavigationApp {
    constructor() {
        this.router = null;
        this.pages = [];
        this.sidebar = null;
        this.mainContent = null;
    }

    async initialize() {
        console.log('Initializing MOJO Sidebar Navigation Example...');

        // Create navigation components
        this.sidebar = new Sidebar({
            data: {
                brandText: 'MOJO Sidebar',
                brandSubtext: 'Navigation Example',
                navItems: [
                    { route: '/', text: 'Home', icon: 'bi bi-house', active: false },
                    { route: '/about', text: 'About', icon: 'bi bi-info-circle', active: false },
                    { route: '/contact', text: 'Contact', icon: 'bi bi-envelope', active: false },
                    { route: '/users', text: 'Users', icon: 'bi bi-people', active: false },
                    { route: '/settings', text: 'Settings', icon: 'bi bi-gear', active: false }
                ],
                layoutMode: 'push', // 'overlay' or 'push' - push moves content, overlay doesn't
                footerContent: `
                    <a href="../" data-external class="btn btn-sm btn-outline-light w-100">
                        <i class="bi bi-arrow-left me-1"></i>
                        Back to Examples
                    </a>
                `
            }
        });

        this.mainContent = new MainContent({
            data: {
                topBarContent: 'MOJO Framework Sidebar Example'
            }
        });

        // Render navigation components
        await this.sidebar.render('#sidebar-container');
        await this.mainContent.render('#main-container');

        // Update the app container to be inside main content
        const contentArea = this.mainContent.element.querySelector('[data-id="content"]');
        const appContainer = document.getElementById('app');
        if (contentArea && appContainer) {
            contentArea.appendChild(appContainer);
        }

        // Create router instance
        this.router = new Router({
            mode: 'param', // Use param mode for static serving
            base: '/examples/basic-nav-sidebar',
            container: '#app'
        });

        // Create page instances
        this.pages = [
            new HomePage(),
            new AboutPage(), 
            new ContactPage(),
            new UsersPage(),
            new SettingsPage(),
            new NotFoundPage()
        ];

        // Register routes
        this.pages.forEach(page => {
            this.router.addRoute(page.route, page);
            console.log(`Registered route: ${page.route} -> ${page.page_name}`);
        });

        // Set up global navigation handler
        this.setupNavigationHandlers();

        // Store global reference for settings page
        window.sidebarApp = this;

        // Make router globally accessible for navigation support
        window.MOJO = window.MOJO || {};
        window.MOJO.router = this.router;

        // Add after navigation callback to update active states
        this.router.addGuard('afterEach', (route) => {
            this.updateActiveNavLinks(route.path);
        });

        // Start router
        this.router.start();

        // Set initial active state after router starts
        setTimeout(() => {
            let initialPath;
            if (this.router.currentRoute) {
                initialPath = this.router.currentRoute.path;
            } else {
                const fullPath = window.location.pathname;
                initialPath = fullPath.replace('/examples/basic-nav-sidebar', '') || '/';
            }
            this.updateActiveNavLinks(initialPath);
        }, 100);

        console.log('Sidebar navigation app initialized successfully!');
    }

    setupNavigationHandlers() {
        // Handle sidebar toggle actions
        document.addEventListener('click', async (event) => {
            const element = event.target.closest('[data-action]');
            if (!element) return;

            const action = element.dataset.action;

            if (action === 'toggle-sidebar') {
                event.preventDefault();
                this.sidebar.toggle();
            } else if (action === 'collapse-sidebar') {
                event.preventDefault();
                this.sidebar.collapse();
                this.mainContent.expand();
            }
        });

        // Close sidebar on mobile when clicking outside
        document.addEventListener('click', (event) => {
            if (window.innerWidth <= 768 && 
                this.sidebar.element &&
                !this.sidebar.element.contains(event.target) &&
                !event.target.closest('[data-action="toggle-sidebar"]')) {
                this.sidebar.element.classList.remove('show');
            }
        });
    }

    updateActiveNavLinks(currentRoute) {
        if (this.sidebar) {
            this.sidebar.updateActiveItem(currentRoute);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new NavigationApp();
    await app.initialize();
});