import Page from '../core/Page.js';
import Dialog from '../components/Dialog.js';
import BookSearchView from './views/BookSearchView.js';
import PageListView from './views/PageListView.js';
import PageView from './views/PageView.js';
import EditorView from './views/EditorView.js';

class DocitPage extends Page {
    getTemplate() {
        return `<div id="docit-content-container" class="flex-grow-1 h-100"></div>`;
    }

    constructor(options = {}) {
        super(options);

        this.bookSearchView = new BookSearchView({ app: this.getApp() });
        this.pageListView = new PageListView({ app: this.getApp() });
        this.pageView = new PageView({
            containerId: 'docit-content-container',
            app: this.getApp()
        });
        this.editorView = new EditorView({ app: this.getApp() });

        this.originalSidebarMenu = null;
    }

    async onInit() {
        this.addChild(this.pageView);

        this.bookSearchView.on('item:selected', this.onBookSelected, this);
        this.pageListView.on('back-to-books', this.showBookSearch, this);
        this.pageListView.on('edit-page', this.onEditPage, this);
        this.pageView.on('edit', this.onEditPage, this);
        this.editorView.on('save', this.onSavePage, this);
        this.editorView.on('cancel', this.onCancelEdit, this);
    }

    async onEnter() {
        await super.onEnter();
        const sidebar = this.getApp()?.sidebar;
        if (sidebar) {
            this.originalSidebarMenu = sidebar.activeMenuName;
            this.showBookSearch(); // Show book list by default
        }
    }

    async onExit() {
        await super.onExit();
        const sidebar = this.getApp()?.sidebar;
        if (sidebar) {
            sidebar.clearCustomView();
            if (this.originalSidebarMenu) {
                sidebar.setActiveMenu(this.originalSidebarMenu);
            }
        }
    }

    showBookSearch() {
        this.getApp().sidebar.setCustomView(this.bookSearchView);
    }

    onBookSelected(evt) {
        const book = evt.model;
        this.pageListView.setBook(book);
        this.getApp().sidebar.setCustomView(this.pageListView);
    }

    onEditPage(page) {
        this.editorView.load(page);
        Dialog.showDialog({
            title: 'Edit Page',
            view: this.editorView,
            size: 'xl',
        })
    }

    async onSavePage(page) {
        const response = await page.save(page.attributes);
        if (response.success) {
            this.editorDialog.hide();
            this.pageView.render();
        } else {
            console.error("Failed to save page:", response);
        }
    }

    onCancelEdit() {
        this.editorDialog.hide();
    }

    async onRoute(route) {
        if (route.parts[1] === 'page' && route.parts[2]) {
            await this.pageView.load(route.parts[2]);
        }
    }
}

export default DocitPage;
