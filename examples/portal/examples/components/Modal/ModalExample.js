import { Page, View, Modal } from 'web-mojo';

/**
 * ModalExample — canonical demo of Modal.show() with size variants.
 *
 * Doc:    docs/web-mojo/components/Modal.md
 * Route:  components/modal
 *
 * Modal is a static-only convenience wrapper around Dialog. The most-used
 * entry point is `Modal.show(view, options)` — pass a View instance and
 * Modal handles render, mount, and teardown.
 *
 * This page demonstrates Modal.show across the full size matrix:
 *
 *   sm | md | lg | xl | fullscreen
 *
 * Plus the two extra knobs people reach for first:
 *
 *   - `scrollable: true`     — body scrolls when content overflows
 *   - `backdrop: 'static'`   — clicks outside the modal don't dismiss
 */
class DemoBody extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: DemoBody.TEMPLATE,
            className: 'p-2',
        });
        this.size = options.size || 'md';
    }

    static TEMPLATE = `
        <div>
            <h5 class="mb-3">Modal at size <code>{{size}}</code></h5>
            <p>
                This whole block is a separate View instance, mounted by
                <code>Modal.show()</code>. Open the source for this example to
                see the size matrix and how the helper resolves on close.
            </p>
            <p class="text-muted small mb-0">
                Tip — Modal.show resolves with the clicked button's <code>value</code>
                (or <code>null</code> if dismissed via ESC / backdrop click).
            </p>
        </div>
    `;
}

class ScrollableBody extends View {
    constructor(options = {}) {
        super({ ...options, template: ScrollableBody.TEMPLATE, className: 'p-2' });
        this.lines = Array.from({ length: 40 }, (_, i) => `Line ${i + 1} — Lorem ipsum dolor sit amet, consectetur adipiscing elit.`);
    }

    static TEMPLATE = `
        <div>
            {{#lines}}<p class="mb-2">{{.}}</p>{{/lines}}
        </div>
    `;
}

class ModalExample extends Page {
    static pageName = 'components/modal';
    static route = 'components/modal';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ModalExample.pageName,
            route: ModalExample.route,
            title: 'Modal — show a View',
            template: ModalExample.TEMPLATE,
        });
        this.lastResult = '(none yet)';
    }

    log(label, value) {
        this.lastResult = `${label} → ${JSON.stringify(value)}`;
        this.render();
    }

    async openAtSize(size) {
        const result = await Modal.show(new DemoBody({ size }), {
            title: `Modal — ${size}`,
            size,
            buttons: [
                { text: 'OK', class: 'btn-primary', value: 'ok' },
                { text: 'Close', class: 'btn-secondary', dismiss: true },
            ],
        });
        this.log(`Modal.show ({ size: '${size}' })`, result);
    }

    onActionShowSm()         { return this.openAtSize('sm'); }
    onActionShowMd()         { return this.openAtSize('md'); }
    onActionShowLg()         { return this.openAtSize('lg'); }
    onActionShowXl()         { return this.openAtSize('xl'); }
    onActionShowFullscreen() { return this.openAtSize('fullscreen'); }

    async onActionShowScrollable() {
        const result = await Modal.show(new ScrollableBody(), {
            title: 'Long content — scrollable',
            size: 'md',
            scrollable: true,
            buttons: [
                { text: 'Done', class: 'btn-primary', value: 'done' },
            ],
        });
        this.log("Modal.show ({ scrollable: true })", result);
    }

    async onActionShowStatic() {
        const result = await Modal.show(new DemoBody({ size: 'static' }), {
            title: 'Static backdrop',
            size: 'md',
            backdrop: 'static',
            keyboard: false,
            buttons: [
                { text: 'OK', class: 'btn-primary', value: 'ok' },
                { text: 'Cancel', class: 'btn-secondary', value: null },
            ],
        });
        this.log("Modal.show ({ backdrop: 'static' })", result);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Modal</h1>
            <p class="example-summary">
                <code>Modal.show(view, options)</code> — every button below opens a Modal at a different size or option.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/Modal.md">
                    docs/web-mojo/components/Modal.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-header">Sizes</div>
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-primary"   data-action="show-sm">sm</button>
                        <button class="btn btn-primary"   data-action="show-md">md</button>
                        <button class="btn btn-primary"   data-action="show-lg">lg</button>
                        <button class="btn btn-primary"   data-action="show-xl">xl</button>
                        <button class="btn btn-secondary" data-action="show-fullscreen">fullscreen</button>
                    </div>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-header">Body and backdrop options</div>
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-outline-primary" data-action="show-scrollable">
                            <i class="bi bi-arrows-vertical"></i> scrollable
                        </button>
                        <button class="btn btn-outline-primary" data-action="show-static">
                            <i class="bi bi-shield-lock"></i> backdrop: static
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Last result</div>
                <div class="card-body">
                    <pre class="mb-0 small"><code>{{lastResult}}</code></pre>
                </div>
            </div>
        </div>
    `;
}

export default ModalExample;
