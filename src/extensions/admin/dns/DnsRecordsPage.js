/**
 * DnsRecordsPage - Admin > DNS > DNS Records (route: system/dns/records).
 *
 * A domain picker over the same DnsRecordsView the DomainView Records section
 * mounts — one editor, two mounts. Honours `?domain=<id>` so DomainView (and a
 * bookmark) can deep-link straight to a zone.
 *
 * Page lifecycle (WM-023): `onEnter` must await super (the base clears the
 * render guard, and skipping it blanks the page on every revisit) and must NOT
 * await the fetch — showPage renders only after onEnter returns.
 */

import Page from '@core/Page.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { Domain, DomainList } from '@ext/admin/models/Dns.js';
import DnsRecordsView from './DnsRecordsView.js';

const escapeHtml = MOJOUtils.escapeHtml;

class DnsRecordsPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            title: 'DNS Records',
            className: 'dns-records-page',
            template: `
                <div class="container-lg py-3">
                    <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
                        <h4 class="mb-0">DNS Records</h4>
                        <div class="ms-auto d-flex align-items-center gap-2">
                            <label class="text-secondary small mb-0">Domain</label>
                            <select class="form-select form-select-sm" style="min-width:16rem"
                                    data-action="domain-changed">
                                {{^domains.length}}<option value="">Loading…</option>{{/domains.length}}
                                {{{domainOptions}}}
                            </select>
                        </div>
                    </div>
                    {{#noDomains|bool}}
                        <div class="card"><div class="card-body text-center py-4 text-secondary">
                            <div class="mb-2"><i class="bi bi-globe2 fs-3"></i></div>
                            <h6 class="mb-1">No active domains yet</h6>
                            <p class="small mb-0">Add a domain from the Domains page before editing records.</p>
                        </div></div>
                    {{/noDomains|bool}}
                    <div data-container="records"></div>
                </div>
            `
        });

        this.domains = [];
        this.selectedId = null;
        this.noDomains = false;
    }

    /** Trusted HTML: every value is escaped individually. */
    get domainOptions() {
        return this.domains.map(domain => {
            const selected = String(domain.id) === String(this.selectedId) ? ' selected' : '';
            return `<option value="${escapeHtml(String(domain.id))}"${selected}>${escapeHtml(domain.name)}</option>`;
        }).join('');
    }

    async onInit() {
        this.recordsView = new DnsRecordsView({ containerId: 'records' });
        this.addChild(this.recordsView);
    }

    async onEnter() {
        // Base Page.onEnter maintains the isActive/_wasExited render guard —
        // skipping it blanks the page on every revisit.
        await super.onEnter();

        const requested = this.getApp()?.router?.getParam?.('domain')
            || new URLSearchParams(window.location.search).get('domain');

        // Fire-and-forget: awaiting here would leave the page blank until the
        // API answers. On the FIRST visit onEnter also runs before the first
        // render, so stash and let onAfterMount apply it.
        this.loadDomains(requested).then(data => {
            if (this.element) return this.applyDomains(data);
            this._pending = data;
        }).catch(() => {});
    }

    async onAfterMount() {
        if (this._pending) {
            const data = this._pending;
            this._pending = null;
            await this.applyDomains(data);
        }
    }

    async loadDomains(requestedId) {
        const collection = new DomainList({ size: 200, params: { status: 'active', sort: 'name' } });
        await collection.fetch();
        return {
            domains: collection.models.map(model => ({ id: model.id, name: model.get('name'), model })),
            requestedId
        };
    }

    async applyDomains({ domains, requestedId }) {
        this.domains = domains;
        this.noDomains = domains.length === 0;

        const match = requestedId && domains.find(d => String(d.id) === String(requestedId));
        const chosen = match || domains[0] || null;
        this.selectedId = chosen ? chosen.id : null;
        this.render();

        if (chosen) await this.selectDomain(chosen.model);
    }

    async selectDomain(model) {
        if (!model) return;
        this.recordsView.model = model instanceof Domain ? model : new Domain(model);
        await this.recordsView.refresh();
    }

    async onActionDomainChanged(event, element) {
        const id = element.value;
        this.selectedId = id;
        const entry = this.domains.find(d => String(d.id) === String(id));
        await this.selectDomain(entry && entry.model);
        return true;
    }
}

export default DnsRecordsPage;
