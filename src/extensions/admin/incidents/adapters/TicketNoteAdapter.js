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
        // Render markdown for system/LLM-generated notes
        await Promise.all(messages.map(async (msg) => {
            if (msg.content) {
                msg.content = await this._renderMarkdown(msg.content);
            }
        }));
        return messages;
    }

    transform(note) {
        return {
            id: note.get('id'),
            type: note.get('user') ? 'user_comment' : 'system_event',
            author: {
                id: note.get('user.id'),
                name: note.get('user.display_name') || 'System',
                avatarUrl: note.get('user.avatar.url')
            },
            timestamp: note.get('created'),
            content: note.get('note'),
            attachments: note.get('media') ? [note.get('media')] : []
        };
    }

    async addNote(data) {
        const note = new TicketNote();
        const resp = await note.save({
            parent: this.ticketId,
            note: data.text,
            media: data.files && data.files.length > 0 ? data.files[0].id : null
        });
        if (resp.success) {
            await this.collection.fetch();
        }
        return resp;
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
