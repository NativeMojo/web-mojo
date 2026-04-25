import { Page, FormView } from 'web-mojo';

/**
 * FormLayoutExample — column grids, groups, and responsive form layouts.
 *
 * Doc:    docs/web-mojo/forms/BestPractices.md
 * Route:  forms/form-layout
 *
 * FormBuilder lays fields out on a 12-column Bootstrap grid. Three patterns
 * cover almost every form:
 *
 *   1. Column widths — `columns: 6` puts a field in a half-row; pair two
 *      `columns: 6` fields for the classic two-column row.
 *
 *   2. Responsive columns — `columns: { xs: 12, md: 6, lg: 4 }` lets a row
 *      reflow from one to two to three columns.
 *
 *   3. Groups — `{ type: 'group', title, columns, fields: [...] }` is a sub-grid
 *      inside the form. Use it to package related fields with a heading.
 *
 * No submit handler — the form is a static layout reference.
 */
class FormLayoutExample extends Page {
    static pageName = 'forms/form-layout';
    static route = 'forms/form-layout';

    constructor(options = {}) {
        super({
            ...options,
            pageName: FormLayoutExample.pageName,
            route: FormLayoutExample.route,
            title: 'Form layout',
            template: FormLayoutExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'layout-form',
            fields: [
                { type: 'header', text: '1. Two-column row (columns: 6)', level: 6 },
                { type: 'text', name: 'first_name', label: 'First name', columns: 6 },
                { type: 'text', name: 'last_name', label: 'Last name', columns: 6 },

                { type: 'divider' },
                { type: 'header', text: '2. Responsive 1 / 2 / 3 columns', level: 6 },
                { type: 'text', name: 'street', label: 'Street',
                    columns: { xs: 12, md: 12, lg: 6 } },
                { type: 'text', name: 'city', label: 'City',
                    columns: { xs: 12, md: 6, lg: 3 } },
                { type: 'text', name: 'state', label: 'State',
                    columns: { xs: 6, md: 3, lg: 2 } },
                { type: 'text', name: 'zip', label: 'ZIP',
                    columns: { xs: 6, md: 3, lg: 1 } },

                { type: 'divider' },
                { type: 'header', text: '3. Group with sub-grid', level: 6 },
                {
                    type: 'group',
                    title: 'Contact details',
                    columns: 12,
                    fields: [
                        { type: 'email', name: 'email', label: 'Email', columns: 6 },
                        { type: 'tel', name: 'phone', label: 'Phone', columns: 6 },
                        { type: 'select', name: 'preferred', label: 'Preferred contact', columns: 6,
                            options: [
                                { value: 'email', label: 'Email' },
                                { value: 'phone', label: 'Phone' },
                                { value: 'sms', label: 'SMS' },
                            ]},
                        { type: 'toggle', name: 'opt_in', label: 'Marketing opt-in', columns: 6 },
                    ],
                },

                { type: 'divider' },
                { type: 'header', text: '4. Side-by-side groups (columns: 6 each)', level: 6 },
                {
                    type: 'group',
                    title: 'Billing address',
                    columns: 6,
                    fields: [
                        { type: 'text', name: 'billing_street', label: 'Street' },
                        { type: 'text', name: 'billing_city', label: 'City' },
                    ],
                },
                {
                    type: 'group',
                    title: 'Shipping address',
                    columns: 6,
                    fields: [
                        { type: 'text', name: 'shipping_street', label: 'Street' },
                        { type: 'text', name: 'shipping_city', label: 'City' },
                    ],
                },
            ],
        });
        this.addChild(this.form);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Form layout</h1>
            <p class="example-summary">
                FormView ships a 12-column Bootstrap grid. Use <code>columns: N</code> for
                fixed widths, <code>columns: &#123; xs, md, lg &#125;</code> for responsive
                rows, and <code>type: 'group'</code> to package related fields with
                their own sub-grid.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/forms/BestPractices.md" target="_blank">
                    docs/web-mojo/forms/BestPractices.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <p class="text-muted small mb-3">
                        Resize the window — the address row in section 2 reflows from
                        one column on mobile, to two on tablet, to four on desktop.
                    </p>
                    <div data-container="layout-form"></div>
                </div>
            </div>
        </div>
    `;
}

export default FormLayoutExample;
