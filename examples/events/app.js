/**
 * MOJO Framework - Events Example
 * Demonstrates global event communication and EventBus functionality
 */

import MOJO, { View, Page } from '../../src/mojo.js';

// Event Publisher View - Emits various types of events
class EventPublisherView extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="event-publisher card">
                    <div class="card-header">
                        <h5><i class="fas fa-broadcast-tower"></i> Event Publisher</h5>
                        <small class="text-muted">{{publisherId}}</small>
                    </div>
                    <div class="card-body">
                        <p>This component publishes events to the global EventBus.</p>

                        <div class="row">
                            <div class="col-md-6">
                                <h6>Simple Events</h6>
                                <div class="btn-group-vertical d-grid gap-2">
                                    <button class="btn btn-primary btn-sm" data-action="emitHello">
                                        <i class="fas fa-hand-wave"></i> Emit 'hello'
                                    </button>
                                    <button class="btn btn-success btn-sm" data-action="emitUserAction">
                                        <i class="fas fa-user"></i> Emit 'user:action'
                                    </button>
                                    <button class="btn btn-info btn-sm" data-action="emitNotification">
                                        <i class="fas fa-bell"></i> Emit 'notification'
                                    </button>
                                    <button class="btn btn-warning btn-sm" data-action="emitDataUpdate">
                                        <i class="fas fa-database"></i> Emit 'data:update'
                                    </button>
                                </div>
                            </div>

                            <div class="col-md-6">
                                <h6>Advanced Events</h6>
                                <div class="btn-group-vertical d-grid gap-2">
                                    <button class="btn btn-secondary btn-sm" data-action="emitWithData">
                                        <i class="fas fa-file-alt"></i> Emit with Data
                                    </button>
                                    <button class="btn btn-dark btn-sm" data-action="emitBurst">
                                        <i class="fas fa-rocket"></i> Emit Burst (5 events)
                                    </button>
                                    <button class="btn btn-outline-primary btn-sm" data-action="emitCustom">
                                        <i class="fas fa-edit"></i> Emit Custom Event
                                    </button>
                                    <button class="btn btn-outline-danger btn-sm" data-action="emitError">
                                        <i class="fas fa-exclamation-triangle"></i> Emit Error Event
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="mt-3">
                            <div class="form-group">
                                <label for="event-name-input" class="form-label">Custom Event Name:</label>
                                <input type="text" id="event-name-input" class="form-control form-control-sm"
                                       placeholder="e.g., custom:event" value="custom:test">
                            </div>
                        </div>
                    </div>
                </div>
            `,
            data: {
                publisherId: 'Publisher-' + Math.random().toString(36).substr(2, 6)
            },
            ...options
        });

        this.eventCounter = 0;
    }

    onInit() {
        console.log(`EventPublisherView ${this.data.publisherId}: Ready to publish events`);
    }

    async onActionEmitHello() {
        const eventData = {
            message: 'Hello from EventPublisher!',
            publisherId: this.data.publisherId,
            timestamp: new Date().toISOString()
        };

        window.MOJO.eventBus.emit('hello', eventData);
        this.showSuccess('Emitted "hello" event');
        this.eventCounter++;
    }

    async onActionEmitUserAction() {
        const actions = ['login', 'logout', 'profile_update', 'settings_changed'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];

        const eventData = {
            action: randomAction,
            userId: Math.floor(Math.random() * 1000),
            publisherId: this.data.publisherId,
            timestamp: new Date().toISOString()
        };

        window.MOJO.eventBus.emit('user:action', eventData);
        this.showSuccess(`Emitted "user:action" (${randomAction})`);
        this.eventCounter++;
    }

    async onActionEmitNotification() {
        const notifications = [
            { type: 'info', message: 'New message received' },
            { type: 'warning', message: 'System maintenance scheduled' },
            { type: 'success', message: 'Task completed successfully' },
            { type: 'error', message: 'Connection timeout' }
        ];

        const randomNotif = notifications[Math.floor(Math.random() * notifications.length)];
        const eventData = {
            ...randomNotif,
            id: Math.random().toString(36).substr(2, 9),
            publisherId: this.data.publisherId,
            timestamp: new Date().toISOString()
        };

        window.MOJO.eventBus.emit('notification', eventData);
        this.showSuccess(`Emitted "notification" (${randomNotif.type})`);
        this.eventCounter++;
    }

    async onActionEmitDataUpdate() {
        const tables = ['users', 'products', 'orders', 'settings'];
        const operations = ['insert', 'update', 'delete'];
        const randomTable = tables[Math.floor(Math.random() * tables.length)];
        const randomOp = operations[Math.floor(Math.random() * operations.length)];

        const eventData = {
            table: randomTable,
            operation: randomOp,
            recordId: Math.floor(Math.random() * 10000),
            publisherId: this.data.publisherId,
            timestamp: new Date().toISOString()
        };

        window.MOJO.eventBus.emit('data:update', eventData);
        this.showSuccess(`Emitted "data:update" (${randomTable}/${randomOp})`);
        this.eventCounter++;
    }

    async onActionEmitWithData() {
        const eventData = {
            complexData: {
                numbers: [1, 2, 3, 4, 5],
                nested: { value: 'nested data', count: 42 },
                array: ['item1', 'item2', 'item3']
            },
            publisherId: this.data.publisherId,
            timestamp: new Date().toISOString(),
            metadata: {
                source: 'EventPublisher',
                priority: 'high'
            }
        };

        window.MOJO.eventBus.emit('complex:data', eventData);
        this.showSuccess('Emitted "complex:data" with nested payload');
        this.eventCounter++;
    }

    async onActionEmitBurst() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const eventData = {
                    burstIndex: i + 1,
                    burstTotal: 5,
                    publisherId: this.data.publisherId,
                    timestamp: new Date().toISOString()
                };

                window.MOJO.eventBus.emit('burst:event', eventData);
                this.eventCounter++;
            }, i * 200); // Stagger events by 200ms
        }

        this.showInfo('Emitting burst of 5 events...');
    }

    async onActionEmitCustom() {
        const eventNameInput = this.element.querySelector('#event-name-input');
        const eventName = eventNameInput?.value.trim() || 'custom:test';

        const eventData = {
            customMessage: 'This is a custom event!',
            eventName: eventName,
            publisherId: this.data.publisherId,
            timestamp: new Date().toISOString()
        };

        window.MOJO.eventBus.emit(eventName, eventData);
        this.showSuccess(`Emitted "${eventName}" event`);
        this.eventCounter++;
    }

    async onActionEmitError() {
        const errors = [
            { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            { code: 'VALIDATION_ERROR', message: 'Invalid input data' },
            { code: 'AUTH_ERROR', message: 'Authentication failed' },
            { code: 'TIMEOUT_ERROR', message: 'Request timeout' }
        ];

        const randomError = errors[Math.floor(Math.random() * errors.length)];
        const eventData = {
            error: randomError,
            publisherId: this.data.publisherId,
            timestamp: new Date().toISOString(),
            stack: 'EventPublisher.onActionEmitError (line 156)'
        };

        window.MOJO.eventBus.emit('app:error', eventData);
        this.showWarning(`Emitted "app:error" (${randomError.code})`);
        this.eventCounter++;
    }
}

// Event Listener View - Listens for events and displays them
class EventListenerView extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="event-listener card">
                    <div class="card-header">
                        <h5><i class="fas fa-ear-listen"></i> Event Listener</h5>
                        <small class="text-muted">{{listenerId}} | Events: <span id="event-count">{{eventCount}}</span></small>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <h6>Event Controls</h6>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-success" data-action="startListening">
                                    <i class="fas fa-play"></i> Start All
                                </button>
                                <button class="btn btn-warning" data-action="stopListening">
                                    <i class="fas fa-stop"></i> Stop All
                                </button>
                                <button class="btn btn-info" data-action="clearEvents">
                                    <i class="fas fa-trash"></i> Clear
                                </button>
                                <button class="btn btn-secondary" data-action="toggleFilter">
                                    <i class="fas fa-filter"></i> Filter: {{filterMode}}
                                </button>
                            </div>
                        </div>

                        <div class="event-log" id="event-log" style="height: 300px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 4px; padding: 10px; font-family: monospace; font-size: 12px;">
                            <!-- Event messages will appear here -->
                        </div>

                        <div class="mt-2 text-muted">
                            <small>
                                Listening for: hello, user:*, notification, data:*, app:error, burst:event, complex:data
                            </small>
                        </div>
                    </div>
                </div>
            `,
            data: {
                listenerId: 'Listener-' + Math.random().toString(36).substr(2, 6),
                eventCount: 0,
                filterMode: 'All'
            },
            ...options
        });

        this.eventCount = 0;
        this.isListening = false;
        this.eventLogMessages = [];
        this.filterMode = 'all'; // 'all', 'errors', 'user', 'data'
        this.eventHandlers = new Map();
    }

    onInit() {
        console.log(`EventListenerView ${this.data.listenerId}: Ready to listen for events`);
        // Ensure all properties are initialized before starting
        if (!this.eventHandlers) {
            this.eventHandlers = new Map();
        }
        this.startListening();
    }

    startListening() {
        if (this.isListening) return;

        const eventBus = window.MOJO.eventBus;

        // Set up event handlers
        const handlers = {
            'hello': this.handleHelloEvent.bind(this),
            'user:action': this.handleUserEvent.bind(this),
            'notification': this.handleNotificationEvent.bind(this),
            'data:update': this.handleDataEvent.bind(this),
            'app:error': this.handleErrorEvent.bind(this),
            'burst:event': this.handleBurstEvent.bind(this),
            'complex:data': this.handleComplexEvent.bind(this),
            'custom:test': this.handleCustomEvent.bind(this)
        };

        // Register all handlers
        for (const [eventName, handler] of Object.entries(handlers)) {
            eventBus.on(eventName, handler);
            // Ensure eventHandlers Map exists before using it
            if (!this.eventHandlers) {
                this.eventHandlers = new Map();
            }
            this.eventHandlers.set(eventName, handler);
        }

        // Listen for wildcard events (all events starting with specific prefixes)
        eventBus.on('user:*', this.handleUserWildcard.bind(this));
        eventBus.on('data:*', this.handleDataWildcard.bind(this));

        this.isListening = true;
        this.addLogMessage('🟢 Started listening for events', 'success');
    }

    stopListening() {
        if (!this.isListening) return;

        const eventBus = window.MOJO.eventBus;

        // Remove all registered handlers
        for (const [eventName, handler] of this.eventHandlers.entries()) {
            eventBus.off(eventName, handler);
        }
        this.eventHandlers.clear();

        this.isListening = false;
        this.addLogMessage('🔴 Stopped listening for events', 'warning');
    }

    handleHelloEvent(data) {
        this.addLogMessage(`👋 Hello Event: ${data.message} (from ${data.publisherId})`, 'info');
        this.incrementEventCount();
    }

    handleUserEvent(data) {
        this.addLogMessage(`👤 User Action: ${data.action} (User ID: ${data.userId})`, 'primary');
        this.incrementEventCount();
    }

    handleNotificationEvent(data) {
        const icon = data.type === 'error' ? '❌' : data.type === 'warning' ? '⚠️' : data.type === 'success' ? '✅' : 'ℹ️';
        this.addLogMessage(`${icon} Notification (${data.type}): ${data.message}`, data.type);
        this.incrementEventCount();
    }

    handleDataEvent(data) {
        this.addLogMessage(`💾 Data Update: ${data.operation.toUpperCase()} on ${data.table} (ID: ${data.recordId})`, 'secondary');
        this.incrementEventCount();
    }

    handleErrorEvent(data) {
        this.addLogMessage(`🚨 Error: [${data.error.code}] ${data.error.message}`, 'danger');
        this.incrementEventCount();
    }

    handleBurstEvent(data) {
        this.addLogMessage(`💥 Burst Event: ${data.burstIndex}/${data.burstTotal}`, 'info');
        this.incrementEventCount();
    }

    handleComplexEvent(data) {
        const summary = `Complex data with ${Object.keys(data.complexData).length} properties`;
        this.addLogMessage(`🔧 Complex Data: ${summary} (Priority: ${data.metadata.priority})`, 'secondary');
        this.incrementEventCount();
    }

    handleCustomEvent(data) {
        this.addLogMessage(`🎯 Custom Event (${data.eventName}): ${data.customMessage}`, 'info');
        this.incrementEventCount();
    }

    handleUserWildcard(data, eventName) {
        if (eventName !== 'user:action') { // Avoid duplicate logging
            this.addLogMessage(`👥 User Wildcard: ${eventName} received`, 'primary');
            this.incrementEventCount();
        }
    }

    handleDataWildcard(data, eventName) {
        if (eventName !== 'data:update') { // Avoid duplicate logging
            this.addLogMessage(`📊 Data Wildcard: ${eventName} received`, 'secondary');
            this.incrementEventCount();
        }
    }

    addLogMessage(message, type = 'info') {
        // Ensure eventLogMessages is initialized
        if (!this.eventLogMessages) {
            this.eventLogMessages = [];
        }

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            message,
            type,
            timestamp,
            id: Math.random().toString(36).substr(2, 9)
        };

        // Apply filter
        if (!this.shouldShowMessage(logEntry)) return;

        this.eventLogMessages.push(logEntry);

        // Keep only last 50 messages
        if (this.eventLogMessages.length > 50) {
            this.eventLogMessages.shift();
        }

        this.updateLogDisplay();
    }

    shouldShowMessage(logEntry) {
        // Ensure filterMode is initialized
        if (!this.filterMode) {
            this.filterMode = 'all';
        }

        switch (this.filterMode) {
            case 'errors':
                return logEntry.type === 'danger' || logEntry.message.includes('Error');
            case 'user':
                return logEntry.message.includes('User') || logEntry.message.includes('👤') || logEntry.message.includes('👥');
            case 'data':
                return logEntry.message.includes('Data') || logEntry.message.includes('💾') || logEntry.message.includes('📊');
            default:
                return true;
        }
    }

    updateLogDisplay() {
        const logElement = this.element?.querySelector('#event-log');
        if (!logElement) return;

        // Ensure eventLogMessages is initialized
        if (!this.eventLogMessages) {
            this.eventLogMessages = [];
        }

        const filteredMessages = this.eventLogMessages.filter(msg => this.shouldShowMessage(msg));

        logElement.innerHTML = filteredMessages.map(entry => {
            const colorClass = this.getColorClass(entry.type);
            return `<div class="log-entry ${colorClass}" style="margin-bottom: 2px;">
                        <span style="color: #6c757d;">[${entry.timestamp}]</span> ${entry.message}
                    </div>`;
        }).join('');

        // Auto-scroll to bottom
        logElement.scrollTop = logElement.scrollHeight;
    }

    getColorClass(type) {
        const colorMap = {
            success: 'text-success',
            danger: 'text-danger',
            warning: 'text-warning',
            info: 'text-info',
            primary: 'text-primary',
            secondary: 'text-secondary'
        };
        return colorMap[type] || 'text-dark';
    }

    incrementEventCount() {
        // Ensure eventCount is initialized
        if (typeof this.eventCount !== 'number') {
            this.eventCount = 0;
        }
        this.eventCount++;
        this.updateData({ eventCount: this.eventCount });

        // Update DOM directly for real-time updates
        const countElement = this.element?.querySelector('#event-count');
        if (countElement) {
            countElement.textContent = this.eventCount;
        }
    }

    // Action Handlers
    async onActionStartListening() {
        this.startListening();
    }

    async onActionStopListening() {
        this.stopListening();
    }

    async onActionClearEvents() {
        // Ensure eventLogMessages is initialized
        if (!this.eventLogMessages) {
            this.eventLogMessages = [];
        }
        this.eventLogMessages = [];
        this.updateLogDisplay();
        this.addLogMessage('🧹 Event log cleared', 'info');
    }

    async onActionToggleFilter() {
        // Ensure filterMode is initialized
        if (!this.filterMode) {
            this.filterMode = 'all';
        }

        const filters = ['all', 'errors', 'user', 'data'];
        const currentIndex = filters.indexOf(this.filterMode);
        const nextIndex = (currentIndex + 1) % filters.length;
        this.filterMode = filters[nextIndex];

        const filterLabels = {
            all: 'All',
            errors: 'Errors Only',
            user: 'User Events',
            data: 'Data Events'
        };

        this.filterMode = filters[nextIndex];
        this.updateData({ filterMode: filterLabels[this.filterMode] });
        this.updateLogDisplay();
        this.addLogMessage(`🔍 Filter changed to: ${filterLabels[this.filterMode]}`, 'info');
    }

    async onBeforeDestroy() {
        this.stopListening();
        console.log(`EventListenerView ${this.data.listenerId}: Cleaned up event listeners`);
    }
}

