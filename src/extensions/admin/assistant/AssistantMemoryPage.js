/**
 * AssistantMemoryPage - View and manage assistant memory entries
 *
 * Displays memories grouped by tier (global, personal, group) as
 * key-value lists with delete capability.
 */

import Page from '@core/Page.js';
import rest from '@core/Rest.js';
import Modal from '@core/views/feedback/Modal.js';

const TIER_CONFIG = {
    global: { label: 'Global', icon: 'bi-globe', badge: 'bg-primary', description: 'Visible to all assistant users' },
    user:   { label: 'Personal', icon: 'bi-person', badge: 'bg-info', description: 'Private to you' },
    group:  { label: 'Group', icon: 'bi-people', badge: 'bg-warning text-dark', description: 'Shared with your group' }
};

class AssistantMemoryPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'Assistant Memory',
            className: 'mojo-page assistant-memory-page',
            ...options
        });

        this._memories = {};
        this._activeTier = 'user';
        this._loading = true;

        this.template = `
            <div class="container-fluid py-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h4 class="mb-0"><i class="bi bi-lightbulb me-2"></i>Assistant Memory</h4>
                        <p class="text-muted small mb-0">Facts and preferences the assistant has learned during conversations.</p>
                    </div>
                    <button class="btn btn-outline-secondary btn-sm" data-action="refresh">
                        <i class="bi bi-arrow-clockwise me-1"></i>Refresh
                    </button>
                </div>

                <!-- Tier Tabs -->
                <ul class="nav nav-tabs mb-3">
                    {{#tierTabs}}
                        <li class="nav-item">
                            <a class="nav-link {{#active}}active{{/active}}" href="#"
                               data-action="switch-tier" data-tier="{{key}}">
                                <i class="bi {{icon}} me-1"></i>{{label}}
                                {{#count}}<span class="badge bg-secondary ms-1">{{count}}</span>{{/count}}
                            </a>
                        </li>
                    {{/tierTabs}}
                </ul>

                <!-- Content -->
                {{#loading|bool}}
                    <div class="text-center py-5">
                        <div class="spinner-border spinner-border-sm text-muted" role="status"></div>
                        <div class="text-muted small mt-2">Loading memories...</div>
                    </div>
                {{/loading|bool}}

                {{^loading|bool}}
                    {{{tierContent}}}
                {{/loading|bool}}
            </div>
        `;
    }

    async onEnter() {
        await this._loadMemories();
    }

    async onBeforeRender() {
        this.loading = this._loading;

        // Build tier tabs
        const tiers = ['user', 'global', 'group'];
        this.tierTabs = tiers
            .filter(key => key !== 'group' || this._memories[key])
            .map(key => {
                const cfg = TIER_CONFIG[key];
                const entries = this._memories[key] || {};
                return {
                    key,
                    label: cfg.label,
                    icon: cfg.icon,
                    count: Object.keys(entries).length || 0,
                    active: key === this._activeTier
                };
            });

        // Build content for the active tier
        this.tierContent = this._buildTierContent(this._activeTier);
    }

    async _loadMemories() {
        this._loading = true;
        this.render();

        try {
            const resp = await rest.get('/api/assistant/memory');
            const data = resp?.data?.data || resp?.data || {};
            this._memories = {
                global: data.global || {},
                user: data.user || {},
                group: data.group || {}
            };
        } catch (_e) {
            this._memories = { global: {}, user: {}, group: {} };
            this.getApp()?.toast?.error('Failed to load memories');
        }

        this._loading = false;
        this.render();
    }

    _buildTierContent(tier) {
        const entries = this._memories[tier] || {};
        const keys = Object.keys(entries);
        const cfg = TIER_CONFIG[tier];

        if (keys.length === 0) {
            return `
                <div class="text-center py-5">
                    <i class="bi ${cfg.icon} fs-1 text-muted"></i>
                    <p class="text-muted mt-2 mb-0">No memories stored.</p>
                    <p class="text-muted small">The assistant learns and stores memories during conversations.</p>
                </div>
            `;
        }

        const rows = keys.map(key => {
            const escapedKey = this._escapeHtml(key);
            const escapedValue = this._escapeHtml(String(entries[key]));
            return `
                <tr>
                    <td class="align-middle" style="width: 30%; min-width: 150px;">
                        <code class="small">${escapedKey}</code>
                    </td>
                    <td class="align-middle">${escapedValue}</td>
                    <td class="align-middle text-end" style="width: 60px;">
                        <button class="btn btn-outline-danger btn-sm"
                                data-action="delete-memory"
                                data-tier="${tier}"
                                data-key="${escapedKey}"
                                title="Delete this memory">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="small text-muted mb-2">
                <i class="bi bi-info-circle me-1"></i>${cfg.description}
            </div>
            <div class="table-responsive">
                <table class="table table-striped table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>Value</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ── Actions ──

    onActionSwitchTier(_event, element) {
        const tier = element.dataset.tier || element.closest('[data-tier]')?.dataset.tier;
        if (!tier || tier === this._activeTier) return;
        _event.preventDefault();
        this._activeTier = tier;
        this.render();
    }

    async onActionRefresh() {
        await this._loadMemories();
    }

    async onActionDeleteMemory(_event, element) {
        const tier = element.dataset.tier || element.closest('[data-tier]')?.dataset.tier;
        const key = element.dataset.key || element.closest('[data-key]')?.dataset.key;
        if (!tier || !key) return;

        const confirmed = await Modal.confirm(
            `Delete memory "${key}" from ${TIER_CONFIG[tier]?.label || tier}?`,
            'Delete Memory',
            { confirmText: 'Delete', confirmClass: 'btn-danger' }
        );
        if (!confirmed) return;

        try {
            await rest.delete('/api/assistant/memory', { tier, key });
            delete this._memories[tier]?.[key];
            this.getApp()?.toast?.success('Memory deleted');
            this.render();
        } catch (_e) {
            this.getApp()?.toast?.error('Failed to delete memory');
        }
    }
}

export default AssistantMemoryPage;
