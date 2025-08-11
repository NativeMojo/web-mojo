# DataFormatter Design Document

**Version:** 1.0.0  
**Date:** December 2024  
**Status:** Implemented  
**Framework Version:** MOJO 2.0.0

## Executive Summary

The DataFormatter utility provides universal data formatting capabilities across the MOJO framework. It enables consistent formatting through clean APIs, pipe syntax support, and seamless integration with Tables, Templates, and Models. The design emphasizes simplicity, extensibility, and developer experience.

## Core Principles

1. **Simple Naming**: No "format" prefix - just clean, intuitive function names
2. **Pipe Support**: Chain formatters using pipe syntax: `value|date|uppercase`
3. **Universal Integration**: Works seamlessly with Models, Tables, and Templates
4. **Extensible**: Easy to register custom formatters
5. **Context-Aware**: Formatters receive appropriate context for intelligent formatting
6. **Performance**: Lightweight with minimal overhead

## Architecture

### 1. DataFormatter Core

```javascript
// src/utils/DataFormatter.js
class DataFormatter {
  constructor() {
    this.formatters = new Map();
    this.registerBuiltInFormatters();
  }

  // Register a formatter
  register(name, formatter) {
    this.formatters.set(name.toLowerCase(), formatter);
    return this;
  }

  // Apply a formatter
  apply(name, value, ...args) {
    const formatter = this.formatters.get(name.toLowerCase());
    return formatter ? formatter(value, ...args) : value;
  }

  // Process pipe string
  pipe(value, pipeString) {
    // Parse and execute pipe chain
    // Example: "date('YYYY-MM-DD')|uppercase|truncate(50)"
  }
}
```

### 2. Built-in Formatters

#### Date/Time Formatters
```javascript
// Clean, simple names - no "format" prefix
date(value, format = 'MM/DD/YYYY')
time(value, format = 'HH:mm:ss')
datetime(value, dateFormat, timeFormat)
relative(value, short = false)  // "2 hours ago"
fromNow(value)  // Alias for relative
iso(value, dateOnly = false)
```

#### Number Formatters
```javascript
number(value, decimals = 2, locale = 'en-US')
currency(value, symbol = '$', decimals = 2)
percent(value, decimals = 0, multiply = true)
filesize(value, binary = false, decimals = 1)
ordinal(value, suffixOnly = false)  // 1st, 2nd, 3rd
compact(value, decimals = 1)  // 1.2K, 3.4M
```

#### String Formatters
```javascript
uppercase(value)
lowercase(value)
capitalize(value, all = false)  // First letter or all words
truncate(value, length = 50, suffix = '...')
slug(value, separator = '-')
initials(value, count = 2)
mask(value, char = '*', showLast = 4)
```

#### HTML/Web Formatters
```javascript
email(value, options = {link: true})
phone(value, format = 'US', link = true)
url(value, text = null, newWindow = true)
badge(value, type = 'auto')  // auto-detect type from value
status(value, icons = {}, colors = {})
boolean(value, trueText = 'Yes', falseText = 'No')
yesno(value)  // Alias for boolean with Yes/No
icon(value, mapping = {})
```

#### Utility Formatters
```javascript
default(value, defaultValue = '')
json(value, indent = 2)
raw(value)  // Pass through, no formatting
custom(value, fn)  // Apply inline function
```

### 3. Pipe Syntax Parser

```javascript
class PipeParser {
  // Parse pipe string into formatter chain
  parse(pipeString) {
    // Handle: "date('YYYY-MM-DD')|uppercase"
    // Handle: "currency('€', 2)|default('N/A')"
    // Handle: "truncate(50, '...')|capitalize"
    
    return this.tokenize(pipeString)
      .map(token => this.parseFormatter(token));
  }

  // Parse individual formatter with arguments
  parseFormatter(token) {
    // Extract name and arguments
    // Support multiple argument formats:
    // - formatter('arg1', 'arg2')
    // - formatter(arg1, arg2)
    // - formatter({option: value})
  }
}
```

