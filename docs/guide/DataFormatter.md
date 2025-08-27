# DataFormatter User Guide

The **DataFormatter** is MOJO's powerful, centralized utility for formatting and transforming data consistently across your application. It provides a clean, chainable API for common formatting tasks like dates, numbers, currency, and more.

## Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Built-in Formatters](#built-in-formatters)
- [Pipe Syntax](#pipe-syntax)
- [Custom Formatters](#custom-formatters)
- [Integration Patterns](#integration-patterns)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

### Key Features

- **🎯 Consistent API** - Single interface for all formatting needs
- **🔗 Chainable** - Combine multiple formatters with pipe syntax
- **🛡️ Error Safe** - Graceful handling of invalid input
- **🔌 Extensible** - Easy to add custom formatters
- **📦 Singleton** - Pre-configured instance ready to use
- **💾 Performance** - Efficient caching and processing

### Architecture

```js
// Singleton instance (recommended)
import dataFormatter from '../utils/DataFormatter.js';

// Or import the class if needed
import { DataFormatter } from '../utils/DataFormatter.js';
```

## Basic Usage

### Simple Formatting

```js
import dataFormatter from '../utils/DataFormatter.js';

// Format a date
const formatted = dataFormatter.apply('date', '2024-01-15', 'MMM DD, YYYY');
// Result: "Jan 15, 2024"

// Format currency
const price = dataFormatter.apply('currency', 1234.56, '$', 2);
// Result: "$1,234.56"

// Format percentage
const rate = dataFormatter.apply('percent', 0.1234, 1);
// Result: "12.3%"
```

### Pipe Syntax (Recommended)

```js
// Chain multiple formatters
const result = dataFormatter.pipe(1234.56, 'currency($,2)|uppercase');
// Result: "$1,234.56" (then uppercased if applicable)

// Complex formatting chain
const processed = dataFormatter.pipe(
    'john.doe@example.com', 
    'email|badge(primary)'
);
// Result: Email link with primary badge styling
```

## Built-in Formatters

### Date & Time Formatters

#### `date(value, format)`
Formats dates with customizable patterns.

```js
const date = '2024-01-15';

dataFormatter.apply('date', date, 'MM/DD/YYYY');     // "01/15/2024"
dataFormatter.apply('date', date, 'MMM DD, YYYY');   // "Jan 15, 2024"
dataFormatter.apply('date', date, 'dddd, MMMM D');   // "Monday, January 15"
dataFormatter.apply('date', date, 'YYYY-MM-DD');     // "2024-01-15"
```

**Format Tokens:**
- `YYYY` - 4-digit year (2024)
- `YY` - 2-digit year (24)
- `MMMM` - Full month (January)
- `MMM` - Short month (Jan)
- `MM` - Zero-padded month (01)
- `M` - Month number (1)
- `dddd` - Full weekday (Monday)
- `ddd` - Short weekday (Mon)
- `DD` - Zero-padded day (01)
- `D` - Day number (1)

#### `time(value, format)`
Formats time values.

```js
const time = '14:30:00';

dataFormatter.apply('time', time, 'HH:mm');          // "14:30"
dataFormatter.apply('time', time, 'h:mm A');         // "2:30 PM"
dataFormatter.apply('time', time, 'HH:mm:ss');       // "14:30:00"
```

#### `datetime(value, format)`
Combines date and time formatting.

```js
const datetime = '2024-01-15T14:30:00Z';

dataFormatter.apply('datetime', datetime, 'MMM DD, YYYY h:mm A');
// Result: "Jan 15, 2024 2:30 PM"
```

#### `relative(value, options)`
Human-friendly relative time.

```js
const now = new Date();
const yesterday = new Date(now - 24 * 60 * 60 * 1000);

dataFormatter.apply('relative', yesterday);           // "1 day ago"
dataFormatter.apply('fromNow', yesterday);            // Alias for relative
```

#### `iso(value)`
ISO 8601 format.

```js
dataFormatter.apply('iso', new Date());               // "2024-01-15T14:30:00.000Z"
```

### Number Formatters

#### `number(value, decimals, locale)`
General number formatting with locale support.

```js
dataFormatter.apply('number', 1234.5678, 2);         // "1,234.57"
dataFormatter.apply('number', 1234.5678, 0);         // "1,235"
dataFormatter.apply('number', 1234.5678, 2, 'de-DE'); // "1.234,57"
```

#### `currency(value, symbol, decimals)`
Currency formatting.

```js
dataFormatter.apply('currency', 1234.56);            // "$1,234.56"
dataFormatter.apply('currency', 1234.56, '€');       // "€1,234.56"
dataFormatter.apply('currency', 1234.56, '$', 0);    // "$1,235"
```

#### `percent(value, decimals)`
Percentage formatting.

```js
dataFormatter.apply('percent', 0.1234);              // "12.34%"
dataFormatter.apply('percent', 0.1234, 1);           // "12.3%"
dataFormatter.apply('percent', 1.234);               // "123.40%" (handles >1 values)
```

#### `filesize(value, unit)`
File size formatting.

```js
dataFormatter.apply('filesize', 1024);               // "1.00 KB"
dataFormatter.apply('filesize', 1048576);            // "1.00 MB"
dataFormatter.apply('filesize', 1048576, 'binary');  // Uses binary units (1024)
```

#### `ordinal(value)`
Ordinal numbers (1st, 2nd, 3rd, etc.).

```js
dataFormatter.apply('ordinal', 1);                   // "1st"
dataFormatter.apply('ordinal', 22);                  // "22nd"
dataFormatter.apply('ordinal', 103);                 // "103rd"
```

#### `compact(value, locale)`
Compact number notation.

```js
dataFormatter.apply('compact', 1234567);             // "1.2M"
dataFormatter.apply('compact', 1234);                // "1.2K"
dataFormatter.apply('compact', 12345678901);         // "12B"
```

### String Formatters

#### Text Transformation

```js
dataFormatter.apply('uppercase', 'hello world');     // "HELLO WORLD"
dataFormatter.apply('lowercase', 'HELLO WORLD');     // "hello world"
dataFormatter.apply('capitalize', 'hello world');    // "Hello World"
```

#### `truncate(value, length, suffix)`
Truncate long text.

```js
dataFormatter.apply('truncate', 'This is a long text', 10);
// Result: "This is a..."

dataFormatter.apply('truncate', 'Short', 10);        // "Short" (unchanged)
```

#### `slug(value)`
URL-friendly slugs.

```js
dataFormatter.apply('slug', 'Hello World!');         // "hello-world"
dataFormatter.apply('slug', 'Special @#$ Characters'); // "special-characters"
```

#### `initials(value)`
Extract initials from names.

```js
dataFormatter.apply('initials', 'John Doe');         // "JD"
dataFormatter.apply('initials', 'Mary Jane Watson');  // "MJW"
```

#### `mask(value, pattern)`
Mask sensitive data.

```js
dataFormatter.apply('mask', '1234567890', '***-***-****');
// Result: "123-456-7890" (if pattern allows) or masked version
```

### Text & Content Formatters

#### `plural(count, singular, plural, includeCount)`
Format pluralization based on count.

```js
dataFormatter.apply('plural', 1, 'item');           // "1 item"
dataFormatter.apply('plural', 5, 'item');           // "5 items"
dataFormatter.apply('plural', 2, 'child', 'children'); // "2 children"
dataFormatter.apply('plural', 1, 'item', null, false); // "item"
```

#### `list(array, options)`
Format arrays as human-readable lists.

```js
dataFormatter.apply('list', ['Apple', 'Banana', 'Orange']);
// "Apple, Banana, and Orange"

dataFormatter.apply('list', ['A', 'B'], { conjunction: 'or' });
// "A or B"

dataFormatter.apply('list', ['A', 'B', 'C', 'D'], { limit: 2 });
// "A, B, and 2 others"
```

#### `duration(milliseconds, options)`
Format durations in human-readable format.

```js
dataFormatter.apply('duration', 7230000);           // "2 hours 30 seconds"
dataFormatter.apply('duration', 3661000, { short: true }); // "1h1m1s"
dataFormatter.apply('duration', 90000, { precision: 1 }); // "1 minute"
```

#### `hash(value, length, prefix, suffix)`
Format long strings/IDs with truncation.

```js
dataFormatter.apply('hash', 'abc123def456ghi789', 8); // "abc123de..."
dataFormatter.apply('hash', 'user-12345', 6, '#', ''); // "#user-1"
dataFormatter.apply('hash', 'short');                // "short"
```

#### `stripHtml(html)`
Strip HTML tags from text.

```js
dataFormatter.apply('stripHtml', '<p>Hello <b>World</b></p>'); // "Hello World"
dataFormatter.apply('stripHtml', 'Plain text');      // "Plain text"
```

#### `highlight(text, searchTerm, className)`
Highlight search terms in text.

```js
dataFormatter.apply('highlight', 'Hello World', 'World');
// "Hello <mark class="highlight">World</mark>"

dataFormatter.apply('highlight', 'JavaScript is fun', 'script', 'search-hit');
// "Java<mark class="search-hit">Script</mark> is fun"
```

### HTML & Web Formatters

#### `email(value)`
Format email as clickable link.

```js
dataFormatter.apply('email', 'user@example.com');
// Result: '<a href="mailto:user@example.com">user@example.com</a>'
```

#### `phone(value)`
Format phone numbers.

```js
dataFormatter.apply('phone', '1234567890');          // "(123) 456-7890"
dataFormatter.apply('phone', '+1234567890');         // "+1 (234) 567-890"
```

#### `url(value, text)`
Format URLs as clickable links.

```js
dataFormatter.apply('url', 'https://example.com');
// Result: '<a href="https://example.com" target="_blank">https://example.com</a>'

dataFormatter.apply('url', 'https://example.com', 'Visit Site');
// Result: '<a href="https://example.com" target="_blank">Visit Site</a>'
```

#### `badge(value, type, className)`
Bootstrap badge formatting.

```js
dataFormatter.apply('badge', 'Active');              // Default badge
dataFormatter.apply('badge', 'Success', 'success');  // Green badge
dataFormatter.apply('badge', 'Error', 'danger');     // Red badge
```

#### `status(value, config)`
Status indicators with colors and icons.

```js
const status = dataFormatter.apply('status', 'active');
// Result: Badge with appropriate color and icon based on status
```

#### `boolean(value, trueText, falseText)`
Boolean formatting.

```js
dataFormatter.apply('boolean', true);                // "true"
dataFormatter.apply('boolean', true, 'Yes', 'No');   // "Yes"
dataFormatter.apply('yesno', false);                 // "No" (built-in alias)
```

#### `icon(value, className)`
Bootstrap icon formatting.

```js
dataFormatter.apply('icon', 'home');                 // '<i class="bi bi-home"></i>'
dataFormatter.apply('icon', 'user', 'text-primary'); // Colored icon
```

#### `avatar(value, size, className)`
Avatar/profile image formatting.

```js
dataFormatter.apply('avatar', 'path/to/image.jpg');
dataFormatter.apply('avatar', 'John Doe', 40);       // Generates initials avatar
```

### Utility Formatters

#### `default(value, defaultValue)`
Provide fallback values.

```js
dataFormatter.apply('default', null, 'N/A');         // "N/A"
dataFormatter.apply('default', '', 'Empty');         // "Empty"
dataFormatter.apply('default', 'Valid', 'N/A');      // "Valid"
```

#### `json(value, indent)`
JSON formatting.

```js
const obj = { name: 'John', age: 30 };
dataFormatter.apply('json', obj);                    // Compact JSON
dataFormatter.apply('json', obj, 2);                 // Pretty-printed
```

#### `raw(value)`
Pass-through (no formatting).

```js
dataFormatter.apply('raw', '<b>HTML</b>');           // "<b>HTML</b>" (unchanged)
```

## Pipe Syntax

### Basic Pipes

The pipe syntax allows chaining multiple formatters:

```js
// Single pipe
dataFormatter.pipe(1234.56, 'currency');            // "$1,234.56"

// Multiple pipes
dataFormatter.pipe('john doe', 'capitalize|truncate(10)');
// Result: "John Doe"

// Complex chain
dataFormatter.pipe(
    new Date(), 
    'date(MMM DD, YYYY)|uppercase|default(No Date)'
);
```

### Pipe with Parameters

```js
// Parameters in parentheses
dataFormatter.pipe(1234.56, 'currency($,0)');       // "$1,235"

// Multiple parameters
dataFormatter.pipe('Long text here', 'truncate(10,...)'); // "Long text..."

// String parameters (quoted)
dataFormatter.pipe(0.1234, "percent(1)");           // "12.3%"
```

### Common Pipe Patterns

```js
// Safe formatting with defaults
const safeFormat = (value, pipe) => 
    dataFormatter.pipe(value, `${pipe}|default(N/A)`);

// Currency with fallback
safeFormat(null, 'currency');                       // "N/A"
safeFormat(100, 'currency');                        // "$100.00"

// Date with relative fallback
dataFormatter.pipe(date, 'date(MMM DD)|default(relative)');
```

## Custom Formatters

### Register Custom Formatters

```js
// Simple formatter
dataFormatter.register('reverse', (value) => {
    return String(value).split('').reverse().join('');
});

// Formatter with parameters
dataFormatter.register('repeat', (value, times = 2, separator = ' ') => {
    return Array(times).fill(value).join(separator);
});

// Usage
dataFormatter.apply('reverse', 'hello');             // "olleh"
dataFormatter.apply('repeat', 'Hi', 3, '-');         // "Hi-Hi-Hi"
```

### Complex Custom Formatters

```js
// Status formatter with custom logic
dataFormatter.register('taskStatus', (value, showIcon = true) => {
    const statuses = {
        'pending': { color: 'warning', icon: 'clock', text: 'Pending' },
        'complete': { color: 'success', icon: 'check-circle', text: 'Complete' },
        'failed': { color: 'danger', icon: 'x-circle', text: 'Failed' }
    };
    
    const status = statuses[value] || statuses['pending'];
    const icon = showIcon ? `<i class="bi bi-${status.icon}"></i> ` : '';
    
    return `<span class="badge bg-${status.color}">${icon}${status.text}</span>`;
});

// Usage
dataFormatter.apply('taskStatus', 'complete');       // Badge with icon
dataFormatter.apply('taskStatus', 'pending', false); // Badge without icon
```

## Integration Patterns

### In Templates (Mustache)

```html
<!-- Simple formatting -->
<p>Price: {{price|currency}}</p>
<p>Date: {{date|date(MMM DD, YYYY)}}</p>

<!-- With defaults -->
<p>Status: {{status|badge|default(Unknown)}}</p>

<!-- Complex chains -->
<p>Email: {{email|email|default(No email provided)}}</p>
```

### In Views

```js
class MyView extends View {
    async onInit() {
        // Format data before rendering
        this.formattedPrice = dataFormatter.apply('currency', this.price);
        this.formattedDate = dataFormatter.apply('date', this.date, 'MMM DD');
    }
    
    // Method for dynamic formatting
    formatValue(value, formatter) {
        return dataFormatter.pipe(value, formatter);
    }
}
```

### In Charts (Correct Usage)

```js
// ❌ WRONG - Don't pass formatter strings to chart options
const chart = new SeriesChart({
    yAxis: { formatter: 'currency:USD' }  // This breaks the chart!
});

// ✅ CORRECT - Format data beforehand or use proper Chart.js callbacks
const chart = new SeriesChart({
    data: processedData,
    chartOptions: {
        scales: {
            y: {
                ticks: {
                    callback: function(value) {
                        return dataFormatter.apply('currency', value);
                    }
                }
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return dataFormatter.apply('currency', context.raw);
                    }
                }
            }
        }
    }
});
```

### In Data Processing

```js
// Format arrays of data
const formatData = (items, formatters) => {
    return items.map(item => {
        const formatted = {};
        Object.keys(formatters).forEach(key => {
            formatted[key] = dataFormatter.pipe(item[key], formatters[key]);
        });
        return { ...item, ...formatted };
    });
};

// Usage
const users = [
    { name: 'john doe', email: 'john@example.com', salary: 50000 }
];

const formatted = formatData(users, {
    name: 'capitalize',
    email: 'email',
    salary: 'currency'
});
```

## Best Practices

### 1. Use the Singleton Instance

```js
// ✅ Good - Use the singleton
import dataFormatter from '../utils/DataFormatter.js';

// ❌ Avoid - Creating new instances
import { DataFormatter } from '../utils/DataFormatter.js';
const formatter = new DataFormatter();
```

### 2. Handle Null/Undefined Values

```js
// ✅ Good - Use defaults for safety
dataFormatter.pipe(value, 'currency|default(N/A)');

// ✅ Good - Check before formatting
if (value != null) {
    formatted = dataFormatter.apply('currency', value);
}
```

### 3. Consistent Formatting Patterns

```js
// ✅ Good - Establish app-wide patterns
const APP_FORMATS = {
    money: 'currency($,2)',
    shortDate: 'date(MMM DD)',
    longDate: 'date(dddd, MMMM DD, YYYY)',
    percent: 'percent(1)'
};

// Use throughout the app
dataFormatter.pipe(value, APP_FORMATS.money);
```

### 4. Error Handling

```js
// ✅ Good - Formatters handle errors gracefully
const result = dataFormatter.apply('date', invalidDate);
// Returns original value if formatting fails

// ✅ Good - Add additional safety
const safeFormat = (value, formatter, fallback = 'N/A') => {
    try {
        const result = dataFormatter.pipe(value, formatter);
        return result || fallback;
    } catch (error) {
        console.warn('Formatting error:', error);
        return fallback;
    }
};
```

### 5. Performance Considerations

```js
// ✅ Good - Format once, use many times
const formattedData = data.map(item => ({
    ...item,
    formattedPrice: dataFormatter.apply('currency', item.price),
    formattedDate: dataFormatter.apply('date', item.date, 'MMM DD')
}));

// ❌ Avoid - Formatting in render loops
// Don't format the same value repeatedly
```

## Troubleshooting

### Common Issues

#### Issue: "Formatter 'xyz' not found"

```js
// Check available formatters
console.log(dataFormatter.list());

// Register missing formatter
dataFormatter.register('xyz', (value) => /* custom logic */);
```

#### Issue: Charts not displaying data

```js
// ❌ Wrong - Don't use formatter strings in chart config
xAxis: { formatter: 'category' }

// ✅ Correct - Use Chart.js callbacks
chartOptions: {
    scales: {
        x: {
            type: 'category'  // Chart.js native option
        }
    }
}
```

#### Issue: Pipe syntax not working

```js
// ✅ Check syntax
dataFormatter.pipe(value, 'formatter1|formatter2(param)');

// Common syntax errors:
// - Missing quotes around strings: 'truncate(Hello)' ❌ vs 'truncate("Hello")' ✅
// - Wrong parameter separators: 'currency($;2)' ❌ vs 'currency($,2)' ✅
```

#### Issue: Template formatting not working

```html
<!-- ✅ Make sure pipe filter is enabled in template engine -->
<p>{{value|currency}}</p>

<!-- If not working, format in the view: -->
<!-- View: this.formattedValue = dataFormatter.apply('currency', value) -->
<p>{{formattedValue}}</p>
```

### Debugging

```js
// Enable debug mode (if available)
dataFormatter.debug = true;

// Test formatters in console
console.log(dataFormatter.apply('currency', 1234.56));
console.log(dataFormatter.pipe(1234.56, 'currency($,0)|uppercase'));

// List all available formatters
console.table(dataFormatter.list());
```

### Performance Monitoring

```js
// Monitor formatter performance
const startTime = performance.now();
const result = dataFormatter.pipe(largeDataSet, 'complexFormatter');
const endTime = performance.now();
console.log(`Formatting took ${endTime - startTime} milliseconds`);
```

---

## Summary

The DataFormatter provides a robust, consistent way to format data throughout your MOJO application. Key takeaways:

1. **Use the singleton instance** for consistency
2. **Leverage pipe syntax** for readable, chainable formatting
3. **Always provide defaults** for user-facing data
4. **Format data in views**, not in chart configurations
5. **Register custom formatters** for app-specific needs
6. **Handle errors gracefully** with fallbacks

The formatter is designed to be safe, fast, and extensible - making it perfect for everything from simple text transformation to complex data presentation in dashboards and reports.