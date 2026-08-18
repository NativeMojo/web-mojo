/**
 * GroupAuthConfigSection - honest, inheritance-aware editor for
 * `Group.metadata.auth_config`.
 *
 * The public auth endpoint is used only for the deployment default. Group
 * inheritance is reconstructed from raw Group REST rows by parent id so an
 * inactive or UUID-less ancestor remains part of the chain. Every editable
 * leaf names its source, and Reset queues a leaf-level null deletion for the
 * next explicit save.
 */
import View from '@core/View.js';
import FormView from '@core/forms/FormView.js';
import { Group } from '@core/models/Group.js';

const LOGIN_METHOD_OPTS = [
    { value: 'password', label: 'Password' },
    { value: 'sms', label: 'SMS code' },
    { value: 'passkey', label: 'Passkey' },
    { value: 'magic', label: 'Magic link' },
    { value: 'google', label: 'Google' },
    { value: 'apple', label: 'Apple' },
    { value: 'github', label: 'GitHub' }
];

const REGISTRATION_METHOD_OPTS = [
    { value: 'password', label: 'Password' },
    { value: 'google', label: 'Google' },
    { value: 'apple', label: 'Apple' },
    { value: 'github', label: 'GitHub' }
];

const LAYOUT_OPTS = [
    { value: 'minimal', label: 'Minimal' },
    { value: 'compact', label: 'Compact' },
    { value: 'branded-panel', label: 'Branded panel' },
    { value: 'editorial', label: 'Editorial' },
    { value: 'card', label: 'Card (legacy alias)' },
    { value: 'fullscreen', label: 'Full screen (legacy alias)' }
];

const APPEARANCE_OPTS = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Follow system' }
];

const HERO_POSITION_OPTS = ['center', 'top', 'bottom', 'left', 'right']
    .map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }));

const PASSKEY_PROMPT_OPTS = [
    { value: 'off', label: 'Off' },
    { value: 'optional', label: 'Optional' },
    { value: 'required', label: 'Required' }
];

const IDENTITY_FIELD_OPTS = [
    { value: '', label: 'Auto (email, then phone)' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' }
];

const VERIFY_OPTS = [
    { value: '', label: 'None' },
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS' }
];

const CANONICAL_REG_FIELDS = [
    { name: 'first_name', label: 'First name' },
    { name: 'last_name', label: 'Last name' },
    { name: 'email', label: 'Email' },
    { name: 'phone', label: 'Phone' },
    { name: 'dob', label: 'Date of birth' },
    { name: 'password', label: 'Password' }
];
const CANONICAL_REG_NAMES = new Set(CANONICAL_REG_FIELDS.map(field => field.name));
const EXTRA_FIELD_NAME_RE = /^[A-Za-z][A-Za-z0-9_]*$/;
const ACCENT_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_ANCESTOR_DEPTH = 50;

const DEFAULT_REG_FIELDS = [
    { name: 'first_name', required: false, verify: null },
    { name: 'last_name', required: false, verify: null },
    { name: 'email', required: true, verify: 'email' },
    { name: 'password', required: true, verify: null }
];

const STATIC_DEFAULTS = {
    theme: {
        app_title: 'DJANGO MOJO',
        auth_provider_name: 'DJANGO MOJO',
        logo_url: '',
        favicon_url: '',
        hero_image_url: '',
        hero_image_url_light: '',
        hero_image_url_dark: '',
        hero_headline: 'Welcome back',
        hero_subheadline: 'Admin Portal',
        hero_image_position: 'center',
        back_to_website_url: '',
        back_to_website_label: 'Back to website',
        terms_url: '',
        layout: 'minimal',
        appearance: 'system',
        accent_color: '#6384ff',
        api_base: '',
        success_redirect: '/',
        custom_css: '',
        custom_css_url: ''
    },
    registration: {
        enabled: true,
        fields: null,
        extra_fields: [],
        identity_field: '',
        min_age: null,
        methods: ['password', 'google', 'apple', 'github'],
        passkey_prompt: 'off'
    },
    login: {
        methods: ['password', 'sms', 'passkey', 'magic', 'google', 'apple', 'github'],
        heading: 'Sign In',
        supporting_copy: ''
    }
};

const THEME_FIELDS = [
    { form: 'app_title', path: 'theme.app_title', kind: 'text', label: 'App title', help: 'Brand name shown on hosted auth pages.' },
    { form: 'auth_provider_name', path: 'theme.auth_provider_name', kind: 'text', label: 'Auth provider name', help: 'Provider name used in destination and consent copy.' },
    { form: 'logo_url', path: 'theme.logo_url', kind: 'text', label: 'Logo URL', help: 'Logo displayed in the auth header and branded layouts.' },
    { form: 'favicon_url', path: 'theme.favicon_url', kind: 'text', label: 'Favicon URL', help: 'Favicon used by hosted auth pages.' },
    { form: 'hero_image_url', path: 'theme.hero_image_url', kind: 'text', label: 'Hero image URL', help: 'Default hero image.' },
    { form: 'hero_image_url_light', path: 'theme.hero_image_url_light', kind: 'text', label: 'Light hero image URL', help: 'Optional hero image for light appearance.' },
    { form: 'hero_image_url_dark', path: 'theme.hero_image_url_dark', kind: 'text', label: 'Dark hero image URL', help: 'Optional hero image for dark appearance.' },
    { form: 'hero_headline', path: 'theme.hero_headline', kind: 'text', label: 'Hero headline', help: 'Headline shown over or alongside the hero image.' },
    { form: 'hero_subheadline', path: 'theme.hero_subheadline', kind: 'text', label: 'Hero subheadline', help: 'Supporting hero copy.' },
    { form: 'hero_image_position', path: 'theme.hero_image_position', kind: 'select', label: 'Hero image position', options: HERO_POSITION_OPTS },
    { form: 'back_to_website_url', path: 'theme.back_to_website_url', kind: 'text', label: 'Back-to-website URL', help: 'Relative or absolute HTTP(S) destination.' },
    { form: 'back_to_website_label', path: 'theme.back_to_website_label', kind: 'text', label: 'Back-to-website label', help: 'Nonblank link text.' },
    { form: 'terms_url', path: 'theme.terms_url', kind: 'text', label: 'Terms URL', help: 'Terms link shown during registration.' },
    { form: 'layout', path: 'theme.layout', kind: 'select', label: 'Layout', options: LAYOUT_OPTS },
    { form: 'appearance', path: 'theme.appearance', kind: 'select', label: 'Appearance', options: APPEARANCE_OPTS },
    { form: 'accent_color', path: 'theme.accent_color', kind: 'text', label: 'Accent color', help: 'Six-digit hex color such as #6384ff.' },
    { form: 'api_base', path: 'theme.api_base', kind: 'text', label: 'API base', help: 'API host for auth pages; blank means same origin.' },
    { form: 'success_redirect', path: 'theme.success_redirect', kind: 'text', label: 'Success redirect', help: 'Destination after successful login.' },
    { form: 'custom_css', path: 'theme.custom_css', kind: 'textarea', label: 'Custom CSS', help: "Inline CSS cannot contain '<', @import, or external URLs." },
    { form: 'custom_css_url', path: 'theme.custom_css_url', kind: 'text', label: 'External CSS URL', help: 'Must be an https:// URL.' }
];

const FIELD_DESCRIPTORS = [
    ...THEME_FIELDS,
    { form: 'login_methods', path: 'login.methods', kind: 'array' },
    { form: 'login_heading', path: 'login.heading', kind: 'text' },
    { form: 'login_supporting_copy', path: 'login.supporting_copy', kind: 'textarea' },
    { form: 'reg_enabled', path: 'registration.enabled', kind: 'bool' },
    { form: 'reg_passkey_prompt', path: 'registration.passkey_prompt', kind: 'select' },
    { form: 'reg_identity_field', path: 'registration.identity_field', kind: 'select' },
    { form: 'reg_min_age', path: 'registration.min_age', kind: 'int' },
    { form: 'reg_methods', path: 'registration.methods', kind: 'array' }
];

const SPECIAL_PATHS = ['registration.fields', 'registration.extra_fields'];
const TRACKED_PATHS = [...FIELD_DESCRIPTORS.map(field => field.path), ...SPECIAL_PATHS];

function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
}