### 4. Model Integration

```javascript
// src/core/Model.js updates
class Model {
  get(key) {
    // Check for pipe syntax
    if (key.includes('|')) {
      const [field, ...pipes] = key.split('|');
      const value = this.getAttribute(field);
      return dataFormatter.pipe(value, pipes.join('|'));
    }
    
    return this.getAttribute(key);
  }
}

// Usage
user.get('created_at|date')  // Formatted date
user.get('email|lowercase')  // Normalized email
user.get('price|currency|default("Free")')  // Chained formatters
```

### 5. Table Integration

```javascript
// Column formatter configuration
columns: [
  {
    key: 'name',
    label: 'Name',
    // String formatter
    formatter: 'capitalize'
  },
  {
    key: 'created_at',
    label: 'Date',
    // Object formatter with arguments
    formatter: {
      name: 'date',
      args: ['MM/DD/YYYY']
    }
  },
  {
    key: 'status',
    label: 'Status',
    // Function formatter with context
    formatter: (value, context) => {
      // context = { row, column, table, index }
      const statusClass = value === 'active' ? 'success' : 'secondary';
      return `<span class="badge bg-${statusClass}">${value}</span>`;
    }
  },
  {
    key: 'price',
    label: 'Price',
    // Pipe string
    formatter: "currency|default('Free')"
  }
]
```

### 6. Mustache Template Integration

```javascript
// src/utils/MustacheFormatter.js
class MustacheFormatter {
  render(template, data) {
    // Pre-process template to handle pipes
    // Convert: {{created_at|date('YYYY-MM-DD')}}
    // Into formatted values before Mustache rendering
  }
}

// Template usage
const template = `
  <div>
    <h3>{{name|uppercase}}</h3>
    <p>Joined: {{created_at|date('MMMM DD, YYYY')}}</p>
    <span class="price">{{price|currency('$', 2)|default('Free')}}</span>
    <a href="mailto:{{email|lowercase}}">{{email|lowercase}}</a>
  </div>
`;
```

## Implementation Details

### Argument Parsing

Support multiple argument formats for flexibility:

```javascript
// String arguments
"date('YYYY-MM-DD')"
"currency('€', 2)"

// Number arguments
"truncate(50)"
"percent(2)"

// Boolean arguments
"capitalize(true)"

// Object arguments (future enhancement)
"date({format: 'YYYY-MM-DD', timezone: 'UTC'})"

// Mixed arguments
"mask('*', 4)"
```

### Context Object

Formatters receive a context object when called from components:

```javascript
{
  value: any,        // The value to format
  row: object,       // Current row data (tables)
  column: object,    // Column configuration (tables)
  table: Table,      // Table instance (tables)
  index: number,     // Row index (tables)
  data: object,      // Full data object (templates)
  field: string,     // Field name
  options: object    // Additional options
}
```

### Error Handling

```javascript
class DataFormatter {
  apply(name, value, ...args) {
    try {
      const formatter = this.formatters.get(name.toLowerCase());
      if (!formatter) {
        console.warn(`Formatter '${name}' not found`);
        return value;
      }
      return formatter(value, ...args);
    } catch (error) {
      console.error(`Error in formatter '${name}':`, error);
      return value;  // Return original value on error
    }
  }
}
```

### Custom Formatter Registration

```javascript
// Global registration
dataFormatter.register('priority', (value, options = {}) => {
  const priorities = {
    high: { color: 'danger', icon: '🔴' },
    medium: { color: 'warning', icon: '🟡' },
    low: { color: 'success', icon: '🟢' }
  };
  
  const priority = priorities[value.toLowerCase()];
  return `<span class="text-${priority.color}">
    ${priority.icon} ${value}
  </span>`;
});

// Page-specific registration
class MyPage extends Page {
  onInit() {
    dataFormatter.register('myCustom', this.customFormatter.bind(this));
  }
  
  customFormatter(value, options) {
    // Custom formatting logic
  }
}
```

