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
                {{#showTopBar}}
                <nav class="navbar navbar-light bg-white border-bottom px-3 py-2">
                    <button class="btn btn-sm btn-outline-secondary d-md-none" data-action="toggle-sidebar">
                        <i class="bi bi-list"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary d-none d-md-block" data-action="collapse-sidebar">
                        <i class="bi bi-layout-sidebar"></i>
                    </button>
                    {{#topBarContent}}
                    <span class="navbar-text small text-muted ms-auto">
                        {{topBarContent}}
                    </span>
                    {{/topBarContent}}
                </nav>
                {{/showTopBar}}

                <div class="{{contentClass}}" data-id="content">
                    {{{content}}}
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
}

export default MainContent;