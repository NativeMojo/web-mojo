# MOJO Navigation System

A comprehensive guide to MOJO's modern navigation system featuring SEO-friendly href-based routing and enhanced data-page navigation with parameter passing.

## 🚀 Overview

MOJO provides a dual-approach navigation system that combines the best of modern web standards with framework conveniences:

- **href Navigation** - Primary approach using standard HTML links
- **data-page Navigation** - Enhanced approach with parameter passing
- **Automatic Router Integration** - No manual event handlers needed
- **SEO & Accessibility Friendly** - Works with search engines and screen readers
- **Progressive Enhancement** - Functions without JavaScript

## 📋 Navigation Approaches

### 1. href Navigation (Primary)

Use standard `href` attributes for clean, semantic navigation:

```html
<!-- Basic navigation -->
<a href="/">Home</a>
<a href="/about">About Us</a>
<a href="/users/123">User Profile</a>
<a href="/dashboard?tab=analytics">Dashboard</a>

<!-- External links (not intercepted) -->
<a href="https://docs.example.com" data-external>Documentation</a>
<a href="../" data-external>Parent Directory</a>
<a href="mailto:support@example.com">Email Support</a>
```

**Benefits:**
- ✅ **Copy link support** - Right-click → copy link provides real URLs
- ✅ **SEO friendly** - Search engines crawl proper navigation structure  
- ✅ **Browser features** - Ctrl+click, middle-click work as expected
- ✅ **Accessibility** - Screen readers understand semantic navigation
- ✅ **Progressive enhancement** - Works without JavaScript
- ✅ **Standards compliant** - Uses proper HTML semantics

### 2. data-page Navigation (Enhanced)

Use `data-page` attributes for page-name routing with rich parameters:

```html
<!-- Navigate by page name -->
<button data-page="settings">Open Settings</button>
<div data-page="dashboard" class="nav-card">Dashboard</div>

<!-- Navigate with parameters -->
<button data-page="user" data-params='{"id": 123, "tab": "profile"}'>
  User Profile
</button>

<!-- Complex parameter objects -->
<a href="/reports" 
   data-page="reports" 
   data-params='{"filters": {"status": "active", "type": "monthly"}, "view": "grid"}'>
  Monthly Reports
</a>
```

**Benefits:**
- ✅ **Page name routing** - Navigate by semantic names, not URL structure
- ✅ **Parameter passing** - Rich data via JSON `data-params`
- ✅ **Dynamic routing** - Flexible navigation independent of URL patterns
- ✅ **Element agnostic** - Works with buttons, divs, links, etc.
- ✅ **Type safety** - JSON parameter validation

## 🔧 Implementation

### Router Setup

```javascript
class MyApp {
  async initialize() {
    // Create router instance
    this.router = new Router({
      mode: 'history',          // Clean URLs without hash
      base: '/my-app',          // Base path for the application
      container: '#app'         // Container element for page rendering
    });

    // Register pages
    this.pages = [
      new HomePage(),
      new AboutPage(),
      new UsersPage(),
      new SettingsPage()
    ];

    this.pages.forEach(page => {
      this.router.addRoute(page.route, page);
    });

    // Make router globally accessible for navigation
    window.MOJO = window.MOJO || {};
    window.MOJO.router = this.router;

    // Auto-update active navigation states
    this.router.addGuard('afterEach', (route) => {
      this.updateActiveNavigation(route.path);
    });

    // Start router
    this.router.start();
  }
}
```

### Page Implementation

```javascript
class UsersPage extends Page {
  constructor() {
    super({
      page_name: 'Users',      // Used for data-page="users"
      route: '/users/:id?',    // URL route pattern
      title: 'Users Directory'
    });
  }

  // Handle both URL params and data-page params
  on_params(params = {}, query = {}) {
    console.log('URL params:', params);     // From route: /users/123
    console.log('Query params:', query);    // From ?tab=settings&sort=name
    console.log('Page params:', params);    // From data-params JSON

    // Handle different parameter sources
    if (params.id) {
      this.loadUser(params.id);
    }
    
    if (params.tab) {
      this.showTab(params.tab);
    }
    
    if (params.filters) {
      this.applyFilters(params.filters);
    }
  }

  async getTemplate() {
    return `
      <div class="container">
        <h1>Users Directory</h1>
        
        <!-- href navigation -->
        <a href="/users/123" class="btn btn-primary">View User 123</a>
        
        <!-- data-page navigation with parameters -->
        <button data-page="users" 
                data-params='{"id": 456, "tab": "profile"}' 
                class="btn btn-success">
          User 456 Profile
        </button>
      </div>
    `;
  }
}
```

