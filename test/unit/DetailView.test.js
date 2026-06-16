/**
 * DetailView smoke tests
 *
 * Verifies the standard record-detail layout: header (icon, title, subtitle,
 * chips, active switch, actions, close X, context menu container) + sidenav.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach } = testContext;

    await testHelpers.setup();
    // Load DetailView (depends on SideNavView)
    const DetailViewModule = loadModule('DetailView');
    const DetailView = DetailViewModule;
    // Re-import for the named exports — the loader's default-vs-named handling
    const View = loadModule('View');

    // Minimal model stub
    function makeModel(attrs = {}) {
        const data = {
            id: 1,
            name: 'Test Record',
            category: 'demo',
            priority: 5,
            is_active: true,
            metadata: { reasoning: 'A description', assistant_proposed: true },
            ...attrs
        };
        const m = {
            attributes: data,
            get(k) { return data[k]; },
            set(k, v) { data[k] = v; },
            on() {}, off() {}
        };
        return m;
    }

    function makeSection(label) {
        return new View({
            template: `<div class="section-${label}">${label} content</div>`,
            tagName: 'div'
        });
    }

    describe('DetailView', () => {
        let dv;

        beforeEach(() => {
            dv = new DetailView({
                model: makeModel(),
                header: {
                    icon: 'bi-gear',
                    titleField: 'name',
                    subtitlePath: 'metadata.reasoning',
                    chips: [
                        { icon: 'bi-tag-fill', textPath: 'category', variant: 'primary' },
                        { icon: 'bi-flag', text: m => `Priority ${m.get('priority')}` }
                    ],
                    activeField: 'is_active'
                },
                sections: [
                    { key: 'one', label: 'One', icon: 'bi-1-circle', view: makeSection('one') },
                    { key: 'two', label: 'Two', icon: 'bi-2-circle', view: makeSection('two') }
                ],
                activeSection: 'one'
            });
        });

        it('renders header + sidenav containers and mounts both', async () => {
            await dv.render(false);
            expect(dv.element.querySelector('[data-container="detail-header"]')).toBeTruthy();
            expect(dv.element.querySelector('[data-container="detail-sidenav"]')).toBeTruthy();
            expect(dv.headerView).toBeTruthy();
            expect(dv.sideNav).toBeTruthy();
        });

        it('header renders title, subtitle, and resolved chips', async () => {
            await dv.render(false);
            const html = dv.headerView.element.innerHTML;
            expect(html).toContain('Test Record');           // titleField
            expect(html).toContain('A description');         // subtitlePath
            expect(html).toContain('demo');                  // textPath chip
            expect(html).toContain('Priority 5');            // text-fn chip
        });

        it('omits chip when its `when` predicate is false', async () => {
            const view = new DetailView({
                model: makeModel({ metadata: { assistant_proposed: false } }),
                header: {
                    icon: 'bi-x',
                    titleField: 'name',
                    chips: [
                        { icon: 'bi-stars', text: 'AI', variant: 'warning',
                          when: m => m.get('metadata')?.assistant_proposed }
                    ]
                },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await view.render(false);
            expect(view.headerView.element.innerHTML).not.toContain('AI');
        });

        it('evaluates a function `variant` against the model (no stringified source)', async () => {
            const view = new DetailView({
                model: makeModel({ is_active: true }),
                header: {
                    icon: 'bi-x',
                    titleField: 'name',
                    chips: [
                        { icon: 'bi-circle-fill',
                          text: 'Status',
                          variant: m => m.get('is_active') ? 'success' : 'secondary' }
                    ]
                },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await view.render(false);
            const html = view.headerView.element.innerHTML;
            expect(html).toContain('badge bg-success');     // function result used
            expect(html).not.toContain('bg-m=');            // not the stringified fn
            expect(html).not.toContain('=&gt;');            // not escaped arrow source
        });

        it('evaluates a function `icon` against the model', async () => {
            const view = new DetailView({
                model: makeModel({ is_active: false }),
                header: {
                    icon: 'bi-x',
                    titleField: 'name',
                    chips: [
                        { icon: m => m.get('is_active') ? 'bi-check-circle' : 'bi-x-circle',
                          text: 'Status' }
                    ]
                },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await view.render(false);
            const html = view.headerView.element.innerHTML;
            expect(html).toContain('bi bi-x-circle');       // function result used
            expect(html).not.toContain('=&gt;');            // not escaped arrow source
        });

        it('leaves string `variant`/`icon` unchanged (backward compatible)', async () => {
            const view = new DetailView({
                model: makeModel(),
                header: {
                    icon: 'bi-x',
                    titleField: 'name',
                    chips: [
                        { icon: 'bi-tag-fill', text: 'Tag', variant: 'primary' }
                    ]
                },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await view.render(false);
            const html = view.headerView.element.innerHTML;
            expect(html).toContain('badge bg-primary');
            expect(html).toContain('bi bi-tag-fill');
        });

        it('sanitizes a function `variant` carrying stray class tokens', async () => {
            const view = new DetailView({
                model: makeModel(),
                header: {
                    icon: 'bi-x',
                    titleField: 'name',
                    // Untrusted model data wired straight into variant.
                    chips: [
                        { text: 'Status', variant: () => 'success extra-class' }
                    ]
                },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await view.render(false);
            const html = view.headerView.element.innerHTML;
            expect(html).not.toContain('extra-class');       // stray token dropped
            expect(html).toContain('badge bg-light');        // falls back to safe default
        });

        it('re-colors a function-variant chip on model-change re-render', async () => {
            const m = makeModel({ is_active: true });
            const view = new DetailView({
                model: m,
                header: {
                    icon: 'bi-x',
                    titleField: 'name',
                    chips: [
                        { text: 'Status',
                          variant: model => model.get('is_active') ? 'success' : 'secondary' }
                    ]
                },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await view.render(false);
            expect(view.headerView.element.innerHTML).toContain('badge bg-success');

            m.set('is_active', false);
            await view.headerView.render();
            const html = view.headerView.element.innerHTML;
            expect(html).toContain('badge bg-secondary');
            expect(html).not.toContain('badge bg-success');
        });

        it('renders the active switch when activeField is set', async () => {
            await dv.render(false);
            const sw = dv.headerView.element.querySelector('input[type="checkbox"]');
            expect(sw).toBeTruthy();
            expect(sw.checked).toBe(true);
        });

        it('omits the active switch when activeField is null', async () => {
            const view = new DetailView({
                model: makeModel(),
                header: { icon: 'bi-x', titleField: 'name', activeField: null },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await view.render(false);
            const sw = view.headerView.element.querySelector('input[type="checkbox"]');
            expect(sw).toBeNull();
        });

        it('renders close X by default and supports closable: false', async () => {
            await dv.render(false);
            expect(dv.headerView.element.querySelector('.dh-close')).toBeTruthy();

            const noClose = new DetailView({
                model: makeModel(),
                header: { icon: 'bi-x', titleField: 'name', closable: false },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await noClose.render(false);
            expect(noClose.headerView.element.querySelector('.dh-close')).toBeNull();
        });

        it('exposes setBadge and showSection helpers', async () => {
            await dv.render(false);
            expect(typeof dv.setBadge).toBe('function');
            expect(typeof dv.showSection).toBe('function');
            // setBadge dispatches to the SideNav
            const ok = dv.setBadge('one', 5);
            expect(ok).toBe(true);
            const link = dv.element.querySelector('[data-section="one"]');
            expect(link.querySelector('.snv-badge')?.textContent).toBe('5');
        });

        // ── auxFn — right-gutter aux slot ────────────────────────

        it('renders the aux block when auxFn returns a non-empty string', async () => {
            const view = new DetailView({
                model: makeModel({ last_activity: 1700000000000 }),
                header: {
                    icon: 'bi-person',
                    titleField: 'name',
                    auxFn: (m) => `<span class="my-aux">last=${m.get('last_activity')}</span>`
                },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await view.render(false);
            const aux = view.headerView.element.querySelector('.dh-aux');
            expect(aux).toBeTruthy();
            expect(aux.querySelector('.my-aux')).toBeTruthy();
            expect(aux.innerHTML).toContain('last=1700000000000');
        });

        it('omits the aux wrapper when auxFn is missing or returns falsy', async () => {
            // No auxFn at all
            const a = new DetailView({
                model: makeModel(),
                header: { icon: 'bi-x', titleField: 'name' },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await a.render(false);
            expect(a.headerView.element.querySelector('.dh-aux')).toBeNull();

            // auxFn returns empty string
            const b = new DetailView({
                model: makeModel(),
                header: {
                    icon: 'bi-x',
                    titleField: 'name',
                    auxFn: () => ''
                },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await b.render(false);
            expect(b.headerView.element.querySelector('.dh-aux')).toBeNull();

            // auxFn returns null
            const c = new DetailView({
                model: makeModel(),
                header: {
                    icon: 'bi-x',
                    titleField: 'name',
                    auxFn: () => null
                },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await c.render(false);
            expect(c.headerView.element.querySelector('.dh-aux')).toBeNull();
        });

        it('aux output reflects model state on re-render', async () => {
            const m = makeModel({ counter: 1 });
            const view = new DetailView({
                model: m,
                header: {
                    icon: 'bi-person',
                    titleField: 'name',
                    auxFn: (model) => `<span class="counter">${model.get('counter')}</span>`
                },
                sections: [{ key: 'a', label: 'A', view: makeSection('a') }]
            });
            await view.render(false);
            expect(view.headerView.element.querySelector('.counter').textContent).toBe('1');

            // Mutate and re-render the header
            m.set('counter', 7);
            await view.headerView.render();
            expect(view.headerView.element.querySelector('.counter').textContent).toBe('7');
        });
    });
};
