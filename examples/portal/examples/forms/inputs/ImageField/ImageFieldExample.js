import { Page, FormView } from 'web-mojo';

/**
 * ImageFieldExample — canonical demo of the `image` field type.
 *
 * Doc:    docs/web-mojo/forms/inputs/ImageField.md
 * Route:  forms/inputs/image-field
 *
 * What this shows:
 *   1. Click-or-drop upload — users can drop an image onto the preview tile or
 *      click to open a file dialog. `allowDrop` (default true) controls drop.
 *   2. Three preview sizes (`xs`, `md`, `lg`) — the field uses square preview
 *      tiles sized by the `size` prop.
 *   3. Pre-existing image via `value: { url, renditions }` — the third field
 *      starts with a populated image to show the "edit existing" case.
 *   4. Output shape — `await form.getFormData()` returns the upload as a base64
 *      string (default `fileMode: 'base64'`) or a File object when
 *      `fileMode: 'multipart'`.
 */
class ImageFieldExample extends Page {
    static pageName = 'forms/inputs/image-field';
    static route = 'forms/inputs/image-field';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ImageFieldExample.pageName,
            route: ImageFieldExample.route,
            title: 'ImageField — upload + preview',
            template: ImageFieldExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'image-form',
            fields: [
                {
                    type: 'image',
                    name: 'thumbnail',
                    label: 'Thumbnail (xs)',
                    size: 'xs',
                    columns: { md: 4 },
                },
                {
                    type: 'image',
                    name: 'avatar',
                    label: 'Avatar (md)',
                    size: 'md',
                    accept: 'image/jpeg,image/png',
                    placeholder: 'Drop an image here',
                    help: 'JPEG or PNG.',
                    columns: { md: 4 },
                },
                {
                    type: 'image',
                    name: 'hero',
                    label: 'Hero (lg, pre-filled)',
                    size: 'lg',
                    value: {
                        url: 'https://picsum.photos/seed/hero/400/400',
                    },
                    help: 'Click the × to clear.',
                    columns: { md: 4 },
                },
            ],
        });
        this.addChild(this.form);
    }

    async onActionShow(event) {
        event.preventDefault();
        const data = await this.form.getFormData();
        // Truncate huge base64 strings for readable preview.
        const trimmed = {};
        for (const [k, v] of Object.entries(data)) {
            if (typeof v === 'string' && v.length > 120) {
                trimmed[k] = v.slice(0, 80) + `…(${v.length} chars)`;
            } else if (v instanceof File) {
                trimmed[k] = `<File ${v.name} ${v.size}b ${v.type}>`;
            } else {
                trimmed[k] = v;
            }
        }
        this.snapshot = JSON.stringify(trimmed, null, 2);
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ImageField</h1>
            <p class="example-summary">
                Image upload with drag-and-drop, instant preview, configurable size, and
                support for an existing-image starting state via <code>value.url</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/forms/inputs/ImageField.md" target="_blank">
                    docs/web-mojo/forms/inputs/ImageField.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <div data-container="image-form"></div>
                    <button type="button" class="btn btn-primary mt-3" data-action="show">
                        <i class="bi bi-eye"></i> Show form data
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-header">getFormData() output</div>
                <div class="card-body">
                    {{#snapshot|bool}}
                        <pre class="mb-0 small"><code>{{snapshot}}</code></pre>
                    {{/snapshot|bool}}
                    {{^snapshot|bool}}
                        <p class="text-muted mb-0">
                            Drop an image (or click) onto a tile, then click <strong>Show form data</strong>.
                            Long base64 strings are truncated for readability.
                        </p>
                    {{/snapshot|bool}}
                </div>
            </div>
        </div>
    `;
}

export default ImageFieldExample;
