/**
 * Fleet-wide edge blocklist administration (route: system/edge/blocklist).
 *
 * One edge protects every tenant, so rules are deliberately group-less and
 * every gate here is sys.-prefixed: the backend counts GLOBAL security grants
 * only, and a member-scoped grant must not light controls the server will
 * refuse. Log-first posture — rules start in Log, get watched in the edge
 * watch log (each line names the matching rule's id), then flip to Enforce.
 */

import TablePage from '@core/pages/TablePage.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import {
    BlocklistEntry, BlocklistEntryList, BlocklistKindOptions, BlocklistModeOptions,
    buildBlocklistPayload, classifyActionResponse
} from '@ext/admin/models/Edge.js';

const escapeHtml = MOJOUtils.escapeHtml;
const WRITE_PERMS = ['sys.manage_security', 'sys.security'];

const MODE_BADGES = { allow: 'bg-success', log: 'bg-info', off: 'bg-secondary', enforce: 'bg-danger' };
const modeLabel = value =>
    (BlocklistModeOptions.find(entry => entry.value === value)?.label || value).split(' — ')[0];

class BlocklistTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_edge_blocklist',
            pageName: 'Edge Blocklist',
            description: 'Fleet-wide — one edge protects every tenant. Create rules in Log, '
                + 'watch the edge watch log, then flip to Enforce. Changes converge in ~10 minutes.',
            router: 'admin/edge/blocklist',
            Collection: BlocklistEntryList,
            defaultQuery: { sort: '-created' },
            columns: [
                {
                    key: 'kind', label: 'Kind', width: '90px', sortable: true,
                    formatter: value => `<span class="badge bg-secondary bg-opacity-25 text-body text-uppercase">${escapeHtml(value)}</span>`,
                    filter: { type: 'select', options: BlocklistKindOptions }
                },
                {
                    key: 'value', label: 'Value', sortable: true,
                    formatter: value => `<span class="font-monospace">${escapeHtml(String(value ?? ''))}</span>`
                },
                {
                    key: 'mode', label: 'Mode', width: '110px', sortable: true,
                    formatter: value => `<span class="badge ${MODE_BADGES[value] || 'bg-secondary'}">${escapeHtml(modeLabel(value))}</span>`,
                    filter: { type: 'select', options: BlocklistModeOptions }
                },
                { key: 'note', label: 'Note', visibility: 'lg', formatter: "truncate(48)|default('—')" },
                { key: 'created|date', label: 'Created', width: '130px', sortable: true, visibility: 'xl' }
            ],
            searchable: true,
            searchPlaceholder: 'Search value or note',
            sortable: true,
            filterable: true,
            paginated: true,
            showRefresh: true,
            showAdd: false,
            showExport: false,
            emptyMessage: 'No blocklist rules. Add the first one in Log mode and watch before enforcing.',
            tableOptions: { striped: true, bordered: false, hover: true, responsive: false },
            toolbarButtons: [{
                label: 'Add rule', icon: 'bi bi-plus-lg', action: 'create-rule',
                variant: 'primary', permissions: WRITE_PERMS
            }],
            contextMenu: {
                items: [
                    {
                        label: 'Edit rule', icon: 'bi-pencil', permissions: WRITE_PERMS,
                        action: model => this.openRuleForm(model)
                    },
                    {
                        label: 'Delete rule', icon: 'bi-trash', danger: true, permissions: WRITE_PERMS,
                        action: model => this.deleteRule(model)
                    }
                ]
            }
        });
    }

    onActionCreateRule() {
        return this.openRuleForm(null);
    }

    async openRuleForm(existing = null) {
        if (!this.checkPermissions(WRITE_PERMS)) return true;
        const app = this.getApp();
        const fields = [
            {
                name: 'kind', type: 'select', label: 'Kind', columns: 4,
                options: BlocklistKindOptions, value: existing?.get?.('kind') || 'ip'
            },
            {
                name: 'value', type: 'text', label: 'Value', required: true, columns: 8,
                value: existing?.get?.('value') || '', placeholder: '198.51.100.0/24',
                help: 'IP: an address or CIDR, stored normalized. User agent: a case-insensitive '
                    + 'regex fragment — letters, digits and ()[]|?^.*+-/_\\ only.'
            },
            {
                name: 'mode', type: 'select', label: 'Mode', columns: 4,
                options: BlocklistModeOptions, value: existing?.get?.('mode') || 'log',
                help: 'Log first: watch the edge watch log (each line names the rule id), '
                    + 'then flip to Enforce. The fleet converges in ~10 minutes.'
            },
            {
                name: 'note', type: 'text', label: 'Note', columns: 8,
                value: existing?.get?.('note') || '', placeholder: 'Why this rule exists',
                attributes: { maxlength: 255 }
            }
        ];

        const result = await app.showForm({
            title: existing ? 'Edit blocklist rule' : 'Add blocklist rule',
            size: 'md', fields
        });
        if (!result) return true;

        let payload;
        try {
            payload = buildBlocklistPayload(result);
        } catch (error) {
            Modal.showError(error.message);
            return true;
        }

        const model = existing || new BlocklistEntry();
        app.showLoading?.();
        try {
            const response = await model.save(payload);
            const verdict = classifyActionResponse(response, model);
            if (!verdict.ok) {
                // A duplicate (kind, value) trips a DB unique constraint the
                // server reports as a bare "system error" (django-mojo #1621)
                // — say the likely cause instead of parroting it.
                const message = verdict.error === 'system error'
                    ? 'The rule was not saved — a rule with this kind and value may already exist.'
                    : (verdict.error || 'The rule was not saved.');
                Modal.showError(message);
                return true;
            }
            const refresh = await this.collection.fetch();
            if (!classifyActionResponse(refresh, this.collection).ok) {
                Modal.showError('The rule was saved, but the list could not be refreshed.');
                return true;
            }
            app.toast?.success(existing ? 'Rule updated' : 'Rule added');
        } finally {
            app.hideLoading?.();
        }
        return true;
    }

    async deleteRule(model) {
        if (!this.checkPermissions(WRITE_PERMS)) return true;
        const app = this.getApp();
        const confirmed = await app.confirm({
            title: 'Delete blocklist rule',
            message: `Delete the ${model.get('kind')} rule for ${model.get('value')}? `
                + 'The fleet stops rendering it within the convergence window.',
            confirmLabel: 'Delete rule', confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;

        app.showLoading?.();
        try {
            const response = await model.remove();
            const verdict = classifyActionResponse(response, model);
            if (!verdict.ok) {
                Modal.showError(verdict.error || 'The rule was not deleted.');
                return true;
            }
            const refresh = await this.collection.fetch();
            if (!classifyActionResponse(refresh, this.collection).ok) {
                Modal.showError('The rule was deleted, but the list could not be refreshed.');
                return true;
            }
            app.toast?.success('Rule deleted');
        } finally {
            app.hideLoading?.();
        }
        return true;
    }
}

export default BlocklistTablePage;
