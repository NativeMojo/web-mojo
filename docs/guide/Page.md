# Page - Route-Level Components

## Overview

Page extends View to provide route-level components with built-in navigation capabilities. Pages represent distinct application views that correspond to URLs and handle routing, URL parameters, navigation, and page-specific lifecycle management.

## Key Features

- **URL Routing**: Automatic URL matching and parameter extraction
- **Navigation Management**: Programmatic navigation and browser history integration
- **Parameter Handling**: Clean handling of route and query parameters
- **Page Lifecycle**: Enter/exit hooks for page transitions
- **State Preservation**: Automatic state saving/restoring during navigation
- **Metadata Management**: Page titles, descriptions, and meta tags
- **Authentication Integration**: Built-in support for auth-required pages

## Basic Usage

### 1. Simple Page

```javascript
import { Page } from 'web-mojo';

class HomePage extends Page {
  static pageName = 'home';
  static title = 'Home - My App';
  static icon = 'bi-house';
  static route = 'home';

  constructor(options = {}) {
    super({
      ...options,
      pageName: HomePage.pageName,
      route: HomePage.route,
      pageIcon: HomePage.icon,
      template: `
        <div class="home-page">
          <h1>Welcome to {{title}}</h1>
          <p>{{description}}</p>
          <nav>
            <a data-action="navigate" data-page="about">About</a>
            <a data-action="navigate" data-page="contact">Contact</a>
          </nav>
        </div>
      `
    });
  }

  async onInit() {
    // Initialize page data
    this.data = {
      title: 'My Application',
      description: 'Welcome to our amazing app!'
    };
  }
  
  async getViewData() {
    return this.data || {
      title: 'My Application',
      description: 'Welcome to our amazing app!'
    };
  }

  async handleActionNavigate(event, element) {
    const page = element.dataset.page;
    if (page && this.getApp()) {
      await this.getApp().navigate(`?page=${page}`);
    }
  }
}
```

### 2. Parameterized Page

```javascript
class UserDetailPage extends Page {
  static pageName = 'user-detail';
  static title = 'User Details';
  static icon = 'bi-person';
  static route = '/users/:id';

  constructor(options = {}) {
    super({
      ...options,
      pageName: UserDetailPage.pageName,
      route: UserDetailPage.route,
      pageIcon: UserDetailPage.icon,
      template: `
        <div class="user-detail">
          <h1>{{user.name}}</h1>
          <p>Email: {{user.email}}</p>
          <div class="actions">
            <button data-action="edit-user" class="btn btn-primary">Edit</button>
            <button data-action="delete-user" class="btn btn-danger">Delete</button>
          </div>
        </div>
      `
    });
  }

  async onEnter() {
    await super.onEnter();
    // Set page title
    document.title = UserDetailPage.title;
  }
  
  async onParams(params, query) {
    await super.onParams(params, query);
    if (params.id) {
      await this.loadUser(params.id);
    }
  }

  async loadUser(userId) {
    try {
      this.user = await User.find(userId);
      await this.render();
    } catch (error) {
      this.getApp().showError('Failed to load user');
      console.error('Load user error:', error);
    }
  }
  
  async getViewData() {
    return {
      user: this.user?.toJSON() || null
    };
  }
  
  async handleActionEditUser(event, element) {
    const userId = this.params.id;
    await this.getApp().navigate(`?page=user-edit&id=${userId}`);
  }
}
```

## API Reference

### Constructor Options

```javascript
const page = new Page({
  // Page Identity
  pageName: 'MyPage',              // Unique page identifier
  route: '/my-page/:id?',          // URL route pattern
  displayName: 'My Page',          // Human-readable name
  
  // Page Metadata
  title: 'My Page Title',          // Browser title
  description: 'Page description', // Meta description
  pageIcon: 'bi-house',            // Icon for navigation (note: bi-house not bi bi-house)
  
  // Page Options
  requiresAuth: true,              // Requires authentication
  pageOptions: {                   // Additional page configuration
    layout: 'admin',
    theme: 'dark'
  },
  
  // Template Options
  template: '<div>{{content}}</div>',  // Inline template
  // OR
  template: 'templates/my-page.mst',   // External template file
  
  // All View options are also available
  className: 'my-page',
  // ... other View options
});
```

### Properties

#### Route Information
- `pageName` - Unique page identifier
- `route` - URL route pattern with parameters
- `displayName` - Human-readable page name
- `params` - Current route parameters object
- `query` - Current query string parameters object

#### State Management
- `isActive` - Whether page is currently active
- `matched` - Whether page route was matched
- `savedState` - Preserved state from last exit

