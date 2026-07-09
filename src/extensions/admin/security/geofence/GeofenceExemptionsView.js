/**
 * GeofenceExemptionsView - "Exemptions" tab: the auditor's "who is exempt"
 * surface, always shown with reason and expiry.
 *
 *  (a) Network ranges — the GEOFENCE_ALLOWLIST setting via GET/POST
 *      /api/geo/allowlist. POST is a full replace; the view mutates its local
 *      copy and re-posts the whole list, then refetches so it never edits
 *      stale state. Expired entries render inactive, never hidden.
 *  (b) Individual IPs — GeoLocatedIP whitelist rows (read from the same GET);
 *      whitelist/unwhitelist ride the standard geoip magic-field actions.
 *  (c) Bypass holders — read-only GET /api/geo/bypass_holders (permission
 *      grants + superusers; capped at 200).
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import dataFormatter from '@core/utils/DataFormatter.js';
import { GeoLocatedIP } from '@core/models/System.js';
import { GEOFENCE_MANAGE_PERMS } from './geofenceData.js';

function untilText(until) {
    if (!until) return 'Never';
    try { return dataFormatter.pipe(until, 'datetime') || String(until); } catch { return String(until); }
}

/** datetime-local input value → ISO string (null when empty/invalid). */
function toIso(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

class GeofenceExemptionsView extends View {
    constructor(options = {}) {
        super({
            className: 'geofence-exemptions-view',
            template: `
                <div class="alert alert-info small d-flex gap-2">
                    <i class="bi bi-shield-exclamation fs-6"></i>
                    <div>Exemptions are compliance-sensitive. Every entry shows <b>who it covers, why, and until when</b> —
                    and any exemption that bypasses a block is recorded in the audit trail.</div>
                </div>

                <div class="card mb-3">
                    <div class="card-header d-flex align-items-center">
                        <span class="fw-semibold">Network ranges (allowlist)</span>
                        {{#canManage|bool}}
                        <button type="button" class="btn btn-primary btn-sm ms-auto" data-action="add-range">
                            <i class="bi bi-plus-lg me-1"></i>Add range
                        </button>
                        {{/canManage|bool}}
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm align-middle mb-0 geofence-exempt-table">
                            <thead><tr>
                                <th>Range</th><th>Reason</th><th>Expires</th><th>Status</th>{{#canManage|bool}}<th></th>{{/canManage|bool}}
                            </tr></thead>
                            <tbody>
                                {{#allowRows}}
                                <tr class="{{.rowClass}}">
                                    <td><code>{{.cidr}}</code></td>
                                    <td>{{.reason}}</td>
                                    <td>{{.untilText}}</td>
                                    <td><span class="badge {{.pillClass}}">{{.pillLabel}}</span></td>
                                    {{#canManage|bool}}
                                    <td class="text-end text-nowrap">
                                        <button type="button" class="btn btn-link btn-sm px-1" data-action="edit-range" data-index="{{.index}}">Edit</button>
                                        <button type="button" class="btn btn-link btn-sm px-1 text-danger" data-action="remove-range" data-index="{{.index}}">Remove</button>
                                    </td>
                                    {{/canManage|bool}}
                                </tr>
                                {{/allowRows}}
                            </tbody>
                        </table>
                        {{^allowRows}}<div class="text-secondary small p-3">No network exemptions.</div>{{/allowRows}}
                    </div>
                    <div class="card-footer small py-2 d-flex flex-wrap gap-2">
                        <span class="text-secondary">Allowlisted addresses pass <b>every</b> rule, including VPN and Tor checks. Expired entries stay listed until removed.</span>
                        <span class="geofence-allowlist-status text-danger ms-auto"></span>
                    </div>
                </div>

                <div class="card mb-3">
                    <div class="card-header d-flex align-items-center">
                        <span class="fw-semibold">Individual IPs</span>
                        {{#canManage|bool}}
                        <button type="button" class="btn btn-outline-secondary btn-sm ms-auto" data-action="whitelist-ip">Whitelist an IP…</button>
                        {{/canManage|bool}}
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm align-middle mb-0 geofence-exempt-table">
                            <thead><tr>
                                <th>IP address</th><th>Reason</th><th>Expires</th><th>Status</th>{{#canManage|bool}}<th></th>{{/canManage|bool}}
                            </tr></thead>
                            <tbody>
                                {{#ipRows}}
                                <tr class="{{.rowClass}}">
                                    <td><code>{{.ip}}</code></td>
                                    <td>{{.reason}}</td>
                                    <td>{{.untilText}}</td>
                                    <td><span class="badge {{.pillClass}}">{{.pillLabel}}</span></td>
                                    {{#canManage|bool}}
                                    <td class="text-end">
                                        <button type="button" class="btn btn-link btn-sm px-1 text-danger" data-action="unwhitelist-ip" data-ip="{{.ip}}">Remove</button>
                                    </td>
                                    {{/canManage|bool}}
                                </tr>
                                {{/ipRows}}
                            </tbody>
                        </table>
                        {{^ipRows}}<div class="text-secondary small p-3">No individually whitelisted IPs.</div>{{/ipRows}}
                    </div>
                    <div class="card-footer text-secondary small py-2">
                        Whitelisting takes a reason and an optional expiry. Full IP management lives on the
                        <a href="?page=system/system/geoip">IPs page</a>.
                    </div>
                </div>

                <div class="card">
                    <div class="card-header d-flex align-items-center">
                        <span class="fw-semibold">Users who bypass geofencing</span>
                        <span class="geofence-eyebrow ms-auto">read-only</span>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm align-middle mb-0 geofence-exempt-table">
                            <thead><tr><th>User</th><th>Status</th><th>Source</th></tr></thead>
                            <tbody>
                                {{#holderRows}}
                                <tr>
                                    <td>{{.username}}</td>
                                    <td><span class="badge {{.statusClass}}">{{.statusLabel}}</span></td>
                                    <td><span class="badge {{.sourceClass}}">{{.sourceLabel}}</span></td>
                                </tr>
                                {{/holderRows}}
                            </tbody>
                        </table>
                        {{^holderRows}}<div class="text-secondary small p-3">No users hold a geofence bypass.</div>{{/holderRows}}
                    </div>
                    <div class="card-footer text-secondary small py-2">
                        {{holdersFootnote}} Grants are managed on user records, not here.
                    </div>
                </div>
            `,
            ...options
        });

        this._allowlist = [];
        this.allowRows = [];
        this.ipRows = [];
        this.holderRows = [];
        this.holdersFootnote = '';
        this.canManage = false;
    }

    /** Re-pull the allowlist + bypass holders and re-render. */
    async refresh() {
        this.canManage = this.checkPermissions(GEOFENCE_MANAGE_PERMS);
        const rest = this.getApp()?.rest;
        if (!rest) return;

        const [allowResp, bypassResp] = await Promise.all([
            rest.GET('/api/geo/allowlist').catch(() => null),
            rest.GET('/api/geo/bypass_holders').catch(() => null)
        ]);

        const allow = allowResp?.success ? (allowResp.data?.data || {}) : {};
        this._allowlist = (allow.setting || []).map(e => ({
            cidr: e.cidr, reason: e.reason || '', until: e.until || null, active: e.active !== false
        }));
        this.allowRows = this._allowlist.map((e, index) => ({
            index,
            cidr: e.cidr,
            reason: e.reason || '—',
            untilText: untilText(e.until),
            rowClass: e.active ? '' : 'geofence-row-expired',
            pillClass: e.active ? 'text-bg-success' : 'text-bg-secondary',
            pillLabel: e.active ? 'Active' : 'Expired'
        }));

        this.ipRows = (allow.geoip || []).map(e => ({
            ip: e.ip,
            reason: e.reason || '—',
            untilText: untilText(e.until),
            rowClass: e.active !== false ? '' : 'geofence-row-expired',
            pillClass: e.active !== false ? 'text-bg-success' : 'text-bg-secondary',
            pillLabel: e.active !== false ? 'Active' : 'Expired'
        }));

        const bypass = bypassResp?.success ? (bypassResp.data?.data || {}) : {};
        this.holderRows = (bypass.holders || []).map(h => ({
            username: h.username,
            statusClass: h.is_active ? 'text-bg-success' : 'text-bg-secondary',
            statusLabel: h.is_active ? 'Active' : 'Inactive',
            sourceClass: h.source === 'superuser' ? 'text-bg-primary' : 'text-bg-info',
            sourceLabel: h.source === 'superuser' ? 'Superuser' : 'Permission grant'
        }));
        this.holdersFootnote = bypass.capped
            ? `Showing the first ${this.holderRows.length} (list capped).`
            : `Showing all ${this.holderRows.length}.`;

        await this.render();
    }

    // ── Network ranges ─────────────────────────────────────

    _rangeFields() {
        return [
            { name: 'cidr', type: 'text', label: 'Range (CIDR or IP)', placeholder: '198.51.100.0/24', required: true, columns: 12 },
            { name: 'reason', type: 'text', label: 'Reason', placeholder: 'Office egress — Seattle HQ', required: true, columns: 12 },
            { name: 'until', type: 'datetime', label: 'Expires (optional)', help: 'Leave empty for a permanent exemption.', columns: 12 }
        ];
    }

    async onActionAddRange() {
        const data = await Modal.form({ title: 'Add network exemption', fields: this._rangeFields(), submitText: 'Add' });
        if (!data) return true;
        const entries = [...this._allowlist, { cidr: data.cidr, reason: data.reason, until: toIso(data.until) }];
        await this._saveAllowlist(entries);
        return true;
    }

    async onActionEditRange(event, element) {
        const index = Number(element?.dataset?.index);
        const entry = this._allowlist[index];
        if (!entry) return true;
        const data = await Modal.form({
            title: 'Edit network exemption',
            fields: this._rangeFields(),
            data: { cidr: entry.cidr, reason: entry.reason, until: entry.until || '' },
            submitText: 'Save'
        });
        if (!data) return true;
        const entries = [...this._allowlist];
        entries[index] = { cidr: data.cidr, reason: data.reason, until: toIso(data.until) };
        await this._saveAllowlist(entries);
        return true;
    }

    async onActionRemoveRange(event, element) {
        const index = Number(element?.dataset?.index);
        const entry = this._allowlist[index];
        if (!entry) return true;
        const ok = await Modal.confirm(
            // Modal.confirm interpolates into HTML — escape the server-sourced value.
            `Remove the exemption for ${MOJOUtils.escapeHtml(String(entry.cidr))}? Requests from this range will be evaluated against the rules again immediately.`,
            'Remove exemption',
            { confirmText: 'Remove', confirmClass: 'btn-danger' }
        );
        if (!ok) return true;
        const entries = this._allowlist.filter((_, i) => i !== index);
        await this._saveAllowlist(entries);
        return true;
    }

    /** Full-replace POST of the CIDR allowlist, then refetch. */
    async _saveAllowlist(entries) {
        const app = this.getApp();
        const payload = entries.map(e => {
            const out = { cidr: e.cidr };
            if (e.reason) out.reason = e.reason;
            if (e.until) out.until = e.until;
            return out;
        });
        app?.showLoading?.();
        let resp;
        try {
            resp = await app.rest.POST('/api/geo/allowlist', { entries: payload });
        } catch {
            resp = null;
        } finally {
            app?.hideLoading?.();
        }
        if (resp?.success) {
            app?.toast?.success('Allowlist saved');
            await this.refresh();
        } else {
            const msg = resp?.data?.error || resp?.message || 'Failed to save the allowlist';
            this._setAllowlistStatus(msg);
            app?.toast?.error(msg);
        }
    }

    _setAllowlistStatus(text) {
        const el = this.element?.querySelector('.geofence-allowlist-status');
        if (el) el.textContent = text || '';
    }

    // ── Individual IPs ─────────────────────────────────────

    async onActionWhitelistIp() {
        const data = await Modal.form({
            title: 'Whitelist an IP',
            fields: [
                { name: 'ip', type: 'text', label: 'IP address', placeholder: '203.0.113.7', required: true, columns: 12 },
                { name: 'reason', type: 'text', label: 'Reason', placeholder: 'Dev box — François (Paris)', required: true, columns: 12 },
                { name: 'until', type: 'datetime', label: 'Expires (optional)', help: 'Leave empty for a permanent exemption.', columns: 12 }
            ],
            submitText: 'Whitelist'
        });
        if (!data) return true;

        const app = this.getApp();
        app?.showLoading?.();
        let resp = null;
        try {
            const model = await GeoLocatedIP.lookup(String(data.ip).trim());
            if (model) {
                const until = toIso(data.until);
                const value = until ? { reason: data.reason, until } : { reason: data.reason };
                resp = await model.save({ whitelist: value });
            }
        } catch {
            resp = null;
        } finally {
            app?.hideLoading?.();
        }

        if (resp?.success || resp?.status === 200) {
            app?.toast?.success('IP whitelisted');
            await this.refresh();
        } else {
            app?.toast?.error(resp?.data?.error || resp?.message || 'Could not whitelist that IP');
        }
        return true;
    }

    async onActionUnwhitelistIp(event, element) {
        const ip = element?.dataset?.ip;
        if (!ip) return true;
        const ok = await Modal.confirm(
            `Remove the whitelist for ${MOJOUtils.escapeHtml(String(ip))}? It will be evaluated against the rules again immediately.`,
            'Remove whitelist',
            { confirmText: 'Remove', confirmClass: 'btn-danger' }
        );
        if (!ok) return true;

        const app = this.getApp();
        app?.showLoading?.();
        let resp = null;
        try {
            const model = await GeoLocatedIP.lookup(ip);
            if (model) resp = await model.save({ unwhitelist: 1 });
        } catch {
            resp = null;
        } finally {
            app?.hideLoading?.();
        }

        if (resp?.success || resp?.status === 200) {
            app?.toast?.success('Whitelist removed');
            await this.refresh();
        } else {
            app?.toast?.error(resp?.data?.error || resp?.message || 'Could not remove the whitelist');
        }
        return true;
    }
}

export default GeofenceExemptionsView;
