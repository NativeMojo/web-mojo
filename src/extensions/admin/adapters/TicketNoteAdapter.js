import { TicketNote, TicketNoteList } from '@core/models/Tickets.js';

class TicketNoteAdapter {
    constructor(ticketId) {
        this.ticketId = ticketId;
        this.collection = new TicketNoteList({ params: { parent: this.ticketId, sort: 'created', size: 100} });
    }

    async fetch() {
        await this.collection.fetch();
        return this.collection.models.map(note => this.transform(note));
    }

    transform(note) {
        return {
            id: note.get('id'),
            type: 'user_comment', // Ticket notes are always user comments
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
            await this.collection.fetch(); // Refresh the collection
        }
        return resp;
    }
}

export default TicketNoteAdapter;
