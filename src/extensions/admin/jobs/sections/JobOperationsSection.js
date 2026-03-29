/**
 * JobOperationsSection - Management action buttons
 *
 * Provides the operations card with buttons for running test jobs,
 * clearing stuck jobs, purging old data, and broadcasting commands.
 */
import View from '@core/View.js';
import Dialog from '@core/views/feedback/Dialog.js';
import { Job } from '@core/models/Job.js';
import { JobRunner, JobRunnerForms } from '@core/models/JobRunner.js';

export default class JobOperationsSection extends View {
    constructor(options = {}) {
        super({
            className: 'job-operations-section',
            template: `
                <div class="card shadow-sm">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0"><i class="bi bi-tools me-2"></i>Operations</h5>
                    </div>
                    <div class="card-body">
                        <div class="d-flex flex-wrap gap-2">
                            <button class="btn btn-outline-primary" data-action="run-simple-job">
                                <i class="bi bi-play-circle me-2"></i>Run Simple Job
                            </button>
                            <button class="btn btn-outline-primary" data-action="run-test-jobs">
                                <i class="bi bi-robot me-2"></i>Run Test Jobs
                            </button>
                            <button class="btn btn-outline-warning" data-action="clear-stuck">
                                <i class="bi bi-wrench me-2"></i>Clear Stuck
                            </button>
                            <button class="btn btn-outline-warning" data-action="clear-channel">
                                <i class="bi bi-eraser me-2"></i>Clear Channel
                            </button>
                            <button class="btn btn-outline-danger" data-action="purge-jobs">
                                <i class="bi bi-trash me-2"></i>Purge Jobs
                            </button>
                            <button class="btn btn-outline-info" data-action="cleanup-consumers">
                                <i class="bi bi-people me-2"></i>Cleanup Consumers
                            </button>
                            <button class="btn btn-outline-secondary" data-action="runner-broadcast">
                                <i class="bi bi-wifi me-2"></i>Broadcast Command
                            </button>
                        </div>
                    </div>
                </div>
            `,
            ...options
        });
    }

    // ── Action handlers ────────────────────────────────────

    async onActionRunSimpleJob(event, element) {
        const confirmed = await Dialog.showConfirm({
            title: 'Run Simple Job',
            message: 'This will run a simple test job to verify the job system is working correctly.',
            confirmText: 'Run Test',
            confirmClass: 'btn-success'
        });

        if (confirmed) {
            await this.executeJobAction(element, () => Job.test(), 'Test job started successfully');
        }
    }

    async onActionRunTestJobs(event, element) {
        const confirmed = await Dialog.showConfirm({
            title: 'Run Test Jobs',
            message: 'This will run a suite of test jobs to verify all job functionalities.',
            confirmText: 'Run Tests',
            confirmClass: 'btn-success'
        });

        if (confirmed) {
            await this.executeJobAction(element, () => Job.tests(), 'Test suite started successfully');
        }
    }

    async onActionClearStuck(event, element) {
        const channels = this.options.getChannels?.() || [];
        const channelOptions = [
            { value: '', label: 'All Channels' },
            ...channels.map(ch => ({ value: ch.channel, label: ch.channel }))
        ];

        const result = await Dialog.showForm({
            title: 'Clear Stuck Jobs',
            formConfig: {
                fields: [
                    {
                        name: 'channel',
                        type: 'select',
                        label: 'Channel',
                        options: channelOptions,
                        value: '',
                        help: 'Select specific channel or leave empty for all channels'
                    }
                ]
            }
        });

        if (result) {
            await this.executeJobAction(
                element,
                () => Job.clearStuck(result.channel || null),
                (response) => {
                    const count = response.data.count || 0;
                    const channelText = result.channel ? ` from channel "${result.channel}"` : '';
                    return `Cleared ${count} stuck job${count !== 1 ? 's' : ''}${channelText}`;
                }
            );
        }
    }

    async onActionClearChannel(event, element) {
        const channels = this.options.getChannels?.() || [];
        const channelOptions = channels.map(ch => ({ value: ch.channel, label: ch.channel }));

        const result = await Dialog.showForm({
            title: 'Clear Channel',
            formConfig: {
                fields: [
                    {
                        name: 'channel',
                        type: 'select',
                        label: 'Channel',
                        options: channelOptions,
                        required: true,
                        help: 'Select the channel to clear.'
                    }
                ]
            }
        });

        if (result) {
            await this.executeJobAction(
                element,
                () => Job.clearChannel(result.channel),
                `Channel "${result.channel}" cleared successfully.`
            );
        }
    }

    async onActionPurgeJobs(event, element) {
        const result = await Dialog.showForm({
            title: 'Purge Old Jobs',
            formConfig: {
                fields: [
                    {
                        name: 'days_old',
                        type: 'number',
                        label: 'Days Old',
                        value: 30,
                        required: true,
                        help: 'Delete jobs older than this many days.'
                    }
                ]
            }
        });

        if (result) {
            await this.executeJobAction(
                element,
                () => Job.purgeJobs(result.days_old),
                (response) => {
                    const count = response.data.count || 0;
                    return `Purged ${count} old job(s).`;
                }
            );
        }
    }

    async onActionCleanupConsumers(event, element) {
        const confirmed = await Dialog.showConfirm({
            title: 'Cleanup Consumers',
            message: 'This will remove stale consumer records from the system. This is generally safe.',
            confirmText: 'Cleanup',
            confirmClass: 'btn-warning'
        });

        if (confirmed) {
            await this.executeJobAction(
                element,
                () => Job.cleanConsumers(),
                (response) => {
                    const count = response.data.count || 0;
                    return `Cleaned up ${count} consumer(s).`;
                }
            );
        }
    }

    async onActionRunnerBroadcast() {
        const result = await Dialog.showForm({
            title: 'Broadcast Command to All Runners',
            formConfig: JobRunnerForms.broadcast
        });

        if (result) {
            try {
                const broadcastResult = await JobRunner.broadcast(
                    result.command,
                    {},
                    result.timeout
                );

                if (broadcastResult.success) {
                    this.getApp().toast.success(`Broadcast command "${result.command}" sent successfully`);
                } else {
                    this.getApp().toast.error(broadcastResult.data?.error || 'Failed to broadcast command');
                }
            } catch (error) {
                console.error('Failed to broadcast command:', error);
                this.getApp().toast.error('Error broadcasting command: ' + error.message);
            }
        }
    }

    // ── Helpers ─────────────────────────────────────────────

    async executeJobAction(element, actionFn, successMessage) {
        try {
            element.disabled = true;
            const icon = element.querySelector('i');
            icon?.classList.add('spinning');

            const result = await actionFn();
            if (result.success && result.data?.status) {
                const message = typeof successMessage === 'function'
                    ? successMessage(result)
                    : successMessage;
                this.getApp().toast.success(message);
            } else {
                this.getApp().toast.error(result.data?.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Job action failed:', error);
            this.getApp().toast.error('Error: ' + error.message);
        } finally {
            element.disabled = false;
            const icon = element.querySelector('i');
            icon?.classList.remove('spinning');
        }
    }
}