function getPath(obj, path) {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce(
        (current, key) => (current && typeof current === 'object') ? current[key] : undefined,
        obj
    );
}

function hasPath(obj, path) {
    if (!obj || typeof obj !== 'object') return false;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (!current || typeof current !== 'object'
            || !Object.prototype.hasOwnProperty.call(current, key)) return false;
        current = current[key];
    }
    return true;
}

function setPath(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let index = 0; index < keys.length - 1; index++) {
        if (!current[keys[index]] || typeof current[keys[index]] !== 'object'
            || Array.isArray(current[keys[index]])) current[keys[index]] = {};
        current = current[keys[index]];
    }
    current[keys[keys.length - 1]] = clone(value);
}

/** Null is a deletion/inheritance marker; every other falsy value overrides. */
function mergeEffective(base, override) {
    const out = clone(base) || {};
    if (!override || typeof override !== 'object' || Array.isArray(override)) return out;
    for (const [key, value] of Object.entries(override)) {
        if (value === null) continue;
        if (value && typeof value === 'object' && !Array.isArray(value)
            && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
            out[key] = mergeEffective(out[key], value);
        } else {
            out[key] = clone(value);
        }
    }
    return out;
}

/** Public `/api/auth/config` is already resolved; preserve even null values. */
function mergeResolved(base, resolved) {
    const out = clone(base) || {};
    if (!resolved || typeof resolved !== 'object' || Array.isArray(resolved)) return out;
    for (const [key, value] of Object.entries(resolved)) {
        if (value && typeof value === 'object' && !Array.isArray(value)
            && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
            out[key] = mergeResolved(out[key], value);
        } else {
            out[key] = clone(value);
        }
    }
    return out;
}

function sameValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function humanize(name) {
    return String(name || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function parentId(value) {
    if (value && typeof value === 'object') return value.id ?? null;
    return value ?? null;
}

class GroupAuthConfigSection extends View {
    constructor(options = {}) {
        super({
            className: 'group-auth-config-section',
            template: `
                <div class="detail-section-eyebrow">Auth Config</div>
                <p class="text-secondary small mb-2">
                    Hosted login and registration configuration. Every field identifies
                    where its effective value comes from; Reset queues deletion of only
                    that leaf on the next save.
                </p>
                {{#inheritanceWarning}}
                <div class="alert alert-warning py-2 px-3 small mb-3 gac-inheritance-warning">
                    <i class="bi bi-exclamation-triangle me-1"></i>{{inheritanceWarning}}
                </div>
                {{/inheritanceWarning}}
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

        this._deploymentDefaults = clone(STATIC_DEFAULTS);
        this._ancestorLayers = [];
        this._rawOwn = {};
        this._effective = clone(STATIC_DEFAULTS);
        this._inherited = clone(STATIC_DEFAULTS);
        this._provenance = {};
        this._inheritedProvenance = {};
        this._baseline = {};
        this._baselineExtraWire = [];
        this._extraRows = [];
        this._draftResets = new Set();
        this._extraErrors = [];
        this._ancestryCertain = true;
        this.inheritanceWarning = '';
        this.formView = null;
        this._formSeed = {};
    }

    async onInit() {
        this._deploymentDefaults = await this._fetchDeploymentDefaults();
        await this._loadRawState(this.model?.toJSON?.() || this.model?.attributes || {});
        this.addChild(this._buildFormView(this._baseline));
    }

    _onModelChange() {
        // The form owns its draft. Saves explicitly refresh and rebaseline it.
    }

    async _fetchDeploymentDefaults() {
        const app = this.getApp();
        if (!app?.rest) return clone(STATIC_DEFAULTS);
        try {
            // No group_uuid: this is code defaults + deployment AUTH_CONFIG only.
            const resp = await app.rest.GET('/api/auth/config');
            if (resp && resp.success !== false) {
                const data = resp.data?.data || resp.data;
                if (data && typeof data === 'object') {
                    return mergeResolved(STATIC_DEFAULTS, data);
                }
            }
        } catch {
            // The static contract remains a complete, safe fallback.
        }
        return clone(STATIC_DEFAULTS);
    }

    async _loadRawState(currentAttributes) {
        this._rawOwn = clone(currentAttributes?.metadata?.auth_config) || {};
        const ancestry = await this._walkRawAncestors(parentId(currentAttributes?.parent));
        this._ancestorLayers = ancestry.layers;
        this._ancestryCertain = ancestry.certain;
        this.inheritanceWarning = ancestry.certain ? '' : ancestry.message;
        this._deriveEffectiveState();
        this._baseline = this._buildBaseline(this._effective);
        const extra = getPath(this._effective, 'registration.extra_fields');
        this._baselineExtraWire = Array.isArray(extra) ? clone(extra) : [];
        this._extraRows = this._extraRowsFromArray(this._baselineExtraWire);
        this._seedExtraRows(this._baseline, this._extraRows);
    }

    async _walkRawAncestors(startId) {
        const layers = [];
        const seen = new Set();
        let id = startId;
        let depth = 0;
        while (id !== null && id !== undefined && id !== '') {
            const key = String(id);
            if (seen.has(key)) {
                return { layers: layers.reverse(), certain: false, message: 'Ancestor cycle detected. Effective sources may be incomplete, so resets are disabled.' };
            }
            if (depth >= MAX_ANCESTOR_DEPTH) {
                return { layers: layers.reverse(), certain: false, message: 'Ancestor depth limit reached. Effective sources may be incomplete, so resets are disabled.' };
            }
            seen.add(key);
            const fetched = await this._fetchRawGroup(id);
            if (!fetched?.ok) {
                return { layers: layers.reverse(), certain: false, message: `Could not read ancestor Group #${escapeHtml(id)}. Effective sources may be incomplete, so resets are disabled.` };
            }
            const attrs = fetched.attributes || {};
            layers.push({
                id: attrs.id ?? id,
                name: attrs.name || `Group #${attrs.id ?? id}`,
                config: clone(attrs.metadata?.auth_config) || {}
            });
            id = parentId(attrs.parent);
            depth += 1;
        }
        return { layers: layers.reverse(), certain: true, message: '' };
    }

    _newDetachedGroup(id) {
        return new Group({ id });
    }

    async _fetchRawGroup(id) {
        try {
            const group = this._newDetachedGroup(id);
            const resp = await group.fetch();
            if (!resp || resp.success === false || resp.data?.status === false
                || Object.keys(group.errors || {}).length) return { ok: false };
            const attributes = group.toJSON();
            // A permission-downgraded basic graph omits both raw metadata and
            // parent. Treat that as an uncertain read, never as an empty/root
            // row, or provenance would be confidently wrong.
            if (!Object.prototype.hasOwnProperty.call(attributes, 'metadata')
                || !Object.prototype.hasOwnProperty.call(attributes, 'parent')) return { ok: false };
            return { ok: true, model: group, attributes };
        } catch {
            return { ok: false };
        }
    }

    _deriveEffectiveState() {
        let effective = clone(this._deploymentDefaults);
        const provenance = {};
        for (const path of TRACKED_PATHS) provenance[path] = { kind: 'deployment', label: 'Deployment default' };

        for (const layer of this._ancestorLayers) {
            effective = mergeEffective(effective, layer.config);
            for (const path of TRACKED_PATHS) {
                if (hasPath(layer.config, path) && getPath(layer.config, path) !== null) {
                    provenance[path] = { kind: 'ancestor', label: layer.name, id: layer.id };
                }
            }
        }

        this._inherited = clone(effective);
        this._inheritedProvenance = clone(provenance);
        effective = mergeEffective(effective, this._rawOwn);
        for (const path of TRACKED_PATHS) {
            if (hasPath(this._rawOwn, path) && getPath(this._rawOwn, path) !== null) {
                provenance[path] = { kind: 'own', label: 'This group' };
            }
        }
        this._effective = effective;
        this._provenance = provenance;
    }

    _buildBaseline(effective) {
        const baseline = {};
        for (const field of FIELD_DESCRIPTORS) {
            const value = getPath(effective, field.path);
            if (field.kind === 'array') baseline[field.form] = Array.isArray(value) ? clone(value) : [];
            else if (field.kind === 'bool') baseline[field.form] = !!value;
            else if (field.kind === 'int') baseline[field.form] = value === null || value === undefined ? '' : value;
            else baseline[field.form] = value === null || value === undefined ? '' : String(value);
        }

        const configuredFields = getPath(effective, 'registration.fields');
        const displayedFields = Array.isArray(configuredFields) && configuredFields.length
            ? configuredFields : DEFAULT_REG_FIELDS;
        Object.assign(baseline, this._gridValuesFromArray(displayedFields));
        return baseline;
    }

    _gridValuesFromArray(entries) {
        const byName = {};
        for (const raw of entries || []) {
            const entry = typeof raw === 'string' ? { name: raw } : raw;
            if (entry && entry.name) byName[entry.name] = entry;
        }
        const data = {};
        for (const field of CANONICAL_REG_FIELDS) {
            const entry = byName[field.name];
            const password = field.name === 'password';
            data[`regf_${field.name}_inc`] = !!entry;
            data[`regf_${field.name}_req`] = password ? true : !!entry?.required;
            data[`regf_${field.name}_vfy`] = entry?.verify ? String(entry.verify) : '';
        }
        return data;
    }

    _buildFormView(data) {
        this._formSeed = { ...(data || {}) };
        this.formView = new FormView({
            containerId: 'auth-config-form',
            fields: this._buildFields(),
            data: this._formSeed
        });
        return this.formView;
    }

    _buildFields() {
        return [{
            type: 'tabset',
            name: 'group-auth-config',
            tabs: [
                { label: 'Appearance', fields: this._themeFields(false) },
                { label: 'Login', fields: this._loginFields() },
                { label: 'Registration', fields: this._registrationFields() },
                { label: 'Advanced', fields: this._themeFields(true) }
            ]
        }];
    }

    _current(formName) {
        return this._formSeed[formName] !== undefined ? this._formSeed[formName] : this._baseline[formName];
    }

    _optionsWithUnknown(options, current) {
        const out = options.map(option => ({ ...option }));
        const known = new Set(out.map(option => String(option.value)));
        const values = Array.isArray(current) ? current : [current];
        for (const raw of values) {
            const value = raw === null || raw === undefined ? '' : String(raw);
            if (!known.has(value)) {
                out.push({ value, label: `Configured (unknown): ${value}` });
                known.add(value);
            }
        }
        return out;
    }

    _wrappedField(field, path, columns = field.columns || 12) {
        const control = this._draftResets.has(path) ? { ...field, disabled: true } : field;
        return {
            type: 'group',
            columns,
            class: 'gac-field-group',
            fields: [
                { ...control, columns: 12 },
                { type: 'html', html: this._provenanceHtml(path), columns: 12, class: 'mt-1 mb-2' }
            ]
        };
    }

    _provenanceHtml(path) {
        const resetQueued = this._draftResets.has(path);
        const source = resetQueued ? this._inheritedProvenance[path] : this._provenance[path];
        const own = hasPath(this._rawOwn, path) && getPath(this._rawOwn, path) !== null;
        let sourceText = source?.kind === 'own' ? 'Overridden by this group' : `Inherited from ${source?.label || 'deployment default'}`;
        if (!this._ancestryCertain && source?.kind !== 'own') sourceText = 'Inherited source is uncertain';
        if (resetQueued) sourceText = `Reset queued · will inherit from ${source?.label || 'deployment default'}`;

        let action = '';
        if (resetQueued) {
            action = `<button type="button" class="btn btn-link btn-sm p-0 gac-undo-reset" data-action="undo-auth-field-reset" data-path="${escapeHtml(path)}">Undo reset</button>`;
        } else if (own) {
            const disabled = this._ancestryCertain ? '' : ' disabled';
            const title = this._ancestryCertain ? 'Delete this leaf and inherit its value' : 'Reset disabled until the complete ancestor chain can be read';
            action = `<button type="button" class="btn btn-link btn-sm p-0 gac-reset-field" data-action="reset-auth-field" data-path="${escapeHtml(path)}" title="${escapeHtml(title)}"${disabled}>Reset</button>`;
        }
        return `<div class="d-flex justify-content-between gap-2 small text-secondary gac-provenance" data-path="${escapeHtml(path)}"><span>${escapeHtml(sourceText)}</span>${action}</div>`;
    }

    _themeFields(advanced) {
        const advancedNames = new Set(['api_base', 'success_redirect', 'custom_css', 'custom_css_url']);
        const fields = [];
        for (const descriptor of THEME_FIELDS) {
            if (advancedNames.has(descriptor.form) !== advanced) continue;
            const current = this._current(descriptor.form);
            const field = {
                name: descriptor.form,
                type: descriptor.kind === 'textarea' ? 'textarea' : descriptor.kind === 'select' ? 'select' : 'text',
                label: descriptor.label,
                help: descriptor.help,
                rows: descriptor.kind === 'textarea' ? 6 : undefined,
                options: descriptor.kind === 'select' ? this._optionsWithUnknown(descriptor.options, current) : undefined
            };
            fields.push(this._wrappedField(field, descriptor.path, descriptor.kind === 'textarea' ? 12 : 6));
        }
        return fields;
    }

    _loginFields() {
        return [
            this._wrappedField({
                name: 'login_heading', type: 'text', label: 'Login heading',
                help: 'Nonblank heading shown above the sign-in form.'
            }, 'login.heading', 6),
            this._wrappedField({
                name: 'login_supporting_copy', type: 'textarea', label: 'Supporting copy',
                help: 'Optional text shown below the login heading.', rows: 3
            }, 'login.supporting_copy', 6),
            this._wrappedField({
                name: 'login_methods', type: 'multiselect', label: 'Login methods',
                help: 'At least one is required.',
                options: this._optionsWithUnknown(LOGIN_METHOD_OPTS, this._current('login_methods')),
                value: this._current('login_methods') || [], selectAll: true, clearAll: true
            }, 'login.methods', 12)
        ];
    }

    _registrationFields() {
        const fields = [
            this._wrappedField({
                name: 'reg_enabled', type: 'toggle', label: 'Registration enabled',
                help: 'When off, the hosted registration page is hidden.'
            }, 'registration.enabled', 12),
            this._wrappedField({
                name: 'reg_passkey_prompt', type: 'select', label: 'Passkey prompt',
                options: this._optionsWithUnknown(PASSKEY_PROMPT_OPTS, this._current('reg_passkey_prompt'))
            }, 'registration.passkey_prompt', 6),
            this._wrappedField({
                name: 'reg_identity_field', type: 'select', label: 'Identity field',
                help: 'Auto chooses email, then phone.',
                options: this._optionsWithUnknown(IDENTITY_FIELD_OPTS, this._current('reg_identity_field'))
            }, 'registration.identity_field', 6),
            this._wrappedField({
                name: 'reg_min_age', type: 'number', label: 'Minimum age', min: 0,
                help: 'Applied when date of birth is collected.'
            }, 'registration.min_age', 6),
            this._wrappedField({
                name: 'reg_methods', type: 'multiselect', label: 'Signup methods',
                options: this._optionsWithUnknown(REGISTRATION_METHOD_OPTS, this._current('reg_methods')),
                value: this._current('reg_methods') || [], selectAll: true, clearAll: true
            }, 'registration.methods', 12),
            { type: 'header', text: 'Registration form fields', level: 6, class: 'mt-3' },
            {
                type: 'html',
                html: `<p class="text-secondary small mb-2">An empty saved list is legal and displays django-mojo's default email + password schema. A non-empty passwordless schema must include an SMS-verified phone.</p>${this._provenanceHtml('registration.fields')}`
            }
        ];

        const fieldsReset = this._draftResets.has('registration.fields');
        for (const canonical of CANONICAL_REG_FIELDS) {
            const password = canonical.name === 'password';
            const verify = this._current(`regf_${canonical.name}_vfy`);
            fields.push({
                type: 'group',
                title: canonical.label,
                columns: 12,
                fields: [
                    { name: `regf_${canonical.name}_inc`, type: 'toggle', label: 'Include', disabled: fieldsReset, columns: 4 },
                    { name: `regf_${canonical.name}_req`, type: 'toggle', label: 'Required', disabled: password || fieldsReset, columns: 4 },
                    {
                        name: `regf_${canonical.name}_vfy`, type: 'select', label: 'Verify',
                        options: this._optionsWithUnknown(VERIFY_OPTS, verify), disabled: password || fieldsReset, columns: 4
                    }
                ]
            });
        }

        fields.push({
            type: 'html',
            class: 'mt-3',
            html: this._renderExtraFields()
        });
        return fields;
    }

    _extraRowsFromArray(entries) {
        return (Array.isArray(entries) ? entries : []).map(entry => {
            const legacy = typeof entry === 'string';
            const object = legacy ? { name: entry } : (entry && typeof entry === 'object' ? entry : {});
            const name = typeof object.name === 'string' ? object.name : '';
            return {
                name,
                label: legacy ? humanize(name) : (typeof object.label === 'string' ? object.label : humanize(name)),
                required: legacy ? false : !!object.required,
                original: clone(entry)
            };
        });
    }

    _seedExtraRows(data, rows) {
        for (const key of Object.keys(data)) {
            if (/^reg_extra_\d+_/.test(key)) delete data[key];
        }
        rows.forEach((row, index) => {
            data[`reg_extra_${index}_name`] = row.name;
            data[`reg_extra_${index}_label`] = row.label;
            data[`reg_extra_${index}_required`] = !!row.required;
        });
    }

    _renderExtraFields() {
        const errorByIndex = new Map(this._extraErrors.map(error => [error.index, error.message]));
        const resetQueued = this._draftResets.has('registration.extra_fields');
        const disabled = resetQueued ? ' disabled' : '';
        const rows = this._extraRows.map((row, index) => {
            const message = errorByIndex.get(index) || '';
            const invalid = message ? ' is-invalid' : '';
            return `
                <div class="card bg-body-tertiary mb-2 gac-extra-row" data-index="${index}">
                    <div class="card-body py-2 px-3">
                        <div class="row g-2 align-items-end">
                            <div class="col-md-4">
                                <label class="form-label small mb-1">Name</label>
                                <input class="form-control form-control-sm${invalid}" name="reg_extra_${index}_name"
                                       value="${escapeHtml(row.name)}" required pattern="[A-Za-z][A-Za-z0-9_]*"${disabled}>
                            </div>
                            <div class="col-md-5">
                                <label class="form-label small mb-1">Label</label>
                                <input class="form-control form-control-sm" name="reg_extra_${index}_label"
                                       value="${escapeHtml(row.label)}"${disabled}>
                            </div>
                            <div class="col-md-2">
                                <div class="form-check form-switch mb-1">
                                    <input class="form-check-input" type="checkbox" name="reg_extra_${index}_required"${row.required ? ' checked' : ''}${disabled}>
                                    <label class="form-check-label small">Required</label>
                                </div>
                            </div>
                            <div class="col-md-1 text-end">
                                <button type="button" class="btn btn-sm btn-link text-secondary" title="Remove extra field"
                                        data-action="remove-registration-extra" data-index="${index}"${disabled}><i class="bi bi-x-lg"></i></button>
                            </div>
                        </div>
                        <div class="invalid-feedback d-block gac-extra-error">${escapeHtml(message)}</div>
                    </div>
                </div>`;
        }).join('');

        return `
            <div class="d-flex align-items-start justify-content-between gap-3 mb-2">
                <div><h6 class="mb-1">Extra registration fields</h6><p class="text-secondary small mb-0">Ordered custom fields captured into user registration metadata. Legacy string entries remain strings until edited.</p></div>
                <button type="button" class="btn btn-sm btn-outline-secondary" data-action="add-registration-extra"${disabled}><i class="bi bi-plus-lg me-1"></i>Add field</button>
            </div>
            ${this._provenanceHtml('registration.extra_fields')}
            <div class="mt-2 gac-extra-rows">${rows || '<p class="text-secondary small mb-0 gac-extra-empty">No extra fields configured.</p>'}</div>`;
    }

    _captureActiveTab() {
        const root = this.formView?.element;
        const active = root?.querySelector('.mojo-form-tabset [role="tab"].active');
        if (!active) return 0;
        const target = active.getAttribute('data-bs-target');
        const pane = target ? root.querySelector(target) : null;
        return Number(pane?.dataset?.tabIndex || 0);
    }

    _restoreActiveTab(index) {
        const root = this.formView?.element;
        if (!root) return;
        const pane = root.querySelector(`.mojo-form-tabset .tab-pane[data-tab-index="${Number(index) || 0}"]`);
        if (!pane) return;
        const trigger = root.querySelector(`[data-bs-target="#${pane.id}"]`);
        if (!trigger) return;
        const tab = window.bootstrap?.Tab?.getOrCreateInstance?.(trigger);
        if (tab?.show) {
            tab.show();
            return;
        }
        root.querySelectorAll('.mojo-form-tabset [role="tab"]').forEach(node => {
            const selected = node === trigger;
            node.classList.toggle('active', selected);
            node.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
        root.querySelectorAll('.mojo-form-tabset .tab-pane').forEach(node => node.classList.remove('show', 'active'));
        pane.classList.add('show', 'active');
    }

    async _rebuildForm(data, activeTab = this._captureActiveTab()) {
        if (this.formView) this.removeChild(this.formView);
        const next = this._buildFormView(data);
        this.addChild(next);
        if (this.isMounted()) await next.render();
        this._restoreActiveTab(activeTab);
        return next;
    }

    _completeFormData(data) {
        const complete = data || {};
        for (const [key, value] of Object.entries(this._formSeed || {})) {
            if (complete[key] === undefined) complete[key] = clone(value);
        }
        return complete;
    }

    _syncExtraRowsFromForm(data) {
        this._extraRows = this._extraRows.map((row, index) => ({
            name: String(data[`reg_extra_${index}_name`] ?? row.name ?? ''),
            label: String(data[`reg_extra_${index}_label`] ?? row.label ?? ''),
            required: !!data[`reg_extra_${index}_required`],
            original: clone(row.original)
        }));
        this._seedExtraRows(data, this._extraRows);
    }

    async onActionAddRegistrationExtra() {
        const data = this._completeFormData(await this.formView.getFormData());
        const active = this._captureActiveTab();
        this._syncExtraRowsFromForm(data);
        this._extraRows.push({ name: '', label: '', required: false, original: undefined });
        this._seedExtraRows(data, this._extraRows);
        this._extraErrors = [];
        await this._rebuildForm(data, active);
        return true;
    }

    async onActionRemoveRegistrationExtra(_event, element) {
        const data = this._completeFormData(await this.formView.getFormData());
        const active = this._captureActiveTab();
        this._syncExtraRowsFromForm(data);
        const index = Number(element?.dataset?.index);
        if (Number.isInteger(index) && index >= 0 && index < this._extraRows.length) {
            this._extraRows.splice(index, 1);
        }
        this._seedExtraRows(data, this._extraRows);
        this._extraErrors = [];
        await this._rebuildForm(data, active);
        return true;
    }

    async onActionResetAuthField(_event, element) {
        const path = element?.dataset?.path;
        if (!TRACKED_PATHS.includes(path) || !this._ancestryCertain) return true;
        const data = this._completeFormData(await this.formView.getFormData());
        const active = this._captureActiveTab();
        this._syncExtraRowsFromForm(data);
        this._draftResets.add(path);
        this._applyPathToDraft(path, getPath(this._inherited, path), data);
        await this._rebuildForm(data, active);
        this._setStatus(`Reset queued for ${path}. Save to apply it.`);
        return true;
    }

    async onActionUndoAuthFieldReset(_event, element) {
        const path = element?.dataset?.path;
        if (!this._draftResets.has(path)) return true;
        const data = this._completeFormData(await this.formView.getFormData());
        const active = this._captureActiveTab();
        this._syncExtraRowsFromForm(data);
        this._draftResets.delete(path);
        this._applyPathToDraft(path, getPath(this._effective, path), data);
        await this._rebuildForm(data, active);
        this._setStatus(`Reset cancelled for ${path}.`);
        return true;
    }

    _applyPathToDraft(path, value, data) {
        const descriptor = FIELD_DESCRIPTORS.find(field => field.path === path);
        if (descriptor) {
            if (descriptor.kind === 'array') data[descriptor.form] = Array.isArray(value) ? clone(value) : [];
            else if (descriptor.kind === 'bool') data[descriptor.form] = !!value;
            else if (descriptor.kind === 'int') data[descriptor.form] = value === null || value === undefined ? '' : value;
            else data[descriptor.form] = value === null || value === undefined ? '' : String(value);
            return;
        }
        if (path === 'registration.fields') {
            const displayed = Array.isArray(value) && value.length ? value : DEFAULT_REG_FIELDS;
            Object.assign(data, this._gridValuesFromArray(displayed));
        } else if (path === 'registration.extra_fields') {
            this._extraRows = this._extraRowsFromArray(Array.isArray(value) ? value : []);
            this._seedExtraRows(data, this._extraRows);
        }
    }

    _assembleRegFields(data) {
        const fields = [];
        for (const canonical of CANONICAL_REG_FIELDS) {
            if (!data[`regf_${canonical.name}_inc`]) continue;
            if (canonical.name === 'password') {
                fields.push({ name: 'password', required: true, verify: null });
            } else {
                fields.push({
                    name: canonical.name,
                    required: !!data[`regf_${canonical.name}_req`],
                    verify: data[`regf_${canonical.name}_vfy`] || null
                });
            }
        }
        return fields;
    }

    _rowMatchesOriginal(row, name, label, required) {
        const original = row.original;
        if (typeof original === 'string') {
            return name === original.trim() && label === humanize(original.trim()) && required === false;
        }
        if (!original || typeof original !== 'object') return false;
        const originalName = typeof original.name === 'string' ? original.name.trim() : '';
        const originalLabel = typeof original.label === 'string' ? original.label : humanize(originalName);
        return name === originalName && label === originalLabel && required === !!original.required;
    }

    _assembleExtraFields(data, rows = this._extraRows) {
        return rows.map((row, index) => {
            const name = String(data[`reg_extra_${index}_name`] ?? row.name ?? '').trim();
            const label = String(data[`reg_extra_${index}_label`] ?? row.label ?? '').trim();
            const required = !!data[`reg_extra_${index}_required`];
            if (this._rowMatchesOriginal(row, name, label, required)) return clone(row.original);
            const entry = { name, required };
            if (label) entry.label = label;
            return entry;
        });
    }

    _validateExtraFields(data) {
        const errors = [];
        const seen = new Set();
        this._extraRows.forEach((row, index) => {
            const name = String(data[`reg_extra_${index}_name`] ?? '').trim();
            let message = '';
            if (!name) message = 'Name is required.';
            else if (!EXTRA_FIELD_NAME_RE.test(name)) message = 'Use a letter followed by letters, digits, or underscores.';
            else if (CANONICAL_REG_NAMES.has(name)) message = `${name} is canonical; configure it above.`;
            else if (seen.has(name)) message = `${name} is duplicated.`;
            if (name) seen.add(name);
            if (message) errors.push({ index, message });
        });
        return errors;
    }

    _showExtraValidation(errors) {
        this._extraErrors = errors;
        const root = this.formView?.element;
        if (!root) return;
        root.querySelectorAll('.gac-extra-row').forEach(row => {
            const index = Number(row.dataset.index);
            const error = errors.find(item => item.index === index);
            row.querySelector('[name$="_name"]')?.classList.toggle('is-invalid', !!error);
            const message = row.querySelector('.gac-extra-error');
            if (message) message.textContent = error?.message || '';
        });
    }

    _isSafeNavigationUrl(value) {
        const raw = String(value || '').trim();
        if (!raw || raw.includes('\\')) return raw === '';
        try {
            const url = new URL(raw, 'https://placeholder.invalid');
            if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw)) {
                return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.host;
            }
            return true;
        } catch {
            return false;
        }
    }

    _validateDraft(data) {
        const loginMethods = Array.isArray(data.login_methods) ? data.login_methods : [];
        if (!loginMethods.length) return 'Select at least one login method.';
        const knownLogin = new Set(LOGIN_METHOD_OPTS.map(option => option.value));
        const unknownLogin = loginMethods.find(method => !knownLogin.has(method));
        if (unknownLogin) return `Unknown configured login method '${unknownLogin}' must be replaced or reset before saving.`;
        const registrationMethods = Array.isArray(data.reg_methods) ? data.reg_methods : [];
        const knownRegistration = new Set(REGISTRATION_METHOD_OPTS.map(option => option.value));
        const unknownRegistration = registrationMethods.find(method => !knownRegistration.has(method));
        if (unknownRegistration) return `Unknown configured signup method '${unknownRegistration}' must be replaced or reset before saving.`;

        for (const [form, path, options, label] of [
            ['layout', 'theme.layout', LAYOUT_OPTS, 'layout'],
            ['appearance', 'theme.appearance', APPEARANCE_OPTS, 'appearance'],
            ['hero_image_position', 'theme.hero_image_position', HERO_POSITION_OPTS, 'hero image position'],
            ['reg_passkey_prompt', 'registration.passkey_prompt', PASSKEY_PROMPT_OPTS, 'passkey prompt']
        ]) {
            const known = new Set(options.map(option => option.value));
            if (!this._draftResets.has(path) && !known.has(data[form])) {
                return `Unknown configured ${label} '${data[form]}' must be replaced or reset before saving.`;
            }
        }

        const fields = this._assembleRegFields(data);
        if (fields.length) {
            if (!fields.some(field => field.name === 'email' || field.name === 'phone')) {
                return "Registration fields must include 'Email' or 'Phone'.";
            }
            if (!fields.some(field => field.name === 'password')) {
                const phone = fields.find(field => field.name === 'phone');
                if (!phone || phone.verify !== 'sms') {
                    return "Passwordless registration requires a Phone field with Verify set to SMS.";
                }
            }
        }

        if (!this._draftResets.has('theme.accent_color') && !ACCENT_COLOR_RE.test(String(data.accent_color || ''))) {
            return 'Accent color must be a six-digit hex color such as #6384ff.';
        }
        if (!this._draftResets.has('theme.back_to_website_url') && !this._isSafeNavigationUrl(data.back_to_website_url)) {
            return 'Back-to-website URL must be relative or an absolute HTTP(S) URL.';
        }
        if (!this._draftResets.has('theme.custom_css_url') && data.custom_css_url
            && !String(data.custom_css_url).startsWith('https://')) {
            return 'External CSS URL must start with https://.';
        }
        if (!this._draftResets.has('theme.custom_css')) {
            const css = String(data.custom_css || '');
            const lower = css.toLowerCase();
            if (css.includes('<') || lower.includes('@import') || lower.includes('://')
                || /url\(\s*['"]?\s*\/\//i.test(css)) {
                return "Inline CSS cannot contain '<', @import, or external URLs.";
            }
        }
        for (const [key, label, path] of [
            ['auth_provider_name', 'Auth provider name', 'theme.auth_provider_name'],
            ['back_to_website_label', 'Back-to-website label', 'theme.back_to_website_label'],
            ['login_heading', 'Login heading', 'login.heading']
        ]) {
            if (!this._draftResets.has(path) && !String(data[key] || '').trim()) return `${label} cannot be blank.`;
        }
        return '';
    }

    _normalize(value, kind) {
        if (kind === 'array') return Array.isArray(value) ? clone(value) : [];
        if (kind === 'bool') return !!value;
        if (kind === 'int') return value === '' || value === null || value === undefined ? null : Number(value);
        return value === null || value === undefined ? '' : String(value);
    }

    _different(value, baseline, kind) {
        if (kind === 'bool') return !!value !== !!baseline;
        if (kind === 'int') return this._normalize(value, kind) !== this._normalize(baseline, kind);
        if (kind === 'array') return !sameValue(this._normalize(value, kind), this._normalize(baseline, kind));
        return String(value ?? '').trim() !== String(baseline ?? '').trim();
    }

    _diffPayload(data) {
        const payload = {};
        let changed = false;
        for (const descriptor of FIELD_DESCRIPTORS) {
            if (this._draftResets.has(descriptor.path)) continue;
            if (this._different(data[descriptor.form], this._baseline[descriptor.form], descriptor.kind)) {
                setPath(payload, descriptor.path, this._normalize(data[descriptor.form], descriptor.kind));
                changed = true;
            }
        }

        if (!this._draftResets.has('registration.fields')) {
            const current = this._assembleRegFields(data);
            const baseline = this._assembleRegFields(this._baseline);
            if (!sameValue(current, baseline)) {
                setPath(payload, 'registration.fields', current);
                changed = true;
            }
        }

        if (!this._draftResets.has('registration.extra_fields')) {
            const current = this._assembleExtraFields(data);
            if (!sameValue(current, this._baselineExtraWire)) {
                setPath(payload, 'registration.extra_fields', current);
                changed = true;
            }
        }

        for (const path of this._draftResets) {
            setPath(payload, path, null);
            changed = true;
        }
        return changed ? payload : null;
    }

    _rebaseRawBranch(latestRaw, intent) {
        const sparse = {};
        const apply = (value, prefix = '') => {
            for (const [key, child] of Object.entries(value || {})) {
                const path = prefix ? `${prefix}.${key}` : key;
                if (child && typeof child === 'object' && !Array.isArray(child)) apply(child, path);
                // A reset that is already absent is satisfied. Sending its
                // null would materialize a missing branch on some backends.
                else if (child !== null || hasPath(latestRaw, path)) setPath(sparse, path, child);
            }
        };
        apply(intent);
        return sparse;
    }

    _saveSucceeded(resp) {
        if (resp?.skipped) return true;
        return !!resp && resp.success !== false && resp.data?.status !== false
            && Object.keys(this.model?.errors || {}).length === 0
            && (resp.status === 200 || resp.data?.status === true || resp.success === true);
    }

    _saveError(resp) {
        return resp?.message || resp?.error || resp?.data?.error || resp?.data?.message
            || Object.values(this.model?.errors || {})[0] || 'Failed to save auth config';
    }

    async _saveRebased(intent, latestRaw) {
        const rebased = this._rebaseRawBranch(latestRaw, intent);
        if (Object.keys(rebased).length === 0) {
            return { success: true, status: 200, data: { status: true }, skipped: true };
        }
        return this.model.save({ metadata: { auth_config: rebased } }, { skipRender: true });
    }

    _persistedNullPaths(raw, paths) {
        return paths.filter(path => hasPath(raw, path) && getPath(raw, path) === null);
    }

    _intentLeaves(intent, prefix = '', leaves = []) {
        for (const [key, value] of Object.entries(intent || {})) {
            const path = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this._intentLeaves(value, path, leaves);
            } else {
                leaves.push({ path, value });
            }
        }
        return leaves;
    }

    _verifyIntent(raw, intent) {
        const mismatched = [];
        for (const leaf of this._intentLeaves(intent)) {
            if (leaf.value === null) {
                if (hasPath(raw, leaf.path) && getPath(raw, leaf.path) !== null) mismatched.push(leaf.path);
            } else if (!hasPath(raw, leaf.path) || !sameValue(getPath(raw, leaf.path), leaf.value)) {
                mismatched.push(leaf.path);
            }
        }
        return mismatched;
    }

    async onActionSaveAuthConfig() {
        if (!this.formView) return true;
        const app = this.getApp();
        const activeTab = this._captureActiveTab();
        if (typeof this.formView.validate === 'function' && !this.formView.validate()) {
            this.formView.focusFirstError?.();
            return true;
        }

        const data = this._completeFormData(await this.formView.getFormData());
        this._syncExtraRowsFromForm(data);
        const extraErrors = this._validateExtraFields(data);
        if (extraErrors.length) {
            this._showExtraValidation(extraErrors);
            this._fail('Fix the highlighted extra registration fields before saving.');
            return true;
        }
        const validationError = this._validateDraft(data);
        if (validationError) {
            this._fail(validationError);
            return true;
        }

        const intent = this._diffPayload(data);
        if (!intent) {
            this._setStatus('No changes to save.');
            return true;
        }

        this._setStatus('Refreshing latest group config…');
        app?.showLoading?.();
        try {
            const latest = await this._fetchRawGroup(this.model?.id);
            if (!latest?.ok) {
                this._fail('Could not refresh the latest raw Group config. Draft preserved; nothing was saved.');
                return true;
            }
            const latestRaw = clone(latest.attributes?.metadata?.auth_config) || {};
            this._setStatus('Saving…');
            let resp = await this._saveRebased(intent, latestRaw);
            if (!this._saveSucceeded(resp)) {
                this._fail(this._saveError(resp));
                return true;
            }

            let verified = await this._fetchRawGroup(this.model?.id);
            if (!verified?.ok) {
                this._fail('Save completed, but the raw Group config could not be verified. Refresh before editing again.');
                return true;
            }

            const resetPaths = [...this._draftResets];
            let verifiedRaw = clone(verified.attributes?.metadata?.auth_config) || {};
            const mismatched = this._verifyIntent(verifiedRaw, intent);
            if (mismatched.length) {
                this._fail(`Save verification did not match the requested leaves: ${mismatched.join(', ')}. Draft preserved.`);
                return true;
            }
            const persistedNulls = this._persistedNullPaths(verifiedRaw, resetPaths);
            if (persistedNulls.length) {
                const cleanupIntent = {};
                persistedNulls.forEach(path => setPath(cleanupIntent, path, null));
                resp = await this._saveRebased(cleanupIntent, verifiedRaw);
                if (!this._saveSucceeded(resp)) {
                    this._fail(`Config saved, but cleanup of ${persistedNulls.join(', ')} failed. ${this._saveError(resp)}`);
                    return true;
                }
                verified = await this._fetchRawGroup(this.model?.id);
                if (!verified?.ok) {
                    this._fail('Cleanup save completed, but the raw Group config could not be verified.');
                    return true;
                }
                verifiedRaw = clone(verified.attributes?.metadata?.auth_config) || {};
                const remaining = this._persistedNullPaths(verifiedRaw, persistedNulls);
                if (remaining.length) {
                    this._fail(`Reset cleanup did not remove: ${remaining.join(', ')}. Draft preserved for retry.`);
                    return true;
                }
            }

            this.model?.set?.(verified.attributes, null, { skipRender: true });
            this._draftResets.clear();
            this._extraErrors = [];
            await this._loadRawState(verified.attributes);
            await this._rebuildForm(this._baseline, activeTab);
            this._setStatus('All changes saved.', 'success');
            app?.toast?.success('Auth config saved');
        } catch (error) {
            this._fail(error?.message || 'Failed to save auth config. Draft preserved.');
        } finally {
            app?.hideLoading?.();
        }
        return true;
    }

    _fail(message) {
        this._setStatus(message, 'danger');
        this.getApp()?.toast?.error(message);
    }

    _setStatus(text, tone) {
        const element = this.element?.querySelector('.gac-status');
        if (!element) return;
        element.textContent = text || '';
        element.className = `gac-status small ${tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-secondary'}`;
    }
}

export default GroupAuthConfigSection;
