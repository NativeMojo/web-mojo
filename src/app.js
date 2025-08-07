/**
 * MOJO Framework - Main Application (Simple Example)
 * 
 * This is a basic example to get you started with MOJO.
 * For comprehensive examples and tutorials, visit the examples/ folder.
 */

import MOJO, { View, Page } from './mojo.js';

// Simple Welcome View
class WelcomeView extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="welcome-container text-center">
                    <div class="hero-section mb-5">
                        <h1 class="display-4 text-primary mb-3">
                            <i class="fas fa-fire"></i> Welcome to MOJO!
                        </h1>
                        <p class="lead">A lightweight JavaScript framework for building data-driven web applications</p>
                        <div class="version-badge">
                            <span class="badge bg-primary fs-6">Phase 1: Core Architecture v2.0.0</span>
                        </div>
                    </div>

                    <div class="quick-start mb-5">
                        <h3>🚀 Quick Start</h3>
                        <p>You're seeing MOJO in action! This view was created with:</p>
                        <div class="code-example bg-light p-3 rounded">
                            <pre><code>class WelcomeView extends View {
  constructor() {
    super({
      template: '&lt;div&gt;{{message}}&lt;/div&gt;',
      data: { message: 'Hello MOJO!' }
    });
  }
}</code></pre>
                        </div>
                    </div>

                    <div class="examples-section mb-5">
                        <h3>📚 Interactive Examples</h3>
                        <p>Explore comprehensive examples and tutorials:</p>
                        <div class="btn-group-vertical d-grid gap-2 col-6 mx-auto">
                            <a href="./examples/index.html" class="btn btn-primary btn-lg">
                                <i class="fas fa-rocket"></i> View All Examples
                            </a>
                            <a href="./examples/basic/index.html" class="btn btn-outline-primary">
                                <i class="fas fa-play"></i> Basic Example
                            </a>
                            <a href="./examples/hierarchy/index.html" class="btn btn-outline-success">
                                <i class="fas fa-sitemap"></i> Hierarchy Example
                            </a>
                            <a href="./examples/events/index.html" class="btn btn-outline-info">
                                <i class="fas fa-broadcast-tower"></i> Events Example
                            </a>
                        </div>
                    </div>

                    <div class="features-grid">
                        <h3>✨ Phase 1 Features</h3>
                        <div class="row g-3">
                            <div class="col-md-3 col-6">
                                <div class="feature-card p-3 border rounded">
                                    <i class="fas fa-layer-group text-primary fs-2"></i>
                                    <h6 class="mt-2">Hierarchical Views</h6>
                                    <small class="text-muted">Parent-child relationships</small>
                                </div>
                            </div>
                            <div class="col-md-3 col-6">
                                <div class="feature-card p-3 border rounded">
                                    <i class="fas fa-route text-success fs-2"></i>
                                    <h6 class="mt-2">Page Routing</h6>
                                    <small class="text-muted">URL-based navigation</small>
                                </div>
                            </div>
                            <div class="col-md-3 col-6">
                                <div class="feature-card p-3 border rounded">
                                    <i class="fas fa-sync-alt text-info fs-2"></i>
                                    <h6 class="mt-2">Lifecycle Management</h6>
                                    <small class="text-muted">Predictable component flow</small>
                                </div>
                            </div>
                            <div class="col-md-3 col-6">
                                <div class="feature-card p-3 border rounded">
                                    <i class="fas fa-bolt text-warning fs-2"></i>
                                    <h6 class="mt-2">Event System</h6>
                                    <small class="text-muted">Global EventBus</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="interactive-demo mt-5">
                        <h4>Try It Out!</h4>
                        <div class="btn-group">
                            <button class="btn btn-success" data-action="sayHello">
                                <i class="fas fa-hand-wave"></i> Say Hello
                            </button>
                            <button class="btn btn-info" data-action="showStats">
                                <i class="fas fa-chart-bar"></i> Show Stats
                            </button>
                            <button class="btn btn-warning" data-action="testEvent">
                                <i class="fas fa-satellite-dish"></i> Test Event
                            </button>
                        </div>
                    </div>
                </div>
            `,
            data: {
                message: 'Welcome to MOJO Framework!'
            },
            className: 'welcome-view',
            ...options
        });
    }

    async onActionSayHello() {
        const messages = [
            'Hello from MOJO! 👋',
            'Welcome to the future of web development! 🚀',
            'MOJO makes building apps fun! 🎉',
            'Phase 1 is just the beginning! ⭐'
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        this.showSuccess(randomMessage);
        
        // Emit a global event
        window.MOJO.eventBus.emit('welcome:greeting', {
            message: randomMessage,
            timestamp: new Date().toISOString()
        });
    }

    async onActionShowStats() {
        if (window.MOJODevTools) {
            const stats = window.MOJODevTools.stats();
            const statsMessage = `MOJO Framework Statistics:
