/**
 * PhoneConfigTablePage — Per-group (and system-default) SMS provider
 * configuration management.
 *
 * Each row is one PhoneConfig with a provider (twilio / aws / mojo) and its
 * encrypted credentials. Click a row → opens PhoneConfigView which embeds an
 * editable form, Test Connection, Provision API Key (mojo only), and Delete.
 *
 * Default Add flow uses PhoneConfig.ADD_FORM via the framework — empty secret
 * fields on creation are harmless (default empty values on the backend).
 */

import TablePage from '@core/pages/TablePage.js';
import { PhoneConfig, PhoneConfigList } from '@ext/admin/models/Phonehub.js';
import PhoneConfigView from './PhoneConfigView.js';

PhoneConfig.VIEW_CLASS = PhoneConfigView;

const PROVIDER_FILTER_OPTIONS = [
    { value: 'twilio', label: 'Twilio' },
    { value: 'aws',    label: 'AWS SNS' },
    { value: 'mojo',   label: 'Mojo Remote' }
];

class PhoneConfigTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,

            // Identity
            name: 'admin_phonehub_config',
            pageName: 'Phone Configurations',
            router: 'admin/phonehub/config',

            // Data source
            Collection: PhoneConfigList,

            defaultQuery: {
                is_active: true,
                sort: '-modified'
            },

            viewDialogOptions: {
                header: false,
                size: 'lg'
            },

            // Column definitions
            columns: [
                { key: 'name', label: 'Name', sortable: true },
                {
                    key: 'group.name',
                    label: 'Group',
                    sortable: true,
                    formatter: "default('System Default')"
                },
                {
                    key: 'provider',
                    label: 'Provider',
                    sortable: true,
                    formatter: "default('—')|badge:twilio=info,aws=warning,mojo=primary",
                    filter: { type: 'select', options: PROVIDER_FILTER_OPTIONS }
                },
                {
                    key: 'is_active',
                    label: 'Active',
                    width: '80px',
                    formatter: "boolean('Active|bg-success','Inactive|bg-secondary')|badge",
                    filter: { type: 'boolean', trueLabel: 'Active', falseLabel: 'Inactive' }
                },
                {
                    key: 'test_mode',
                    label: 'Test Mode',
                    width: '110px',
                    formatter: "boolean('Test|bg-warning','Live|bg-secondary')|badge",
                    visibility: 'lg',
                    filter: { type: 'boolean', trueLabel: 'Test', falseLabel: 'Live' }
                },
                { key: 'modified', label: 'Modified', sortable: true, formatter: 'relative', visibility: 'lg' }
            ],

            searchPlaceholder: 'Search name or group',

            // Table features
            selectable: false,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // Row action
            clickAction: 'view',

            // Toolbar
            showRefresh: true,
            showAdd: true,
            showExport: false,
            addButtonLabel: 'New Config',

            // Empty state
            emptyMessage: 'No phone configurations yet. Click "New Config" to add one.',

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

export default PhoneConfigTablePage;
