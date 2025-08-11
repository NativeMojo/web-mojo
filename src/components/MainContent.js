/**
 * MainContent - Main content area that works with sidebar
 */

import View from '../core/View.js';

class MainContent extends View {
    constructor(options = {}) {
        super({
            tagName: 'div',
            className: 'main-content',
            template: `
                {{#data.showTopBar}}
                <nav class="navbar navbar-light bg-white border-bottom px-3 py-2">
                    <button class="btn btn-sm btn-outline-secondary d-md-none" data-action="toggle-sidebar">
                        <i class="bi bi-list"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary d-none d-md-block" data-action="collapse-sidebar">
                        <i class="bi bi-layout-sidebar"></i>
                    </button>
                    {{#data.topBarContent}}
                    <span class="navbar-text small text-muted ms-auto">
                        {{data.topBarContent}}
                    </span>
                    {{/data.topBarContent}}
                </nav>
                {{/data.showTopBar}}

                <div class="{{data.contentClass}}" data-id="content">
                    {{{data.content}}}
                </div>
            `,
            ...options
        });

        this.updateData({
            showTopBar: true,
            topBarContent: null,
            contentClass: 'p-3',
            content: '',
            ...this.data
        });
    }

    onAfterMount() {
        super.onAfterMount();
        this.addMainContentStyles();
    }

    addMainContentStyles() {
        const styleId = 'mojo-main-content-styles';
        
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .main-content {
                transition: margin-left 0.3s ease;
            }
        `;
        
        document.head.appendChild(style);
    }

    expand() {
        if (this.element) {
            this.element.classList.add('expanded');
        }
    }

    collapse() {
        if (this.element) {
            this.element.classList.remove('expanded');
        }
    }

    setContent(content) {
        this.updateData({ content });
    }

    getContentContainer() {
        if (this.element) {
            return this.element.querySelector('[data-id="content"]');
        }
        return null;
    }

    clear() {
        this.updateData({ content: '' });
        const container = this.getContentContainer();
        if (container) {
            container.innerHTML = '';
        }
    }
}

export default MainContent;