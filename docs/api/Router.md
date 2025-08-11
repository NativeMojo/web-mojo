# Router API Documentation

## Overview

The Router class provides client-side routing functionality for MOJO applications. It supports multiple routing modes (history, hash, param), automatic route matching, parameter extraction, and navigation guards.

## Constructor

```javascript
const router = new Router(options)
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | string | `'history'` | Routing mode: `'history'`, `'hash'`, or `'param'` |
| `base` | string | `''` | Base path for all routes |
| `container` | string/element | `null` | Container element for rendering pages |
| `notFoundHandler` | function | `null` | Handler for 404 errors |
| `errorHandler` | function | `null` | Handler for routing errors |
| `guards` | object | `{}` | Navigation guards |
| `scrollBehavior` | function | `null` | Custom scroll behavior on navigation |

## Methods

### addRoute()

Registers a new route. Supports two signatures for flexible route registration.

#### Signature 1: Traditional (Explicit Path)

```javascript
router.addRoute(path, handler, options)
```

**Parameters:**
- `path` (string) - The route path pattern
- `handler` (class/function) - Page class or handler function
- `options` (object) - Optional route configuration

**Example:**
```javascript
// Explicit path registration
router.addRoute('/users', UsersPage);
router.addRoute('/user/:id', UserDetailPage);
router.addRoute('/products', ProductsPage, { 
  name: 'products',
  meta: { requiresAuth: true }
});
```

#### Signature 2: Automatic Path (New)

```javascript
router.addRoute(handler, options)
```

**Parameters:**
- `handler` (class) - Page class with `pageName` property
- `options` (object) - Optional route configuration

The path is automatically derived from the handler's `pageName` property:
- `pageName: 'users'` → `/users`
- `pageName: 'userProfile'` → `/user-profile`
- `pageName: 'productDetails'` → `/product-details`

**Example:**
```javascript
// Define pages with pageName
class UsersPage extends Page {
  constructor() {
    super({
      pageName: 'users',  // Will create route: /users
      title: 'User Management'
    });
  }
}

class UserProfilePage extends Page {
  constructor() {
    super({
      pageName: 'userProfile',  // Will create route: /user-profile
      title: 'User Profile'
    });
  }
}

// Register routes automatically
router
  .addRoute(UsersPage)           // Creates: /users
  .addRoute(UserProfilePage)     // Creates: /user-profile
  .addRoute(ProductsPage)        // Creates: /products (from pageName)
  .addRoute(DashboardPage);      // Creates: /dashboard (from pageName)

// Mix both styles if needed
router
  .addRoute(HomePage)                    // Auto: /home
  .addRoute('/custom-path', CustomPage)  // Explicit: /custom-path
  .addRoute(SettingsPage, {              // Auto with options
    meta: { requiresAuth: true }
  });
```

### navigate()

Navigate to a route programmatically.

```javascript
await router.navigate(path, params, options)
```

**Parameters:**
- `path` (string) - The path to navigate to
- `params` (object) - Optional route parameters
- `options` (object) - Navigation options

**Example:**
```javascript
// Simple navigation
await router.navigate('/users');

// With parameters
await router.navigate('/user/123');

// With query parameters
await router.navigate('/users', { filter: 'active', page: 2 });

// With options
await router.navigate('/dashboard', {}, { replace: true });
```

### navigateToPage()

Navigate using page name (for data-page support).

```javascript
await router.navigateToPage(pageName, params)
```

**Example:**
```javascript
// Navigate by page name
await router.navigateToPage('users');
await router.navigateToPage('userProfile', { id: 123 });
```

### getCurrentPath()

Get the current route path.

```javascript
const path = router.getCurrentPath();
// Returns: '/users' or '/user/123'
```

### getCurrentUrl()

Get the complete current URL.

```javascript
const url = router.getCurrentUrl();
// Returns: 'http://example.com/app/users?page=2'
```

### parseQuery()

Parse current query string parameters.

```javascript
const query = router.parseQuery();
// URL: /users?status=active&page=2
// Returns: { status: 'active', page: '2' }
```

### addGuard()

Add navigation guards for route protection.

```javascript
router.addGuard(type, guard)
```

**Types:**
- `'beforeEach'` - Run before every navigation
- `'afterEach'` - Run after every navigation
- `'beforeResolve'` - Run before route resolution

**Example:**
```javascript
// Authentication guard
router.addGuard('beforeEach', async (to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login');
  } else {
    next();
  }
});

