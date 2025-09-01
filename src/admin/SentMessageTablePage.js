/**
 * SentMessageTablePage - Admin page for viewing sent emails
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '../pages/TablePage.js';
import { SentMessageList } from '../models/Email.js';
import EmailView from './views/EmailView.js';

class SentMessageTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_email_sent',
            pageName: 'Sent Messages',
            router: 'admin/email/sent',
            Collection: SentMessageList,
            
            itemViewClass: EmailView,
            viewDialogOptions: {
                header: false,
                size: 'xl',
                scrollable: true
            },

            // Table columns
            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'mailbox.email', label: 'From', sortable: true },
                { key: 'to_addresses', label: 'To', sortable: false, formatter: "list" },
                { key: 'subject', label: 'Subject', sortable: true },
                { key: 'status', label: 'Status', formatter: 'badge' },
                { key: 'status_reason', label: 'Reason', formatter: "truncate(80)|default('—')" },
                { key: 'created', label: 'Created', formatter: 'datetime' }
            ],

            // Features
            selectable: true,
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