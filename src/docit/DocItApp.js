/**
 * DocItApp - Documentation portal application
 * Supports both single-book and multi-book modes with automatic configuration
 */

import WebApp from '../app/WebApp.js';
import TopNav from '../views/navigation/TopNav.js';
import DocNavSidebar from './views/DocNavSidebar.js';
import DocHomePage from './pages/DocHomePage.js';
import DocPage from './pages/DocPage.js';
import DocEditPage from './pages/DocEditPage.js';
import { DocitBook, DocitBookList } from './models/Book.js';
import { DocitPage, DocitPageList } from './models/Page.js';
import TokenManager from '../auth/TokenManager.js';
import { User } from '../models/User.js';
import ToastService from '../services/ToastService.js';

class DocItApp extends WebApp {
    constructor(config = {}) {
        // Set defaults for documentation app
        const defaults = {
            name: config.title || 'DocIt Portal',
            version: config.version || '1.0.0',
            debug: config.debug || false,
            container: config.container || '#app',
            defaultRoute: 'home',
            basePath: config.basePath || '',
            ...config
        };

        super(defaults);

        // DocIt specific configuration
        this.bookSlug = config.bookSlug || null; // If set, locks to single book
        this.showBookNav = config.showBookNav !== undefined ? config.showBookNav : !this.bookSlug;
        this.theme = config.theme || 'light';
        this.editPermissions = config.permissions?.edit || ['manage_docit'];

        // Sidebar configuration
        this.sidebarConfig = {
            showSearch: true,
            defaultCollapsed: false,
            ...config.sidebar
        };

        // Collections for managing data
        this.books = new DocitBookList();
        this.books.params.sort = "-order_priority";
        this.docPages = new DocitPageList();
        this.docPages.params.sort = "-order_priority";

        this.toast = new ToastService();

        // Current state
        this.currentBook = null;

        // Components
        this.sidebar = null;
        this.isDocItReady = false;

        // Authentication
        this.tokenManager = new TokenManager();
        this.activeUser = null;
    }

    /**
     * Start the DocIt application
     */
    async start() {
        try {
            console.log('Starting DocIt Portal...');

            // Setup container and basic layout
            this.setupDocItLayout();

            // Initialize TopNav
            await this.setupTopNav();

            // Initialize sidebar
            await this.setupSidebar();

            // Check authentication status first
            await this.checkAuthStatus();

            // Register pages
            this.registerDocItPages();

            // Start the web app (router, events, etc)
            await super.start();

            // Load initial data
            await this.loadInitialData();

            // Mark as ready
            this.isDocItReady = true;
            this.events.emit('docit:ready', { app: this });

            console.log('✅ DocIt Portal ready');
        } catch (error) {
            console.error('Failed to start DocIt:', error);
            this.showError('Failed to initialize documentation portal');
            throw error;
        }
    }

    /**
     * Setup DocIt specific layout
     */
    setupDocItLayout() {
        const container = typeof this.container === 'string'
            ? document.querySelector(this.container)
            : this.container;

        if (!container) {
            throw new Error(`Container not found: ${this.container}`);
        }

        // Apply theme
        container.classList.add('docit-app', `docit-theme-${this.theme}`);

        // Create layout structure
        container.innerHTML = `
            <div class="docit-app-layout">
                <div id="topnav-container"></div>
                <div class="docit-body-layout">
                    <div class="docit-sidebar" id="docit-sidebar"></div>
                    <div class="docit-main">
                        <div class="docit-content" id="page-container"></div>
                    </div>
                </div>
            </div>
        `;

        this.pageContainer = '#page-container';
    }

