import View from '@core/View.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { Ticket, TicketForms } from '@ext/admin/models/Tickets.js';
import { Incident } from '@ext/admin/models/Incident.js';
import { UserList } from '@core/models/User.js';
import Modal from '@core/views/feedback/Modal.js';
import IncidentView from './IncidentView.js';
import rest from '@core/Rest.js';
import { openAssistantChat } from '../assistant/AssistantContextChat.js';


// ── Helpers ─────────────────────────────────────────────

const STATUS_CONFIG = {
    new:         { badge: 'bg-info',      icon: 'bi-bell-fill' },
    open:        { badge: 'bg-primary',   icon: 'bi-folder2-open' },
    in_progress: { badge: 'bg-warning text-dark', icon: 'bi-gear-fill' },
    pending:     { badge: 'bg-secondary', icon: 'bi-pause-circle-fill' },
    resolved:    { badge: 'bg-success',   icon: 'bi-check-circle-fill' },
    qa:          { badge: 'bg-purple',    icon: 'bi-clipboard-check' },
    closed:      { badge: 'bg-dark',      icon: 'bi-x-circle-fill' },
    ignored:     { badge: 'bg-secondary', icon: 'bi-eye-slash-fill' }
};

function getStatusBadge(status) {
    const cfg = STATUS_CONFIG[status] || { badge: 'bg-secondary', icon: 'bi-circle' };
    return `<span class="badge ${cfg.badge}"><i class="${cfg.icon} me-1"></i>${(status || '').replace('_', ' ')}</span>`;
}

async function renderMarkdown(markdown) {
    if (!markdown) return '';
    try {
        const resp = await rest.post('/api/docit/render', { markdown });
        const html = resp?.data?.data?.html || resp?.data?.html;
        if (html) return html;
    } catch (_e) { /* fallback */ }
    const div = document.createElement('div');
    div.textContent = markdown;
    return `<pre style="white-space: pre-wrap;">${div.innerHTML}</pre>`;
}


// ── Linked Incident Card ────────────────────────────────

class LinkedIncidentCard extends View {
    constructor(options = {}) {
        super({
            className: 'linked-incident-card',
            ...options
        });

        this.incident = options.incident || {};
        this.incidentTitle = this.incident.title || 'Untitled';
        this.incidentId = this.incident.id;
        this.incidentStatus = this.incident.status || 'unknown';
        this.incidentPriority = this.incident.priority;
        this.incidentCategory = this.incident.category || '';

        this.template = `
            <div class="card border-start border-3 border-warning mb-3">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center gap-2 flex-grow-1" style="min-width: 0;">
                            <i class="bi bi-exclamation-triangle-fill text-warning flex-shrink-0"></i>
                            <div style="min-width: 0;">
                                <div class="fw-semibold text-truncate">Incident #{{incidentId}}: {{incidentTitle}}</div>
                                <div class="text-muted small">
                                    {{{statusBadge}}}
                                    <span class="ms-2">Priority: {{incidentPriority}}</span>
                                    {{#incidentCategory}}
                                        <span class="ms-2">{{{incidentCategory|badge}}}</span>
                                    {{/incidentCategory}}
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-outline-primary btn-sm flex-shrink-0 ms-2" data-action="open-incident">
                            <i class="bi bi-box-arrow-up-right me-1"></i>Open
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async onBeforeRender() {
        this.statusBadge = getStatusBadge(this.incidentStatus);
    }

    async onActionOpenIncident() {
        if (!this.incidentId) return;
        try {
            const incident = new Incident({ id: this.incidentId });
            await incident.fetch({ params: { graph: 'detailed' } });
            const view = new IncidentView({ model: incident });
            await Modal.detail(view);
        } catch (e) {
            this.getApp()?.toast?.error('Failed to load incident');
        }
    }
}


// ── TicketView (Light) ─────────────────────────────────
//
// Quick-glance view shown in a dialog when clicking a ticket row.
// Focused on description and key metadata.
// "Open Ticket Panel" button at the bottom opens the full
// slide-over conversation panel.

class TicketView extends View {
    constructor(options = {}) {
        super({
            className: 'ticket-view',
            ...options
        });

        this.model = options.model || new Ticket(options.data || {});
    }

    async onBeforeRender() {
        this.statusBadge = getStatusBadge(this.model.get('status'));
        const assignee = this.model.get('assignee');
        this.assigneeName = assignee?.display_name || (typeof assignee === 'string' ? assignee : null);
        this.hasDescription = !!this.model.get('description');
        this.descriptionHtml = await renderMarkdown(this.model.get('description') || '');
        this.noteCount = this.model.get('note_count') || 0;
        this.hasPanelSupport = !!this.getApp()?.openTicketPanel;

        const pri = this.model.get('priority') || 5;
        this.priorityClass = pri >= 8 ? 'text-danger' : pri >= 5 ? 'text-warning' : 'text-secondary';

        this.template = `
            <style>
                .tv-header { margin-bottom: 16px; }
                .tv-title { font-size: 1.1rem; font-weight: 600; color: var(--bs-emphasis-color); margin-bottom: 6px; line-height: 1.3; }
                .tv-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.78rem; color: var(--bs-secondary-color); }
                .tv-meta i { font-size: 0.72rem; }

