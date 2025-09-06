/**
 * AdminDashboardPage - Administrative dashboard with system metrics and charts
 */

import Page from '@core/Page.js';
import View from '@core/View.js';
import { MetricsChart } from '@ext/charts/index.js';

// Embedded HeaderView for dashboard statistics
class AdminHeaderView extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: 'admin-header-section'
    });

    // Mock data - replace with real API calls
    this.stats = {
      user_activity_day: 0,
      total_users: 0,
      group_activity_day: 0,
      total_groups: 0,
      api_calls: 0,
      apiChange: '',
      incidents: 0,
      incidentsChange: ''
    };

    // Prepare formatted data for template
    this.prepareStatsForTemplate();
  }

  async getTemplate() {
    return `
      <div class="admin-stats-header mb-4">
        <div class="row">
          <div class="col-xl-3 col-lg-6 col-12 mb-3">
            <div class="card h-100 border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 class="card-title text-muted mb-2">Active Users</h6>
                    <h3 class="mb-1 fw-bold">{{stats.user_activity_day}}</h3>
                    <span class="badge bg-success-subtle text-success">
                      {{stats.total_users|compact}}
                    </span>
                  </div>
                  <div class="text-primary">
                    <i class="bi bi-people fs-2"></i>
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
                    <h6 class="card-title text-muted mb-2">Active Groups</h6>
                    <h3 class="mb-1 fw-bold">{{stats.group_activity_day}}</h3>
                    <span class="badge bg-info-subtle text-info">
                    {{stats.total_groups|compact}}
                    </span>
                  </div>
                  <div class="text-info">
                    <i class="bi bi-collection fs-2"></i>
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
                    <h6 class="card-title text-muted mb-2">API Requests</h6>
                    <h3 class="mb-1 fw-bold">{{stats.api_calls|compact}}</h3>
                    <span class="badge bg-success-subtle text-success">
                      <i class="bi bi-arrow-up"></i> {{stats.apiChange}}
                    </span>
                  </div>
                  <div class="text-success">
                    <i class="bi bi-graph-up fs-2"></i>
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
                    <h6 class="card-title text-muted mb-2">Incidents</h6>
                    <h3 class="mb-1 fw-bold">{{stats.incidents|compact}}</h3>
                    <span class="badge {{stats.incidentsBadgeClass}}">
                      <i class="bi bi-{{stats.incidentsIconClass}}"></i> {{stats.incidentsChange}}
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

  async onInit() {
    // TODO: Replace with actual API calls to fetch real statistics
    // this.loadStats();
  }

  async onBeforeRender() {
    await Promise.all([
      this.loadStats(),
      this.loadValues()
    ]);
  }

  prepareStatsForTemplate() {
    // Determine badge and icon classes based on incidents change
    // const isDecreasing = this.stats.incidentsChange.startsWith('-');
    // this.stats.incidentsBadgeClass = isDecreasing ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning';
    // this.stats.incidentsIconClass = isDecreasing ? 'arrow-down' : 'arrow-up';
  }

  async loadValues() {
      try {
        const response = await this.getApp().rest.GET('/api/metrics/value/get', {
          slugs: ['total_users', 'total_groups'],
          account: "global"
        });
        if (response.success && response.data.status) {
          Object.assign(this.stats, response.data.data);
        }
      } catch (error) {
        console.error('Failed to load admin stats:', error);
      }
  }

  async loadStats() {
    // Example of how to load real data
    try {
      const response = await this.getApp().rest.GET('/api/metrics/series', {
        slugs: ['user_created', 'user_activity_day', "incidents",
            "api_calls", "api_errors", "group_activity_day"],
        account: "global",
        granularity: "days"
      });
      if (response.success && response.data.status) {
        Object.assign(this.stats, response.data.data);
        this.prepareStatsForTemplate();
      }
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    }
  }
}

export default class AdminDashboardPage extends Page {
  constructor(options = {}) {
    super({
      ...options,
      title: 'Admin Dashboard',
      className: 'admin-dashboard-page'
    });

    // Page data
    this.pageTitle = 'Admin Dashboard';
    this.pageSubtitle = 'System monitoring and metrics overview';
  }

  async getTemplate() {
    return `
      <div class="admin-dashboard-container container-lg">
        <!-- Page Header -->
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <p class="text-muted mb-0">{{pageSubtitle}}</p>
            <small class="text-info">
              <i class="bi bi-shield-check me-1"></i>
              Real-time system metrics and performance monitoring
            </small>
          </div>
          <div class="btn-group" role="group">
            <button type="button" class="btn btn-outline-secondary btn-sm"
                    data-action="refresh-all" title="Refresh All Charts">
              <i class="bi bi-arrow-clockwise"></i> Refresh
            </button>
            <button type="button" class="btn btn-outline-primary btn-sm"
                    data-action="export-metrics" title="Export Metrics Data">
              <i class="bi bi-download"></i> Export
            </button>
            <button type="button" class="btn btn-outline-warning btn-sm"
                    data-action="view-alerts" title="View System Alerts">
              <i class="bi bi-bell"></i> Alerts
            </button>
          </div>
        </div>

        <!-- Stats Header -->
        <div data-container="admin-header"></div>

        <!-- Charts Section -->
        <div class="row">
          <!-- Full Width API Metrics Chart -->
          <div class="col-12 mb-4">
            <div class="card border shadow-sm">
              <div class="card-body" style="min-height: 250px;">
                <div data-container="api-metrics-chart"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <!-- System Events Chart -->
          <div class="col-xl-6 col-lg-6 mb-4">
            <div class="card border shadow-sm">
              <div class="card-body" style="min-height: 200px;">
                <div data-container="system-events-chart"></div>
              </div>
            </div>
          </div>

          <!-- System Incidents Chart -->
          <div class="col-xl-6 col-lg-6 mb-4">
            <div class="card border shadow-sm">
              <div class="card-body" style="min-height: 200px;">
                <div data-container="system-incidents-chart"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- System Status Footer -->
        <div class="row">
          <div class="col-12">
            <div class="alert alert-success border-0" role="alert">
              <div class="d-flex align-items-center">
                <i class="bi bi-check-circle-fill me-2"></i>
                <div>
                  <strong>System Status:</strong> All systems operational.
                  Last updated: <span class="text-muted">{{lastUpdated}}</span>
                </div>
                <div class="ms-auto">
                  <button class="btn btn-sm btn-outline-success" data-action="view-system-status">
                    <i class="bi bi-info-circle"></i> Details
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
    // Set last updated time
    this.lastUpdated = new Date().toLocaleString();

    // Create and add header view
    this.headerView = new AdminHeaderView({
      containerId: 'admin-header'
    });
    this.addChild(this.headerView);

    // Create API Metrics Chart
    this.apiMetricsChart = new MetricsChart({
      title: `<i class="bi bi-graph-up me-2"></i> API Metrics`,
      endpoint: '/api/metrics/fetch',
      height: 250,
      granularity: 'hours',
      slugs: ['api_calls', 'api_errors'],
      account: 'global',
      chartType: 'line',
      showDateRange: false,
      yAxis: {
        label: 'Count',
        beginAtZero: true
      },
      tooltip: {
        y: 'number'
      },
      containerId: 'api-metrics-chart'
    });
    this.addChild(this.apiMetricsChart);

    // Create System Events Chart
    this.systemEventsChart = new MetricsChart({
      title: '<i class="bi bi-activity me-2"></i> System Events',
      endpoint: '/api/metrics/fetch',
      granularity: 'hours',
      slugs: ['incident_events'],
      account: 'incident',
      chartType: 'line',
      showDateRange: false,
      showMetricsFilter: false,
      height: 250,
      colors: [
        'rgba(32, 201, 151, 0.8)'  // Teal for events
      ],
      yAxis: {
        label: 'Events',
        beginAtZero: true
      },
      tooltip: {
        y: 'number'
      },
      containerId: 'system-events-chart'
    });
    this.addChild(this.systemEventsChart);

    // Create System Incidents Chart
    this.systemIncidentsChart = new MetricsChart({
      title: '<i class="bi bi-exclamation-triangle me-2"></i> System Incidents',
      endpoint: '/api/metrics/fetch',
      granularity: 'hours',
      slugs: ['incidents'],
      account: 'incident',
      chartType: 'line',
      showDateRange: false,
      showMetricsFilter: false,
      height: 250,
      colors: [
        'rgba(255, 193, 7, 0.8)'  // Warning yellow for incidents
      ],
      yAxis: {
        label: 'Incidents',
        beginAtZero: true
      },
      tooltip: {
        y: 'number'
      },
      containerId: 'system-incidents-chart'
    });
    this.addChild(this.systemIncidentsChart);
  }

  // Action Handlers
  async onActionRefreshAll(event, element) {
    try {
      // Show loading state
      const icon = element.querySelector('i');
      icon?.classList.add('bi-spin');
      element.disabled = true;

      // Refresh all charts
      const promises = [
        this.headerView?.loadStats(),
        this.apiMetricsChart?.refresh(),
        this.systemEventsChart?.refresh(),
        this.systemIncidentsChart?.refresh()
      ].filter(Boolean);

      await Promise.allSettled(promises);

      // Update last updated time
      this.lastUpdated = new Date().toLocaleString();

      // Emit refresh event
      const eventBus = this.getApp()?.events;
      if (eventBus) {
        eventBus.emit('admin:dashboard-refreshed', {
          page: this,
          timestamp: this.lastUpdated
        });
      }

    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
      // Show error feedback
      const alert = this.element.querySelector('.alert-success');
      if (alert) {
        alert.className = 'alert alert-danger border-0';
        alert.innerHTML = `
          <div class="d-flex align-items-center">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <div>
              <strong>Error:</strong> Failed to refresh dashboard data.
            </div>
          </div>
        `;

        // Reset after 5 seconds
        setTimeout(() => {
          alert.className = 'alert alert-success border-0';
          alert.innerHTML = `
            <div class="d-flex align-items-center">
              <i class="bi bi-check-circle-fill me-2"></i>
              <div>
                <strong>System Status:</strong> All systems operational.
                Last updated: <span class="text-muted">${this.lastUpdated}</span>
              </div>
            </div>
          `;
        }, 5000);
      }
    } finally {
      // Reset button state
      const icon = element.querySelector('i');
      icon?.classList.remove('bi-spin');
      element.disabled = false;
    }
  }

  async onActionExportMetrics(event, element) {
    try {
      // Export all charts as PNG
      await this.apiMetricsChart?.export('png');
      await this.systemEventsChart?.export('png');
      await this.systemIncidentsChart?.export('png');

      // Show success feedback
      const eventBus = this.getApp()?.events;
      if (eventBus) {
        eventBus.emit('admin:metrics-exported', {
          page: this,
          charts: ['api-metrics', 'system-events', 'system-incidents']
        });
      }

    } catch (error) {
      console.error('Failed to export metrics:', error);
    }
  }

  async onActionViewAlerts(event, element) {
    // Navigate to alerts page or show alerts modal
    const router = this.getApp()?.router;
    if (router) {
      router.navigateTo('/admin/alerts');
    }
  }

  async onActionViewSystemStatus(event, element) {
    // Navigate to system status page
    const router = this.getApp()?.router;
    if (router) {
      router.navigateTo('/admin/system-status');
    }
  }

  // Public API
  async refreshDashboard() {
    return this.onActionRefreshAll(null, null, { disabled: false, querySelector: () => null });
  }

  getCharts() {
    return {
      apiMetrics: this.apiMetricsChart,
      systemEvents: this.systemEventsChart,
      systemIncidents: this.systemIncidentsChart
    };
  }

  getStats() {
    return this.headerView?.stats || {};
  }
}
