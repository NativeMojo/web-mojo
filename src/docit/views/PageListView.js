import View from '../../core/View.js';
import { DocitPageList, DocitPage } from '../models/Page.js';
import Dialog from '../../components/Dialog.js';

class PageListView extends View {
    constructor(options = {}) {
        super(options);
        this.collection = new DocitPageList();
        this.book = null;

        // Listen for changes to the collection and re-render
        this.collection.on('fetch:success', () => {
            console.log("Collection size:", this.collection.meta.size);
            this.render();
        });
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
                {{collection.meta.size}}
                {{#collection.models}}
                    <a href="#/docit/page/{{id}}" class="list-group-item list-group-item-action">
                        {{title}} - page
                    </a>
                {{/collection.models}}
            </div>
        `;
    }

    async setBook(book) {
        this.book = book.attributes;
        if (!book) {
            this.collection.reset();
            return; // No need to render, the 'reset' event will trigger it if listened for.
        }
        // The fetch will populate the collection, which will trigger the 'update' event.
        await this.collection.fetch({ book: book.id });
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
                this.getApp().toast.showSuccess('Page created successfully!');
                // The collection's 'add' will trigger the 'update' event, causing a re-render.
                this.collection.add(response.data.data, { merge: true });
                this.emit('edit-page', newPage);
            } else {
                this.getApp().toast.showError('Failed to create page.');
                console.error('Failed to save page:', response);
            }
        }
    }
}

export default PageListView;
