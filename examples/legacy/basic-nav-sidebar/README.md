# MOJO Navigation System

This example demonstrates the MOJO framework's comprehensive navigation system featuring modern href-based routing, enhanced data-page navigation, and responsive UI components.

## 🚀 Navigation Approaches

MOJO supports two complementary navigation approaches:

### 1. **href Navigation** (Primary - SEO Friendly)
Modern, standards-compliant navigation with proper URLs
- ✅ **Copy link support** - Right-click → copy link works
- ✅ **SEO friendly** - Search engines see real URLs  
- ✅ **Browser features** - Ctrl+click, middle-click open in new tabs
- ✅ **Accessibility** - Screen readers understand proper links
- ✅ **Progressive enhancement** - Works without JavaScript

### 2. **data-page Navigation** (Enhanced - With Parameters)  
Page-name routing with rich parameter passing
- ✅ **Page name routing** - Navigate by semantic names
- ✅ **Parameter passing** - Rich data via `data-params`
- ✅ **Dynamic data** - JSON parameter objects
- ✅ **Flexible routing** - Route by name, not URL structure

## 📦 Navigation Components

### TopNav Component
A Bootstrap-based top navigation bar with responsive collapsing behavior.

**Features:**
- Responsive Bootstrap navbar with href-based navigation
- Configurable brand and navigation items
- Active state management via router guards
- Support for right-side items (buttons/links)
- Automatic route interception and handling

### Sidebar Component
A collapsible left sidebar navigation with responsive behavior.

**Features:**
- Fixed position sidebar with smooth animations
- Mobile-responsive (collapses on small screens)
- href-based navigation with proper URLs
- Active state management
- Configurable branding area
- Footer content support
- Auto-injected CSS styles

### MainContent Component
A content wrapper that works with the sidebar layout.

**Features:**
- Automatic margin adjustment for sidebar
- Optional top toolbar with navigation controls
- Responsive behavior
- Content area management
- Expand/collapse integration with sidebar

## 🎯 Navigation Usage Examples

### 1. Standard href Navigation (Primary Approach)

The cleanest, most SEO-friendly way to navigate:

```html
<!-- Clean, semantic navigation -->
<a href="/">Home</a>
<a href="/about">About Us</a>
<a href="/users/123">User Profile</a>
<a href="/settings">Settings</a>

<!-- External links (not intercepted by router) -->
<a href="https://example.com">External Site</a>
<a href="../" data-external>Back to Examples</a>
<a href="mailto:support@example.com">Email Support</a>
```

**Benefits:**
- Right-click → copy link gives real URLs
- Ctrl+click opens in new tab
- SEO crawlers see proper navigation
- Works without JavaScript (progressive enhancement)
- Accessible to screen readers

### 2. Enhanced data-page Navigation

For complex navigation with parameters:

```html
<!-- Navigate by page name -->
<button data-page="home">Go Home</button>
<div data-page="settings" class="nav-card">Settings Panel</div>

<!-- Navigate with parameters -->
<button data-page="user" data-params='{"id": 123, "tab": "profile"}'>
    View User Profile
</button>

<!-- Complex parameter objects -->
<a href="/dashboard" 
   data-page="dashboard" 
   data-params='{"filters": {"status": "active"}, "sort": "name", "view": "grid"}'>
    Dashboard
</a>
```

**Benefits:**
- Navigate by semantic page names
- Pass rich parameter objects
- Flexible routing independent of URL structure
- Dynamic parameter generation

### 3. Component Usage

#### TopNav Component

```javascript
import TopNav from '../../src/components/TopNav.js';

const topNav = new TopNav({
    data: {
        brandText: 'My App',
        brandIcon: 'bi bi-house',
        brandRoute: '/',
        navItems: [
            { route: '/', text: 'Home', icon: 'bi bi-house', active: true },
            { route: '/about', text: 'About', icon: 'bi bi-info-circle' },
            { route: '/contact', text: 'Contact', icon: 'bi bi-envelope' }
        ],
        rightItems: {
            items: [
                { 
                    href: '/login', 
                    text: 'Login',
                    isButton: true,
                    buttonClass: 'btn btn-sm btn-outline-light'
                }
            ]
        }
    }
});

await topNav.render('body', 'prepend');
```

### Sidebar Component

```javascript
import Sidebar from '../../src/components/Sidebar.js';

const sidebar = new Sidebar({
    data: {
        brandText: 'My App',
        brandSubtext: 'Dashboard',
        brandIcon: 'bi bi-grid',
        navItems: [
            { route: '/', text: 'Dashboard', icon: 'bi bi-speedometer2' },
            { route: '/users', text: 'Users', icon: 'bi bi-people' },
            { route: '/settings', text: 'Settings', icon: 'bi bi-gear' }
        ],
        footerContent: `
            <button class="btn btn-sm btn-outline-light w-100">
                Sign Out
            </button>
        `
    }
});

await sidebar.render('#sidebar-container');
```

### MainContent Component

