# Browser Console Debugging Guide - MOJO Simplified Architecture

## Quick Start

Open http://localhost:3000/test/simplified/test-refactor.html in your browser and open the Developer Console (F12).

## Available Debug Commands

### 📊 Check App State
```javascript
// Get current state overview
testApp.currentPage?.pageName  // Current page name
testApp.pageCache              // Map of all cached page instances
testApp.pageClasses            // Map of registered page classes

// See all cached pages
Array.from(testApp.pageCache.keys())
// Output: ["home", "about", "contact", "form"]

// Check if pages are using same instance
testApp.pageCache.get('home')  // Get home page instance
```

### 🔄 Navigation Commands
```javascript
// Navigate using router
await testApp.router.navigate('/home')
await testApp.router.navigate('/about')

// Navigate by page name
await testApp.router.navigateToPage('form')

// Check navigation works
await testApp.navigate('/contact')  // WebApp method
```

### 🧪 Test Page Caching
```javascript
// Test that same instance is reused
const home1 = testApp.getOrCreatePage('home');
const home2 = testApp.getOrCreatePage('home');
console.log(home1 === home2);  // Should be true

// Check instance details
home1.instanceId  // Unique ID if using class
home1.renderCount // How many times rendered
```

### 📝 Test State Preservation
```javascript
// Navigate to form and fill it
await testApp.router.navigate('/form');

// Fill form programmatically
document.querySelector('input[name="name"]').value = "Test User";
document.querySelector('input[name="email"]').value = "test@test.com";
document.querySelector('textarea[name="message"]').value = "Test message";

// Navigate away and back
await testApp.router.navigate('/about');
await testApp.router.navigate('/form');

// Check if values preserved
document.querySelector('input[name="name"]').value  // Should still be "Test User"
```

### 🔍 Inspect Page Instances
```javascript
// Get specific page instance
const homePage = testApp.pageCache.get('home');
console.log({
    pageName: homePage.pageName,
    isActive: homePage.isActive,
    hasState: !!homePage.savedState,
    element: homePage.element
});

// Check what type of page it is
testApp.pageClasses.get('home')  // See registration info
```

### 🚦 Check Routes
```javascript
// See all registered routes
testApp.router.routes  // Map of all routes

// Check route matching
testApp.router.matchRoute('/?page=home')  
// Returns: { pageName: 'home', params: {}, query: {} }
```

### 📈 Performance Testing
```javascript
// Time navigation
const start = performance.now();
await testApp.router.navigate('/about');
const time = performance.now() - start;
console.log(`Navigation took ${time}ms`);

// Check DOM efficiency
document.querySelectorAll('.mojo-page').length  // Should be 1 (only current page)

// Check memory usage
testApp.pageCache.size  // Number of cached pages
```

### 🐛 Common Debugging Scenarios

#### Check if page is created from config or class:
```javascript
const pageInfo = testApp.pageClasses.get('home');
const isConfig = pageInfo.PageClass.name.includes('DynamicPage');
console.log(isConfig ? 'Config pattern' : 'Class pattern');
```

#### Force page recreation (for testing):
```javascript
// Remove from cache to force recreation
testApp.pageCache.delete('home');
const newHome = testApp.getOrCreatePage('home');
```

#### Check lifecycle methods:
```javascript
// Add logging to lifecycle
const aboutPage = testApp.pageCache.get('about');
const originalOnEnter = aboutPage.onEnter.bind(aboutPage);
aboutPage.onEnter = async function() {
    console.log('About page entering...');
    await originalOnEnter();
    console.log('About page entered!');
};
```

#### Monitor all navigations:
```javascript
// Intercept navigate to log all transitions
const originalNavigate = testApp.router.navigate.bind(testApp.router);
testApp.router.navigate = async function(path, options) {
    console.log(`Navigating to: ${path}`);
    const result = await originalNavigate(path, options);
    console.log(`Current page: ${testApp.currentPage?.pageName}`);
    return result;
};
```

## Load Debug Helpers

For more advanced debugging, load the debug helpers:

```javascript
// Load debug helpers script
const script = document.createElement('script');
script.src = '/test/simplified/debug-helpers.js';
document.head.appendChild(script);

// Then use:
MOJO_DEBUG.help()                    // Show all commands
MOJO_DEBUG.showPageCache()           // Detailed cache info
MOJO_DEBUG.testCaching()             // Test caching
MOJO_DEBUG.testStatePreservation()   // Test state preservation
MOJO_DEBUG.checkMemory()             // Memory usage
```

## Key Things to Verify

1. **Page Caching Works**:
   - Same instance returned every time
   - `testApp.pageCache.get('home') === testApp.pageCache.get('home')`

2. **State Preservation**:
   - Form values persist after navigation
   - Scroll position maintained
   - Custom state saved/restored

3. **DOM Efficiency**:
   - Only 1 page in DOM at a time
   - Old pages detached, not destroyed

4. **Performance**:
   - Navigation < 50ms for cached pages
   - No memory leaks (cache size stays constant)

5. **Registration Patterns**:
   - Config objects create DynamicPage classes
   - Custom classes work as expected
   - Constructor options passed correctly

## Troubleshooting

### Page not caching?
```javascript
// Check if page is registered
testApp.pageClasses.has('home')

// Check if page is in cache
testApp.pageCache.has('home')

// Manually create and check
const page1 = testApp.getOrCreatePage('home');
const page2 = testApp.getOrCreatePage('home');
console.assert(page1 === page2, 'Pages should be same instance');
```

### State not preserving?
```javascript
// Check if savedState exists
const page = testApp.pageCache.get('form');
console.log('Saved state:', page.savedState);

// Check lifecycle methods
page.onExit();  // Should save state
console.log('After exit:', page.savedState);
page.onEnter(); // Should restore state
```

### Navigation not working?
```javascript
// Check current route mode
testApp.router.options.mode  // Should be 'param'

// Check current path
testApp.router.getCurrentPath()

// Try direct navigation
testApp.router.currentPath = '/home';
await testApp.router.handleCurrentLocation();
```

## Console One-Liners

Quick commands to copy/paste:

```javascript
// Show everything
console.table({state: testApp.currentPage?.pageName, cached: Array.from(testApp.pageCache.keys()), inDOM: document.querySelectorAll('.mojo-page').length})

// Test caching quickly
(async () => { const p1 = testApp.getOrCreatePage('home'); await testApp.router.navigate('/about'); const p2 = testApp.getOrCreatePage('home'); console.log('Same?', p1 === p2); })()

// Check all instances
testApp.pageCache.forEach((p, n) => console.log(n, ':', p.instanceId || 'config'))

// Performance test
(async () => { const times = []; for(let i = 0; i < 10; i++) { const s = performance.now(); await testApp.router.navigate(i % 2 ? '/home' : '/about'); times.push(performance.now() - s); } console.log('Avg:', (times.reduce((a,b) => a+b) / times.length).toFixed(2) + 'ms'); })()
```
