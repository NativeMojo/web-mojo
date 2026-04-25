import { TablePage, FileList } from 'web-mojo';

/**
 * TablePageExample — canonical demo of TablePage.
 *
 * Doc:    docs/web-mojo/components/TablePage.md
 * Route:  components/table-page
 *
 * TablePage is a Page subclass that owns a Collection and a TableView and
 * keeps their state in sync with the URL. Sort, search, page, and filter
 * changes update the query string, and the page restores from the URL on
 * entry — so a table view is bookmarkable and back/forward-friendly.
 *
 * Construction is config-only — pass the Collection class, columns, and any
 * TableView options. No subclass-level boilerplate is needed.
 */
class TablePageExample extends TablePage {
    static pageName = 'components/table-page';
    static route = 'components/table-page';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TablePageExample.pageName,
            route: TablePageExample.route,
            title: 'TablePage — URL-synced table',
            description: 'Sort, filter, search, and page state mirror the URL.',

            Collection: FileList,
            defaultQuery: { sort: '-created', size: 10 },

            columns: [
                { key: 'id', label: 'ID', sortable: true },
                { key: 'filename', label: 'Filename', sortable: true },
                { key: 'category', label: 'Category', visibility: 'md', filter: {
                    type: 'select',
                    options: ['image', 'video', 'audio', 'pdf', 'document', 'archive', 'other'],
                } },
                { key: 'file_size|filesize', label: 'Size', sortable: true, visibility: 'md' },
                { key: 'created|date', label: 'Created', sortable: true, visibility: 'lg' },
            ],

            actions: ['view'],
            searchable: true,
            paginated: true,
            showAdd: false,
            showExport: true,
            showStatus: true,
            tableOptions: { striped: true, hover: true, size: 'sm' },
            emptyMessage: 'No files yet — try sorting or searching once the backend has data.',

            urlSyncEnabled: true,
        });
    }
}

export default TablePageExample;
