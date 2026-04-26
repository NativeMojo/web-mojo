/**
 * Smoke tests for the examples portal registry.
 *
 * These tests run the registry generator and verify:
 *   - Every example.json validates against the schema (build script wraps fail()).
 *   - Every referenced page file exists.
 *   - Every route is globally unique.
 *   - The generator is idempotent — running twice produces a byte-identical registry.
 */

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const fs = require('fs');
    const path = require('path');
    const { execFileSync } = require('child_process');

    const REPO_ROOT = path.resolve(__dirname, '../..');
    const REGISTRY_PATH = path.join(REPO_ROOT, 'examples/portal/examples.registry.json');
    const SCRIPT_PATH = path.join(REPO_ROOT, 'examples/portal/scripts/build-registry.js');
    const EXAMPLES_ROOT = path.join(REPO_ROOT, 'examples/portal/examples');

    function runGenerator() {
        execFileSync('node', [SCRIPT_PATH], { cwd: REPO_ROOT, stdio: 'pipe' });
    }

    function loadRegistry() {
        return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    }

    describe('examples registry generator', () => {
        it('exits zero on a clean tree', () => {
            // execFileSync throws on non-zero exit. If we get here, exit code was 0.
            runGenerator();
            expect(fs.existsSync(REGISTRY_PATH)).toBe(true);
        });

        it('produces a registry with at least one page', () => {
            runGenerator();
            const reg = loadRegistry();
            expect(Array.isArray(reg.pages)).toBe(true);
            expect(reg.pages.length).toBeGreaterThan(0);
            expect(reg.pageCount).toBe(reg.pages.length);
        });

        it('every page references an existing source file', () => {
            const reg = loadRegistry();
            for (const p of reg.pages) {
                const sourceAbs = path.join(REPO_ROOT, p.sourcePath);
                expect(fs.existsSync(sourceAbs)).toBe(true);
            }
        });

        it('every page has a non-empty route, title, summary, and module path', () => {
            const reg = loadRegistry();
            for (const p of reg.pages) {
                expect(typeof p.route).toBe('string');
                expect(p.route.length).toBeGreaterThan(0);
                expect(typeof p.title).toBe('string');
                expect(p.title.length).toBeGreaterThan(0);
                expect(typeof p.summary).toBe('string');
                expect(p.summary.length).toBeGreaterThan(0);
                expect(typeof p.modulePath).toBe('string');
                expect(p.modulePath.startsWith('./examples/')).toBe(true);
            }
        });

        it('routes are globally unique', () => {
            const reg = loadRegistry();
            const seen = new Set();
            for (const p of reg.pages) {
                expect(seen.has(p.route)).toBe(false);
                seen.add(p.route);
            }
        });

        it('the menu mirrors area order from docs/web-mojo/', () => {
            const reg = loadRegistry();
            const KNOWN_AREAS = ['core', 'pages', 'services', 'components', 'extensions', 'forms', 'forms/inputs', 'models'];
            const knownIdx = (a) => {
                const i = KNOWN_AREAS.indexOf(a);
                return i === -1 ? 999 : i;
            };
            const areas = reg.menu.map(m => m.area);
            for (let i = 1; i < areas.length; i++) {
                expect(knownIdx(areas[i - 1])).toBeLessThanOrEqual(knownIdx(areas[i]));
            }
        });

        it('module paths point inside examples/portal/examples/', () => {
            const reg = loadRegistry();
            for (const p of reg.pages) {
                const folderAbs = path.join(REPO_ROOT, path.dirname(p.sourcePath));
                expect(folderAbs.startsWith(EXAMPLES_ROOT)).toBe(true);
            }
        });

        it('the second run produces a byte-identical registry', () => {
            runGenerator();
            const a = fs.readFileSync(REGISTRY_PATH);
            runGenerator();
            const b = fs.readFileSync(REGISTRY_PATH);
            expect(a.equals(b)).toBe(true);
        });

        it('every page has a non-empty topic and group', () => {
            const reg = loadRegistry();
            for (const p of reg.pages) {
                expect(typeof p.topic).toBe('string');
                expect(p.topic.length).toBeGreaterThan(0);
                expect(typeof p.group).toBe('string');
                expect(p.group.length).toBeGreaterThan(0);
            }
        });

        it('every flat-page route appears in exactly one topic group', () => {
            const reg = loadRegistry();
            const seen = new Map();
            for (const t of reg.topics) {
                for (const g of t.groups) {
                    for (const i of g.items) {
                        expect(seen.has(i.route)).toBe(false);
                        seen.set(i.route, `${t.name}/${g.label}`);
                    }
                }
            }
            for (const p of reg.pages) {
                expect(seen.has(p.route)).toBe(true);
            }
        });

        it('no topic item has children (collapsible parents are unreachable from the sidebar)', () => {
            const reg = loadRegistry();
            for (const t of reg.topics) {
                for (const g of t.groups) {
                    for (const i of g.items) {
                        expect(i.children).toBeUndefined();
                    }
                }
            }
        });

        it('every topic has a unique name and at least one group', () => {
            const reg = loadRegistry();
            expect(Array.isArray(reg.topics)).toBe(true);
            expect(reg.topics.length).toBeGreaterThan(0);
            const names = new Set();
            for (const t of reg.topics) {
                expect(typeof t.name).toBe('string');
                expect(t.name.length).toBeGreaterThan(0);
                expect(names.has(t.name)).toBe(false);
                names.add(t.name);
                expect(Array.isArray(t.groups)).toBe(true);
                expect(t.groups.length).toBeGreaterThan(0);
            }
        });

        it('the curated Start Here routes all resolve to existing pages', () => {
            const reg = loadRegistry();
            const known = new Set(reg.pages.map(p => p.route));
            const startHereRoutes = ['core/view', 'core/templates', 'core/model', 'pages/page', 'core/web-app'];
            for (const r of startHereRoutes) {
                expect(known.has(r)).toBe(true);
            }
        });
    });
};
