/**
 * GeoIPView - Detailed view for a GeoLocatedIP record
 */

import View from '@core/View.js';
import SideNavView from '@core/views/navigation/SideNavView.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import MapView from '@ext/map/MapView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { GeoLocatedIP } from '@core/models/System.js';
import { IncidentEventList } from '@ext/admin/models/Incident.js';
import { LogList } from '@core/models/Log.js';
import Dialog from '@core/views/feedback/Dialog.js';

class GeoIPView extends View {
    constructor(options = {}) {
        super({
            className: 'geoip-view',
            ...options
        });

        this.model = options.model || new GeoLocatedIP(options.data || {});
        this.hasCoordinates = this.model.get('latitude') && this.model.get('longitude');

        this.template = `
            <div class="geoip-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <!-- Left Side: Icon & Info -->
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 text-primary">
                            <i class="bi bi-globe-americas"></i>
                        </div>
                        <div>
                            <h3 class="mb-1">{{model.ip_address}}</h3>
                            <div class="text-muted small">
                                {{model.city|default('Unknown Location')}}, {{model.country_name|default('Unknown Location')}}
                            </div>
                            <div class="text-muted small mt-1">
                                ISP: {{model.isp|capitalize}}
                            </div>
                        </div>
                    </div>

                    <!-- Right Side: Risk Summary + Actions -->
                    <div class="d-flex align-items-start gap-4">
                        <!-- Risk summary -->
                        <div class="text-end">
                            <div class="d-flex align-items-baseline justify-content-end gap-2">
                                <span class="text-muted">Risk:</span>
                                <span class="fw-bold fs-4
                                    {{#model.is_threat}} text-danger {{/model.is_threat}}
                                    {{#model.is_suspicious}} text-warning {{/model.is_suspicious}}
                                    {{^model.is_threat}}{{^model.is_suspicious}} text-success {{/model.is_suspicious}}{{/model.is_threat}}
                                ">{{#model.threat_level}}{{model.threat_level|capitalize}}{{/model.threat_level}}{{^model.threat_level}}Unknown{{/model.threat_level}}</span>
                            </div>
                            <div class="mt-1 small d-flex align-items-center justify-content-end gap-2">
                                <span class="text-muted">Score:</span>
                                <span class="fw-semibold">{{model.risk_score|default('—')}}</span>
                            </div>
                            <div class="mt-1 d-flex align-items-center justify-content-end gap-2">
                                <i class="bi bi-shield-lock {{#model.is_tor}}fs-4 text-success{{/model.is_tor}}{{^model.is_tor}}text-muted{{/model.is_tor}}" data-bs-toggle="tooltip" title="TOR exit"></i>
                                <i class="bi bi-shield {{#model.is_vpn}}fs-4 text-success{{/model.is_vpn}}{{^model.is_vpn}}text-muted{{/model.is_vpn}}" data-bs-toggle="tooltip" title="VPN detected"></i>
                                <i class="bi bi-cloud {{#model.is_cloud}}fs-4 text-success{{/model.is_cloud}}{{^model.is_cloud}}text-muted{{/model.is_cloud}}" data-bs-toggle="tooltip" title="Cloud provider"></i>
                                <i class="bi bi-hdd-stack {{#model.is_datacenter}}fs-4 text-success{{/model.is_datacenter}}{{^model.is_datacenter}}text-muted{{/model.is_datacenter}}" data-bs-toggle="tooltip" title="Datacenter"></i>
                                <i class="bi bi-phone {{#model.is_mobile}}fs-4 text-success{{/model.is_mobile}}{{^model.is_mobile}}text-muted{{/model.is_mobile}}" data-bs-toggle="tooltip" title="Mobile connection"></i>
                                <i class="bi bi-diagram-3 {{#model.is_proxy}}fs-4 text-success{{/model.is_proxy}}{{^model.is_proxy}}text-muted{{/model.is_proxy}}" data-bs-toggle="tooltip" title="Proxy"></i>
                            </div>
                        </div>
                        <!-- Actions: context menu aligned to top (not vertically centered) -->
                        <div class="d-flex align-items-start">
                            <div data-container="geoip-context-menu"></div>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div data-container="geoip-sidenav"></div>
            </div>
        `;
    }

