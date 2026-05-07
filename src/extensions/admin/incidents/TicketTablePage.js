import TablePage from '@core/pages/TablePage.js';
import { TicketList, TicketForms, TicketCategories } from '@ext/admin/models/Tickets.js';
import TicketView from './TicketView.js';

const STATUS_PILL = {
    new:         'tt-pill-new',
    open:        'tt-pill-open',
    in_progress: 'tt-pill-prog',
    pending:     'tt-pill-prog',
    resolved:    'tt-pill-resolved',
    qa:          'tt-pill-open',
    closed:      'tt-pill-closed',
    ignored:     'tt-pill-closed'
};

const CATEGORY_DOT = {
    security:    'tt-dot-security',
    incident:    'tt-dot-security',
    bug:         'tt-dot-amber',
    qa:          'tt-dot-amber',
    feature:     'tt-dot-accent',
    ticket:      'tt-dot-accent',
    fulfillment: 'tt-dot-green',
    new_user:    'tt-dot-muted',
    new_group:   'tt-dot-muted'
};

function statusPill(value) {
    const v = (value || 'new').toString();
    const cls = STATUS_PILL[v] || 'tt-pill-closed';
    return `<span class="tt-pill ${cls}">${v.replace(/_/g, ' ')}</span>`;
}

function categoryCell(value) {
    const v = (value || 'ticket').toString();
    const cls = CATEGORY_DOT[v] || 'tt-dot-muted';
    return `<span class="tt-cat"><span class="tt-cat-dot ${cls}"></span>${v.replace(/_/g, ' ')}</span>`;
}

function idCell(value) {
    return `<span class="tt-id">${value ?? ''}</span>`;
}

function priorityCell(value) {
    const n = parseInt(value);
    if (!Number.isFinite(n)) return '';
    const cls = n >= 8 ? 'tt-pri-hi' : n >= 5 ? 'tt-pri-md' : 'tt-pri-lo';
    return `<span class="tt-pri ${cls}">${n}</span>`;
}

class TicketTablePage extends TablePage {
    constructor(options = {}) {
        super({
            name: 'admin_tickets',
            pageName: 'Tickets',
            router: 'admin/tickets',
            Collection: TicketList,

            formCreate: TicketForms.create,
            formEdit: TicketForms.edit,
            itemViewClass: TicketView,

            viewDialogOptions: {
                header: false
            },

            defaultQuery: {
                sort: '-priority',
                status__in: 'new,open'
            },

            columns: [
                { key: 'id', label: 'ID', width: '60px', sortable: true, formatter: idCell },
                { key: 'title', label: 'Title', sortable: true },
                {
                    key: 'status', label: 'Status', sortable: true,
                    width: '100px',
                    formatter: statusPill,
                    editable: true,
                    editableOptions: {
                        type: 'select',
                        options: ['new', 'open', 'paused', 'resolved', 'qa', 'ignored']
                    },
                    filter: {
                        type: 'multiselect',
                        placeHolder: 'Select Status',
                        options: ['new', 'open', 'paused', 'resolved', 'qa', 'ignored']
                    }
                },
                { key: 'priority', label: 'Pri', sortable: true, width: '50px', formatter: priorityCell },
                {
                    key: 'category', label: 'Category', sortable: true,
                    width: '110px',
                    formatter: categoryCell,
                    editable: true,
                    editableOptions: {
                        type: 'select',
                        options: [...Object.keys(TicketCategories)]
                    },
                    filter: {
                        type: 'multiselect',
                        placeHolder: 'Select Category',
                        options: [...Object.keys(TicketCategories)]
                    }
                },
                {
                    key: 'created', label: 'Created', sortable: true,
                    width: '80px', formatter: 'relative', class: 'tt-time'
                },
                {
                    key: 'modified', label: 'Activity', sortable: true,
                    width: '80px', formatter: 'relative', class: 'tt-time'
                }
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
                striped: false,
                bordered: false,
                hover: true,
                responsive: false
            },

            onItemView: (model) => {
                const app = this.getApp();
                if (app?.openTicketPanel) {
                    // Pass the model instance so the panel and table share state
                    app.openTicketPanel(model);
                }
            },

            ...options
        });
    }

    buildTemplate() {
        return `
            <style>
                .ticket-table-page table { font-size: 0.82rem; }
                .ticket-table-page table thead th { font-size: 0.7rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; color: var(--bs-secondary-color); padding: 8px 10px; border-bottom: 1px solid var(--bs-border-color); border-top: none; background: transparent; }
                .ticket-table-page table tbody td { padding: 10px 10px; border-bottom: 1px solid var(--bs-border-color-translucent); border-top: none; vertical-align: middle; color: var(--bs-body-color); }
                .ticket-table-page table tbody tr { cursor: pointer; transition: background 0.1s; }
                .ticket-table-page table tbody tr:hover { background: var(--bs-tertiary-bg); }
                .ticket-table-page table tbody tr.selected { background: rgba(var(--bs-primary-rgb), 0.08); }
                .ticket-table-page table { border-collapse: collapse; }

                .tt-id { color: var(--bs-secondary-color); font-family: var(--bs-font-monospace); font-size: 0.78rem; }
                .tt-time { color: var(--bs-secondary-color); font-size: 0.78rem; white-space: nowrap; }

                .tt-pill { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 0.68rem; font-weight: 500; letter-spacing: 0.01em; text-transform: lowercase; }
                .tt-pill-new      { background: rgba(var(--bs-info-rgb), 0.1); color: var(--bs-info); }
                .tt-pill-open     { background: rgba(var(--bs-success-rgb), 0.1); color: var(--bs-success); }
                .tt-pill-prog     { background: rgba(var(--bs-warning-rgb), 0.12); color: var(--bs-warning); }
                .tt-pill-resolved { background: rgba(var(--bs-success-rgb), 0.1); color: var(--bs-success); }
                .tt-pill-closed   { background: var(--bs-secondary-bg); color: var(--bs-secondary-color); }

                .tt-pri { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 20px; border-radius: 4px; font-size: 0.74rem; font-weight: 500; padding: 0 6px; }
                .tt-pri-hi { background: rgba(var(--bs-danger-rgb), 0.1); color: var(--bs-danger); }
                .tt-pri-md { background: rgba(var(--bs-warning-rgb), 0.12); color: var(--bs-warning); }
                .tt-pri-lo { color: var(--bs-secondary-color); }

                .tt-cat { display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--bs-body-color); text-transform: capitalize; }
                .tt-cat-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; }
                .tt-dot-security { background: var(--bs-danger); }
                .tt-dot-accent   { background: var(--bs-primary); }
                .tt-dot-amber    { background: var(--bs-warning); }
                .tt-dot-green    { background: var(--bs-success); }
                .tt-dot-muted    { background: var(--bs-secondary-color); }

                .ticket-table-page .table-toolbar,
                .ticket-table-page .toolbar { padding: 6px 0 10px; border-bottom: none; }
                .ticket-table-page .pagination-container { padding-top: 8px; }
            </style>
            <div class="ticket-table-page">
                <div class="table-container" data-container="table"></div>
            </div>
        `;
    }
}

export default TicketTablePage;
