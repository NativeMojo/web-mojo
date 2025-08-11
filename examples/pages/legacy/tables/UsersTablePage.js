/**
 * UsersTablePage - A proper TablePage implementation for managing users
 * This demonstrates the correct TablePage pattern with a single table/collection
 * Uses camelCase naming conventions following JavaScript best practices
 */

import TablePage from '../../../src/components/TablePage.js';
import Model from '../../../src/core/Model.js';
import DataList from '../../../src/core/DataList.js';
import Dialog from '../../../src/components/Dialog.js';
import { FormBuilder } from '../../../src/components/FormBuilder.js';

/**
 * User model for the users collection
 */
class UserModel extends Model {
    constructor(attributes = {}) {
        super(attributes);
        this.endpoint = '';
    }

    get fullName() {
        return `${this.get('firstName')} ${this.get('lastName')}`;
    }

    get statusBadgeClass() {
        const status = this.get('status');
        return {
            'active': 'bg-success',
            'inactive': 'bg-secondary',
            'pending': 'bg-warning',
            'suspended': 'bg-danger'
        }[status] || 'bg-secondary';
    }
}

/**
 * Users collection
 */
class UsersCollection extends DataList {
    constructor(options = {}) {
        super(UserModel, {
            ...options,
            endpoint: ''
        });
    }
}

/**
 * UsersTablePage - Manages the users table with CRUD operations
 */
