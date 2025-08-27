/**
 * RunnerDetailsView - Detailed runner information view for Dialog display
 * Shows comprehensive runner status, performance, tasks, and management actions
 */

import View from '../core/View.js';
import Dialog from '../components/Dialog.js';

export default class RunnerDetailsView extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: 'mojo-runner-details-view'
    });

    this.runner = options.runner || null;
    this.currentTasks = [];
    this.logs = [];
    this.metrics = null;
    this.config = null;
  }

  async getTemplate() {
    return `
      <div class="mojo-runner-details-container">
        {{#runner}}
        <!-- Runner Overview -->
        <div class="card border-0 bg-light mb-3">
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Hostname</label>
                  <div class="h5 mb-0 font-monospace">{{hostname}}</div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Status</label>
                  <div>
                    <span class="badge {{statusBadgeClass}} fs-6">
                      <i class="bi {{statusIcon}}"></i> {{status|uppercase}}
                    </span>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Workers</label>
                  <div class="h5 mb-0">
                    {{#metrics.activeWorkers}}{{metrics.activeWorkers}}/{{/metrics.activeWorkers}}{{max_workers}} workers
                    {{#metrics.workerUtilization}}
                    <div class="progress mt-1" style="height: 6px;">
                      <div class="progress-bar {{metrics.utilizationClass}}" style="width: {{metrics.workerUtilization}}%"></div>
                    </div>
                    {{/metrics.workerUtilization}}
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Started</label>
                  <div>{{started_at|datetime}}</div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Last Ping</label>
                  <div class="{{pingAgeClass}}">{{last_ping|datetime}} ({{pingAgeText}})</div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Uptime</label>
                  <div>{{uptimeText}}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Channel Assignment -->
        <div class="card mb-3">
          <div class="card-header py-2">
            <h6 class="mb-0">
              <i class="bi bi-collection me-2"></i>Assigned Channels
            </h6>
          </div>
          <div class="card-body">
            {{#channels.length}}
              <div class="d-flex flex-wrap gap-2">
                {{#channels}}
                <span class="badge bg-primary-subtle text-primary px-3 py-2">
                  {{.}}
                </span>
                {{/channels}}
              </div>
            {{/channels.length}}
            {{^channels.length}}
              <div class="text-center text-muted py-3">
                <i class="bi bi-collection opacity-50"></i>
                <p class="mb-0 mt-2">No channels assigned</p>
              </div>
            {{/channels.length}}
          </div>
        </div>

        <!-- Performance Metrics -->
        {{#metrics}}
        <div class="card mb-3">
          <div class="card-header py-2 d-flex justify-content-between align-items-center">
            <h6 class="mb-0">
              <i class="bi bi-speedometer2 me-2"></i>Performance Metrics
            </h6>
            <button class="btn btn-sm btn-outline-primary" data-action="refresh-metrics">
              <i class="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-lg-3 col-md-6 mb-3">
                <div class="text-center p-3 bg-light rounded">
                  <div class="h4 mb-1 text-success">{{tasksCompleted|number}}</div>
                  <small class="text-muted">Tasks Completed</small>
                  {{#tasksCompletedToday}}
                  <div class="small text-success mt-1">+{{tasksCompletedToday}} today</div>
                  {{/tasksCompletedToday}}
                </div>
              </div>
              <div class="col-lg-3 col-md-6 mb-3">
                <div class="text-center p-3 bg-light rounded">
                  <div class="h4 mb-1 text-info">{{avgExecutionTime}}ms</div>
                  <small class="text-muted">Avg Execution</small>
                  <div class="small {{performanceTrend.class}} mt-1">
                    <i class="bi {{performanceTrend.icon}}"></i> {{performanceTrend.text}}
                  </div>
                </div>
              </div>
              <div class="col-lg-3 col-md-6 mb-3">
                <div class="text-center p-3 bg-light rounded">
                  <div class="h4 mb-1 text-danger">{{errorCount|number}}</div>
                  <small class="text-muted">Errors</small>
                  <div class="small text-muted mt-1">{{errorRate}}% error rate</div>
                </div>
              </div>
              <div class="col-lg-3 col-md-6 mb-3">
                <div class="text-center p-3 bg-light rounded">
                  <div class="h4 mb-1 text-warning">{{queueBacklog|number}}</div>
                  <small class="text-muted">Queue Backlog</small>
                </div>
              </div>
            </div>

            <!-- Resource Usage Bars -->
            <div class="row mt-3">
              <div class="col-md-6 mb-2">
                <label class="form-label fw-bold small">CPU Usage</label>
                <div class="progress" style="height: 20px;">
                  <div class="progress-bar {{cpu.class}}" style="width: {{cpu.percentage}}%">
                    {{cpu.percentage}}%
                  </div>
                </div>
              </div>
              <div class="col-md-6 mb-2">
                <label class="form-label fw-bold small">Memory Usage</label>
                <div class="progress" style="height: 20px;">
                  <div class="progress-bar {{memory.class}}" style="width: {{memory.percentage}}%">
                    {{memory.used}}MB / {{memory.total}}MB
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {{/metrics}}

        <!-- Current Tasks -->
        <div class="card mb-3">
          <div class="card-header py-2 d-flex justify-content-between align-items-center">
            <h6 class="mb-0">
              <i class="bi bi-list-task me-2"></i>Current Tasks ({{currentTasks.length}})
            </h6>
            <button class="btn btn-sm btn-outline-primary" data-action="refresh-tasks">
              <i class="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>
          <div class="card-body p-0">
            {{#currentTasks.length}}
              <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                  <thead class="table-light">
                    <tr>
                      <th class="border-0">Task ID</th>
                      <th class="border-0">Function</th>
                      <th class="border-0">Channel</th>
                      <th class="border-0">Started</th>
                      <th class="border-0">Duration</th>
                      <th class="border-0 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {{#currentTasks}}
                    <tr>
                      <td class="font-monospace small">{{id|truncate(12)}}</td>
                      <td>{{function}}</td>
                      <td><span class="badge bg-primary-subtle text-primary">{{channel}}</span></td>
                      <td>{{started|time}}</td>
                      <td class="text-muted">{{duration}}</td>
                      <td class="text-end">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-info" data-action="view-task" data-task-id="{{id}}" title="View Details">
                            <i class="bi bi-eye"></i>
                          </button>
                          <button class="btn btn-outline-warning" data-action="cancel-task" data-task-id="{{id}}" title="Cancel">
                            <i class="bi bi-x-circle"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {{/currentTasks}}
                  </tbody>
                </table>
              </div>
            {{/currentTasks.length}}
            {{^currentTasks.length}}
              <div class="text-center text-muted py-5">
                <i class="bi bi-list-task fs-1 opacity-50"></i>
                <p class="mb-0 mt-2">No active tasks</p>
              </div>
            {{/currentTasks.length}}
          </div>
        </div>

        <!-- Runner Logs -->
        <div class="card">
          <div class="card-header py-2 d-flex justify-content-between align-items-center">
            <h6 class="mb-0">
              <i class="bi bi-journal-text me-2"></i>Runner Logs
            </h6>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary active" data-action="filter-logs" data-level="all">All</button>
              <button class="btn btn-outline-primary" data-action="filter-logs" data-level="info">Info</button>
              <button class="btn btn-outline-warning" data-action="filter-logs" data-level="warning">Warning</button>
              <button class="btn btn-outline-danger" data-action="filter-logs" data-level="error">Error</button>
              <button class="btn btn-outline-primary" data-action="refresh-logs">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="mojo-runner-logs-container" style="max-height: 300px; overflow-y: auto;">
              {{#logs.length}}
                {{#logs}}
                <div class="log-entry p-3 border-bottom" data-level="{{level}}">
                  <div class="d-flex justify-content-between align-items-start">
                    <div class="log-message flex-grow-1">
                      <span class="badge bg-{{levelClass}} me-2">{{level|uppercase}}</span>
                      {{message}}
                    </div>
                    <small class="text-muted ms-3">{{timestamp|time}}</small>
                  </div>
                </div>
                {{/logs}}
              {{/logs.length}}
              {{^logs.length}}
                <div class="text-center text-muted py-5">
                  <i class="bi bi-journal fs-1 opacity-50"></i>
                  <p class="mb-0 mt-2">No logs available</p>
                </div>
              {{/logs.length}}
            </div>
          </div>
        </div>
        {{/runner}}

        {{^runner}}
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          No runner data available
        </div>
        {{/runner}}
      </div>
    `;
  }

  async onInit() {
    if (this.runner) {
      await this.prepareRunnerData();
      await this.loadRunnerMetrics();
      await this.loadCurrentTasks();
      await this.loadRunnerLogs();
    }
  }

  async prepareRunnerData() {
    if (!this.runner) return;

    // Status styling
    this.runner.isActive = this.runner.status === 'active';
    this.runner.statusBadgeClass = this.runner.isActive ? 'bg-success' : 'bg-warning';
    this.runner.statusIcon = this.runner.isActive ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';

    // Calculate ping age and uptime
    if (this.runner.ping_age !== undefined) {
      this.runner.pingAgeText = this.formatDuration(this.runner.ping_age);
      this.runner.pingAgeClass = this.runner.ping_age > 300 ? 'text-danger' : 'text-muted';
    }

    if (this.runner.started_at) {
      const uptimeSeconds = Date.now() / 1000 - this.runner.started_at;
      this.runner.uptimeText = this.formatUptime(uptimeSeconds);
    }
  }

  async loadRunnerMetrics() {
    if (!this.runner?.hostname) return;

    try {
      const response = await this.getApp().rest.GET(`/api/runners/${this.runner.hostname}/metrics`);
      if (response.success && response.data.status) {
        const data = response.data.data;
        this.metrics = {
          activeWorkers: data.activeWorkers || 0,
          tasksCompleted: data.tasksCompleted || 0,
          tasksCompletedToday: data.tasksCompletedToday || 0,
          avgExecutionTime: data.avgExecutionTime || 0,
          errorCount: data.errorCount || 0,
          errorRate: data.errorRate || 0,
          queueBacklog: data.queueBacklog || 0,
          workerUtilization: Math.round((data.activeWorkers / this.runner.max_workers) * 100),
          utilizationClass: this.getUtilizationClass(data.activeWorkers / this.runner.max_workers),
          performanceTrend: this.getPerformanceTrend(data.avgExecutionTime || 0),
          cpu: this.getResourceStatus(data.cpuUsage || 0),
          memory: this.getMemoryStatus(data.memoryUsed || 0, data.memoryTotal || 1000)
        };
      }
    } catch (error) {
      console.error('Failed to load runner metrics:', error);
      this.metrics = this.getDefaultMetrics();
    }
  }

  async loadCurrentTasks() {
    if (!this.runner?.hostname) return;

    try {
      const response = await this.getApp().rest.GET(`/api/runners/${this.runner.hostname}/tasks`);
      if (response.success && response.data.status) {
        this.currentTasks = response.data.data.map(task => ({
          ...task,
          duration: this.formatDuration(Date.now() / 1000 - task.started)
        }));
      } else {
        this.currentTasks = [];
      }
    } catch (error) {
      console.error('Failed to load current tasks:', error);
      this.currentTasks = [];
    }
  }

  async loadRunnerLogs() {
    if (!this.runner?.hostname) return;

    try {
      const response = await this.getApp().rest.GET(`/api/runners/${this.runner.hostname}/logs?limit=50`);
      if (response.success && response.data.status) {
        this.logs = response.data.data.map(log => ({
          ...log,
          levelClass: this.getLogLevelClass(log.level)
        }));
      } else {
        this.logs = [];
      }
    } catch (error) {
      console.error('Failed to load runner logs:', error);
      this.logs = [];
    }
  }

  getDefaultMetrics() {
    return {
      activeWorkers: 0,
      tasksCompleted: 0,
      tasksCompletedToday: 0,
      avgExecutionTime: 0,
      errorCount: 0,
      errorRate: 0,
      queueBacklog: 0,
      workerUtilization: 0,
      utilizationClass: 'bg-secondary',
      performanceTrend: { class: 'text-muted', icon: 'bi-dash', text: 'No data' },
      cpu: { percentage: 0, class: 'bg-secondary' },
      memory: { used: 0, total: 0, percentage: 0, class: 'bg-secondary' }
    };
  }

  getUtilizationClass(utilization) {
    if (utilization > 0.9) return 'bg-danger';
    if (utilization > 0.7) return 'bg-warning';
    if (utilization > 0.5) return 'bg-info';
    return 'bg-success';
  }

  getPerformanceTrend(avgTime) {
    if (avgTime < 1000) {
      return { class: 'text-success', icon: 'bi-arrow-up', text: 'Excellent' };
    } else if (avgTime < 5000) {
      return { class: 'text-warning', icon: 'bi-arrow-right', text: 'Good' };
    } else {
      return { class: 'text-danger', icon: 'bi-arrow-down', text: 'Slow' };
    }
  }

  getResourceStatus(usage) {
    const percentage = Math.round(usage);
    let cssClass = 'bg-success';
    
    if (percentage > 80) cssClass = 'bg-danger';
    else if (percentage > 60) cssClass = 'bg-warning';
    else if (percentage > 40) cssClass = 'bg-info';

    return { percentage, class: cssClass };
  }

  getMemoryStatus(used, total) {
    const percentage = Math.round((used / total) * 100);
    return {
      used: Math.round(used),
      total: Math.round(total),
      percentage,
      class: this.getResourceStatus(percentage).class
    };
  }

  getLogLevelClass(level) {
    const classes = {
      'debug': 'secondary',
      'info': 'primary',
      'warning': 'warning',
      'error': 'danger'
    };
    return classes[level] || 'secondary';
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  formatDuration(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  }

  async setRunner(runner) {
    this.runner = runner;
    await this.prepareRunnerData();
    await this.loadRunnerMetrics();
    await this.loadCurrentTasks();
    await this.loadRunnerLogs();
    
    if (this.isMounted()) {
      await this.render();
    }
  }

  // Action handlers
  async onActionRefreshMetrics(action, event, element) {
    await this.loadRunnerMetrics();
    await this.render();
  }

  async onActionRefreshTasks(action, event, element) {
    await this.loadCurrentTasks();
    await this.render();
  }

  async onActionRefreshLogs(action, event, element) {
    await this.loadRunnerLogs();
    await this.render();
  }

  async onActionFilterLogs(action, event, element) {
    const level = element.getAttribute('data-level');
    const logEntries = this.element.querySelectorAll('.log-entry');
    
    logEntries.forEach(entry => {
      if (level === 'all' || entry.getAttribute('data-level') === level) {
        entry.style.display = 'block';
      } else {
        entry.style.display = 'none';
      }
    });

    // Update active filter button
    this.element.querySelectorAll('[data-action="filter-logs"]').forEach(btn => {
      btn.classList.remove('active');
    });
    element.classList.add('active');
  }

  async onActionViewTask(action, event, element) {
    const taskId = element.getAttribute('data-task-id');
    this.emit('task:view', { taskId, runner: this.runner });
  }

  async onActionCancelTask(action, event, element) {
    const taskId = element.getAttribute('data-task-id');
    
    if (!confirm('Are you sure you want to cancel this task?')) {
      return;
    }

    try {
      const response = await this.getApp().rest.POST(`/api/tasks/${taskId}/cancel`);
      
      if (response.success && response.data.status) {
        this.showSuccess('Task cancelled successfully');
        await this.loadCurrentTasks();
        await this.render();
        this.emit('task:cancelled', { taskId, runner: this.runner });
      } else {
        this.showError(response.data.error || 'Failed to cancel task');
      }
    } catch (error) {
      console.error('Failed to cancel task:', error);
      this.showError('Failed to cancel task: ' + error.message);
    }
  }

  // Static method for easy Dialog integration
  static async show(runner, options = {}) {
    const view = new RunnerDetailsView({ runner });
    await view.onInit();

    const buttons = [];

    // Add action buttons based on runner status
    if (runner.status === 'active') {
      buttons.push({
        text: 'Pause Runner',
        class: 'btn-warning',
        action: async () => {
          if (confirm(`Are you sure you want to pause runner "${runner.hostname}"?`)) {
            try {
              const response = await view.getApp().rest.POST(`/api/runners/${runner.hostname}/pause`);
              if (response.success && response.data.status) {
                view.showSuccess('Runner paused successfully');
                return { action: 'paused', runner };
              } else {
                view.showError(response.data.error || 'Failed to pause runner');
              }
            } catch (error) {
              view.showError('Failed to pause runner: ' + error.message);
            }
          }
          return null;
        }
      });
    } else {
      buttons.push({
        text: 'Restart Runner',
        class: 'btn-success',
        action: async () => {
          if (confirm(`Are you sure you want to restart runner "${runner.hostname}"?`)) {
            try {
              const response = await view.getApp().rest.POST(`/api/runners/${runner.hostname}/restart`);
              if (response.success && response.data.status) {
                view.showSuccess('Runner restart initiated');
                return { action: 'restarted', runner };
              } else {
                view.showError(response.data.error || 'Failed to restart runner');
              }
            } catch (error) {
              view.showError('Failed to restart runner: ' + error.message);
            }
          }
          return null;
        }
      });
    }

    buttons.push({
      text: 'Configure',
      class: 'btn-outline-primary',
      action: () => {
        view.emit('runner:configure', { runner });
        return null;
      }
    });

    buttons.push({
      text: 'Remove Runner',
      class: 'btn-outline-danger',
      action: async () => {
        const confirmMessage = `Are you sure you want to remove runner "${runner.hostname}"? This action cannot be undone.`;
        if (confirm(confirmMessage)) {
          try {
            const response = await view.getApp().rest.DELETE(`/api/runners/${runner.hostname}`);
            if (response.success && response.data.status) {
              view.showSuccess('Runner removed successfully');
              return { action: 'removed', runner };
            } else {
              view.showError(response.data.error || 'Failed to remove runner');
            }
          } catch (error) {
            view.showError('Failed to remove runner: ' + error.message);
          }
        }
        return null;
      }
    });

    buttons.push({
      text: 'Export',
      class: 'btn-outline-secondary',
      action: () => {
        try {
          const exportData = {
            runner: runner,
            metrics: view.metrics,
            currentTasks: view.currentTasks,
            logs: view.logs,
            exported_at: new Date().toISOString(),
            exported_by: 'task-management-system'
          };

          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
          });
          
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `runner-${runner.hostname}-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          view.showSuccess('Runner data exported successfully');
          return null;
        } catch (error) {
          view.showError('Failed to export runner data');
          return null;
        }
      }
    });

    buttons.push({
      text: 'Close',
      class: 'btn-secondary',
      dismiss: true
    });

    return await Dialog.showDialog({
      title: `<i class="bi bi-cpu me-2"></i>Runner Details - ${runner.hostname}`,
      body: view,
      size: 'xl',
      scrollable: true,
      buttons: buttons,
      ...options
    });
  }
}