/**
 * DocNavSidebar - Navigation sidebar for DocIt documentation portal.
 * This view is reactive and relies on the parent DocItApp for state management.
 */

import View from '../../core/View.js';

class DocNavSidebar extends View {
    constructor(options = {}) {
        super({
            className: 'docit-sidebar-nav',
            tagName: 'nav',
            ...options
        });

        this.singleBookMode = options.singleBookMode || false;
        this.books = options.books;
        this.docPages = options.docPages;
        this.activeUser = options.activeUser;
        this.currentBook = null;
        this.currentDocPage = null;
    }

    async onInit() {
        await super.onInit();
        this.getApp().events.on('page:show', this._onPageShow.bind(this));
    }

    async _onPageShow({ query }) {
        const bookSlug = query.doc_book;
        const pageSlug = query.doc_page;
        const app = this.getApp();

        if (bookSlug) {
            const book = this.books.findWhere({ slug: bookSlug });
            if (book && (!this.currentBook || this.currentBook.id !== book.id)) {
                await app.setActiveBook(book);
                this.currentBook = app.currentBook;
            }
        } else {
            if (this.currentBook) {
                 await app.setActiveBook(null);
                 this.currentBook = null;
            }
        }

        this.currentDocPage = pageSlug ? this.docPages.findWhere({ slug: pageSlug }) : null;
        this.render();
    }

    getTemplate() {
        return `
            <div class="docit-nav-body pt-3">
                {{#currentBook}}
                    {{#docPages.models}}
                    <a href="#" class="docit-page-link {{#isActive}}active{{/isActive}}"
                       data-action="select-page" data-page-slug="{{slug}}">
                        <i class="{{#metadata.icon}}{{metadata.icon}}{{/metadata.icon}}{{^metadata.icon}}bi bi-file-earmark-text{{/metadata.icon}} me-2"></i>
                        <span>{{title|capitalize}}</span>
                    </a>
                    {{/docPages.models}}
                    {{^docPages.models}}
                    <div class="docit-nav-empty"><p>No pages in this book.</p></div>
                    {{/docPages.models}}
                {{/currentBook}}
                {{^currentBook}}
                    {{#books.models}}
                    <a href="#" class="docit-book-item" data-action="select-book" data-book-slug="{{slug}}">
                        <i class="bi bi-book me-2"></i>
                        <span class="book-title">{{title}}</span>
                        <span class="badge bg-secondary ms-auto">{{page_count}}</span>
                    </a>
                    {{/books.models}}
                {{/currentBook}}
            </div>
            {{#currentBook}}
            <div class="docit-nav-footer">
                {{#canEdit}}
                <button class="btn btn-link w-100 mb-2" data-action="create-page">
                    <i class="bi bi-plus-circle me-2"></i>
                    Create New Page
                </button>
                {{/canEdit}}
                <button class="btn btn-link w-100" data-action="back-to-books">
                    <i class="bi bi-arrow-left me-2"></i>
                    Back to Books
                </button>
            </div>
            {{/currentBook}}
            {{^currentBook}}
                {{#canEdit}}
                <div class="docit-nav-footer">
                    <button class="btn btn-link w-100" data-action="create-book">
                        <i class="bi bi-plus-circle me-2"></i>
                        Create New Book
                    </button>
                </div>
                {{/canEdit}}
            {{/currentBook}}
        `;
    }

    async onBeforeRender() {
        await super.onBeforeRender();
        this.canEdit = this.getApp().canEdit();
        if (this.docPages && this.currentDocPage) {
            this.docPages.forEach(page => {
                page.isActive = (page.id === this.currentDocPage.id);
            });
        }
    }

    async onActionSelectBook(event, element) {
        event.preventDefault();
        const bookSlug = element.dataset.bookSlug;
        const book = this.books.findWhere({ slug: bookSlug });
        if (book) {
            await this.getApp().setActiveBook(book);
            const firstPage = this.docPages.at(0);
            const query = { doc_book: book.get('slug') };
            if (firstPage) {
                query.doc_page = firstPage.get('slug');
            }
            this.getApp().showPage('docs', query, {});
        }
    }

    onActionSelectPage(event, element) {
        event.preventDefault();
        const pageSlug = element.dataset.pageSlug;
        if (this.currentBook && pageSlug) {
            this.getApp().showPage('docs', {
                doc_book: this.currentBook.get('slug'),
                doc_page: pageSlug
            }, {});
        }
    }

    async onActionBackToBooks(event, element) {
        event.preventDefault();
        await this.getApp().setActiveBook(null);
        this.getApp().showPage('home');
    }

    async onActionCreateBook() {
        await this.getApp().createNewBook();
    }

    async onActionCreatePage() {
        if (this.currentBook) {
            await this.getApp().createNewPage(this.currentBook);
        }
    }

    setBooks(books) { this.books = books; this.render(); }
    setDocPages(docPages) { this.docPages = docPages; this.render(); }
    setCurrentBook(book) {
        this.currentBook = book;
        this.render();
        if (this.getApp().topnav) {
            if (book) {
                this.getApp().topnav.setBrand(book.get("title"));
            } else {
                this.getApp().topnav.setBrand("Documentation");
            }

        }
    }
    setUser(user) { this.activeUser = user; this.render(); }
}

export default DocNavSidebar;