                .tv-desc { margin-bottom: 16px; }
                .tv-desc-label { font-size: 0.72rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; color: var(--bs-secondary-color); margin-bottom: 8px; }
                .tv-desc-body { font-size: 0.85rem; line-height: 1.65; color: var(--bs-body-color); }
                .tv-desc-body p { margin-bottom: 8px; }
                .tv-desc-body p:last-child { margin-bottom: 0; }
                .tv-desc-body pre { background: var(--bs-tertiary-bg); border-radius: 6px; padding: 10px 14px; font-size: 0.8rem; overflow-x: auto; }
                .tv-desc-body code { font-size: 0.85em; padding: 1px 5px; background: var(--bs-tertiary-bg); border-radius: 4px; }
                .tv-desc-body pre code { padding: 0; background: none; }
                .tv-desc-body ul, .tv-desc-body ol { padding-left: 20px; margin-bottom: 8px; }
                .tv-desc-body blockquote { margin: 6px 0; padding: 4px 12px; border-left: 3px solid var(--bs-border-color); color: var(--bs-secondary-color); }
                .tv-desc-body table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin: 8px 0; }
                .tv-desc-body th, .tv-desc-body td { padding: 5px 8px; border: 1px solid var(--bs-border-color); text-align: left; }
                .tv-desc-body th { background: var(--bs-tertiary-bg); font-weight: 600; }
                .tv-desc-empty { font-size: 0.82rem; color: var(--bs-secondary-color); font-style: italic; }

                .tv-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--bs-border-color-translucent); }
                .tv-footer-meta { font-size: 0.75rem; color: var(--bs-secondary-color); display: flex; align-items: center; gap: 4px; }
            </style>

            <div class="tv-header">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1" style="min-width: 0;">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            {{{statusBadge}}}
                            {{#model.category}}
                                <span class="badge bg-secondary">{{model.category}}</span>
                            {{/model.category}}
                            <span class="text-muted small">Ticket #{{model.id}}</span>
                        </div>
                        <div class="tv-title">{{model.title}}</div>
                        <div class="tv-meta">
                            <span><i class="bi bi-flag-fill {{priorityClass}} me-1"></i>P{{model.priority}}</span>
                            {{#assigneeName}}
                                <span>&middot;</span>
                                <span><i class="bi bi-person-fill me-1"></i>{{assigneeName}}</span>
                            {{/assigneeName}}
                            {{#model.group.name}}
                                <span>&middot;</span>
                                <span><i class="bi bi-people me-1"></i>{{model.group.name}}</span>
                            {{/model.group.name}}
                            {{#model.created}}
                                <span>&middot;</span>
                                <span><i class="bi bi-clock me-1"></i>{{model.created|relative}}</span>
                            {{/model.created}}
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-shrink-0">
                        <div data-container="ticket-context-menu"></div>
                    </div>
                </div>
            </div>

            <!-- Linked Incident -->
            <div data-container="linked-incident"></div>

            <!-- Description -->
            <div class="tv-desc">
                <div class="d-flex align-items-center justify-content-between mb-1">
                    <div class="tv-desc-label mb-0"><i class="bi bi-file-text me-1"></i>Description</div>
                    <button class="btn btn-link btn-sm text-muted p-0" data-action="edit-description" title="Edit description" style="font-size: 0.75rem;">
                        <i class="bi bi-pencil me-1"></i>Edit
                    </button>
                </div>
                {{#hasDescription|bool}}
                    <div class="tv-desc-body">{{{descriptionHtml}}}</div>
                {{/hasDescription|bool}}
                {{^hasDescription|bool}}
                    <div class="tv-desc-empty">No description provided.</div>
                {{/hasDescription|bool}}
            </div>

            <!-- Footer -->
            <div class="tv-footer">
                <div class="tv-footer-meta">
                    <i class="bi bi-chat-left-text"></i>
                    {{noteCount}} note{{#noteCount}}{{/noteCount}}s
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-outline-secondary btn-sm" data-action="ask-ai">
                        <i class="bi bi-robot me-1"></i>Ask AI
                    </button>
                    {{#hasPanelSupport|bool}}
                    <button class="btn btn-primary btn-sm" data-action="open-panel">
                        <i class="bi bi-layout-sidebar-reverse me-1"></i>Open Ticket Panel
                    </button>
                    {{/hasPanelSupport|bool}}
                </div>
            </div>
        `;
    }

    async onInit() {
        // Linked Incident
        const incident = this.model.get('incident');
        if (incident && typeof incident === 'object' && incident.id) {
            this.linkedIncident = new LinkedIncidentCard({
                containerId: 'linked-incident',
                incident
            });
            this.addChild(this.linkedIncident);
        }

        // Context Menu
        const ticketMenu = new ContextMenu({
            containerId: 'ticket-context-menu',
            className: "context-menu-view header-menu-absolute",
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit Ticket', action: 'edit-ticket', icon: 'bi-pencil' },
                    { type: 'divider' },
                    { label: 'Change Status', action: 'change-status', icon: 'bi-tag' },
                    { label: 'Set Priority', action: 'set-priority', icon: 'bi-flag' },
                    { label: 'Assign User', action: 'assign-user', icon: 'bi-person' },
                    { type: 'divider' },
                    { label: 'Close Ticket', action: 'close-ticket', icon: 'bi-x-circle', class: 'text-danger' },
                ]
            }
        });
        this.addChild(ticketMenu);
    }

    // ── Actions ──

    async onActionEditDescription() {
        const current = this.model.get('description') || '';
        const escaped = current
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const body = `
            <textarea data-ref="desc-textarea" rows="14" placeholder="Description (markdown supported)..."
                style="width:100%; font-family: var(--bs-font-monospace); font-size: 0.85rem; padding: 10px 12px; border: 1px solid var(--bs-border-color); border-radius: 8px; background: var(--bs-body-bg); color: var(--bs-body-color); resize: vertical; outline: none;">${escaped}</textarea>
            <div class="text-muted small mt-1">Markdown supported</div>
        `;
        const choice = await Modal.dialog({
            title: `Ticket #${this.model.get('id')} — Edit Description`,
            body,
            size: 'lg',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', value: null },
                {
                    text: 'Save', class: 'btn-primary',
                    handler: () => {
                        const ta = document.querySelector('.modal.show [data-ref="desc-textarea"]');
                        return ta ? ta.value : null;
                    }
                }
            ]
        });
        if (choice === null || choice === undefined) return;
        await this.model.save({ description: choice });
        this.render();
    }

    async onActionOpenPanel() {
        const app = this.getApp();
        if (!app?.openTicketPanel) return;

        // Close the dialog, then open the panel
        const dialog = this.element?.closest('.modal');
        if (dialog) {
            const bsModal = window.bootstrap?.Modal?.getInstance(dialog);
            if (bsModal) bsModal.hide();
        }
        app.openTicketPanel(this.model);
    }

    async onActionAskAi() {
        await openAssistantChat(this, 'incident.Ticket');
    }

    async onActionEditTicket() {
        const resp = await Modal.modelForm({
            title: `Edit Ticket #${this.model.get('id')}`,
            model: this.model,
            size: 'lg',
            fields: TicketForms.edit.fields
        });
        if (resp) {
            this.render();
        }
    }

    async onActionChangeStatus() {
        const statuses = ['new', 'open', 'in_progress', 'pending', 'resolved', 'qa', 'closed', 'ignored'];
        const result = await Modal.form({
            title: 'Change Status',
            icon: 'bi-tag',
            size: 'sm',
            fields: [{
                name: 'status', label: 'Status', type: 'select',
                options: statuses.map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) })),
                value: this.model.get('status'),
                required: true
            }]
        });
        if (!result) return;
        await this.model.save({ status: result.status });
        this.render();
    }

    async onActionSetPriority() {
        const result = await Modal.form({
            title: 'Set Priority',
            icon: 'bi-flag',
            size: 'sm',
            fields: [{
                name: 'priority', label: 'Priority', type: 'select',
                value: this.model.get('priority') || 5,
                options: [
                    { value: 10, label: '10 — Critical' },
                    { value: 9, label: '9 — Severe' },
                    { value: 8, label: '8 — High' },
                    { value: 7, label: '7 — Elevated' },
                    { value: 5, label: '5 — Normal' },
                    { value: 3, label: '3 — Low' },
                    { value: 1, label: '1 — Info' }
                ],
                required: true
            }]
        });
        if (!result) return;
        await this.model.save({ priority: parseInt(result.priority) });
        this.render();
    }

    async onActionAssignUser() {
        const data = await Modal.form({
            title: 'Assign User',
            icon: 'bi-person-plus',
            size: 'sm',
            fields: [{
                name: 'assignee', type: 'collection', label: 'User',
                Collection: UserList, labelField: 'display_name', valueField: 'id',
                required: true, cols: 12,
                value: this.model.get('assignee')
            }]
        });
        if (!data) return;
        await this.model.save({ assignee: data.assignee });
        this.getApp()?.toast?.success('Ticket assigned');
        this.render();
    }

    async onActionCloseTicket() {
        const confirmed = await Modal.confirm(
            `Close ticket #${this.model.get('id')}?`,
            'Close Ticket',
            { confirmText: 'Close', confirmClass: 'btn-warning' }
        );
        if (!confirmed) return;
        await this.model.save({ status: 'closed' });
        this.getApp()?.toast?.success('Ticket closed');
        this.render();
    }
}

Ticket.VIEW_CLASS = TicketView;
Ticket.MODEL_REF = 'incident.Ticket';

export default TicketView;
