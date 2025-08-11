# Unified Data Access with Pipes

**Version:** 2.1.0  
**Date:** January 2025  
**Status:** Implemented  
**Framework Version:** MOJO 2.1.0

## Executive Summary

MOJO Framework now features a unified data access pattern that provides consistent data retrieval and formatting across all contexts - JavaScript code, Mustache templates, and nested data structures. This powerful system enables pipe-based formatting anywhere data is accessed, creating a seamless developer experience.

## Key Features

- **Universal Access Pattern**: Single `get()` method for all data access
- **Pipe Formatting Everywhere**: Apply formatters using pipe syntax in any context
- **Automatic Wrapping**: Plain objects and arrays automatically support pipes
- **Template Integration**: Pipes work seamlessly in Mustache templates
- **Nested Access**: Deep property navigation with dot notation
- **Method Calls**: Automatic function invocation with pipe support
- **No Double Processing**: Clean architecture with single data flow

## Architecture Overview

```
Template/Code → get() → MOJOUtils.getContextData() → DataFormatter
                              ↓
                        Value + Formatting
```

### Core Components

1. **MOJOUtils**: Central utility providing unified data access
2. **DataWrapper**: Wrapper for plain objects to provide `get()` method
3. **Model.get()**: Simplified to use MOJOUtils
4. **View.get()**: Enhanced with automatic wrapping
5. **Mustache Integration**: Direct support for pipes in templates

## Usage Examples

### Basic Data Access

```javascript
// Model access with pipes
model.get('name')                    // "john doe"
model.get('name|uppercase')          // "JOHN DOE"
model.get('price|currency')          // "$99.99"
model.get('created|date("MMM YYYY")') // "Jan 2024"

// View access with namespaces
view.get('data.title')                // "dashboard"
view.get('data.title|capitalize')     // "Dashboard"
view.get('model.name|uppercase')      // "JOHN DOE"
view.get('getStatus|uppercase')       // "ACTIVE"
```

### Template Usage

```handlebars
<!-- Direct properties with pipes -->
<h1>{{data.title|uppercase}}</h1>
<p>Price: {{model.price|currency}}</p>
<p>Date: {{model.created|date("MMMM DD, YYYY")}}</p>

<!-- Method calls with pipes -->
<p>Status: {{getStatus|uppercase}}</p>
<button class="{{getButtonClass}}">{{getButtonText|capitalize}}</button>

<!-- Nested data with pipes -->
<p>City: {{data.user.address.city|uppercase}}</p>
<p>First Item: {{data.items.0.name|capitalize}}</p>

<!-- Array iteration with pipes -->
{{#data.items}}
  <li>{{name|capitalize}}: {{price|currency}}</li>
{{/data.items}}
```

### JavaScript Usage

```javascript
// Direct model access
const model = new Model({
  name: 'john doe',
  price: 99.99,
  created: new Date('2024-01-15')
});

console.log(model.get('name|uppercase'));        // "JOHN DOE"
console.log(model.get('price|currency'));        // "$99.99"
console.log(model.get('created|date("MMM DD")')); // "Jan 15"

// View with nested data
const view = new View({
  data: {
    title: 'dashboard',
    items: [
      { name: 'product one', price: 29.99 },
      { name: 'product two', price: 39.99 }
    ]
  }
});

// Access nested properties with pipes
console.log(view.get('data.title|uppercase'));           // "DASHBOARD"
console.log(view.get('data.items.0.name|capitalize'));   // "Product One"
console.log(view.get('data.items.0.price|currency'));    // "$29.99"
```

## Implementation Details

### MOJOUtils.getContextData()

The core function that powers unified data access:

```javascript
class MOJOUtils {
  /**
   * Get data from context with support for:
   * - Dot notation (e.g., "user.name")
   * - Pipe formatting (e.g., "name|uppercase")
   * - Combined (e.g., "user.name|uppercase|truncate(10)")
   */
  static getContextData(context, key) {
    // 1. Parse key for pipes
    const { field, pipes } = this.parseKey(key);
    
    // 2. Get raw value
    const value = this.getNestedValue(context, field);
    
    // 3. Apply pipes if present
    if (pipes) {
      return dataFormatter.pipe(value, pipes);
    }
    
    return value;
  }
  
  static getNestedValue(context, path) {
    // IMPORTANT: Never calls get() on top-level context (avoids recursion)
    // But DOES call get() on nested objects (enables chaining)
    
    if (!path.includes('.')) {
      // Direct property or method
      if (path in context) {
        const value = context[path];
        return typeof value === 'function' ? value.call(context) : value;
      }
      return undefined;
    }
    
    // Handle dot notation with nested get() support
    // ...
  }
}
```

### Model Integration

```javascript
class Model {
  get(key) {
    // Check for instance properties (id, endpoint, etc.)
    if (!key.includes('.') && !key.includes('|') && this.hasOwnProperty(key)) {
      return this[key];
    }
    
    // Use MOJOUtils for all attribute access with pipes and dot notation
    return MOJOUtils.getContextData(this.attributes, key);
  }
}
```

### View Integration

