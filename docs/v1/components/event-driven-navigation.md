# Event-Driven Navigation System

## Overview

MOJO's event-driven navigation system provides a powerful, flexible way to handle page transitions and component coordination. It combines page lifecycle events, rich metadata, and dynamic UI updates to create seamless navigation experiences.

## Key Features

- **Page Lifecycle Events**: Hooks into page transitions with before-change, changed, activated, and deactivated events
- **Global Event Bus**: Centralized communication between components
- **Rich Page Metadata**: Icons, display names, and descriptions for enhanced UX
- **Dynamic TopNav Modes**: Flexible navigation bar display options
- **Param Mode Routing**: SEO-friendly URLs that work with static hosting

## Page Lifecycle Events

The navigation system fires events at key points during page transitions:

### Event Types

#### `page:before-change`
Fired before leaving the current page. Useful for:
- Saving unsaved changes
- Showing loading states
- Canceling navigation if needed

```javascript
window.MOJO.eventBus.on('page:before-change', (data) => {
    console.log('Leaving:', data.previousPage?.name);
    console.log('Going to:', data.incomingRoute);
});
```

#### `page:changed`
Fired after the page has changed. Useful for:
- Updating breadcrumbs
- Analytics tracking
- Global state updates

```javascript
window.MOJO.eventBus.on('page:changed', (data) => {
    console.log('Previous:', data.previousPage);
    console.log('Current:', data.currentPage);
    console.log('Params:', data.params);
    console.log('Query:', data.query);
});
```

#### `page:activated`
Fired when a page becomes active. Useful for:
- Starting timers or animations
- Loading fresh data
- Setting focus

```javascript
window.MOJO.eventBus.on('page:activated', (data) => {
    console.log('Page activated:', data.page.displayName);
});
```

#### `page:deactivated`
Fired when a page becomes inactive. Useful for:
- Cleanup operations
- Stopping timers
- Saving state

```javascript
window.MOJO.eventBus.on('page:deactivated', (data) => {
    console.log('Page deactivated:', data.page.displayName);
});
```

## Page Metadata

Pages can include rich metadata for enhanced display and functionality:

```javascript
class DashboardPage extends Page {
    constructor() {
        super({
            page_name: 'Dashboard',
            route: '/dashboard',
            title: 'Dashboard - My App',
            
            // Rich metadata
            pageIcon: 'bi bi-speedometer2',
            displayName: 'System Dashboard',
            pageDescription: 'Real-time metrics and overview'
        });
    }
}
```

### Metadata Properties

- **pageIcon**: Bootstrap icon class for visual identification
- **displayName**: User-friendly name for display
- **pageDescription**: Brief description of page purpose
- **title**: Browser window title

## TopNav Display Modes

The TopNav component supports three display modes to suit different application needs:

### Menu Mode
Shows traditional navigation menu only:

```javascript
const topNav = new TopNav({
    displayMode: 'menu',
    data: {
        navItems: [
            { route: '/', text: 'Home', icon: 'bi bi-house' },
            { route: '/about', text: 'About', icon: 'bi bi-info-circle' }
        ]
    }
});
```

### Page Mode
Shows current page information only:

```javascript
const topNav = new TopNav({
    displayMode: 'page',
    showPageIcon: true,
    showPageDescription: true
});
```

### Both Mode
Combines menu and page information:

```javascript
const topNav = new TopNav({
    displayMode: 'both',
    showPageIcon: true,
    showPageDescription: false
});
```

### Dynamic Mode Switching

You can change display modes at runtime:

```javascript
// Switch to page mode
topNav.displayMode = 'page';
topNav.updatePageDisplay();

// Toggle page description
topNav.showPageDescription = true;
topNav.updatePageDisplay();
```

## Router Param Mode

Param mode uses query parameters for routing, making it perfect for static hosting:

### Configuration

```javascript
const router = new Router({
    mode: 'param',  // Default mode
    pageParam: 'page',  // Query parameter name
    container: '#app'
});
```

### URL Format

- Home: `index.html?page=home` or just `index.html`
- Dashboard: `index.html?page=dashboard`
- With params: `index.html?page=settings&tab=security`

### Benefits

- **No server configuration required**: Works with any static file server
- **SEO-friendly**: Search engines can crawl query parameters
- **GitHub Pages compatible**: Perfect for static hosting
- **Clean URLs**: Professional appearance with meaningful parameters

## Navigation Methods

### Primary: href-based Navigation

```html
<!-- Standard links with automatic router interception -->
<a href="?page=dashboard">Dashboard</a>
<a href="?page=users&role=admin">Admin Users</a>
```

### Enhanced: data-page Navigation

```html
<!-- Page navigation with JSON parameters -->
<button data-page="analytics" data-params='{"view": "charts", "period": "month"}'>
    Analytics
</button>
```

### Programmatic Navigation

```javascript
// Using global router
window.MOJO.router.navigate('/dashboard');

// With parameters
window.MOJO.router.navigateToPage('analytics', {
    view: 'charts',
    period: 'month'
});

// From within a page
this.navigate('/settings', { tab: 'profile' });
```

## Complete Example

Here's a complete example showing event-driven navigation in action:

