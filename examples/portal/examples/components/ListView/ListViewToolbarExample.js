import { Page, ListView, Collection } from 'web-mojo';

/**
 * ListViewToolbarExample — toolbar with search, a filter pill, and "Show more"
 * pagination wrapped around a plain visual ListView (no TableView).
 *
 * Doc:    docs/web-mojo/components/ListView.md#toolbar
 * Route:  components/list-view/toolbar
 *
 * The whole toolbar (search input, filter dropdown + active pills, refresh
 * button) lives on `ListView` itself now — same machinery TableView uses.
 * Pagination defaults to 'more' for visual lists; click "Show more" to
 * append the next page in place. This example uses a preloaded Collection
 * so the show-more button is hidden by `meta.count` not being set.
 */
const SEED_BOOKS = [
    { id: 1,  title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', topic: 'databases' },
    { id: 2,  title: 'The Pragmatic Programmer',              author: 'Andrew Hunt, David Thomas', topic: 'general' },
    { id: 3,  title: 'Refactoring',                            author: 'Martin Fowler',  topic: 'patterns' },
    { id: 4,  title: 'Clean Architecture',                     author: 'Robert C. Martin', topic: 'patterns' },
    { id: 5,  title: 'Code Complete',                          author: 'Steve McConnell', topic: 'general' },
    { id: 6,  title: 'Site Reliability Engineering',           author: 'Beyer, Jones, Petoff, Murphy', topic: 'ops' },
    { id: 7,  title: 'Database Internals',                     author: 'Alex Petrov',    topic: 'databases' },
    { id: 8,  title: 'Domain-Driven Design',                   author: 'Eric Evans',     topic: 'patterns' },
    { id: 9,  title: 'The Mythical Man-Month',                 author: 'Frederick Brooks', topic: 'general' },
    { id: 10, title: 'Release It!',                            author: 'Michael Nygard', topic: 'ops' },
    { id: 11, title: 'High Performance MySQL',                 author: 'Schwartz, Zaitsev, Tkachenko', topic: 'databases' },
    { id: 12, title: 'The Phoenix Project',                    author: 'Gene Kim, Kevin Behr, George Spafford', topic: 'ops' },
    { id: 13, title: 'Working Effectively with Legacy Code',   author: 'Michael Feathers', topic: 'patterns' },
    { id: 14, title: 'Programming Pearls',                     author: 'Jon Bentley',    topic: 'general' },
    { id: 15, title: 'Streaming Systems',                      author: 'Akidau, Chernyak, Lax', topic: 'databases' },
];

class ListViewToolbarExample extends Page {
    static pageName = 'components/list-view/toolbar';
    static route = 'components/list-view/toolbar';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ListViewToolbarExample.pageName,
            route: ListViewToolbarExample.route,
            title: 'ListView — toolbar',
            template: ListViewToolbarExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        // Preloaded collection so the example runs without a backend.
        this.collection = new Collection(SEED_BOOKS);

        this.list = new ListView({
            containerId: 'list-slot',
            collection: this.collection,
            title: 'Books',
            eyebrow: 'Reading list',
            searchable: true,
            searchPlaceholder: 'Search title, author, topic…',
            filterable: true,
            filters: [
                {
                    name: 'topic',
                    label: 'Topic',
                    type: 'select',
                    options: ['databases', 'patterns', 'ops', 'general']
                }
            ],
            sortOptions: [
                { key: 'title', label: 'Title (A–Z)', dir: 'asc' },
                { key: 'title', label: 'Title (Z–A)', dir: 'desc' }
            ],
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
            selectionMode: 'single',
            emptyMessage: 'No books match the current filters.'
        });
        this.addChild(this.list);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ListView — toolbar</h1>
            <p class="example-summary">
                Search, filter pills, sort, and refresh — the same toolbar TableView has,
                wrapped around a plain visual list. No table, no columns.
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

export default ListViewToolbarExample;
