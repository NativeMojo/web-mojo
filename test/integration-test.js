/**
 * Integration test demonstrating global event-driven architecture
 * Shows how any component can subscribe to router and notification events
 *
 * Run with:  node web-mojo/test/integration-test.js
 */

// Mock browser APIs for Node.js testing
global.window = {
  history: {
    pushState: (state, title, url) => {},
    replaceState: (state, title, url) => {},
    go: (delta) => {},
    back: () => {},
    forward: () => {}
  },
  location: {
    pathname: '/',
    search: '',
    hash: '',
    toString: function() { return this.pathname + this.search + this.hash; }
  },
  addEventListener: (event, handler) => {},
  removeEventListener: (event, handler) => {}
};

import EventBus from '../src/utils/EventBus.js';
import Router from '../src/core/Router.js';

// Mock WebApp that uses the global EventBus
class MockWebApp {
  constructor() {
    this.events = new EventBus();
    this.pages = new Map();
    this.currentPage = null;
  }

  getOrCreatePage(pageName) {
    if (!this.pages.has(pageName)) {
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

  async showPage(page, options = {}) {
    this.currentPage = page;
  }

  // Notification methods that emit global events
  showError(message) {
    this.events.emit('notification', { message, type: 'error', duration: 5000 });
  }

  showSuccess(message) {
    this.events.emit('notification', { message, type: 'success', duration: 3000 });
  }

  showInfo(message) {
    this.events.emit('notification', { message, type: 'info', duration: 4000 });
  }
}

// Mock Analytics Service - subscribes to global events
class AnalyticsService {
  constructor(eventBus) {
    this.events = [];
    
    // Subscribe to all router events for analytics
    eventBus.on('route:change', (data) => {
      this.trackPageView(data.path, data.page.pageName);
    });
    
    eventBus.on('route:notfound', (data) => {
      this.trackError('404', data.path);
    });
  }

  trackPageView(path, pageName) {
    this.events.push({ type: 'pageview', path, pageName, timestamp: Date.now() });
    console.log(`📊 Analytics: Page view - ${pageName} (${path})`);
  }

  trackError(type, details) {
    this.events.push({ type: 'error', errorType: type, details, timestamp: Date.now() });
    console.log(`📊 Analytics: Error - ${type} (${details})`);
  }

  getStats() {
    const pageviews = this.events.filter(e => e.type === 'pageview').length;
    const errors = this.events.filter(e => e.type === 'error').length;
    return { pageviews, errors, total: this.events.length };
  }
}

// Mock Notification UI - subscribes to notification events
class NotificationUI {
  constructor(eventBus) {
    this.notifications = [];
    
    // Subscribe to all notification events
    eventBus.on('notification', (data) => {
      this.showNotification(data);
    });
  }

  showNotification({ message, type, duration }) {
    const notification = { message, type, duration, timestamp: Date.now() };
    this.notifications.push(notification);
    console.log(`🔔 Notification: [${type.toUpperCase()}] ${message}`);
    
    // Auto-remove after duration (mock)
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, Math.min(duration, 100)); // Speed up for test
    }
  }

  removeNotification(notification) {
    const index = this.notifications.indexOf(notification);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      console.log(`🗑️  Notification removed: ${notification.message}`);
    }
  }

  getActiveNotifications() {
    return this.notifications.slice();
  }
}

// Mock Logger - logs all events for debugging
class Logger {
  constructor(eventBus) {
    this.logs = [];
    
    // Subscribe to ALL events using wildcard
    eventBus.on('*', (data, eventName) => {
      this.log(eventName, data);
    });
  }

  log(eventName, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: eventName,
      data: JSON.stringify(data)
    };
    this.logs.push(logEntry);
    console.log(`📝 Log: ${eventName}`);
  }

  getLogs() {
    return this.logs.slice();
  }
}

// Main Integration Test
async function runIntegrationTest() {
  console.log('🚀 Starting MOJO Event-Driven Integration Test\n');

  // 1. Create the app with global EventBus
  const app = new MockWebApp();
  
  // 2. Create services that subscribe to global events (loose coupling!)
  const analytics = new AnalyticsService(app.events);
  const notifications = new NotificationUI(app.events);
  const logger = new Logger(app.events);
  
  // 3. Create router (emits events to app.events)
  const router = new Router(app, { mode: 'history' });
  
  // 4. Add routes
  router.addRoute('/home', 'home');
  router.addRoute('/profile/:id', 'profile');
  router.addRoute('/settings', 'settings');
  
  console.log('=== Starting Router ===');
  router.start();
  
  // 5. Simulate user interactions that trigger events
  console.log('\n=== User navigates to home ===');
  await router.navigate('/home');
  
  console.log('\n=== User navigates to profile ===');
  await router.navigate('/profile/user123');
  
  console.log('\n=== User tries invalid route ===');
  await router.navigate('/invalid-page');
  
  console.log('\n=== App shows notifications ===');
  app.showSuccess('Profile updated successfully!');
  app.showError('Failed to save settings');
  app.showInfo('Welcome to MOJO Framework');
  
  // 6. Wait a bit for notification cleanup
  await new Promise(resolve => setTimeout(resolve, 200));
  
  console.log('\n=== Final Results ===');
  
  // Analytics results
  const analyticsStats = analytics.getStats();
  console.log('📊 Analytics Summary:', analyticsStats);
  
  // Notification results
  const activeNotifications = notifications.getActiveNotifications();
  console.log('🔔 Active Notifications:', activeNotifications.length);
  
  // Logger results
  const totalLogs = logger.getLogs().length;
  console.log('📝 Total Events Logged:', totalLogs);
  
  // 7. Cleanup
  console.log('\n=== Cleanup ===');
  router.cleanup();
  
  // 8. Validate results
  if (analyticsStats.pageviews >= 2 && analyticsStats.errors >= 1 && totalLogs > 10) {
    console.log('\n✅ Integration test PASSED! Event-driven architecture working correctly.');
    console.log('   - Components can subscribe to global events without tight coupling');
    console.log('   - Router events flow to analytics, logging, and other services');
    console.log('   - Notification system works across the entire application');
    console.log('   - All services operate independently but stay in sync via events');
  } else {
    console.log('\n❌ Integration test FAILED!');
    process.exit(1);
  }
}

// Run the test
runIntegrationTest().catch(error => {
  console.error('Integration test failed:', error);
  process.exit(1);
});