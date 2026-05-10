import { Page, TableView, Collection } from 'web-mojo';

/**
 * TableViewDayRangeFilterExample — toolbar `dayRangeFilter` helper.
 *
 * Doc:    docs/web-mojo/components/ListView.md#day-range-filter
 * Route:  components/table-view/day-range-filter
 *
 * `dayRangeFilter: true` mounts a `1d / 7d / 30d / 90d` SegmentControl in
 * the toolbar AND auto-applies the selection as a `${field}__gte` filter
 * on the collection (writes to `collection.params`, resets `start = 0`,
 * refetches). Default field is `'created'`, default value is `'7d'`.
 *
 * The demo seeds 30 activity rows whose `created` epochs span "now" to
 * "120 days ago" and uses an in-memory fake-server Collection to actually
 * honor the `created__gte` filter — so the row count visibly changes when
 * you click between segments. The eyebrow updates live via the
 * `range:change` event + a `fetch:success` listener.
 */

const NOW = Math.floor(Date.now() / 1000);

// 30 rows spread evenly from "now" to ~120 days ago, so each range
// (1d / 7d / 30d / 90d) shows a meaningfully different count.
const SEED_EVENTS = Array.from({ length: 30 }, (_, i) => {
    const daysAgo = i * 4; // 0, 4, 8, ..., 116
    const kinds = ['login', 'export', 'edit', 'invite'];
    return {
        id: i + 1,
        title: `Event #${i + 1}`,
        kind: kinds[i % kinds.length],
        actor: `user-${(i % 7) + 1}@example.com`,
        created: NOW - daysAgo * 86400,
    };
});

/**
 * Tiny in-memory fake of a REST collection: `fetch()` reads
 * `params.created__gte` from the seeded data and resets the collection.
 * Mirrors what a server-backed Collection would do for this filter.
 */
class FakeServerEventsCollection extends Collection {
    constructor() {
        super();
        this.restEnabled = true;
        this.meta = {};
    }

    async fetch() {
        this.emit('fetch:start');
        const since = this.params.created__gte || 0;
        const all = SEED_EVENTS.filter((e) => e.created >= since);
        const start = this.params.start || 0;
        const size = this.params.size || 10;
        const page = all.slice(start, start + size);

        this.reset(page);
        this.meta = { count: all.length };
        this.lastFetchTime = Date.now();
        this.emit('fetch:end');
        this.emit('fetch:success', { data: page, meta: this.meta });
        return { success: true, data: page, meta: this.meta };
    }
}

class TableViewDayRangeFilterExample extends Page {
    static pageName = 'components/table-view/day-range-filter';
    static route = 'components/table-view/day-range-filter';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewDayRangeFilterExample.pageName,
            route: TableViewDayRangeFilterExample.route,
            title: 'TableView — day-range filter',
            template: TableViewDayRangeFilterExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.collection = new FakeServerEventsCollection();

        this.table = new TableView({
            containerId: 'table-slot',
            collection: this.collection,
            title: 'Activity',
            // Initial eyebrow needs a non-empty value so the
            // .rs-table-eyebrow node exists in the toolbar — setEyebrow
            // mutates that node directly and is a no-op if it doesn't
            // exist yet. Real text fills in on the first fetch:success.
            eyebrow: ' ',
            // Day-range writes `created__gte` — suppress the duplicate
            // active-filter pill so the SegmentControl is the single
            // source of truth for the range.
            hideActivePillNames: ['created__gte'],
            columns: [
                { key: 'id', label: 'ID', width: '64px', sortable: true },
                { key: 'title', label: 'Title', sortable: true },
                {
                    key: 'kind',
                    label: 'Kind',
                    formatter: 'badge:login=success,export=info,edit=warning,invite=secondary',
                    visibility: 'md',
                },
                { key: 'actor', label: 'Actor', visibility: 'md' },
                { key: 'created|epoch|relative', label: 'When', sortable: true },
            ],
            paginated: true,
            searchable: false,
            filterable: false,
            showAdd: false,
            showExport: false,
            tableOptions: { striped: true, hover: true, size: 'sm' },
            collectionParams: { sort: '-created', size: 10 },

            // The whole feature in one option:
            dayRangeFilter: true,
        });

        // Side-effect listener — repaint the eyebrow whenever the range
        // changes. The framework already wrote `created__gte` and queued
        // a refetch by the time this fires; we just react.
        this.collection.on('fetch:success', () => this._updateEyebrow(), this);

        this.addChild(this.table);
    }

    _updateEyebrow() {
        if (!this.table) return;
        const value = this.table.getRange() || '7d';
        const days = ({ '1d': 1, '7d': 7, '30d': 30, '90d': 90 })[value] || 7;
        const total = this.collection.meta?.count ?? this.collection.length();
        const noun = total === 1 ? 'event' : 'events';
        const dayNoun = days === 1 ? 'day' : 'days';
        this.table.setEyebrow(`${total} ${noun} in the last ${days} ${dayNoun}`);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — day-range filter</h1>
            <p class="example-summary">
                <code>dayRangeFilter: true</code> drops a <code>1d / 7d / 30d / 90d</code>
                SegmentControl into the toolbar and auto-applies the selection as a
                <code>created__gte</code> filter on the collection. Click a different
                segment — the table refetches and the eyebrow updates via the
                <code>range:change</code> event.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ListView.md">
                    docs/web-mojo/components/ListView.md#day-range-filter
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
                <div class="card-footer bg-light">
                    <small class="text-muted">
                        Seeded with 30 events spread across ~120 days. The fake-server
                        Collection honors <code>created__gte</code> so the row count
                        reflects the active range. <code>hideActivePillNames</code>
                        suppresses the duplicate filter pill.
                    </small>
                </div>
            </div>
        </div>
    `;
}

export default TableViewDayRangeFilterExample;
