/**
 * DocEditPage - Markdown editor for documentation pages using TOAST UI Editor.
 */

import Page from '../../core/Page.js';
import { DocitPage } from '../models/Page.js';

class DocEditPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'edit',
            title: 'Edit Page',
            className: 'docit-edit-page',
            ...options
        });

        this.model = null;
        this.editor = null;
        this.isDirty = false;
    }

    async getTemplate() {
        return `
            <div class="docit-edit-container vh-100">
                {{#loading}}
                <div class="docit-loading"><div class="spinner-border"></div></div>
                {{/loading}}

                {{^loading}}{{#model}}
                <header class="docit-edit-header">
                    <div class="docit-edit-title-row">
                        <h2>Editing: {{model.title}}</h2>
                        <div class="docit-edit-actions">
                            <button class="btn btn-outline-secondary" data-action="cancel-edit">Cancel</button>
                            <button class="btn btn-success" data-action="save-page">
                                <i class="bi bi-check-lg"></i> Save Changes
                            </button>
                        </div>
                    </div>
                </header>
                <div class="docit-edit-body flex-grow-1">
                    <div id="editor"></div>
                </div>
                {{/model}}
                {{^model}}
                <div class="docit-error-state">
                    <h3>Page Not Found</h3>
                    <p>The page you're trying to edit could not be found.</p>
                    <button class="btn btn-primary" data-action="go-back">Go Back</button>
                </div>
                {{/model}}{{/loading}}
            </div>
        `;
    }

    async onParams(params = {}, query = {}) {
        await super.onParams(params, query);
        let model = null;
        if (query.id) {
            model = new DocitPage({ id: query.id });
        } else if (query.doc_page) {
            model = new DocitPage({ slug: query.doc_page });
        }
        this.model = model;
        if (this.model) {
            await this.model.fetch({ graph: 'detail' });
        }
    }

    initEditor() {
        if (this.editor || !this.element.querySelector('#editor')) return;

        this.editor = new toastui.Editor({
            el: this.element.querySelector('#editor'),
            height: '100%',
            initialEditType: 'markdown',
            previewStyle: 'tab',
            initialValue: this.model.get('content') || ''
        });

        this.editor.on('change', () => {
            this.isDirty = true;
        });
    }

    async onActionSavePage() {
        if (!this.model || !this.editor) return;

        this.saving = true;
        this.getApp().showLoading("saving...");
        try {
            const content = this.editor.getMarkdown();
            await this.model.save({ content });
            this.isDirty = false;
            this.getApp().toast.success('Page saved successfully.');
            this.getApp().showPage('docs', this.query);
        } catch (error) {
            console.error('Failed to save page:', error);
            this.getApp().toast.error('Failed to save page.');
        } finally {
            this.saving = false;
            this.getApp().hideLoading();
        }
    }

    async onActionCancelEdit() {
        this.getApp().showPage('docs', this.query);
    }

    onActionGoBack() {
        this.getApp().showPage('docs');
    }

    async onBeforeRender() {
        await super.onBeforeRender();
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
    }

    async onAfterRender() {
        await super.onAfterRender();
        if (this.model) {
            this.initEditor();
        }
    }

    async onBeforeDestroy() {
        this.editor?.destroy();
        await super.onBeforeDestroy();
    }
}

export default DocEditPage;
