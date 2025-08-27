/**
 * EmailTemplateTablePage - Admin page for managing Email Templates (DB templates)
 * - Provides CRUD via TablePage
 * - Validates metadata JSON on create/edit
 * - Details dialog to preview template fields
 */

import TablePage from '../components/TablePage.js';
import View from '../core/View.js';
import Dialog from '../components/Dialog.js';
import {
  EmailTemplate,
  EmailTemplateList,
  EmailTemplateForms
} from '../models/Email.js';

class EmailTemplateDetailsView extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: 'email-template-details-view'
    });

    this.entry = options.entry || {};
    this.hasHtml = !!(this.entry.html_template && this.entry.html_template.trim());
    this.hasText = !!(this.entry.text_template && this.entry.text_template.trim());
    this.hasMetadata = !!this.entry.metadata;
  }

  async getTemplate() {
    return `
      <div class="card border-0 bg-light mb-3">
        <div class="card-body">
          <div class="row">
            <div class="col-md-8">
              <div class="mb-2">
                <div class="text-muted small">Template Name</div>
                <div class="h5 mb-0">{{entry.name}}</div>
              </div>
              <div class="mb-2">
                <div class="text-muted small">Subject Template</div>
                <div class="font-monospace">{{entry.subject_template|default('—')}}</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="mb-2">
                <div class="text-muted small">Created</div>
                <div>{{entry.created|datetime}}</div>
              </div>
              <div class="mb-2">
                <div class="text-muted small">Modified</div>
                <div>{{entry.modified|datetime}}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {{#hasHtml}}
      <div class="card mb-3">
        <div class="card-header py-2">
          <h6 class="mb-0">
            <i class="bi bi-code-slash me-2"></i>HTML Template
          </h6>
        </div>
        <div class="card-body">
          <pre class="bg-light p-3 rounded small mb-0"><code>{{entry.html_template}}</code></pre>
        </div>
      </div>
      {{/hasHtml}}

      {{#hasText}}
      <div class="card mb-3">
        <div class="card-header py-2">
          <h6 class="mb-0">
            <i class="bi bi-justify-left me-2"></i>Text Template
          </h6>
        </div>
        <div class="card-body">
          <pre class="bg-light p-3 rounded small mb-0"><code>{{entry.text_template}}</code></pre>
        </div>
      </div>
      {{/hasText}}

      {{#hasMetadata}}
      <div class="card">
        <div class="card-header py-2">
          <h6 class="mb-0">
            <i class="bi bi-braces-asterisk me-2"></i>Metadata
          </h6>
        </div>
        <div class="card-body">
          <pre class="bg-light p-3 rounded small mb-0"><code>{{{entry.metadata|json}}}</code></pre>
        </div>
      </div>
      {{/hasMetadata}}
    `;
  }
}

