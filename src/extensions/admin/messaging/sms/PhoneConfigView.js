/**
 * PhoneConfigView - Detail / edit / test / delete view for a PhoneConfig row.
 *
 * Embeds a single FormView whose provider-conditional fields (Twilio, AWS,
 * Mojo) are driven by `showWhen` against the provider select. Secrets are
 * write-only — blank fields are stripped from the save body so existing
 * stored credentials are never accidentally cleared.
 *
 * Actions:
 *   - Save              → POST /api/phonehub/config/<id> with scalars + filled secrets
 *   - Test connection   → POST /api/phonehub/config/<id>  {test_connection: 1}
 *   - Provision API key → opens a tailored ApiKey create flow (mojo provider only)
 *   - Delete            → DELETE /api/phonehub/config/<id>
 */

import View from '@core/View.js';
import FormView from '@core/forms/FormView.js';
import Modal from '@core/views/feedback/Modal.js';
import { GroupList } from '@core/models/Group.js';
import { ApiKey } from '@core/models/ApiKey.js';
import { PhoneConfig, PhoneConfigForms } from '@ext/admin/models/Phonehub.js';

const PROVIDER_LABELS = { twilio: 'Twilio', aws: 'AWS SNS', mojo: 'Mojo Remote' };
const PROVIDER_BADGES = { twilio: 'bg-info',  aws: 'bg-warning',  mojo: 'bg-primary' };

class PhoneConfigView extends View {
    constructor(options = {}) {
        super({
            className: 'phone-config-view',
            ...options
        });

        this.model = options.model || new PhoneConfig(options.data || {});
        this.collection = options.collection || null;

        // Inline result banners; rendered via getters so we can toggle without
        // a full render of the embedded FormView (which would reset typing).
        this._resultTone = null;   // 'success' | 'danger' | null
        this._resultMessage = '';

        this.template = `
            <div class="phone-config-view-container">

                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 text-primary">
                            <i class="bi bi-sliders"></i>
                        </div>
                        <div>
                            <h3 class="mb-1">{{model.name|default('New Phone Config')}}</h3>
                            <div class="text-muted small">
                                <span class="badge {{providerBadge}}">{{providerLabel}}</span>
                                <span class="mx-2">·</span>
                                Group: <strong>{{groupName}}</strong>
                                {{#model.id}}
                                <span class="mx-2">·</span>
                                ID: {{model.id}}
                                {{/model.id}}
                            </div>
                            <div class="mt-1 small">
                                <span class="badge {{activeBadge}}">{{activeLabel}}</span>
                                {{#model.test_mode|bool}}
                                <span class="badge bg-warning ms-1">Test Mode</span>
                                {{/model.test_mode|bool}}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Result banner (Test connection / Save errors) -->
                {{#hasResult|bool}}
                <div class="alert alert-{{resultTone}} py-2 mb-3" role="status">
                    {{resultMessage}}
                </div>
                {{/hasResult|bool}}

                <!-- Editable form -->
                <div data-container="config-form"></div>

                <!-- Action row -->
                <div class="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                    <div>
                        {{#canDelete|bool}}
                        <button type="button" class="btn btn-outline-danger" data-action="delete-config">
                            <i class="bi bi-trash me-1"></i> Delete
                        </button>
                        {{/canDelete|bool}}
                    </div>
                    <div class="d-flex gap-2">
                        {{#showProvision|bool}}
                        <button type="button" class="btn btn-outline-primary" data-action="provision-api-key">
                            <i class="bi bi-key me-1"></i> Provision downstream API key
                        </button>
                        {{/showProvision|bool}}
                        {{#canTest|bool}}
                        <button type="button" class="btn btn-outline-secondary" data-action="test-connection">
                            <i class="bi bi-plug me-1"></i> Test connection
                        </button>
                        {{/canTest|bool}}
                        <button type="button" class="btn btn-primary" data-action="save-config">
                            <i class="bi bi-check2 me-1"></i> Save
                        </button>
                    </div>
                </div>

            </div>
        `;
    }

    // ── Template computed properties ─────────────────────────

    get providerLabel() {
        const p = this.model?.get?.('provider');
        return PROVIDER_LABELS[p] || (p ? String(p) : 'Unset');
    }

    get providerBadge() {
        const p = this.model?.get?.('provider');
        return PROVIDER_BADGES[p] || 'bg-secondary';
    }

