/**
 * Job Model - Async Job Engine management
 * Supports object-oriented POST_SAVE_ACTIONS pattern from Jobs API
 */

import Collection from '../core/Collection.js';
import Model from '../core/Model.js';
import rest from '../core/Rest.js';

class Job extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/jobs/job'
        });
    }

    // Object-oriented actions using POST_SAVE_ACTIONS pattern
    async cancel() {
        const response = await this.save({ cancel_request: true });
        if (response.success && response.data.status) {
            // Update local status if successful
            this.set('cancel_requested', true);
        }
        return response;
    }

    async retry(delay = null) {
        const data = delay ?
            { retry_request: { retry: true, delay } } :
            { retry_request: true };

        const response = await this.save(data);
        if (response.success && response.data.status && response.data.new_job_id) {
            // Return new job ID if created
            return {
                ...response,
                newJobId: response.data.new_job_id,
                originalJobId: response.data.original_job_id
            };
        }
        return response;
    }

    async getDetailedStatus() {
        const response = await this.save({ get_status: true });
        if (response.success && response.data.status) {
            // Update local data with detailed status
            this.set(response.data.data);
        }
        return response;
    }

    async cloneJob(newPayload = {}) {
        const publishData = {
            publish_job: {
                payload: newPayload,
                ...newPayload
            }
        };

        const response = await this.save(publishData);
        if (response.success && response.data.status && response.data.job_id) {
            return {
                ...response,
                newJobId: response.data.job_id,
                templateJobId: response.data.template_job_id
            };
        }
        return response;
    }

    // Status helper methods
    isActive() {
        const status = this.get('status');
        return ['pending', 'running'].includes(status);
    }

    isTerminal() {
        const status = this.get('status');
        return ['completed', 'failed', 'canceled', 'expired'].includes(status);
    }

    canRetry() {
        const status = this.get('status');
        return ['failed', 'canceled', 'expired'].includes(status) && this.get('is_retriable') !== false;
    }

    canCancel() {
        const status = this.get('status');
        return ['pending', 'running'].includes(status) && !this.get('cancel_requested');
    }

    // Get status badge class for UI
    getStatusBadgeClass() {
        const status = this.get('status');
        const classes = {
            'pending': 'bg-primary',
            'running': 'bg-success',
            'completed': 'bg-info',
            'failed': 'bg-danger',
            'canceled': 'bg-secondary',
            'expired': 'bg-warning'
        };
        return classes[status] || 'bg-secondary';
    }

    // Get status icon
    getStatusIcon() {
        const status = this.get('status');
        const icons = {
            'pending': 'bi-hourglass',
            'running': 'bi-arrow-repeat',
            'completed': 'bi-check-circle',
            'failed': 'bi-x-octagon',
            'canceled': 'bi-x-circle',
            'expired': 'bi-clock'
        };
        return icons[status] || 'bi-question-circle';
    }

    // Get recent events for timeline
    getEvents() {
        return this.get('recent_events') || [];
    }

    // Get formatted duration
    getFormattedDuration() {
        const duration = this.get('duration_ms');
        if (!duration || duration === 0) return 'N/A';

        if (duration < 1000) return `${duration}ms`;
        if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
        if (duration < 3600000) return `${(duration / 60000).toFixed(1)}m`;
        return `${(duration / 3600000).toFixed(1)}h`;
    }

    // Get queue position if available
    getQueuePosition() {
        return this.get('queue_position');
    }

    // Check if job has expired
    hasExpired() {
        const expiresAt = this.get('expires_at');
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    }

    // Get runner information
    getRunnerId() {
        return this.get('runner_id');
    }

    // Get payload data
    getPayload() {
        return this.get('payload') || {};
    }

    // Get metadata
    getMetadata() {
        return this.get('metadata') || {};
    }
}

class JobList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: Job,
            endpoint: '/api/jobs/job',
            ...options
        });
    }

    // Filter by status
    async fetchByStatus(status, params = {}) {
        return this.fetch({ status, ...params });
    }

    // Filter by channel
    async fetchByChannel(channel, params = {}) {
        return this.fetch({ channel, ...params });
    }

    // Get pending jobs
    async fetchPending(params = {}) {
        return this.fetchByStatus('pending', params);
    }

    // Get running jobs
    async fetchRunning(params = {}) {
        return this.fetchByStatus('running', params);
    }

    // Get completed jobs
    async fetchCompleted(params = {}) {
        return this.fetchByStatus('completed', params);
    }

    // Get failed jobs
    async fetchFailed(params = {}) {
        return this.fetchByStatus('failed', params);
    }

    // Get scheduled jobs (those with run_at)
    async fetchScheduled(params = {}) {
        return this.fetch({
            scheduled: true, // This may need to be adjusted based on actual API
            ...params
        });
    }
}

