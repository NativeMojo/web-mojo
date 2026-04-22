/**
 * Router Unit Tests
 *
 * The Router was rewritten to a simpler, page-parameter-oriented shape
 * (constructor + addRoute/navigate/parseInput/matchRoute, with routes as an
 * array). The previous tests in this file targeted an entirely different
 * API (options.mode/base/pageParam, routes as a Map, parseQuery /
 * removeRoute / getCurrentUrl / handleRoute / normalizePath /
 * extractParams). Those are not coming back — this file is a minimal
 * replacement that exercises the CURRENT public surface.
 */

const { SimpleModuleLoader } = require('../utils/simple-module-loader.js');
const loader = new SimpleModuleLoader();

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const Router = loader.loadModule('Router');

    describe('Router', () => {
        describe('constructor', () => {
            it('should default to "home" as the default route', () => {
                const router = new Router();
                expect(router.defaultRoute).toBe('home');
                expect(router.routes).toEqual([]);
                expect(router.currentRoute).toBe(null);
            });

            it('should accept a custom defaultRoute and eventEmitter', () => {
                const eventEmitter = { emit: () => {} };
                const router = new Router({ defaultRoute: 'dashboard', eventEmitter });
                expect(router.defaultRoute).toBe('dashboard');
                expect(router.eventEmitter).toBe(eventEmitter);
            });
        });

        describe('addRoute', () => {
            it('should register a static route', () => {
                const router = new Router();
                router.addRoute('/admin', 'admin');

                expect(router.routes).toHaveLength(1);
                expect(router.routes[0].pageName).toBe('admin');
                expect(router.routes[0].pattern).toBe('/admin');
                expect(router.routes[0].paramNames).toEqual([]);
            });

            it('should register a parameterized route and extract param names', () => {
                const router = new Router();
                router.addRoute('/users/:id', 'user-detail');

                expect(router.routes[0].paramNames).toEqual(['id']);
            });
        });

        describe('matchRoute', () => {
            it('should return null when no route matches', () => {
                const router = new Router();
                router.addRoute('/admin', 'admin');
                expect(router.matchRoute('/nothing-here')).toBe(null);
            });

            it('should match a static route', () => {
                const router = new Router();
                router.addRoute('/admin', 'admin');
                const match = router.matchRoute('/admin');
                expect(match).toBeDefined();
                expect(match.pageName).toBe('admin');
                expect(match.params).toEqual({});
            });

            it('should extract params from a parameterized route', () => {
                const router = new Router();
                router.addRoute('/users/:id', 'user-detail');
                const match = router.matchRoute('/users/42');
                expect(match).toBeDefined();
                expect(match.pageName).toBe('user-detail');
                expect(match.params).toEqual({ id: '42' });
            });
        });

        describe('parseInput', () => {
            it('should return the default route when given empty input', () => {
                const router = new Router();
                const out = router.parseInput('');
                expect(out.pageName).toBe('home');
                expect(out.queryParams).toEqual({});
            });

            it('should read a bare page name as-is', () => {
                const router = new Router();
                expect(router.parseInput('admin').pageName).toBe('admin');
            });

            it('should strip a leading slash', () => {
                const router = new Router();
                expect(router.parseInput('/admin').pageName).toBe('admin');
            });

            it('should prefer ?page=... when present in the query string', () => {
                const router = new Router();
                const out = router.parseInput('?page=users&sort=name');
                expect(out.pageName).toBe('users');
                expect(out.queryParams).toEqual({ sort: 'name' });
            });

            it('should fall back to the path segment when ?page= is absent', () => {
                const router = new Router();
                const out = router.parseInput('/admin?tab=billing');
                expect(out.pageName).toBe('admin');
                expect(out.queryParams).toEqual({ tab: 'billing' });
            });
        });

        describe('buildPublicUrl', () => {
            it('should include page= and any extra params', () => {
                const router = new Router();
                const url = router.buildPublicUrl('admin', { group: '123', active: 'true' });
                expect(url.startsWith('?page=admin')).toBe(true);
                expect(url).toContain('group=123');
                expect(url).toContain('active=true');
            });

            it('should omit null/undefined/empty values', () => {
                const router = new Router();
                const url = router.buildPublicUrl('admin', { a: '', b: null, c: undefined, d: 'kept' });
                expect(url).toContain('d=kept');
                expect(url).not.toContain('a=');
                expect(url).not.toContain('b=');
                expect(url).not.toContain('c=');
            });
        });
    });
};
