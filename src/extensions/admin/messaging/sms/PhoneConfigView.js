/**
 * PhoneConfigView - Detail view for a PhoneConfig row.
 *
 * Read-only record display (mirrors ApiKeyView): header with identity +
 * badges, a list-group of detail sections, and a three-dots context menu
 * for all mutations. Editing opens a separate modal form (PhoneConfigForms
 * .edit) whose provider-conditional `showWhen` fields switch the visible
 * credential block. Secrets are write-only — blank password inputs are
 * stripped from the save body so a stored credential is never cleared.
 *
 * Context-menu actions:
 *   - Edit                → Modal form, then save
 *   - Test connection     → POST {test_connection: 1}, result shown inline
 *   - Provision API key   → mojo-only one-time downstream API-key flow
 *   - Delete              → DELETE /api/phonehub/config/<id>
 */

import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { GroupList } from '@core/models/Group.js';
import { ApiKey } from '@core/models/ApiKey.js';
import { PhoneConfig, PhoneConfigForms } from '@ext/admin/models/Phonehub.js';

const PROVIDER_LABELS = { twilio: 'Twilio', aws: 'AWS SNS', mojo: 'Mojo Remote' };
const PROVIDER_BADGES = { twilio: 'bg-info', aws: 'bg-warning', mojo: 'bg-primary' };

// Friendly prose for test_connection error codes — never surface the raw
// machine code to the operator.
const TEST_ERROR_LABELS = {
    missing_credentials: 'Missing credentials — fill in the provider credentials and save first.',
    invalid_credentials: 'Invalid credentials — the provider rejected the configured keys.',
    timeout: 'Connection timed out.',
    connection_failed: 'Could not reach the provider.',
    config_error: 'Configuration error.',
    remote_error: 'The remote mojo returned an error.',
    remote_failed: 'The remote mojo request failed.'
};

