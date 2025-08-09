/**
 * MOJO Framework Test Utilities and Helpers
 * Common utilities, mocks, and helpers for testing MOJO components
 */

const fs = require('fs');
const path = require('path');

class TestHelpers {
    constructor() {
        this.setupComplete = false;
        this.mockInstances = new Map();
        this.testData = new Map();
    }

    /**
     * Set up test environment
     */
    async setup() {
        if (this.setupComplete) return;

        // Ensure DOM environment is available
        this.setupDOM();
        
        // Set up MOJO framework mocks
        this.setupMOJOMocks();
        
        // Set up common test data
        this.setupTestData();
        
        this.setupComplete = true;
    }

    /**
     * Set up DOM environment
     */
    setupDOM() {
        if (typeof window === 'undefined') {
            const { JSDOM } = require('jsdom');
            
            const dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <head><title>MOJO Test Environment</title></head>
                <body>
                    <div id="app"></div>
                    <div id="test-container"></div>
                    <div id="test-fixture"></div>
                </body>
                </html>
            `, { 
                url: "http://localhost:3000",
                pretendToBeVisual: true,
                resources: "usable"
            });

            global.window = dom.window;
            global.document = dom.window.document;
            global.HTMLElement = dom.window.HTMLElement;
            global.Event = dom.window.Event;
            global.CustomEvent = dom.window.CustomEvent;
            global.setTimeout = dom.window.setTimeout;
            global.clearTimeout = dom.window.clearTimeout;
            global.setInterval = dom.window.setInterval;
            global.clearInterval = dom.window.clearInterval;
        }
    }

    /**
     * Set up MOJO framework mocks
     */
    setupMOJOMocks() {
        // Mock Jest functionality
        global.jest = {
            fn: (implementation) => {
                const mockFunction = implementation || function() {};
                mockFunction.mockReturnValue = (value) => {
                    mockFunction._mockReturnValue = value;
                    return mockFunction;
                };
                mockFunction.mockResolvedValue = (value) => {
                    mockFunction._mockResolvedValue = value;
                    return mockFunction;
                };
                mockFunction.mockRejectedValue = (value) => {
                    mockFunction._mockRejectedValue = value;
                    return mockFunction;
                };
                mockFunction.mockImplementation = (impl) => {
                    mockFunction._mockImplementation = impl;
                    return mockFunction;
                };
                
                // Override the function to use mocked behavior
                const originalFn = mockFunction;
                const mockedFn = function(...args) {
                    if (mockFunction._mockRejectedValue) {
                        return Promise.reject(mockFunction._mockRejectedValue);
                    }
                    if (mockFunction._mockResolvedValue) {
                        return Promise.resolve(mockFunction._mockResolvedValue);
                    }
                    if (mockFunction._mockReturnValue !== undefined) {
                        return mockFunction._mockReturnValue;
                    }
                    if (mockFunction._mockImplementation) {
                        return mockFunction._mockImplementation(...args);
                    }
                    return originalFn.apply(this, args);
                };
                
                // Copy mock methods to the new function
                Object.keys(mockFunction).forEach(key => {
                    if (typeof mockFunction[key] === 'function') {
                        mockedFn[key] = mockFunction[key];
                    }
                });
                
                return mockedFn;
            }
        };

        // Mock Mustache template engine
        global.Mustache = {
            render: (template, data, partials = {}) => {
                let result = template;
                
                // Handle simple variable substitution
                result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                    return data[key] || '';
                });
                
                // Handle sections
                result = result.replace(/\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/gs, (match, key, content) => {
                    const value = data[key];
                    if (Array.isArray(value)) {
                        return value.map(item => 
                            content.replace(/\{\{(\w+)\}\}/g, (m, k) => item[k] || '')
                        ).join('');
                    } else if (value) {
                        return content;
                    }
                    return '';
                });
                
                return result;
            }
        };

        // Mock fetch for API testing
        global.fetch = async (url, options = {}) => {
            const mockResponse = this.getMockResponse(url, options);
            return {
                ok: mockResponse.ok || true,
                status: mockResponse.status || 200,
                statusText: mockResponse.statusText || 'OK',
                headers: new Map(Object.entries(mockResponse.headers || {})),
                json: async () => mockResponse.data || {},
                text: async () => JSON.stringify(mockResponse.data || {}),
                blob: async () => new Blob([JSON.stringify(mockResponse.data || {})]),
                arrayBuffer: async () => new ArrayBuffer(0)
            };
        };
    }

    /**
     * Set up common test data
     */
    setupTestData() {
        this.testData.set('sampleUser', {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            role: 'admin'
        });

        this.testData.set('sampleUsers', [
            { id: 1, name: 'John Doe', email: 'john@example.com' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
            { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
        ]);

        this.testData.set('samplePageData', {
            title: 'Test Page',
            content: 'This is test content',
            meta: {
                description: 'Test page description',
                keywords: ['test', 'page']
            }
        });
    }

    /**
     * Create test container
     */
    createTestContainer(id = 'test-container') {
        let container = document.getElementById(id);
        if (!container) {
            container = document.createElement('div');
            container.id = id;
            document.body.appendChild(container);
        } else {
            container.innerHTML = '';
        }
        return container;
    }

    /**
     * Clean up test container
     */
    cleanupTestContainer(id = 'test-container') {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * Create mock MOJO View
     */
    createMockView(options = {}) {
        const mockView = {
            id: options.id || 'mock-view-' + Date.now(),
            template: options.template || '<div>{{content}}</div>',
            data: options.data || { content: 'Mock View Content' },
            state: options.state || {},
            children: new Map(),
            childOrder: [],
            parent: null,
            rendered: false,
            mounted: false,
            destroyed: false,
            listeners: {},
            
            // Mock methods
            render: jest.fn().mockResolvedValue(mockView),
            mount: jest.fn().mockResolvedValue(mockView),
            unmount: jest.fn().mockResolvedValue(mockView),
            destroy: jest.fn().mockResolvedValue(mockView),
            addChild: jest.fn(),
            removeChild: jest.fn(),
            getChild: jest.fn(),
            getChildren: jest.fn().mockReturnValue([]),
            updateData: jest.fn(),
            updateState: jest.fn(),
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            
            // Lifecycle mocks
            onInit: jest.fn(),
            onBeforeRender: jest.fn(),
            onAfterRender: jest.fn(),
            onBeforeMount: jest.fn(),
            onAfterMount: jest.fn(),
            onBeforeDestroy: jest.fn(),
            onAfterDestroy: jest.fn()
        };

        return mockView;
    }

    /**
     * Create mock MOJO Page
     */
    createMockPage(options = {}) {
        const mockPage = {
            ...this.createMockView(options),
            page_name: options.page_name || 'mock-page',
            route: options.route || '/mock',
            params: options.params || {},
            query: options.query || {},
            
            // Page-specific methods
            on_init: jest.fn(),
            on_params: jest.fn(),
            on_action_hello: jest.fn(),
            on_action_default: jest.fn(),
            navigate: jest.fn(),
            matchRoute: jest.fn().mockReturnValue(false),
            buildUrl: jest.fn()
        };

        return mockPage;
    }

    /**
     * Create mock EventBus
     */
    createMockEventBus() {
        return {
            listeners: {},
            onceListeners: {},
            maxListeners: 100,
            
            on: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            emit: jest.fn(),
            emitAsync: jest.fn(),
            removeAllListeners: jest.fn(),
            listenerCount: jest.fn().mockReturnValue(0),
            eventNames: jest.fn().mockReturnValue([]),
            setMaxListeners: jest.fn(),
            namespace: jest.fn(),
            use: jest.fn(),
            waitFor: jest.fn(),
            debug: jest.fn(),
            getStats: jest.fn().mockReturnValue({
                totalEvents: 0,
                totalListeners: 0,
                events: {}
            })
        };
    }

    /**
     * Create mock MOJO framework instance
     */
    createMockMOJO(config = {}) {
        return {
            version: '2.0.0-phase1',
            config: {
                container: '#app',
                debug: false,
                ...config
            },
            eventBus: this.createMockEventBus(),
            views: new Map(),
            pages: new Map(),
            rootView: null,
            initialized: true,
            started: false,
            
            // Methods
            init: jest.fn(),
            start: jest.fn(),
            registerView: jest.fn(),
            registerPage: jest.fn(),
            createView: jest.fn(),
            createPage: jest.fn(),
            getView: jest.fn(),
            getPage: jest.fn(),
            setRootView: jest.fn(),
            getStats: jest.fn().mockReturnValue({
                version: '2.0.0-phase1',
                registeredViews: 0,
                registeredPages: 0
            }),
            shutdown: jest.fn()
        };
    }

    /**
     * Wait for async operations
     */
    async waitFor(conditionFn, timeout = 5000, interval = 100) {
        const start = Date.now();
        
        while (Date.now() - start < timeout) {
            if (await conditionFn()) {
                return true;
            }
            await this.sleep(interval);
        }
        
        throw new Error(`Timeout waiting for condition after ${timeout}ms`);
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Trigger DOM event
     */
    triggerEvent(element, eventType, eventData = {}) {
        const event = new Event(eventType, { bubbles: true, cancelable: true });
        Object.assign(event, eventData);
        element.dispatchEvent(event);
        return event;
    }

    /**
     * Trigger custom event
     */
    triggerCustomEvent(element, eventType, detail = {}) {
        const event = new CustomEvent(eventType, { 
            bubbles: true, 
            cancelable: true, 
            detail 
        });
        element.dispatchEvent(event);
        return event;
    }

    /**
     * Get mock API response
     */
    getMockResponse(url, options) {
        const method = (options.method || 'GET').toLowerCase();
        
        // Default mock responses
        const mockResponses = {
            'get:/api/users': {
                ok: true,
                status: 200,
                data: this.testData.get('sampleUsers')
            },
            'get:/api/users/1': {
                ok: true,
                status: 200,
                data: this.testData.get('sampleUser')
            },
            'post:/api/users': {
                ok: true,
                status: 201,
                data: { ...this.testData.get('sampleUser'), id: 4 }
            },
            'put:/api/users/1': {
                ok: true,
                status: 200,
                data: this.testData.get('sampleUser')
            },
            'delete:/api/users/1': {
                ok: true,
                status: 204,
                data: null
            }
        };

        const key = `${method}:${url}`;
        return mockResponses[key] || {
            ok: true,
            status: 200,
            data: { message: 'Mock response' }
        };
    }

    /**
     * Set custom mock response
     */
    setMockResponse(method, url, response) {
        const key = `${method.toLowerCase()}:${url}`;
        // This would be stored in a mock responses map
        // For now, just a placeholder
    }

    /**
     * Load test fixture data
     */
    loadFixture(fixtureName) {
        const fixturePath = path.join(__dirname, '../fixtures', `${fixtureName}.json`);
        if (fs.existsSync(fixturePath)) {
            const data = fs.readFileSync(fixturePath, 'utf8');
            return JSON.parse(data);
        }
        return null;
    }

    /**
     * Save test fixture data
     */
    saveFixture(fixtureName, data) {
        const fixturesDir = path.join(__dirname, '../fixtures');
        if (!fs.existsSync(fixturesDir)) {
            fs.mkdirSync(fixturesDir, { recursive: true });
        }
        
        const fixturePath = path.join(fixturesDir, `${fixtureName}.json`);
        fs.writeFileSync(fixturePath, JSON.stringify(data, null, 2));
    }

    /**
     * Assert DOM element exists
     */
    assertElementExists(selector, container = document) {
        const element = container.querySelector(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }
        return element;
    }

    /**
     * Assert DOM element has text
     */
    assertElementHasText(selector, expectedText, container = document) {
        const element = this.assertElementExists(selector, container);
        const actualText = element.textContent.trim();
        if (actualText !== expectedText) {
            throw new Error(`Expected element ${selector} to have text "${expectedText}", got "${actualText}"`);
        }
    }

    /**
     * Assert DOM element has class
     */
    assertElementHasClass(selector, className, container = document) {
        const element = this.assertElementExists(selector, container);
        if (!element.classList.contains(className)) {
            throw new Error(`Expected element ${selector} to have class "${className}"`);
        }
    }

    /**
     * Assert event was emitted
     */
    assertEventEmitted(eventBus, eventName, expectedData = null) {
        if (!eventBus.emit.mock || !eventBus.emit.mock.calls) {
            throw new Error('EventBus emit method is not mocked');
        }
        
        const calls = eventBus.emit.mock.calls;
        const matchingCall = calls.find(call => call[0] === eventName);
        
        if (!matchingCall) {
            throw new Error(`Expected event "${eventName}" to be emitted`);
        }
        
        if (expectedData !== null) {
            const actualData = matchingCall[1];
            if (JSON.stringify(actualData) !== JSON.stringify(expectedData)) {
                throw new Error(`Expected event "${eventName}" to be emitted with data ${JSON.stringify(expectedData)}, got ${JSON.stringify(actualData)}`);
            }
        }
    }

    /**
     * Reset all mocks
     */
    resetMocks() {
        if (typeof jest !== 'undefined') {
            jest.clearAllMocks();
        }
        this.mockInstances.clear();
    }

    /**
     * Get test data
     */
    getTestData(key) {
        return this.testData.get(key);
    }

    /**
     * Set test data
     */
    setTestData(key, value) {
        this.testData.set(key, value);
    }

    /**
     * Generate random test data
     */
    generateTestData(type) {
        switch (type) {
            case 'user':
                return {
                    id: Math.floor(Math.random() * 1000),
                    name: `Test User ${Math.floor(Math.random() * 100)}`,
                    email: `test${Math.floor(Math.random() * 100)}@example.com`
                };
            
            case 'page':
                return {
                    id: Math.floor(Math.random() * 1000),
                    title: `Test Page ${Math.floor(Math.random() * 100)}`,
                    content: `Test content for page ${Math.floor(Math.random() * 100)}`
                };
            
            default:
                return { id: Math.floor(Math.random() * 1000) };
        }
    }

    /**
     * Clean up after tests
     */
    cleanup() {
        this.cleanupTestContainer();
        this.resetMocks();
        
        // Clear any intervals/timeouts
        if (typeof window !== 'undefined') {
            // Clear any active timers
            for (let id = 1; id < 1000; id++) {
                clearTimeout(id);
                clearInterval(id);
            }
        }
    }
}

// Create singleton instance
const testHelpers = new TestHelpers();

// Convenience functions
const createTestContainer = (...args) => testHelpers.createTestContainer(...args);
const cleanupTestContainer = (...args) => testHelpers.cleanupTestContainer(...args);
const createMockView = (...args) => testHelpers.createMockView(...args);
const createMockPage = (...args) => testHelpers.createMockPage(...args);
const createMockEventBus = (...args) => testHelpers.createMockEventBus(...args);
const createMockMOJO = (...args) => testHelpers.createMockMOJO(...args);
const waitFor = (...args) => testHelpers.waitFor(...args);
const sleep = (...args) => testHelpers.sleep(...args);
const triggerEvent = (...args) => testHelpers.triggerEvent(...args);
const triggerCustomEvent = (...args) => testHelpers.triggerCustomEvent(...args);
const assertElementExists = (...args) => testHelpers.assertElementExists(...args);
const assertElementHasText = (...args) => testHelpers.assertElementHasText(...args);
const assertElementHasClass = (...args) => testHelpers.assertElementHasClass(...args);
const assertEventEmitted = (...args) => testHelpers.assertEventEmitted(...args);
const loadFixture = (...args) => testHelpers.loadFixture(...args);
const saveFixture = (...args) => testHelpers.saveFixture(...args);
const generateTestData = (...args) => testHelpers.generateTestData(...args);

module.exports = {
    TestHelpers,
    testHelpers,
    createTestContainer,
    cleanupTestContainer,
    createMockView,
    createMockPage,
    createMockEventBus,
    createMockMOJO,
    waitFor,
    sleep,
    triggerEvent,
    triggerCustomEvent,
    assertElementExists,
    assertElementHasText,
    assertElementHasClass,
    assertEventEmitted,
    loadFixture,
    saveFixture,
    generateTestData
};