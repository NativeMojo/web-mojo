/**
 * GeoIPView - Detailed view for a GeoLocatedIP record
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import MapView from '@ext/map/MapView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { GeoLocatedIP } from '@core/models/System.js';
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
                                {{model.country_name|default('Unknown Location')}}
                            </div>
                            <div class="text-muted small mt-1">
                                Provider: {{model.provider|capitalize}}
                            </div>
                        </div>
                    </div>

                    <!-- Right Side: Actions -->
                    <div class="d-flex align-items-center gap-4">
                        <div data-container="geoip-context-menu"></div>
                    </div>
                </div>

                <!-- Tabs -->
                <div data-container="geoip-tabs"></div>
            </div>
        `;
    }

    async onInit() {
        // Location Details Tab
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

        // Security & Network Tab
        this.securityView = new DataView({
            model: this.model,
            className: "p-3",
            showEmptyValues: true,
            emptyValueText: '—',
            columns: 2,
            fields: [
                { name: 'threat_level', label: 'Threat Level', cols: 4 },
                { name: 'is_tor', label: 'TOR Exit Node', cols: 4 },
                { name: 'is_vpn', label: 'VPN', formatter: 'yesnoicon', cols: 4 },
                { name: 'is_proxy', label: 'Proxy', formatter: 'yesnoicon', cols: 4 },
                { name: 'is_cloud', label: 'Cloud Provider', formatter: 'yesnoicon', cols: 4 },
                { name: 'is_datacenter', label: 'Datacenter', formatter: 'yesnoicon', cols: 4 },
                { name: 'asn', label: 'ASN', cols: 4 },
                { name: 'asn_org', label: 'ASN Organization', cols: 4 },
                { name: 'isp', label: 'ISP', cols: 4 },
                { name: 'connection_type', label: 'Connection Type', cols: 6 },
            ]
        });

        // Metadata Tab
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
                { name: 'expires_at', label: 'Expires', formatter: 'datetime', cols: 12 },
            ]
        });

        const tabs = {
            'Location': this.detailsView,
            'Security': this.securityView,
            'Metadata': this.metadataView
        };

        // Add Map tab if coordinates exist
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
            tabs['Map'] = this.mapView;
        }

        this.tabView = new TabView({
            containerId: 'geoip-tabs',
            tabs: tabs,
            activeTab: this.hasCoordinates ? 'Map' : 'Location'
        });
        this.addChild(this.tabView);

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
