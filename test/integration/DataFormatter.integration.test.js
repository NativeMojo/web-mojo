/**
 * DataFormatter Integration Tests
 * Tests DataFormatter integration with Model, Table, and Templates
 */

module.exports = async function(testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;
  const { testHelpers } = require('../utils/test-helpers');

  // Import components
  const Model = require('../../src/core/Model.js').default;
  const Table = require('../../src/components/Table.js').default;
  const View = require('../../src/core/View.js').default;
  const dataFormatter = require('../../src/utils/DataFormatter.js').default;
  const mustacheFormatter = require('../../src/utils/MustacheFormatter.js').default;

  await testHelpers.setup();

  describe('DataFormatter Integration', () => {

    describe('Model Integration', () => {
      let model;

      beforeEach(() => {
        model = new Model({
          id: 1,
          name: 'john doe',
          email: 'JOHN@EXAMPLE.COM',
          created_at: '2024-01-15T10:30:00Z',
          price: 1234.56,
          status: 'active',
          description: 'This is a very long description that needs to be truncated for display purposes',
          phone: '5551234567',
          score: 0.85,
          fileSize: 1048576
        });
      });

      it('should format values using pipe syntax in Model.get()', () => {
        // Single formatter
        expect(model.get('name|uppercase')).toBe('JOHN DOE');
        expect(model.get('email|lowercase')).toBe('john@example.com');
        expect(model.get('created_at|date')).toMatch(/01\/15\/2024/);
        expect(model.get('price|currency')).toBe('$1,234.56');
        expect(model.get('status|badge')).toContain('badge bg-success');

        // Chained formatters
        expect(model.get('name|uppercase|truncate(4)')).toBe('JOHN...');
        expect(model.get('email|lowercase|truncate(10)')).toBe('john@examp...');

        // Formatters with arguments
        expect(model.get("created_at|date('YYYY-MM-DD')")).toBe('2024-01-15');
        expect(model.get("price|currency('€', 0)")).toBe('€1,235');
        expect(model.get("description|truncate(20, '…')")).toBe('This is a very long …');

        // Complex chains
        expect(model.get("score|percent(1)|default('N/A')")).toBe('85.0%');
        expect(model.get("fileSize|filesize(true, 2)")).toBe('1.00 MiB');
      });

      it('should handle null/undefined values with pipe formatting', () => {
        model.set('empty', null);
        model.set('missing', undefined);

        expect(model.get("empty|default('No value')")).toBe('No value');
        expect(model.get("missing|default('Not set')")).toBe('Not set');
        expect(model.get("nonexistent|default('Missing')|uppercase")).toBe('MISSING');
      });

      it('should handle nested properties with pipes', () => {
        model.set('user', {
          profile: {
            firstName: 'jane',
            lastName: 'smith'
          }
        });

        expect(model.get('user.profile.firstName|capitalize')).toBe('Jane');
        expect(model.get('user.profile.lastName|uppercase')).toBe('SMITH');
      });
    });

    describe('Table Integration', () => {
      let table;
      let container;

      beforeEach(() => {
        container = document.createElement('div');
        container.id = 'test-table';
        document.body.appendChild(container);

        table = new TableView({
          container: '#test-table',
          columns: [
            {
              key: 'name',
              label: 'Name',
              formatter: 'capitalize'
            },
            {
              key: 'email',
              label: 'Email',
              formatter: (value) => value.toLowerCase()
            },
            {
              key: 'created_at',
              label: 'Date',
              formatter: {
                name: 'date',
                args: ['MM/DD/YYYY']
              }
            },
            {
              key: 'price',
              label: 'Price',
              formatter: "currency|default('Free')"
            },
            {
              key: 'status',
              label: 'Status',
              formatter: (value, context) => {
                const color = value === 'active' ? 'success' : 'secondary';
                return `<span class="badge bg-${color}">${value}</span>`;
              }
            },
            {
              key: 'phone',
              label: 'Phone',
              formatter: {
                formatter: 'phone',
                args: ['US', false]
              }
            }
          ]
        });
      });

      afterEach(() => {
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      });

      it('should apply string formatters to table cells', () => {
        const cell = table.buildTableCell(
          { name: 'john doe' },
          { key: 'name', formatter: 'capitalize' }
        );
        expect(cell).toContain('John Doe');
      });

      it('should apply function formatters to table cells', () => {
        const cell = table.buildTableCell(
          { email: 'JOHN@EXAMPLE.COM' },
          {
            key: 'email',
            formatter: (value) => value.toLowerCase()
          }
        );
        expect(cell).toContain('john@example.com');
      });

      it('should apply object formatters with args', () => {
        const cell = table.buildTableCell(
          { created_at: '2024-01-15' },
          {
            key: 'created_at',
            formatter: {
              name: 'date',
              args: ['YYYY-MM-DD']
            }
          }
        );
        expect(cell).toContain('2024-01-15');
      });

      it('should apply pipe string formatters', () => {
        const cell = table.buildTableCell(
          { price: 0 },
          { key: 'price', formatter: "currency|default('Free')" }
        );
        expect(cell).toContain('$0.00');

        const freeCell = table.buildTableCell(
          { price: null },
          { key: 'price', formatter: "currency|default('Free')" }
        );
        expect(freeCell).toContain('Free');
      });

      it('should provide context to function formatters', () => {
        const row = { id: 1, name: 'Test', status: 'active' };
        const column = { key: 'status', label: 'Status' };

        let receivedContext;
        const formatter = (value, context) => {
          receivedContext = context;
          return value;
        };

        table.buildTableCell(row, { ...column, formatter });

        expect(receivedContext).toBeDefined();
        expect(receivedContext.value).toBe('active');
        expect(receivedContext.row).toBe(row);
        expect(receivedContext.column.key).toBe('status');
        expect(receivedContext.table).toBe(table);
      });

      it('should handle complex formatter objects', () => {
        const cell = table.buildTableCell(
          { phone: '5551234567' },
          {
            key: 'phone',
            formatter: {
              formatter: 'phone',
              args: ['US', false],
              options: { class: 'phone-link' }
            }
          }
        );
        expect(cell).toContain('(555) 123-4567');
        expect(cell).not.toContain('<a href');
      });
    });

    describe('Template Integration', () => {
      it('should process pipe formatters in templates', () => {
        const template = `
          <div>
            <h3>{{name|uppercase}}</h3>
            <p>{{email|lowercase}}</p>
            <span>{{created_at|date('YYYY-MM-DD')}}</span>
            <strong>{{price|currency|default('Free')}}</strong>
          </div>
        `;

        const data = {
          name: 'john doe',
          email: 'JOHN@EXAMPLE.COM',
          created_at: '2024-01-15',
          price: 123.45
        };

        const result = mustacheFormatter.render(template, data);

        expect(result).toContain('<h3>JOHN DOE</h3>');
        expect(result).toContain('<p>john@example.com</p>');
        expect(result).toContain('<span>2024-01-15</span>');
        expect(result).toContain('<strong>$123.45</strong>');
      });

      it('should handle triple mustache with pipes', () => {
        const template = `
          <div>
            {{{email|email}}}
            {{{url|url('Visit Site')}}}
          </div>
        `;

        const data = {
          email: 'test@example.com',
          url: 'example.com'
        };

        const result = mustacheFormatter.render(template, data);

        expect(result).toContain('<a href="mailto:test@example.com">test@example.com</a>');
        expect(result).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Visit Site</a>');
      });

      it('should handle nested properties with pipes', () => {
        const template = `
          {{user.profile.name|capitalize}}
          {{items.0.price|currency}}
        `;

        const data = {
          user: {
            profile: {
              name: 'jane smith'
            }
          },
          items: [
            { price: 99.99 }
          ]
        };

        const result = mustacheFormatter.render(template, data);

        expect(result).toContain('Jane smith');
        expect(result).toContain('$99.99');
      });

      it('should work with View class templates', async () => {
        class TestView extends View {
          async getTemplate() {
            return `
              <div class="user-card">
                <h4>{{name|uppercase}}</h4>
                <p>{{email|lowercase}}</p>
                <span class="badge">{{status|capitalize}}</span>
                <time>{{created_at|relative}}</time>
              </div>
            `;
          }
        }

        const view = new TestView();
        view.data = {
          name: 'john doe',
          email: 'JOHN@EXAMPLE.COM',
          status: 'active',
          created_at: new Date()
        };

        const rendered = await view.renderTemplate();

        expect(rendered).toContain('<h4>JOHN DOE</h4>');
        expect(rendered).toContain('<p>john@example.com</p>');
        expect(rendered).toContain('<span class="badge">Active</span>');
        expect(rendered).toContain('just now');
      });
    });

    describe('Custom Formatter Registration', () => {
      beforeEach(() => {
        // Register custom formatters for testing
        dataFormatter.register('testDouble', (value) => value * 2);
        dataFormatter.register('testWrap', (value, prefix = '[', suffix = ']') => {
          return `${prefix}${value}${suffix}`;
        });
      });

      afterEach(() => {
        // Clean up custom formatters
        dataFormatter.unregister('testDouble');
        dataFormatter.unregister('testWrap');
      });

      it('should use custom formatters in Model', () => {
        const model = new Model({ value: 5 });
        expect(model.get('value|testDouble')).toBe(10);
        expect(model.get("value|testWrap('<<', '>>')")).toBe('<<5>>');
      });

      it('should use custom formatters in Table', () => {
        const table = new TableView({
          columns: [
            { key: 'value', formatter: 'testDouble' }
          ]
        });

        const cell = table.buildTableCell(
          { value: 3 },
          { key: 'value', formatter: 'testDouble' }
        );
        expect(cell).toContain('6');
      });

      it('should use custom formatters in templates', () => {
        const template = '{{value|testDouble}} {{text|testWrap}}';
        const data = { value: 7, text: 'hello' };
        const result = mustacheFormatter.render(template, data);

        expect(result).toContain('14');
        expect(result).toContain('[hello]');
      });

      it('should chain custom formatters with built-in ones', () => {
        const model = new Model({ value: 5 });
        expect(model.get('value|testDouble|currency')).toBe('$10.00');

        const template = "{{value|testDouble|testWrap('$', '.00')}}";
        const result = mustacheFormatter.render(template, { value: 3 });
        expect(result).toBe('$6.00');
      });
    });

    describe('Error Handling', () => {
      it('should handle formatter errors gracefully in Model', () => {
        dataFormatter.register('buggy', () => {
          throw new Error('Formatter error');
        });

        const model = new Model({ value: 'test' });
        expect(model.get('value|buggy')).toBe('test');

        dataFormatter.unregister('buggy');
      });

      it('should handle invalid formatters in Table', () => {
        const table = new TableView();
        const cell = table.buildTableCell(
          { value: 'test' },
          { key: 'value', formatter: 'nonexistent' }
        );
        expect(cell).toContain('test');
      });

      it('should handle malformed pipe strings in templates', () => {
        const template = '{{value|}} {{|uppercase}} {{value||uppercase}}';
        const data = { value: 'test' };
        const result = mustacheFormatter.render(template, data);

        expect(result).toContain('test');
      });
    });

    describe('Performance', () => {
      it('should handle large datasets efficiently', () => {
        const startTime = Date.now();

        // Create 1000 models and format values
        const models = [];
        for (let i = 0; i < 1000; i++) {
          const model = new Model({
            name: `User ${i}`,
            email: `user${i}@example.com`,
            created_at: new Date(),
            price: Math.random() * 1000
          });

          models.push({
            name: model.get('name|uppercase'),
            email: model.get('email|lowercase'),
            date: model.get('created_at|date'),
            price: model.get('price|currency')
          });
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should process 1000 items in under 500ms
        expect(duration).toBeLessThan(500);
        expect(models.length).toBe(1000);
        expect(models[0].name).toBe('USER 0');
      });
    });
  });
};
