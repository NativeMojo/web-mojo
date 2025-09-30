import View from '@core/View.js';
import DataView from '@core/views/data/DataView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { Ticket, TicketForms } from '@core/models/Tickets.js';
import ChatView from '@core/views/chat/ChatView.js';
import TicketNoteAdapter from '../adapters/TicketNoteAdapter.js';
import Dialog from '@core/views/feedback/Dialog.js';

class TicketView extends View {
    constructor(options = {}) {
        super({
            className: 'ticket-view',
            ...options
        });

        this.model = options.model || new Ticket(options.data || {});

        this.template = `
            <div class="ticket-view-container">
                <!-- Ticket Header -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <!-- Left Side: Primary Identity -->
                    <div class="d-flex align-items-center gap-3">
                        <div class="avatar-placeholder rounded-circle bg-light d-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                            <i class="bi bi-ticket-perforated text-secondary" style="font-size: 40px;"></i>
                        </div>
                        <div>
                            <h3 class="mb-1">{{model.title|truncate(50)|default('Untitled Ticket')}}</h3>
                            <div class="text-muted small">
                                <span>Ticket #{{model.id}}</span>
                                <span class="mx-2">|</span>
                                <span>Priority: {{model.priority|capitalize}}</span>
                                {{#model.assignee}}
                                    <span class="mx-2">|</span>
                                    <span>Assigned to: {{model.assignee.display_name}}</span>
                                {{/model.assignee}}
                            </div>
                            {{#model.incident}}
                                <div class="text-muted small mt-1">
                                    <i class="bi bi-exclamation-triangle"></i> Related to incident: {{model.incident}}
                                </div>
                            {{/model.incident}}
                        </div>
                    </div>

                    <!-- Right Side: Status & Actions -->
                    <div class="d-flex align-items-start gap-4">
                        <div class="text-end">
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge {{model.status|badgeClass}}">{{model.status|capitalize}}</span>
                            </div>
                            {{#model.created}}
                                <div class="text-muted small mt-1">Created {{model.created|relative}}</div>
                            {{/model.created}}
                            {{#model.modified}}
                                <div class="text-muted small">Updated {{model.modified|relative}}</div>
                            {{/model.modified}}
                        </div>
                        <div data-container="ticket-context-menu"></div>
                    </div>
                </div>

                <!-- Content Area -->
                <div class="row">
                    <div class="col-lg-8">
                        <!-- Description Section -->
                        <div class="mb-4">
                            <h5 class="border-bottom pb-2 mb-3">Description</h5>
                            <div class="border rounded p-3 bg-light">
                                {{#model.description}}
                                    {{{model.description}}}
                                {{/model.description}}
                                {{^model.description}}
                                    <em class="text-muted">No description provided</em>
                                {{/model.description}}
                            </div>
                        </div>

                        <!-- Activity & Notes Section -->
                        <div>
                            <h5 class="border-bottom pb-2 mb-3">Activity & Notes</h5>
                            <div data-container="chat-view"></div>
                        </div>
                    </div>

                    <div class="col-lg-4">
                        <!-- Details Sidebar -->
                        <div class="border rounded p-3 bg-light">
                            <h5 class="mb-3">Ticket Details</h5>
                            <div data-container="details-view"></div>
                        </div>
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
            adapter: adapter,
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
                    { label: 'Change Status', action: 'change-status', icon: 'bi-tag' },
                    { label: 'Set Priority', action: 'set-priority', icon: 'bi-flag' },
                    { label: 'Assign User', action: 'assign-user', icon: 'bi-person' },
                    { type: 'divider' },
                    { label: 'Close Ticket', action: 'close-ticket', icon: 'bi-x-circle' },
                ]
            }
        });
        this.addChild(ticketMenu);
    }

    // Context Menu Action Handlers
    async onActionEditTicket() {
        const resp = await Dialog.showModelForm({
            title: `Edit Ticket #${this.model.get('id')} - ${this.model.get('title')}`,
            model: this.model,
            size: 'lg',
            fields: TicketForms.edit.fields
        });
        if (resp) {
            this.render(); // Re-render to show updated data in header
        }
    }

    async onActionChangeStatus() {
        const statuses = ['new', 'open', 'in_progress', 'pending', 'resolved', 'closed', 'ignored'];
        const currentStatus = this.model.get('status');

        const result = await Dialog.showForm({
            title: 'Change Ticket Status',
            size: 'sm',
            fields: [
                {
                    name: 'status',
                    label: 'New Status',
                    type: 'select',
                    options: statuses.map(s => ({ value: s, label: s.replace('_', ' ').toUpperCase() })),
                    value: currentStatus,
                    required: true
                }
            ]
        });

        if (result) {
            try {
                await this.model.save({ status: result.status });
                this.render();
            } catch (error) {
                Dialog.alert({
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to update ticket status: ' + error.message
                });
            }
        }
    }

    async onActionSetPriority() {
        const priorities = ['low', 'normal', 'high', 'urgent'];
        const currentPriority = this.model.get('priority');

        const result = await Dialog.showForm({
            title: 'Set Ticket Priority',
            size: 'sm',
            fields: [
                {
                    name: 'priority',
                    label: 'Priority Level',
                    type: 'select',
                    options: priorities.map(p => ({ value: p, label: p.toUpperCase() })),
                    value: currentPriority,
                    required: true
                }
            ]
        });

        if (result) {
            try {
                await this.model.save({ priority: result.priority });
                this.render();
            } catch (error) {
                Dialog.alert({
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to update ticket priority: ' + error.message
                });
            }
        }
    }

    async onActionAssignUser() {
        console.log("TODO: Implement assign user dialog with user selector");
        Dialog.alert({
            title: 'Coming Soon',
            message: 'User assignment feature will be implemented soon.'
        });
    }

    async onActionCloseTicket() {
        const confirmed = await Dialog.confirm({
            title: 'Close Ticket',
            message: `Are you sure you want to close ticket #${this.model.get('id')}?`,
            confirmText: 'Close Ticket',
            confirmClass: 'btn-warning'
        });

        if (confirmed) {
            try {
                await this.model.save({ status: 'closed' });
                this.render();
                Dialog.alert({
                    type: 'success',
                    title: 'Success',
                    message: 'Ticket has been closed successfully.'
                });
            } catch (error) {
                Dialog.alert({
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to close ticket: ' + error.message
                });
            }
        }
    }
}

Ticket.VIEW_CLASS = TicketView;

export default TicketView;
