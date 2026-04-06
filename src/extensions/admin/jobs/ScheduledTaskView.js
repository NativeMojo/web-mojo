/**
 * ScheduledTaskView - Detail view for a scheduled task
 *
 * Shows task metadata, schedule config, job_config, and recent results.
 * Provides actions to edit, toggle enabled, run now (future), and delete.
 */

import View from '@core/View.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { ScheduledTask, ScheduledTaskForms, TaskResultList, DAY_LABELS } from '@core/models/ScheduledTask.js';

class ScheduledTaskView extends View {
    constructor(options = {}) {
        super({
            className: 'scheduled-task-view',
            ...options
        });

        this.model = options.model || new ScheduledTask(options.data || {});
    }

    getTemplate() {
        const days = this.model.get('run_days') || [];
        this.dayDisplay = days.length === 0 || days.length === 7
            ? 'Every day'
            : days.map(d => DAY_LABELS[d] || d).join(', ');

        const times = this.model.get('run_times') || [];
        this.timeDisplay = times.join(', ') || '—';

        const notify = this.model.get('notify') || [];
        this.notifyDisplay = notify.length > 0 ? notify.join(', ') : 'None';

        return `
            <div class="scheduled-task-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 text-primary">
                            <i class="bi bi-clock-history"></i>
                        </div>
                        <div>
                            <h3 class="mb-1">{{model.name}}</h3>
                            <div class="text-muted small">
                                {{model.task_type|uppercase}} task
                                {{#model.run_once}}
                                    <span class="mx-1">·</span> <span class="badge bg-info">Run Once</span>
                                {{/model.run_once}}
                            </div>
                            <div class="mt-1">
                                <span class="badge {{model.enabled|boolean('bg-success','bg-secondary')}}">
                                    {{model.enabled|boolean('Enabled','Disabled')}}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex align-items-start gap-4">
                        <div class="text-end">
                            <div class="text-muted small">Created</div>
                            <div>{{model.created|relative}}</div>
                        </div>
                        <div data-container="task-context-menu"></div>
                    </div>
                </div>

                {{#model.description}}
                <p class="text-muted mb-3">{{model.description}}</p>
                {{/model.description}}

                <!-- Details -->
                <div class="list-group mb-3">
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Schedule</h6>
                        <p class="mb-0 small">{{timeDisplay}} · {{dayDisplay}}</p>
                    </div>
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Notifications</h6>
                        <p class="mb-0 small">{{notifyDisplay}}</p>
                    </div>
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Execution</h6>
                        <p class="mb-0 small">
                            Runs: {{model.run_count|default('0')}}
                            <span class="mx-2">|</span>
                            Last run: {{model.last_run|relative|default('Never')}}
                            {{#model.max_retries}}
                                <span class="mx-2">|</span>
                                Max retries: {{model.max_retries}}
                            {{/model.max_retries}}
                        </p>
                    </div>
                    {{#model.last_error}}
                    <div class="list-group-item list-group-item-danger">
                        <h6 class="mb-1 text-muted">Last Error</h6>
                        <p class="mb-0 small font-monospace">{{model.last_error}}</p>
                    </div>
                    {{/model.last_error}}
                    {{#model.job_config}}
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Configuration</h6>
                        <pre class="mb-0 small">{{model.job_config|json}}</pre>
                    </div>
                    {{/model.job_config}}
                </div>

                <!-- Recent Results -->
                <h6 class="text-muted mb-2">Recent Results</h6>
                <div data-ref="results-container">
                    <div class="text-center text-muted small py-3">Loading...</div>
                </div>
            </div>
        `;
    }

    async onInit() {
        const isEnabled = this.model.get('enabled');

        const contextMenu = new ContextMenu({
            containerId: 'task-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit', action: 'edit-task', icon: 'bi-pencil' },
                    isEnabled
                        ? { label: 'Disable', action: 'disable-task', icon: 'bi-pause-circle' }
                        : { label: 'Enable', action: 'enable-task', icon: 'bi-play-circle' },
                    { type: 'divider' },
                    { label: 'Delete', action: 'delete-task', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(contextMenu);
    }

    async onAfterRender() {
        await super.onAfterRender();
        await this._loadResults();
    }

    async _loadResults() {
        const container = this.element?.querySelector('[data-ref="results-container"]');
        if (!container) return;

        try {
            const results = new TaskResultList({ params: { task: this.model.get('id'), sort: '-created', size: 10 } });
            await results.fetch();

            const models = results.models || [];
            if (models.length === 0) {
                container.innerHTML = '<div class="text-center text-muted small py-3">No results yet.</div>';
                return;
            }

            let html = '<div class="list-group">';
            models.forEach(result => {
                const status = result.get('status');
                const created = result.get('created');
                const statusClass = status === 'success' ? 'text-success' : 'text-danger';
                const statusIcon = status === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';

                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-center py-2">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi ${statusIcon} ${statusClass}"></i>
                            <span class="small">${this._escapeHtml(status)}</span>
                        </div>
                        <span class="text-muted small">${this._escapeHtml(created || '')}</span>
                    </div>`;
            });
            html += '</div>';
            container.innerHTML = html;
        } catch (_err) {
            container.innerHTML = '<div class="text-center text-muted small py-3">Failed to load results.</div>';
        }
    }

    async onActionEditTask() {
        const app = this.getApp();
        const resp = await app.showModelForm({
            title: `Edit Task — ${this.model.get('name')}`,
            model: this.model,
            formConfig: ScheduledTaskForms.edit,
        });
        if (resp) {
            this.render();
        }
    }

    async onActionDisableTask() {
        const app = this.getApp();
        app.showLoading();
        const resp = await this.model.save({ enabled: false });
        app.hideLoading();
        if (resp && resp.success !== false) {
            app.toast.success('Task disabled');
            this.render();
        } else {
            app.toast.error('Failed to disable task');
        }
    }

    async onActionEnableTask() {
        const app = this.getApp();
        app.showLoading();
        const resp = await this.model.save({ enabled: true });
        app.hideLoading();
        if (resp && resp.success !== false) {
            app.toast.success('Task enabled');
            this.render();
        } else {
            app.toast.error('Failed to enable task');
        }
    }

    async onActionDeleteTask() {
        const app = this.getApp();
        const confirmed = await app.confirm({
            title: 'Delete Scheduled Task',
            message: `Permanently delete "${this.model.get('name')}" and all its results? This cannot be undone.`,
            confirmLabel: 'Delete',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return;

        app.showLoading();
        const resp = await this.model.delete();
        app.hideLoading();
        if (resp && resp.success !== false) {
            app.toast.success('Task deleted');
            this.emit('deleted', { model: this.model });
        } else {
            app.toast.error('Failed to delete task');
        }
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

ScheduledTask.VIEW_CLASS = ScheduledTaskView;
export default ScheduledTaskView;
