import { Page, View } from 'web-mojo';

/**
 * AdvancedViewsExample — Canvas inside a View with proper lifecycle.
 *
 * Doc:    docs/web-mojo/core/AdvancedViews.md
 * Route:  core/advanced-views
 *
 * Demonstrates the standard pattern for views that own non-template DOM
 * (Canvas, third-party libs, etc.):
 *
 *   - Template defines a `<canvas>` element.
 *   - `onAfterRender()` is the hook that grabs the canvas reference and
 *     starts the animation. The DOM is guaranteed to exist by then.
 *   - `onBeforeDestroy()` cancels the rAF loop so the view cleans up after
 *     itself when the page is destroyed.
 *   - User input toggles `this.animating`, the only reactive state.
 */
class BouncingCanvasView extends View {
    constructor(options = {}) {
        super({ ...options, template: BouncingCanvasView.TEMPLATE });
        this.animating = true;
        this._rafId = null;
        this._t = 0;
    }

    async onAfterRender() {
        await super.onAfterRender();
        this.canvas = this.element.querySelector('canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        if (this.animating) this._loop();
    }

    async onBeforeDestroy() {
        if (this._rafId) cancelAnimationFrame(this._rafId);
        this._rafId = null;
        await super.onBeforeDestroy();
    }

    onActionToggle() {
        this.animating = !this.animating;
        if (this.animating) {
            this._loop();
        } else if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this.render();
    }

    _loop() {
        if (!this.ctx) return;
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        // Bouncing ball driven by a sinusoid.
        const x = width / 2 + Math.cos(this._t * 0.04) * (width / 2 - 40);
        const y = height / 2 + Math.sin(this._t * 0.06) * (height / 2 - 40);
        this.ctx.fillStyle = '#0d6efd';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 24, 0, Math.PI * 2);
        this.ctx.fill();

        this._t++;
        if (this.animating) this._rafId = requestAnimationFrame(() => this._loop());
    }

    static TEMPLATE = `
        <div>
            <canvas width="480" height="180" class="border rounded bg-light w-100"></canvas>
            <button class="btn btn-sm btn-outline-primary mt-2" data-action="toggle">
                <i class="bi {{#animating|bool}}bi-pause-fill{{/animating|bool}}{{^animating|bool}}bi-play-fill{{/animating|bool}}"></i>
                {{#animating|bool}}Pause{{/animating|bool}}{{^animating|bool}}Play{{/animating|bool}}
            </button>
        </div>
    `;
}

class AdvancedViewsExample extends Page {
    static pageName = 'core/advanced-views';
    static route = 'core/advanced-views';

    constructor(options = {}) {
        super({
            ...options,
            pageName: AdvancedViewsExample.pageName,
            route: AdvancedViewsExample.route,
            title: 'Advanced Views — Canvas',
            template: AdvancedViewsExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();
        this.addChild(new BouncingCanvasView({ containerId: 'canvas-slot' }));
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Advanced Views</h1>
            <p class="example-summary">
                Canvas integration with a clean View lifecycle: grab the canvas in
                <code>onAfterRender()</code>, drive a rAF loop, and tear it down in
                <code>onBeforeDestroy()</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/core/AdvancedViews.md">
                    docs/web-mojo/core/AdvancedViews.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div data-container="canvas-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default AdvancedViewsExample;
