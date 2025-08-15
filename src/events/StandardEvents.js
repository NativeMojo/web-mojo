/**
 * StandardEvents - Comprehensive reference for MOJO Framework events
 * 
 * This file documents all standard events emitted by the MOJO framework,
 * their expected payload structures, and usage examples.
 * 
 * Event Types:
 * - Local Events: Emitted by individual instances (Models, Views, etc.)
 * - Global Events: Emitted via the global EventBus (app.events)
 * 
 * Usage:
 * import { EVENTS } from './events/StandardEvents.js';
 * app.events.on(EVENTS.ROUTE_CHANGE, (data) => { ... });
 */

// ============================================================================
// EVENT NAME CONSTANTS (prevents typos)
// ============================================================================

export const EVENTS = {
  // Router Events
  ROUTER_STARTED: 'router:started',
  ROUTER_STOPPED: 'router:stopped',
  ROUTE_BEFORE: 'route:before',
  ROUTE_CHANGE: 'route:change',
  ROUTE_AFTER: 'route:after',
  ROUTE_NOT_FOUND: 'route:notfound',
  ROUTE_ERROR: 'route:error',

  // Page Events
  PAGE_SHOW: 'page:show',
  PAGE_HIDE: 'page:hide',

  // Application Events
  APP_READY: 'app:ready',
  APP_SHUTDOWN: 'app:shutdown',

  // Notification Events
  NOTIFICATION: 'notification',

  // Loading Events
  LOADING_SHOW: 'loading:show',
  LOADING_HIDE: 'loading:hide',

  // State Events
  STATE_CHANGED: 'state:changed',

  // Common Local Events (for Models, Views, etc.)
  CHANGE: 'change',
  RENDER: 'render',
  MOUNT: 'mount',
  UNMOUNT: 'unmount',
  DESTROY: 'destroy'
};

// ============================================================================
// GLOBAL EVENTS DOCUMENTATION
// ============================================================================

/**
 * Global events are emitted via the global EventBus (app.events)
 * These events can be subscribed to by any part of the application
 */
