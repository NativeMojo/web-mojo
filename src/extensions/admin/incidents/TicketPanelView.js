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
import { openAssistantChat } from '../assistant/AssistantContextChat.js';
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
        this.priorityColor = (this.model.get('priority') || 5) >= 7 ? 'var(--bs-danger)' : 'var(--bs-secondary-color)';

        this.template = `
            <style>
                .ticket-panel-view { height: 100%; display: flex; flex-direction: column; }
                .tp-header { padding: 10px 16px 6px; border-bottom: 1px solid var(--bs-border-color-translucent); flex-shrink: 0; }
                .tp-title-row { display: flex; align-items: flex-start; gap: 6px; }
                .tp-title { font-size: 0.88rem; font-weight: 600; color: var(--bs-emphasis-color); line-height: 1.3; flex: 1; min-width: 0; cursor: ${this.hasDescription ? 'pointer' : 'default'}; transition: color 0.12s; }
                ${this.hasDescription ? '.tp-title:hover { color: var(--bs-primary); }' : ''}
                .tp-title i { font-size: 0.6rem; vertical-align: middle; margin-left: 3px; opacity: 0; transition: opacity 0.12s; }
                .tp-title:hover i { opacity: 0.6; }
                .tp-btns { display: flex; gap: 2px; align-items: center; flex-shrink: 0; }
                .tp-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: none; background: none; color: var(--bs-secondary-color); border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.12s; }
                .tp-btn:hover { background: var(--bs-tertiary-bg); color: var(--bs-body-color); }
                .tp-sub { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
                .tp-id { font-family: var(--bs-font-monospace); font-size: 0.7rem; color: var(--bs-secondary-color); }
                .tp-pill { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 0.66rem; font-weight: 500; cursor: pointer; transition: filter 0.12s; }
                .tp-pill:hover { filter: brightness(0.9); }
                .tp-pill-new { background: rgba(var(--bs-info-rgb), 0.1); color: var(--bs-info); }
                .tp-pill-open { background: rgba(var(--bs-success-rgb), 0.1); color: var(--bs-success); }
                .tp-pill-prog { background: rgba(var(--bs-warning-rgb), 0.1); color: var(--bs-warning); }
                .tp-pill-closed { background: var(--bs-secondary-bg); color: var(--bs-secondary-color); }
                .tp-pill-resolved { background: rgba(var(--bs-success-rgb), 0.1); color: var(--bs-success); }
                .tp-time { font-size: 0.66rem; color: var(--bs-secondary-color); }
                .tp-desc-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 0.7rem; color: var(--bs-primary); cursor: pointer; padding: 2px 8px; border-radius: 5px; background: rgba(var(--bs-primary-rgb), 0.08); transition: all 0.12s; }
                .tp-desc-chip:hover { background: rgba(var(--bs-primary-rgb), 0.16); }
                .tp-desc-chip i { font-size: 0.7rem; }
                .tp-meta { display: flex; align-items: center; gap: 3px; margin-top: 5px; }
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
                .tp-conv .message-item { position: relative; }
                .tp-conv .tp-edit-btn { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; display: none; align-items: center; justify-content: center; border: none; background: var(--bs-tertiary-bg); color: var(--bs-secondary-color); border-radius: 5px; cursor: pointer; font-size: 0.72rem; transition: all 0.12s; }
                .tp-conv .tp-edit-btn:hover { background: var(--bs-secondary-bg); color: var(--bs-body-color); }
                .tp-conv .message-item:hover .tp-edit-btn { display: flex; }
                .tp-conv .message-text { white-space: normal; }
                .tp-conv .message-text p { margin-bottom: 6px; }
                .tp-conv .message-text p:last-child { margin-bottom: 0; }
                .tp-conv .message-text h1,
                .tp-conv .message-text h2,
                .tp-conv .message-text h3,
                .tp-conv .message-text h4,
                .tp-conv .message-text h5,
                .tp-conv .message-text h6 { font-weight: 600; margin-top: 10px; margin-bottom: 4px; line-height: 1.3; }
                .tp-conv .message-text h1 { font-size: 1.05rem; }
                .tp-conv .message-text h2 { font-size: 1rem; }
                .tp-conv .message-text h3 { font-size: 0.95rem; }
                .tp-conv .message-text h4,
                .tp-conv .message-text h5,
                .tp-conv .message-text h6 { font-size: 0.88rem; }
                .tp-conv .message-text h1:first-child,
                .tp-conv .message-text h2:first-child,
                .tp-conv .message-text h3:first-child { margin-top: 0; }
                .tp-conv .message-text hr { margin: 4px 0; opacity: 0.15; }
                .tp-conv .message-text ul,
                .tp-conv .message-text ol { padding-left: 20px; margin-top: 2px; margin-bottom: 6px; }
                .tp-conv .message-text li { margin-bottom: 2px; }
                .tp-conv .message-text pre { background: var(--bs-tertiary-bg); border-radius: 6px; padding: 10px 14px; margin: 8px 0; font-size: 0.8rem; overflow-x: auto; }
                .tp-conv .message-text code { font-size: 0.85em; padding: 1px 5px; background: var(--bs-tertiary-bg); border-radius: 4px; }
                .tp-conv .message-text pre code { padding: 0; background: none; }
                .tp-conv .message-text table { width: 100%; margin: 8px 0; border-collapse: collapse; font-size: 0.82rem; }
                .tp-conv .message-text th,
                .tp-conv .message-text td { padding: 5px 8px; border: 1px solid var(--bs-border-color); text-align: left; }
                .tp-conv .message-text th { background: var(--bs-tertiary-bg); font-weight: 600; }
                .tp-conv .message-text blockquote { margin: 6px 0; padding: 4px 12px; border-left: 3px solid var(--bs-border-color); color: var(--bs-secondary-color); }

                .tp-action-area { padding: 0; }

                .tp-input { border-top: 1px solid var(--bs-border-color-translucent); padding: 10px 16px; flex-shrink: 0; }
                .tp-input-wrap { display: flex; align-items: flex-end; gap: 8px; }
                .tp-input textarea { flex: 1; font-size: 0.8rem; border: 1px solid var(--bs-border-color); border-radius: 8px; padding: 7px 10px; resize: none; background: var(--bs-body-bg); color: var(--bs-body-color); outline: none; transition: border-color 0.15s; font-family: inherit; max-height: 160px; overflow-y: auto; }
                .tp-input textarea:focus { border-color: var(--bs-primary); }
                .tp-input textarea::placeholder { color: var(--bs-secondary-color); }
                .tp-send-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--bs-primary); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; font-size: 0.85rem; transition: filter 0.12s; }
                .tp-send-btn:hover { filter: brightness(1.1); }
                .tp-input-hint { display: flex; align-items: center; gap: 4px; margin-top: 4px; font-size: 0.7rem; color: var(--bs-secondary-color); }
                .tp-input-hint i { font-size: 0.75rem; }
                .tp-input.tp-dragover { background: rgba(var(--bs-primary-rgb), 0.04); }
                .tp-input.tp-dragover textarea { border-color: var(--bs-primary); border-style: dashed; }
                .tp-attachments { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 0; }
                .tp-attach-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: var(--bs-tertiary-bg); border: 1px solid var(--bs-border-color); border-radius: 6px; font-size: 0.72rem; color: var(--bs-body-color); }
                .tp-attach-chip i { font-size: 0.68rem; }
                .tp-attach-chip .remove { cursor: pointer; color: var(--bs-secondary-color); margin-left: 2px; }
                .tp-attach-chip .remove:hover { color: var(--bs-danger); }
                .tp-attach-chip.uploading { opacity: 0.6; }
                .tp-conv .message-content.tp-collapsed { max-height: var(--tp-collapse-h, 52px); overflow: hidden; position: relative; -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%); mask-image: linear-gradient(to bottom, black 60%, transparent 100%); }
                .tp-conv .message-item:has(.tp-show-more) { flex-wrap: wrap; }
                .tp-show-more { background: none; border: none; padding: 2px 0; margin: -2px 0 0 48px; font-size: 0.7rem; color: var(--bs-secondary-color); cursor: pointer; text-align: left; width: calc(100% - 48px); }
                .tp-show-more:hover { color: var(--bs-body-color); }
            </style>

            <div class="tp-header">
                <div class="tp-title-row">
                    <div class="tp-title" ${this.hasDescription ? 'data-action="show-description"' : ''} ${this.hasDescription ? 'title="View full description"' : ''}>
                        {{model.title}}${this.hasDescription ? ' <i class="bi bi-arrow-up-right-square"></i>' : ''}
                    </div>
                    <div class="tp-btns">
                        <div data-container="panel-menu"></div>
                    </div>
                </div>
                <div class="tp-sub">
                    <span class="tp-id">#{{model.id}}</span>
                    <span class="tp-pill tp-${this.statusPill}" data-action="change-status" title="Change status">{{statusLabel}} <i class="bi bi-chevron-down" style="font-size:0.5rem;"></i></span>
                    <span class="tp-time"><i class="bi bi-clock"></i> {{model.created|relative}}</span>
                    <span class="tp-desc-chip" data-action="show-description" title="${this.hasDescription ? 'View / edit description' : 'Add description'}"><i class="bi bi-file-text"></i> ${this.hasDescription ? 'Description' : 'Add description'}</span>
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

            <div class="tp-conv">
                <div data-container="chat-area"></div>
            </div>

            <div class="tp-input" data-ref="drop-zone">
                <div class="tp-attachments" data-ref="attachments"></div>
                <div class="tp-input-wrap">
                    <textarea rows="2" placeholder="Add a note..." data-ref="note-textarea"></textarea>
                    <button class="tp-send-btn" data-action="send-note" title="Send"><i class="bi bi-arrow-up"></i></button>
                </div>
                <div class="tp-input-hint">
                    <i class="bi bi-paperclip"></i> Drag &amp; drop files to attach
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
                    { label: 'Ask AI', action: 'ask-ai', icon: 'bi-robot' },
                    { type: 'divider' },
                    { label: 'Edit Ticket', action: 'edit-ticket', icon: 'bi-pencil' },
                    { label: 'Refresh Notes', action: 'refresh-notes', icon: 'bi-arrow-clockwise' },
                    { type: 'divider' },
                    { label: 'Close Window', action: 'close', icon: 'bi-x-lg' }
                ]
            }
        });
        this.addChild(menu);
    }

    async onAfterRender() {
        this._setupTextarea();
        this._setupDragDrop();
        // Wait one microtask so child message-view DOM is settled before we
        // place inline action cards and edit buttons.
        await new Promise(r => setTimeout(r, 0));
        await this._loadActionCards();
        this._addEditButtons();
        this._setupCollapsible();
    }

    async _loadActionCards() {
        this._cleanupActionCards();

        const messages = this.chatView.messages || [];
        if (!messages.length) return;

        for (const msg of messages) {
            if (!msg.action || typeof msg.action !== 'object') continue;

            const msgView = this.chatView.messageViews.get(msg.id);
            if (!msgView?.element) continue;

            const card = new ActionCardView({
                action: msg.action,
                noteId: msg.id,
                ticketStatus: this.model.get('status')
            });
            // Pending approvals get the respond handler
            if (msg.action.type !== 'context' && !msg.action.resolved) {
                card.on('action:respond', (data) => this._handleActionResponse(data));
            }
            this.addChild(card);
            await card.render();
            msgView.element.after(card.element);
        }
    }

    _cleanupActionCards() {
        for (const id in this.children) {
            const child = this.children[id];
            if (child instanceof ActionCardView) {
                this.removeChild(child);
            }
        }
    }

    async _handleActionResponse(data) {
        const actionNote = { action: { handler: data.handler, context: data.context } };
        const app = this.getApp();
        app?.showLoading();
        try {
            await this.adapter.addActionResponse(actionNote, data.action);
            await this.model.fetch();
            await this.chatView.refresh();
            this.render();
        } finally {
            app?.hideLoading();
        }
    }

    _getCurrentUserId() {
        const app = this.getApp();
        return app?.activeUser?.id || app?.getActiveUser?.()?.id || null;
    }

    // ── Actions ──

    onActionClose() {
        this.emit('panel:close');
    }

    async onActionSendNote() {
        const textarea = this.element?.querySelector('[data-ref="note-textarea"]');
        const text = textarea?.value?.trim();
        const files = this._stagedFiles || [];
        if (!text && !files.length) return;
        textarea.value = '';
        textarea.style.height = '';
        this._stagedFiles = [];
        this._renderAttachments();
        await this.adapter.addNote({ text: text || '', files });
        await this.chatView.refresh();
        await this._afterChatRefresh();
    }

    _setupTextarea() {
        const textarea = this.element?.querySelector('[data-ref="note-textarea"]');
        if (!textarea) return;

        const _insert = (text, cursorOffset = text.length) => {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.setRangeText(text, start, end, 'end');
            textarea.selectionStart = textarea.selectionEnd = start + cursorOffset;
            textarea.dispatchEvent(new Event('input'));
            textarea.scrollTop = textarea.scrollHeight;
        };

        const _wrapSelection = (wrapper) => {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const sel = textarea.value.substring(start, end);
            if (sel.startsWith(wrapper) && sel.endsWith(wrapper)) {
                textarea.setRangeText(sel.slice(wrapper.length, -wrapper.length), start, end, 'end');
                textarea.selectionStart = start;
                textarea.selectionEnd = end - wrapper.length * 2;
            } else {
                textarea.setRangeText(wrapper + sel + wrapper, start, end, 'end');
                textarea.selectionStart = start + wrapper.length;
                textarea.selectionEnd = end + wrapper.length;
            }
        };

        const _lineAt = (pos) => {
            const before = textarea.value.substring(0, pos);
            const lineStart = before.lastIndexOf('\n') + 1;
            return { start: lineStart, text: textarea.value.substring(lineStart, pos) };
        };

        const _inCodeFence = (pos) => {
            const before = textarea.value.substring(0, pos);
            const fences = (before.match(/^```/gm) || []).length;
            return fences % 2 === 1;
        };

        textarea.addEventListener('keydown', (e) => {
            const mod = e.ctrlKey || e.metaKey;

            // Enter → submit (unless Shift held)
            if (e.key === 'Enter' && !e.shiftKey && !mod) {
                e.preventDefault();
                this.onActionSendNote();
                return;
            }

            // Shift+Enter → auto-continue list bullets
            if (e.key === 'Enter' && e.shiftKey) {
                const { start, text } = _lineAt(textarea.selectionStart);
                const match = text.match(/^(\s*)([-*]|\d+\.)\s/);
                if (match) {
                    e.preventDefault();
                    const indent = match[1];
                    const bullet = match[2];
                    if (text.trim() === bullet) {
                        textarea.setRangeText('', start, textarea.selectionStart, 'end');
                    } else {
                        const next = /^\d+\./.test(bullet) ? `${parseInt(bullet) + 1}.` : bullet;
                        _insert(`\n${indent}${next} `);
                    }
                    return;
                }
            }

            // ``` auto-close: after typing third backtick, insert fence pair
            if (e.key === '`' && !mod) {
                const pos = textarea.selectionStart;
                const before = textarea.value.substring(0, pos);
                if (before.endsWith('``') && !_inCodeFence(pos - 2)) {
                    e.preventDefault();
                    _insert('`\n\n```', 2);
                    return;
                }
            }

            // Tab indent/dedent inside code fences
            if (e.key === 'Tab' && _inCodeFence(textarea.selectionStart)) {
                e.preventDefault();
                if (e.shiftKey) {
                    const { start, text } = _lineAt(textarea.selectionStart);
                    const stripped = text.replace(/^ {1,2}/, '');
                    textarea.setRangeText(stripped, start, start + text.length, 'end');
                    textarea.selectionStart = textarea.selectionEnd = start + stripped.length;
                } else {
                    _insert('  ');
                }
                return;
            }

            // Ctrl/Cmd+B → bold
            if (mod && e.key === 'b') {
                e.preventDefault();
                _wrapSelection('**');
                return;
            }

            // Ctrl/Cmd+I → italic
            if (mod && e.key === 'i') {
                e.preventDefault();
                _wrapSelection('*');
                return;
            }
        });

        // Auto-close pairs: ( [ "
        const PAIRS = { '(': ')', '[': ']', '"': '"' };
        textarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const close = PAIRS[e.key];
            if (!close) return;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            if (start !== end) {
                e.preventDefault();
                const sel = textarea.value.substring(start, end);
                textarea.setRangeText(e.key + sel + close, start, end, 'end');
                textarea.selectionStart = start + 1;
                textarea.selectionEnd = end + 1;
            } else {
                e.preventDefault();
                _insert(e.key + close, 1);
            }
        });

        textarea.addEventListener('input', () => {
            textarea.style.height = '';
            textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
        });
    }

    _setupDragDrop() {
        const zone = this.element?.querySelector('[data-ref="drop-zone"]');
        if (!zone) return;
        this._stagedFiles = this._stagedFiles || [];
        let counter = 0;
        zone.addEventListener('dragenter', (e) => { e.preventDefault(); counter++; zone.classList.add('tp-dragover'); });
        zone.addEventListener('dragleave', () => { counter--; if (counter <= 0) { counter = 0; zone.classList.remove('tp-dragover'); } });
        zone.addEventListener('dragover', (e) => e.preventDefault());
        zone.addEventListener('drop', async (e) => {
            e.preventDefault();
            counter = 0;
            zone.classList.remove('tp-dragover');
            const files = Array.from(e.dataTransfer?.files || []);
            if (!files.length) return;
            const { File: FileModel } = await import('@core/models/Files.js');
            for (const file of files) {
                const chipId = Date.now() + Math.random();
                this._addAttachChip(chipId, file.name, true);
                try {
                    const fileModel = new FileModel();
                    await fileModel.upload({ file, showToast: false });
                    this._stagedFiles.push(fileModel);
                    this._updateAttachChip(chipId, fileModel.get('name') || file.name, fileModel);
                } catch (err) {
                    console.error('File upload failed:', err);
                    this._removeAttachChip(chipId);
                    this.getApp()?.toast?.error?.('Upload failed: ' + file.name);
                }
            }
        });
    }

    _addAttachChip(id, name, uploading) {
        const container = this.element?.querySelector('[data-ref="attachments"]');
        if (!container) return;
        const chip = document.createElement('span');
        chip.className = 'tp-attach-chip' + (uploading ? ' uploading' : '');
        chip.dataset.chipId = id;
        chip.innerHTML = `<i class="bi bi-paperclip"></i>${this._escapeHtml(name)}` +
            (uploading ? '' : '<span class="remove" data-remove="1"><i class="bi bi-x"></i></span>');
        if (!uploading) {
            chip.querySelector('.remove').addEventListener('click', () => {
                this._removeAttachChip(id);
            });
        }
        container.appendChild(chip);
    }

    _updateAttachChip(id, name, fileModel) {
        const chip = this.element?.querySelector(`[data-chip-id="${id}"]`);
        if (!chip) return;
        chip.classList.remove('uploading');
        chip.innerHTML = `<i class="bi bi-paperclip"></i>${this._escapeHtml(name)}<span class="remove" data-remove="1"><i class="bi bi-x"></i></span>`;
        chip.querySelector('.remove').addEventListener('click', () => {
            this._stagedFiles = (this._stagedFiles || []).filter(f => f !== fileModel);
            chip.remove();
        });
    }

    _removeAttachChip(id) {
        const chip = this.element?.querySelector(`[data-chip-id="${id}"]`);
        if (chip) chip.remove();
    }

    _renderAttachments() {
        const container = this.element?.querySelector('[data-ref="attachments"]');
        if (container) container.innerHTML = '';
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    _addEditButtons() {
        const userId = this._getCurrentUserId();
        if (!userId || !this.chatView?.messageViews) return;
        const msgById = new Map((this.chatView.messages || []).map(m => [m.id, m]));
        this.chatView.messageViews.forEach((view, msgId) => {
            const msg = msgById.get(msgId);
            const item = view?.element?.querySelector('.message-item');
            if (!item) return;
            item.querySelectorAll('.tp-edit-btn').forEach(b => b.remove());
            if (!msg || msg.author?.id !== userId) return;
            const btn = document.createElement('button');
            btn.className = 'tp-edit-btn';
            btn.title = 'Edit note';
            btn.innerHTML = '<i class="bi bi-pencil"></i>';
            btn.addEventListener('click', (e) => { e.stopPropagation(); this._editNote(msg); });
            item.appendChild(btn);
        });
    }

    _setupCollapsible() {
        const container = this.element?.querySelector('[data-container="chat-area"]');
        if (!container) return;
        container.querySelectorAll('.tp-show-more').forEach(b => b.remove());
        container.querySelectorAll('.tp-collapsed').forEach(el => el.classList.remove('tp-collapsed'));
        setTimeout(() => {
            const MAX = 52;
            container.querySelectorAll('.message-content').forEach(body => {
                if (body.scrollHeight <= MAX) return;
                body.classList.add('tp-collapsed');
                body.style.setProperty('--tp-collapse-h', MAX + 'px');
                const btn = document.createElement('button');
                btn.className = 'tp-show-more';
                btn.textContent = 'Show more';
                btn.addEventListener('click', () => {
                    const collapsed = body.classList.toggle('tp-collapsed');
                    btn.textContent = collapsed ? 'Show more' : 'Show less';
                });
                body.after(btn);
            });
        }, 150);
    }

    async _editNote(msg) {
        const metaJson = Object.keys(msg._metadata || {}).length
            ? JSON.stringify(msg._metadata, null, 2) : '';
        const data = await Modal.form({
            title: 'Edit Note',
            icon: 'bi-pencil',
            size: 'lg',
            fields: [{
                type: 'tabset',
                tabs: [
                    {
                        label: 'Note',
                        fields: [{
                            name: 'note', type: 'textarea', label: 'Note',
                            required: true, cols: 12, rows: 8,
                            value: msg._rawContent || msg.content
                        }]
                    },
                    {
                        label: 'Metadata',
                        fields: [{
                            name: 'metadata_json', type: 'json', label: 'Metadata (JSON)',
                            cols: 12, rows: 10,
                            value: metaJson,
                            help: 'Action metadata — e.g. { "action": { "handler": "incident.rule_approval", "label": "...", "context": { ... } } }'
                        }]
                    }
                ]
            }]
        });
        if (!data) return;
        const { TicketNote } = await import('@ext/admin/models/Tickets.js');
        const note = new TicketNote({ id: msg.id });
        const payload = { note: data.note };
        if (data.metadata_json) {
            payload.metadata = typeof data.metadata_json === 'string'
                ? JSON.parse(data.metadata_json) : data.metadata_json;
        }
        await note.save(payload);
        await this.chatView.refresh();
        await this._afterChatRefresh();
    }

    async _saveAndSync(patch) {
        // Some endpoints don't echo the updated record on PUT — Model.save() only
        // merges response.data.data into local state. Re-fetch so the panel and
        // the shared list collection both see the new values. Also refresh notes
        // since the backend may create a status_change note as a side effect.
        await this.model.save(patch);
        await this.model.fetch();
        if (this.chatView) {
            await this.chatView.refresh();
            await this._afterChatRefresh();
        }
    }

    async onActionChangeStatus(event) {
        const items = STATUS_OPTIONS.map(s => ({
            label: s.replace(/_/g, ' '),
            value: s,
            active: s === this.model.get('status')
        }));
        const result = await this._showInlineSelect(items, event);
        if (!result) return;
        await this._saveAndSync({ status: result });
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
        await this._saveAndSync({ priority: parseInt(result) });
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
        await this._saveAndSync({ assignee: data.assignee });
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
        await this._saveAndSync({ category: result });
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
        await this._saveAndSync({ group: data.group });
        this.render();
    }

    async onActionShowDescription() {
        const raw = this.model.get('description') || '';
        if (!raw) {
            // No description yet → jump straight to edit
            return this._editDescription();
        }
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
        const choice = await Modal.dialog({
            title: `Ticket #${this.model.get('id')} — Description`,
            body: `<div style="font-size:0.85rem; line-height:1.65;">${html}</div>`,
            size: 'lg',
            buttons: [
                { text: 'Edit', class: 'btn-primary', value: 'edit' },
                { text: 'Close', class: 'btn-secondary', value: 'close' }
            ]
        });
        if (choice === 'edit') await this._editDescription();
    }

    async _editDescription() {
        const id = this.model.get('id');
        const current = this.model.get('description') || '';
        const escaped = current
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const body = `
            <div class="tp-desc-edit">
                <textarea data-ref="desc-textarea" rows="16" placeholder="Description (markdown supported)..."
                    style="width:100%; font-family: var(--bs-font-monospace); font-size: 0.85rem; padding: 10px 12px; border: 1px solid var(--bs-border-color); border-radius: 8px; background: var(--bs-body-bg); color: var(--bs-body-color); resize: vertical; outline: none;">${escaped}</textarea>
                <div class="text-muted small mt-1">
                    Markdown supported. Cmd/Ctrl+B = bold · Cmd/Ctrl+I = italic · Shift+Enter continues lists · \`\`\` opens a code block
                </div>
            </div>
        `;
        // Modal.dialog only mounts strings or Views — pass HTML string and find
        // the textarea after the modal renders, then wire shortcuts.
        const wireUp = async () => {
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 50));
                const ta = document.querySelector('.modal.show [data-ref="desc-textarea"]');
                if (ta) { this._wireMarkdownTextarea(ta); return ta; }
            }
            return null;
        };
        const wirePromise = wireUp();
        const choice = await Modal.dialog({
            title: `Ticket #${id} — Edit Description`,
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
        await wirePromise; // ensure cleanup of the polling
        if (choice === null || choice === undefined) return;
        await this._saveAndSync({ description: choice });
        this.render();
    }

    _wireMarkdownTextarea(textarea) {
        const _insert = (text, cursorOffset = text.length) => {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.setRangeText(text, start, end, 'end');
            textarea.selectionStart = textarea.selectionEnd = start + cursorOffset;
            textarea.dispatchEvent(new Event('input'));
        };
        const _wrapSelection = (wrapper) => {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const sel = textarea.value.substring(start, end);
            if (sel.startsWith(wrapper) && sel.endsWith(wrapper)) {
                textarea.setRangeText(sel.slice(wrapper.length, -wrapper.length), start, end, 'end');
                textarea.selectionStart = start;
                textarea.selectionEnd = end - wrapper.length * 2;
            } else {
                textarea.setRangeText(wrapper + sel + wrapper, start, end, 'end');
                textarea.selectionStart = start + wrapper.length;
                textarea.selectionEnd = end + wrapper.length;
            }
        };
        const _lineAt = (pos) => {
            const before = textarea.value.substring(0, pos);
            const lineStart = before.lastIndexOf('\n') + 1;
            return { start: lineStart, text: textarea.value.substring(lineStart, pos) };
        };
        const _inCodeFence = (pos) => {
            const before = textarea.value.substring(0, pos);
            const fences = (before.match(/^```/gm) || []).length;
            return fences % 2 === 1;
        };
        textarea.addEventListener('keydown', (e) => {
            const mod = e.ctrlKey || e.metaKey;
            // Shift+Enter → auto-continue list bullets (plain Enter saves the form,
            // so list continuation moves to Shift+Enter here too)
            if (e.key === 'Enter' && e.shiftKey) {
                const { start, text } = _lineAt(textarea.selectionStart);
                const match = text.match(/^(\s*)([-*]|\d+\.)\s/);
                if (match) {
                    e.preventDefault();
                    const indent = match[1];
                    const bullet = match[2];
                    if (text.trim() === bullet) {
                        textarea.setRangeText('', start, textarea.selectionStart, 'end');
                    } else {
                        const next = /^\d+\./.test(bullet) ? `${parseInt(bullet) + 1}.` : bullet;
                        _insert(`\n${indent}${next} `);
                    }
                    return;
                }
            }
            if (e.key === '`' && !mod) {
                const pos = textarea.selectionStart;
                const before = textarea.value.substring(0, pos);
                if (before.endsWith('``') && !_inCodeFence(pos - 2)) {
                    e.preventDefault();
                    _insert('`\n\n```', 2);
                    return;
                }
            }
            if (e.key === 'Tab' && _inCodeFence(textarea.selectionStart)) {
                e.preventDefault();
                if (e.shiftKey) {
                    const { start, text } = _lineAt(textarea.selectionStart);
                    const stripped = text.replace(/^ {1,2}/, '');
                    textarea.setRangeText(stripped, start, start + text.length, 'end');
                    textarea.selectionStart = textarea.selectionEnd = start + stripped.length;
                } else {
                    _insert('  ');
                }
                return;
            }
            if (mod && e.key === 'b') { e.preventDefault(); _wrapSelection('**'); return; }
            if (mod && e.key === 'i') { e.preventDefault(); _wrapSelection('*'); return; }
        });
        const PAIRS = { '(': ')', '[': ']', '"': '"' };
        textarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const close = PAIRS[e.key];
            if (!close) return;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            if (start !== end) {
                e.preventDefault();
                const sel = textarea.value.substring(start, end);
                textarea.setRangeText(e.key + sel + close, start, end, 'end');
                textarea.selectionStart = start + 1;
                textarea.selectionEnd = end + 1;
            } else {
                e.preventDefault();
                _insert(e.key + close, 1);
            }
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
        await this._afterChatRefresh();
        this.getApp()?.toast?.success('Notes refreshed');
    }

    async onActionAskAi() {
        await openAssistantChat(this, 'incident.Ticket');
    }

    async _showInlineSelect(items, event) {
        return new Promise((resolve) => {
            let picked = false;
            const menu = new ContextMenu({
                config: {
                    // Each item needs a unique action — ContextMenu identifies the
                    // clicked item by data-item-action, and find() returns the FIRST
                    // match, so reusing one action name maps every click to item[0].
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

    async _afterChatRefresh() {
        // ChatView.refresh() doesn't await each message view's render — its inner
        // _renderChildren calls messageView.render(false) without await. Wait one
        // microtask so the message-item DOM is in place before we touch it.
        await new Promise(r => setTimeout(r, 0));
        await this._loadActionCards();
        this._addEditButtons();
        this._setupCollapsible();
    }

    async setTicket(ticket) {
        this.model = ticket;
        this.adapter = new TicketNoteAdapter(ticket.get('id'));
        this.chatView.adapter = this.adapter;
        this.chatView.clearMessages();
        await this.render();
        await this.chatView.refresh();
        await this._afterChatRefresh();
    }
}

export default TicketPanelView;
