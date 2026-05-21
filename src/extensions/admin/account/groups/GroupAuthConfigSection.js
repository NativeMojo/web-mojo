/**
 * GroupAuthConfigSection - Form-based editor for a Group's `metadata.auth_config`.
 *
 * `auth_config` is the per-group structured config that drives the
 * django-mojo–hosted login, registration, and passkey pages. It is resolved
 * server-side as: code defaults <- the deployment `AUTH_CONFIG` setting <-
 * `group.metadata.auth_config`, deep-merged down the parent chain.
 *
 * This section edits the group's own override only. It embeds a single
 * `FormView` with a 3-tab `tabset` (Theme / Login / Registration) plus a Save
 * button. On Save it checks the cross-field rules the server enforces, then
 * writes the changed keys via `model.save({ metadata: { auth_config: {...} } })`.
 * django deep-merges the `metadata` JSONField, so sibling keys survive and
 * untouched fields keep inheriting.
 *
 * Save is explicit (not autosave) because the server applies cross-field
 * validation — `registration.fields` must include email or phone, and
 * `login.methods` must be non-empty — so a mid-edit state is routinely
 * invalid and would fail a per-keystroke save.
 *
 * Load:  each field shows the group's own override value if present, else the
 *        resolved/inherited value (fetched from `GET /api/auth/config`). Text
 *        fields additionally show the resolved value as placeholder text.
 * Save:  sends only fields changed from the loaded baseline, so untouched
 *        fields keep inheriting.
 */
import View from '@core/View.js';
import FormView from '@core/forms/FormView.js';

// ── Allowed tokens (must match django-mojo auth_config schema) ─────────────

const LOGIN_METHOD_OPTS = [
    { value: 'password', label: 'Password' },
    { value: 'sms',      label: 'SMS code' },
    { value: 'passkey',  label: 'Passkey' },
    { value: 'magic',    label: 'Magic link' },
    { value: 'google',   label: 'Google' },
    { value: 'apple',    label: 'Apple' }
];

const REGISTRATION_METHOD_OPTS = [
    { value: 'password', label: 'Password' },
    { value: 'google',   label: 'Google' },
    { value: 'apple',    label: 'Apple' }
];

const LAYOUT_OPTS = [
    { value: 'card',       label: 'Card' },
    { value: 'fullscreen', label: 'Full screen' }
];

const PASSKEY_PROMPT_OPTS = [
    { value: 'off',      label: 'Off' },
    { value: 'optional', label: 'Optional' },
    { value: 'required', label: 'Required' }
];