// Event Statistics View
class EventStatsView extends View {
    constructor(options = {}) {
        console.log('🔧 EventStatsView: Constructor started with options:', options);
        super({
            template: `
                <div class="event-stats card">
                    <div class="card-header">
                        <h5><i class="fas fa-chart-bar"></i> Event Statistics</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <div class="stat-item">
                                    <h6 class="text-primary">Total Events</h6>
                                    <span class="stat-number text-primary" id="total-events">{{totalEvents}}</span>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="stat-item">
                                    <h6 class="text-success">Active Listeners</h6>
                                    <span class="stat-number text-success" id="active-listeners">{{activeListeners}}</span>
                                </div>
                            </div>
                        </div>

                        <div class="mt-3">
                            <h6>Event Types</h6>
                            <div id="event-types-list" class="event-types-list">
                                <!-- Event type counts will appear here -->
                            </div>
                        </div>

                        <div class="mt-3">
                            <button class="btn btn-sm btn-outline-primary" data-action="refreshStats">
                                <i class="fas fa-refresh"></i> Refresh Stats
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" data-action="resetStats">
                                <i class="fas fa-reset"></i> Reset Stats
                            </button>
                        </div>
                    </div>
                </div>
            `,
            data: {
                totalEvents: 0,
                activeListeners: 0
            },
            ...options
        });

        console.log('🔧 EventStatsView: super() call completed, initializing properties...');
        this.eventTypeCounts = new Map();
        console.log('🔧 EventStatsView: eventTypeCounts Map created');
        this.startTime = new Date();
        console.log('🔧 EventStatsView: Constructor completed successfully');
    }

