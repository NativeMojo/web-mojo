/**
 * DashboardPage - Main authenticated landing page
 * Shows user dashboard with stats and quick actions
 */

import Page from '../../../src/core/Page.js';

export default class DashboardPage extends Page {
    static pageName = 'dashboard';
    static title = 'Dashboard';
    static icon = 'bi-speedometer2';
    static route = 'dashboard';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DashboardPage.pageName,
            route: DashboardPage.route,
            pageIcon: DashboardPage.icon,
            template: 'pages/DashboardPage.mst'
        });

        // Get auth manager from app
        this.authManager = this.app?.auth;
    }

    async onInit() {
        // Initialize page data
        this.data = {
            user: null,
            stats: {
                totalUsers: 1234,
                activeProjects: 8,
                completedTasks: 42,
                pendingReviews: 5
            },
            recentActivity: [
                {
                    icon: 'bi-file-earmark-plus',
                    title: 'New document created',
                    description: 'Project proposal draft',
                    time: '2 hours ago',
                    type: 'success'
                },
                {
                    icon: 'bi-person-check',
                    title: 'User approved',
                    description: 'Jane Smith joined the team',
                    time: '5 hours ago',
                    type: 'info'
                },
                {
                    icon: 'bi-chat-dots',
                    title: 'New comment',
                    description: 'On project timeline',
                    time: 'Yesterday',
                    type: 'primary'
                },
                {
                    icon: 'bi-exclamation-triangle',
                    title: 'Review required',
                    description: 'Budget approval pending',
                    time: '2 days ago',
                    type: 'warning'
                }
            ],
            quickActions: [
                {
                    icon: 'bi-plus-circle',
                    title: 'New Project',
                    description: 'Start a new project',
                    color: 'primary'
                },
                {
                    icon: 'bi-people',
                    title: 'Invite Team',
                    description: 'Add team members',
                    color: 'success'
                },
                {
                    icon: 'bi-file-earmark-text',
                    title: 'Reports',
                    description: 'View analytics',
                    color: 'info'
                },
                {
                    icon: 'bi-gear',
                    title: 'Settings',
                    description: 'Configure workspace',
                    color: 'secondary'
                }
            ],
            chartData: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                values: [65, 78, 90, 81, 95, 88, 92]
            }
        };
    }

    async onEnter() {
        await super.onEnter();

        // Set page title
        document.title = `${DashboardPage.title} - ${this.app.name}`;

        // Get current user
        const user = this.authManager?.getUser();
        if (user) {
            this.updateData({ user });
        }

        // Simulate loading fresh data
        this.loadDashboardData();
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Initialize any charts or widgets
        this.initializeChart();

        // Initialize tooltips
        const tooltips = this.element.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => {
            new bootstrap.Tooltip(el);
        });
    }

    /**
     * Simulate loading dashboard data
     */
    async loadDashboardData() {
        // In a real app, this would fetch from API
        setTimeout(() => {
            // Update stats with "fresh" data
            this.updateData({
                stats: {
                    totalUsers: 1234 + Math.floor(Math.random() * 10),
                    activeProjects: 8 + Math.floor(Math.random() * 3),
                    completedTasks: 42 + Math.floor(Math.random() * 5),
                    pendingReviews: 5 + Math.floor(Math.random() * 3)
                }
            });
        }, 500);
    }

    /**
     * Initialize simple chart visualization
     */
    initializeChart() {
        const chartContainer = this.element.querySelector('#activityChart');
        if (!chartContainer) return;

        // Create simple bar chart using CSS
        const maxValue = Math.max(...this.data.chartData.values);
        const chartHTML = this.data.chartData.labels.map((label, index) => {
            const value = this.data.chartData.values[index];
            const height = (value / maxValue) * 100;

            return `
                <div class="chart-bar" style="height: 150px; position: relative;">
                    <div class="bar" style="
                        position: absolute;
                        bottom: 0;
                        width: 100%;
                        height: ${height}%;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 4px 4px 0 0;
                        transition: all 0.3s;
                        cursor: pointer;
                    " data-bs-toggle="tooltip" title="${value} activities">
                    </div>
                    <div class="label" style="
                        position: absolute;
                        bottom: -25px;
                        width: 100%;
                        text-align: center;
                        font-size: 12px;
                        color: #6c757d;
                    ">${label}</div>
                </div>
            `;
        }).join('');

        chartContainer.innerHTML = `
            <div style="display: flex; justify-content: space-around; align-items: flex-end; padding: 20px 0;">
                ${chartHTML}
            </div>
        `;

        // Re-initialize tooltips for chart
        const chartTooltips = chartContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
        chartTooltips.forEach(el => {
            new bootstrap.Tooltip(el);
        });
    }

    /**
     * Handle quick action clicks
     */
    async onActionQuickAction(event, element) {
        event.preventDefault();
        const action = element.dataset.action;

        switch (action) {
            case 'new-project':
                this.app.showInfo('New project feature coming soon!');
                break;
            case 'invite-team':
                this.app.showInfo('Team invitation feature coming soon!');
                break;
            case 'reports':
                this.app.showInfo('Reports feature coming soon!');
                break;
            case 'settings':
                this.app.navigate('settings');
                break;
            default:
                console.log('Unknown action:', action);
        }
    }

    /**
     * Handle activity item clicks
     */
    async onActionViewActivity(event, element) {
        event.preventDefault();
        const activityId = element.dataset.id;
        this.app.showInfo(`Viewing activity: ${activityId}`);
    }

    /**
     * Refresh dashboard data
     */
    async onActionRefresh(event) {
        event.preventDefault();

        // Show loading state
        const refreshBtn = event.target.closest('button');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.classList.add('spin');
            }
        }

        // Reload data
        await this.loadDashboardData();

        // Reset button state
        setTimeout(() => {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                const icon = refreshBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('spin');
                }
            }
            this.app.showSuccess('Dashboard refreshed');
        }, 1000);
    }

    async onExit() {
        await super.onExit();

        // Clean up tooltips
        const tooltips = this.element.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(el);
            if (tooltipInstance) {
                tooltipInstance.dispose();
            }
        });
    }
}
