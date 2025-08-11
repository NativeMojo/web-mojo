/**
 * MOJO Framework Integration Tests
 * Tests for integration between MOJO framework components
 */

const path = require('path');
const fs = require('fs');
const { testHelpers } = require('../utils/test-helpers');

module.exports = async function(testContext) {
    const { describe, it, expect, assert } = testContext;
    
    // Set up test environment
    await testHelpers.setup();
    
    // Load MOJO components using module loader
    let View, Page, EventBus, MOJO;
    
    try {
        const { setupModules } = require('../utils/simple-module-loader');
        const modules = setupModules(testContext);
        
        View = modules.View;
        Page = modules.Page;
        EventBus = modules.EventBus;
        MOJO = modules.MOJO;
        
        if (!View || !Page || !EventBus || !MOJO) {
            throw new Error('Failed to load required components');
        }
        
    } catch (error) {
        throw new Error(`Failed to load MOJO components: ${error.message}`);
    }

    describe('MOJO Framework Integration', () => {
        it('should integrate EventBus with View components', () => {
            const eventBus = new EventBus();
            const view = new View({
                id: 'test-view',
                template: '<div>{{message}}</div>',
                data: { message: 'Hello' }
            });
            
            // Views should have their own event system
            let viewEventReceived = false;
            let globalEventReceived = false;
            
            view.on('test-event', () => { viewEventReceived = true; });
            eventBus.on('global-event', () => { globalEventReceived = true; });
            
            view.emit('test-event');
            eventBus.emit('global-event');
            
            expect(viewEventReceived).toBe(true);
            expect(globalEventReceived).toBe(true);
        });

        it('should integrate View hierarchy with lifecycle management', async () => {
            const lifecycleCalls = [];
            
            class TestParent extends View {
                onInit() { lifecycleCalls.push('parent-init'); }
                async onAfterRender() { lifecycleCalls.push('parent-rendered'); }
                async onAfterMount() { lifecycleCalls.push('parent-mounted'); }
            }
            
            class TestChild extends View {
                onInit() { lifecycleCalls.push('child-init'); }
                async onAfterRender() { lifecycleCalls.push('child-rendered'); }
                async onAfterMount() { lifecycleCalls.push('child-mounted'); }
            }
            
            const parent = new TestParent({
                template: '<div class="parent">{{title}}<div class="children"></div></div>',
                data: { title: 'Parent View' }
            });
            
            const child = new TestChild({
                template: '<div class="child">{{content}}</div>',
                data: { content: 'Child Content' }
            });
            
            parent.addChild(child, 'child');
            
            const container = testHelpers.createTestContainer();
            await parent.render(container);
            
            // Verify hierarchy was created
            expect(lifecycleCalls).toEqual(expect.arrayContaining([
                'parent-init', 'child-init',
                'parent-rendered', 'child-rendered',
                'parent-mounted', 'child-mounted'
            ]));
            
            expect(parent.getChild('child')).toBe(child);
            expect(child.parent).toBe(parent);
        });

        it('should integrate Page routing with View hierarchy', async () => {
            class TestPage extends Page {
                constructor(options = {}) {
                    super({
                        pageName: 'test-page',
                        route: '/test/:id',
                        template: '<div class="page">Page {{params.id}}</div>',
                        ...options
                    });
                }
                
                onParams(params, query) {
                    super.onParams(params, query);
                    this.updateData({ 
                        params: params,
                        query: query 
                    });
                }
            }
            
            const page = new TestPage();
            
            // Test route matching
            const match = page.matchRoute('/test/123');
            expect(match).toBeTruthy();
            expect(match.params.id).toBe('123');
            
            // Test parameter handling
            page.onParams({ id: '123' }, { filter: 'active' });
            expect(page.params.id).toBe('123');
            expect(page.query.filter).toBe('active');
            
            // Test rendering with parameters
            const container = testHelpers.createTestContainer();
            await page.render(container);
            
            expect(page.rendered).toBe(true);
            expect(page.element.textContent).toContain('Page 123');
        });

        it('should integrate MOJO framework with component registration', () => {
            const mojo = new MOJO({
                container: '#test-container',
                debug: true
            });
            
            class TestView extends View {}
            class TestPage extends Page {}
            
            // Test component registration
            mojo.registerView('testView', TestView);
            mojo.registerPage('testPage', TestPage);
            
            expect(mojo.getView('testView')).toBe(TestView);
            expect(mojo.getPage('testPage')).toBe(TestPage);
            
            // Test component creation
            const view = mojo.createView('testView', { id: 'created-view' });
            const page = mojo.createPage('testPage', { pageName: 'created-page' });
            
            expect(view instanceof TestView).toBe(true);
            expect(page instanceof TestPage).toBe(true);
            expect(view.id).toBe('created-view');
            expect(page.pageName).toBe('created-page');
        });

        it('should integrate template rendering with real DOM', async () => {
            const view = new View({
                template: `
                    <div class="test-view">
                        <h1>{{title}}</h1>
                        <p>{{description}}</p>
                        <button data-action="click">{{buttonText}}</button>
                        <ul>
                            {{#items}}
                            <li>{{name}} - {{value}}</li>
                            {{/items}}
                        </ul>
                    </div>
                `,
                data: {
                    title: 'Test View',
                    description: 'Integration test',
                    buttonText: 'Click Me',
                    items: [
                        { name: 'Item 1', value: 100 },
                        { name: 'Item 2', value: 200 }
                    ]
                }
            });
            
            const container = testHelpers.createTestContainer();
            await view.render(container);
            
            // Verify DOM structure
            const element = view.element;
            expect(element.querySelector('h1').textContent).toBe('Test View');
            expect(element.querySelector('p').textContent).toBe('Integration test');
            expect(element.querySelector('button').textContent).toBe('Click Me');
            expect(element.querySelector('button').getAttribute('data-action')).toBe('click');
            
            const listItems = element.querySelectorAll('li');
            expect(listItems.length).toBe(2);
            expect(listItems[0].textContent).toBe('Item 1 - 100');
            expect(listItems[1].textContent).toBe('Item 2 - 200');
        });

        it('should integrate action handling across component hierarchy', async () => {
            const actionCalls = [];
            
            class ActionParent extends View {
                async onActionParentAction() {
                    actionCalls.push('parent-action');
                }
            }
            
            class ActionChild extends View {
                async onActionChildAction() {
                    actionCalls.push('child-action');
                    // Emit to parent
                    this.parent.emit('child-triggered');
                }
            }
            
            const parent = new ActionParent({
                template: '<div class="parent"><div class="child-container"></div></div>'
            });
            
            const child = new ActionChild({
                template: '<button data-action="childAction">Child Button</button>'
            });
            
            parent.addChild(child, 'child');
            
            parent.on('child-triggered', () => {
                actionCalls.push('parent-received-child-event');
            });
            
            const container = testHelpers.createTestContainer();
            await parent.render(container);
            
            // Simulate action on child
            await child.handleAction('childAction', {}, {});
            
            expect(actionCalls).toEqual([
                'child-action',
                'parent-received-child-event'
            ]);
        });

        it('should integrate event propagation through view hierarchy', async () => {
            const eventLog = [];
            
            const grandparent = new View({ id: 'grandparent' });
            const parent = new View({ id: 'parent' });  
            const child = new View({ id: 'child' });
            
            grandparent.addChild(parent, 'parent');
            parent.addChild(child, 'child');
            
            // Set up event listeners at each level
            grandparent.on('bubble-event', (data) => {
                eventLog.push(`grandparent received: ${data.level}`);
            });
            
            parent.on('bubble-event', (data) => {
                eventLog.push(`parent received: ${data.level}`);
                // Propagate to grandparent
                grandparent.emit('bubble-event', { level: 'parent-to-grandparent' });
            });
            
            child.on('bubble-event', (data) => {
                eventLog.push(`child received: ${data.level}`);
                // Propagate to parent
                parent.emit('bubble-event', { level: 'child-to-parent' });
            });
            
            // Trigger event at child level
            child.emit('bubble-event', { level: 'child-initial' });
            
            expect(eventLog).toEqual([
                'child received: child-initial',
                'parent received: child-to-parent',
                'grandparent received: parent-to-grandparent'
            ]);
        });

        it('should integrate data flow and state management', async () => {
            class DataParent extends View {
                async updateChildData(newData) {
                    const child = this.getChild('data-child');
                    if (child) {
                        await child.updateData(newData, true); // Re-render
                    }
                }
            }
            
            class DataChild extends View {
                async onDataUpdated() {
                    this.emit('data-changed', { data: this.data });
                }
                
                async updateData(newData, rerender = false) {
                    await super.updateData(newData, rerender);
                    await this.onDataUpdated();
                }
            }
            
            const parent = new DataParent({
                template: '<div class="parent">Parent<div class="child-area"></div></div>',
                data: { parentData: 'initial' }
            });
            
            const child = new DataChild({
                template: '<div class="child">Child: {{childData}}</div>',
                data: { childData: 'child-initial' }
            });
            
            parent.addChild(child, 'data-child');
            
            let dataChangeEvents = [];
            child.on('data-changed', (data) => {
                dataChangeEvents.push(data.data.childData);
            });
            
            const container = testHelpers.createTestContainer();
            await parent.render(container);
            
            // Test data flow from parent to child
            await parent.updateChildData({ childData: 'updated-by-parent' });
            
            expect(dataChangeEvents).toEqual(['updated-by-parent']);
            expect(child.data.childData).toBe('updated-by-parent');
        });

        it('should integrate memory management and cleanup', async () => {
            class TrackingView extends View {
                constructor(options) {
                    super(options);
                    this.cleanupCalled = false;
                    this.timerId = null;
                }
                
                async onAfterMount() {
                    // Set up some resources that need cleanup
                    this.timerId = setInterval(() => {}, 1000);
                }
                
                async onBeforeDestroy() {
                    this.cleanupCalled = true;
                    if (this.timerId) {
                        clearInterval(this.timerId);
                    }
                }
            }
            
            const parent = new TrackingView({ id: 'parent' });
            const child1 = new TrackingView({ id: 'child1' });
            const child2 = new TrackingView({ id: 'child2' });
            
            parent.addChild(child1, 'child1');
            parent.addChild(child2, 'child2');
            
            const container = testHelpers.createTestContainer();
            await parent.render(container);
            
            // Verify all components are set up
            expect(parent.mounted).toBe(true);
            expect(child1.mounted).toBe(true);
            expect(child2.mounted).toBe(true);
            
            // Destroy parent (should cascade to children)
            await parent.destroy();
            
            expect(parent.cleanupCalled).toBe(true);
            expect(child1.cleanupCalled).toBe(true);
            expect(child2.cleanupCalled).toBe(true);
            
            expect(parent.destroyed).toBe(true);
            expect(child1.destroyed).toBe(true);
            expect(child2.destroyed).toBe(true);
            
            expect(parent.children.size).toBe(0);
        });

        it('should integrate full application lifecycle', async () => {
            // Create a complete mini-application
            const mojo = new MOJO({
                container: '#test-container',
                debug: false,
                autoStart: false
            });
            
            // Create main layout view
            class AppLayout extends View {
                constructor() {
                    super({
                        template: `
                            <div class="app-layout">
                                <header>{{appName}}</header>
                                <nav><button data-action="navigate" data-page="home">Home</button></nav>
                                <main class="page-content"></main>
                            </div>
                        `,
                        data: { appName: 'Test App' }
                    });
                }
                
                async onActionNavigate(event, element) {
                    const pageName = element.getAttribute('data-page');
                    this.emit('navigate', { page: pageName });
                }
            }
            
            // Create test page
            class HomePage extends Page {
                constructor() {
                    super({
                        pageName: 'home',
                        route: '/',
                        template: '<div class="home-page">Welcome to {{page_name}}</div>'
                    });
                }
                
                onActionHello() {
                    this.updateData({ greeting: 'Hello from home page!' }, true);
                }
            }
            
            // Register components
            mojo.registerView('appLayout', AppLayout);
            mojo.registerPage('homePage', HomePage);
            
            // Create application structure
            const layout = mojo.createView('appLayout');
            const homePage = mojo.createPage('homePage');
            
            layout.addChild(homePage, 'currentPage');
            
            // Set up navigation handling
            let navigationEvents = [];
            layout.on('navigate', (data) => {
                navigationEvents.push(data.page);
            });
            
            // Start the application
            mojo.setRootView(layout);
            const container = testHelpers.createTestContainer();
            await mojo.start();
            await layout.render(container);
            
            // Verify application structure
            expect(mojo.started).toBe(true);
            expect(layout.rendered).toBe(true);
            expect(homePage.rendered).toBe(true);
            
            // Test navigation interaction
            await layout.handleAction('navigate', {}, { 
                getAttribute: () => 'home' 
            });
            
            expect(navigationEvents).toEqual(['home']);
            
            // Test page action
            await homePage.onActionHello();
            expect(homePage.data.greeting).toBe('Hello from home page!');
            
            // Test framework statistics
            const stats = mojo.getStats();
            expect(stats.started).toBe(true);
            expect(stats.registeredViews).toBe(1);
            expect(stats.registeredPages).toBe(1);
        });

        it('should integrate error handling across components', async () => {
            const errorLog = [];
            
            class ErrorProneView extends View {
                async onActionError() {
                    throw new Error('Component error');
                }
                
                handleActionError(action, error) {
                    errorLog.push(`${this.id}: ${error.message}`);
                    super.handleActionError(action, error);
                }
            }
            
            const mojo = new MOJO();
            
            // Global error handling
            mojo.eventBus.on('error', (errorData) => {
                errorLog.push(`Global: ${errorData.error.message}`);
            });
            
            const view = new ErrorProneView({ id: 'error-view' });
            const container = testHelpers.createTestContainer();
            await view.render(container);
            
            // Trigger error
            await view.handleAction('error', {}, {});
            
            expect(errorLog).toEqual(expect.arrayContaining([
                'error-view: Component error'
            ]));
        });

        it('should integrate complex template rendering with nested data', async () => {
            const complexData = {
                user: {
                    name: 'John Doe',
                    profile: {
                        avatar: 'avatar.jpg',
                        bio: 'Software Engineer'
                    }
                },
                posts: [
                    {
                        id: 1,
                        title: 'First Post',
                        content: 'Hello World',
                        comments: [
                            { author: 'Jane', text: 'Great post!' },
                            { author: 'Bob', text: 'Thanks for sharing' }
                        ]
                    },
                    {
                        id: 2,
                        title: 'Second Post',  
                        content: 'More content',
                        comments: []
                    }
                ]
            };
            
            const view = new View({
                template: `
                    <div class="user-dashboard">
                        <div class="profile">
                            <h2>{{user.name}}</h2>
                            <img src="{{user.profile.avatar}}" alt="Avatar">
                            <p>{{user.profile.bio}}</p>
                        </div>
                        <div class="posts">
                            {{#posts}}
                            <article class="post">
                                <h3>{{title}}</h3>
                                <p>{{content}}</p>
                                <div class="comments">
                                    {{#comments}}
                                    <div class="comment">
                                        <strong>{{author}}:</strong> {{text}}
                                    </div>
                                    {{/comments}}
                                </div>
                            </article>
                            {{/posts}}
                        </div>
                    </div>
                `,
                data: complexData
            });
            
            const container = testHelpers.createTestContainer();
            await view.render(container);
            
            // Verify complex nested rendering
            const element = view.element;
            expect(element.querySelector('.profile h2').textContent).toBe('John Doe');
            expect(element.querySelector('.profile img').src).toContain('avatar.jpg');
            expect(element.querySelector('.profile p').textContent).toBe('Software Engineer');
            
            const posts = element.querySelectorAll('.post');
            expect(posts.length).toBe(2);
            expect(posts[0].querySelector('h3').textContent).toBe('First Post');
            expect(posts[1].querySelector('h3').textContent).toBe('Second Post');
            
            const comments = posts[0].querySelectorAll('.comment');
            expect(comments.length).toBe(2);
            expect(comments[0].textContent.trim()).toBe('Jane: Great post!');
            expect(comments[1].textContent.trim()).toBe('Bob: Thanks for sharing');
        });
    });

    describe('MOJO Framework Performance Integration', () => {
        it('should handle multiple view updates efficiently', async () => {
            const parent = new View({
                template: '<div class="parent">{{counter}}</div>',
                data: { counter: 0 }
            });
            
            const children = [];
            for (let i = 0; i < 10; i++) {
                const child = new View({
                    template: `<div class="child-${i}">Child {{index}}: {{value}}</div>`,
                    data: { index: i, value: 0 }
                });
                children.push(child);
                parent.addChild(child, `child-${i}`);
            }
            
            const container = testHelpers.createTestContainer();
            await parent.render(container);
            
            const startTime = Date.now();
            
            // Perform multiple updates
            for (let update = 0; update < 5; update++) {
                await parent.updateData({ counter: update });
                
                for (let i = 0; i < children.length; i++) {
                    await children[i].updateData({ value: update * 10 + i });
                }
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete quickly (less than 1 second for this simple test)
            expect(duration).toBeLessThan(1000);
            
            // Verify final state
            expect(parent.data.counter).toBe(4);
            expect(children[5].data.value).toBe(45); // 4 * 10 + 5
        });

        it('should handle deep view hierarchies', async () => {
            // Create nested hierarchy: root -> level1 -> level2 -> level3
            let currentParent = new View({ 
                id: 'root',
                template: '<div class="level-0">Root</div>'
            });
            
            const allViews = [currentParent];
            
            // Create 3 levels deep, 3 children per level
            for (let level = 1; level <= 3; level++) {
                const levelViews = [];
                
                for (const parent of (level === 1 ? [currentParent] : allViews.slice(-3))) {
                    for (let child = 0; child < 3; child++) {
                        const childView = new View({
                            id: `level-${level}-child-${child}`,
                            template: `<div class="level-${level}">Level ${level} Child ${child}</div>`
                        });
                        
                        parent.addChild(childView, `child-${level}-${child}`);
                        levelViews.push(childView);
                    }
                }
                
                allViews.push(...levelViews);
            }
            
            const container = testHelpers.createTestContainer();
            await currentParent.render(container);
            
            // Verify hierarchy depth
            const rootView = allViews[0];
            const deepestView = allViews[allViews.length - 1];
            
            expect(rootView.id).toBe('root');
            expect(deepestView.id).toMatch(/^level-3-child-\d$/);
            
            // Test finding views in deep hierarchy
            const foundView = rootView.findById('level-3-child-2');
            expect(foundView).toBeTruthy();
            expect(foundView.id).toBe('level-3-child-2');
            
            // Test hierarchy cleanup
            await rootView.destroy();
            expect(rootView.destroyed).toBe(true);
            
            // All views should be destroyed
            for (const view of allViews) {
                expect(view.destroyed).toBe(true);
            }
        });
    });
};