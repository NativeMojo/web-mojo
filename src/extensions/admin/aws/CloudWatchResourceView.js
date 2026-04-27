/**
 * CloudWatchResourceView - Detailed metric view for a single AWS resource
 *
 * Shows all available metric categories for an EC2, RDS, or Redis resource
 * using CloudWatchChart (MetricsChart) instances in a responsive grid.
 * Each chart has its own granularity/date controls.
 * Can be opened in a Dialog via the static show() method.
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import CloudWatchChart from './CloudWatchChart.js';

const METRIC_CATEGORIES = {
    ec2: [
        { key: 'cpu',          label: 'CPU Utilization',  unit: '%' },
        { key: 'memory',       label: 'Memory Usage',     unit: '%' },
        { key: 'disk',         label: 'Disk Usage',       unit: '%' },
        { key: 'net_in',       label: 'Network In',       unit: 'bytes' },
        { key: 'net_out',      label: 'Network Out',      unit: 'bytes' },
        { key: 'disk_read',    label: 'Disk Read Ops',    unit: 'ops' },
        { key: 'disk_write',   label: 'Disk Write Ops',   unit: 'ops' },
        { key: 'status_check', label: 'Status Check',     unit: '' }
    ],
    rds: [
        { key: 'cpu',            label: 'CPU Utilization',   unit: '%' },
        { key: 'conns',          label: 'Active Connections', unit: '' },
        { key: 'free_storage',   label: 'Free Storage',      unit: 'bytes' },
        { key: 'free_memory',    label: 'Freeable Memory',   unit: 'bytes' },
        { key: 'read_iops',      label: 'Read IOPS',         unit: 'ops/s' },
        { key: 'write_iops',     label: 'Write IOPS',        unit: 'ops/s' },
        { key: 'read_latency',   label: 'Read Latency',      unit: 's' },
        { key: 'write_latency',  label: 'Write Latency',     unit: 's' },
        { key: 'net_in',         label: 'Network In',        unit: 'bytes' },
        { key: 'net_out',        label: 'Network Out',       unit: 'bytes' }
    ],
    redis: [
        { key: 'cpu',             label: 'CPU Utilization',    unit: '%' },
        { key: 'conns',           label: 'Current Connections', unit: '' },
        { key: 'cache_memory',    label: 'Cache Memory Used',  unit: 'bytes' },
        { key: 'cache_hits',      label: 'Cache Hits',         unit: '' },
        { key: 'cache_misses',    label: 'Cache Misses',       unit: '' },
        { key: 'replication_lag', label: 'Replication Lag',     unit: 's' },
        { key: 'net_in',          label: 'Network In',         unit: 'bytes' },
        { key: 'net_out',         label: 'Network Out',        unit: 'bytes' }
    ]
};

const TYPE_ICONS = { ec2: 'bi-pc-display', rds: 'bi-database', redis: 'bi-lightning-charge' };
const TYPE_LABELS = { ec2: 'EC2 Instance', rds: 'RDS Database', redis: 'ElastiCache Redis' };

function yAxisForUnit(unit) {
    if (unit === '%')     return { label: '%', beginAtZero: true, max: 100 };
    if (unit === 'bytes') return { label: 'Bytes', beginAtZero: true };
    if (unit === 's')     return { label: 'Seconds', beginAtZero: true };
    return { beginAtZero: true };
}

export default class CloudWatchResourceView extends View {
    constructor(options = {}) {
        super({
            className: 'cloudwatch-resource-view',
            ...options
        });

        this.resourceType = options.resourceType || 'ec2';
        this.slug = options.slug || '';
        this.resource = options.resource || {};
    }

    async getTemplate() {
        const categories = METRIC_CATEGORIES[this.resourceType] || [];
        const icon = TYPE_ICONS[this.resourceType] || 'bi-cloud';
        const typeLabel = TYPE_LABELS[this.resourceType] || 'Resource';

        const state = this.resource.state || this.resource.status || 'unknown';
        const metaItems = this._buildMetaItems();
        const metaHtml = metaItems.map(m => `<span class="me-3" style="font-size: 0.78rem; color: #6c757d;">${m}</span>`).join('');

        return `
            <style>
                .cwrv-header { padding: 1rem 0; border-bottom: 1px solid #e9ecef; margin-bottom: 1rem; }
                .cwrv-name { font-size: 1.15rem; font-weight: 700; }
                .cwrv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                @media (max-width: 768px) { .cwrv-grid { grid-template-columns: 1fr; } }
            </style>

            <div class="cwrv-header">
                <div class="cwrv-name">
                    <i class="bi ${icon} me-2"></i>${this.slug}
                    <span class="badge bg-secondary ms-2" style="font-size: 0.7rem;">${typeLabel}</span>
                </div>
                <div class="mt-1">${metaHtml}</div>
            </div>

            <div class="cwrv-grid">
                ${categories.map((_, i) => `<div id="cwrv-chart-${i}"></div>`).join('')}
            </div>
        `;
    }

    async onInit() {
        const categories = METRIC_CATEGORIES[this.resourceType] || [];

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const chart = new CloudWatchChart({
                containerId: `cwrv-chart-${i}`,
                account: this.resourceType,
                category: cat.key,
                slug: this.slug,
                title: cat.label,
                height: 200,
                yAxis: yAxisForUnit(cat.unit),
                showGranularity: true,
                showDateRange: false,
                defaultDateRange: '24h',
                granularity: 'hours'
            });
            this.addChild(chart);
        }
    }

    _buildMetaItems() {
        const r = this.resource;
        switch (this.resourceType) {
            case 'ec2':
                return [r.instance_type, r.private_ip, r.public_ip].filter(Boolean)
                    .map((v, i) => {
                        const icons = ['bi-cpu', 'bi-hdd-network', 'bi-globe'];
                        return `<i class="bi ${icons[i]} me-1"></i>${v}`;
                    });
            case 'rds':
                return [r.engine, r.instance_class].filter(Boolean)
                    .map((v, i) => {
                        const icons = ['bi-database', 'bi-cpu'];
                        return `<i class="bi ${icons[i]} me-1"></i>${v}`;
                    });
            case 'redis':
                return [r.engine, r.node_type, r.num_nodes ? `${r.num_nodes} node${r.num_nodes > 1 ? 's' : ''}` : ''].filter(Boolean)
                    .map((v, i) => {
                        const icons = ['bi-lightning', 'bi-cpu', 'bi-diagram-3'];
                        return `<i class="bi ${icons[i]} me-1"></i>${v}`;
                    });
            default:
                return [];
        }
    }

    static async show(resourceType, slug, resource = {}, options = {}) {
        const view = new CloudWatchResourceView({
            resourceType, slug, resource
        });

        const icon = TYPE_ICONS[resourceType] || 'bi-cloud';
        const typeLabel = TYPE_LABELS[resourceType] || 'Resource';

        await Modal.dialog(view, {
            header: `<i class="bi ${icon} me-2"></i>${slug} <small class="text-muted">— ${typeLabel}</small>`,
            size: 'xl',
            scrollable: true
        });
    }
}
