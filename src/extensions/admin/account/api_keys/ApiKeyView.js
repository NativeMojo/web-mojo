/**
 * ApiKeyView - Group-scoped API key detail view built on the DetailView primitive.
 *
 * Sections:
 *   Overview     — key facts (ID, group, created, last used) + token note
 *   Permissions  — autosave tabset (ApiKey.permissionTabset()); an API key
 *                  "acts as" a member of its group, so it offers the Group
 *                  Member permission catalog (ITEM-025) plus a Federation tab
 *                  that exists only on keys
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
// One autosaving FormView over the live ApiKey.permissionTabset() — the
// MemberPermissionsSection shape plus a Federation tab only keys get. Each
// switch saves a flat dotted `permissions.<name>` boolean; permissions outside
// the catalog are never shown and never touched.
//
// A failed save needs no handling here: FormView.executeBatchSave already
// toasts the server error and calls revertFields(), so a 403 on a protected
// federation permission snaps the switch back to its persisted value.

class ApiKeyPermissionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'api-key-permissions-section',
            template: `
                <div class="detail-section-eyebrow">API key permissions</div>
                <p class="text-secondary small mb-3">
                    Grants this key can exercise — the catalog a group member
                    can hold, plus federation grants unique to keys. Toggles
                    autosave as soon as you flip them.
                </p>
                <div data-container="apikey-perms"></div>
            `,
            ...options
        });
    }

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
