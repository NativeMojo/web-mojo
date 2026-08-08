/**
 * DnsRecordsView - the live DNS record editor for one domain (#394).
 *
 * Mounted twice: as the Records section of DomainView, and under a domain
 * picker on the standalone `system/dns/records` page. One implementation, two
 * mounts — building the editor twice would guarantee drift.
 *
 * The records here are NOT a database mirror. `GET /api/dnsman/dns` reads the
 * provider zone live on every fetch, which is why there is no drift to
 * reconcile, no server-side search or paging (the type filter is applied
 * client-side), and no ids (DnsRecordList synthesises them).
 *
 * Writes go through a diff confirm, because both providers REPLACE the entire
 * record set: a user editing one value of a three-value set would otherwise
 * destroy the other two silently, and neither provider would complain.
 */

import View from '@core/View.js';
import TableView from '@core/views/table/TableView.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { DnsRecordList, registrar } from '@ext/admin/models/Dns.js';
import {
    DNS_RECORD_TYPES,
    isSpentAcmeChallenge,
    recordWarnings,
    diffRecordValues,
    normalizeRecordValues,
    recordKey,
    recordMutationSnapshot,
    recordSnapshotMatches,
    classifyRecordMutation
} from './dnsData.js';
import { dnsMutations } from './DnsMutationCoordinator.js';
import DnsRecordEditor from './DnsRecordEditor.js';

// Function-formatter output lands in cell.innerHTML raw — every provider-
// supplied string must be escaped on the way in.
const escapeHtml = MOJOUtils.escapeHtml;

const MANAGE_PERMS = ['manage_dns', 'security'];

class DnsRecordsView extends View {
    constructor(options = {}) {
        super({
            className: 'dns-records-view',
            template: `
                {{#blocked}}
                    <div class="card"><div class="card-body text-center py-4">
                        <div class="mb-2"><i class="bi {{blockedIcon}} fs-3 text-secondary"></i></div>
                        <h6 class="mb-1">{{blockedTitle}}</h6>
                        <p class="text-secondary small mb-0">{{blockedMessage}}</p>
                        {{#blockedRetry}}
                        <button class="btn btn-sm btn-outline-secondary mt-3" data-action="refresh">Try again</button>
                        {{/blockedRetry}}
                    </div></div>
                {{/blocked}}
                {{^blocked}}
                    <div data-container="records-table"></div>
                {{/blocked}}
            `,
            ...options
        });

        this.blocked = null;
        this.blockedIcon = 'bi-exclamation-triangle';
        this.blockedTitle = '';
        this.blockedMessage = '';
        this.blockedRetry = false;
        this.typeFilter = '';
        this.allRecords = [];
        this.caps = {};
    }

    get domain() {
        return this.model;
    }

    get zone() {
        return this.model ? String(this.model.get('name') || '') : '';
    }

    canManage() {
        return this.checkPermissions(MANAGE_PERMS);
    }

    async onInit() {
        this.collection = new DnsRecordList();

        this.tableView = new TableView({
            containerId: 'records-table',
            collection: this.collection,
            paginated: false,
            searchable: false,
            filterable: false,
            sortable: false,
            showRefresh: true,
            showExport: false,
            showAdd: this.canManage(),
            addButtonLabel: 'Add record',
            emptyMessage: 'This zone has no records yet.',
            tableOptions: { striped: true, bordered: false, hover: true, responsive: false },
            toolbarButtons: [
                {
                    label: 'All types', icon: 'bi bi-funnel', action: 'cycle-type-filter',
                    title: 'Filter by record type'
                }
            ],
            columns: [
                {
                    key: 'type', label: 'Type', width: '90px',
                    formatter: (value) => `<span class="badge bg-primary bg-opacity-75">${escapeHtml(value)}</span>`
                },
                {
                    key: 'name', label: 'Name',
                    formatter: (value) => `<span class="font-monospace small">${escapeHtml(this.shortName(value))}</span>`
                },
                {
                    key: 'record_values', label: 'Values',
                    formatter: (value, row) => this.renderValues(value, row)
                },
                { key: 'ttl', label: 'TTL', width: '80px', align: 'right' }
            ],
            rowContextMenu: {
                items: [
                    {
                        label: 'Edit', icon: 'bi-pencil', action: 'edit-record',
                        permissions: MANAGE_PERMS
                    },
                    { type: 'divider' },
                    {
                        label: 'Delete', icon: 'bi-trash', action: 'delete-record',
                        danger: true, permissions: MANAGE_PERMS
                    }
                ]
            }
        });
        this.tableView.onActionRefresh = () => this.refresh({ explicit: true });
        this.addChild(this.tableView);
    }

    /** Trim the zone suffix for display; the wire form stays fully qualified. */
    shortName(name) {
        const raw = String(name || '').toLowerCase().replace(/\.+$/, '');
        const zone = this.zone.toLowerCase().replace(/\.+$/, '');
        if (!zone) return raw;
        if (raw === zone) return '@';
        return raw.endsWith(`.${zone}`) ? raw.slice(0, -(zone.length + 1)) : raw;
    }

