/**
 * Debug Helpers for MOJO Simplified Architecture
 * 
 * Copy and paste these into the browser console to debug the test app
 * Or include this file as a script in your test HTML
 */

// Ensure we have the test app
if (typeof window.testApp === 'undefined') {
    console.error('❌ testApp not found! Make sure the test page is loaded.');
} else {
    console.log('✅ Debug helpers loaded for testApp');
}

// Debug namespace
window.MOJO_DEBUG = {
    // Get current app state
    getState() {
        const app = window.testApp;
        return {
            currentPage: app.currentPage?.pageName || 'none',
            cachedPages: Array.from(app.pageCache.keys()),
            registeredClasses: Array.from(app.pageClasses.keys()),
            routerMode: app.router.options.mode,
            currentPath: app.router.currentPath
        };
    },

    // Show all cached page instances
    showPageCache() {
        const app = window.testApp;
        console.group('📄 Page Cache');
        app.pageCache.forEach((page, name) => {
            console.log(`${name}:`, {
                instanceId: page.instanceId,
                renderCount: page.renderCount || 0,
                isActive: page.isActive,
                hasState: !!page.savedState,
                element: page.element
            });
        });
        console.groupEnd();
    },

    // Show registered page classes
    showPageClasses() {
        const app = window.testApp;
        console.group('📚 Registered Page Classes');
        app.pageClasses.forEach((info, name) => {
            const isConfig = info.PageClass && info.PageClass.name.includes('DynamicPage');
            console.log(`${name}:`, {
                type: isConfig ? 'Config Object' : 'Custom Class',
                className: info.PageClass?.name || 'Unknown',
                hasOptions: !!info.constructorOptions,
                options: info.constructorOptions
            });
        });
        console.groupEnd();
    },

    // Show all routes
    showRoutes() {
        const router = window.testApp.router;
        console.group('🚦 Routes');
        router.routes.forEach((route, pattern) => {
            if (!pattern.startsWith('@')) {
                console.log(`${pattern} → ${route.pageName}`);
            }
        });
        console.groupEnd();
    },

    // Navigate and log lifecycle
    async navigateWithLog(pageName) {
        console.group(`🔄 Navigating to: ${pageName}`);
        const startTime = performance.now();
        
        try {
            await window.testApp.router.navigateToPage(pageName);
            const endTime = performance.now();
            
            console.log(`✅ Navigation complete in ${(endTime - startTime).toFixed(2)}ms`);
            console.log('Current page:', window.testApp.currentPage);
        } catch (error) {
            console.error('❌ Navigation failed:', error);
        }
        
        console.groupEnd();
    },

    // Test page caching
    async testCaching(pageName = 'home') {
        console.group('🧪 Testing Page Caching');
        
        // Get initial instance
        const instance1 = window.testApp.getOrCreatePage(pageName);
        const id1 = instance1?.instanceId || instance1?.constructor.name;
        console.log('First get:', id1);
        
        // Get again
        const instance2 = window.testApp.getOrCreatePage(pageName);
        const id2 = instance2?.instanceId || instance2?.constructor.name;
        console.log('Second get:', id2);
        
        // Compare
        const same = instance1 === instance2;
        console.log(same ? '✅ Same instance!' : '❌ Different instances!');
        
        console.groupEnd();
        return same;
    },

    // Test state preservation
    async testStatePreservation() {
        console.group('🧪 Testing State Preservation');
        
        // Navigate to form
        await this.navigateWithLog('form');
        
        // Fill form programmatically
        const inputs = {
            name: 'Test User',
            email: 'test@example.com',
            message: 'Test message'
        };
        
        Object.entries(inputs).forEach(([name, value]) => {
            const el = document.querySelector(`[name="${name}"]`);
            if (el) {
                el.value = value;
                console.log(`Set ${name} = ${value}`);
            }
        });
        
        // Navigate away
        await this.navigateWithLog('about');
        
        // Navigate back
        await this.navigateWithLog('form');
        
        // Check preservation
        let preserved = true;
        Object.entries(inputs).forEach(([name, value]) => {
            const el = document.querySelector(`[name="${name}"]`);
            if (el?.value !== value) {
                console.log(`❌ ${name} not preserved (expected: ${value}, got: ${el?.value})`);
                preserved = false;
            } else {
                console.log(`✅ ${name} preserved`);
            }
        });
        
        console.groupEnd();
        return preserved;
    },

    // Monitor navigation performance
    startPerfMonitor() {
        const router = window.testApp.router;
        const originalNavigate = router.navigate.bind(router);
        
        router.navigate = async function(path, options) {
            const start = performance.now();
            const result = await originalNavigate(path, options);
            const end = performance.now();
            
            console.log(`⚡ Navigation to ${path} took ${(end - start).toFixed(2)}ms`);
            return result;
        };
        
        console.log('📊 Performance monitoring enabled');
    },

    // Check memory usage
    checkMemory() {
        const app = window.testApp;
        console.group('💾 Memory Usage');
        
        console.log('Pages in cache:', app.pageCache.size);
        console.log('Pages in DOM:', document.querySelectorAll('.mojo-page').length);
        
        // Check for detached elements
        let detachedCount = 0;
        app.pageCache.forEach((page) => {
            if (page.element && !page.element.parentNode) {
                detachedCount++;
            }
        });
        console.log('Detached page elements:', detachedCount);
        
        // Estimate memory
        if (performance.memory) {
            console.log('JS Heap:', {
                used: `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
                total: `${(performance.memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
                limit: `${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
            });
        }
        
        console.groupEnd();
    },

    // Force page recreation (for testing)
    async forceRecreate(pageName) {
        console.group(`🔨 Force recreating: ${pageName}`);
        
        const app = window.testApp;
        
        // Remove from cache
        if (app.pageCache.has(pageName)) {
            const oldPage = app.pageCache.get(pageName);
            console.log('Old instance:', oldPage?.instanceId);
            app.pageCache.delete(pageName);
        }
        
        // Create new instance
        const newPage = app.getOrCreatePage(pageName);
        console.log('New instance:', newPage?.instanceId);
        
        console.groupEnd();
        return newPage;
    },

    // Run all tests
    async runAllTests() {
        console.group('🧪 Running All Tests');
        
        const results = {
            caching: await this.testCaching(),
            statePreservation: await this.testStatePreservation(),
            performance: true // Will be set based on navigation times
        };
        
        console.log('\n📊 Test Results:', results);
        console.groupEnd();
        
        return results;
    },

    // Help command
    help() {
        console.log(`
🔧 MOJO Debug Helpers - Available Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 State & Info:
  MOJO_DEBUG.getState()           - Get current app state
  MOJO_DEBUG.showPageCache()       - Show all cached page instances
  MOJO_DEBUG.showPageClasses()     - Show registered page classes
  MOJO_DEBUG.showRoutes()          - Show all routes

🔄 Navigation:
  MOJO_DEBUG.navigateWithLog('home')  - Navigate with lifecycle logging
  testApp.router.navigate('/home')     - Direct navigation
  testApp.router.navigateToPage('home') - Navigate by page name

🧪 Testing:
  MOJO_DEBUG.testCaching()         - Test page caching
  MOJO_DEBUG.testStatePreservation() - Test state preservation
  MOJO_DEBUG.runAllTests()         - Run all tests
  MOJO_DEBUG.forceRecreate('home') - Force recreate a page

📈 Performance:
  MOJO_DEBUG.startPerfMonitor()    - Enable performance monitoring
  MOJO_DEBUG.checkMemory()         - Check memory usage

🔍 Direct Access:
  testApp.pageCache                - Map of cached page instances
  testApp.pageClasses              - Map of registered page classes
  testApp.currentPage              - Current active page
  testApp.router                   - Router instance

Type: MOJO_DEBUG.help() for this help message
        `);
    }
};

// Auto-run help on load
if (window.testApp) {
    console.log('💡 Type: MOJO_DEBUG.help() for available debug commands');
    
    // Show initial state
    console.log('📊 Initial State:', MOJO_DEBUG.getState());
}

// Export for use in other scripts
window.MojoDebug = window.MOJO_DEBUG;