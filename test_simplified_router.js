// Test for the simplified MOJO router implementation
// This tests the new clean router architecture and WebApp integration

import WebApp from './src/app/WebApp.js';
import Page from './src/core/Page.js';

// Mock pages for testing
class TestHomePage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'Home',
            template: `<div class="home-page"><h1>Home Page</h1><p>{{message}}</p></div>`,
            ...options
        });
    }

    async getViewData() {
        return { message: 'Welcome to the home page!' };
    }

    async onEnter() {
        console.log('✅ Home page entered');
    }

    async onExit() {
        console.log('👋 Home page exited');
    }
}

class TestUsersPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'Users',
            template: `<div class="users-page"><h1>Users</h1><p>User ID: {{userId}}</p></div>`,
            ...options
        });
    }

    async onParams(params, query) {
        this.userId = params.id || 'none';
        await this.render();
    }

    async getViewData() {
        return { userId: this.userId };
    }

    async onEnter() {
        console.log('✅ Users page entered');
    }
}

class TestSettingsPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'Settings',
            template: `<div class="settings-page"><h1>Settings</h1></div>`,
            ...options
        });
    }
}

// Test suite
class SimplifiedRouterTest {
    constructor() {
        this.testResults = [];
        this.app = null;
    }

    log(message, success = true) {
        const emoji = success ? '✅' : '❌';
        const result = `${emoji} ${message}`;
        console.log(result);
        this.testResults.push({ message, success });
        return success;
    }

    async runAllTests() {
        console.log('🚀 Starting Simplified Router Tests...\n');

        try {
            await this.testBasicSetup();
            await this.testPageRegistration();
            await this.testRouterStartup();
            await this.testBasicNavigation();
            await this.testParameterRoutes();
            await this.testEventEmission();
            await this.testBrowserNavigation();
            await this.testSidebarCompatibility();
            await this.testErrorHandling();
            
            this.printResults();
        } catch (error) {
            this.log(`Fatal test error: ${error.message}`, false);
            console.error(error);
        } finally {
            await this.cleanup();
        }
    }

    async testBasicSetup() {
        console.log('📋 Testing Basic Setup...');

        try {
            // Test WebApp creation with simplified router
            this.app = new WebApp({
                container: '#test-app',
                routerMode: 'history',
                basePath: '/test',
                title: 'Router Test App'
            });

            this.log('WebApp created successfully');
            this.log('Router initialized', !!this.app.router);
            this.log('EventBus initialized', !!this.app.events);
            this.log('Router mode set correctly', this.app.router.mode === 'history');

        } catch (error) {
            this.log(`Basic setup failed: ${error.message}`, false);
        }
    }

    async testPageRegistration() {
        console.log('\n📝 Testing Page Registration...');

        try {
            // Register test pages
            this.app.registerPage('home', TestHomePage, { route: '/' });
            this.app.registerPage('users', TestUsersPage, { route: '/users/:id?' });
            this.app.registerPage('settings', TestSettingsPage, { route: '/settings' });

            this.log('Pages registered successfully');
            this.log('Page classes stored', this.app.pageClasses.size === 3);
            this.log('Routes added to router', this.app.router.routes.length === 3);

            // Test page creation
            const homePage = this.app.getOrCreatePage('home');
            this.log('Page creation works', !!homePage);
            this.log('Page caching works', this.app.getPage('home') === homePage);

        } catch (error) {
            this.log(`Page registration failed: ${error.message}`, false);
        }
    }

    async testRouterStartup() {
        console.log('\n🔄 Testing Router Startup...');

        try {
            // Start the app
            await this.app.start();

            this.log('App started successfully');
            this.log('Router started', this.app.router.isStarted);
            this.log('App marked as started', this.app.isStarted);

        } catch (error) {
            this.log(`Router startup failed: ${error.message}`, false);
        }
    }

    async testBasicNavigation() {
        console.log('\n🧭 Testing Basic Navigation...');

        let routeChangeEvents = 0;
        let pageShowEvents = 0;

        // Listen for events
        this.app.events.on('route:changed', () => routeChangeEvents++);
        this.app.events.on('page:show', () => pageShowEvents++);

        try {
            // Navigate to home
            await this.app.navigate('/');
            this.log('Navigation to home succeeded');

            // Navigate to settings
            await this.app.navigate('/settings');
            this.log('Navigation to settings succeeded');

            // Check current page
            this.log('Current page updated', this.app.getCurrentPage()?.pageName === 'Settings');

            // Check events fired
            this.log('Route change events fired', routeChangeEvents >= 2);
            this.log('Page show events fired', pageShowEvents >= 2);

        } catch (error) {
            this.log(`Basic navigation failed: ${error.message}`, false);
        }
    }

    async testParameterRoutes() {
        console.log('\n🎯 Testing Parameter Routes...');

        let lastRouteParams = null;
        this.app.events.on('route:changed', (info) => {
            lastRouteParams = info.params;
        });

        try {
            // Navigate to user with ID
            await this.app.navigate('/users/123');
            
            this.log('Parameter route navigation succeeded');
            this.log('Route parameters captured', lastRouteParams?.id === '123');
            this.log('Page received parameters', this.app.getCurrentPage()?.userId === '123');

            // Navigate to users without ID
            await this.app.navigate('/users');
            this.log('Optional parameter works', lastRouteParams && !lastRouteParams.id);

        } catch (error) {
            this.log(`Parameter routes failed: ${error.message}`, false);
        }
    }

