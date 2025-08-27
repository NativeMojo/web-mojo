/**
 * EmailDomainTablePage - Admin page for managing SES/SNS Email Domains
 * Phase 2 skeleton: TablePage with basic columns and contextual actions
 *
 * Reuses:
 * - TablePage for listing/CRUD
 * - Dialog.showForm for onboarding form
 * - Dialog.showDialog with a small View for details
 *
 * Endpoints (via EmailDomain model):
 * - /api/aws/email/domain (list, create, edit, delete)
 * - /api/aws/email/domain/<id>/onboard (POST)
 * - /api/aws/email/domain/<id>/audit (GET/POST)
 * - /api/aws/email/domain/<id>/reconcile (POST)
 */

import TablePage from '../components/TablePage.js';
import View from '../core/View.js';
import Dialog from '../components/Dialog.js';
import { EmailDomain, EmailDomainList, EmailDomainForms } from '../models/Email.js';

class DomainDetailsView extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: 'email-domain-details-view'
    });

    this.domain = options.domain || {};
    this.topics = this.extractTopics(this.domain);
  }

  extractTopics(domain) {
    // Collect any known topic arns if present
    const topics = [];
    const map = {
      sns_topic_inbound_arn: 'Inbound',
      sns_topic_bounce_arn: 'Bounce',
      sns_topic_complaint_arn: 'Complaint',
      sns_topic_delivery_arn: 'Delivery'
    };
    Object.entries(map).forEach(([key, label]) => {
      if (domain[key]) topics.push({ label, arn: domain[key] });
    });
    return topics;
  }

  async getTemplate() {
    return `
      <div class="card border-0 bg-light mb-3">
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <div class="mb-2">
                <div class="text-muted small">Domain</div>
                <div class="h5 mb-0">{{domain.name}}</div>
              </div>
              <div class="mb-2">
                <div class="text-muted small">Region</div>
                <div>{{domain.region|default('—')}}</div>
              </div>
              <div class="mb-2">
                <div class="text-muted small">Receiving</div>
                <span class="badge {{#domain.receiving_enabled}}bg-success{{/domain.receiving_enabled}}{{^domain.receiving_enabled}}bg-secondary{{/domain.receiving_enabled}}">
                  {{#domain.receiving_enabled}}Enabled{{/domain.receiving_enabled}}{{^domain.receiving_enabled}}Disabled{{/domain.receiving_enabled}}
                </span>
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-2">
                <div class="text-muted small">Inbound S3 Bucket</div>
                <div>{{domain.s3_inbound_bucket|default('—')}}</div>
              </div>
              <div class="mb-2">
                <div class="text-muted small">Inbound S3 Prefix</div>
                <div class="font-monospace">{{domain.s3_inbound_prefix|default('—')}}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card border shadow-sm">
        <div class="card-header py-2">
          <h6 class="mb-0">
            <i class="bi bi-broadcast-pin me-2"></i>SNS Topics
          </h6>
        </div>
        <div class="card-body">
          {{#topics.length}}
            <ul class="list-group list-group-flush">
              {{#topics}}
              <li class="list-group-item d-flex justify-content-between align-items-start">
                <div>
                  <div class="fw-semibold">{{label}}</div>
                  <div class="small text-muted font-monospace">{{arn}}</div>
                </div>
                <button class="btn btn-sm btn-outline-secondary" data-action="copy-arn" data-arn="{{arn}}">
                  <i class="bi bi-clipboard"></i>
                </button>
              </li>
              {{/topics}}
            </ul>
          {{/topics.length}}
          {{^topics.length}}
            <div class="text-muted">No SNS topics reported for this domain.</div>
          {{/topics.length}}
        </div>
      </div>
    `;
  }

  async onActionCopyArn(action, event, element) {
    const arn = element.getAttribute('data-arn');
    try {
      await navigator.clipboard.writeText(arn || '');
      this.showSuccess('Copied ARN to clipboard');
    } catch (err) {
      this.showError('Failed to copy ARN');
    }
  }
}

