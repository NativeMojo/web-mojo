/**
 * PageHeader - Displays page title, description, and actions above page content
 * Used by PortalApp to show consistent page headers
 */

import View from '@core/View.js';

class PageHeader extends View {
    constructor(options = {}) {
        super({
            tagName: 'div',
            className: 'page-header',
            ...options
        });

        // Configuration
        this.style = options.style || 'default'; // 'default' | 'minimal' | 'breadcrumb'
        this.size = options.size || 'md'; // 'sm' | 'md' | 'lg' | 'xl'
        this.showIcon = options.showIcon !== false;
        this.showDescription = options.showDescription !== false;
        this.showBreadcrumbs = options.showBreadcrumbs || false;
        
        // Current page reference
        this.currentPage = null;
    }

    async getTemplate() {
        if (this.style === 'minimal') {
            return this.getMinimalTemplate();
        } else if (this.style === 'breadcrumb') {
            return this.getBreadcrumbTemplate();
        }
        return this.getDefaultTemplate();
    }

    getDefaultTemplate() {
        return `
            {{#data.hasPage}}
            <div class="page-header-content page-header-{{data.size}}">
                <div class="page-header-main">
                    <div class="page-header-info">
                        {{#data.showIcon}}
                        {{#data.pageIcon}}
                        <div class="page-icon">
                            <i class="{{data.pageIcon}}"></i>
                        </div>
                        {{/data.pageIcon}}
                        {{/data.showIcon}}
                        
                        <div class="page-title-group">
                            <h1 class="page-title">{{data.pageTitle}}</h1>
                            {{#data.showDescription}}
                            {{#data.pageDescription}}
                            <p class="page-description text-muted">{{data.pageDescription}}</p>
                            {{/data.pageDescription}}
                            {{/data.showDescription}}
                        </div>
                    </div>

                    {{#data.hasActions}}
                    <div class="page-actions">
                        {{#data.actions}}
                        <button class="btn {{buttonClass}}" 
                                data-action="{{action}}"
                                type="button">
                            {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                            {{label}}
                        </button>
                        {{/data.actions}}
                    </div>
                    {{/data.hasActions}}
                </div>
            </div>
            {{/data.hasPage}}
        `;
    }

    getMinimalTemplate() {
        return `
            {{#data.hasPage}}
            <div class="page-header-content page-header-minimal">
                <h1 class="page-title">
                    {{#data.showIcon}}
                    {{#data.pageIcon}}<i class="{{data.pageIcon}} me-2"></i>{{/data.pageIcon}}
                    {{/data.showIcon}}
                    {{data.pageTitle}}
                </h1>
            </div>
            {{/data.hasPage}}
        `;
    }

    getBreadcrumbTemplate() {
        return `
            {{#data.hasPage}}
            <div class="page-header-content page-header-breadcrumb">
                {{#data.showBreadcrumbs}}
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb mb-2">
                        {{#data.breadcrumbs}}
                        <li class="breadcrumb-item {{#active}}active{{/active}}">
                            {{#href}}<a href="{{href}}">{{label}}</a>{{/href}}
                            {{^href}}{{label}}{{/href}}
                        </li>
                        {{/data.breadcrumbs}}
                    </ol>
                </nav>
                {{/data.showBreadcrumbs}}
                
                <div class="d-flex justify-content-between align-items-start">
                    <h1 class="page-title">
                        {{#data.showIcon}}
                        {{#data.pageIcon}}<i class="{{data.pageIcon}} me-2"></i>{{/data.pageIcon}}
                        {{/data.showIcon}}
                        {{data.pageTitle}}
                    </h1>
                    
                    {{#data.hasActions}}
                    <div class="page-actions">
                        {{#data.actions}}
                        <button class="btn {{buttonClass}}" 
                                data-action="{{action}}"
                                type="button">
                            {{#icon}}<i class="{{icon}} me-1"></i>{{/icon}}
                            {{label}}
                        </button>
                        {{/data.actions}}
                    </div>
                    {{/data.hasActions}}
                </div>
                
                {{#data.showDescription}}
                {{#data.pageDescription}}
                <p class="page-description text-muted mt-2">{{data.pageDescription}}</p>
                {{/data.pageDescription}}
                {{/data.showDescription}}
            </div>
            {{/data.hasPage}}
        `;
    }

    async onBeforeRender() {
        await super.onBeforeRender();

        const page = this.currentPage;
        const hasPage = !!page;

        // Get headerActions from page options, instance, or constructor.prototype
        const headerActions = page?.options?.headerActions ||
                             page?.headerActions || 
                             page?.constructor?.prototype?.headerActions || 
                             [];

        this.data = {
            hasPage,
            pageTitle: page?.title || page?.name || '',
            pageIcon: page?.icon || page?.pageIcon || '',
            pageDescription: page?.description || '',
            showIcon: this.showIcon,
            showDescription: this.showDescription,
            showBreadcrumbs: this.showBreadcrumbs,
            breadcrumbs: page?.options?.breadcrumbs || page?.breadcrumbs || [],
            actions: headerActions,
            hasActions: headerActions.length > 0,
            size: this.size
        };
    }

    /**
     * Set the current page to display
     */
    setPage(page) {
        this.currentPage = page;
        if (this.mounted) {
            this.render();
        }
    }

    /**
     * Get the current page
     */
    getPage() {
        return this.currentPage;
    }

    /**
     * Handle action clicks from page header buttons
     */
    async onActionDefault(action, event, element) {
        // Emit to page if it has a handler
        if (this.currentPage && typeof this.currentPage.onHeaderAction === 'function') {
            await this.currentPage.onHeaderAction(action, event, element);
            return true;
        }

        // Emit event for parent to handle
        this.emit('action', {
            action,
            event,
            element,
            page: this.currentPage
        });

        return false;
    }
}

export default PageHeader;
