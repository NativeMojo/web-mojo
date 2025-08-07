/**
 * MOJO Framework - Basic Example
 * Demonstrates core View and Page functionality
 */

import MOJO, { View, Page } from '../../src/mojo.js';

// Basic View Example
class WelcomeView extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="welcome-view card p-4">
                    <h3>{{title}}</h3>
                    <p>{{message}}</p>
                    <button class="btn btn-primary" data-action="sayHello">Say Hello</button>
                    <button class="btn btn-secondary ms-2" data-action="updateMessage">Update Message</button>
                </div>
            `,
            data: {
                title: 'Welcome to MOJO!',
                message: 'This is a basic view example.'
            },
            className: 'welcome-view-container',
            ...options
        });
    }

    async onActionSayHello() {
        this.showSuccess('Hello from WelcomeView! 👋');
        this.emit('hello-clicked', { from: 'WelcomeView' });
    }

    async onActionUpdateMessage() {
        const messages = [
            'Views are the building blocks of MOJO!',
            'Templates use Mustache.js syntax.',
            'Event handling is simple and powerful.',
            'MOJO makes web development fun!'
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        this.updateData({ message: randomMessage });
    }
}

// Basic Page Example
class HomePage extends Page {
    constructor(options = {}) {
        super({
            page_name: 'home',
            route: '/',
            template: `
                <div class="home-page">
                    <div class="container">
                        <h1>MOJO Framework - Basic Example</h1>
                        <p class="lead">This example demonstrates basic View and Page functionality.</p>
                        
                        <div class="row">
                            <div class="col-md-8">
                                <div id="welcome-view-container"></div>
                            </div>
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-header">
                                        <h5>Navigation</h5>
                                    </div>
                                    <div class="card-body">
                                        <button class="btn btn-outline-primary d-block w-100 mb-2" data-action="goToAbout">
                                            Go to About Page
                                        </button>
                                        <button class="btn btn-outline-info d-block w-100" data-action="showInfo">
                                            Show Page Info
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            ...options
        });

        this.welcomeView = null;
    }

    // Design doc lifecycle methods
    on_init() {
        console.log('HomePage: Initializing...');
    }

    on_params(params, query) {
        console.log('HomePage: Route params:', params, 'Query:', query);
    }

    async onAfterRender() {
        // Create and add the welcome view after the page is rendered
        this.welcomeView = new WelcomeView();
        
        // Listen for events from the welcome view
        this.welcomeView.on('hello-clicked', (data) => {
            console.log('Received hello event from view:', data);
        });

        // Render the welcome view inside our page
        await this.welcomeView.render('#welcome-view-container');
    }

    // Design doc action handlers
    async on_action_goToAbout() {
        console.log('🏠 HomePage: Navigating to About page...');
        this.navigate('/about');
    }

    async on_action_showInfo() {
        const info = {
            pageName: this.page_name,
            route: this.route,
            hasChildren: this.getChildren().length > 0,
            viewCount: this.getChildren().length
        };
        
        alert(`Page Info:\n${JSON.stringify(info, null, 2)}`);
    }

    async onBeforeDestroy() {
        // Clean up the welcome view
        if (this.welcomeView) {
            await this.welcomeView.destroy();
        }
    }
}

