/**
 * JobHealthView - System health overview
 */

import View from '@core/View.js';
import Dialog from '@core/views/feedback/Dialog.js';
import { Job } from '@core/models/Job.js';

export default class JobHealthView extends View {
    constructor(options = {}) {
        super({
            className: 'job-health-section',
            ...options
        });

        this.health = {
            status: 'unknown',
            runners: { active: 0, total: 0 },
            channels: []
        };

        this.template = `
            <div class="job-health-header mb-4">
                <div class="card border-0 shadow">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <div class="d-flex align-items-center">
                                    <div class="health-indicator me-3">
                                        <i class="bi bi-circle-fill fs-4 {{healthStatusClass}}"></i>
                                    </div>
                                    <div>
                                        <h5 class="mb-1">System Health: {{health.overall_status|capitalize}}</h5>
                                        <small class="text-muted d-block">
                                            Workers: {{health.runners.active}}/{{health.runners.total}} active
                                        </small>
                                        <small class="text-muted d-block">
                                            Scheduler:
                                            <span class="{{schedulerStatusClass}} fw-bold">
                                                <i class="bi {{schedulerIcon}} me-1"></i>{{schedulerStatusText}}
                                            </span>
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="d-flex justify-content-end">
                                    <div class="btn-group">
                                        <button class="btn btn-sm btn-outline-primary" data-action="refresh-health">
                                            <i class="bi bi-arrow-clockwise"></i> Refresh
                                        </button>
                                        <button class="btn btn-sm btn-outline-secondary" data-action="system-settings">
                                            <i class="bi bi-gear"></i> Settings
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {{#health.channelsArray.length}}
                        <div class="row mt-3">
                            <div class="col-12">
                                <small class="text-muted d-block mb-2">Channel Status:</small>
                                <div class="d-flex flex-wrap gap-2">
                                    {{#health.channelsArray}}
                                    <span class="badge {{statusBadgeClass}} d-flex align-items-center">
                                        <i class="bi {{statusIcon}} me-1"></i>
                                        {{channel}} ({{queued}} queued, {{inflight}} inflight)
                                    </span>
                                    {{/health.channelsArray}}
                                </div>
                            </div>
                        </div>
                        {{/health.channelsArray.length}}
                    </div>
                </div>
            </div>
        `;
    }

    _onModelChange() {
      this.loadHealth();
      if (this.isMounted()) {
          this.render();
      }
    }

    async loadHealth() {
        if (!this.model._.totals) return;
        const data = this.model.attributes
        // Determine overall health status
        let overall_status = 'healthy';
        if (data.totals.runners_active === 0) {
            overall_status = 'critical';
        } else if (!data.scheduler.active) {
            overall_status = 'warning';
        }
        this.health = {
            overall_status,
            channels: data.channels,
            runners: {
                active: data.totals.runners_active,
                total: data.runners.length
            },
            totals: data.totals,
            scheduler: data.scheduler
        };

        this.healthStatusClass = this.getHealthStatusClass(this.health.overall_status);
        this.setupChannelDisplay();
        this.setupSchedulerDisplay();

    }

    setupChannelDisplay() {
        if (!this.health.channels) return;

        this.health.channelsArray = Object.values(this.health.channels).map(channel => {
            let channelStatus = 'healthy';

            // Determine status based on queue backlog and runner availability
            const totalJobs = (channel.queued_count || 0) + (channel.inflight_count || 0);
            if (totalJobs > 50) {
                channelStatus = 'warning';
            }
            if (totalJobs > 100 || channel.runners === 0) {
                channelStatus = 'critical';
            }

            return {
                ...channel,
                status: channelStatus,
                statusBadgeClass: this.getChannelBadgeClass(channelStatus),
                statusIcon: this.getChannelIcon(channelStatus),
                queued: channel.queued_count || 0,
                inflight: channel.inflight_count || 0,
                // For backward compatibility, map to old names
                pending: channel.queued_count || 0,
                running: channel.inflight_count || 0
            };
        });
    }

    setupSchedulerDisplay() {
        if (!this.health.scheduler) {
            this.schedulerStatusText = 'Unknown';
            this.schedulerStatusClass = 'text-muted';
            this.schedulerIcon = 'bi-question-circle-fill';
            return;
        }

        if (this.health.scheduler.active) {
            this.schedulerStatusText = 'Running';
            this.schedulerStatusClass = 'text-success';
            this.schedulerIcon = 'bi-check-circle-fill';
        } else {
            this.schedulerStatusText = 'Stopped';
            this.schedulerStatusClass = 'text-danger';
            this.schedulerIcon = 'bi-x-octagon-fill';
        }
    }

    getHealthStatusClass(status) {
        const classes = {
            'healthy': 'text-success',
            'warning': 'text-warning',
            'critical': 'text-danger',
            'unknown': 'text-muted'
        };
        return classes[status] || 'text-muted';
    }

    getChannelBadgeClass(status) {
        const classes = {
            'healthy': 'bg-success',
            'warning': 'bg-warning',
            'critical': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    getChannelIcon(status) {
        const icons = {
            'healthy': 'bi-check-circle-fill',
            'warning': 'bi-exclamation-triangle-fill',
            'critical': 'bi-x-octagon-fill'
        };
        return icons[status] || 'bi-dash-circle-fill';
    }

    async onActionRefreshHealth(event, element) {
        try {
            element.disabled = true;
            await this.model.fetch();
        } catch (error) {
            console.error('Failed to refresh health:', error);
        } finally {
            element.disabled = false;
        }
    }

    async onActionSystemSettings() {
        await Dialog.showAlert({
            title: 'System Settings',
            message: 'System settings interface coming soon!',
            type: 'info'
        });
    }
}
