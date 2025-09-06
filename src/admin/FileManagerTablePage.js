/**
 * FileManagerTablePage - File Manager backend management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '../pages/TablePage.js';
import { FileManagerList, FileManagerForms } from '../models/Files.js';
import Dialog from '../core/Dialog.js';

class FileManagerTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_file_managers',
            pageName: 'Manage Storage Backends',
            router: "admin/file-managers",
            Collection: FileManagerList,

            formCreate: FileManagerForms.create,
            formEdit: FileManagerForms.edit,

            // Column definitions
            columns: [
                {
                    key: 'id',
                    label: 'ID',
                    sortable: true,
                    class: 'text-muted'
                },
                {
                    key: 'name',
                    label: 'Name',
                    formatter: "default('Unnamed Backend')"
                },
                {
                    key: 'backend_url',
                    label: 'Backend URL',
                    sortable: true
                },
                {
                    key: 'is_default',
                    label: 'Default',
                    formatter: "boolean|badge"
                },
                {
                    key: 'is_active',
                    label: 'Active',
                    formatter: "boolean|badge"
                },
                {
                    key: 'backend_type',
                    label: 'Type',
                    formatter: "default('Unknown')"
                },
                {
                    key: 'created',
                    label: 'Created',
                    formatter: "epoch|datetime"
                }
            ],

            contextMenu: [
                { icon: 'bi-pencil', action: 'edit', label: 'Edit Name' },
                { icon: 'bi-shield', action: 'edit-credentials', label: 'Edit Credentials' },
                { icon: 'bi-person', action: 'edit-owners', label: 'Edit Owners' },
                { divider: true },
                { icon: 'bi-copy', action: 'clone', label: 'Clone Manager' },
                { divider: true },
                { icon: 'bi-check', action: 'test-connection', label: 'Test Connection' },
                { icon: 'bi-question-circle', action: 'check-cors', label: 'Check CORS' },
                { icon: 'bi-wrench', action: 'fix-cors', label: 'Fix CORS' },
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
            emptyMessage: 'No storage backends found. Click "Add Storage Backend" to configure your first backend.',

            // Batch actions
            batchBarLocation: 'top',
            batchActions: [
                { label: "Delete", icon: "bi bi-trash", action: "batch-delete" },
                { label: "Export", icon: "bi bi-download", action: "batch-export" },
                { label: "Activate", icon: "bi bi-check-circle", action: "batch-activate" },
                { label: "Deactivate", icon: "bi bi-x-circle", action: "batch-deactivate" }
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

    async onActionEditOwners(event, element) {
        const item = this.collection.get(element.dataset.id);
        const result = await Dialog.showModelForm({
            title: 'Edit Owners',
            model: item,
            fields: FileManagerForms.owners.fields
        });
        if (result.success) {
            this.getApp().toast.success("Owners Updated successfully");
        } else {
            this.getApp().toast.error("Owners update failed");
        }
    }

    async onActionCheckCors(event, element) {
        const item = this.collection.get(element.dataset.id);
        const result = await item.save({check_cors: true});
        if (result.success && result.data.status) {
            // this.getApp().toast.success(result.data.result);
            await Dialog.showData({
                title: `Audit Report - ${item._.name}`,
                data: result.data,
                size: 'lg'
            });
        } else {
            this.getApp().toast.error("Connection test failed");
        }
        return true;
    }

    async onActionTestConnection(event, element) {
        const item = this.collection.get(element.dataset.id);
        const result = await item.save({test_connection: true});
        if (result.success && result.data.status) {
            this.getApp().toast.success("Connection test successful");
        } else {
            this.getApp().toast.error("Connection test failed");
        }
        return true;
    }

    async onActionEditCredentials(event, element) {
        const item = this.collection.get(element.dataset.id);
        const result = await Dialog.showModelForm({
            title: 'Edit Credentials',
            model: item,
            fields: FileManagerForms.credentials.fields
        });

        if (!result) return true;

        if (result.success && result.data.status) {
            this.getApp().toast.success("Credentials updated successfully");
        } else {
            this.getApp().toast.error("Failed to update credentials");
        }
        return true;
    }

    async onActionClone(event, element) {

        const confirmed = await Dialog.showConfirm({
            title: 'Clone File Manager',
            message: 'This will create a clone with the same credentials.',
        });

        if (!confirmed) {
            return true;
        }

        const item = this.collection.get(element.dataset.id);
        const result = await item.save({clone: true});
        if (result.success && result.data.status) {
            this.getApp().toast.success("Connection cloned successfully");
            this.collection.fetch();
        } else {
            this.getApp().toast.error("Failed to clone connection");
        }
        return true;
    }
}

export default FileManagerTablePage;
