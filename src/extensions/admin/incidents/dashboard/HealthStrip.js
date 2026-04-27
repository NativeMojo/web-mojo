/**
 * HealthStrip — collapsed system-health summary.
 *
 * One call to /api/incident/health/summary returns one row per
 * `system:health:*` category. Renders as a `<details>` element that's
 * open by default (per the mockup).
 *
 * Each row: colored dot from level (≥10 red, 6–9 yellow, else green),
 * category name, detail snippet, relative time. If the row carries an
 * `incident_id`, click drills into that incident.
 *
 * Empty `data` is the healthy state — render the strip with a
 * "all systems healthy" hint.
 */

import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import { Incident } from '@ext/admin/models/Incident.js';
import IncidentView from '../IncidentView.js';

class HealthStrip extends View {
    constructor(options = {}) {
        super({
            ...options,
            tagName: 'div',
            className: `sd-health ${options.className || ''}`.trim()
        });
        this._rows = [];
        this._fetchedOnce = false;
    }

    async getTemplate() {
        return `
            <details class="card sd-card sd-health-card" open>
                <summary class="card-header bg-transparent border-0 d-flex justify-content-between align-items-center sd-health-summary">
                    <div class="d-flex align-items-center gap-3">
                        <span class="sd-eyebrow">System Health</span>
                        <span class="text-muted small d-inline-flex align-items-center gap-2">
                            {{#dots}}<span class="sd-dot sd-dot-{{dot}}"></span>{{/dots}}
                            <span class="ms-1">{{summary}}</span>
                        </span>
                    </div>
                    <i class="bi bi-chevron-up sd-health-toggle"></i>
                </summary>
                <ul class="list-unstyled mb-0 sd-health-list">
                    {{#empty|bool}}
                    <li class="px-3 py-3 text-success small"><i class="bi bi-check-circle me-1"></i>All systems healthy.</li>
                    {{/empty|bool}}
                    {{#rows}}
                    <li class="px-3 py-2 border-top d-flex align-items-center gap-3 sd-health-row {{#hasIncident|bool}}sd-health-row-link{{/hasIncident|bool}}"
                        {{#hasIncident|bool}}data-action="open-incident" data-id="{{incidentId}}"{{/hasIncident|bool}}>
                        <span class="sd-dot sd-dot-{{dot}}"></span>
                        <div class="flex-grow-1 min-w-0">
                            <div class="sd-mono small">{{category}}</div>
                            <div class="text-muted small text-truncate">{{details}}</div>
                        </div>
                        <span class="text-muted small">{{when}}</span>
                        <span class="badge text-bg-light sd-mono">level {{level}}</span>
                    </li>
                    {{/rows}}
                </ul>
            </details>
        `;
    }

    async getViewData() {
        const dotPriority = { crit: 3, warn: 2, good: 1 };
        const summary = this._buildSummary();
        const dots = this._rows.length
            ? this._rows.map(r => ({ dot: r.dot }))
            : [{ dot: 'good' }];
        return {
            ...this.data,
            rows: this._rows,
            empty: this._rows.length === 0 && this._fetchedOnce,
            summary,
            dots
        };
    }

    async onAfterRender() {
        if (!this._fetchedOnce) {
            await this.refresh();
        }
    }

    async refresh() {
        const rest = this.getApp()?.rest;
        if (!rest) {
            this._rows = [];
            this._fetchedOnce = true;
            return;
        }
        try {
            const resp = await rest.GET('/api/incident/health/summary', { _: Date.now() });
            const rows = resp?.data?.data || [];
            this._rows = rows.map(r => this._normalize(r));
        } catch (err) {
            console.warn('[HealthStrip] fetch failed:', err);
            this._rows = [];
        } finally {
            this._fetchedOnce = true;
            await this.render();
        }
    }

    _normalize(row) {
        const level = parseInt(row.level, 10) || 0;
        const dot = level >= 10 ? 'crit' : (level >= 6 ? 'warn' : 'good');
        return {
            category: row.category || '—',
            details: row.details || row.title || '',
            level,
            dot,
            when: this._relativeTime(row.last_seen),
            incidentId: row.incident_id || null,
            hasIncident: !!row.incident_id
        };
    }

    _buildSummary() {
        if (!this._rows.length) {
            return this._fetchedOnce ? 'All systems healthy' : 'Loading…';
        }
        const crit = this._rows.filter(r => r.dot === 'crit').length;
        const warn = this._rows.filter(r => r.dot === 'warn').length;
        const good = this._rows.filter(r => r.dot === 'good').length;
        const parts = [];
        if (crit) parts.push(`${crit} critical`);
        if (warn) parts.push(`${warn} warning${warn > 1 ? 's' : ''}`);
        if (good) parts.push(`${good} healthy`);
        return parts.join(' · ');
    }

    _relativeTime(timestamp) {
        if (!timestamp) return '—';
        const t = typeof timestamp === 'number' ? timestamp * 1000 : new Date(timestamp).getTime();
        if (!t) return '—';
        const diff = Math.floor((Date.now() - t) / 1000);
        if (diff < 60)    return `${diff}s ago`;
        if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    async onActionOpenIncident(event, element) {
        const id = element.dataset.id;
        if (!id) return;
        const model = new Incident({ id });
        await model.fetch();
        if (!model.id) return;
        const view = new IncidentView({ model });
        await Modal.show(view, { size: 'xl', header: false });
    }
}

export default HealthStrip;
