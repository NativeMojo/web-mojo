import { Page, Modal } from 'web-mojo';

/**
 * ModalFormExample — Modal.form(), the form-in-a-modal helper.
 *
 * Doc:    docs/web-mojo/components/Modal.md#form
 * Route:  components/modal/form
 *
 * `Modal.form(options)` is a re-export of Dialog.showForm — same shape,
 * but you don't need to import Dialog separately. Pass a `fields:` array
 * (FormView field config) and the helper returns a Promise that resolves
 * with the collected form data on submit, or `null` on cancel/dismiss.
 *
 * Useful for "create new X" modals where you don't have a Model wired up
 * yet — just collect the data, do whatever you want with it.
 */
class ModalFormExample extends Page {
    static pageName = 'components/modal/form';
    static route = 'components/modal/form';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ModalFormExample.pageName,
            route: ModalFormExample.route,
            title: 'Modal — form',
            template: ModalFormExample.TEMPLATE,
        });
        this.lastResult = '(none yet)';
    }

    log(label, value) {
        this.lastResult = `${label}\n${JSON.stringify(value, null, 2)}`;
        this.render();
    }

    async onActionShowForm() {
        const data = await Modal.form({
            title: 'Schedule Maintenance',
            size: 'md',
            submitText: 'Schedule',
            cancelText: 'Cancel',
            defaults: { priority: 'normal' },
            fields: [
                { type: 'text',   name: 'subject', label: 'Subject', required: true,
                  placeholder: 'e.g. Quarterly DB upgrade' },
                { type: 'select', name: 'priority', label: 'Priority',
                  options: [
                      { value: 'low',    label: 'Low' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'high',   label: 'High' },
                      { value: 'urgent', label: 'Urgent' },
                  ] },
                { type: 'date',     name: 'when',  label: 'Scheduled for', required: true },
                { type: 'textarea', name: 'notes', label: 'Notes', rows: 3,
                  placeholder: 'Anything the team should know…' },
            ],
        });
        this.log('Modal.form (Schedule Maintenance)', data);
    }

    async onActionShowQuickForm() {
        const data = await Modal.form({
            title: 'Quick capture',
            size: 'sm',
            submitText: 'Save',
            fields: [
                { type: 'text', name: 'note', label: 'Note', required: true,
                  placeholder: 'What did you learn today?' },
            ],
        });
        this.log('Modal.form (Quick capture)', data);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Modal — form</h1>
            <p class="example-summary">
                <code>Modal.form({ fields, ... })</code> opens a FormView in a modal and resolves
                with the submitted values, or <code>null</code> if cancelled.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/Modal.md#form">
                    docs/web-mojo/components/Modal.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-primary" data-action="show-form">
                            <i class="bi bi-calendar-event"></i> Modal.form (Schedule Maintenance)
                        </button>
                        <button class="btn btn-outline-primary" data-action="show-quick-form">
                            <i class="bi bi-lightning"></i> Modal.form (Quick capture)
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

export default ModalFormExample;
