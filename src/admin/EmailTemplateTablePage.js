/**
 * EmailTemplateTablePage - Admin page for managing Email Templates (DB templates)
 * - Provides CRUD via TablePage
 * - Validates metadata JSON on create/edit
 * - Details dialog to preview template fields
 */

import TablePage from '../components/TablePage.js';
import Dialog from '../components/Dialog.js';
import {
  EmailTemplate,
  EmailTemplateList,
  EmailTemplateForms
} from '../models/Email.js';
import EmailTemplateView from './views/EmailTemplateView.js';

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
      itemViewClass: EmailTemplateView,
      viewDialogOptions: {
          header: false,
          size: 'xl',
          scrollable: true
      },

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
      }
    });
  }
}