export const GLOBAL_EVENTS = {

  // ----------------------------------------
  // Router Events
  // ----------------------------------------
  
  [EVENTS.ROUTER_STARTED]: {
    description: 'Emitted when the router starts up',
    payload: {
      mode: 'string' // Router mode: 'history', 'hash', or 'param'
    },
    example: `
app.events.on('${EVENTS.ROUTER_STARTED}', (data) => {
  console.log('Router started in', data.mode, 'mode');
});`
  },

  [EVENTS.ROUTER_STOPPED]: {
    description: 'Emitted when the router is stopped/cleaned up',
    payload: 'undefined',
    example: `
app.events.on('${EVENTS.ROUTER_STOPPED}', () => {
  console.log('Router stopped');
});`
  },

  [EVENTS.ROUTE_BEFORE]: {
    description: 'Emitted before route navigation begins',
    payload: {
      path: 'string',      // The path being navigated to
      match: 'object',     // Route match object with pageName, params, query, pattern
      page: 'object'       // Page instance that will be shown
    },
    example: `
app.events.on('${EVENTS.ROUTE_BEFORE}', (data) => {
  // Can be used for loading states, authentication checks, etc.
  console.log('Navigating to:', data.path);
});`
  },

  [EVENTS.ROUTE_CHANGE]: {
    description: 'Emitted after successful route change',
    payload: {
      path: 'string',      // The new path
      match: 'object',     // Route match details
      page: 'object',      // New page instance
      params: 'object',    // Route parameters
      query: 'object'      // Query parameters
    },
    example: `
app.events.on('${EVENTS.ROUTE_CHANGE}', (data) => {
  // Perfect for analytics, breadcrumbs, etc.
  analytics.trackPageView(data.path, data.page.pageName);
});`
  },

  [EVENTS.ROUTE_AFTER]: {
    description: 'Emitted after all route navigation logic completes',
    payload: {
      path: 'string',
      match: 'object',
      page: 'object'
    },
    example: `
app.events.on('${EVENTS.ROUTE_AFTER}', (data) => {
  // Clean up loading states, etc.
  hideGlobalLoader();
});`
  },

  [EVENTS.ROUTE_NOT_FOUND]: {
    description: 'Emitted when route is not found (404)',
    payload: {
      path: 'string'       // The path that was not found
    },
    example: `
app.events.on('${EVENTS.ROUTE_NOT_FOUND}', (data) => {
  analytics.trackError('404', data.path);
});`
  },

  [EVENTS.ROUTE_ERROR]: {
    description: 'Emitted when routing errors occur',
    payload: {
      message: 'string'    // Error message
    },
    example: `
app.events.on('${EVENTS.ROUTE_ERROR}', (data) => {
  console.error('Routing error:', data.message);
});`
  },

  // ----------------------------------------
  // Page Events
  // ----------------------------------------

  [EVENTS.PAGE_SHOW]: {
    description: 'Emitted when a page is displayed',
    payload: {
      page: 'object',      // Page instance
      params: 'object',    // Route parameters
      query: 'object'      // Query parameters
    },
    example: `
app.events.on('${EVENTS.PAGE_SHOW}', (data) => {
  // Update page title, meta tags, etc.
  document.title = data.page.pageOptions?.title || 'App';
});`
  },

  [EVENTS.PAGE_HIDE]: {
    description: 'Emitted when a page is hidden',
    payload: {
      page: 'object'       // Page instance being hidden
    },
    example: `
app.events.on('${EVENTS.PAGE_HIDE}', (data) => {
  // Save page state, stop timers, etc.
  savePageState(data.page);
});`
  },

  // ----------------------------------------
  // Application Events
  // ----------------------------------------

  [EVENTS.APP_READY]: {
    description: 'Emitted when the application has fully started',
    payload: {
      app: 'object'        // WebApp instance
    },
    example: `
app.events.on('${EVENTS.APP_READY}', (data) => {
  // Initialize services, show welcome message, etc.
  initializeServices(data.app);
});`
  },

  [EVENTS.APP_SHUTDOWN]: {
    description: 'Emitted when the application is shutting down',
    payload: 'undefined',
    example: `
app.events.on('${EVENTS.APP_SHUTDOWN}', () => {
  // Cleanup resources, save state, etc.
  cleanup();
});`
  },

  // ----------------------------------------
  // Notification Events
  // ----------------------------------------

  [EVENTS.NOTIFICATION]: {
    description: 'Emitted for all user notifications (error, success, info, warning)',
    payload: {
      message: 'string',   // Notification message
      type: 'string',      // 'error', 'success', 'info', 'warning'
      duration: 'number'   // Display duration in milliseconds
    },
    example: `
app.events.on('${EVENTS.NOTIFICATION}', (data) => {
  // Show toast, modal, or other notification UI
  showToast(data.message, data.type, data.duration);
});`
  },

  // ----------------------------------------
  // Loading Events
  // ----------------------------------------

  [EVENTS.LOADING_SHOW]: {
    description: 'Emitted when loading indicator should be shown',
    payload: {
      message: 'string'    // Loading message
    },
    example: `
app.events.on('${EVENTS.LOADING_SHOW}', (data) => {
  showLoadingSpinner(data.message);
});`
  },

  [EVENTS.LOADING_HIDE]: {
    description: 'Emitted when loading indicator should be hidden',
    payload: 'undefined',
    example: `
app.events.on('${EVENTS.LOADING_HIDE}', () => {
  hideLoadingSpinner();
});`
  },

  // ----------------------------------------
  // State Events
  // ----------------------------------------

  [EVENTS.STATE_CHANGED]: {
    description: 'Emitted when application state changes',
    payload: {
      // Single property change:
      key: 'string',       // Property name
      value: 'any',        // New value
      oldValue: 'any',     // Previous value
      // OR bulk change:
      // (entire state object when multiple properties change)
    },
    example: `
app.events.on('${EVENTS.STATE_CHANGED}', (data) => {
  // React to state changes
  if (data.key === 'currentPage') {
    updateBreadcrumbs(data.value);
  }
});`
  }
};