### Component Integration

Navigation works seamlessly with MOJO components:

```javascript
// TopNav component
const topNav = new TopNav({
  data: {
    navItems: [
      { route: '/', text: 'Home', icon: 'bi bi-house' },
      { route: '/about', text: 'About', icon: 'bi bi-info-circle' },
      { route: '/users', text: 'Users', icon: 'bi bi-people' }
    ]
  }
});

// Sidebar component  
const sidebar = new Sidebar({
  data: {
    navItems: [
      { route: '/dashboard', text: 'Dashboard', icon: 'bi bi-speedometer2' },
      { route: '/settings', text: 'Settings', icon: 'bi bi-gear' }
    ]
  }
});
```

## ⚙️ Advanced Features

### Navigation Precedence

When multiple navigation attributes are present:

```html
<!-- data-page takes precedence over href -->
<a href="/fallback-url" data-page="settings" data-params='{"tab": "account"}'>
  Settings (uses data-page routing)
</a>

<!-- data-action is bypassed for navigation -->
<a href="/about" data-action="someOtherAction">About (uses href)</a>
```

### External Link Handling

```html
<!-- Automatically detected as external (not intercepted) -->
<a href="https://example.com">External Site</a>
<a href="mailto:support@example.com">Email</a>
<a href="tel:+1234567890">Phone</a>

<!-- Force external handling -->
<a href="../parent-directory" data-external>Parent Directory</a>
<a href="/api/download" data-external>Direct Download</a>
```

### Browser Feature Preservation

The system automatically preserves standard browser behaviors:

- **Ctrl+Click** - Opens link in new tab
- **Middle-Click** - Opens link in new tab  
- **Shift+Click** - Opens link in new window
- **Right-Click** - Shows context menu with "Copy Link"
- **Drag & Drop** - Allows dragging links to bookmarks/address bar

### Parameter Processing

data-params accepts complex JSON objects:

```html
<button data-page="reports" 
        data-params='{
          "dateRange": {"start": "2024-01-01", "end": "2024-12-31"},
          "filters": {"department": "sales", "status": "completed"},
          "options": {"format": "pdf", "includeCharts": true}
        }'>
  Generate Annual Report
</button>
```

```javascript
// In the page's on_params method:
on_params(params = {}, query = {}) {
  if (params.dateRange) {
    this.setDateRange(params.dateRange.start, params.dateRange.end);
  }
  
  if (params.filters) {
    this.applyFilters(params.filters);
  }
  
  if (params.options) {
    this.configureReport(params.options);
  }
}
```

## 🎯 Best Practices

### 1. Use href as Primary Navigation

```html
<!-- ✅ Good: SEO-friendly, copy-link support -->
<a href="/dashboard">Dashboard</a>
<a href="/users/123">User Profile</a>

<!-- ❌ Avoid: Legacy pattern, no copy-link -->
<a href="#" data-action="navigate" data-route="/dashboard">Dashboard</a>
```

### 2. Use data-page for Enhanced Features

```html
<!-- ✅ Good: When you need parameters -->
<button data-page="user" data-params='{"id": 123, "tab": "settings"}'>
  User Settings
</button>

<!-- ✅ Good: For semantic navigation -->
<div data-page="modal-help" class="help-button">Help</div>
```

### 3. Handle External Links Properly

```html
<!-- ✅ Good: Prevents router interception -->
<a href="https://docs.example.com" data-external>Documentation</a>
<a href="../" data-external>Parent Directory</a>

<!-- ✅ Good: Automatic external detection -->
<a href="mailto:support@example.com">Email Support</a>
<a href="https://github.com/myproject">GitHub</a>
```

### 4. Maintain Clean Templates

```javascript
async getTemplate() {
  return `
    <nav class="main-nav">
      <!-- Standard navigation -->
      <a href="/" class="nav-link">Home</a>
      <a href="/about" class="nav-link">About</a>
      
      <!-- Enhanced navigation -->
      <button data-page="settings" class="btn btn-primary">Settings</button>
      
      <!-- External links -->
      <a href="https://docs.example.com" data-external>Docs</a>
    </nav>
  `;
}
```

## 🐛 Troubleshooting

### Common Issues

**Navigation Not Working:**
```javascript
// Ensure router is globally accessible
window.MOJO = window.MOJO || {};
window.MOJO.router = this.router;

// Check that router is started
this.router.start();
```

