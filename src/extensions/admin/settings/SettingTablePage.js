/**
 * SettingTablePage - Secure settings management using TablePage component
 */

import TablePage from '@core/pages/TablePage.js';
import { Setting, SettingList, SettingForms } from '@core/models/Settings.js';
import SettingView from './SettingView.js';

// Register the add/edit forms on the model class so TableView can find them automatically
Setting.ADD_FORM = SettingForms.create;
Setting.EDIT_FORM = SettingForms.edit;

class SettingTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_settings',
            pageName: 'Settings',
            router: 'admin/settings',
            Collection: SettingList,

            itemViewClass: SettingView,
            viewDialogOptions: {
                header: false,
                size: 'lg'
            },

            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'key', label: 'Key', sortable: true },
                { key: 'display_value', label: 'Value', formatter: "default('—')" },
                { key: 'group.name', label: 'Group', sortable: true, formatter: "default('Global')" },
                {
                    key: 'is_secret',
                    label: 'Secret',
                    formatter: "boolean('Secret|bg-warning text-dark','Plain|bg-secondary')|badge",
                    width: '100px'
                },
                { key: 'created', label: 'Created', formatter: 'datetime', sortable: true }
            ],

            defaultQuery: {
                sort: 'key'
            },

            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            showRefresh: true,
            showAdd: true,
            showExport: false,

            addButtonLabel: 'New Setting',

            emptyMessage: 'No settings found.',

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }
}

export default SettingTablePage;
