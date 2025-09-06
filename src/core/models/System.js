import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/* =========================
 * GeoLocatedIP
 * ========================= */
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
