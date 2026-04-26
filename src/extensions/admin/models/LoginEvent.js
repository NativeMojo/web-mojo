/**
 * LoginEvent - Model for login event records with geolocation data
 * Used for login location maps and anomaly detection in admin portals.
 *
 * API: GET /api/account/logins
 * Permissions: manage_users + security + users
 */

import Model from '@core/Model.js';
import Collection from '@core/Collection.js';

class LoginEvent extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/account/logins',
        });
    }
}

class LoginEventList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: LoginEvent,
            endpoint: '/api/account/logins',
            ...options,
        });
    }
}

export { LoginEvent, LoginEventList };
