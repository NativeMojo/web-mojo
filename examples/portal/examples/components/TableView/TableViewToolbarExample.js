import { Page, View, TableView, Collection } from 'web-mojo';

/**
 * TableViewToolbarExample — everything you can put in the toolbar.
 *
 * Doc:    docs/web-mojo/components/TableView.md#custom-toolbar-buttons
 * Route:  components/table-view/toolbar
 *
 * Demonstrates:
 *   1. `toolbarButtons` in BOTH forms — a `handler:` callback (dispatched via
 *      `data-button-index`, called with `this` bound to the TableView) and an
 *      `action:` string (plain `data-action`, handled by whichever view in the
 *      chain defines `onAction<Kebab>` — here the Page).
 *   2. `permissions` on a toolbar button — an any-of, fail-closed gate. NOTE:
 *      this portal stubs `activeUser.hasPermission = () => true`
 *      (`examples/portal/app.js`), so the gated button DOES render here; in a
 *      real app it is hidden for anyone holding none of the listed permissions.
 *   3. `toolbarRight` — any View mounted into the toolbar's right slot.
 *   4. `title` / `eyebrow`, and the live `setTitle()` / `setEyebrow()` setters.
 *   5. `showRefresh: false`, `showFullscreen: false` — trimming the chrome.
 *   6. `searchPlaceholder` — the toolbar search input. (`searchPlacement:
 *      'dropdown'` is documented but NOT implemented — ListView only renders
 *      the input for the 'toolbar' value, so 'dropdown' hides search entirely.
 *      Use the default.)
 */
const ENVS = ['prod', 'staging', 'dev'];

const SEED_JOBS = Array.from({ length: 14 }, (_, i) => ({
    id: i + 1,
    name: `nightly-rollup-${String(i + 1).padStart(2, '0')}`,
    env: ENVS[i % ENVS.length],
    state: i % 5 === 0 ? 'failed' : 'ok',
    duration_s: 20 + ((i * 17) % 400),
    owner: ['alice', 'ben', 'carla', 'dan'][i % 4],
}));

/** A tiny View for the toolbar's right-hand slot. */
class QueueDepthView extends View {
    constructor(options = {}) {
        super({ className: 'd-flex align-items-center gap-2', ...options });
        this.depth = options.depth ?? 0;
    }

    setDepth(depth) {
        this.depth = depth;
        const el = this.element?.querySelector('[data-depth]');
        if (el) el.textContent = String(depth);
    }

    getTemplate() {
        return `
            <span class="text-body-secondary small text-uppercase" style="letter-spacing: 0.05em;">Queue</span>
            <span class="badge text-bg-secondary" data-depth>{{depth}}</span>
        `;
    }
}

class TableViewToolbarExample extends Page {
    static pageName = 'components/table-view/toolbar';
    static route = 'components/table-view/toolbar';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewToolbarExample.pageName,
            route: TableViewToolbarExample.route,
            title: 'TableView — toolbar',
            template: TableViewToolbarExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.queueDepth = new QueueDepthView({ depth: 3 });

