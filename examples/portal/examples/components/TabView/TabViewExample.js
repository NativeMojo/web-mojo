import { Page, View, TabView } from 'web-mojo';

/**
 * TabViewExample — canonical demo of the TabView extension.
 *
 * Doc:    docs/web-mojo/components/TabView.md
 * Route:  components/tab-view
 *
 * TabView is a Bootstrap-styled tabbed interface that automatically collapses
 * to a dropdown when there isn't room. Pass a `tabs:` map of label→View, drop
 * a `<div data-container>`, and let the framework lazy-mount each tab's view
 * on activation.
 *
 * Each child here is a plain View with an inline template — TabView calls the
 * normal lifecycle, so anything you'd put in `onAfterMount()` works as you'd
 * expect. The status box below subscribes to the `tab:changed` event.
 */
class TabViewExample extends Page {
    static pageName = 'components/tab-view';
    static route = 'components/tab-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TabViewExample.pageName,
            route: TabViewExample.route,
            title: 'TabView — static tabs',
            template: TabViewExample.TEMPLATE,
        });
        this.lastChange = null;
    }

    async onInit() {
        await super.onInit();

        const overview = new View({
            template: '<h5>Overview</h5><p class="mb-0">High-level summary tab. Lazy-mounted on first activation.</p>',
        });
        const details = new View({
            template: '<h5>Details</h5><p class="mb-0">Drill-down tab. Each tab is a real View with full lifecycle.</p>',
        });
        const settings = new View({
            template: '<h5>Settings</h5><p class="mb-0">Configuration tab. Try resizing the window — TabView collapses to a dropdown when narrow.</p>',
        });

        this.tabs = new TabView({
            containerId: 'tabs-slot',
            tabs: { 'Overview': overview, 'Details': details, 'Settings': settings },
            activeTab: 'Overview',
        });
        this.addChild(this.tabs);

        this.tabs.on('tab:changed', ({ activeTab, previousTab }) => {
            this.lastChange = `${previousTab || '—'} → ${activeTab}`;
            this.render();
        });
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TabView</h1>
            <p class="example-summary">
                Bootstrap tabs with lazy mounting and automatic dropdown fallback on narrow screens.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TabView.md">
                    docs/web-mojo/components/TabView.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <div data-container="tabs-slot"></div>
                </div>
            </div>

            <div class="alert alert-secondary mb-0">
                <strong>Last tab change:</strong>
                <span class="ms-2">{{#lastChange|bool}}{{lastChange}}{{/lastChange|bool}}{{^lastChange|bool}}<em>(none yet — click a tab)</em>{{/lastChange|bool}}</span>
            </div>
        </div>
    `;
}

export default TabViewExample;
