/**
 * TemplatesPage - Comprehensive Mustache Template Documentation with Examples
 * Demonstrates all features of the MOJO Mustache implementation
 */

import Page from '../../../src/core/Page.js';
import MOJOUtils from '../../../src/utils/MOJOUtils.js';

class TemplatesPage extends Page {
    constructor(options = {}) {
        super({
            name: 'templates',
            title: 'Mustache Templates Documentation',
            template: '/examples/portal/templates/TemplatesPage.mst',
            ...options
        });

        // Initialize properties
        this.examples = [];
        this.currentExample = null;
    }

    async onInit() {
        // Load examples
        this.examples = this.getExamples();
        // Initialize with the first example
        this.currentExample = this.examples[0];

        // Load the initial template
        if (this.currentExample.templateFile) {
            this.currentExample.template = await this.loadTemplate(this.currentExample.templateFile);
        }

        // Set initial data for rendering
        this.data = {
            examples: this.examples.map(e => ({
                ...e,
                active: e.id === this.currentExample.id
            })),
            currentExample: this.formatExample(this.currentExample)
        };
    }



    getExamples() {
        return [
            {
                id: 'variables',
                title: 'Variables',
                description: 'Basic variable interpolation',
                explanation: 'Variables are the most basic Mustache tag type. Use <code>{{name}}</code> to output a variable. HTML is escaped by default.',
                templateFile: 'variables.mst',
                data: {
                    name: 'John Doe',
                    email: 'john@example.com',
                    age: 30,
                    htmlContent: '<strong>This is bold</strong>'
                }
            },
            {
                id: 'unescaped',
                title: 'Unescaped Output',
                description: 'Render HTML without escaping',
                explanation: 'Use triple braces <code>{{{html}}}</code> or <code>{{&html}}</code> to output unescaped HTML.',
                templateFile: 'unescaped.mst',
                data: {
                    htmlContent: '<strong>Bold</strong> and <em>italic</em> text'
                }
            },
            {
                id: 'sections',
                title: 'Sections',
                description: 'Conditionals and loops',
                explanation: 'Sections render blocks of text based on the value of a key. They can be used for conditions or loops.',
                templateFile: 'sections.mst',
                data: {
                    showGreeting: true,
                    user: {
                        name: 'Alice',
                        email: 'alice@example.com'
                    },
                    items: ['Apple', 'Banana', 'Orange']
                }
            },
            {
                id: 'inverted',
                title: 'Inverted Sections',
                description: 'Render when value is false or empty',
                explanation: 'Inverted sections (<code>{{^key}}</code>) render when the value is false, undefined, null, or an empty array.',
                templateFile: 'inverted.mst',
                data: {
                    items: [],
                    loggedIn: false
                }
            },
            {
                id: 'nested',
                title: 'Nested Objects',
                description: 'Access nested properties',
                explanation: 'Use dot notation to access nested properties directly.',
                templateFile: 'nested.mst',
                data: {
                    user: {
                        name: 'Bob Smith',
                        email: 'bob@example.com',
                        address: {
                            city: 'New York',
                            country: 'USA'
                        },
                        orders: [
                            { id: '001', total: 99.99 },
                            { id: '002', total: 149.99 }
                        ]
                    }
                }
            },
            {
                id: 'dot-prefix',
                title: 'Dot Prefix (No Context Chain)',
                description: 'Prevent context chain walking',
                explanation: 'Use dot prefix (<code>{{.property}}</code>) to only look in the current context, preventing Mustache from walking up the context chain.',
                notes: 'This is a MOJO enhancement. Useful when you want to ensure a property is only checked in the current context, not in parent contexts.',
                isNew: true,
                templateFile: 'dot-prefix.mst',
                data: {
                    parentName: 'Parent Context',
                    items: [
                        { name: 'Item 1' },
                        { name: 'Item 2', parentName: 'Local Override' }
                    ]
                }
            },
            {
                id: 'bool-vs-iter',
                title: 'Boolean Check vs Iteration',
                description: 'Control section behavior for arrays',
                explanation: 'Use <code>{{#.property}}</code> for boolean checks and <code>{{#.property|iter}}</code> for iteration.',
                notes: 'This is a MOJO enhancement. Allows you to check if an array exists vs iterating through it.',
                isNew: true,
                templateFile: 'bool-vs-iter.mst',
                data: {
                    items: [
                        { name: 'Widget', price: 9.99 },
                        { name: 'Gadget', price: 19.99 },
                        { name: 'Doohickey', price: 14.99 }
                    ],
                    children: [
                        { label: 'Child 1' },
                        { label: 'Child 2' }
                    ]
                }
            },
            {
                id: 'arrays',
                title: 'Arrays and Loops',
                description: 'Different ways to work with arrays',
                explanation: 'Arrays can be iterated in sections. Use <code>{{.}}</code> to reference the current item in simple arrays.',
                templateFile: 'arrays.mst',
                data: {
                    colors: ['Red', 'Green', 'Blue'],
                    products: [
                        { name: 'Laptop', price: 999, inStock: true },
                        { name: 'Mouse', price: 29, inStock: true },
                        { name: 'Keyboard', price: 79, inStock: false }
                    ],
                    categories: [
                        {
                            name: 'Electronics',
                            items: [
                                { title: 'Phone', quantity: 5 },
                                { title: 'Tablet', quantity: 3 }
                            ]
                        },
                        {
                            name: 'Books',
                            items: [
                                { title: 'Fiction', quantity: 10 },
                                { title: 'Non-fiction', quantity: 8 }
                            ]
                        }
                    ]
                }
            },
            {
                id: 'comments',
                title: 'Comments',
                description: 'Add comments to templates',
                explanation: 'Comments (<code>{{! comment }}</code>) are ignored and not rendered in the output.',
                templateFile: 'comments.mst',
                data: {
                    title: 'Hello World',
                    description: 'Comments are useful for documentation.'
                }
            },
            {
                id: 'complex',
                title: 'Complex Example',
                description: 'Combining multiple features',
                explanation: 'A comprehensive example combining various Mustache features to build a dynamic UI component.',
                templateFile: 'complex.mst',
                data: {
                    title: 'Dashboard',
                    notifications: [
                        { text: 'New message' },
                        { text: 'System update' }
                    ],
                    widgets: [
                        {
                            name: 'Sales',
                            badge: { text: 'Live', color: 'success' },
                            items: [
                                { label: 'Today', value: '$1,234', trend: { direction: 'up', percent: 12, color: 'success' } },
                                { label: 'This Week', value: '$8,456', trend: { direction: 'down', percent: 3, color: 'danger' } }
                            ],
                            footer: '<a href="#">View Details →</a>'
                        },
                        {
                            name: 'Users',
                            items: [
                                { label: 'Active', value: '1,234' },
                                { label: 'New', value: '56' }
                            ]
                        },
                        {
                            name: 'Inventory',
                            badge: { text: 'Low', color: 'warning' },
                            items: []
                        }
                    ]
                }
            }
        ];
    }

