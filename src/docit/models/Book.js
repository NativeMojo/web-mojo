import Model from '../../core/Model.js';
import Collection from '../../core/Collection.js';

export class DocitBook extends Model {
    static endpoint = '/api/docit/book';
}

export class DocitBookList extends Collection {
    constructor(options = {}) {
        super(DocitBook, { ...options, endpoint: '/api/docit/book' });
    }
}