# Templates

**Mustache templating with powerful data formatting pipelines**

MOJO uses Mustache templates enhanced with a comprehensive formatting system. Templates are inline, logic-less, and support 100+ built-in formatters for dates, numbers, text, and more.

---

## Table of Contents

### Overview
- [What are Templates?](#what-are-templates)
- [Key Features](#key-features)
- [Philosophy](#philosophy)

### Quick Start
- [Basic Template](#basic-template)
- [With Formatters](#with-formatters)
- [With Model Data](#with-model-data)

### Common Pitfalls ⚠️
- [Boolean Checks Need |bool](#boolean-checks-need-bool)
- [HTML Output Needs {{{](#html-output-needs-)
- [String Arguments Need Quotes](#string-arguments-need-quotes)
- [Use {{.}} in Iterations](#use--in-iterations)
- [Object Iteration Needs |iter](#object-iteration-needs-iter)

### Template Context
- [View Instance as Context](#view-instance-as-context)
- [Model-First Approach](#model-first-approach)
- [View Methods for Computed Values](#view-methods-for-computed-values)

### Mustache Syntax
- [Variable Interpolation](#variable-interpolation)
- [HTML Escaping](#html-escaping)
- [Sections](#sections)
- [Inverted Sections](#inverted-sections)
- [Comments](#comments)

### Data Access
- [Dot Notation](#dot-notation)
- [Context Dot (.)](#context-dot-)
- [Parent Context Access](#parent-context-access)

### Iteration
- [Array Iteration](#array-iteration)
- [Object Iteration](#object-iteration)
- [Nested Loops](#nested-loops)
- [Iteration Context Variables](#iteration-context-variables)

### Formatters (Pipes)
- [Pipe Syntax](#pipe-syntax)
- [Chaining Formatters](#chaining-formatters)
- [Formatter Arguments](#formatter-arguments)
- [Context Values as Arguments](#context-values-as-arguments)

### Built-in Formatters
- [Date & Time](#date--time)
- [Numbers](#numbers)
- [Text](#text)
- [HTML & Web](#html--web)
- [Status & Badges](#status--badges)
- [Utility](#utility)

### Partials
- [Defining Partials](#defining-partials)
- [Using Partials](#using-partials)
- [Partial Context](#partial-context)

### Custom Formatters
- [Registering Formatters](#registering-formatters)
- [Formatter Examples](#formatter-examples)

### Best Practices
- [Keep Templates Simple](#keep-templates-simple)
- [Use Models Directly](#use-models-directly)
- [Formatters for Display](#formatters-for-display)
- [View Methods for Logic](#view-methods-for-logic)

### Troubleshooting
- [Variables Don't Show](#variables-dont-show)
- [Formatters Don't Work](#formatters-dont-work)
- [Sections Don't Render](#sections-dont-render)

---

## What are Templates?

**Templates** are inline HTML strings with Mustache syntax and formatting pipes. They define how your data is displayed.

**Example:**
```javascript
class UserView extends View {
  template = `
    <div class="user">
      <h2>{{name}}</h2>
      <p>{{email|lowercase}}</p>
      <p>Joined: {{created_at|date}}</p>
    </div>
  `;
}
```

---

## Key Features

- **Inline templates** - Defined directly in View classes
- **Logic-less** - No if/else in templates, logic in views
- **View as context** - `this` from view is the template context
- **Model-first** - Use `{{model.property}}` directly
- **100+ formatters** - Date, currency, truncate, status, and more
- **Pipe syntax** - `{{value|formatter}}` for formatting
- **Mustache standard** - Industry-standard syntax

---

## Philosophy

**KISS - Keep It Simple, Stupid**

1. **Templates are for display only** - No logic
2. **Models are the primary data source** - Not custom structures
3. **View methods for computed values** - When formatters aren't enough
4. **Formatters for presentation** - Dates, currency, truncation
5. **Readability matters** - Code should be obvious

---

## Basic Template

Simple inline template:

```javascript
import { View } from 'web-mojo/core';

class GreetingView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="greeting">
          <h1>Hello, {{name}}!</h1>
          <p>{{message}}</p>
        </div>
      `,
      ...options
    });
    
    this.name = 'World';
    this.message = 'Welcome to MOJO';
  }
}
```

**How it works:**
- `{{name}}` looks for `this.name` on the view
- `{{message}}` looks for `this.message` on the view
- Values are HTML-escaped automatically

---

## With Formatters

Add formatters with pipe syntax:

```javascript
class UserCardView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="user-card">
          <h2>{{name|uppercase}}</h2>
          <p>{{email|lowercase}}</p>
          <p>Member since: {{joined_at|date}}</p>
          <p>{{bio|truncate:100}}</p>
        </div>
      `,
      ...options
    });
    
    this.name = 'john doe';
    this.email = 'JOHN@EXAMPLE.COM';
    this.joined_at = '2024-01-15T10:30:00Z';
    this.bio = 'A very long biography...';
  }
}

// Renders:
// JOHN DOE
// john@example.com
// Member since: Jan 15, 2024
// A very long biography... (truncated)
```

---

## With Model Data

**Recommended: Use model data directly in templates**

```javascript
import User from '@models/User.js';

class UserProfileView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="profile">
          <h2>{{model.name}}</h2>
          <p>{{model.email}}</p>
          <p>{{model.role|capitalize}}</p>
          <p>Joined: {{model.created_at|date}}</p>
          <p>Revenue: {{model.total_revenue|currency}}</p>
        </div>
      `,
      ...options
    });
  }
}

// Usage
const user = new User({ id: 123 });
await user.fetch();

const view = new UserProfileView({ model: user });
await view.render();
await view.mount(document.body);
```

---

## Boolean Checks Need |bool

**⚠️ CRITICAL: Always use `|bool` for boolean checks**

Mustache sections will iterate arrays/objects instead of checking truthiness!

```javascript
// ❌ WRONG - Will iterate if users is an array!
{{#users}}
  <p>Has users</p>
{{/users}}

// ✅ CORRECT - Forces boolean check
{{#users|bool}}
  <p>Has users</p>
{{/users|bool}}

// ✅ Another example
{{#model.is_active|bool}}
  <span class="badge-success">Active</span>
{{/model.is_active|bool}}

// ❌ WRONG - Will iterate object properties
{{#settings}}
  Has settings
{{/settings}}

// ✅ CORRECT - Boolean check
{{#settings|bool}}
  Has settings
{{/settings|bool}}
```

**When to use `|bool`:**
- Checking if array/object exists
- Checking boolean flags
- Conditional rendering based on existence

---

## HTML Output Needs {{{

**⚠️ CRITICAL: Use triple braces `{{{` for HTML output**

Formatters that return HTML must use `{{{` or tags will be escaped:

```javascript
// ❌ WRONG - HTML escaped, shows literal tags
{{model.status|status}}
// Renders: <span class="badge">Active</span> (as text!)

// ✅ CORRECT - Renders actual HTML
{{{model.status|status}}}
// Renders: Active badge

// Other formatters that need {{{
{{{model.is_active|yesnoicon}}}
{{{model.description|linkify}}}
{{{model.price|badge}}}
{{{model.avatar_url|avatar}}}
{{{model.url|url}}}
{{{model.email|email}}}
{{{model.text|nl2br}}}
{{{model.code|code}}}
{{{model.value|clipboard}}}
```

**Formatters that output HTML:**
- `status`, `status_icon`
- `yesnoicon`, `icon`
- `badge`
- `avatar`, `image`
- `linkify`, `url`, `email`
- `nl2br`, `code`
- `clipboard`, `tooltip`

---

## String Arguments Need Quotes

**⚠️ CRITICAL: Wrap string arguments in quotes**

```javascript
// ❌ WRONG - Parser gets confused
{{model.created_at|date:MMM dd, YYYY}}

// ✅ CORRECT - String wrapped in quotes
{{model.created_at|date:'MMM dd, YYYY'}}

// ❌ WRONG
{{model.description|truncate:100:...}}

// ✅ CORRECT - Each string arg quoted
{{model.description|truncate:100:'...'}}

// Numbers don't need quotes
{{model.description|truncate:100}}  // ✓ OK
{{model.price|currency:2}}  // ✓ OK
```

---

## Use {{.}} in Iterations

**⚠️ CRITICAL: Use `{{.}}` to access current item in iterations**

```javascript
// ❌ WRONG - {{name}} looks in parent context!
{{#users}}
  <div>{{name}}</div>
{{/users}}

// ✅ CORRECT - {{.name}} accesses current user
{{#users}}
  <div>{{.name}}</div>
{{/users}}

// ✅ For primitives, use {{.}} alone
{{#tags}}
  <span>{{.}}</span>
{{/tags}}

// ✅ Access parent from inside iteration
{{#users}}
  <div>{{.name}} belongs to {{company.name}}</div>
{{/users}}
```

---

## Object Iteration Needs |iter

**⚠️ CRITICAL: Use `|iter` to iterate object key/value pairs**

```javascript
// ❌ WRONG - Objects don't iterate by default
{{#settings}}
  <div>{{key}} = {{value}}</div>
{{/settings}}

// ✅ CORRECT - Use |iter formatter
{{#settings|iter}}
  <div>{{.key}} = {{.value}}</div>
{{/settings|iter}}

// Example with real data
// settings = { theme: 'dark', language: 'en', notifications: true }
{{#settings|iter}}
  <div class="setting">
    <label>{{.key}}</label>
    <span>{{.value}}</span>
  </div>
{{/settings|iter}}

// Renders:
// theme = dark
// language = en
// notifications = true
```

---

## View Instance as Context

**The view instance (`this`) is the template context.**

Everything on `this` is accessible in templates:

```javascript
class DashboardView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div>
          <h1>{{title}}</h1>
          <p>User: {{username}}</p>
          <p>Status: {{getStatus}}</p>
          <p>Count: {{items.length}}</p>
        </div>
      `,
      ...options
    });
    
    // View properties
    this.title = 'Dashboard';
    this.username = 'john_doe';
    this.items = [1, 2, 3];
  }
  
  // View methods
  getStatus() {
    return this.items.length > 0 ? 'Active' : 'Empty';
  }
}
```

**Lookup order:**
1. Current iteration context (inside `{{#section}}`)
2. View properties (`this.property`)
3. View methods (`this.method()`)
4. Model/Collection (if bound)

---

## Model-First Approach

**RECOMMENDED: Use model data directly, don't create custom structures**

```javascript
// ✅ GOOD - Use model directly
class UserView extends View {
  template = `
    <div>
      <h2>{{model.name}}</h2>
      <p>{{model.email}}</p>
      <p>{{model.created_at|date}}</p>
    </div>
  `;
}

// ❌ AVOID - Creating custom data structures
class UserView extends View {
  async onBeforeRender() {
    // Don't do this!
    this.userData = {
      displayName: this.model.get('name'),
      displayEmail: this.model.get('email'),
      displayDate: this.formatDate(this.model.get('created_at'))
    };
  }
  
  template = `
    <div>
      <h2>{{userData.displayName}}</h2>
      <p>{{userData.displayEmail}}</p>
      <p>{{userData.displayDate}}</p>
    </div>
  `;
}

// ✅ BETTER - Use formatters
class UserView extends View {
  template = `
    <div>
      <h2>{{model.name}}</h2>
      <p>{{model.email}}</p>
      <p>{{model.created_at|date}}</p>
    </div>
  `;
}
```

**Why model-first?**
- Less code
- More readable
- Automatic updates when model changes
- No data duplication

---

## View Methods for Computed Values

**Use view methods when formatters can't handle the logic:**

```javascript
class ProductView extends View {
  template = `
    <div>
      <h3>{{model.name}}</h3>
      <p>Price: {{model.price|currency}}</p>
      <p>Discount: {{getDiscountedPrice|currency}}</p>
      <p>{{getStockStatus}}</p>
    </div>
  `;
  
  // View method for complex computation
  getDiscountedPrice() {
    const price = this.model.get('price');
    const discount = this.model.get('discount_percent');
    return price * (1 - discount / 100);
  }
  
  // View method for conditional logic
  getStockStatus() {
    const stock = this.model.get('stock');
    if (stock === 0) return 'Out of Stock';
    if (stock < 10) return 'Low Stock';
    return 'In Stock';
  }
}
```

**When to use view methods:**
- Complex calculations (discount, tax, totals)
- Conditional logic (status messages)
- Combining multiple fields
- Business logic

**When to use formatters:**
- Display formatting (dates, currency, truncation)
- Single-value transformations
- Standard presentations

---

## Variable Interpolation

Basic variable output:

```javascript
template = `
  <h1>{{title}}</h1>
  <p>{{description}}</p>
  <span>{{count}}</span>
`;

// Properties
this.title = 'My Title';
this.description = 'Some text';
this.count = 42;
```

---

## HTML Escaping

Variables are HTML-escaped by default:

```javascript
// Double braces {{}} - HTML escaped
template = `<div>{{htmlContent}}</div>`;
this.htmlContent = '<script>alert("xss")</script>';
// Renders: &lt;script&gt;alert("xss")&lt;/script&gt;

// Triple braces {{{  }}} - Raw HTML (NOT escaped)
template = `<div>{{{htmlContent}}}</div>`;
this.htmlContent = '<strong>Bold</strong>';
// Renders: <strong>Bold</strong>
```

**Use triple braces ONLY for:**
- Trusted HTML content
- Formatter output (status, badges, etc.)

---

## Sections

Conditional rendering and iteration:

```javascript
// Boolean check (with |bool)
{{#isActive|bool}}
  <p>This is active</p>
{{/isActive|bool}}

// Array iteration
{{#users}}
  <div>{{.name}}</div>
{{/users}}

// Object existence
{{#user|bool}}
  <p>User exists</p>
{{/user|bool}}
```

**Truthy values** (section renders):
- `true`
- Non-empty strings
- Numbers (except 0)
- Non-empty arrays
- Objects

**Falsy values** (section doesn't render):
- `false`
- `null`
- `undefined`
- `0`
- Empty string `""`
- Empty array `[]`

---

## Inverted Sections

Render when falsy:

```javascript
{{^users|bool}}
  <p>No users found</p>
{{/users|bool}}

{{#users}}
  <ul>
    {{#.}}
      <li>{{.name}}</li>
    {{/.}}
  </ul>
{{/users}}
```

---

## Comments

Template comments (not rendered):

```javascript
template = `
  <div>
    {{! This is a comment }}
    <h1>{{title}}</h1>
    {{! TODO: Add more fields }}
  </div>
`;
```

---

## Dot Notation

Access nested properties:

```javascript
template = `
  <div>
    <h2>{{user.profile.name}}</h2>
    <p>{{user.profile.bio}}</p>
    <p>{{user.contact.email}}</p>
    <p>{{user.address.city}}, {{user.address.state}}</p>
  </div>
`;

// Data
this.user = {
  profile: {
    name: 'John Doe',
    bio: 'Developer'
  },
  contact: {
    email: 'john@example.com'
  },
  address: {
    city: 'San Francisco',
    state: 'CA'
  }
};
```

---

## Context Dot (.)

Current item in iterations:

```javascript
// Array of objects
{{#users}}
  <div>
    <h3>{{.name}}</h3>
    <p>{{.email}}</p>
    <p>{{.role}}</p>
  </div>
{{/users}}

// Array of primitives
{{#tags}}
  <span class="tag">{{.}}</span>
{{/tags}}

// Nested properties
{{#users}}
  <p>{{.profile.bio}}</p>
{{/users}}
```

---

## Parent Context Access

Access parent properties from inside iterations:

```javascript
template = `
  <div>
    <h1>{{company.name}}</h1>
    
    {{#employees}}
      <div class="employee">
        <span>{{.name}}</span>
        <span>works at {{company.name}}</span>
      </div>
    {{/employees}}
  </div>
`;

// {{company.name}} accessible from inside iteration
```

---

## Array Iteration

Iterate arrays of objects:

```javascript
template = `
  <ul class="users">
    {{#users}}
      <li>
        <strong>{{.name}}</strong>
        <span>{{.email}}</span>
        <span>{{.role|capitalize}}</span>
      </li>
    {{/users}}
  </ul>
  
  {{^users|bool}}
    <p>No users found</p>
  {{/users|bool}}
`;

this.users = [
  { name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { name: 'Bob', email: 'bob@example.com', role: 'user' }
];
```

---

## Object Iteration

Iterate object key/value pairs with `|iter`:

```javascript
template = `
  <dl class="settings">
    {{#settings|iter}}
      <dt>{{.key|capitalize}}</dt>
      <dd>{{.value}}</dd>
    {{/settings|iter}}
  </dl>
`;

this.settings = {
  theme: 'dark',
  language: 'en',
  notifications: true
};

// Renders:
// Theme: dark
// Language: en
// Notifications: true
```

---

## Nested Loops

Iterate nested structures:

```javascript
template = `
  {{#categories}}
    <div class="category">
      <h3>{{.name}}</h3>
      {{#.items}}
        <div class="item">
          <span>{{.name}}</span>
          <span>{{.price|currency}}</span>
        </div>
      {{/.items}}
    </div>
  {{/categories}}
`;

this.categories = [
  {
    name: 'Electronics',
    items: [
      { name: 'Phone', price: 69900 },
      { name: 'Laptop', price: 129900 }
    ]
  },
  {
    name: 'Books',
    items: [
      { name: 'Novel', price: 1999 },
      { name: 'Guide', price: 2999 }
    ]
  }
];
```

---

## Iteration Context Variables

Access iteration metadata:

```javascript
template = `
  <ul>
    {{#items}}
      <li class="{{#@first}}first{{/@first}} {{#@last}}last{{/@last}}">
        {{@index}}. {{.name}}
        {{#@odd}}<span class="odd">Odd</span>{{/@odd}}
      </li>
    {{/items}}
  </ul>
`;

// Available context variables:
// @index - Current index (0-based)
// @first - True for first item
// @last - True for last item
// @odd - True for odd indices (1, 3, 5, ...)
// @even - True for even indices (0, 2, 4, ...)
```

---

## Pipe Syntax

Apply formatters with pipe `|` operator:

```javascript
// Single formatter
{{value|formatter}}

// Formatter with arguments
{{value|formatter:arg1:arg2}}

// Chained formatters
{{value|formatter1|formatter2|formatter3}}

// Examples
{{price|currency}}
{{description|truncate:100}}
{{name|lowercase|capitalize}}
{{created_at|date:'MMM dd, YYYY'}}
```

---

## Chaining Formatters

Combine multiple formatters:

```javascript
// Clean and format text
{{description|truncate:100|capitalize}}

// Format name
{{username|lowercase|capitalize}}

// Complex chain
{{bio|truncate:200|capitalize|default:'No bio provided'}}

// With model data
{{model.email|lowercase|truncate:30}}
{{model.name|uppercase|truncate:20}}
```

---

## Formatter Arguments

Pass arguments to formatters:

```javascript
// Literal arguments (wrap strings in quotes!)
{{text|truncate:50}}
{{text|truncate:50:'...'}}
{{date|date:'YYYY-MM-DD'}}
{{price|currency:'EUR'}}

// Multiple arguments
{{text|highlight:'search':'yellow'}}
```

---

## Context Values as Arguments

Use context values as formatter arguments:

```javascript
// Context value as argument
{{model.created_at|date:model.date_format}}
{{model.description|truncate:model.max_length}}
{{model.price|currency:model.currency_code}}

// Example with view property
{{text|truncate:maxLength}}

// this.maxLength = 100
```

**Arguments can be:**
- Literals: `'YYYY-MM-DD'`, `100`, `true`
- Context values: `model.date_format`, `maxLength`, `user.locale`

---

## Date & Time

| Formatter | Example | Output |
|-----------|---------|--------|
| `date` | `{{created_at\|date}}` | Jan 15, 2024 |
| `date:'format'` | `{{created_at\|date:'YYYY-MM-DD'}}` | 2024-01-15 |
| `time` | `{{timestamp\|time}}` | 2:30 PM |
| `datetime` | `{{created_at\|datetime}}` | Jan 15, 2024 2:30 PM |
| `datetime_tz` | `{{created_at\|datetime_tz}}` | Jan 15, 2024 2:30 PM PST |
| `relative` | `{{lastSeen\|relative}}` | 2 hours ago |
| `iso` | `{{created_at\|iso}}` | 2024-01-15T14:30:00Z |

**Format tokens for `date`:**
- `YYYY` - 4-digit year (2024)
- `YY` - 2-digit year (24)
- `MMMM` - Full month (January)
- `MMM` - Short month (Jan)
- `MM` - 2-digit month (01)
- `M` - Month (1)
- `DD` - 2-digit day (05)
- `D` - Day (5)

---

## Numbers

| Formatter | Example | Output |
|-----------|---------|--------|
| `number` | `{{count\|number}}` | 1,234 |
| `currency` | `{{price\|currency}}` | $19.99 |
| `currency:'EUR'` | `{{price\|currency:'EUR'}}` | €19.99 |
| `percent` | `{{ratio\|percent}}` | 75% |
| `filesize` | `{{bytes\|filesize}}` | 1.2 MB |
| `ordinal` | `{{position\|ordinal}}` | 1st, 2nd, 3rd |
| `compact` | `{{followers\|compact}}` | 1.2K, 1.5M |

---

## Text

| Formatter | Example | Output |
|-----------|---------|--------|
| `uppercase` | `{{name\|uppercase}}` | JOHN DOE |
| `lowercase` | `{{email\|lowercase}}` | user@example.com |
| `capitalize` | `{{title\|capitalize}}` | Hello World |
| `truncate:n` | `{{text\|truncate:50}}` | Text truncated... |
| `slug` | `{{title\|slug}}` | my-blog-post |
| `initials` | `{{name\|initials}}` | JD |
| `mask` | `{{ssn\|mask}}` | ***-**-1234 |

---

## HTML & Web

| Formatter | Example | Output |
|-----------|---------|--------|
| `email` | `{{{email\|email}}}` | Clickable email link |
| `phone` | `{{{phone\|phone}}}` | (555) 123-4567 |
| `url` | `{{{url\|url}}}` | Clickable link |
| `linkify` | `{{{text\|linkify}}}` | Text with clickable URLs |
| `nl2br` | `{{{text\|nl2br}}}` | Text with `<br>` tags |

---

## Status & Badges

| Formatter | Example | Output |
|-----------|---------|--------|
| `status` | `{{{status\|status}}}` | Icon + colored text |
| `status_icon` | `{{{status\|status_icon}}}` | Icon only |
| `status_text` | `{{status\|status_text}}` | Text only |
| `badge` | `{{{value\|badge}}}` | Bootstrap badge |
| `yesnoicon` | `{{{active\|yesnoicon}}}` | ✓ or ✗ icon |
| `boolean` | `{{active\|boolean}}` | Yes/No |

---

## Utility

| Formatter | Example | Output |
|-----------|---------|--------|
| `default:'text'` | `{{desc\|default:'None'}}` | Value or 'None' |
| `json` | `{{data\|json}}` | JSON string |
| `iter` | `{{#obj\|iter}}{{.key}}{{/obj\|iter}}` | Object iteration |
| `bool` | `{{#arr\|bool}}Yes{{/arr\|bool}}` | Boolean check |

**See [DataFormatter.md](./DataFormatter.md) for complete formatter reference (100+ formatters).**

---

## Defining Partials

Create reusable template fragments:

```javascript
class BlogView extends View {
  getPartials() {
    return {
      'post-header': `
        <header>
          <h2>{{title}}</h2>
          <p class="meta">By {{author}} on {{date|date}}</p>
        </header>
      `,
      
      'post-tags': `
        <div class="tags">
          {{#tags}}
            <span class="tag">{{.}}</span>
          {{/tags}}
        </div>
      `,
      
      'loading': `
        <div class="spinner">Loading...</div>
      `
    };
  }
}
```

---

## Using Partials

Include partials with `{{> partial-name}}`:

```javascript
template = `
  <article class="blog-post">
    {{#loading|bool}}
      {{> loading}}
    {{/loading|bool}}
    
    {{^loading|bool}}
      {{> post-header}}
      <div class="content">{{content}}</div>
      {{> post-tags}}
    {{/loading|bool}}
  </article>
`;
```

---

## Partial Context

Partials inherit parent context:

```javascript
getPartials() {
  return {
    'user-card': `
      <div class="card">
        <h3>{{name}}</h3>
        <p>{{email}}</p>
      </div>
    `
  };
}

template = `
  {{#users}}
    {{> user-card}}
  {{/users}}
`;

// Partial sees {{name}} and {{email}} from current user
```

---

## Registering Formatters

Add custom formatters:

```javascript
import dataFormatter from '@core/utils/DataFormatter.js';

// Simple formatter
dataFormatter.register('reverse', (value) => {
  return String(value).split('').reverse().join('');
});

// Formatter with arguments
dataFormatter.register('repeat', (value, times = 2) => {
  return String(value).repeat(parseInt(times));
});

// Complex formatter
dataFormatter.register('highlight', (value, term, color = 'yellow') => {
  const regex = new RegExp(`(${term})`, 'gi');
  return String(value).replace(regex, `<mark style="background:${color}">$1</mark>`);
});
```

---

## Formatter Examples

Use custom formatters:

```javascript
// In template
{{text|reverse}}
{{char|repeat:3}}
{{{description|highlight:searchTerm:'yellow'}}}

// Advanced example
dataFormatter.register('priceTag', (cents, currency = 'USD') => {
  const dollars = (cents / 100).toFixed(2);
  const symbol = currency === 'EUR' ? '€' : '$';
  return `<span class="price">${symbol}${dollars}</span>`;
});

// Usage
{{{model.price|priceTag}}}
{{{model.price|priceTag:'EUR'}}}
```

---

## Keep Templates Simple

```javascript
// ✅ GOOD - Simple, readable
template = `
  <div>
    <h2>{{model.name}}</h2>
    <p>{{model.email}}</p>
  </div>
`;

// ❌ AVOID - Complex logic in template
template = `
  {{#if model.age > 18 && model.verified}}
    ...
  {{/if}}
`;

// ✅ BETTER - Logic in view method
template = `
  {{#canAccess|bool}}
    ...
  {{/canAccess|bool}}
`;

canAccess() {
  return this.model.get('age') > 18 && this.model.get('verified');
}
```

---

## Use Models Directly

```javascript
// ✅ GOOD - Model data directly
template = `
  <h2>{{model.name}}</h2>
  <p>{{model.created_at|date}}</p>
`;

// ❌ AVOID - Custom data structures
async onBeforeRender() {
  this.displayData = {
    name: this.model.get('name'),
    date: this.formatDate(this.model.get('created_at'))
  };
}
```

---

## Formatters for Display

```javascript
// ✅ GOOD - Formatters for presentation
{{model.price|currency}}
{{model.created_at|date:'YYYY-MM-DD'}}
{{model.description|truncate:100}}

// ❌ AVOID - Pre-formatting in view
async onBeforeRender() {
  this.displayPrice = this.formatCurrency(this.model.get('price'));
  this.displayDate = this.formatDate(this.model.get('created_at'));
}
```

---

## View Methods for Logic

```javascript
// ✅ GOOD - View methods for complex logic
template = `
  <p>Discount: {{getDiscountedPrice|currency}}</p>
  <p>Status: {{getAvailabilityStatus}}</p>
`;

getDiscountedPrice() {
  const price = this.model.get('price');
  const discount = this.model.get('discount_percent');
  return price * (1 - discount / 100);
}

getAvailabilityStatus() {
  const stock = this.model.get('stock');
  if (stock === 0) return 'Out of Stock';
  if (stock < 10) return 'Low Stock';
  return 'In Stock';
}
```

---

## Variables Don't Show

**Check:**
1. Property exists on view
2. Model is bound if using `{{model.prop}}`
3. Property name matches exactly (case-sensitive)

```javascript
console.log('View:', this);
console.log('Property:', this.propertyName);
console.log('Model:', this.model?.toJSON());
```

---

## Formatters Don't Work

**Check:**
1. Formatter is registered
2. Spelling is correct
3. Value is not null/undefined
4. Using correct syntax: `{{value|formatter}}`

```javascript
import dataFormatter from '@core/utils/DataFormatter.js';
console.log('Formatters:', dataFormatter.listFormatters());
```

---

## Sections Don't Render

**Check:**
1. Value is truthy (not `false`, `0`, `''`, `null`, `undefined`, `[]`)
2. Using `|bool` for boolean checks
3. Section tags match: `{{#name}}...{{/name}}`

```javascript
console.log('Value:', this.value);
console.log('Is truthy:', !!this.value);
console.log('Is array:', Array.isArray(this.value));
```

---

## Summary

MOJO templates provide a powerful, readable way to render data:

**Key Principles:**
- **Inline templates** - Defined in view classes
- **Model-first** - Use `{{model.property}}` directly
- **Formatters for display** - Dates, currency, truncation
- **View methods for logic** - Complex computations
- **KISS** - Keep templates simple and readable

**Critical Pitfalls:**
- Use `|bool` for boolean checks
- Use `{{{` for HTML output
- Wrap string arguments in quotes
- Use `{{.}}` in iterations
- Use `|iter` for object iteration

**Related Documentation:**
- [View.md](./View.md) - View component basics
- [DataFormatter.md](./DataFormatter.md) - Complete formatter reference (100+ formatters)
- [Model.md](./Model.md) - Model data management
- [Collection.md](./Collection.md) - Collection data management

For advanced template patterns, see [AdvancedViews.md](./AdvancedViews.md).
