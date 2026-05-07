/**
 * TicketTablePage - Ticket management with slide-over panel
 */

import TablePage from '@core/pages/TablePage.js';
import { Ticket, TicketList, TicketForms, TicketCategories } from '@ext/admin/models/Tickets.js';
import TicketView from './TicketView.js';
import TicketPanelView from './TicketPanelView.js';

class TicketTablePage extends TablePage {
    constructor(options = {}) {
        super({
            name: 'admin_tickets',
            pageName: 'Tickets',
            router: "admin/tickets",
            Collection: TicketList,

            formCreate: TicketForms.create,
            formEdit: TicketForms.edit,
            itemViewClass: TicketView,

            viewDialogOptions: {
                header: false
            },

            defaultQuery: {
                sort: '-priority',
                status__in: "new,open"
            },

            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'title', label: 'Title', sortable: true},
                {
                    key: 'status', label: 'Status', sortable: true,
                    editable: true,
                    editableOptions: {
                      type: "select",
                      options: [
                          "new", "open", "paused", "resolved", "qa", "ignored"
                      ]
                    },
                    filter: {
                      type: "multiselect",
                      placeHolder: "Select Status",
                      options: [
                          "new", "open", "paused", "resolved", "qa", "ignored"
                      ]
                    }
                },
                { key: 'priority', label: 'Priority', sortable: true },
                {
                    key: 'category', label: 'Category', sortable: true,
                    editable: true,
                    editableOptions: {
                      type: "select",
                      options: [
                          ... Object.keys(TicketCategories)
                      ]
                    },
                    filter: {
                      type: "multiselect",
                      placeHolder: "Select Category",
                      options: [
                          ... Object.keys(TicketCategories)
                      ]
                    }
                },
                { key: 'assignee.display_name', label: 'Assignee', sortable: true, formatter: "default('Unassigned')" },
                { key: 'incident.id', label: 'Incident ID', sortable: true },
                { key: 'created', label: 'Created', sortable: true, formatter: 'datetime' },
                { key: 'last_activity', label: 'Activity', sortable: true, formatter: 'relative' }
            ],

            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            showRefresh: true,
            showAdd: true,
            showExport: true,

            emptyMessage: 'No tickets found.',

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            },

            onItemView: (model) => this._openPanel(model),

            template: `
                <div class="ticket-page-layout">
                    <div class="ticket-page-table">
                        <div class="table-page-container">
                            <div class="table-container" data-container="table"></div>
                        </div>
                    </div>
                    <div class="ticket-page-panel" data-ref="panel-wrapper">
                        <div data-container="ticket-panel"></div>
                    </div>
                </div>
            `,

            ...options,
        });
    }

    async _openPanel(model) {
        const ticket = new Ticket(model.toJSON ? model.toJSON() : model.data || {});
        await ticket.fetch();

        if (this.panelView) {
            this.panelView.off('panel:close');
            this.removeChild(this.panelView);
        }

        this.panelView = new TicketPanelView({
            containerId: 'ticket-panel',
            model: ticket
        });
        this.panelView.on('panel:close', () => this._closePanel());
        this.addChild(this.panelView);
        await this.panelView.render();

        this.element?.querySelector('[data-ref="panel-wrapper"]')?.classList.add('open');
    }

    _closePanel() {
        this.element?.querySelector('[data-ref="panel-wrapper"]')?.classList.remove('open');
        if (this.panelView) {
            this.panelView.off('panel:close');
            this.removeChild(this.panelView);
            this.panelView = null;
        }
    }
}

export default TicketTablePage;