// About Page Example
class AboutPage extends Page {
    constructor(options = {}) {
        console.log('📄 AboutPage: Constructor called with options:', options);
        super({
            page_name: 'about',
            route: '/about',
            template: `
                <div class="about-page">
                    <div class="container">
                        <h1>About MOJO Framework</h1>
                        <p class="lead">Learn about the framework architecture and features.</p>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header">
                                        <h5>Framework Info</h5>
                                    </div>
                                    <div class="card-body">
                                        <p><strong>Version:</strong> {{version}}</p>
                                        <p><strong>Phase:</strong> {{phase}}</p>
                                        <p><strong>Features:</strong></p>
                                        <ul>
                                            <li>Hierarchical View System</li>
                                            <li>Page-based Routing</li>
                                            <li>Event-driven Architecture</li>
                                            <li>Template Engine (Mustache.js)</li>
                                            <li>Lifecycle Management</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header">
                                        <h5>Actions</h5>
                                    </div>
                                    <div class="card-body">
                                        <button class="btn btn-primary d-block w-100 mb-2" data-action="goHome">
                                            Go to Home Page
                                        </button>
                                        <button class="btn btn-info d-block w-100 mb-2" data-action="testEvent">
                                            Test Global Event
                                        </button>
                                        <button class="btn btn-success d-block w-100" data-action="showStats">
                                            Show Framework Stats
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            data: {
                version: '2.0.0',
                phase: 'Phase 1 - Core Architecture'
            },
            ...options
        });
    }

    on_init() {
        console.log('📄 AboutPage: on_init called - page fully initialized');
    }

    async on_action_goHome() {
        this.navigate('/');
    }

    async on_action_testEvent() {
        console.log('🧪 AboutPage: testEvent action called');
        
        // Check if event bus exists
        if (!window.MOJO || !window.MOJO.eventBus) {
            console.error('❌ Event bus not available');
            this.showError('Event bus not available');
            return;
        }
        
        console.log('📡 Emitting test event...');
        
        // Test global event bus
        window.MOJO.eventBus.emit('test-event', {
            message: 'Hello from About page!',
            timestamp: new Date().toISOString()
        });
        
        console.log('✅ Test event emitted');
        this.showInfo('Global event emitted! Check console for details.');
    }

    async on_action_showStats() {
        if (window.MOJODevTools) {
            const stats = window.MOJODevTools.stats();
            const statsText = `Framework Statistics:
Version: ${stats.version}
Views: ${stats.registeredViews}
Pages: ${stats.registeredPages}
Events: ${stats.eventBus?.totalEvents || 0}`;
            
            alert(statsText);
            console.log('Full stats:', stats);
        } else {
            this.showWarning('Dev tools not available');
        }
    }
}

// Main Application Class
class BasicApp {
    constructor() {
        this.mojo = null;
        this.currentPage = null;
    }

    async init() {
        console.log('🚀 Starting MOJO Basic Example...');

        // Create MOJO instance
        this.mojo = MOJO.create({
            container: '#app',
            debug: true,
            autoStart: true
        });

        // Set up global event listeners
        this.setupEventListeners();

        // Register and setup pages
        this.registerPages();

        // Start with home page
        await this.showPage('home');

        console.log('✅ Basic Example initialized');
    }

    setupEventListeners() {
        // Listen for test events
        window.MOJO.eventBus.on('test-event', (data) => {
            console.log('🔔 Received global test event:', data);
        });

        // Listen for navigation events
        window.addEventListener('popstate', () => {
            this.handleRouteChange();
        });
    }

    registerPages() {
        this.mojo.registerPage('home', HomePage);
        this.mojo.registerPage('about', AboutPage);
    }

    async showPage(pageName) {
        try {
            // Destroy current page if exists
            if (this.currentPage) {
                await this.currentPage.destroy();
            }

            // Create and render new page
            this.currentPage = this.mojo.createPage(pageName);
            await this.currentPage.render('#app');

            // Update browser history
            const route = this.currentPage.route;
            if (window.location.pathname !== route) {
                history.pushState({ page: pageName }, '', route);
            }

            console.log(`📄 Switched to page: ${pageName}`);

        } catch (error) {
            console.error('Error showing page:', error);
        }
    }

    handleRouteChange() {
        const path = window.location.pathname;
        
        if (path === '/') {
            this.showPage('home');
        } else if (path === '/about') {
            this.showPage('about');
        } else {
            console.warn('Unknown route:', path);
            this.showPage('home'); // Default fallback
        }
    }
}

// Initialize the application
async function initBasicExample() {
    try {
        const app = new BasicApp();
        await app.init();

        // Make app available globally for debugging
        window.BasicApp = app;

    } catch (error) {
        console.error('Failed to initialize Basic Example:', error);
        
        // Show error in UI
        document.getElementById('app').innerHTML = `
            <div class="container mt-5">
                <div class="alert alert-danger">
                    <h4>Initialization Error</h4>
                    <p>Failed to start the Basic Example application.</p>
                    <p><strong>Error:</strong> ${error.message}</p>
                </div>
            </div>
        `;
    }
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBasicExample);
} else {
    initBasicExample();
}

export { BasicApp, WelcomeView, HomePage, AboutPage };