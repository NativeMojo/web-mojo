/**
 * MOJO Basic Navigation Example
 * Demonstrates routing, pages, and navigation
 */

// Import MOJO framework modules
import Router from '../../src/core/Router.js';
import Page from '../../src/core/Page.js';
import TopNav from '../../src/components/TopNav.js';

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
                                <p class="lead">This is the home page of our MOJO navigation example.</p>
                                <hr>
                                <p>Use the navigation above to explore different pages:</p>
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
                                <p class="lead">A demonstration of MOJO framework routing capabilities.</p>
                                <hr>
                                <div class="row">
                                    <div class="col-lg-8">
                                        <h3>Features Demonstrated</h3>
                                        <ul class="list-group list-group-flush">
                                            <li class="list-group-item">
                                                <i class="bi bi-check-circle text-success me-2"></i>
                                                Client-side routing with history API
                                            </li>
                                            <li class="list-group-item">
                                                <i class="bi bi-check-circle text-success me-2"></i>
                                                Page-based navigation
                                            </li>
                                            <li class="list-group-item">
                                                <i class="bi bi-check-circle text-success me-2"></i>
                                                Bootstrap 5 integration
                                            </li>
                                            <li class="list-group-item">
                                                <i class="bi bi-check-circle text-success me-2"></i>
                                                Responsive design
                                            </li>
                                            <li class="list-group-item">
                                                <i class="bi bi-check-circle text-success me-2"></i>
                                                Clean, minimal code structure
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
                                                <p class="small text-muted mb-2">Built with MOJO framework</p>
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
// Users List Page  
class UsersListPage extends Page {
    constructor() {
        super({
            page_name: 'Users',
            route: '/users',
            title: 'MOJO Navigation - Users',
            data: {
                users: [
                    { id: 1, name: 'Alice Johnson', role: 'Admin', email: 'alice@example.com', isAdmin: true, isEditor: false, isUser: false },
                    { id: 2, name: 'Bob Smith', role: 'User', email: 'bob@example.com', isAdmin: false, isEditor: false, isUser: true },
                    { id: 3, name: 'Carol Davis', role: 'Editor', email: 'carol@example.com', isAdmin: false, isEditor: true, isUser: false },
                    { id: 4, name: 'David Wilson', role: 'User', email: 'david@example.com', isAdmin: false, isEditor: false, isUser: true }
                ]
            }
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
                                    <i class="bi bi-people text-warning me-3"></i>
                                    Users Directory
                                </h1>
                                <p class="lead">Browse our user directory.</p>
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
                                            {{#users}}
                                            <tr>
                                                <td>{{id}}</td>
                                                <td>{{name}}</td>
                                                <td>
                                                    {{#isAdmin}}<span class="badge bg-danger">{{role}}</span>{{/isAdmin}}
                                                    {{#isEditor}}<span class="badge bg-warning">{{role}}</span>{{/isEditor}}
                                                    {{#isUser}}<span class="badge bg-secondary">{{role}}</span>{{/isUser}}
                                                </td>
                                                <td>{{email}}</td>
                                                <td>
                                                    <a href="/users/{{id}}" class="btn btn-sm btn-outline-primary me-1">
                                                        <i class="bi bi-eye"></i>
                                                    </a>
                                                    <button class="btn btn-sm btn-outline-secondary" 
                                                            data-action="edit-user" data-user-id="{{id}}">
                                                        <i class="bi bi-pencil"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                            {{/users}}
                                        </tbody>
                                    </table>
                                </div>

                                <div class="mt-4">
                                    <a href="/" class="btn btn-primary me-2">
                                        <i class="bi bi-house me-1"></i>
                                        Home
                                    </a>
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
        console.log('Edit user:', userId);
        alert(`Edit user ${userId} - This would open an edit dialog`);
    }
}

// User Detail Page
class UserDetailPage extends Page {
    constructor() {
        super({
            page_name: 'UserDetail',
            route: '/users/:id',
            title: 'MOJO Navigation - User Detail',
            data: {
                users: [
                    { id: 1, name: 'Alice Johnson', role: 'Admin', email: 'alice@example.com', isAdmin: true, isEditor: false, isUser: false },
                    { id: 2, name: 'Bob Smith', role: 'User', email: 'bob@example.com', isAdmin: false, isEditor: false, isUser: true },
                    { id: 3, name: 'Carol Davis', role: 'Editor', email: 'carol@example.com', isAdmin: false, isEditor: true, isUser: false },
                    { id: 4, name: 'David Wilson', role: 'User', email: 'david@example.com', isAdmin: false, isEditor: false, isUser: true }
                ],
                selectedUser: null,
                hasSelectedUser: false
            }
        });
    }

    on_params(params = {}) {
        const userId = params.id ? parseInt(params.id) : null;
        const user = this.data.users.find(u => u.id === userId);
        
        // Update data with selected user information
        this.updateData({
            selectedUser: user,
            hasSelectedUser: !!user,
            users: this.data.users.map(u => ({
                ...u,
                isSelected: u.id === userId
            }))
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
                                    <i class="bi bi-person text-primary me-3"></i>
                                    User Details
                                </h1>
                                
                                {{#hasSelectedUser}}
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle me-2"></i>
                                    Viewing user: <strong>{{selectedUser.name}}</strong>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-body">
                                                <h5 class="card-title">{{selectedUser.name}}</h5>
                                                <p class="card-text">
                                                    <strong>ID:</strong> {{selectedUser.id}}<br>
                                                    <strong>Email:</strong> {{selectedUser.email}}<br>
                                                    <strong>Role:</strong> 
                                                    {{#selectedUser.isAdmin}}<span class="badge bg-danger">{{selectedUser.role}}</span>{{/selectedUser.isAdmin}}
                                                    {{#selectedUser.isEditor}}<span class="badge bg-warning">{{selectedUser.role}}</span>{{/selectedUser.isEditor}}
                                                    {{#selectedUser.isUser}}<span class="badge bg-secondary">{{selectedUser.role}}</span>{{/selectedUser.isUser}}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {{/hasSelectedUser}}
                                
                                {{^hasSelectedUser}}
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle me-2"></i>
                                    User not found.
                                </div>
                                {{/hasSelectedUser}}

                                <hr>
                                
                                <h6>All Users</h6>
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
                                            {{#users}}
                                            <tr{{#isSelected}} class="table-warning"{{/isSelected}}>
                                                <td>{{id}}</td>
                                                <td>{{name}}</td>
                                                <td>
                                                    {{#isAdmin}}<span class="badge bg-danger">{{role}}</span>{{/isAdmin}}
                                                    {{#isEditor}}<span class="badge bg-warning">{{role}}</span>{{/isEditor}}
                                                    {{#isUser}}<span class="badge bg-secondary">{{role}}</span>{{/isUser}}
                                                </td>
                                                <td>{{email}}</td>
                                                <td>
                                                    <a href="/users/{{id}}" class="btn btn-sm btn-outline-primary me-1">
                                                        <i class="bi bi-eye"></i>
                                                    </a>
                                                    <button class="btn btn-sm btn-outline-secondary" 
                                                            data-action="edit-user" data-user-id="{{id}}">
                                                        <i class="bi bi-pencil"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                            {{/users}}
                                        </tbody>
                                    </table>
                                </div>

                                <div class="mt-4">
                                    <a href="/" class="btn btn-primary me-2">
                                        <i class="bi bi-house me-1"></i>
                                        Home
                                    </a>
                                    <a href="/users" class="btn btn-outline-secondary">
                                        <i class="bi bi-list me-1"></i>
                                        All Users
                                    </a>
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
        console.log('Edit user:', userId);
        alert(`Edit user ${userId} - This would open an edit dialog`);
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
        this.topNav = null;
    }

    async initialize() {
        console.log('Initializing MOJO Navigation Example...');

        console.log('🔍 Creating TopNav component...');
        // Create top navigation component
        this.topNav = new TopNav({
            data: {
                brandText: 'MOJO Nav',
                brandIcon: 'bi bi-play-circle',
                navbarId: 'mainNavbar',
                navItems: [
                    { route: '/', text: 'Home', icon: 'bi bi-house', active: false },
                    { route: '/about', text: 'About', icon: 'bi bi-info-circle', active: false },
                    { route: '/contact', text: 'Contact', icon: 'bi bi-envelope', active: false },
                    { route: '/users', text: 'Users', icon: 'bi bi-people', active: false }
                ],
                rightItems: {
                    items: [
                        { 
                            href: '../', 
                            text: 'Back to Examples', 
                            icon: 'bi bi-arrow-left',
                            isButton: false,
                            external: true
                        }
                    ]
                }
            }
        });

        console.log('✅ TopNav component created:', this.topNav);
        console.log('🔍 TopNav data:', this.topNav.data);
        console.log('🔍 Nav items count:', this.topNav.data.navItems?.length);
        
        // Debug template data in detail
        console.log('🔍 TopNav template data verification:');
        console.log('  - brandText:', this.topNav.data.brandText);
        console.log('  - brandIcon:', this.topNav.data.brandIcon);
        console.log('  - navbarId:', this.topNav.data.navbarId);
        console.log('  - navItems:', this.topNav.data.navItems);
        console.log('  - rightItems:', this.topNav.data.rightItems);
        
        // Detailed navItems debugging
        console.log('🔍 Detailed navItems analysis:');
        if (this.topNav.data.navItems && Array.isArray(this.topNav.data.navItems)) {
            console.log('  - Array length:', this.topNav.data.navItems.length);
            this.topNav.data.navItems.forEach((item, index) => {
                console.log(`  - Item ${index}:`, {
                    route: item.route,
                    text: item.text,
                    icon: item.icon,
                    active: item.active,
                    hasRoute: !!item.route,
                    hasText: !!item.text
                });
            });
        } else {
            console.log('  - navItems is not a valid array!');
        }
        
        // Check if template contains the expected content
        console.log('🔍 TopNav template preview:');
        const templatePreview = this.topNav.template?.substring(0, 300);
        console.log('  Template start:', templatePreview);

        console.log('🔍 Rendering TopNav to body...');
        // Render navigation component at top of page
        await this.topNav.render('body', 'prepend');
        console.log('✅ TopNav render completed');
        
        // Ensure TopNav has proper positioning and expansion
        if (this.topNav.element) {
            console.log('🔍 TopNav element exists, configuring...');
            console.log('🔍 TopNav element HTML:', this.topNav.element.outerHTML.substring(0, 200) + '...');
            
            this.topNav.element.style.position = 'sticky';
            this.topNav.element.style.top = '0';
            this.topNav.element.style.zIndex = '1000';
            
            // Force navbar to be expanded (not collapsed)
            const navbarCollapse = this.topNav.element.querySelector('.navbar-collapse');
            const navbarToggler = this.topNav.element.querySelector('.navbar-toggler');
            const navItems = this.topNav.element.querySelectorAll('.nav-item');
            const navLinks = this.topNav.element.querySelectorAll('.nav-link');
            
            console.log('🔍 Navbar elements found:', {
                collapse: !!navbarCollapse,
                toggler: !!navbarToggler,
                navItems: navItems.length,
                navLinks: navLinks.length
            });
            
            if (navbarCollapse) {
                navbarCollapse.classList.add('show');
                console.log('✅ Forced navbar to expand');
            }
            
            // Hide the toggler button on desktop
            if (navbarToggler) {
                navbarToggler.style.display = 'none';
                console.log('✅ Hid navbar toggler button');
            }
            
            // Insert at very top of body
            const body = document.body;
            if (body.firstChild !== this.topNav.element) {
                body.insertBefore(this.topNav.element, body.firstChild);
                console.log('✅ Moved TopNav to top of body');
            }
            
            // Debug navbar structure
            console.log('🔍 Final navbar structure check:');
            console.log('  - Nav items in DOM:', navItems.length);
            console.log('  - Nav links in DOM:', navLinks.length);
            console.log('  - Navbar collapse classes:', navbarCollapse?.className);
            console.log('  - Toggler display:', navbarToggler?.style.display);
        } else {
            console.error('❌ TopNav element not found after render!');
        }

        // Create router instance
        this.router = new Router({
            mode: 'param', // Use param mode for static serving
            base: '/examples/basic-nav',
            container: '#app'
        });

        // Debug current URL and router setup
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 Current pathname:', window.location.pathname);
        console.log('🔍 Router base:', this.router.options.base);

        // Create page instances
        this.pages = [
            new HomePage(),
            new AboutPage(), 
            new ContactPage(),
            new UsersListPage(),
            new UserDetailPage(),
            new NotFoundPage()
        ];

        // Register routes
        this.pages.forEach(page => {
            this.router.addRoute(page.route, page);
            console.log(`✅ Registered route: ${page.route} -> ${page.page_name}`);
        });

        // Debug registered routes
        console.log('🔍 All registered routes:', Array.from(this.router.routes.keys()));

        // Make router globally accessible for navigation support
        window.MOJO = window.MOJO || {};
        window.MOJO.router = this.router;

        // Setup navigation handlers after TopNav is rendered
        this.setupNavigationHandlers();

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
                initialPath = fullPath.replace('/examples/basic-nav', '') || '/';
            }
            
            this.updateActiveNavLinks(initialPath);
        }, 100);

        console.log('Navigation app initialized successfully!');
    }



    setupNavigationHandlers() {
        // Navigation is now handled automatically by View class
        // The TopNav component will automatically intercept navigation via the built-in system
        console.log('Navigation handlers setup complete - using automatic View navigation');
    }

    updateActiveNavLinks(currentRoute) {
        if (this.topNav) {
            this.topNav.updateActiveItem(currentRoute);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new NavigationApp();
    await app.initialize();
});