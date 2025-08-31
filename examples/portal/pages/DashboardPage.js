/**
 * DashboardPage - Simple dashboard for the portal example
 */

import Page from '/src/core/Page.js';

class DashboardPage extends Page {
    static pageName = 'dashboard';
    static title = 'Dashboard - Portal Example';
    static icon = 'bi-speedometer2';
    static route = 'dashboard';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DashboardPage.pageName,
            route: DashboardPage.route,
            pageIcon: DashboardPage.icon,
            template: 'templates/dashboard.mst'
        });
    }

    async onInit() {
        // Initialize simple dashboard data
        this.data = {
            userName: 'John Doe',
            revenue: '45,231',
            revenueChange: 12.5,
            orders: 356,
            ordersChange: 8.2,
            activeUsers: 2847,
            usersChange: -2.1,
            conversionRate: 3.24,
            conversionChange: -0.5,

            recentActivity: [
                {
                    icon: 'person-plus',
                    color: 'primary',
                    title: 'New user registered',
                    time: '2 minutes ago'
                },
                {
                    icon: 'cart-check',
                    color: 'success',
                    title: 'New order #1234',
                    time: '10 minutes ago'
                },
                {
                    icon: 'star',
                    color: 'warning',
                    title: 'Product review received',
                    time: '1 hour ago'
                }
            ]
        };
    }

    async onEnter() {
        await super.onEnter();
        console.log('DashboardPage entered');

        // Set page title
        document.title = DashboardPage.title;
    }

    async updateData(data) {
        this.data = data;
        await this.render();
    }

    async onActionRefresh() {
        if (window.APP) {
            window.APP.showLoading('Refreshing dashboard...');
        }

        try {
            // Simulate refreshing data
            await new Promise(resolve => setTimeout(resolve, 300));

            // Update some values to show refresh worked
            this.updateData({
                ...this.data,
                revenue: Math.floor(Math.random() * 50000 + 40000).toLocaleString(),
                orders: Math.floor(Math.random() * 100 + 300),
                activeUsers: Math.floor(Math.random() * 500 + 2500),
                lastUpdated: new Date().toLocaleTimeString()
            });

            if (window.APP) {
                window.APP.hideLoading();
                window.APP.showSuccess('Dashboard refreshed!');
            }
        } catch (error) {
            if (window.APP) {
                window.APP.hideLoading();
                window.APP.showError('Failed to refresh dashboard');
            }
            console.error('Refresh error:', error);
        }
    }
}

export default DashboardPage;
