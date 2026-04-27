/**
 * RunnerDetailsView
 *
 * Tabbed runner inspector opened via RunnerDetailsView.show(runner).
 * All tab view classes are internal to this module.
 *
 * Tabs:
 *   Overview     — identity, channels, uptime (runner object only, no fetch)
 *   System Info  — OS, CPU, memory, disk, network (GET /api/jobs/runners/sysinfo/<id>)
 *   Running Jobs — jobs on this runner (GET /api/jobs/job?runner_id=&status=running)
 *   Logs         — aggregated logs from running jobs (GET /api/jobs/logs?job_id=)
 *   Actions      — ping, shutdown, broadcast, export
 */

import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import TabView from '@core/views/navigation/TabView.js';
import { JobRunner } from '@ext/admin/models/JobRunner.js';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

function formatBytes(bytes) {
  if (bytes == null) return 'N/A';
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + ' KB';
  return bytes + ' B';
}

function resourceBadgeClass(pct) {
  if (pct >= 80) return 'bg-danger-subtle text-danger';
  if (pct >= 60) return 'bg-warning-subtle text-warning';
  return 'bg-success-subtle text-success';
}

function progressBarClass(pct) {
  if (pct >= 80) return 'bg-danger';
  if (pct >= 60) return 'bg-warning';
  return 'bg-success';
}

function heartbeatAgeSec(isoString) {
  if (!isoString) return null;
  return (Date.now() - new Date(isoString).getTime()) / 1000;
}

// ─────────────────────────────────────────────────────────────────────────────
// RunnerOverviewTab
// ─────────────────────────────────────────────────────────────────────────────

class RunnerOverviewTab extends View {
  constructor(options = {}) {
    super({ className: 'runner-overview-tab', ...options });
    this.model = options.model || null;
  }

  async onBeforeRender() {
    const r = this.model;
    if (!r) return;

    this.aliveBadgeClass = r.get('alive') ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
    this.aliveIcon = r.get('alive') ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
    this.aliveText = r.get('alive') ? 'Alive' : 'Dead';

    const started = r.get('started');
    this.startedText = started ? new Date(started).toLocaleString() : 'N/A';

    if (started) {
      const sec = (Date.now() - new Date(started).getTime()) / 1000;
      this.uptimeText = formatUptime(sec);
    } else {
      this.uptimeText = 'N/A';
    }

    const ageSec = heartbeatAgeSec(r.get('last_heartbeat'));
    if (ageSec !== null) {
      this.heartbeatText = new Date(r.get('last_heartbeat')).toLocaleString();
      this.heartbeatAgeText = `${Math.round(ageSec)}s ago`;
      this.heartbeatClass = ageSec < 30 ? 'text-success' : ageSec < 120 ? 'text-warning' : 'text-danger';
    } else {
      this.heartbeatText = 'N/A';
      this.heartbeatAgeText = '';
      this.heartbeatClass = 'text-muted';
    }

    const jobsProcessed = r.get('jobs_processed') || 0;
    const jobsFailed = r.get('jobs_failed') || 0;
    this.errorRate = (jobsProcessed > 0)
      ? ((jobsFailed / jobsProcessed) * 100).toFixed(2) + '%'
      : '0.00%';
  }

