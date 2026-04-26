import { Page, View } from 'web-mojo';

/**
 * ViewExample — canonical demo of the View base class.
 *
 * Doc:    docs/web-mojo/core/View.md
 * Route:  core/view
 *
 * Shows the four things every View user needs:
 *
 *   1. Inline template — a Mustache string read from `this`. Properties on the
 *      view instance are template context: `this.title` → `{{title}}`.
 *   2. data-action delegation — clicking `data-action="bump"` calls
 *      `onActionBump(event, element)`. No addEventListener calls.
 *   3. Child views via addChild + containerId — never call render()/mount()
 *      yourself.
 *   4. Re-render on state change — calling `this.render()` repaints the
 *      template using the current `this.*` values.
 *
 * Copy-paste recipe: extend Page (or View directly), set `template:` on the
 * constructor options, expose state as instance properties, add `onAction*`
 * methods for buttons, and `addChild` for nested views.
 */
class ClickCounterView extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: ClickCounterView.TEMPLATE,
            className: 'border rounded p-3 bg-light',
        });
        this.count = 0;
    }

    onActionInc() {
        this.count++;
        this.render();
    }

    static TEMPLATE = `
        <div>
            <strong>Child view</strong>
            <span class="text-muted small ms-2">— a separate View, mounted via addChild()</span>
            <div class="mt-2">
                Clicks: <span class="badge text-bg-primary">{{count}}</span>
                <button class="btn btn-sm btn-outline-primary ms-2" data-action="inc">
                    <i class="bi bi-plus-lg"></i> Increment
                </button>
            </div>
        </div>
    `;
}

class ViewExample extends Page {
    static pageName = 'core/view';
    static route = 'core/view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ViewExample.pageName,
            route: ViewExample.route,
            title: 'View — base component',
            template: ViewExample.TEMPLATE,
        });

        this.greeting = 'Hello from the View';
        this.bumps = 0;
    }

    async onInit() {
        await super.onInit();
        this.counter = new ClickCounterView({ containerId: 'counter-slot' });
        this.addChild(this.counter);
    }

    onActionBump() {
        this.bumps++;
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>View</h1>
            <p class="example-summary">
                Base component with lifecycle, templates, data-action delegation, and child views.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/core/View.md">
                    docs/web-mojo/core/View.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">{{greeting}}</h5>
                    <p class="text-muted mb-3">
                        The view instance is the Mustache context. <code>this.greeting</code> renders as
                        <code>&#123;&#123;greeting&#125;&#125;</code>. Each click below increments
                        <code>this.bumps</code> and calls <code>this.render()</code>.
                    </p>

                    <button class="btn btn-primary" data-action="bump">
                        <i class="bi bi-arrow-up-circle"></i> Bump
                    </button>
                    <span class="ms-3">Bumps: <strong>{{bumps}}</strong></span>

                    <hr class="my-4" />

                    <div data-container="counter-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default ViewExample;
