import { Page, TableView, Collection, groupByField, groupByRecency, groupByBoolean } from 'web-mojo';

/**
 * TableViewGroupedExample — group headers inside a `<tbody>`.
 *
 * Doc:    docs/web-mojo/components/TableView.md#grouped-rows
 * Route:  components/table-view/grouped
 *
 * Grouping is inherited from ListView, but the rendering path is genuinely
 * different: a `<div>` header would be hoisted out of a table by the browser,
 * so TableView emits `<tr class="list-group-header-row"><th colspan="N">`
 * instead — with `N` covering the expand, selection, data and actions columns.
 *
 * Demonstrates:
 *   1. Raw `groupBy` + `groupHeaderLabel` on a table.
 *   2. `groupByField(field, { labels, fallback })` — categorical buckets with
 *      an explicit label map.
 *   3. `groupByRecency(field)` — six fixed time buckets.
 *   4. `groupByBoolean(field, { trueLabel, falseLabel })` — binary split.
 *   5. The four `groupHeaderStyle` treatments on identical data.
 *
 * Seeds are pre-sorted by their group key. The framework does NOT sort to
 * match the grouping — consecutive runs are the consumer's responsibility.
 */
const NOW = Math.floor(Date.now() / 1000);
const HOUR = 3600;
const DAY = 24 * HOUR;

const SEED_TICKETS = [
    { id: 'T-1041', subject: 'Card declined on renewal',      severity: 'critical', team: 'billing',  is_open: true,  updated: NOW - 40 * 60 },
    { id: 'T-1038', subject: 'SSO loop after password reset',  severity: 'critical', team: 'platform', is_open: true,  updated: NOW - 5 * HOUR },
    { id: 'T-1035', subject: 'Invoice PDF missing line items', severity: 'high',     team: 'billing',  is_open: true,  updated: NOW - DAY - 2 * HOUR },
    { id: 'T-1030', subject: 'Slow upload over 200 MB',        severity: 'high',     team: 'storage',  is_open: true,  updated: NOW - 3 * DAY },
    { id: 'T-1022', subject: 'Timezone off by one on exports', severity: 'normal',   team: 'platform', is_open: false, updated: NOW - 12 * DAY },
    { id: 'T-1019', subject: 'Typo in the welcome email',      severity: 'low',      team: 'platform', is_open: false, updated: NOW - 40 * DAY },
    { id: 'T-1004', subject: 'Feature request: dark mode CSV', severity: 'low',      team: 'storage',  is_open: false, updated: NOW - 400 * DAY },
];

const COLUMNS = [
    { key: 'id', label: 'Ticket' },
    { key: 'subject', label: 'Subject' },
    { key: 'team', label: 'Team', visibility: 'md' },
    { key: 'severity', label: 'Severity', formatter: 'badge:critical=danger,high=warning,normal=info,low=secondary' },
    { key: 'updated|epoch|relative', label: 'Updated', visibility: 'lg' },
];

const BASE = {
    columns: COLUMNS,
    clickAction: 'none',
    searchable: false,
    filterable: false,
    paginated: false,
    showAdd: false,
    showExport: false,
    showRefresh: false,
    showFullscreen: false,
    tableOptions: { hover: true, size: 'sm' },
};

const STYLES = ['banner', 'mark', 'band', 'rule'];

/**
 * Grouping marks TRANSITIONS, so each section sorts by its own group key
 * first. SEED_TICKETS is ordered by severity (sections 2–5 read correctly as
 * seeded); section 1 groups by team, so it gets its own sorted copy.
 */
const SEED_BY_TEAM = [...SEED_TICKETS].sort((a, b) => a.team.localeCompare(b.team));

class TableViewGroupedExample extends Page {
    static pageName = 'components/table-view/grouped';
    static route = 'components/table-view/grouped';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewGroupedExample.pageName,
            route: TableViewGroupedExample.route,
            title: 'TableView — grouped rows',
            template: TableViewGroupedExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        // 1 — raw groupBy shorthand + a label formatter.
        this.rawTable = new TableView({
            ...BASE,
            containerId: 'raw-slot',
            collection: new Collection(SEED_BY_TEAM),
            title: 'By team',
            groupBy: 'team',
            groupHeaderLabel: (key) => key.toUpperCase(),
        });
        this.addChild(this.rawTable);

        // 2 — groupByField with an explicit label map + fallback bucket.
        this.fieldTable = new TableView({
            ...BASE,
            containerId: 'field-slot',
            collection: new Collection(SEED_TICKETS),
            title: 'By severity',
            ...groupByField('severity', {
                labels: {
                    critical: 'Critical — page someone',
                    high: 'High',
                    normal: 'Normal',
                    low: 'Low / backlog',
                },
                fallback: 'Untriaged',
            }),
        });
        this.addChild(this.fieldTable);

        // 3 — groupByRecency: six fixed buckets, sort-ordered keys.
        this.recencyTable = new TableView({
            ...BASE,
            containerId: 'recency-slot',
            collection: new Collection(SEED_TICKETS),
            title: 'By recency',
            ...groupByRecency('updated'),
        });
        this.addChild(this.recencyTable);

