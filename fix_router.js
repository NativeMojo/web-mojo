// Quick fix script for MOJO Router issues
// Run this in browser console to auto-fix common routing problems

console.log('🔧 MOJO Router Quick Fix Script');
console.log('=====================================\n');

const app = window.MOJO?.app || window.app;
const router = window.MOJO?.router || app?.router;

if (!router) {
    console.log('❌ No router found! Make sure your app is initialized first.');
    throw new Error('Router not available');
}

console.log('📋 Current Router State:');
console.log('  - Mode:', router.mode);
console.log('  - Routes:', router.routes?.length || 0);
console.log('  - Current URL:', window.location.href);
console.log('');

// Detect if we're using params mode from URL
const hasPageParam = new URLSearchParams(window.location.search).has('page');
const expectedMode = hasPageParam ? 'params' : 'history';

console.log('🔍 Issue Detection:');
console.log('  - URL suggests mode:', expectedMode);
console.log('  - Router actual mode:', router.mode);

let issuesFixed = 0;

// Fix 1: Mode mismatch
if (router.mode !== expectedMode) {
    console.log('  - 🚨 Mode mismatch detected!');
    console.log(`  - Fixing: ${router.mode} -> ${expectedMode}`);
    router.mode = expectedMode;
    issuesFixed++;
    console.log('  - ✅ Router mode fixed');
} else {
    console.log('  - ✅ Router mode is correct');
}

// Fix 2: Invalid regex objects
let invalidRegexCount = 0;
if (router.routes) {
    router.routes.forEach(route => {
        if (!(route.regex instanceof RegExp)) {
            invalidRegexCount++;
        }
    });
}

if (invalidRegexCount > 0) {
    console.log(`  - 🚨 ${invalidRegexCount} invalid regex objects detected!`);
    console.log('  - Recompiling route patterns...');
    
    // Recompile all route patterns
    router.routes.forEach(route => {
        if (!(route.regex instanceof RegExp)) {
            try {
                // Use the same logic as the Router class
                let regexPattern = route.pattern
                    .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
                    .replace(/\/:([^/?]+)\?/g, '(?:/([^/]+))?')
                    .replace(/:([^/]+)/g, '([^/]+)');
                
                route.regex = new RegExp(`^${regexPattern}$`);
                console.log(`    - Fixed regex for ${route.pattern}`);
            } catch (error) {
                console.log(`    - ❌ Failed to fix regex for ${route.pattern}:`, error);
            }
        }
    });
    issuesFixed++;
    console.log('  - ✅ Route regex patterns fixed');
} else {
    console.log('  - ✅ All route regex patterns are valid');
}

// Fix 3: Ensure router is started
if (!router.isStarted) {
    console.log('  - 🚨 Router is not started!');
    try {
        router.start();
        console.log('  - ✅ Router started');
        issuesFixed++;
    } catch (error) {
        console.log('  - ❌ Failed to start router:', error);
    }
} else {
    console.log('  - ✅ Router is already started');
}

console.log('');
console.log('🧪 Testing Current Route:');

try {
    const currentPath = router.getCurrentPath();
    console.log('  - Current path:', currentPath);
    
    const match = router.matchRoute(currentPath);
    if (match) {
        console.log('  - ✅ Route matched!');
        console.log('    - Page:', match.pageName);
        console.log('    - Params:', match.params);
        console.log('    - Query:', match.query);
        
        // Trigger route handling if not already done
        if (app && typeof app.handleRouteChange === 'function') {
            console.log('  - Triggering route handling...');
            app.handleRouteChange({
                pageName: match.pageName,
                params: match.params,
                query: match.query,
                path: currentPath
            }).then(() => {
                console.log('  - ✅ Route handling completed');
            }).catch(error => {
                console.log('  - ❌ Route handling failed:', error);
            });
        }
    } else {
        console.log('  - ❌ No route matched!');
        console.log('  - Available routes:');
        router.routes?.forEach(route => {
            console.log(`    - ${route.pattern} -> ${route.pageName}`);
        });
    }
} catch (error) {
    console.log('  - ❌ Error testing route:', error);
}

console.log('');
console.log('📊 Fix Summary:');
console.log(`  - Issues detected and fixed: ${issuesFixed}`);
console.log('  - Router mode:', router.mode);
console.log('  - Total routes:', router.routes?.length || 0);

if (issuesFixed > 0) {
    console.log('');
    console.log('✅ Fixes applied! Try navigating now:');
    console.log('  - app.navigate("/home")');
    console.log('  - router.navigate("/dashboard")');
    
    // Auto-navigate to current page to test
    const pageParam = new URLSearchParams(window.location.search).get('page');
    if (pageParam && router.mode === 'params') {
        console.log(`  - Auto-testing navigation to: ${pageParam}`);
        setTimeout(() => {
            router.navigate(pageParam).catch(error => {
                console.log('Auto-navigation failed:', error);
            });
        }, 100);
    }
} else {
    console.log('');
    console.log('🎉 No issues found! Router should be working correctly.');
}

console.log('');
console.log('🛠️ Manual Testing Commands:');
console.log('  router.getCurrentPath()  // Check current path');
console.log('  router.matchRoute(router.getCurrentPath())  // Test matching');
console.log('  app.navigate("/home")  // Navigate to home');
console.log('  debugRouter.listRoutes()  // Show all routes (if debug script loaded)');