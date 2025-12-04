/**
 * TaskDetailsView - Detailed task information view for Dialog display
 * Shows comprehensive task data, logs, metrics, and available actions
 */

import View from '@core/View.js';

export default class TaskDetailsView extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: 'mojo-task-details-view'
    });

    this.task = options.task || null;
    this.logs = [];
    this.metrics = null;
  }

  async getTemplate() {
    return `
      <div class="mojo-task-details-container">
        {{#task}}
        <!-- Task Overview -->
        <div class="card border-0 bg-light mb-3">
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Task ID</label>
                  <div class="font-monospace">{{id}}</div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Function</label>
                  <div>{{function}}</div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Channel</label>
                  <div>
                    <span class="badge bg-primary">{{channel}}</span>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Status</label>
                  <div>
                    <span class="badge {{statusBadgeClass}} fs-6">
                      <i class="bi {{statusIcon}}"></i> {{status|uppercase}}
                    </span>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Created</label>
                  <div>{{created|datetime}}</div>
                </div>
                {{#completed_at}}
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Completed</label>
                  <div>{{completed_at|datetime}}</div>
                </div>
                {{/completed_at}}
                {{#expires}}
                <div class="mb-3">
                  <label class="form-label fw-bold text-muted small">Expires</label>
                  <div class="{{expiresClass}}">{{expires|datetime}}</div>
                </div>
                {{/expires}}
              </div>
            </div>
          </div>
        </div>

        <!-- Task Data -->
        {{#data}}
        <div class="card mb-3">
          <div class="card-header py-2">
            <h6 class="mb-0">
              <i class="bi bi-database me-2"></i>Task Data
            </h6>
          </div>
          <div class="card-body">
            <pre class="bg-light p-3 rounded mb-0"><code>{{dataFormatted}}</code></pre>
          </div>
        </div>
        {{/data}}

        <!-- Error Information -->
        {{#error}}
        <div class="card border-danger mb-3">
          <div class="card-header bg-danger-subtle py-2">
            <h6 class="mb-0 text-danger">
              <i class="bi bi-exclamation-triangle me-2"></i>Error Details
            </h6>
          </div>
          <div class="card-body">
            <div class="alert alert-danger mb-0">
              <strong>Error:</strong> {{error}}
            </div>
            {{#errorDetails}}
            <div class="mt-3">
              <label class="form-label fw-bold small">Stack Trace:</label>
              <pre class="bg-light p-3 rounded small mb-0"><code>{{errorDetails}}</code></pre>
            </div>
            {{/errorDetails}}
          </div>
        </div>
        {{/error}}

        <!-- Performance Metrics -->
        {{#metrics}}
        <div class="card mb-3">
          <div class="card-header py-2">
            <h6 class="mb-0">
              <i class="bi bi-speedometer2 me-2"></i>Performance Metrics
            </h6>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-3 col-6 mb-3">
                <div class="text-center">
                  <div class="h5 mb-1 text-primary">{{executionTime}}ms</div>
                  <small class="text-muted">Execution Time</small>
                </div>
              </div>
              <div class="col-md-3 col-6 mb-3">
                <div class="text-center">
                  <div class="h5 mb-1 text-info">{{memoryUsage}}MB</div>
                  <small class="text-muted">Memory Usage</small>
                </div>
              </div>
              <div class="col-md-3 col-6 mb-3">
                <div class="text-center">
                  <div class="h5 mb-1 text-warning">{{cpuUsage}}%</div>
                  <small class="text-muted">CPU Usage</small>
                </div>
              </div>
              <div class="col-md-3 col-6 mb-3">
                <div class="text-center">
                  <div class="h5 mb-1 text-secondary">{{retryCount}}</div>
                  <small class="text-muted">Retry Count</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        {{/metrics}}

        <!-- Task Logs -->
        <div class="card">
          <div class="card-header py-2 d-flex justify-content-between align-items-center">
            <h6 class="mb-0">
              <i class="bi bi-journal-text me-2"></i>Task Logs
            </h6>
            <button class="btn btn-sm btn-outline-primary" data-action="refresh-logs">
              <i class="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>
          <div class="card-body p-0">
            <div class="mojo-task-logs-container" style="max-height: 300px; overflow-y: auto;">
              {{#logs.length}}
                {{#logs}}
                <div class="log-entry p-3 border-bottom">
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
                  <p class="mb-0 mt-2">No logs available for this task</p>
                </div>
              {{/logs.length}}
            </div>
          </div>
        </div>
        {{/task}}

        {{^task}}
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          No task data available
        </div>
        {{/task}}
      </div>
    `;
  }

  async onInit() {
    if (this.task) {
      await this.prepareTaskData();
      await this.loadTaskLogs();
      await this.loadTaskMetrics();
    }
  }

  async prepareTaskData() {
    if (!this.task) return;

    // Status styling
    this.task.statusBadgeClass = this.getStatusBadgeClass(this.task.status);
    this.task.statusIcon = this.getStatusIcon(this.task.status);

    // Format data for display
    if (this.task.data && typeof this.task.data === 'object') {
      this.task.dataFormatted = JSON.stringify(this.task.data, null, 2);
    }

    // Check if task has expired
    if (this.task.expires) {
      this.task.expiresClass = this.task.expires * 1000 < Date.now() ? 'text-danger' : 'text-muted';
    }
  }

  getStatusBadgeClass(status) {
    const classes = {
      'pending': 'bg-primary',
      'running': 'bg-success', 
      'completed': 'bg-info',
      'error': 'bg-danger',
      'cancelled': 'bg-secondary',
      'expired': 'bg-warning'
    };
    return classes[status] || 'bg-secondary';
  }

  getStatusIcon(status) {
    const icons = {
      'pending': 'bi-hourglass',
      'running': 'bi-arrow-repeat',
      'completed': 'bi-check-circle',
      'error': 'bi-x-octagon',
      'cancelled': 'bi-x-circle',
      'expired': 'bi-clock'
    };
    return icons[status] || 'bi-question-circle';
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

  async loadTaskLogs() {
    if (!this.task?.id) return;

    try {
      const response = await this.getApp().rest.GET(`/api/tasks/${this.task.id}/logs`);
      if (response.success && response.data.status) {
        this.logs = response.data.data.map(log => ({
          ...log,
          levelClass: this.getLogLevelClass(log.level)
        }));
      } else {
        this.logs = [];
      }
    } catch (error) {
      console.error('Failed to load task logs:', error);
      this.logs = [];
    }
  }

  async loadTaskMetrics() {
    if (!this.task?.id) return;

    try {
      const response = await this.getApp().rest.GET(`/api/tasks/${this.task.id}/metrics`);
      if (response.success && response.data.status) {
        this.metrics = response.data.data;
      }
    } catch (error) {
      console.error('Failed to load task metrics:', error);
      this.metrics = null;
    }
  }

  async setTask(task) {
    this.task = task;
    await this.prepareTaskData();
    await this.loadTaskLogs();
    await this.loadTaskMetrics();
    
    if (this.isMounted()) {
      await this.render();
    }
  }

  async onActionRefreshLogs(action, event, element) {
    if (!this.task?.id) return;

    try {
      element.disabled = true;
      const icon = element.querySelector('i');
      if (icon) icon.classList.add('spinning');

      await this.loadTaskLogs();
      await this.render();
      
    } catch (error) {
      console.error('Failed to refresh logs:', error);
      this.showError('Failed to refresh logs: ' + error.message);
    } finally {
      element.disabled = false;
      const icon = element.querySelector('i');
      if (icon) icon.classList.remove('spinning');
    }
  }

  // Static method for easy Dialog integration
  static async show(task, options = {}) {
    const view = new TaskDetailsView({ task });
    await view.onInit();

    const buttons = [];

    // Add action buttons based on task status
    if (['pending', 'running'].includes(task.status)) {
      buttons.push({
        text: 'Cancel Task',
        class: 'btn-outline-danger',
        action: async () => {
          if (confirm('Are you sure you want to cancel this task?')) {
            try {
              const response = await view.getApp().rest.POST(`/api/tasks/${task.id}/cancel`);
              if (response.success && response.data.status) {
                view.showSuccess('Task cancelled successfully');
                return { action: 'cancelled', task };
              } else {
                view.showError(response.data.error || 'Failed to cancel task');
              }
            } catch (error) {
              view.showError('Failed to cancel task: ' + error.message);
            }
          }
          return null;
        }
      });
    }

    if (task.status === 'error') {
      buttons.push({
        text: 'Retry Task',
        class: 'btn-outline-primary',
        action: async () => {
          try {
            const response = await view.getApp().rest.POST(`/api/tasks/${task.id}/retry`);
            if (response.success && response.data.status) {
              view.showSuccess('Task queued for retry');
              return { action: 'retried', task };
            } else {
              view.showError(response.data.error || 'Failed to retry task');
            }
          } catch (error) {
            view.showError('Failed to retry task: ' + error.message);
          }
          return null;
        }
      });
    }

    buttons.push({
      text: 'Clone Task',
      class: 'btn-outline-info',
      action: async () => {
        try {
          const response = await view.getApp().rest.POST(`/api/tasks/${task.id}/clone`);
          if (response.success && response.data.status) {
            view.showSuccess('Task cloned successfully');
            return { action: 'cloned', originalTask: task, newTask: response.data.data };
          } else {
            view.showError(response.data.error || 'Failed to clone task');
          }
        } catch (error) {
          view.showError('Failed to clone task: ' + error.message);
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
            task: task,
            logs: view.logs,
            metrics: view.metrics,
            exported_at: new Date().toISOString(),
            exported_by: 'task-management-system'
          };

          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
          });
          
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `task-${task.id}-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          view.showSuccess('Task data exported successfully');
          return null;
        } catch (error) {
          view.showError('Failed to export task data');
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
      title: `<i class="bi bi-info-circle me-2"></i>Task Details - ${task.id}`,
      body: view,
      size: 'lg',
      scrollable: true,
      buttons: buttons,
      ...options
    });
  }
}