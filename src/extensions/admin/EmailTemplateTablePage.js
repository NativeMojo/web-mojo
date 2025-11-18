/**
 * EmailTemplateTablePage - Admin page for managing Email Templates
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { EmailTemplateList, EmailTemplateForms } from '@core/models/Email.js';
import EmailTemplateView from './views/EmailTemplateView.js';

class EmailTemplateTablePage extends TablePage {
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
            clickAction: "edit",

            viewDialogOptions: {
                header: false,
                size: 'xl',
                scrollable: true
            },

            formDialogConfig: {             // Dialog options for forms
                size: 'fullscreen',
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

            // Empty state
            emptyMessage: 'No email templates found. Click "Add Template" to create your first one.',

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

export default EmailTemplateTablePage;