    get groupName() {
        const g = this.model?.get?.('group');
        if (!g) return 'System Default';
        if (typeof g === 'object') return g.name || `#${g.id}`;
        return `#${g}`;
    }

    get activeLabel() {
        return this.model?.get?.('is_active') ? 'Active' : 'Inactive';
    }

    get activeBadge() {
        return this.model?.get?.('is_active') ? 'bg-success' : 'bg-secondary';
    }

    get hasResult() {
        return !!this._resultMessage;
    }

    get resultTone() {
        return this._resultTone || 'secondary';
    }

    get resultMessage() {
        return this._resultMessage || '';
    }

    get canTest() {
        return !!this.model?.get?.('id');
    }

    get canDelete() {
        return !!this.model?.get?.('id');
    }

    get showProvision() {
        if (this.model?.get?.('provider') !== 'mojo') return false;
        const u = this.getApp()?.activeUser;
        if (!u) return false;
        if (u.get?.('is_superuser')) return true;
        return !!u.hasPermission?.(['manage_groups', 'manage_group']);
    }

    // ── Lifecycle ────────────────────────────────────────────

    async onInit() {
        this.formView = new FormView({
            containerId: 'config-form',
            model: this.model,
            formConfig: {
                fields: PhoneConfigForms.edit.fields,
                submitButton: false,
                resetButton: false
            }
        });
        this.addChild(this.formView);
    }

    // ── Helpers ──────────────────────────────────────────────

    _setResult(tone, message) {
        this._resultTone = tone || null;
        this._resultMessage = message || '';
        // Toggle banner without re-rendering the form (preserves user typing).
        this.render();
    }

    _clearResult() {
        if (this._resultMessage) this._setResult(null, '');
    }

    /**
     * Strip empty secret fields so blank password inputs never overwrite a
     * stored credential on the server. The provider switcher already hides
     * non-matching credentials (FormView omits hidden showWhen fields from
     * getFormData) — this is the second line of defence for the active
     * provider's blanks.
     */
    _stripBlankSecrets(data) {
        const out = { ...data };
        for (const key of PhoneConfig.SECRET_FIELDS) {
            const v = out[key];
            if (v === '' || v === null || v === undefined) delete out[key];
        }
        return out;
    }

    /**
     * Pull formatted error text from a save response. Backend errors arrive
     * as `{ status: false, error: '...' }` inside `resp.data` for save, or as
     * `{ success: bool, message, error }` inline for `test_connection`.
     */
    _readError(resp, fallback = 'Operation failed') {
        if (!resp) return fallback;
        if (resp.success === false) return resp.error || fallback;
        const d = resp.data || resp;
        return d?.error || d?.message || fallback;
    }

    // ── Actions ──────────────────────────────────────────────

    async onActionSaveConfig(event) {
        event?.preventDefault?.();
        this._clearResult();

        if (!this.formView?.validate?.()) {
            this.formView?.focusFirstError?.();
            return;
        }

        let data;
        try {
            data = await this.formView.getFormData();
        } catch (e) {
            this._setResult('danger', e.message || 'Could not collect form values');
            return;
        }

        const payload = this._stripBlankSecrets(data);
        const isNew = !this.model.get('id');
        const app = this.getApp();

        app?.showLoading?.();
        let resp;
        try {
            resp = await this.model.save(payload);
        } finally {
            app?.hideLoading?.();
        }

        const ok = resp?.success && resp?.data?.status;
        if (!ok) {
            this._setResult('danger', this._readError(resp, 'Save failed'));
            return;
        }

        app?.toast?.success?.('Phone Config saved');
        if (isNew && this.collection && !this.collection.get?.(this.model.id)) {
            this.collection.add(this.model);
        }
        this.emit('phone-config:saved', { model: this.model });
        await this.render();
    }

    async onActionTestConnection(event, element) {
        event?.preventDefault?.();
        this._clearResult();

        // Prevent re-entry while in-flight; the button is recreated on every
        // render so we lean on the element's disabled flag for the spinner.
        if (element) {
            element.disabled = true;
            element.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Testing…';
        }

        let resp;
        try {
            resp = await this.model.save({ test_connection: 1 });
        } catch (e) {
            this._setResult('danger', e?.message || 'Test connection failed');
            return;
        }

        const body = resp?.data ?? resp;
        const inner = body?.data ?? body;
        const success = inner?.success === true || body?.status === true && inner?.success !== false;

        if (success) {
            this._setResult('success', inner?.message || 'Connection OK');
        } else {
            const msg = inner?.error || inner?.message || body?.error || 'Connection test failed';
            this._setResult('danger', msg);
        }
    }

