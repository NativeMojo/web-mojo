# Templates and Data Formatting

MOJO uses a powerful templating system built on a custom Mustache implementation combined with a comprehensive data formatting pipeline. This guide covers template syntax, data binding, formatting, and advanced features.

## Template Engine Overview

MOJO's template engine provides:
- **Logic-less templates** using Mustache syntax
- **Powerful data formatting** via pipe syntax
- **Hierarchical data access** with dot notation
- **Conditional rendering** with sections
- **Loop rendering** with special iteration syntax
- **Partial templates** for reusability
- **Method calls** on template context

## Basic Template Syntax

### Variable Interpolation

```html
<!-- Basic variable rendering -->
<h1>{{title}}</h1>
<p>Welcome, {{user.name}}!</p>

<!-- HTML escaping (default) -->
<div>{{userInput}}</div>

<!-- Raw HTML (unescaped) -->
<div>{{{htmlContent}}}</div>
```

### Dot Notation Access

```html
<!-- Nested object access -->
<div class="profile">
  <h2>{{user.profile.displayName}}</h2>
  <img src="{{user.profile.avatar.url}}" alt="{{user.profile.avatar.alt}}">
  <p>{{user.contact.email}}</p>
</div>

<!-- Array index access -->
<div class="first-item">{{items.0.name}}</div>
<div class="second-item">{{items.1.description}}</div>
```

### Method Calls

```html
<!-- Call methods on the view context -->
<div class="status">{{getStatus}}</div>
<div class="formatted">{{formatDisplayName}}</div>
<div class="computed">{{calculateTotal}}</div>
```

## Data Formatting with Pipes

Pipes apply formatters to the resolved value:

- `{{value|formatter}}`
- `{{value|formatter:arg1:arg2}}`
- `{{value|formatter1|formatter2}}` (chained)

### Basic Pipe Syntax

Use the pipe (`|`) operator to format data:

```html
<!-- Single formatter -->
<span>{{price|currency}}</span>
<time>{{date|relative}}</time>
<h3>{{title|capitalize}}</h3>

<!-- Multiple formatters (chained) -->
<p>{{description|truncate(100)|capitalize}}</p>
<span>{{username|lowercase|truncate(20)|capitalize}}</span>
```

### Built-in Formatters

#### Date and Time Formatters

```html
<!-- Date formatting -->
<time>{{createdAt|date}}</time>                    <!-- Default: MMM D, YYYY -->
<time>{{createdAt|date('YYYY-MM-DD')}}</time>      <!-- Custom format -->
<time>{{createdAt|date('MMMM D, YYYY')}}</time>    <!-- January 15, 2024 -->

<!-- Time formatting -->
<span>{{timestamp|time}}</span>                     <!-- 2:30 PM -->
<span>{{timestamp|time('HH:mm:ss')}}</span>         <!-- 14:30:45 -->

<!-- Date and time combined -->
<span>{{createdAt|datetime}}</span>                 <!-- Jan 15, 2024 2:30 PM -->

<!-- Relative time -->
<span>{{lastSeen|relative}}</span>                  <!-- 2 hours ago -->

<!-- ISO format -->
<time datetime="{{createdAt|iso}}">{{createdAt|date}}</time>
```

#### Number Formatters

```html
<!-- Basic number formatting -->
<span>{{count|number}}</span>                       <!-- 1,234 -->

<!-- Currency -->
<span>{{price|currency}}</span>                     <!-- $19.99 -->
<span>{{price|currency('EUR')}}</span>              <!-- €19.99 -->

<!-- Percentage -->
<span>{{ratio|percent}}</span>                      <!-- 75% -->

<!-- File size -->
<span>{{fileSize|filesize}}</span>                  <!-- 1.2 MB -->

<!-- Ordinal numbers -->
<span>{{position|ordinal}}</span>                   <!-- 1st, 2nd, 3rd -->

<!-- Compact numbers -->
<span>{{followers|compact}}</span>                  <!-- 1.2K, 1.5M -->
```

#### Text Formatters

