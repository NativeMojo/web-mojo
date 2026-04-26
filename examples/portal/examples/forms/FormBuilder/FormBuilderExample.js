import { Page, FormView } from 'web-mojo';

/**
 * FormBuilderExample — live JSON playground for the FormView/FormBuilder
 * fields config.
 *
 * Doc:    docs/web-mojo/forms/FormBuilder.md
 * Route:  forms/form-builder
 *
 * Three panes:
 *   1. JSON editor — a `<textarea>` holding the same `fields:` array that
 *      both `FormView` and `FormBuilder` accept. Edits dispatch
 *      `onActionEditConfig` per keystroke (debounced 250ms). Valid JSON
 *      calls `form.updateConfig({ fields: parsed })` and the live preview
 *      rebuilds. Invalid JSON shows an inline parse-error chip and leaves
 *      the previous form mounted so the user isn't punished for typing.
 *   2. Live preview — a real `FormView` mounted via `addChild()` +
 *      `containerId`. Submit/Reset buttons live OUTSIDE the form so the
 *      page controls validation and `getFormData()` directly.
 *   3. Submission output — `JSON.stringify(await form.getFormData(), …)`
 *      after a successful submit. Cleared by Reset.
 *
 * Presets are intentionally minimal (login, profile, survey, conditional).
 * Field types that need external state (e.g. `collection`, `combo` with a
 * Collection, `tabset`) are NOT used in the presets — they would render
 * empty in a standalone playground.
 */
class FormBuilderExample extends Page {
    static pageName = 'forms/form-builder';
    static route = 'forms/form-builder';

