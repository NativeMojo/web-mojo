// Example usage of the simplified MOJO router
// This demonstrates the new clean router architecture

import { WebApp } from '../src/app/WebApp.js';
import { Page } from '../src/core/Page.js';
import { View } from '../src/core/View.js';

// Example Page Classes
class HomePage extends Page {
  constructor(options = {}) {
    super({
      pageName: 'Home',
      template: `
        <div class="home-page">
          <h1>Welcome Home</h1>
          <p>Current route: {{currentRoute}}</p>
          <div class="nav-buttons">
            <button data-action="go-to-users">View Users</button>
            <button data-action="go-to-settings">Settings</button>
          </div>
        </div>
      `,
      ...options
    });
  }

  async getViewData() {
    return {
      currentRoute: this.app.router.getCurrentPath()
    };
  }

  async handleActionGoToUsers() {
    await this.app.navigate('/users');
  }

  async handleActionGoToSettings() {
    await this.app.navigate('/settings');
  }
}

class UsersPage extends Page {
  constructor(options = {}) {
    super({
      pageName: 'Users',
      template: `
        <div class="users-page">
          <h1>Users List</h1>
          <p>User ID: {{userId}}</p>
          <div class="user-actions">
            <button data-action="load-user" data-id="123">Load User 123</button>
            <button data-action="load-user" data-id="456">Load User 456</button>
            <button data-action="go-home">Back Home</button>
          </div>
        </div>
      `,
      ...options
    });
  }

  async onParams(params, query) {
    await super.onParams(params, query);
    this.userId = params.id || 'none';
    await this.render();
  }

  async getViewData() {
    return {
      userId: this.userId
    };
  }

  async handleActionLoadUser(event, element) {
    const userId = element.getAttribute('data-id');
    await this.app.navigate(`/users/${userId}`);
  }

  async handleActionGoHome() {
    await this.app.navigate('/');
  }
}

class SettingsPage extends Page {
  constructor(options = {}) {
    super({
      pageName: 'Settings',
      template: `
        <div class="settings-page">
          <h1>Settings</h1>
          <form>
            <div class="form-group">
              <label>Theme:</label>
              <select data-change-action="change-theme">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <button type="button" data-action="save-settings">Save</button>
            <button type="button" data-action="go-home">Cancel</button>
          </form>
        </div>
      `,
      ...options
    });
  }

  async handleActionChangeTheme(event, element) {
    console.log('Theme changed to:', element.value);
  }

  async handleActionSaveSettings() {
    this.app.showSuccess('Settings saved!');
  }

  async handleActionGoHome() {
    await this.app.navigate('/');
  }
}

// Create and configure the app
async function createApp() {
  console.log('Creating MOJO app with simplified router...');

  // Create app with history mode
  const app = new WebApp({
    container: '#app',
    routerMode: 'history', // or 'params'
    basePath: '/demo',
    title: 'Simplified Router Demo'
  });

  // Register pages with their routes
  app.registerPage('home', HomePage, { route: '/' });
  app.registerPage('users', UsersPage, { route: '/users/:id?' });
  app.registerPage('settings', SettingsPage, { route: '/settings' });

  // Listen to router events for debugging
  app.events.on('route:changed', (data) => {
    console.log('Route changed:', data);
  });

  app.events.on('route:notfound', (data) => {
    console.log('Route not found:', data.path);
  });

  app.events.on('page:show', (data) => {
    console.log('Page shown:', data.pageName);
  });

  // Start the application
  await app.start();

  console.log('App started successfully!');
  return app;
}

// Example with params mode
async function createParamsApp() {
  console.log('Creating MOJO app with params mode...');

  const app = new WebApp({
    container: '#app-params',
    routerMode: 'params', // Uses ?page=route format
    title: 'Params Mode Demo'
  });

  // Same page registration
  app.registerPage('home', HomePage, { route: '/' });
  app.registerPage('users', UsersPage, { route: '/users/:id?' });
  app.registerPage('settings', SettingsPage, { route: '/settings' });

  await app.start();
  return app;
}

// Demo navigation functions
function demonstrateNavigation(app) {
  console.log('Demonstrating navigation...');

  // Basic navigation
  setTimeout(() => app.navigate('/users'), 1000);
  setTimeout(() => app.navigate('/users/123'), 2000);
  setTimeout(() => app.navigate('/settings'), 3000);
  setTimeout(() => app.navigate('/'), 4000);

  // Browser navigation
  setTimeout(() => app.back(), 5000);
  setTimeout(() => app.forward(), 6000);
}

// Example of programmatic route listening (like Sidebar would do)
function setupRouteListener(app) {
  app.events.on('route:change', (data) => {
    console.log('📍 Route changed to:', data.path);
    console.log('   Page:', data.page.pageName);
    console.log('   Params:', data.params);
    console.log('   Query:', data.query);

    // Update navigation state (like Sidebar does)
    updateNavigationUI(data);
  });
}

function updateNavigationUI(routeData) {
  // This simulates what the Sidebar component does
  const { path, page } = routeData;
  
  // Clear all active states
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // Set active based on current route
  const navItem = document.querySelector(`[data-route="${path}"]`);
  if (navItem) {
    navItem.classList.add('active');
  }

  console.log('🎯 Updated navigation UI for route:', path);
}

// Usage examples
export async function runSimplifiedRouterDemo() {
  try {
    // Create app with history mode
    const app = await createApp();
    
    // Setup route listening
    setupRouteListener(app);
    
    // Demonstrate navigation
    demonstrateNavigation(app);

    // Return app instance for further interaction
    return app;

  } catch (error) {
    console.error('Failed to create app:', error);
    throw error;
  }
}

// Alternative params mode demo
export async function runParamsModeDemo() {
  try {
    const app = await createParamsApp();
    setupRouteListener(app);
    return app;
  } catch (error) {
    console.error('Failed to create params app:', error);
    throw error;
  }
}

// Export for use
export { createApp, createParamsApp, HomePage, UsersPage, SettingsPage };

// Auto-run demo if this file is loaded directly
if (typeof window !== 'undefined' && window.location.pathname.includes('example_simplified_router')) {
  document.addEventListener('DOMContentLoaded', () => {
    runSimplifiedRouterDemo().then(app => {
      console.log('✅ Simplified router demo loaded successfully!');
      window.demoApp = app; // Make available in console
    });
  });
}