// ============================================================================
// LOCAL EVENTS DOCUMENTATION
// ============================================================================

/**
 * Local events are emitted by individual instances (Models, Views, Pages)
 * These events are subscribed to directly on the instance
 */
export const LOCAL_EVENTS = {

  [EVENTS.CHANGE]: {
    description: 'Emitted when a model\'s data changes',
    scope: 'Model instances',
    payload: 'this (the model instance)',
    example: `
const user = new User({ name: 'John' });
user.on('${EVENTS.CHANGE}', (model) => {
  // React to model changes
  view.render();
});
user.set('name', 'Jane'); // Triggers change event`
  },

  [EVENTS.RENDER]: {
    description: 'Emitted when a view/page renders',
    scope: 'View and Page instances',
    payload: 'this (the view/page instance)',
    example: `
const view = new MyView();
view.on('${EVENTS.RENDER}', (view) => {
  // Post-render logic
  initializeWidgets(view.element);
});`
  },

  [EVENTS.MOUNT]: {
    description: 'Emitted when a view/page is mounted to DOM',
    scope: 'View and Page instances',
    payload: 'this (the view/page instance)',
    example: `
const page = new HomePage();
page.on('${EVENTS.MOUNT}', (page) => {
  // Start timers, bind events, etc.
  startPageTimers();
});`
  },

  [EVENTS.UNMOUNT]: {
    description: 'Emitted when a view/page is unmounted from DOM',
    scope: 'View and Page instances',
    payload: 'this (the view/page instance)',
    example: `
page.on('${EVENTS.UNMOUNT}', (page) => {
  // Stop timers, unbind events, etc.
  stopPageTimers();
});`
  },

  [EVENTS.DESTROY]: {
    description: 'Emitted when a view/page is destroyed',
    scope: 'View and Page instances',
    payload: 'this (the view/page instance)',
    example: `
page.on('${EVENTS.DESTROY}', (page) => {
  // Final cleanup
  releaseResources();
});`
  }
};

// ============================================================================
// USAGE PATTERNS & BEST PRACTICES
// ============================================================================

export const USAGE_PATTERNS = {
  
  ANALYTICS: {
    description: 'Track user behavior and application usage',
    example: `
// Analytics service subscribing to global events
class AnalyticsService {
  constructor(eventBus) {
    eventBus.on(EVENTS.ROUTE_CHANGE, (data) => {
      this.trackPageView(data.path, data.page.pageName);
    });
    
    eventBus.on(EVENTS.ROUTE_NOT_FOUND, (data) => {
      this.trackError('404', data.path);
    });
  }
}`
  },

  NOTIFICATIONS: {
    description: 'Centralized notification handling',
    example: `
// Notification UI subscribing to global events
class NotificationUI {
  constructor(eventBus) {
    eventBus.on(EVENTS.NOTIFICATION, (data) => {
      this.showToast(data.message, data.type, data.duration);
    });
  }
}`
  },

  LOGGING: {
    description: 'Application-wide logging and debugging',
    example: `
// Logger subscribing to all events
class Logger {
  constructor(eventBus) {
    eventBus.on('*', (data, eventName) => {
      this.log(eventName, data);
    });
  }
}`
  },

  DEBUGGING: {
    description: 'Debug mode for development',
    example: `
// Enable debug mode to see all events
if (app.debug) {
  app.events.debug(true); // Logs all events to console
}`
  }
};

export default {
  EVENTS,
  GLOBAL_EVENTS,
  LOCAL_EVENTS,
  USAGE_PATTERNS
};