        this.table = new TableView({
            containerId: 'table-slot',
            collection: new Collection(SEED_JOBS),
            columns: [
                { key: 'name', label: 'Job', sortable: true },
                { key: 'env', label: 'Env', formatter: 'badge:prod=danger,staging=warning,dev=secondary' },
                { key: 'state', label: 'State', formatter: 'badge:ok=success,failed=danger' },
                { key: 'duration_s', label: 'Duration (s)', align: 'right', visibility: 'md' },
                { key: 'owner', label: 'Owner', visibility: 'lg' },
            ],
            clickAction: 'none',

            // 4 — the toolbar's left-hand text block.
            eyebrow: 'Scheduler',
            title: 'Nightly jobs',

            // 3 — any View can occupy the right slot.
            toolbarRight: this.queueDepth,

            // 5 — trim the built-in chrome.
            showAdd: false,
            showExport: false,
            showRefresh: false,
            showFullscreen: false,

            // 6 — search stays in the toolbar. Do NOT pass
            // `searchPlacement: 'dropdown'` — it is documented but unimplemented
            // and silently removes the search input.
            searchable: true,
            searchPlaceholder: 'Find a job…',

            filterable: false,
            paginated: false,
            tableOptions: { hover: true, size: 'sm' },

            // 1 + 2 — custom buttons.
            toolbarButtons: [
                {
                    // `handler:` form — no data-action needed. `this` is the TableView.
                    label: 'Rerun failed',
                    icon: 'bi bi-arrow-repeat',
                    variant: 'outline-primary',
                    title: 'Re-queue every failed job',
                    handler: function handleRerun() {
                        const failed = this.collection.models.filter((m) => m.get('state') === 'failed');
                        this.setEyebrow(`Scheduler · ${failed.length} re-queued`);
                    },
                },
                {
                    // `action:` form — emits a plain data-action. Nothing on the
                    // TableView handles "export-report", so it bubbles to this
                    // Page's `onActionExportReport` below. Subclass TableView
                    // instead if the behavior belongs to the table itself.
                    label: 'Report',
                    icon: 'bi bi-filetype-pdf',
                    action: 'export-report',
                },
                {
                    // Any-of, fail-closed. Renders here only because the portal
                    // stubs hasPermission() to always pass.
                    label: 'Purge queue',
                    icon: 'bi bi-trash3',
                    variant: 'outline-danger',
                    permissions: ['manage_jobs', 'admin'],
                    action: 'purge-queue',
                },
            ],
        });
        this.addChild(this.table);
    }

    /** Fired by the `action: 'export-report'` toolbar button. */
    onActionExportReport(event) {
        event.preventDefault();
        this.note('onActionExportReport() ran on the Page — the string `action:` form bubbles.');
    }

    /** Live toolbar-text mutation — no re-render required. */
    onActionRetitle(event) {
        event.preventDefault();
        const stamp = new Date().toLocaleTimeString();
        this.table.setTitle(`Nightly jobs · ${stamp}`);
        this.table.setEyebrow('Scheduler · refreshed');
        this.note('setTitle() / setEyebrow() patched the live DOM node.');
    }

    /** Live mutation of the right-slot View. */
    onActionBumpQueue(event) {
        event.preventDefault();
        this.queueDepth.setDepth(this.queueDepth.depth + 1);
        this.note(`toolbarRight View updated — queue depth ${this.queueDepth.depth}.`);
    }

    note(text) {
        const el = this.element?.querySelector('[data-note]');
        if (el) el.textContent = text;
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — toolbar</h1>
            <p class="example-summary">
                The toolbar is inherited from ListView and is entirely configurable:
                a <code>title</code>/<code>eyebrow</code> block on the left, your own
                <code>toolbarButtons</code>, an arbitrary View in
                <code>toolbarRight</code>, and per-feature gates for refresh,
                fullscreen, add and export.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TableView.md#custom-toolbar-buttons">
                    docs/web-mojo/components/TableView.md#custom-toolbar-buttons
                </a>
            </p>

            <div class="alert alert-warning d-flex gap-2 align-items-start">
                <i class="bi bi-shield-lock mt-1"></i>
                <div>
                    <strong>All three buttons render here — including the gated one.</strong>
                    "Purge queue" declares <code>permissions: ['manage_jobs', 'admin']</code>,
                    an <strong>any-of</strong>, <strong>fail-closed</strong> check through
                    <code>app.activeUser.hasPermission()</code>. This portal stubs
                    <code>hasPermission = () =&gt; true</code>
                    (<code>examples/portal/app.js</code>) so every demo renders in full. In
                    your app the button simply isn't emitted for a user holding neither
                    permission — and note the gate is evaluated when the toolbar is
                    <em>built</em>, so change a user's permissions and you must rebuild the
                    table, not just re-render it.
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
                <div class="card-footer d-flex flex-wrap gap-2 align-items-center justify-content-between">
                    <small class="text-muted" data-note>Click a toolbar button, or one of these.</small>
                    <span class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" data-action="retitle">
                            <i class="bi bi-type"></i> setTitle() / setEyebrow()
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" data-action="bump-queue">
                            <i class="bi bi-plus-lg"></i> Bump toolbarRight
                        </button>
                    </span>
                </div>
            </div>

            <div class="row g-3">
                <div class="col-12 col-lg-6">
                    <div class="card h-100"><div class="card-body">
                        <h6><code>handler:</code> vs <code>action:</code></h6>
                        <p class="small text-secondary mb-0">
                            <strong>Rerun failed</strong> uses <code>handler:</code> — the
                            framework renders <code>data-action="custom-toolbar-button"</code>
                            plus a <code>data-button-index</code> and calls your function with
                            <code>this</code> bound to the TableView.
                            <strong>Report</strong> uses <code>action: 'export-report'</code>,
                            a plain <code>data-action</code>. The TableView has no matching
                            handler, so it bubbles to this Page's
                            <code>onActionExportReport()</code>.
                        </p>
                    </div></div>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="card h-100"><div class="card-body">
                        <h6><code>toolbarRight</code></h6>
                        <p class="small text-secondary mb-0">
                            The "Queue 3" chip on the right is an ordinary
                            <code>View</code> subclass passed as <code>toolbarRight</code>;
                            ListView mounts it into a <code>data-container="toolbar-right"</code>
                            slot. Keep a reference and mutate it directly — no table
                            re-render needed.
                        </p>
                    </div></div>
                </div>
            </div>
        </div>
    `;
}

export default TableViewToolbarExample;