    // Column choices target the ~500px form area (col-lg-6 of a ~1000px page).
    // Single fields default to 12; only short paired inputs get columns: 6.
    // Date/time/range/color stay full-width — the native widgets need room
    // and look squashed at ≤ half-width.
    static PRESETS = {
        profile: [
            { type: 'text', name: 'first_name', label: 'First name', required: true, columns: 6 },
            { type: 'text', name: 'last_name', label: 'Last name', required: true, columns: 6 },
            { type: 'email', name: 'email', label: 'Email', required: true },
            { type: 'textarea', name: 'bio', label: 'Bio', rows: 3, placeholder: 'Tell us about yourself…' },
        ],
        login: [
            { type: 'text', name: 'username', label: 'Username', required: true },
            { type: 'password', name: 'password', label: 'Password', required: true },
            { type: 'toggle', name: 'remember', label: 'Remember me' },
        ],
        survey: [
            { type: 'header', text: 'Quick survey', level: 5 },
            { type: 'radio', name: 'role', label: 'Role', inline: true, options: [
                { value: 'dev', label: 'Developer' },
                { value: 'designer', label: 'Designer' },
                { value: 'pm', label: 'Product manager' },
            ]},
            { type: 'select', name: 'experience', label: 'Years of experience', options: [
                { value: '0-2', label: '0–2' },
                { value: '3-5', label: '3–5' },
                { value: '6+', label: '6+' },
            ]},
            { type: 'textarea', name: 'feedback', label: 'Feedback', rows: 3 },
        ],
        conditional: [
            { type: 'select', name: 'mode', label: 'Mode', options: [
                { value: 'simple', label: 'Simple' },
                { value: 'advanced', label: 'Advanced' },
            ]},
            { type: 'text', name: 'extra', label: 'Advanced option',
                help: 'Visible only when Mode = Advanced.',
                showWhen: { field: 'mode', value: 'advanced' } },
            { type: 'textarea', name: 'note', label: 'Note', rows: 2 },
        ],
        toggles: [
            { type: 'header', text: 'Toggles & checkboxes', level: 5 },
            { type: 'toggle', name: 'notifications', label: 'Notifications', columns: 6 },
            { type: 'toggle', name: 'dark_mode', label: 'Dark mode', columns: 6 },
            { type: 'checkbox', name: 'agree_terms', label: 'I agree to the terms', columns: 6 },
            { type: 'checkbox', name: 'subscribe', label: 'Send me product updates', columns: 6 },
            { type: 'buttongroup', name: 'view', label: 'Default view', options: [
                { value: 'grid', label: 'Grid' },
                { value: 'list', label: 'List' },
                { value: 'card', label: 'Card' },
            ]},
            { type: 'radio', name: 'plan', label: 'Plan', inline: true, options: [
                { value: 'free', label: 'Free' },
                { value: 'pro', label: 'Pro' },
                { value: 'team', label: 'Team' },
            ]},
        ],
        datetime: [
            { type: 'header', text: 'Date & time fields', level: 5 },
            { type: 'date', name: 'start_date', label: 'Start date', columns: 6 },
            { type: 'time', name: 'start_time', label: 'Start time', columns: 6 },
            { type: 'datetime', name: 'event_at', label: 'Event at' },
            { type: 'date', name: 'end_date', label: 'End date', columns: 6 },
            { type: 'select', name: 'timezone', label: 'Timezone', columns: 6, options: [
                { value: 'UTC', label: 'UTC' },
                { value: 'America/Los_Angeles', label: 'Los Angeles' },
                { value: 'America/New_York', label: 'New York' },
                { value: 'Europe/London', label: 'London' },
                { value: 'Asia/Tokyo', label: 'Tokyo' },
            ]},
            { type: 'textarea', name: 'agenda', label: 'Agenda', rows: 2 },
        ],
        selection: [
            { type: 'header', text: 'Multi-select & autocomplete', level: 5 },
            { type: 'multiselect', name: 'colors', label: 'Favorite colors', options: [
                { value: 'red', label: 'Red' },
                { value: 'orange', label: 'Orange' },
                { value: 'yellow', label: 'Yellow' },
                { value: 'green', label: 'Green' },
                { value: 'blue', label: 'Blue' },
                { value: 'purple', label: 'Purple' },
            ]},
            { type: 'checklistdropdown', name: 'languages', label: 'Languages spoken', options: [
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
                { value: 'de', label: 'German' },
                { value: 'ja', label: 'Japanese' },
            ]},
            { type: 'combo', name: 'flavor', label: 'Favorite flavor (type or pick)', options: [
                { value: 'vanilla', label: 'Vanilla' },
                { value: 'chocolate', label: 'Chocolate' },
                { value: 'strawberry', label: 'Strawberry' },
                { value: 'mint', label: 'Mint' },
            ]},
            { type: 'select', name: 'country', label: 'Country', options: [
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
                { value: 'UK', label: 'United Kingdom' },
                { value: 'JP', label: 'Japan' },
            ]},
        ],
        media: [
            { type: 'header', text: 'Files, color & range', level: 5 },
            { type: 'file', name: 'document', label: 'Attachment' },
            { type: 'image', name: 'avatar', label: 'Avatar' },
            { type: 'color', name: 'accent', label: 'Accent color', columns: 6 },
            { type: 'number', name: 'quantity', label: 'Quantity', min: 0, max: 999, step: 1, columns: 6 },
            { type: 'range', name: 'volume', label: 'Volume', min: 0, max: 100, step: 5 },
            { type: 'hex', name: 'token', label: 'Hex token', hexType: 'string', minLength: 8 },
            { type: 'url', name: 'website', label: 'Website', placeholder: 'https://example.com' },
        ],
        kitchenSink: [
            { type: 'header', text: 'A bit of everything', level: 5 },
            { type: 'text', name: 'name', label: 'Name', required: true, columns: 6 },
            { type: 'email', name: 'email', label: 'Email', required: true, columns: 6 },
            { type: 'select', name: 'tier', label: 'Tier', columns: 6, options: [
                { value: 'free', label: 'Free' },
                { value: 'pro', label: 'Pro' },
                { value: 'team', label: 'Team' },
            ]},
            { type: 'date', name: 'starts_on', label: 'Starts on', columns: 6 },
            { type: 'multiselect', name: 'addons', label: 'Add-ons', options: [
                { value: 'sso', label: 'SSO' },
                { value: 'audit', label: 'Audit log' },
                { value: 'sla', label: 'Priority support' },
            ]},
            { type: 'range', name: 'seats', label: 'Seats', min: 1, max: 50, step: 1, columns: 6 },
            { type: 'color', name: 'brand', label: 'Brand color', columns: 6 },
            { type: 'toggle', name: 'auto_renew', label: 'Auto-renew', columns: 6 },
            { type: 'checkbox', name: 'tos', label: 'I accept the Terms of Service', columns: 6 },
            { type: 'textarea', name: 'notes', label: 'Notes', rows: 2 },
        ],
    };

    constructor(options = {}) {
        super({
            ...options,
            pageName: FormBuilderExample.pageName,
            route: FormBuilderExample.route,
            title: 'FormBuilder — live JSON playground',
            template: FormBuilderExample.TEMPLATE,
        });
        this.currentPresetKey = 'profile';
        this.configJson = JSON.stringify(FormBuilderExample.PRESETS.profile, null, 2);
        this.parseError = null;
        this.lastSubmission = null;
    }

    async onInit() {
        await super.onInit();
        this.form = new FormView({
            containerId: 'preview-form',
            fields: FormBuilderExample.PRESETS[this.currentPresetKey],
        });
        this.addChild(this.form);
    }

