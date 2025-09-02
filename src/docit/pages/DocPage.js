/**
 * DocPage - Main documentation page viewer
 * Displays rendered HTML content from markdown pages. This page is URL-driven.
 */

import Page from '../../core/Page.js';
import ContextMenu from '../../views/feedback/ContextMenu.js';
import { DocitBook } from '../models/Book.js';
import { DocitPage } from '../models/Page.js';

class DocPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'docs',
            title: 'Documentation',
            className: 'docit-page',
            ...options
        });

        this.bookModel = null;
        this.model = null;
    }

    async onInit() {
        await super.onInit();
        this.pageContextMenu = new ContextMenu({
            config: this.getPageContextMenuConfig(),
            containerId: 'page-context-menu'
        });
        this.addChild(this.pageContextMenu);
    }

    getPageContextMenuConfig() {
        return {
            icon: 'bi-three-dots',
            buttonClass: 'btn btn-outline-secondary btn-sm',
            items: [
                { label: 'View History', action: 'view-history', icon: 'bi-clock-history' },
                { type: 'divider' },
                { label: 'Edit Page Content', action: 'edit-page', icon: 'bi-pencil' },
                { label: 'Edit Page Info', action: 'edit-page-info', icon: 'bi-list-ol' },
                { type: 'divider' },
                { label: 'Edit Book Info', action: 'edit-book', icon: 'bi-book' },
                { type: 'divider' },
                { label: 'Delete Page', action: 'delete-page', icon: 'bi-trash', danger: true },
            ]
        };
    }

    async getTemplate() {
        return `
            <div class="docit-page-container position-relative">
                {{#loading}}
                <div class="docit-loading">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                {{/loading}}

                {{^loading}}
                {{#model|bool}}
                <div class="docit-page-toolbar">
                <div class="row">
                    <div class="col d-flex justify-content-end">
                        <div data-container="page-context-menu"></div>
                    </div>
                </div>
                </div>
                <article class="docit-page-content">
                    {{{model.html}}}
                </article>

                <nav class="docit-page-nav">
                    {{#prevPage}}
                    <a href="#" class="docit-nav-prev" data-action="navigate-to-page" data-page-slug="{{slug}}">
                        <i class="bi bi-arrow-left"></i>
                        <div>
                            <small>Previous</small>
                            <span>{{title}}</span>
                        </div>
                    </a>
                    {{/prevPage}}
                    {{^prevPage}}
                    <div></div>
                    {{/prevPage}}

                    {{#nextPage}}
                    <a href="#" class="docit-nav-next" data-action="navigate-to-page" data-page-slug="{{slug}}">
                        <div>
                            <small>Next</small>
                            <span>{{title}}</span>
                        </div>
                        <i class="bi bi-arrow-right"></i>
                    </a>
                    {{/nextPage}}

                    <div class="my-3">
                        <span class="text-muted">Last updated: {{model.modified|datetime}}</span>
                    </div>
                </nav>
                {{/model|bool}}

                {{^model|bool}}
                <div class="docit-empty-state">
                    <i class="bi bi-file-earmark-text"></i>
                    <h3>Select a page</h3>
                    <p>Choose a page from the sidebar to view its content.</p>
                </div>
                {{/model|bool}}
                {{/loading}}
            </div>
        `;
    }

    async onParams(params = {}, query = {}) {
        await super.onParams(params, query);
        this.loading = true;
        await this.render();

        const app = this.getApp();
        const bookSlug = app.bookSlug || query.doc_book;
        const pageSlug = query.doc_page;

        if (!bookSlug) {
            setTimeout(() => {
                app.showPage('home');
            }, 100);
            return;
        }

        try {
            if (bookSlug) {
                if (!app.currentBook || app.currentBook.get('slug') !== bookSlug) {
                    const book = new DocitBook({ slug: bookSlug });
                    await book.fetch();
                    await app.setActiveBook(book);
                }
                this.bookModel = app.currentBook;

                if (pageSlug) {
                    this.model = new DocitPage({ slug: pageSlug });
                    await this.model.fetch({ graph: 'html' });
                } else {
                    const firstPage = app.docPages.at(0);
                    if (firstPage) {
                        this.model = new DocitPage({ id: firstPage.id });
                        await this.model.fetch({ graph: 'html' });
                    } else {
                        this.model = null;
                    }
                }
            } else {
                this.bookModel = null;
                this.model = null;
            }

            this.canEdit = app.canEdit();
            this.setupNavigation();

        } catch (error) {
            console.error('Failed to load page:', error);
            this.showError('Failed to load documentation page');
            this.model = null;
        } finally {
            this.loading = false;
            await this.render();
            app.events.emit('docit:page-rendered', {
                book: this.bookModel,
                page: this.model
            });
        }
    }

    setupNavigation() {
        if (!this.model) {
            this.prevPage = null;
            this.nextPage = null;
            return;
        }

        const app = this.getApp();
        const pages = app.docPages.models;
        const currentIndex = pages.findIndex(p => p.id === this.model.id);

        this.prevPage = currentIndex > 0 ? { slug: pages[currentIndex - 1].get('slug'), title: pages[currentIndex - 1].get('title') } : null;
        this.nextPage = currentIndex < pages.length - 1 ? { slug: pages[currentIndex + 1].get('slug'), title: pages[currentIndex + 1].get('title') } : null;
    }

    async onActionNavigateToPage(event, element) {
        event.preventDefault();
        const pageSlug = element.dataset.pageSlug;
        if (pageSlug) {
            this.getApp().showPage('docs', {}, {
                doc_book: this.bookModel.get('slug'),
                doc_page: pageSlug
            });
        }
    }

    async onActionEditPage(event, element) {
        event.preventDefault();
        if (this.model) {
            this.getApp().showPage('edit', {
                id: this.model.id,
                doc_book: this.bookModel.get('slug'),
                doc_page: this.model.get('slug')
            }, {});
        }
    }

    async onActionViewHistory(event, element) {
        this.showInfo('Revision history coming soon.');
    }

    async onActionEditPageInfo(event, element) {
        if (this.model) {
            this.getApp().showModelForm({
                model: this.model,
                fields: [
                    {label:"Title", name:"title", type: "text"},
                    {label:"Order Priority", name:"order_priority"},
                    {label:"Slug", name:"slug"}
                ]
            })
        }
    }

    async onActionEditBook(event, element) {
        if (this.model) {
            const book = this.getApp().sidebar.currentBook;
            if (!book) return;
            this.getApp().showModelForm({
                model: book,
                fields: [
                    {label:"Title", name:"title", type: "text"},
                    {label:"Order Priority", name:"order_priority"},
                    {label:"Slug", name:"slug"},
                    {label:"Is Active", name:"is_active", type:"switch"}
                ]
            })
        }
    }

    async onActionDeletePage(event, element) {
        if (!this.model) return;

        const confirmed = await this.getApp().showConfirm({
            title: 'Delete Page',
            body: `Are you sure you want to delete "${this.model.get('title')}"?`,
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            await this.model.destroy();
            this.showSuccess('Page deleted.');
            // Reload the book's pages and navigate to the first one
            await this.getApp().setActiveBook(this.bookModel);
            const firstPage = this.getApp().docPages.at(0);
            if (firstPage) {
                this.getApp().showPage('docs', {}, { doc_book: this.bookModel.get('slug'), doc_page: firstPage.get('slug') });
            } else {
                this.getApp().showPage('docs', {}, { doc_book: this.bookModel.get('slug') });
            }
        }
    }

    async onAfterRender() {
        await super.onAfterRender();
        if (typeof Prism !== 'undefined' && this.model) {
            Prism.highlightAll();
        }
    }
}

export default DocPage;
