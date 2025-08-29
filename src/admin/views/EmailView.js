/**
 * EmailView - A slick, email-client-like view for sent messages
 */

import View from '../../core/View.js';
import TabView from '../../components/TabView.js';
import { SentMessage } from '../../models/Email.js';

class EmailView extends View {
    constructor(options = {}) {
        super({
            className: 'email-view',
            ...options
        });

        this.model = options.model || new SentMessage(options.data || {});
        this.hasHtml = !!this.model.get('body_html');
        this.hasText = !!this.model.get('body_text');
        this.hasContext = this.model.get('template_context') && Object.keys(this.model.get('template_context')).length > 0;

        this.template = `
            <div class="email-view-container p-3">
                <!-- Email Header -->
                <div class="email-header border-bottom pb-3 mb-3">
                    <h4 class="mb-2">{{model.subject}}</h4>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="flex-shrink-0">
                                <i class="bi bi-person-circle fs-2 text-secondary"></i>
                            </div>
                            <div class="ms-3">
                                <div class="fw-bold">{{model.mailbox.email}}</div>
                                <div class="text-muted small">To: {{model.to_addresses|list}}</div>
                            </div>
                        </div>
                        <div class="text-end">
                            <div class="text-muted small">{{model.created|datetime}}</div>
                            <span class="badge {{model.status|badge}} mt-1">{{model.status|capitalize}}</span>
                        </div>
                    </div>
                </div>

                <!-- Email Body Tabs -->
                <div data-container="email-tabs"></div>
            </div>
        `;
    }

    async onInit() {
        const tabs = {};

        if (this.hasHtml) {
            tabs['HTML'] = new View({
                model: this.model,
                template: `<div class="email-html-content border rounded p-3" style="height: 500px; overflow-y: auto;">{{{model.body_html}}}</div>`
            });
        }

        if (this.hasText) {
            tabs['Text'] = new View({
                model: this.model,
                template: `<pre class="email-text-content p-3 bg-light border rounded" style="white-space: pre-wrap; word-wrap: break-word;">{{model.body_text}}</pre>`
            });
        }

        if (this.hasContext) {
            tabs['Context'] = new View({
                model: this.model,
                template: `<pre class="email-context-content p-3 bg-light border rounded"><code>{{model.template_context|json}}</code></pre>`
            });
        }

        this.tabView = new TabView({
            containerId: 'email-tabs',
            tabs: tabs,
            activeTab: this.hasHtml ? 'HTML' : (this.hasText ? 'Text' : 'Context')
        });
        this.addChild(this.tabView);
    }
}

export default EmailView;