// Form configurations for job management
const JobForms = {
    publish: {
        title: 'Publish New Job',
        fields: [
            {
                name: 'func',
                type: 'text',
                label: 'Function',
                required: true,
                placeholder: 'myapp.jobs.send_email',
                help: 'Module path to job function'
            },
            {
                name: 'channel',
                type: 'text',
                label: 'Channel',
                value: 'default',
                help: 'Queue channel (default: "default")'
            },
            {
                name: 'payload',
                type: 'textarea',
                label: 'Payload (JSON)',
                required: true,
                rows: 8,
                placeholder: '{\n  "key": "value"\n}',
                help: 'JSON data passed to the job function'
            },
            {
                name: 'delay',
                type: 'number',
                label: 'Delay (seconds)',
                min: 0,
                help: 'Delay execution by specified seconds'
            },
            {
                name: 'run_at',
                type: 'datetime-local',
                label: 'Run At',
                help: 'Schedule for specific date/time'
            },
            {
                name: 'max_retries',
                type: 'number',
                label: 'Max Retries',
                value: 3,
                min: 0,
                max: 10
            },
            {
                name: 'expires_in',
                type: 'number',
                label: 'Expires In (seconds)',
                value: 900,
                min: 60,
                help: 'Job will expire if not completed in this time'
            },
            {
                name: 'broadcast',
                type: 'switch',
                label: 'Broadcast to All Workers',
                help: 'Execute on all available workers'
            }
        ]
    },

    retry: {
        title: 'Retry Job',
        fields: [
            {
                name: 'delay',
                type: 'number',
                label: 'Delay (seconds)',
                value: 0,
                min: 0,
                help: 'Delay before retry (0 = immediate)'
            }
        ]
    },

    clone: {
        title: 'Clone Job',
        fields: [
            {
                name: 'channel',
                type: 'text',
                label: 'Channel',
                help: 'Override channel for cloned job'
            },
            {
                name: 'payload',
                type: 'textarea',
                label: 'Modified Payload (JSON)',
                rows: 8,
                help: 'Modified payload for cloned job'
            },
            {
                name: 'delay',
                type: 'number',
                label: 'Delay (seconds)',
                min: 0
            }
        ]
    }
};

// Static method to publish new job directly
Job.publish = async function(jobData) {
    return await rest.POST('/api/jobs/publish', jobData);
};

// Static method to get system stats
Job.getStats = async function() {
    const response = await rest.GET('/api/jobs/stats');
    return response.success ? response.data : null;
};

// Static method to get system health
Job.getHealth = async function(channel = null) {
    const endpoint = channel ? `/api/jobs/health/${channel}` : '/api/jobs/health';
    const response = rest.GET(endpoint);
    return response.success ? response.data : null;
};

// Static method to run test job
Job.test = async function() {
    return await rest.POST('/api/jobs/test', {});
};

// Static method to run test jobs
Job.tests = async function() {
    return await rest.POST('/api/jobs/tests', {});
};

Job.clearStuck = async function(channel = null) {
    const payload = channel ? { channel } : {};
    return await rest.POST('/api/jobs/control/clear-stuck', payload);
};

Job.clearChannel = async function(channel) {
    return await rest.POST('/api/jobs/control/clear-queue', { channel, confirm:"yes" });
};

Job.cleanConsumers = async function() {
    return await rest.POST('/api/jobs/control/cleanup-consumers');
};

Job.purgeJobs = async function(days_old) {
    return await rest.POST('/api/jobs/control/purge', { days_old });
};


class JobLog extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/jobs/logs'
        });
    }
}

class JobLogList extends Collection {
    constructor(options = {}) {
        super({
            endpoint: '/api/jobs/logs',
            model: JobLog,
            ...options
        });
    }
}


class JobEvent extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/jobs/event'
        });
    }
}

class JobEventList extends Collection {
    constructor(options = {}) {
        super({
            endpoint: '/api/jobs/event',
            model: JobEvent,
            ...options
        });
    }
}

export { Job, JobList, JobForms, JobLog, JobLogList, JobEvent, JobEventList };
