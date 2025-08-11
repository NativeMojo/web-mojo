/**
 * HomePage - Landing page for MOJO Examples
 * Demonstrates basic Page structure with external template
 */

import Page from '../../../src/core/Page.js';

export default class HomePage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            pageName: 'home',
            title: 'MOJO Framework Examples',
            pageIcon: 'bi-house',
            pageDescription: 'Learn MOJO through practical examples'
        });

        // Use external template file
        this.templateUrl = './pages/home/home.html';
    }

    /**
     * Initialize page data
     */
    async onInit() {
        // Set up page data
        this.data = {
            frameworkVersion: '2.0.0',
            features: [
                {
                    icon: 'bi-lightning-charge',
                    title: 'Lightning Fast',
                    description: 'Built with modern ES6+ for optimal performance'
                },
                {
                    icon: 'bi-box-seam',
                    title: 'Component Based',
                    description: 'Modular architecture with reusable components'
                },
                {
                    icon: 'bi-code-slash',
                    title: 'Simple API',
                    description: 'Clean, intuitive API that\'s easy to learn'
                },
                {
                    icon: 'bi-bootstrap',
                    title: 'Bootstrap 5',
                    description: 'Built on Bootstrap 5 for beautiful UIs'
                }
            ],
            quickLinks: [
                {
                    title: 'View Basics',
                    description: 'Learn the fundamentals of Views',
                    page: 'view-basics',
                    icon: 'bi-layers'
                },
                {
                    title: 'Components',
                    description: 'Explore built-in components',
                    page: 'components',
                    icon: 'bi-puzzle'
                },
                {
                    title: 'Pages & Routing',
                    description: 'Navigation and routing patterns',
                    page: 'pages-routing',
                    icon: 'bi-signpost-2'
                }
            ]
        };
    }

    /**
     * Handle quick link navigation
     */
    async onActionNavigate(event, element) {
        const page = element.dataset.page;
        if (page && window.MOJO?.router) {
            await window.MOJO.router.navigate(page);
        }
    }

    /**
     * Handle view source action
     */
    async onActionViewSource(event, element) {
        const file = element.dataset.file;
        if (file) {
            window.open(`/examples/pages/home/${file}`, '_blank');
        }
    }
}