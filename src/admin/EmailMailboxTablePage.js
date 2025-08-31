/**
 * EmailMailboxTablePage - Admin page for managing Mailboxes
 * Phase 2: TablePage with CRUD and quick toggle actions
 *
 * Reuses:
 * - TablePage for listing/CRUD
 * - Dialog.showDialog with a small View for details
 *
 * Endpoints (via Mailbox model):
 * - /api/aws/email/mailbox (list, create, edit, delete)
 */
import TablePage from '../pages/TablePage.js';
import View from '../core/View.js';
import Dialog from '../core/Dialog.js';
import { Mailbox, MailboxList, MailboxForms } from '../models/Email.js';

class MailboxDetailsView extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: 'email-mailbox-details-view'
    });

    this.mailbox = options.mailbox || {};
  }

  async getTemplate() {
    return `
      <div class="card border-0 bg-light mb-3">
        <div class="card-body">
          <div class="row">
            <div class="col-md-7">
              <div class="mb-2">
                <div class="text-muted small">Email</div>
                <div class="h5 mb-0 font-monospace">{{mailbox.email}}</div>
              </div>
              <div class="mb-2">
                <div class="text-muted small">Domain</div>
                <div>{{mailbox.domain.name}}{{^mailbox.domain.name}}{{mailbox.domain|default('—')}}{{/mailbox.domain.name}}</div>
              </div>
              <div class="mb-2">
                <div class="text-muted small">Async Handler</div>
                <div class="font-monospace">{{mailbox.async_handler|default('—')}}</div>
              </div>
            </div>
            <div class="col-md-5">
              <div class="mb-2">
                <div class="text-muted small">Inbound</div>
                <span class="badge {{#mailbox.allow_inbound}}bg-success{{/mailbox.allow_inbound}}{{^mailbox.allow_inbound}}bg-secondary{{/mailbox.allow_inbound}}">
                  {{#mailbox.allow_inbound}}Allowed{{/mailbox.allow_inbound}}{{^mailbox.allow_inbound}}Disabled{{/mailbox.allow_inbound}}
                </span>
              </div>
              <div class="mb-2">
                <div class="text-muted small">Outbound</div>
                <span class="badge {{#mailbox.allow_outbound}}bg-success{{/mailbox.allow_outbound}}{{^mailbox.allow_outbound}}bg-secondary{{/mailbox.allow_outbound}}">
                  {{#mailbox.allow_outbound}}Allowed{{/mailbox.allow_outbound}} {{^mailbox.allow_outbound}}Disabled{{/mailbox.allow_outbound}}
                </span>
              </div>
              <div class="mb-2">
                <div class="text-muted small">Created</div>
                <div>{{mailbox.created|datetime}}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export default class EmailMailboxTablePage extends TablePage {
  constructor(options = {}) {
    super({
      ...options,
      name: 'admin_email_mailboxes',
      pageName: 'Mailboxes',
      router: 'admin/email/mailboxes',

      Collection: MailboxList,
      formCreate: MailboxForms.create,
      formEdit: MailboxForms.edit,

      // Table columns
      columns: [
        { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
        { key: 'email', label: 'Email', sortable: true },
        // domain may be an object or string; try nested first with fallback default pipe
        { key: 'domain.name', label: 'Domain', sortable: true, formatter: "default('—')" },
        { key: 'allow_inbound', label: 'Inbound', formatter: "boolean|badge" },
        { key: 'allow_outbound', label: 'Outbound', formatter: "boolean|badge" },
        { key: 'async_handler', label: 'Handler', formatter: "default('—')" },
        { key: 'created', label: 'Created', formatter: "epoch|datetime" }
      ],

      // Features
      selectable: true,
      searchable: true,
      sortable: true,
      filterable: true,
      paginated: true,

      // Toolbar
      showRefresh: true,
      showAdd: true,
      showExport: true,

      tableOptions: {
        pageSizes: [5, 10, 25, 50],
        defaultPageSize: 10,
        emptyMessage: 'No mailboxes found. Click "Add Mailbox" to create one.',
        emptyIcon: 'bi-envelope',
        actions: ['view', 'edit', 'delete'],
        contextMenu: [
          {
            icon: 'bi-info-circle',
            action: 'details',
            label: 'View Details',
            handler: async (item, event, el) => {
              await this.showMailboxDetails(item);
            }
          },
          {
            icon: 'bi-envelope',
            action: 'send-email',
            label: 'Send Email',
            handler: async (item, event, el) => {
              await this.handleSendEmail(item, el);
            }
          },
          {
            icon: 'bi-envelope',
            action: 'send-template-email',
            label: 'Send Template Email',
            handler: async (item, event, el) => {
              await this.handleSendTemplateEmail(item, el);
            }
          }
        ]
      }
    });
  }

  // Details dialog using a lightweight View
  async showMailboxDetails(item) {
    try {
      const model = new Mailbox({ id: item.id });
      const resp = await model.fetch({ id: item.id });
      if (!resp.success) {
        throw new Error(resp.message || 'Failed to load mailbox details');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Server error loading mailbox details');
      }

      const mailbox = resp.data.data || model.toJSON();
      const view = new MailboxDetailsView({ mailbox });

      const result = await Dialog.showDialog({
        title: `<i class="bi bi-info-circle me-2"></i>Mailbox Details - ${mailbox.email}`,
        body: view,
        size: 'lg',
        scrollable: true,
        buttons: [
          {
            text: mailbox.allow_inbound ? 'Disable Inbound' : 'Enable Inbound',
            class: mailbox.allow_inbound ? 'btn-outline-warning' : 'btn-outline-success',
            handler: async () => {
              await this.handleToggleInbound(mailbox);
              return null;
            }
          },
          {
            text: mailbox.allow_outbound ? 'Disable Outbound' : 'Enable Outbound',
            class: mailbox.allow_outbound ? 'btn-outline-warning' : 'btn-outline-success',
            handler: async () => {
              await this.handleToggleOutbound(mailbox);
              return null;
            }
          },
          { text: 'Close', class: 'btn-secondary', dismiss: true }
        ]
      });
        console.log(result);
    } catch (err) {
      console.error('Mailbox details error:', err);
      this.showError(err.message || 'Failed to open details');
    }
  }

  async handleToggleInbound(item, element) {
    try {
      if (element) element.disabled = true;

      const model = new Mailbox({ id: item.id, ...item });
      const desired = !(item.allow_inbound === true);
      const resp = await model.save({ allow_inbound: desired });

      if (!resp.success) {
        throw new Error(resp.message || resp.error || 'Network error');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Failed to update inbound setting');
      }

      this.getApp()?.toast?.success(`Inbound ${desired ? 'enabled' : 'disabled'} for ${item.email}`);
      await this.refreshTable?.();
    } catch (err) {
      console.error('Toggle inbound error:', err);
      this.showError(err.message || 'Failed to update inbound setting');
    } finally {
      if (element) element.disabled = false;
    }
  }

  async handleToggleOutbound(item, element) {
    try {
      if (element) element.disabled = true;

      const model = new Mailbox({ id: item.id, ...item });
      const desired = !(item.allow_outbound === true);
      const resp = await model.save({ allow_outbound: desired });

      if (!resp.success) {
        throw new Error(resp.message || resp.error || 'Network error');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Failed to update outbound setting');
      }

      this.getApp()?.toast?.success(`Outbound ${desired ? 'enabled' : 'disabled'} for ${item.email}`);
      await this.refreshTable?.();
    } catch (err) {
      console.error('Toggle outbound error:', err);
      this.showError(err.message || 'Failed to update outbound setting');
    } finally {
      if (element) element.disabled = false;
    }
  }

  async handleSendEmail(item, element) {
    try {
      if (element) element.disabled = true;

      const form = {
        title: `Send Email from ${item._.email}`,
        fields: [
          { name: 'to', type: 'text', label: 'To', placeholder: 'user@example.com, other@example.com', required: true, cols: 12, help: 'Comma-separated or single email' },
          { name: 'cc', type: 'text', label: 'CC', cols: 12 },
          { name: 'bcc', type: 'text', label: 'BCC', cols: 12 },
          { name: 'subject', type: 'text', label: 'Subject', cols: 12 },
          { name: 'body_text', type: 'textarea', label: 'Text Body', rows: 4, cols: 12 },
          { name: 'body_html', type: 'textarea', label: 'HTML Body', rows: 6, cols: 12 },
          { name: 'allow_unverified', type: 'switch', label: 'Allow Unverified Domain', cols: 12 }
        ]
      };

      const data = await Dialog.showForm(form, {
        size: 'lg',
        buttons: [
          { text: 'Cancel', class: 'btn-secondary', dismiss: true },
          { text: 'Send', class: 'btn-primary', submit: true }
        ]
      });

      if (!data) return;

      // Normalize fields
      data.from_email = item._.email;
      if (typeof data.to === 'string') {
        data.to = data.to.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (typeof data.cc === 'string' && data.cc.trim()) {
        data.cc = data.cc.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (typeof data.bcc === 'string' && data.bcc.trim()) {
        data.bcc = data.bcc.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (data.template_context && typeof data.template_context === 'string' && data.template_context.trim()) {
        try {
          data.template_context = JSON.parse(data.template_context);
        } catch (e) {
          this.showError('Template Context must be valid JSON');
          return;
        }
      }

      const resp = await this.getApp().rest.POST('/api/aws/email/send', data);

      if (!resp.success) {
        throw new Error(resp.message || resp.error || 'Network error sending email');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Failed to send email');
      }

      this.getApp()?.toast?.success('Email queued for delivery');
    } catch (err) {
      console.error('Send email error:', err);
      this.showError(err.message || 'Failed to send email');
    } finally {
      if (element) element.disabled = false;
    }
  }

  async handleSendTemplateEmail(item, element) {
    try {
      if (element) element.disabled = true;

      const form = {
        title: `Send Email from ${item._.email}`,
        fields: [
          { name: 'to', type: 'text', label: 'To', placeholder: 'user@example.com, other@example.com', required: true, cols: 12, help: 'Comma-separated or single email' },
          { name: 'template_name', type: 'text', label: 'Template Name', cols: 12 },
          { name: 'template_context', type: 'textarea', label: 'Context', rows: 4, cols: 12 },
          { name: 'allow_unverified', type: 'switch', label: 'Allow Unverified Domain', cols: 12 }
        ]
      };

      const data = await Dialog.showForm(form, {
        size: 'lg',
        buttons: [
          { text: 'Cancel', class: 'btn-secondary', dismiss: true },
          { text: 'Send', class: 'btn-primary', submit: true }
        ]
      });

      if (!data) return;

      // Normalize fields
      data.from_email = item._.email;
      if (typeof data.to === 'string') {
        data.to = data.to.split(',').map(s => s.trim()).filter(Boolean);
      }

      if (data.template_context && typeof data.template_context === 'string' && data.template_context.trim()) {
        try {
          data.template_context = JSON.parse(data.template_context);
        } catch (e) {
          this.showError('Template Context must be valid JSON');
          return;
        }
      }

      const resp = await this.getApp().rest.POST('/api/aws/email/send', data);

      if (!resp.success) {
        throw new Error(resp.message || resp.error || 'Network error sending email');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Failed to send email');
      }

      this.getApp()?.toast?.success('Email queued for delivery');
    } catch (err) {
      console.error('Send email error:', err);
      this.showError(err.message || 'Failed to send email');
    } finally {
      if (element) element.disabled = false;
    }
  }
}
