import { Page, applyFileDropMixin } from 'web-mojo';

/**
 * FileUploadExample — canonical demo of the FileDropMixin.
 *
 * Doc:    docs/web-mojo/extensions/FileUpload.md
 * Route:  extensions/file-upload
 *
 * `applyFileDropMixin(ViewClass)` adds drag-and-drop file handling to any
 * View (or Page). After applying it, call `enableFileDrop({...})` in
 * `onInit()` and implement `onFileDrop(files, event, validation)` to receive
 * dropped files. The mixin handles drag visuals, type/size validation, and
 * cleanup on destroy. We also wire a hidden `<input type="file">` so users
 * who can't drag (or are on touch devices) still get the same workflow.
 *
 * No backend: dropped files are inspected client-side only — the example
 * shows name, size, type, and a thumbnail for image MIME types.
 */
class FileUploadExample extends Page {
    static pageName = 'extensions/file-upload';
    static route = 'extensions/file-upload';

    constructor(options = {}) {
        super({
            ...options,
            pageName: FileUploadExample.pageName,
            route: FileUploadExample.route,
            title: 'FileUpload — drag & drop',
            template: FileUploadExample.TEMPLATE,
        });
        this.droppedFiles = [];
        this.errorMessage = null;
    }

    async onInit() {
        await super.onInit();
        this.enableFileDrop({
            acceptedTypes: ['image/*', 'application/pdf', 'text/plain'],
            maxFileSize: 5 * 1024 * 1024, // 5 MB
            multiple: true,
            dropZoneSelector: '[data-drop-zone]',
        });
    }

    async onFileDrop(files) {
        this.errorMessage = null;
        this.droppedFiles = await Promise.all(
            files.map(async (f) => ({
                name: f.name,
                size: this._humanSize(f.size),
                type: f.type || 'unknown',
                isImage: (f.type || '').startsWith('image/'),
                preview: (f.type || '').startsWith('image/') ? await this._readAsDataUrl(f) : null,
            }))
        );
        this.render();
    }

    async onFileDropError(error) {
        this.errorMessage = error.message || String(error);
        this.render();
    }

    onActionPickFiles() {
        this.element.querySelector('[data-file-input]').click();
    }

    async onActionFilesPicked(event) {
        const files = Array.from(event.target.files || []);
        if (files.length) await this.onFileDrop(files);
    }

    _humanSize(bytes) {
        if (!bytes) return '0 B';
        const u = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
    }

    _readAsDataUrl(file) {
        return new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => resolve(null);
            r.readAsDataURL(file);
        });
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>FileUpload</h1>
            <p class="example-summary">
                Drop files anywhere on the zone, or click to pick. Mixin validates type and size.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/extensions/FileUpload.md">
                    docs/web-mojo/extensions/FileUpload.md
                </a>
            </p>

            <div data-drop-zone class="border border-2 border-dashed rounded p-5 text-center bg-light mb-3">
                <i class="bi bi-cloud-arrow-up fs-1 text-primary"></i>
                <p class="mb-2 mt-2">Drag images, PDFs, or text files here (max 5 MB each)</p>
                <button class="btn btn-outline-primary" data-action="pick-files">
                    <i class="bi bi-folder2-open"></i> Pick files
                </button>
                <input type="file" multiple accept="image/*,application/pdf,text/plain"
                       class="d-none" data-file-input data-change-action="files-picked" />
            </div>

            {{#errorMessage|bool}}
                <div class="alert alert-danger">{{errorMessage}}</div>
            {{/errorMessage|bool}}

            {{#droppedFiles|bool}}
                <div class="card">
                    <div class="card-header">Selected files ({{droppedFiles.length}})</div>
                    <ul class="list-group list-group-flush">
                        {{#droppedFiles}}
                            <li class="list-group-item d-flex align-items-center gap-3">
                                {{#.isImage}}
                                    <img src="{{{.preview}}}" alt="{{.name}}"
                                         style="width:48px;height:48px;object-fit:cover;border-radius:4px;" />
                                {{/.isImage}}
                                {{^.isImage}}
                                    <i class="bi bi-file-earmark fs-3 text-muted"></i>
                                {{/.isImage}}
                                <div class="flex-grow-1">
                                    <div class="fw-semibold">{{.name}}</div>
                                    <small class="text-muted">{{.type}} — {{.size}}</small>
                                </div>
                            </li>
                        {{/droppedFiles}}
                    </ul>
                </div>
            {{/droppedFiles|bool}}
        </div>
    `;
}

applyFileDropMixin(FileUploadExample);

export default FileUploadExample;
