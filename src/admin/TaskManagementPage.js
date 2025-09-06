/**
 * TaskManagementPage - Async task monitoring and management dashboard
 */

import Page from '../core/Page.js';
import View from '../core/View.js';
import Collection from '../core/Collection.js';
import TabView from '../views/navigation/TabView.js';
import TableView from '../views/table/TableView.js';
import { MetricsChart } from '../charts/index.js';
import Dialog from '../core/Dialog.js';
import TaskDetailsView from './TaskDetailsView.js';
import RunnerDetailsView from './RunnerDetailsView.js';

// Task Stats Header View
class TaskStatsView extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: 'mojo-task-stats-section'
    });

    this.stats = {
      pending: 0,
      running: 0,
      completed: 0,
      errors: 0
    };
  }

  async getTemplate() {
    return `
      <div class="mojo-task-stats-header mb-4">
        <div class="row">
          <div class="col-xl-3 col-lg-6 col-12 mb-3">
            <div class="card h-100 border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 class="card-title text-muted mb-2">Pending Tasks</h6>
                    <h3 class="mb-1 fw-bold">{{stats.pending}}</h3>
                    <span class="badge bg-primary-subtle text-primary">
                      <i class="bi bi-clock"></i> Queued
                    </span>
                  </div>
                  <div class="text-primary">
                    <i class="bi bi-hourglass fs-2"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-xl-3 col-lg-6 col-12 mb-3">
            <div class="card h-100 border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 class="card-title text-muted mb-2">Running Tasks</h6>
                    <h3 class="mb-1 fw-bold">{{stats.running}}</h3>
                    <span class="badge bg-success-subtle text-success">
                      <i class="bi bi-play-circle"></i> Active
                    </span>
                  </div>
                  <div class="text-success">
                    <i class="bi bi-arrow-repeat fs-2"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-xl-3 col-lg-6 col-12 mb-3">
            <div class="card h-100 border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 class="card-title text-muted mb-2">Completed Tasks</h6>
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

          <div class="col-xl-3 col-lg-6 col-12 mb-3">
            <div class="card h-100 border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 class="card-title text-muted mb-2">Failed Tasks</h6>
                    <h3 class="mb-1 fw-bold">{{stats.errors}}</h3>
                    <span class="badge bg-danger-subtle text-danger">
                      <i class="bi bi-exclamation-circle"></i> Errors
                    </span>
                  </div>
                  <div class="text-danger">
                    <i class="bi bi-x-octagon fs-2"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadStats() {
    try {
      const response = await this.getApp().rest.GET('/api/tasks/status');
      if (response.success && response.data.status) {
        this.stats = response.data.data;
      }
    } catch (error) {
      console.error('Failed to load task stats:', error);
    }
  }

  async onInit() {
    await this.loadStats();
  }
}

// Task Runners Status View
class TaskRunnersView extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: 'mojo-task-runners-section'
    });

    this.runners = [];
  }

  async getTemplate() {
    return `
      <div class="card border shadow-sm mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0">
            <i class="bi bi-cpu me-2"></i>Task Runners
          </h5>
          <button class="btn btn-sm btn-outline-primary" data-action="refresh-runners">
            <i class="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
        <div class="card-body">
          {{#runners.length}}
            <div class="mojo-task-runner-list">
              {{#runners}}
                <div class="mojo-task-runner-item p-3 mb-2 bg-light rounded">
                  <div class="row align-items-center">
                    <div class="col-md-8 col-lg-9">
                      <div class="d-flex align-items-center">
                        <div class="mojo-task-runner-status me-3">
                          <span class="badge {{statusBadge}}">
                            <i class="bi {{statusIcon}}"></i> {{status}}
                          </span>
                        </div>
                        <div class="mojo-task-runner-info">
                          <div class="mojo-task-runner-name">
                            <strong>{{hostname}}</strong>
                            {{#max_workers}}<span class="text-muted ms-2">• {{max_workers}} workers</span>{{/max_workers}}
                          </div>
                          <div class="mojo-task-runner-channels">
                            <small class="text-muted">
                              {{#channels.length}}Channels: {{#channels}}{{.}}{{^last}}, {{/last}}{{/channels}}{{/channels.length}}
                              {{^channels.length}}No channels assigned{{/channels.length}}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-4 col-lg-3">
                      <div class="mojo-task-runner-actions d-flex justify-content-end align-items-center">
                        <small class="text-muted me-2 d-none d-sm-inline">{{pingAgeText}}</small>
                        <div class="dropdown">
                          <button class="btn btn-sm btn-outline-secondary dropdown-toggle"
                                  data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-three-dots-vertical"></i>
                          </button>
                          <ul class="dropdown-menu dropdown-menu-end">
                            <li><button class="dropdown-item" data-action="view-runner-details" data-runner-id="{{id}}">
                              <i class="bi bi-info-circle me-2"></i>View Details
                            </button></li>
                            {{#isActive}}
                            <li><button class="dropdown-item text-warning" data-action="pause-runner" data-runner-id="{{id}}">
                              <i class="bi bi-pause me-2"></i>Pause Runner
                            </button></li>
                            {{/isActive}}
                            {{^isActive}}
                            <li><button class="dropdown-item text-success" data-action="restart-runner" data-runner-id="{{id}}">
                              <i class="bi bi-play me-2"></i>Restart Runner
                            </button></li>
                            {{/isActive}}
                            <li><hr class="dropdown-divider"></li>
                            <li><button class="dropdown-item text-danger" data-action="remove-runner" data-runner-id="{{id}}">
                              <i class="bi bi-trash me-2"></i>Remove Runner
                            </button></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="row mt-2 d-sm-none">
                    <div class="col-12">
                      <small class="text-muted">Last ping: {{pingAgeText}}</small>
                    </div>
                  </div>
                </div>
              {{/runners}}
            </div>
          {{/runners.length}}
          {{^runners.length}}
            <div class="text-center text-muted py-4">
              <i class="bi bi-cpu fs-1"></i>
              <p class="mt-2">No task runners found</p>
            </div>
          {{/runners.length}}
        </div>
      </div>
    `;
  }

  async loadRunners() {
    try {
      const response = await this.getApp().rest.GET('/api/tasks/runners');
      if (response.success && response.data.status) {
        this.runners = response.data.data.map(runner => {
          const isActive = runner.status === 'active';
          const pingAge = runner.ping_age || 0;

          return {
            ...runner,
            isActive,
            statusBadge: isActive ? 'bg-success' : 'bg-warning',
            statusIcon: isActive ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill',
            pingAgeText: this.formatPingAge(pingAge)
          };
        });
      }
    } catch (error) {
      console.error('Failed to load runners:', error);
    }
  }

  formatPingAge(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s ago`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
    return `${Math.round(seconds / 3600)}h ago`;
  }

  async onInit() {
    await this.loadRunners();
  }

  async onActionRefreshRunners(event, element) {
    await this.loadRunners();
  }

  async onActionViewRunnerDetails(event, element) {
    const runnerId = element.getAttribute('data-runner-id');
    const runner = this.runners.find(r => r.id === runnerId);

    if (runner) {
      const result = await RunnerDetailsView.show(runner);

      // Refresh runners list if any action was taken
      if (result?.action) {
        await this.loadRunners();
        this.emit('runner:' + result.action, result);
      }
    }
  }

  async onActionPauseRunner(event, element) {
    const runnerId = element.getAttribute('data-runner-id');
    const runner = this.runners.find(r => r.id === runnerId);

    if (!runner || !confirm(`Are you sure you want to pause runner "${runner.hostname}"?`)) {
      return;
    }

    try {
      element.disabled = true;
      const response = await this.getApp().rest.POST(`/api/runners/${runnerId}/pause`);

      if (response.success && response.data.status) {
        this.showSuccess('Runner paused successfully');
        await this.loadRunners();
      } else {
        this.showError(response.data.error || 'Failed to pause runner');
      }
    } catch (error) {
      console.error('Failed to pause runner:', error);
      this.showError('Failed to pause runner: ' + error.message);
    } finally {
      element.disabled = false;
    }
  }

  async onActionRestartRunner(event, element) {
    const runnerId = element.getAttribute('data-runner-id');
    const runner = this.runners.find(r => r.id === runnerId);

    if (!runner || !confirm(`Are you sure you want to restart runner "${runner.hostname}"?`)) {
      return;
    }

    try {
      element.disabled = true;
      const response = await this.getApp().rest.POST(`/api/runners/${runnerId}/restart`);

      if (response.success && response.data.status) {
        this.showSuccess('Runner restart initiated');
        await this.loadRunners();
      } else {
        this.showError(response.data.error || 'Failed to restart runner');
      }
    } catch (error) {
      console.error('Failed to restart runner:', error);
      this.showError('Failed to restart runner: ' + error.message);
    } finally {
      element.disabled = false;
    }
  }

  async onActionRemoveRunner(event, element) {
    const runnerId = element.getAttribute('data-runner-id');
    const runner = this.runners.find(r => r.id === runnerId);

    if (!runner) return;

    const confirmMessage = `Are you sure you want to remove runner "${runner.hostname}"? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      element.disabled = true;
      const response = await this.getApp().rest.DELETE(`/api/runners/${runnerId}`);

      if (response.success && response.data.status) {
        this.showSuccess('Runner removed successfully');
        await this.loadRunners();
      } else {
        this.showError(response.data.error || 'Failed to remove runner');
      }
    } catch (error) {
      console.error('Failed to remove runner:', error);
      this.showError('Failed to remove runner: ' + error.message);
    } finally {
      element.disabled = false;
    }
  }
}

// Task Charts View
class TaskChartsView extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: 'mojo-task-charts-section'
    });
  }

  async getTemplate() {
    return `
      <div class="row mb-4">
        <div class="col-xl-6 col-lg-12 mb-4">
          <div class="card border shadow-sm">
            <div class="card-body" style="min-height: 300px;">
              <div data-container="task-flow-chart"></div>
            </div>
          </div>
        </div>
        <div class="col-xl-6 col-lg-12 mb-4">
          <div class="card border shadow-sm">
            <div class="card-body" style="min-height: 300px;">
              <div data-container="task-errors-chart"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async onInit() {
    // Task Flow Chart (Published vs Completed)
    this.taskFlowChart = new MetricsChart({
      title: '<i class="bi bi-graph-up me-2"></i>Task Flow',
      endpoint: '/api/metrics/fetch',
      height: 280,
      granularity: 'hours',
      slugs: ['tasks_pub', 'tasks_completed'],
      account: 'global',
      chartType: 'line',
      showDateRange: false,
      colors: [
        'rgba(13, 110, 253, 0.8)',    // Primary blue for published
        'rgba(25, 135, 84, 0.8)'     // Success green for completed
      ],
      yAxis: {
        label: 'Count',
        beginAtZero: true
      },
      tooltip: {
        y: 'number'
      },
      containerId: 'task-flow-chart'
    });
    this.addChild(this.taskFlowChart);

    // Task Errors Chart
    this.taskErrorsChart = new MetricsChart({
      title: '<i class="bi bi-exclamation-triangle me-2"></i>Task Issues',
      endpoint: '/api/metrics/fetch',
      height: 280,
      granularity: 'hours',
      slugs: ['tasks_errors', 'tasks_expired'],
      account: 'global',
      chartType: 'line',
      showDateRange: false,
      colors: [
        'rgba(220, 53, 69, 0.8)',    // Danger red for errors
        'rgba(255, 193, 7, 0.8)'     // Warning yellow for expired
      ],
      yAxis: {
        label: 'Count',
        beginAtZero: true
      },
      tooltip: {
        y: 'number'
      },
      containerId: 'task-errors-chart'
    });
    this.addChild(this.taskErrorsChart);
  }
}

// Task Table Views
class BaseTaskTable extends TableView {
  constructor(options = {}) {
    super({
      showPagination: true,
      showSearch: true,
      showRefresh: true,
      pageSize: 10,
      columns: [
        { key: 'id', label: 'Task ID', sortable: true },
        { key: 'function', label: 'Function', sortable: true },
        { key: 'channel', label: 'Channel', sortable: true },
        { key: 'created', label: 'Created', sortable: true, formatter: 'datetime' },
        { key: 'status', label: 'Status', formatter: 'badge' }
      ],
      ...options
    });
  }

  buildActionCell(item) {
    const actions = [];

    if (item.status === 'pending') {
      actions.push(`
        <button class="btn btn-sm btn-outline-danger" data-action="cancel-task" data-task-id="${item.id}" title="Cancel Task">
          <i class="bi bi-x-circle"></i>
        </button>
      `);
    }

    if (item.status === 'error') {
      actions.push(`
        <button class="btn btn-sm btn-outline-primary" data-action="retry-task" data-task-id="${item.id}" title="Retry Task">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      `);
    }

    actions.push(`
      <button class="btn btn-sm btn-outline-info" data-action="view-task-details" data-task-id="${item.id}" title="View Details">
        <i class="bi bi-info-circle"></i>
      </button>
    `);

    return actions.join(' ');
  }

  async onActionCancelTask(action, event, element) {
    const taskId = element.getAttribute('data-task-id');

    if (!confirm('Are you sure you want to cancel this task?')) {
      return;
    }

    try {
      element.disabled = true;
      const response = await this.getApp().rest.POST(`/api/tasks/${taskId}/cancel`);

      if (response.success && response.data.status) {
        this.showSuccess('Task cancelled successfully');
        // Refresh the active table
        const activeTab = this.getParentPage()?.taskTablesView?.getActiveTab();
        if (activeTab) {
          const activeTable = this.getParentPage()?.taskTablesView?.getTab(activeTab);
          if (activeTable?.refresh) {
            await activeTable.refresh();
          }
        }
      } else {
        this.showError(response.data.error || 'Failed to cancel task');
      }
    } catch (error) {
      console.error('Failed to cancel task:', error);
      this.showError('Failed to cancel task: ' + error.message);
    } finally {
      element.disabled = false;
    }
  }

  async onActionRetryTask(action, event, element) {
    const taskId = element.getAttribute('data-task-id');

    try {
      element.disabled = true;
      const response = await this.getApp().rest.POST(`/api/tasks/${taskId}/retry`);

      if (response.success && response.data.status) {
        this.showSuccess('Task queued for retry');
        // Refresh the active table
        const activeTab = this.getParentPage()?.taskTablesView?.getActiveTab();
        if (activeTab) {
          const activeTable = this.getParentPage()?.taskTablesView?.getTab(activeTab);
          if (activeTable?.refresh) {
            await activeTable.refresh();
          }
        }
      } else {
        this.showError(response.data.error || 'Failed to retry task');
      }
    } catch (error) {
      console.error('Failed to retry task:', error);
      this.showError('Failed to retry task: ' + error.message);
    } finally {
      element.disabled = false;
    }
  }

  async onActionViewTaskDetails(action, event, element) {
    const taskId = element.getAttribute('data-task-id');

    try {
      // Fetch detailed task data
      const response = await this.getApp().rest.GET(`/api/tasks/${taskId}/details`);

      if (response.success && response.data.status) {
        const task = response.data.data;
        const result = await TaskDetailsView.show(task);

        // Refresh tables if any action was taken
        if (result?.action) {
          await this.refreshActiveTables();
          this.emit('task:' + result.action, result);
        }
      } else {
        this.showError(response.data.error || 'Failed to load task details');
      }
    } catch (error) {
      console.error('Failed to load task details:', error);
      this.showError('Failed to load task details: ' + error.message);
    }
  }

  getParentPage() {
    // Helper to get the parent TaskManagementPage
    let parent = this.parent;
    while (parent && parent.constructor.name !== 'TaskManagementPage') {
      parent = parent.parent;
    }
    return parent;
  }

  async refreshActiveTables() {
    const parentPage = this.getParentPage();
    if (parentPage?.taskTablesView) {
      const activeTab = parentPage.taskTablesView.getActiveTab();
      if (activeTab) {
        const activeTable = parentPage.taskTablesView.getTab(activeTab);
        if (activeTable?.refresh) {
          await activeTable.refresh();
        }
      }
    }
  }
}

class PendingTasksTable extends TableView {
  constructor(options = {}) {
    super({
      ...options,
      title: 'Pending Tasks',
      collection: new Collection({
        endpoint: '/api/tasks/pending'
      }),
      columns: [
        { key: 'id', label: 'Task ID', sortable: true },
        { key: 'function', label: 'Function', sortable: true },
        { key: 'channel', label: 'Channel', sortable: true },
        { key: 'created', label: 'Created', sortable: true, formatter: 'datetime' },
        { key: 'status', label: 'Status', formatter: 'badge' }
      ],
    });
  }
}

class RunningTasksTable extends TableView {
  constructor(options = {}) {
    super({
      ...options,
      title: 'Running Tasks',
      collection: new Collection({
        endpoint: '/api/tasks/running'
      }),
      columns: [
        { key: 'id', label: 'Task ID', sortable: true },
        { key: 'function', label: 'Function', sortable: true },
        { key: 'channel', label: 'Channel', sortable: true },
        { key: 'created', label: 'Created', sortable: true, formatter: 'datetime' },
        { key: 'status', label: 'Status', formatter: 'badge' }
      ],
    });
  }
}

class CompletedTasksTable extends TableView {
  constructor(options = {}) {
    super({
      ...options,
      title: 'Completed Tasks',
      collection: new Collection({
        endpoint: '/api/tasks/completed'
      }),
      columns: [
        { key: 'id', label: 'Task ID', sortable: true },
        { key: 'function', label: 'Function', sortable: true },
        { key: 'channel', label: 'Channel', sortable: true },
        { key: 'created', label: 'Created', sortable: true, formatter: 'datetime' },
        { key: 'completed_at', label: 'Completed', sortable: true, formatter: 'datetime' },
        { key: 'status', label: 'Status', formatter: 'badge' }
      ]
    });
  }
}

class ErrorTasksTable extends TableView {
  constructor(options = {}) {
    super({
      ...options,
      title: 'Failed Tasks',
      collection: new Collection({
        endpoint: '/api/tasks/errors'
      }),
      columns: [
        { key: 'id', label: 'Task ID', sortable: true },
        { key: 'function', label: 'Function', sortable: true },
        { key: 'channel', label: 'Channel', sortable: true },
        { key: 'created', label: 'Created', sortable: true, formatter: 'datetime' },
        { key: 'error', label: 'Error', sortable: false },
        { key: 'status', label: 'Status', formatter: 'badge' }
      ]
    });
  }
}

// Main Task Management Page
export default class TaskManagementPage extends Page {
  constructor(options = {}) {
    super({
      ...options,
      title: 'Task Management',
      className: 'mojo-task-management-page'
    });

    this.pageTitle = 'Task Management';
    this.pageSubtitle = 'Async task monitoring and runner management';
    this.lastUpdated = new Date().toLocaleString();
  }

  async getTemplate() {
    return `
      <div class="mojo-task-management-container">
        <!-- Page Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 class="h3 mb-1">{{pageTitle}}</h1>
            <p class="text-muted mb-0">{{pageSubtitle}}</p>
            <small class="text-info">
              <i class="bi bi-cpu me-1"></i>
              Real-time task processing and runner monitoring
            </small>
          </div>
          <div class="btn-group" role="group">
            <button type="button" class="btn btn-outline-secondary btn-sm"
                    data-action="refresh-all" title="Refresh All Data">
              <i class="bi bi-arrow-clockwise"></i> Refresh
            </button>
            <button type="button" class="btn btn-outline-primary btn-sm"
                    data-action="export-tasks" title="Export Task Data">
              <i class="bi bi-download"></i> Export
            </button>
            <button type="button" class="btn btn-outline-success btn-sm"
                    data-action="manage-channels" title="Manage Channels">
              <i class="bi bi-collection"></i> Channels
            </button>
          </div>
        </div>

        <!-- Task Stats -->
        <div data-container="task-stats"></div>

        <!-- Task Runners -->
        <div data-container="task-runners"></div>

        <!-- Task Charts -->
        <div data-container="task-charts"></div>

        <!-- Task Tables -->
        <div class="card border shadow-sm">
          <div class="card-header">
            <h5 class="card-title mb-0">
              <i class="bi bi-list-task me-2"></i>Task Management
            </h5>
          </div>
          <div class="card-body">
            <div data-container="task-tables"></div>
          </div>
        </div>

        <!-- System Status Footer -->
        <div class="row mt-4">
          <div class="col-12">
            <div class="alert alert-info border-0" role="alert">
              <div class="d-flex align-items-center">
                <i class="bi bi-info-circle-fill me-2"></i>
                <div>
                  <strong>Task System Status:</strong> Monitoring active.
                  Last updated: <span class="text-muted">{{lastUpdated}}</span>
                </div>
                <div class="ms-auto">
                  <button class="btn btn-sm btn-outline-info" data-action="view-system-logs">
                    <i class="bi bi-journal-text"></i> View Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async onInit() {
    // Create Task Stats View
    this.taskStatsView = new TaskStatsView({
      containerId: 'task-stats'
    });
    this.addChild(this.taskStatsView);

    // Create Task Runners View
    this.taskRunnersView = new TaskRunnersView({
      containerId: 'task-runners'
    });
    this.addChild(this.taskRunnersView);

    // Create Task Charts View
    this.taskChartsView = new TaskChartsView({
      containerId: 'task-charts'
    });
    this.addChild(this.taskChartsView);

    // Create Task Tables with TabView
    this.taskTablesView = new TabView({
      containerId: 'task-tables',
      tabs: {
        'Pending': new PendingTasksTable(),
        'Running': new RunningTasksTable(),
        'Completed': new CompletedTasksTable(),
        'Errors': new ErrorTasksTable()
      },
      activeTab: 'Pending'
    });
    this.addChild(this.taskTablesView);
  }

  async onActionRefreshAll(action, event, element) {
    try {
      // Show loading state
      const icon = element.querySelector('i');
      icon?.classList.add('bi-spin');
      element.disabled = true;

      // Refresh all components
      const promises = [
        this.taskStatsView?.loadStats(),
        this.taskRunnersView?.loadRunners(),
        this.taskChartsView?.taskFlowChart?.refresh(),
        this.taskChartsView?.taskErrorsChart?.refresh()
      ].filter(Boolean);

      // Refresh active table
      const activeTab = this.taskTablesView?.getActiveTab();
      if (activeTab) {
        const activeTable = this.taskTablesView.getTab(activeTab);
        if (activeTable?.refresh) {
          promises.push(activeTable.refresh());
        }
      }

      await Promise.allSettled(promises);

      // Update timestamp
      this.lastUpdated = new Date().toLocaleString();

      // Emit refresh event
      const eventBus = this.getApp()?.events;
      if (eventBus) {
        eventBus.emit('tasks:dashboard-refreshed', {
          page: this,
          timestamp: this.lastUpdated
        });
      }

    } catch (error) {
      console.error('Failed to refresh task dashboard:', error);
    } finally {
      // Reset button state
      const icon = element.querySelector('i');
      icon?.classList.remove('bi-spin');
      element.disabled = false;
    }
  }

  async onActionExportTasks(action, event, element) {
    try {
      // Export charts
      await this.taskChartsView?.taskFlowChart?.export('png');
      await this.taskChartsView?.taskErrorsChart?.export('png');

      // Export active table
      const activeTab = this.taskTablesView?.getActiveTab();
      if (activeTab) {
        const activeTable = this.taskTablesView.getTab(activeTab);
        if (activeTable?.exportToCSV) {
          activeTable.exportToCSV();
        }
      }

    } catch (error) {
      console.error('Failed to export task data:', error);
    }
  }

  async onActionManageChannels(event, element) {
    try {
      // For now, show a simple info modal with channel information
      const response = await this.getApp().rest.GET('/api/tasks/channels');

      if (response.success && response.data.status) {
        const channels = response.data.data;

        // Create a simple info alert
        const channelList = channels.map(channel =>
          `${channel.name} (${channel.pending} pending, ${channel.running} running)`
        ).join('\n');

        alert(`Task Channels:\n\n${channelList}\n\nFull channel management interface coming soon!`);
      } else {
        this.showError('Failed to load channel information');
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
      // Navigate to dedicated channels page as fallback
      const router = this.getApp()?.router;
      if (router) {
        router.navigateTo('/admin/task-channels');
      }
    }
  }

  async onActionViewSystemLogs(event, element) {
    try {
      // Try to get recent system logs related to tasks
      const response = await this.getApp().rest.GET('/api/tasks/logs?limit=50');

      if (response.success && response.data.status) {
        const logs = response.data.data;

        // Create a simple log preview
        const logPreview = logs.slice(0, 10).map(log =>
          `[${new Date(log.timestamp * 1000).toLocaleString()}] ${log.level.toUpperCase()}: ${log.message}`
        ).join('\n');

        const viewFullLogs = confirm(`Recent Task System Logs:\n\n${logPreview}\n\n... and ${logs.length - 10} more entries.\n\nView full logs?`);

        if (viewFullLogs) {
          const router = this.getApp()?.router;
          if (router) {
            router.navigateTo('/admin/logs?filter=tasks');
          }
        }
      } else {
        // Navigate to system logs as fallback
        const router = this.getApp()?.router;
        if (router) {
          router.navigateTo('/admin/logs');
        }
      }
    } catch (error) {
      console.error('Failed to load system logs:', error);
      // Navigate to system logs as fallback
      const router = this.getApp()?.router;
      if (router) {
        router.navigateTo('/admin/logs');
      }
    }
  }

  // Public API
  async refreshDashboard() {
    return this.onActionRefreshAll(null, null, { disabled: false, querySelector: () => null });
  }

  getStats() {
    return this.taskStatsView?.stats || {};
  }

  getRunners() {
    return this.taskRunnersView?.runners || [];
  }

  getCharts() {
    return {
      taskFlow: this.taskChartsView?.taskFlowChart,
      taskErrors: this.taskChartsView?.taskErrorsChart
    };
  }


}
