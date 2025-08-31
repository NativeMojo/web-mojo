import View from '../../core/View.js';
import DataView from '../../views/data/DataView.js';
import ContextMenu from '../../views/feedback/ContextMenu.js';
import { Ticket } from '../../models/Tickets.js';
import ChatView from '../../views/chat/ChatView.js';
import TicketNoteAdapter from '../adapters/TicketNoteAdapter.js';

class TicketView extends View {
    constructor(options = {}) {
        super({
            className: 'ticket-view',
            ...options
        });

        this.model = options.model || new Ticket(options.data || {});

        this.template = `
            <div class="ticket-view-container p-3">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h3 class="mb-1">Ticket #{{model.id}}: {{model.title}}</h3>
                        <span class="badge {{model.status|badge}}">{{model.status|capitalize}}</span>
                        <span class="ms-2">Priority: {{model.priority}}</span>
                    </div>
                    <div data-container="ticket-context-menu"></div>
                </div>

                <div class="row">
                    <div class="col-md-8">
                        <h5>Description</h5>
                        <div class="border p-3 rounded bg-light mb-4">{{{model.description}}}</div>
                    </div>
                    <div class="col-md-4">
                        <h5>Details</h5>
                        <div data-container="details-view"></div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <h5>Activity & Notes</h5>
                        <div data-container="chat-view"></div>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {
        // Details View
        this.detailsView = new DataView({
            containerId: 'details-view',
            model: this.model,
            fields: [
                { name: 'assignee.display_name', label: 'Assignee' },
                { name: 'incident', label: 'Incident' },
                { name: 'created', label: 'Created', format: 'datetime' },
                { name: 'modified', label: 'Last Updated', format: 'datetime' },
            ]
        });
        this.addChild(this.detailsView);

        // Chat View
        const adapter = new TicketNoteAdapter(this.model.get('id'));
        this.chatView = new ChatView({
            containerId: 'chat-view',
            adapter: adapter
        });
        this.addChild(this.chatView);

        // Context Menu
        const contextMenu = new ContextMenu({
            containerId: 'ticket-context-menu',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Change Status', action: 'change-status', icon: 'bi-tag' },
                    { label: 'Set Priority', action: 'set-priority', icon: 'bi-flag' },
                    { label: 'Assign User', action: 'assign-user', icon: 'bi-person' },
                ]
            }
        });
        this.addChild(contextMenu);
    }
}

export default TicketView;