```javascript
class View {
  get(path) {
    // Special handling for data namespace to ensure pipe support
    if (path === 'data' && this.data) {
      return MOJOUtils.wrapData(this.data, this);
    }
    
    // Special handling for model namespace
    if (path === 'model' && this.model) {
      return this.model;
    }
    
    // Get the value normally
    const value = MOJOUtils.getContextData(this, path);
    
    // Wrap objects/arrays from data or model namespaces
    if (path && (path.startsWith('data.') || path.startsWith('model.')) 
        && value && typeof value === 'object' && !value.get) {
      return MOJOUtils.wrapData(value, this);
    }
    
    return value;
  }
}
```

### DataWrapper for Plain Objects

```javascript
class DataWrapper {
  constructor(data, rootContext = null) {
    this._data = data;
    this._rootContext = rootContext;
    
    // Copy properties for direct access
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        this[key] = MOJOUtils.wrapData(data[key], rootContext);
      }
    }
  }
  
  get(key) {
    // Provides pipe support for plain objects
    return MOJOUtils.getContextData(this._data, key);
  }
}
```

### Array Wrapping

Arrays are wrapped to ensure each element supports pipes:

```javascript
static wrapData(data, rootContext = null) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Don't wrap if already has get method
  if (typeof data.get === 'function') {
    return data;
  }
  
  // Handle arrays - wrap each element
  if (Array.isArray(data)) {
    return data.map(item => {
      if (item && typeof item === 'object' && !item.get) {
        return new DataWrapper(item, rootContext);
      }
      return item;
    });
  }
  
  // Use DataWrapper for objects
  return new DataWrapper(data, rootContext);
}
```

## Namespace Reference

### Data Namespace

Access view's data object:

```javascript
view.get('data')                    // Returns wrapped data object
view.get('data.title')              // Direct property
view.get('data.user.name')          // Nested property
view.get('data.items.0.name')       // Array element
view.get('data.price|currency')     // With formatting
```

### Model Namespace

Access view's model:

```javascript
view.get('model')                    // Returns model instance
view.get('model.name')               // Model attribute
view.get('model.user.email')         // Nested model attribute
view.get('model.created|date')       // With formatting
```

### Direct Properties

Access view properties and methods:

```javascript
view.get('id')                       // View property
view.get('getStatus')                // Method (auto-called)
view.get('getTotal|currency')        // Method result with formatting
```

## Pipe Formatting

### Available Formatters

All DataFormatter formatters are available via pipes:

#### String Formatters
- `uppercase` - Convert to uppercase
- `lowercase` - Convert to lowercase
- `capitalize` - Capitalize first letter
- `truncate(length)` - Truncate with ellipsis
- `slug` - Convert to URL slug

#### Number Formatters
- `currency` - Format as currency ($99.99)
- `percent` - Format as percentage
- `number(decimals)` - Format with decimals
- `compact` - Compact notation (1.2K)

#### Date Formatters
- `date(format)` - Format date
- `time(format)` - Format time
- `relative` - Relative time (2 hours ago)

#### Utility Formatters
- `default(value)` - Default value if empty
- `json` - JSON stringify
- `yesno` - Convert boolean to Yes/No

### Chaining Pipes

Multiple formatters can be chained:

```javascript
// Chain multiple formatters
view.get('data.text|uppercase|truncate(20)')
view.get('model.price|currency|default("Free")')
view.get('data.created|date("YYYY")|default("Unknown")')
```

## Migration Guide

### Before (Multiple Patterns)

```javascript
// Old Model access
model.attributes.name
model.getAttribute('name')

// Old View access
view.data.title
view.state.active
view.model.attributes.name

// Old formatting
const formatted = dataFormatter.apply('currency', model.attributes.price);

// Old template
<h1>{{title}}</h1>  <!-- No formatting -->
```

### After (Unified Pattern)

```javascript
// New Model access
model.get('name')
model.get('name|uppercase')

// New View access
view.get('data.title')
view.get('state.active')
view.get('model.name')

// New formatting (integrated)
model.get('price|currency')

// New template
<h1>{{data.title|uppercase}}</h1>  <!-- With formatting -->
```

## Performance Considerations

1. **Single Processing**: Pipes are processed once at the data access point
2. **Lazy Wrapping**: Objects are wrapped only when accessed
3. **Cached Lookups**: Mustache caches context lookups
4. **Efficient Parsing**: Pipe strings are parsed once per access

## Best Practices

### 1. Use Consistent Namespaces

```javascript
// Good - clear namespace
view.get('data.title')
view.get('model.name')

// Avoid - ambiguous
view.get('title')  // Is this view.title or data.title?
```

### 2. Apply Formatting at Display

```javascript
// Good - format at display
<p>{{model.price|currency}}</p>

// Avoid - storing formatted values
model.set('displayPrice', '$99.99')
```

### 3. Chain Pipes Logically

```javascript
// Good - logical order
view.get('data.text|trim|uppercase|truncate(20)')

// Avoid - illogical order
view.get('data.text|truncate(20)|trim')  // Trim after truncate?
```

### 4. Use Methods for Complex Logic

