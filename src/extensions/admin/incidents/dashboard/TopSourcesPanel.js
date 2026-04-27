/**
 * TopSourcesPanel — two side-by-side rank lists:
 *   1. Top Source IPs (last 7d)
 *   2. Top Categories (last 7d)
 *
 * Backend-aggregated via the generic _mode=top surface on
 * /api/incident/event. One round-trip per list, no client-side
 * fallback — the backend does the GROUP BY + ORDER BY + LIMIT.
 *
 * Each row click opens a filtered events drawer. If `allowBlock` is
 * true (manage_security), Top IPs gets an inline "Block IP" action.
 */

import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';

// Escape backend-sourced values before interpolating them into raw HTML
// strings passed as Modal.drawer's `body:` parameter. The body is injected
// as innerHTML by ModalView, so any unescaped value is a stored-XSS vector.
const escHtml = (s) => {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
};

const WINDOW_DAYS = 7;
const TOP_N = 10;

class TopSourcesPanel extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: `sd-top-sources ${options.className || ''}`.trim()
        });
        this.allowBlock = options.allowBlock !== false;
        // State on `this` for Mustache resolution.
        this.ips = [];
        this.cats = [];
        this.ipsEmpty = true;
        this.catsEmpty = true;
    }

    async getTemplate() {
        return `
            <div class="row g-3">
                <div class="col-lg-6">
                    <div class="card sd-card h-100">
                        <div class="card-header bg-transparent border-0">
                            <h3 class="card-title sd-card-title mb-0">Top Source IPs</h3>
                            <span class="card-subtitle text-muted small">Last ${WINDOW_DAYS} days</span>
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
                            <span class="card-subtitle text-muted small">Last ${WINDOW_DAYS} days</span>
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

    _withRank(items) {
        const max = Math.max(1, ...items.map(i => i.value));
        return items.map((item, i) => ({
            ...item,
            rank: i + 1,
            percent: Math.round((item.value / max) * 100)
        }));
    }

    async onInit() {
        await this._fetch();
    }

    async _fetch() {
        const drStart = Math.floor((Date.now() - WINDOW_DAYS * 86400000) / 1000);
        const [ipsRaw, catsRaw] = await Promise.all([
            this._fetchTop('source_ip', drStart),
            this._fetchTop('category', drStart)
        ]);
        this.ips = this._withRank(ipsRaw);
        this.cats = this._withRank(catsRaw);
        this.ipsEmpty = this.ips.length === 0;
        this.catsEmpty = this.cats.length === 0;
    }

    async refresh() {
        await this._fetch();
        if (this.isMounted()) await this.render();
    }

    /**
     * Fetch top-N for a single field via the framework's _mode=top
     * aggregation surface. Returns [{name, value}] sorted by value desc.
     */
    async _fetchTop(field, drStart) {
        const rest = this.getApp()?.rest;
        if (!rest) return [];
        try {
            const resp = await rest.GET('/api/incident/event', {
                _mode: 'top',
                _field: field,
                _size: TOP_N,
                dr_start: drStart,
                _: Date.now()
            });
            // _mode=top response: { status, graph, field, agg, size,
            //                       data: [{key, value, ...}] }
            const rows = resp?.data?.data;
            if (!Array.isArray(rows)) return [];
            return rows
                .filter(r => r.key && r.key !== '—')
                .map(r => ({ name: String(r.key), value: Number(r.value) || 0 }));
        } catch (err) {
            console.warn(`[TopSourcesPanel] _mode=top fetch failed for ${field}:`, err);
            return [];
        }
    }

    async onActionOpenIp(event, element) {
        if (event.target.closest('[data-action="block-ip"]')) return;
        const ip = element.dataset.ip;
        if (!ip) return;
        const safeIp = escHtml(ip);
        Modal.drawer({
            eyebrow: 'Source IP',
            title: ip,
            meta: [{ icon: 'bi bi-clock', text: `Last ${WINDOW_DAYS} days` }],
            body: `
                <p class="small text-muted">Open the events table filtered by this source IP.</p>
                <a href="?page=system/events&source_ip=${encodeURIComponent(ip)}" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-list-ul me-1"></i>Open Events from ${safeIp}
                </a>
            `,
            size: 'sm'
        });
    }

    async onActionOpenCategory(event, element) {
        const cat = element.dataset.cat;
        if (!cat) return;
        const safeCat = escHtml(cat);
        Modal.drawer({
            eyebrow: 'Category',
            title: cat,
            meta: [{ icon: 'bi bi-clock', text: `Last ${WINDOW_DAYS} days` }],
            body: `
                <p class="small text-muted">Open the events table filtered by this category.</p>
                <a href="?page=system/events&category=${encodeURIComponent(cat)}" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-list-ul me-1"></i>Open Events · ${safeCat}
                </a>
            `,
            size: 'sm'
        });
    }

    async onActionBlockIp(event, element) {
        event.stopPropagation();
        const ip = element.dataset.ip;
        if (!ip) return;
        // Modal.confirm renders message as raw HTML — escape backend-sourced ip.
        const ok = await Modal.confirm(`Add ${escHtml(ip)} to the firewall block list?`);
        if (!ok) return;
        const rest = this.getApp()?.rest;
        if (!rest) return;
        try {
            await rest.POST('/api/system/geoip', { ip, is_blocked: true });
            this.getApp()?.toast?.success?.(`Blocked ${ip}`);
        } catch (err) {
            this.getApp()?.toast?.error?.(err?.message || 'Failed to block IP');
        }
    }
}

export default TopSourcesPanel;
