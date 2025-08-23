# MOJO Framework Development Guide for AI

You are an expert web developer specializing in the MOJO framework - a modern, component-based JavaScript framework for building web applications. Use this comprehensive guide to help developers build robust web applications using MOJO's architecture and patterns.

## Framework Overview

MOJO is a lightweight, event-driven framework built around these core principles:
- **Component-based architecture** with hierarchical parent-child relationships
- **Event-driven programming** with automatic action handling
- **Declarative templates** using Mustache templating
- **RESTful data management** with Models and Collections
- **Page-based routing** for single-page applications
- **Lifecycle management** with automatic cleanup


: Use PascalCase for class files (UserView.js, HomePage.js)
- **Class naming**: Match filename (class UserView extends View)
- **Action naming**: Use kebab-case in HTML, camelCase in handlers
- **Container naming**: Use `data-container="name"` for child view containers
- **Template structure**: Keep templates focused and readable
- **Error handling**: Always provide user feedback for operations
- **Async patterns**: Use async/await consistently with proper error handling
- **State management**: Use WebApp state for global data, local state for component data

The core to the framework is the View class, which is responsible for rendering the UI and handling user interactions.

We use a custom version of Mustache to render templates.
We use this in conjunction with DataFormatter to provide robust template rendering.

KEEP IT SIMPLE.

We are using Bootstrap 5.3 and Bootstrap Icons.
Try not to overcomplicate things.
Try to keep your code clean and readable.
Do not write examples, tests, or documentation without explicit instructions.
All Framework code is in src
All Example code is in examples
All Documentation code is in docs/guide/

DO NOT use getViewData or get method on a view,  We pass in the view as the context to Mustache.render.

## Technical Patterns & Best Practices

### View Patterns
- **View Instance = Mustache Context**: The view (`this`) is passed to templates
- **Data Exposure**: Use `this.property = value` to expose data to templates
- **Child Views**: Use `addChild(childView)` with `containerId: 'container-name'`
- **Direct Rendering**: Use `view.render(true, container)` to mount directly to container
- **Template Containers**: Use `data-container="name"` in templates

### DataFormatter Usage
- **Import Singleton**: `import dataFormatter from '../utils/DataFormatter.js'`
- **Use `pipe()` Method**: `dataFormatter.pipe(value, 'currency')` ✅ not `apply()`
- **Simple Formatter Names**: `'currency'` ✅ not `'currency:USD'`
- **Chart Integration**: Use Chart.js callbacks, don't pass formatter strings to config

### Template Patterns
```html
<!-- ✅ Direct property access -->
<h1>{{pageTitle}}</h1>
<p>{{stats.revenue}}</p>

<!-- ✅ Child view container -->
<div data-container="chart-container"></div>
```

### Chart Component Integration
```js
// ✅ Simple configuration
const chart = new SeriesChart({
    title: 'Revenue',
    data: chartData,
    yAxis: { formatter: 'currency', label: 'Revenue ($)' },
    tooltip: { y: 'currency' },
    containerId: 'revenue-chart'  // For addChild()
});

// ✅ Add to parent
this.addChild(chart);
```

### Rendering Patterns
```js
// ✅ View data exposure
async onInit() {
    this.data = { /* complex data */ };
    this.stats = this.data.stats;  // Flatten for templates
}

// ✅ Child view with auto-mounting
const childView = new MyView({ containerId: 'my-container' });
this.addChild(childView);

// ✅ Direct container rendering  
const view = new MyView();
view.render(true, containerElement);

// ✅ DataFormatter usage
const formatted = dataFormatter.pipe(value, 'currency|truncate(10)');
```

## ❌ Common Mistakes to Avoid

- **NO `get()` methods** in views (breaks framework pattern)
- **NO manual render/mount** when using `addChild()` 
- **NO MOJO formatters** in Chart.js config (use callbacks instead)
- **NO missing `containerId`** for child views
- **NO `dataFormatter.apply()`** - use `pipe()` instead
- **NO complex template logic** - keep templates simple, logic in views
- **NO direct DOM manipulation** - use framework patterns

## Framework Integration Notes

**Keep It Simple**: Follow the framework patterns, let MOJO handle the complexity!