```javascript
import MainContent from '../../src/components/MainContent.js';

const mainContent = new MainContent({
    data: {
        showTopBar: true,
        topBarContent: 'My Application Dashboard',
        contentClass: 'p-4'
    }
});

await mainContent.render('#main-container');

// Set content dynamically
mainContent.setContent('<h1>Welcome to the Dashboard</h1>');
```

## 🛠️ Complete Integration Example

```javascript
class DashboardApp {
    constructor() {
        this.sidebar = null;
        this.mainContent = null;
        this.router = null;
        this.pages = [];
    }

    async initialize() {
        // Create sidebar with href-based navigation
        this.sidebar = new Sidebar({
            data: {
                brandText: 'MOJO Dashboard',
                navItems: [
                    { route: '/', text: 'Home', icon: 'bi bi-house' },
                    { route: '/users', text: 'Users', icon: 'bi bi-people' },
                    { route: '/settings', text: 'Settings', icon: 'bi bi-gear' }
                ]
            }
        });

        // Create main content with navigation controls
        this.mainContent = new MainContent({
            data: {
                topBarContent: 'Dashboard Application'
            }
        });

        // Render components
        await this.sidebar.render('#sidebar-container');
        await this.mainContent.render('#main-container');

        // Move app container inside main content
        const contentArea = this.mainContent.element.querySelector('[data-id="content"]');
        const appContainer = document.getElementById('app');
        contentArea.appendChild(appContainer);

        // Setup router
        this.router = new Router({
            mode: 'history',
            base: '/examples/dashboard',
            container: '#app'
        });

        // Create and register pages
        this.pages = [
            new HomePage(),
            new UsersPage(), 
            new SettingsPage()
        ];

        this.pages.forEach(page => {
            this.router.addRoute(page.route, page);
        });

        // Make router globally accessible for navigation
        window.MOJO = window.MOJO || {};
        window.MOJO.router = this.router;

        // Add navigation state management
        this.router.addGuard('afterEach', (route) => {
            this.sidebar.updateActiveItem(route.path);
        });

        // Setup sidebar toggle handlers (non-navigation actions)
        this.setupSidebarHandlers();

        // Start router
        this.router.start();
    }

    setupSidebarHandlers() {
        // Handle sidebar-specific actions (not navigation)
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

### Page with Parameter Handling

```javascript
class UsersPage extends Page {
    constructor() {
        super({
            page_name: 'Users',
            route: '/users/:id?',
            title: 'Users Directory'
        });
    }

    async getTemplate() {
        return `
            <div class="container">
                <h1>Users Directory</h1>
                
                <!-- Standard href navigation -->
                <a href="/users/123" class="btn btn-primary">View User 123</a>
                <a href="/users/456" class="btn btn-primary">View User 456</a>
                
                <!-- data-page navigation with parameters -->
                <button data-page="users" data-params='{"id": 789, "tab": "profile"}' class="btn btn-success">
                    User 789 Profile
                </button>
                
                <button data-page="users" data-params='{"filter": "active", "sort": "name"}' class="btn btn-info">
                    Active Users
                </button>
            </div>
        `;
    }

    // Handle both URL params and data-page params
    on_params(params = {}, query = {}) {
        console.log('URL params:', params); // From route: /users/123
        console.log('Query params:', query); // From ?tab=profile
        console.log('Navigation params:', params); // From data-params

        // Handle different parameter sources
        if (params.id) {
            this.loadUser(params.id);
        }
        
        if (params.tab) {
            this.showTab(params.tab);
        }
        
        if (params.filter) {
            this.applyFilter(params.filter);
        }
    }
}
```

## ⚙️ Advanced Navigation Features

### Automatic Router Integration

The View class automatically handles navigation for you:

```javascript
// No manual event handlers needed - this works automatically:
// <a href="/about">About</a>
// <button data-page="settings">Settings</button>

class MyPage extends Page {
    constructor() {
        super({
            page_name: 'MyPage',
            route: '/my-page'
        });
    }
    
    // Navigation is automatically intercepted and routed
    // No additional code needed for basic navigation
}
```

### Navigation Precedence

When multiple navigation attributes are present:

```html
<!-- data-page takes precedence over href -->
<a href="/fallback" data-page="settings" data-params='{"tab": "account"}'>
    Settings (uses data-page)
</a>

<!-- Modern href navigation -->
<a href="/about">About</a>

