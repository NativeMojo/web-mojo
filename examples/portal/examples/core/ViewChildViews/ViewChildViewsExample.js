import { Page, View } from 'web-mojo';

/**
 * ViewChildViewsExample — composing a Page from named child views.
 *
 * Doc:    docs/web-mojo/core/ViewChildViews.md
 * Route:  core/view-child-views
 *
 * Three independent child views (Header, Counter, Stats) are mounted into
 * three named containers in the parent template via `containerId`. Each
 * child manages its own state and template; the parent never calls
 * `child.render()` or `child.mount()` — `addChild()` does that work.
 *
 * The Counter child re-renders itself when clicked. The Stats child reads
 * shared state from the parent through a method (`getCount`) so adding a
 * click in Counter is reflected on Stats only when Stats re-renders. The
 * "Refresh stats" button on Stats demonstrates that update.
 */
class HeaderView extends View {
    constructor(options = {}) {
        super({ ...options, template: HeaderView.TEMPLATE });
        this.title = options.title || 'Composite View Demo';
    }
    static TEMPLATE = `<h5 class="mb-1"><i class="bi bi-collection"></i> {{title}}</h5>`;
}

class CounterView extends View {
    constructor(options = {}) {
        super({ ...options, template: CounterView.TEMPLATE, className: 'p-2' });
        this.count = 0;
    }
    onActionInc() {
        this.count++;
        this.parent.totalClicks++;
        this.render();
    }
    static TEMPLATE = `
        <div>
            <strong>Counter child</strong>
            <span class="badge text-bg-primary ms-2">{{count}}</span>
            <button class="btn btn-sm btn-outline-primary ms-2" data-action="inc">
                <i class="bi bi-plus-lg"></i> Click
            </button>
        </div>
    `;
}

class StatsView extends View {
    constructor(options = {}) {
        super({ ...options, template: StatsView.TEMPLATE, className: 'p-2 text-muted small' });
    }
    onActionRefresh() { this.render(); }
    getTotal() { return this.parent ? this.parent.totalClicks : 0; }
    static TEMPLATE = `
        <div class="d-flex align-items-center gap-2">
            <span>Stats child sees: <strong>{{getTotal}}</strong> total clicks</span>
            <button class="btn btn-sm btn-outline-secondary" data-action="refresh">
                <i class="bi bi-arrow-clockwise"></i> Refresh stats
            </button>
        </div>
    `;
}

class ViewChildViewsExample extends Page {
    static pageName = 'core/view-child-views';
    static route = 'core/view-child-views';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ViewChildViewsExample.pageName,
            route: ViewChildViewsExample.route,
            title: 'View — child views',
            template: ViewChildViewsExample.TEMPLATE,
        });
        this.totalClicks = 0;
    }

    async onInit() {
        await super.onInit();
        this.addChild(new HeaderView({ containerId: 'header-slot', title: 'Composite View Demo' }));
        this.addChild(new CounterView({ containerId: 'counter-slot' }));
        this.addChild(new StatsView({ containerId: 'stats-slot' }));
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Child Views</h1>
            <p class="example-summary">
                Compose a parent view from independent children. Each child is mounted into a
                named container and manages its own lifecycle.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/core/ViewChildViews.md" target="_blank">
                    docs/web-mojo/core/ViewChildViews.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div class="border rounded mb-3" data-container="header-slot"></div>
                    <div class="border rounded mb-3" data-container="counter-slot"></div>
                    <div class="border rounded" data-container="stats-slot"></div>

                    <p class="text-muted small mt-3 mb-0">
                        Click the counter, then click <em>Refresh stats</em> to see the stats child
                        pull updated state from the parent.
                    </p>
                </div>
            </div>
        </div>
    `;
}

export default ViewChildViewsExample;
