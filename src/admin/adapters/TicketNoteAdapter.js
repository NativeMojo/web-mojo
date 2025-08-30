import { TicketNote, TicketNoteList } from '../../models/Tickets.js';

class TicketNoteAdapter {
    constructor(ticketId) {
        this.ticketId = ticketId;
        this.collection = new TicketNoteList({ params: { ticket: this.ticketId } });
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
                name: note.get('author.display_name') || 'System',
                avatarUrl: note.get('author.avatar.url')
            },
            timestamp: note.get('created'),
            content: note.get('note'),
            attachments: note.get('media') ? [note.get('media')] : []
        };
    }

    async addNote(data) {
        const note = new TicketNote({
            ticket: this.ticketId,
            note: data.text,
            media: data.files && data.files.length > 0 ? data.files[0].id : null
        });
        const resp = await note.save();
        if (resp.success) {
            await this.collection.fetch(); // Refresh the collection
        }
        return resp;
    }
}

export default TicketNoteAdapter;