```html
<!-- Case formatting -->
<h1>{{title|capitalize}}</h1>                       <!-- Title Case -->
<span>{{name|uppercase}}</span>                     <!-- JOHN DOE -->
<span>{{email|lowercase}}</span>                    <!-- user@example.com -->

<!-- Text truncation -->
<p>{{description|truncate(100)}}</p>                <!-- Truncate to 100 chars -->
<p>{{text|truncate(50, '...')}}</p>                 <!-- Custom ellipsis -->

<!-- URL slug -->
<a href="/posts/{{title|slug}}">{{title}}</a>      <!-- my-blog-post -->

<!-- Initials -->
<div class="avatar">{{fullName|initials}}</div>     <!-- JD -->

<!-- Text masking -->
<span>{{ssn|mask}}</span>                           <!-- ***-**-1234 -->
<span>{{phone|mask('***-***-####')}}</span>         <!-- 555-123-#### -->
```

#### Contact and Media Formatters

```html
<!-- Email formatting -->
<a href="mailto:{{email}}">{{email|email}}</a>

<!-- Phone formatting -->
<a href="tel:{{phone}}">{{phone|phone}}</a>         <!-- (555) 123-4567 -->

<!-- URL formatting -->
<a href="{{website|url}}">Visit Website</a>

<!-- Image formatting -->
<img src="{{photo|image(300, 200, 'crop')}}" alt="{{alt}}">

<!-- Avatar with fallback -->
<img src="{{avatar|avatar(100)}}" alt="{{name|initials}}">
```

#### Status and UI Formatters

```html
<!-- Badge formatting -->
<span class="badge {{status|badge}}">{{status}}</span>

<!-- Status formatting -->
<div class="status-indicator {{status|status}}">
  {{status|capitalize}}
</div>

<!-- Boolean formatting -->
<span>Active: {{isActive|boolean}}</span>           <!-- Yes/No -->

<!-- Icon formatting -->
<i class="{{type|icon}}"></i>                       <!-- Bootstrap icons -->
```

#### Utility Formatters

```html
<!-- Default values -->
<span>{{description|default('No description')}}</span>

<!-- JSON formatting (for debugging) -->
<pre>{{data|json}}</pre>

<!-- Check if value exists -->
{{#data|has('property')}}
  <p>Property exists</p>
{{/data|has('property')}}
```

## Conditional Rendering

### Basic Sections

Use `{{#section}}` for truthy values and `{{^section}}` for falsy values:

```html
<!-- Show content if user exists -->
{{#user}}
  <div class="user-info">
    <h2>Welcome, {{name}}!</h2>
  </div>
{{/user}}

<!-- Show content if user doesn't exist -->
{{^user}}
  <div class="no-user">
    <p>Please log in</p>
  </div>
{{/user}}

<!-- Boolean conditions -->
{{#isLoggedIn}}
  <button data-action="logout">Logout</button>
{{/isLoggedIn}}

{{^isLoggedIn}}
  <button data-action="login">Login</button>
{{/isLoggedIn}}
```

### Array and Object Existence

```html
<!-- Show content if array has items -->
{{#items.length}}
  <ul class="item-list">
    <!-- items content -->
  </ul>
{{/items.length}}

{{^items.length}}
  <p>No items found</p>
{{/items.length}}

<!-- Show content if object has properties -->
{{#user.preferences}}
  <div class="preferences">
    <!-- preferences content -->
  </div>
{{/user.preferences}}
```

## List Rendering and Iteration

### Special Iteration Syntax

MOJO provides special `|iter` syntax for iterating over arrays and objects:

#### Array Iteration

```html
<!-- Iterate over array -->
<ul class="todo-list">
  {{#.todos|iter}}
    <li class="todo-item {{#completed}}completed{{/completed}}">
      <input type="checkbox" {{#completed}}checked{{/completed}} 
             data-action="toggle-todo" data-id="{{id}}">
      <span class="text">{{text}}</span>
      <span class="priority priority-{{priority}}">{{priority|capitalize}}</span>
      <button data-action="delete-todo" data-id="{{id}}">Delete</button>
    </li>
  {{/.todos|iter}}
</ul>

{{^.todos|iter}}
  <p class="no-todos">No todos yet. Add one to get started!</p>
{{/.todos|iter}}
```

