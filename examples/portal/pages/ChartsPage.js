/**
 * ChartsPage - Interactive charts showcase for the portal example
 * Demonstrates SeriesChart and PieChart components with real-world data
 */

import { Page } from 'web-mojo';
import { SeriesChart, PieChart } from 'web-mojo/charts';

class ChartsPage extends Page {
    static pageName = 'charts';
    static title = 'Charts - Interactive Data Visualization';
    static icon = 'bi-bar-chart';
    static route = 'charts';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ChartsPage.pageName,
            route: ChartsPage.route,
            pageIcon: ChartsPage.icon,
            template: 'templates/charts.mst'
        });

        // Chart instances
        this.charts = {};
    }

    async onInit() {
        // Dashboard data for charts
        this.data = {
            pageTitle: 'Interactive Charts Dashboard',
            pageSubtitle: 'Real-time data visualization with Chart.js integration',

            // Sample business data
            monthlyRevenue: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue ($)',
                    data: [45000, 52000, 48000, 61000, 55000, 67000],
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },

            quarterlyGrowth: {
                labels: ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024'],
                datasets: [{
                    label: 'Growth Rate (%)',
                    data: [8.5, 12.3, 15.7, 18.2, 22.1],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 2
                }]
            },

            userSegments: [
                { label: 'Enterprise', value: 45 },
                { label: 'Small Business', value: 30 },
                { label: 'Freelancers', value: 15 },
                { label: 'Students', value: 10 }
            ],

            salesChannels: [
                { label: 'Direct Sales', value: 35000 },
                { label: 'Online Store', value: 48000 },
                { label: 'Partner Network', value: 22000 },
                { label: 'Mobile App', value: 18000 },
                { label: 'Social Commerce', value: 12000 }
            ],

            performanceMetrics: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Page Views',
                        data: [1200, 1900, 1500, 2200, 1800, 2400, 2100],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Conversions',
                        data: [24, 38, 30, 44, 36, 48, 42],
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        yAxisID: 'y1'
                    }
                ]
            },

            // Statistics for the dashboard cards
            stats: {
                totalRevenue: '$328K',
                revenueChange: '+12.5%',
                activeUsers: '2,847',
                usersChange: '+8.2%',
                conversionRate: '3.24%',
                conversionChange: '-0.5%',
                avgOrderValue: '$156',
                orderValueChange: '+5.1%'
            }
        };

        // Expose commonly used data directly on view for template access
        this.stats = this.data.stats;
        this.pageTitle = this.data.pageTitle;
        this.pageSubtitle = this.data.pageSubtitle;
    }

    async onAfterMount() {
        await this.createCharts();
        this.setupEventListeners();
    }

    async createCharts() {
        try {
            // Revenue Trend Chart (Line)
            this.charts.revenue = new SeriesChart({
                title: 'Monthly Revenue Trend',
                chartType: 'line',
                data: this.data.monthlyRevenue,
                yAxis: {
                    formatter: 'currency',
                    label: 'Revenue ($)',
                    beginAtZero: true
                },
                tooltip: {
                    y: 'currency'
                },
                exportEnabled: true,
                theme: 'light',
                containerId: 'revenue-chart'
            });

            this.addChild(this.charts.revenue);

            // Growth Rate Chart (Bar)
            this.charts.growth = new SeriesChart({
                title: 'Quarterly Growth Rate',
                chartType: 'bar',
                data: this.data.quarterlyGrowth,
                yAxis: {
                    formatter: 'number',
                    label: 'Growth Rate (%)',
                    beginAtZero: true
                },
                exportEnabled: true,
                allowTypeSwitch: true,
                containerId: 'growth-chart'
            });

            this.addChild(this.charts.growth);

            // Show success message for first chart load
            // if (Object.keys(this.charts).length === 2) {
            //     this.showSuccess(
            //         `Interactive dashboard loaded successfully!<br>
            //          <small class="text-muted">💡 Click chart elements for details • Export as PNG or CSV</small>`,
            //         'Charts Ready'
            //     );
            // }

            // User Segments (Pie)
            this.charts.segments = new PieChart({
                title: 'User Segments Distribution',
                data: this.data.userSegments,
                colors: [
                    '#FF6B6B', // Enterprise - Red
                    '#4ECDC4', // Small Business - Teal
                    '#45B7D1', // Freelancers - Blue
                    '#96CEB4'  // Students - Green
                ],
                valueFormatter: 'percent',
                exportEnabled: true,
                clickable: true,
                containerId: 'segments-chart'
            });

            this.addChild(this.charts.segments);

            // Sales Channels (Doughnut)
            this.charts.channels = new PieChart({
                title: 'Sales Channels Performance',
                data: this.data.salesChannels,
                cutout: '60%',
                colors: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)'
                ],
                valueFormatter: 'currency',
                exportEnabled: true,
                showLabels: true,
                containerId: 'channels-chart'
            });

            this.addChild(this.charts.channels);

            // Performance Metrics (Dual Y-axis) - Advanced case
            this.charts.performance = new SeriesChart({
                title: 'Weekly Performance Metrics',
                chartType: 'line',
                data: this.data.performanceMetrics,
                // For dual-axis charts, we still need chartOptions
                chartOptions: {
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Page Views'
                            },
                            ticks: {
                                callback: (value) => value.toLocaleString()
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Conversions'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                            ticks: {
                                callback: (value) => value.toLocaleString()
                            }
                        }
                    }
                },
                exportEnabled: true,
                allowTypeSwitch: true,
                containerId: 'performance-chart'
            });

            this.addChild(this.charts.performance);

        } catch (error) {
            console.error('Error creating charts:', error);
            this.showError('Failed to load charts');
        }
    }

    setupEventListeners() {
        // Listen for chart events
        const app = this.getApp();
        if (app && app.events) {
            app.events.on('chart:segment-clicked', (data) => {
                this.onSegmentClicked(data);
            });

            app.events.on('chart:point-clicked', (data) => {
                this.onPointClicked(data);
            });

            app.events.on('chart:type-changed', (data) => {
                this.onChartTypeChanged(data);
            });
        }

        // Theme toggle
        const themeToggle = this.element.querySelector('[data-action="toggle-theme"]');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleChartsTheme();
            });
        }

        // Refresh all charts
        const refreshButton = this.element.querySelector('[data-action="refresh-charts"]');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshAllCharts();
            });
        }

        // Export all charts
        const exportButton = this.element.querySelector('[data-action="export-dashboard"]');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.exportDashboard();
            });
        }
    }

    onSegmentClicked(data) {
        // Show detailed info about the clicked segment
        const { chart, label, value, percentage } = data;

        this.showInfo(
            `<strong>${label}</strong><br>` +
            `Value: ${typeof value === 'number' ? value.toLocaleString() : value}<br>` +
            `Percentage: ${percentage}%<br>` +
            `<small class="text-muted">💡 Tip: Use export buttons to save chart data as CSV</small>`,
            `${chart.title} - Segment Details`
        );
    }

    onPointClicked(data) {
        const { chart, label, value } = data;

        this.showInfo(
            `<strong>${label}</strong><br>` +
            `Value: ${typeof value === 'number' ? value.toLocaleString() : value}<br>` +
            `<small class="text-muted">📊 Chart: ${chart.title}</small>`,
            'Data Point Details'
        );
    }

    onChartTypeChanged(data) {
        const { chart, oldType, newType } = data;

        this.showSuccess(
            `<strong>${chart.title}</strong><br>` +
            `Chart type changed from ${oldType} to ${newType}<br>` +
            `<small class="text-muted">✨ Data automatically adapts to new visualization</small>`,
            'Chart Type Updated'
        );
    }

    toggleChartsTheme() {
        const currentTheme = document.body.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.body.setAttribute('data-theme', newTheme);

        // Update all charts
        Object.values(this.charts).forEach(chart => {
            if (chart.setTheme) {
                chart.setTheme(newTheme);
            }
        });

        const themeIcon = newTheme === 'dark' ? '🌙' : '☀️';
        this.showSuccess(
            `${themeIcon} Theme switched to ${newTheme} mode<br>` +
            `<small class="text-muted">All ${Object.keys(this.charts).length} charts updated automatically</small>`,
            'Theme Updated'
        );
    }

    async refreshAllCharts() {
        // Simulate data refresh with loading indicator
        const chartCount = Object.keys(this.charts).length;
        this.showInfo(
            `🔄 Refreshing ${chartCount} charts with live data...<br>` +
            `<small class="text-muted">Simulating real-time updates</small>`,
            'Data Update'
        );

        // Add some random variation to simulate real data changes
        Object.keys(this.data.monthlyRevenue.datasets[0].data).forEach(key => {
            const currentValue = this.data.monthlyRevenue.datasets[0].data[key];
            const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
            this.data.monthlyRevenue.datasets[0].data[key] = Math.round(currentValue * (1 + variation));
        });

        // Update charts with new data
        if (this.charts.revenue && this.charts.revenue.setData) {
            await this.charts.revenue.setData(this.data.monthlyRevenue);
        }

        // Show enhanced success message
        this.showSuccess(
            `✅ ${chartCount} charts updated successfully<br>` +
            `📊 Revenue data refreshed with ±5% variation<br>` +
            `<small class="text-muted">💡 Try exporting updated data as CSV</small>`,
            'Refresh Complete'
        );
    }

    exportDashboard() {
        const exportFormats = ['png', 'csv'];
        let exportCount = 0;
        const totalExports = Object.keys(this.charts).length * exportFormats.length;

        this.showInfo(
            `Exporting ${Object.keys(this.charts).length} charts in multiple formats...<br>` +
            `<small class="text-muted">📊 PNG images and 📄 CSV data files</small>`,
            'Export Started'
        );

        // Export each chart in multiple formats
        Object.entries(this.charts).forEach(([name, chart], chartIndex) => {
            exportFormats.forEach((format, formatIndex) => {
                if (chart.export) {
                    const delay = (chartIndex * exportFormats.length + formatIndex) * 200;
                    setTimeout(() => {
                        chart.export(format);
                        exportCount++;

                        if (exportCount === totalExports) {
                            this.showSuccess(
                                `Successfully exported ${Object.keys(this.charts).length} charts:<br>` +
                                `• PNG images for presentations<br>` +
                                `• CSV data for spreadsheet analysis<br>` +
                                `<small class="text-muted">📁 Check your Downloads folder</small>`,
                                'Export Complete'
                            );
                        }
                    }, delay);
                }
            });
        });
    }

    // Cleanup
    async onBeforeDestroy() {
        // Destroy all charts
        Object.values(this.charts).forEach(chart => {
            if (chart.destroy) {
                chart.destroy();
            }
        });

        this.charts = {};
    }
}

export default ChartsPage;