export default class EmailTemplateTablePage extends TablePage {
  constructor(options = {}) {
    super({
      ...options,
      name: 'admin_email_templates',
      pageName: 'Email Templates',
      router: 'admin/email/templates',

      Collection: EmailTemplateList,
      formCreate: EmailTemplateForms.create,
      formEdit: EmailTemplateForms.edit,

      // Table columns
      columns: [
        { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
        { key: 'name', label: 'Name', sortable: true },
        { key: 'created', label: 'Created', formatter: 'datetime' },
        { key: 'modified', label: 'Modified', formatter: 'datetime' }
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
        pageSizes: [10, 25, 50, 100],
        defaultPageSize: 25,
        emptyMessage: 'No email templates found. Click "Add Template" to create your first one.',
        emptyIcon: 'bi-file-text',
        actions: ['view', 'edit', 'delete'],
        contextMenu: [
          {
            icon: 'bi-info-circle',
            action: 'details',
            label: 'View Details',
            handler: async (item) => {
              await this.showTemplateDetails(item);
            }
          }
        ]
      }
    });
  }

  // Validate 'metadata' field to ensure valid JSON (if provided as string)
  normalizeAndValidateMetadata(data) {
    if (data && typeof data.metadata === 'string') {
      const raw = data.metadata.trim();
      if (raw.length === 0) {
        // Allow empty string to be treated as null/undefined
        delete data.metadata;
        return;
      }
      try {
        data.metadata = JSON.parse(raw);
      } catch (e) {
        throw new Error('Metadata must be valid JSON');
      }
    }
  }

  async onItemAdd(event) {
    try {
      const data = await Dialog.showForm({
        title: 'Create Email Template',
        formConfig: this.options.formCreate
      }, {
        size: 'lg',
        buttons: [
          { text: 'Cancel', class: 'btn-secondary', dismiss: true },
          { text: 'Create', class: 'btn-primary', submit: true }
        ]
      });

      if (!data) {
        return this.emit('item-add', { event, cancelled: true });
      }

      // Validate metadata JSON
      this.normalizeAndValidateMetadata(data);

      const model = new EmailTemplate();
      const resp = await model.save(data);

      if (!resp?.success) {
        this.getApp()?.toast?.error(resp?.message || resp?.error || 'Network error creating template');
        return this.emit('item-add', { event, error: resp });
      }
      if (resp?.data && resp.data.status === false) {
        this.getApp()?.toast?.error(resp.data.error || 'Failed to create template');
        return this.emit('item-add', { event, error: resp.data });
      }

      this.getApp()?.toast?.success('Template created successfully');
      await this.collection.fetch();
      this.emit('item-add', { event, model });

    } catch (err) {
      console.error('Create template failed:', err);
      this.getApp()?.toast?.error(err?.message || 'Failed to create template');
      this.emit('item-add', { event, error: err });
    }
  }

  async onItemEdit(item, mode = 'edit', event, target) {
    try {
      // Load latest before edit (optional but safer)
      const fresh = new EmailTemplate({ id: item.id });
      await fresh.fetch({ id: item.id });

      const initial = fresh.toJSON ? fresh.toJSON() : { ...item };
      const data = await Dialog.showForm({
        title: `Edit Template - ${initial.name || '#' + item.id}`,
        formConfig: this.options.formEdit,
        values: initial
      }, {
        size: 'lg',
        buttons: [
          { text: 'Cancel', class: 'btn-secondary', dismiss: true },
          { text: 'Save', class: 'btn-primary', submit: true }
        ]
      });

      if (!data) {
        return this.emit('item-dialog', { item, mode, event, target, cancelled: true });
      }

      // Validate metadata JSON
      this.normalizeAndValidateMetadata(data);

      const resp = await fresh.save(data);

      if (!resp?.success) {
        this.getApp()?.toast?.error(resp?.message || resp?.error || 'Network error updating template');
        return this.emit('item-dialog', { item, mode, event, target, error: resp });
      }
      if (resp?.data && resp.data.status === false) {
        this.getApp()?.toast?.error(resp.data.error || 'Failed to update template');
        return this.emit('item-dialog', { item, mode, event, target, error: resp.data });
      }

      this.getApp()?.toast?.success('Template updated successfully');
      await this.collection.fetch();
      this.emit('item-dialog', { item: fresh, mode, event, target });

    } catch (err) {
      console.error('Edit template failed:', err);
      this.getApp()?.toast?.error(err?.message || 'Failed to update template');
      this.emit('item-dialog', { item, mode, event, target, error: err });
    }
  }

  async showTemplateDetails(item) {
    try {
      const model = new EmailTemplate({ id: item.id });
      const resp = await model.fetch({ id: item.id });

      if (!resp.success) {
        throw new Error(resp.message || 'Failed to load template');
      }
      if (!resp.data?.status) {
        throw new Error(resp.data?.error || 'Server error loading template');
      }

      const entry = resp.data.data || model.toJSON();
      const view = new EmailTemplateDetailsView({ entry });

      await Dialog.showDialog({
        title: `<i class="bi bi-info-circle me-2"></i>Email Template - ${entry.name}`,
        body: view,
        size: 'lg',
        scrollable: true,
        buttons: [
          { text: 'Close', class: 'btn-secondary', dismiss: true }
        ]
      });
    } catch (err) {
      console.error('Template details error:', err);
      this.showError(err.message || 'Failed to open details');
    }
  }
}