```javascript
// Good - complex logic in method
class MyView extends View {
  getFormattedTotal() {
    const subtotal = this.calculateSubtotal();
    const tax = this.calculateTax();
    return subtotal + tax;
  }
}
// Template: {{getFormattedTotal|currency}}

// Avoid - complex logic in template
// {{data.price * data.quantity * 1.08|currency}}  // Not supported
```

## Testing

### Unit Tests

```javascript
describe('Unified Data Access', () => {
  test('Model.get with pipes', () => {
    const model = new Model({ name: 'john', price: 99.99 });
    expect(model.get('name|uppercase')).toBe('JOHN');
    expect(model.get('price|currency')).toBe('$99.99');
  });
  
  test('View.get with namespaces', () => {
    const view = new View({ data: { title: 'test' } });
    expect(view.get('data.title')).toBe('test');
    expect(view.get('data.title|uppercase')).toBe('TEST');
  });
  
  test('Nested array access with pipes', () => {
    const view = new View({
      data: {
        items: [{ name: 'item one', price: 10 }]
      }
    });
    expect(view.get('data.items.0.name|capitalize')).toBe('Item One');
    expect(view.get('data.items.0.price|currency')).toBe('$10.00');
  });
});
```

### Integration Tests

```javascript
describe('Template Integration', () => {
  test('Pipes in Mustache templates', () => {
    const view = new View({
      data: { title: 'hello world' },
      template: '<h1>{{data.title|uppercase}}</h1>'
    });
    
    const result = await view.render();
    expect(result).toContain('<h1>HELLO WORLD</h1>');
  });
  
  test('Pipes in array iteration', () => {
    const template = `
      {{#data.items}}
        <li>{{name|capitalize}}: {{price|currency}}</li>
      {{/data.items}}
    `;
    
    const view = new View({
      data: {
        items: [
          { name: 'product one', price: 29.99 }
        ]
      },
      template
    });
    
    const result = await view.render();
    expect(result).toContain('Product One: $29.99');
  });
});
```

## API Reference

### MOJOUtils

```javascript
class MOJOUtils {
  // Get data with pipe support
  static getContextData(context: object, key: string): any
  
  // Get nested value without pipes
  static getNestedValue(context: object, path: string): any
  
  // Wrap data to provide get() method
  static wrapData(data: any, rootContext?: object): any
}
```

### Model.get()

```javascript
class Model {
  // Get attribute with optional pipes
  get(key: string): any
  // Examples:
  // model.get('name')
  // model.get('name|uppercase')
  // model.get('user.email|lowercase')
}
```

### View.get()

```javascript
class View {
  // Get value with namespace and pipe support
  get(path: string): any
  // Examples:
  // view.get('data.title')
  // view.get('model.name|capitalize')
  // view.get('getStatus|uppercase')
}
```

### DataWrapper

```javascript
class DataWrapper {
  constructor(data: object, rootContext?: object)
  
  // Get value with pipe support
  get(key: string): any
  
  // Check if property exists
  has(key: string): boolean
  
  // Get raw data
  toJSON(): object
}
```

## Troubleshooting

### Common Issues

#### 1. Pipes Not Working in Templates

**Problem**: `{{model.name|uppercase}}` shows literal text

**Solution**: Ensure View is using the updated render method that preserves context:
```javascript
async renderTemplate() {
  const templateContent = await this.getTemplate();
  // Pass view itself as context - Mustache will use view.get()
  return Mustache.render(templateContent, this, partials);
}
```

#### 2. Method Not Found

**Problem**: `view.get('getStatus')` returns undefined

**Solution**: Methods must be defined on the class prototype:
```javascript
class MyView extends View {
  getStatus() {  // Correct - on prototype
    return 'active';
  }
}

// Not: this.getStatus = () => 'active';  // Wrong - instance property
```

#### 3. Array Items Missing Pipes

**Problem**: `{{#items}}{{name|uppercase}}{{/items}}` shows undefined

**Solution**: Ensure arrays are accessed through a namespace that triggers wrapping:
```javascript
// Good - triggers wrapping
{{#data.items}}{{name|uppercase}}{{/data.items}}

// Bad - no wrapping
{{#items}}{{name|uppercase}}{{/items}}
```

## Future Enhancements

1. **Async Pipes**: Support for async formatters
2. **Computed Properties**: Cached computed values with pipes
3. **Custom Pipes per View**: View-specific formatter registration
4. **Pipe Validation**: Development-time pipe validation
5. **Performance Monitoring**: Track pipe processing performance
6. **Type Safety**: TypeScript definitions for pipes

## Conclusion

The unified data access pattern with pipes represents a significant advancement in the MOJO Framework. By providing a single, consistent way to access and format data across all contexts, it dramatically simplifies development while adding powerful formatting capabilities.

Key benefits:
- **Consistency**: One pattern for all data access
- **Power**: Pipes available everywhere
- **Simplicity**: Clean, intuitive syntax
- **Flexibility**: Works with any data structure
- **Performance**: Single-pass processing

This implementation maintains MOJO's core principles of simplicity and convention over configuration while providing enterprise-grade data handling capabilities.