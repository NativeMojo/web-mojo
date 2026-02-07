# Sidebar and TopNav Components

The MOJO framework provides powerful navigation components - `Sidebar` and `TopNav` - designed to work together in portal-style applications. Both components support dynamic configuration, action handling, permission-based visibility, and seamless integration with the MOJO router.

## Overview

- **Sidebar**: Collapsible side navigation with multiple menu support, hierarchical items, and group-based switching
- **TopNav**: Bootstrap navbar with brand, navigation items, user menus, and sidebar integration

Both components are typically configured in `PortalApp` and automatically handle route changes, active states, and user interactions.

## Sidebar Component

### Basic Configuration

```js
// In PortalApp configuration
sidebar: {
    menus: [{
        name: "default",
        className: 'sidebar sidebar-light',
        header: '<div class="fs-5 fw-bold text-center pt-3">Main Menu</div>',
        footer: '<div class="text-center text-muted small">v1.0.0</div>',
        items: [
            {
                text: 'Dashboard',
                route: '?page=dashboard',
                icon: 'bi-speedometer2'
            },
            {
                text: 'Settings',
                action: 'settings',
                icon: 'bi-gear'
            }
        ]
    }]
}
```

### Menu Item Types

#### Basic Navigation Item
```js
{
    text: 'Dashboard',
    route: '?page=dashboard',    // Router navigation
    icon: 'bi-speedometer2',     // Bootstrap icon
    badge: {                     // Optional badge
        text: '3',
        class: 'badge bg-danger rounded-pill'
    }
}
```

#### Action Item
```js
{
    text: 'Settings',
    action: 'settings',          // Triggers action handler
    icon: 'bi-gear',
    handler: async (action, event, el) => {
        // Custom handler function
        console.log('Settings clicked');
    }
}
```

#### Hierarchical Menu (Submenu)
```js
{
    text: 'Reports',
    icon: 'bi-graph-up',
    children: [
        {
            text: 'Sales Report',
            route: '?page=sales-report',
            icon: 'bi-bar-chart'
        },
        {
            text: 'User Report', 
            route: '?page=user-report',
            icon: 'bi-people'
        }
    ]
}
```

#### Special Items
```js
{
    divider: true               // Horizontal divider line
},
{
    spacer: true               // Vertical spacing
},
{
    text: 'Disabled Item',
    disabled: true,            // Grayed out, non-clickable
    icon: 'bi-lock'
}
```

### Multiple Menus

The Sidebar supports switching between different menu configurations:

```js
sidebar: {
    menus: [
        {
            name: "default",
            className: 'sidebar sidebar-light',
            items: [/* default menu items */]
        },
        {
            name: "admin", 
            className: 'sidebar sidebar-dark',
            header: "<div class='text-center fs-5'><i class='bi bi-wrench'></i> Admin</div>",
            items: [/* admin menu items */]
        }
    ]
}
```

Switch menus programmatically:
```js
app.sidebar.setActiveMenu("admin");
```

### Group-Based Menus

Menus can be associated with user groups and automatically switch based on active group:

```js
{
    name: "group_default",
    groupKind: "any",           // Shows for any group
    className: 'sidebar sidebar-light',
    items: [
        {
            text: 'Group Dashboard',
            route: '?page=group-dashboard'
        },
        {
            text: 'Exit Group',
            action: 'exit-group',
            handler: async () => {
                app.sidebar.setActiveMenu("default");
            }
        }
    ]
}
```

### Sidebar Methods

```js
// Menu management
app.sidebar.addMenu(name, config)
app.sidebar.setActiveMenu(name)
app.sidebar.removeMenu(name)
app.sidebar.hasMenu(name)

// State management  
app.sidebar.collapse()
app.sidebar.expand()
app.sidebar.toggleSidebar()
app.sidebar.setSidebarState(collapsed)

// Active item management
app.sidebar.setActiveItemByRoute(route)
app.sidebar.updateActiveItem()

// Group functionality
app.sidebar.showMenuForGroup(group)
app.sidebar.showGroupSearch()
app.sidebar.hideGroupSearch()
```

### Sidebar Events

```js
// Listen for menu changes
app.sidebar.on('menu-changed', ({ menuName, config, sidebar }) => {
    console.log(`Switched to menu: ${menuName}`);
});

// Listen for route changes
app.sidebar.on('route-changed', ({ route, activeItem }) => {
    console.log(`Route changed: ${route}`);
});
```

