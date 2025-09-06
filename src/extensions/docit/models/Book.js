import Model from '@core/Model.js';
import Collection from '@core/Collection.js';

/**
 * DocitBook - Model for documentation books.
 * Handles fetching book data by ID or slug.
 */
export class DocitBook extends Model {
    static endpoint = '/api/docit/book';

    buildUrl(id = null) {
        if (this.get('slug') && !this.id) {
            return `/api/docit/book/slug/${this.get('slug')}`;
        } else if (this.id) {
            return `/api/docit/book/${this.id}`;
        }
        return this.endpoint;
    }
}

/**
 * DocitBookList - Collection of documentation books.
 */
export class DocitBookList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: DocitBook,
            endpoint: '/api/docit/book',
            ...options
        });
    }

    /**
     * Custom parsing to handle the specific API response structure for book lists.
     */
    parse(response) {
        if (response.data && response.data.status) {
            this.meta = {
                ...this.meta,
                total: response.data.count || 0,
                graph: response.data.graph
            };
            return response.data.data || [];
        }
        return super.parse(response);
    }
}

export default DocitBook;
