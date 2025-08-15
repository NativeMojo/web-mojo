# MOJO Navigation Components

A comprehensive guide to MOJO's navigation components: TopNav, Sidebar, and MainContent. These components provide a complete navigation system for building responsive web applications.

## 🚀 Overview

MOJO provides three core navigation components that work together to create professional navigation interfaces:

- **TopNav** - Responsive Bootstrap navbar with brand, navigation items, and right-side content
- **Sidebar** - Collapsible left sidebar with navigation links and footer content
- **MainContent** - Content wrapper that adapts to sidebar presence with optional top toolbar

All components support the modern navigation system with href-based routing and data-page parameter passing.

## 📦 TopNav Component

A responsive Bootstrap 5 navbar component with full navigation integration.

### Features

- ✅ **Responsive Design** - Collapses to hamburger menu on mobile
- ✅ **Brand Area** - Configurable logo/brand with navigation
- ✅ **Navigation Items** - Array of navigation links with icons
- ✅ **Right Content** - Buttons, dropdowns, or custom content
- ✅ **Active States** - Automatic active link highlighting
- ✅ **Bootstrap Integration** - Full Bootstrap 5 navbar features

### Usage

```javascript
import TopNav from '../src/components/TopNav.js';

const topNav = new TopNav({
  data: {
    brandText: 'My Application',
    brandIcon: 'bi bi-house',
    brandRoute: '/',
    navItems: [
      { route: '/', text: 'Home', icon: 'bi bi-house' },
      { route: '/about', text: 'About', icon: 'bi bi-info-circle' },
      { route: '/contact', text: 'Contact', icon: 'bi bi-envelope' }
    ],
    rightItems: {
      items: [
        { 
          text: 'Login',
          href: '/login',
          isButton: true,
          buttonClass: 'btn btn-outline-light'
        }
      ]
    }
  }
});

await topNav.render('body', 'prepend');
```

### Configuration Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `brandText` | String | 'MOJO App' | Text displayed in navbar brand |
| `brandIcon` | String | 'bi bi-play-circle' | Icon class for brand |
| `brandRoute` | String | '/' | Route to navigate when brand is clicked |
| `navItems` | Array | [] | Array of navigation items |
| `rightItems` | Object | null | Right-side navigation items |

### Navigation Item Structure

```javascript
{
  route: '/path',           // Route to navigate to
  text: 'Display Text',     // Text to display
  icon: 'bi bi-icon',       // Bootstrap icon class (optional)
  active: false             // Whether this item is currently active
}
```

### Right Items Structure

```javascript
{
  items: [
    {
      text: 'Button Text',
      href: '/path',                    // For links
      action: 'actionName',            // For data-action buttons
      isButton: true,                  // Render as button vs link
      buttonClass: 'btn btn-primary',  // CSS classes for buttons
      icon: 'bi bi-icon'              // Optional icon
    }
  ]
}
```

### Methods

```javascript
// Update active navigation item
topNav.updateActiveItem('/current/route');

// Update navigation data
topNav.updateData({
  navItems: [...newItems]
});
```

## 📦 Sidebar Component

A collapsible left sidebar navigation component with responsive behavior.

### Features

- ✅ **Fixed Position** - Stays visible during content scrolling
- ✅ **Collapsible** - Can be collapsed to save space
- ✅ **Mobile Responsive** - Hidden by default on mobile, toggle to show
- ✅ **Brand Area** - Configurable branding section
- ✅ **Navigation Links** - Array of navigation items with icons
- ✅ **Footer Content** - Optional footer area for additional content
- ✅ **Auto CSS** - Automatically injects required CSS styles

### Usage

