import { Page } from 'web-mojo';
import { ImageViewer, ImageEditor, LightboxGallery } from 'web-mojo/lightbox';

/**
 * LightBoxExample — canonical demo of the LightBox extension.
 *
 * Doc:    docs/web-mojo/extensions/LightBox.md
 * Route:  extensions/light-box
 *
 * Shows the three top-level entry points each one as a static dialog opener:
 *
 *   1. LightboxGallery.show(images) — fullscreen gallery with prev/next.
 *   2. ImageViewer.showDialog(url)  — single-image zoom / pan / rotate.
 *   3. ImageEditor.showDialog(url)  — crop / filters / export workflow.
 *
 * The page itself is a thin launcher: it stores nothing but the URLs and the
 * last edited data URL, then re-renders whenever the user finishes a workflow.
 */
class LightBoxExample extends Page {
    static pageName = 'extensions/light-box';
    static route = 'extensions/light-box';

    constructor(options = {}) {
        super({
            ...options,
            pageName: LightBoxExample.pageName,
            route: LightBoxExample.route,
            title: 'LightBox — viewer, gallery, editor',
            template: LightBoxExample.TEMPLATE,
        });

        this.images = [
            { src: 'https://picsum.photos/id/1015/1200/800', alt: 'River canyon' },
            { src: 'https://picsum.photos/id/1018/1200/800', alt: 'Forest mountain' },
            { src: 'https://picsum.photos/id/1019/1200/800', alt: 'Tree line' },
        ];
        this.editedDataUrl = null;
    }

    async onActionViewImage(event, element) {
        const idx = Number(element.getAttribute('data-index')) || 0;
        await ImageViewer.showDialog(this.images[idx].src, {
            title: this.images[idx].alt,
            showControls: true,
            allowRotate: true,
            allowZoom: true,
            size: 'fullscreen',
        });
    }

    async onActionOpenGallery() {
        LightboxGallery.show(this.images, { startIndex: 0 });
    }

    async onActionEditImage() {
        const result = await ImageEditor.showDialog(this.images[0].src, {
            title: 'Edit image',
            allowCrop: true,
            allowFilters: true,
            size: 'fullscreen',
        });
        if (result && result.data) {
            this.editedDataUrl = result.data;
            this.render();
        }
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>LightBox</h1>
            <p class="example-summary">
                Image viewer, fullscreen gallery, and full-featured editor — all opened via static dialog helpers.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/extensions/LightBox.md">
                    docs/web-mojo/extensions/LightBox.md
                </a>
            </p>

            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span>Thumbnails</span>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary" data-action="open-gallery">
                            <i class="bi bi-images"></i> Open gallery
                        </button>
                        <button class="btn btn-sm btn-outline-success" data-action="edit-image">
                            <i class="bi bi-pencil-square"></i> Edit first image
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row g-3">
                        {{#images}}
                            <div class="col-6 col-md-4">
                                <button class="btn p-0 border-0 bg-transparent w-100"
                                        data-action="view-image" data-index="{{@index}}">
                                    <img src="{{.src}}" alt="{{.alt}}"
                                         class="img-fluid rounded shadow-sm" style="aspect-ratio: 3/2; object-fit: cover;" />
                                </button>
                            </div>
                        {{/images}}
                    </div>
                </div>
            </div>

            {{#editedDataUrl|bool}}
                <div class="card">
                    <div class="card-header">Edited result</div>
                    <div class="card-body text-center">
                        <img src="{{{editedDataUrl}}}" class="img-fluid rounded" alt="Edited image" />
                    </div>
                </div>
            {{/editedDataUrl|bool}}
        </div>
    `;
}

export default LightBoxExample;