    renderValues(value, row) {
        const values = Array.isArray(value) ? value : [];
        const spent = isSpentAcmeChallenge(row && row.attributes ? row.attributes : row);
        const body = values
            .map(entry => `<div class="font-monospace small text-truncate" style="max-width:38rem">${escapeHtml(entry)}</div>`)
            .join('');
        if (!spent) return body || '<span class="text-secondary">—</span>';
        // GoDaddy cannot delete the last record of a type, so issuance
        // overwrites a spent challenge with this placeholder instead of
        // removing it. The row is inert and needs no action.
        return `${body}<span class="badge bg-secondary bg-opacity-25 text-secondary mt-1"
                 title="Spent ACME challenge — inert, no action needed">spent</span>`;
    }

    // ── Loading ────────────────────────────────────────────────────────

    async refresh(options = {}) {
        if (!this.model || !this.model.id) return null;
        this.caps = await registrar.capabilities();

        if (this.model.get('status') !== 'active') {
            this.setBlocked({
                icon: 'bi-clock-history',
                title: "Records aren't available yet",
                message: `This domain is ${this.model.get('status')}. The provider zone does not exist `
                    + 'until the registrar confirms, usually within a few minutes.'
            });
            return null;
        }

        const resp = await this.collection.fetch({ domain: this.model.id });
        if (resp && resp.success === false) {
            this.setBlocked({
                icon: 'bi-exclamation-triangle',
                // Render the server's message verbatim — its refusals are
                // specific (an unverified credential names itself) and any
                // friendlier text we invent will eventually be wrong.
                title: "Couldn't read the zone",
                message: (resp.data && resp.data.error) || resp.error || 'The provider did not answer.',
                retry: true
            });
            return null;
        }

        this.allRecords = this.collection.models.map(m => ({ ...m.attributes }));
        this.clearBlocked();
        this.applyFilter();
        if (options.explicit) dnsMutations.clearPrefix(`dns:${this.model.id}:`);
        return this.allRecords.map(record => ({ ...record }));
    }

    setBlocked({ icon, title, message, retry }) {
        this.blocked = true;
        this.blockedIcon = icon;
        this.blockedTitle = title;
        this.blockedMessage = message;
        this.blockedRetry = !!retry;
        this.render();
    }

    clearBlocked() {
        if (!this.blocked) return;
        this.blocked = null;
        this.render();
    }

    /** No server-side search on this endpoint — filter the loaded array. */
    applyFilter() {
        const filtered = this.typeFilter
            ? this.allRecords.filter(record => record.type === this.typeFilter)
            : this.allRecords;
        this.collection.reset(filtered);
        this.tableView?.render?.();
    }

    onActionRefresh() {
        return this.refresh({ explicit: true });
    }

    onActionCycleTypeFilter() {
        const present = [...new Set(this.allRecords.map(r => r.type))]
            .sort((a, b) => DNS_RECORD_TYPES.indexOf(a) - DNS_RECORD_TYPES.indexOf(b));
        const options = ['', ...present];
        const next = options[(options.indexOf(this.typeFilter) + 1) % options.length];
        this.typeFilter = next;
        this.applyFilter();
        return true;
    }

    // ── Editing ────────────────────────────────────────────────────────

    onActionAdd() {
        return this.openEditor(null);
    }

    onActionEditRecord(event, element, model) {
        return this.openEditor(this.recordFrom(model));
    }

    recordFrom(model) {
        if (!model) return null;
        return model.attributes ? { ...model.attributes } : { ...model };
    }

    async openEditor(record) {
        const app = this.getApp();
        const editor = new DnsRecordEditor({
            zone: this.zone,
            record,
            existing: this.allRecords,
            caps: this.caps
        });

        const result = await Modal.show(editor, {
            title: record ? `Edit ${record.type} record` : 'Add a record',
            size: 'lg',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', dismiss: true },
                { text: 'Save', action: 'save', class: 'btn-primary' }
            ]
        });
        if (result !== 'save') return true;

        const validation = editor.validate();
        if (!validation.ok) {
            // Belt and braces: the form disables Save, but a modal button is a
            // separate control and must not be the only thing standing between
            // an invalid payload and the provider.
            Modal.showError(validation.errors[0].message);
            return true;
        }

        const payload = editor.payload();
        const confirmed = await this.confirmWrite(payload, editor.before);
        if (!confirmed) return true;

        const key = `dns:${this.model.id}:${recordKey(payload)}`;
        if (dnsMutations.isLatched(key)) {
            Modal.showError('This record needs a successful Refresh before another change can be attempted.');
            return true;
        }
        const beforeSnapshot = recordMutationSnapshot(this.allRecords, payload);
        const current = await this.refresh();
        if (!current || !recordSnapshotMatches(beforeSnapshot, recordMutationSnapshot(current, payload))) {
            Modal.showError('The record set changed after confirmation. Review the refreshed values and confirm again.');
            return true;
        }

