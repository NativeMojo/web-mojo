/**
 * ViewBasicsPage - Demonstrates fundamental View concepts
 * Shows lifecycle methods, data binding, and event handling
 */

import Page from '../../../src/core/Page.js';
import View from '../../../src/core/View.js';

/**
 * Example custom View component for demonstration
 */
class CounterView extends View {
    constructor(options = {}) {
        super({
            ...options,
            tagName: 'div',
            className: 'card'
        });
        
        this.count = 0;
    }
    
    async getTemplate() {
        return `
            <div class="card-body">
                <h5 class="card-title">Counter Component</h5>
                <p class="card-text">
                    This is a simple View component with state and event handling.
                </p>
                <div class="d-flex align-items-center gap-3">
                    <button class="btn btn-primary" data-action="increment">
                        <i class="bi bi-plus"></i>
                    </button>
                    <span class="fs-3 fw-bold">{{count}}</span>
                    <button class="btn btn-primary" data-action="decrement">
                        <i class="bi bi-dash"></i>
                    </button>
                </div>
                <div class="mt-3">
                    <small class="text-muted">
                        Lifecycle status: {{lifecycleStatus}}
                    </small>
                </div>
            </div>
        `;
    }
    
    async getViewData() {
        return {
            count: this.count,
            lifecycleStatus: 'Rendered'
        };
    }
    
    async onActionIncrement() {
        this.count++;
        await this.render();
    }
    
    async onActionDecrement() {
        this.count--;
        await this.render();
    }
    
    async onAfterMount() {
        console.log('CounterView mounted');
    }
}

/**
 * Main page demonstrating View basics
 */
export default class ViewBasicsPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            pageName: 'view-basics',
            title: 'View Basics',
            pageIcon: 'bi-layers',
            pageDescription: 'Learn the fundamentals of MOJO Views'
        });
        
        // Use external template
        this.templateUrl = './pages/view-basics/view-basics.html';
        
        // Initialize child views
        this.counterView = null;
        this.lifecycleDemo = null;
    }
    
    /**
     * Initialize page data
     */
    async onInit() {
        this.data = {
            concepts: [
                {
                    title: 'Component Structure',
                    description: 'Views are ES6 classes that extend the base View class'
                },
                {
                    title: 'Template System',
                    description: 'Templates can be inline or external HTML files using Mustache syntax'
                },
                {
                    title: 'Lifecycle Hooks',
                    description: 'Views have lifecycle methods like onInit, onBeforeRender, onAfterMount'
                },
                {
                    title: 'Event Handling',
                    description: 'Declarative event binding with data-action attributes'
                }
            ],
            lifecycleMethods: [
                { name: 'onInit', status: 'Called', description: 'Component initialization' },
                { name: 'onBeforeRender', status: 'Pending', description: 'Before template rendering' },
                { name: 'onAfterRender', status: 'Pending', description: 'After template rendering' },
                { name: 'onBeforeMount', status: 'Pending', description: 'Before DOM insertion' },
                { name: 'onAfterMount', status: 'Pending', description: 'After DOM insertion' },
                { name: 'onBeforeDestroy', status: 'Pending', description: 'Before cleanup' }
            ]
        };
    }
    
    /**
     * Called after the page is mounted to the DOM
     */
    async onAfterMount() {
        await super.onAfterMount();
        
        // Create and mount the counter component
        const counterContainer = this.element.querySelector('#counter-container');
        if (counterContainer) {
            this.counterView = new CounterView({
                id: 'counter-demo'
            });
            this.counterView.setContainer(counterContainer);
            await this.counterView.render();
            await this.counterView.mount();
        }
        
        // Update lifecycle status
        this.updateLifecycleStatus('onAfterMount', 'Called');
    }
    
    /**
     * Update lifecycle method status in the UI
     */
    updateLifecycleStatus(methodName, status) {
        const element = this.element.querySelector(`[data-method="${methodName}"]`);
        if (element) {
            const badge = element.querySelector('.badge');
            if (badge) {
                badge.textContent = status;
                badge.className = status === 'Called' 
                    ? 'badge bg-success' 
                    : 'badge bg-secondary';
            }
        }
    }
    
    /**
     * Called before render
     */
    async onBeforeRender() {
        await super.onBeforeRender();
        this.updateLifecycleStatus('onBeforeRender', 'Called');
    }
    
    /**
     * Called after render
     */
    async onAfterRender() {
        await super.onAfterRender();
        this.updateLifecycleStatus('onAfterRender', 'Called');
    }
    
    /**
     * Called before mount
     */
    async onBeforeMount() {
        await super.onBeforeMount();
        this.updateLifecycleStatus('onBeforeMount', 'Called');
    }
    
    /**
     * Handle demo actions
     */
    async onActionRunDemo(event, element) {
        const demoType = element.dataset.demo;
        
        switch (demoType) {
            case 'render':
                await this.render();
                this.showSuccess('View re-rendered successfully');
                break;
                
            case 'update-data':
                this.data.message = `Updated at ${new Date().toLocaleTimeString()}`;
                await this.render();
                this.showSuccess('Data updated and view re-rendered');
                break;
                
            case 'create-child':
                const container = this.element.querySelector('#dynamic-container');
                if (container) {
                    const childView = new View({
                        id: `child-${Date.now()}`,
                        template: '<div class="alert alert-info">Dynamic child view created!</div>'
                    });
                    childView.setContainer(container);
                    await childView.render();
                    await childView.mount();
                    this.showSuccess('Child view created');
                }
                break;
        }
    }
    
    /**
     * View source code
     */
    async onActionViewSource(event, element) {
        const file = element.dataset.file;
        if (file) {
            // In a real app, this would open a dialog with the source
            window.open(`/examples/pages/view-basics/${file}`, '_blank');
        }
    }
    
    /**
     * Clean up when page is destroyed
     */
    async onBeforeDestroy() {
        // Clean up child views
        if (this.counterView) {
            await this.counterView.destroy();
        }
        
        await super.onBeforeDestroy();
    }
}