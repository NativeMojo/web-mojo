// Debug script for MOJO Router issues
// Run this in browser console or as a standalone script

console.log('🔍 MOJO Router Debug Script Starting...\n');

// Check if we're in browser environment
if (typeof window === 'undefined') {
    console.log('❌ This script needs to run in a browser environment');
    exit();
}

// Check for MOJO framework
const app = window.MOJO?.app || window.app;
const router = window.MOJO?.router || app?.router;

console.log('📋 Environment Check:');
console.log('  - MOJO available:', !!window.MOJO);
console.log('  - App available:', !!app);
console.log('  - Router available:', !!router);
console.log('');

if (!router) {
    console.log('❌ No router found! Make sure the app is initialized.');
    console.log('Try: window.MOJO.router or window.app.router');
    // Still continue to analyze URL
}

// Analyze current URL
console.log('🌐 URL Analysis:');
const url = new URL(window.location.href);
console.log('  - Full URL:', url.href);
console.log('  - Pathname:', url.pathname);
console.log('  - Search:', url.search);
console.log('  - Hash:', url.hash);

// Check for page parameter (params mode indicator)
const pageParam = new URLSearchParams(url.search).get('page');
console.log('  - Page parameter:', pageParam || 'none');
console.log('  - URL suggests mode:', pageParam ? 'PARAMS' : 'HISTORY');
console.log('');

if (router) {
    // Router configuration analysis
    console.log('⚙️ Router Configuration:');
    console.log('  - Mode:', router.mode);
    console.log('  - Base path:', router.basePath || 'none');
    console.log('  - Current route:', router.currentRoute?.pageName || 'none');
    console.log('  - Total routes:', router.routes?.length || 0);
    console.log('  - Is started:', router.isStarted);
    console.log('');

    // Route analysis
    console.log('📝 Route Analysis:');
    if (router.routes && router.routes.length > 0) {
        router.routes.forEach((route, index) => {
            console.log(`  Route ${index + 1}:`);
            console.log(`    - Pattern: "${route.pattern}"`);
            console.log(`    - Page: "${route.pageName}"`);
            console.log(`    - Regex valid: ${route.regex instanceof RegExp}`);
            console.log(`    - Regex: ${route.regex}`);
            console.log(`    - Param names: [${route.paramNames?.join(', ')}]`);
            
            // Test if current path matches this route
            if (route.regex instanceof RegExp) {
                const currentPath = router.getCurrentPath();
                const matches = currentPath.match(route.regex);
                console.log(`    - Matches current path "${currentPath}": ${!!matches}`);
                if (matches) {
                    console.log(`    - Match details:`, matches);
                }
            } else {
                console.log(`    - ❌ Invalid regex object!`);
            }
            console.log('');
        });
    } else {
        console.log('  ❌ No routes registered!');
    }

    // Test current path resolution
    console.log('🎯 Current Path Resolution:');
    try {
        const currentPath = router.getCurrentPath();
        console.log(`  - Current path: "${currentPath}"`);
        
        if (router.matchRoute) {
            const match = router.matchRoute(currentPath);
            console.log('  - Match result:', match);
            if (match) {
                console.log('  - ✅ Route matched successfully!');
                console.log('  - Page name:', match.pageName);
                console.log('  - Parameters:', match.params);
                console.log('  - Query:', match.query);
            } else {
                console.log('  - ❌ No route matched!');
            }
        }
    } catch (error) {
        console.log('  - ❌ Error getting current path:', error.message);
    }
    console.log('');

    // Mode mismatch detection
    console.log('⚠️ Issue Detection:');
    const urlSuggestsParams = !!pageParam;
    const routerInParamsMode = router.mode === 'params';
    const routerInHistoryMode = router.mode === 'history';
    
    if (urlSuggestsParams && routerInHistoryMode) {
        console.log('  - 🚨 MISMATCH: URL uses ?page= format but router is in HISTORY mode');
        console.log('  - 💡 Solution: Set routerMode to "params" in WebApp config');
    } else if (!urlSuggestsParams && routerInParamsMode) {
        console.log('  - 🚨 MISMATCH: URL uses path format but router is in PARAMS mode');
        console.log('  - 💡 Solution: Either use ?page=home URLs or set routerMode to "history"');
    } else {
        console.log('  - ✅ URL format and router mode appear to match');
    }

    // Check for invalid regexes
    const invalidRegexRoutes = router.routes?.filter(r => !(r.regex instanceof RegExp)) || [];
    if (invalidRegexRoutes.length > 0) {
        console.log('  - 🚨 INVALID REGEX: Some routes have invalid regex objects');
        console.log('  - 💡 Solution: Router patterns not being compiled properly');
        invalidRegexRoutes.forEach(route => {
            console.log(`    - "${route.pattern}" -> ${typeof route.regex}`);
        });
    }
} else {
    console.log('⚠️ Cannot analyze router - not available');
}

