import Page from '../../../src/core/Page.js';
import Mustache from '../../../src/utils/mustache.js';

export default class TemplatesPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            pageName: 'templates',
            title: 'Templates'
        });
        this.sampleData = {};
        this.currentTemplate = '';
        this.compiledResult = '';
    }

    async onInit() {
        // Template examples with specific data for each
        this.templateExamples = {
            basic: {
                name: 'Basic Variables',
                template: `<h3>Welcome, {{user.name}}!</h3>
<p>Your email: {{user.email}}</p>
<p>Company: {{company}}</p>
<p>Year: {{currentYear}}</p>`,
                data: {
                    user: {
                        name: 'John Doe',
                        email: 'john.doe@example.com'
                    },
                    company: 'MOJO Framework',
                    currentYear: new Date().getFullYear()
                },
                description: 'Simple variable substitution using Mustache syntax'
            },
            conditionals: {
                name: 'Conditionals',
                template: `{{#user.isAdmin}}
<div class="alert alert-warning">
    <i class="bi bi-shield-check"></i> Admin Access Granted
</div>
{{/user.isAdmin}}
{{^user.isAdmin}}
<div class="alert alert-info">
    <i class="bi bi-person"></i> Regular User
</div>
{{/user.isAdmin}}

{{#settings.notifications}}
<p><i class="bi bi-bell-fill"></i> Notifications are enabled</p>
{{/settings.notifications}}`,
                data: {
                    user: {
                        isAdmin: true
                    },
                    settings: {
                        notifications: true
                    }
                },
                description: 'Conditional rendering with {{#condition}} and {{^condition}}'
            },
            loops: {
                name: 'Lists & Loops',
                template: `<table class="table table-sm">
    <thead>
        <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Status</th>
        </tr>
    </thead>
    <tbody>
        {{#products}}
        <tr>
            <td>{{name}}</td>
            <td>\${{price}}</td>
            <td>
                {{#inStock}}
                <span class="badge bg-success">In Stock</span>
                {{/inStock}}
                {{^inStock}}
                <span class="badge bg-danger">Out of Stock</span>
                {{/inStock}}
            </td>
        </tr>
        {{/products}}
    </tbody>
</table>`,
                data: {
                    products: [
                        { id: 1, name: 'Laptop', price: 999.99, inStock: true },
                        { id: 2, name: 'Mouse', price: 29.99, inStock: true },
                        { id: 3, name: 'Keyboard', price: 79.99, inStock: false },
                        { id: 4, name: 'Monitor', price: 299.99, inStock: true }
                    ]
                },
                description: 'Iterating over arrays with {{#array}}'
            },
            nested: {
                name: 'Nested Objects',
                template: `<div class="card">
    <div class="card-body">
        <h5 class="card-title">User Profile</h5>
        <div class="d-flex align-items-center">
            <img src="{{user.avatar}}" class="rounded-circle me-3" width="50">
            <div>
                <h6>{{user.name}}</h6>
                <small class="text-muted">{{user.email}}</small>
            </div>
        </div>
        <hr>
        <h6>Settings</h6>
        <ul class="list-unstyled">
            <li>Theme: {{settings.theme}}</li>
            <li>Language: {{settings.language}}</li>
            <li>Notifications: {{#settings.notifications}}On{{/settings.notifications}}{{^settings.notifications}}Off{{/settings.notifications}}</li>
        </ul>
    </div>
</div>`,
                data: {
                    user: {
                        name: 'Jane Smith',
                        email: 'jane.smith@example.com',
                        avatar: 'https://via.placeholder.com/50'
                    },
                    settings: {
                        theme: 'dark',
                        language: 'en',
                        notifications: true
                    }
                },
                description: 'Accessing nested object properties'
            },
            sections: {
                name: 'Advanced Sections',
                template: `<div class="messages">
    <h5>Messages ({{messages.length}})</h5>
    {{#messages}}
    <div class="alert {{#unread}}alert-primary{{/unread}}{{^unread}}alert-secondary{{/unread}} py-2">
        <strong>{{from}}:</strong> {{text}}
        {{#unread}}<span class="badge bg-warning ms-2">New</span>{{/unread}}
    </div>
    {{/messages}}
    {{^messages}}
    <p class="text-muted">No messages</p>
    {{/messages}}
</div>`,
                data: {
                    messages: [
                        { from: 'Alice', text: 'Hello!', unread: true },
                        { from: 'Bob', text: 'How are you?', unread: false },
                        { from: 'Charlie', text: 'Meeting at 3pm', unread: true }
                    ]
                },
                description: 'Complex template with multiple conditions'
            },
            escaping: {
                name: 'HTML Escaping',
                template: `<!-- Escaped (default) -->
<p>Escaped: {{htmlContent}}</p>

<!-- Unescaped -->
<p>Unescaped: {{{htmlContent}}}</p>

<!-- Triple mustache for raw HTML -->
<div>{{{rawHtml}}}</div>`,
                data: {
                    htmlContent: '<strong>Bold Text</strong>',
                    rawHtml: '<div class="alert alert-info">This is raw HTML content</div>'
                },
                description: 'Control HTML escaping with {{}} vs {{{}}}'
            }
        };

        // Set initial data
        this.currentData = {};
    }

    getTemplate() {
        return `
            <div class="container-fluid p-3">
                <h2 class="mb-4">Template Engine (Mustache.js)</h2>
                
                <!-- Template Examples -->
                <div class="row">
                    <div class="col-md-3">
                        <div class="card mb-3">
                            <div class="card-header">
                                <h5 class="mb-0">Examples</h5>
                            </div>
                            <div class="list-group list-group-flush">
                                ${Object.entries(this.templateExamples).map(([key, example]) => `
                                    <button class="list-group-item list-group-item-action" 
                                            data-action="loadExample" 
                                            data-example="${key}">
                                        ${example.name}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Quick Actions</h5>
                            </div>
                            <div class="card-body">
                                <button class="btn btn-sm btn-primary w-100 mb-2" data-action="renderTemplate">
                                    <i class="bi bi-play-fill"></i> Render Template
                                </button>
                                <button class="btn btn-sm btn-secondary w-100 mb-2" data-action="clearTemplate">
                                    <i class="bi bi-x-circle"></i> Clear
                                </button>
                                <button class="btn btn-sm btn-info w-100" data-action="copyTemplate">
                                    <i class="bi bi-clipboard"></i> Copy Template
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-9">
                        <!-- Template Editor -->
                        <div class="card mb-3">
                            <div class="card-header">
                                <h5 class="mb-0">Template Editor</h5>
                                <small class="text-muted" id="example-description">Select an example to load</small>
                            </div>
                            <div class="card-body">
                                <textarea id="template-editor" 
                                          class="form-control font-monospace" 
                                          rows="10"
                                          placeholder="Enter your Mustache template here..."></textarea>
                            </div>
                        </div>
                        
                        <!-- Data Editor -->
                        <div class="card mb-3">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Template Data (JSON)</h5>
                                <button class="btn btn-sm btn-outline-secondary" data-action="resetData">
                                    <i class="bi bi-arrow-clockwise"></i> Reset Data
                                </button>
                            </div>
                            <div class="card-body">
                                <textarea id="data-editor" 
                                          class="form-control font-monospace" 
                                          rows="8">${JSON.stringify(this.sampleData, null, 2)}</textarea>
                            </div>
                        </div>
                        
                        <!-- Rendered Output -->
                        <div class="card mb-3">
                            <div class="card-header bg-success text-white">
                                <h5 class="mb-0">Rendered Output</h5>
                            </div>
                            <div class="card-body">
                                <div id="template-output" class="border rounded p-3 bg-light">
                                    <p class="text-muted mb-0">Click "Render Template" to see the output</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- HTML Source -->
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Generated HTML</h5>
                            </div>
                            <div class="card-body">
                                <pre id="html-source" class="bg-dark text-light p-3 rounded mb-0"><code>// HTML output will appear here</code></pre>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Template Syntax Reference -->
                <div class="card mt-3">
                    <div class="card-header">
                        <h5 class="mb-0">Mustache Syntax Reference</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Basic Syntax</h6>
                                <table class="table table-sm">
                                    <tr>
                                        <td><code>{{variable}}</code></td>
                                        <td>Variable substitution (escaped)</td>
                                    </tr>
                                    <tr>
                                        <td><code>{{{variable}}}</code></td>
                                        <td>Unescaped variable</td>
                                    </tr>
                                    <tr>
                                        <td><code>{{#section}}...{{/section}}</code></td>
                                        <td>Section (if/loop)</td>
                                    </tr>
                                    <tr>
                                        <td><code>{{^inverted}}...{{/inverted}}</code></td>
                                        <td>Inverted section (if not)</td>
                                    </tr>
                                    <tr>
                                        <td><code>{{! comment }}</code></td>
                                        <td>Comment</td>
                                    </tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h6>Advanced Features</h6>
                                <table class="table table-sm">
                                    <tr>
                                        <td><code>{{> partial}}</code></td>
                                        <td>Partial template</td>
                                    </tr>
                                    <tr>
                                        <td><code>{{.}}</code></td>
                                        <td>Current context</td>
                                    </tr>
                                    <tr>
                                        <td><code>{{&variable}}</code></td>
                                        <td>Unescaped (alternative)</td>
                                    </tr>
                                    <tr>
                                        <td><code>{{=<% %>=}}</code></td>
                                        <td>Change delimiters</td>
                                    </tr>
                                    <tr>
                                        <td><code>{{object.property}}</code></td>
                                        <td>Dot notation</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async onAfterMount() {
        // Load the first example by default
        const firstExample = document.querySelector('[data-action="loadExample"]');
        if (firstExample) {
            firstExample.click();
        }
    }

    async onActionLoadExample(event, element) {
        const exampleKey = element.dataset.example;
        const example = this.templateExamples[exampleKey];
        
        if (example) {
            // Update template editor
            document.getElementById('template-editor').value = example.template;
            
            // Update data editor with example-specific data
            this.currentData = example.data || {};
            document.getElementById('data-editor').value = JSON.stringify(this.currentData, null, 2);
            
            // Update description
            document.getElementById('example-description').textContent = example.description;
            
            // Highlight selected example
            document.querySelectorAll('[data-action="loadExample"]').forEach(btn => {
                btn.classList.remove('active');
            });
            element.classList.add('active');
            
            // Auto-render only if mounted
            if (this.mounted) {
                this.renderTemplatePreview();
            }
        }
    }

    async onActionRenderTemplate() {
        this.renderTemplatePreview();
    }

    renderTemplatePreview() {
        try {
            const template = document.getElementById('template-editor').value;
            const dataText = document.getElementById('data-editor').value;
            
            if (!template) {
                this.showTemplateError('Please enter a template');
                return;
            }
            
            // Parse JSON data
            let data;
            try {
                data = JSON.parse(dataText);
            } catch (e) {
                this.showTemplateError('Invalid JSON data: ' + e.message);
                return;
            }
            
            // Render template
            const rendered = Mustache.render(template, data);
            
            // Display output
            document.getElementById('template-output').innerHTML = rendered;
            
            // Display HTML source
            document.getElementById('html-source').innerHTML = `<code>${this.escapeHtml(rendered)}</code>`;
            
            // Clear any errors
            this.clearTemplateError();
            
        } catch (error) {
            this.showTemplateError('Template error: ' + error.message);
        }
    }

    async onActionClearTemplate() {
        // Clear template editor
        document.getElementById('template-editor').value = '';
        
        // Clear data editor
        this.currentData = {};
        document.getElementById('data-editor').value = JSON.stringify(this.currentData, null, 2);
        
        // Clear outputs
        document.getElementById('template-output').innerHTML = '<p class="text-muted mb-0">Click "Render Template" to see the output</p>';
        document.getElementById('html-source').innerHTML = '<code>// HTML output will appear here</code>';
        document.getElementById('example-description').textContent = 'Select an example to load';
        
        // Remove active state from examples
        document.querySelectorAll('[data-action="loadExample"]').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    async onActionCopyTemplate() {
        const template = document.getElementById('template-editor').value;
        if (template) {
            navigator.clipboard.writeText(template).then(() => {
                this.showTemplateSuccess('Template copied to clipboard!');
            }).catch(err => {
                this.showTemplateError('Failed to copy: ' + err.message);
            });
        }
    }

    async onActionResetData() {
        // Reset to current example's data
        const activeExample = document.querySelector('[data-action="loadExample"].active');
        if (activeExample) {
            const exampleKey = activeExample.dataset.example;
            const example = this.templateExamples[exampleKey];
            if (example) {
                this.currentData = example.data || {};
                document.getElementById('data-editor').value = JSON.stringify(this.currentData, null, 2);
            }
        } else {
            // No active example, just reset to empty object
            this.currentData = {};
            document.getElementById('data-editor').value = JSON.stringify(this.currentData, null, 2);
        }
        
        if (this.mounted) {
            this.renderTemplatePreview();
        }
    }

    showTemplateError(message) {
        const output = document.getElementById('template-output');
        if (output) {
            output.innerHTML = `<div class="alert alert-danger mb-0"><i class="bi bi-exclamation-triangle"></i> ${message}</div>`;
        } else {
            console.error('Template error:', message);
        }
    }

    showTemplateSuccess(message) {
        const output = document.getElementById('template-output');
        if (!output) {
            console.log('Template success:', message);
            return;
        }
        const currentContent = output.innerHTML;
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show mb-2';
        alert.innerHTML = `
            <i class="bi bi-check-circle"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        output.insertBefore(alert, output.firstChild);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }

    clearTemplateError() {
        const output = document.getElementById('template-output');
        if (output) {
            const errorAlert = output.querySelector('.alert-danger');
            if (errorAlert) {
                errorAlert.remove();
            }
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}