  async getTemplate() {
    return `
      {{^model}}
      <div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>No runner data available.</div>
      {{/model}}

      {{#model}}
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
          <h6 class="mb-0 fw-semibold">
            <i class="bi bi-info-circle text-primary me-2"></i>Identity
          </h6>
          <span class="badge {{aliveBadgeClass}}">
            <i class="bi {{aliveIcon}} me-1"></i>{{aliveText}}
          </span>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <table class="table table-sm table-borderless mb-0">
                <tbody>
                  <tr>
                    <td class="text-muted small fw-semibold text-uppercase pe-3" style="width:38%;white-space:nowrap;font-size:0.72rem;">Runner ID</td>
                    <td class="font-monospace small">{{model.runner_id}}</td>
                  </tr>
                  <tr>
                    <td class="text-muted small fw-semibold text-uppercase" style="font-size:0.72rem;">Started</td>
                    <td class="small">{{startedText}}</td>
                  </tr>
                  <tr>
                    <td class="text-muted small fw-semibold text-uppercase" style="font-size:0.72rem;">Uptime</td>
                    <td class="small fw-semibold">{{uptimeText}}</td>
                  </tr>
                  <tr>
                    <td class="text-muted small fw-semibold text-uppercase" style="font-size:0.72rem;">Heartbeat</td>
                    <td class="small {{heartbeatClass}}">
                      {{heartbeatText}}
                      {{#heartbeatAgeText}}
                      <span class="text-muted">({{heartbeatAgeText}})</span>
                      {{/heartbeatAgeText}}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="col-md-6">
              <table class="table table-sm table-borderless mb-0">
                <tbody>
                  <tr>
                    <td class="text-muted small fw-semibold text-uppercase pe-3" style="width:38%;white-space:nowrap;font-size:0.72rem;">Jobs Done</td>
                    <td class="small fw-bold text-success">{{model.jobs_processed|number}}</td>
                  </tr>
                  <tr>
                    <td class="text-muted small fw-semibold text-uppercase" style="font-size:0.72rem;">Jobs Failed</td>
                    <td class="small fw-bold text-danger">{{model.jobs_failed|number}}</td>
                  </tr>
                  <tr>
                    <td class="text-muted small fw-semibold text-uppercase" style="font-size:0.72rem;">Error Rate</td>
                    <td class="small">{{errorRate}}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {{#model.channels.length}}
          <div class="mt-3 pt-3 border-top">
            <div class="text-muted small fw-semibold text-uppercase mb-2" style="font-size:0.72rem;">Assigned Channels</div>
            <div class="d-flex flex-wrap gap-2">
              {{#model.channels}}
              <span class="badge bg-primary-subtle text-primary px-3 py-2">
                <i class="bi bi-circle-fill me-1" style="font-size:0.4rem;vertical-align:middle;"></i>{{.}}
              </span>
              {{/model.channels}}
            </div>
          </div>
          {{/model.channels.length}}
        </div>
      </div>

      <div class="alert alert-light border d-flex align-items-center gap-2 mb-0" style="font-size:0.83rem;">
        <i class="bi bi-cpu text-primary flex-shrink-0"></i>
        <span>CPU, memory, disk, and network detail is in the <strong>System Info</strong> tab.</span>
      </div>
      {{/model}}
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RunnerSysinfoTab
// ─────────────────────────────────────────────────────────────────────────────

class RunnerSysinfoTab extends View {
  constructor(options = {}) {
    super({ className: 'runner-sysinfo-tab', ...options });
    this.model = options.model || null;
    this.sysinfo = null;
    this.sysinfoError = null;
    this.loading = false;
    this.loaded = false;
  }

  async onTabActivated() {
    if (this.loaded) return;
    this.loaded = true;
    this.loading = true;
    this.sysinfoError = null;
    await this.render();
    await this.loadSysinfo();
    this.loading = false;
    await this.render();
  }

  async loadSysinfo() {
    try {
      const resp = await this.getApp().rest.GET(
        `/api/jobs/runners/sysinfo/${this.model.get('runner_id')}`
      );
      if (resp.success && resp.data) {
        const payload = resp.data.data || resp.data;
        if (payload && payload.status === 'error') {
          this.sysinfoError = payload.error || 'Runner reported an error collecting sysinfo.';
          return;
        }
        if (!resp.data.status) {
          this.sysinfoError = resp.data.error || 'Could not load system info.';
          return;
        }
        this.sysinfo = payload.result || payload;
        this.enrichSysinfo();
      } else {
        this.sysinfoError = 'Could not load system info.';
      }
    } catch (e) {
      this.sysinfoError = e.message || 'Request failed.';
    }
  }

  enrichSysinfo() {
    const s = this.sysinfo;
    if (!s) return;

    if (s.memory) {
      s.memory.totalFmt     = formatBytes(s.memory.total);
      s.memory.usedFmt      = formatBytes(s.memory.used);
      s.memory.availableFmt = formatBytes(s.memory.available);
      s.memory.barClass     = progressBarClass(s.memory.percent);
      s.memory.badgeClass   = resourceBadgeClass(s.memory.percent);
    }

    if (s.disk) {
      s.disk.totalFmt   = formatBytes(s.disk.total);
      s.disk.usedFmt    = formatBytes(s.disk.used);
      s.disk.freeFmt    = formatBytes(s.disk.free);
      s.disk.barClass   = progressBarClass(s.disk.percent);
      s.disk.badgeClass = resourceBadgeClass(s.disk.percent);
    }

    if (s.network) {
      s.network.bytesRecvFmt = formatBytes(s.network.bytes_recv);
      s.network.bytesSentFmt = formatBytes(s.network.bytes_sent);
      s.network.errClass     = (s.network.errin > 0 || s.network.errout > 0)
        ? 'text-danger fw-bold' : 'text-success';
      s.network.dropClass    = (s.network.dropin > 0 || s.network.dropout > 0)
        ? 'text-warning fw-bold' : 'text-success';
    }

    const cpuPct = s.cpu_load || 0;
    s.cpuLoadBarClass   = progressBarClass(cpuPct);
    s.cpuLoadBadgeClass = resourceBadgeClass(cpuPct);

    if (s.cpu && s.cpu.freq) {
      s.cpu.freqText = `${Math.round(s.cpu.freq.current).toLocaleString()} MHz current`
        + ` · ${Math.round(s.cpu.freq.max).toLocaleString()} MHz max`;
    } else if (s.cpu) {
      s.cpu.freqText = null;
    }

    if (s.cpus_load && s.cpus_load.length) {
      s.cpuCores = s.cpus_load.map((pct, i) => ({
        index: i,
        pct: pct.toFixed(1),
        barClass: progressBarClass(pct)
      }));
    } else {
      s.cpuCores = [];
    }

    s.bootDatetime  = s.boot_time ? new Date(s.boot_time * 1000).toLocaleString() : null;
    s.collectedText = s.datetime  || null;
  }

  async onActionRefreshSysinfo() {
    this.loaded = false;
    this.sysinfo = null;
    this.sysinfoError = null;
    await this.onTabActivated();
  }

  async getTemplate() {
    return `
      {{#loading|bool}}
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <div class="mt-2 text-muted small">Loading system info…</div>
      </div>
      {{/loading|bool}}

      {{^loading|bool}}

      {{#sysinfoError|bool}}
      <div class="alert alert-warning d-flex align-items-start gap-2">
        <i class="bi bi-exclamation-triangle flex-shrink-0 mt-1"></i>
        <div>
          <strong>Could not load system info</strong><br>
          <span class="small">{{sysinfoError}}</span><br>
          <button class="btn btn-sm btn-outline-warning mt-2" data-action="refresh-sysinfo">
            <i class="bi bi-arrow-clockwise me-1"></i>Retry
          </button>
        </div>
      </div>
      {{/sysinfoError|bool}}

      {{#sysinfo|bool}}

      <div class="d-flex justify-content-end align-items-center gap-3 mb-3">
        {{#sysinfo.collectedText}}
        <small class="text-muted">Collected {{sysinfo.collectedText}}</small>
        {{/sysinfo.collectedText}}
        <button class="btn btn-sm btn-outline-secondary" data-action="refresh-sysinfo">
          <i class="bi bi-arrow-clockwise me-1"></i>Refresh
        </button>
      </div>

      <!-- OS -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white border-bottom py-2">
          <h6 class="mb-0 fw-semibold"><i class="bi bi-hdd-rack text-primary me-2"></i>Operating System</h6>
        </div>
        <div class="card-body p-0">
          <table class="table table-sm table-borderless mb-0">
            <tbody>
              {{#sysinfo.os}}
              <tr>
                <td class="text-muted small fw-semibold text-uppercase ps-3 pe-2" style="width:20%;font-size:0.72rem;white-space:nowrap;">Hostname</td>
                <td class="font-monospace small">{{.hostname}}</td>
                <td class="text-muted small fw-semibold text-uppercase pe-2" style="width:15%;font-size:0.72rem;white-space:nowrap;">OS</td>
                <td class="small">{{.system}}</td>
              </tr>
              <tr>
                <td class="text-muted small fw-semibold text-uppercase ps-3 pe-2" style="font-size:0.72rem;">Release</td>
                <td class="font-monospace small">{{.release}}</td>
                <td class="text-muted small fw-semibold text-uppercase pe-2" style="font-size:0.72rem;">Machine</td>
                <td class="font-monospace small">{{.machine}}</td>
              </tr>
              <tr>
                <td class="text-muted small fw-semibold text-uppercase ps-3 pe-2" style="font-size:0.72rem;">Version</td>
                <td colspan="3" class="font-monospace small text-muted" style="font-size:0.76rem;">{{.version}}</td>
              </tr>
              {{/sysinfo.os}}
              {{#sysinfo.bootDatetime}}
              <tr>
                <td class="text-muted small fw-semibold text-uppercase ps-3 pe-2" style="font-size:0.72rem;">Boot Time</td>
                <td colspan="3" class="small">{{sysinfo.bootDatetime}}</td>
              </tr>
              {{/sysinfo.bootDatetime}}
            </tbody>
          </table>
        </div>
      </div>

      <!-- CPU -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
          <h6 class="mb-0 fw-semibold"><i class="bi bi-cpu text-primary me-2"></i>CPU</h6>
          <span class="badge {{sysinfo.cpuLoadBadgeClass}}">{{sysinfo.cpu_load}}% overall</span>
        </div>
        <div class="card-body">
          <div class="d-flex justify-content-between mb-1">
            <small class="fw-semibold text-muted">Overall Load</small>
            <small class="fw-bold">{{sysinfo.cpu_load}}%</small>
          </div>
          <div class="progress mb-2" style="height:8px;">
            <div class="progress-bar {{sysinfo.cpuLoadBarClass}}" style="width:{{sysinfo.cpu_load}}%;"></div>
          </div>
          {{#sysinfo.cpu}}
          <div class="text-muted small mb-3">
            {{.count}} logical cores
            {{#.freqText}}&nbsp;·&nbsp;{{.freqText}}{{/.freqText}}
          </div>
          {{/sysinfo.cpu}}

          {{#sysinfo.cpuCores.length}}
          <div class="row g-2">
            {{#sysinfo.cpuCores}}
            <div class="col-6 col-md-3">
              <div class="border rounded p-2 bg-light text-center">
                <div class="text-muted fw-semibold text-uppercase mb-1" style="font-size:0.65rem;">Core {{.index}}</div>
                <div class="fw-bold small">{{.pct}}%</div>
                <div class="progress mt-1" style="height:4px;">
                  <div class="progress-bar {{.barClass}}" style="width:{{.pct}}%;"></div>
                </div>
              </div>
            </div>
            {{/sysinfo.cpuCores}}
          </div>
          {{/sysinfo.cpuCores.length}}
        </div>
      </div>

      <!-- Memory -->
      {{#sysinfo.memory}}
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
          <h6 class="mb-0 fw-semibold"><i class="bi bi-memory text-primary me-2"></i>Memory</h6>
          <span class="badge {{.badgeClass}}">{{.percent}}% used</span>
        </div>
        <div class="card-body">
          <div class="d-flex justify-content-between mb-1">
            <small class="fw-semibold text-muted">RAM Usage</small>
            <small class="fw-bold">{{.usedFmt}} / {{.totalFmt}}</small>
          </div>
          <div class="progress mb-3" style="height:8px;">
            <div class="progress-bar {{.barClass}}" style="width:{{.percent}}%;"></div>
          </div>
          <div class="row g-2 text-center">
            <div class="col-6 col-md-3">
              <div class="text-muted fw-semibold text-uppercase" style="font-size:0.7rem;">Total</div>
              <div class="fw-semibold small">{{.totalFmt}}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-muted fw-semibold text-uppercase" style="font-size:0.7rem;">Used</div>
              <div class="fw-semibold small">{{.usedFmt}}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-muted fw-semibold text-uppercase" style="font-size:0.7rem;">Available</div>
              <div class="fw-semibold small text-success">{{.availableFmt}}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-muted fw-semibold text-uppercase" style="font-size:0.7rem;">Percent</div>
              <div class="fw-semibold small">{{.percent}}%</div>
            </div>
          </div>
        </div>
      </div>
      {{/sysinfo.memory}}

      <!-- Disk -->
      {{#sysinfo.disk}}
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
          <h6 class="mb-0 fw-semibold"><i class="bi bi-hdd text-primary me-2"></i>Disk (Root)</h6>
          <span class="badge {{.badgeClass}}">{{.percent}}% used</span>
        </div>
        <div class="card-body">
          <div class="d-flex justify-content-between mb-1">
            <small class="fw-semibold text-muted">Disk Usage</small>
            <small class="fw-bold">{{.usedFmt}} / {{.totalFmt}}</small>
          </div>
          <div class="progress mb-3" style="height:8px;">
            <div class="progress-bar {{.barClass}}" style="width:{{.percent}}%;"></div>
          </div>
          <div class="row g-2 text-center">
            <div class="col-6 col-md-3">
              <div class="text-muted fw-semibold text-uppercase" style="font-size:0.7rem;">Total</div>
              <div class="fw-semibold small">{{.totalFmt}}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-muted fw-semibold text-uppercase" style="font-size:0.7rem;">Used</div>
              <div class="fw-semibold small">{{.usedFmt}}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-muted fw-semibold text-uppercase" style="font-size:0.7rem;">Free</div>
              <div class="fw-semibold small text-success">{{.freeFmt}}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-muted fw-semibold text-uppercase" style="font-size:0.7rem;">Percent</div>
              <div class="fw-semibold small">{{.percent}}%</div>
            </div>
          </div>
        </div>
      </div>
      {{/sysinfo.disk}}

      <!-- Network -->
      {{#sysinfo.network}}
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white border-bottom py-2">
          <h6 class="mb-0 fw-semibold"><i class="bi bi-diagram-3 text-primary me-2"></i>Network</h6>
        </div>
        <div class="card-body">
          <div class="row g-2">
            <div class="col-6 col-md-4">
              <div class="border rounded p-2 bg-light">
                <div class="text-muted fw-semibold text-uppercase mb-1" style="font-size:0.67rem;"><i class="bi bi-arrow-down text-primary me-1"></i>Bytes Recv</div>
                <div class="fw-bold font-monospace small">{{.bytesRecvFmt}}</div>
              </div>
            </div>
            <div class="col-6 col-md-4">
              <div class="border rounded p-2 bg-light">
                <div class="text-muted fw-semibold text-uppercase mb-1" style="font-size:0.67rem;"><i class="bi bi-arrow-up text-primary me-1"></i>Bytes Sent</div>
                <div class="fw-bold font-monospace small">{{.bytesSentFmt}}</div>
              </div>
            </div>
            <div class="col-6 col-md-4">
              <div class="border rounded p-2 bg-light">
                <div class="text-muted fw-semibold text-uppercase mb-1" style="font-size:0.67rem;"><i class="bi bi-share text-primary me-1"></i>TCP Connections</div>
                <div class="fw-bold font-monospace small">{{.tcp_cons|number}}</div>
              </div>
            </div>
            <div class="col-6 col-md-4">
              <div class="border rounded p-2 bg-light">
                <div class="text-muted fw-semibold text-uppercase mb-1" style="font-size:0.67rem;"><i class="bi bi-arrow-down me-1"></i>Packets Recv</div>
                <div class="fw-bold font-monospace small">{{.packets_recv|number}}</div>
              </div>
            </div>
            <div class="col-6 col-md-4">
              <div class="border rounded p-2 bg-light">
                <div class="text-muted fw-semibold text-uppercase mb-1" style="font-size:0.67rem;"><i class="bi bi-arrow-up me-1"></i>Packets Sent</div>
                <div class="fw-bold font-monospace small">{{.packets_sent|number}}</div>
              </div>
            </div>
            <div class="col-6 col-md-4">
              <div class="border rounded p-2 bg-light">
                <div class="text-muted fw-semibold text-uppercase mb-1" style="font-size:0.67rem;"><i class="bi bi-exclamation-triangle me-1"></i>Errors In / Out</div>
                <div class="fw-bold font-monospace small {{.errClass}}">{{.errin}} / {{.errout}}</div>
              </div>
            </div>
            <div class="col-6 col-md-4">
              <div class="border rounded p-2 bg-light">
                <div class="text-muted fw-semibold text-uppercase mb-1" style="font-size:0.67rem;"><i class="bi bi-x-circle me-1"></i>Drops In</div>
                <div class="fw-bold font-monospace small {{.dropClass}}">{{.dropin}}</div>
              </div>
            </div>
            <div class="col-6 col-md-4">
              <div class="border rounded p-2 bg-light">
                <div class="text-muted fw-semibold text-uppercase mb-1" style="font-size:0.67rem;"><i class="bi bi-x-circle me-1"></i>Drops Out</div>
                <div class="fw-bold font-monospace small {{.dropClass}}">{{.dropout}}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {{/sysinfo.network}}

      <!-- Logged-in Users -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white border-bottom py-2">
          <h6 class="mb-0 fw-semibold"><i class="bi bi-person-badge text-primary me-2"></i>Logged-in Users</h6>
        </div>
        {{#sysinfo.users.length}}
        <ul class="list-group list-group-flush">
          {{#sysinfo.users}}
          <li class="list-group-item font-monospace small">{{.name|default:'unknown'}}
            {{#.terminal}}<span class="text-muted ms-2">{{.terminal}}</span>{{/.terminal}}
          </li>
          {{/sysinfo.users}}
        </ul>
        {{/sysinfo.users.length}}
        {{^sysinfo.users.length}}
        <div class="card-body text-center text-muted py-4">
          <i class="bi bi-person-x fs-2 d-block mb-2 opacity-50"></i>
          <div class="small">No users currently logged in</div>
        </div>
        {{/sysinfo.users.length}}
      </div>

      {{/sysinfo|bool}}
      {{/loading|bool}}
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RunnerJobsTab
// ─────────────────────────────────────────────────────────────────────────────

class RunnerJobsTab extends View {
  constructor(options = {}) {
    super({ className: 'runner-jobs-tab', ...options });
    this.model = options.model || null;
    this.jobs = [];
    this.loading = false;
    this.loaded = false;
  }

  async onTabActivated() {
    if (this.loaded) return;
    this.loaded = true;
    this.loading = true;
    await this.render();
    await this.loadJobs();
    this.loading = false;
    await this.render();
  }

  async loadJobs() {
    try {
      const resp = await this.getApp().rest.GET(
        `/api/jobs/job?runner_id=${this.model.get('runner_id')}&status=running&size=50`
      );
      if (resp.success && resp.data && resp.data.status) {
        const now = Date.now() / 1000;
        this.jobs = (resp.data.data || []).map(job => ({
          ...job,
          durationText: job.started_at
            ? formatDuration(now - new Date(job.started_at).getTime() / 1000)
            : 'N/A',
          startedText: job.started_at
            ? new Date(job.started_at).toLocaleTimeString()
            : 'N/A',
          attemptBadgeClass: job.attempt > 1
            ? 'bg-danger-subtle text-danger'
            : 'bg-warning-subtle text-warning'
        }));
      } else {
        this.jobs = [];
      }
    } catch (e) {
      this.jobs = [];
      this.showError('Could not load running jobs: ' + e.message);
    }
  }

  async onActionRefreshJobs() {
    this.loaded = false;
    this.jobs = [];
    await this.onTabActivated();
  }

  async onActionViewJob(event, element) {
    const jobId = element.dataset.jobId;
    this.emit('job:view', { jobId, runner: this.model });
  }

  async onActionCancelJob(event, element) {
    const jobId = element.dataset.jobId;
    const ok = await Modal.confirm(
      'Cancel this job? The runner will receive a cooperative cancel signal.',
      'Cancel Job',
      { confirmText: 'Cancel Job', confirmClass: 'btn-warning' }
    );
    if (!ok) return;

    try {
      const resp = await this.getApp().rest.POST(
        `/api/jobs/job/${jobId}`, { cancel_request: true }
      );
      if (resp.success && resp.data && resp.data.status) {
        this.showSuccess('Cancel signal sent.');
        this.loaded = false;
        await this.onTabActivated();
      } else {
        this.showError((resp.data && resp.data.error) || 'Could not cancel job.');
      }
    } catch (e) {
      this.showError('Could not cancel job: ' + e.message);
    }
  }

  async getTemplate() {
    return `
      {{#loading|bool}}
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <div class="mt-2 text-muted small">Loading running jobs…</div>
      </div>
      {{/loading|bool}}

      {{^loading|bool}}
      <div class="d-flex justify-content-between align-items-center mb-3">
        <small class="text-muted">{{jobs.length}} job(s) currently executing on this runner</small>
        <button class="btn btn-sm btn-outline-secondary" data-action="refresh-jobs">
          <i class="bi bi-arrow-clockwise me-1"></i>Refresh
        </button>
      </div>

      {{#jobs.length}}
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3 border-0 text-muted fw-semibold text-uppercase" style="font-size:0.72rem;letter-spacing:0.04em;">Job ID</th>
                <th class="border-0 text-muted fw-semibold text-uppercase" style="font-size:0.72rem;letter-spacing:0.04em;">Function</th>
                <th class="border-0 text-muted fw-semibold text-uppercase" style="font-size:0.72rem;letter-spacing:0.04em;">Channel</th>
                <th class="border-0 text-muted fw-semibold text-uppercase" style="font-size:0.72rem;letter-spacing:0.04em;">Started</th>
                <th class="border-0 text-muted fw-semibold text-uppercase" style="font-size:0.72rem;letter-spacing:0.04em;">Duration</th>
                <th class="border-0 text-muted fw-semibold text-uppercase" style="font-size:0.72rem;letter-spacing:0.04em;">Attempt</th>
                <th class="border-0 text-end pe-3 text-muted fw-semibold text-uppercase" style="font-size:0.72rem;letter-spacing:0.04em;">Actions</th>
              </tr>
            </thead>
            <tbody>
              {{#jobs}}
              <tr>
                <td class="ps-3">
                  <span class="font-monospace text-primary small" title="{{.id}}">{{.id|truncate:12}}</span>
                </td>
                <td>
                  <span class="font-monospace text-muted small" title="{{.func}}">{{.func|truncate:42}}</span>
                </td>
                <td>
                  <span class="badge bg-primary-subtle text-primary">{{.channel}}</span>
                </td>
                <td><small class="text-muted">{{.startedText}}</small></td>
                <td><span class="badge bg-light text-secondary border">{{.durationText}}</span></td>
                <td><span class="badge {{.attemptBadgeClass}}">{{.attempt}}</span></td>
                <td class="text-end pe-3">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary btn-sm" data-action="view-job"
                      data-job-id="{{.id}}" title="View job details">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-warning btn-sm" data-action="cancel-job"
                      data-job-id="{{.id}}" title="Cancel job">
                      <i class="bi bi-x-circle"></i>
                    </button>
                  </div>
                </td>
              </tr>
              {{/jobs}}
            </tbody>
          </table>
        </div>
      </div>
      {{/jobs.length}}

      {{^jobs.length}}
      <div class="text-center text-muted py-5">
        <i class="bi bi-list-task fs-2 d-block mb-2 opacity-50"></i>
        <div class="small">No jobs currently executing on this runner</div>
      </div>
      {{/jobs.length}}
      {{/loading|bool}}
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RunnerLogsTab
// ─────────────────────────────────────────────────────────────────────────────

class RunnerLogsTab extends View {
  constructor(options = {}) {
    super({ className: 'runner-logs-tab', ...options });
    this.model = options.model || null;
    this.logs = [];
    this.filteredLogs = [];
    this.logFilter = 'all';
    this.loading = false;
    this.loaded = false;
    // precomputed filter button classes
    this.filterAllClass   = 'btn-primary';
    this.filterDebugClass = 'btn-outline-secondary';
    this.filterInfoClass  = 'btn-outline-primary';
    this.filterWarnClass  = 'btn-outline-warning';
    this.filterErrorClass = 'btn-outline-danger';
  }

  async onTabActivated() {
    if (this.loaded) return;
    this.loaded = true;
    this.loading = true;
    await this.render();
    await this.loadLogs();
    this.loading = false;
    await this.render();
  }

  async loadLogs() {
    try {
      // Get running job IDs for this runner first
      const jobsResp = await this.getApp().rest.GET(
        `/api/jobs/job?runner_id=${this.model.get('runner_id')}&status=running&size=50`
      );

      const jobIds = [];
      if (jobsResp.success && jobsResp.data && jobsResp.data.status) {
        (jobsResp.data.data || []).forEach(j => jobIds.push(j.id));
      }

      if (!jobIds.length) {
        this.logs = [];
        return;
      }

      // Fetch logs for each job in parallel (cap at 5 jobs)
      const promises = jobIds.slice(0, 5).map(id =>
        this.getApp().rest.GET(`/api/jobs/logs?job_id=${id}&sort=-created&size=20`)
          .then(r => (r.success && r.data && r.data.status) ? (r.data.data || []) : [])
          .catch(() => [])
      );

      const results = await Promise.all(promises);
      const all = [].concat(...results);

      all.sort((a, b) => new Date(b.created) - new Date(a.created));
      this.logs = all.slice(0, 50).map(log => ({
        ...log,
        levelBadgeClass: this.getLogLevelClass(log.kind),
        kindDisplay: (log.kind || 'info').toUpperCase(),
        createdText: new Date(log.created).toLocaleTimeString()
      }));
    } catch (e) {
      this.logs = [];
      this.showError('Could not load logs: ' + e.message);
    }
  }

  getLogLevelClass(kind) {
    const map = {
      debug: 'bg-secondary-subtle text-secondary',
      info:  'bg-primary-subtle text-primary',
      warn:  'bg-warning-subtle text-warning',
      error: 'bg-danger-subtle text-danger'
    };
    return map[kind] || 'bg-secondary-subtle text-secondary';
  }

  async onBeforeRender() {
    this.filteredLogs = this.logFilter === 'all'
      ? this.logs
      : this.logs.filter(l => l.kind === this.logFilter);

    this.filterAllClass   = this.logFilter === 'all'   ? 'btn-primary'          : 'btn-outline-secondary';
    this.filterDebugClass = this.logFilter === 'debug' ? 'btn-secondary'         : 'btn-outline-secondary';
    this.filterInfoClass  = this.logFilter === 'info'  ? 'btn-primary'           : 'btn-outline-primary';
    this.filterWarnClass  = this.logFilter === 'warn'  ? 'btn-warning'           : 'btn-outline-warning';
    this.filterErrorClass = this.logFilter === 'error' ? 'btn-danger'            : 'btn-outline-danger';
  }

  async onActionFilterLogs(event, element) {
    this.logFilter = element.dataset.kind || 'all';
    await this.render();
  }

  async onActionRefreshLogs() {
    this.loaded = false;
    this.logs = [];
    this.logFilter = 'all';
    await this.onTabActivated();
  }

  async getTemplate() {
    return `
      {{#loading|bool}}
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <div class="mt-2 text-muted small">Loading logs…</div>
      </div>
      {{/loading|bool}}

      {{^loading|bool}}
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white border-bottom py-2 d-flex align-items-center gap-2 flex-wrap">
          <small class="text-muted fw-semibold me-1">Filter:</small>
          <button class="btn btn-sm {{filterAllClass}}"   data-action="filter-logs" data-kind="all">All</button>
          <button class="btn btn-sm {{filterDebugClass}}" data-action="filter-logs" data-kind="debug">Debug</button>
          <button class="btn btn-sm {{filterInfoClass}}"  data-action="filter-logs" data-kind="info">Info</button>
          <button class="btn btn-sm {{filterWarnClass}}"  data-action="filter-logs" data-kind="warn">Warning</button>
          <button class="btn btn-sm {{filterErrorClass}}" data-action="filter-logs" data-kind="error">Error</button>
          <div class="ms-auto d-flex align-items-center gap-2">
            <small class="text-muted">{{filteredLogs.length}} entries</small>
            <button class="btn btn-sm btn-outline-secondary" data-action="refresh-logs">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        <div style="max-height:420px;overflow-y:auto;">
          {{#filteredLogs.length}}
          {{#filteredLogs}}
          <div class="d-flex align-items-start gap-2 px-3 py-2 border-bottom font-monospace" style="font-size:0.78rem;">
            <span class="text-muted flex-shrink-0 pt-1" style="min-width:65px;">{{.createdText}}</span>
            <span class="badge {{.levelBadgeClass}} flex-shrink-0" style="margin-top:1px;">{{.kindDisplay}}</span>
            <span class="flex-grow-1 text-break">{{.message}}</span>
          </div>
          {{/filteredLogs}}
          {{/filteredLogs.length}}

          {{^filteredLogs.length}}
          <div class="text-center text-muted py-5">
            <i class="bi bi-journal fs-2 d-block mb-2 opacity-50"></i>
            <div class="small">No log entries</div>
          </div>
          {{/filteredLogs.length}}
        </div>
      </div>
      {{/loading|bool}}
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RunnerActionsTab
// ─────────────────────────────────────────────────────────────────────────────

class RunnerActionsTab extends View {
  constructor(options = {}) {
    super({ className: 'runner-actions-tab', ...options });
    this.model = options.model || null;
    this.pingResult = null;
  }

  async onActionPing() {
    this.pingResult = null;
    await this.render();
    try {
      const resp = await this.getApp().rest.POST('/api/jobs/runners/ping', {
        runner_id: this.model.get('runner_id'),
        timeout: 2.0
      });
      if (resp.success && resp.data) {
        this.pingResult = resp.data.responsive
          ? '<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Runner is responsive</span>'
          : '<span class="text-warning"><i class="bi bi-exclamation-triangle-fill me-1"></i>Runner did not respond within 2s</span>';
      } else {
        this.pingResult = '<span class="text-danger"><i class="bi bi-x-circle-fill me-1"></i>Ping request failed</span>';
      }
    } catch (e) {
      this.pingResult = `<span class="text-danger"><i class="bi bi-x-circle-fill me-1"></i>${e.message}</span>`;
    }
    await this.render();
  }

  async onActionShutdown() {
    const ok = await Modal.confirm(
      `Send a graceful shutdown to <strong class="font-monospace">${this.model.get('runner_id')}</strong>?`
        + '<br><br>The runner will finish its current job then exit. This is fire-and-forget.',
      'Shutdown Runner',
      { confirmText: 'Shutdown', confirmClass: 'btn-danger' }
    );
    if (!ok) return;

    try {
      const resp = await this.getApp().rest.POST('/api/jobs/runners/shutdown', {
        runner_id: this.model.get('runner_id'),
        graceful: true
      });
      if (resp.success && resp.data && resp.data.status) {
        this.showSuccess('Shutdown command sent to runner.');
        this.emit('runner:shutdown', { runner: this.model });
      } else {
        this.showError((resp.data && resp.data.error) || 'Shutdown command failed.');
      }
    } catch (e) {
      this.showError('Shutdown failed: ' + e.message);
    }
  }

  async onActionBroadcast() {
    const commandEl = this.element && this.element.querySelector('[data-field="broadcast-command"]');
    const timeoutEl = this.element && this.element.querySelector('[data-field="broadcast-timeout"]');
    const command = commandEl ? commandEl.value : 'status';
    const timeout = timeoutEl ? (parseFloat(timeoutEl.value) || 2.0) : 2.0;

    Modal.showBusy({ message: `Broadcasting "${command}" to all runners…` });
    try {
      const resp = await this.getApp().rest.POST('/api/jobs/runners/broadcast', {
        command,
        timeout
      });
      Modal.hideBusy();

      if (resp.success && resp.data) {
        await Modal.code(
          JSON.stringify(resp.data, null, 2),
          'json',
          { title: `Broadcast Response — ${command}`, size: 'lg' }
        );
      } else {
        this.showError((resp.data && resp.data.error) || 'Broadcast failed.');
      }
    } catch (e) {
      Modal.hideBusy();
      this.showError('Broadcast failed: ' + e.message);
    }
  }

  async onActionExport() {
    try {
      const exportData = {
        runner: this.model.toJSON ? this.model.toJSON() : this.model,
        exported_at: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `runner-${this.model.get('runner_id')}-${Date.now()}.json`
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showSuccess('Runner data exported.');
    } catch (e) {
      this.showError('Export failed: ' + e.message);
    }
  }

  async getTemplate() {
    return `
      <p class="text-muted small mb-3">
        <i class="bi bi-info-circle me-1"></i>
        Actions operate on runner <strong class="font-monospace">{{model.runner_id}}</strong> unless otherwise noted.
      </p>

      <div class="d-flex align-items-center gap-2 mb-3">
        <span class="text-muted fw-semibold text-uppercase" style="font-size:0.7rem;letter-spacing:0.09em;white-space:nowrap;">Runner Control</span>
        <hr class="flex-grow-1 my-0">
      </div>

      <div class="row g-3 mb-4">

        <!-- Ping -->
        <div class="col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex flex-column gap-3">
              <div class="d-flex gap-3 align-items-start">
                <div class="d-flex align-items-center justify-content-center rounded bg-success-subtle text-success flex-shrink-0"
                  style="width:40px;height:40px;font-size:1.1rem;">
                  <i class="bi bi-broadcast-pin"></i>
                </div>
                <div>
                  <div class="fw-semibold mb-1">Ping Runner</div>
                  <div class="text-muted small">Verify this runner is truly responsive, not just alive on paper.</div>
                </div>
              </div>
              {{#pingResult|bool}}
              <div class="small">{{{pingResult}}}</div>
              {{/pingResult|bool}}
              <button class="btn btn-sm btn-outline-success mt-auto" data-action="ping">
                <i class="bi bi-broadcast-pin me-1"></i>Ping Now
              </button>
            </div>
          </div>
        </div>

        <!-- Shutdown -->
        <div class="col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex flex-column gap-3">
              <div class="d-flex gap-3 align-items-start">
                <div class="d-flex align-items-center justify-content-center rounded bg-danger-subtle text-danger flex-shrink-0"
                  style="width:40px;height:40px;font-size:1.1rem;">
                  <i class="bi bi-power"></i>
                </div>
                <div>
                  <div class="fw-semibold mb-1">Graceful Shutdown</div>
                  <div class="text-muted small">Runner finishes its current job then exits. Fire-and-forget.</div>
                </div>
              </div>
              <button class="btn btn-sm btn-outline-danger mt-auto" data-action="shutdown">
                <i class="bi bi-power me-1"></i>Shutdown
              </button>
            </div>
          </div>
        </div>

        <!-- Export -->
        <div class="col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex flex-column gap-3">
              <div class="d-flex gap-3 align-items-start">
                <div class="d-flex align-items-center justify-content-center rounded bg-secondary-subtle text-secondary flex-shrink-0"
                  style="width:40px;height:40px;font-size:1.1rem;">
                  <i class="bi bi-download"></i>
                </div>
                <div>
                  <div class="fw-semibold mb-1">Export Snapshot</div>
                  <div class="text-muted small">Download runner identity data as a JSON file.</div>
                </div>
              </div>
              <button class="btn btn-sm btn-outline-secondary mt-auto" data-action="export">
                <i class="bi bi-download me-1"></i>Export JSON
              </button>
            </div>
          </div>
        </div>

      </div>

      <div class="d-flex align-items-center gap-2 mb-3">
        <span class="text-muted fw-semibold text-uppercase" style="font-size:0.7rem;letter-spacing:0.09em;white-space:nowrap;">Broadcast Command</span>
        <hr class="flex-grow-1 my-0">
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <p class="text-muted small mb-3">
            Send a command to <strong>all active runners</strong> simultaneously and collect replies within the timeout window.
          </p>
          <div class="row g-2 align-items-end">
            <div class="col-md-4">
              <label class="form-label fw-semibold small text-muted mb-1">Command</label>
              <select class="form-select form-select-sm" data-field="broadcast-command">
                <option value="status">status</option>
                <option value="pause">pause</option>
                <option value="resume">resume</option>
                <option value="reload">reload</option>
                <option value="shutdown">shutdown</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label fw-semibold small text-muted mb-1">Timeout (s)</label>
              <input type="number" class="form-control form-control-sm"
                data-field="broadcast-timeout" value="2.0" min="0.5" step="0.5" />
            </div>
            <div class="col-md-5">
              <button class="btn btn-primary btn-sm w-100" data-action="broadcast">
                <i class="bi bi-megaphone me-1"></i>Broadcast to All Runners
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RunnerDetailsView — shell (default export)
// ─────────────────────────────────────────────────────────────────────────────

export default class RunnerDetailsView extends View {
  constructor(options = {}) {
    super({ className: 'runner-details-view', ...options });
    this.model = options.model instanceof JobRunner
      ? options.model
      : new JobRunner(options.model || options.data || {});
  }

  async onInit() {
    if (!this.model) return;

    const tabView = new TabView({
      containerId: 'runner-tabs',
      tabs: {
        'Overview':     new RunnerOverviewTab({ model: this.model }),
        'System Info':  new RunnerSysinfoTab({ model: this.model }),
        'Running Jobs': new RunnerJobsTab({ model: this.model }),
        'Logs':         new RunnerLogsTab({ model: this.model }),
        'Actions':      new RunnerActionsTab({ model: this.model })
      }
    });

    this.addChild(tabView);
  }

  async getTemplate() {
    return `<div data-container="runner-tabs"></div>`;
  }

  /**
   * Open this view in a Dialog.
   *
   * @param {object} runner  — runner object from GET /api/jobs/runners
   * @param {object} options — extra options forwarded to Modal.dialog()
   * @returns {Promise<any>}
   */
  static async show(runner, options = {}) {
    const model = runner instanceof JobRunner ? runner : new JobRunner(runner);
    const view = new RunnerDetailsView({ model });

    return await Modal.dialog({
      title: `<i class="bi bi-cpu me-2"></i><span class="font-monospace">${model.get('runner_id')}</span>`,
      body: view,
      size: 'xl',
      scrollable: true,
      buttons: [
        { text: 'Close', class: 'btn-secondary', dismiss: true }
      ],
      ...options
    });
  }
}


JobRunner.VIEW_CLASS = RunnerDetailsView;