#### Metadata
- `pageIcon` - Icon identifier for UI
- `pageDescription` - Page description text
- `pageOptions` - Page-specific configuration

### Core Methods

#### Navigation

##### `navigate(route, params, options)`
Navigate to another route programmatically.

```javascript
// Basic navigation
await page.navigate('/users');

// With parameters
await page.navigate('/users/123');

// With options
await page.navigate('/dashboard', {}, {
  replace: true,    // Replace current history entry
  trigger: false    // Don't trigger route handler
});
```

#### Parameter Handling

##### `async onParams(params, query)`
Called when route parameters change.

```javascript
class MyPage extends Page {
  async onParams(params, query) {
    await super.onParams(params, query);
    
    // Handle parameter changes
    if (params.id !== this.currentUserId) {
      await this.loadUser(params.id);
      this.currentUserId = params.id;
    }
    
    // Handle query changes
    if (query.tab !== this.currentTab) {
      this.switchTab(query.tab);
      this.currentTab = query.tab;
    }
  }
}
```

#### Metadata Management

##### `setMeta(meta)`
Set page metadata (title, description, etc.).

```javascript
await page.setMeta({
  title: 'User Profile - John Doe',
  description: 'Profile page for John Doe',
  keywords: 'user, profile, john doe'
});
```

##### `getMetadata()`
Get page metadata object.

```javascript
const meta = page.getMetadata();
console.log(meta); // { name, displayName, icon, description, route, isActive }
```

### Lifecycle Hooks

#### Page-Specific Hooks

##### `async onEnter()`
Called when entering this page (before render).

```javascript
class MyPage extends Page {
  async onEnter() {
    await super.onEnter();
    
    console.log(`Entering ${this.pageName}`);
    
    // Restore saved state
    if (this.savedState) {
      this.restoreState(this.savedState);
    }
    
    // Set page title
    this.setMeta({
      title: `${this.displayName} - My App`
    });
    
    // Track page view
    analytics.track('page_view', {
      page: this.pageName,
      route: this.route
    });
  }
}
```

##### `async onExit()`
Called when leaving this page (before cleanup).

```javascript
class MyPage extends Page {
  async onExit() {
    console.log(`Exiting ${this.pageName}`);
    
    // Save current state
    this.savedState = this.captureState();
    
    // Clear sensitive data
    this.clearSensitiveData();
    
    // Cancel ongoing requests
    this.cancelRequests();
    
    await super.onExit();
  }
}
```

#### State Management Hooks

##### `captureState()` / `restoreState(state)`
Save and restore page state during navigation.

```javascript
class FormPage extends Page {
  captureState() {
    const baseState = super.captureState();
    
    return {
      ...baseState,
      formData: this.getFormData(),
      selectedTab: this.currentTab,
      scrollPosition: window.scrollY
    };
  }
  
  restoreState(state) {
    super.restoreState(state);
    
    if (state.formData) {
      this.setFormData(state.formData);
    }
    
    if (state.selectedTab) {
      this.switchTab(state.selectedTab);
    }
    
    if (state.scrollPosition) {
      window.scrollTo(0, state.scrollPosition);
    }
  }
}
```

##### `captureCustomState()` / `restoreCustomState(state)`
Override for custom state handling.

```javascript
class MyPage extends Page {
  captureCustomState() {
    return {
      currentView: this.activeViewId,
      filterSettings: this.getFilterSettings(),
      userPreferences: this.getUserPreferences()
    };
  }
  
  restoreCustomState(state) {
    if (state.currentView) {
      this.showView(state.currentView);
    }
    
    if (state.filterSettings) {
      this.applyFilters(state.filterSettings);
    }
    
    if (state.userPreferences) {
      this.applyPreferences(state.userPreferences);
    }
  }
}
```

## Route Patterns

### Basic Routes
```javascript
// Static route
route: '/about'

// Root route
route: '/'

// Nested route
route: '/admin/users'
```

### Parameterized Routes
```javascript
// Required parameter
route: '/users/:id'                    // Matches: /users/123

// Optional parameter
route: '/users/:id?'                   // Matches: /users, /users/123

// Multiple parameters
route: '/users/:id/posts/:postId'      // Matches: /users/123/posts/456

// Wildcard
route: '/files/*path'                  // Matches: /files/docs/readme.txt
```

### Query Parameters
```javascript
class SearchPage extends Page {
  async onParams(params, query) {
    // URL: /search?q=javascript&page=2&sort=date
    console.log(query); // { q: 'javascript', page: '2', sort: 'date' }
    
    await this.performSearch({
      term: query.q,
      page: parseInt(query.page) || 1,
      sort: query.sort || 'relevance'
    });
  }
}
```

