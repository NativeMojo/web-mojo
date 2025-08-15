# Router Param Mode

**Param Mode** is MOJO's default routing mode that uses query parameters to handle client-side navigation without requiring server configuration. It's the perfect solution for static deployments while maintaining professional, SEO-friendly URLs.

## Overview

Param mode uses the `?page=pagename` URL format to handle routing, making it ideal for:
- **Static file servers** (GitHub Pages, Netlify, Vercel, etc.)
- **CDN deployments** without server-side configuration
- **Professional business applications** with clean, understandable URLs
- **SEO optimization** as search engines crawl query parameters

## URL Format Examples

```bash
# Home page
https://myapp.com/?page=home
# or simply
https://myapp.com/

# Dashboard
https://myapp.com/?page=dashboard

# User profile with parameters
https://myapp.com/?page=user&id=123&tab=profile

# Complex business URLs
https://myapp.com/?page=reports&view=analytics&period=month&filter=active
```

## Why Param Mode Over Hash Mode?

| Aspect | Param Mode | Hash Mode | Winner |
|--------|------------|-----------|---------|
| **Professional Look** | `?page=dashboard` | `#/dashboard` | ✅ Param |
| **SEO Friendly** | ✅ Crawlable | ❌ Not crawlable | ✅ Param |
| **Server Config** | ❌ Not needed | ❌ Not needed | 🤝 Tie |
| **Bookmarkable** | ✅ Full URL works | ⚠️ Limited | ✅ Param |
| **Business Context** | ✅ Query params familiar | ❌ Hash looks dated | ✅ Param |
| **URL Sharing** | ✅ Clean sharing | ⚠️ Hash fragments | ✅ Param |

## Configuration

### Default Configuration (Recommended)

```javascript
// Param mode is the default - no configuration needed
const router = new Router();

// Or explicitly
const router = new Router({
    mode: 'param',          // Uses ?page=pagename
    pageParam: 'page',      // Query parameter name
    container: '#app'       // Render container
});
```

### Custom Page Parameter

```javascript
// Use a different parameter name
const router = new Router({
    mode: 'param',
    pageParam: 'route',     // Uses ?route=pagename instead
    container: '#app'
});

// Results in URLs like: ?route=dashboard&view=analytics
```

## How It Works

### URL Generation

```javascript
// Router automatically generates URLs
router.buildUrl('/dashboard');        // → ?page=dashboard
router.buildUrl('/');                // → ?page=home
router.buildUrl('/users');           // → ?page=users

// With existing query parameters preserved
// Current URL: ?page=home&theme=dark
router.buildUrl('/settings');        // → ?page=settings&theme=dark
```

### URL Parsing

```javascript
// Router extracts page from URL
// URL: ?page=dashboard&tab=analytics&filter=active
router.getCurrentPath();              // → '/dashboard'

// Page parameter is automatically filtered from route queries
page.on_params(params, query);
// params: {} (route parameters)
// query: { tab: 'analytics', filter: 'active' } // 'page' filtered out
```

## Navigation Integration

### HTML Navigation (Recommended)

```html
<!-- Standard href navigation - automatically intercepted -->
<a href="/?page=home">Home</a>
<a href="/?page=dashboard">Dashboard</a>
<a href="/?page=user&id=123">User Profile</a>

<!-- Enhanced data-page navigation -->
<button data-page="settings" data-params='{"tab": "account"}'>Settings</button>
```

### Programmatic Navigation

```javascript
// Navigate by path
await router.navigate('/dashboard');

// Navigate by page name with parameters
await router.navigateToPage('user', { id: 123, tab: 'profile' });

// Replace current URL
await router.replace('/settings');
```

## Page Parameter Filtering

One of the key features of param mode is **automatic page parameter filtering**:

```javascript
class DashboardPage extends Page {
    constructor() {
        super({
            page_name: 'Dashboard',
            route: '/dashboard'
        });
    }

    // Page parameter is automatically filtered
    on_params(params, query) {
        // URL: ?page=dashboard&view=analytics&period=month&filter=active
        
        console.log(params);  // {} (route parameters)
        console.log(query);   // {
                             //   view: 'analytics',
                             //   period: 'month', 
                             //   filter: 'active'
                             //   // 'page' parameter automatically filtered out
                             // }
    }
}
```

