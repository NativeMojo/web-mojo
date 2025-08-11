/**
 * MetricsModel - Business metrics model for dashboard and analytics examples
 */

import Model from '../../src/core/Model.js';

window.Model = Model;

export default class MetricsModel extends Model {
    constructor(data = {}) {
        super({
            // Financial metrics
            revenue: 2456789.50,
            revenueGrowth: 0.124,
            expenses: 1823456.75,
            profit: 633332.75,
            profitMargin: 0.258,
            mrr: 204732.29, // Monthly Recurring Revenue
            arr: 2456787.48, // Annual Recurring Revenue

            // User metrics
            totalUsers: 45678,
            activeUsers: 38542,
            newUsers: 1234,
            userGrowth: 0.087,
            churnRate: 0.023,
            retentionRate: 0.977,
            dau: 12456, // Daily Active Users
            mau: 38542, // Monthly Active Users

            // Performance metrics
            uptime: 0.9987,
            responseTime: 145, // milliseconds
            errorRate: 0.0012,
            successRate: 0.9988,
            pageLoadTime: 1.2, // seconds
            apiLatency: 89, // milliseconds

            // Storage & bandwidth
            storageUsed: 536870912000, // bytes (500GB)
            storageTotal: 1099511627776, // bytes (1TB)
            bandwidthUsed: 107374182400, // bytes (100GB)
            bandwidthLimit: 214748364800, // bytes (200GB)

            // Conversion metrics
            conversionRate: 0.0234,
            cartAbandonmentRate: 0.68,
            bounceRate: 0.325,
            avgSessionDuration: 185, // seconds
            pagesPerSession: 4.2,

            // Support metrics
            openTickets: 23,
            avgResolutionTime: 4.5, // hours
            customerSatisfaction: 4.7, // out of 5
            nps: 72, // Net Promoter Score

            // Time-based metrics
            lastBackup: new Date(Date.now() - 3600000), // 1 hour ago
            lastIncident: new Date(Date.now() - 86400000 * 7), // 1 week ago
            nextMaintenance: new Date(Date.now() + 86400000 * 14), // 2 weeks from now
            lastDeployment: new Date(Date.now() - 86400000 * 2), // 2 days ago

            ...data
        });
    }

    // Computed properties
    get storagePercentUsed() {
        return this.get('storageUsed') / this.get('storageTotal');
    }

    get bandwidthPercentUsed() {
        return this.get('bandwidthUsed') / this.get('bandwidthLimit');
    }

    get activeUserPercent() {
        return this.get('activeUsers') / this.get('totalUsers');
    }

    get netProfit() {
        return this.get('revenue') - this.get('expenses');
    }

    get profitGrowth() {
        // Simplified calculation for demo
        return this.get('revenueGrowth') * 1.2;
    }

    // Helper methods for status checks
    isHealthy() {
        return this.get('uptime') > 0.99 &&
               this.get('errorRate') < 0.01 &&
               this.get('responseTime') < 200;
    }

    needsAttention() {
        return this.get('errorRate') > 0.005 ||
               this.get('openTickets') > 50 ||
               this.storagePercentUsed > 0.8;
    }
}
