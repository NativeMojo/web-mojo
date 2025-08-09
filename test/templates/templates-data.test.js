import TemplatesPage from '../../examples/pages/templates/TemplatesPage.js';
import Mustache from '../../src/utils/mustache.js';

describe('TemplatesPage - Template Examples with Specific Data', () => {
    let page;
    let container;

    beforeEach(() => {
        // Create a container for the page
        container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);

        // Initialize the page
        page = new TemplatesPage();
    });

    afterEach(() => {
        // Clean up
        if (page && page.mounted) {
            page.destroy();
        }
        document.body.removeChild(container);
    });

    describe('Template Examples Data Structure', () => {
        test('should initialize with template examples', async () => {
            await page.onInit();
            expect(page.templateExamples).toBeDefined();
            expect(Object.keys(page.templateExamples).length).toBeGreaterThan(0);
        });

        test('each example should have its own specific data', async () => {
            await page.onInit();
            
            // Check basic example has minimal data
            const basic = page.templateExamples.basic;
            expect(basic.data).toBeDefined();
            expect(basic.data.user).toBeDefined();
            expect(basic.data.user.name).toBe('John Doe');
            expect(basic.data.products).toBeUndefined(); // Should not have products data
            expect(basic.data.messages).toBeUndefined(); // Should not have messages data
            
            // Check loops example has only products data
            const loops = page.templateExamples.loops;
            expect(loops.data).toBeDefined();
            expect(loops.data.products).toBeDefined();
            expect(loops.data.products.length).toBe(4);
            expect(loops.data.user).toBeUndefined(); // Should not have user data
            expect(loops.data.messages).toBeUndefined(); // Should not have messages data
            
            // Check conditionals example has only relevant boolean data
            const conditionals = page.templateExamples.conditionals;
            expect(conditionals.data).toBeDefined();
            expect(conditionals.data.user.isAdmin).toBe(true);
            expect(conditionals.data.settings.notifications).toBe(true);
            expect(conditionals.data.products).toBeUndefined(); // Should not have products
            
            // Check escaping example has HTML content
            const escaping = page.templateExamples.escaping;
            expect(escaping.data).toBeDefined();
            expect(escaping.data.htmlContent).toContain('<strong>');
            expect(escaping.data.rawHtml).toContain('alert');
            expect(escaping.data.products).toBeUndefined(); // Should not have products
        });

        test('each example should have required fields', async () => {
            await page.onInit();
            
            Object.entries(page.templateExamples).forEach(([key, example]) => {
                expect(example.name).toBeDefined();
                expect(example.template).toBeDefined();
                expect(example.data).toBeDefined();
                expect(example.description).toBeDefined();
            });
        });
    });

    describe('Template Rendering with Specific Data', () => {
        test('basic example should render with its specific data', async () => {
            await page.onInit();
            
            const example = page.templateExamples.basic;
            const rendered = Mustache.render(example.template, example.data);
            
            expect(rendered).toContain('John Doe');
            expect(rendered).toContain('john.doe@example.com');
            expect(rendered).toContain('MOJO Framework');
            expect(rendered).toContain(new Date().getFullYear().toString());
        });

        test('loops example should render products table', async () => {
            await page.onInit();
            
            const example = page.templateExamples.loops;
            const rendered = Mustache.render(example.template, example.data);
            
            expect(rendered).toContain('Laptop');
            expect(rendered).toContain('$999.99');
            expect(rendered).toContain('In Stock');
            expect(rendered).toContain('Out of Stock');
            expect(rendered).toContain('Keyboard'); // Out of stock item
        });

        test('conditionals example should render based on boolean values', async () => {
            await page.onInit();
            
            const example = page.templateExamples.conditionals;
            const rendered = Mustache.render(example.template, example.data);
            
            expect(rendered).toContain('Admin Access Granted');
            expect(rendered).not.toContain('Regular User');
            expect(rendered).toContain('Notifications are enabled');
        });

        test('sections example should render messages correctly', async () => {
            await page.onInit();
            
            const example = page.templateExamples.sections;
            const rendered = Mustache.render(example.template, example.data);
            
            expect(rendered).toContain('Alice');
            expect(rendered).toContain('Hello!');
            expect(rendered).toContain('alert-primary'); // Unread message style
            expect(rendered).toContain('alert-secondary'); // Read message style
            expect(rendered).toContain('New'); // Unread badge
        });

        test('escaping example should handle HTML correctly', async () => {
            await page.onInit();
            
            const example = page.templateExamples.escaping;
            const rendered = Mustache.render(example.template, example.data);
            
            // Escaped HTML should appear as text
            expect(rendered).toContain('&lt;strong&gt;Bold Text&lt;/strong&gt;');
            
            // Unescaped HTML should be rendered
            expect(rendered).toContain('<strong>Bold Text</strong>');
            expect(rendered).toContain('<div class="alert alert-info">');
        });
    });

    describe('Loading Examples', () => {
        beforeEach(async () => {
            // Mount the page with necessary DOM elements
            container.innerHTML = page.getTemplate();
            await page.mount(container);
        });

        test('loading an example should update template and data editors', async () => {
            const templateEditor = container.querySelector('#template-editor');
            const dataEditor = container.querySelector('#data-editor');
            const basicButton = container.querySelector('[data-example="basic"]');
            
            // Simulate clicking the basic example
            await page.onActionLoadExample(
                new Event('click'),
                basicButton
            );
            
            expect(templateEditor.value).toContain('Welcome, {{user.name}}');
            
            const data = JSON.parse(dataEditor.value);
            expect(data.user.name).toBe('John Doe');
            expect(data.products).toBeUndefined(); // Should not have products
        });

        test('switching between examples should update data accordingly', async () => {
            const dataEditor = container.querySelector('#data-editor');
            const basicButton = container.querySelector('[data-example="basic"]');
            const loopsButton = container.querySelector('[data-example="loops"]');
            
            // Load basic example
            await page.onActionLoadExample(
                new Event('click'),
                basicButton
            );
            
            let data = JSON.parse(dataEditor.value);
            expect(data.user).toBeDefined();
            expect(data.products).toBeUndefined();
            
            // Switch to loops example
            await page.onActionLoadExample(
                new Event('click'),
                loopsButton
            );
            
            data = JSON.parse(dataEditor.value);
            expect(data.products).toBeDefined();
            expect(data.products.length).toBe(4);
            expect(data.user).toBeUndefined();
        });
    });

    describe('Reset Data Functionality', () => {
        beforeEach(async () => {
            container.innerHTML = page.getTemplate();
            await page.mount(container);
        });

        test('reset should restore current example data', async () => {
            const dataEditor = container.querySelector('#data-editor');
            const basicButton = container.querySelector('[data-example="basic"]');
            
            // Load basic example
            await page.onActionLoadExample(
                new Event('click'),
                basicButton
            );
            
            // Modify the data
            dataEditor.value = JSON.stringify({ modified: true }, null, 2);
            
            // Reset data
            await page.onActionResetData();
            
            const data = JSON.parse(dataEditor.value);
            expect(data.user.name).toBe('John Doe');
            expect(data.modified).toBeUndefined();
        });

        test('reset without active example should set empty object', async () => {
            const dataEditor = container.querySelector('#data-editor');
            
            // Clear any active examples
            container.querySelectorAll('[data-action="loadExample"]').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Reset data
            await page.onActionResetData();
            
            const data = JSON.parse(dataEditor.value);
            expect(Object.keys(data).length).toBe(0);
        });
    });

    describe('Clear Template Functionality', () => {
        beforeEach(async () => {
            container.innerHTML = page.getTemplate();
            await page.mount(container);
        });

        test('clear should reset both template and data', async () => {
            const templateEditor = container.querySelector('#template-editor');
            const dataEditor = container.querySelector('#data-editor');
            const basicButton = container.querySelector('[data-example="basic"]');
            
            // Load an example first
            await page.onActionLoadExample(
                new Event('click'),
                basicButton
            );
            
            expect(templateEditor.value).not.toBe('');
            expect(JSON.parse(dataEditor.value).user).toBeDefined();
            
            // Clear template
            await page.onActionClearTemplate();
            
            expect(templateEditor.value).toBe('');
            const data = JSON.parse(dataEditor.value);
            expect(Object.keys(data).length).toBe(0);
            
            // Check that active state is removed
            expect(basicButton.classList.contains('active')).toBe(false);
        });
    });

    describe('Initial State', () => {
        test('should initialize with empty current data', async () => {
            await page.onInit();
            expect(page.currentData).toBeDefined();
            expect(Object.keys(page.currentData).length).toBe(0);
        });

        test('should load first example on mount', async () => {
            container.innerHTML = page.getTemplate();
            await page.mount(container);
            
            const firstButton = container.querySelector('[data-action="loadExample"]');
            expect(firstButton.classList.contains('active')).toBe(true);
            
            const templateEditor = container.querySelector('#template-editor');
            expect(templateEditor.value).not.toBe('');
        });
    });
});