import { Page, DataView } from 'web-mojo';

/**
 * DataViewExample — canonical demo of DataView.
 *
 * Doc:    docs/web-mojo/components/DataView.md
 * Route:  components/data-view
 *
 * DataView is a read-only key/value display for an object or Model. It
 * lays out fields in a Bootstrap grid with built-in handling for emails,
 * URLs, booleans, dates, currency, file sizes, and JSON objects.
 *
 * Use it for profile cards, detail panes, or "show this API response"
 * dialogs. This example renders a static object — pass `model:` instead
 * of `data:` to bind a Model and pick up automatic re-renders on change.
 */
class DataViewExample extends Page {
    static pageName = 'components/data-view';
    static route = 'components/data-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DataViewExample.pageName,
            route: DataViewExample.route,
            title: 'DataView — structured data display',
            template: DataViewExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.dataView = new DataView({
            containerId: 'data-slot',
            data: {
                name: 'Alice Adams',
                email: 'alice@example.com',
                website: 'https://example.com/alice',
                role: 'Admin',
                isActive: true,
                joinDate: '2024-01-15',
                fileSize: 2_557_500,
                permissions: ['read', 'write', 'admin'],
                metadata: {
                    theme: 'dark',
                    lastLogin: '2026-04-24T09:42:00Z',
                    sessions: 42,
                },
            },
            columns: 2,
            responsive: true,
            fields: [
                { name: 'name', label: 'Name', colSize: 6 },
                { name: 'email', label: 'Email', type: 'email', colSize: 6 },
                { name: 'website', label: 'Website', type: 'url', colSize: 6 },
                { name: 'role', label: 'Role', colSize: 3 },
                { name: 'isActive', label: 'Active', type: 'boolean', colSize: 3 },
                { name: 'joinDate', label: 'Joined', format: 'date', colSize: 6 },
                { name: 'fileSize', label: 'Avatar size', format: 'filesize', colSize: 6 },
                { name: 'permissions', label: 'Permissions', type: 'json', colSize: 6 },
                { name: 'metadata', label: 'Metadata', colSize: 12 },
            ],
        });

        this.addChild(this.dataView);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>DataView</h1>
            <p class="example-summary">
                Read-only key/value grid for objects or Models. Built-in field types for email, URL, boolean, date, JSON, and more.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/DataView.md">
                    docs/web-mojo/components/DataView.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="data-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default DataViewExample;