## Advanced Usage

### 1. Authentication Integration

```javascript
class SecurePage extends Page {
  constructor(options = {}) {
    super({
      requiresAuth: true,
      ...options
    });
  }
  
  async onEnter() {
    // Check authentication
    const user = this.getApp().getState('currentUser');
    if (!user) {
      await this.navigate('/login', {}, { replace: true });
      return;
    }
    
    // Check permissions
    if (!this.hasPermission(user)) {
      await this.navigate('/unauthorized', {}, { replace: true });
      return;
    }
    
    await super.onEnter();
  }
  
  hasPermission(user) {
    // Implement permission logic
    return user.role === 'admin' || user.permissions.includes('access-page');
  }
}
```

### 2. Data Preloading

```javascript
class DataPage extends Page {
  async onEnter() {
    await super.onEnter();
    
    // Show loading state
    this.showLoading('Loading page data...');
    
    try {
      // Preload data based on route parameters
      await this.preloadData();
    } catch (error) {
      this.showError('Failed to load page data');
      console.error('Data loading error:', error);
    } finally {
      this.hideLoading();
    }
  }
  
  async preloadData() {
    const promises = [];
    
    // Load user data if user ID in params
    if (this.params.userId) {
      promises.push(this.loadUser(this.params.userId));
    }
    
    // Load posts if needed
    if (this.params.category) {
      promises.push(this.loadPosts(this.params.category));
    }
    
    await Promise.all(promises);
  }
}
```

### 3. Multi-Tab Page

```javascript
class TabbedPage extends Page {
  constructor(options = {}) {
    super({
      template: `
        <div class="tabbed-page">
          <nav class="nav nav-tabs">
            <a class="nav-link {{#isTab 'overview'}}active{{/isTab}}" 
               data-action="switch-tab" data-tab="overview">Overview</a>
            <a class="nav-link {{#isTab 'details'}}active{{/isTab}}" 
               data-action="switch-tab" data-tab="details">Details</a>
            <a class="nav-link {{#isTab 'settings'}}active{{/isTab}}" 
               data-action="switch-tab" data-tab="settings">Settings</a>
          </nav>
          <div class="tab-content">
            {{> currentTabContent}}
          </div>
        </div>
      `,
      ...options
    });
    
    this.currentTab = 'overview';
    this.tabViews = {};
  }
  
  async onParams(params, query) {
    await super.onParams(params, query);
    
    // Switch tab based on query parameter
    if (query.tab && query.tab !== this.currentTab) {
      this.switchTab(query.tab);
    }
  }
  
  async handleActionSwitchTab(event, element) {
    const tab = element.getAttribute('data-tab');
    await this.switchTab(tab);
    
    // Update URL without triggering navigation
    const newQuery = { ...this.query, tab };
    this.updateUrl(newQuery);
  }
  
  async switchTab(tabName) {
    this.currentTab = tabName;
    
    // Load tab view if not already loaded
    if (!this.tabViews[tabName]) {
      this.tabViews[tabName] = await this.createTabView(tabName);
    }
    
    await this.render();
  }
  
  async createTabView(tabName) {
    switch (tabName) {
      case 'overview':
        return new OverviewView({ data: this.data });
      case 'details':
        return new DetailsView({ model: this.model });
      case 'settings':
        return new SettingsView({ settings: this.settings });
      default:
        return null;
    }
  }
  
  getPartials() {
    return {
      currentTabContent: this.tabViews[this.currentTab]?.template || ''
    };
  }
  
  // Helper for template
  getViewData() {
    return {
      ...super.getViewData(),
      isTab: (tabName) => this.currentTab === tabName
    };
  }
}
```

### 4. Master-Detail Page

