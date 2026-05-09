import { Page, ListView, Collection } from 'web-mojo';

/**
 * ListViewPaginatedExample — numbered pagination on a plain ListView.
 *
 * Doc:    docs/web-mojo/components/ListView.md#pagination--show-more
 * Route:  components/list-view/paginated
 *
 * For visual lists with ordered, hunt-by-page semantics, set
 * `paginationMode: 'pages'` to get the same numbered pagination + page-size
 * selector that TableView uses. The default for ListView is 'more' (load-more
 * button), which is the convention for visual cards/feeds — this example
 * shows the alternative.
 *
 * Pagination is driven by `collection.params.start` / `.size` and
 * `collection.meta.count`. With a preloaded array we fake `meta.count` so
 * the page count renders; in real apps the server returns it.
 */
const SEED = Array.from({ length: 47 }).map((_, i) => ({
    id: i + 1,
    title: `Item ${i + 1}`,
    description: `Description for item ${i + 1}`,
    tone: i % 4 === 0 ? 'primary' : (i % 4 === 1 ? 'success' : (i % 4 === 2 ? 'warning' : 'secondary'))
}));

class ListViewPaginatedExample extends Page {
    static pageName = 'components/list-view/paginated';
    static route = 'components/list-view/paginated';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ListViewPaginatedExample.pageName,
            route: ListViewPaginatedExample.route,
            title: 'ListView — paginated',
            template: ListViewPaginatedExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        // Preloaded collection: simulate a server response by setting
        // meta.count so pagination knows the total.
        this.collection = new Collection(SEED.slice(0, 10));
        this.collection.meta = { count: SEED.length };
        this.collection.params = { start: 0, size: 10 };

        // Simulate server pagination locally for the demo: re-slice the seed
        // when the ListView changes start/size.
        this.collection.fetch = async () => {
            const start = this.collection.params.start || 0;
            const size = this.collection.params.size || 10;
            this.collection.reset(SEED.slice(start, start + size));
            this.collection.meta = { count: SEED.length, start, size };
            return { success: true, data: { status: 'ok' } };
        };
        this.collection.restEnabled = true;
        this.collection.lastFetchTime = Date.now();

        this.list = new ListView({
            containerId: 'list-slot',
            collection: this.collection,
            paginated: true,
            paginationMode: 'pages',
            pageSize: 10,
            itemTemplate: `
                <div class="d-flex align-items-center gap-3 p-3 border-bottom">
                    <span class="badge bg-{{model.tone}}">#{{model.id}}</span>
                    <div class="flex-grow-1">
                        <strong>{{model.title}}</strong>
                        <div class="small text-muted">{{model.description}}</div>
                    </div>
                </div>
            `,
            emptyMessage: 'No items.'
        });
        this.addChild(this.list);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ListView — paginated</h1>
            <p class="example-summary">
                Numbered pagination with a page-size selector — same affordance as
                TableView, wrapped around a plain visual list. Use this when users
                hunt for specific items in an ordered collection. For
                feed-style visual lists, prefer the default
                <code>paginationMode: 'more'</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ListView.md">
                    docs/web-mojo/components/ListView.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="list-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default ListViewPaginatedExample;
