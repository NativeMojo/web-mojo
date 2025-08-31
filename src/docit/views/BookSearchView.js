
import View from '../../core/View.js';
import { DocitBookList, DocitBook } from '../models/Book.js';
import SimpleSearchView from '../../components/SimpleSearchView.js';
import Dialog from '../../components/Dialog.js';

class BookSearchView extends SimpleSearchView {
    constructor(options = {}) {
        const headerTemplate = `
            <div class="d-flex justify-content-between align-items-center">
                <span>Documentation Books</span>
                <button class="btn btn-sm btn-primary" data-action="new-book">
                    <i class="bi bi-plus-circle"></i> New
                </button>
            </div>
        `;

        super({
            headerText: headerTemplate,
            showExitButton: false,
            Collection: DocitBookList,
            headerIcon: null,
            itemTemplate: `
                <div class="p-3 border-bottom">
                    <div class="fw-semibold text-dark">{{title}}</div>
                    <small class="text-muted">{{description}}</small>
                </div>
            `,
            ...options
        });
    }

    async onActionNewBook() {
        const data = await Dialog.showForm({
            title: 'Create New Book',
            fields: [
                { name: 'title', label: 'Title', type: 'text', required: true },
                { name: 'description', label: 'Description', type: 'textarea' }
            ],
            submitText: 'Create Book'
        });

        if (data) {
            const newBook = new DocitBook(data);
            const response = await newBook.save(newBook.attributes);

            if (response.success) {
                this.getApp().toast.showSuccess('Book created successfully!');
                // Refresh the list to show the new book
                this.collection.fetch();
            } else {
                this.getApp().toast.showError('Failed to create book.');
                console.error('Failed to save book:', response);
            }
        }
    }
}

export default BookSearchView;
