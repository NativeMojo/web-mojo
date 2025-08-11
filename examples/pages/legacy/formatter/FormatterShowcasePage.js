/**
 * FormatterShowcasePage - Clean demonstration of DataFormatter capabilities
 */

import Page from '../../../src/core/Page.js';
import Table from '../../../src/components/Table.js';
import SampleModel from '../../models/SampleModel.js';

export default class FormatterShowcasePage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            pageName: 'formatter-showcase',
            title: 'Data Formatting',
            pageIcon: 'bi bi-code-slash',
            pageDescription: 'Simple and powerful data formatting'
        });
        
        // Set template URL
        this.templateUrl = '/examples/templates/formatter/showcase.html';
    }

    async getTemplate() {
        // Load template from file
        const response = await fetch(this.templateUrl);
        return await response.text();
    }

    async onAfterMount() {
        // Create a simple table with formatters
        await this.createSampleTable();
        
        // Show model examples
        this.showModelExamples();
    }

    async createSampleTable() {
        const container = this.container.querySelector('#sample-table');
        
        // Sample data
        const data = [
            {
                name: 'alice johnson',
                email: 'ALICE@EXAMPLE.COM',
                joinDate: new Date('2024-01-15'),
                balance: 1234.56,
                status: 'active'
            },
            {
                name: 'bob smith',
                email: 'BOB@EXAMPLE.COM',
                joinDate: new Date('2024-02-20'),
                balance: 0,
                status: 'pending'
            },
            {
                name: 'carol white',
                email: 'CAROL@EXAMPLE.COM',
                joinDate: new Date('2024-03-10'),
                balance: 567.89,
                status: 'inactive'
            }
        ];

        const table = new Table({
            columns: [
                {
                    key: 'name',
                    label: 'Name',
                    formatter: 'capitalize(true)'  // Capitalize all words
                },
                {
                    key: 'email',
                    label: 'Email',
                    formatter: 'lowercase|email'  // Chain formatters
                },
                {
                    key: 'joinDate',
                    label: 'Member Since',
                    formatter: 'date("MMM YYYY")'  // Format with arguments
                },
                {
                    key: 'balance',
                    label: 'Balance',
                    formatter: 'currency|default("Free")'  // With fallback
                },
                {
                    key: 'status',
                    label: 'Status',
                    formatter: 'badge'  // Auto-detect badge type
                }
            ],
            data: data,
            size: 'sm',
            hover: true
        });

        // Set container and render the table
        table.setContainer(container);
        await table.render();
        await table.mount();
    }

    showModelExamples() {
        const container = this.container.querySelector('#model-examples');
        const model = new SampleModel();
        
        // Create a simple display of formatted model values
        const examples = [
            { field: 'name', formatter: 'uppercase' },
            { field: 'email', formatter: 'lowercase' },
            { field: 'balance', formatter: 'currency' },
            { field: 'joinDate', formatter: 'date("MMM DD, YYYY")' },
            { field: 'score', formatter: 'percent(1)' }
        ];
        
        let html = '<table class="table table-sm">';
        html += '<thead><tr><th>Field</th><th>Raw Value</th><th>Formatted</th></tr></thead>';
        html += '<tbody>';
        
        examples.forEach(ex => {
            const rawValue = model.get(ex.field);
            const formattedValue = model.get(`${ex.field}|${ex.formatter}`);
            html += `
                <tr>
                    <td><code>model.get('${ex.field}|${ex.formatter}')</code></td>
                    <td>${rawValue}</td>
                    <td>${formattedValue}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    }
}