const IDENTITY_FIELD_OPTS = [
    { value: '',      label: 'Auto (email, then phone)' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' }
];

const VERIFY_OPTS = [
    { value: '',      label: 'None' },
    { value: 'email', label: 'Email' },
    { value: 'sms',   label: 'SMS' }
];

// Canonical registration-form fields (closed set — register_schema.CANONICAL_FIELDS).
const CANONICAL_REG_FIELDS = [
    { name: 'first_name', label: 'First name' },
    { name: 'last_name',  label: 'Last name' },
    { name: 'email',      label: 'Email' },
    { name: 'phone',      label: 'Phone' },
    { name: 'dob',        label: 'Date of birth' },
    { name: 'password',   label: 'Password' }
];

// register_schema.DEFAULT_FIELDS — used to seed the grid when neither the
// group's own override nor the resolved config specify `registration.fields`.
const DEFAULT_REG_FIELDS = [
    { name: 'first_name', required: false, verify: null },
    { name: 'last_name',  required: false, verify: null },
    { name: 'email',      required: true,  verify: 'email' },
    { name: 'password',   required: true,  verify: null }
];

// django-mojo DEFAULT_AUTH_CONFIG — fallback when the resolved-config fetch
// fails so the editor still shows sensible inherited values.
const STATIC_DEFAULTS = {
    theme: {
        app_title: 'DJANGO MOJO', logo_url: '', favicon_url: '', hero_image_url: '',
        hero_headline: 'Welcome back', hero_subheadline: 'Admin Portal',
        back_to_website_url: '', terms_url: '', layout: 'card', api_base: '',
        success_redirect: '/', custom_css: '', custom_css_url: ''
    },
    registration: {
        enabled: true, fields: null, identity_field: '', min_age: null,
        methods: ['password', 'google', 'apple'], passkey_prompt: 'off'
    },
    login: { methods: ['password', 'sms', 'passkey', 'magic', 'google', 'apple'] }
};

// Theme text fields: form name + dotted path under `auth_config` + help copy.
const THEME_TEXT_FIELDS = [
    { name: 'app_title',           path: 'theme.app_title',           label: 'App title',           help: 'Brand name shown in the login card header.' },
    { name: 'logo_url',            path: 'theme.logo_url',            label: 'Logo URL',            help: 'Logo image URL — appears in the header and hero panel.' },
    { name: 'favicon_url',         path: 'theme.favicon_url',         label: 'Favicon URL',         help: 'Favicon URL for the auth pages.' },
    { name: 'hero_image_url',      path: 'theme.hero_image_url',      label: 'Hero image URL',      help: 'Background image for the left hero panel.' },
    { name: 'hero_headline',       path: 'theme.hero_headline',       label: 'Hero headline',       help: 'Headline text shown over the hero image.' },
    { name: 'hero_subheadline',    path: 'theme.hero_subheadline',    label: 'Hero subheadline',    help: 'Supporting text below the hero headline.' },
    { name: 'back_to_website_url', path: 'theme.back_to_website_url', label: 'Back-to-website URL', help: '"Back to website" link shown in the hero panel.' },
    { name: 'terms_url',           path: 'theme.terms_url',           label: 'Terms URL',           help: 'Terms & Conditions link shown on the register page.' },
    { name: 'api_base',            path: 'theme.api_base',            label: 'API base',            help: 'API host for the auth pages — leave blank for same origin.' },
    { name: 'success_redirect',    path: 'theme.success_redirect',    label: 'Success redirect',    help: 'Where to send the user after a successful login.' },
    { name: 'custom_css_url',      path: 'theme.custom_css_url',      label: 'Custom CSS URL',      help: 'URL to an external stylesheet — must start with https://.' }
];

// FIELD_DESCRIPTORS — every non-grid form field, its dotted path under
// `auth_config`, and a kind that drives baseline/diff/serialisation.
//   text   — placeholder-capable; baseline = own override only.
//   select — baseline = own override, else resolved (no placeholder).
//   array  — multiselect; baseline = own override, else resolved.
//   bool   — toggle;      baseline = own override, else resolved.
//   int    — placeholder-capable number; baseline = own override only.
const FIELD_DESCRIPTORS = [
    ...THEME_TEXT_FIELDS.map(f => ({ form: f.name, path: f.path, kind: 'text' })),
    { form: 'custom_css',         path: 'theme.custom_css',              kind: 'text' },
    { form: 'layout',             path: 'theme.layout',                  kind: 'select' },
    { form: 'login_methods',      path: 'login.methods',                 kind: 'array' },
    { form: 'reg_enabled',        path: 'registration.enabled',          kind: 'bool' },
    { form: 'reg_passkey_prompt', path: 'registration.passkey_prompt',   kind: 'select' },
    { form: 'reg_identity_field', path: 'registration.identity_field',   kind: 'select' },
    { form: 'reg_min_age',        path: 'registration.min_age',          kind: 'int' },
    { form: 'reg_methods',        path: 'registration.methods',          kind: 'array' }
];

// ── Path helpers ───────────────────────────────────────────────────────────

function getPath(obj, path) {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce(
        (o, k) => (o && typeof o === 'object') ? o[k] : undefined,
        obj
    );
}

function setPath(obj, path, value) {
    const keys = path.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
        cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
}

function sameSet(a, b) {
    const sa = [...(a || [])].map(String).sort();
    const sb = [...(b || [])].map(String).sort();
    return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}


// ── Section ────────────────────────────────────────────────────────────────

export default class GroupAuthConfigSection extends View {
    constructor(options = {}) {
        super({
            className: 'group-auth-config-section',
            template: `
                <div class="detail-section-eyebrow">Auth Config</div>
                <p class="text-secondary small mb-3">
                    Branding and sign-in behavior for this group's hosted login, registration,
                    and passkey pages. Empty fields inherit the deployment defaults
                    (shown as placeholders).
                </p>
                <div data-container="auth-config-form"></div>
                <div class="d-flex align-items-center justify-content-end gap-3 mt-3 pt-3 border-top">
                    <span class="gac-status small text-secondary"></span>
                    <button type="button" class="btn btn-primary btn-sm" data-action="save-auth-config">
                        <i class="bi bi-check-lg me-1"></i>Save Auth Config
                    </button>
                </div>
            `,
            ...options
        });

        this._resolved = STATIC_DEFAULTS;
        this._baseline = {};
        this._placeholders = {};
    }

    async onInit() {
        const own = this.model?.get?.('metadata')?.auth_config || {};
        this._resolved = await this._fetchResolved();
        this._baseline = this._buildBaseline(own, this._resolved);
        this._placeholders = this._buildPlaceholders(this._resolved);
        this.addChild(this._buildFormView());
    }

    /** Construct the embedded FormView from the current baseline. */
    _buildFormView() {
        this.formView = new FormView({
            containerId: 'auth-config-form',
            fields: this._buildFields(),
            data: { ...this._baseline }
        });
        return this.formView;
    }

    /**
     * The embedded FormView owns its state. A model `change` — fired by this
     * section's own save, or by an edit in another GroupView section — must not
     * re-render this section: that would rebuild the form from stale seed data
     * and wipe the user's input. Mirrors DetailView's own _onModelChange guard.
     */
    _onModelChange() {
        // intentionally a no-op
    }

    // ── Data load ──────────────────────────────────────────

    /** Fetch the resolved (inherited) auth config for placeholder display. */
    async _fetchResolved() {
        const app = this.getApp();
        const uuid = this.model?.get?.('uuid');
        if (!app?.rest || !uuid) return STATIC_DEFAULTS;
        try {
            const resp = await app.rest.GET('/api/auth/config', { group_uuid: uuid });
            if (resp && resp.success !== false) {
                const cfg = resp.data?.data || resp.data;
                if (cfg && typeof cfg === 'object') return cfg;
            }
        } catch (e) {
            // Degrade gracefully — fall back to documented defaults.
        }
        return STATIC_DEFAULTS;
    }

    /**
     * Build the flat form baseline. Placeholder-capable fields (text / int)
     * show the group's own override only (blank when unset, so the placeholder
     * shows through). Other fields show own override else resolved value.
     */
    _buildBaseline(own, resolved) {
        const base = {};
        for (const d of FIELD_DESCRIPTORS) {
            const ownVal = getPath(own, d.path);
            const resVal = getPath(resolved, d.path);
            if (d.kind === 'text') {
                base[d.form] = (ownVal === undefined || ownVal === null) ? '' : String(ownVal);
            } else if (d.kind === 'int') {
                base[d.form] = (ownVal === undefined || ownVal === null || ownVal === '') ? '' : ownVal;
            } else if (d.kind === 'array') {
                const v = (ownVal !== undefined && ownVal !== null) ? ownVal : resVal;
                base[d.form] = Array.isArray(v) ? [...v] : [];
            } else if (d.kind === 'bool') {
                const v = (ownVal !== undefined && ownVal !== null) ? ownVal : resVal;
                base[d.form] = !!v;
            } else { // select
                const v = (ownVal !== undefined && ownVal !== null) ? ownVal : resVal;
                base[d.form] = (v === undefined || v === null) ? '' : String(v);
            }
        }
        const ownFields = getPath(own, 'registration.fields');
        const resFields = getPath(resolved, 'registration.fields');
        const fieldsArr = Array.isArray(ownFields) ? ownFields
            : (Array.isArray(resFields) ? resFields : DEFAULT_REG_FIELDS);
        Object.assign(base, this._gridValuesFromArray(fieldsArr));
        return base;
    }

    /** Placeholder text (resolved values) for the placeholder-capable fields. */
    _buildPlaceholders(resolved) {
        const ph = {};
        for (const d of FIELD_DESCRIPTORS) {
            if (d.kind !== 'text' && d.kind !== 'int') continue;
            const v = getPath(resolved, d.path);
            ph[d.form] = (v === undefined || v === null) ? '' : String(v);
        }
        return ph;
    }

    /** Expand a `registration.fields` array into flat grid form values. */
    _gridValuesFromArray(arr) {
        const byName = {};
        (arr || []).forEach(f => { if (f && f.name) byName[f.name] = f; });
        const out = {};
        for (const cf of CANONICAL_REG_FIELDS) {
            const entry = byName[cf.name];
            const isPassword = cf.name === 'password';
            out[`regf_${cf.name}_inc`] = !!entry;
            // Password is always required when present; its toggle is locked on.
            out[`regf_${cf.name}_req`] = isPassword ? true : !!(entry && entry.required);
            out[`regf_${cf.name}_vfy`] = (entry && entry.verify) ? String(entry.verify) : '';
        }
        return out;
    }

    // ── Form field config ──────────────────────────────────

    _buildFields() {
        return [{ type: 'tabset', tabs: [
            { label: 'Theme',        fields: this._themeFields() },
            { label: 'Login',        fields: this._loginFields() },
            { label: 'Registration', fields: this._registrationFields() }
        ] }];
    }

    _themeFields() {
        const fields = THEME_TEXT_FIELDS.map(f => ({
            name: f.name,
            type: 'text',
            label: f.label,
            help: f.help,
            placeholder: this._placeholders[f.name] || '',
            columns: 6
        }));
        fields.push({
            name: 'layout',
            type: 'select',
            label: 'Layout',
            help: 'Card = centered card; Full screen = edge-to-edge split layout.',
            options: LAYOUT_OPTS,
            columns: 6
        });
        fields.push({
            name: 'custom_css',
            type: 'textarea',
            label: 'Custom CSS',
            help: "Inline CSS injected after the theme stylesheet. Must not contain '<', '@import', or external URLs.",
            placeholder: this._placeholders.custom_css || '',
            rows: 5,
            columns: 12
        });
        return fields;
    }

    _loginFields() {
        return [{
            name: 'login_methods',
            type: 'multiselect',
            label: 'Login methods',
            help: 'Login methods offered on the sign-in page. At least one is required.',
            options: LOGIN_METHOD_OPTS,
            value: this._baseline.login_methods || [],
            selectAll: true,
            clearAll: true,
            columns: 12
        }];
    }

    _registrationFields() {
        const fields = [
            {
                name: 'reg_enabled',
                type: 'toggle',
                label: 'Registration enabled',
                help: 'When off, the registration page is hidden.',
                columns: 12
            },
            {
                name: 'reg_passkey_prompt',
                type: 'select',
                label: 'Passkey prompt',
                help: 'Whether to prompt for passkey enrollment right after signup.',
                options: PASSKEY_PROMPT_OPTS,
                columns: 6
            },
            {
                name: 'reg_identity_field',
                type: 'select',
                label: 'Identity field',
                help: 'Primary identity collected at signup.',
                options: IDENTITY_FIELD_OPTS,
                columns: 6
            },
            {
                name: 'reg_min_age',
                type: 'number',
                label: 'Minimum age',
                help: "Minimum age (years) — enforced when 'Date of birth' is a registration field.",
                placeholder: this._placeholders.reg_min_age || '',
                min: 0,
                columns: 6
            },
            {
                name: 'reg_methods',
                type: 'multiselect',
                label: 'Signup methods',
                help: 'Signup methods offered on the registration page.',
                options: REGISTRATION_METHOD_OPTS,
                value: this._baseline.reg_methods || [],
                selectAll: true,
                clearAll: true,
                columns: 12
            },
            {
                type: 'header',
                text: 'Registration form fields',
                level: 6,
                class: 'mt-3'
            },
            {
                type: 'html',
                html: `<p class="text-secondary small mb-2">Choose which fields the signup form collects. The schema must include email or phone. Password, when included, is always required — omit it only for passwordless (SMS) registration.</p>`
            }
        ];
        for (const cf of CANONICAL_REG_FIELDS) {
            const isPassword = cf.name === 'password';
            fields.push({
                type: 'group',
                title: cf.label,
                columns: 12,
                fields: [
                    {
                        name: `regf_${cf.name}_inc`,
                        type: 'toggle',
                        label: 'Include',
                        columns: 4
                    },
                    {
                        name: `regf_${cf.name}_req`,
                        type: 'toggle',
                        label: 'Required',
                        // Password, when included, is always required — there is
                        // no optional-password state, so the toggle is locked on.
                        disabled: isPassword,
                        columns: 4
                    },
                    {
                        name: `regf_${cf.name}_vfy`,
                        type: 'select',
                        label: 'Verify',
                        options: VERIFY_OPTS,
                        disabled: isPassword,
                        columns: 4
                    }
                ]
            });
        }
        return fields;
    }

    // ── Save ───────────────────────────────────────────────

    async onActionSaveAuthConfig() {
        const fv = this.formView;
        const app = this.getApp();
        if (!fv) return true;

        // HTML5 field validation — also switches to the tab with the first error.
        if (typeof fv.validate === 'function' && !fv.validate()) {
            fv.focusFirstError?.();
            return true;
        }

        const fd = await fv.getFormData();

        // Cross-field rules the server enforces — checked up front so the admin
        // gets a clear inline message instead of a raw 400.
        const loginMethods = Array.isArray(fd.login_methods) ? fd.login_methods : [];
        if (loginMethods.length === 0) {
            this._fail('Select at least one login method.');
            return true;
        }
        const regFields = this._assembleRegFields(fd);
        if (!regFields.some(f => f.name === 'email' || f.name === 'phone')) {
            this._fail("Registration fields must include 'Email' or 'Phone'.");
            return true;
        }

        const payload = this._diffPayload(fd);
        if (!payload) {
            this._setStatus('No changes to save.');
            return true;
        }

        this._setStatus('Saving…');
        app?.showLoading?.();
        let resp;
        try {
            resp = await this.model.save({ metadata: { auth_config: payload } });
        } catch (e) {
            resp = null;
        } finally {
            app?.hideLoading?.();
        }

        if (resp && resp.status === 200) {
            // Re-baseline from the saved state and rebuild the form. FormView
            // freezes its seed data at construction, so without rebuilding it a
            // later section switch would re-render with the pre-save values.
            this._baseline = { ...fd };
            this.removeChild(this.formView);
            this.addChild(this._buildFormView());
            await this.formView.render();
            this._setStatus('All changes saved.', 'success');
            app?.toast?.success('Auth config saved');
        } else {
            this._fail(resp?.message || resp?.data?.error || 'Failed to save auth config');
        }
        return true;
    }

    /** Show a failure message inline and as a toast. */
    _fail(msg) {
        this._setStatus(msg, 'danger');
        this.getApp()?.toast?.error(msg);
    }

    /** Update the inline save-status text in the footer. */
    _setStatus(text, tone) {
        const el = this.element?.querySelector('.gac-status');
        if (!el) return;
        el.textContent = text || '';
        el.className = 'gac-status small '
            + (tone === 'danger' ? 'text-danger'
                : tone === 'success' ? 'text-success'
                : 'text-secondary');
    }

    // ── Diff / serialisation ───────────────────────────────

    /**
     * Build the nested `auth_config` payload of fields changed from the
     * baseline. Returns null when nothing changed.
     */
    _diffPayload(fd) {
        const payload = {};
        let changed = false;

        for (const d of FIELD_DESCRIPTORS) {
            const cur = fd[d.form];
            const base = this._baseline[d.form];
            if (this._isDifferent(cur, base, d.kind)) {
                setPath(payload, d.path, this._normalizeForSave(cur, d.kind));
                changed = true;
            }
        }

        const curFields = this._assembleRegFields(fd);
        const baseFields = this._assembleRegFields(this._baseline);
        if (JSON.stringify(curFields) !== JSON.stringify(baseFields)) {
            setPath(payload, 'registration.fields', curFields);
            changed = true;
        }

        return changed ? payload : null;
    }

    _isDifferent(cur, base, kind) {
        if (kind === 'array') return !sameSet(cur, base);
        if (kind === 'bool')  return !!cur !== !!base;
        if (kind === 'int') {
            const a = (cur === '' || cur === null || cur === undefined) ? null : Number(cur);
            const b = (base === '' || base === null || base === undefined) ? null : Number(base);
            return a !== b;
        }
        // text / select
        const a = (cur === null || cur === undefined) ? '' : String(cur).trim();
        const b = (base === null || base === undefined) ? '' : String(base).trim();
        return a !== b;
    }

    _normalizeForSave(cur, kind) {
        if (kind === 'array') return [...(cur || [])];
        if (kind === 'bool')  return !!cur;
        if (kind === 'int')   return (cur === '' || cur === null || cur === undefined) ? null : Number(cur);
        return (cur === null || cur === undefined) ? '' : String(cur);
    }

    /** Collapse the grid form values into a canonical `registration.fields` array. */
    _assembleRegFields(fd) {
        const arr = [];
        for (const cf of CANONICAL_REG_FIELDS) {
            if (!fd[`regf_${cf.name}_inc`]) continue;
            if (cf.name === 'password') {
                // Password, when included, is always required and has no verify.
                arr.push({ name: 'password', required: true, verify: null });
                continue;
            }
            arr.push({
                name: cf.name,
                required: !!fd[`regf_${cf.name}_req`],
                verify: fd[`regf_${cf.name}_vfy`] || null
            });
        }
        return arr;
    }
}
