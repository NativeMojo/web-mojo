# Sidebar Component Features

The Sidebar component in MOJO Framework provides collapsible navigation with active state management and configurable layout modes for flexible sidebar behavior.

## 🎯 Overview

The Sidebar component offers:
- **Active State Management**: Automatically highlights the current page's navigation item
- **Layout Modes**: Choose between overlay or push content behavior
- **Responsive Design**: Mobile-friendly collapsible sidebar
- **Easy Integration**: Simple router guard setup for active states

## ✅ Features

### 1. Active State Management
- **Automatic Updates**: Active states update when routes change
- **Smart Matching**: Supports exact and prefix matching for nested routes
- **Home Route Handling**: Special logic for home route conflicts
- **Visual Feedback**: CSS classes applied for styling active items

### 2. Layout Modes
- **Push Mode** (`layoutMode: 'push'`): Sidebar pushes main content to the right
- **Overlay Mode** (`layoutMode: 'overlay'`): Sidebar overlays content (mobile-first)
- **Responsive**: Automatically adapts to screen size
- **Smooth Transitions**: CSS transitions for professional feel

## 🏗️ Implementation

### Basic Setup

```javascript
import Sidebar from '../src/components/Sidebar.js';

const sidebar = new Sidebar({
    data: {
        brandText: 'My App',
        brandSubtext: 'Navigation',
        layoutMode: 'push', // 'overlay' or 'push'
        navItems: [
            { route: '/', text: 'Home', icon: 'bi bi-house', active: false },
            { route: '/dashboard', text: 'Dashboard', icon: 'bi bi-speedometer2', active: false },
            { route: '/users', text: 'Users', icon: 'bi bi-people', active: false },
            { route: '/settings', text: 'Settings', icon: 'bi bi-gear', active: false }
        ]
    }
});
```

### Active State Management

Set up router guards to automatically update active states:

```javascript
// Add router guard for active state management
this.router.addGuard('afterEach', (route) => {
    if (this.sidebar) {
        this.sidebar.updateActiveItem(route.path);
    }
});

// Set initial active state
setTimeout(() => {
    let initialPath;
    if (this.router.currentRoute) {
        initialPath = this.router.currentRoute.path;
    } else {
        const fullPath = window.location.pathname;
        initialPath = fullPath.replace('/your-app-base', '') || '/';
    }
    
    if (this.sidebar) {
        this.sidebar.updateActiveItem(initialPath);
    }
}, 100);
```

### Layout Mode Configuration

#### Push Mode (Recommended for Desktop)
```javascript
const sidebar = new Sidebar({
    data: {
        layoutMode: 'push',
        // ... other options
    }
});
```

**Behavior:**
- Sidebar pushes main content to the right when expanded
- Content area adjusts automatically
- Smooth transitions when toggling
- Best for desktop applications

#### Overlay Mode (Mobile-First)
```javascript
const sidebar = new Sidebar({
    data: {
        layoutMode: 'overlay',
        // ... other options
    }
});
```

**Behavior:**
- Sidebar overlays content when expanded
- Main content stays in place
- Higher z-index for sidebar
- Best for mobile or when content should remain fixed

## 🧭 Route Matching Logic

Same intelligent matching as TopNav:

### Home Route (`/`)
- **Exact match only**: Active only when current route is exactly `/`
- **Prevents conflicts**: Won't be active for `/dashboard`, `/users`, etc.

### Other Routes
- **Exact match**: `/users` active for `/users`
- **Prefix match**: `/users` also active for `/users/123`, `/users/edit`
- **Case sensitive**: Routes matched exactly as provided

### Examples

| Current Route | Home (`/`) | Dashboard (`/dashboard`) | Users (`/users`) |
|---------------|------------|-------------------------|------------------|
| `/`           | ✅ Active  | ❌ Inactive             | ❌ Inactive      |
| `/dashboard`  | ❌ Inactive| ✅ Active               | ❌ Inactive      |
| `/users`      | ❌ Inactive| ❌ Inactive             | ✅ Active        |
| `/users/123`  | ❌ Inactive| ❌ Inactive             | ✅ Active        |

## 📋 Complete Example

