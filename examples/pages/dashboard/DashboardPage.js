/**
 * DashboardPage - Clean business dashboard demonstrating DataFormatter
 */

import Page from '../../../src/core/Page.js';
import Table from '../../../src/components/Table.js';
import MetricsModel from '../../models/MetricsModel.js';

export default class DashboardPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            pageName: 'dashboard',
            title: 'Dashboard',
            pageIcon: 'bi bi-speedometer2',
            pageDescription: 'Business metrics overview'
        });

        // Set template URL
        this.templateUrl = '/examples/templates/dashboard/dashboard.html';
        
        // Initialize metrics model
        this.metrics = new MetricsModel();
        
        // Recent activity data
        this.recentActivity = [
            { user: 'alice johnson', action: 'New signup', timestamp: Date.now() - 300000, status: 'success' },
            { user: 'bob smith', action: 'Purchase', timestamp: Date.now() - 900000, status: 'success', amount: 299.99 },
            { user: 'carol white', action: 'Support ticket', timestamp: Date.now() - 1800000, status: 'pending' },
            { user: 'david brown', action: 'Payment failed', timestamp: Date.now() - 3600000, status: 'error', amount: 149.99 },
            { user: 'eve davis', action: 'Subscription', timestamp: Date.now() - 7200000, status: 'success', amount: 49.99 }
        ];
    }

    async getTemplate() {
        // Load template from file
        const response = await fetch(this.templateUrl);
        return await response.text();
    }

    async onAfterMount() {
        this.renderMetrics();
        await this.renderActivityTable();
    }

    renderMetrics() {
        // Using Model.get() with formatters - clean and simple
        this.container.querySelector('#revenue').textContent = 
            this.metrics.get('revenue|currency');
        
        this.container.querySelector('#revenue-growth').textContent = 
            '↑ ' + this.metrics.get('revenueGrowth|percent(1)');
        
        this.container.querySelector('#users').textContent = 
            this.metrics.get('totalUsers|compact');
        
        this.container.querySelector('#new-users').textContent = 
            '+' + this.metrics.get('newUsers|number(0)') + ' new this week';
        
        this.container.querySelector('#storage').textContent = 
            this.metrics.get('storageUsed|filesize(true)');
        
        this.container.querySelector('#storage-percent').textContent = 
            this.metrics.get('storagePercentUsed|percent(0)') + ' of ' + 
            this.metrics.get('storageTotal|filesize(true)');
        
        this.container.querySelector('#uptime').textContent = 
            this.metrics.get('uptime|percent(2)');
        
        this.container.querySelector('#last-incident').textContent = 
            'Last incident: ' + this.metrics.get('lastIncident|relative');
    }

    async renderActivityTable() {
        const container = this.container.querySelector('#activity-table');
        
        const table = new Table({
            columns: [
                {
                    key: 'user',
                    label: 'User',
                    formatter: 'capitalize(true)'
                },
                {
                    key: 'action',
                    label: 'Action'
                },
                {
                    key: 'amount',
                    label: 'Amount',
                    formatter: 'currency|default("-")'
                },
                {
                    key: 'timestamp',
                    label: 'Time',
                    formatter: 'relative'
                },
                {
                    key: 'status',
                    label: 'Status',
                    formatter: 'badge'
                }
            ],
            data: this.recentActivity,
            size: 'sm',
            hover: true
        });
        
        table.setContainer(container);
        await table.render();
        await table.mount();
    }
}