```javascript
import Sidebar from '../src/components/Sidebar.js';

const sidebar = new Sidebar({
  data: {
    brandText: 'MOJO Dashboard',
    brandSubtext: 'Admin Panel',
    brandIcon: 'bi bi-speedometer2',
    navItems: [
      { route: '/dashboard', text: 'Dashboard', icon: 'bi bi-speedometer2' },
      { route: '/users', text: 'Users', icon: 'bi bi-people' },
      { route: '/settings', text: 'Settings', icon: 'bi bi-gear' },
      { route: '/reports', text: 'Reports', icon: 'bi bi-bar-chart' }
    ],
    footerContent: `
      <button class="btn btn-outline-light w-100" data-action="logout">
        <i class="bi bi-box-arrow-right me-1"></i>
        Sign Out
      </button>
    `
  }
});

await sidebar.render('#sidebar-container');
```

### Configuration Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `brandText` | String | 'MOJO Sidebar' | Main brand text |
| `brandSubtext` | String | 'Navigation Example' | Subtitle text |
| `brandIcon` | String | 'bi bi-play-circle' | Icon class for brand |
| `navItems` | Array | [] | Array of navigation items |
| `footerContent` | String | null | HTML content for sidebar footer |

### Methods

```javascript
// Update active navigation item
sidebar.updateActiveItem('/current/route');

// Toggle sidebar visibility (mobile)
sidebar.toggle();

// Toggle collapsed state (desktop)
sidebar.collapse();

// Update sidebar data
sidebar.updateData({
  navItems: [...newItems]
});
```

### CSS Classes

The component automatically injects CSS with these key classes:

- `.sidebar` - Main sidebar container
- `.sidebar.collapsed` - Collapsed state
- `.sidebar.show` - Mobile visible state
- `.sidebar-brand` - Brand area styling
- `.sidebar-nav` - Navigation area
- `.sidebar-nav .nav-link` - Navigation link styling

## 📦 MainContent Component

A content wrapper component that works with the sidebar layout system.

### Features

- ✅ **Sidebar Integration** - Automatically adjusts margin for sidebar presence
- ✅ **Top Toolbar** - Optional toolbar with navigation controls
- ✅ **Responsive** - Adapts to sidebar state changes
- ✅ **Content Management** - Dynamic content updates
- ✅ **Expand/Collapse** - Integration with sidebar expand/collapse

### Usage

```javascript
import MainContent from '../src/components/MainContent.js';

const mainContent = new MainContent({
  data: {
    showTopBar: true,
    topBarContent: 'MOJO Application Dashboard',
    contentClass: 'p-4',
    content: '<h1>Welcome to the Dashboard</h1>'
  }
});

await mainContent.render('#main-container');

// Move app container into main content
const contentArea = mainContent.element.querySelector('[data-id="content"]');
const appContainer = document.getElementById('app');
contentArea.appendChild(appContainer);
```

### Configuration Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `showTopBar` | Boolean | true | Show/hide top toolbar |
| `topBarContent` | String | null | Content for top toolbar |
| `contentClass` | String | 'p-3' | CSS classes for content area |
| `content` | String | '' | Initial content HTML |

### Methods

```javascript
// Expand main content area (hide sidebar margin)
mainContent.expand();

// Collapse main content area (show sidebar margin)
mainContent.collapse();

// Set content dynamically
mainContent.setContent('<div>New content</div>');

// Update data
mainContent.updateData({
  topBarContent: 'New Title'
});
```

## 🎯 Integration Patterns

### Complete Navigation Setup

