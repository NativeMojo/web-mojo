/**
 * SentMessageTablePage - Admin page for viewing sent emails
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { SentMessage, SentMessageList } from '@ext/admin/models/Email.js';
import { groupByDay } from '@core/views/list/grouping.js';
import EmailView from './EmailView.js';

SentMessage.VIEW_CLASS = EmailView;

class SentMessageTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_email_sent',
            pageName: 'Sent Messages',
            router: 'admin/email/sent',
            Collection: SentMessageList,

            dayRangeFilter: true,
            ...groupByDay('created'),
            searchPlaceholder: 'Search recipient, subject, or status',

            defaultQuery: {
                sort: '-created'
            },

            viewDialogOptions: {
                header: false,
                size: 'xl',
                scrollable: true
            },

            // Table columns
            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'mailbox.email', label: 'From', sortable: true, visibility: 'xl' },
                { key: 'to_addresses', label: 'To', sortable: false, formatter: "list" },
                { key: 'subject', label: 'Subject', sortable: true },
                { key: 'status', label: 'Status', formatter: 'badge' },
                { key: 'status_reason', label: 'Reason', formatter: "truncate(80)|default('—')", visibility: 'xl' },
                { key: 'created', label: 'Created', formatter: 'datetime' }
            ],

            // Sent messages are an immutable outbox log — no selection, no
            // batch actions, no row mutations. View + export only.
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // Toolbar
            showRefresh: true,
            showAdd: false,
            showExport: true,

            // Empty state
            emptyMessage: 'No sent messages found.',

            // Table display options
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }
}

export default SentMessageTablePage;