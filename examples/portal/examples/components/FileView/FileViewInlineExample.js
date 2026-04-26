import { Page, FileView } from 'web-mojo';

/**
 * FileViewInlineExample — embed FileView directly in a page (rare).
 *
 * Doc:    docs/web-mojo/components/FileView.md
 * Route:  components/file-view/inline
 *
 * The canonical FileView usage is `Modal.show(new FileView({ data }))` —
 * see the sibling page. This example shows the rare alternative: mount
 * FileView inline as part of a regular page layout.
 *
 * When inline is appropriate:
 *   - The page IS the file detail page (e.g. `/files/:id`).
 *   - You want the full SideNav surface visible by default, not behind a click.
 *
 * When inline is wrong:
 *   - Embedded inside a row / list — use a "View" action that opens a Modal.
 *   - Anywhere the page already has a primary content area; FileView's
 *     SideNavView wants to own its container.
 *
 * FileView's height needs a bounded container — the component sets
 * `max-height: 70vh` on its inner SideNav, but the wrapping element has
 * to be tall enough for that to matter.
 */
class FileViewInlineExample extends Page {
    static pageName = 'components/file-view/inline';
    static route = 'components/file-view/inline';

    constructor(options = {}) {
        super({
            ...options,
            pageName: FileViewInlineExample.pageName,
            route: FileViewInlineExample.route,
            title: 'FileView — inline (rare)',
            template: FileViewInlineExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        const sampleFile = {
            id: 'inline-demo',
            filename: 'sunset.jpg',
            content_type: 'image/jpeg',
            category: 'image',
            file_size: 1_847_320,
            is_public: true,
            upload_status: 'completed',
            url: 'https://picsum.photos/seed/web-mojo-fileview-inline/1200/800',
            created: '2026-04-20T10:00:00Z',
            modified: '2026-04-20T10:00:00Z',
            renditions: {
                thumbnail:    { url: 'https://picsum.photos/seed/web-mojo-fileview-inline/200/200' },
                thumbnail_md: { url: 'https://picsum.photos/seed/web-mojo-fileview-inline/600/400' },
                original:     { url: 'https://picsum.photos/seed/web-mojo-fileview-inline/1200/800' },
            },
            metadata: { width: 1200, height: 800, iso: 200 },
        };

        this.fileView = new FileView({
            containerId: 'file-slot',
            data: sampleFile,
        });
        this.addChild(this.fileView);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>FileView — inline</h1>
            <p class="example-summary">
                Rare alternative — embed FileView directly in a page instead of a Modal.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/FileView.md">
                    docs/web-mojo/components/FileView.md
                </a>
            </p>

            <div class="alert alert-warning small">
                <i class="bi bi-exclamation-triangle"></i>
                <strong>Prefer the Modal pattern.</strong> Inline embedding works, but FileView's SideNav
                wants to own its container. Use this only for dedicated "file detail" pages.
            </div>

            <div class="card">
                <div class="card-body p-0">
                    <div data-container="file-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default FileViewInlineExample;
