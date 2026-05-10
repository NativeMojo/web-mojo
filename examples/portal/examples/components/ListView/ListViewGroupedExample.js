import { Page, ListView, Collection, groupByDay } from 'web-mojo';

/**
 * ListViewGroupedExample — synthetic group headers between items.
 *
 * Doc:    docs/web-mojo/components/ListView.md#grouped-rows
 * Route:  components/list-view/grouped
 *
 * Demonstrates:
 *   1. Raw `groupBy: 'role'` shorthand + `groupHeaderLabel` formatter.
 *   2. `...groupByDay('created')` built-in helper for chronological feeds.
 *   3. The four built-in `groupHeaderStyle` visual treatments side-by-side.
 *
 * The seeds below pre-sort by their group key so headers don't repeat. The
 * framework does NOT enforce a sort order to match grouping — that's the
 * consumer's call.
 */
const SEED_USERS = [
    { id: 1, name: 'Alice Adams', role: 'Admin', email: 'alice@example.com' },
    { id: 2, name: 'Eve Estrada', role: 'Admin', email: 'eve@example.com' },
    { id: 3, name: 'Ben Bryant', role: 'Editor', email: 'ben@example.com' },
    { id: 4, name: 'Dan Dietrich', role: 'Editor', email: 'dan@example.com' },
    { id: 5, name: 'Grace Gomez', role: 'Editor', email: 'grace@example.com' },
    { id: 6, name: 'Carla Cruz', role: 'Viewer', email: 'carla@example.com' },
];

const NOW = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const SEED_LOGINS = [
    { id: 'l1', actor: 'alice@example.com', location: 'San Francisco · US',  created: NOW - 30 * 60 * 1000 },
    { id: 'l2', actor: 'eve@example.com',   location: 'Brooklyn · US',       created: NOW - 4 * HOUR },
    { id: 'l3', actor: 'ben@example.com',   location: 'Austin · US',         created: NOW - DAY - HOUR },
    { id: 'l4', actor: 'dan@example.com',   location: 'Berlin · DE',         created: NOW - DAY - 7 * HOUR },
    { id: 'l5', actor: 'grace@example.com', location: 'Toronto · CA',        created: NOW - 5 * DAY },
    { id: 'l6', actor: 'carla@example.com', location: 'Lisbon · PT',         created: NOW - 14 * DAY },
];

const STYLE_OPTIONS = [
    { id: 'banner', label: 'banner', tag: 'default' },
    { id: 'mark',   label: 'mark',   tag: '' },
    { id: 'band',   label: 'band',   tag: '' },
    { id: 'rule',   label: 'rule',   tag: '' },
];

const ITEM_TEMPLATE = `
    <div class="d-flex align-items-center gap-3 p-3 border-bottom">
        <i class="bi bi-shield-check fs-5 text-secondary"></i>
        <div class="flex-grow-1">
            <div class="fw-semibold">{{model.actor}}</div>
            <div class="small text-muted">{{model.location}} · {{model.created|relative}}</div>
        </div>
    </div>
`;

class ListViewGroupedExample extends Page {
    static pageName = 'components/list-view/grouped';
    static route = 'components/list-view/grouped';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ListViewGroupedExample.pageName,
            route: ListViewGroupedExample.route,
            title: 'ListView — grouped rows',
            template: ListViewGroupedExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        // Section 1 — raw groupBy + groupHeaderLabel on a categorical field
        this.byRoleList = new ListView({
            containerId: 'by-role-slot',
            collection: new Collection(SEED_USERS),
            itemTemplate: `
                <div class="d-flex align-items-center gap-3 p-3 border-bottom">
                    <i class="bi bi-person-circle fs-4 text-secondary"></i>
                    <div class="flex-grow-1">
                        <strong>{{model.name}}</strong>
                        <div class="small text-muted">{{model.email}}</div>
                    </div>
                </div>
            `,
            groupBy: 'role',
            groupHeaderLabel: (key) => key.toUpperCase(),
        });
        this.addChild(this.byRoleList);

        // Section 2 — groupByDay helper on chronological data
        this.byDayList = new ListView({
            containerId: 'by-day-slot',
            collection: new Collection(SEED_LOGINS),
            itemTemplate: ITEM_TEMPLATE,
            ...groupByDay('created'),
        });
        this.addChild(this.byDayList);

        // Section 3 — the four built-in groupHeaderStyle visual treatments
        STYLE_OPTIONS.forEach((opt) => {
            const list = new ListView({
                containerId: `style-${opt.id}-slot`,
                collection: new Collection(SEED_LOGINS),
                itemTemplate: ITEM_TEMPLATE,
                ...groupByDay('created'),
                groupHeaderStyle: opt.id,
            });
            this[`style_${opt.id}`] = list;
            this.addChild(list);
        });
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ListView — grouped rows</h1>
            <p class="example-summary">
                Synthetic header rows between consecutive items where a derived
                group key changes. Configure with <code>groupBy</code> +
                <code>groupHeaderLabel</code>, the <code>groupByDay</code> helper,
                and pick a visual treatment via <code>groupHeaderStyle</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ListView.md#grouped-rows">
                    docs/web-mojo/components/ListView.md
                </a>
            </p>

            <h5 class="mt-4">Group by role (raw <code>groupBy</code> + <code>groupHeaderLabel</code>)</h5>
            <div class="card mb-4">
                <div class="card-body p-0">
                    <div data-container="by-role-slot"></div>
                </div>
            </div>

            <h5 class="mt-4">Group by day (<code>...groupByDay('created')</code>)</h5>
            <div class="card mb-4">
                <div class="card-body p-0">
                    <div data-container="by-day-slot"></div>
                </div>
            </div>

            <h5 class="mt-5">Visual styles · <code>groupHeaderStyle</code></h5>
            <p class="text-secondary small mb-3">
                Same data and item template across all four — the only
                difference is <code>groupHeaderStyle</code>.
            </p>
            <div class="row g-3">
                <div class="col-12 col-lg-6">
                    <div class="d-flex align-items-baseline gap-2 mb-2">
                        <code class="fs-6">'banner'</code>
                        <span class="badge bg-success-subtle text-success-emphasis border border-success-subtle">default</span>
                    </div>
                    <div class="card"><div class="card-body p-0">
                        <div data-container="style-banner-slot"></div>
                    </div></div>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex align-items-baseline gap-2 mb-2">
                        <code class="fs-6">'mark'</code>
                    </div>
                    <div class="card"><div class="card-body p-0">
                        <div data-container="style-mark-slot"></div>
                    </div></div>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex align-items-baseline gap-2 mb-2">
                        <code class="fs-6">'band'</code>
                    </div>
                    <div class="card"><div class="card-body p-0">
                        <div data-container="style-band-slot"></div>
                    </div></div>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex align-items-baseline gap-2 mb-2">
                        <code class="fs-6">'rule'</code>
                    </div>
                    <div class="card"><div class="card-body p-0">
                        <div data-container="style-rule-slot"></div>
                    </div></div>
                </div>
            </div>
        </div>
    `;
}

export default ListViewGroupedExample;