class PhoneConfigView extends View {
    constructor(options = {}) {
        super({
            className: 'phone-config-view',
            ...options
        });

        this.model = options.model || new PhoneConfig(options.data || {});
        this.collection = options.collection || null;

        // Inline test-connection result banner state.
        this._resultTone = null;     // 'success' | 'danger' | null
        this._resultMessage = '';

        this.template = `
            <div class="phone-config-view-container">

                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 text-primary">
                            <i class="bi bi-sliders"></i>
                        </div>
                        <div>
                            <h3 class="mb-1">{{model.name|default('Unnamed Config')}}</h3>
                            <div class="text-muted small">
                                <span class="badge {{providerBadge}}">{{providerLabel}}</span>
                                <span class="mx-2">·</span>
                                Group: <strong>{{groupName}}</strong>
                                {{#model.id}}
                                <span class="mx-2">·</span>
                                ID: {{model.id}}
                                {{/model.id}}
                            </div>
                            <div class="mt-1">
                                <span class="badge {{activeBadge}}">{{activeLabel}}</span>
                                {{#model.test_mode|bool}}
                                <span class="badge bg-warning ms-1">Test Mode</span>
                                {{/model.test_mode|bool}}
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-items-start gap-4">
                        <div data-container="phone-config-context-menu"></div>
                    </div>
                </div>

                <!-- Test-connection result -->
                {{#hasResult|bool}}
                <div class="alert alert-{{resultTone}} d-flex align-items-center py-2 mb-3" role="status">
                    <i class="bi {{resultIcon}} me-2"></i>
                    <span>{{resultMessage}}</span>
                </div>
                {{/hasResult|bool}}

                <!-- Detail sections -->
                <div class="list-group mb-1">
                    <div class="list-group-item">
                        <h6 class="text-muted text-uppercase small mb-2">Configuration</h6>
                        <dl class="row mb-0 small">
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Provider</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{providerLabel}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Group</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{groupName}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Active</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{model.is_active|yesno}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Test mode</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{model.test_mode|yesno}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Lookup</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{model.lookup_enabled|yesno}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Lookup cache</dt>
                            <dd class="col-7 col-sm-8 mb-0">{{lookupCacheText}}</dd>
                        </dl>
                    </div>

                    <div class="list-group-item">
                        <h6 class="text-muted text-uppercase small mb-2">{{providerLabel}} settings</h6>
                        <dl class="row mb-0 small">
                            {{#providerRows}}
                            <dt class="col-5 col-sm-4 fw-normal text-muted">{{label}}</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{value}}</dd>
                            {{/providerRows}}
                        </dl>
                        <p class="text-muted small mb-0 mt-1">
                            <i class="bi bi-shield-lock me-1"></i>
                            Credentials are write-only — edit the config to update them.
                        </p>
                    </div>

                    <div class="list-group-item">
                        <h6 class="text-muted text-uppercase small mb-2">Metadata</h6>
                        <dl class="row mb-0 small">
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Created</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{model.created|datetime}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Modified</dt>
                            <dd class="col-7 col-sm-8 mb-0">{{model.modified|datetime}}</dd>
                        </dl>
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

    get lookupCacheText() {
        const d = this.model?.get?.('lookup_cache_days');
        return (d || d === 0) ? `${d} days` : '—';
    }

    /** Provider-specific non-secret fields, as label/value rows. */
    get providerRows() {
        const m = this.model;
        const val = (k) => {
            const v = m?.get?.(k);
            return (v === null || v === undefined || v === '') ? '—' : String(v);
        };
        switch (m?.get?.('provider')) {
            case 'twilio':
                return [{ label: 'From number', value: val('twilio_from_number') }];
            case 'aws':
                return [
                    { label: 'Region', value: val('aws_region') },
                    { label: 'Sender ID', value: val('aws_sender_id') }
                ];
            case 'mojo':
                return [{ label: 'Remote URL', value: val('mojo_remote_url') }];
            default:
                return [];
        }
    }

    get hasResult() {
        return !!this._resultMessage;
    }

    get resultTone() {
        return this._resultTone || 'secondary';
    }

    get resultIcon() {
        return this._resultTone === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle';
    }

    get resultMessage() {
        return this._resultMessage || '';
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
        const items = [
            { label: 'Edit', action: 'edit-config', icon: 'bi-pencil' },
            { label: 'Test connection', action: 'test-connection', icon: 'bi-plug' }
        ];
        if (this.showProvision) {
            items.push({ label: 'Provision downstream API key', action: 'provision-api-key', icon: 'bi-key' });
        }
        items.push({ type: 'divider' });
        items.push({ label: 'Delete', action: 'delete-config', icon: 'bi-trash', danger: true });

        const ctxMenu = new ContextMenu({
            containerId: 'phone-config-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items
            }
        });
        this.addChild(ctxMenu);
    }

    // ── Helpers ──────────────────────────────────────────────

    _setResult(tone, message) {
        this._resultTone = tone || null;
        this._resultMessage = message || '';
        this.render();
    }

    _clearResult() {
        if (this._resultMessage) {
            this._resultTone = null;
            this._resultMessage = '';
        }
    }

    /**
     * Strip empty secret fields so a blank password input never overwrites a
     * stored credential. Hidden showWhen fields for the non-active provider
     * are already omitted by FormView.getFormData().
     */
    _stripBlankSecrets(data) {
        const out = { ...data };
        for (const key of PhoneConfig.SECRET_FIELDS) {
            const v = out[key];
            if (v === '' || v === null || v === undefined) delete out[key];
        }
        return out;
    }

    _readError(resp, fallback = 'Operation failed') {
        if (!resp) return fallback;
        if (resp.success === false) return resp.error || fallback;
        const d = resp.data || resp;
        return d?.error || d?.message || fallback;
    }

    // ── Actions ──────────────────────────────────────────────

    async onActionEditConfig() {
        const app = this.getApp();
        // Modal.form returns the collected data (showWhen-hidden fields already
        // stripped) without saving — so we can strip blank secrets before save.
        const data = await app.showForm({
            title: `Edit — ${this.model.get('name') || 'Phone Config'}`,
            model: this.model,
            fields: PhoneConfigForms.edit.fields,
            size: 'lg',
            submitText: 'Save'
        });
        if (!data) return;

        const payload = this._stripBlankSecrets(data);
        app?.showLoading?.();
        let resp;
        try {
            resp = await this.model.save(payload);
        } finally {
            app?.hideLoading?.();
        }

        if (resp?.success && resp?.data?.status) {
            app?.toast?.success?.('Phone Config saved');
            this._clearResult();
            this.emit('phone-config:saved', { model: this.model });
            await this.render();
        } else {
            app?.showError?.(this._readError(resp, 'Save failed'));
        }
    }

    async onActionTestConnection() {
        const app = this.getApp();
        this._clearResult();
        app?.showLoading?.('Testing connection…');

        let resp;
        try {
            resp = await this.model.save({ test_connection: 1 });
        } catch (e) {
            app?.hideLoading?.();
            this._setResult('danger', e?.message || 'Test connection failed');
            return;
        }
        app?.hideLoading?.();

        const body = resp?.data ?? resp;
        const result = (body && typeof body.data === 'object' && body.data) ? body.data : body;

        if (result?.success === true) {
            this._setResult('success', result.message || 'Connection OK');
        } else {
            const code = result?.error;
            const friendly = code && TEST_ERROR_LABELS[code];
            this._setResult('danger', result?.message || friendly || code || 'Connection test failed');
        }
    }

    async onActionDeleteConfig() {
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
            app?.showError?.(this._readError(resp, 'Delete failed'));
        }
    }

    async onActionProvisionApiKey() {
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
        const tokenEscaped = token ? MOJOUtils.escapeHtml(token) : '';
        await Modal.alert({
            title: 'API Key Created — Save Your Token',
            type: token ? 'warning' : 'success',
            size: 'lg',
            backdrop: 'static',
            keyboard: false,
            html: token
                ? `<p class="mb-2">Paste this into the downstream PhoneConfig's <strong>Mojo API Key</strong> field. It will not be shown again.</p>
                   <div class="bg-body-tertiary border rounded p-3 d-flex align-items-center gap-2">
                     <code class="font-monospace flex-grow-1 user-select-all" style="word-break:break-all;">${tokenEscaped}</code>
                     <button type="button"
                             class="btn btn-sm btn-outline-secondary"
                             data-action="copy-to-clipboard"
                             data-clipboard="${tokenEscaped}"
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
