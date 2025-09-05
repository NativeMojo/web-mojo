import Model from '../../core/Model.js';
import Collection from '../../core/Collection.js';

/**
 * DocitPage - Model for documentation pages.
 * Handles fetching page data by ID or slug.
 */
export class DocitPage extends Model {
    static endpoint = '/api/docit/page';

    buildUrl(id = null) {
        if (this.get('slug') && !this.id) {
            return `/api/docit/page/slug/${this.get('slug')}`;
        } else if (this.id) {
            return `/api/docit/page/${this.id}`;
        }
        return this.endpoint;
    }
}

/**
 * DocitPageList - Collection of documentation pages.
 */
export class DocitPageList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: DocitPage,
            endpoint: '/api/docit/page',
            ...options
        });
    }

    /**
     * Custom parsing to handle the specific API response structure for page lists.
     */
    parse(response) {
        if (response.data && response.data.status) {
            this.meta = {
                ...this.meta,
                total: response.data.count || 0,
                graph: response.data.graph,
                book: response.data.book
            };
            return response.data.data || [];
        }
        return super.parse(response);
    }
}

export default DocitPage;