```javascript
class NavigationApp {
  constructor() {
    this.router = null;
    this.sidebar = null;
    this.mainContent = null;
    this.pages = [];
  }

  async initialize() {
    // Create navigation components
    this.sidebar = new Sidebar({
      data: {
        brandText: 'My App',
        navItems: [
          { route: '/', text: 'Home', icon: 'bi bi-house' },
          { route: '/users', text: 'Users', icon: 'bi bi-people' },
          { route: '/settings', text: 'Settings', icon: 'bi bi-gear' }
        ]
      }
    });

    this.mainContent = new MainContent({
      data: {
        topBarContent: 'Application Dashboard'
      }
    });

    // Render components
    await this.sidebar.render('#sidebar-container');
    await this.mainContent.render('#main-container');

    // Setup router
    this.router = new Router({
      mode: 'history',
      base: '/app',
      container: '#app'
    });

    // Move app into main content
    const contentArea = this.mainContent.element.querySelector('[data-id="content"]');
    const appContainer = document.getElementById('app');
    contentArea.appendChild(appContainer);

    // Register pages and routes
    this.pages = [new HomePage(), new UsersPage(), new SettingsPage()];
    this.pages.forEach(page => {
      this.router.addRoute(page.route, page);
    });

    // Make router globally accessible
    window.MOJO = window.MOJO || {};
    window.MOJO.router = this.router;

    // Auto-update active states
    this.router.addGuard('afterEach', (route) => {
      this.sidebar.updateActiveItem(route.path);
    });

    // Setup sidebar controls
    this.setupSidebarControls();

    // Start router
    this.router.start();
  }

  setupSidebarControls() {
    document.addEventListener('click', (event) => {
      const element = event.target.closest('[data-action]');
      if (!element) return;

      const action = element.dataset.action;

      if (action === 'toggle-sidebar') {
        event.preventDefault();
        this.sidebar.toggle();
      } else if (action === 'collapse-sidebar') {
        event.preventDefault();
        this.sidebar.collapse();
        this.mainContent.expand();
      }
    });
  }
}
```

### TopNav Only Setup

```javascript
class TopNavApp {
  async initialize() {
    // Create top navigation
    this.topNav = new TopNav({
      data: {
        brandText: 'My App',
        navItems: [
          { route: '/', text: 'Home', icon: 'bi bi-house' },
          { route: '/about', text: 'About', icon: 'bi bi-info-circle' },
          { route: '/contact', text: 'Contact', icon: 'bi bi-envelope' }
        ],
        rightItems: {
          items: [
            {
              text: 'Login',
              href: '/login',
              isButton: true,
              buttonClass: 'btn btn-outline-light'
            }
          ]
        }
      }
    });

    // Render navbar
    await this.topNav.render('body', 'prepend');

    // Setup router with clean container
    this.router = new Router({
      mode: 'history',
      container: '#app'
    });

    // Make globally accessible
    window.MOJO = window.MOJO || {};
    window.MOJO.router = this.router;

    // Auto-update active states
    this.router.addGuard('afterEach', (route) => {
      this.topNav.updateActiveItem(route.path);
    });
  }
}
```

## 🎨 Styling and Customization

### CSS Variables

Components support CSS custom properties for theming:

```css
:root {
  --sidebar-width: 250px;
  --sidebar-bg: #212529;
  --sidebar-text: #adb5bd;
  --sidebar-hover: #495057;
  --topnav-height: 56px;
}
```

### Custom Styling

```css
/* Sidebar customization */
.sidebar {
  width: var(--sidebar-width);
  background-color: var(--sidebar-bg);
}

.sidebar-nav .nav-link {
  color: var(--sidebar-text);
}

.sidebar-nav .nav-link:hover,
.sidebar-nav .nav-link.active {
  background-color: var(--sidebar-hover);
  color: white;
}

/* Main content customization */
.main-content {
  margin-left: var(--sidebar-width);
  min-height: calc(100vh - var(--topnav-height));
}
```

## 🧪 Examples

### Basic Navigation

```html
<!-- Simple top navigation -->
<div id="topnav-container"></div>
<div id="app" class="container mt-4"></div>

<script type="module">
  import TopNav from './src/components/TopNav.js';
  
  const nav = new TopNav({
    data: {
      brandText: 'My Site',
      navItems: [
        { route: '/', text: 'Home' },
        { route: '/about', text: 'About' }
      ]
    }
  });
  
  await nav.render('#topnav-container');
</script>
```

### Dashboard Layout

