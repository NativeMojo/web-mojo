import { Page, TableView, Collection } from 'web-mojo';

/**
 * TableViewFeedbackStatesExample — rich empty state, skeleton, result count.
 *
 * Doc:    docs/web-mojo/components/TableView.md#feedback-states--rich-empty-skeletons-result-count
 * Route:  components/table-view/feedback-states
 *
 * Three opt-in body-render upgrades, all off by default:
 *
 *   1. `emptyState` — an icon-chip panel with a CTA. It auto-branches: no
 *      active filters → your configured panel; a filter/search returning
 *      nothing → a framework "No results" panel with a Clear-filters button.
 *   2. `loadingStyle: 'skeleton'` — shimmer rows echoing the columns during a
 *      fetch (a deliberate 800 ms fake-server delay makes it visible).
 *   3. `showResultCount: true` — a "Showing N of M · filtered" line in the
 *      pills row, read from `collection.meta.count`.
 *
 * BOTH empty variants are reachable: filter Status → "archived" (zero rows)
 * for the filtered branch; the footer toggle empties the dataset for the
 * truly-empty configured panel + CTA.
 */
const SEED_TICKETS = Array.from({ length: 14 }, (_, i) => ({
    id: i + 1,
    subject: `Ticket #${i + 1}`,
    status: i % 3 === 0 ? 'resolved' : 'open',
    assignee: ['Alice', 'Ben', 'Carla', 'Dan'][i % 4],
}));

/** Fake REST collection: slow enough to show the skeleton; can go empty. */
class FakeTicketsCollection extends Collection {
    constructor() {
        super();
        this.restEnabled = true;
        this.emptyMode = false;
    }

    async fetch() {
        this.emit('fetch:start');
        await new Promise((r) => { setTimeout(r, 800); });
        const p = this.params;
        const source = this.emptyMode ? [] : SEED_TICKETS;
        const rows = source.filter((t) => (
            (p.status === undefined || t.status === p.status)
            && (!p.search || t.subject.toLowerCase().includes(String(p.search).toLowerCase()))
        ));
        this.meta = { count: rows.length };
        this.reset(rows.slice(p.start || 0, (p.start || 0) + (p.size || 8)));
        this.emit('fetch:end');
        this.emit('fetch:success', { data: this.models, meta: this.meta });
        return { success: true, data: this.models, meta: this.meta };
    }
}

class TableViewFeedbackStatesExample extends Page {
    static pageName = 'components/table-view/feedback-states';
    static route = 'components/table-view/feedback-states';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TableViewFeedbackStatesExample.pageName,
            route: TableViewFeedbackStatesExample.route,
            title: 'TableView — feedback states',
            template: TableViewFeedbackStatesExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.tickets = new FakeTicketsCollection();

        this.table = new TableView({
            containerId: 'table-slot',
            collection: this.tickets,
            columns: [
                { key: 'id', label: 'ID', sortable: true },
                { key: 'subject', label: 'Subject', sortable: true },
                {
                    key: 'status',
                    label: 'Status',
                    formatter: 'badge:open=warning,resolved=success',
                    filter: { type: 'select', options: ['open', 'resolved', 'archived'] },
                },
                { key: 'assignee', label: 'Assignee', visibility: 'md' },
            ],
            actions: ['view'],
            searchable: true,
            paginated: true,
            showAdd: false,
            showExport: false,
            tableOptions: { striped: true, hover: true, size: 'sm' },
            collectionParams: { sort: 'id', size: 8 },

            // The three feedback options:
            loadingStyle: 'skeleton',
            showResultCount: true,
            emptyState: {
                icon: 'inbox',
                title: 'No tickets yet',
                message: 'Tickets from your support inbox will show up here.',
                action: { label: 'Create the first ticket', action: 'add', icon: 'bi-plus-lg' },
            },
            // The `add` CTA routes to onActionAdd on the table → our onAdd hook.
            onAdd: () => this.getApp()?.toast?.info?.('Demo CTA — wire this to your Add form.'),
        });

        this.addChild(this.table);
    }

    /** Flip the dataset empty/full so the truly-empty configured panel shows. */
    async onActionToggleEmpty(event) {
        event.preventDefault();
        this.tickets.emptyMode = !this.tickets.emptyMode;
        await this.table.refresh();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TableView — feedback states</h1>
            <p class="example-summary">
                Skeleton shimmer while loading (800 ms fake delay), a
                <em>Showing N of M</em> summary in the pills row, and a rich empty panel.
                Filter <strong>Status → archived</strong> (zero rows) for the filtered-empty
                branch, or use the footer toggle for the configured truly-empty panel + CTA.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TableView.md">
                    docs/web-mojo/components/TableView.md#feedback-states--rich-empty-skeletons-result-count
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="table-slot"></div>
                </div>
                <div class="card-footer bg-light d-flex justify-content-between align-items-center">
                    <small class="text-muted">
                        The filtered-empty panel offers <em>Clear filters</em>; the configured
                        panel offers your CTA. Both use Bootstrap surface tokens — correct in
                        light and dark.
                    </small>
                    <button class="btn btn-sm btn-outline-secondary" data-action="toggle-empty">
                        <i class="bi bi-toggle-on"></i> Toggle dataset
                    </button>
                </div>
            </div>
        </div>
    `;
}

export default TableViewFeedbackStatesExample;
