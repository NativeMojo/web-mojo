import { Page, FileView } from 'web-mojo';

/**
 * FileViewExample — canonical demo of FileView.
 *
 * Doc:    docs/web-mojo/components/FileView.md
 * Route:  components/file-view
 *
 * FileView is the standard viewer for `fileman` File records. It shows a
 * compact header (thumbnail, filename, size, category badge, action menu)
 * and a SideNavView that switches between four category-aware sections:
 * Preview, Details, Renditions, and Metadata. The Preview section branches
 * on the file's `category` (image / video / audio / pdf / document / …).
 *
 * Pass either a `File` model (`model:`) or a plain data object (`data:`).
 * The component wraps raw data in a File model internally. This example
 * uses the `data:` form so it works without a backend round-trip.
 */
class FileViewExample extends Page {
    static pageName = 'components/file-view';
    static route = 'components/file-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: FileViewExample.pageName,
            route: FileViewExample.route,
            title: 'FileView — File record viewer',
            template: FileViewExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        const sampleFile = {
            id: 'demo-1',
            filename: 'sunset.jpg',
            content_type: 'image/jpeg',
            category: 'image',
            file_size: 1_847_320,
            is_public: true,
            upload_status: 'completed',
            url: 'https://picsum.photos/seed/web-mojo-fileview/1200/800',
            created: '2026-04-20T10:00:00Z',
            modified: '2026-04-20T10:00:00Z',
            renditions: {
                thumbnail: { url: 'https://picsum.photos/seed/web-mojo-fileview/200/200' },
                thumbnail_md: { url: 'https://picsum.photos/seed/web-mojo-fileview/600/400' },
                original: { url: 'https://picsum.photos/seed/web-mojo-fileview/1200/800' },
            },
            metadata: {
                width: 1200,
                height: 800,
                camera: 'Demo Camera',
                iso: 200,
            },
        };

        this.fileView = new FileView({
            containerId: 'file-slot',
            data: sampleFile,
        });

        this.addChild(this.fileView);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>FileView</h1>
            <p class="example-summary">
                File record viewer with category-aware Preview, Details, Renditions, and Metadata sections.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/components/FileView.md" target="_blank">
                    docs/web-mojo/components/FileView.md
                </a>
            </p>

            <div class="card">
                <div class="card-body p-0">
                    <div data-container="file-slot"></div>
                </div>
            </div>
            <p class="text-muted small mt-3">
                <i class="bi bi-info-circle"></i>
                The sample file is local — no backend round-trip. The action menu's
                regenerate / delete / make-public actions need a real File record.
            </p>
        </div>
    `;
}

export default FileViewExample;