• Version: ${stats.version || 'v2.0.0'}
• Views Registered: ${stats.registeredViews || 0}
• Pages Registered: ${stats.registeredPages || 0}
• Total Events: ${stats.eventBus?.totalEvents || 0}`;

            alert(statsMessage);
            console.log('Full MOJO Stats:', stats);
        } else {
            this.showInfo('Enable debug mode to see detailed statistics!');
        }
    }

    async onActionTestEvent() {
        // Emit a test event
        const eventData = {
            type: 'test',
            message: 'This is a test event from the welcome view!',
            timestamp: new Date().toISOString(),
            source: 'WelcomeView'
        };

        window.MOJO.eventBus.emit('app:test', eventData);
        
        this.showInfo('Test event emitted! Check the console for details.');
        console.log('🔔 Test event emitted:', eventData);
    }
}

// Simple Application Class
class SimpleApp {
    constructor() {
        this.mojo = null;
        this.welcomeView = null;
    }

    async init() {
        console.log('🔥 Starting MOJO Framework...');

        try {
            // Create MOJO instance
            this.mojo = MOJO.create({
                container: '#app',
                debug: true, // Enable debug mode
                autoStart: true
            });

            // Set up global event listeners for demo
            this.setupEventListeners();

            // Create and render the welcome view
            this.welcomeView = new WelcomeView();
            await this.welcomeView.render('#app');

            console.log('✅ MOJO Framework initialized successfully!');
            console.log(`
🎯 Getting Started with MOJO:
   • This is a simple example running in your browser
   • Click the buttons above to see MOJO in action
   • Visit ./examples/ for comprehensive tutorials
   • Open DevTools to see debug information
   • Check out README-Phase1.md for full documentation
            `);

        } catch (error) {
            console.error('❌ Failed to initialize MOJO:', error);
            this.showError(error.message);
        }
    }

    setupEventListeners() {
        // Listen for welcome events
        window.MOJO.eventBus.on('welcome:greeting', (data) => {
            console.log('🎉 Received welcome greeting:', data);
        });

        // Listen for test events
        window.MOJO.eventBus.on('app:test', (data) => {
            console.log('🧪 Received test event:', data);
        });

        // Global error handling
        window.addEventListener('error', (event) => {
            console.error('Global Error:', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled Promise Rejection:', event.reason);
        });
    }

    showError(message) {
        document.getElementById('app').innerHTML = `
            <div class="container mt-5">
                <div class="alert alert-danger">
                    <h4><i class="fas fa-exclamation-triangle"></i> Initialization Error</h4>
                    <p>${message}</p>
                    <hr>
                    <p class="mb-0">
                        <small>Please check the browser console for more details.</small>
                    </p>
                </div>
            </div>
        `;
    }
}

// Initialize the application
async function initApp() {
    const app = new SimpleApp();
    await app.init();

    // Make app available globally for debugging
    window.SimpleApp = app;
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export for module usage
export { SimpleApp, WelcomeView };