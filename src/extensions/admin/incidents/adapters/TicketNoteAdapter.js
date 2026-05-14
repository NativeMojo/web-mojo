import { TicketNote, TicketNoteList } from '@ext/admin/models/Tickets.js';
import rest from '@core/Rest.js';

class TicketNoteAdapter {
    constructor(ticketId) {
        this.ticketId = ticketId;
        this.collection = new TicketNoteList({ params: { parent: this.ticketId, sort: 'created', size: 100} });
    }

    async fetch() {
        await this.collection.fetch();
        const messages = this.collection.models.map(note => this.transform(note));
        await Promise.all(messages.map(async (msg) => {
            // System events (e.g. status_change) are pre-rendered HTML — don't
            // pipe through the markdown renderer, which would escape the tags.
            if (msg.content && msg.type !== 'system_event') {
                msg._rawContent = msg.content;
                msg.content = await this._renderMarkdown(msg.content);
            }
        }));
        return messages;
    }

    transform(note) {
        const metadata = note.get('metadata') || {};
        const hasActionMeta = metadata.action && typeof metadata.action === 'object';
        const hasCompatContext = metadata.type === 'context' && metadata.references;
        const noteText = note.get('note') || '';
        const hasLlmPrefix = !note.get('user') && noteText.startsWith('[LLM Agent]');
        const isLlm = !note.get('user') && (hasActionMeta || hasCompatContext || hasLlmPrefix);
        const msg = {
            id: note.get('id'),
            type: note.get('user') ? 'user_comment' : (isLlm ? 'llm_response' : 'system_event'),
            role: isLlm ? 'assistant' : undefined,
            author: {
                id: note.get('user.id'),
                name: note.get('user.display_name') || (isLlm ? 'AI Agent' : 'System'),
                avatarUrl: note.get('user.avatar.url')
            },
            timestamp: note.get('created'),
            content: note.get('note'),
            attachments: note.get('media') ? [note.get('media')] : []
        };
        if (metadata.type === 'status_change' && (metadata.old_status || metadata.new_status)) {
            // Render as a compact system line "status changed from X to Y" — replace
            // the note's body with rendered pills so ChatMessageView's system_event
            // template prints it as muted text.
            msg.type = 'system_event';
            msg.content = this._renderStatusChange(metadata.old_status, metadata.new_status);
        } else if (metadata.action && typeof metadata.action === 'object') {
            msg.action = metadata.action;
        } else if (metadata.type === 'context' && metadata.references) {
            // Compat: some test data has the context block at metadata root instead of metadata.action
            msg.action = { type: 'context', references: metadata.references };
        }
        if (metadata.action_response) msg.actionResponse = metadata.action_response;
        msg._metadata = metadata;
        return msg;
    }

    _renderStatusChange(oldStatus, newStatus) {
        const pill = (s) => {
            if (!s) return '<span class="badge bg-secondary">unknown</span>';
            const cls = {
                new:         'bg-info',
                open:        'bg-success',
                in_progress: 'bg-warning text-dark',
                pending:     'bg-warning text-dark',
                resolved:    'bg-success',
                qa:          'bg-success',
                closed:      'bg-secondary',
                ignored:     'bg-secondary'
            }[s] || 'bg-secondary';
            const safe = String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]).replace(/_/g, ' ');
            return `<span class="badge ${cls}">${safe}</span>`;
        };
        return `Status changed from ${pill(oldStatus)} to ${pill(newStatus)}`;
    }

    async addNote(data) {
        const note = new TicketNote();
        const payload = {
            parent: this.ticketId,
            note: data.text,
            media: data.files && data.files.length > 0 ? data.files[0].id : null
        };
        if (data.metadata) payload.metadata = data.metadata;
        const resp = await note.save(payload);
        if (resp.success) {
            await this.collection.fetch();
        }
        return resp;
    }

    async addActionResponse(actionNote, action) {
        return this.addNote({
            text: action === 'approve' ? 'Approved' : 'Denied',
            metadata: {
                action_response: {
                    handler: actionNote.action.handler,
                    action,
                    context: actionNote.action.context
                }
            }
        });
    }

    async _renderMarkdown(markdown) {
        if (!markdown) return '';
        try {
            const resp = await rest.post('/api/docit/render', { markdown });
            const html = resp?.data?.data?.html || resp?.data?.html;
            if (html) return html;
        } catch (_e) { /* API unavailable */ }
        const div = document.createElement('div');
        div.textContent = markdown;
        return `<pre style="white-space: pre-wrap;">${div.innerHTML}</pre>`;
    }
}

export default TicketNoteAdapter;
