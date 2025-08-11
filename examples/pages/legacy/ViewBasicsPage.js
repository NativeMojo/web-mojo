/**
 * ViewBasicsPage - Demonstrates MOJO View class features
 * Shows parent-child relationships, model binding, and lifecycle hooks
 */

import Page from '../../src/core/Page.js';
import View from '../../src/core/View.js';
import Model from '../../src/core/Model.js';

// Custom View classes for demonstration
class InfoView extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: `
                <div class="alert alert-info">
                    <h6>{{title}}</h6>
                    <p>{{message}}</p>
                    <small>View ID: {{id}} | Rendered: {{renderCount}} times</small>
                </div>
            `
        });
        this.data.renderCount = 0;
    }

    async onBeforeRender() {
        this.data.renderCount++;
        this.logLifecycle('onBeforeRender');
    }

    async onAfterRender() {
        this.logLifecycle('onAfterRender');
    }

    async onAfterMount() {
        this.logLifecycle('onAfterMount');
    }

    logLifecycle(method) {
        // Simple console.log for lifecycle events
        console.log(`[${this.id}] ${method}`);
    }
}

class ParentView extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: `
                <div class="parent-view border border-primary p-3 mb-3">
                    <h5 class="text-primary">Parent View: {{title}}</h5>
                    <p>{{description}}</p>
                    <div class="children-container">
                        <div id="child1"></div>
                        <div id="child2"></div>
                    </div>
                </div>
            `
        });
    }

    onInit() {
        // Add child views
        this.addChild(new ChildView({
            id: 'child1',
            data: {
                title: 'First Child',
                value: 100
            }
        }));

        this.addChild(new ChildView({
            id: 'child2',
            data: {
                title: 'Second Child',
                value: 200
            }
        }));
    }
}

class ChildView extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: `
                <div class="child-view border border-warning p-2 m-2">
                    <h6 class="text-warning">Child: {{title}}</h6>
                    <span class="badge bg-warning text-dark">Value: {{value}}</span>
                    <div id="grandchild"></div>
                </div>
            `
        });
    }

    onInit() {
        if (this.id === 'child1') {
            this.addChild(new GrandchildView({
                id: 'grandchild',
                data: {
                    message: 'I am a grandchild of the parent!'
                }
            }));
        }
    }
}

class GrandchildView extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: `
                <div class="grandchild-view border border-success p-2 mt-2">
                    <small class="text-success">{{message}}</small>
                </div>
            `
        });
    }
}

class ModelBoundView extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: `
                <div class="model-view border border-success p-3">
                    <h5 class="text-success">Model-Bound View</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Name:</strong> {{name}}</p>
                            <p><strong>Count:</strong> {{count}}</p>
                            <p><strong>Updated:</strong> {{lastUpdated}}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Items:</h6>
                            <ul class="list-group list-group-sm">
                                {{#items}}
                                <li class="list-group-item">{{.}}</li>
                                {{/items}}
                                {{^items}}
                                <li class="list-group-item">No items yet</li>
                                {{/items}}
                            </ul>
                        </div>
                    </div>
                    <div class="mt-2">
                        <small class="text-muted">This view auto-updates when the model changes</small>
                    </div>
                </div>
            `
        });
    }

    async onAfterRender() {
        // Simple console.log for render events
        console.log(`ModelBoundView rendered with count: ${this.model?.get('count') || 0}`);
    }
}

class ViewBasicsPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            name: 'viewbasics',
            title: 'View Basics'
        });
        
        // Initialize properties immediately
        this.consoleMessages = [];
        this.demoModel = null;
    }

    async getTemplate() {
        return `
            <div class="container-fluid">
                <div class="row mb-4">
                    <div class="col-12">
                        <h2>View Basics</h2>
                        <p class="lead">Understanding the MOJO View class: parent-child relationships, model binding, and lifecycle hooks</p>
                    </div>
                </div>

                <!-- Example 1: Basic View -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">Example 1: Basic View with Lifecycle</h5>
                    </div>
                    <div class="card-body">
                        <div id="basic-view"></div>
                        <button class="btn btn-sm btn-primary mt-2" data-action="update-basic">Update View</button>
                    </div>
                </div>

                <!-- Example 2: Parent-Child Hierarchy -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">Example 2: Parent-Child-Grandchild Hierarchy</h5>
                    </div>
                    <div class="card-body">
                        <div id="hierarchy-view"></div>
                    </div>
                </div>

                <!-- Example 3: Model Binding -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">Example 3: Model Binding with Auto-Update</h5>
                    </div>
                    <div class="card-body">
                        <div id="model-view"></div>
                        <div class="btn-group mt-3" role="group">
                            <button class="btn btn-sm btn-success" data-action="increment-model">Increment Count</button>
                            <button class="btn btn-sm btn-info" data-action="add-item">Add Item</button>
                            <button class="btn btn-sm btn-warning" data-action="update-name">Change Name</button>
                            <button class="btn btn-sm btn-danger" data-action="reset-model">Reset Model</button>
                        </div>
                    </div>
                </div>

                <!-- Console Output -->
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Console Output</h5>
                        <button class="btn btn-sm btn-secondary" data-action="clear-console">Clear</button>
                    </div>
                    <div class="card-body">
                        <div id="console-output" class="bg-dark text-light p-3" style="height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px;">
                            <div class="text-info">Console initialized...</div>
                        </div>
                    </div>
                </div>

                <!-- Code Examples -->
                <div class="card mt-3">
                    <div class="card-header">
                        <h5 class="mb-0">Code Examples</h5>
                    </div>
                    <div class="card-body">
                        <ul class="nav nav-tabs" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link active" data-bs-toggle="tab" href="#basic-code">Basic View</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" data-bs-toggle="tab" href="#parent-child-code">Parent-Child</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" data-bs-toggle="tab" href="#model-code">Model Binding</a>
                            </li>
                        </ul>
                        <div class="tab-content pt-3">
                            <div class="tab-pane fade show active" id="basic-code">
                                <pre class="bg-light p-3"><code>// Basic View with lifecycle hooks
class MyView extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: '&lt;div&gt;{{message}}&lt;/div&gt;'
        });
    }
    
    async onInit() {
        console.log('View initialized');
    }
    
    async onBeforeRender() {
        console.log('About to render');
    }
    
    async onAfterMount() {
        console.log('View mounted to DOM');
    }
}

const view = new MyView({ 
    id: 'my-view',
    data: { message: 'Hello World' }
});
await view.render(); // Finds #my-view in body or appends to body</code></pre>
                            </div>
                            <div class="tab-pane fade" id="parent-child-code">
                                <pre class="bg-light p-3"><code>// Parent-Child relationship
const parent = new ParentView({ id: 'parent' });
const child = new ChildView({ id: 'child' });

parent.addChild(child);
await parent.render();

// Parent template should include placeholder:
// template: '&lt;div&gt;Parent content &lt;div id="child"&gt;&lt;/div&gt;&lt;/div&gt;'

// Child automatically finds its placeholder in parent's DOM
// Or appends to parent if no placeholder found</code></pre>
                            </div>
                            <div class="tab-pane fade" id="model-code">
                                <pre class="bg-light p-3"><code>// Model binding with auto-update
const model = new Model({
    name: 'John',
    age: 30
});

const view = new View({
    id: 'model-view',
    template: '&lt;div&gt;{{name}} ({{age}} years old)&lt;/div&gt;'
});

view.setModel(model);
await view.render();

// View automatically re-renders when model changes
model.set('age', 31); // Triggers re-render
model.set({ name: 'Jane', age: 25 }); // Also triggers re-render</code></pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {
        // Create a model for demonstration
        this.demoModel = new Model({
            name: 'Demo Model',
            count: 0,
            lastUpdated: new Date().toLocaleTimeString(),
            items: ['Initial item']
        });
        
        this.logToConsole('ViewBasicsPage initialized', 'info');
        
        // Initialize child views after properties are set
        this.initializeViews();
    }

    initializeViews() {
        // Basic view
        this.basicView = new InfoView({
            id: 'basic-view',
            data: {
                title: 'Basic View Instance',
                message: 'This is a simple view with lifecycle logging'
            }
        });
        // Set up parent reference before adding as child
        this.addChild(this.basicView);

        // Parent-child hierarchy
        this.hierarchyView = new ParentView({
            id: 'hierarchy-view',
            data: {
                title: 'Parent Container',
                description: 'I contain child views, which can contain their own children'
            }
        });
        this.addChild(this.hierarchyView);

        // Model-bound view
        this.modelView = new ModelBoundView({
            id: 'model-view'
        });
        this.modelView.setModel(this.demoModel);
        this.addChild(this.modelView);

        this.logToConsole('All views initialized and added as children', 'success');
    }

    async onAfterMount() {
        this.logToConsole('Page mounted, all views rendered', 'success');
    }

    // Action handlers
    async onActionUpdateBasic() {
        this.basicView.data.message = `Updated at ${new Date().toLocaleTimeString()}`;
        await this.basicView.render();
        this.logToConsole('Basic view updated and re-rendered', 'info');
    }

    async onActionIncrementModel() {
        const currentCount = this.demoModel.get('count');
        this.demoModel.set({
            count: currentCount + 1,
            lastUpdated: new Date().toLocaleTimeString()
        });
        this.logToConsole(`Model count incremented to ${currentCount + 1}`, 'success');
    }

    async onActionAddItem() {
        const items = this.demoModel.get('items') || [];
        items.push(`Item ${items.length + 1}`);
        this.demoModel.set({
            items: items,
            lastUpdated: new Date().toLocaleTimeString()
        });
        this.logToConsole(`Added item to model (total: ${items.length})`, 'success');
    }

    async onActionUpdateName() {
        const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
        const randomName = names[Math.floor(Math.random() * names.length)];
        this.demoModel.set({
            name: randomName,
            lastUpdated: new Date().toLocaleTimeString()
        });
        this.logToConsole(`Model name changed to ${randomName}`, 'info');
    }

    async onActionResetModel() {
        this.demoModel.set({
            name: 'Demo Model',
            count: 0,
            lastUpdated: new Date().toLocaleTimeString(),
            items: ['Initial item']
        });
        this.logToConsole('Model reset to initial state', 'warning');
    }

    async onActionClearConsole() {
        this.consoleMessages = [];
        this.updateConsole();
        this.logToConsole('Console cleared', 'info');
    }

    logToConsole(message, type = 'info') {
        // Ensure consoleMessages exists
        if (!this.consoleMessages) {
            this.consoleMessages = [];
        }
        
        const timestamp = new Date().toLocaleTimeString();
        this.consoleMessages.push({
            message,
            type,
            timestamp
        });
        
        // Keep only last 50 messages
        if (this.consoleMessages.length > 50) {
            this.consoleMessages.shift();
        }
        
        this.updateConsole();
    }

    updateConsole() {
        const consoleElement = document.querySelector('#console-output');
        if (!consoleElement) return;

        const typeClasses = {
            info: 'text-info',
            success: 'text-success',
            warning: 'text-warning',
            error: 'text-danger'
        };

        const html = this.consoleMessages
            .map(msg => `<div class="${typeClasses[msg.type] || 'text-light'}">[${msg.timestamp}] ${msg.message}</div>`)
            .join('');

        consoleElement.innerHTML = html || '<div class="text-info">Console initialized...</div>';
        
        // Auto-scroll to bottom
        consoleElement.scrollTop = consoleElement.scrollHeight;
    }
}

export default ViewBasicsPage;