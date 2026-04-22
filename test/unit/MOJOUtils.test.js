/**
 * MOJOUtils Test Suite
 * Tests the unified data access with pipe formatting
 */

module.exports = async function(testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();

  const MOJOUtils = loadModule('MOJOUtils');
  const Model = loadModule('Model');
  const View = loadModule('View');
  const dataFormatter = loadModule('dataFormatter');
  
  describe('MOJOUtils.getContextData', () => {
    describe('Basic Property Access', () => {
      it('should access simple properties', () => {
        const context = { name: 'John', age: 30 };
        expect(MOJOUtils.getContextData(context, 'name')).toBe('John');
        expect(MOJOUtils.getContextData(context, 'age')).toBe(30);
      });
      
      it('should return undefined for missing properties', () => {
        const context = { name: 'John' };
        expect(MOJOUtils.getContextData(context, 'missing')).toBeUndefined();
      });
      
      it('should handle null and undefined contexts', () => {
        expect(MOJOUtils.getContextData(null, 'name')).toBeUndefined();
        expect(MOJOUtils.getContextData(undefined, 'name')).toBeUndefined();
      });
      
      it('should handle empty keys', () => {
        const context = { name: 'John' };
        expect(MOJOUtils.getContextData(context, '')).toBeUndefined();
        expect(MOJOUtils.getContextData(context, null)).toBeUndefined();
      });
    });
    
    describe('Method Calls', () => {
      it('should call methods on context', () => {
        const context = {
          name: 'John',
          getName() { return this.name; },
          getGreeting() { return `Hello, ${this.name}!`; }
        };
        
        expect(MOJOUtils.getContextData(context, 'getName')).toBe('John');
        expect(MOJOUtils.getContextData(context, 'getGreeting')).toBe('Hello, John!');
      });
      
      it('should handle methods that return undefined', () => {
        const context = {
          getNothing() { return undefined; }
        };
        
        expect(MOJOUtils.getContextData(context, 'getNothing')).toBeUndefined();
      });
    });
    
    describe('Dot Notation', () => {
      it('should navigate nested objects', () => {
        const context = {
          user: {
            name: 'John',
            address: {
              city: 'New York',
              zip: '10001'
            }
          }
        };
        
        expect(MOJOUtils.getContextData(context, 'user.name')).toBe('John');
        expect(MOJOUtils.getContextData(context, 'user.address.city')).toBe('New York');
        expect(MOJOUtils.getContextData(context, 'user.address.zip')).toBe('10001');
      });
      
      it('should handle arrays with dot notation', () => {
        const context = {
          items: [
            { name: 'Item 1', price: 10 },
            { name: 'Item 2', price: 20 }
          ]
        };
        
        expect(MOJOUtils.getContextData(context, 'items.0.name')).toBe('Item 1');
        expect(MOJOUtils.getContextData(context, 'items.1.price')).toBe(20);
      });
      
      it('should return undefined for invalid paths', () => {
        const context = {
          user: { name: 'John' }
        };
        
        expect(MOJOUtils.getContextData(context, 'user.missing')).toBeUndefined();
        expect(MOJOUtils.getContextData(context, 'missing.property')).toBeUndefined();
      });
    });
    
    describe('Nested Objects with get() Method', () => {
      it('should use get() method on nested objects', () => {
        const nestedModel = new Model({
          name: 'John Doe',
          email: 'john@example.com',
          created: '2024-01-15T10:30:00Z'
        });
        
        const context = {
          model: nestedModel,
          title: 'Dashboard'
        };
        
        // Should NOT call get() on context, but SHOULD call get() on model
        expect(MOJOUtils.getContextData(context, 'model.name')).toBe('John Doe');
        expect(MOJOUtils.getContextData(context, 'model.email')).toBe('john@example.com');
        expect(MOJOUtils.getContextData(context, 'title')).toBe('Dashboard');
      });
      
      it('should handle nested get() with pipes', () => {
        const nestedModel = new Model({
          name: 'john doe',
          price: 9999    // currency formatter takes cents now (see DataFormatter.md)
        });

        const context = {
          model: nestedModel
        };

        // Model.get() should handle the pipe
        expect(MOJOUtils.getContextData(context, 'model.name|uppercase')).toBe('JOHN DOE');
        expect(MOJOUtils.getContextData(context, 'model.price|currency')).toBe('$99.99');
      });
    });
    
    describe('Pipe Formatting', () => {
      it('should apply single pipe formatter', () => {
        const context = {
          name: 'john doe',
          price: 9999,     // cents → $99.99
          date: '2024-01-15'
        };

        expect(MOJOUtils.getContextData(context, 'name|uppercase')).toBe('JOHN DOE');
        expect(MOJOUtils.getContextData(context, 'price|currency')).toBe('$99.99');
      });
      
      it('should apply multiple pipe formatters', () => {
        const context = {
          text: 'hello world this is a long text'
        };
        
        expect(MOJOUtils.getContextData(context, 'text|uppercase|truncate(15)')).toBe('HELLO WORLD THI...');
      });
      
      it('should handle pipes with parentheses in arguments', () => {
        // date() takes a Date, epoch-ms, or epoch-seconds number — not an
        // arbitrary ISO string (see DataFormatter.test.js notes).
        const context = {
          date: new Date(2024, 0, 15, 10, 30, 0)
        };

        expect(MOJOUtils.getContextData(context, 'date|date("MMMM D, YYYY")')).toMatch(/January 15, 2024/);
      });
      
      it('should handle pipes with nested parentheses', () => {
        // Register a test formatter that uses parentheses
        dataFormatter.register('wrap', (value, open = '(', close = ')') => {
          return `${open}${value}${close}`;
        });
        
        const context = { text: 'test' };
        expect(MOJOUtils.getContextData(context, 'text|wrap("(", ")")')).toBe('(test)');
        
        // Cleanup
        dataFormatter.unregister('wrap');
      });
    });
    
    describe('Combined Dot Notation and Pipes', () => {
      it('should handle dot notation with pipes', () => {
        const context = {
          user: {
            name: 'john doe',
            email: 'JOHN@EXAMPLE.COM'
          }
        };
        
        expect(MOJOUtils.getContextData(context, 'user.name|uppercase')).toBe('JOHN DOE');
        expect(MOJOUtils.getContextData(context, 'user.email|lowercase')).toBe('john@example.com');
      });
      
      it('should handle complex paths with multiple pipes', () => {
        const context = {
          data: {
            items: [
              { title: 'first item title' },
              { title: 'second item title' }
            ]
          }
        };

        // capitalize default is `all=true` now — title-cases every word.
        // Pass `false` for first-letter-only.
        expect(MOJOUtils.getContextData(context, 'data.items.0.title|capitalize(false)')).toBe('First item title');
        expect(MOJOUtils.getContextData(context, 'data.items.1.title|uppercase|truncate(10)')).toBe('SECOND ITE...');
      });
    });
    
    describe('Edge Cases', () => {
      it('should handle special characters in keys', () => {
        const context = {
          'key-with-dash': 'value1',
          'key_with_underscore': 'value2'
        };
        
        expect(MOJOUtils.getContextData(context, 'key-with-dash')).toBe('value1');
        expect(MOJOUtils.getContextData(context, 'key_with_underscore')).toBe('value2');
      });
      
      it('should handle boolean and numeric values', () => {
        const context = {
          isActive: true,
          count: 0,
          ratio: 3.14
        };
        
        expect(MOJOUtils.getContextData(context, 'isActive')).toBe(true);
        expect(MOJOUtils.getContextData(context, 'count')).toBe(0);
        expect(MOJOUtils.getContextData(context, 'ratio')).toBe(3.14);
      });
      
      it('should not call get() on the top-level context to avoid recursion', () => {
        let getCalled = false;
        const context = {
          get(key) {
            getCalled = true;
            return 'should not be called';
          },
          name: 'John'
        };
        
        const result = MOJOUtils.getContextData(context, 'name');
        expect(result).toBe('John');
        expect(getCalled).toBe(false);
      });
    });
  });
  
  describe('Model.get() with MOJOUtils', () => {
    it('should handle pipes in Model.get()', () => {
      const model = new Model({
        name: 'john doe',
        price: 9999,                                // cents
        created: new Date(2024, 0, 15, 10, 30, 0)   // Date object — ISO strings don't normalize
      });

      expect(model.get('name')).toBe('john doe');
      expect(model.get('name|uppercase')).toBe('JOHN DOE');
      expect(model.get('price|currency')).toBe('$99.99');
      expect(model.get('created|date("MMM D")')).toMatch(/Jan 15/);
    });
    
    it('should handle nested properties with pipes', () => {
      const model = new Model({
        user: {
          name: 'jane smith',
          email: 'JANE@EXAMPLE.COM'
        }
      });

      expect(model.get('user.name')).toBe('jane smith');
      // capitalize default is all=true → 'Jane Smith'; use capitalize(false)
      // for first-letter-only.
      expect(model.get('user.name|capitalize(false)')).toBe('Jane smith');
      expect(model.get('user.name|capitalize')).toBe('Jane Smith');
      expect(model.get('user.email|lowercase')).toBe('jane@example.com');
    });
  });

  // View exposes getContextValue(path); use that (or MOJOUtils.getContextData
  // directly) instead of a non-existent view.get().
  describe('View.getContextValue() with MOJOUtils', () => {
    let view;

    beforeEach(() => {
      view = new View({
        data: {
          title: 'my page title',
          count: 42
        }
      });
    });

    it('should handle direct properties with pipes', () => {
      view.status = 'active';

      expect(view.getContextValue('status')).toBe('active');
      expect(view.getContextValue('status|uppercase')).toBe('ACTIVE');
    });

    it('should handle data namespace with pipes', () => {
      expect(view.getContextValue('data.title')).toBe('my page title');
      expect(view.getContextValue('data.title|capitalize(false)')).toBe('My page title');
      expect(view.getContextValue('data.count')).toBe(42);
    });

    it('should handle model namespace with pipes', () => {
      const model = new Model({
        name: 'product name',
        price: 2999    // cents → $29.99
      });
      view.setModel(model);

      expect(view.getContextValue('model.name')).toBe('product name');
      expect(view.getContextValue('model.name|uppercase')).toBe('PRODUCT NAME');
      expect(view.getContextValue('model.price|currency')).toBe('$29.99');
    });

    it('should handle view methods', () => {
      view.getStatus = function() { return 'ready'; };
      view.getCount = function() { return this.data.count; };

      expect(view.getContextValue('getStatus')).toBe('ready');
      expect(view.getContextValue('getStatus|uppercase')).toBe('READY');
      expect(view.getContextValue('getCount')).toBe(42);
    });

    it('should handle complex nested paths with pipes', () => {
      view.data.items = [
        { name: 'first item', value: 1050 },
        { name: 'second item', value: 2075 }   // cents → $20.75
      ];

      expect(view.getContextValue('data.items.0.name')).toBe('first item');
      expect(view.getContextValue('data.items.0.name|uppercase')).toBe('FIRST ITEM');
      expect(view.getContextValue('data.items.1.value|currency')).toBe('$20.75');
    });
  });
  
  describe('Integration with Mustache Templates', () => {
    it('should work seamlessly with Mustache rendering', () => {
      const Mustache = require('../../src/utils/mustache.js').default;

      const view = new View({
        data: {
          title: 'hello world',
          price: 9999     // cents → $99.99
        }
      });

      const model = new Model({
        name: 'john doe',
        // date() needs a Date object or epoch number — plain ISO strings
        // go through normalizeEpoch and get dropped.
        created: new Date(2024, 0, 15, 10, 30, 0)
      });
      view.setModel(model);

      // Add a method to view
      view.getStatus = function() { return 'active'; };

      // capitalize default is all=true → 'John Doe'. Use capitalize(false)
      // to match "John doe".
      const template = `
        <h1>{{data.title|uppercase}}</h1>
        <p>Name: {{model.name|capitalize(false)}}</p>
        <p>Price: {{data.price|currency}}</p>
        <p>Status: {{getStatus|uppercase}}</p>
        <p>Date: {{model.created|date("MMMM D, YYYY")}}</p>
      `;

      const result = Mustache.render(template, view);

      expect(result).toContain('<h1>HELLO WORLD</h1>');
      expect(result).toContain('<p>Name: John doe</p>');
      expect(result).toContain('<p>Price: $99.99</p>');
      expect(result).toContain('<p>Status: ACTIVE</p>');
      expect(result).toContain('<p>Date: January 15, 2024</p>');
    });
  });
};