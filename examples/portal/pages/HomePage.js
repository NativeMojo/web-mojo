/**
 * HomePage - Simple landing page for the portal example
 */

import { Page } from 'web-mojo';

class HomePage extends Page {
    static pageName = 'home';
    static title = 'Home - Portal Example';
    static icon = 'bi-house';
    static route = 'home';

    constructor(options = {}) {
        super({
            ...options,
            pageName: HomePage.pageName,
            route: HomePage.route,
            pageIcon: HomePage.icon,
            template: 'templates/home.mst'
        });
    }

    async onInit() {
        // Initialize page data
        this.stats = {
            users: 1234,
            projects: 56,
            tasks: 789,
            messages: 42
        };
    }

    async onEnter() {
        await super.onEnter();
        console.log('HomePage entered');

        // Set page title
        document.title = HomePage.title;
    }

    async onActionTestApi() {
        if (!window.APP) return;

        try {
            window.APP.showLoading('Testing API...');

            // Test REST API
            const response = await window.APP.rest.GET('/users', { _limit: 3 });

            window.APP.hideLoading();

            if (response.data) {
                window.APP.showSuccess(`Fetched ${response.data.length} users successfully!`);
                console.log('API Response:', response);
            }
        } catch (error) {
            window.APP.hideLoading();
            window.APP.showError('Failed to fetch data');
            console.error('API Error:', error);
        }
    }
}

export default HomePage;
