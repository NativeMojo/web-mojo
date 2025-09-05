/**
 * JobRunner Model - Job Engine Runner/Worker management
 * Manages worker processes that execute jobs
 */

import Collection from '../core/Collection.js';
import Model from '../core/Model.js';

class JobRunner extends Model {
    constructor(data = {}) {
        // Map runner_id to id for proper Model handling
        if (data.runner_id && !data.id) {
            data.id = data.runner_id;
        }
        
        super(data, {
            endpoint: '/api/jobs/runners',
            idAttribute: 'runner_id' // Tell the model to use runner_id as the ID field
        });
    }

    // Ping this runner to test connectivity
    async ping(timeout = 2.0) {
        const app = this.getApp();
        if (!app || !app.rest) {
            throw new Error('App or REST client not available');
        }

        const response = await app.rest.POST('/api/jobs/runners/ping', {
            runner_id: this.get('runner_id'),
            timeout: timeout
        });

        if (response.success && response.data.status) {
            // Update ping status
            this.set('last_heartbeat', new Date().toISOString());
            this.set('ping_status', response.data.ping_status || 'success');
        }

        return response;
    }

    // Shutdown this runner gracefully or forcefully
    async shutdown(graceful = true) {
        const app = this.getApp();
        if (!app || !app.rest) {
            throw new Error('App or REST client not available');
        }

        const response = await app.rest.POST('/api/jobs/runners/shutdown', {
            runner_id: this.get('runner_id'),
            graceful: graceful
        });

        if (response.success && response.data.status) {
            // Update status to shutting down (alive becomes false)
            this.set('alive', false);
        }

        return response;
    }

    // Get channels handled by this runner
    getChannels() {
        return this.get('channels') || [];
    }

    // Get runner status with appropriate styling based on alive field
    getStatusBadgeClass() {
        const alive = this.get('alive');
        return alive ? 'bg-success' : 'bg-danger';
    }

    // Get status icon based on alive field
    getStatusIcon() {
        const alive = this.get('alive');
        return alive ? 'bi-check-circle-fill' : 'bi-x-octagon-fill';
    }

    // Check if runner is active (alive)
    isActive() {
        return this.get('alive') === true;
    }

    // Check if runner is healthy (active and recent heartbeat)
    isHealthy() {
        if (!this.isActive()) return false;
        
        const lastHeartbeat = this.get('last_heartbeat');
        if (!lastHeartbeat) return false;
        
        // Consider healthy if heartbeat within last 2 minutes
        const heartbeatAge = (Date.now() - new Date(lastHeartbeat).getTime()) / 1000;
        return heartbeatAge < 120;
    }

    // Get formatted heartbeat age
    getFormattedHeartbeatAge() {
        const lastHeartbeat = this.get('last_heartbeat');
        if (!lastHeartbeat) return 'Never';
        
        const heartbeatAge = (Date.now() - new Date(lastHeartbeat).getTime()) / 1000;
        
        if (heartbeatAge < 60) return `${Math.round(heartbeatAge)}s ago`;
        if (heartbeatAge < 3600) return `${Math.round(heartbeatAge / 60)}m ago`;
        return `${Math.round(heartbeatAge / 3600)}h ago`;
    }

    // Get current utilization (from jobs processed vs capacity)
    getUtilization() {
        const processed = this.get('jobs_processed') || 0;
        const failed = this.get('jobs_failed') || 0;
        const total = processed + failed;
        // Since we don't have max capacity from API, return based on recent activity
        return total > 10 ? 100 : Math.min(total * 10, 100);
    }

    // Get formatted uptime based on started timestamp
    getFormattedUptime() {
        const started = this.get('started');
        if (!started) return 'Unknown';
        
        const startTime = new Date(started);
        const now = new Date();
        const diffMs = now - startTime;
        const diffSeconds = Math.floor(diffMs / 1000);
        
        if (diffSeconds < 60) return `${diffSeconds}s`;
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
        if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
        return `${Math.floor(diffSeconds / 86400)}d`;
    }

    // Get worker capacity info
    getWorkerInfo() {
        const processed = this.get('jobs_processed') || 0;
        const failed = this.get('jobs_failed') || 0;
        return {
            processed,
            failed,
            total: processed + failed,
            alive: this.get('alive'),
            utilization: this.getUtilization()
        };
    }

