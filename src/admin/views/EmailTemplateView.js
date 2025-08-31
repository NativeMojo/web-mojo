/**
 * EmailTemplateView - A clean view for previewing email templates
 */

import View from '../../core/View.js';
import TabView from '../../views/navigation/TabView.js';
import { EmailTemplate } from '../../models/Email.js';

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
            tabs['HTML Preview'] = new View({
                model: this.model,
                template: `<div class="email-html-content border rounded p-3" style="height: 500px; overflow-y: auto;">{{model.html_template}}</div>`
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
