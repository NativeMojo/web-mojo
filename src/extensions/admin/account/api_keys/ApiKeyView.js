/**
 * ApiKeyView - Group-scoped API key detail view built on the DetailView primitive.
 *
 * Sections:
 *   Overview     — key facts (ID, group, created, last used) + token note
 *   Permissions  — guided autosave switches plus a complete raw JSON policy
 *                  editor for grants outside the registered catalog
 *   ── Reference ──
 *   Rate Limits  — read-only limits overrides
 *   Usage        — Authorization header snippet
 *
 * is_active is toggled from the header's active switch; the kebab keeps only
 * Edit name / Delete. The raw token is only displayed at creation time and
 * is not shown here.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import FormView from '@core/forms/FormView.js';
import dataFormatter from '@core/utils/DataFormatter.js';
import { ApiKey, ApiKeyForms } from '@core/models/ApiKey.js';


// ── Helpers ────────────────────────────────────────────────

function countTruthy(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    return Object.values(obj).filter(v => v === true).length;
}


// ── Overview section ───────────────────────────────────────

class ApiKeyOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'api-key-overview-section',
            template: `
                <div class="detail-section-eyebrow">Key</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">ID</div>
                    <div class="detail-flat-row-value">{{model.id}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Group</div>
                    <div class="detail-flat-row-value">
                        {{#groupLabel}}{{groupLabel}}{{/groupLabel}}
                        {{^groupLabel}}<span class="text-secondary fst-italic">—</span>{{/groupLabel}}
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Created</div>
                    <div class="detail-flat-row-value">{{model.created|datetime}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Last used</div>
                    <div class="detail-flat-row-value">{{lastUsedLabel}}</div>
                </div>

                <div class="detail-section-eyebrow">Token</div>
                <p class="text-secondary small mb-0">
                    The raw token was only shown once, at creation time.
                    If it has been lost, delete this key and create a new one.
                </p>
            `,
            ...options
        });
    }

    get groupLabel() {
        const group = this.model?.get?.('group');
        if (!group) return null;
        return group.name || `Group ${group}`;
    }

    get lastUsedLabel() {
        const lu = this.model?.get?.('last_used');
        if (!lu) return 'never';
        return dataFormatter.apply(lu, ['relative']) || 'never';
    }
}


// ── Permissions section ────────────────────────────────────
//
// The guided editor is one autosaving FormView over the live
// ApiKey.permissionTabset(). The JSON editor binds to the same model and saves
// explicitly, treating the document as the complete policy. Because the
// backend setter is merge-style, ApiKey.buildPermissionsPatch() emits false
// for omitted existing keys so the result has replacement semantics.
//
// A failed save needs no handling here: FormView.executeBatchSave already
// toasts the server error and calls revertFields(), so a 403 on a protected
// federation permission snaps the switch back to its persisted value.

class ApiKeyPermissionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'api-key-permissions-section',
            template: `
                <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
                    <div>
                        <div class="detail-section-eyebrow">API key permissions</div>
                        <p class="text-secondary small mb-0">
                            Edit common grants with switches or manage the complete policy as JSON.
                        </p>
                    </div>
                    <div class="btn-group btn-group-sm" role="group" aria-label="Permission editor mode">
                        <button type="button" class="btn {{guidedButtonClass}}"
                                data-action="show-guided-policy" aria-pressed="{{guidedPressed}}">
                            <i class="bi bi-toggles me-1"></i>Guided
                        </button>
                        <button type="button" class="btn {{jsonButtonClass}}"
                                data-action="show-json-policy" aria-pressed="{{jsonPressed}}">
                            <i class="bi bi-braces me-1"></i>JSON policy
                        </button>
                    </div>
                </div>

                <div data-policy-pane="guided" class="{{guidedPaneClass}}">
                    <p class="text-secondary small mb-3">
                        Toggles autosave as soon as you flip them.
                    </p>
                    <div data-container="apikey-perms"></div>
                </div>

                <div data-policy-pane="json" class="{{jsonPaneClass}}">
                    <div class="alert alert-warning py-2 small" role="alert">
                        This document is the complete policy. Removing a key revokes it on Save.
                        The server independently authorizes every changed permission.
                    </div>
                    <div data-container="apikey-perms-json"></div>
                    <div class="d-flex flex-wrap align-items-center justify-content-end gap-3 mt-3 pt-3 border-top">
                        <span class="api-key-policy-status small text-secondary"></span>
                        <button type="button" class="btn btn-primary btn-sm" data-action="save-json-policy">
                            <i class="bi bi-check-lg me-1"></i>Save JSON policy
                        </button>
                    </div>
                </div>
            `,
            ...options
        });
        this.policyMode = 'guided';
    }

    get guidedButtonClass() { return this.policyMode === 'guided' ? 'btn-primary' : 'btn-outline-secondary'; }
    get jsonButtonClass() { return this.policyMode === 'json' ? 'btn-primary' : 'btn-outline-secondary'; }
    get guidedPaneClass() { return this.policyMode === 'guided' ? '' : 'd-none'; }
    get jsonPaneClass() { return this.policyMode === 'json' ? '' : 'd-none'; }
    get guidedPressed() { return this.policyMode === 'guided' ? 'true' : 'false'; }
    get jsonPressed() { return this.policyMode === 'json' ? 'true' : 'false'; }

    async onInit() {
        // checkPermissions is the framework's fail-closed gate (View.js) and
        // resolves the active user the same way; pass its verdict rather than
        // letting the tabset resolve the user a second, different way.
        this.formView = new FormView({
            containerId: 'apikey-perms',
            fields: ApiKey.permissionTabset(
                this.checkPermissions(ApiKey.FEDERATION_GRANT_PERMS)),
            model: this.model,
            autosaveModelField: true
        });
        this.addChild(this.formView);

        this.rawFormView = new FormView({
            containerId: 'apikey-perms-json',
            fields: [{
                name: 'permissions',
                type: 'json',
                label: 'Permissions policy (JSON)',
                rows: 14,
                columns: 12,
                help: 'Boolean permission map, for example { "send_sms": true }. Unknown permission names are allowed; the server remains authoritative.'
            }],
            model: this.model
        });
        this.addChild(this.rawFormView);
    }

    onActionShowGuidedPolicy() {
        this._setPolicyMode('guided');
        return true;
    }

    onActionShowJsonPolicy() {
        // FormView is deliberately not model-mutating until Save. Refresh the
        // JSON field when entering this mode so guided autosaves made since the
        // last visit are represented in the complete policy document.
        this.rawFormView.syncFormWithModel?.();
        this._setPolicyMode('json');
        return true;
    }

    _setPolicyMode(mode) {
        this.policyMode = mode;
        const guided = mode === 'guided';
        this.element?.querySelector('[data-policy-pane="guided"]')?.classList.toggle('d-none', !guided);
        this.element?.querySelector('[data-policy-pane="json"]')?.classList.toggle('d-none', guided);

        const guidedButton = this.element?.querySelector('[data-action="show-guided-policy"]');
        const jsonButton = this.element?.querySelector('[data-action="show-json-policy"]');
        this._styleModeButton(guidedButton, guided);
        this._styleModeButton(jsonButton, !guided);
    }

    _styleModeButton(button, active) {
        if (!button) return;
        button.classList.toggle('btn-primary', active);
        button.classList.toggle('btn-outline-secondary', !active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    async onActionSaveJsonPolicy() {
        const app = this.getApp();
        const formData = await this.rawFormView.getFormData();
        let patch;
        try {
            ApiKey.validatePermissionsPolicy(formData.permissions);
            patch = ApiKey.buildPermissionsPatch(
                this.model?.get?.('permissions'), formData.permissions);
        } catch (error) {
            this._setPolicyStatus(error.message, 'danger');
            app?.toast?.error(error.message);
            return true;
        }

        this._setPolicyStatus('Saving…');
        app?.showLoading?.();
        let resp;
        try {
            resp = await this.model.save(
                { permissions: patch }, { skipRender: true });
        } catch (error) {
            resp = { success: false, error: error.message };
        } finally {
            app?.hideLoading?.();
        }

        const failed = !resp || resp.success === false
            || resp.data?.status === false
            || Object.keys(this.model?.errors || {}).length > 0;
        if (failed) {
            const message = resp?.data?.error || resp?.error || resp?.message
                || 'Failed to save the permissions policy.';
            this._setPolicyStatus(message, 'danger');
            app?.toast?.error(message);
            return true;
        }

        this.rawFormView.syncFormWithModel?.();
        this.formView.syncFormWithModel?.();
        this._setPolicyStatus('Policy saved.', 'success');
        app?.toast?.success('API key permissions saved');
        return true;
    }

    _setPolicyStatus(text, tone) {
        const el = this.element?.querySelector('.api-key-policy-status');
        if (!el) return;
        el.textContent = text || '';
        el.className = 'api-key-policy-status small '
            + (tone === 'danger' ? 'text-danger'
                : tone === 'success' ? 'text-success'
                : 'text-secondary');
    }
}


// ── Rate limits section ────────────────────────────────────

class ApiKeyLimitsSection extends View {
    constructor(options = {}) {
        super({
            className: 'api-key-limits-section',
            template: `
                <div class="detail-section-eyebrow">Rate limit overrides</div>
                {{#hasLimits|bool}}
                    <pre class="small mb-0">{{model.limits|json}}</pre>
                {{/hasLimits|bool}}
                {{^hasLimits|bool}}
                    <p class="text-secondary small mb-0">None — group defaults apply.</p>
                {{/hasLimits|bool}}
            `,
            ...options
        });
    }

    get hasLimits() {
        const limits = this.model?.get?.('limits');
        return !!limits && typeof limits === 'object' && Object.keys(limits).length > 0;
    }
}


// ── Usage section ──────────────────────────────────────────

class ApiKeyUsageSection extends View {
    constructor(options = {}) {
        super({
            className: 'api-key-usage-section',
            template: `
                <div class="detail-section-eyebrow">Usage</div>
                <p class="text-secondary small mb-2">Send the key on every request:</p>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Header</div>
                    <div class="detail-flat-row-value">
                        <code>Authorization: apikey &lt;token&gt;</code>
                    </div>
                </div>
            `,
            ...options
        });
    }
}


// ── ApiKeyView (assembly) ──────────────────────────────────

class ApiKeyView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new ApiKey(options.data || {});

        const overviewSection = new ApiKeyOverviewSection({ model });
        const permissionsSection = new ApiKeyPermissionsSection({ model });
        const limitsSection = new ApiKeyLimitsSection({ model });
        const usageSection = new ApiKeyUsageSection({ model });

        const sections = [
            { key: 'Overview',    label: 'Overview',    icon: 'bi-grid-1x2',    view: overviewSection },
            { key: 'Permissions', label: 'Permissions', icon: 'bi-shield-lock', view: permissionsSection },
            { type: 'divider', label: 'Reference' },
            { key: 'Limits', label: 'Rate Limits', icon: 'bi-speedometer2', view: limitsSection },
            { key: 'Usage',  label: 'Usage',       icon: 'bi-book',         view: usageSection }
        ];

        const chips = [
            {
                icon: 'bi-people',
                text: m => m.get('group')?.name || null,
                variant: 'info',
                when: m => !!m.get('group')?.name
            },
            {
                text: m => {
                    const n = countTruthy(m.get('permissions'));
                    return n > 0 ? `${n} ${n === 1 ? 'perm' : 'perms'} granted` : null;
                },
                variant: 'light',
                when: m => countTruthy(m.get('permissions')) > 0
            }
        ];

        super({
            className: 'api-key-view',
            ...options,
            model,
            header: {
                icon: 'bi-key',
                titleField: 'name',
                subtitleFn: () => 'The raw token was shown once at creation and is not retrievable.',
                chips,
                // Deactivate via the active toggle; the kebab keeps only the
                // deliberate, less-prominent actions.
                activeField: 'is_active',
                contextMenu: {
                    items: [
                        { label: 'Edit name', action: 'edit-key', icon: 'bi-pencil' },
                        { type: 'divider' },
                        { label: 'Delete Key', action: 'delete-key', icon: 'bi-trash', danger: true }
                    ]
                }
            },
            sections,
            activeSection: 'Permissions'
        });

        // Stash references for action handlers + tests
        this.overviewSection = overviewSection;
        this.permissionsSection = permissionsSection;
        this.limitsSection = limitsSection;
        this.usageSection = usageSection;
    }

    // ── Actions ────────────────────────────────────────────

    async onActionEditKey() {
        const app = this.getApp();
        const resp = await app.showModelForm({
            title: `Edit API Key — ${this.model.get('name')}`,
            model: this.model,
            formConfig: ApiKeyForms.edit
        });
        if (resp) {
            await this.headerView?.render();
        }
        return true;
    }

    async onActionDeleteKey() {
        const app = this.getApp();
        const confirmed = await app.confirm({
            title: 'Delete API Key',
            message: `Permanently delete "${this.model.get('name')}"? This cannot be undone.`,
            confirmLabel: 'Delete',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;

        app.showLoading();
        const resp = await this.model.destroy();
        app.hideLoading();
        if (resp && resp.success !== false) {
            app.toast.success('API key deleted');
            this.emit('deleted', { model: this.model });
            const dialog = this.element?.closest('.modal');
            if (dialog) {
                const bsModal = window.bootstrap?.Modal?.getInstance(dialog);
                if (bsModal) bsModal.hide();
            }
        } else {
            app.toast.error('Failed to delete key');
        }
        return true;
    }
}

ApiKey.VIEW_CLASS = ApiKeyView;
export default ApiKeyView;
