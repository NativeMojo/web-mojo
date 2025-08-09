/**
 * Page Events System Tests
 * Tests for event-driven page navigation
 */

const { SimpleModuleLoader } = require('../utils/simple-module-loader.js');
const loader = new SimpleModuleLoader();

module.exports = async function() {
    // Load required modules
    const Router = loader.loadModule('Router');
    const Page = loader.loadModule('Page');
    const EventBus = loader.loadModule('EventBus');
    
    // Setup global MOJO with event bus for tests
    global.window = global.window || {};
    global.window.MOJO = {
        eventBus: new EventBus()
    };
    
    describe('Page Events System', () => {
        let router;
        let eventData;
        let mockContainer;
        
        function setupMocks() {
            // Mock container
            mockContainer = {
                innerHTML: '',
                querySelector: () => null,
                addEventListener: () => {},
                removeEventListener: () => {}
            };
            
            // Mock document
            global.document = {
                querySelector: () => mockContainer,
                title: '',
                addEventListener: () => {},
                removeEventListener: () => {}
            };
            
            // Reset event data
            eventData = {
                beforeChange: null,
                changed: null,
                activated: null,
                deactivated: null
            };
        }
        
        function cleanup() {
            if (router && router.stop) {
                router.stop();
            }
            router = null;
        }
        
        describe('Page Lifecycle Events', () => {
            it('should fire page:before-change event', async () => {
                setupMocks();
                router = new Router();
                
                let beforeChangeData = null;
                window.MOJO.eventBus.on('page:before-change', (data) => {
                    beforeChangeData = data;
                });
                
                // Create test page
                class TestPage extends Page {
                    constructor() {
                        super({
                            page_name: 'Test',
                            route: '/test',
                            pageIcon: 'bi bi-test',
                            displayName: 'Test Page'
                        });
                    }
                }
                
                router.addRoute('/test', TestPage);
                await router.handleRoute('/test', {}, {});
                
                assertTrue(beforeChangeData !== null, 'Should fire before-change event');
                assertEqual(beforeChangeData.incomingRoute, '/test', 'Should have incoming route');
                
                cleanup();
            });
            
            it('should fire page:changed event with previous and current page', async () => {
                setupMocks();
                router = new Router();
                
                let changedData = null;
                window.MOJO.eventBus.on('page:changed', (data) => {
                    changedData = data;
                });
                
                // Create test pages
                class HomePage extends Page {
                    constructor() {
                        super({
                            page_name: 'Home',
                            route: '/',
                            pageIcon: 'bi bi-house'
                        });
                    }
                }
                
                class AboutPage extends Page {
                    constructor() {
                        super({
                            page_name: 'About',
                            route: '/about',
                            pageIcon: 'bi bi-info-circle'
                        });
                    }
                }
                
                router.addRoute('/', HomePage);
                router.addRoute('/about', AboutPage);
                
                // Navigate to home first
                await router.handleRoute('/', {}, {});
                
                // Then navigate to about
                await router.handleRoute('/about', {}, {});
                
                assertTrue(changedData !== null, 'Should fire changed event');
                assertEqual(changedData.currentPage.name, 'About', 'Current page should be About');
                assertEqual(changedData.previousPage.name, 'Home', 'Previous page should be Home');
                
                cleanup();
            });
            
            it('should call onActivate and onDeactivate methods', async () => {
                setupMocks();
                router = new Router();
                
                let page1Activated = false;
                let page1Deactivated = false;
                let page2Activated = false;
                
                class Page1 extends Page {
                    constructor() {
                        super({ page_name: 'Page1', route: '/page1' });
                    }
                    async onActivate() {
                        await super.onActivate();
                        page1Activated = true;
                    }
                    async onDeactivate() {
                        await super.onDeactivate();
                        page1Deactivated = true;
                    }
                }
                
                class Page2 extends Page {
                    constructor() {
                        super({ page_name: 'Page2', route: '/page2' });
                    }
                    async onActivate() {
                        await super.onActivate();
                        page2Activated = true;
                    }
                }
                
                router.addRoute('/page1', Page1);
                router.addRoute('/page2', Page2);
                
                // Navigate to page1
                await router.handleRoute('/page1', {}, {});
                assertTrue(page1Activated, 'Page1 should be activated');
                
                // Navigate to page2
                await router.handleRoute('/page2', {}, {});
                assertTrue(page1Deactivated, 'Page1 should be deactivated');
                assertTrue(page2Activated, 'Page2 should be activated');
                
                cleanup();
            });
        });
        
        describe('Page Metadata', () => {
            it('should include page metadata in events', async () => {
                setupMocks();
                router = new Router();
                
                let activatedData = null;
                window.MOJO.eventBus.on('page:activated', (data) => {
                    activatedData = data;
                });
                
                class RichPage extends Page {
                    constructor() {
                        super({
                            page_name: 'Dashboard',
                            route: '/dashboard',
                            pageIcon: 'bi bi-speedometer2',
                            displayName: 'Analytics Dashboard',
                            pageDescription: 'Real-time metrics and insights'
                        });
                    }
                }
                
                router.addRoute('/dashboard', RichPage);
                await router.handleRoute('/dashboard', {}, {});
                
                assertTrue(activatedData !== null, 'Should fire activated event');
                assertEqual(activatedData.page.icon, 'bi bi-speedometer2', 'Should have correct icon');
                assertEqual(activatedData.page.displayName, 'Analytics Dashboard', 'Should have display name');
                assertEqual(activatedData.page.description, 'Real-time metrics and insights', 'Should have description');
                
                cleanup();
            });
            
            it('should update document title on activation', async () => {
                setupMocks();
                router = new Router();
                
                class TitledPage extends Page {
                    constructor() {
                        super({
                            page_name: 'Settings',
                            route: '/settings',
                            title: 'Settings - MyApp'
                        });
                    }
                }
                
                router.addRoute('/settings', TitledPage);
                await router.handleRoute('/settings', {}, {});
                
                assertEqual(document.title, 'Settings - MyApp', 'Document title should be updated');
                
                cleanup();
            });
        });
        
        describe('Event Data Structure', () => {
            it('should include params and query in page events', async () => {
                setupMocks();
                router = new Router();
                
                let changedData = null;
                window.MOJO.eventBus.on('page:changed', (data) => {
                    changedData = data;
                });
                
                class UserPage extends Page {
                    constructor() {
                        super({
                            page_name: 'User',
                            route: '/users/:id'
                        });
                    }
                }
                
                router.addRoute('/users/:id', UserPage);
                await router.handleRoute('/users/123', { extra: 'param' }, { tab: 'profile', view: 'details' });
                
                assertTrue(changedData !== null, 'Should fire changed event');
                assertEqual(changedData.params.extra, 'param', 'Should include params');
                assertEqual(changedData.query.tab, 'profile', 'Should include query');
                assertEqual(changedData.query.view, 'details', 'Should include all query params');
                
                cleanup();
            });
        });
        
        describe('Page State Management', () => {
            it('should track active state correctly', async () => {
                setupMocks();
                router = new Router();
                
                let page1Instance = null;
                let page2Instance = null;
                
                class StatePage1 extends Page {
                    constructor() {
                        super({ page_name: 'State1', route: '/state1' });
                        page1Instance = this;
                    }
                }
                
                class StatePage2 extends Page {
                    constructor() {
                        super({ page_name: 'State2', route: '/state2' });
                        page2Instance = this;
                    }
                }
                
                router.addRoute('/state1', StatePage1);
                router.addRoute('/state2', StatePage2);
                
                // Navigate to page1
                await router.handleRoute('/state1', {}, {});
                assertTrue(page1Instance.isActive, 'Page1 should be active');
                
                // Navigate to page2
                await router.handleRoute('/state2', {}, {});
                assertFalse(page1Instance.isActive, 'Page1 should be inactive');
                assertTrue(page2Instance.isActive, 'Page2 should be active');
                
                cleanup();
            });
        });
    });
};