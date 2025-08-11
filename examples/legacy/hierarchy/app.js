/**
 * MOJO Framework - Hierarchy Example
 * Demonstrates parent-child View relationships and communication
 */

import MOJO, { View, Page } from '../../src/mojo.js';

// Child View: Individual Card Component
class CardView extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="card child-card" style="margin-bottom: 10px;">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">{{title}}</h6>
                        <div>
                            <span class="badge bg-primary">ID: {{id}}</span>
                            <button class="btn btn-sm btn-outline-danger ms-2" data-action="removeMe">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <p class="card-text">{{content}}</p>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" data-action="edit">Edit</button>
                            <button class="btn btn-outline-success" data-action="notify">Notify Parent</button>
                            <button class="btn btn-outline-info" data-action="broadcast">Broadcast</button>
                        </div>
                    </div>
                </div>
            `,
            data: {
                id: Math.random().toString(36).substr(2, 9),
                title: options.title || 'Child Card',
                content: options.content || 'This is a child view component.'
            },
            className: 'card-view-wrapper',
            ...options
        });

        this.childIndex = options.childIndex || 0;
    }

    onInit() {
        console.log(`CardView ${this.data.id}: Initializing...`);
    }

    async onAfterMount() {
        console.log(`CardView ${this.data.id}: Mounted to DOM`);
        // Add a subtle animation
        this.element.style.opacity = '0';
        this.element.style.transform = 'translateY(20px)';

        setTimeout(() => {
            this.element.style.transition = 'all 0.3s ease';
            this.element.style.opacity = '1';
            this.element.style.transform = 'translateY(0)';
        }, 50);
    }

    async onActionRemoveMe() {
        // Request parent to remove this child
        this.emit('request-removal', { childId: this.data.id, view: this });
    }

    async onActionEdit() {
        const newTitle = prompt('Enter new title:', this.data.title);
        if (newTitle && newTitle.trim()) {
            this.updateData({ title: newTitle.trim() });
            this.emit('child-updated', {
                childId: this.data.id,
                field: 'title',
                value: newTitle.trim()
            });
        }
    }

    async onActionNotify() {
        // Send message to parent
        this.emit('child-message', {
            from: this.data.id,
            message: `Hello from child ${this.data.title}!`,
            timestamp: new Date().toLocaleTimeString()
        });
    }

    async onActionBroadcast() {
        // Broadcast to all siblings via parent
        this.emit('broadcast-to-siblings', {
            from: this.data.id,
            fromTitle: this.data.title,
            message: 'Broadcasting to all siblings!'
        });
    }

    async onBeforeDestroy() {
        console.log(`CardView ${this.data.id}: Being destroyed...`);
    }
}

// Parent View: Container for multiple cards
class CardContainerView extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="card-container">
                    <div class="card">
                        <div class="card-header">
                            <h5>{{title}}</h5>
                            <small class="text-muted">Children: <span id="child-count">{{childCount}}</span></small>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <div class="btn-group">
                                    <button class="btn btn-primary" data-action="addCard">
                                        <i class="fas fa-plus"></i> Add Card
                                    </button>
                                    <button class="btn btn-secondary" data-action="addMultiple">
                                        <i class="fas fa-plus-circle"></i> Add 3 Cards
                                    </button>
                                    <button class="btn btn-warning" data-action="clearAll">
                                        <i class="fas fa-trash"></i> Clear All
                                    </button>
                                </div>
                                <div class="btn-group ms-2">
                                    <button class="btn btn-info" data-action="showHierarchy">
                                        <i class="fas fa-sitemap"></i> Show Hierarchy
                                    </button>
                                    <button class="btn btn-success" data-action="broadcastToAll">
                                        <i class="fas fa-broadcast-tower"></i> Broadcast to All
                                    </button>
                                </div>
                            </div>

                            <div id="messages-area" class="messages-area mb-3" style="max-height: 200px; overflow-y: auto;"></div>

                            <div id="children-container" class="children-container">
                                <!-- Child views will be rendered here -->
                            </div>

                            <div class="mt-3 text-muted">
                                <small>
                                    <strong>Parent-Child Communication:</strong>
                                    Children can notify parent, parent can broadcast to all children,
                                    and siblings can communicate through the parent.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            data: {
                title: options.title || 'Card Container (Parent View)',
                childCount: 0
            },
            className: 'card-container-wrapper',
            ...options
        });

        this.cardCounter = 0;
        this.messages = [];
    }

    onInit() {
        console.log('CardContainerView: Initializing parent view...');
    }

    async onAfterRender() {
        // Update child count display
        this.updateChildCount();

        // Start with a few sample cards
        await this.addSampleCards();
    }

    async addSampleCards() {
        const sampleCards = [
            { title: 'First Child', content: 'I am the first child view in this container.' },
            { title: 'Second Child', content: 'I am the second child view. Try editing my title!' },
            { title: 'Third Child', content: 'I am the third child. Click "Notify Parent" to send a message.' }
        ];

        for (const cardData of sampleCards) {
            await this.createAndAddCard(cardData);
        }
    }

    async createAndAddCard(cardData = {}) {
        this.cardCounter++;

        const card = new CardView({
            title: cardData.title || `Card #${this.cardCounter}`,
            content: cardData.content || `This is card number ${this.cardCounter}. Try interacting with the buttons below!`,
            childIndex: this.cardCounter
        });

        // Set up event listeners for child communication
        this.setupChildEventListeners(card);

        // Add as child and render
        const childKey = `card-${this.cardCounter}`;
        this.addChild(card, childKey);

        await card.render('#children-container');

        this.updateChildCount();
        this.addMessage(`Added new card: ${card.data.title}`, 'info');

        return card;
    }

    setupChildEventListeners(childView) {
        // Listen for removal requests
        childView.on('request-removal', async (data) => {
            await this.removeChildView(data.view, data.childId);
        });

        // Listen for child messages
        childView.on('child-message', (data) => {
            this.addMessage(`Message from ${data.from}: ${data.message}`, 'success');
        });

        // Listen for child updates
        childView.on('child-updated', (data) => {
            this.addMessage(`Child ${data.childId} updated ${data.field} to: ${data.value}`, 'info');
        });

        // Listen for broadcast requests
        childView.on('broadcast-to-siblings', (data) => {
            this.broadcastToChildren(data, data.from);
        });
    }

    async removeChildView(childView, childId) {
        // Find the child key
        let childKey = null;
        for (const [key, child] of Object.entries(this.children)) {
            if (child.data.id === childId) {
                childKey = key;
                break;
            }
        }

        if (childKey) {
            await childView.destroy();
            this.removeChild(childKey);
            this.updateChildCount();
            this.addMessage(`Removed card: ${childId}`, 'warning');
        }
    }

    broadcastToChildren(message, excludeId = null) {
        const children = this.getChildren();
        let broadcastCount = 0;

        children.forEach(child => {
            if (child.data.id !== excludeId) {
                child.showInfo(`Broadcast: ${message.message} (from ${message.fromTitle})`);
                broadcastCount++;
            }
        });

        this.addMessage(`Broadcasted message to ${broadcastCount} children`, 'primary');
    }

    updateChildCount() {
        const count = this.getChildren().length;
        this.updateData({ childCount: count }, false);

        // Update the DOM directly for real-time updates
        const countElement = this.element?.querySelector('#child-count');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    addMessage(text, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        this.messages.push({ text, type, timestamp });

        // Keep only last 10 messages
        if (this.messages.length > 10) {
            this.messages.shift();
        }

        this.updateMessagesDisplay();
    }

    updateMessagesDisplay() {
        const messagesArea = this.element?.querySelector('#messages-area');
        if (!messagesArea) return;

        messagesArea.innerHTML = this.messages.map(msg => `
            <div class="alert alert-${msg.type} alert-sm py-2 mb-1">
                <small><strong>${msg.timestamp}:</strong> ${msg.text}</small>
            </div>
        `).join('');

        // Scroll to bottom
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    // Action Handlers
    async onActionAddCard() {
        await this.createAndAddCard();
    }

    async onActionAddMultiple() {
        for (let i = 0; i < 3; i++) {
            await this.createAndAddCard({
                title: `Batch Card #${i + 1}`,
                content: `This card was created in a batch operation.`
            });
        }
    }

    async onActionClearAll() {
        const children = this.getChildren();
        if (children.length === 0) {
            this.showInfo('No cards to remove');
            return;
        }

        if (confirm(`Remove all ${children.length} cards?`)) {
            for (const child of children) {
                await child.destroy();
            }

            // Clear all children
            this.children = {};
            this.updateChildCount();
            this.addMessage(`Cleared all ${children.length} cards`, 'danger');
        }
    }

    async onActionShowHierarchy() {
        const hierarchy = this.getHierarchyInfo();
        console.log('View Hierarchy:', hierarchy);
        alert(`View Hierarchy:\n${JSON.stringify(hierarchy, null, 2)}`);
    }

    async onActionBroadcastToAll() {
        const message = prompt('Enter message to broadcast to all children:');
        if (message && message.trim()) {
            this.broadcastToChildren({
                message: message.trim(),
                fromTitle: 'Parent Container'
            });
        }
    }

    getHierarchyInfo() {
        const children = this.getChildren();
        return {
            parentId: this.id || 'container',
            parentClass: this.constructor.name,
            childCount: children.length,
            children: children.map(child => ({
                id: child.data.id,
                class: child.constructor.name,
                title: child.data.title
            }))
        };
    }

    async onBeforeDestroy() {
        console.log('CardContainerView: Destroying parent and all children...');
        this.addMessage('Container being destroyed...', 'danger');
    }
}

// Main Hierarchy Demo Page
class HierarchyDemoPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'hierarchy-demo',
            route: '/hierarchy',
            template: `
                <div class="hierarchy-demo-page">
                    <div class="container">
                        <h1>MOJO Framework - Hierarchy Example</h1>
                        <p class="lead">
                            This example demonstrates parent-child View relationships,
                            communication, and lifecycle management.
                        </p>

                        <div class="row">
                            <div class="col-md-8">
                                <div id="container-view"></div>
                            </div>
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-header">
                                        <h6>Hierarchy Features</h6>
                                    </div>
                                    <div class="card-body">
                                        <ul class="list-unstyled">
                                            <li>✅ Parent-child relationships</li>
                                            <li>✅ Event communication</li>
                                            <li>✅ Lifecycle propagation</li>
                                            <li>✅ Dynamic add/remove</li>
                                            <li>✅ Message broadcasting</li>
                                        </ul>
                                        <hr>
                                        <button class="btn btn-outline-primary btn-sm d-block w-100 mb-2" data-action="showDevTools">
                                            Show Dev Tools Info
                                        </button>
                                        <button class="btn btn-outline-secondary btn-sm d-block w-100" data-action="goBack">
                                            Back to Examples
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            ...options
        });

        this.containerView = null;
    }

    onInit() {
        console.log('HierarchyDemoPage: Initializing...');
    }

    async onAfterRender() {
        // Create the main container view
        this.containerView = new CardContainerView();

        // Render it in our page
        await this.containerView.render('#container-view');
    }

    async on_action_showDevTools() {
        if (window.MOJODevTools) {
            const hierarchy = window.MOJODevTools.hierarchy();
            console.log('Full Framework Hierarchy:\n' + hierarchy);
            alert('Full hierarchy logged to console');
        } else {
            this.showWarning('MOJODevTools not available');
        }
    }

    async on_action_goBack() {
        // Navigate back or to home
        window.location.href = "/examples/";
    }

    async onBeforeDestroy() {
        // Clean up the container view
        if (this.containerView) {
            await this.containerView.destroy();
        }
    }
}

// Application Class
class HierarchyApp {
    constructor() {
        this.mojo = null;
    }

    async init() {
        console.log('🏗️ Starting MOJO Hierarchy Example...');

        // Create MOJO instance
        this.mojo = MOJO.create({
            container: '#app',
            debug: true,
            autoStart: true
        });

        // Register pages
        this.mojo.registerPage('hierarchy-demo', HierarchyDemoPage);

        // Set up global event listeners
        window.MOJO.eventBus.on('*', (data, eventName) => {
            console.log(`🔔 Global Event: ${eventName}`, data);
        });

        // Show the demo page
        const demoPage = this.mojo.createPage('hierarchy-demo');
        await demoPage.render('#app');

        console.log('✅ Hierarchy Example ready!');
    }
}

// Initialize
async function initHierarchyExample() {
    try {
        const app = new HierarchyApp();
        await app.init();

        // Make available globally for debugging
        window.HierarchyApp = app;

    } catch (error) {
        console.error('Failed to initialize Hierarchy Example:', error);

        document.getElementById('app').innerHTML = `
            <div class="container mt-5">
                <div class="alert alert-danger">
                    <h4>Initialization Error</h4>
                    <p>Failed to start the Hierarchy Example.</p>
                    <p><strong>Error:</strong> ${error.message}</p>
                </div>
            </div>
        `;
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHierarchyExample);
} else {
    initHierarchyExample();
}

export { HierarchyApp, CardContainerView, CardView, HierarchyDemoPage };