```javascript
class MasterDetailPage extends Page {
  constructor(options = {}) {
    super({
      route: '/items/:id?',
      template: `
        <div class="master-detail-page">
          <div class="master-panel">
            <div data-view-container="list"></div>
          </div>
          <div class="detail-panel">
            {{#hasSelectedItem}}
              <div data-view-container="detail"></div>
            {{/hasSelectedItem}}
            {{^hasSelectedItem}}
              <div class="empty-state">
                <p>Select an item to view details</p>
              </div>
            {{/hasSelectedItem}}
          </div>
        </div>
      `,
      ...options
    });
  }
  
  async onInit() {
    await super.onInit();
    
    // Create list view
    this.listView = new ItemListView({
      collection: this.collection,
      container: '[data-view-container="list"]'
    });
    
    this.addChild(this.listView);
    
    // Listen for item selection
    this.listView.on('item-selected', async (item) => {
      await this.navigate(`/items/${item.id}`);
    });
  }
  
  async onParams(params, query) {
    await super.onParams(params, query);
    
    // Show detail view if item selected
    if (params.id) {
      await this.showItemDetail(params.id);
    } else {
      this.hideItemDetail();
    }
  }
  
  async showItemDetail(itemId) {
    const item = this.collection.get(itemId);
    if (!item) return;
    
    // Remove existing detail view
    if (this.detailView) {
      this.removeChild(this.detailView);
    }
    
    // Create new detail view
    this.detailView = new ItemDetailView({
      model: item,
      container: '[data-view-container="detail"]'
    });
    
    this.addChild(this.detailView);
    this.selectedItemId = itemId;
    
    await this.render();
  }
  
  hideItemDetail() {
    if (this.detailView) {
      this.removeChild(this.detailView);
      this.detailView = null;
    }
    
    this.selectedItemId = null;
    this.render();
  }
  
  async getViewData() {
    return {
      ...await super.getViewData(),
      hasSelectedItem: !!this.selectedItemId
    };
  }
}
```

## Best Practices

### 1. Page Naming and Organization

```javascript
// Good - Clear, descriptive names
class UserListPage extends Page {
  constructor() {
    super({
      pageName: 'UserList',
      route: '/users',
      displayName: 'User Management'
    });
  }
}

// Good - Consistent naming pattern
class UserDetailPage extends Page { /* ... */ }
class UserEditPage extends Page { /* ... */ }
class UserCreatePage extends Page { /* ... */ }
```

### 2. Route Organization

```javascript
// Register pages with the app (current MOJO pattern)
app.registerPage('user-list', UserListPage);
app.registerPage('user-detail', UserDetailPage);
app.registerPage('user-edit', UserEditPage);
app.registerPage('user-create', UserCreatePage);

app.registerPage('admin-dashboard', AdminDashboardPage);
app.registerPage('admin-settings', AdminSettingsPage);

// Routes are defined in the Page classes via static route property
// or in the constructor options
```

### 3. State Management

```javascript
class StatefulPage extends Page {
  constructor(options = {}) {
    super(options);
    
    // Initialize page-specific state
    this.pageState = {
      loading: false,
      error: null,
      data: null
    };
  }
  
  async setState(updates) {
    this.pageState = { ...this.pageState, ...updates };
    await this.render();
  }
  
  async onEnter() {
    await super.onEnter();
    
    // Restore state from query parameters
    this.restoreStateFromQuery();
  }
  
  async onExit() {
    // Save important state to query parameters
    this.saveStateToQuery();
    
    await super.onExit();
  }
}
```

### 4. Error Handling

```javascript
class RobustPage extends Page {
  async onEnter() {
    try {
      await super.onEnter();
      await this.initializePage();
    } catch (error) {
      this.handlePageError(error);
    }
  }
  
  async onParams(params, query) {
    try {
      await super.onParams(params, query);
      await this.handleParameterChange(params, query);
    } catch (error) {
      this.handleParameterError(error, params, query);
    }
  }
  
  handlePageError(error) {
    console.error(`Page error in ${this.pageName}:`, error);
    
    this.showError('Failed to load page. Please try again.');
    
    // Optionally redirect to error page
    if (error.status === 404) {
      this.navigate('/404');
    }
  }
}
```

## Integration with Other Components

### With WebApp

```javascript
// Register pages with the application
const app = WebApp.create();

app.registerPage('home', HomePage);
app.registerPage('users', UserListPage);
app.registerPage('user-detail', UserDetailPage);

// Navigate between pages
class MyPage extends Page {
  async handleActionGoToUsers(event, element) {
    const app = this.getApp();
    await app.showPage('users');
  }
}
```

### With Views

```javascript
class PageWithViews extends Page {
  async onInit() {
    await super.onInit();
    
    // Create child views
    this.headerView = new HeaderView();
    this.contentView = new ContentView();
    
    this.addChild(this.headerView);
    this.addChild(this.contentView);
  }
}
```

### With Models and Collections

```javascript
class DataDrivenPage extends Page {
  constructor(options = {}) {
    super({
      Collection: UserCollection,
      ...options
    });
  }
  
  async onEnter() {
    await super.onEnter();
    
    // Initialize collection
    if (this.Collection && !this.collection) {
      this.collection = new this.Collection();
      await this.collection.fetch();
    }
  }
  
  async getViewData() {
    return {
      ...await super.getViewData(),
      users: this.collection?.toJSON() || []
    };
  }
}
```

---

Page components provide the foundation for building multi-page applications with clean routing, state management, and lifecycle handling, making it easy to create complex navigation flows while maintaining clean separation of concerns.