```html
<!-- Complete dashboard with sidebar -->
<div id="sidebar-container"></div>
<div id="main-container">
  <div id="app"></div>
</div>

<script type="module">
  import Sidebar from './src/components/Sidebar.js';
  import MainContent from './src/components/MainContent.js';
  
  // Create sidebar
  const sidebar = new Sidebar({
    data: {
      brandText: 'Dashboard',
      navItems: [
        { route: '/dashboard', text: 'Overview', icon: 'bi bi-speedometer2' },
        { route: '/analytics', text: 'Analytics', icon: 'bi bi-bar-chart' }
      ]
    }
  });
  
  // Create main content
  const mainContent = new MainContent({
    data: {
      showTopBar: true,
      topBarContent: 'Analytics Dashboard'
    }
  });
  
  await sidebar.render('#sidebar-container');
  await mainContent.render('#main-container');
</script>
```

## 🚀 Best Practices

### 1. Component Initialization

```javascript
// ✅ Good: Render components before router setup
await sidebar.render('#sidebar-container');
await mainContent.render('#main-container');

// Then setup router
this.router = new Router({...});
```

### 2. Router Integration

```javascript
// ✅ Good: Make router globally accessible
window.MOJO = window.MOJO || {};
window.MOJO.router = this.router;

// ✅ Good: Auto-update active states
this.router.addGuard('afterEach', (route) => {
  this.sidebar.updateActiveItem(route.path);
});
```

### 3. Navigation Items

```javascript
// ✅ Good: Consistent navigation item structure
const navItems = [
  { route: '/', text: 'Home', icon: 'bi bi-house' },
  { route: '/users', text: 'Users', icon: 'bi bi-people' }
];

// ✅ Good: Use semantic routes
{ route: '/user-management', text: 'Users' }

// ❌ Avoid: Non-semantic routes
{ route: '/page2', text: 'Users' }
```

### 4. Mobile Responsiveness

```javascript
// ✅ Good: Handle mobile sidebar properly
document.addEventListener('click', (event) => {
  // Close sidebar on mobile when clicking outside
  if (window.innerWidth <= 768 && 
      !sidebar.element.contains(event.target)) {
    sidebar.element.classList.remove('show');
  }
});
```

## 🐛 Troubleshooting

### Common Issues

**Sidebar Not Showing:**
```javascript
// Check if container exists
const container = document.querySelector('#sidebar-container');
if (!container) {
  console.error('Sidebar container not found');
}

// Check if CSS is injected
const styles = document.getElementById('mojo-sidebar-styles');
if (!styles) {
  console.error('Sidebar styles not injected');
}
```

**Navigation Not Working:**
```javascript
// Ensure router is globally accessible
if (!window.MOJO?.router) {
  console.error('Router not globally accessible');
}

// Check navigation item structure
const validItem = { route: '/path', text: 'Text' };
```

**Active States Not Updating:**
```javascript
// Ensure router guard is set up
this.router.addGuard('afterEach', (route) => {
  this.sidebar.updateActiveItem(route.path);
  this.topNav.updateActiveItem(route.path);
});
```

## 📚 API Reference

### TopNav API

```javascript
// Constructor
new TopNav(options)

// Methods
updateActiveItem(route)        // Update active navigation item
updateData(data)              // Update component data
render(container, position)    // Render component

// Events
// Navigation handled automatically by View base class
```

### Sidebar API

```javascript
// Constructor
new Sidebar(options)

// Methods
updateActiveItem(route)        // Update active navigation item
toggle()                      // Toggle mobile visibility
collapse()                    // Toggle collapsed state
updateData(data)              // Update component data
addSidebarStyles()            // Inject CSS styles

// Events
// Navigation handled automatically by View base class
```

### MainContent API

```javascript
// Constructor
new MainContent(options)

// Methods
expand()                      // Expand content area
collapse()                    // Collapse content area
setContent(html)              // Set content area HTML
updateData(data)              // Update component data
addMainContentStyles()        // Inject CSS styles
```

---

**MOJO Navigation Components v2.0.0** - Professional navigation for modern web applications.