    onInit() {
        console.log('🔧 EventStatsView: onInit() called');
        console.log('EventStatsView: Starting event statistics tracking');
        this.startTracking();
    }

    startTracking() {
        console.log('🔧 EventStatsView: Setting up wildcard event listener');

        // Listen to all events for statistics
        window.MOJO.eventBus.on('*', (data, eventName) => {
            console.log('🔧 EventStatsView: Received event for tracking:', eventName);
            this.trackEvent(eventName);
        });

        // Update stats periodically
        this.statsInterval = setInterval(() => {
            this.updateStats();
        }, 1000);

        console.log('🔧 EventStatsView: Event tracking started');
    }

    trackEvent(eventName) {
        console.log('📊 EventStatsView: Tracking event:', eventName);

        // Update total count
        this.data.totalEvents++;
        console.log('📊 EventStatsView: Total events now:', this.data.totalEvents);

        // Ensure eventTypeCounts is initialized
        if (!this.eventTypeCounts) {
            this.eventTypeCounts = new Map();
        }

        // Update event type count
        const currentCount = this.eventTypeCounts.get(eventName) || 0;
        this.eventTypeCounts.set(eventName, currentCount + 1);
        console.log('📊 EventStatsView: Event', eventName, 'count now:', currentCount + 1);

        this.updateStats();
    }