// Logging guard
router.addGuard('afterEach', (to, from) => {
  console.log(`Navigated from ${from.path} to ${to.path}`);
});
```

### back() / forward() / go()

Browser history navigation.

```javascript
router.back();     // Go back one step
router.forward();  // Go forward one step
router.go(-2);     // Go back two steps
router.go(3);      // Go forward three steps
```

### start() / stop()

Control router lifecycle.

```javascript
// Start the router
router.start();

// Stop the router (cleanup event listeners)
router.stop();
```

## Route Patterns

The router supports dynamic route patterns:

| Pattern | Example | Matches | Params |
|---------|---------|---------|--------|
| Static | `/users` | `/users` | `{}` |
| Required param | `/user/:id` | `/user/123` | `{ id: '123' }` |
| Optional param | `/posts/:id?` | `/posts`<br>`/posts/456` | `{}`<br>`{ id: '456' }` |
| Wildcard | `/files/*` | `/files/docs/readme.md` | `{ 0: 'docs/readme.md' }` |
| Multiple params | `/blog/:year/:month` | `/blog/2024/03` | `{ year: '2024', month: '03' }` |

## Routing Modes

### History Mode (Default)

Uses HTML5 History API for clean URLs.

```javascript
const router = new Router({
  mode: 'history'
});
// URLs: /users, /products, /dashboard
```

### Hash Mode

Uses URL hash for compatibility.

```javascript
const router = new Router({
  mode: 'hash'
});
// URLs: /#/users, /#/products, /#/dashboard
```

### Param Mode

Uses query parameters (good for static hosting).

```javascript
const router = new Router({
  mode: 'param'
});
// URLs: /?page=users, /?page=products, /?page=dashboard
```

## Complete Example

```javascript
// Create router
const router = new Router({
  mode: 'history',
  base: '/app',
  container: '#app'
});

// Define pages with camelCase pageName
class UsersTablePage extends TablePage {
  constructor() {
    super({
      pageName: 'users',  // Auto-creates /users route
      title: 'User Management'
    });
  }
}

class UserProfilePage extends Page {
  constructor() {
    super({
      pageName: 'userProfile',  // Auto-creates /user-profile route
      title: 'User Profile'
    });
  }
}

class ProductDetailsPage extends Page {
  constructor() {
    super({
      pageName: 'productDetails',  // Auto-creates /product-details route
      title: 'Product Details'
    });
  }
}

// Register routes using new automatic pattern
router
  .addRoute(HomePage)              // /home
  .addRoute(UsersTablePage)        // /users
  .addRoute(UserProfilePage)       // /user-profile
  .addRoute(ProductDetailsPage)    // /product-details
  .addRoute(DashboardPage, {       // /dashboard with auth
    meta: { requiresAuth: true }
  });

// Or mix with explicit paths when needed
router
  .addRoute('/auth/login', LoginPage)
  .addRoute('/auth/logout', LogoutPage)
  .addRoute('/user/:id', UserDetailPage);

// Add authentication guard
router.addGuard('beforeEach', async (to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/auth/login');
  } else {
    next();
  }
});

// Start routing
router.start();

// Navigate programmatically
await router.navigate('/users');
await router.navigateToPage('userProfile', { id: 123 });
```

## Best Practices

1. **Use camelCase for pageName**: Follow JavaScript conventions
   ```javascript
   pageName: 'userProfile'  // Good
   page_name: 'user_profile' // Avoid (deprecated)
   ```

2. **Leverage automatic path generation**: Let the router derive paths from pageName
   ```javascript
   router.addRoute(UserProfilePage);  // Automatic
   ```

3. **Use guards for cross-cutting concerns**: Authentication, logging, analytics
   ```javascript
   router.addGuard('beforeEach', authGuard);
   ```

4. **Organize routes logically**: Group related routes
   ```javascript
   // Auth routes
   router
     .addRoute(LoginPage)
     .addRoute(RegisterPage)
     .addRoute(ForgotPasswordPage);
   
   // App routes
   router
     .addRoute(DashboardPage)
     .addRoute(UsersPage)
     .addRoute(SettingsPage);
   ```

5. **Handle errors gracefully**: Provide error and 404 handlers
   ```javascript
   const router = new Router({
     notFoundHandler: NotFoundPage,
     errorHandler: ErrorPage
   });
   ```

## Migration from Snake Case

If migrating from snake_case, the router temporarily supports both:

```javascript
// Legacy (deprecated)
class UsersPage extends Page {
  constructor() {
    super({
      page_name: 'users_list'  // Old style
    });
  }
}

// Modern (preferred)
class UsersPage extends Page {
  constructor() {
    super({
      pageName: 'usersList'  // New style
    });
  }
}
```

Both will work during the migration period, but prefer camelCase for new code.