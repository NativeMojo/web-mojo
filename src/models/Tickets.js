import Collection from '../core/Collection.js';
import Model from '../core/Model.js';
import { UserList } from './User.js';
import { IncidentList } from './Incident.js';

/* =========================
 * Ticket
 * ========================= */
class Ticket extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/incident/ticket',
        });
    }
}

class TicketList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: Ticket,
            endpoint: '/api/incident/ticket',
            ...options,
        });
    }
}

const TicketForms = {
    create: {
        title: 'Create Ticket',
        fields: [
            { name: 'title', type: 'text', label: 'Title', required: true, cols: 12 },
            { name: 'description', type: 'textarea', label: 'Description', required: true, cols: 12 },
            { name: 'priority', type: 'number', label: 'Priority', value: 5, cols: 6 },
            { name: 'status', type: 'select', label: 'Status', value: 'open', options: ['open', 'in_progress', 'resolved', 'closed'], cols: 6 },
            { type: 'collection', name: 'assignee', label: 'Assignee', Collection: UserList, labelField: 'display_name', valueField: 'id', cols: 12 },
            { type: 'collection', name: 'incident', label: 'Incident', Collection: IncidentList, labelField: 'title', valueField: 'id', cols: 12 },
        ]
    },
    edit: {
        title: 'Edit Ticket',
        fields: [
            { name: 'title', type: 'text', label: 'Title', required: true, cols: 12 },
            { name: 'description', type: 'textarea', label: 'Description', required: true, cols: 12 },
            { name: 'priority', type: 'number', label: 'Priority', cols: 6 },
            { name: 'status', type: 'select', label: 'Status', options: ['open', 'in_progress', 'resolved', 'closed'], cols: 6 },
            { type: 'collection', name: 'assignee', label: 'Assignee', Collection: UserList, labelField: 'display_name', valueField: 'id', cols: 12 },
            { type: 'collection', name: 'incident', label: 'Incident', Collection: IncidentList, labelField: 'title', valueField: 'id', cols: 12 },
        ]
    }
};

/* =========================
 * TicketNote
 * ========================= */
class TicketNote extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/incident/ticket/note',
        });
    }
}

class TicketNoteList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: TicketNote,
            endpoint: '/api/incident/ticket/note',
            ...options,
        });
    }
}

export { Ticket, TicketList, TicketNote, TicketNoteList, TicketForms };
