import Model from '../../core/Model.js';
import Collection from '../../core/Collection.js';

export class DocitPage extends Model {
    static endpoint = '/api/docit/page';
}

export class DocitPageList extends Collection {
    constructor(options = {}) {
        super(DocitPage, { ...options, endpoint: '/api/docit/page' });
    }
}