import { Page, FileView, Modal } from 'web-mojo';

/**
 * FileViewExample — canonical Modal-hosted FileView.
 *
 * Doc:    docs/web-mojo/components/FileView.md
 * Route:  components/file-view
 *
 * FileView is designed to live in a Modal. Its category-aware layout
 * (header + SideNavView with Preview / Details / Renditions / Metadata)
 * needs the bounded height a modal provides, and the action menu's
 * lifecycle (delete, regenerate, download) maps cleanly to "open, do
 * something, close" — i.e. modal flow.
 *
 * The page itself is a small list of demo File records — each row has an
 * "Open in Modal" button that does:
 *
 *     await Modal.show(new FileView({ data: row }), { size: 'lg' });
 *
 * Pass either a `File` model (`model:`) or a plain data object (`data:`).
 * The constructor wraps raw data in a File model internally, so this
 * example needs no backend round-trip.
 */
const SAMPLE_FILES = [
    {
        id: 'demo-image',
        filename: 'sunset.jpg',
        content_type: 'image/jpeg',
        category: 'image',
        file_size: 1_847_320,
        is_public: true,
        upload_status: 'completed',
        url: 'https://picsum.photos/seed/web-mojo-fileview-img/1200/800',
        created: '2026-04-20T10:00:00Z',
        modified: '2026-04-20T10:00:00Z',
        renditions: {
            thumbnail:    { url: 'https://picsum.photos/seed/web-mojo-fileview-img/200/200' },
            thumbnail_md: { url: 'https://picsum.photos/seed/web-mojo-fileview-img/600/400' },
            original:     { url: 'https://picsum.photos/seed/web-mojo-fileview-img/1200/800' },
        },
        metadata: { width: 1200, height: 800, camera: 'Demo Camera', iso: 200 },
    },
    {
        id: 'demo-pdf',
        filename: 'whitepaper.pdf',
        content_type: 'application/pdf',
        category: 'pdf',
        file_size: 524_288,
        is_public: false,
        upload_status: 'completed',
        url: 'https://example.com/files/whitepaper.pdf',
        created: '2026-04-18T14:30:00Z',
        modified: '2026-04-18T14:30:00Z',
        metadata: { pages: 12, author: 'Demo Author' },
    },
    {
        id: 'demo-video',
        filename: 'intro.mp4',
        content_type: 'video/mp4',
        category: 'video',
        file_size: 8_388_608,
        is_public: true,
        upload_status: 'completed',
        url: 'https://example.com/files/intro.mp4',
        created: '2026-04-15T09:00:00Z',
        modified: '2026-04-15T09:00:00Z',
        metadata: { duration: '00:01:45', resolution: '1920x1080' },
    },
    {
        id: 'demo-archive',
        filename: 'backup.zip',
        content_type: 'application/zip',
        category: 'archive',
        file_size: 134_217_728,
        is_public: false,
        upload_status: 'completed',
        url: 'https://example.com/files/backup.zip',
        created: '2026-04-10T08:00:00Z',
        modified: '2026-04-10T08:00:00Z',
        metadata: { entries: 84 },
    },
];

class FileViewExample extends Page {
    static pageName = 'components/file-view';
    static route = 'components/file-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: FileViewExample.pageName,
            route: FileViewExample.route,
            title: 'FileView — Modal-hosted file viewer',
            template: FileViewExample.TEMPLATE,
        });
        this.files = SAMPLE_FILES;
    }

    async onActionOpen(event, element) {
        const id = element.getAttribute('data-file-id');
        const data = this.files.find(f => f.id === id);
        if (!data) return;

        await Modal.show(new FileView({ data }), {
            title: data.filename,
            size: 'lg',
        });
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>FileView</h1>
            <p class="example-summary">
                Canonical viewer for fileman File records. Live in a Modal — the layout's height needs
                the bounded container, and the action menu maps cleanly to a modal lifecycle.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/FileView.md">
                    docs/web-mojo/components/FileView.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-header">Demo files — "Open in Modal" mounts a fresh FileView</div>
                <div class="card-body p-0">
                    <table class="table table-hover mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Filename</th>
                                <th>Category</th>
                                <th class="text-end">Size</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {{#files}}
                            <tr>
                                <td><i class="bi bi-file-earmark me-2"></i>{{filename}}</td>
                                <td><span class="badge text-bg-secondary">{{category}}</span></td>
                                <td class="text-end font-monospace small">{{file_size}}</td>
                                <td class="text-end">
                                    <button class="btn btn-sm btn-primary" data-action="open" data-file-id="{{id}}">
                                        <i class="bi bi-window-stack"></i> Open in Modal
                                    </button>
                                </td>
                            </tr>
                            {{/files}}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Pattern</div>
                <div class="card-body">
                    <pre class="mb-0 small"><code>// Canonical — FileView in a Modal
await Modal.show(new FileView({ data: fileRecord }), {
    title: fileRecord.filename,
    size: 'lg',
});

// With a fetched model
await Modal.show(new FileView({ model: fileModel }), { size: 'lg' });</code></pre>
                    <p class="text-muted small mt-2 mb-0">
                        The action menu actions (regenerate, delete, make-public) hit the backend
                        via <code>this.model.save()</code> / <code>destroy()</code>, so they need a real File record.
                        Open the inline sibling for the rare "embed in a page" alternative.
                    </p>
                </div>
            </div>
        </div>
    `;
}

export default FileViewExample;
