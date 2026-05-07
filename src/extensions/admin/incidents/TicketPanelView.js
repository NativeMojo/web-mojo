import View from '@core/View.js';
import ChatView from '@core/views/chat/ChatView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import Modal from '@core/views/feedback/Modal.js';
import { Ticket, TicketForms, TicketCategories } from '@ext/admin/models/Tickets.js';
import { Incident } from '@ext/admin/models/Incident.js';
import { GroupList } from '@core/models/Group.js';
import { UserList } from '@core/models/User.js';
import TicketNoteAdapter from './adapters/TicketNoteAdapter.js';
import ActionCardView from './ActionCardView.js';
import ResolvedActionsSummaryView from './ResolvedActionsSummaryView.js';
import rest from '@core/Rest.js';


const STATUS_OPTIONS = ['new', 'open', 'in_progress', 'pending', 'resolved', 'qa', 'closed', 'ignored'];
const STATUS_PILL = {
    new:         'pill-new',
    open:        'pill-open',
    in_progress: 'pill-prog',
    pending:     'pill-prog',
    resolved:    'pill-resolved',
    qa:          'pill-open',
    closed:      'pill-closed',
    ignored:     'pill-closed'
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

class TicketPanelView extends View {
    constructor(options = {}) {
        super({
            className: 'ticket-panel-view',
            ...options
        });
        this.model = options.model || new Ticket(options.data || {});
    }

    onBeforeRender() {
        const status = this.model.get('status') || 'new';
        this.statusPill = STATUS_PILL[status] || 'pill-closed';
        this.statusLabel = (status || '').replace(/_/g, ' ');
        this.priorityLabel = `P${this.model.get('priority') || 5}`;
        this.assigneeName = this.model.get('assignee.display_name') || this.model.get('assignee') || 'Unassigned';
        this.categoryLabel = this.model.get('category') || 'ticket';
        this.groupName = this.model.get('group.name') || this.model.get('group') || 'None';
        this.hasDescription = !!this.model.get('description');
        this.hasIncident = !!(this.model.get('incident') && typeof this.model.get('incident') === 'object' && this.model.get('incident').id);
        this.aiEnabled = !!this.model.get('metadata.enable_llm');
        this.priorityColor = (this.model.get('priority') || 5) >= 7 ? 'var(--bs-danger)' : 'var(--bs-secondary-color)';

        this.template = `
            <style>
                .ticket-panel-view { height: 100%; display: flex; flex-direction: column; }
                .tp-header { padding: 8px 16px 6px; border-bottom: 1px solid var(--bs-border-color-translucent); flex-shrink: 0; }
                .tp-topbar { display: flex; align-items: center; gap: 6px; }
                .tp-id { font-family: var(--bs-font-monospace); font-size: 0.72rem; color: var(--bs-secondary-color); }
                .tp-pill { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 0.68rem; font-weight: 500; cursor: pointer; transition: filter 0.12s; }
                .tp-pill:hover { filter: brightness(0.9); }
                .tp-pill-new { background: rgba(var(--bs-info-rgb), 0.1); color: var(--bs-info); }
                .tp-pill-open { background: rgba(var(--bs-success-rgb), 0.1); color: var(--bs-success); }
                .tp-pill-prog { background: rgba(var(--bs-warning-rgb), 0.1); color: var(--bs-warning); }
                .tp-pill-closed { background: var(--bs-secondary-bg); color: var(--bs-secondary-color); }
                .tp-pill-resolved { background: rgba(var(--bs-success-rgb), 0.1); color: var(--bs-success); }
                .tp-time { font-size: 0.68rem; color: var(--bs-secondary-color); margin-left: 2px; }
                .tp-btns { margin-left: auto; display: flex; gap: 2px; align-items: center; flex-shrink: 0; }
                .tp-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: none; background: none; color: var(--bs-secondary-color); border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.12s; }
                .tp-btn:hover { background: var(--bs-tertiary-bg); color: var(--bs-body-color); }
                .tp-title { font-size: 0.84rem; font-weight: 500; color: var(--bs-emphasis-color); line-height: 1.3; margin: 3px 0 0; cursor: ${this.hasDescription ? 'pointer' : 'default'}; transition: color 0.12s; }
                ${this.hasDescription ? '.tp-title:hover { color: var(--bs-primary); }' : ''}
                .tp-title i { font-size: 0.6rem; vertical-align: middle; margin-left: 3px; opacity: 0; transition: opacity 0.12s; }
                .tp-title:hover i { opacity: 0.6; }
                .tp-meta { display: flex; align-items: center; gap: 3px; margin-top: 4px; }
                .tp-fields { display: inline-flex; align-items: center; gap: 2px; flex-wrap: wrap; }
                .tp-field { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; color: var(--bs-secondary-color); padding: 2px 7px; border-radius: 5px; cursor: pointer; transition: all 0.12s; border: 1px solid transparent; }
                .tp-field:hover { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }
                .tp-field i { font-size: 0.68rem; }
                .tp-field .caret { font-size: 0.55rem; opacity: 0; transition: opacity 0.12s; margin-left: -1px; }
                .tp-field:hover .caret { opacity: 0.6; }
                .tp-sep { color: var(--bs-secondary-color); font-size: 0.6rem; margin: 0 1px; user-select: none; }

                .tp-linked { display: flex; align-items: center; gap: 6px; padding: 7px 16px; border-bottom: 1px solid var(--bs-border-color-translucent); font-size: 0.75rem; color: var(--bs-secondary-color); flex-shrink: 0; }
                .tp-linked i { color: var(--bs-warning); font-size: 0.72rem; }
                .tp-linked a { color: var(--bs-primary); text-decoration: none; font-weight: 500; }
                .tp-linked a:hover { text-decoration: underline; }
                .tp-linked .lpill { font-size: 0.62rem; padding: 0 5px; border-radius: 3px; background: rgba(var(--bs-warning-rgb), 0.1); color: var(--bs-warning); font-weight: 500; }

                .tp-conv { flex: 1; overflow-y: auto; min-height: 0; }
                .tp-conv .chat-container { border: none; border-radius: 0; }
                .tp-conv .chat-messages { padding: 6px 0; }
                .tp-conv .chat-input-wrapper { display: none; }

                .tp-action-area { padding: 0; }

                .tp-input { border-top: 1px solid var(--bs-border-color-translucent); padding: 10px 16px; flex-shrink: 0; }
                .tp-input-wrap { display: flex; align-items: flex-end; gap: 8px; }
                .tp-input textarea { flex: 1; font-size: 0.8rem; border: 1px solid var(--bs-border-color); border-radius: 8px; padding: 7px 10px; resize: none; background: var(--bs-body-bg); color: var(--bs-body-color); outline: none; transition: border-color 0.15s; font-family: inherit; }
                .tp-input textarea:focus { border-color: var(--bs-primary); }
                .tp-input textarea::placeholder { color: var(--bs-secondary-color); }
                .tp-send-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--bs-primary); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; font-size: 0.85rem; transition: filter 0.12s; }
                .tp-send-btn:hover { filter: brightness(1.1); }
                .tp-input-tools { display: flex; gap: 2px; margin-top: 4px; }
                .tp-tool-btn { border: none; background: none; color: var(--bs-secondary-color); font-size: 0.78rem; padding: 2px 5px; border-radius: 4px; cursor: pointer; transition: all 0.12s; }
                .tp-tool-btn:hover { background: var(--bs-tertiary-bg); color: var(--bs-body-color); }

                .tp-ai-switch { display: flex; align-items: center; gap: 5px; margin-right: 6px; }
                .tp-ai-switch label { font-size: 0.7rem; font-weight: 500; color: var(--bs-secondary-color); cursor: pointer; margin: 0; user-select: none; }
                .tp-ai-switch .form-check-input:checked ~ label { color: var(--bs-primary); }
                .tp-ai-switch .form-check-input { width: 1.8em; height: 1em; margin: 0; cursor: pointer; }
                .tp-ai-switch .form-check-input:focus { box-shadow: none; }
            </style>

            <div class="tp-header">
                <div class="tp-topbar">
                    <span class="tp-id">#{{model.id}}</span>
                    <span class="tp-pill tp-${this.statusPill}" data-action="change-status" title="Change status">{{statusLabel}} <i class="bi bi-chevron-down" style="font-size:0.5rem;"></i></span>
                    <span class="tp-time"><i class="bi bi-clock"></i> {{model.created|relative}}</span>
                    <div class="tp-btns">
                        <div class="tp-ai-switch form-check form-switch">
                            <input class="form-check-input" type="checkbox" role="switch" data-action="toggle-ai" ${this.aiEnabled ? 'checked' : ''}>
                            <label>AI</label>
                        </div>
                        <div data-container="panel-menu"></div>
                        <button class="tp-btn" data-action="close" title="Close"><i class="bi bi-x-lg"></i></button>
                    </div>
                </div>
                <div class="tp-title" ${this.hasDescription ? 'data-action="show-description"' : ''} ${this.hasDescription ? 'title="View full description"' : ''}>
                    {{model.title}}${this.hasDescription ? ' <i class="bi bi-arrow-up-right-square"></i>' : ''}
                </div>
                <div class="tp-meta">
                    <div class="tp-fields">
                        <span class="tp-field" data-action="change-priority" title="Change priority">
                            <i class="bi bi-flag-fill" style="color:${this.priorityColor};"></i>{{priorityLabel}}
                            <i class="bi bi-chevron-down caret"></i>
                        </span>
                        <span class="tp-sep">&middot;</span>
                        <span class="tp-field" data-action="change-assignee" title="Assign">
                            <i class="bi bi-person"></i>{{assigneeName}}
                            <i class="bi bi-chevron-down caret"></i>
                        </span>
                        <span class="tp-sep">&middot;</span>
                        <span class="tp-field" data-action="change-category" title="Change category">
                            <i class="bi bi-tag"></i>{{categoryLabel}}
                            <i class="bi bi-chevron-down caret"></i>
                        </span>
                        <span class="tp-sep">&middot;</span>
                        <span class="tp-field" data-action="change-group" title="Change group">
                            <i class="bi bi-people"></i>{{groupName}}
                            <i class="bi bi-chevron-down caret"></i>
                        </span>
                    </div>
                </div>
            </div>

            {{#hasIncident|bool}}
            <div class="tp-linked">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <a href="#" data-action="view-incident">Incident #{{model.incident.id}}</a>
                {{#model.incident.status}}<span class="lpill">{{model.incident.status}}</span>{{/model.incident.status}}
                {{#model.incident.event_count}}<span>&middot; {{model.incident.event_count}} events</span>{{/model.incident.event_count}}
            </div>
            {{/hasIncident|bool}}

            <div class="tp-conv" data-container="chat-area"></div>

            <div class="tp-action-area" data-container="action-cards"></div>

            <div class="tp-input">
                <div class="tp-input-wrap">
                    <textarea rows="1" placeholder="Add a note..." data-action="note-input"></textarea>
                    <button class="tp-send-btn" data-action="send-note" title="Send"><i class="bi bi-arrow-up"></i></button>
                </div>
                <div class="tp-input-tools">
                    <button class="tp-tool-btn" title="Attach file" data-action="attach-file"><i class="bi bi-paperclip"></i></button>
                </div>
            </div>
        `;
    }

    async onInit() {
        this.adapter = new TicketNoteAdapter(this.model.get('id'));

        this.chatView = new ChatView({
            containerId: 'chat-area',
            adapter: this.adapter,
            theme: 'compact',
            currentUserId: this._getCurrentUserId(),
            showInput: false
        });
        this.addChild(this.chatView);

        const menu = new ContextMenu({
            containerId: 'panel-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots',
                btnClass: 'tp-btn',
                items: [
                    { label: 'Edit Ticket', action: 'edit-ticket', icon: 'bi-pencil' },
                    { type: 'divider' },
                    { label: 'Refresh Notes', action: 'refresh-notes', icon: 'bi-arrow-clockwise' },
                    { type: 'divider' },
                    { label: 'Close Ticket', action: 'close-ticket', icon: 'bi-x-circle', class: 'text-danger' }
                ]
            }
        });
        this.addChild(menu);
    }

    async onAfterRender() {
        await this._loadActionCards();
    }

    async _loadActionCards() {
        const messages = this.chatView.messages || [];
        const resolved = [];
        let pendingAction = null;
        let pendingNoteId = null;

        for (const msg of messages) {
            if (msg.action) {
                if (msg.action.resolved) {
                    resolved.push({ ...msg.action, noteId: msg.id });
                } else if (msg.action.type === 'context') {
                    // context cards always render inline — not collapsible
                } else {
                    pendingAction = msg.action;
                    pendingNoteId = msg.id;
                }
            }
        }

        const container = this.el?.querySelector('[data-container="action-cards"]');
        if (!container) return;

        if (resolved.length > 0) {
            const summary = new ResolvedActionsSummaryView({
                actions: resolved,
                ticketStatus: this.model.get('status')
            });
            this.addChild(summary);
            await summary.render();
            container.appendChild(summary.element);
        }

        if (pendingAction) {
            const card = new ActionCardView({
                action: pendingAction,
                noteId: pendingNoteId,
                ticketStatus: this.model.get('status')
            });
            card.on('action:respond', (data) => this._handleActionResponse(data));
            this.addChild(card);
            await card.render();
            container.appendChild(card.element);
        }
    }

    async _handleActionResponse(data) {
        const actionNote = { action: { handler: data.handler, context: data.context } };
        this.showLoading();
        try {
            await this.adapter.addActionResponse(actionNote, data.action);
            await this.model.fetch();
            await this.chatView.refresh();
            this.render();
        } finally {
            this.hideLoading();
        }
    }

    _getCurrentUserId() {
        return window.app?.state?.user?.id || null;
    }

    // ── Actions ──

    onActionClose() {
        this.emit('panel:close');
    }

    async onActionSendNote() {
        const textarea = this.el?.querySelector('textarea');
        const text = textarea?.value?.trim();
        if (!text) return;
        textarea.value = '';
        await this.adapter.addNote({ text });
        await this.chatView.refresh();
    }

    onActionNoteInput(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.onActionSendNote();
        }
    }

    async onActionToggleAi(_event, el) {
        const enabled = el.checked;
        await this.model.save(enabled ? { enable_llm: true } : { disable_llm: true });
        this.getApp()?.toast?.success(enabled ? 'AI enabled' : 'AI disabled');
    }

    async onActionChangeStatus(event) {
        const items = STATUS_OPTIONS.map(s => ({
            label: s.replace(/_/g, ' '),
            value: s,
            active: s === this.model.get('status')
        }));
        const result = await this._showInlineSelect(items, event);
        if (!result) return;
        await this.model.save({ status: result });
        this.render();
    }

    async onActionChangePriority(event) {
        const items = PRIORITY_OPTIONS.map(p => ({
            label: p.label,
            value: p.value,
            active: p.value === this.model.get('priority')
        }));
        const result = await this._showInlineSelect(items, event);
        if (!result) return;
        await this.model.save({ priority: parseInt(result) });
        this.render();
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
        await this.model.save({ assignee: data.assignee });
        this.render();
    }

    async onActionChangeCategory(event) {
        const items = Object.entries(TicketCategories).map(([key, label]) => ({
            label,
            value: key,
            active: key === this.model.get('category')
        }));
        const result = await this._showInlineSelect(items, event);
        if (!result) return;
        await this.model.save({ category: result });
        this.render();
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
        await this.model.save({ group: data.group });
        this.render();
    }

    async onActionShowDescription() {
        const raw = this.model.get('description') || '';
        let rendered = false;
        let html = '';
        try {
            const resp = await rest.post('/api/docit/render', { markdown: raw });
            html = resp?.data?.data?.html || resp?.data?.html || '';
            rendered = !!html;
        } catch (_e) { /* fallback to escaped text */ }
        if (!rendered) {
            const div = document.createElement('div');
            div.textContent = raw;
            html = `<pre style="white-space:pre-wrap;">${div.innerHTML}</pre>`;
        }
        await Modal.dialog({
            title: `Ticket #${this.model.get('id')} — Description`,
            body: `<div style="font-size:0.85rem; line-height:1.65;">${html}</div>`,
            size: 'lg'
        });
    }

    async onActionViewIncident() {
        const incident = this.model.get('incident');
        if (incident?.id) {
            Modal.showModel(new Incident({ id: incident.id }));
        }
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

    async onActionRefreshNotes() {
        await this.chatView.refresh();
        this.getApp()?.toast?.success('Notes refreshed');
    }

    async onActionCloseTicket() {
        const confirmed = await Modal.confirm(
            `Close ticket #${this.model.get('id')}?`,
            'Close Ticket',
            { confirmText: 'Close', confirmClass: 'btn-warning' }
        );
        if (!confirmed) return;
        await this.model.save({ status: 'closed' });
        this.render();
    }

    async _showInlineSelect(items, event) {
        return new Promise((resolve) => {
            let picked = false;
            const menu = new ContextMenu({
                config: {
                    items: items.map(item => ({
                        label: item.label,
                        action: 'pick',
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

    async setTicket(ticket) {
        this.model = ticket;
        this.render();
    }
}

export default TicketPanelView;