class EmailDomainTablePage extends TablePage {
  constructor(options = {}) {
    super({
      ...options,
      name: 'admin_email_domains',
      pageName: 'Email Domains',
      router: 'admin/email/domains',

      Collection: EmailDomainList,
      formCreate: EmailDomainForms.create,
      formEdit: EmailDomainForms.edit,

      // Table columns
      columns: [
        { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
        { key: 'name', label: 'Domain', sortable: true },
        { key: 'region', label: 'Region', sortable: true, formatter: "default('—')" },
        { key: 'receiving_enabled', label: 'Receiving', formatter: "boolean|badge" },
        { key: 'can_send', label: 'Send Verified', formatter: "boolean|badge" },
        { key: 'can_recv', label: 'Recv Verified', formatter: "boolean|badge" },
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
        emptyMessage: 'No domains found. Click "Add Domain" to get started.',
        emptyIcon: 'bi-globe',
        actions: ['view', 'edit', 'delete'],
        contextMenu: [
          {
            icon: 'bi-info-circle',
            action: 'details',
            label: 'View Details',
            handler: async (item, event, el) => {
              await this.showDomainDetails(item);
            }
          },
          {
            icon: 'bi-rocket-takeoff',
            action: 'onboard',
            label: 'Onboard',
            handler: async (item, event, el) => {
              await this.handleOnboard(item);
            }
          },
          {
            icon: 'bi-shield-check',
            action: 'audit',
            label: 'Audit',
            handler: async (item, event, el) => {
              await this.handleAudit(item);
            }
          },
          {
            icon: 'bi-arrow-repeat',
            action: 'reconcile',
            label: 'Reconcile',
            handler: async (item, event, el) => {
              await this.handleReconcile(item);
            }
          }
        ]
      }
    });
  }

  // Details dialog using a lightweight View
  async showDomainDetails(item) {
    try {
      const model = new EmailDomain({ id: item.id });
      const resp = await model.fetch({ id: item.id });
      if (!resp.success) {
        throw new Error(resp.message || 'Failed to load domain details');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Server error loading domain details');
      }

      const domain = resp.data.data || model.toJSON();
      const view = new DomainDetailsView({ domain });

      await Dialog.showDialog({
        title: `<i class="bi bi-info-circle me-2"></i>Domain Details - ${domain.name}`,
        body: view,
        size: 'lg',
        scrollable: true,
        buttons: [
          {
            text: 'Audit',
            class: 'btn-outline-primary',
            action: async () => {
              await this.handleAudit(domain);
              return null;
            }
          },
          {
            text: 'Reconcile',
            class: 'btn-outline-warning',
            action: async () => {
              await this.handleReconcile(domain);
              return null;
            }
          },
          {
            text: 'Onboard',
            class: 'btn-primary',
            action: async () => {
              await this.handleOnboard(domain);
              return null;
            }
          },
          { text: 'Close', class: 'btn-secondary', dismiss: true }
        ]
      });
    } catch (err) {
      console.error('Domain details error:', err);
      this.showError(err.message || 'Failed to open details');
    }
  }

  // Onboarding flow via Dialog.showForm using EmailDomainForms.onboard
  async handleOnboard(item) {
    try {
      const model = new EmailDomain({ id: item.id });
      const formData = await Dialog.showForm(EmailDomainForms.onboard, {
        size: 'lg',
        buttons: [
          { text: 'Cancel', class: 'btn-secondary', dismiss: true },
          { text: 'Onboard', class: 'btn-primary', submit: true }
        ]
      });

      if (!formData) return; // user cancelled

      const resp = await model.onboard(formData);
      if (!resp.success) {
        throw new Error(resp.message || resp.error || 'Network error during onboarding');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Onboarding failed');
      }

      this.getApp()?.toast?.success('Domain onboarding started/completed successfully');

      // Show results (DNS records, topics, notes) in a quick dialog
      const result = resp.data?.data || {};
      const bodyView = new View({
        template: `
          <div>
            <p class="text-muted">DNS records, topics, and notes returned from the server:</p>
            <pre class="bg-light p-3 rounded small"><code>{{{data.result|json}}}</code></pre>
          </div>
        `,
        data: { result }
      });

      await Dialog.showDialog({
        title: `<i class="bi bi-rocket-takeoff me-2"></i>Onboard Results - ${item.name || item.id}`,
        body: bodyView,
        size: 'lg',
        buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
      });

      // Refresh list to reflect any updated flags
      await this.refreshTable?.();

    } catch (err) {
      console.error('Onboard error:', err);
      this.showError(err.message || 'Failed to onboard domain');
    }
  }

  async handleAudit(item) {
    try {
      const model = new EmailDomain({ id: item.id });
      const resp = await model.audit();
      if (!resp.success) {
        throw new Error(resp.message || resp.error || 'Network error during audit');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Audit failed');
      }

      const result = resp.data?.data || {};
      const bodyView = new View({
        template: `
          <div>
            <p class="text-muted">Drift report and status:</p>
            <pre class="bg-light p-3 rounded small"><code>{{{data.result|json}}}</code></pre>
          </div>
        `,
        data: { result }
      });

      await Dialog.showDialog({
        title: `<i class="bi bi-shield-check me-2"></i>Audit Report - ${item.name || item.id}`,
        body: bodyView,
        size: 'lg',
        buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
      });
    } catch (err) {
      console.error('Audit error:', err);
      this.showError(err.message || 'Failed to audit domain');
    }
  }

  async handleReconcile(item) {
    try {
      const model = new EmailDomain({ id: item.id });
      const resp = await model.reconcile();
      if (!resp.success) {
        throw new Error(resp.message || resp.error || 'Network error during reconcile');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Reconcile failed');
      }

      this.getApp()?.toast?.success('Reconcile completed successfully');

      const result = resp.data?.data || {};
      const bodyView = new View({
        template: `
          <div>
            <p class="text-muted">Applied fixes and notes:</p>
            <pre class="bg-light p-3 rounded small"><code>{{{data.result|json}}}</code></pre>
          </div>
        `,
        data: { result }
      });

      await Dialog.showDialog({
        title: `<i class="bi bi-arrow-repeat me-2"></i>Reconcile Results - ${item.name || item.id}`,
        body: bodyView,
        size: 'lg',
        buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
      });

      // Update the table in case receiving_enabled or other flags changed
      await this.refreshTable?.();

    } catch (err) {
      console.error('Reconcile error:', err);
      this.showError(err.message || 'Failed to reconcile domain');
    }
  }
}

export default EmailDomainTablePage;