        app?.showLoading?.();
        let mutation;
        try {
            mutation = await this.collection.upsert(this.model.id, payload, {
                reconcile: () => this.refresh(),
                classify: observed => classifyRecordMutation(observed, {
                    before: beforeSnapshot,
                    target: payload
                })
            });
        } finally {
            app?.hideLoading?.();
        }

        if (mutation?.state === 'applied') {
            app?.toast?.success('Record saved');
        } else if (mutation?.refreshRequired || mutation?.state === 'unconfirmed') {
            Modal.showError('The provider result could not be confirmed. Refresh is required before another change.');
        } else {
            const response = mutation?.response;
            Modal.showError((response?.data && response.data.error) || 'The record was not applied.');
        }
        return true;
    }

    /**
     * The whole-set-replace guard. Shows exactly which values disappear, plus
     * any non-blocking warnings, and requires an explicit proceed.
     */
    async confirmWrite(payload, before) {
        const after = normalizeRecordValues(payload.record_values);
        const diff = diffRecordValues(before, after);
        const warnings = recordWarnings({
            type: payload.type,
            name: payload.name,
            values: after,
            before,
            ttl: payload.ttl,
            zone: this.zone,
            existingRecords: this.allRecords
        });

        if (!diff.removed.length && !warnings.length) return true;

        const lines = [];
        if (diff.removed.length) {
            lines.push(`<p class="mb-2">Saving replaces every value on <code>${escapeHtml(payload.type)} ${escapeHtml(payload.name)}</code>.</p>`);
            lines.push('<div class="border rounded overflow-hidden mb-2 font-monospace small">');
            diff.unchanged.forEach(v => lines.push(`<div class="px-2 py-1 text-secondary">= ${escapeHtml(v)}</div>`));
            diff.removed.forEach(v => lines.push(`<div class="px-2 py-1 text-danger bg-danger bg-opacity-10">&minus; ${escapeHtml(v)}</div>`));
            diff.added.forEach(v => lines.push(`<div class="px-2 py-1 text-success bg-success bg-opacity-10">+ ${escapeHtml(v)}</div>`));
            lines.push('</div>');
        }
        warnings.forEach(warning => {
            lines.push(`<div class="alert alert-warning py-2 px-3 small mb-2">
                <i class="bi bi-exclamation-triangle me-1"></i>${escapeHtml(warning)}</div>`);
        });

        return await Modal.confirm({
            title: 'Confirm this change',
            message: lines.join(''),
            html: true,
            confirmLabel: diff.removed.length
                ? `Replace ${diff.unchanged.length + diff.removed.length} ${diff.removed.length + diff.unchanged.length === 1 ? 'value' : 'values'} with ${after.length}`
                : 'Save record',
            confirmClass: diff.removed.length ? 'btn-warning' : 'btn-primary'
        });
    }

    async onActionDeleteRecord(event, element, model) {
        const record = this.recordFrom(model);
        if (!record) return true;
        const app = this.getApp();

        const warnings = recordWarnings({
            type: record.type,
            name: record.name,
            values: [],
            before: record.record_values,
            zone: this.zone,
            existingRecords: this.allRecords,
            deleting: true
        });

        const confirmed = await Modal.confirm({
            title: 'Delete this record',
            message: `<p class="mb-2">Delete <code>${escapeHtml(record.type)} ${escapeHtml(this.shortName(record.name))}</code>
                      and all ${(record.record_values || []).length} of its values?</p>`
                + warnings.map(w => `<div class="alert alert-warning py-2 px-3 small mb-2">
                       <i class="bi bi-exclamation-triangle me-1"></i>${escapeHtml(w)}</div>`).join(''),
            html: true,
            confirmLabel: 'Delete',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;

        const key = `dns:${this.model.id}:${recordKey(record)}`;
        if (dnsMutations.isLatched(key)) {
            Modal.showError('This record needs a successful Refresh before another change can be attempted.');
            return true;
        }
        const beforeSnapshot = recordMutationSnapshot(this.allRecords, record);
        const current = await this.refresh();
        if (!current || !recordSnapshotMatches(beforeSnapshot, recordMutationSnapshot(current, record))) {
            Modal.showError('The record set changed after confirmation. Review the refreshed values and confirm again.');
            return true;
        }

        app?.showLoading?.();
        let mutation;
        try {
            mutation = await this.collection.remove(this.model.id, {
                type: record.type, name: record.name
            }, {
                reconcile: () => this.refresh(),
                classify: observed => classifyRecordMutation(observed, {
                    before: beforeSnapshot,
                    target: record,
                    deleting: true
                })
            });
        } finally {
            app?.hideLoading?.();
        }

        if (mutation?.state === 'applied') {
            app?.toast?.success('Record deleted');
        } else if (mutation?.refreshRequired || mutation?.state === 'unconfirmed') {
            Modal.showError('The provider result could not be confirmed. Refresh is required before another change.');
        } else {
            // GoDaddy has no true delete: removing the last record of a type is
            // refused by the provider with a specific message. Show it as-is
            // rather than guessing at it client-side.
            const response = mutation?.response;
            Modal.showError((response?.data && response.data.error) || 'The record was not deleted.');
        }
        return true;
    }
}

export default DnsRecordsView;