<!-- External links bypass router -->
<a href="https://example.com" data-external>External</a>
```

### Parameter Processing

data-params accepts JSON objects:

```javascript
// In your page's on_params method:
on_params(params = {}, query = {}) {
    // URL route params: /users/123
    console.log('Route ID:', params.id);
    
    // Query string: ?tab=profile&sort=name
    console.log('Query tab:', query.tab);
    console.log('Query sort:', query.sort);
    
    // data-params: '{"highlight": "new", "view": "grid"}'
    console.log('Page params:', params.highlight, params.view);
}
```

## 🔧 Component Configuration

### TopNav Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `brandText` | String | 'MOJO App' | Text displayed in navbar brand |
| `brandIcon` | String | 'bi bi-play-circle' | Icon class for brand |
| `brandRoute` | String | '/' | Route to navigate when brand is clicked |
| `navItems` | Array | [] | Array of navigation items |
| `rightItems` | Object | null | Right-side navigation items |

### Sidebar Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `brandText` | String | 'MOJO Sidebar' | Main brand text |
| `brandSubtext` | String | 'Navigation Example' | Subtitle text |
| `brandIcon` | String | 'bi bi-play-circle' | Icon class for brand |
| `navItems` | Array | [] | Array of navigation items |
| `footerContent` | String | null | HTML content for sidebar footer |

### MainContent Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `showTopBar` | Boolean | true | Show/hide top toolbar |
| `topBarContent` | String | null | Content for top toolbar |
| `contentClass` | String | 'p-3' | CSS classes for content area |
| `content` | String | '' | Initial content HTML |

## Navigation Item Structure

```javascript
{
    route: '/path',        // Route to navigate to
    text: 'Display Text',  // Text to show
    icon: 'bi bi-icon',    // Bootstrap icon class
    active: false          // Whether this item is active
}
```

## Methods

### Sidebar Methods
- `updateActiveItem(route)` - Updates active navigation item
- `toggle()` - Toggles sidebar visibility (mobile)
- `collapse()` - Toggles sidebar collapsed state

### MainContent Methods
- `expand()` - Expands main content area
- `collapse()` - Collapses main content area
- `setContent(html)` - Sets content area HTML

### TopNav Methods
- `updateActiveItem(route)` - Updates active navigation item

## Responsive Behavior

- **Mobile (< 768px)**: Sidebar is hidden by default, can be toggled
- **Desktop**: Sidebar is visible, can be collapsed to save space
- **TopNav**: Uses Bootstrap's responsive navbar with hamburger menu

## CSS Classes

The components automatically inject required CSS. Key classes:

- `.sidebar` - Main sidebar container
- `.sidebar.collapsed` - Collapsed sidebar state
- `.sidebar.show` - Mobile visible state
- `.main-content` - Main content container
- `.main-content.expanded` - Expanded main content

## Integration with Router

Components work seamlessly with MOJO Router:

```javascript
// Update active states when route changes
router.addGuard('afterEach', (route) => {
    sidebar.updateActiveItem(route.path);
});
```

## Best Practices

1. **Always render sidebar first**, then main content
2. **Move app container** into main content area after rendering
3. **Use consistent navigation items** structure across components
4. **Handle mobile responsiveness** with appropriate event listeners
5. **Update active states** when routes change

## 🎯 Best Practices

### 1. **Use href as Primary Navigation**
```html
<!-- ✅ Good: SEO-friendly, copy-link support -->
<a href="/dashboard">Dashboard</a>

<!-- For enhanced navigation with parameters -->
<button data-page="dashboard" data-params='{"tab": "analytics"}'>Dashboard</button>
```

### 2. **Use data-page for Enhanced Features**
```html
<!-- ✅ Good: When you need parameters -->
<button data-page="user" data-params='{"id": 123, "tab": "settings"}'>User Settings</button>

<!-- ✅ Good: For non-URL navigation -->
<div data-page="modal-settings" class="nav-card">Settings</div>
```

### 3. **Handle External Links Properly**
```html
<!-- ✅ Good: Prevents router interception -->
<a href="https://docs.example.com" data-external>Documentation</a>
<a href="../" data-external>Parent Directory</a>
<a href="mailto:support@example.com">Email Support</a>
```

### 4. **Preserve Browser Features**
The system automatically preserves:
- **Ctrl+Click** - Opens in new tab
- **Middle-Click** - Opens in new tab  
- **Right-Click** - Shows context menu with "Copy link"
- **Shift+Click** - Opens in new window

## 🐛 Troubleshooting

### Common Issues

**Navigation Not Working:**
```javascript
// Ensure router is globally accessible
window.MOJO = window.MOJO || {};
window.MOJO.router = this.router;
```

**Copy Link Not Working:**
```html
<!-- ✅ Use proper href attributes -->
<a href="/about">About</a>

<!-- ✅ Use data-page for enhanced navigation -->
<button data-page="about" data-params='{"highlight": "intro"}'>About</button>
```

**Parameters Not Received:**
```javascript
// Check JSON syntax in data-params
<button data-page="users" data-params='{"id": 123}'>User</button>
                                      <!-- ↑ Valid JSON -->
```

**External Links Being Intercepted:**
```html
<!-- Add data-external attribute -->
<a href="https://example.com" data-external>External</a>
```

## 🚀 Live Demo

Run this example:
```bash
npm run dev
```

Then visit: `http://localhost:3000/examples/basic-nav-sidebar/`

### What to Try:

1. **Test href Navigation**: Click navigation links and see clean URLs
2. **Try Copy Link**: Right-click any navigation link → Copy Link
3. **Test Browser Features**: Ctrl+click, middle-click navigation links
4. **Try data-page**: Use buttons with parameters in the home page examples
5. **Mobile Responsive**: Test sidebar collapse on mobile screens
