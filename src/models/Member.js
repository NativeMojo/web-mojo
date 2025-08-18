
import Collection from '../core/Collection.js';
import Model from '../core/Model.js';

/* =========================
 * Model
 * ========================= */
class Member extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/group/member',
        });
    }
}

/* =========================
 * Collection
 * ========================= */
class MemberList extends Collection {
    constructor(options = {}) {
        super(Member, {
            endpoint: '/api/group/member',
            size: 20,
            ...options,
        });
    }
}

export { Member, MemberList };