This ensures clean separation between:
- **Routing logic** (handled by the `page` parameter)
- **Business logic** (all other query parameters)

## Deployment Advantages

### Static File Servers

```bash
# Works perfectly with any static server
npx serve dist/
python -m http.server 8000
# Apache, Nginx static files
# GitHub Pages, Netlify, Vercel
```

### No Server Configuration

Unlike history mode, param mode requires **zero server configuration**:

```javascript
// ❌ History mode - requires server config
const router = new Router({ mode: 'history' });
// Needs server rewrite rules for /dashboard → /index.html

// ✅ Param mode - works everywhere
const router = new Router({ mode: 'param' });
// No server config needed - ?page=dashboard just works
```

## SEO Benefits

Search engines properly crawl and index param mode URLs:

```html
<!-- SEO-friendly URLs -->
<meta property="og:url" content="https://myapp.com/?page=dashboard&view=analytics">
<link rel="canonical" href="https://myapp.com/?page=products&category=electronics">

<!-- Social media sharing works perfectly -->
<a href="https://myapp.com/?page=report&id=2024-q1">Share Q1 Report</a>
```

## Migration Guide

### From Hash Mode

```javascript
// Before (hash mode)
const router = new Router({ mode: 'hash' });
// URLs: #/dashboard, #/users/123

// After (param mode) 
const router = new Router({ mode: 'param' });
// URLs: ?page=dashboard, ?page=users&id=123

// Navigation code stays the same!
router.navigate('/dashboard');
```

### From History Mode

```javascript
// Before (history mode - requires server config)
const router = new Router({ mode: 'history' });

// After (param mode - no server config needed)
const router = new Router({ mode: 'param' });

// Same navigation API
router.navigate('/dashboard');
```

## Advanced Usage

### Custom Parameter Handling

```javascript
class AdvancedPage extends Page {
    on_params(params, query) {
        // Handle business parameters (page param already filtered)
        const { view, filter, sort, page: pageNum } = query;
        
        this.updateView(view);
        this.applyFilter(filter);
        this.setSorting(sort);
        this.goToPage(pageNum || 1);
    }
}
```

### Multi-Parameter URLs

```javascript
// Complex business application URLs
const url = router.buildUrl('/reports');
// With additional parameters: ?page=reports&type=sales&period=2024-q1&format=chart&team=west

// Clean, professional, and functional
```

## Best Practices

### 1. Use Semantic Page Names

```javascript
// ✅ Good
router.registerPageName('dashboard', '/dashboard');
router.registerPageName('user-profile', '/users/:id');
router.registerPageName('analytics', '/reports/analytics');

// ❌ Avoid
router.registerPageName('page1', '/dashboard');
router.registerPageName('usr', '/users/:id');
```

### 2. Design for Business Context

```javascript
// ✅ Business-friendly URLs
?page=customer-dashboard&view=orders&status=pending
?page=inventory&category=electronics&sort=stock-level
?page=reports&type=sales&period=month&region=north

// Clear, professional, understandable by business users
```

### 3. Preserve Query Parameters

```javascript
// Router automatically preserves non-page parameters
// Current: ?page=home&theme=dark&lang=en
router.navigate('/settings');
// Result: ?page=settings&theme=dark&lang=en
```

## Testing

Param mode is fully tested with comprehensive unit tests covering:

- ✅ URL generation and parsing
- ✅ Parameter filtering
- ✅ Navigation integration
- ✅ Route matching
- ✅ Error handling
- ✅ Compatibility with other modes

## Browser Support

Param mode works in all modern browsers:
- ✅ Chrome/Edge (all versions)
- ✅ Firefox (all versions)
- ✅ Safari (all versions)
- ✅ Mobile browsers
- ✅ IE11+ (if needed)

## Conclusion

Param mode represents the best of both worlds:
- **Professional URLs** that business users understand
- **Zero server configuration** for easy deployment
- **SEO-friendly** for better search visibility  
- **Clean code separation** between routing and business logic

It's the perfect default choice for modern JavaScript applications that need to work everywhere while maintaining professional standards.