/**
 * JobStatsView - Job statistics overview cards
 */

import View from '@core/View.js';
import { Job } from '@core/models/Job.js';

export default class JobStatsView extends View {
    constructor(options = {}) {
        super({
            className: 'job-stats-section',
            ...options
        });

        this.stats = {
            pending: 0,
            running: 0,
            completed: 0,
            failed: 0,
            scheduled: 0
        };

        this.template = `
            <div class="job-stats-header mb-4">
                <div class="row">
                    <div class="col-xl-2 col-lg-4 col-md-6 col-12 mb-3">
                        <div class="card h-100 border-0 shadow">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="card-title text-muted mb-2">Pending</h6>
                                        <h3 class="mb-1 fw-bold">{{stats.pending}}</h3>
                                        <span class="badge bg-primary-subtle text-primary">
                                            <i class="bi bi-hourglass"></i> Queued
                                        </span>
                                    </div>
                                    <div class="text-primary">
                                        <i class="bi bi-clock fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-2 col-lg-4 col-md-6 col-12 mb-3">
                        <div class="card h-100 border-0 shadow">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="card-title text-muted mb-2">Running</h6>
                                        <h3 class="mb-1 fw-bold">{{stats.running}}</h3>
                                        <span class="badge bg-success-subtle text-success">
                                            <i class="bi bi-arrow-repeat"></i> Active
                                        </span>
                                    </div>
                                    <div class="text-success">
                                        <i class="bi bi-play-circle fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-2 col-lg-4 col-md-6 col-12 mb-3">
                        <div class="card h-100 border-0 shadow">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="card-title text-muted mb-2">Scheduled</h6>
                                        <h3 class="mb-1 fw-bold">{{stats.scheduled}}</h3>
                                        <span class="badge bg-warning-subtle text-warning">
                                            <i class="bi bi-calendar-event"></i> Planned
                                        </span>
                                    </div>
                                    <div class="text-warning">
                                        <i class="bi bi-calendar3 fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-3 col-lg-6 col-md-6 col-12 mb-3">
                        <div class="card h-100 border-0 shadow">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="card-title text-muted mb-2">Completed</h6>
                                        <h3 class="mb-1 fw-bold">{{stats.completed}}</h3>
                                        <span class="badge bg-info-subtle text-info">
                                            <i class="bi bi-check-circle"></i> Done
                                        </span>
                                    </div>
                                    <div class="text-info">
                                        <i class="bi bi-check-square fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-3 col-lg-6 col-md-6 col-12 mb-3">
                        <div class="card h-100 border-0 shadow">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="card-title text-muted mb-2">Failed</h6>
                                        <h3 class="mb-1 fw-bold">{{stats.failed}}</h3>
                                        <span class="badge bg-danger-subtle text-danger">
                                            <i class="bi bi-x-octagon"></i> Errors
                                        </span>
                                    </div>
                                    <div class="text-danger">
                                        <i class="bi bi-exclamation-triangle fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _onModelChange() {
      this.loadStats();
      if (this.isMounted()) {
          this.render();
      }
    }

    async loadStats() {
        this.stats = this.model.attributes.totals;
    }
}