    async loadTemplate(filename) {
        try {
            const response = await fetch(`/examples/portal/templates/examples/${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to load template: ${filename}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Error loading template:', error);
            return `<!-- Error loading template: ${filename} -->`;
        }
    }

    async onAfterMount() {
        // Populate the textareas with initial values
        const templateInput = document.getElementById('template-input');
        const dataInput = document.getElementById('data-input');

        if (templateInput && this.currentExample && this.currentExample.template) {
            templateInput.value = this.currentExample.template;
        }

        if (dataInput && this.currentExample && this.currentExample.data) {
            dataInput.value = JSON.stringify(this.currentExample.data, null, 2);
        }

        // Auto-render the first example
        this.renderCurrentExample();
    }

    async onActionLoadExample(event, element) {
        const exampleId = element.dataset.exampleId;
        const example = this.examples.find(e => e.id === exampleId);

if (example) {
    this.currentExample = example;

    // Load the template if needed
    if (example.templateFile && !example.template) {
        example.template = await this.loadTemplate(example.templateFile);
    }

    // Update both examples list and current example
    const examplesWithState = this.examples.map(e => ({
        ...e,
        active: e.id === example.id
    }));

    await this.updateData({
        examples: examplesWithState,
        currentExample: this.formatExample(example)
    });

    // Manually update textarea values after DOM updates
    setTimeout(() => {
        const templateInput = document.getElementById('template-input');
        const dataInput = document.getElementById('data-input');

        if (templateInput && example.template) {
            templateInput.value = example.template;
        }

        if (dataInput && example.data) {
            dataInput.value = JSON.stringify(example.data, null, 2);
        }

        this.renderCurrentExample();
    }, 0);
}
    }

    async onActionRender() {
        this.renderCurrentExample();
    }

    async onActionReset() {
        if (this.currentExample) {
            // Reset to original example data
            const originalExample = this.examples.find(e => e.id === this.currentExample.id);
            if (originalExample) {
                // Load template if needed
                if (originalExample.templateFile && !originalExample.template) {
                    originalExample.template = await this.loadTemplate(originalExample.templateFile);
                }

                this.currentExample = originalExample;
                await this.updateData({
                    currentExample: this.formatExample(originalExample)
                });

                // Manually update textarea values after DOM updates
                setTimeout(() => {
                    const templateInput = document.getElementById('template-input');
                    const dataInput = document.getElementById('data-input');

                    if (templateInput && originalExample.template) {
                        templateInput.value = originalExample.template;
                    }

                    if (dataInput && originalExample.data) {
                        dataInput.value = JSON.stringify(originalExample.data, null, 2);
                    }

                    this.renderCurrentExample();
                }, 0);
            }
        }
    }

    async onActionCopyTemplate() {
        const textarea = document.getElementById('template-input');
        if (textarea) {
            textarea.select();
            document.execCommand('copy');
            this.showSuccess('Template copied to clipboard!');
        }
    }

    async onActionCopyData() {
        const textarea = document.getElementById('data-input');
        if (textarea) {
            textarea.select();
            document.execCommand('copy');
            this.showSuccess('Data copied to clipboard!');
        }
    }

    renderCurrentExample() {
        const templateInput = document.getElementById('template-input');
        const dataInput = document.getElementById('data-input');
        const outputRendered = document.getElementById('output-rendered');
        const outputHtml = document.getElementById('output-html');

        if (!templateInput || !dataInput || !outputRendered || !outputHtml) {
            console.warn('Template elements not found, will retry...');
            return;
        }

        try {
            const template = templateInput.value;
            const data = JSON.parse(dataInput.value);

            // Render using Mustache
            const wrappedData = MOJOUtils.wrapData(data);
            const rendered = window.Mustache.render(template, wrappedData);

            // Display rendered output
            outputRendered.innerHTML = rendered;

            // Display HTML source
            outputHtml.textContent = rendered;

            // Clear any previous errors
            outputRendered.classList.remove('text-danger');

        } catch (error) {
            outputRendered.innerHTML = `<div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Error: ${this.escapeHtml(error.message)}
            </div>`;
            outputHtml.textContent = 'Error: ' + error.message;
        }
    }

    async updateExamplesList() {
        // Update the examples list with active states
        const examplesWithState = this.examples.map(e => ({
            ...e,
            active: this.currentExample && e.id === this.currentExample.id
        }));

        // Update both examples and current example
        const updateObj = {
            examples: examplesWithState,
            currentExample: this.currentExample ? this.formatExample(this.currentExample) : null
        };

        await this.updateData(updateObj, true);
    }

    formatExample(example) {
        return {
            ...example,
            template: example.template || '',
            dataJson: JSON.stringify(example.data, null, 2)
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Register page name for routing
TemplatesPage.pageName = 'templates';

export default TemplatesPage;
