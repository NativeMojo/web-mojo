import { Page, TableView, Collection } from 'web-mojo';

/**
 * TableViewLiveWatchExample — autoRefresh `mode: 'models'` + changed-row flash.
 *
 * Doc:    docs/web-mojo/components/ListView.md#auto-refresh
 * Route:  components/table-view/live-watch
 *
 * `autoRefresh: { every: 5, mode: 'models' }` watches the rows already on
 * screen instead of refetching the page:
 *
 *   1. Each tick sends ONE batched `id__in` request for the current model ids
 *      (here answered offline by `refreshModels()`), merged into the existing
 *      model instances — no add/remove/reset, so the table is never rebuilt,
 *      never re-sorted, never paginated away from under you, and never blinks
 *      to its loading skeleton.
 *   2. Rows whose data actually changed get a brief highlight. Steady rows stay
 *      quiet, so the flash means "this one moved", not "a refresh happened".
 *   3. `rowStripe` keeps painting its severity bar underneath the flash — the
 *      two features use different CSS properties on purpose.
 *
 * Ticks pause while the tab is hidden or a row is selected, and regaining focus
 * fires an immediate refresh — click away and back to watch a tick land.
 */
const WORKERS = ['worker-a', 'worker-b', 'worker-c'];

const SEED_JOBS = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `import-batch-${String(i + 1).padStart(3, '0')}`,
    worker: WORKERS[i % WORKERS.length],
    status: i % 6 === 0 ? 'failed' : (i < 9 ? 'running' : 'queued'),
    progress: i % 6 === 0 ? 0 : (i * 7) % 95,
}));

/**
 * Offline stand-in for a REST collection. Overriding `refreshModels()` is the
 * models-mode equivalent of overriding `fetch()` — same seam, so the example
 * runs with no backend. A real collection needs neither override.
 */
class FakeJobsCollection extends Collection {
    constructor() {
        super({ endpoint: '/fake/jobs', size: 25 });
        this.restEnabled = true;
        this.reset(SEED_JOBS.map((job) => ({ ...job })));
        this.meta = { count: SEED_JOBS.length };
        this.lastFetchTime = Date.now(); // nothing to fetch — we seeded ourselves
    }

    /** The demo never needs a full refetch; models mode carries the updates. */
    async fetch() {
        return { success: true, data: this.models, meta: this.meta };
    }

    /**
     * Advance a couple of the watched jobs, and report exactly which keys moved.
     * The real implementation returns the same shape from one `id__in` request.
     */
    async refreshModels(ids) {
        const watched = new Set(ids.map(String));
        const changed = new Map();

        this.models
            .filter((model) => watched.has(String(model.id)) && model.get('status') === 'running')
            .slice(0, 2)
            .forEach((model) => {
                const next = Math.min(100, model.get('progress') + 5 + Math.floor(Math.random() * 20));
                const patch = next >= 100 ? { progress: 100, status: 'complete' } : { progress: next };
                model.set(patch);
                changed.set(model.id, Object.keys(patch));
            });

        return { changed, missing: [], ok: true };
    }
}

class TableViewLiveWatchExample extends Page {
    static pageName = 'components/table-view/live-watch';
    static route = 'components/table-view/live-watch';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewLiveWatchExample.pageName,
            route: TableViewLiveWatchExample.route,
            title: 'TableView — live watch',
            template: TableViewLiveWatchExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.table = new TableView({
            containerId: 'table-slot',
            collection: new FakeJobsCollection(),
            columns: [
                { key: 'id', label: 'ID' },
                { key: 'name', label: 'Job' },
                { key: 'worker', label: 'Worker' },
                {
                    key: 'status',
                    label: 'Status',
                    formatter: 'badge:running=primary,complete=success,queued=secondary,failed=danger',
                },
                { key: 'progress', label: 'Progress %' },
            ],
            actions: [],
            selectable: true,
            batchActions: [{ action: 'cancel', label: 'Cancel', icon: 'bi bi-x-circle' }],
            tableOptions: { striped: true, hover: true, size: 'sm' },

            // Severity bar — deliberately on screen at the same time as the
            // flash, because the two paint different CSS properties.
            rowStripe: (model) => (model.get('status') === 'failed' ? 'danger' : null),

            // The feature: watch these rows, don't refetch the page.
            autoRefresh: { every: 5, mode: 'models' },
        });

        this.addChild(this.table);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — live watch</h1>
            <p class="example-summary">
                <code>autoRefresh: { every: 5, mode: 'models' }</code> refreshes only the rows
                already on screen — one batched <code>id__in</code> request merged in place —
                and flashes the rows whose data actually changed. Row order, membership,
                pagination and scroll position never move.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ListView.md">
                    docs/web-mojo/components/ListView.md#auto-refresh
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
                <div class="card-footer bg-light">
                    <small class="text-muted">
                        Two running jobs advance every 5&nbsp;s. Tick <strong>one</strong> row and the
                        refresh pauses (a refresh that reset your checkboxes mid-selection is worse
                        than staleness); clear it and the next tick goes through. Switch tabs and come
                        back to fire an immediate refresh. The failed row keeps its red severity bar
                        through every flash, and <code>prefers-reduced-motion</code> drops the
                        animation entirely.
                    </small>
                </div>
            </div>
        </div>
    `;
}

export default TableViewLiveWatchExample;
