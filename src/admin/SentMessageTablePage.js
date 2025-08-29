/**
 * SentMessageTablePage - Admin page for viewing sent emails
 * Displays outbound messages with a details dialog
 */

import TablePage from '../components/TablePage.js';
import Dialog from '../components/Dialog.js';
import { SentMessage, SentMessageList } from '../models/Email.js';
import EmailView from './views/EmailView.js';

export default class SentMessageTablePage extends TablePage {
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

      tableOptions: {
        pageSizes: [10, 25, 50, 100],
        defaultPageSize: 25,
        emptyMessage: 'No sent messages found.',
        emptyIcon: 'bi-send-check',
        actions: ['view'],
      }
    });
  }
}
