// Stylesheet: src/extensions/admin/css/admin.css under "TicketView — Lite Modal"

import View from '@core/View.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import Modal from '@core/views/feedback/Modal.js';
import { Ticket, TicketForms, TicketCategories } from '@ext/admin/models/Tickets.js';
import { Incident } from '@ext/admin/models/Incident.js';
import { UserList } from '@core/models/User.js';
import { GroupList } from '@core/models/Group.js';
import IncidentView from './IncidentView.js';
import rest from '@core/Rest.js';
import { openAssistantChat } from '../assistant/AssistantContextChat.js';


const STATUS_OPTIONS = ['new', 'open', 'in_progress', 'pending', 'resolved', 'qa', 'closed', 'ignored'];
const STATUS_PILL = {
    new:         'new',
    open:        'open',
    in_progress: 'prog',
    pending:     'prog',
    resolved:    'resolved',
    qa:          'open',
    closed:      'closed',
    ignored:     'closed'
};
const PRIORITY_OPTIONS = [
    { value: 10, label: 'P10 — Critical' },
    { value: 9,  label: 'P9 — Severe' },
    { value: 8,  label: 'P8 — High' },
    { value: 7,  label: 'P7 — Elevated' },
    { value: 5,  label: 'P5 — Normal' },
    { value: 3,  label: 'P3 — Low' },
    { value: 1,  label: 'P1 — Info' }
];


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


// ── TicketView (Lite Modal) ─────────────────────────────
//
// Compact, glance view shown in a dialog when clicking a ticket row.
// All header fields (status / priority / assignee / category / group) are
// clickable to change inline. "Open Panel" promotes to the full slide-over.
// Description is a read-only preview; hover the block for an Edit button.

class TicketView extends View {
    constructor(options = {}) {
        super({
            className: 'ticket-view',
            ...options
        });

        this.model = options.model || new Ticket(options.data || {});
    }

