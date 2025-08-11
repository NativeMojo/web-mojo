/**
 * PagesRoutingPage - Demonstrates routing and navigation patterns
 * Shows how to work with pages and the router
 */

import Page from '../../../src/core/Page.js';

export default class PagesRoutingPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            pageName: 'pages-routing',
            title: 'Pages & Routing',
            pageIcon: 'bi-signpost-2',
            pageDescription: 'Learn about MOJO routing and navigation patterns'
        });

        // Use external template
        this.templateUrl = './pages/routing/pages-routing.html';
    }

    /**
     * Initialize page data
     */
    async onInit() {
        this.data = {
            routingConcepts: [
                {
                    title: 'Page Components',
                    description: 'Pages extend the base Page class and handle route changes',
                    icon: 'bi-file-earmark-code'
                },
                {
                    title: 'Router Modes',
                    description: 'Support for hash, history, and param-based routing',
                    icon: 'bi-gear'
                },
                {
                    title: 'Navigation',
                    description: 'Navigate using href links or programmatic router.navigate()',
                    icon: 'bi-compass'
                },
                {
                    title: 'Parameters',
                    description: 'Pass and receive parameters between pages',
                    icon: 'bi-sliders'
                }
            ],
            navigationExamples: [
                {
                    type: 'Link Navigation',
                    code: '<a href="?page=home">Home</a>',
                    description: 'Standard href navigation'
                },
                {
                    type: 'Data Action',
                    code: '<button data-page="home">Home</button>',
                    description: 'Button navigation with data-page'
                },
                {
                    type: 'Programmatic',
                    code: 'router.navigate("home")',
                    description: 'JavaScript navigation'
                },
                {
                    type: 'With Parameters',
                    code: 'router.navigate("user", { id: 123 })',
                    description: 'Navigate with parameters'
                }
            ],
            currentRoute: {
                page: this.pageName,
                params: {},
                mode: 'param'
            }
        };
    }

    /**
     * Handle navigation demos
     */
    async onActionNavigateDemo(event, element) {
        const target = element.dataset.target;
        const params = element.dataset.params ? JSON.parse(element.dataset.params) : {};
        
        if (window.MOJO?.router) {
            await window.MOJO.router.navigate(target, params);
        }
    }

    /**
     * Show route info
     */
    async onActionShowRouteInfo() {
        const router = window.MOJO?.router;
        if (router) {
            const info = {
                currentPage: router.currentPage,
                mode: router.mode,
                routes: Object.keys(router.routes || {})
            };
            
            this.showInfo(`Current Route: ${JSON.stringify(info, null, 2)}`);
        }
    }

    /**
     * View source code
     */
    async onActionViewSource(event, element) {
        const file = element.dataset.file;
        if (file) {
            window.open(`/examples/pages/routing/${file}`, '_blank');
        }
    }

    /**
     * Called when page receives parameters
     */
    async onParams(params, query) {
        await super.onParams(params, query);
        
        // Update current route info
        if (this.data) {
            this.data.currentRoute = {
                page: this.pageName,
                params: params,
                query: query,
                mode: window.MOJO?.router?.mode || 'unknown'
            };
        }
    }
}