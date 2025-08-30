import View from '../../core/View.js';
import { DocitPageList, DocitPage } from '../models/Page.js';
import Dialog from '../../components/Dialog.js';

class PageListView extends View {
    constructor(options = {}) {
        super(options);
        this.collection = new DocitPageList();
        this.book = null;
    }

    getTemplate() {
        return `
            <div class="p-3 border-bottom">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <button class="btn btn-sm btn-outline-secondary" data-action="back-to-books">
                        <i class="bi bi-arrow-left"></i> All Books
                    </button>
                    <h5 class="mb-0 text-end text-truncate" style="max-width: 150px;">{{book.title}}</h5>
                </div>
                <div class="d-grid">
                    <button class="btn btn-sm btn-primary" data-action="new-page">
                        <i class="bi bi-plus-circle"></i> New Page
                    </button>
                </div>
            </div>
            <div class="list-group list-group-flush">
                {{#each models}}
                    <a href="#/docit/page/{{id}}" class="list-group-item list-group-item-action">
                        {{title}}
                    </a>
                {{/each}}
            </div>
        `;
    }

    get models() {
        return this.collection.toJSON();
    }

    async setBook(book) {
        this.book = book.attributes;
        if (!book) {
            this.collection.reset();
            return this.render();
        }
        await this.collection.fetch({ book: book.id });
        this.render();
    }

    onActionBackToBooks() {
        this.emit('back-to-books');
    }

    async onActionNewPage() {
        const data = await Dialog.showForm({
            title: 'Create New Page',
            fields: [
                { name: 'title', label: 'Title', type: 'text', required: true }
            ],
            submitText: 'Create and Edit Page'
        });

        if (data) {
            const newPage = new DocitPage({
                title: data.title,
                book: this.book.id,
                content: '# New Page\n\nStart writing your content here.' // Default content
            });

            const response = await newPage.save(newPage.attributes);

            if (response.success) {
                this.getApp().toast.success('Page created successfully!');
                // Refresh the list
                this.collection.add(response.data.data, { merge: true });
                this.render();
                // Emit an event to tell the main page to open the editor for the new page
                this.emit('edit-page', newPage);
            } else {
                this.getApp().toast.error('Failed to create page.');
                console.error('Failed to save page:', response);
            }
        }
    }
}

export default PageListView;
