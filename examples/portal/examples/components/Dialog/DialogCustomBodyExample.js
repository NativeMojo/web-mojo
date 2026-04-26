import { Page, View, Dialog } from 'web-mojo';

/**
 * DialogCustomBodyExample — pass any View as the dialog body.
 *
 * Doc:    docs/web-mojo/components/Dialog.md#custom-body
 * Route:  components/dialog/custom-body
 *
 * `Dialog.showDialog({ body: <View instance> })` mounts the View inside
 * the modal-body, manages its lifecycle, and tears it down when the
 * dialog closes. The custom view can hold its own state and have its
 * own data-action handlers — independent from the dialog footer.
 *
 * Footer button results still flow back through the showDialog Promise.
 * If you want to read state OFF the inner view at close-time, capture
 * the instance before opening the dialog and read its properties when
 * the Promise resolves (see `pickedColor` below).
 */
class ColorPickerView extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: ColorPickerView.TEMPLATE,
            className: 'p-2',
        });
        this.colors = ['danger', 'warning', 'success', 'info', 'primary', 'secondary'];
        this.picked = options.initial || 'primary';
    }

    onActionPick(event, element) {
        this.picked = element.getAttribute('data-color');
        this.render();
    }

    static TEMPLATE = `
        <div>
            <p class="mb-3">Pick a color (state lives on this View, not the Dialog):</p>
            <div class="d-flex flex-wrap gap-2 mb-3">
                {{#colors}}
                <button class="btn btn-{{.}} text-white" data-action="pick" data-color="{{.}}">
                    <i class="bi bi-circle-fill"></i> {{.}}
                </button>
                {{/colors}}
            </div>
            <div class="alert alert-{{picked}} mb-0">
                <strong>Currently picked:</strong> {{picked}}
            </div>
        </div>
    `;
}

class DialogCustomBodyExample extends Page {
    static pageName = 'components/dialog/custom-body';
    static route = 'components/dialog/custom-body';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DialogCustomBodyExample.pageName,
            route: DialogCustomBodyExample.route,
            title: 'Dialog — custom View body',
            template: DialogCustomBodyExample.TEMPLATE,
        });
        this.lastResult = '(none yet)';
    }

    async onActionOpen() {
        const picker = new ColorPickerView({ initial: 'primary' });

        const buttonValue = await Dialog.showDialog({
            title: 'Pick a color',
            size: 'md',
            body: picker,           // any View instance works
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', dismiss: true, value: null },
                { text: 'Use this color', class: 'btn-primary', value: 'use' },
            ],
        });

        if (buttonValue === 'use') {
            // Read state off the inner View directly.
            this.lastResult = `picked: ${picker.picked}`;
        } else {
            this.lastResult = '(cancelled)';
        }
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Dialog — custom View body</h1>
            <p class="example-summary">
                Pass any View instance as <code>body:</code>. Dialog mounts it, manages its lifecycle,
                and tears it down on close. Footer-button results flow back through the showDialog Promise.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/Dialog.md#custom-body">
                    docs/web-mojo/components/Dialog.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <button class="btn btn-primary" data-action="open">
                        <i class="bi bi-palette"></i> Open color picker dialog
                    </button>
                    <p class="text-muted small mt-3 mb-0">
                        The color buttons are handled by the inner <code>ColorPickerView</code>.
                        The footer buttons resolve the <code>showDialog</code> Promise.
                    </p>
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

export default DialogCustomBodyExample;