    async onBeforeRender() {
        const status = this.model.get('status') || 'new';
        this.statusPillClass = STATUS_PILL[status] || 'closed';
        this.statusLabel = status.replace(/_/g, ' ');

        const pri = this.model.get('priority') || 5;
        this.priorityLabel = `P${pri}`;
        this.priorityClass = pri >= 8 ? 'text-danger' : pri >= 7 ? 'text-warning' : 'text-secondary';

        const assignee = this.model.get('assignee');
        this.assigneeName = assignee?.display_name || (typeof assignee === 'string' ? assignee : null) || 'Unassigned';

        this.categoryLabel = this.model.get('category') || 'ticket';
        this.groupName = this.model.get('group.name') || this.model.get('group') || 'None';

        this.hasDescription = !!this.model.get('description');
        this.descriptionHtml = await renderMarkdown(this.model.get('description') || '');
        this.noteCount = this.model.get('note_count') || 0;
        this.hasPanelSupport = !!this.getApp()?.openTicketPanel;

        const incident = this.model.get('incident');
        if (incident && typeof incident === 'object' && incident.id) {
            this.hasLinkedIncident = true;
            this.linkedIncident = {
                id: incident.id,
                title: incident.title || 'Untitled',
                status: incident.status || 'unknown',
                priority: incident.priority
            };
        } else {
            this.hasLinkedIncident = false;
        }

        this.template = `
            <div class="tv-header">
                <div class="tv-title-row">
                    <div class="tv-title-block">
                        <div class="tv-id-row">
                            <span class="tv-id">#{{model.id}}</span>
                            <span class="tv-pill tv-pill-{{statusPillClass}}" data-action="change-status" title="Change status">
                                {{statusLabel}} <i class="bi bi-chevron-down"></i>
                            </span>
                            {{#model.created}}
                                <span class="tv-time"><i class="bi bi-clock"></i>{{model.created|relative}}</span>
                            {{/model.created}}
                            <span class="tv-time"><i class="bi bi-chat-left-text"></i>{{noteCount}} note{{#noteCount}}{{/noteCount}}s</span>
                        </div>
                        <div class="tv-title">{{model.title}}</div>
                        <div class="tv-fields">
                            <span class="tv-field" data-action="change-priority" title="Change priority">
                                <i class="bi bi-flag-fill tv-field-icon {{priorityClass}}"></i>{{priorityLabel}}
                                <i class="bi bi-chevron-down caret"></i>
                            </span>
                            <span class="tv-sep">&middot;</span>
                            <span class="tv-field" data-action="change-assignee" title="Assign user">
                                <i class="bi bi-person tv-field-icon"></i>{{assigneeName}}
                                <i class="bi bi-chevron-down caret"></i>
                            </span>
                            <span class="tv-sep">&middot;</span>
                            <span class="tv-field" data-action="change-category" title="Change category">
                                <i class="bi bi-tag tv-field-icon"></i>{{categoryLabel}}
                                <i class="bi bi-chevron-down caret"></i>
                            </span>
                            <span class="tv-sep">&middot;</span>
                            <span class="tv-field" data-action="change-group" title="Change group">
                                <i class="bi bi-people tv-field-icon"></i>{{groupName}}
                                <i class="bi bi-chevron-down caret"></i>
                            </span>
                        </div>
                    </div>
                    <div class="tv-btns">
                        <button class="tv-btn" data-action="ask-ai" title="Ask AI">
                            <i class="bi bi-robot"></i>
                        </button>
                        {{#hasPanelSupport|bool}}
                            <button class="tv-btn" data-action="open-panel" title="Open in side panel">
                                <i class="bi bi-layout-sidebar-reverse"></i>
                            </button>
                        {{/hasPanelSupport|bool}}
                        <div data-container="ticket-context-menu"></div>
                    </div>
                </div>
            </div>

            <div class="tv-body">
                {{#hasLinkedIncident|bool}}
                    <div class="tv-linked" data-action="open-incident" title="Open linked incident">
                        <i class="bi bi-exclamation-triangle-fill tv-linked-icon"></i>
                        <span class="ltitle">Incident #{{linkedIncident.id}} &middot; {{linkedIncident.title}}</span>
                        <span class="lpill">{{linkedIncident.status}}</span>
                        {{#linkedIncident.priority}}
                            <span class="ltrail">P{{linkedIncident.priority}}</span>
                        {{/linkedIncident.priority}}
                        <i class="bi bi-box-arrow-up-right ltrail"></i>
                    </div>
                {{/hasLinkedIncident|bool}}

                <div class="tv-desc">
                    <button class="tv-desc-edit" data-action="edit-description" title="Edit description">
                        <i class="bi bi-pencil me-1"></i>Edit
                    </button>
                    {{#hasDescription|bool}}
                        <div class="tv-desc-body">{{{descriptionHtml}}}</div>
                    {{/hasDescription|bool}}
                    {{^hasDescription|bool}}
                        <div class="tv-desc-empty tv-desc-add" data-action="edit-description">
                            <i class="bi bi-plus-circle me-1"></i>Add description
                        </div>
                    {{/hasDescription|bool}}
                </div>
            </div>
        `;
    }

