/**
 * EmailDomainTablePage - Admin page for managing SES/SNS Email Domains
 * Clean implementation following simplified TablePage pattern
 */

import TablePage from '@core/pages/TablePage.js';
import Dialog from '@core/views/feedback/Dialog.js';
import View from '@core/View.js';
import { EmailDomain, EmailDomainList, EmailDomainForms } from '@core/models/Email.js';

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

      // Column definitions
      columns: [
        {
          key: 'id',
          label: 'ID',
          width: '70px',
          sortable: true,
          class: 'text-muted'
        },
        {
          key: 'name',
          label: 'Domain',
          sortable: true
        },
        {
          key: 'region',
          label: 'Region',
          sortable: true,
          formatter: "default('—')"
        },
        {
          key: 'receiving_enabled',
          label: 'Receiving',
          formatter: "boolean|badge"
        },
        {
          key: 'can_send',
          label: 'Send Verified',
          formatter: "boolean|badge"
        },
        {
          key: 'can_recv',
          label: 'Recv Verified',
          formatter: "boolean|badge"
        },
        {
          key: 'created',
          label: 'Created',
          formatter: "epoch|datetime"
        }
      ],

      // Table features
      selectable: true,
      searchable: true,
      sortable: true,
      filterable: true,
      paginated: true,

      // Toolbar
      showRefresh: true,
      showAdd: true,
      showExport: true,

      // Empty state
      emptyMessage: 'No domains found. Click "Add Domain" to get started.',

      // Context menu configuration
      contextMenu: [
          {
            icon: 'bi-shield-check',
            action: 'edit-aws-creds',
            label: 'Edit AWS Credentials'
          },
        {
          icon: 'bi-rocket-takeoff',
          action: 'onboard',
          label: 'Onboard'
        },
        {
          icon: 'bi-shield-check',
          action: 'audit',
          label: 'Audit'
        },
        {
          icon: 'bi-arrow-repeat',
          action: 'reconcile',
          label: 'Reconcile'
        }
      ],

      // Table display options
      tableOptions: {
        striped: true,
        bordered: false,
        hover: true,
        responsive: false
      }
    });
  }

    async onActionEditAwsCreds(event, element) {
        const item = this.collection.get(element.dataset.id);
        const result = await Dialog.showModelForm({
                model: item,
                formConfig: EmailDomainForms.credentials,
            }
        );
        return true;
    }

  async onActionOnboard(event, element) {
    const item = this.collection.get(element.dataset.id);
    const model = new EmailDomain({ id: item.id });

    const formData = await Dialog.showForm(EmailDomainForms.onboard);
    if (!formData) return;

    try {
      const resp = await model.onboard(formData);
      if (!resp.success) {
        throw new Error(resp.message || 'Network error during onboarding');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Onboarding failed');
      }

      this.getApp()?.toast?.success('Domain onboarding completed successfully');
      await this.refresh();
    } catch (err) {
      console.error('Onboard error:', err);
      this.showError(err.message || 'Failed to onboard domain');
    }
  }

  async onActionAudit(event, element) {
    const item = this.collection.get(element.dataset.id);
    const model = new EmailDomain({ id: item.id });

    try {
      const resp = await model.audit();
      if (!resp.success) {
        throw new Error(resp.message || 'Network error during audit');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Audit failed');
      }

      const result = resp.data?.data || {};
      await Dialog.showDialog({
        title: `Audit Report - ${item.name}`,
        body: new View({
          template: `
            <div>
              <p class="text-muted">Drift report and status:</p>
              <pre class="bg-light p-3 rounded small"><code>{{{data.result|json}}}</code></pre>
            </div>
          `,
          data: { result }
        }),
        size: 'lg'
      });
    } catch (err) {
      console.error('Audit error:', err);
      this.showError(err.message || 'Failed to audit domain');
    }
  }

  async onActionReconcile(event, element) {
    const item = this.collection.get(element.dataset.id);
    const model = new EmailDomain({ id: item.id });

    try {
      const resp = await model.reconcile();
      if (!resp.success) {
        throw new Error(resp.message || 'Network error during reconcile');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Reconcile failed');
      }

      this.getApp()?.toast?.success('Reconcile completed successfully');
      await this.refresh();
    } catch (err) {
      console.error('Reconcile error:', err);
      this.showError(err.message || 'Failed to reconcile domain');
    }
  }
}

export default EmailDomainTablePage;