    updateStats() {
        // Get current EventBus stats
        const eventBusStats = window.MOJO.eventBus.getStats?.() || {};

        // Update data
        this.updateData({
            totalEvents: this.data.totalEvents,
            activeListeners: eventBusStats.totalListeners || 0
        });

        // Update DOM elements
        const totalElement = this.element?.querySelector('#total-events');
        const listenersElement = this.element?.querySelector('#active-listeners');

        if (totalElement) totalElement.textContent = this.data.totalEvents;
        if (listenersElement) listenersElement.textContent = this.data.activeListeners;

        this.updateEventTypesList();
    }

    updateEventTypesList() {
        const listElement = this.element?.querySelector('#event-types-list');
        if (!listElement) return;

        // Ensure eventTypeCounts is initialized
        if (!this.eventTypeCounts) {
            this.eventTypeCounts = new Map();
        }

        const sortedTypes = Array.from(this.eventTypeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Show top 10

        listElement.innerHTML = sortedTypes.map(([eventName, count]) => `
            <div class="d-flex justify-content-between align-items-center py-1">
                <small class="text-muted">${eventName}</small>
                <span class="badge bg-secondary">${count}</span>
            </div>
        `).join('') || '<small class="text-muted">No events tracked yet</small>';
    }

    async onActionRefreshStats() {
        this.updateStats();
        this.showInfo('Statistics refreshed');
    }

    async onActionResetStats() {
        if (confirm('Reset all statistics?')) {
            this.data.totalEvents = 0;
            // Ensure eventTypeCounts is initialized
            if (!this.eventTypeCounts) {
                this.eventTypeCounts = new Map();
            }
            this.eventTypeCounts.clear();
            this.startTime = new Date();
            this.updateStats();
            this.showSuccess('Statistics reset');
        }
    }

    async onBeforeDestroy() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
    }
}