    async onInit() {
        const ticketMenu = new ContextMenu({
            containerId: 'ticket-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                btnClass: 'tv-btn',
                items: [
                    { label: 'Edit Ticket', action: 'edit-ticket', icon: 'bi-pencil' },
                    { label: 'Edit Description', action: 'edit-description', icon: 'bi-file-text' },
                    { type: 'divider' },
                    { label: 'Close Ticket', action: 'close-ticket', icon: 'bi-x-circle', class: 'text-danger' },
                ]
            }
        });
        this.addChild(ticketMenu);
    }

    // ── Save helper ──

    async _saveAndSync(patch) {
        await this.model.save(patch);
        // Some endpoints don't echo the updated record on PUT; refetch so the
        // header reads accurate values for fields like assignee / group / category.
        try { await this.model.fetch(); } catch (_e) { /* ignore */ }
        this.render();
    }

    // ── Inline select helper (mirrors TicketPanelView's pattern) ──

    async _showInlineSelect(items, event) {
        return new Promise((resolve) => {
            let picked = false;
            const menu = new ContextMenu({
                config: {
                    items: items.map((item, i) => ({
                        label: item.label,
                        action: `pick-${i}`,
                        class: item.active ? 'fw-bold' : '',
                        handler: () => {
                            picked = true;
                            this.removeChild(menu);
                            resolve(item.value);
                        }
                    }))
                }
            });
            const origClose = menu.closeDropdown.bind(menu);
            menu.closeDropdown = () => {
                origClose();
                if (!picked) {
                    this.removeChild(menu);
                    resolve(null);
                }
            };
            this.addChild(menu);
            menu.openAt(event.clientX, event.clientY);
        });
    }

    // ── Actions ──

    async onActionChangeStatus(event) {
        const items = STATUS_OPTIONS.map(s => ({
            label: s.replace(/_/g, ' '),
            value: s,
            active: s === this.model.get('status')
        }));
        const result = await this._showInlineSelect(items, event);
        if (!result) return;
        await this._saveAndSync({ status: result });
    }

    async onActionChangePriority(event) {
        const items = PRIORITY_OPTIONS.map(p => ({
            label: p.label,
            value: p.value,
            active: p.value === this.model.get('priority')
        }));
        const result = await this._showInlineSelect(items, event);
        if (result === null || result === undefined) return;
        await this._saveAndSync({ priority: parseInt(result) });
    }

    async onActionChangeCategory(event) {
        const items = Object.entries(TicketCategories).map(([key, label]) => ({
            label,
            value: key,
            active: key === this.model.get('category')
        }));
        const result = await this._showInlineSelect(items, event);
        if (!result) return;
        await this._saveAndSync({ category: result });
    }

    async onActionChangeAssignee() {
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
        await this._saveAndSync({ assignee: data.assignee });
        this.getApp()?.toast?.success('Ticket assigned');
    }

    async onActionChangeGroup() {
        const data = await Modal.form({
            title: 'Change Group',
            icon: 'bi-people',
            size: 'sm',
            fields: [{
                name: 'group', type: 'collection', label: 'Group',
                Collection: GroupList, labelField: 'name', valueField: 'id',
                required: false, cols: 12,
                value: this.model.get('group')
            }]
        });
        if (!data) return;
        await this._saveAndSync({ group: data.group });
    }

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
        await this._saveAndSync({ description: choice });
    }

    async onActionOpenPanel() {
        const app = this.getApp();
        if (!app?.openTicketPanel) return;
        const dialog = this.element?.closest('.modal');
        if (dialog) {
            const bsModal = window.bootstrap?.Modal?.getInstance(dialog);
            if (bsModal) bsModal.hide();
        }
        app.openTicketPanel(this.model);
    }

    async onActionOpenIncident() {
        if (!this.linkedIncident?.id) return;
        try {
            const incident = new Incident({ id: this.linkedIncident.id });
            await incident.fetch({ params: { graph: 'detailed' } });
            const view = new IncidentView({ model: incident });
            await Modal.detail(view);
        } catch (_e) {
            this.getApp()?.toast?.error('Failed to load incident');
        }
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
        if (resp) this.render();
    }

    async onActionCloseTicket() {
        const confirmed = await Modal.confirm(
            `Close ticket #${this.model.get('id')}?`,
            'Close Ticket',
            { confirmText: 'Close', confirmClass: 'btn-warning' }
        );
        if (!confirmed) return;
        await this._saveAndSync({ status: 'closed' });
        this.getApp()?.toast?.success('Ticket closed');
    }
}

Ticket.VIEW_CLASS = TicketView;
Ticket.MODEL_REF = 'incident.Ticket';

export default TicketView;
