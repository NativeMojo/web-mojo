# DataFormatter User Guide

The **DataFormatter** is MOJO's powerful, centralized utility for formatting and transforming data consistently across your application. It provides a clean, chainable API for common formatting tasks like dates, numbers, currency, and more.

## Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Pipe Syntax](#pipe-syntax)
- [Built-in Formatters](#built-in-formatters)
  - [Date & Time](#date--time-formatters)
  - [Numbers](#number-formatters)
  - [Strings](#string-formatters)
  - [HTML & Web](#html--web-formatters)
  - [Utility](#utility-formatters)
  - [Text & Content](#text--content-formatters)
- [Custom Formatters](#custom-formatters)
- [Integration Patterns](#integration-patterns)
- [Best Practices](#best-practices)

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

// Format currency (from cents)
const price = dataFormatter.apply('currency', 123456, '$', 2);
// Result: "$1,234.56"

// Format percentage
const rate = dataFormatter.apply('percent', 0.1234, 1);
// Result: "12.3%"
```

## Pipe Syntax

The pipe syntax allows chaining multiple formatters. MOJO supports **two parameter styles**:

### Colon Style (Preferred) ⭐

```html
<!-- Single parameter -->
{{value|truncate:50}}

<!-- Multiple parameters -->
{{price|currency:'$':2}}

<!-- Complex parameters -->
{{active|yesnoicon:'bi bi-unlock-fill text-success':'bi bi-lock-fill text-danger'}}

<!-- Context variables -->
{{value|tooltip:model.description:'top'}}
```

### Parentheses Style (Legacy, Still Supported)

```html
<!-- Single parameter -->
{{value|truncate(50)}}

<!-- Multiple parameters -->
{{price|currency('$', 2)}}

<!-- Complex parameters -->
{{active|yesnoicon('bi bi-unlock-fill text-success', 'bi bi-lock-fill text-danger')}}
```

### Chaining Pipes

```html
<!-- Chain multiple formatters -->
{{email|lowercase|truncate:30|default:'No email'}}

<!-- Complex chain -->
{{created|epoch|datetime:'MMM DD, YYYY':'h:mm A'}}
```

### In JavaScript

```js
// Single formatter
dataFormatter.pipe(value, 'currency');

// Chained formatters
dataFormatter.pipe(value, 'lowercase|truncate:30|default:"N/A"');

// Complex formatting
dataFormatter.pipe(date, 'date:"MMM DD, YYYY"|uppercase');
```

## Built-in Formatters

### Date & Time Formatters

#### `date` - Format dates with custom patterns
```html
<!-- Template examples -->
{{created_at|date:'YYYY-MM-DD'}}           <!-- 2025-10-04 -->
{{created_at|date:'MMM DD, YYYY'}}         <!-- Oct 04, 2025 -->
{{created_at|date:'dddd, MMMM D'}}         <!-- Saturday, October 4 -->
```

**Format Tokens:** `YYYY` (year), `MM` (month), `DD` (day), `MMM` (short month), `MMMM` (full month), `ddd` (short weekday), `dddd` (full weekday)

#### `time` - Format time values
```html
{{timestamp|time:'HH:mm'}}                 <!-- 14:30 -->
{{timestamp|time:'h:mm A'}}                <!-- 2:30 PM -->
{{timestamp|time:'HH:mm:ss'}}              <!-- 14:30:45 -->
```

**Format Tokens:** `HH` (24h), `hh` (12h), `mm` (minutes), `ss` (seconds), `A` (AM/PM), `a` (am/pm)

#### `datetime` - Combined date and time
```html
{{created|datetime:'MM/DD/YYYY':'h:mm A'}} <!-- 10/04/2025 2:30 PM -->
{{created|datetime:'MMM DD':'HH:mm'}}      <!-- Oct 04 14:30 -->
```

#### `datetime_tz` - Date/time with timezone
```html
{{created|datetime_tz:'MM/DD/YYYY':'h:mm A':{timeZone:'America/New_York'}}}
<!-- 10/04/2025 2:30 PM EST -->
```

#### `relative` (alias: `fromNow`) - Relative time
```html
{{created|relative}}                        <!-- 2 hours ago -->
{{created|relative:true}}                   <!-- 2h ago (short format) -->
```

#### `relative_short` - Compact relative time
```html
{{created|relative_short}}                  <!-- 2h, 3d, now -->
```

#### `iso` - ISO 8601 format
```html
{{date|iso}}                                <!-- 2025-10-04T14:30:00.000Z -->
{{date|iso:true}}                           <!-- 2025-10-04 (date only) -->
```

#### `epoch` - Convert seconds to milliseconds
```html
{{timestamp|epoch|datetime}}                <!-- Converts epoch seconds to ms, then formats -->
```

---

### Number Formatters

#### `number` - Format numbers with locale
```html
{{value|number:2}}                          <!-- 1,234.57 -->
{{value|number:0}}                          <!-- 1,235 -->
{{value|number:2:'de-DE'}}                  <!-- 1.234,57 (German) -->
```

#### `currency` - Format cents as currency
```html
{{price_cents|currency}}                    <!-- $12.35 (from 1235 cents) -->
{{price_cents|currency:'€':2}}              <!-- €12.35 -->
{{price_cents|currency:'$':0}}              <!-- $12 -->
```
**Note:** Automatically divides by 100 to convert cents to dollars/euros.

#### `percent` - Format as percentage
```html
{{ratio|percent}}                           <!-- 12% (from 0.12) -->
{{ratio|percent:2}}                         <!-- 12.34% (from 0.1234) -->
{{ratio|percent:1:false}}                   <!-- 12.3 (no multiply by 100) -->
```

#### `filesize` - Format bytes as file size
```html
{{bytes|filesize}}                          <!-- 1.2 MB -->
{{bytes|filesize:true:1}}                   <!-- 1.2 MiB (binary units) -->
{{bytes|filesize:false:2}}                  <!-- 1.23 MB (2 decimals) -->
```

#### `ordinal` - Add ordinal suffix
```html
{{rank|ordinal}}                            <!-- 1st, 2nd, 3rd, 4th -->
{{rank|ordinal:true}}                       <!-- st, nd, rd, th (suffix only) -->
```

#### `compact` - Compact number notation
```html
{{views|compact}}                           <!-- 1.2K, 3.4M, 5.6B -->
{{views|compact:2}}                         <!-- 1.23K (2 decimals) -->
```

---

### String Formatters

#### `uppercase` / `upper` - Convert to uppercase
```html
{{name|uppercase}}                          <!-- HELLO WORLD -->
```

#### `lowercase` / `lower` - Convert to lowercase
```html
{{name|lowercase}}                          <!-- hello world -->
```

#### `capitalize` / `caps` - Capitalize words
```html
{{title|capitalize}}                        <!-- Hello World (all words) -->
{{title|capitalize:false}}                  <!-- Hello world (first letter only) -->
```

#### `truncate` - Truncate to length
```html
{{description|truncate:50}}                 <!-- Long text... (max 50 chars) -->
{{description|truncate:100:'…'}}            <!-- Long text… (custom suffix) -->
```

#### `truncate_middle` - Truncate in middle
```html
{{hash|truncate_middle:16}}                 <!-- abcd1234***xyz9876 (8+8 chars) -->
{{hash|truncate_middle:8:'...'}}            <!-- abcd...9876 (custom middle) -->
```

#### `slug` - Create URL-friendly slug
```html
{{title|slug}}                              <!-- hello-world -->
{{title|slug:'_'}}                          <!-- hello_world (custom separator) -->
```

#### `initials` - Extract initials
```html
{{name|initials}}                           <!-- JD (2 initials default) -->
{{name|initials:3}}                         <!-- JDS (3 initials) -->
```

#### `mask` - Mask sensitive data
```html
{{ssn|mask}}                                <!-- ******7890 (show last 4) -->
{{ssn|mask:'*':6}}                          <!-- ****567890 (show last 6) -->
{{password|mask:'•':0}}                     <!-- •••••••••• (mask all) -->
```

#### `hex` / `tohex` - Encode as hexadecimal
```html
{{value|hex}}                               <!-- 48656c6c6f -->
{{value|hex:true}}                          <!-- 48656C6C6F (uppercase) -->
{{value|hex:true:true}}                     <!-- 0x48656C6C6F (with prefix) -->
```

#### `unhex` / `fromhex` - Decode hexadecimal
```html
{{hex_value|unhex}}                         <!-- Hello (from 48656c6c6f) -->
```

---

### HTML & Web Formatters

#### `email` - Format as mailto link
```html
{{email|email}}                             
<!-- <a href="mailto:user@example.com">user@example.com</a> -->

{{email|email:{subject:'Hello'}}}
<!-- With subject parameter -->
```

#### `phone` - Format phone number
```html
{{phone|phone}}                             <!-- (123) 456-7890 -->
{{phone|phone:'US':true}}                   <!-- With tel: link -->
{{phone|phone:false}}                       <!-- (123) 456-7890 (no link) -->
```

#### `url` - Format as clickable link
```html
{{website|url}}                             
<!-- <a href="..." target="_blank">https://example.com</a> -->

{{website|url:'Visit Site'}}
<!-- <a href="..." target="_blank">Visit Site</a> -->

{{website|url:'Click Here':false}}
<!-- Same window (no target="_blank") -->
```

#### `badge` - Create Bootstrap badge
```html
{{status|badge}}                            <!-- Auto-detects color based on value -->
{{status|badge:'success'}}                  <!-- <span class="badge bg-success">Active</span> -->
{{tags|badge}}                              <!-- Works with arrays: multiple badges -->
```

**Auto-detected colors:**
- `success`: active, complete, done, success, approved, verified, enabled
- `danger`: error, failed, rejected, disabled, deleted, blocked
- `warning`: pending, warning, waiting, processing
- `info`: info, information, new

#### `badgeClass` - Get Bootstrap badge class (class only, no HTML)
```html
<!-- Basic usage: compute bg-* class and compose your own badge -->
<span class="badge {{status|badgeClass}}">{{status}}</span>
<!-- Auto-detects: bg-success, bg-warning, bg-danger, bg-info, etc. -->

<!-- Force a specific type (skips auto-detection) -->
<span class="badge {{role|badgeClass:'info'}}">{{role}}</span>
<!-- Yields: bg-info -->

<!-- In loops (e.g., tags array) -->
{{#tags}}
  <span class="badge {{.|badgeClass}}">{{.}}</span>
{{/tags}}

<!-- Combine with other classes -->
<span class="badge text-uppercase {{priority|badgeClass}}">{{priority}}</span>
```

#### `status` - Status with icon and color
```html
{{status|status}}                           
<!-- <span class="text-success"><i class="bi bi-check-circle-fill"></i> Active</span> -->
```

#### `status_text` - Status text only (no icon)
```html
{{status|status_text}}                      <!-- <span class="text-success">Active</span> -->
```

#### `status_icon` - Status icon only (no text)
```html
{{status|status_icon}}                      <!-- <i class="bi bi-check-circle-fill text-success"></i> -->
```

#### `boolean` / `bool` - Format boolean
```html
{{active|boolean}}                          <!-- True / False -->
{{active|boolean:'Yes':'No'}}               <!-- Yes / No -->
{{active|boolean:'Yes':'No':true}}          <!-- <span class="text-success">Yes</span> -->
```

#### `yesno` - Shorthand for Yes/No boolean
```html
{{active|yesno}}                            <!-- Yes / No -->
```

#### `yesnoicon` - Boolean as icon
```html
{{active|yesnoicon}}                        
<!-- <i class="bi bi-check-circle-fill text-success"></i> -->

{{active|yesnoicon:'bi bi-unlock-fill text-success':'bi bi-lock-fill text-danger'}}
<!-- Custom icons for true/false -->
```

#### `icon` - Map value to icon
```html
{{type|icon:{pdf:'bi-file-pdf',doc:'bi-file-word'}}}
<!-- <i class="bi-file-pdf"></i> -->
```

#### `avatar` - Create avatar image
```html
{{user.photo|avatar}}                       <!-- Default medium size -->
{{user.photo|avatar:'lg'}}                  <!-- Large avatar -->
{{user.photo|avatar:'sm':'rounded-circle':'User Name'}}
<!-- Size, classes, alt text -->
```

**Sizes:** `xs` (1.5rem), `sm` (2.5rem), `md` (3.5rem), `lg` (4rem), `xl` (5rem)

#### `image` - Create image with renditions
```html
{{photo|image}}                             <!-- Default thumbnail rendition -->
{{photo|image:'large':'img-fluid':'Alt text'}}
<!-- Rendition, classes, alt text -->
```

#### `tooltip` - Add Bootstrap tooltip
```html
{{value|tooltip:'Help text'}}               
<!-- Tooltip on top (default) -->

{{value|tooltip:model.description:'bottom'}}
<!-- Uses context variable for tooltip text -->

{{value|tooltip:'<b>HTML</b> text':'top':'html'}}
<!-- HTML tooltip -->
```

#### `clipboard` - Copy value with a clipboard button
```html
{{{model.phone_number|clipboard}}}
<!-- Renders the value with a small clipboard icon button; clicking copies the value to the clipboard -->

{{{secret|clipboard:'icon-only'}}}
<!-- Icon-only button (no inline text) -->
```

Notes:
- Returns HTML; use triple braces {{{...}}} in templates.
- The rendered button uses MOJO’s action system (data-action="copy-to-clipboard") and is handled automatically by views; no extra wiring needed.
- Uses Bootstrap Icons for the clipboard/check icons.

#### `linkify` - Convert URLs/emails in text to links
```html
{{{comment|linkify}}}                       
<!-- Turns http://, https://, www. and emails into links -->

{{{notes|linkify:{target:'_self', emails:false}}}}
<!-- Custom options (open in same tab, URLs only) -->
```

---


### Utility Formatters

#### `default` - Provide fallback value
```html
{{name|default:'N/A'}}                      <!-- Returns 'N/A' if name is null/undefined/'' -->
{{price|currency|default:'Free'}}           <!-- Chain with other formatters -->
```

#### `equals` - Conditional output based on equality
```html
<!-- CSS classes based on state -->
{{status|equals:1:'text-success':'text-secondary'}}
<!-- Output: 'text-success' if status === 1, otherwise 'text-secondary' -->

{{model.state|equals:'active':'badge-success':'badge-secondary'}}
<!-- Output: 'badge-success' if state === 'active', otherwise 'badge-secondary' -->

<!-- Text output -->
{{role|equals:'admin':'Administrator':'User'}}
<!-- Output: 'Administrator' if role === 'admin', otherwise 'User' -->

<!-- Numbers -->
{{count|equals:0:'No items':'Has items'}}
<!-- Output: 'No items' if count === 0, otherwise 'Has items' -->

<!-- Works with any type (uses loose equality) -->
{{value|equals:true:'Yes':'No'}}
{{id|equals:'123':'Match':'No match'}}

<!-- Common use cases -->
<span class="{{is_active|equals:true:'text-success':'text-danger'}}">
  {{is_active|equals:true:'Active':'Inactive'}}
</span>

<i class="bi {{priority|equals:1:'bi-star-fill text-warning':'bi-star'}}"></i>
```

#### `json` - Format as JSON
```html
{{data|json}}                               <!-- Compact JSON -->
{{data|json:4}}                             <!-- Pretty-printed with 4-space indent -->
```

#### `raw` - Pass through unchanged
```html
{{html|raw}}                                <!-- No escaping or formatting -->
```

#### `iter` - Convert to iterable array
```html
{{#object|iter}}
  {{key}}: {{value}}
{{/object|iter}}
<!-- Converts objects to [{key, value}, ...] for loops -->
```

#### `keys` - Extract object keys
```html
{{permissions|keys}}                        <!-- Array of keys -->
{{permissions|keys|badge}}                  <!-- Badge for each key -->
```

#### `values` - Extract object values
```html
{{data|values}}                             <!-- Array of values -->
```

#### `custom` - Apply a custom function
```js
// JavaScript usage only (templates cannot pass functions)
dataFormatter.apply('custom', value, (v) => v.toUpperCase());
```

---

### Text & Content Formatters

#### `plural` - Format pluralization
```html
{{count|plural:'item'}}                     <!-- 1 item, 5 items -->
{{count|plural:'child':'children'}}         <!-- 2 children (custom plural) -->
{{count|plural:'item':'items':false}}       <!-- items (without count) -->
```

#### `list` - Format array as list
```html
{{tags|list}}                               <!-- item1, item2, and item3 -->
{{tags|list:{conjunction:'or'}}}            <!-- item1, item2, or item3 -->
{{tags|list:{limit:2}}}                     <!-- item1, item2, and 3 others -->
```

#### `duration` - Format time duration
```html
{{milliseconds|duration}}                   <!-- 2 hours 30 minutes -->
{{milliseconds|duration:{short:true}}}      <!-- 2h30m -->
{{milliseconds|duration:{precision:1}}}     <!-- 2 hours (single unit) -->
```

#### `hash` - Truncate long IDs
```html
{{id|hash}}                                 <!-- abcd1234... (8 chars + ...) -->
{{id|hash:12:'#':''}}                       <!-- #abcd1234efgh (custom prefix, no suffix) -->
```

#### `stripHtml` - Remove HTML tags
```html
{{html|stripHtml}}                          <!-- Plain text only -->
```

#### `highlight` - Highlight search terms
```html
{{text|highlight:'search'}}                 
<!-- Text with <mark class="highlight">search</mark> highlighted -->

{{text|highlight:searchTerm:'custom-class'}}
<!-- Custom highlight class -->
```

#### `nl2br` - Convert newlines to line breaks
```html
{{{text|nl2br}}}                            
<!-- Converts \n to <br> and escapes HTML -->
```

#### `code` - Code block with optional language
```html
{{{model.output|code}}}                     
<!-- Renders a pre/code block with default styling -->

{{{model.output|code:'python'}}}
<!-- Adds class language-python for syntax highlighters -->
```

#### `pre` - Preformatted code block
```html
{{code|pre}}                                
<!-- <pre class="bg-light p-2 rounded border">code</pre> -->
```

---

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

// Usage in templates
{{text|reverse}}
{{text|repeat:3:'-'}}
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
```

---

## Integration Patterns

### In Templates (Mustache)

```html
<!-- DataView field formatters -->
<div class="data-view">
  {{#fields}}
    <div>
      <label>{{label}}</label>
      <div>{{value|format}}</div>
    </div>
  {{/fields}}
</div>

<!-- TableView column formatters -->
<table>
  {{#rows}}
    <tr>
      <td>{{created|date:'MMM DD, YYYY'}}</td>
      <td>{{amount|currency}}</td>
      <td>{{status|badge}}</td>
    </tr>
  {{/rows}}
</table>

<!-- Complex chains with defaults -->
<p>{{user.email|email|default:'No email provided'}}</p>
<p>{{user.phone|phone|default:'—'}}</p>
```

### In DataView

Both `format` and `formatter` properties are supported:

```js
const profileView = new DataView({
    model: this.model,
    fields: [
        { key: 'created', label: 'Created', format: 'datetime' },      // ✅ Works
        { key: 'email', label: 'Email', formatter: 'email' },          // ✅ Also works
        { key: 'amount', label: 'Amount', format: 'currency' },
        { key: 'status', label: 'Status', formatter: 'badge' }
    ]
});
```

### In TableView

Both `formatter` and `format` properties are supported:

```js
this.tableView = new TableView({
    collection: collection,
    columns: [
        { key: 'created', label: 'Date', formatter: 'datetime', sortable: true },  // ✅ Works
        { key: 'email', label: 'Email', format: 'email' },                         // ✅ Also works
        { key: 'amount', label: 'Amount', formatter: 'currency' },
        { key: 'status', label: 'Status', format: 'badge' }
    ]
});
```

### In Charts (Correct Usage)

```js
// ✅ CORRECT - Use Chart.js callbacks, not MOJO formatter strings
const chart = new SeriesChart({
    data: chartData,
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

// ❌ WRONG - Don't pass MOJO formatter strings to chart config
const chart = new SeriesChart({
    yAxis: { formatter: 'currency' }  // This breaks the chart!
});
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

---

## Best Practices

### 1. Use Colon Syntax in Templates

```html
<!-- ✅ Preferred - Cleaner, more readable -->
{{value|truncate:50}}
{{price|currency:'$':2}}

<!-- ✅ Still supported - Legacy style -->
{{value|truncate(50)}}
{{price|currency('$', 2)}}
```

### 2. Use the Singleton Instance

```js
// ✅ Good - Use the singleton
import dataFormatter from '../utils/DataFormatter.js';

// ❌ Avoid - Creating new instances
import { DataFormatter } from '../utils/DataFormatter.js';
const formatter = new DataFormatter();
```

### 3. Handle Null/Undefined Values

```html
<!-- ✅ Good - Use defaults for safety -->
{{value|currency|default:'N/A'}}
{{name|default:'Unknown'}}
```

### 4. Consistent Formatting Patterns

```js
// ✅ Good - Establish app-wide patterns
const APP_FORMATS = {
    money: 'currency',
    shortDate: 'date:"MMM DD"',
    longDate: 'date:"dddd, MMMM DD, YYYY"',
    percent: 'percent:1'
};

// Use throughout the app
dataFormatter.pipe(value, APP_FORMATS.money);
```

### 5. Format Data Once

```js
// ✅ Good - Format once, use many times
async onInit() {
    this.formattedData = this.data.map(item => ({
        ...item,
        displayPrice: dataFormatter.apply('currency', item.price),
        displayDate: dataFormatter.apply('date', item.date, 'MMM DD')
    }));
}

// ❌ Avoid - Formatting in render loops repeatedly
```

### 6. Use Both `format` and `formatter`

Both properties are supported in DataView and TableView for consistency:

```js
// ✅ Both work - use whichever you prefer
{ key: 'created', format: 'datetime' }
{ key: 'created', formatter: 'datetime' }
```

---

## Complete Formatter Reference

### Quick Reference Table

| Formatter | Purpose | Example |
|-----------|---------|---------|
| **Date/Time** |
| `date` | Format dates | `{{date\|date:'MMM DD, YYYY'}}` |
| `time` | Format times | `{{time\|time:'h:mm A'}}` |
| `datetime` | Date + time | `{{dt\|datetime:'MM/DD':'HH:mm'}}` |
| `datetime_tz` | With timezone | `{{dt\|datetime_tz:'MM/DD':'HH:mm':{timeZone:'America/New_York'}}}` |
| `relative` | Relative time | `{{date\|relative}}` → "2 hours ago" |
| `relative_short` | Compact relative | `{{date\|relative_short}}` → "2h" |
| `iso` | ISO 8601 | `{{date\|iso}}` → "2025-10-04T14:30:00Z" |
| `epoch` | Seconds to ms | `{{secs\|epoch}}` |
| **Numbers** |
| `number` | Format numbers | `{{val\|number:2}}` → "1,234.57" |
| `currency` | Format cents | `{{cents\|currency}}` → "$12.35" |
| `percent` | Percentage | `{{val\|percent:1}}` → "12.3%" |
| `filesize` | File sizes | `{{bytes\|filesize}}` → "1.2 MB" |
| `ordinal` | Ordinals | `{{num\|ordinal}}` → "1st, 2nd" |
| `compact` | Compact numbers | `{{num\|compact}}` → "1.2K, 3.4M" |
| **Strings** |
| `uppercase` | To uppercase | `{{text\|uppercase}}` |
| `lowercase` | To lowercase | `{{text\|lowercase}}` |
| `capitalize` | Capitalize | `{{text\|capitalize}}` |
| `truncate` | Truncate text | `{{text\|truncate:50}}` |
| `truncate_middle` | Middle truncate | `{{hash\|truncate_middle:16}}` |
| `slug` | URL slug | `{{title\|slug}}` → "hello-world" |
| `initials` | Extract initials | `{{name\|initials}}` → "JD" |
| `mask` | Mask data | `{{ssn\|mask}}` → "******7890" |
| `hex` | To hexadecimal | `{{val\|hex}}` |
| `unhex` | From hexadecimal | `{{hex\|unhex}}` |
| **HTML/Web** |
| `email` | Mailto link | `{{email\|email}}` |
| `phone` | Phone link | `{{phone\|phone}}` |
| `url` | Hyperlink | `{{url\|url:'Text'}}` |
| `badge` | Bootstrap badge | `{{status\|badge}}` |
| `badgeClass` | Badge class only | `{{val\|badgeClass}}` → "bg-success" |
| `status` | Status indicator | `{{status\|status}}` |
| `boolean` | Boolean text | `{{bool\|boolean:'Yes':'No'}}` |
| `yesno` | Yes/No | `{{bool\|yesno}}` |
| `yesnoicon` | Boolean icon | `{{bool\|yesnoicon}}` |
| `icon` | Value to icon | `{{type\|icon:{...}}}` |
| `avatar` | Avatar image | `{{photo\|avatar:'md'}}` |
| `image` | Image tag | `{{photo\|image:'thumbnail'}}` |
| `tooltip` | Tooltip | `{{val\|tooltip:'Help text'}}` |
| `linkify` | Linkify URLs/emails | `{{{text\|linkify}}}` |
| `clipboard` | Copy with button | `{{{val\|clipboard}}}` |
| **Utility** |
| `default` | Fallback value | `{{val\|default:'N/A'}}` |
| `equals` | Conditional output | `{{state\|equals:1:'active':'inactive'}}` |
| `json` | JSON string | `{{data\|json:2}}` |
| `raw` | Pass-through | `{{html\|raw}}` |
| `iter` | To iterable | `{{obj\|iter}}` |
| `keys` | Object keys | `{{obj\|keys}}` |
| `values` | Object values | `{{obj\|values}}` |
| `custom` | Custom function (JS) | `dataFormatter.apply('custom', value, fn)` |
| **Text/Content** |
| `plural` | Pluralize | `{{n\|plural:'item'}}` |
| `list` | Array to list | `{{arr\|list}}` |
| `duration` | Duration | `{{ms\|duration}}` |
| `hash` | Truncate IDs | `{{id\|hash:8}}` |
| `stripHtml` | Remove HTML | `{{html\|stripHtml}}` |
| `highlight` | Highlight text | `{{text\|highlight:'term'}}` |
| `pre` | Code block | `{{code\|pre}}` |

---

## Summary

The DataFormatter provides a robust, consistent way to format data throughout your MOJO application. Key takeaways:

1. **Use colon syntax** (`:`) for cleaner, more readable templates
2. **Use the singleton instance** for consistency
3. **Both `format` and `formatter`** properties work in DataView and TableView
4. **Always provide defaults** for user-facing data
5. **Format data in views**, not in chart configurations
6. **Register custom formatters** for app-specific needs

The formatter is designed to be safe, fast, and extensible - making it perfect for everything from simple text transformation to complex data presentation in dashboards and reports.