#### Object Iteration

```html
<!-- Iterate over object properties -->
<div class="user-metadata">
  {{#.user.metadata|iter}}
    <div class="meta-row">
      <strong class="meta-key">{{key|capitalize}}:</strong>
      <span class="meta-value">{{value}}</span>
    </div>
  {{/.user.metadata|iter}}
</div>

<!-- Complex object iteration with formatting -->
<div class="settings">
  {{#.settings|iter}}
    <div class="setting-item">
      <label>{{key|capitalize|truncate(20)}}</label>
      <span class="setting-value">
        {{#value|has('enabled')}}
          {{value.enabled|boolean}}
        {{/value|has('enabled')}}
        {{^value|has('enabled')}}
          {{value|default('Not set')}}
        {{/value|has('enabled')}}
      </span>
    </div>
  {{/.settings|iter}}
</div>
```

### Nested Iterations

```html
<!-- Categories with items -->
<div class="categories">
  {{#.categories|iter}}
    <div class="category">
      <h3>{{name}} ({{items.length}} items)</h3>
      {{#items|iter}}
        <div class="category-item">
          <span>{{title}}</span>
          <span class="price">{{price|currency}}</span>
        </div>
      {{/items|iter}}
    </div>
  {{/.categories|iter}}
</div>
```

## Template Context and Data Access

## Model Values + Pipes (Common Pattern)

When a `View` exposes a `model` (typically as `this.model`), templates can read model fields and apply formatters using pipe syntax, including formatter arguments.

```/dev/null/example.md#L1-12
<div>
  <div><strong>Name:</strong> {{model.name|uppercase}}</div>
  <div><strong>Revenue:</strong> {{model.total_revenue|currency}}</div>
  <div><strong>When:</strong> {{model.created_at|datetime}}</div>
  <div><strong>Status:</strong> {{{model.is_active|yesno_icon:'bi bi-check':'bi bi-x'}}}</div>
</div>
```

Notes:
- Pipes can be chained: `{{model.name|trim|uppercase}}`
- Dot notation works alongside pipes: `{{model.user.profile.name|uppercase}}`

### Context Hierarchy

Templates have access to the full view context:

```js
class ProductView extends View {
  constructor(options = {}) {
    super({
      data: {
        product: {
          name: 'Laptop',
          price: 999.99,
          specs: {
            cpu: 'Intel i7',
            ram: '16GB'
          }
        },
        user: {
          name: 'John Doe',
          preferences: {
            currency: 'USD'
          }
        }
      },
      ...options
    });
  }

  getDiscountedPrice() {
    return this.data.product.price * 0.9;
  }

  isOwner() {
    return this.data.user.id === this.data.product.ownerId;
  }
}
```

```html
<!-- Access all context levels -->
<div class="product-card">
  <!-- Direct data access -->
  <h2>{{data.product.name}}</h2>
  <p class="price">{{data.product.price|currency}}</p>
  
  <!-- Nested object access -->
  <div class="specs">
    <span>CPU: {{data.product.specs.cpu}}</span>
    <span>RAM: {{data.product.specs.ram}}</span>
  </div>
  
  <!-- Method calls -->
  <p class="discount">Sale Price: {{getDiscountedPrice|currency}}</p>
  
  <!-- Conditional based on methods -->
  {{#isOwner}}
    <button data-action="edit-product">Edit Product</button>
  {{/isOwner}}
  
  <!-- User context -->
  <p>Shopping as: {{data.user.name}}</p>
</div>
```

### Model Integration

When using models, access model data through the `model` context:

