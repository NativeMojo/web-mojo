/**
 * ComponentsPage - Showcases MOJO framework components
 * Demonstrates built-in components and their usage
 */

import Page from '../../../src/core/Page.js';

export default class ComponentsPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            pageName: 'components',
            title: 'Components',
            pageIcon: 'bi-puzzle',
            pageDescription: 'Explore MOJO\'s built-in components'
        });

        // Use external template
        this.templateUrl = './pages/components/components.html';
    }

    /**
     * Initialize page data
     */
    async onInit() {
        this.data = {
            componentCategories: [
                {
                    name: 'Layout Components',
                    description: 'App, TopNav, Sidebar, MainContent',
                    icon: 'bi-layout-text-window-reverse'
                },
                {
                    name: 'Data Components',
                    description: 'Table, DataList, Model',
                    icon: 'bi-table'
                },
                {
                    name: 'Form Components',
                    description: 'FormBuilder, form controls',
                    icon: 'bi-input-cursor-text'
                },
                {
                    name: 'UI Components',
                    description: 'Dialog, notifications, alerts',
                    icon: 'bi-window-stack'
                }
            ],
            message: 'Components showcase coming in Phase 2'
        };
    }

    /**
     * View source code
     */
    async onActionViewSource(event, element) {
        const file = element.dataset.file;
        if (file) {
            window.open(`/examples/pages/components/${file}`, '_blank');
        }
    }
}