## TopNav Component

### Basic Configuration

```js
// In PortalApp configuration  
topbar: {
    brand: 'My App',
    brandIcon: 'bi-lightning-charge',
    brandRoute: '?page=home',
    theme: 'navbar-dark bg-primary',
    displayMode: 'both',           // 'menu' | 'page' | 'both'
    showSidebarToggle: true,
    rightItems: [/* navigation items */],
    userMenu: {/* user menu config */}
}
```

### Right Navigation Items

#### Button Items
```js
{
    icon: 'bi-bell',
    action: 'notifications',
    buttonClass: 'btn btn-link text-white',
    title: 'Notifications',
    badge: '3'                     // Optional notification count
}
```

#### Link Items  
```js
{
    icon: 'bi-box-arrow-in-right',
    href: '/login',
    label: 'Login',
    external: true                 // Opens in new tab
}
```

#### Dropdown Menus
```js
{
    label: 'Tools',
    icon: 'bi-tools', 
    items: [
        {
            label: 'Import Data',
            action: 'import-data',
            icon: 'bi-upload'
        },
        {
            divider: true
        },
        {
            label: 'Export Data', 
            action: 'export-data',
            icon: 'bi-download'
        }
    ]
}
```

### User Menu

```js
userMenu: {
    label: 'John Doe',           // Updated from user model
    icon: 'bi-person-circle',
    items: [
        {
            label: 'Profile',
            icon: 'bi-person',
            action: 'profile'
        },
        {
            label: 'Settings',
            icon: 'bi-gear', 
            route: '?page=settings'
        },
        {
            divider: true
        },
        {
            label: 'Logout',
            icon: 'bi-box-arrow-right',
            action: 'logout'
        }
    ]
}
```

### Permission-Based Items

Items can be shown/hidden based on user permissions:

```js
{
    icon: 'bi-wrench',
    action: 'admin-panel',
    permissions: 'view_admin',     // Single permission
    handler: async () => {
        app.sidebar.setActiveMenu("admin");
    }
},
{
    label: 'Management',
    permissions: ['manage_users', 'manage_groups'], // Multiple permissions
    items: [/* admin items */]
}
```

### TopNav Methods

```js
// User management
app.topnav.setUser(userModel)      // Updates user menu with user data

// Menu item management
app.topnav.findMenuItem(id)
app.topnav.replaceMenuItem(id, newItem)

// Active state management (automatic)
app.topnav.updateActiveItem()
app.topnav.updatePageDisplay()
```

## Action Handling

Both components use the MOJO action system with automatic method resolution.

### Action Method Patterns

For `data-action="my-action"`, the framework looks for:

1. **Preferred**: `onActionMyAction(action, event, element)`
2. **Alternative**: `handleActionMyAction(action, event, element)` 
3. **Fallback**: `onActionDefault(action, event, element)`

```js
// In your View or Page class
async onActionNotifications(action, event, element) {
    const count = await this.getNotificationCount();
    this.showInfo(`You have ${count} notifications`);
}

async onActionDefault(action, event, element) {
    console.log(`Unhandled action: ${action}`);
    
    // Emit to app-level handler
    this.getApp().events.emit("portal:action", { action, event, element });
}
```

### Custom Handlers

Items can define inline handlers:

```js
{
    text: 'Custom Action',
    action: 'custom',
    handler: async (action, event, el) => {
        // Custom logic here
        console.log('Custom handler executed');
    }
}
```

## Styling and Themes

### Sidebar Themes

```js
// Light theme (default)
className: 'sidebar sidebar-light'

// Dark theme
className: 'sidebar sidebar-dark'

// Custom theme
className: 'sidebar sidebar-custom'
```

### TopNav Themes

```js
// Bootstrap navbar themes
theme: 'navbar-light bg-light'
theme: 'navbar-dark bg-dark' 
theme: 'navbar-dark bg-primary'

// Custom themes
theme: 'navbar-custom my-custom-class'
```

### CSS Customization

```css
/* Sidebar customization */
.sidebar-custom {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.sidebar-custom .nav-link {
    color: rgba(255,255,255,0.8);
}

.sidebar-custom .nav-link.active {
    color: white;
    background: rgba(255,255,255,0.1);
}

/* TopNav customization */  
.navbar-custom {
    background: #2c3e50 !important;
}

.navbar-custom .navbar-brand,
.navbar-custom .nav-link {
    color: #ecf0f1 !important;
}
```

