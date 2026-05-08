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
    });
};