    async onActionEditConfig(_event, element) {
        const text = element.value;
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            this.parseError = err.message;
            this._writeParseStatus();
            return;
        }
        if (!Array.isArray(parsed)) {
            this.parseError = 'Config must be a JSON array of field objects.';
            this._writeParseStatus();
            return;
        }
        this.parseError = null;
        this.configJson = text;
        this._writeParseStatus();
        await this.form.updateConfig({ fields: parsed });
    }

    // Handlers update the DOM directly instead of calling this.render(). A full
    // page render would re-emit the textarea (losing focus/cursor) and the
    // <select> (losing the user's just-picked option). Surgical DOM updates
    // keep the editor pane stable while the form preview rebuilds.
    async onActionLoadPreset(_event, element) {
        const key = element.value;
        if (!FormBuilderExample.PRESETS[key]) return;
        this.currentPresetKey = key;
        this.configJson = JSON.stringify(FormBuilderExample.PRESETS[key], null, 2);
        this.parseError = null;
        this.lastSubmission = null;
        const ta = this.element?.querySelector('textarea[data-action="edit-config"]');
        if (ta) ta.value = this.configJson;
        this._writeParseStatus();
        this._writeSubmission();
        await this.form.updateConfig({ fields: FormBuilderExample.PRESETS[key] });
    }

    async onActionSubmitPreview(event) {
        event.preventDefault();
        if (!this.form.validate()) {
            this.form.focusFirstError();
            return;
        }
        const data = await this.form.getFormData();
        this.lastSubmission = JSON.stringify(data, null, 2);
        this._writeSubmission();
    }

    async onActionResetPreview(event) {
        event.preventDefault();
        this.form.reset();
        this.lastSubmission = null;
        this._writeSubmission();
    }

    _writeParseStatus() {
        const region = this.element?.querySelector('[data-region="parse-status"]');
        if (!region) return;
        if (this.parseError) {
            region.innerHTML = `<span class="badge text-bg-danger"><i class="bi bi-exclamation-triangle"></i> Invalid JSON</span> <small class="text-muted">${this._escape(this.parseError)}</small>`;
        } else {
            region.innerHTML = `<span class="badge text-bg-success"><i class="bi bi-check-circle"></i> Live</span>`;
        }
    }

    _writeSubmission() {
        const region = this.element?.querySelector('[data-region="submission"]');
        if (!region) return;
        if (this.lastSubmission) {
            region.innerHTML = `<pre class="mb-0 small"><code>${this._escape(this.lastSubmission)}</code></pre>`;
        } else {
            region.innerHTML = `<p class="text-muted small mb-0">Submit the form above to see the JSON payload here.</p>`;
        }
    }

    _escape(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        }[c]));
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>FormBuilder — live JSON playground</h1>
            <p class="example-summary">
                Edit the <code>fields:</code> JSON on the left, watch a real
                <code>FormView</code> rebuild on the right. Same syntax
                <a href="?page=forms/form-view"><code>FormView</code></a>
                and
                <a href="?page=forms/form-view/all-field-types">every field type</a>
                accept — the playground just feeds your JSON straight into
                <code>FormView.updateConfig({ fields })</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/FormBuilder.md">
                    docs/web-mojo/forms/FormBuilder.md
                </a>
            </p>

            <div class="row g-3">
                <div class="col-lg-6">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <strong>Config</strong>
                            <select class="form-select form-select-sm w-auto" data-change-action="load-preset">
                                <option value="profile">Profile</option>
                                <option value="login">Login</option>
                                <option value="survey">Survey</option>
                                <option value="conditional">Conditional fields</option>
                                <option value="toggles">Toggles &amp; checkboxes</option>
                                <option value="datetime">Date &amp; time</option>
                                <option value="selection">Multi-select &amp; combos</option>
                                <option value="media">Files, color &amp; range</option>
                                <option value="kitchenSink">Kitchen sink</option>
                            </select>
                        </div>
                        <div class="card-body d-flex flex-column">
                            <textarea
                                class="form-control font-monospace flex-grow-1"
                                style="min-height: 28rem; font-size: 0.85rem;"
                                spellcheck="false"
                                data-action="edit-config"
                                data-action-debounce="250">{{configJson}}</textarea>
                            <div class="mt-2 small" data-region="parse-status">
                                {{#parseError|bool}}
                                    <span class="badge text-bg-danger">
                                        <i class="bi bi-exclamation-triangle"></i> Invalid JSON
                                    </span>
                                    <small class="text-muted">{{parseError}}</small>
                                {{/parseError|bool}}
                                {{^parseError|bool}}
                                    <span class="badge text-bg-success">
                                        <i class="bi bi-check-circle"></i> Live
                                    </span>
                                {{/parseError|bool}}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-6">
                    <div class="card h-100">
                        <div class="card-header"><strong>Live preview</strong></div>
                        <div class="card-body">
                            <div data-container="preview-form"></div>
                            <div class="d-flex gap-2 mt-3">
                                <button type="button" class="btn btn-primary btn-sm" data-action="submit-preview">
                                    <i class="bi bi-send"></i> Submit
                                </button>
                                <button type="button" class="btn btn-outline-secondary btn-sm" data-action="reset-preview">
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12">
                    <div class="card">
                        <div class="card-header"><strong>Submission</strong> <small class="text-muted">— output of <code>await form.getFormData()</code></small></div>
                        <div class="card-body" data-region="submission">
                            <p class="text-muted small mb-0">
                                Submit the form above to see the JSON payload here.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default FormBuilderExample;
