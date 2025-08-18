
import Collection from '../core/Collection.js';
import Model from '../core/Model.js';

/* =========================
 * Model
 * ========================= */
class Log extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/logs',
        });
    }
}

/* =========================
 * Collection
 * ========================= */
class LogList extends Collection {
    constructor(options = {}) {
        super(Log, {
            endpoint: '/api/logs',
            size: 20,
            ...options,
        });
    }
}

export { Log, LogList };