// WebApp analysis
if (app) {
    console.log('📱 WebApp Analysis:');
    console.log('  - App name:', app.name);
    console.log('  - Router mode config:', app.routerMode);
    console.log('  - Started:', app.isStarted);
    console.log('  - Current page:', app.currentPage?.pageName || 'none');
    console.log('  - Registered pages:', app.pageClasses?.size || 0);
    
    if (app.pageClasses) {
        console.log('  - Page names:', [...app.pageClasses.keys()].join(', '));
    }
    console.log('');
}

// Test navigation
console.log('🧪 Navigation Test:');
if (router && typeof router.navigate === 'function') {
    console.log('Navigate function available - you can test with:');
    console.log('  router.navigate("/home")  // for history mode');
    console.log('  router.navigate("/dashboard")  // for history mode');
    console.log('  app.navigate("/home")  // through WebApp');
} else {
    console.log('❌ Navigate function not available');
}
console.log('');

// Recommendations
console.log('💡 Debugging Recommendations:');
console.log('');

if (pageParam && router && router.mode === 'history') {
    console.log('1. 🔧 MODE MISMATCH FIX:');
    console.log('   Your URL uses ?page=home but router is in history mode.');
    console.log('   In your WebApp config, change:');
    console.log('   ```javascript');
    console.log('   const app = new WebApp({');
    console.log('     routerMode: "params", // Change from "history" to "params"');
    console.log('     // ... other config');
    console.log('   });');
    console.log('   ```');
    console.log('');
}

if (router?.routes?.some(r => !(r.regex instanceof RegExp))) {
    console.log('2. 🔧 REGEX COMPILATION FIX:');
    console.log('   Route patterns are not being compiled to RegExp objects.');
    console.log('   This suggests an issue with the Router.patternToRegex() method.');
    console.log('   Check if the Router class is being imported correctly.');
    console.log('');
}

console.log('3. 🔧 QUICK TEST:');
console.log('   Try these in console:');
console.log('   - router.getCurrentPath()  // See what path router thinks it has');
console.log('   - router.matchRoute(router.getCurrentPath())  // Test matching');
console.log('   - app.navigate("/home")  // Test navigation');
console.log('');

console.log('4. 📝 ROUTE REGISTRATION:');
console.log('   Make sure routes are registered like this:');
console.log('   ```javascript');
console.log('   app.registerPage("home", HomePage, { route: "/" });');
console.log('   app.registerPage("dashboard", DashboardPage, { route: "/dashboard" });');
console.log('   ```');

console.log('');
console.log('🏁 Debug analysis complete!');
console.log('Copy any error messages above and check the recommendations.');

// Export helper functions for console use
window.debugRouter = {
    testRoute: (path) => {
        if (!router) return 'Router not available';
        try {
            const match = router.matchRoute(path);
            console.log(`Testing path "${path}":`, match);
            return match;
        } catch (error) {
            console.log(`Error testing path "${path}":`, error);
            return null;
        }
    },
    
    listRoutes: () => {
        if (!router) return 'Router not available';
        console.table(router.routes?.map(r => ({
            pattern: r.pattern,
            page: r.pageName,
            regex: r.regex.toString(),
            params: r.paramNames?.join(', ')
        })));
    },
    
    getCurrentInfo: () => {
        if (!router) return 'Router not available';
        return {
            path: router.getCurrentPath(),
            currentRoute: router.currentRoute,
            mode: router.mode
        };
    },
    
    fixMode: (mode) => {
        if (!router) return 'Router not available';
        console.log(`Changing router mode from ${router.mode} to ${mode}`);
        router.mode = mode;
        console.log('Mode changed. Try navigating now.');
        return `Mode set to ${mode}`;
    }
};

console.log('');
console.log('🛠️ Helper functions added to window.debugRouter:');
console.log('  - debugRouter.testRoute("/path") - Test if a path matches');
console.log('  - debugRouter.listRoutes() - Show all routes in table');
console.log('  - debugRouter.getCurrentInfo() - Get current router state');
console.log('  - debugRouter.fixMode("params") - Change router mode');