## Usage Examples

### Basic Formatting

```javascript
// Direct usage
dataFormatter.apply('date', new Date());
dataFormatter.apply('currency', 123.45, '$', 2);
dataFormatter.pipe('hello world', 'uppercase|truncate(5)');

// Model usage
user.get('created_at|date');
user.get('email|lowercase|default("no-email")');

// Template usage
{{price|currency}}
{{description|truncate(100)|capitalize}}
```

### Table Configuration

```javascript
new Table({
  columns: [
    {
      key: 'date',
      formatter: 'date'  // Simple string
    },
    {
      key: 'amount',
      formatter: {  // Object with args
        name: 'currency',
        args: ['€', 2]
      }
    },
    {
      key: 'status',
      formatter: (value, ctx) => {  // Function
        return ctx.row.active ? 
          `<span class="text-success">${value}</span>` :
          `<span class="text-muted">${value}</span>`;
      }
    },
    {
      key: 'description',
      formatter: 'truncate(50)|capitalize'  // Pipe string
    }
  ]
});
```

### Custom Formatters

```javascript
// Register formatter for project status
dataFormatter.register('projectStatus', (value, showIcon = true) => {
  const statuses = {
    'planning': { color: 'info', icon: '📋' },
    'active': { color: 'primary', icon: '🚀' },
    'review': { color: 'warning', icon: '👀' },
    'completed': { color: 'success', icon: '✅' },
    'cancelled': { color: 'danger', icon: '❌' }
  };
  
  const status = statuses[value] || { color: 'secondary', icon: '❓' };
  const icon = showIcon ? status.icon + ' ' : '';
  
  return `<span class="badge bg-${status.color}">
    ${icon}${value}
  </span>`;
});

// Use in table
columns: [{
  key: 'status',
  formatter: 'projectStatus'
}]

// Use in template
{{project.status|projectStatus(false)}}
```

## Testing Strategy

### Unit Tests

```javascript
// test/unit/DataFormatter.test.js
describe('DataFormatter', () => {
  describe('Built-in Formatters', () => {
    test('date formatter', () => {
      const date = new Date('2024-01-15');
      expect(dataFormatter.apply('date', date)).toBe('01/15/2024');
      expect(dataFormatter.apply('date', date, 'YYYY-MM-DD')).toBe('2024-01-15');
    });
    
    test('currency formatter', () => {
      expect(dataFormatter.apply('currency', 123.45)).toBe('$123.45');
      expect(dataFormatter.apply('currency', 123.45, '€')).toBe('€123.45');
    });
  });
  
  describe('Pipe Processing', () => {
    test('single pipe', () => {
      expect(dataFormatter.pipe('hello', 'uppercase')).toBe('HELLO');
    });
    
    test('chained pipes', () => {
      expect(dataFormatter.pipe('hello world', 'uppercase|truncate(5)')).toBe('HELLO...');
    });
  });
});
```

### Integration Tests

```javascript
// test/integration/formatter-integration.test.js
describe('DataFormatter Integration', () => {
  test('Model.get with pipes', () => {
    const model = new Model({ created_at: '2024-01-15' });
    expect(model.get('created_at|date')).toBe('01/15/2024');
  });
  
  test('Table formatter', () => {
    const table = new Table({
      columns: [{ key: 'price', formatter: 'currency' }]
    });
    // Test rendering
  });
  
  test('Mustache template pipes', () => {
    const template = '{{price|currency}}';
    const result = mustacheFormatter.render(template, { price: 123.45 });
    expect(result).toBe('$123.45');
  });
});
```

## Migration Path

### Phase 1: Core Implementation ✅
1. Implement DataFormatter class
2. Add built-in formatters
3. Implement pipe parser
4. Add unit tests

### Phase 2: Framework Integration ✅
1. Update Model.get() to support pipes
2. Update Table to use formatters
3. Create MustacheFormatter wrapper
4. Add integration tests

