/**
 * EmailTemplateView - A clean view for previewing email templates
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import { EmailTemplate } from '@core/models/Email.js';

/**
 * EmailHtmlPreviewView - Renders HTML email template in a sandboxed iframe
 */
class EmailHtmlPreviewView extends View {
    constructor(options = {}) {
        super({
            className: 'email-html-preview',
            template: `
                <div class="email-html-preview-container">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">HTML Preview (sandboxed)</small>
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-action="refresh-preview">
                            <i class="bi bi-arrow-clockwise"></i> Refresh
                        </button>
                    </div>
                    <iframe 
                        id="email-preview-frame"
                        class="border rounded w-100" 
                        style="height: 500px; background: white;"
                        sandbox="allow-same-origin"
                        frameborder="0"
                    ></iframe>
                </div>
            `,
            ...options
        });
    }

    async onAfterRender() {
        await super.onAfterRender();
        this.renderHtmlInIframe();
    }

    renderHtmlInIframe() {
        const iframe = this.element.querySelector('#email-preview-frame');
        if (!iframe) return;

        const htmlContent = this.model.get('html_template') || '';
        
        // Get iframe document
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        // Write HTML content
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();
    }

    async onActionRefreshPreview(event, element) {
        this.renderHtmlInIframe();
    }
}

class EmailTemplateView extends View {
    constructor(options = {}) {
        super({
            className: 'email-template-view',
            ...options
        });

        this.model = options.model || new EmailTemplate(options.data || {});
        this.hasHtml = !!this.model.get('html_template');
        this.hasText = !!this.model.get('text_template');
        this.hasMetadata = this.model.get('metadata') && Object.keys(this.model.get('metadata')).length > 0;

        this.template = `
            <div class="email-template-view-container p-3">
                <!-- Header -->
                <div class="template-header border-bottom pb-3 mb-3">
                    <h4 class="mb-1">{{model.name}}</h4>
                    <div class="text-muted">
                        <strong>Subject:</strong> {{model.subject_template|default('Not set')}}
                    </div>
                </div>

                <!-- Tabs -->
                <div data-container="template-tabs"></div>
            </div>
        `;
    }

    async onInit() {
        const tabs = {};

        if (this.hasHtml) {
            tabs['HTML Preview'] = new EmailHtmlPreviewView({
                model: this.model
            });
        }

        if (this.hasText) {
            tabs['Text Version'] = new View({
                model: this.model,
                template: `<pre class="email-text-content p-3 bg-light border rounded" style="white-space: pre-wrap; word-wrap: break-word;">{{model.text_template}}</pre>`
            });
        }

        if (this.hasMetadata) {
            tabs['Metadata'] = new View({
                model: this.model,
                template: `<pre class="email-metadata-content p-3 bg-light border rounded"><code>{{model.metadata|json}}</code></pre>`
            });
        }

        this.tabView = new TabView({
            containerId: 'template-tabs',
            tabs: tabs,
            activeTab: Object.keys(tabs)[0] || ''
        });
        this.addChild(this.tabView);
    }
}

export default EmailTemplateView;
