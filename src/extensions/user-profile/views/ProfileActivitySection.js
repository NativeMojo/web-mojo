/**
 * ProfileActivitySection - Activity log tab
 *
 * Uses TableView + LogList to show user activity
 * with parsed log messages, level badges, kind, path, and time.
 * Includes pagination, search, and level filtering.
 */
import View from '@core/View.js';
import TableView from '@core/views/table/TableView.js';
import TableRow from '@core/views/table/TableRow.js';
import { LogList } from '@core/models/Log.js';

class ActivityRow extends TableRow {
    get logMessage() {
        const log = this.model?.get('log');
        if (!log) return '';
        if (typeof log === 'string') {
            try {
                const parsed = JSON.parse(log);
                return parsed.message || parsed.type || log.substring(0, 120);
            } catch {
                return log.length > 120 ? log.substring(0, 120) + '…' : log;
            }
        }
        if (typeof log === 'object') {
            return log.message || log.type || JSON.stringify(log).substring(0, 120);
        }
        return String(log);
    }

    get levelText() {
        return this.model?.get('level') || 'log';
    }

    get levelBadgeClass() {
        const level = this.model?.get('level');
        if (level === 'error') return 'bg-danger';
        if (level === 'warn') return 'bg-warning text-dark';
        if (level === 'info') return 'bg-info';
        return 'bg-secondary';
    }

    get methodPath() {
        const method = this.model?.get('method') || '';
        const path = this.model?.get('path') || '';
        if (!method && !path) return '';
        return `${method} ${path}`.trim();
    }
}

export default class ProfileActivitySection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-activity-section',
            template: `<div id="activity-table"></div>`,
            ...options
        });
    }

    async onInit() {
        await super.onInit();
        this.tableView = new TableView({
            containerId: 'activity-table',
            collection: new LogList({ size: 10 }),
            defaultQuery: { uid: this.model.id, sort: '-created' },
            hideActivePillNames: ['uid', 'sort'],
            itemClass: ActivityRow,
            columns: [
                {
                    key: 'level',
                    label: 'Level',
                    sortable: true,
                    template: '<span class="badge {{levelBadgeClass}}">{{levelText}}</span>',
                    filter: { type: 'select', options: ['info', 'warn', 'error'] }
                },
                {
                    key: 'log',
                    label: 'Message',
                    template: '{{logMessage}}'
                },
                { key: 'kind', label: 'Kind', sortable: true, visibility: 'md' },
                {
                    key: 'path',
                    label: 'Path',
                    visibility: 'lg',
                    template: '{{methodPath}}'
                },
                { key: 'ip', label: 'IP', visibility: 'xl' },
                { key: 'created|relative', label: 'Time', sortable: true }
            ],
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,
            showAdd: false,
            showExport: false,
            tableOptions: {
                striped: false,
                hover: true,
                size: 'sm'
            },
            emptyMessage: 'No activity logs available'
        });
        this.addChild(this.tableView);
    }
}