**Copy Link Not Working:**
```html
<!-- ✅ Use proper href attributes -->
<a href="/about">About</a>

<!-- ❌ Don't use # hrefs -->
<a href="#" data-action="navigate" data-route="/about">About</a>
```

**Parameters Not Received:**
```html
<!-- ✅ Valid JSON in data-params -->
<button data-page="users" data-params='{"id": 123, "active": true}'>User</button>

<!-- ❌ Invalid JSON -->
<button data-page="users" data-params="{id: 123, active: true}">User</button>
```

**External Links Being Intercepted:**
```html
<!-- ✅ Add data-external attribute -->
<a href="https://example.com" data-external>External</a>

<!-- ✅ Or use automatically detected protocols -->
<a href="mailto:test@example.com">Email</a>
```

### Debug Information

Enable router debugging:
```javascript
const router = new Router({
  mode: 'history',
  base: '/app',
  container: '#app',
  debug: true  // Enable debug logging
});
```

Check navigation in console:
```javascript
// View registered routes
console.log(window.MOJO.router.routes);

// View page registry
console.log(window.MOJO.router.pageRegistry);

// Current route info
console.log(window.MOJO.router.currentRoute);
```

## 🚀 Migration Guide

### From Legacy data-action Navigation

**Before (Legacy):**
```html
<a href="#" data-action="navigate" data-route="/about">About</a>
<button data-action="navigate" data-route="/users/123">User</button>
```

**After (Modern):**
```html
<a href="/about">About</a>
<button data-page="user" data-params='{"id": 123}'>User</button>
```

### From Hash Routing

**Before:**
```javascript
const router = new Router({
  mode: 'hash',
  container: '#app'
});
```

**After:**
```javascript
const router = new Router({
  mode: 'history',
  base: '/my-app',
  container: '#app'
});
```

### Manual Event Handlers

**Before:**
```javascript
document.addEventListener('click', (event) => {
  const navElement = event.target.closest('[data-action="navigate"]');
  if (navElement) {
    event.preventDefault();
    const route = navElement.dataset.route;
    router.navigate(route);
  }
});
```

**After:**
```javascript
// No manual handlers needed - View class handles automatically
// Just use proper href attributes and data-page attributes
```

## 📚 API Reference

### Router Methods

```javascript
// Navigation
await router.navigate('/path', options)
await router.navigateToPage('pageName', params)

// Route Management  
router.addRoute(path, handler, options)
router.registerPageName('pageName', '/route/path')

// Guards
router.addGuard('beforeEach', guardFunction)
router.addGuard('afterEach', guardFunction)

// History
router.back()
router.forward()
router.go(delta)
```

### View Methods

```javascript
// Navigation (called automatically)
view.handlePageNavigation(element)
view.handleHrefNavigation(element)

// Utilities
view.isExternalLink(href)
view.hrefToRoutePath(href)
view.findRouter()
```

### Page Methods

```javascript
// Navigation
page.navigate(route, params, options)
page.goBack()
page.goForward()

// Route Handling
page.on_params(params, query)
page.matchRoute(path)
```

## 🎉 Complete Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>MOJO Navigation Example</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
  <!-- Top Navigation -->
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
    <div class="container-fluid">
      <a class="navbar-brand" href="/">MOJO App</a>
      <div class="navbar-nav">
        <a class="nav-link" href="/">Home</a>
        <a class="nav-link" href="/about">About</a>
        <a class="nav-link" href="/users">Users</a>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <div id="app" class="container mt-4">
    <!-- Router renders pages here -->
  </div>

  <script type="module">
    import { Router, Page } from './src/mojo.js';

    class HomePage extends Page {
      constructor() {
        super({
          page_name: 'Home',
          route: '/',
          title: 'Home Page'
        });
      }

      async getTemplate() {
        return `
          <h1>Welcome Home</h1>
          <p>Choose your navigation style:</p>
          
          <!-- href navigation -->
          <a href="/about" class="btn btn-primary">About (href)</a>
          
          <!-- data-page navigation -->
          <button data-page="users" data-params='{"highlight": "new"}' class="btn btn-success">
            New Users (data-page)
          </button>
        `;
      }
    }

    // Initialize app
    const router = new Router({ mode: 'history', container: '#app' });
    router.addRoute('/', HomePage);
    window.MOJO = { router };
    router.start();
  </script>
</body>
</html>
```

---

**MOJO Navigation System v2.0.0** - Modern, SEO-friendly, accessible navigation for web applications.