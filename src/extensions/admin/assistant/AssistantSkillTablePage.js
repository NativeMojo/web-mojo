/**
 * AssistantSkillTablePage - Skill management using TablePage component
 */

import TablePage from '@core/pages/TablePage.js';
import { AssistantSkillList } from '@core/models/Assistant.js';
import AssistantSkillView from './AssistantSkillView.js';

const TIER_BADGE = {
    global: 'bg-primary',
    user: 'bg-info',
    group: 'bg-warning text-dark'
};

class AssistantSkillTablePage extends TablePage {
    constructor(options = {}) {
        super({
            name: 'assistant_skills',
            pageName: 'Assistant Skills',
            router: 'admin/assistant/skills',
            Collection: AssistantSkillList,
            itemViewClass: AssistantSkillView,

            viewDialogOptions: {
                header: false
            },

            defaultQuery: {
                sort: '-modified'
            },

            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'name', label: 'Name', sortable: true },
                { key: 'description', label: 'Description', sortable: false, formatter: "truncate:60" },
                {
                    key: 'tier', label: 'Tier', sortable: true, width: '100px',
                    formatter: (value) => {
                        const cls = TIER_BADGE[value] || 'bg-secondary';
                        return `<span class="badge ${cls}">${value || 'unknown'}</span>`;
                    },
                    filter: {
                        type: 'multiselect',
                        placeHolder: 'Select Tier',
                        options: ['global', 'user', 'group']
                    }
                },
                {
                    key: 'steps', label: 'Steps', width: '80px', sortable: false,
                    formatter: (value) => {
                        const count = Array.isArray(value) ? value.length : 0;
                        return `<span class="badge bg-secondary">${count}</span>`;
                    }
                },
                {
                    key: 'auto_execute', label: 'Auto', width: '80px', sortable: true,
                    formatter: (value) => value
                        ? '<i class="bi bi-check-circle-fill text-success"></i>'
                        : '<i class="bi bi-circle text-muted"></i>'
                },
                {
                    key: 'is_active', label: 'Active', width: '80px', sortable: true,
                    formatter: (value) => value
                        ? '<span class="badge bg-success">Active</span>'
                        : '<span class="badge bg-secondary">Inactive</span>'
                },
                { key: 'created', label: 'Created', sortable: true, formatter: 'datetime' }
            ],

            // Table features
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: false,

            // Toolbar — skills are created via chat, not UI
            showRefresh: true,
            showAdd: false,
            showExport: false,

            // Empty state
            emptyMessage: 'No skills found. Skills are created through the assistant chat.',

            // Table display
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            },
            ...options,
        });
    }
}

export default AssistantSkillTablePage;