## Responsive Behavior

### Auto-Collapse

Both components handle responsive behavior automatically:

```js
// Sidebar auto-collapses on mobile
sidebar: {
    autoCollapseMobile: true  // default
}

// TopNav collapses navigation on small screens
topbar: {
    responsive: true  // default
}
```

### Manual Control

```js
// Programmatically control sidebar
app.sidebar.collapse();        // Force collapse
app.sidebar.expand();          // Force expand
app.sidebar.toggleSidebar();   // Toggle state

// Check current state
const isCollapsed = app.sidebar.isCollapsedState();
const currentState = app.sidebar.getSidebarState();
```

## Integration Example

Complete portal application setup:

```js
import PortalApp from './src/app/PortalApp.js';

const app = new PortalApp({
    layout: 'portal',
    
    sidebar: {
        menus: [{
            name: "default",
            className: 'sidebar sidebar-light',
            header: '<div class="text-center py-3"><h5>Main Menu</h5></div>',
            items: [
                {
                    text: 'Dashboard',
                    route: '?page=dashboard',
                    icon: 'bi-speedometer2'
                },
                {
                    text: 'Tools',
                    icon: 'bi-tools',
                    children: [
                        {
                            text: 'Analytics',
                            route: '?page=analytics',
                            icon: 'bi-graph-up'
                        },
                        {
                            text: 'Reports',
                            route: '?page=reports', 
                            icon: 'bi-file-text'
                        }
                    ]
                }
            ]
        }]
    },
    
    topbar: {
        brand: 'My Portal',
        brandIcon: 'bi-house',
        brandRoute: '?page=home',
        theme: 'navbar-dark bg-primary',
        showSidebarToggle: true,
        
        rightItems: [
            {
                icon: 'bi-bell',
                action: 'notifications',
                buttonClass: 'btn btn-link text-white'
            }
        ],
        
        userMenu: {
            label: 'User',
            icon: 'bi-person-circle',
            items: [
                {
                    label: 'Profile',
                    action: 'profile',
                    icon: 'bi-person'
                },
                {
                    label: 'Logout',
                    action: 'logout',
                    icon: 'bi-box-arrow-right'
                }
            ]
        }
    }
});

// Handle portal actions
app.events.on('portal:action', ({ action, event, element }) => {
    switch (action) {
        case 'notifications':
            app.showInfo('You have 3 new notifications');
            break;
        case 'profile':
            app.router.navigate('?page=profile');
            break;
        case 'logout':
            // Handle logout logic
            break;
    }
});

app.start();
```

## Best Practices

### Menu Organization
- Keep menu depth to 2 levels maximum (parent → children)
- Group related functionality together
- Use consistent iconography
- Provide clear, descriptive labels

### Performance
- Use route-based navigation over actions when possible
- Implement lazy loading for complex menu items
- Cache menu configurations when switching frequently

### User Experience
- Always provide visual feedback for actions
- Use badges/notifications sparingly 
- Ensure keyboard navigation works
- Test responsive behavior across devices

### Accessibility  
- Include proper ARIA labels
- Maintain focus management
- Provide alternative text for icons
- Test with screen readers

## Common Patterns

### Dynamic Menu Updates

```js
// Add items dynamically
const menuConfig = app.sidebar.getMenuConfig('default');
menuConfig.items.push({
    text: 'New Feature',
    route: '?page=new-feature',
    icon: 'bi-plus-circle',
    badge: { text: 'NEW', class: 'badge bg-success' }
});
app.sidebar.updateMenu('default', menuConfig);

// Update based on user permissions
app.on('user-changed', (user) => {
    app.topnav.setUser(user);
    
    if (user.hasPermission('admin')) {
        app.sidebar.setActiveMenu('admin');
    }
});
```

### Route-Based Menu Switching

```js
// Automatically switch menus based on current route
app.router.on('route-changed', ({ route, page }) => {
    if (route.startsWith('/admin')) {
        app.sidebar.setActiveMenu('admin');
    } else if (route.includes('group=')) {
        const groupId = new URLSearchParams(route).get('group');
        const group = await app.findGroup(groupId);
        app.sidebar.showMenuForGroup(group);
    } else {
        app.sidebar.setActiveMenu('default');
    }
});
```

This comprehensive navigation system provides the foundation for building sophisticated portal applications with MOJO's component-based architecture.