/**
 * MOJO Framework Phase 1 Example Application
 * Demonstrates View hierarchy, Page system, and event handling
 */

import MOJO, { View, Page, EventBus } from '../../src/mojo.js';

// Example Views
class HeaderView extends View {
  constructor(options = {}) {
    super({
      template: `
        <header class="mojo-header">
          <div class="container">
            <div class="row">
              <div class="col-md-8">
                <h1><i class="fas fa-rocket"></i> {{title}}</h1>
                <p class="lead">{{description}}</p>
              </div>
              <div class="col-md-4 text-end">
                <div class="btn-group">
                  <button class="btn btn-light" data-action="toggleDebug">
                    <i class="fas fa-bug"></i> Debug
                  </button>
                  <button class="btn btn-light" data-action="refresh">
                    <i class="fas fa-refresh"></i> Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
      `,
      data: {
        title: 'MOJO Framework v2.0.0',
        description: 'Phase 1: Core Architecture & View System'
      },
      ...options
    });
  }

  async onActionToggleDebug() {
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel) {
      const isVisible = debugPanel.style.display !== 'none';
      debugPanel.style.display = isVisible ? 'none' : 'block';
    }
  }

  async onActionRefresh() {
    this.showSuccess('Refreshing application...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

class NavigationView extends View {
  constructor(options = {}) {
    super({
      template: `
        <nav class="navbar navbar-expand-lg navbar-light bg-light mb-4">
          <div class="container">
            <div class="navbar-nav">
              {{#pages}}
              <a class="nav-link" href="#" data-action="navigateToPage" data-page="{{name}}">
                <i class="{{icon}}"></i> {{title}}
              </a>
              {{/pages}}
            </div>
            <div class="navbar-nav ms-auto">
              <span class="nav-text">
                <i class="fas fa-sitemap"></i> 
                Views: {{viewCount}} | Pages: {{pageCount}}
              </span>
            </div>
          </div>
        </nav>
      `,
      data: {
        pages: [
          { name: 'home', title: 'Home', icon: 'fas fa-home' },
          { name: 'demo', title: 'Demo', icon: 'fas fa-play' },
          { name: 'about', title: 'About', icon: 'fas fa-info-circle' }
        ],
        viewCount: 0,
        pageCount: 0
      },
      ...options
    });

    // Update counts periodically
    setInterval(() => {
      if (window.MOJO) {
        this.updateData({
          viewCount: window.MOJO.views.size,
          pageCount: window.MOJO.pages.size
        });
      }
    }, 2000);
  }

  async onActionNavigateToPage(event, element) {
    const pageName = element.getAttribute('data-page');
    this.emit('navigate', { page: pageName });
    this.showSuccess(`Navigating to ${pageName} page...`);
  }
}

class FooterView extends View {
  constructor(options = {}) {
    super({
      template: `
        <footer class="mojo-footer">
          <div class="container">
            <div class="row">
              <div class="col-md-6">
                <p>&copy; 2024 MOJO Framework. Phase 1 Example.</p>
              </div>
              <div class="col-md-6 text-end">
                <p>Built with ❤️ and JavaScript</p>
              </div>
            </div>
          </div>
        </footer>
      `,
      ...options
    });
  }
}

// Example Pages
class HomePage extends Page {
  constructor(options = {}) {
    super({
      pageName: 'home',
      route: '/',
      template: `
        <div class="container">
          <div class="row">
            <div class="col-md-8">
              <div class="card fade-in">
                <div class="card-header">
                  <h3><i class="fas fa-home"></i> Welcome to MOJO Framework</h3>
                </div>
                <div class="card-body">
                  <p class="lead">This is a demonstration of Phase 1 features:</p>
                  <ul class="list-group list-group-flush mb-3">
                    <li class="list-group-item">
                      <i class="fas fa-check text-success"></i> 
                      <strong>View Base Class:</strong> Hierarchical component system
                    </li>
                    <li class="list-group-item">
                      <i class="fas fa-check text-success"></i> 
                      <strong>Page System:</strong> View extension with routing capabilities
                    </li>
                    <li class="list-group-item">
                      <i class="fas fa-check text-success"></i> 
                      <strong>Component Lifecycle:</strong> Initialize, render, mount, destroy
                    </li>
                    <li class="list-group-item">
                      <i class="fas fa-check text-success"></i> 
                      <strong>Event System:</strong> Custom events and DOM action handling
                    </li>
                    <li class="list-group-item">
                      <i class="fas fa-check text-success"></i> 
                      <strong>Templating:</strong> Mustache-based template rendering
                    </li>
                  </ul>
                  
                  <div class="btn-group">
                    <button class="btn btn-primary" data-action="hello">
                      <i class="fas fa-hand-wave"></i> Say Hello
                    </button>
                    <button class="btn btn-secondary" data-action="showHierarchy">
                      <i class="fas fa-sitemap"></i> View Hierarchy
                    </button>
                    <button class="btn btn-info" data-action="testEvents">
                      <i class="fas fa-broadcast-tower"></i> Test Events
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-md-4">
              <div class="card fade-in">
                <div class="card-header">
                  <h4><i class="fas fa-chart-line"></i> Framework Status</h4>
                </div>
                <div class="card-body">
                  <div class="mb-2">
                    <strong>Version:</strong> {{version}}
                  </div>
                  <div class="mb-2">
                    <strong>Status:</strong> 
                    <span class="badge bg-success">{{status}}</span>
                  </div>
                  <div class="mb-2">
                    <strong>Views:</strong> {{viewCount}}
                  </div>
                  <div class="mb-2">
                    <strong>Pages:</strong> {{pageCount}}
                  </div>
                  <div class="mb-2">
                    <strong>Events:</strong> {{eventCount}}
                  </div>
                </div>
              </div>

              <div class="view-hierarchy">
                <strong>Current View Hierarchy:</strong>
                {{hierarchy}}
              </div>
            </div>
          </div>
        </div>
      `,
      data: {
        version: MOJO.version,
        status: 'Running',
        viewCount: 0,
        pageCount: 0,
        eventCount: 0,
        hierarchy: 'Loading...'
      },
      ...options
    });
  }

  async onAfterRender() {
    super.onAfterRender();
    
    // Update stats every few seconds (remove immediate call to prevent render loop)
    this.statsInterval = setInterval(() => {
      this.updateStats();
    }, 3000);
  }

  async onBeforeDestroy() {
    super.onBeforeDestroy();
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
  }

  updateStats() {
    if (window.MOJO && window.MOJODevTools) {
      const stats = window.MOJODevTools.stats();
      const hierarchy = window.MOJODevTools.hierarchy();
      
      // Update data without forcing re-render to prevent loops
      this.updateData({
        viewCount: stats.registeredViews || 0,
        pageCount: stats.registeredPages || 0,
        eventCount: stats.eventBus?.totalEvents || 0,
        hierarchy: hierarchy || 'No hierarchy available'
      }, false);
    }
  }

  async onActionHello() {
    super.onActionHello();
    
    // Create a temporary child view
    const helloView = new View({
      template: `
        <div class="alert alert-success alert-dismissible fade show">
          <h5><i class="fas fa-smile"></i> Hello from {{page_name}}!</h5>
          <p>This message was generated by the page's hello action handler.</p>
          <p><small>Time: {{timestamp}}</small></p>
          <button type="button" class="btn-close" data-action="dismiss"></button>
        </div>
      `,
      data: {
        pageName: this.pageName,
        timestamp: new Date().toLocaleString()
      }
    });

    // Handle dismiss action
    helloView.on('action:dismiss', () => {
      this.removeChild('hello-message');
    });

    this.addChild(helloView, 'hello-message');
  }

  async onActionShowHierarchy() {
    if (window.MOJO && window.MOJO.rootView) {
      const hierarchy = window.MOJO.rootView.getHierarchy();
      console.log('View Hierarchy:\n' + hierarchy);
      
      this.showSuccess('View hierarchy logged to console. Check developer tools.');
    }
  }

  async onActionTestEvents() {
    const eventBus = window.MOJO.eventBus;
    
    // Test custom events
    eventBus.emit('test:event', {
      message: 'This is a test event',
      timestamp: new Date(),
      source: 'HomePage'
    });

    this.showSuccess('Test event emitted! Check console for event bus activity.');
  }
}

class DemoPage extends Page {
  constructor(options = {}) {
    super({
      pageName: 'demo',
      route: '/demo',
      template: `
        <div class="container">
          <div class="card fade-in">
            <div class="card-header">
              <h3><i class="fas fa-play"></i> Interactive Demo</h3>
            </div>
            <div class="card-body">
              <p>This page demonstrates dynamic view creation and manipulation.</p>
              
              <div class="row mb-3">
                <div class="col-md-6">
                  <div class="btn-group-vertical w-100">
                    <button class="btn btn-primary" data-action="addView">
                      <i class="fas fa-plus"></i> Add Child View
                    </button>
                    <button class="btn btn-secondary" data-action="addCard">
                      <i class="fas fa-square-plus"></i> Add Card
                    </button>
                    <button class="btn btn-warning" data-action="clearAll">
                      <i class="fas fa-trash"></i> Clear All
                    </button>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="alert alert-info">
                    <h6><i class="fas fa-info-circle"></i> Instructions:</h6>
                    <ul class="mb-0">
                      <li>Click "Add Child View" to create views</li>
                      <li>Click "Add Card" to create card components</li>
                      <li>Use "Clear All" to remove everything</li>
                      <li>Each view has its own lifecycle</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div id="dynamic-content" class="border rounded p-3 bg-light">
                <p class="text-muted text-center">Dynamic content will appear here...</p>
              </div>
            </div>
          </div>
        </div>
      `,
      ...options
    });

    this.viewCounter = 0;
  }

  async onActionAddView(event, element) {
    this.viewCounter++;
    
    const newView = new View({
      template: `
        <div class="alert alert-primary alert-dismissible fade show mb-2">
          <h6><i class="fas fa-cube"></i> Dynamic View #{{viewNumber}}</h6>
          <p class="mb-1">Created at: {{timestamp}}</p>
          <p class="mb-1">ID: {{id}}</p>
          <button class="btn btn-sm btn-outline-primary" data-action="ping">
            <i class="fas fa-bell"></i> Ping
          </button>
          <button type="button" class="btn-close" data-action="remove"></button>
        </div>
      `,
      data: {
        viewNumber: this.viewCounter,
        timestamp: new Date().toLocaleString(),
        id: `view_${this.viewCounter}`
      }
    });

    // Handle view actions
    newView.on('action:ping', () => {
      newView.showSuccess(`Ping from View #${this.viewCounter}!`);
    });

    newView.on('action:remove', () => {
      this.removeChild(`dynamic-view-${this.viewCounter}`);
    });

    // Find dynamic content container and render the view there
    const container = this.element.querySelector('#dynamic-content');
    await newView.render(container);
    
    // Also add to children for hierarchy management
    this.addChild(newView, `dynamic-view-${this.viewCounter}`);

    this.showSuccess(`Added Dynamic View #${this.viewCounter}`);
  }

  async onActionAddCard() {
    this.viewCounter++;
    
    const cardView = new View({
      template: `
        <div class="card mb-2 fade-in">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0"><i class="fas fa-id-card"></i> Card #{{cardNumber}}</h6>
            <button class="btn btn-sm btn-outline-danger" data-action="removeCard">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="card-body">
            <p>This is a dynamically created card component.</p>
            <div class="row">
              <div class="col-md-6">
                <small><strong>Created:</strong> {{timestamp}}</small>
              </div>
              <div class="col-md-6">
                <small><strong>ID:</strong> {{id}}</small>
              </div>
            </div>
            <div class="mt-2">
              <button class="btn btn-sm btn-primary" data-action="animate">
                <i class="fas fa-magic"></i> Animate
              </button>
            </div>
          </div>
        </div>
      `,
      data: {
        cardNumber: this.viewCounter,
        timestamp: new Date().toLocaleString(),
        id: `card_${this.viewCounter}`
      }
    });

    cardView.on('action:removeCard', () => {
      this.removeChild(`card-${this.viewCounter}`);
    });

    cardView.on('action:animate', () => {
      if (cardView.element) {
        cardView.element.style.transform = 'scale(1.05)';
        cardView.element.style.transition = 'transform 0.3s ease';
        setTimeout(() => {
          cardView.element.style.transform = 'scale(1)';
        }, 300);
      }
    });

    const container = this.element.querySelector('#dynamic-content');
    await cardView.render(container);
    this.addChild(cardView, `card-${this.viewCounter}`);

    this.showSuccess(`Added Card #${this.viewCounter}`);
  }

  async onActionClearAll() {
    const children = this.getChildren();
    
    if (children.length === 0) {
      this.showSuccess('No child views to clear.');
      return;
    }

    // Remove all children
    for (const child of children) {
      await child.destroy();
    }

    // Clear the children collections
    this.children.clear();
    this.childOrder = [];

    // Clear the container
    const container = this.element.querySelector('#dynamic-content');
    if (container) {
      container.innerHTML = '<p class="text-muted text-center">Dynamic content will appear here...</p>';
    }

    this.viewCounter = 0;
    this.showSuccess('All child views cleared.');
  }
}

class AboutPage extends Page {
  constructor(options = {}) {
    super({
      pageName: 'about',
      route: '/about',
      template: `
        <div class="container">
          <div class="card fade-in">
            <div class="card-header">
              <h3><i class="fas fa-info-circle"></i> About MOJO Framework</h3>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-8">
                  <h4>Phase 1: Core Architecture</h4>
                  <p>This phase establishes the foundation of the MOJO framework with:</p>
                  
                  <h5>Core Features</h5>
                  <ul>
                    <li><strong>View Base Class:</strong> Hierarchical component system with parent-child relationships</li>
                    <li><strong>Page System:</strong> Specialized views with routing capabilities</li>
                    <li><strong>Lifecycle Management:</strong> Proper initialization, rendering, mounting, and destruction</li>
                    <li><strong>Event System:</strong> Custom event bus and DOM action handling</li>
                    <li><strong>Template Engine:</strong> Mustache.js integration for dynamic content</li>
                  </ul>

                  <h5>Architecture Benefits</h5>
                  <ul>
                    <li>Modular and reusable components</li>
                    <li>Predictable lifecycle management</li>
                    <li>Event-driven communication</li>
                    <li>Memory leak prevention</li>
                    <li>Developer-friendly debugging</li>
                  </ul>

                  <button class="btn btn-success" data-action="testLifecycle">
                    <i class="fas fa-play-circle"></i> Test Lifecycle
                  </button>
                </div>
                
                <div class="col-md-4">
                  <div class="card bg-light">
                    <div class="card-header">
                      <h6>Technical Details</h6>
                    </div>
                    <div class="card-body">
                      <div class="mb-2">
                        <strong>Version:</strong> {{version}}
                      </div>
                      <div class="mb-2">
                        <strong>Phase:</strong> 1 of 4
                      </div>
                      <div class="mb-2">
                        <strong>Bundle Size:</strong> ~15KB (minified)
                      </div>
                      <div class="mb-2">
                        <strong>Dependencies:</strong> Mustache.js
                      </div>
                      <div class="mb-2">
                        <strong>Browser Support:</strong> ES6+
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      data: {
        version: MOJO.version
      },
      ...options
    });
  }

  async onActionTestLifecycle() {
    // Create a test view to demonstrate lifecycle
    const testView = new View({
      template: `
        <div class="alert alert-info fade-in">
          <h5><i class="fas fa-cog"></i> Lifecycle Test</h5>
          <div class="lifecycle-log">
            {{#logs}}
            <div class="small">{{timestamp}}: {{message}}</div>
            {{/logs}}
          </div>
          <button class="btn btn-sm btn-danger mt-2" data-action="destroy">
            <i class="fas fa-skull"></i> Destroy This View
          </button>
        </div>
      `,
      data: {
        logs: []
      },
      
      // Override lifecycle methods for demonstration
      onInit() {
        this.addLog('View initialized');
      },
      
      async onBeforeRender() {
        this.addLog('Before render');
      },
      
      async onAfterRender() {
        this.addLog('After render');
      },
      
      async onBeforeMount() {
        this.addLog('Before mount');  
      },
      
      async onAfterMount() {
        this.addLog('After mount - View is live!');
      },
      
      async onBeforeDestroy() {
        this.addLog('Before destroy - Cleaning up...');
      }
    });

    // Add logging method
    testView.addLog = function(message) {
      const log = {
        timestamp: new Date().toLocaleTimeString(),
        message: message
      };
      this.data.logs.push(log);
      if (this.rendered) {
        this.render(); // Re-render to show new log
      }
    };

    // Handle destroy action
    testView.on('action:destroy', () => {
      setTimeout(() => {
        this.removeChild('lifecycle-test');
      }, 1000); // Delay to show "before destroy" log
    });

    this.addChild(testView, 'lifecycle-test');
    this.showSuccess('Lifecycle test view created! Watch the logs.');
  }
}

// Application Bootstrap
class App {
  constructor() {
    this.mojo = null;
    this.currentPage = null;
  }

  async init() {
    console.log('🚀 Complete Demo: Initializing MOJO Application...');

    // Create MOJO instance with configuration
    console.log('🚀 Complete Demo: Creating MOJO instance...');
    this.mojo = MOJO.create({
      container: '#app',
      debug: true, // Enable debug mode
      autoStart: true,
      theme: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d'
      },
      router: {
        enabled: false // Disable router for manual page management
      }
    });
    console.log('🚀 Complete Demo: MOJO instance created successfully');

    // Set up event listeners
    console.log('🚀 Complete Demo: Setting up event listeners...');
    this.setupEventListeners();
    console.log('🚀 Complete Demo: Event listeners set up');

    // Register pages
    console.log('🚀 Complete Demo: Registering pages...');
    this.registerPages();
    console.log('🚀 Complete Demo: Pages registered');

    // Create and set up the main layout
    console.log('🚀 Complete Demo: Setting up layout...');
    await this.setupLayout();
    console.log('🚀 Complete Demo: Layout setup complete');

    // Show initial page
    console.log('🚀 Complete Demo: Showing initial page...');
    this.showPage('home');
    console.log('🚀 Complete Demo: Initial page shown');

    console.log('✅ Complete Demo: MOJO Application initialized successfully');
  }

  setupEventListeners() {
    // Listen for navigation events
    this.mojo.eventBus.on('navigate', (data) => {
      this.showPage(data.page);
    });

    // Listen for test events
    this.mojo.eventBus.on('test:event', (data) => {
      console.log('📡 Test Event Received:', data);
    });

    // Listen for MOJO framework events
    this.mojo.eventBus.on('app:started', () => {
      console.log('✅ MOJO Framework started');
    });

    // Handle view lifecycle events
    this.mojo.eventBus.on('view:created', (data) => {
      console.log('🎉 View created:', data.view.id);
    });

    this.mojo.eventBus.on('view:destroyed', (data) => {
      console.log('💀 View destroyed:', data.view.id);
    });
  }

  registerPages() {
    // Register page classes
    console.log('🚀 Complete Demo: Registering HomePage...');
    this.mojo.registerPage('home', HomePage);
    console.log('🚀 Complete Demo: Registering DemoPage...');
    this.mojo.registerPage('demo', DemoPage);  
    console.log('🚀 Complete Demo: Registering AboutPage...');
    this.mojo.registerPage('about', AboutPage);
    console.log('🚀 Complete Demo: All pages registered successfully');
  }

  async setupLayout() {
    console.log('🚀 Complete Demo: Starting layout setup...');
    
    // Clear loading screen from container (but preserve root view element)
    console.log('🚀 Complete Demo: Clearing loading content...');
    const loadingElements = this.mojo.container.querySelectorAll('.loading-container, .d-flex');
    loadingElements.forEach(el => {
      if (el.innerHTML.includes('Loading') || el.innerHTML.includes('loading-spinner')) {
        el.remove();
      }
    });
    console.log('🚀 Complete Demo: Loading content cleared');
    
    // Create main layout structure directly in DOM
    console.log('🚀 Complete Demo: Creating layout structure directly...');
    const rootView = this.mojo.rootView;
    
    // Debug root view state
    console.log('🚀 Complete Demo: Root view:', rootView);
    console.log('🚀 Complete Demo: Root view element exists:', !!rootView.element);
    console.log('🚀 Complete Demo: Container exists:', !!this.mojo.container);
    
    // Ensure root view has an element and is properly mounted
    if (!rootView.element) {
      console.log('🚀 Complete Demo: Root view has no element, creating...');
      rootView.createElement();
      console.log('🚀 Complete Demo: Root element created:', rootView.element);
    }
    
    // Ensure root element is attached to DOM
    if (!document.body.contains(rootView.element)) {
      console.log('🚀 Complete Demo: Attaching root view to container...');
      this.mojo.container.appendChild(rootView.element);
      console.log('🚀 Complete Demo: Root element attached, now in DOM:', document.body.contains(rootView.element));
    }
    
    // Set template on root view so MOJO's render system uses it
    rootView.template = `
      <div class="mojo-app">
        <div id="mojo-header"></div>
        <div id="mojo-navigation"></div>
        <main id="mojo-content" class="mojo-page">
          <!-- Page content will be inserted here -->
        </main>
        <div id="mojo-footer"></div>
      </div>
    `;
    
    console.log('🚀 Complete Demo: Layout structure created directly in DOM');
    console.log('🚀 Complete Demo: Root element innerHTML:', rootView.element.innerHTML);
    console.log('🚀 Complete Demo: Root element attached to DOM:', document.body.contains(rootView.element));
    
    // Wait a moment for DOM to update
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Search for containers within the root element (not globally)
    const headerContainer = rootView.element.querySelector('#mojo-header');
    const navContainer = rootView.element.querySelector('#mojo-navigation');
    const contentContainer = rootView.element.querySelector('#mojo-content');
    const footerContainer = rootView.element.querySelector('#mojo-footer');
    
    console.log('🚀 Complete Demo: Container search results:');
    console.log('  Header container:', headerContainer);
    console.log('  Nav container:', navContainer);
    console.log('  Content container:', contentContainer);
    console.log('  Footer container:', footerContainer);
    console.log('🚀 Complete Demo: All elements in root:', rootView.element.querySelectorAll('*'));


    
    if (!headerContainer || !navContainer || !contentContainer || !footerContainer) {
      console.error('🚀 Complete Demo: Layout containers not found after rendering');
      console.error('🚀 Complete Demo: Debugging info:');
      console.error('  - Root element exists:', !!rootView.element);
      console.error('  - Root element tagName:', rootView.element?.tagName);
      console.error('  - Root element in DOM:', document.body.contains(rootView.element));
      console.error('  - Root element innerHTML length:', rootView.element?.innerHTML.length);
      console.error('  - Root element first 200 chars:', rootView.element?.innerHTML.substring(0, 200));
      console.error('  - Document.body contains mojo-app:', !!document.body.querySelector('.mojo-app'));
      console.error('  - Global search for mojo-header:', !!document.getElementById('mojo-header'));
      throw new Error('Failed to create layout structure');
    }
    
    console.log('🚀 Complete Demo: Layout structure verified - all containers present');
    
    // Create layout views
    console.log('🚀 Complete Demo: Creating header view...');
    const headerView = new HeaderView();
    console.log('🚀 Complete Demo: Creating navigation view...');
    const navigationView = new NavigationView();
    console.log('🚀 Complete Demo: Creating footer view...');
    const footerView = new FooterView();
    console.log('🚀 Complete Demo: All layout views created');

    // Render views to their specific containers
    console.log('🚀 Complete Demo: Rendering header to container...');
    await headerView.render(headerContainer);
    console.log('🚀 Complete Demo: Rendering navigation to container...');
    await navigationView.render(navContainer);
    console.log('🚀 Complete Demo: Rendering footer to container...');
    await footerView.render(footerContainer);
    
    console.log('🚀 Complete Demo: All layout views rendered to their containers');
    
    // Store references for later use
    this.headerView = headerView;
    this.navigationView = navigationView;
    this.footerView = footerView;
    this.contentContainer = contentContainer;

    // Listen for navigation events from nav
    console.log('🚀 Complete Demo: Setting up navigation event listener...');
    navigationView.on('navigate', (data) => {
      console.log('🚀 Complete Demo: Navigation event received:', data);
      this.showPage(data.page);
    });
    console.log('🚀 Complete Demo: Navigation event listener set up');
    
    // Verify entire layout is visible
    if (document.body.contains(rootView.element)) {
      console.log('🚀 Complete Demo: Layout successfully mounted and visible');
    } else {
      console.error('🚀 Complete Demo: Layout not found in DOM after setup');
    }
  }

  async showPage(pageName) {
    console.log(`🚀 Complete Demo: showPage called with: ${pageName}`);
    
    // Verify content container exists
    const contentContainer = this.contentContainer || this.mojo.rootView.element.querySelector('#mojo-content');
    if (!contentContainer) {
      console.error('🚀 Complete Demo: Content container not found');
      throw new Error('Content container not available for page rendering');
    }
    
    // Clear current page content
    console.log('🚀 Complete Demo: Clearing content container...');
    contentContainer.innerHTML = '';
    
    // Destroy current page if exists
    if (this.currentPage) {
      console.log('🚀 Complete Demo: Destroying current page...');
      await this.currentPage.destroy();
      this.currentPage = null;
      console.log('🚀 Complete Demo: Current page destroyed');
    }

    // Create and show new page
    try {
      console.log(`🚀 Complete Demo: Creating page: ${pageName}`);
      this.currentPage = this.mojo.createPage(pageName);
      console.log(`🚀 Complete Demo: Page created successfully:`, this.currentPage);
      
      // Render the page directly to content container
      console.log('🚀 Complete Demo: Rendering page to content container...');
      await this.currentPage.render(contentContainer);
      console.log('🚀 Complete Demo: Page rendered to content container');
      
      // Verify page is visible
      if (document.body.contains(this.currentPage.element)) {
        console.log(`📄 Complete Demo: Successfully switched to page: ${pageName} (visible in DOM)`);
        
        // Clear any lingering loading screens
        if (window.MOJO && window.MOJO.clearLoadingScreen) {
          window.MOJO.clearLoadingScreen();
        }
      } else {
        console.error(`🚀 Complete Demo: Page ${pageName} not visible in DOM after rendering`);
      }
      
    } catch (error) {
      console.error(`Failed to load page: ${pageName}`, error);
      
      // Show error page directly in content container
      contentContainer.innerHTML = `
        <div class="container mt-4">
          <div class="alert alert-danger">
            <h4><i class="fas fa-exclamation-triangle"></i> Page Error</h4>
            <p>The requested page "${pageName}" could not be loaded.</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">
              <i class="fas fa-refresh"></i> Reload
            </button>
          </div>
        </div>
      `;
    }
  }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

async function initApp() {
  try {
    console.log('🚀 Complete Demo: Starting initApp...');
    const app = new App();
    console.log('🚀 Complete Demo: App instance created');
    await app.init();
    console.log('🚀 Complete Demo: App initialization completed');
    
    // Final loading screen clear as fallback
    setTimeout(() => {
      if (window.MOJO && window.MOJO.clearLoadingScreen) {
        window.MOJO.clearLoadingScreen();
      }
    }, 1000);
    
    // Make app globally accessible for debugging
    window.MOJOApp = app;
    console.log('🚀 Complete Demo: App made globally available');
    
  } catch (error) {
    console.error('❌ Failed to initialize MOJO Application:', error);
    
    // Show error in the UI
    document.getElementById('app').innerHTML = `
      <div class="container mt-5">
        <div class="alert alert-danger">
          <h4><i class="fas fa-exclamation-triangle"></i> Application Error</h4>
          <p>Failed to initialize the MOJO Framework:</p>
          <pre>${error.message}</pre>
          <button class="btn btn-primary" onclick="window.location.reload()">
            <i class="fas fa-refresh"></i> Reload
          </button>
        </div>
      </div>
    `;
  }
}