    async setupTopNav() {
        this.topnav = new TopNav({
            containerId: 'topnav-container',
            brand: this.name,
            theme: 'navbar navbar-expand-lg bg-dark navbar-dark',
            showSidebarToggle: false,
            displayMode: "brand",
            rightItems: [
                {
                    id: "login",
                    icon: 'bi-box-arrow-in-right',
                    href: '/examples/auth/',
                    label: 'Login'
                },
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
        });
        await this.topnav.render();
    }

    onActionToggleSidebar() {
        const layout = document.querySelector('.docit-layout');
        layout.classList.toggle('sidebar-collapsed');
    }

    /**
     * Setup sidebar navigation
     */
    async setupSidebar() {
        this.sidebar = new DocNavSidebar({
            containerId: 'docit-sidebar',
            app: this,
            singleBookMode: !!this.bookSlug,
            showBookNav: this.showBookNav,
            books: this.books,
            docPages: this.docPages,
            activeUser: this.activeUser,
            ...this.sidebarConfig
        });

        await this.sidebar.render();
    }

    /**
     * Register DocIt pages
     */
    registerDocItPages() {
        this.registerPage('home', DocHomePage, {
            route: '/',
            permissions: null
        });

        this.registerPage('docs', DocPage, {
            route: '/docs',
            permissions: null // Public access
        });

        this.registerPage('edit', DocEditPage, {
            route: '/edit',
            permissions: this.editPermissions
        });
    }

    /**
     * Load initial data based on mode
     */
    async loadInitialData() {
        try {
            if (this.bookSlug) {
                // Single-book mode: Load the specified book
                const book = new DocitBook({ slug: this.bookSlug });
                await book.fetch();
                if (book.id) {
                    this.books.add(book);
                    await this.setActiveBook(book);
                } else {
                    throw new Error(`Book with slug '${this.bookSlug}' not found.`);
                }
            } else {
                // Multi-book mode: Load all books
                await this.books.fetch({ graph: 'list' });
                this.sidebar.render();
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('Failed to load documentation');
        }
    }

    /**
     * Set the active book and load its pages
     * @param {DocitBook} book - The book to set as active
     */
    async setActiveBook(book) {
        if (this.currentBook && book && this.currentBook.id === book.id) {
            return;
        }

        this.currentBook = book;
        this.docPages.reset();

        if (book) {
            await this.docPages.fetch({
                book: book.get('id'),
                graph: 'list'
            });
        }

        this.sidebar.setCurrentBook(book);
        this.sidebar.setDocPages(this.docPages);

        this.events.emit('docit:book-changed', { book });
    }

    /**
     * Save doc page content using Model
     */
    async saveDocPageContent(docPageId, content) {
        const docPage = this.docPages.get(docPageId) || new DocitPage({ id: docPageId });

        docPage.set('content', content);
        const response = await docPage.save();

        if (!response.success || !response.data.status) {
            throw new Error('Failed to save doc page');
        }

        return docPage;
    }

    /**
     * Check if user can edit
     */
    canEdit() {
        const user = this.activeUser;
        if (!user) return false;
        return this.editPermissions.some(perm => user.hasPermission ? user.hasPermission(perm) : false);
    }

    /**
     * Check authentication status and load user
     */
    async checkAuthStatus() {
        try {
            const token = this.tokenManager.getTokenInstance();

            if (!token || !token.isValid()) {
                this.events.emit('auth:unauthorized', { app: this });
                return;
            }

            if (token.isExpired()) {
                this.events.emit('auth:expired', { app: this });
                return;
            }

            this.tokenManager.startAutoRefresh(this);
            this.rest.setAuthToken(token.token);

            const user = new User({ id: token.getUserId() });
            await user.fetch();
            this.setActiveUser(user);
        } catch (error) {
            console.error('Failed to check auth status:', error);
            this.events.emit('auth:error', { error, app: this });
        }
    }

    /**
     * Set the active authenticated user
     */
    setActiveUser(user) {
        this.activeUser = user;
        if (this.sidebar) {
            this.sidebar.setUser(user);
        }
        if (this.topnav) {
            this.topnav.setUser(user);
            this.tonnav.render();
        }
        this.events.emit('user:changed', { user, app: this });
        return this;
    }

    /**
     * Clear the active user (logout)
     */
    clearActiveUser() {
        this.activeUser = null;
        this.tokenManager.clearTokens();
        this.rest.clearAuth();
        if (this.sidebar) {
            this.sidebar.setUser(null);
        }
        this.events.emit('user:cleared', { app: this });
        return this;
    }

    /**
     * Handle logout
     */
    async logout() {
        this.clearActiveUser();
        this.books.reset();
        this.docPages.reset();
        this.currentBook = null;
        this.events.emit('auth:logout', { app: this });
        window.location.reload();
    }

    async createNewBook() {
        const result = await this.showModelForm({
            title: 'Create New Book',
            model: new DocitBook(),
            fields: [
                { name: 'title', label: 'Title', required: true },
                { name: 'slug', label: 'Slug', required: true, helpText: 'A URL-friendly identifier.' }
            ]
        });

        if (result && result.success) {
            this.books.add(result.data);
            this.sidebar.render();
            this.showSuccess('Book created successfully.');
        }
    }

    async createNewPage(book) {
        if (!book) return;

        const data = await this.showForm({
            title: 'Create New Page',
            fields: [
                { name: 'title', label: 'Title', required: true },
                { name: 'slug', label: 'Slug', required: true, helpText: 'A URL-friendly identifier.' }
            ]
        });

        if (data && data.slug) {
            data.book = book.id;
        }

        const newPage = new DocitPage();
        const result = await newPage.save(data);

        if (result && result.success) {
            this.docPages.add(newPage);
            this.sidebar.render();
            // this.showSuccess('Page created successfully.');

            this.showPage('edit', {
                id: newPage.id,
                doc_book: book.get('slug'),
                doc_page: newPage.get('slug')
            }, {});
        }
    }

    /**
     * Static factory method for quick setup
     */
    static create(config = {}) {
        return new DocItApp(config);
    }

    /**
     * Quick setup for single-book mode
     */
    static createForBook(bookSlug, config = {}) {
        return new DocItApp({
            ...config,
            bookSlug,
            showBookNav: false
        });
    }
}

export default DocItApp;
