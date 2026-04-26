import View from '@core/View.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { Ticket, TicketForms } from '@ext/admin/models/Tickets.js';
import { Incident } from '@ext/admin/models/Incident.js';
import { UserList } from '@core/models/User.js';
import ChatView from '@core/views/chat/ChatView.js';
import TicketNoteAdapter from './adapters/TicketNoteAdapter.js';
import Dialog from '@core/views/feedback/Dialog.js';
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


// ── Ticket Description Section ──────────────────────────

class TicketDescriptionSection extends View {
    constructor(options = {}) {
        super({
            className: 'ticket-description-section',
            ...options
        });

        this.descriptionHtml = '';
        this.template = `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="ticket-description-content">{{{descriptionHtml}}}</div>
                </div>
            </div>
        `;
    }

    async onBeforeRender() {
        const description = this.model.get('description') || '';
        this.descriptionHtml = await renderMarkdown(description);
    }
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
        this.incidentScope = this.incident.scope || '';

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
            const dialog = new Dialog({
                header: false,
                size: 'xl',
                body: view,
                buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
            });
            await dialog.render(true, document.body);
            dialog.show();
        } catch (e) {
            this.getApp()?.toast?.error('Failed to load incident');
        }
    }
}


// ── TicketView ──────────────────────────────────────────

class TicketView extends View {
    constructor(options = {}) {
        super({
            className: 'ticket-view',
            ...options
        });

        this.model = options.model || new Ticket(options.data || {});

        this.template = `
            <div class="ticket-view-container d-flex flex-column h-100">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-3 flex-shrink-0">
                    <div class="flex-grow-1" style="min-width: 0;">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            {{{statusBadge}}}
                            {{#model.category}}
                                <span class="badge bg-secondary">{{model.category}}</span>
                            {{/model.category}}
                            <span class="text-muted small">Ticket #{{model.id}}</span>
                        </div>
                        <h4 class="mb-1">{{model.title}}</h4>
                        <div class="text-muted small d-flex align-items-center gap-3 flex-wrap">
                            <span><i class="bi bi-flag-fill me-1"></i>Priority {{model.priority}}</span>
                            {{#assigneeName}}
                                <span><i class="bi bi-person-fill me-1"></i>{{assigneeName}}</span>
                            {{/assigneeName}}
                            {{#model.created}}
                                <span><i class="bi bi-clock me-1"></i>{{model.created|relative}}</span>
                            {{/model.created}}
                            {{#model.modified}}
                                <span><i class="bi bi-pencil me-1"></i>{{model.modified|relative}}</span>
                            {{/model.modified}}
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-shrink-0">
                        <button class="btn btn-outline-primary btn-sm" data-action="ask-ai" data-bs-toggle="tooltip" title="Chat with AI about this ticket">
                            <i class="bi bi-robot me-1"></i>Ask AI
                        </button>
                        <div data-container="ticket-context-menu"></div>
                    </div>
                </div>

                <!-- Linked Incident -->
                <div data-container="linked-incident"></div>

                <!-- Description (collapsible) -->
                {{#hasDescription|bool}}
                <div class="mb-3">
                    <a class="text-muted small d-inline-flex align-items-center gap-1" data-bs-toggle="collapse" href="#ticket-desc-{{model.id}}" role="button" aria-expanded="false">
                        <i class="bi bi-chevron-right"></i>
                        <i class="bi bi-file-text me-1"></i>Description
                    </a>
                    <div class="collapse" id="ticket-desc-{{model.id}}">
                        <div data-container="ticket-description" class="mt-2"></div>
                    </div>
                </div>
                {{/hasDescription|bool}}

                <!-- Chat / Notes -->
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <h6 class="mb-0 text-muted"><i class="bi bi-chat-left-text me-1"></i>Notes</h6>
                    <button class="btn btn-outline-secondary btn-sm" data-action="refresh-notes">
                        <i class="bi bi-arrow-clockwise"></i>
                    </button>
                </div>
                <div class="flex-grow-1" style="min-height: 0;" data-container="chat-view"></div>
            </div>
        `;
    }

    async onBeforeRender() {
        this.statusBadge = getStatusBadge(this.model.get('status'));
        const assignee = this.model.get('assignee');
        this.assigneeName = assignee?.display_name || (typeof assignee === 'string' ? assignee : null);
        this.hasDescription = !!this.model.get('description');
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

        // Description
        if (this.model.get('description')) {
            this.descriptionView = new TicketDescriptionSection({
                containerId: 'ticket-description',
                model: this.model
            });
            this.addChild(this.descriptionView);
        }

        // Chat View
        this.adapter = new TicketNoteAdapter(this.model.get('id'));
        this.chatView = new ChatView({
            containerId: 'chat-view',
            adapter: this.adapter,
            theme: 'compact',
            currentUserId: this.getCurrentUserId(),
            inputPlaceholder: 'Add a note...',
            inputButtonText: 'Add Note'
        });
        this.addChild(this.chatView);

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

    getCurrentUserId() {
        const currentUser = window.app?.state?.user;
        return currentUser?.id || null;
    }

    async onActionRefreshNotes() {
        await this.chatView.refresh();
        this.getApp()?.toast?.success('Notes refreshed');
    }

    async onActionAskAi() {
        await openAssistantChat(this, 'incident.Ticket');
    }

    // ── Context Menu Actions ──

    async onActionEditTicket() {
        const resp = await Dialog.showModelForm({
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
        const result = await Dialog.showForm({
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
        const result = await Dialog.showForm({
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
        const data = await Dialog.showForm({
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
        const confirmed = await Dialog.confirm(
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

export default TicketView;