// Main Events Example Page
class EventsExamplePage extends Page {
    constructor(options = {}) {
        super({
            page_name: 'events-example',
            route: '/events',
            template: `
                <div class="events-example-page">
                    <div class="container">
                        <h1>MOJO Framework - Events Example</h1>
                        <p class="lead">
                            This example demonstrates the global EventBus system for
                            component communication and event-driven architecture.
                        </p>

                        <div class="row">
                            <div class="col-lg-4">
                                <div id="event-publisher"></div>
                                <div id="event-stats"></div>
                            </div>
                            <div class="col-lg-8">
                                <div id="event-listener"></div>
                            </div>
                        </div>

                        <div class="row mt-4">
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-header">
                                        <h5>EventBus Features Demonstrated</h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <ul class="list-unstyled">
                                                    <li>✅ Event emission and listening</li>
                                                    <li>✅ Event namespacing (user:*, data:*)</li>
                                                    <li>✅ Complex data payloads</li>
                                                    <li>✅ Real-time event logging</li>
                                                    <li>✅ Event filtering and search</li>
                                                </ul>
                                            </div>
                                            <div class="col-md-6">
                                                <ul class="list-unstyled">
                                                    <li>✅ Event statistics tracking</li>
                                                    <li>✅ Wildcard event listeners</li>
                                                    <li>✅ Event handler management</li>
                                                    <li>✅ Global event communication</li>
                                                    <li>✅ Error handling and logging</li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div class="mt-3">
                                            <button class="btn btn-outline-primary btn-sm" data-action="showEventBusInfo">
                                                <i class="fas fa-info-circle"></i> Show EventBus Info
                                            </button>
                                            <button class="btn btn-outline-secondary btn-sm" data-action="goBack">
                                                <i class="fas fa-arrow-left"></i> Back to Examples
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            ...options
        });

        this.publisherView = null;
        this.listenerView = null;
        this.statsView = null;
    }

    on_init() {
        console.log('EventsExamplePage: Initializing events example...');
    }

    async onAfterRender() {
        // Create and render all the component views
        await this.setupPublisherView();
        await this.setupListenerView();
        await this.setupStatsView();

        // Set up some demo event listeners
        this.setupDemoEventListeners();
    }

    async setupPublisherView() {
        this.publisherView = new EventPublisherView();
        await this.publisherView.render('#event-publisher');
    }

    async setupListenerView() {
        this.listenerView = new EventListenerView();
        await this.listenerView.render('#event-listener');
    }

    async setupStatsView() {
        this.statsView = new EventStatsView();
        await this.statsView.render('#event-stats');
    }

    setupDemoEventListeners() {
        // Listen for some global events to show cross-component communication
        window.MOJO.eventBus.on('hello', (data) => {
            console.log('Page received hello event:', data);
        });

        window.MOJO.eventBus.on('app:error', (data) => {
            console.warn('Page received error event:', data);
        });
    }

    async on_action_showEventBusInfo() {
        const eventBus = window.MOJO.eventBus;
        const info = {
            totalListeners: eventBus.listenerCount?.() || 'Unknown',
            eventNames: eventBus.eventNames?.() || 'Unknown',
            maxListeners: eventBus._maxListeners || 'Unknown',
            hasMiddleware: !!eventBus.middleware,
            debugMode: eventBus._debug || false
        };

        console.log('EventBus Info:', info);
        alert(`EventBus Information:\n${JSON.stringify(info, null, 2)}`);
    }

    async on_action_goBack() {
        window.location.href = "/examples/";
    }

    async onBeforeDestroy() {
        // Clean up all component views
        if (this.publisherView) await this.publisherView.destroy();
        if (this.listenerView) await this.listenerView.destroy();
        if (this.statsView) await this.statsView.destroy();
    }
}

// Application Class
class EventsApp {
    constructor() {
        this.mojo = null;
    }

    async init() {
        console.log('🔔 Starting MOJO Events Example...');

        // Create MOJO instance
        this.mojo = MOJO.create({
            container: '#app',
            debug: true,
            autoStart: true
        });

        // Register pages
        this.mojo.registerPage('events-example', EventsExamplePage);

        // Set up global event bus debugging
        window.MOJO.eventBus.debug?.(true);

        // Show the demo page
        const eventsPage = this.mojo.createPage('events-example');
        await eventsPage.render('#app');

        console.log('✅ Events Example ready!');

        // Show welcome message in console
        console.log(`
🔔 MOJO Events Example is running!
📋 Try these actions:
   • Use the Event Publisher to emit various events
   • Watch the Event Listener receive and display them
   • Monitor Event Statistics for real-time metrics
   • Use filtering to focus on specific event types
        `);
    }
}

// Initialize
async function initEventsExample() {
    try {
        const app = new EventsApp();
        await app.init();

        // Make available globally for debugging
        window.EventsApp = app;

    } catch (error) {
        console.error('Failed to initialize Events Example:', error);

        document.getElementById('app').innerHTML = `
            <div class="container mt-5">
                <div class="alert alert-danger">
                    <h4>Initialization Error</h4>
                    <p>Failed to start the Events Example.</p>
                    <p><strong>Error:</strong> ${error.message}</p>
                </div>
            </div>
        `;
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventsExample);
} else {
    initEventsExample();
}

export { EventsApp, EventPublisherView, EventListenerView, EventStatsView, EventsExamplePage };