    async testEventEmission() {
        console.log('\n📡 Testing Event Emission...');

        const events = [];
        
        // Listen for all router events
        this.app.events.on('route:changed', (data) => {
            events.push({ type: 'route:changed', data });
        });
        
        this.app.events.on('route:change', (data) => {
            events.push({ type: 'route:change', data });
        });

        this.app.events.on('page:show', (data) => {
            events.push({ type: 'page:show', data });
        });

        try {
            events.length = 0; // Clear previous events
            
            await this.app.navigate('/');
            
            this.log('Events were emitted', events.length > 0);
            
            const routeChangedEvent = events.find(e => e.type === 'route:changed');
            const routeChangeEvent = events.find(e => e.type === 'route:change');
            const pageShowEvent = events.find(e => e.type === 'page:show');
            
            this.log('route:changed event emitted', !!routeChangedEvent);
            this.log('route:change event emitted (Sidebar compat)', !!routeChangeEvent);
            this.log('page:show event emitted', !!pageShowEvent);
            
            // Check event structure for Sidebar compatibility
            if (routeChangeEvent) {
                const hasPageRoute = !!routeChangeEvent.data?.page?.route;
                const hasPageName = !!routeChangeEvent.data?.page?.pageName;
                this.log('Route event has correct structure', hasPageRoute && hasPageName);
            }

        } catch (error) {
            this.log(`Event emission failed: ${error.message}`, false);
        }
    }

    async testBrowserNavigation() {
        console.log('\n🌐 Testing Browser Navigation...');

        try {
            // Test programmatic browser navigation
            this.app.back();
            this.log('Back navigation called successfully');

            this.app.forward();
            this.log('Forward navigation called successfully');

            // Test current path retrieval
            const currentPath = this.app.router.getCurrentPath();
            this.log('Current path retrieved', typeof currentPath === 'string');

        } catch (error) {
            this.log(`Browser navigation failed: ${error.message}`, false);
        }
    }

    async testSidebarCompatibility() {
        console.log('\n📋 Testing Sidebar Compatibility...');

        let sidebarEvents = [];
        
        // Simulate what Sidebar does
        this.app.events.on('route:change', (data) => {
            if (data.page && data.page.route) {
                const route = this.app.router.convertRoute(data.page.route);
                sidebarEvents.push({ route, pageName: data.page.pageName });
            }
        });

        try {
            sidebarEvents.length = 0;
            
            await this.app.navigate('/settings');
            
            this.log('Sidebar events captured', sidebarEvents.length > 0);
            
            if (sidebarEvents.length > 0) {
                const event = sidebarEvents[0];
                this.log('Route conversion works', !!event.route);
                this.log('Page name captured', event.pageName === 'Settings');
            }

            // Test convertRoute method directly
            const convertedRoute = this.app.router.convertRoute('/test/route');
            this.log('convertRoute method works', convertedRoute === '/test/route');

        } catch (error) {
            this.log(`Sidebar compatibility failed: ${error.message}`, false);
        }
    }

    async testErrorHandling() {
        console.log('\n⚠️ Testing Error Handling...');

        let notFoundEvents = 0;
        this.app.events.on('route:notfound', () => notFoundEvents++);

        try {
            // Navigate to non-existent route
            await this.app.navigate('/nonexistent');
            
            this.log('Not found events fired', notFoundEvents > 0);
            
            // Test invalid page registration
            try {
                this.app.registerPage('', null);
                this.log('Invalid registration handled', false);
            } catch {
                this.log('Invalid registration handled', true);
            }

        } catch (error) {
            this.log(`Error handling test completed with expected error: ${error.message}`);
        }
    }

    printResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('=' * 50);
        
        const passed = this.testResults.filter(r => r.success).length;
        const total = this.testResults.length;
        
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${total - passed}`);
        console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        if (passed === total) {
            console.log('\n🎉 All tests passed! Simplified router is working correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Check the logs above for details.');
        }
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        if (this.app) {
            try {
                await this.app.destroy();
                this.log('App destroyed successfully');
            } catch (error) {
                this.log(`Cleanup failed: ${error.message}`, false);
            }
        }
    }
}

// Params mode test
async function testParamsMode() {
    console.log('\n🔄 Testing Params Mode...');
    
    const paramsApp = new WebApp({
        container: '#params-test',
        routerMode: 'params', // This should map to 'params' in the router
        title: 'Params Mode Test'
    });

    paramsApp.registerPage('home', TestHomePage, { route: '/' });
    paramsApp.registerPage('users', TestUsersPage, { route: '/users/:id?' });

    await paramsApp.start();

    console.log('✅ Params mode app created and started');
    console.log(`✅ Router mode: ${paramsApp.router.mode}`);

    // Test navigation in params mode
    await paramsApp.navigate('/users/456');
    console.log('✅ Params mode navigation works');

    await paramsApp.destroy();
    console.log('✅ Params mode test completed');
}

// Main test runner
async function runTests() {
    // Create test container
    if (typeof document !== 'undefined') {
        const testContainer = document.createElement('div');
        testContainer.id = 'test-app';
        testContainer.style.display = 'none'; // Hide during testing
        document.body.appendChild(testContainer);

        const paramsContainer = document.createElement('div');
        paramsContainer.id = 'params-test';
        paramsContainer.style.display = 'none';
        document.body.appendChild(paramsContainer);
    }

    // Run main test suite
    const tester = new SimplifiedRouterTest();
    await tester.runAllTests();

    // Run params mode test
    try {
        await testParamsMode();
    } catch (error) {
        console.error('❌ Params mode test failed:', error);
    }

    console.log('\n🏁 All tests completed!');
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runTests);
    } else {
        runTests();
    }
}

// Export for manual testing
export { SimplifiedRouterTest, runTests, TestHomePage, TestUsersPage, TestSettingsPage };

// Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SimplifiedRouterTest, runTests, TestHomePage, TestUsersPage, TestSettingsPage };
}