        // 4 — groupByBoolean with custom labels.
        this.booleanTable = new TableView({
            ...BASE,
            containerId: 'boolean-slot',
            collection: new Collection(SEED_TICKETS),
            title: 'By state',
            ...groupByBoolean('is_open', { trueLabel: 'Open', falseLabel: 'Resolved' }),
        });
        this.addChild(this.booleanTable);

        // 5 — the four header treatments, same data and grouping throughout.
        STYLES.forEach((style) => {
            const table = new TableView({
                ...BASE,
                containerId: `style-${style}-slot`,
                collection: new Collection(SEED_TICKETS),
                columns: [
                    { key: 'id', label: 'Ticket' },
                    { key: 'subject', label: 'Subject' },
                ],
                ...groupByBoolean('is_open', { trueLabel: 'Open', falseLabel: 'Resolved' }),
                groupHeaderStyle: style,
            });
            this[`style_${style}`] = table;
            this.addChild(table);
        });
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — grouped rows</h1>
            <p class="example-summary">
                <code>groupBy</code> inserts a synthetic header wherever the derived
                group key changes. On a table the header is a real
                <code>&lt;tr&gt;&lt;th colspan="N"&gt;</code> — a <code>&lt;div&gt;</code>
                would be hoisted out of the <code>&lt;tbody&gt;</code> by the browser —
                and the colspan covers every rendered column, expand and selection
                cells included.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ListView.md#grouped-rows">
                    docs/web-mojo/components/ListView.md#grouped-rows
                </a>
            </p>

            <div class="alert alert-secondary d-flex gap-2 align-items-start">
                <i class="bi bi-sort-down mt-1"></i>
                <div>
                    Headers mark <strong>transitions</strong>, not buckets — the framework
                    never reorders rows. If the collection isn't sorted by the group key,
                    the same header appears more than once. Sort first: every table below
                    is fed a collection already ordered by <em>its own</em> group key
                    (the seeds are severity-ordered, and the "By team" table gets a
                    team-sorted copy).
                </div>
            </div>

            <h5 class="mt-4">Raw <code>groupBy</code> + <code>groupHeaderLabel</code></h5>
            <div class="card mb-4"><div class="card-body">
                <div data-container="raw-slot"></div>
            </div></div>

            <h5 class="mt-4"><code>groupByField('severity', { labels, fallback })</code></h5>
            <p class="text-secondary small mb-3">
                Buckets on the raw value, coerced to a string; <code>labels</code> maps each
                key to a display string and <code>fallback</code> names the bucket for
                null/empty values.
            </p>
            <div class="card mb-4"><div class="card-body">
                <div data-container="field-slot"></div>
            </div></div>

            <h5 class="mt-4"><code>groupByRecency('updated')</code></h5>
            <p class="text-secondary small mb-3">
                Six fixed buckets — Today, Yesterday, This week, This month, Earlier this
                year, Older. Keys are sort-ordered so a newest-first sort renders them in
                reading order.
            </p>
            <div class="card mb-4"><div class="card-body">
                <div data-container="recency-slot"></div>
            </div></div>

            <h5 class="mt-4"><code>groupByBoolean('is_open', { trueLabel, falseLabel })</code></h5>
            <p class="text-secondary small mb-3">
                Binary split. Missing values fall into the ungrouped tail rather than
                collapsing into "false", and the string forms
                <code>'false'</code>/<code>'0'</code>/<code>'no'</code>/<code>'off'</code>
                are read as false.
            </p>
            <div class="card mb-4"><div class="card-body">
                <div data-container="boolean-slot"></div>
            </div></div>

            <h5 class="mt-5"><code>groupHeaderStyle</code></h5>
            <p class="text-secondary small mb-3">
                Identical data and grouping — only the header treatment differs.
            </p>
            <div class="row g-3">
                <div class="col-12 col-lg-6">
                    <div class="d-flex align-items-baseline gap-2 mb-2">
                        <code class="fs-6">'banner'</code>
                        <span class="badge bg-success-subtle text-success-emphasis border border-success-subtle">default</span>
                    </div>
                    <div class="card"><div class="card-body">
                        <div data-container="style-banner-slot"></div>
                    </div></div>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex align-items-baseline gap-2 mb-2"><code class="fs-6">'mark'</code></div>
                    <div class="card"><div class="card-body">
                        <div data-container="style-mark-slot"></div>
                    </div></div>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex align-items-baseline gap-2 mb-2"><code class="fs-6">'band'</code></div>
                    <div class="card"><div class="card-body">
                        <div data-container="style-band-slot"></div>
                    </div></div>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex align-items-baseline gap-2 mb-2"><code class="fs-6">'rule'</code></div>
                    <div class="card"><div class="card-body">
                        <div data-container="style-rule-slot"></div>
                    </div></div>
                </div>
            </div>
        </div>
    `;
}

export default TableViewGroupedExample;
