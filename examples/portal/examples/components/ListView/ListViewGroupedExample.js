import { Page, ListView, Collection, groupByDay } from 'web-mojo';

/**
 * ListViewGroupedExample — synthetic group headers between items.
 *
 * Doc:    docs/web-mojo/components/ListView.md#grouped-rows
 * Route:  components/list-view/grouped
 *
 * Two shapes shown side by side:
 *   1. Raw `groupBy: 'role'` shorthand + `groupHeaderLabel` formatter — bucketing
 *      a static categorical field (the user's role) and uppercasing the label.
 *   2. `...groupByDay('created')` built-in helper — chronological day-bucketing
 *      with stable YYYY-MM-DD bucket keys and 'Today' / 'Yesterday' / 'May 5'
 *      / 'May 5, 2025' display labels.
 *
 * The raw seed below pre-sorts by role so headers don't repeat. The framework
 * does NOT enforce a sort order to match grouping — that's the consumer's call.
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

        const usersByRole = new Collection(SEED_USERS);
        this.byRoleList = new ListView({
            containerId: 'by-role-slot',
            collection: usersByRole,
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

        const loginEvents = new Collection(SEED_LOGINS);
        this.byDayList = new ListView({
            containerId: 'by-day-slot',
            collection: loginEvents,
            itemTemplate: `
                <div class="d-flex align-items-center gap-3 p-3 border-bottom">
                    <i class="bi bi-shield-check fs-4 text-secondary"></i>
                    <div class="flex-grow-1">
                        <div><strong>{{model.actor}}</strong></div>
                        <div class="small text-muted">{{model.location}} · {{model.created|relative}}</div>
                    </div>
                </div>
            `,
            ...groupByDay('created'),
        });
        this.addChild(this.byDayList);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ListView — grouped rows</h1>
            <p class="example-summary">
                Synthetic header rows between consecutive items where a derived
                group key changes. Two shapes — a raw <code>groupBy: 'role'</code>
                shorthand and the built-in <code>groupByDay</code> helper.
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
            <div class="card">
                <div class="card-body p-0">
                    <div data-container="by-day-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default ListViewGroupedExample;
