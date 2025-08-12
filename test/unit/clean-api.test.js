/**
 * Unit tests for the clean WebApp.registerPage API
 * Tests the simplified (name, PageClass, options) pattern
 */

import WebApp from '../../src/app/WebApp.js';
import Page from '../../src/core/Page.js';

describe('Clean registerPage API', () => {
    let app;

    beforeEach(() => {
        // Mock DOM
        document.body.innerHTML = '<div id="app"></div>';
        
        // Create app instance
        app = new WebApp({
            name: 'Test App',
            container: '#app'
        });
    });

    afterEach(async () => {
        // Cleanup
        if (app) {
            await app.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('registerPage(name, PageClass, options)', () => {
        test('should register a page with explicit name', () => {
            class TestPage extends Page {
                async getTemplate() {
                    return '<div>Test Page</div>';
                }
            }

            app.registerPage('test', TestPage);

            expect(app.pageClasses.has('test')).toBe(true);
            const pageInfo = app.pageClasses.get('test');
            expect(pageInfo.PageClass).toBe(TestPage);
            expect(pageInfo.constructorOptions).toEqual({});
        });

        test('should register a page with options', () => {
            class TestPage extends Page {
                constructor(options) {
                    super(options);
                    this.customOption = options.customOption;
                }
            }

            const options = {
                customOption: 'test-value',
                route: '/custom-test'
            };

            app.registerPage('test', TestPage, options);

            const pageInfo = app.pageClasses.get('test');
            expect(pageInfo.constructorOptions).toEqual(options);
        });

        test('should reject invalid inputs', () => {
            class TestPage extends Page {}

            // Invalid name
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            app.registerPage('', TestPage);
            expect(app.pageClasses.has('')).toBe(false);
            
            app.registerPage(null, TestPage);
            expect(app.pageClasses.size).toBe(0);
            
            // Invalid PageClass
            app.registerPage('test', 'not-a-class');
            expect(app.pageClasses.has('test')).toBe(false);
            
            consoleSpy.mockRestore();
        });

        test('should add route when router exists', async () => {
            await app.setupRouter();

            class TestPage extends Page {}
            
            app.registerPage('test', TestPage, { route: '/test-route' });

            // Check route was added
            const route = Array.from(app.router.routes.values())
                .find(r => r.pageName === 'test');
            expect(route).toBeDefined();
            expect(route.pattern).toBe('/test-route');
        });

        test('should use default route when not specified', async () => {
            await app.setupRouter();

            class TestPage extends Page {}
            
            app.registerPage('test', TestPage);

            // Check default route was added
            const route = Array.from(app.router.routes.values())
                .find(r => r.pageName === 'test');
            expect(route).toBeDefined();
            expect(route.pattern).toBe('/test');
        });
    });

    describe('Page instance creation and caching', () => {
        test('should create page instance with constructor options', () => {
            class TestPage extends Page {
                constructor(options) {
                    super(options);
                    this.customValue = options.customValue;
                    this.testOption = options.testOption;
                }
            }

            const options = {
                customValue: 123,
                testOption: 'abc'
            };

            app.registerPage('test', TestPage, options);

            const page = app.getOrCreatePage('test');
            expect(page).toBeInstanceOf(TestPage);
            expect(page.customValue).toBe(123);
            expect(page.testOption).toBe('abc');
        });

        test('should cache page instances', () => {
            class TestPage extends Page {}

            app.registerPage('test', TestPage);

            const page1 = app.getOrCreatePage('test');
            const page2 = app.getOrCreatePage('test');

            expect(page1).toBe(page2); // Same instance
            expect(app.pageCache.size).toBe(1);
        });

        test('should set pageName on instance if not set', () => {
            class TestPage extends Page {
                constructor(options) {
                    super(options);
                    // Don't set pageName
                }
            }

            app.registerPage('my-page', TestPage);

            const page = app.getOrCreatePage('my-page');
            expect(page.pageName).toBe('my-page');
        });

        test('should set app reference on page instance', () => {
            class TestPage extends Page {}

            app.registerPage('test', TestPage);

            const page = app.getOrCreatePage('test');
            expect(page.app).toBe(app);
        });

        test('should call onInit on first creation', () => {
            const onInitSpy = jest.fn();

            class TestPage extends Page {
                onInit() {
                    super.onInit();
                    onInitSpy();
                }
            }

            app.registerPage('test', TestPage);

            const page1 = app.getOrCreatePage('test');
            expect(onInitSpy).toHaveBeenCalledTimes(1);

            const page2 = app.getOrCreatePage('test');
            expect(onInitSpy).toHaveBeenCalledTimes(1); // Not called again
        });
    });

    describe('Clean API benefits', () => {
        test('should support multiple pages with same class', () => {
            class ReusablePage extends Page {
                constructor(options) {
                    super(options);
                    this.title = options.title;
                }

                async getTemplate() {
                    return `<div>${this.title}</div>`;
                }
            }

            app.registerPage('page1', ReusablePage, { title: 'Page 1' });
            app.registerPage('page2', ReusablePage, { title: 'Page 2' });

            const page1 = app.getOrCreatePage('page1');
            const page2 = app.getOrCreatePage('page2');

            expect(page1.title).toBe('Page 1');
            expect(page2.title).toBe('Page 2');
            expect(page1).not.toBe(page2); // Different instances
        });

        test('should support clear page naming without ambiguity', () => {
            class MyComplexPageClassName extends Page {}

            // Clear, explicit naming
            app.registerPage('dashboard', MyComplexPageClassName);
            app.registerPage('admin', MyComplexPageClassName, { role: 'admin' });

            expect(app.pageClasses.has('dashboard')).toBe(true);
            expect(app.pageClasses.has('admin')).toBe(true);
            expect(app.pageClasses.has('MyComplexPageClassName')).toBe(false);
        });

        test('should support easy route overrides', () => {
            class TestPage extends Page {}

            app.registerPage('home', TestPage, { route: '/' });
            app.registerPage('about', TestPage, { route: '/about-us' });
            app.registerPage('contact', TestPage, { route: '/get-in-touch' });

            // All use same class but different routes
            const homeInfo = app.pageClasses.get('home');
            const aboutInfo = app.pageClasses.get('about');
            const contactInfo = app.pageClasses.get('contact');

            expect(homeInfo.constructorOptions.route).toBe('/');
            expect(aboutInfo.constructorOptions.route).toBe('/about-us');
            expect(contactInfo.constructorOptions.route).toBe('/get-in-touch');
        });
    });

    describe('Integration with router', () => {
        test('should handle navigation by page name', async () => {
            await app.setupRouter();

            class HomePage extends Page {
                async getTemplate() {
                    return '<div>Home</div>';
                }
            }

            class AboutPage extends Page {
                async getTemplate() {
                    return '<div>About</div>';
                }
            }

            app.registerPage('home', HomePage, { route: '/' });
            app.registerPage('about', AboutPage, { route: '/about' });

            await app.start();

            // Navigate by page name
            await app.router.navigateToPage('about');
            expect(app.currentPage.pageName).toBe('about');

            await app.router.navigateToPage('home');
            expect(app.currentPage.pageName).toBe('home');
        });

        test('should work with data-page navigation', async () => {
            await app.setupRouter();

            class TestPage extends Page {
                async getTemplate() {
                    return '<div>Test</div>';
                }
            }

            app.registerPage('test', TestPage, { route: '/test' });

            // Simulate View's navigation handling
            const pageName = 'test';
            const params = { id: '123' };

            // This is what View does internally
            if (app.router) {
                await app.router.navigateToPage(pageName, params);
            }

            expect(app.currentPage.pageName).toBe('test');
        });
    });

    describe('Error handling', () => {
        test('should warn when page not found', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const page = app.getOrCreatePage('non-existent');
            
            expect(page).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Page class not found for: non-existent');

            consoleSpy.mockRestore();
        });

        test('should handle missing PageClass gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            app.registerPage('test', null);
            expect(app.pageClasses.has('test')).toBe(false);

            app.registerPage('test2', undefined);
            expect(app.pageClasses.has('test2')).toBe(false);

            consoleSpy.mockRestore();
        });
    });

    describe('Simplified architecture benefits', () => {
        test('should have predictable registration pattern', () => {
            class PageA extends Page {}
            class PageB extends Page {}

            // Always the same pattern: name, class, options
            app.registerPage('a', PageA);
            app.registerPage('b', PageB, { custom: true });
            app.registerPage('c', PageA, { variant: 'alt' });

            expect(app.pageClasses.size).toBe(3);
            expect(app.pageClasses.get('a').PageClass).toBe(PageA);
            expect(app.pageClasses.get('b').PageClass).toBe(PageB);
            expect(app.pageClasses.get('c').PageClass).toBe(PageA);
        });

        test('should not need pageName in page constructor', () => {
            // Simple page without pageName in constructor
            class SimplePage extends Page {
                async getTemplate() {
                    return `<div>Page: ${this.pageName}</div>`;
                }
            }

            app.registerPage('simple', SimplePage);

            const page = app.getOrCreatePage('simple');
            expect(page.pageName).toBe('simple');
        });

        test('should support functional programming patterns', () => {
            // Factory function to create page classes
            const createPageClass = (title) => {
                return class extends Page {
                    async getTemplate() {
                        return `<div><h1>${title}</h1></div>`;
                    }
                };
            };

            // Register pages using factory
            app.registerPage('products', createPageClass('Products'));
            app.registerPage('services', createPageClass('Services'));
            app.registerPage('about', createPageClass('About Us'));

            const products = app.getOrCreatePage('products');
            const services = app.getOrCreatePage('services');

            expect(products.constructor).not.toBe(services.constructor);
            expect(app.pageClasses.size).toBe(3);
        });
    });
});