```javascript
class MyApp {
    constructor() {
        this.router = null;
        this.sidebar = null;
        this.mainContent = null;
    }

    async initialize() {
        // Create Sidebar with push layout
        this.sidebar = new Sidebar({
            data: {
                brandText: 'My App',
                brandSubtext: 'Admin Panel',
                brandIcon: 'bi bi-grid',
                layoutMode: 'push', // or 'overlay'
                navItems: [
                    { route: '/', text: 'Dashboard', icon: 'bi bi-house', active: false },
                    { route: '/users', text: 'Users', icon: 'bi bi-people', active: false },
                    { route: '/reports', text: 'Reports', icon: 'bi bi-graph-up', active: false },
                    { route: '/settings', text: 'Settings', icon: 'bi bi-gear', active: false }
                ],
                footerContent: `
                    <div class="text-center">
                        <small class="text-muted">v2.0.0</small>
                    </div>
                `
            }
        });

        // Create MainContent
        this.mainContent = new MainContent({
            data: {
                showTopBar: true,
                topBarContent: 'My Application'
            }
        });

        // Render components
        await this.sidebar.render('#sidebar-container');
        await this.mainContent.render('#main-container');

        // Create router
        this.router = new Router({
            mode: 'history',
            base: '/my-app',
            container: this.mainContent.element.querySelector('[data-id="content"]')
        });

        // Register routes
        this.router.addRoute('/', new DashboardPage());
        this.router.addRoute('/users', new UsersPage());
        this.router.addRoute('/users/:id', new UserDetailPage());
        this.router.addRoute('/reports', new ReportsPage());
        this.router.addRoute('/settings', new SettingsPage());

        // Set up active state management
        this.router.addGuard('afterEach', (route) => {
            this.updateActiveNavLinks(route.path);
        });

        // Set up sidebar toggle handlers
        this.setupSidebarHandlers();

        // Start router
        this.router.start();

        // Set initial active state
        this.setInitialActiveState();
    }

    updateActiveNavLinks(currentRoute) {
        if (this.sidebar) {
            this.sidebar.updateActiveItem(currentRoute);
        }
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

    setupSidebarHandlers() {
        // Handle collapse/expand buttons
        document.addEventListener('click', (event) => {
            const element = event.target.closest('[data-action]');
            if (!element) return;

            const action = element.dataset.action;

            if (action === 'toggle-sidebar' || action === 'collapse-sidebar') {
                event.preventDefault();
                this.sidebar.collapse();
            }
        });
    }
}
```

## 🎨 CSS Styling

### Active State Styling
```css
/* Active sidebar navigation item */
.sidebar-nav .nav-link.active {
    color: #fff !important;
    background-color: #495057 !important;
    font-weight: 500;
}

/* Custom active state styling */
.sidebar-nav .nav-link.active {
    background: linear-gradient(45deg, #007bff, #0056b3);
    border-left: 4px solid #ffc107;
}
```

### Layout Customization
```css
/* Adjust sidebar width */
.sidebar {
    width: 280px; /* Default is 250px */
}

/* Custom transition timing */
.sidebar, .main-content {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Custom brand section */
.sidebar-brand {
    background: linear-gradient(135deg, #007bff, #0056b3);
    padding: 1.5rem 1rem;
}
```

## 🔧 API Reference

### Methods

#### `updateActiveItem(currentRoute)`
Updates active state based on current route.
- **Parameters**: `currentRoute` (string) - Current route path
- **Returns**: void
- **Example**: `sidebar.updateActiveItem('/users')`

#### `collapse()`
Toggles sidebar collapsed state and updates layout.
- **Returns**: void
- **Side Effects**: Updates main content layout in push mode

#### `toggle()`
Toggles sidebar visibility (mobile).
- **Returns**: void
- **Usage**: Primarily for mobile responsive behavior

### Configuration Options

```javascript
{
    brandText: 'App Name',           // Main brand text
    brandSubtext: 'Description',     // Optional subtitle
    brandIcon: 'bi bi-icon',         // Optional brand icon
    layoutMode: 'push',              // 'push' or 'overlay'
    navItems: [],                    // Navigation items array
    footerContent: '<div>...</div>'  // Optional footer HTML
}
```

### Navigation Item Structure
```javascript
{
    route: '/path',          // Route path
    text: 'Display Name',    // Link text
    icon: 'bi bi-icon',      // Optional icon class
    active: false            // Active state (managed automatically)
}
```

## 🚀 Best Practices

1. **Layout Mode Selection**:
   - Use `push` for desktop-focused applications
   - Use `overlay` for mobile-first or when content positioning is critical

2. **Active State Management**:
   - Always initialize active states after router starts
   - Use consistent route patterns between sidebar and router
   - Test navigation with direct URL access

3. **Responsive Design**:
   - Test sidebar behavior on all screen sizes
   - Ensure mobile toggle functionality works
   - Consider touch targets for mobile users

4. **Performance**:
   - Minimize DOM queries in toggle handlers
   - Use CSS transitions instead of JavaScript animations
   - Cache DOM references when possible

## 🔍 Troubleshooting

### Active States Not Updating
- ✅ Verify router guard is set up correctly
- ✅ Check that `updateActiveItem()` is called
- ✅ Ensure nav items have `active: false` initially
- ✅ Test route normalization logic

### Layout Issues
- ✅ Verify `layoutMode` is set correctly
- ✅ Check CSS conflicts with existing styles
- ✅ Test responsive breakpoints
- ✅ Ensure MainContent component is used correctly

### Sidebar Not Collapsing/Expanding
- ✅ Check for JavaScript errors in console
- ✅ Verify event handlers are attached
- ✅ Test CSS transitions are not blocked
- ✅ Ensure proper DOM structure

### Mobile Responsiveness
- ✅ Test on actual mobile devices
- ✅ Check touch event handling
- ✅ Verify viewport meta tag is present
- ✅ Test sidebar overlay behavior

## 🎯 Framework Integration

The Sidebar component is fully integrated with the MOJO Framework:
- ✅ Works seamlessly with Router component
- ✅ Compatible with MainContent component
- ✅ Follows MOJO component lifecycle
- ✅ Uses framework's event system
- ✅ Supports template rendering with Mustache

No additional dependencies required - just import and configure!