    async onInit() {
        // Location section
        this.detailsView = new DataView({
            model: this.model,
            className: "p-3",
            showEmptyValues: true,
            emptyValueText: '—',
            columns: 2,
            fields: [
                { name: 'ip_address', label: 'IP Address', cols: 4 },
                { name: 'subnet', label: 'Subnet', cols: 4 },
                { name: 'country_name', label: 'Country', cols: 4 },
                { name: 'country_code', label: 'Country Code', cols: 4 },
                { name: 'region', label: 'Region', cols: 4 },
                { name: 'city', label: 'City', cols: 4 },
                { name: 'postal_code', label: 'Postal Code', cols: 4 },
                { name: 'timezone', label: 'Timezone', cols: 4 },
                { name: 'latitude', label: 'Latitude', cols: 4 },
                { name: 'longitude', label: 'Longitude', cols: 4 },
            ]
        });

        // Network section
        this.networkView = new DataView({
            model: this.model,
            className: "p-3",
            showEmptyValues: true,
            emptyValueText: '—',
            columns: 2,
            fields: [
                { name: 'is_tor', label: 'TOR Exit Node', formatter: 'yesnoicon', cols: 4 },
                { name: 'is_vpn', label: 'VPN', formatter: 'yesnoicon', cols: 4 },
                { name: 'is_proxy', label: 'Proxy', formatter: 'yesnoicon', cols: 4 },
                { name: 'is_cloud', label: 'Cloud Provider', formatter: 'yesnoicon', cols: 4 },
                { name: 'is_datacenter', label: 'Datacenter', formatter: 'yesnoicon', cols: 4 },
                { name: 'is_mobile', label: 'Mobile', formatter: 'yesnoicon', cols: 4 },
                { name: 'mobile_carrier', label: 'Mobile Carrier', cols: 8 },
                { name: 'asn', label: 'ASN', cols: 4 },
                { name: 'asn_org', label: 'ASN Organization', cols: 8 },
                { name: 'isp', label: 'ISP', cols: 12 },
                { name: 'connection_type', label: 'Connection Type', cols: 6 }
            ]
        });

        // Risk & Reputation section
        this.riskView = new DataView({
            model: this.model,
            className: "p-3",
            showEmptyValues: true,
            emptyValueText: '—',
            columns: 2,
            fields: [
                { name: 'threat_level', label: 'Threat Level', formatter: 'capitalize', cols: 6 },
                { name: 'risk_score', label: 'Risk Score', cols: 6 },
                { name: 'is_threat', label: 'Threat', formatter: 'yesnoicon', cols: 6 },
                { name: 'is_suspicious', label: 'Suspicious', formatter: 'yesnoicon', cols: 6 },
                { name: 'is_known_attacker', label: 'Known Attacker', formatter: 'yesnoicon', cols: 6 },
                { name: 'is_known_abuser', label: 'Known Abuser', formatter: 'yesnoicon', cols: 6 }
            ]
        });

        // Block & Whitelist section
        this.blockView = new DataView({
            model: this.model,
            className: "p-3",
            showEmptyValues: false,
            emptyValueText: '—',
            columns: 2,
            fields: [
                { name: 'is_blocked', label: 'Blocked', formatter: 'yesnoicon', cols: 6 },
                { name: 'block_count', label: 'Block Count', cols: 6 },
                { name: 'blocked_reason', label: 'Block Reason', cols: 12 },
                { name: 'blocked_at', label: 'Blocked At', formatter: 'datetime', cols: 6 },
                { name: 'blocked_until', label: 'Blocked Until', formatter: 'datetime', cols: 6 },
                { name: 'is_whitelisted', label: 'Whitelisted', formatter: 'yesnoicon', cols: 6 },
                { name: 'whitelisted_reason', label: 'Whitelist Reason', cols: 6 }
            ]
        });

        // Metadata section
        this.metadataView = new DataView({
            model: this.model,
            className: "p-3",
            showEmptyValues: true,
            emptyValueText: '—',
            columns: 2,
            fields: [
                { name: 'id', label: 'Record ID', cols: 6 },
                { name: 'provider', label: 'Data Provider', formatter: 'capitalize', cols: 6 },
                { name: 'created', label: 'Created', formatter: 'datetime', cols: 6 },
                { name: 'modified', label: 'Last Modified', formatter: 'datetime', cols: 6 },
                { name: 'last_seen', label: 'Last Seen', formatter: 'datetime', cols: 6 },
                { name: 'expires_at', label: 'Expires', formatter: 'datetime', cols: 6 }
            ]
        });

        // Events section
        const eventsCollection = new IncidentEventList({
            params: {
                size: 5,
                source_ip: this.model.get("ip_address")
            }
        });
        this.eventsView = new TableView({
            collection: eventsCollection,
            hideActivePillNames: ['source_ip'],
            columns: [
                { key: 'id', label: 'ID', sortable: true, width: '40px' },
                { key: 'created', label: 'Date', formatter: 'datetime', sortable: true, width: '150px' },
                { key: 'category|badge', label: 'Category' },
                { key: 'title', label: 'Title' }
            ]
        });

        // Traffic section — request logs from this IP
        const trafficCollection = new LogList({
            params: {
                size: 5,
                ip: this.model.get('ip_address')
            }
        });
        this.trafficView = new TableView({
            collection: trafficCollection,
            permissions: 'view_logs',
            hideActivePillNames: ['ip'],
            columns: [
                {
                    key: 'created',
                    label: 'Timestamp',
                    sortable: true,
                    formatter: "epoch|datetime",
                    filter: {
                        name: "created",
                        type: 'daterange',
                        startName: 'dr_start',
                        endName: 'dr_end',
                        fieldName: 'dr_field',
                        label: 'Date Range',
                        format: 'YYYY-MM-DD',
                        displayFormat: 'MMM DD, YYYY',
                        separator: ' to '
                    }
                },
                {
                    key: 'level',
                    label: 'Level',
                    sortable: true,
                    filter: {
                        type: 'select',
                        options: [
                            { value: 'info', label: 'Info' },
                            { value: 'warning', label: 'Warning' },
                            { value: 'error', label: 'Error' }
                        ]
                    }
                },
                { key: 'kind', label: 'Kind', filter: { type: 'text' } },
                { name: 'log', label: 'Log' }
            ]
        });

        // Logs section — audit logs for this GeoIP record
        const logsCollection = new LogList({
            params: {
                size: 5,
                model_name: 'account.GeoLocatedIP',
                model_id: this.model.get('id')
            }
        });
        this.logsView = new TableView({
            collection: logsCollection,
            permissions: 'view_logs',
            hideActivePillNames: ['model_name', 'model_id'],
            columns: [
                {
                    key: 'created',
                    label: 'Timestamp',
                    sortable: true,
                    formatter: "epoch|datetime"
                },
                {
                    key: 'level',
                    label: 'Level',
                    sortable: true,
                    filter: {
                        type: 'select',
                        options: [
                            { value: 'info', label: 'Info' },
                            { value: 'warning', label: 'Warning' },
                            { value: 'error', label: 'Error' }
                        ]
                    }
                },
                { key: 'kind', label: 'Kind', filter: { type: 'text' } },
                { name: 'log', label: 'Log' }
            ]
        });

        // Build sections
        const sections = [];

        // Add Map section if coordinates exist
        if (this.hasCoordinates) {
            const lat = this.model.get('latitude');
            const lng = this.model.get('longitude');
            const city = this.model.get('city') || 'Unknown';
            const region = this.model.get('region') || '';
            const country = this.model.get('country_name') || '';
            const locationStr = [city, region, country].filter(Boolean).join(', ');

            this.mapView = new MapView({
                markers: [{
                    lat: lat,
                    lng: lng,
                    popup: `<strong>${this.model.get('ip_address')}</strong><br>${locationStr}`
                }],
                tileLayer: "light",
                zoom: 4,
                height: 450
            });
            sections.push({ key: 'map', label: 'Map', icon: 'bi-map', view: this.mapView });
        }

        sections.push(
            { key: 'location', label: 'Location', icon: 'bi-geo-alt', view: this.detailsView },
            { key: 'network', label: 'Network', icon: 'bi-diagram-3', view: this.networkView },
            { key: 'risk', label: 'Risk & Reputation', icon: 'bi-shield-exclamation', view: this.riskView },
            { key: 'block', label: 'Block & Whitelist', icon: 'bi-slash-circle', view: this.blockView },
            { type: 'divider', label: 'Activity' },
            { key: 'events', label: 'Events', icon: 'bi-calendar-event', view: this.eventsView },
            { key: 'traffic', label: 'Traffic', icon: 'bi-arrow-left-right', view: this.trafficView, permissions: 'view_logs' },
            { key: 'logs', label: 'Logs', icon: 'bi-journal-text', view: this.logsView, permissions: 'view_logs' },
            { type: 'divider', label: 'Record' },
            { key: 'metadata', label: 'Metadata', icon: 'bi-braces', view: this.metadataView }
        );

        this.sideNavView = new SideNavView({
            containerId: 'geoip-sidenav',
            activeSection: this.hasCoordinates ? 'map' : 'location',
            navWidth: 180,
            contentPadding: '1.25rem 2rem',
            enableResponsive: true,
            minWidth: 500,
            sections
        });
        this.addChild(this.sideNavView);

        // ContextMenu
        const menuItems = [
            { label: 'Edit Location', action: 'edit-location', icon: 'bi-geo-alt' },
            { label: 'Edit Security', action: 'edit-security', icon: 'bi-shield-lock' },
            { label: 'Edit Network', action: 'edit-network', icon: 'bi-diagram-3' },
            { type: 'divider' },
            { label: 'Refresh Geolocation', action: 'refresh-geoip', icon: 'bi-arrow-clockwise' },
        ];

        if (this.hasCoordinates) {
            menuItems.push({
                label: 'View on Map',
                action: 'view-on-map',
                icon: 'bi-map'
            });
        }

        // Firewall actions
        menuItems.push(
            { type: 'divider' },
            { label: 'Block IP', action: 'block-ip', icon: 'bi-slash-circle', class: 'text-danger' },
            { label: 'Unblock IP', action: 'unblock-ip', icon: 'bi-unlock', class: 'text-success' },
            { label: 'Whitelist IP', action: 'whitelist-ip', icon: 'bi-check-circle', class: 'text-primary' },
            { label: 'Remove Whitelist', action: 'unwhitelist-ip', icon: 'bi-x-circle' },
            { label: 'Refresh Threat Data', action: 'threat-analysis', icon: 'bi-shield-exclamation' }
        );

        menuItems.push(
            { type: 'divider' },
            { label: 'Delete Record', action: 'delete-geoip', icon: 'bi-trash', danger: true }
        );

        const geoIPMenu = new ContextMenu({
            containerId: 'geoip-context-menu',
            className: "context-menu-view header-menu-absolute",
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: menuItems
            }
        });
        this.addChild(geoIPMenu);
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Initialize Bootstrap tooltips for header icons/badges
        if (window.bootstrap && window.bootstrap.Tooltip && this.element) {
            const tooltipTriggerList = this.element.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltipTriggerList.forEach(el => {
                // Dispose any existing instance (in case of re-render)
                const existing = window.bootstrap.Tooltip.getInstance(el);
                if (existing && typeof existing.dispose === 'function') {
                    existing.dispose();
                }
                new window.bootstrap.Tooltip(el);
            });
        }
    }

    async onActionEditLocation() {
        const resp = await Dialog.showModelForm({
            title: `Edit Location - ${this.model.get('ip_address')}`,
            model: this.model,
            formConfig: GeoLocatedIP.EDIT_LOCATION_FORM,
        });

        if (resp) {
            await this.render();
            this.getApp()?.toast?.success('Location updated successfully');
        }
    }

    async onActionEditSecurity() {
        const resp = await Dialog.showModelForm({
            title: `Edit Security - ${this.model.get('ip_address')}`,
            model: this.model,
            formConfig: GeoLocatedIP.EDIT_SECURITY_FORM,
        });

        if (resp) {
            await this.render();
            this.getApp()?.toast?.success('Security settings updated successfully');
        }
    }

    async onActionEditNetwork() {
        const resp = await Dialog.showModelForm({
            title: `Edit Network - ${this.model.get('ip_address')}`,
            model: this.model,
            formConfig: GeoLocatedIP.EDIT_NETWORK_FORM,
        });

        if (resp) {
            await this.render();
            this.getApp()?.toast?.success('Network information updated successfully');
        }
    }

    async onActionRefreshGeoip() {
        // Placeholder for refresh logic, e.g., a POST request to a refresh endpoint
        await this.model.save({ refresh: true });
        this.getApp()?.toast?.info('Refresh request sent for ' + this.model.get('ip_address'));
    }

    async onActionBlockIp() {
        const data = await Dialog.showForm({
            title: 'Block IP',
            icon: 'bi-slash-circle',
            size: 'sm',
            fields: [
                { name: 'reason', type: 'text', label: 'Reason', required: true, placeholder: 'e.g., Suspicious activity' },
                {
                    name: 'ttl', type: 'select', label: 'Duration',
                    options: [
                        { value: 3600, label: '1 hour' },
                        { value: 21600, label: '6 hours' },
                        { value: 86400, label: '24 hours' },
                        { value: 604800, label: '7 days' },
                        { value: 2592000, label: '30 days' },
                        { value: 0, label: 'Permanent' }
                    ],
                    value: 86400
                }
            ]
        });
        if (!data) return true;

        const resp = await this.model.save({
            block: { reason: data.reason, ttl: parseInt(data.ttl) }
        });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('IP blocked successfully');
            await this.model.fetch();
        } else {
            this.getApp()?.toast?.error('Failed to block IP');
        }
        return true;
    }

    async onActionUnblockIp() {
        const data = await Dialog.showForm({
            title: 'Unblock IP',
            icon: 'bi-unlock',
            size: 'sm',
            fields: [
                { name: 'reason', type: 'text', label: 'Reason', placeholder: 'e.g., False positive' }
            ]
        });
        if (!data) return true;

        const resp = await this.model.save({
            unblock: data.reason || 'Unblocked from admin'
        });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('IP unblocked successfully');
            await this.model.fetch();
        } else {
            this.getApp()?.toast?.error('Failed to unblock IP');
        }
        return true;
    }

    async onActionWhitelistIp() {
        const data = await Dialog.showForm({
            title: 'Whitelist IP',
            icon: 'bi-check-circle',
            size: 'sm',
            fields: [
                { name: 'reason', type: 'text', label: 'Reason', required: true, placeholder: 'e.g., Known office IP' }
            ]
        });
        if (!data) return true;

        const resp = await this.model.save({
            whitelist: data.reason
        });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('IP whitelisted successfully');
            await this.model.fetch();
        } else {
            this.getApp()?.toast?.error('Failed to whitelist IP');
        }
        return true;
    }

    async onActionUnwhitelistIp() {
        const confirmed = await Dialog.confirm('Remove this IP from the whitelist?', 'Remove Whitelist');
        if (!confirmed) return true;

        const resp = await this.model.save({
            unwhitelist: 1
        });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('IP removed from whitelist');
            await this.model.fetch();
        } else {
            this.getApp()?.toast?.error('Failed to remove from whitelist');
        }
        return true;
    }

    async onActionThreatAnalysis(event, element) {
        try {
            if (element) element.disabled = true;
            const resp = await this.model.save({
                threat_analysis: 1
            });
            if (resp.success || resp.status === 200) {
                this.getApp()?.toast?.success('Threat data refreshed');
                await this.model.fetch();
            } else {
                this.getApp()?.toast?.error('Failed to refresh threat data');
            }
        } finally {
            if (element) element.disabled = false;
        }
        return true;
    }

    async onActionViewOnMap() {
        if (this.hasCoordinates) {
            const lat = this.model.get('latitude');
            const lon = this.model.get('longitude');
            const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
            window.open(url, '_blank');
        }
    }

    async onActionDeleteGeoip() {
        const confirmed = await Dialog.confirm(
            `Are you sure you want to delete the GeoIP record for "${this.model.get('ip_address')}"?`,
            'Confirm Deletion',
            { confirmClass: 'btn-danger', confirmText: 'Delete' }
        );
        if (confirmed) {
            const resp = await this.model.destroy();
            if (resp.success) {
                this.emit('geoip:deleted', { model: this.model });
            }
        }
    }

    static async show(ip) {
        const model = await GeoLocatedIP.lookup(ip);
        if (model) {
            const view = new GeoIPView({ model });
            const dialog = new Dialog({
                header: false,
                size: 'lg',
                body: view,
                buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
            });
            await dialog.render(true, document.body);
            dialog.show();
            return dialog;
        }
        Dialog.alert({ message: `Could not find geolocation data for IP: ${ip}`, type: 'warning' });
        return null;
    }
}

GeoLocatedIP.VIEW_CLASS = GeoIPView;

export default GeoIPView;
