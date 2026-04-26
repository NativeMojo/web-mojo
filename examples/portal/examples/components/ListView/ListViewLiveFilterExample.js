import { Page, ListView, Collection, MOJOUtils } from 'web-mojo';

/**
 * ListViewLiveFilterExample — live search above a ListView.
 *
 * Doc:    docs/web-mojo/components/ListView.md#filtering
 * Route:  components/list-view/live-filter
 *
 * ListView itself does not own a search input — that's a job for the page.
 * This example wires a debounced `<input>` that calls `collection.where(...)`
 * on every keystroke and resets the ListView's collection to the matches.
 *
 * `Collection.where(criteria)` accepts either a function or a key/value
 * object. Here we use the function form to do a case-insensitive match
 * across name + role + email.
 *
 * `MOJOUtils.debounce` keeps the work to one filter pass per 150ms of typing.
 */
const SEED_BOOKS = [
    { id: 1, title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', topic: 'databases' },
    { id: 2, title: 'The Pragmatic Programmer', author: 'Andrew Hunt, David Thomas', topic: 'general' },
    { id: 3, title: 'Refactoring', author: 'Martin Fowler', topic: 'patterns' },
    { id: 4, title: 'Clean Architecture', author: 'Robert C. Martin', topic: 'patterns' },
    { id: 5, title: 'Code Complete', author: 'Steve McConnell', topic: 'general' },
    { id: 6, title: 'Site Reliability Engineering', author: 'Beyer, Jones, Petoff, Murphy', topic: 'ops' },
    { id: 7, title: 'Database Internals', author: 'Alex Petrov', topic: 'databases' },
    { id: 8, title: 'Domain-Driven Design', author: 'Eric Evans', topic: 'patterns' },
    { id: 9, title: 'The Mythical Man-Month', author: 'Frederick Brooks', topic: 'general' },
    { id: 10, title: 'Release It!', author: 'Michael Nygard', topic: 'ops' },
    { id: 11, title: 'High Performance MySQL', author: 'Schwartz, Zaitsev, Tkachenko', topic: 'databases' },
    { id: 12, title: 'The Phoenix Project', author: 'Gene Kim, Kevin Behr, George Spafford', topic: 'ops' },
    { id: 13, title: 'Working Effectively with Legacy Code', author: 'Michael Feathers', topic: 'patterns' },
    { id: 14, title: 'Programming Pearls', author: 'Jon Bentley', topic: 'general' },
    { id: 15, title: 'Streaming Systems', author: 'Akidau, Chernyak, Lax', topic: 'databases' },
];

class ListViewLiveFilterExample extends Page {
    static pageName = 'components/list-view/live-filter';
    static route = 'components/list-view/live-filter';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ListViewLiveFilterExample.pageName,
            route: ListViewLiveFilterExample.route,
            title: 'ListView — live search filter',
            template: ListViewLiveFilterExample.TEMPLATE,
        });
        this.searchTerm = '';
        this.matchCount = SEED_BOOKS.length;
    }

    async onInit() {
        await super.onInit();

        // Master collection holds every book; never mutated by typing.
        this.fullCollection = new Collection(SEED_BOOKS);

        // Visible collection — what the ListView is bound to. We swap its
        // models on each filter pass via `reset()`.
        this.visibleCollection = new Collection(SEED_BOOKS);

        this.list = new ListView({
            containerId: 'list-slot',
            collection: this.visibleCollection,
            itemTemplate: `
                <div class="d-flex align-items-center gap-3 p-3 border-bottom">
                    <i class="bi bi-book fs-3 text-secondary"></i>
                    <div class="flex-grow-1">
                        <strong>{{model.title}}</strong>
                        <div class="small text-muted">{{model.author}}</div>
                    </div>
                    <span class="badge text-bg-light">{{model.topic}}</span>
                </div>
            `,
            selectionMode: 'none',
            emptyMessage: 'No books match your search.',
        });
        this.addChild(this.list);

        // Debounced filter — one pass per 150ms of idle typing.
        this.applyFilter = MOJOUtils.debounce(() => this.runFilter(), 150);
    }

    /**
     * `data-change-action` fires onChange<Name> handlers. With
     * `data-filter="live-search"` set, EventDelegate also dispatches on every
     * `input` event — but with its own internal debounce. We keep
     * `data-filter-debounce="0"` so EventDelegate forwards each keystroke
     * immediately, and we throttle ourselves with MOJOUtils.debounce.
     */
    onChangeUpdateSearch(event, element) {
        this.searchTerm = element.value;
        this.applyFilter();
    }

    onActionClearSearch() {
        this.searchTerm = '';
        const input = this.element?.querySelector('input[data-change-action="update-search"]');
        if (input) input.value = '';
        this.runFilter();
    }

    runFilter() {
        const term = this.searchTerm.trim().toLowerCase();
        const matches = term
            ? this.fullCollection.where(model => {
                const t = model.get('title')?.toLowerCase() || '';
                const a = model.get('author')?.toLowerCase() || '';
                const tp = model.get('topic')?.toLowerCase() || '';
                return t.includes(term) || a.includes(term) || tp.includes(term);
            })
            : this.fullCollection.models.slice();

        this.visibleCollection.reset(matches.map(m => m.toJSON()));
        this.matchCount = matches.length;
        if (this.isActive) this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ListView — live search filter</h1>
            <p class="example-summary">
                Wire an <code>&lt;input&gt;</code> above the list and call <code>collection.where(...)</code>
                on every keystroke (debounced via <code>MOJOUtils.debounce</code>). The ListView re-renders
                only the items that match.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ListView.md">
                    docs/web-mojo/components/ListView.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div class="input-group mb-3">
                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                        <input type="search" class="form-control"
                               placeholder="Search title, author, topic…"
                               data-change-action="update-search"
                               data-filter="live-search"
                               data-filter-debounce="0">
                        <button class="btn btn-outline-secondary" type="button" data-action="clear-search">
                            Clear
                        </button>
                    </div>
                    <div data-container="list-slot"></div>
                </div>
                <div class="card-footer bg-light">
                    <small class="text-muted">Showing <strong>{{matchCount}}</strong> book(s).</small>
                </div>
            </div>
        </div>
    `;
}

export default ListViewLiveFilterExample;
