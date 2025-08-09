/**
 * Router Unit Tests
 * Tests for MOJO Router class with focus on param mode functionality
 */

// Load test dependencies
const { SimpleModuleLoader } = require('../utils/simple-module-loader.js');
const loader = new SimpleModuleLoader();

module.exports = async function() {
    // Load Router module
    const Router = loader.loadModule('Router');
    
    describe('Router Tests', () => {
        let router;
        let mockContainer;

        function setupMocks() {
            // Mock container element
            mockContainer = {
                innerHTML: '',
                querySelector: () => null,
                addEventListener: () => {},
                removeEventListener: () => {}
            };

            // Mock document.querySelector to return our mock container
            if (global.document && global.document.querySelector) {
                const originalQuerySelector = global.document.querySelector;
                global.document.querySelector = (selector) => {
                    if (selector === '#app') {
                        return mockContainer;
                    }
                    return originalQuerySelector ? originalQuerySelector.call(global.document, selector) : null;
                };
            }

            // Mock window.location
            global.window = global.window || {};
            global.window.location = {
                href: 'http://localhost:3000/',
                pathname: '/',
                search: '',
                hash: ''
            };

            // Mock window.history
            global.window.history = {
                pushState: () => {},
                replaceState: () => {},
                back: () => {},
                forward: () => {},
                go: () => {}
            };

            // Mock event listeners
            global.window.addEventListener = () => {};
            global.window.removeEventListener = () => {};

            // Mock URL constructor
            global.URL = class {
                constructor(url, base) {
                    this.href = url || 'http://localhost:3000/';
                    this.searchParams = new Map();
                    
                    if (url && url.includes('?')) {
                        const [, search] = url.split('?');
                        search.split('&').forEach(pair => {
                            const [key, value = ''] = pair.split('=');
                            this.searchParams.set(decodeURIComponent(key), decodeURIComponent(value));
                        });
                    }
                }

                toString() {
                    const params = [];
                    this.searchParams.forEach((value, key) => {
                        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                    });
                    const queryString = params.join('&');
                    const baseUrl = this.href.split('?')[0];
                    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
                }
            };

            // Mock URLSearchParams
            global.URLSearchParams = class {
                constructor(search = '') {
                    this.params = new Map();
                    if (search) {
                        search.replace(/^\?/, '').split('&').forEach(pair => {
                            if (pair) {
                                const [key, value = ''] = pair.split('=');
                                this.params.set(decodeURIComponent(key), decodeURIComponent(value));
                            }
                        });
                    }
                }

                get(key) {
                    return this.params.get(key) || null;
                }

                set(key, value) {
                    this.params.set(key, value);
                }

                delete(key) {
                    this.params.delete(key);
                }

                toString() {
                    const pairs = [];
                    this.params.forEach((value, key) => {
                        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                    });
                    return pairs.join('&');
                }
            };
        }

        function cleanup() {
            if (router && router.stop) {
                router.stop();
            }
            router = null;
        }

        describe('Router Constructor', () => {
            it('should initialize with default options', () => {
                setupMocks();
                router = new Router();
                
                assertEqual(router.options.mode, 'param', 'Default mode should be param');
                assertEqual(router.options.base, '/', 'Default base should be /');
                assertEqual(router.options.pageParam, 'page', 'Default pageParam should be page');
                assertEqual(router.options.container, '#app', 'Default container should be #app');
                
                cleanup();
            });

            it('should accept custom options', () => {
                setupMocks();
                router = new Router({
                    mode: 'history',
                    base: '/app',
                    pageParam: 'route',
                    container: '#main'
                });
                
                assertEqual(router.options.mode, 'history', 'Custom mode should be set');
                assertEqual(router.options.base, '/app', 'Custom base should be set');
                assertEqual(router.options.pageParam, 'route', 'Custom pageParam should be set');
                assertEqual(router.options.container, '#main', 'Custom container should be set');
                
                cleanup();
            });

            it('should initialize empty routes and guards', () => {
                setupMocks();
                router = new Router();
                
                assertTrue(router.routes instanceof Map, 'Routes should be a Map');
                assertEqual(router.routes.size, 0, 'Routes should be empty initially');
                assertTrue(router.pageRegistry instanceof Map, 'PageRegistry should be a Map');
                assertEqual(router.pageRegistry.size, 0, 'PageRegistry should be empty initially');
                assertTrue(Array.isArray(router.guards.beforeEach), 'beforeEach guards should be array');
                assertTrue(Array.isArray(router.guards.afterEach), 'afterEach guards should be array');
                
                cleanup();
            });
        });

        describe('Param Mode Functionality', () => {
            it('should get current path from page parameter', () => {
                setupMocks();
                router = new Router({ mode: 'param' });
                global.window.location.search = '?page=dashboard';
                
                const path = router.getCurrentPath();
                assertEqual(path, '/dashboard', 'Should extract path from page parameter');
                
                cleanup();
            });

            it('should return root for home page', () => {
                setupMocks();
                router = new Router({ mode: 'param' });
                global.window.location.search = '?page=home';
                
                const path = router.getCurrentPath();
                assertEqual(path, '/', 'Home page should return root');
                
                cleanup();
            });

            it('should return root for missing page parameter', () => {
                setupMocks();
                router = new Router({ mode: 'param' });
                global.window.location.search = '';
                
                const path = router.getCurrentPath();
                assertEqual(path, '/', 'Missing page parameter should return root');
                
                cleanup();
            });

            it('should build URLs with page parameter', () => {
                setupMocks();
                router = new Router({ mode: 'param' });
                global.window.location.href = 'http://localhost:3000/?existing=value';
                
                const url = router.buildUrl('/dashboard');
                assertTrue(url.includes('page=dashboard'), 'URL should contain page parameter');
                
                cleanup();
            });

            it('should build home URL correctly', () => {
                setupMocks();
                router = new Router({ mode: 'param' });
                global.window.location.href = 'http://localhost:3000/';
                
                const url = router.buildUrl('/');
                assertTrue(url.includes('page=home'), 'Home URL should contain page=home');
                
                cleanup();
            });

            it('should get current URL from search params', () => {
                setupMocks();
                router = new Router({ mode: 'param' });
                global.window.location.search = '?page=dashboard&tab=analytics';
                
                const url = router.getCurrentUrl();
                assertEqual(url, '?page=dashboard&tab=analytics', 'Should return search params as current URL');
                
                cleanup();
            });
        });

        describe('Route Management', () => {
            it('should add routes correctly', () => {
                setupMocks();
                router = new Router();
                const handler = () => {};
                
                router.addRoute('/test', handler, { name: 'test' });
                
                assertTrue(router.routes.has('/test'), 'Route should be added');
                assertTrue(router.routes.has('@test'), 'Named route should be added');
                
                const route = router.routes.get('/test');
                assertEqual(route.path, '/test', 'Route path should match');
                assertEqual(route.handler, handler, 'Route handler should match');
                assertEqual(route.options.name, 'test', 'Route name should match');
                
                cleanup();
            });

            it('should register page names automatically', () => {
                setupMocks();
                router = new Router();
                
                // Create mock page class
                function TestPage() {}
                TestPage.prototype.page_name = 'TestPage';
                
                router.addRoute('/test', TestPage);
                
                assertTrue(router.pageRegistry.has('testpage'), 'Page name should be registered');
                assertEqual(router.pageRegistry.get('testpage'), '/test', 'Page route should match');
                
                cleanup();
            });

            it('should remove routes correctly', () => {
                setupMocks();
                router = new Router();
                const handler = () => {};
                
                router.addRoute('/test', handler, { name: 'test' });
                router.removeRoute('/test');
                
                assertFalse(router.routes.has('/test'), 'Route should be removed');
                assertFalse(router.routes.has('@test'), 'Named route should be removed');
                
                cleanup();
            });
        });

        describe('Page Parameter Filtering', () => {
            it('should filter page parameter from query in handleRoute', async () => {
                setupMocks();
                router = new Router({ mode: 'param' });
                
                let receivedParams, receivedQuery;
                const mockHandler = {
                    on_params: (params, query) => {
                        receivedParams = params;
                        receivedQuery = query;
                    },
                    render: async () => {
                        // Mock render function
                    },
                    mounted: false
                };
                
                router.addRoute('/dashboard', mockHandler);
                
                // Test that page parameter is filtered out
                await router.handleRoute('/dashboard', {}, { 
                    page: 'dashboard', 
                    tab: 'analytics',
                    filter: 'active'
                });
                
                assertEqual(typeof receivedQuery.page, 'undefined', 'Page parameter should be filtered out');
                assertEqual(receivedQuery.tab, 'analytics', 'Other parameters should be preserved');
                assertEqual(receivedQuery.filter, 'active', 'Other parameters should be preserved');
                
                cleanup();
            });

            it('should preserve other query parameters when filtering page param', async () => {
                setupMocks();
                router = new Router({ mode: 'param' });
                
                let receivedQuery;
                const mockHandler = {
                    on_params: (params, query) => {
                        receivedQuery = query;
                    },
                    render: async () => {},
                    mounted: false
                };
                
                router.addRoute('/users', mockHandler);
                
                await router.handleRoute('/users', {}, {
                    page: 'users',
                    sort: 'name',
                    order: 'asc',
                    limit: '50'
                });
                
                assertEqual(typeof receivedQuery.page, 'undefined', 'Page parameter should be filtered');
                assertEqual(receivedQuery.sort, 'name', 'Sort parameter should be preserved');
                assertEqual(receivedQuery.order, 'asc', 'Order parameter should be preserved');
                assertEqual(receivedQuery.limit, '50', 'Limit parameter should be preserved');
                
                cleanup();
            });
        });

        describe('Different Modes', () => {
            it('should work in history mode', () => {
                setupMocks();
                router = new Router({ mode: 'history' });
                global.window.location.pathname = '/dashboard';
                
                const path = router.getCurrentPath();
                assertEqual(path, '/dashboard', 'Should get path from pathname in history mode');
                
                const url = router.buildUrl('/settings');
                assertEqual(url, '/settings', 'Should build pathname URL in history mode');
                
                cleanup();
            });

            it('should work in hash mode', () => {
                setupMocks();
                router = new Router({ mode: 'hash' });
                global.window.location.hash = '#/dashboard';
                
                const path = router.getCurrentPath();
                assertEqual(path, '/dashboard', 'Should get path from hash in hash mode');
                
                const url = router.buildUrl('/settings');
                assertEqual(url, '#/settings', 'Should build hash URL in hash mode');
                
                cleanup();
            });
        });

        describe('Utility Methods', () => {
            it('should normalize paths correctly', () => {
                setupMocks();
                router = new Router();
                
                assertEqual(router.normalizePath(''), '/', 'Empty path should normalize to /');
                assertEqual(router.normalizePath('/'), '/', 'Root path should stay /');
                assertEqual(router.normalizePath('dashboard'), '/dashboard', 'Should add leading slash');
                assertEqual(router.normalizePath('/dashboard/'), '/dashboard', 'Should remove trailing slash');
                
                cleanup();
            });

            it('should parse query string correctly', () => {
                setupMocks();
                router = new Router();
                global.window.location.search = '?page=dashboard&tab=analytics&filter=active';
                
                const query = router.parseQuery();
                assertEqual(query.page, 'dashboard', 'Should parse page parameter');
                assertEqual(query.tab, 'analytics', 'Should parse tab parameter');
                assertEqual(query.filter, 'active', 'Should parse filter parameter');
                
                cleanup();
            });

            it('should handle empty query string', () => {
                setupMocks();
                router = new Router();
                global.window.location.search = '';
                
                const query = router.parseQuery();
                assertEqual(Object.keys(query).length, 0, 'Empty query should return empty object');
                
                cleanup();
            });
        });

        describe('Route Matching', () => {
            it('should match exact routes', () => {
                setupMocks();
                router = new Router();
                const handler = () => {};
                router.addRoute('/dashboard', handler);
                
                const route = router.matchRoute('/dashboard');
                assertTrue(!!route, 'Route should be found');
                assertEqual(route.handler, handler, 'Handler should match');
                
                cleanup();
            });

            it('should extract parameters from parameterized routes', () => {
                setupMocks();
                router = new Router();
                const handler = () => {};
                router.addRoute('/users/:id/posts/:postId', handler);
                
                const route = router.matchRoute('/users/123/posts/456');
                const params = router.extractParams(route, '/users/123/posts/456');
                
                assertEqual(params.id, '123', 'ID parameter should be extracted');
                assertEqual(params.postId, '456', 'PostID parameter should be extracted');
                
                cleanup();
            });

            it('should return null for no match', () => {
                setupMocks();
                router = new Router();
                
                const route = router.matchRoute('/nonexistent');
                assertEqual(route, null, 'Non-existent route should return null');
                
                cleanup();
            });
        });
    });
};