```html
<div class="user-profile">
  <!-- Model properties -->
  <h1>{{model.firstName}} {{model.lastName}}</h1>
  <img src="{{model.avatar|image(150, 150)}}" alt="{{model.firstName}} {{model.lastName}}">
  
  <!-- Model methods (if available) -->
  <p class="status">{{model.getStatus}}</p>
  <p class="member-since">Member since {{model.createdAt|date('MMMM YYYY')}}</p>
  
  <!-- Formatted model data -->
  <div class="contact">
    <a href="mailto:{{model.email}}">{{model.email|email}}</a>
    <a href="tel:{{model.phone}}">{{model.phone|phone}}</a>
  </div>
  
  <!-- Model relationships (if populated) -->
  {{#model.posts.length}}
    <h3>Recent Posts ({{model.posts.length}})</h3>
    <ul>
      {{#model.posts|iter}}
        <li>
          <a href="/posts/{{id}}">{{title}}</a>
          <span class="date">{{createdAt|date}}</span>
        </li>
      {{/model.posts|iter}}
    </ul>
  {{/model.posts.length}}
</div>
```

## Partial Templates

### Defining Partials

```js
class BlogPostView extends View {
  getPartials() {
    return {
      'post-header': `
        <header class="post-header">
          <h1>{{title}}</h1>
          <div class="post-meta">
            <span class="author">By {{author.name}}</span>
            <time class="date">{{publishedAt|date('MMMM D, YYYY')}}</time>
            <span class="read-time">{{readTime}} min read</span>
          </div>
        </header>
      `,
      
      'post-tags': `
        {{#tags.length}}
          <div class="post-tags">
            {{#tags|iter}}
              <span class="tag tag-{{.|slug}}">{{.|capitalize}}</span>
            {{/tags|iter}}
          </div>
        {{/tags.length}}
      `,
      
      'author-bio': `
        <div class="author-bio">
          <img src="{{author.avatar|avatar(60)}}" alt="{{author.name}}">
          <div class="author-info">
            <h4>{{author.name}}</h4>
            <p>{{author.bio|truncate(100)}}</p>
            <a href="/authors/{{author.id}}">View Profile</a>
          </div>
        </div>
      `,
      
      'social-share': `
        <div class="social-share">
          <h5>Share this post:</h5>
          <a href="https://twitter.com/intent/tweet?text={{title|url}}&url={{permalink|url}}"
             target="_blank" class="share-twitter">
            <i class="bi bi-twitter"></i> Twitter
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php?u={{permalink|url}}"
             target="_blank" class="share-facebook">
            <i class="bi bi-facebook"></i> Facebook
          </a>
        </div>
      `
    };
  }
}
```

### Using Partials

```html
<article class="blog-post">
  {{>post-header}}
  
  <div class="post-content">
    {{{content}}}
  </div>
  
  {{>post-tags}}
  {{>author-bio}}
  {{>social-share}}
  
  <footer class="post-footer">
    <p>Published {{publishedAt|relative}}</p>
  </footer>
</article>
```

### Dynamic Partials

```js
class DynamicView extends View {
  getPartials() {
    const partials = {
      'base-card': `
        <div class="card {{cardClass}}">
          <div class="card-body">
            {{>card-content}}
          </div>
        </div>
      `
    };

    // Add dynamic partials based on data
    if (this.data.type === 'user') {
      partials['card-content'] = `
        <img src="{{avatar|avatar(50)}}" alt="{{name}}">
        <h5>{{name}}</h5>
        <p>{{email}}</p>
      `;
    } else if (this.data.type === 'product') {
      partials['card-content'] = `
        <img src="{{image|image(100, 100)}}" alt="{{name}}">
        <h5>{{name}}</h5>
        <p class="price">{{price|currency}}</p>
      `;
    }

    return partials;
  }
}
```

## Custom Data Formatters

### Registering Custom Formatters

```js
import dataFormatter from '../utils/DataFormatter.js';

// Simple formatter
dataFormatter.register('reverse', (value) => {
  return typeof value === 'string' ? value.split('').reverse().join('') : value;
});

// Formatter with arguments
dataFormatter.register('wrap', (value, prefix = '[', suffix = ']') => {
  return `${prefix}${value}${suffix}`;
});

// Complex formatter
dataFormatter.register('highlight', (value, searchTerm) => {
  if (!searchTerm) return value;
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return value.replace(regex, '<mark>$1</mark>');
});

// Formatter with multiple arguments
dataFormatter.register('clamp', (value, min = 0, max = 100) => {
  const num = parseFloat(value);
  return Math.min(Math.max(num, min), max);
});
```

### Using Custom Formatters

```html
<!-- Simple custom formatter -->
<p>{{text|reverse}}</p>

<!-- With arguments -->
<span>{{status|wrap('(', ')')}}</span>
<span>{{priority|wrap}}</span>  <!-- Uses defaults: [priority] -->

<!-- Complex formatting -->
<div class="search-results">
  {{#results|iter}}
    <p>{{{title|highlight(../searchTerm)}}}</p>
    <p>{{{description|highlight(../searchTerm)|truncate(150)}}}</p>
  {{/results|iter}}
</div>

<!-- Chained with custom formatters -->
<span>{{score|clamp(0, 100)|number}} / 100</span>
```

### Advanced Custom Formatters

```js
// Formatter that returns objects for complex templates
dataFormatter.register('buttonStyle', (status) => {
  const styles = {
    active: { class: 'btn-success', icon: 'check-circle', text: 'Active' },
    inactive: { class: 'btn-danger', icon: 'x-circle', text: 'Inactive' },
    pending: { class: 'btn-warning', icon: 'clock', text: 'Pending' }
  };
  return styles[status] || styles.inactive;
});

// Date formatter with timezone support
dataFormatter.register('localDate', (value, format = 'YYYY-MM-DD', timezone = 'local') => {
  if (!value) return '';
  
  const date = new Date(value);
  if (timezone !== 'local') {
    // Apply timezone offset
    const offset = getTimezoneOffset(timezone);
    date.setMinutes(date.getMinutes() + offset);
  }
  
  return formatDate(date, format);
});

// Conditional formatter
dataFormatter.register('conditional', (value, condition, trueValue, falseValue = '') => {
  const meetsCondition = evaluateCondition(value, condition);
  return meetsCondition ? trueValue : falseValue;
});
```

```html
<!-- Using advanced formatters -->
<button class="btn {{status|buttonStyle.class}}" data-action="toggle-status">
  <i class="bi bi-{{status|buttonStyle.icon}}"></i>
  {{status|buttonStyle.text}}
</button>

<time>{{createdAt|localDate('MMM D, YYYY', 'UTC')}}</time>

<span class="{{value|conditional('> 100', 'text-success', 'text-muted')}}">
  {{value|number}}
</span>
```

## Advanced Template Features

### Context Variables

Access parent context in nested iterations:

```html
<div class="categories">
  {{#.categories|iter}}
    <h3>{{name}}</h3>
    <div class="items">
      {{#items|iter}}
        <div class="item" data-category="{{../name|slug}}">
          <h4>{{title}}</h4>
          <p>Category: {{../name}}</p>  <!-- Access parent context -->
          <p>Total items in category: {{../items.length}}</p>
        </div>
      {{/items|iter}}
    </div>
  {{/.categories|iter}}
</div>
```

### Complex Conditionals

```html
<!-- Multiple conditions -->
{{#user.isActive}}
  {{#user.isPremium}}
    <div class="premium-badge">Premium Member</div>
  {{/user.isPremium}}
  {{^user.isPremium}}
    <a href="/upgrade" class="upgrade-link">Upgrade to Premium</a>
  {{/user.isPremium}}
{{/user.isActive}}

{{^user.isActive}}
  <div class="inactive-notice">Account suspended</div>
{{/user.isActive}}

<!-- Using formatters in conditions -->
{{#score|conditional('> 80')}}
  <div class="high-score">Excellent!</div>
{{/score|conditional('> 80')}}
```

### Template Functions

```js
class AdvancedView extends View {
  // Template helper methods
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  generateUrl(path, params = {}) {
    const url = new URL(path, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }

  getRandomItems(array, count = 3) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}
```

```html
<div class="product-grid">
  {{#getRandomItems(data.products, 6)|iter}}
    <div class="product-card">
      <img src="{{image|image(200, 200)}}" alt="{{name}}">
      <h4>{{name}}</h4>
      <p class="price">{{../formatCurrency(price, 'USD')}}</p>
      <a href="{{../generateUrl('/product', {id: id})}}" class="btn btn-primary">
        View Details
      </a>
    </div>
  {{/getRandomItems(data.products, 6)|iter}}
</div>
```

## Performance Optimization

### Template Caching

```js
class OptimizedView extends View {
  constructor(options = {}) {
    super({
      cacheTemplate: true,  // Enable template caching
      renderCooldown: 50,   // Throttle rendering
      ...options
    });
  }

  // Override to implement smart rendering
  shouldRender(newData) {
    // Only re-render if data actually changed
    return JSON.stringify(newData) !== JSON.stringify(this.lastRenderedData);
  }

  async render(allowMount = true, container = null) {
    // Store data for comparison
    this.lastRenderedData = this.data ? JSON.parse(JSON.stringify(this.data)) : null;
    return super.render(allowMount, container);
  }
}
```

### Efficient Data Formatting

```js
// Pre-format expensive computations
class EfficientView extends View {
  async getViewData() {
    const data = await this.fetchData();
    
    // Pre-format data to avoid repeated template computations
    return {
      ...data,
      formattedItems: data.items.map(item => ({
        ...item,
        displayPrice: this.formatCurrency(item.price),
        displayDate: this.formatDate(item.createdAt),
        truncatedDescription: item.description.substring(0, 100) + '...'
      }))
    };
  }
}
```

```html
<!-- Use pre-formatted data -->
<div class="items">
  {{#formattedItems|iter}}
    <div class="item">
      <h4>{{title}}</h4>
      <p>{{displayPrice}}</p>
      <time>{{displayDate}}</time>
      <p>{{truncatedDescription}}</p>
    </div>
  {{/formattedItems|iter}}
</div>
```

## Best Practices

### 1. Keep Templates Logic-Free

```html
<!-- Good: Logic in view methods -->
<div class="status {{getStatusClass}}">{{getStatusText}}</div>

<!-- Bad: Logic in template -->
<div class="status {{#isActive}}active{{/isActive}}{{^isActive}}inactive{{/isActive}}">
  {{#isActive}}Active{{/isActive}}{{^isActive}}Inactive{{/isActive}}
</div>
```

### 2. Use Appropriate Formatters

```html
<!-- Good: Use built-in formatters -->
<span>{{price|currency}}</span>
<time>{{date|relative}}</time>

<!-- Good: Chain formatters logically -->
<p>{{description|truncate(150)|capitalize}}</p>

<!-- Bad: Over-formatting -->
<span>{{name|uppercase|lowercase|capitalize}}</span>
```

### 3. Structure Complex Templates

```html
<!-- Good: Use partials for complex sections -->
<article class="post">
  {{>post-header}}
  {{>post-content}}
  {{>post-footer}}
</article>

<!-- Good: Clear template organization -->
<div class="dashboard">
  <aside class="sidebar">
    {{>navigation-menu}}
  </aside>
  <main class="content">
    {{>main-content}}
  </main>
</div>
```

### 4. Handle Missing Data Gracefully

```html
<!-- Good: Provide defaults -->
<h1>{{title|default('Untitled')}}</h1>
<img src="{{avatar|default('/images/default-avatar.png')}}" alt="{{name|default('User')}}">

<!-- Good: Conditional rendering -->
{{#user.preferences}}
  <div class="preferences">
    {{>user-preferences}}
  </div>
{{/user.preferences}}

{{^user.preferences}}
  <p>No preferences set</p>
{{/user.preferences}}
```

### 5. Optimize for Performance

```js
// Register expensive formatters once
dataFormatter.register('expensiveFormat', (value) => {
  // Cache results if possible
  if (this.formatCache && this.formatCache.has(value)) {
    return this.formatCache.get(value);
  }
  
  const result = performExpensiveOperation(value);
  
  if (this.formatCache) {
    this.formatCache.set(value, result);
  }
  
  return result;
});

// Use efficient data structures
class View {
  constructor() {
    this.formatCache = new Map();
  }
}
```

This comprehensive guide covers all aspects of MOJO's templating system. The combination of Mustache templating with powerful data formatting provides a flexible and maintainable approach to building dynamic user interfaces.