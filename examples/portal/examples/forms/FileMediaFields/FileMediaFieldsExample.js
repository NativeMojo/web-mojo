import { Page, FormView } from 'web-mojo';

/**
 * FileMediaFieldsExample — file upload + image + audio/video input fields.
 *
 * Doc:    docs/web-mojo/forms/FileHandling.md
 * Route:  forms/file-media-fields
 *
 * Shows:
 *   - file (multiple, accept-filtered) — generic file upload
 *   - image                            — drag/drop with preview thumbnail
 *   - file (audio)                     — narrowed via `accept="audio/*"`
 *   - file (video)                     — narrowed via `accept="video/*"`
 *
 * `fileHandling` controls how files are returned by `getFormData()`:
 *   - `'base64'` (default) — files become base64 data-URIs in JSON
 *   - `'multipart'`        — files stay as `File` objects for FormData POST
 *
 * The snapshot below truncates base64 payloads so the panel stays readable.
 */
class FileMediaFieldsExample extends Page {
    static pageName = 'forms/file-media-fields';
    static route = 'forms/file-media-fields';

    constructor(options = {}) {
        super({
            ...options,
            pageName: FileMediaFieldsExample.pageName,
            route: FileMediaFieldsExample.route,
            title: 'File & media fields',
            template: FileMediaFieldsExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'file-media-form',
            fileHandling: 'base64',
            fields: [
                { type: 'header', text: 'Generic upload', level: 6 },
                { type: 'file', name: 'documents', label: 'Documents (multiple, PDF/DOCX)',
                    multiple: true, accept: '.pdf,.doc,.docx',
                    help: '`accept` constrains the OS picker; multiple allows several files.' },

                { type: 'divider' },
                { type: 'header', text: 'Image with preview', level: 6 },
                { type: 'image', name: 'avatar', label: 'Avatar (drag &amp; drop)',
                    size: 'md', accept: 'image/png,image/jpeg',
                    help: '`image` shows a preview thumbnail and a Remove button.' },

                { type: 'divider' },
                { type: 'header', text: 'Audio / video', level: 6 },
                { type: 'file', name: 'voice_memo', label: 'Voice memo', columns: 6,
                    accept: 'audio/*' },
                { type: 'file', name: 'clip', label: 'Video clip', columns: 6,
                    accept: 'video/*' },
            ],
        });
        this.addChild(this.form);
    }

    async onActionSnapshot(event) {
        event.preventDefault();
        const data = await this.form.getFormData();
        // Truncate any base64 strings so the snapshot panel stays readable.
        const truncated = {};
        for (const [k, v] of Object.entries(data)) {
            if (typeof v === 'string' && v.startsWith('data:')) {
                truncated[k] = `${v.slice(0, 64)}…  (${v.length} chars)`;
            } else if (Array.isArray(v)) {
                truncated[k] = v.map(item => typeof item === 'string' && item.startsWith('data:')
                    ? `${item.slice(0, 64)}…  (${item.length} chars)`
                    : item);
            } else {
                truncated[k] = v;
            }
        }
        this.snapshot = JSON.stringify(truncated, null, 2);
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>File &amp; media fields</h1>
            <p class="example-summary">
                <code>file</code> for any upload (use <code>accept</code> to filter audio/video),
                and <code>image</code> for image-with-preview. <code>fileHandling: 'base64'</code>
                returns data-URIs; switch to <code>'multipart'</code> for raw <code>File</code> objects.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/FileHandling.md">
                    docs/web-mojo/forms/FileHandling.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-body">
                            <div data-container="file-media-form"></div>
                            <button type="button" class="btn btn-primary mt-3" data-action="snapshot">
                                <i class="bi bi-camera"></i> Snapshot
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="card">
                        <div class="card-header">Form data (base64 truncated)</div>
                        <div class="card-body">
                            {{#snapshot|bool}}
                                <pre class="mb-0 small" style="max-height: 60vh; overflow:auto;"><code>{{snapshot}}</code></pre>
                            {{/snapshot|bool}}
                            {{^snapshot|bool}}
                                <p class="text-muted mb-0">Choose files, then click Snapshot.</p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default FileMediaFieldsExample;
