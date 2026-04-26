import { Page, FormView } from 'web-mojo';

/**
 * ImageFieldsExample — canonical demo of FormView's `type: 'image'` fields.
 *
 * Doc:    docs/web-mojo/components/ImageFields.md
 * Route:  components/image-fields
 *
 * Image fields are a FormView field type with five size variants
 * (xs / sm / md / lg / xl), drag-and-drop support, automatic preview
 * generation, and tolerance for either a URL string or a server-side
 * file object (with renditions). They are the standard way to collect
 * image input in a form.
 *
 * This example builds a small profile form with three image fields at
 * different sizes, plus a name field. Submitting logs the values — no
 * backend write is performed, so it's safe to run anywhere.
 */
class ImageFieldsExample extends Page {
    static pageName = 'components/image-fields';
    static route = 'components/image-fields';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ImageFieldsExample.pageName,
            route: ImageFieldsExample.route,
            title: 'Image fields — image input in forms',
            template: ImageFieldsExample.TEMPLATE,
        });
        this.lastSubmit = '(not submitted)';
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'form-slot',
            data: {
                full_name: 'Alice Adams',
                avatar: 'https://picsum.photos/seed/web-mojo-avatar/96/96',
            },
            formConfig: {
                fields: [
                    { type: 'text', name: 'full_name', label: 'Full name', required: true },
                    {
                        type: 'image',
                        name: 'avatar',
                        label: 'Avatar (xs)',
                        size: 'xs',
                        help: '48x48 — perfect for user avatars and small thumbnails.',
                    },
                    {
                        type: 'image',
                        name: 'cover',
                        label: 'Cover photo (lg)',
                        size: 'lg',
                        help: '200x200 — drag/drop an image, or click to browse.',
                    },
                    {
                        type: 'image',
                        name: 'banner',
                        label: 'Banner (xl)',
                        size: 'xl',
                        accept: 'image/png,image/jpeg',
                        help: '300x300 — restricted to PNG/JPEG via the accept attribute.',
                    },
                ],
            },
        });

        this.form.on('submit', ({ values } = {}) => {
            this.lastSubmit = JSON.stringify(values, null, 2);
            this.render();
        });

        this.addChild(this.form);
    }

    onActionSubmit() {
        const values = this.form.formBuilder?.getValues?.() || {};
        this.lastSubmit = JSON.stringify(values, null, 2);
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Image fields</h1>
            <p class="example-summary">
                Form fields for image input — five size variants, drag/drop, preview, and rendition-aware display.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ImageFields.md">
                    docs/web-mojo/components/ImageFields.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="form-slot"></div>
                    <button class="btn btn-primary mt-3" data-action="submit">
                        <i class="bi bi-check2-circle"></i> Read values
                    </button>
                </div>
                <div class="card-footer bg-light">
                    <strong class="small text-muted">Current values</strong>
                    <pre class="mb-0 small"><code>{{lastSubmit}}</code></pre>
                </div>
            </div>
        </div>
    `;
}

export default ImageFieldsExample;
