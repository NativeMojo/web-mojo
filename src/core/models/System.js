import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/* =========================
 * GeoLocatedIP
 * ========================= */

const GeoIPForms = {
    editLocation: {
        title: 'Edit Location',
        size: 'lg',
        fields: [
            { name: 'ip_address', label: 'IP Address', type: 'text', required: true, readonly: true, cols: 6 },
            { name: 'subnet', label: 'Subnet', type: 'text', cols: 6 },
            { name: 'country_name', label: 'Country', type: 'text', cols: 6 },
            { name: 'country_code', label: 'Country Code', type: 'text', cols: 6 },
            { name: 'region', label: 'Region', type: 'text', cols: 6 },
            { name: 'city', label: 'City', type: 'text', cols: 6 },
            { name: 'postal_code', label: 'Postal Code', type: 'text', cols: 6 },
            { name: 'timezone', label: 'Timezone', type: 'text', cols: 6 },
            { name: 'latitude', label: 'Latitude', type: 'number', step: 'any', cols: 6 },
            { name: 'longitude', label: 'Longitude', type: 'number', step: 'any', cols: 6 },
        ]
    },
    editSecurity: {
        title: 'Edit Security',
        size: 'md',
        fields: [
            { 
                name: 'threat_level', 
                label: 'Threat Level', 
                type: 'select', 
                cols: 12,
                options: [
                    { value: '', label: 'None' },
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'critical', label: 'Critical' }
                ]
            },
            { name: 'is_threat', label: 'Threat', type: 'switch', cols: 6 },
            { name: 'is_suspicious', label: 'Suspicious', type: 'switch', cols: 6 },
            { name: 'is_known_attacker', label: 'Known Attacker', type: 'switch', cols: 6 },
            { name: 'is_known_abuser', label: 'Known Abuser', type: 'switch', cols: 6 },
            { name: 'risk_score', label: 'Risk Score', type: 'number', cols: 6 },
            { name: 'is_tor', label: 'TOR Exit Node', type: 'switch', cols: 6 },
            { name: 'is_vpn', label: 'VPN', type: 'switch', cols: 6 },
            { name: 'is_proxy', label: 'Proxy', type: 'switch', cols: 6 },
            { name: 'is_cloud', label: 'Cloud Provider', type: 'switch', cols: 6 },
            { name: 'is_datacenter', label: 'Datacenter', type: 'switch', cols: 6 }
        ]
    },
    editNetwork: {
        title: 'Edit Network',
        size: 'md',
        fields: [
            { name: 'asn', label: 'ASN', type: 'text', cols: 6 },
            { name: 'asn_org', label: 'ASN Organization', type: 'text', cols: 6 },
            { name: 'isp', label: 'ISP', type: 'text', cols: 12 },
            { name: 'connection_type', label: 'Connection Type', type: 'text', cols: 6 },
            { name: 'provider', label: 'Provider', type: 'text', cols: 6 },
            { name: 'is_mobile', label: 'Mobile Connection', type: 'switch', cols: 6 },
            { name: 'mobile_carrier', label: 'Mobile Carrier', type: 'text', cols: 6 },
            { name: 'last_seen', label: 'Last Seen', type: 'datetime', cols: 12 }
        ]
    }
};

class GeoLocatedIP extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/system/geoip',
        });
    }

    static async lookup(ip) {
        const model = new GeoLocatedIP();
        const resp = await model.rest.GET('/api/system/geoip/lookup', { ip });
        if (resp.success && resp.data && resp.data.data) {
            return new GeoLocatedIP(resp.data.data);
        }
        return null;
    }
}

// Attach forms to model (use Location as default EDIT_FORM for TableView)
GeoLocatedIP.EDIT_FORM = GeoIPForms.editLocation;
GeoLocatedIP.EDIT_LOCATION_FORM = GeoIPForms.editLocation;
GeoLocatedIP.EDIT_SECURITY_FORM = GeoIPForms.editSecurity;
GeoLocatedIP.EDIT_NETWORK_FORM = GeoIPForms.editNetwork;

class GeoLocatedIPList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: GeoLocatedIP,
            endpoint: '/api/system/geoip',
            ...options,
        });
    }
}

export { GeoLocatedIP, GeoLocatedIPList };
