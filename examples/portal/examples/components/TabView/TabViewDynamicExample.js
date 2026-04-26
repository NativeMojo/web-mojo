import { Page, View, TabView } from 'web-mojo';

/**
 * TabViewDynamicExample — sibling demo: tabs added and removed at runtime.
 *
 * Doc:    docs/web-mojo/components/TabView.md
 * Route:  components/tab-view/dynamic
 *
 * Builds on TabViewExample by exercising `addTab(label, view, makeActive?)`
 * and `removeTab(label)`. Each "Add tab" click appends a fresh View; the
 * close button on each pill removes that tab. Removing the active tab
 * auto-activates the next remaining tab.
 *
 * Copy-paste recipe: hold a TabView reference, call its public methods, and
 * let it manage child lifecycle for you — never call render()/mount() on the
 * inserted view.
 */
class TabViewDynamicExample extends Page {
    static pageName = 'components/tab-view/dynamic';
    static route = 'components/tab-view/dynamic';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TabViewDynamicExample.pageName,
            route: TabViewDynamicExample.route,
            title: 'TabView — dynamic',
            template: TabViewDynamicExample.TEMPLATE,
        });
        this.tabCounter = 1;
    }

    async onInit() {
        await super.onInit();
        this.tabs = new TabView({
            containerId: 'tabs-slot',
            tabs: {
                'Tab 1': this._buildTabView(1),
            },
            activeTab: 'Tab 1',
        });
        this.addChild(this.tabs);
        this.tabs.on('tab:added', () => this.render());
        this.tabs.on('tab:removed', () => this.render());
    }

    async onActionAddTab() {
        this.tabCounter += 1;
        const label = `Tab ${this.tabCounter}`;
        await this.tabs.addTab(label, this._buildTabView(this.tabCounter), true);
    }

    async onActionRemoveCurrent() {
        const active = this.tabs.getActiveTab();
        if (active) await this.tabs.removeTab(active);
    }

    _buildTabView(n) {
        return new View({
            template: `<h5>Dynamic tab #${n}</h5>
                       <p class="mb-0">Created at ${new Date().toLocaleTimeString()}.
                       Click <em>Remove current</em> to drop this tab.</p>`,
        });
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TabView — dynamic</h1>
            <p class="example-summary">
                Add and remove tabs at runtime via <code>addTab()</code> / <code>removeTab()</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TabView.md">
                    docs/web-mojo/components/TabView.md
                </a>
            </p>

            <div class="d-flex gap-2 mb-3">
                <button class="btn btn-primary" data-action="add-tab">
                    <i class="bi bi-plus-lg"></i> Add tab
                </button>
                <button class="btn btn-outline-danger" data-action="remove-current">
                    <i class="bi bi-x-lg"></i> Remove current
                </button>
            </div>

            <div class="card">
                <div class="card-body">
                    <div data-container="tabs-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default TabViewDynamicExample;
