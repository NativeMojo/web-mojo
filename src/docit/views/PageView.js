import View from '../../core/View.js';
import { DocitPage } from '../models/Page.js';

class PageView extends View {
    constructor(options = {}) {
        super(options);
        this.model = new DocitPage();
    }

    getTemplate() {
        return `
            <div class="container-fluid p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h1>{{model.title}}</h1>
                    <button class="btn btn-outline-primary" data-action="edit-page">Edit</button>
                </div>
                <div class="docit-page-content">
                    {{{content}}}
                </div>
            </div>
        `;
    }

    async load(pageId) {
        this.model.id = pageId;
        // Assuming the API returns rendered HTML in the 'content' field
        await this.model.fetch();
        this.render();
    }

    getData() {
        return {
            model: this.model.toJSON(),
            content: this.model.get('content') || ''
        };
    }

    onActionEditPage() {
        // Note: The editor will still need the raw Markdown.
        // We may need to adjust how we fetch content for editing vs. viewing.
        // For now, this will emit the page model which contains the HTML content.
        this.emit('edit', this.model);
    }
}

export default PageView;
