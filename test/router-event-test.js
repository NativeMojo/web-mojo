/**
 * Router event system test for MOJO framework (Node.js)
 *
 * Run with:  node web-mojo/test/router-event-test.js
 */

// Mock browser APIs for Node.js testing
global.window = {
  history: {
    pushState: (state, title, url) => console.log(`History pushState: ${url}`),
    replaceState: (state, title, url) => console.log(`History replaceState: ${url}`),
    go: (delta) => console.log(`History go: ${delta}`),
    back: () => console.log('History back'),
    forward: () => console.log('History forward')
  },
  location: {
    pathname: '/',
    search: '',
    hash: '',
    toString: function() { return this.pathname + this.search + this.hash; }
  },
  addEventListener: (event, handler) => console.log(`Added ${event} listener`),
  removeEventListener: (event, handler) => console.log(`Removed ${event} listener`)
};

import Router from '../src/core/Router.js';
import EventBus from '../src/utils/EventBus.js';

// Mock WebApp for testing
class MockWebApp {
  constructor() {
    this.events = new EventBus();
    this.pages = new Map();
  }

  getOrCreatePage(pageName) {
    if (!this.pages.has(pageName)) {
      // Create a mock page
      const mockPage = {
        pageName,
        route: `/${pageName}`,
        onEnter: async () => {},
        onExit: async () => {},
        onParams: async () => {}
      };
      this.pages.set(pageName, mockPage);
    }
    return this.pages.get(pageName);
  }

  showError(message) {
    this.events.emit('notification', { message, type: 'error' });
  }

  async showPage(page, options = {}) {
    // Mock implementation - just track the current page
    this.currentPage = page;
    console.log(`Mock: Showing page ${page.pageName}`);
  }
}

// Create test app and router
const app = new MockWebApp();
const router = new Router(app, { mode: 'history' });

// Event tracking
const events = [];
const trackEvent = (eventName) => {
  app.events.on(eventName, (data) => {
    events.push({ event: eventName, data });
    console.log(`✓ Event: ${eventName}`, data);
  });
};

// Track all router events
trackEvent('router:started');
trackEvent('router:stopped');
trackEvent('route:before');
trackEvent('route:change');
trackEvent('route:after');
trackEvent('route:notfound');
trackEvent('route:error');
trackEvent('page:show');
trackEvent('page:hide');

// Test 1: Router startup
console.log('\n=== Test 1: Router Startup ===');
router.start();

// Add some test routes
router.addRoute('/home', 'home');
router.addRoute('/user/:id', 'user');
router.addRoute('/about', 'about');

// Test 2: Successful navigation
console.log('\n=== Test 2: Successful Navigation ===');
await router.navigate('/home');

// Test 3: Navigation with params
console.log('\n=== Test 3: Navigation with Params ===');
await router.navigate('/user/123');

// Test 4: 404 - Route not found
console.log('\n=== Test 4: Route Not Found ===');
await router.navigate('/nonexistent');

// Test 5: Router cleanup
console.log('\n=== Test 5: Router Cleanup ===');
router.cleanup();

// Validate results
console.log('\n=== Event Summary ===');
const eventCounts = {};
events.forEach(e => {
  eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
});

console.log('Events fired:', eventCounts);

// Basic assertions
const requiredEvents = ['router:started', 'route:change', 'route:notfound', 'router:stopped'];
const missingEvents = requiredEvents.filter(event => !eventCounts[event]);

if (missingEvents.length > 0) {
  console.error('❌ Missing events:', missingEvents);
  process.exit(1);
}

if (eventCounts['route:change'] < 2) {
  console.error('❌ Expected at least 2 route:change events');
  process.exit(1);
}

console.log('\n🎉 All router event tests passed!');

// Expected output should show:
// - router:started event
// - Multiple route:change events for successful navigations
// - page:show events for pages
// - route:notfound event for invalid route
// - router:stopped event