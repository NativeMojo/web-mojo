
import View from '../../core/View.js';
import Editor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css';

class EditorView extends View {
    constructor(options = {}) {
        super(options);
        this.model = null;
        this.editor = null;
    }

    getTemplate() {
        return `
            <div class="container-fluid p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <input type="text" class="form-control form-control-lg" id="docit-editor-title" placeholder="Page Title">
                    <div>
                        <button class="btn btn-secondary me-2" data-action="cancel">Cancel</button>
                        <button class="btn btn-primary" data-action="save">Save</button>
                    </div>
                </div>
                <div id="docit-editor-container"></div>
            </div>
        `;
    }

    onAfterRender() {
        const container = this.element.querySelector('#docit-editor-container');
        if (container) {
            this.editor = new Editor({
                el: container,
                height: '600px',
                initialEditType: 'wysiwyg',
                previewStyle: 'vertical',
                initialValue: this.model ? this.model.get('content') : ''
            });
        }
    }

    load(page) {
        this.model = page;
        this.render();
        this.element.querySelector('#docit-editor-title').value = this.model.get('title');
    }

    onActionSave() {
        if (this.editor) {
            const content = this.editor.getMarkdown();
            const title = this.element.querySelector('#docit-editor-title').value;
            this.model.set({ content, title });
            this.emit('save', this.model);
        }
    }

    onActionCancel() {
        this.emit('cancel');
    }

    onBeforeDestroy() {
        if (this.editor) {
            this.editor.destroy();
        }
    }
}

export default EditorView;