### Phase 3: Documentation & Examples
1. Create comprehensive documentation
2. Add example pages
3. Update existing examples to use formatters
4. Create migration guide for existing code

## Performance Considerations

1. **Caching**: Cache compiled pipe chains for repeated use
2. **Lazy Loading**: Load formatters on demand
3. **Memoization**: Cache formatted values for expensive operations
4. **Batching**: Optimize for bulk formatting in tables

## Security Considerations

1. **HTML Escaping**: Escape by default, opt-in for HTML output
2. **XSS Prevention**: Sanitize user-provided format strings
3. **Input Validation**: Validate formatter arguments
4. **Safe Defaults**: Always return safe values on error

## API Reference

### DataFormatter Class

```javascript
class DataFormatter {
  // Register a formatter
  register(name: string, formatter: Function): DataFormatter
  
  // Apply a formatter
  apply(name: string, value: any, ...args: any[]): any
  
  // Process pipe string
  pipe(value: any, pipeString: string): any
  
  // Remove a formatter
  unregister(name: string): boolean
  
  // Check if formatter exists
  has(name: string): boolean
  
  // Get all formatter names
  list(): string[]
}
```

### Table Formatter Options

```javascript
interface ColumnFormatter {
  // String: formatter name
  formatter?: string;
  
  // Function: custom formatter
  formatter?: (value: any, context: FormatterContext) => string;
  
  // Object: formatter with configuration
  formatter?: {
    name: string;
    args?: any[];
    options?: object;
  };
  
  // Pipe string
  formatter?: string;  // "formatter1|formatter2('arg')"
}
```

### Model Extensions

```javascript
class Model {
  // Get with optional pipe formatting
  get(key: string): any;  // key can include pipes: "field|formatter"
}
```

## Future Enhancements

1. **Async Formatters**: Support for async formatting operations
2. **Locale Support**: Enhanced internationalization
3. **Format Templates**: Reusable format configurations
4. **Conditional Formatting**: Format based on conditions
5. **Bulk Operations**: Optimize for large datasets
6. **Format Validation**: Validate formatted output
7. **Format Preview**: Preview formatting in development
8. **Format Builder UI**: Visual formatter configuration

## Implementation Status

### Completed ✅
- DataFormatter core class with all built-in formatters
- Pipe syntax parser with argument support
- Model.get() integration with pipe support
- Table component formatter support (string, function, object, pipe)
- MustacheFormatter for template pipe support
- Comprehensive unit tests
- Integration tests
- Example page demonstrating all features

### Files Modified
- `src/utils/DataFormatter.js` - New core utility
- `src/utils/MustacheFormatter.js` - New template formatter
- `src/core/Model.js` - Updated get() method for pipe support
- `src/components/Table.js` - Added applyFormatter() method
- `src/core/View.js` - Updated to use MustacheFormatter
- `test/unit/DataFormatter.test.js` - Unit tests
- `test/integration/DataFormatter.integration.test.js` - Integration tests
- `examples/pages/formatter/FormatterPage.js` - Example page

### Files Renamed
- `src/core/RestModel.js` → `src/core/Model.js`
- `test/unit/RestModel.test.js` → `test/unit/Model.test.js`

## Conclusion

The DataFormatter utility provides a clean, extensible solution for data formatting throughout the MOJO framework. By using simple naming, pipe syntax, and flexible configuration options, it enhances developer productivity while maintaining code clarity and maintainability.

The design prioritizes:
- **Simplicity**: Clean API with intuitive names
- **Flexibility**: Multiple configuration approaches
- **Integration**: Seamless framework integration
- **Extensibility**: Easy custom formatter registration
- **Performance**: Efficient processing with caching
- **Developer Experience**: Clear syntax and helpful errors

This implementation significantly improves data presentation capabilities across MOJO applications while maintaining the framework's core principles of simplicity and convention over configuration.