export default class UsersTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            pageName: 'users',
            title: 'User Management',

            // Collection configuration
            Collection: UsersCollection,

            // Column definitions
            columns: [
                {
                    field: 'id',
                    label: 'ID',
                    width: '60px',
                    sortable: true
                },
                {
                    field: 'avatar',
                    label: '',
                    width: '50px',
                    formatter: (value, model) => {
                        const url = value || `https://ui-avatars.com/api/?name=${model.get('firstName')}+${model.get('lastName')}&size=32`;
                        return `<img src="${url}" class="rounded-circle" width="32" height="32" alt="Avatar">`;
                    }
                },
                {
                    field: 'firstName',
                    label: 'First Name',
                    sortable: true,
                    searchable: true,
                    formatter: 'capitalize'  // Simple string formatter
                },
                {
                    field: 'lastName',
                    label: 'Last Name',
                    sortable: true,
                    searchable: true,
                    formatter: 'capitalize'  // Simple string formatter
                },
                {
                    field: 'email',
                    label: 'Email',
                    sortable: true,
                    searchable: true,
                    formatter: 'lowercase|email'  // Pipe syntax for chaining
                },
                {
                    field: 'phone',
                    label: 'Phone',
                    formatter: "phone|default('-')"  // Pipe with default
                },
                {
                    field: 'role',
                    label: 'Role',
                    formatter: 'badge',  // Use built-in badge formatter
                    sortable: true,
                    filter: 'select',
                    filterOptions: [
                        { value: '', label: 'All Roles' },
                        { value: 'admin', label: 'Admin' },
                        { value: 'manager', label: 'Manager' },
                        { value: 'user', label: 'User' },
                        { value: 'guest', label: 'Guest' }
                    ],
                    formatter: (value) => {
                        const roleClass = {
                            'admin': 'text-danger',
                            'manager': 'text-warning',
                            'user': 'text-info',
                            'guest': 'text-secondary'
                        }[value] || '';
                        return `<span class="${roleClass} fw-semibold">${value}</span>`;
                    }
                },
                {
                    field: 'status',
                    label: 'Status',
                    sortable: true,
                    filter: 'select',
                    filterOptions: [
                        { value: '', label: 'All Statuses' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'suspended', label: 'Suspended' }
                    ],
                    formatter: 'status'  // Use built-in status formatter
                },
                {
                    field: 'lastLogin',
                    label: 'Last Active',
                    sortable: true,
                    formatter: "relative|default('Never')"  // Pipe with default
                },
                {
                    field: 'joinedAt',
                    label: 'Joined',
                    sortable: true,
                    formatter: "date('MMM YYYY')|default('-')"  // Pipe with args and default
                },
                {
                    field: 'accountBalance',
                    label: 'Balance',
                    sortable: true,
                    formatter: 'currency'  // Simple currency formatter
                },
                {
                    field: 'actions',
                    label: '',
                    type: 'actions',
                    width: '120px',
                    actions: [
                        {
                            icon: 'bi-eye',
                            label: 'View',
                            class: 'btn-sm btn-outline-primary',
                            action: 'view'
                        },
                        {
                            icon: 'bi-pencil',
                            label: 'Edit',
                            class: 'btn-sm btn-outline-secondary',
                            action: 'edit'
                        },
                        {
                            icon: 'bi-trash',
                            label: 'Delete',
                            class: 'btn-sm btn-outline-danger',
                            action: 'delete'
                        }
                    ]
                }
            ],

            // Initial filters
            filters: {
                status: 'active'  // Show only active users by default
            },

            // Collection params for API (camelCase)
            collectionParams: {
                sort: 'lastName',
                order: 'asc',
                limit: 25
            },

            // Enable group filtering (camelCase)
            groupFiltering: true,

            // Table options (camelCase)
            listOptions: {
                selectable: true,
                multiSelect: true,
                showSearch: true,
                showFilters: true,
                showPagination: true,
                showExport: true,
                showBulkActions: true,
                itemsPerPage: 25,
                itemsPerPageOptions: [10, 25, 50, 100]
            }
        });

        // Initialize dialogs
        this.userDialog = null;
        this.confirmDialog = null;
        this.formBuilder = null;
    }

    /**
     * Initialize the page (camelCase)
     */
    async onInit() {
        await super.onInit();

        // Add page-specific toolbar actions
        this.addToolbarAction('add', {
            label: 'Add User',
            icon: 'bi-plus-circle',
            class: 'btn-primary',
            position: 'left'
        });

        this.addToolbarAction('import', {
            label: 'Import',
            icon: 'bi-upload',
            class: 'btn-outline-secondary',
            position: 'right'
        });

        this.addToolbarAction('export', {
            label: 'Export',
            icon: 'bi-download',
            class: 'btn-outline-secondary',
            position: 'right'
        });

        // Set up bulk actions
        this.setBulkActions([
            {
                label: 'Activate',
                icon: 'bi-check-circle',
                action: 'bulkActivate',
                class: 'btn-success'
            },
            {
                label: 'Deactivate',
                icon: 'bi-x-circle',
                action: 'bulkDeactivate',
                class: 'btn-warning'
            },
            {
                label: 'Delete',
                icon: 'bi-trash',
                action: 'bulkDelete',
                class: 'btn-danger',
                confirm: true
            }
        ]);

        // Load sample data if no API endpoint
        this.loadSampleData();
    }

    /**
     * Handle item click - view user details (camelCase)
     */
    async onItemClicked(model, event) {
        await this.showUserDialog(model, 'view');
    }

    /**
     * Handle item double-click - edit user (camelCase)
     */
    async onItemDialog(model, event) {
        await this.showUserDialog(model, 'edit');
    }

    /**
     * Handle toolbar actions (camelCase)
     */
    async onActionAdd() {
        const newUser = new UserModel();
        await this.showUserDialog(newUser, 'create');
    }

    async onActionImport() {
        this.showInfo('Import functionality would open a file dialog or import wizard');
    }

    async onActionExport() {
        this.showInfo('Export functionality would download the current filtered data');
    }

    /**
     * Handle row actions (camelCase)
     */
    async onActionView(model) {
        await this.showUserDialog(model, 'view');
    }

    async onActionEdit(model) {
        await this.showUserDialog(model, 'edit');
    }

    async onActionDelete(model) {
        const confirmed = await this.showConfirm(
            `Are you sure you want to delete user "${model.fullName}"?`,
            'Delete User',
            'Delete',
            'Cancel'
        );

        if (confirmed) {
            try {
                await model.destroy();
                this.collection.remove(model);
                this.refresh();
                this.showSuccess(`User "${model.fullName}" deleted successfully`);
            } catch (error) {
                this.showError(`Failed to delete user: ${error.message}`);
            }
        }
    }

    /**
     * Handle bulk actions (camelCase)
     */
    async onActionBulkActivate() {
        const selected = this.getSelectedItems();
        if (selected.length === 0) {
            this.showWarning('No users selected');
            return;
        }

        for (const model of selected) {
            model.set('status', 'active');
            // In real app, would save to server
        }

        this.refresh();
        this.showSuccess(`${selected.length} user(s) activated`);
    }

    async onActionBulkDeactivate() {
        const selected = this.getSelectedItems();
        if (selected.length === 0) {
            this.showWarning('No users selected');
            return;
        }

        for (const model of selected) {
            model.set('status', 'inactive');
            // In real app, would save to server
        }

        this.refresh();
        this.showSuccess(`${selected.length} user(s) deactivated`);
    }

    async onActionBulkDelete() {
        const selected = this.getSelectedItems();
        if (selected.length === 0) {
            this.showWarning('No users selected');
            return;
        }

        const confirmed = await this.showConfirm(
            `Are you sure you want to delete ${selected.length} user(s)?`,
            'Delete Users',
            'Delete',
            'Cancel'
        );

        if (confirmed) {
            for (const model of selected) {
                this.collection.remove(model);
                // In real app, would call model.destroy()
            }

            this.refresh();
            this.showSuccess(`${selected.length} user(s) deleted`);
        }
    }

    /**
     * Show user dialog for view/edit/create
     */
    async showUserDialog(model, mode = 'view') {
        const isReadOnly = mode === 'view';
        const isNew = mode === 'create';

        // Create form fields
        const fields = [
            {
                name: 'firstName',
                label: 'First Name',
                type: 'text',
                required: true,
                readonly: isReadOnly,
                value: model.get('firstName')
            },
            {
                name: 'lastName',
                label: 'Last Name',
                type: 'text',
                required: true,
                readonly: isReadOnly,
                value: model.get('lastName')
            },
            {
                name: 'email',
                label: 'Email',
                type: 'email',
                required: true,
                readonly: isReadOnly,
                value: model.get('email')
            },
            {
                name: 'role',
                label: 'Role',
                type: 'select',
                required: true,
                readonly: isReadOnly,
                value: model.get('role') || 'user',
                options: [
                    { value: 'admin', label: 'Admin' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'user', label: 'User' },
                    { value: 'guest', label: 'Guest' }
                ]
            },
            {
                name: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                readonly: isReadOnly,
                value: model.get('status') || 'active',
                options: [
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'suspended', label: 'Suspended' }
                ]
            }
        ];

        // Create form
        this.formBuilder = new FormBuilder({
            fields: fields,
            submitButton: !isReadOnly,
            resetButton: !isReadOnly && !isNew
        });

        // Create dialog
        const title = isNew ? 'Add User' : (isReadOnly ? 'View User' : 'Edit User');

        this.userDialog = new Dialog({
            title: title,
            size: 'md',
            content: this.formBuilder.render(),
            buttons: isReadOnly ? [
                {
                    label: 'Close',
                    class: 'btn-secondary',
                    action: 'close'
                }
            ] : [
                {
                    label: 'Cancel',
                    class: 'btn-secondary',
                    action: 'cancel'
                },
                {
                    label: isNew ? 'Create' : 'Save',
                    class: 'btn-primary',
                    action: 'save'
                }
            ]
        });

        // Handle save action
        this.userDialog.on('action:save', async () => {
            if (this.formBuilder.validate()) {
                const data = this.formBuilder.getData();

                // Update model
                for (const [key, value] of Object.entries(data)) {
                    model.set(key, value);
                }

                try {
                    // In real app, would save to server
                    // await model.save();

                    if (isNew) {
                        model.set('id', Date.now()); // Fake ID
                        this.collection.add(model);
                    }

                    this.refresh();
                    this.userDialog.close();
                    this.showSuccess(isNew ? 'User created successfully' : 'User updated successfully');
                } catch (error) {
                    this.showError(`Failed to save user: ${error.message}`);
                }
            }
        });

        await this.userDialog.show();
    }

    /**
     * Load sample data for demo
     */
    loadSampleData() {
        const sampleUsers = [
            {
                id: 1,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                role: 'admin',
                status: 'active',
                lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
            },
            {
                id: 2,
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com',
                role: 'manager',
                status: 'active',
                lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
            },
            {
                id: 3,
                firstName: 'Bob',
                lastName: 'Johnson',
                email: 'bob.johnson@example.com',
                role: 'user',
                status: 'active',
                lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
            },
            {
                id: 4,
                firstName: 'Alice',
                lastName: 'Williams',
                email: 'alice.williams@example.com',
                role: 'user',
                status: 'pending',
                lastLogin: null
            },
            {
                id: 5,
                firstName: 'Charlie',
                lastName: 'Brown',
                email: 'charlie.brown@example.com',
                role: 'guest',
                status: 'inactive',
                lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
            },
            {
                id: 6,
                firstName: 'Diana',
                lastName: 'Miller',
                email: 'diana.miller@example.com',
                role: 'manager',
                status: 'active',
                lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
            },
            {
                id: 7,
                firstName: 'Edward',
                lastName: 'Davis',
                email: 'edward.davis@example.com',
                role: 'user',
                status: 'suspended',
                lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString()
            },
            {
                id: 8,
                firstName: 'Fiona',
                lastName: 'Garcia',
                email: 'fiona.garcia@example.com',
                role: 'admin',
                status: 'active',
                lastLogin: new Date().toISOString()
            }
        ];

        // Create collection with sample data
        this.collection = new UsersCollection();
        for (const userData of sampleUsers) {
            this.collection.add(new UserModel(userData));
        }

        // Mark as preloaded to skip fetch
        this.options.preloaded = true;
    }
}
