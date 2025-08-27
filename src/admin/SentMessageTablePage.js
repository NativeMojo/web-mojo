/**
 * SentMessageTablePage - Admin page for viewing sent emails
 * Displays outbound messages with a details dialog
 */

import TablePage from '../components/TablePage.js';
import View from '../core/View.js';
import Dialog from '../components/Dialog.js';
import { SentMessage, SentMessageList } from '../models/Email.js';

class SentMessageDetailsView extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: 'email-sent-message-details-view'
    });

    this.message = options.message || {};
    this.prepareMessageData();
  }

  prepareMessageData() {
    const msg = this.message || {};

    const toArr = Array.isArray(msg.to) ? msg.to : (typeof msg.to === 'string' ? msg.to.split(',') : []);
    const ccArr = Array.isArray(msg.cc) ? msg.cc : (typeof msg.cc === 'string' ? msg.cc.split(',') : []);
    const bccArr = Array.isArray(msg.bcc) ? msg.bcc : (typeof msg.bcc === 'string' ? msg.bcc.split(',') : []);

    this.toDisplay = toArr.map(s => String(s).trim()).filter(Boolean).join(', ');
    this.ccDisplay = ccArr.map(s => String(s).trim()).filter(Boolean).join(', ');
    this.bccDisplay = bccArr.map(s => String(s).trim()).filter(Boolean).join(', ');

    this.hasCc = !!this.ccDisplay;
    this.hasBcc = !!this.bccDisplay;

    const status = String(msg.status || '').toLowerCase();
    this.statusBadgeClass = this.getStatusBadgeClass(status);
    this.statusIcon = this.getStatusIcon(status);
  }

  getStatusBadgeClass(status) {
    switch (status) {
      case 'sending':
      case 'queued':
        return 'bg-primary';
      case 'delivered':
        return 'bg-success';
      case 'bounced':
      case 'failed':
        return 'bg-danger';
      case 'complained':
      case 'warning':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary';
    }
  }

  getStatusIcon(status) {
    switch (status) {
      case 'sending':
      case 'queued':
        return 'bi-send';
      case 'delivered':
        return 'bi-check-circle';
      case 'bounced':
      case 'failed':
        return 'bi-x-octagon';
      case 'complained':
      case 'warning':
        return 'bi-exclamation-triangle';
      default:
        return 'bi-envelope';
    }
  }

  async getTemplate() {
    return `
      <div class="card border-0 bg-light mb-3">
        <div class="card-body">
          <div class="row">
            <div class="col-md-8">
              <div class="mb-2">
                <div class="text-muted small">Subject</div>
                <div class="h5 mb-0">{{message.subject|default('—')}}</div>
              </div>
              <div class="mb-2">
                <div class="text-muted small">From</div>
                <div class="font-monospace">{{message.from_email|default('—')}}</div>
              </div>
              <div class="mb-2">
                <div class="text-muted small">To</div>
                <div class="font-monospace">{{toDisplay|default('—')}}</div>
              </div>
              {{#hasCc}}
              <div class="mb-2">
                <div class="text-muted small">CC</div>
                <div class="font-monospace">{{ccDisplay}}</div>
              </div>
              {{/hasCc}}
              {{#hasBcc}}
              <div class="mb-2">
                <div class="text-muted small">BCC</div>
                <div class="font-monospace">{{bccDisplay}}</div>
              </div>
              {{/hasBcc}}
            </div>
            <div class="col-md-4">
              <div class="mb-2">
                <div class="text-muted small">Status</div>
                <span class="badge {{statusBadgeClass}} fs-6">
                  <i class="bi {{statusIcon}}"></i> {{message.status|uppercase|default('UNKNOWN')}}
                </span>
              </div>
              <div class="mb-2">
                <div class="text-muted small">SES Message ID</div>
                <div class="small font-monospace">{{message.ses_message_id|default('—')}}</div>
              </div>
              <div class="mb-2">
                <div class="text-muted small">Created</div>
                <div>{{message.created|datetime}}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {{#message.status_reason}}
      <div class="card border-danger">
        <div class="card-header bg-danger-subtle py-2">
          <h6 class="mb-0 text-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>Status Reason
          </h6>
        </div>
        <div class="card-body">
          <pre class="bg-light p-3 rounded small mb-0"><code>{{message.status_reason}}</code></pre>
        </div>
      </div>
      {{/message.status_reason}}
    `;
  }
}

export default class SentMessageTablePage extends TablePage {
  constructor(options = {}) {
    super({
      ...options,
      name: 'admin_email_sent',
      pageName: 'Sent Messages',
      router: 'admin/email/sent',

      Collection: SentMessageList,

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
        contextMenu: [
          {
            icon: 'bi-info-circle',
            action: 'details',
            label: 'View Details',
            handler: async (item, event, el) => {
              await this.showSentMessageDetails(item);
            }
          }
        ]
      }
    });
  }

  async showSentMessageDetails(item) {
    try {
      const model = new SentMessage({ id: item.id });
      const resp = await model.fetch({ id: item.id });

      if (!resp.success) {
        throw new Error(resp.message || 'Failed to load sent message');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Server error loading message');
      }

      const message = resp.data.data || model.toJSON();
      const view = new SentMessageDetailsView({ message });

      await Dialog.showDialog({
        title: `<i class="bi bi-info-circle me-2"></i>Sent Message - #${message.id}`,
        body: view,
        size: 'lg',
        scrollable: true,
        buttons: [
          { text: 'Close', class: 'btn-secondary', dismiss: true }
        ]
      });
    } catch (err) {
      console.error('SentMessage details error:', err);
      this.showError(err.message || 'Failed to open details');
    }
  }
}