    // Get display name for runner
    getDisplayName() {
        const runnerId = this.get('runner_id');
        if (!runnerId) return 'Unknown Runner';
        
        // Extract hostname-like portion if it exists
        const parts = runnerId.split('-');
        return parts.length > 1 ? parts[0] : runnerId;
    }

    // Check if runner can be controlled
    canControl() {
        return this.get('alive') === true;
    }
}

class JobRunnerList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: JobRunner,
            endpoint: '/api/jobs/runners',
            ...options
        });
    }

    // Get only active runners
    getActive() {
        return this.where(runner => runner.isActive());
    }

    // Get runners by channel
    getByChannel(channel) {
        return this.where(runner => runner.getChannels().includes(channel));
    }

    // Get healthy runners
    getHealthy() {
        return this.where(runner => runner.isHealthy());
    }

    // Get total jobs processed across all runners
    getTotalProcessed() {
        return this.models.reduce((total, runner) => {
            return total + (runner.get('jobs_processed') || 0);
        }, 0);
    }

    // Get total jobs failed across all runners
    getTotalFailed() {
        return this.models.reduce((total, runner) => {
            return total + (runner.get('jobs_failed') || 0);
        }, 0);
    }

    // Get overall system health percentage (alive runners / total runners)
    getSystemHealth() {
        if (this.models.length === 0) return 0;
        const aliveRunners = this.models.filter(runner => runner.get('alive')).length;
        return Math.round((aliveRunners / this.models.length) * 100);
    }

    // Get unique channels across all runners
    getAllChannels() {
        const channels = new Set();
        this.models.forEach(runner => {
            runner.getChannels().forEach(channel => channels.add(channel));
        });
        return Array.from(channels).sort();
    }
}

// Static methods for system-wide runner management
JobRunner.ping = async function(runnerId, timeout = 2.0) {
    const app = typeof window !== 'undefined' && window.app;
    if (!app || !app.rest) {
        throw new Error('App or REST client not available');
    }
    
    return await app.rest.POST('/api/jobs/runners/ping', {
        runner_id: runnerId,
        timeout
    });
};

JobRunner.shutdown = async function(runnerId, graceful = true) {
    const app = typeof window !== 'undefined' && window.app;
    if (!app || !app.rest) {
        throw new Error('App or REST client not available');
    }
    
    return await app.rest.POST('/api/jobs/runners/shutdown', {
        runner_id: runnerId,
        graceful
    });
};

JobRunner.broadcast = async function(command, data = {}, timeout = 2.0) {
    const app = typeof window !== 'undefined' && window.app;
    if (!app || !app.rest) {
        throw new Error('App or REST client not available');
    }
    
    return await app.rest.POST('/api/jobs/runners/broadcast', {
        command,
        data,
        timeout
    });
};

// Broadcast commands
JobRunner.broadcastStatus = async function(timeout = 2.0) {
    return JobRunner.broadcast('status', {}, timeout);
};

JobRunner.broadcastShutdown = async function(timeout = 2.0) {
    return JobRunner.broadcast('shutdown', {}, timeout);
};

JobRunner.broadcastPause = async function(timeout = 2.0) {
    return JobRunner.broadcast('pause', {}, timeout);
};

JobRunner.broadcastResume = async function(timeout = 2.0) {
    return JobRunner.broadcast('resume', {}, timeout);
};

JobRunner.broadcastReload = async function(timeout = 2.0) {
    return JobRunner.broadcast('reload', {}, timeout);
};

const JobRunnerForms = {
    broadcast: {
        title: 'Broadcast Command',
        fields: [
            {
                name: 'command',
                type: 'select',
                label: 'Command',
                required: true,
                options: [
                    { value: 'status', label: 'Status Check' },
                    { value: 'pause', label: 'Pause Processing' },
                    { value: 'resume', label: 'Resume Processing' },
                    { value: 'reload', label: 'Reload Configuration' },
                    { value: 'shutdown', label: 'Shutdown All Runners' }
                ],
                help: 'Command to send to all runners'
            },
            {
                name: 'timeout',
                type: 'number',
                label: 'Timeout (seconds)',
                value: 2.0,
                min: 0.5,
                max: 10.0,
                step: 0.5,
                help: 'How long to wait for responses'
            }
        ]
    }
};

export { JobRunner, JobRunnerList, JobRunnerForms };