```javascript
import Page from './core/Page.js';
import Router from './core/Router.js';
import TopNav from './components/TopNav.js';
import EventBus from './utils/EventBus.js';

// Setup global event bus
window.MOJO = { eventBus: new EventBus() };

// Define a page with rich metadata
class AnalyticsPage extends Page {
    constructor() {
        super({
            page_name: 'Analytics',
            route: '/analytics',
            title: 'Analytics Dashboard',
            pageIcon: 'bi bi-graph-up',
            displayName: 'Analytics & Reports',
            pageDescription: 'Data visualization and insights'
        });
    }

    on_params(params = {}, query = {}) {
        super.on_params(params, query);
        
        // Handle parameters
        this.view = params.view || 'overview';
        this.period = params.period || 'week';
        
        this.updateData({
            view: this.view,
            period: this.period
        });
    }

    async onActivate() {
        await super.onActivate();
        console.log('Loading analytics data...');
        // Start data refresh timer
        this.refreshTimer = setInterval(() => {
            this.refreshData();
        }, 30000);
    }

    async onDeactivate() {
        await super.onDeactivate();
        // Clean up timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }

    async getTemplate() {
        return `
            <div class="analytics-page">
                <h2>{{displayName}}</h2>
                <p>Showing {{view}} for {{period}}</p>
                <!-- Page content -->
            </div>
        `;
    }
}

// Initialize navigation
async function initApp() {
    // Create TopNav with both mode
    const topNav = new TopNav({
        displayMode: 'both',
        showPageIcon: true,
        data: {
            brandText: 'My App',
            navItems: [
                { route: '/', text: 'Home' },
                { route: '/analytics', text: 'Analytics' }
            ]
        }
    });
    
    await topNav.render('body', 'prepend');
    
    // Create router
    const router = new Router({
        mode: 'param',
        container: '#app'
    });
    
    // Make router globally accessible
    window.MOJO.router = router;
    
    // Register pages
    router.addRoute('/analytics', new AnalyticsPage());
    
    // Listen to navigation events
    window.MOJO.eventBus.on('page:changed', (data) => {
        console.log('Page changed to:', data.currentPage?.name);
        
        // Track with analytics
        if (window.gtag) {
            gtag('event', 'page_view', {
                page_title: data.currentPage?.displayName,
                page_location: window.location.href
            });
        }
    });
    
    // Start router
    router.start();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
```

## Best Practices

### 1. Always Set Page Metadata
Provide meaningful metadata for better UX:

```javascript
class MyPage extends Page {
    constructor() {
        super({
            pageIcon: 'bi bi-folder',
            displayName: 'My Documents',
            pageDescription: 'Manage your files and folders'
        });
    }
}
```

### 2. Handle Cleanup in Deactivate
Always clean up resources when pages deactivate:

```javascript
async onDeactivate() {
    await super.onDeactivate();
    
    // Clear timers
    clearInterval(this.refreshTimer);
    
    // Cancel pending requests
    this.abortController?.abort();
    
    // Save state if needed
    this.saveState();
}
```

### 3. Use Event Bus for Component Communication
Leverage the global event bus for loose coupling:

```javascript
// In one component
window.MOJO.eventBus.emit('user:updated', { id: 123, name: 'John' });

// In another component
window.MOJO.eventBus.on('user:updated', (user) => {
    this.updateUserDisplay(user);
});
```

### 4. Filter Page Parameters
The router automatically filters the page parameter in param mode:

```javascript
// URL: ?page=settings&tab=security&theme=dark
on_params(params, query) {
    // query will be { tab: 'security', theme: 'dark' }
    // 'page' parameter is automatically removed
}
```

### 5. Choose Appropriate TopNav Mode
- **Menu mode**: Traditional applications with clear navigation
- **Page mode**: Wizard-style or focused workflows
- **Both mode**: Rich applications needing context awareness

## Migration Guide

### From Hash-based Navigation

Before:
```javascript
// Old hash-based
router = new Router({ mode: 'hash' });
// URLs like: #/dashboard
```

After:
```javascript
// New param mode (default)
router = new Router({ mode: 'param' });
// URLs like: ?page=dashboard
```

### From Manual Event Handlers

Before:
```javascript
// Manual navigation handling
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-route]')) {
        router.navigate(e.target.dataset.route);
    }
});
```

After:
```javascript
// Automatic handling via View class
// Just use standard href or data-page attributes
<a href="?page=dashboard">Dashboard</a>
<button data-page="settings">Settings</button>
```

## Troubleshooting

### Events Not Firing

Ensure the global event bus is initialized:

```javascript
window.MOJO = window.MOJO || {};
window.MOJO.eventBus = new EventBus();
```

### TopNav Not Updating

Make sure to call `updatePageDisplay()` after changing properties:

```javascript
topNav.displayMode = 'page';
topNav.showPageIcon = false;
topNav.updatePageDisplay();  // Required for updates
```

### Page Parameters Not Working

Verify router is globally accessible:

```javascript
window.MOJO.router = router;  // Required for data-page navigation
```

## Summary

The event-driven navigation system provides:

- **Lifecycle hooks** for precise control over page transitions
- **Rich metadata** for enhanced user experience
- **Flexible display modes** to suit different application styles
- **SEO-friendly routing** that works everywhere
- **Global event bus** for component coordination

This system makes it easy to build sophisticated single-page applications with clean, maintainable code and excellent user experience.