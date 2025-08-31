/**
 * GeoIPView - Detailed view for a GeoLocatedIP record
 */

import View from '../../core/View.js';
import DataView from '../../views/data/DataView.js';
import ContextMenu from '../../views/feedback/ContextMenu.js';
import { GeoLocatedIP } from '../../models/System.js';
import Dialog from '../../core/Dialog.js';

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

                <!-- Body -->
                <div data-container="geoip-data-view"></div>
            </div>
        `;
    }

    async onInit() {
        // DataView for all details
        this.dataView = new DataView({
            containerId: 'geoip-data-view',
            model: this.model,
            className: "p-3 border rounded",
            showEmptyValues: true,
            emptyValueText: '—',
            columns: 2,
            fields: [
                { name: 'id', label: 'ID' },
                { name: 'subnet', label: 'Subnet' },
                { name: 'country_code', label: 'Country Code' },
                { name: 'region', label: 'Region' },
                { name: 'city', label: 'City' },
                { name: 'postal_code', label: 'Postal Code' },
                { name: 'latitude', label: 'Latitude' },
                { name: 'longitude', label: 'Longitude' },
                { name: 'timezone', label: 'Timezone' },
                { name: 'created', label: 'Created', format: 'datetime' },
                { name: 'modified', label: 'Last Modified', format: 'datetime' },
                { name: 'expires_at', label: 'Expires', format: 'datetime' },
            ]
        });
        this.addChild(this.dataView);

        // ContextMenu
        const menuItems = [
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

    async onActionRefreshGeoip() {
        // Placeholder for refresh logic, e.g., a POST request to a refresh endpoint
        console.log("Refreshing GeoIP for:", this.model.get('ip_address'));
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
