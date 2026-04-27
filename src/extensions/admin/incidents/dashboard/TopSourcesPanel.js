/**
 * TopSourcesPanel — two side-by-side rank lists:
 *   1. Top Source IPs (last 7d)
 *   2. Top Categories (last 7d)
 *
 * Tries `group_by=source_ip&order_by=-count` on the events endpoint
 * first; if that 400s (backend hasn't shipped group_by), falls back to
 * fetching the most recent 500 events and aggregating client-side.
 *
 * Each row click opens a filtered events drawer. If `allowBlock` is
 * true (manage_security), Top IPs gets an inline "Block IP" action.
 */

import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import { IncidentEventList } from '@ext/admin/models/Incident.js';

const WINDOW_DAYS = 7;
const FALLBACK_PAGE_SIZE = 500;
const TOP_N = 10;

class TopSourcesPanel extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: `sd-top-sources ${options.className || ''}`.trim()
        });
        this.allowBlock = options.allowBlock !== false;
        this._ips = [];
        this._cats = [];
        this._fellBackToClient = false;
    }

    async getTemplate() {
        return `
            <div class="row g-3">
                <div class="col-lg-6">
                    <div class="card sd-card h-100">
                        <div class="card-header bg-transparent border-0">
                            <h3 class="card-title sd-card-title mb-0">Top Source IPs</h3>
                            <span class="card-subtitle text-muted small">Last ${WINDOW_DAYS} days{{#fellBack|bool}} · client-side aggregation{{/fellBack|bool}}</span>
                        </div>
                        <ul class="list-unstyled mb-0 sd-rank-list">
                            {{#ipsEmpty|bool}}<li class="px-3 py-4 text-muted small">No source IPs in window.</li>{{/ipsEmpty|bool}}
                            {{#ips}}
                            <li class="d-flex align-items-center gap-2 px-3 py-2 border-top sd-rank-row" data-action="open-ip" data-ip="{{name}}">
                                <span class="text-muted small sd-mono" style="width:1.5rem; text-align:right;">{{rank}}</span>
                                <span class="flex-grow-1 sd-mono">{{name}}</span>
                                <div class="progress sd-progress" style="height:6px; width:96px;">
                                    <div class="progress-bar bg-danger" style="width:{{percent}}%"></div>
                                </div>
                                <span class="sd-mono small">{{value}}</span>
                                {{#allowBlock|bool}}
                                <button type="button" class="btn btn-sm btn-link text-danger p-1" data-action="block-ip" data-ip="{{name}}" title="Block IP">
                                    <i class="bi bi-shield-fill-x"></i>
                                </button>
                                {{/allowBlock|bool}}
                            </li>
                            {{/ips}}
                        </ul>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card sd-card h-100">
                        <div class="card-header bg-transparent border-0">
                            <h3 class="card-title sd-card-title mb-0">Top Categories</h3>
                            <span class="card-subtitle text-muted small">Last ${WINDOW_DAYS} days{{#fellBack|bool}} · client-side aggregation{{/fellBack|bool}}</span>
                        </div>
                        <ul class="list-unstyled mb-0 sd-rank-list">
                            {{#catsEmpty|bool}}<li class="px-3 py-4 text-muted small">No category activity in window.</li>{{/catsEmpty|bool}}
                            {{#cats}}
                            <li class="d-flex align-items-center gap-2 px-3 py-2 border-top sd-rank-row" data-action="open-category" data-cat="{{name}}">
                                <span class="text-muted small sd-mono" style="width:1.5rem; text-align:right;">{{rank}}</span>
                                <span class="flex-grow-1 sd-mono">{{name}}</span>
                                <div class="progress sd-progress" style="height:6px; width:96px;">
                                    <div class="progress-bar" style="width:{{percent}}%; background-color: rgba(179, 136, 255, 0.85);"></div>
                                </div>
                                <span class="sd-mono small">{{value}}</span>
                            </li>
                            {{/cats}}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    async getViewData() {
        return {
            ...this.data,
            ips: this._withRank(this._ips),
            cats: this._withRank(this._cats),
            ipsEmpty: this._ips.length === 0,
            catsEmpty: this._cats.length === 0,
            allowBlock: this.allowBlock,
            fellBack: this._fellBackToClient
        };
    }

    _withRank(items) {
        const max = Math.max(1, ...items.map(i => i.value));
        return items.map((item, i) => ({
            ...item,
            rank: i + 1,
            percent: Math.round((item.value / max) * 100)
        }));
    }

    async onAfterRender() {
        if (!this._fetched) {
            this._fetched = true;
            await this.refresh();
        }
    }

    async refresh() {
        const drStart = Math.floor((Date.now() - WINDOW_DAYS * 86400000) / 1000);
        await Promise.allSettled([
            this._fetchIps(drStart),
            this._fetchCategories(drStart)
        ]);
        await this.render();
    }

    async _fetchIps(drStart) {
        const rest = this.getApp()?.rest;
        if (!rest) return;

        // Try server-side group_by first.
        try {
            const resp = await rest.GET('/api/incident/event', {
                group_by: 'source_ip',
                order_by: '-count',
                size: TOP_N,
                dr_start: drStart,
                _: Date.now()
            });
            const rows = this._parseGroupByResponse(resp, 'source_ip');
            if (rows) {
                this._ips = rows.filter(r => r.name && r.name !== '—').slice(0, TOP_N);
                return;
            }
        } catch (_e) { /* falls through to client-side */ }

        // Fallback: client-side aggregation of recent events.
        this._fellBackToClient = true;
        const list = new IncidentEventList({ params: { dr_start: drStart, size: FALLBACK_PAGE_SIZE, sort: '-created' } });
        try { await list.fetch(); } catch (_e) { return; }
        this._ips = this._aggregate(list.models || [], m => m.get('source_ip')).slice(0, TOP_N);
    }

    async _fetchCategories(drStart) {
        const rest = this.getApp()?.rest;
        if (!rest) return;

        try {
            const resp = await rest.GET('/api/incident/event', {
                group_by: 'category',
                order_by: '-count',
                size: TOP_N,
                dr_start: drStart,
                _: Date.now()
            });
            const rows = this._parseGroupByResponse(resp, 'category');
            if (rows) {
                this._cats = rows.filter(r => r.name && r.name !== '—').slice(0, TOP_N);
                return;
            }
        } catch (_e) { /* falls through */ }

        // Fallback shares the same incident-events page if we just fetched it.
        this._fellBackToClient = true;
        const list = new IncidentEventList({ params: { dr_start: drStart, size: FALLBACK_PAGE_SIZE, sort: '-created' } });
        try { await list.fetch(); } catch (_e) { return; }
        this._cats = this._aggregate(list.models || [], m => m.get('category')).slice(0, TOP_N);
    }

    _parseGroupByResponse(resp, key) {
        // Mojo group_by responses commonly come back as either:
        //   { data: { data: [{ source_ip: '...', count: N }, ...] } }
        // or { data: [{ ... }] }. Be liberal in what we accept.
        const body = resp?.data?.data ?? resp?.data ?? resp;
        if (!Array.isArray(body)) return null;
        return body.map(row => ({
            name: String(row[key] ?? '—'),
            value: Number(row.count ?? row.total ?? row.n ?? 0)
        })).filter(r => r.value > 0);
    }

    _aggregate(models, picker) {
        const counts = new Map();
        for (const m of models) {
            const key = picker(m);
            if (!key) continue;
            counts.set(key, (counts.get(key) || 0) + 1);
        }
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value }));
    }

    async onActionOpenIp(event, element) {
        if (event.target.closest('[data-action="block-ip"]')) return;
        const ip = element.dataset.ip;
        if (!ip) return;
        Modal.drawer({
            eyebrow: 'Source IP',
            title: ip,
            meta: [{ icon: 'bi bi-clock', text: `Last ${WINDOW_DAYS} days` }],
            body: `
                <p class="small text-muted">Open the events table filtered by this source IP.</p>
                <a href="?page=system/events&source_ip=${encodeURIComponent(ip)}" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-list-ul me-1"></i>Open Events from ${ip}
                </a>
            `,
            size: 'sm'
        });
    }

    async onActionOpenCategory(event, element) {
        const cat = element.dataset.cat;
        if (!cat) return;
        Modal.drawer({
            eyebrow: 'Category',
            title: cat,
            meta: [{ icon: 'bi bi-clock', text: `Last ${WINDOW_DAYS} days` }],
            body: `
                <p class="small text-muted">Open the events table filtered by this category.</p>
                <a href="?page=system/events&category=${encodeURIComponent(cat)}" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-list-ul me-1"></i>Open Events · ${cat}
                </a>
            `,
            size: 'sm'
        });
    }

    async onActionBlockIp(event, element) {
        event.stopPropagation();
        const ip = element.dataset.ip;
        if (!ip) return;
        const ok = await Modal.confirm(`Add ${ip} to the firewall block list?`);
        if (!ok) return;
        const rest = this.getApp()?.rest;
        if (!rest) return;
        try {
            await rest.POST('/api/account/geolocated_ip', { ip, is_blocked: true });
            this.getApp()?.toast?.success?.(`Blocked ${ip}`);
        } catch (err) {
            this.getApp()?.toast?.error?.(err?.message || 'Failed to block IP');
        }
    }
}

export default TopSourcesPanel;