    async onActionDeleteConfig(event) {
        event?.preventDefault?.();

        const name = this.model.get('name') || 'this configuration';
        const confirmed = await Modal.confirm(
            `Permanently delete "${name}"? Any SMS routes that depend on it will stop working.`,
            'Delete Phone Config',
            { confirmClass: 'btn-danger', confirmText: 'Delete' }
        );
        if (!confirmed) return;

        const app = this.getApp();
        app?.showLoading?.();
        let resp;
        try {
            resp = await this.model.destroy();
        } finally {
            app?.hideLoading?.();
        }

        if (resp && resp.success !== false) {
            app?.toast?.success?.('Phone Config deleted');
            this.emit('phone-config:deleted', { model: this.model });
        } else {
            this._setResult('danger', this._readError(resp, 'Delete failed'));
        }
    }

    async onActionProvisionApiKey(event) {
        event?.preventDefault?.();
        if (!this.showProvision) return;

        const app = this.getApp();
        const presetGroup = (() => {
            const g = this.model.get('group');
            if (!g) return null;
            return typeof g === 'object' ? g.id : g;
        })();

        // Tailored, single-purpose form — operators don't get a free-form
        // permissions JSON box for the bridge flow.
        const formResult = await app.showForm({
            title: 'Provision downstream API key',
            size: 'md',
            submitText: 'Create key',
            fields: [
                { name: 'name', type: 'text', label: 'Key name', required: true,
                  placeholder: 'sms-bridge', columns: 12,
                  help: 'A descriptive label so you can identify this key later.' },
                { type: 'collection', name: 'group', label: 'Group (owner of the key)',
                  Collection: GroupList, labelField: 'name', valueField: 'id',
                  placeholder: 'Search groups…', columns: 12,
                  value: presetGroup,
                  help: 'The group whose SMS budget and audit trail this key bills against.' },
                { type: 'html', columns: 12,
                  html: `<div class="alert alert-info py-2 small mb-0">
                    <i class="bi bi-info-circle me-1"></i>
                    Permissions are fixed for this flow: <code>send_sms</code> + <code>comms</code>.
                    The raw token is shown <strong>once</strong> on the next screen — copy it then.
                  </div>` }
            ]
        });
        if (!formResult) return;
        if (!formResult.group) {
            app?.toast?.error?.('Select a group for the new API key.');
            return;
        }

        const apiKey = new ApiKey();
        app?.showLoading?.();
        let resp;
        try {
            resp = await apiKey.save({
                name: formResult.name,
                group: formResult.group,
                permissions: { send_sms: true, comms: true }
            });
        } finally {
            app?.hideLoading?.();
        }

        const ok = resp?.success && resp?.data?.status;
        if (!ok) {
            const err = resp?.data?.error || resp?.error || 'Failed to create API key';
            app?.toast?.error?.(err);
            return;
        }

        const token = resp?.data?.data?.token;
        await Modal.alert({
            title: 'API Key Created — Save Your Token',
            type: token ? 'warning' : 'success',
            size: 'lg',
            backdrop: 'static',
            keyboard: false,
            html: token
                ? `<p class="mb-2">Paste this into the downstream PhoneConfig's <strong>Mojo API Key</strong> field. It will not be shown again.</p>
                   <div class="bg-body-tertiary border rounded p-3 d-flex align-items-center gap-2">
                     <code class="font-monospace flex-grow-1 user-select-all" style="word-break:break-all;">${token}</code>
                     <button type="button"
                             class="btn btn-sm btn-outline-secondary"
                             data-action="copy-to-clipboard"
                             data-clipboard="${token}"
                             title="Copy to clipboard">
                       <i class="bi bi-clipboard"></i>
                     </button>
                   </div>`
                : '<p class="mb-0">API key created. The server did not return a raw token — locate the key under System &rarr; API Keys.</p>'
        });
    }
}

PhoneConfigView.MODEL_CLASS = PhoneConfig;
PhoneConfig.VIEW_CLASS = PhoneConfigView;

export default PhoneConfigView;
