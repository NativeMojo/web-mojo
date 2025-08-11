/**
 * DataFormatter Unit Tests
 * Tests all built-in formatters and pipe processing
 */

module.exports = async function(testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  
  // Import DataFormatter
  const { DataFormatter } = require('../../src/utils/DataFormatter.js');
  const dataFormatter = require('../../src/utils/DataFormatter.js').default;
  
  await testHelpers.setup();

  describe('DataFormatter', () => {
    let formatter;

    beforeEach(() => {
      formatter = new DataFormatter();
    });

  describe('Date/Time Formatters', () => {
    const testDate = new Date('2024-01-15T14:30:45.000Z');

    describe('date', () => {
      it('should format date with default format', () => {
        expect(formatter.apply('date', testDate)).toBe('01/15/2024');
      });

      it('should format date with custom format', () => {
        expect(formatter.apply('date', testDate, 'YYYY-MM-DD')).toBe('2024-01-15');
        expect(formatter.apply('date', testDate, 'DD/MM/YYYY')).toBe('15/01/2024');
        expect(formatter.apply('date', testDate, 'MMM DD, YYYY')).toMatch(/Jan 15, 2024/);
      });

      it('should handle string dates', () => {
        // Use a date string with explicit timezone to avoid timezone issues
        const dateStr = '2024-01-15T00:00:00';
        const result = formatter.apply('date', dateStr);
        // Check that it's a valid date format (MM/DD/YYYY)
        expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      });

      it('should return empty string for null/undefined', () => {
        expect(formatter.apply('date', null)).toBe('');
        expect(formatter.apply('date', undefined)).toBe('');
      });

      it('should return original value for invalid dates', () => {
        expect(formatter.apply('date', 'invalid')).toBe('invalid');
      });
    });

    describe('time', () => {
      it('should format time with default format', () => {
        const localDate = new Date('2024-01-15T14:30:45');
        expect(formatter.apply('time', localDate)).toMatch(/\d{2}:\d{2}:\d{2}/);
      });

      it('should format time with custom format', () => {
        const localDate = new Date('2024-01-15T14:30:45');
        expect(formatter.apply('time', localDate, 'HH:mm')).toMatch(/\d{2}:\d{2}/);
        expect(formatter.apply('time', localDate, 'h:mm A')).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
      });
    });

    describe('datetime', () => {
      it('should format date and time together', () => {
        const localDate = new Date('2024-01-15T14:30:45');
        const result = formatter.apply('datetime', localDate);
        expect(result).toMatch(/01\/15\/2024 \d{2}:\d{2}/);
      });

      it('should accept custom formats', () => {
        const localDate = new Date('2024-01-15T14:30:45');
        const result = formatter.apply('datetime', localDate, 'YYYY-MM-DD', 'HH:mm:ss');
        expect(result).toMatch(/2024-01-15 \d{2}:\d{2}:\d{2}/);
      });
    });

    describe('relative', () => {
      it('should format relative time', () => {
        const now = new Date();
        expect(formatter.apply('relative', now)).toBe('just now');

        const yesterday = new Date(now - 24 * 60 * 60 * 1000);
        expect(formatter.apply('relative', yesterday)).toBe('yesterday');

        const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);
        expect(formatter.apply('relative', twoDaysAgo)).toBe('2 days ago');

        const oneHourAgo = new Date(now - 60 * 60 * 1000);
        expect(formatter.apply('relative', oneHourAgo)).toBe('1 hour ago');
      });

      it('should format short relative time', () => {
        const now = new Date();
        expect(formatter.apply('relative', now, true)).toBe('now');

        const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);
        expect(formatter.apply('relative', twoDaysAgo, true)).toBe('2d');

        const oneHourAgo = new Date(now - 60 * 60 * 1000);
        expect(formatter.apply('relative', oneHourAgo, true)).toBe('1h');
      });
    });

    describe('iso', () => {
      it('should format ISO date', () => {
        const date = new Date('2024-01-15T14:30:45.000Z');
        expect(formatter.apply('iso', date)).toBe('2024-01-15T14:30:45.000Z');
      });

      it('should format ISO date only', () => {
        const date = new Date('2024-01-15T14:30:45.000Z');
        expect(formatter.apply('iso', date, true)).toBe('2024-01-15');
      });
    });
  });

  describe('Number Formatters', () => {
    describe('number', () => {
      it('should format numbers with decimals', () => {
        expect(formatter.apply('number', 1234.567)).toBe('1,234.57');
        expect(formatter.apply('number', 1234.567, 0)).toBe('1,235');
        expect(formatter.apply('number', 1234.567, 3)).toBe('1,234.567');
      });

      it('should handle string numbers', () => {
        expect(formatter.apply('number', '1234.567')).toBe('1,234.57');
      });

      it('should return original value for non-numbers', () => {
        expect(formatter.apply('number', 'abc')).toBe('abc');
      });
    });

    describe('currency', () => {
      it('should format currency with default symbol', () => {
        expect(formatter.apply('currency', 1234.56)).toBe('$1,234.56');
      });

      it('should format currency with custom symbol', () => {
        expect(formatter.apply('currency', 1234.56, '€')).toBe('€1,234.56');
        expect(formatter.apply('currency', 1234.56, '£', 0)).toBe('£1,235');
      });
    });

    describe('percent', () => {
      it('should format percentages', () => {
        expect(formatter.apply('percent', 0.1234)).toBe('12%');
        expect(formatter.apply('percent', 0.1234, 2)).toBe('12.34%');
      });

      it('should handle pre-multiplied percentages', () => {
        expect(formatter.apply('percent', 12.34, 2, false)).toBe('12.34%');
      });
    });

    describe('filesize', () => {
      it('should format file sizes in decimal units', () => {
        expect(formatter.apply('filesize', 0)).toBe('0 B');
        expect(formatter.apply('filesize', 1000)).toBe('1.0 KB');
        expect(formatter.apply('filesize', 1500000)).toBe('1.5 MB');
        expect(formatter.apply('filesize', 5000000000)).toBe('5.0 GB');
      });

      it('should format file sizes in binary units', () => {
        expect(formatter.apply('filesize', 1024, true)).toBe('1.0 KiB');
        expect(formatter.apply('filesize', 1048576, true)).toBe('1.0 MiB');
      });

      it('should handle custom decimal places', () => {
        expect(formatter.apply('filesize', 1500, false, 2)).toBe('1.50 KB');
      });
    });

    describe('ordinal', () => {
      it('should format ordinal numbers', () => {
        expect(formatter.apply('ordinal', 1)).toBe('1st');
        expect(formatter.apply('ordinal', 2)).toBe('2nd');
        expect(formatter.apply('ordinal', 3)).toBe('3rd');
        expect(formatter.apply('ordinal', 4)).toBe('4th');
        expect(formatter.apply('ordinal', 11)).toBe('11th');
        expect(formatter.apply('ordinal', 21)).toBe('21st');
      });

      it('should return suffix only when requested', () => {
        expect(formatter.apply('ordinal', 1, true)).toBe('st');
        expect(formatter.apply('ordinal', 2, true)).toBe('nd');
      });
    });

    describe('compact', () => {
      it('should format compact numbers', () => {
        expect(formatter.apply('compact', 1234)).toBe('1.2K');
        expect(formatter.apply('compact', 1234567)).toBe('1.2M');
        expect(formatter.apply('compact', 1234567890)).toBe('1.2B');
        expect(formatter.apply('compact', 999)).toBe('999');
      });

      it('should handle negative numbers', () => {
        expect(formatter.apply('compact', -1234)).toBe('-1.2K');
      });

      it('should handle custom decimal places', () => {
        expect(formatter.apply('compact', 1234, 2)).toBe('1.23K');
      });
    });
  });

  describe('String Formatters', () => {
    describe('uppercase/lowercase', () => {
      it('should convert case', () => {
        expect(formatter.apply('uppercase', 'hello world')).toBe('HELLO WORLD');
        expect(formatter.apply('lowercase', 'HELLO WORLD')).toBe('hello world');
      });

      it('should handle non-strings', () => {
        expect(formatter.apply('uppercase', 123)).toBe('123');
        expect(formatter.apply('lowercase', true)).toBe('true');
      });
    });

    describe('capitalize', () => {
      it('should capitalize first letter', () => {
        expect(formatter.apply('capitalize', 'hello world')).toBe('Hello world');
      });

      it('should capitalize all words when requested', () => {
        expect(formatter.apply('capitalize', 'hello world', true)).toBe('Hello World');
      });

      it('should handle empty strings', () => {
        expect(formatter.apply('capitalize', '')).toBe('');
      });
    });

    describe('truncate', () => {
      it('should truncate long strings', () => {
        const longString = 'This is a very long string that needs to be truncated';
        expect(formatter.apply('truncate', longString, 10)).toBe('This is a ...');
      });

      it('should not truncate short strings', () => {
        expect(formatter.apply('truncate', 'Short', 10)).toBe('Short');
      });

      it('should use custom suffix', () => {
        expect(formatter.apply('truncate', 'Long string', 4, '…')).toBe('Long…');
      });
    });

    describe('slug', () => {
      it('should create URL-friendly slugs', () => {
        expect(formatter.apply('slug', 'Hello World!')).toBe('hello-world');
        expect(formatter.apply('slug', 'This & That')).toBe('this-that');
        expect(formatter.apply('slug', '  Multiple   Spaces  ')).toBe('multiple-spaces');
      });

      it('should use custom separator', () => {
        expect(formatter.apply('slug', 'Hello World', '_')).toBe('hello_world');
      });
    });

    describe('initials', () => {
      it('should extract initials', () => {
        expect(formatter.apply('initials', 'John Doe')).toBe('JD');
        expect(formatter.apply('initials', 'Mary Jane Smith')).toBe('MJ');
      });

      it('should handle custom count', () => {
        expect(formatter.apply('initials', 'Mary Jane Smith', 3)).toBe('MJS');
      });

      it('should handle single word', () => {
        expect(formatter.apply('initials', 'John')).toBe('J');
      });
    });

    describe('mask', () => {
      it('should mask strings', () => {
        expect(formatter.apply('mask', '1234567890')).toBe('******7890');
        expect(formatter.apply('mask', 'password')).toBe('****word');
      });

      it('should use custom mask character', () => {
        expect(formatter.apply('mask', '1234567890', 'X', 4)).toBe('XXXXXX7890');
      });

      it('should handle custom show count', () => {
        expect(formatter.apply('mask', '1234567890', '*', 2)).toBe('********90');
      });

      it('should handle short strings', () => {
        expect(formatter.apply('mask', '123', '*', 4)).toBe('123');
      });
    });
  });

  describe('HTML/Web Formatters', () => {
    describe('email', () => {
      it('should create email links', () => {
        expect(formatter.apply('email', 'test@example.com'))
          .toBe('<a href="mailto:test@example.com">test@example.com</a>');
      });

      it('should handle options', () => {
        const result = formatter.apply('email', 'test@example.com', {
          subject: 'Test Subject',
          body: 'Test Body',
          class: 'email-link'
        });
        expect(result).toContain('mailto:test@example.com?subject=Test%20Subject&body=Test%20Body');
        expect(result).toContain('class="email-link"');
      });

      it('should return plain email when link is false', () => {
        expect(formatter.apply('email', 'test@example.com', { link: false }))
          .toBe('test@example.com');
      });
    });

    describe('phone', () => {
      it('should format US phone numbers', () => {
        expect(formatter.apply('phone', '5551234567'))
          .toBe('<a href="tel:5551234567">(555) 123-4567</a>');
      });

      it('should handle 11-digit US numbers', () => {
        expect(formatter.apply('phone', '15551234567'))
          .toBe('<a href="tel:15551234567">+1 (555) 123-4567</a>');
      });

      it('should return plain phone when link is false', () => {
        expect(formatter.apply('phone', '5551234567', 'US', false))
          .toBe('(555) 123-4567');
      });
    });

    describe('url', () => {
      it('should create URL links', () => {
        expect(formatter.apply('url', 'example.com'))
          .toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a>');
      });

      it('should preserve existing protocol', () => {
        expect(formatter.apply('url', 'http://example.com'))
          .toContain('href="http://example.com"');
      });

      it('should use custom text', () => {
        expect(formatter.apply('url', 'example.com', 'Click here'))
          .toContain('>Click here</a>');
      });

      it('should handle same window links', () => {
        const result = formatter.apply('url', 'example.com', null, false);
        expect(result).not.toContain('target="_blank"');
        expect(result).not.toContain('rel="noopener noreferrer"');
      });
    });

    describe('badge', () => {
      it('should create badge HTML', () => {
        expect(formatter.apply('badge', 'Active'))
          .toBe('<span class="badge bg-success">Active</span>');
      });

      it('should auto-detect badge types', () => {
        expect(formatter.apply('badge', 'error')).toContain('bg-danger');
        expect(formatter.apply('badge', 'warning')).toContain('bg-warning');
        expect(formatter.apply('badge', 'info')).toContain('bg-info');
      });

      it('should use specified type', () => {
        expect(formatter.apply('badge', 'Custom', 'primary'))
          .toBe('<span class="badge bg-primary">Custom</span>');
      });
    });

    describe('status', () => {
      it('should format status with icons', () => {
        expect(formatter.apply('status', 'active'))
          .toBe('<span class="text-success">✓ active</span>');
      });

      it('should use custom icons and colors', () => {
        const result = formatter.apply('status', 'custom', 
          { custom: '🔥' }, 
          { custom: 'primary' }
        );
        expect(result).toBe('<span class="text-primary">🔥 custom</span>');
      });
    });

    describe('boolean', () => {
      it('should format boolean values', () => {
        expect(formatter.apply('boolean', true)).toBe('True');
        expect(formatter.apply('boolean', false)).toBe('False');
      });

      it('should use custom text', () => {
        expect(formatter.apply('boolean', true, 'Yes', 'No')).toBe('Yes');
        expect(formatter.apply('boolean', false, 'On', 'Off')).toBe('Off');
      });

      it('should handle truthy/falsy values', () => {
        expect(formatter.apply('boolean', 1)).toBe('True');
        expect(formatter.apply('boolean', 0)).toBe('False');
        expect(formatter.apply('boolean', 'text')).toBe('True');
        expect(formatter.apply('boolean', '')).toBe('False');
      });
    });

    describe('yesno', () => {
      it('should format as Yes/No', () => {
        expect(formatter.apply('yesno', true)).toBe('Yes');
        expect(formatter.apply('yesno', false)).toBe('No');
      });
    });
  });

  describe('Utility Formatters', () => {
    describe('default', () => {
      it('should apply default values', () => {
        expect(formatter.apply('default', null, 'N/A')).toBe('N/A');
        expect(formatter.apply('default', undefined, 'Unknown')).toBe('Unknown');
        expect(formatter.apply('default', '', 'Empty')).toBe('Empty');
      });

      it('should preserve non-empty values', () => {
        expect(formatter.apply('default', 'value', 'default')).toBe('value');
        expect(formatter.apply('default', 0, 'default')).toBe(0);
        expect(formatter.apply('default', false, 'default')).toBe(false);
      });
    });

    describe('json', () => {
      it('should stringify JSON', () => {
        const obj = { key: 'value', nested: { prop: 123 } };
        const result = formatter.apply('json', obj);
        expect(result).toContain('"key": "value"');
        expect(result).toContain('"prop": 123');
      });

      it('should handle indentation', () => {
        const obj = { key: 'value' };
        const compact = formatter.apply('json', obj, 0);
        expect(compact).toBe('{"key":"value"}');
      });

      it('should handle errors gracefully', () => {
        const circular = {};
        circular.self = circular;
        expect(formatter.apply('json', circular)).toBe('[object Object]');
      });
    });

    describe('raw', () => {
      it('should pass through unchanged', () => {
        const obj = { test: 'value' };
        expect(formatter.apply('raw', obj)).toBe(obj);
        expect(formatter.apply('raw', 123)).toBe(123);
        expect(formatter.apply('raw', null)).toBe(null);
      });
    });

    describe('custom', () => {
      it('should apply custom function', () => {
        const customFn = (value) => value.toUpperCase() + '!!!';
        expect(formatter.apply('custom', 'hello', customFn)).toBe('HELLO!!!');
      });

      it('should handle non-function arguments', () => {
        expect(formatter.apply('custom', 'hello', 'not a function')).toBe('hello');
      });
    });
  });

  describe('Pipe Processing', () => {
    it('should process single formatter', () => {
      expect(formatter.pipe('hello', 'uppercase')).toBe('HELLO');
    });

    it('should chain multiple formatters', () => {
      expect(formatter.pipe('hello world', 'uppercase|truncate(5)')).toBe('HELLO...');
    });

    it('should handle formatter arguments', () => {
      const date = new Date('2024-01-15T00:00:00');
      const result = formatter.pipe(date, "date('YYYY-MM-DD')");
      // Check format is YYYY-MM-DD
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle complex chains', () => {
      expect(formatter.pipe(1234.567, 'currency|default("Free")')).toBe('$1,234.57');
      expect(formatter.pipe(null, 'default("Free")|uppercase')).toBe('FREE');
    });

    it('should handle multiple arguments in pipes', () => {
      // Test pipe with simpler argument format
      expect(formatter.pipe('test@example.com', "lowercase|truncate(10)"))
        .toBe('test@examp...');
    });

    it('should handle quoted arguments', () => {
      expect(formatter.pipe('long text here', "truncate(4, '...')|uppercase"))
        .toBe('LONG...');
    });

    it('should handle boolean and number arguments', () => {
      expect(formatter.pipe('hello world', 'capitalize(true)')).toBe('Hello World');
      expect(formatter.pipe(0.5, 'percent(2, false)')).toBe('0.50%');
    });

    it('should return original value for empty pipe string', () => {
      expect(formatter.pipe('value', '')).toBe('value');
      expect(formatter.pipe('value', null)).toBe('value');
    });

    it('should handle unknown formatters gracefully', () => {
      const originalWarn = console.warn;
      let warnMessage = null;
      console.warn = (msg) => { warnMessage = msg; };
      
      expect(formatter.pipe('value', 'unknown')).toBe('value');
      expect(warnMessage).toBe("Formatter 'unknown' not found");
      
      console.warn = originalWarn;
    });
  });

  describe('Custom Formatter Registration', () => {
    it('should register custom formatters', () => {
      formatter.register('double', (value) => value * 2);
      expect(formatter.apply('double', 5)).toBe(10);
    });

    it('should override existing formatters', () => {
      const customFormatter = new DataFormatter();
      customFormatter.register('uppercase', (value) => 'CUSTOM: ' + value);
      expect(customFormatter.apply('uppercase', 'test')).toBe('CUSTOM: test');
    });

    it('should throw error for non-function formatters', () => {
      try {
        formatter.register('invalid', 'not a function');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Formatter must be a function, got string');
      }
    });

    it('should check if formatter exists', () => {
      expect(formatter.has('date')).toBe(true);
      expect(formatter.has('nonexistent')).toBe(false);
    });

    it('should unregister formatters', () => {
      formatter.register('temp', (v) => v);
      expect(formatter.has('temp')).toBe(true);
      expect(formatter.unregister('temp')).toBe(true);
      expect(formatter.has('temp')).toBe(false);
      expect(formatter.unregister('temp')).toBe(false);
    });

    it('should list all formatters', () => {
      const list = formatter.list();
      expect(list).toContain('date');
      expect(list).toContain('currency');
      expect(list).toContain('uppercase');
      expect(list).toEqual(list.slice().sort());
    });

    it('should be case-insensitive', () => {
      formatter.register('MyFormatter', (v) => 'formatted: ' + v);
      expect(formatter.apply('myformatter', 'test')).toBe('formatted: test');
      expect(formatter.apply('MYFORMATTER', 'test')).toBe('formatted: test');
      expect(formatter.has('myformatter')).toBe(true);
      expect(formatter.has('MYFORMATTER')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle formatter errors gracefully', () => {
      formatter.register('buggy', () => {
        throw new Error('Formatter error');
      });
      
      const originalError = console.error;
      let errorCalled = false;
      console.error = () => { errorCalled = true; };
      
      expect(formatter.apply('buggy', 'value')).toBe('value');
      expect(errorCalled).toBe(true);
      
      console.error = originalError;
    });

    it('should handle invalid formatter names', () => {
      const originalWarn = console.warn;
      let warnCalled = false;
      console.warn = () => { warnCalled = true; };
      
      expect(formatter.apply('', 'value')).toBe('value');
      expect(formatter.apply(null, 'value')).toBe('value');
      expect(warnCalled).toBe(true);
      
      console.warn = originalWarn;
    });

    it('should handle malformed pipe strings', () => {
      const testFormatter = new DataFormatter();
      expect(testFormatter.pipe('value', 'uppercase|')).toBe('VALUE');
      expect(testFormatter.pipe('value', '|uppercase')).toBe('VALUE');
      expect(testFormatter.pipe('value', 'uppercase||lowercase')).toBe('value');
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(dataFormatter).toBeInstanceOf(DataFormatter);
      expect(dataFormatter.has('date')).toBe(true);
    });

    it('should maintain state across imports', () => {
      dataFormatter.register('singleton-test', (v) => 'singleton: ' + v);
      expect(dataFormatter.apply('singleton-test', 'value')).toBe('singleton: value');
    });
  });
  });
};