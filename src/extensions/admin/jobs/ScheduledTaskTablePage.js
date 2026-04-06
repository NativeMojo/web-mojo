/**
 * ScheduledTaskTablePage - Admin page for managing user-defined scheduled tasks
 */

import TablePage from '@core/pages/TablePage.js';
import { ScheduledTask, ScheduledTaskList, ScheduledTaskForms, DAY_LABELS } from '@core/models/ScheduledTask.js';
import ScheduledTaskView from './ScheduledTaskView.js';

ScheduledTask.ADD_FORM = ScheduledTaskForms.create;
ScheduledTask.EDIT_FORM = ScheduledTaskForms.edit;

class ScheduledTaskTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_scheduled_tasks',
            pageName: 'Scheduled Tasks',
            router: 'admin/scheduled-tasks',
            Collection: ScheduledTaskList,

            itemViewClass: ScheduledTaskView,
            viewDialogOptions: {
                header: false,
                size: 'lg'
            },

            columns: [
                { key: 'name', label: 'Name', sortable: true },
                {
                    key: 'task_type',
                    label: 'Type',
                    width: '90px',
                    formatter: "uppercase|badge"
                },
                {
                    key: 'enabled',
                    label: 'Status',
                    width: '100px',
                    formatter: "boolean('Enabled|bg-success','Disabled|bg-secondary')|badge"
                },
                {
                    key: 'run_times',
                    label: 'Schedule',
                    render(value, model) {
                        const times = value || [];
                        const days = model.get('run_days') || [];
                        const timeStr = times.join(', ') || '—';
                        const dayStr = days.length === 0 || days.length === 7
                            ? 'Every day'
                            : days.map(d => DAY_LABELS[d] || d).join(', ');
                        return `${timeStr} · ${dayStr}`;
                    }
                },
                { key: 'run_count', label: 'Runs', width: '70px', sortable: true },
                { key: 'last_run', label: 'Last Run', formatter: 'relative', sortable: true },
                { key: 'created', label: 'Created', formatter: 'relative', sortable: true }
            ],

            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            showRefresh: true,
            showAdd: true,
            showExport: false,

            addButtonLabel: 'New Task',

            filters: [
                {
                    key: 'enabled',
                    label: 'Status',
                    type: 'select',
                    options: [
                        { value: '', label: 'All' },
                        { value: 'true', label: 'Enabled' },
                        { value: 'false', label: 'Disabled' }
                    ]
                },
                {
                    key: 'task_type',
                    label: 'Type',
                    type: 'select',
                    options: [
                        { value: '', label: 'All' },
                        { value: 'llm', label: 'LLM' },
                        { value: 'job', label: 'Job' },
                        { value: 'webhook', label: 'Webhook' }
                    ]
                }
            ],

            emptyMessage: 'No scheduled tasks found.',

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }
}

export default ScheduledTaskTablePage;
