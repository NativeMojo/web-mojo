# TopNav Active State Management

The TopNav component in MOJO Framework provides automatic active state management for navigation items, highlighting the current page's navigation link based on the active route.

## 🎯 Overview

When users navigate between pages, the TopNav component automatically updates the visual state of navigation items to indicate which page is currently active. This provides clear visual feedback and improves user experience.

## ✅ Features

- **Automatic Updates**: Active states update automatically when routes change
- **Flexible Matching**: Supports exact matching and prefix matching for nested routes
- **Home Route Handling**: Special handling for home route (`/`) to avoid conflicts
- **Re-rendering**: Automatically re-renders TopNav when active states change
- **Easy Integration**: Simple setup with router guards

## 🏗️ Implementation

### 1. Router Guard Setup

Set up a router guard to call `updateActiveItem()` when routes change:

```javascript
// Add router guard for active state management
this.router.addGuard('afterEach', (route) => {
    if (this.topNav) {
        this.topNav.updateActiveItem(route.path);
    }
});
```

### 2. Initial Active State

Set the initial active state after the router starts:

```javascript
// Start router
this.router.start();

// Set initial active state
setTimeout(() => {
    let initialPath;
    if (this.router.currentRoute) {
        initialPath = this.router.currentRoute.path;
    } else {
        // Fallback to extract from URL
        const fullPath = window.location.pathname;
        initialPath = fullPath.replace('/your-app-base', '') || '/';
    }
    
    if (this.topNav) {
        this.topNav.updateActiveItem(initialPath);
    }
}, 100);
```

### 3. Navigation Item Data Structure

Ensure all navigation items have an `active` property:

```javascript
const topNav = new TopNav({
    data: {
        brandText: 'My App',
        navItems: [
            { route: '/', text: 'Home', icon: 'bi bi-house', active: false },
            { route: '/about', text: 'About', icon: 'bi bi-info-circle', active: false },
            { route: '/contact', text: 'Contact', icon: 'bi bi-envelope', active: false },
            { route: '/users', text: 'Users', icon: 'bi bi-people', active: false }
        ]
    }
});
```

## 🧭 Route Matching Logic

The active state matching follows these rules:

### Home Route (`/`)
- **Exact match only**: Only active when current route is exactly `/`
- **Prevents conflicts**: Avoids being active for other routes that start with `/`

### Other Routes
- **Exact match**: `/about` is active for `/about`
- **Prefix matching**: `/users` is also active for `/users/123` or `/users/edit`
- **Case sensitive**: Routes are matched exactly as provided

### Examples

| Current Route | Home (`/`) | About (`/about`) | Users (`/users`) |
|---------------|------------|------------------|------------------|
| `/`           | ✅ Active  | ❌ Inactive      | ❌ Inactive      |
| `/about`      | ❌ Inactive| ✅ Active        | ❌ Inactive      |
| `/users`      | ❌ Inactive| ❌ Inactive      | ✅ Active        |
| `/users/123`  | ❌ Inactive| ❌ Inactive      | ✅ Active        |

## 📋 Complete Example

Here's a complete implementation example:

```javascript
class MyApp {
    constructor() {
        this.router = null;
        this.topNav = null;
    }

    async initialize() {
        // Create TopNav
        this.topNav = new TopNav({
            data: {
                brandText: 'My App',
                navItems: [
                    { route: '/', text: 'Home', icon: 'bi bi-house', active: false },
                    { route: '/dashboard', text: 'Dashboard', icon: 'bi bi-speedometer2', active: false },
                    { route: '/users', text: 'Users', icon: 'bi bi-people', active: false },
                    { route: '/settings', text: 'Settings', icon: 'bi bi-gear', active: false }
                ]
            }
        });

        // Render TopNav
        await this.topNav.render('body', 'prepend');

        // Create router
        this.router = new Router({
            mode: 'history',
            base: '/my-app',
            container: '#app'
        });

        // Register pages
        this.router.addRoute('/', new HomePage());
        this.router.addRoute('/dashboard', new DashboardPage());
        this.router.addRoute('/users', new UsersPage());
        this.router.addRoute('/users/:id', new UserDetailPage());
        this.router.addRoute('/settings', new SettingsPage());

        // Set up active state management
        this.router.addGuard('afterEach', (route) => {
            this.updateActiveNavLinks(route.path);
        });

        // Make router globally accessible
        window.MOJO = window.MOJO || {};
        window.MOJO.router = this.router;

        // Start router
        this.router.start();

        // Set initial active state
        this.setInitialActiveState();
    }

    setInitialActiveState() {
        setTimeout(() => {
            let initialPath;
            if (this.router.currentRoute) {
                initialPath = this.router.currentRoute.path;
            } else {
                const fullPath = window.location.pathname;
                initialPath = fullPath.replace('/my-app', '') || '/';
            }
            this.updateActiveNavLinks(initialPath);
        }, 100);
    }

    updateActiveNavLinks(currentRoute) {
        if (this.topNav) {
            this.topNav.updateActiveItem(currentRoute);
        }
    }
}
```

## 🎨 CSS Styling

The active navigation items will have the `active` class applied. Style them in your CSS:

```css
/* Active navigation item styling */
.navbar-nav .nav-link.active {
    color: #fff !important;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
}

/* Or for different styling */
.navbar-nav .nav-link.active {
    font-weight: bold;
    border-bottom: 3px solid #ffc107;
}
```

## 📚 API Reference

### `updateActiveItem(currentRoute)`

Updates the active state of navigation items based on the current route.

**Parameters:**
- `currentRoute` (string): The current route path (e.g., `/users`, `/about`)

**Returns:** void

**Example:**
```javascript
topNav.updateActiveItem('/users'); // Sets Users nav item as active
```

### Route Normalization

The method automatically normalizes routes:
- Ensures routes start with `/`
- Handles empty/null routes as `/`
- Maintains case sensitivity

## 🔧 Troubleshooting

### Active State Not Updating
- ✅ Check that router guard is set up correctly
- ✅ Verify `updateActiveItem()` is being called
- ✅ Ensure all nav items have `active: false` initially

### Wrong Item Active
- ✅ Check route paths match exactly
- ✅ Verify route normalization is working
- ✅ Consider home route special handling

### Initial State Not Set
- ✅ Ensure initial state setup runs after router starts
- ✅ Check URL path extraction logic
- ✅ Verify timing with setTimeout

### Multiple Items Active
- ✅ Check for duplicate routes in nav items
- ✅ Verify home route (`/`) handling
- ✅ Review prefix matching logic

## 🎯 Best Practices

1. **Consistent Routes**: Ensure nav item routes match your router routes exactly
2. **Initialize After Router**: Always set initial active state after router starts
3. **Handle Base Paths**: Account for app base paths when extracting from URL
4. **Test Navigation**: Test all navigation scenarios including direct URL access
5. **Style Feedback**: Provide clear visual feedback for active states

## 🚀 Framework Integration

This active state management is built into the MOJO Framework's TopNav component. No additional dependencies or setup required - just follow the implementation pattern above!

The feature automatically handles:
- ✅ Route normalization
- ✅ Home route special cases
- ✅ Prefix matching for nested routes
- ✅ Component re-rendering
- ✅ State persistence during navigation