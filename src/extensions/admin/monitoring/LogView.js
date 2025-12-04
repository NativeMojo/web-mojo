/**
 * LogView - Detailed view for a Log record
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { Log } from '@core/models/Log.js';
import Dialog from '@core/views/feedback/Dialog.js';
import DeviceView from '../account/devices/DeviceView.js';
import GeoIPView from '../account/devices/GeoIPView.js';

class LogView extends View {
    constructor(options = {}) {
        super({
            className: 'log-view',
            ...options
        });

        this.model = options.model || new Log(options.data || {});
        this.logIcon = this.getIconForLog(this.model.get('level'));

        this.template = `
            <div class="log-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 {{logIcon.color}}">
                            <i class="bi {{logIcon.icon}}"></i>
                        </div>
                        <div>
                            <h4 class="mb-1">
                                <span class="badge bg-secondary">{{model.method}}</span> {{model.path}}
                            </h4>
                            <div class="text-muted small">
                                {{model.created|datetime}}
                            </div>
                        </div>
                    </div>
                    <div data-container="log-context-menu"></div>
                </div>

                <!-- Tabs -->
                <div data-container="log-tabs"></div>
            </div>
        `;
    }

    getIconForLog(level) {
        const lvl = level?.toLowerCase();
        if (lvl === 'error' || lvl === 'critical') return { icon: 'bi-x-octagon-fill', color: 'text-danger' };
        if (lvl === 'warning') return { icon: 'bi-exclamation-triangle-fill', color: 'text-warning' };
        if (lvl === 'info') return { icon: 'bi-info-circle-fill', color: 'text-info' };
        return { icon: 'bi-journal-text', color: 'text-secondary' };
    }

    async onInit() {
        // Overview Tab
        this.overviewView = new DataView({
            model: this.model,
            className: "p-3",
            columns: 2,
            fields: [
                { name: 'id', label: 'Log ID' },
                { name: 'level', label: 'Level', format: 'badge' },
                { name: 'kind', label: 'Kind' },
                { name: 'ip', label: 'IP Address', template: '<a href="#" data-action="view-ip">{{model.ip}}</a>' },
                { name: 'uid', label: 'User ID' },
                { name: 'username', label: 'Username' },
                { name: 'duid', label: 'Device ID', template: '<a href="#" data-action="view-device">{{model.duid|truncate_middle(32)}}</a>' },
                { name: 'model_name', label: 'Related Model' },
                { name: 'model_id', label: 'Related Model ID' },
            ]
        });

        // Log Content Tab
        const logContent = this.model.get('log');
        let formattedLog = logContent;
        try {
            // Attempt to parse and prettify if it's a JSON string
            const parsed = JSON.parse(logContent);
            formattedLog = JSON.stringify(parsed, null, 2);
        } catch (e) {
            // Not a valid JSON string, display as is
        }

        this.logContentView = new View({
            template: `
                <div class="position-relative">
                    <button class="btn btn-sm btn-outline-secondary position-absolute top-0 end-0 mt-2 me-2" data-action="copy-log">
                        <i class="bi bi-clipboard"></i> Copy
                    </button>
                    <pre class="bg-light p-3 border rounded" style="max-height: 600px; overflow-y: auto;"><code>${formattedLog}</code></pre>
                </div>
            `,
            onActionCopyLog: () => {
                navigator.clipboard.writeText(formattedLog);
                this.getApp()?.toast?.success('Log content copied to clipboard.');
            }
        });

        // TabView
        this.tabView = new TabView({
            containerId: 'log-tabs',
            tabs: {
                'Overview': this.overviewView,
                'Log Content': this.logContentView,
            },
            activeTab: 'Overview'
        });
        this.addChild(this.tabView);

        // ContextMenu
        const logMenu = new ContextMenu({
            containerId: 'log-context-menu',
            className: "context-menu-view header-menu-absolute",
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'View User', action: 'view-user', icon: 'bi-person', disabled: !this.model.get('uid') },
                    { label: 'View Device', action: 'view-device', icon: 'bi-phone', disabled: !this.model.get('duid') },
                    { type: 'divider' },
                    { label: 'Delete Log', action: 'delete-log', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(logMenu);
    }

    async onActionViewIp(event) {
        event.preventDefault();
        const ip = this.model.get('ip');
        if (ip) {
            GeoIPView.show(ip);
        }
    }

    async onActionViewDevice(event) {
        event.preventDefault();
        const duid = this.model.get('duid');
        if (duid) {
            DeviceView.show(duid);
        }
    }

    async onActionViewUser() {
        console.log("TODO: View user", this.model.get('uid'));
    }

    async onActionDeleteLog() {
        const confirmed = await Dialog.confirm(
            `Are you sure you want to delete this log entry? This action cannot be undone.`,
            'Confirm Deletion',
            { confirmClass: 'btn-danger', confirmText: 'Delete' }
        );
        if (confirmed) {
            const resp = await this.model.destroy();
            if (resp.success) {
                this.emit('log:deleted', { model: this.model });
            }
        }
    }
}

Log.VIEW_CLASS = LogView;

export default LogView;
