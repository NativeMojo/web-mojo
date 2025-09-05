/**
 * EmailMailboxTablePage - Admin page for managing Mailboxes
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '../pages/TablePage.js';
import { MailboxList, MailboxForms, Mailbox } from '../models/Email.js';
import Dialog from '../core/Dialog.js';

class EmailMailboxTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_email_mailboxes',
            pageName: 'Mailboxes',
            router: 'admin/email/mailboxes',
            Collection: MailboxList,

            formCreate: MailboxForms.create,
            formEdit: MailboxForms.edit,
            clickAction: "edit",

            // Table columns
            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'email', label: 'Email', sortable: true },
                { key: 'domain.name', label: 'Domain', sortable: true, formatter: "default('—')" },
                { key: 'allow_inbound', label: 'Inbound', formatter: "boolean|badge" },
                { key: 'allow_outbound', label: 'Outbound', formatter: "boolean|badge" },
                { key: 'is_system_default', label: 'System Default', formatter: "boolean|badge" },
                { key: 'is_domain_default', label: 'Domain Default', formatter: "boolean|badge" }
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
            emptyMessage: 'No mailboxes found. Click "Add Mailbox" to create one.',

            // Context menu configuration
            contextMenu: [
                { icon: 'bi-envelope', action: 'send-email', label: 'Send Email' },
                { icon: 'bi-envelope', action: 'send-template-email', label: 'Send Template Email' }
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

    async onActionSendEmail(event, element) {
        const item = this.collection.get(element.dataset.id);
        // Implement send email action
        const data = await Dialog.showForm({
            title: 'Send Email',
            fields: [
                { name: 'to', label: 'To', type: 'email', required: true },
                { name: 'subject', label: 'Subject', type: 'text', required: true },
                { name: 'body_html', label: 'Body', type: 'textarea', required: true }
            ]
        });
        data.from_email = item.get('email');
        const result = await Mailbox.sendEmail(data);
        if (result.success) {
            this.getApp().toast.success('Email sent successfully');
        } else {
            let msg = "Failed to send email";
            if (result.data.details) {
                msg = result.data.details;
            } else if (result.data.error) {
                msg = result.data.error;
            }
            console.log(result);
            this.getApp().toast.error(msg);
        }
    }

    async onActionSendTemplateEmail(event, element) {
        const item = this.collection.get(element.dataset.id);
        // Implement send email action
        const data = await Dialog.showForm({
            title: 'Send Email',
            fields: [
                { name: 'to', label: 'To', type: 'email', required: true },
                { name: 'subject', label: 'Subject', type: 'text', required: true },
                { name: 'template_name', label: 'Template', type: 'text', required: true },
                { name: 'template_context', label: 'Context', type: 'textarea', required: true }
            ]
        });
        data.from_email = item.get('email');
        const result = await Mailbox.sendEmail(data);
        if (result.success) {
            this.getApp().toast.success('Email sent successfully');
        } else {
            let msg = "Failed to send email";
            if (result.data.details) {
                msg = result.data.details;
            } else if (result.data.error) {
                msg = result.data.error;
            }
            console.log(result);
            this.getApp().toast.error(msg);
        }
    }
}

export default EmailMailboxTablePage;
