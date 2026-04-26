/**
 * ScheduledTask - User-defined recurring or one-off tasks
 *
 * Each task belongs to the authenticated user. Supports three task types:
 * - job: Run a backend job function
 * - webhook: POST to a URL
 * - llm: Run an LLM prompt via the assistant
 *
 * Endpoints:
 *   GET    /api/jobs/scheduled_task          - List tasks
 *   POST   /api/jobs/scheduled_task          - Create a task
 *   GET    /api/jobs/scheduled_task/<id>     - Get task detail
 *   PUT    /api/jobs/scheduled_task/<id>     - Update a task
 *   DELETE /api/jobs/scheduled_task/<id>     - Delete a task
 */

import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

class ScheduledTask extends Model {
    constructor(data = {}, options = {}) {
        super(data, {
            endpoint: '/api/jobs/scheduled_task',
            ...options
        });
    }
}

class ScheduledTaskList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: ScheduledTask,
            endpoint: '/api/jobs/scheduled_task',
            size: 25,
            ...options
        });
    }
}

/**
 * TaskResult - Read-only execution result records
 *
 * Endpoints:
 *   GET /api/jobs/task_result          - List results
 *   GET /api/jobs/task_result/<id>     - Get result detail
 */
class TaskResult extends Model {
    constructor(data = {}, options = {}) {
        super(data, {
            endpoint: '/api/jobs/task_result',
            ...options
        });
    }
}

class TaskResultList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: TaskResult,
            endpoint: '/api/jobs/task_result',
            size: 25,
            ...options
        });
    }
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ScheduledTaskForms = {
    create: {
        title: 'Create Scheduled Task',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Name',
                placeholder: 'Daily report',
                required: true,
                columns: 12
            },
            {
                name: 'description',
                type: 'textarea',
                label: 'Description',
                placeholder: 'What this task does...',
                columns: 12
            },
            {
                name: 'task_type',
                type: 'select',
                label: 'Task Type',
                required: true,
                columns: 6,
                options: [
                    { value: 'llm', label: 'LLM Prompt' },
                    { value: 'job', label: 'Backend Job' },
                    { value: 'webhook', label: 'Webhook' }
                ]
            },
            {
                name: 'enabled',
                type: 'switch',
                label: 'Enabled',
                columns: 6,
                value: true
            },
            {
                name: 'run_times',
                type: 'text',
                label: 'Run Times (HH:MM)',
                placeholder: '09:00',
                required: true,
                columns: 6,
                help: 'Comma-separated 24h times, max 2. e.g. "09:00, 17:00"'
            },
            {
                name: 'run_days',
                type: 'text',
                label: 'Run Days',
                placeholder: '0,1,2,3,4',
                columns: 6,
                help: 'Comma-separated day numbers (Mon=0). Leave empty for every day.'
            },
            {
                name: 'run_once',
                type: 'switch',
                label: 'Run Once',
                columns: 6,
                help: 'Task runs once then disables itself.'
            },
            {
                name: 'max_retries',
                type: 'number',
                label: 'Max Retries',
                columns: 6,
                value: 0
            },
            {
                name: 'notify',
                type: 'text',
                label: 'Notify',
                placeholder: 'in_app, email',
                columns: 12,
                help: 'Comma-separated: email, in_app, sms, push'
            }
        ]
    },

    edit: {
        title: 'Edit Scheduled Task',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Name',
                required: true,
                columns: 12
            },
            {
                name: 'description',
                type: 'textarea',
                label: 'Description',
                columns: 12
            },
            {
                name: 'enabled',
                type: 'switch',
                label: 'Enabled',
                columns: 6
            },
            {
                name: 'run_times',
                type: 'text',
                label: 'Run Times (HH:MM)',
                required: true,
                columns: 6,
                help: 'Comma-separated 24h times, max 2.'
            },
            {
                name: 'run_days',
                type: 'text',
                label: 'Run Days',
                columns: 6,
                help: 'Comma-separated day numbers (Mon=0). Leave empty for every day.'
            },
            {
                name: 'run_once',
                type: 'switch',
                label: 'Run Once',
                columns: 6
            },
            {
                name: 'max_retries',
                type: 'number',
                label: 'Max Retries',
                columns: 6
            },
            {
                name: 'notify',
                type: 'text',
                label: 'Notify',
                placeholder: 'in_app, email',
                columns: 12,
                help: 'Comma-separated: email, in_app, sms, push'
            }
        ]
    }
};

export { ScheduledTask, ScheduledTaskList, TaskResult, TaskResultList, ScheduledTaskForms, DAY_LABELS };
