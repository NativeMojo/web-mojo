# MOJO Router Documentation

The MOJO Router is a powerful, flexible client-side routing system that supports multiple routing modes for different deployment scenarios.

## 🚀 Quick Start

```javascript
// Default configuration (param mode for static serving)
const router = new Router();

// Add routes
router.addRoute('/', HomePage);
router.addRoute('/dashboard', DashboardPage);
router.addRoute('/users/:id', UserDetailPage);

// Start the router
router.start();
```

## 📊 Routing Modes

MOJO Router supports three routing modes, each optimized for different deployment scenarios:

### 🎯 Param Mode (Default)
**Perfect for static deployments**
- **URLs**: `?page=dashboard&view=analytics`
- **Server Config**: ❌ Not required
- **SEO**: ✅ Search engine friendly
- **Professional**: ✅ Business-appropriate URLs
- **Use Case**: Static sites, GitHub Pages, CDN deployments

📚 **[Complete Param Mode Guide →](param-mode.md)**

### 🏛️ History Mode
**Clean URLs with server support**
- **URLs**: `/dashboard/analytics`
- **Server Config**: ✅ Required (URL rewriting)
- **SEO**: ✅ Excellent
- **Professional**: ✅ Clean paths
- **Use Case**: Traditional web servers, SPA deployments

### 🔗 Hash Mode
**Legacy compatibility**
- **URLs**: `#/dashboard/analytics`
- **Server Config**: ❌ Not required
- **SEO**: ❌ Limited crawling
- **Professional**: ⚠️ Looks dated
- **Use Case**: Legacy browser support, simple hosting

## 📖 Documentation

### Core Documentation
- **[Param Mode Guide](param-mode.md)** - Complete guide to param mode routing
- **[Implementation Details](param-mode-implementation.md)** - Technical implementation summary

### API Reference
- **Router Configuration** - Constructor options and settings
- **Navigation Methods** - Programmatic navigation API
- **Route Matching** - Pattern matching and parameters
- **Guards & Middleware** - Route protection and lifecycle hooks

## 🎯 Why Param Mode is Default

Param mode represents the best balance of features for modern web applications:

| Feature | Param Mode | History Mode | Hash Mode |
|---------|------------|--------------|-----------|
| **No Server Config** | ✅ | ❌ | ✅ |
| **SEO Friendly** | ✅ | ✅ | ❌ |
| **Professional URLs** | ✅ | ✅ | ❌ |
| **Universal Deploy** | ✅ | ❌ | ✅ |
| **Business Context** | ✅ | ✅ | ❌ |

## 🛠️ Configuration Examples

### Static Deployment (Recommended)
```javascript
// Perfect for GitHub Pages, Netlify, CDN
const router = new Router({
    mode: 'param',          // Default
    pageParam: 'page',      // ?page=pagename
    container: '#app'
});
```

### Server Deployment
```javascript
// For traditional web servers
const router = new Router({
    mode: 'history',
    base: '/app',           // App base path
    container: '#app'
});
```

### Legacy Support
```javascript
// For older browser compatibility
const router = new Router({
    mode: 'hash',
    container: '#app'
});
```

## 🧭 Navigation Patterns

### HTML Navigation (Recommended)
```html
<!-- Automatic router interception -->
<a href="/?page=dashboard">Dashboard</a>
<a href="/?page=user&id=123">User Profile</a>

<!-- Enhanced with parameters -->
<button data-page="settings" data-params='{"tab": "account"}'>Settings</button>
```

### Programmatic Navigation
```javascript
// Navigate to pages
await router.navigate('/dashboard');
await router.navigateToPage('user', { id: 123 });

// Replace current page
await router.replace('/settings');

// History navigation
router.back();
router.forward();
```

## 🎨 Integration with MOJO Components

### Page Components
```javascript
class DashboardPage extends Page {
    constructor() {
        super({
            page_name: 'Dashboard',     // For data-page navigation
            route: '/dashboard',        // URL pattern
            title: 'Dashboard'          // Page title
        });
    }

    // Automatic parameter filtering in param mode
    on_params(params, query) {
        // URL: ?page=dashboard&view=analytics&filter=active
        // query: { view: 'analytics', filter: 'active' }
        // 'page' parameter automatically filtered out
    }
}
```

### View Components
```javascript
class NavComponent extends View {
    async getTemplate() {
        return `
            <nav class="navbar">
                <!-- Router automatically handles these -->
                <a href="/?page=home">Home</a>
                <a href="/?page=dashboard">Dashboard</a>
                <button data-page="settings">Settings</button>
            </nav>
        `;
    }
}
```

## 📈 SEO & Analytics

### SEO Benefits
```html
<!-- Param mode URLs are SEO-friendly -->
<meta property="og:url" content="https://myapp.com/?page=dashboard&view=analytics">
<link rel="canonical" href="https://myapp.com/?page=products&category=electronics">
```

### Analytics Integration
```javascript
// Clean parameter structure for tracking
router.addGuard('afterEach', (route, params, query) => {
    analytics.track('page_view', {
        page: route.path.replace('/', ''),
        ...query  // Business parameters (page param filtered)
    });
});
```

## 🚀 Deployment Guide

### Static Hosting
```bash
# Build the application
npm run build

# Deploy to any static host
# ✅ GitHub Pages
# ✅ Netlify  
# ✅ Vercel
# ✅ AWS S3 + CloudFront
# ✅ Any CDN or static server

# No server configuration needed!
```

### Traditional Servers
```bash
# For history mode, configure URL rewriting
# Apache .htaccess:
RewriteRule ^(.*)$ /index.html [QSA,L]

# Nginx:
try_files $uri $uri/ /index.html;
```

## 🧪 Testing

Router functionality is comprehensively tested:

```bash
# Run router-specific tests
npm test test/unit/Router.test.js

# Run all tests
npm test
```

## 🔄 Migration Guide

### From Hash Mode to Param Mode
```javascript
// Before (hash mode)
const router = new Router({ mode: 'hash' });
// URLs: #/dashboard

// After (param mode - default)
const router = new Router();
// URLs: ?page=dashboard

// Same navigation API - no code changes needed!
```

### From History Mode to Param Mode
```javascript
// Before (history mode - needs server config)
const router = new Router({ mode: 'history' });

// After (param mode - no server config)
const router = new Router({ mode: 'param' });

// Remove server URL rewriting rules
// Same navigation code works
```

## 🤝 Contributing

When contributing to router functionality:

1. **Maintain backward compatibility** - all modes must continue working
2. **Add comprehensive tests** - cover new functionality thoroughly  
3. **Update documentation** - keep all docs current
4. **Follow param mode patterns** - it's the recommended default

## 📚 Learn More

- **[MOJO Framework Guide](../user-guide/a_prompt_default.md)** - Complete framework overview
- **[Component Documentation](../components/)** - View and Page components
- **[Examples](../../examples/)** - Working example applications
- **[Testing Guide](../testing/)** - Testing best practices

---

**MOJO Router** - Modern, flexible, and deployment-ready routing for JavaScript applications.