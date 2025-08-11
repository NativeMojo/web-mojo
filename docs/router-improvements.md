# Router Improvements - Class and Instance Support

## Overview

The MOJO Router has been enhanced to support both **Page classes** and **Page instances** for route registration. This provides maximum flexibility while maintaining simplicity and reducing boilerplate code.

## What Changed

### Previous Limitations

The router previously had complex logic trying to extract `pageName` and `route` properties from class prototypes, which often failed when these properties were set in constructors:

```javascript
// Old approach - complex prototype checking
let route = handler.prototype.route || handler.route;
if (!route) route = handler.prototype.pageName || handler.pageName;
// ... lots of fallback logic
```

### New Approach

The router now intelligently handles both classes and instances:

1. **If you pass a class**, the router automatically instantiates it
2. **If you pass an instance**, the router uses it directly
3. Both approaches use the same clean lifecycle methods: `onEnter()` and `onExit()`

## Usage Examples

### Method 1: Register Classes (Simple & Clean)

```javascript
// Router will instantiate these automatically
router.addPages([
  HomePage,
  AboutPage,
  ContactPage,
  ProductsPage
]);

// Or individually
router.addRoute(HomePage);
router.addRoute(AboutPage);
```

**Benefits:**
- Clean, minimal syntax
- No manual instantiation needed
- Fresh instance created on first navigation
- Good for standard pages without special initialization

### Method 2: Register Instances (More Control)

```javascript
// Pre-instantiate with custom options
const homePage = new HomePage({ theme: 'dark' });
const aboutPage = new AboutPage({ preloadData: true });

router.addPages([
  homePage,
  aboutPage,
  new ContactPage({ validateOnLoad: true })
]);
```

**Benefits:**
- Full control over initialization
- Can pass custom options to constructors
- Instance persists across navigations (maintains state)
- Good for complex pages with initialization requirements

### Method 3: Mixed Approach

```javascript
router.addPages([
  HomePage,                                    // Class - simple page
  new AdminPage({ requiresAuth: true }),      // Instance - needs config
  SettingsPage,                                // Class - standard page
  new DashboardPage({ refreshInterval: 5000 }) // Instance - needs config
]);
```

## Lifecycle Methods

Pages now have clearer lifecycle methods that work consistently regardless of how they're registered:

### Primary Lifecycle Methods (Preferred)

```javascript
class MyPage extends Page {
  async onEnter() {
    // Called when entering this page
    // Initialize components, fetch data, set up listeners
    await super.onEnter(); // Important: call parent
    console.log('Entering page');
  }

  async onExit() {
    // Called when leaving this page
    // Clean up listeners, cancel requests, clear timers
    await super.onExit(); // Important: call parent
    console.log('Exiting page');
  }
}
```

### Legacy Methods (Still Supported)

The `onActivate()` and `onDeactivate()` methods are still supported for backward compatibility. They are automatically called by `onEnter()` and `onExit()` respectively.

## Router Implementation Details

### How Class Detection Works

```javascript
// In Router.addRoute()
if (typeof handler === 'function' && handler.prototype) {
  // It's a class - instantiate it
  handler = new handler();
}
```

### Route Execution

```javascript
// In Router.executeRoute()
// Exit previous page
if (this.previousPageInstance) {
  await this.previousPageInstance.onExit();
}

// Enter new page
await handler.onEnter();

// Render
handler.mounted = false; // Force re-render
await handler.render(this.container);
```

## Benefits of the New Approach

### 1. **Flexibility**
- Choose between fresh instances (classes) or persistent instances based on your needs
- Mix and match approaches within the same application

### 2. **Simplicity**
- No more complex prototype checking
- Clear, predictable behavior
- Cleaner router code

### 3. **Better State Management**
- Instance approach allows state persistence across navigations
- Class approach ensures clean state on each visit
- Choose based on your requirements

### 4. **Improved Performance Options**
- Instances can cache expensive computations
- Classes provide automatic garbage collection
- Optimize based on your use case

## Migration Guide

### If You Were Using Classes

No changes needed! Your existing code will continue to work:

```javascript
// This still works perfectly
router.addRoute(MyPage);
```

### If You Want State Persistence

Switch to instances for specific pages:

```javascript
// Before: Fresh instance each time
router.addRoute(ExpensivePage);

// After: Reuse the same instance
const expensivePage = new ExpensivePage();
router.addRoute(expensivePage);
```

### Updating Lifecycle Methods

Consider updating to the new lifecycle methods for clarity:

```javascript
// Old
async onActivate() {
  // setup code
}

async onDeactivate() {
  // cleanup code
}

// New (preferred)
async onEnter() {
  await super.onEnter();
  // setup code
}

async onExit() {
  await super.onExit();
  // cleanup code
}
```

## Best Practices

### When to Use Classes

- Standard pages that should start fresh each visit
- Pages without complex initialization
- Most pages in a typical application

### When to Use Instances

- Pages with expensive initialization
- Pages that should maintain state between visits
- Wizard/multi-step forms
- Pages with cached data
- Admin panels with complex configurations

### Memory Considerations

If using instances for many pages, consider implementing a cleanup strategy:

```javascript
// Cleanup when done with the app
router.cleanup(); // Calls onExit() on current page and cleans up
```

## Testing

Use the provided test file at `/test/router-test.html` to see both approaches in action. The test demonstrates:

1. Class registration (TestPage1)
2. Instance registration (TestPage2) 
3. Instance with custom options (TestPage3)
4. State persistence in instances
5. Proper lifecycle method calls

## Summary

The improved Router provides a flexible, clean approach to page registration that works the way developers expect. Whether you prefer the simplicity of class registration or the control of instance registration, the Router handles both seamlessly while maintaining clean lifecycle management through `onEnter()` and `onExit()` methods.