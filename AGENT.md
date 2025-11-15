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
- **Action naming**: Use kebab-case in HTML (data-action="my-action")
- **Container naming**: Use `data-container="name"` for child view containers
- **Template structure**: Keep templates focused and readable
- **Error handling**: Always provide user feedback for operations
- **Async patterns**: Use async/await consistently with proper error handling
- **State management**: Use WebApp state for global data, local state for component data

The core to the framework is the View class, which is responsible for rendering the UI and handling user interactions.

- We use a custom version of Mustache to render templates.
  We use this in conjunction with DataFormatter to provide robust template rendering.
- **KEEP IT SIMPLE.**
- We are using Bootstrap 5.3 and Bootstrap Icons.
- Try not to overcomplicate things.
- Try to keep your code clean and readable.
- Do not write examples, tests, or documentation without explicit instructions.
- All Framework code is in src
- All Example code is in examples
- All Documentation code is in docs/guide/
- DO NOT use getViewData or get method on a view,  We pass in the view as the context to Mustache.render.


## Technical Patterns & Best Practices

### Models and Collections

- Model = a single resource (CRUD, events, validation, dirty tracking)
- Collection = an ordered set of Models (fetch lists, paging, add/remove, parsing)

##### Related source:

- core Model: src/core/Model.js
- core Collection: src/core/Collection.js
- example model & collection: src/core/models/Group.js

### View Patterns
- **View Instance = Mustache Context**: The view (`this`) is passed to templates
- **Data Exposure**: Use `this.property = value` to expose data to templates
- **Child Views**: Use `addChild(childView)` with `containerId: 'container-name'`
- **Direct Rendering**: Use `view.render(true, container)` to mount directly to container
- **Template Containers**: Use `data-container="name"` in templates

### Action Handling System
- **Action Naming**: Use kebab-case in templates: `data-action="restart"`, `data-action="crop-complete"`
- **Handler Methods**: Framework converts kebab-case to camelCase method names
- **Handler Patterns**: For `data-action="restart"`, framework calls:
  1. `view.onActionRestart(event, element)` - preferred pattern
  2. `view.handleActionRestart(event, element)` - alternative pattern
  3. `view.onActionDefault(action,event, element)` - catch-all fallback
- **Handler Arguments**: All handlers receive `(event, element)` parameters
- **Method Signature**: `async onActionRestart(event, element) { /* implementation */ }`

```html
<!-- ✅ Template action usage -->
<button data-action="save-draft">Save Draft</button>
<button data-action="delete-item" data-id="123">Delete</button>
```

```js
// ✅ Handler implementation
async onActionSaveDraft(event, element) {
    // Handle save draft action
}

async onActionDeleteItem(event, element) {
    const itemId = element.getAttribute('data-id');
    // Handle delete with item ID
}

// ✅ Catch-all handler
async onActionDefault(action, event, element) {
    console.log('Unhandled action:', action);
}
```

### DataFormatter Usage

see docs/guide/DataFormatter.md 

#### Easily called from model instance:

```javascript
let model = new Transaction({id:1});
await Transaction.fetch();
// easily pipe values to a formatter
let amount = model.get("total_amount|currency")

```

### Template Patterns

- use triple '{{{VARIABLE}}}' when return HTML
- use '|' for piping and you can chain multiple times
- use ':' for formatter variables

```html
<!-- ✅ Direct property access -->
<h1>{{pageTitle}}</h1>
<p>{{stats.revenue|currency}}</p>
<p>{{{stats.is_approved|yesno_icon:'bi bi-check':'bi bi-x'}}}</p>

<!-- ✅ Child view container -->
<div data-container="chart-container"></div>
```

### Rendering Patterns
```js
// ✅ View data exposure
async onInit() {
	// this is where you should lazy initialize any child views, etc.
  // this is only called right before view usage
  // ✅ Child view with auto-mounting
  const childView = new MyView({ containerId: 'my-container' });
  this.addChild(childView);
}

```

// Anothe example of View overrides

```js
async onInit() {
  // Create child views
  // Setup initial state
}

async oBeforeRender() {

}

async onAfterRender() {
  // Only DOM access, no data fetching
  // Cache DOM elements if needed
}

// Follow-up fetches via actions
async onActionRefreshChart(event, element) {
  await this.fetchData();
}
```

### Rest Response Structure
**IMPORTANT**: Understanding the Rest class response format is critical for proper error handling.

The Rest class returns a standardized response object:
```js
{
  success: boolean,    // HTTP level success (200-299) vs failure (400+, network errors)
  status: number,      // HTTP status code (200, 404, 500, etc.)
  statusText: string,  // HTTP status text
  headers: object,     // Response headers
  data: object,        // The actual server JSON response (your API data)
  errors: object,      // HTTP level errors (network, parsing, etc.)
  message: string      // HTTP level error message
}
```

Your server responds with this format (stored in `response.data`):
```js
{
  status: boolean,  // true for success, false for server/business logic errors
  data: object,     // actual payload data
  error: string,    // server error message if any
  code: string      // server error code if any
}
```

**Error Handling Pattern**:
```js
const response = await rest.POST('/api/endpoint', data);

// Check HTTP level first
if (!response.success) {
    // Network error, 500, etc.
    throw new Error(response.message || 'Network error');
}

// Check server application response
if (!response.data.status) {
    // Business logic error, validation failure, etc.
    throw new Error(response.data.error || 'Server error');
}

// Success - use the actual data
const result = response.data.data;
```

## ❌ Common Mistakes to Avoid

- **NO `get()` methods** in views (breaks framework pattern)
- **NO manual render/mount** when using `addChild()`
- **NO MOJO formatters** in Chart.js config (use callbacks instead)
- **NO missing `containerId`** for child views
- **NO `dataFormatter.apply()`** - use `pipe()` instead
- **NO complex template logic** - keep templates simple, logic in views
- **NO direct DOM manipulation** - use framework patterns
- **NO incorrect action handlers** - use `onAction*` or `handleAction*` method naming
- **NO manual event binding** - use `data-action` attributes instead
- **NO onAfterMount**: This is not good, use onAfterRender so you have the rendered HTML vs just the mounted DOM element.
- **NO Fetching of Data in onAfterRender or onAfterMount**: This is not good, as typically the data fetch will cause a re-render, which can lead to performance issues and unexpected behavior.

## Framework Integration Notes

**USE onInit**: to build your child views and setup your initial state, this is only called once when the view is first used.

**Dev Server**: we are always running the dev server with browser console open to help with debugging.
**Keep It Simple**: Follow the framework patterns, let MOJO handle the complexity!
**Improve The Framework**: Let's improve the framework vs adding improvements to our examples or projects.

When building forms in html:
 - never put data-action on the form element
 - use data-action on the submit button instead, but make the submit button a button type="button" to avoid triggering a form submission

Use bootstrap 5 css as much as possible unless doing something unique then create our own css.

Use our Dialog where showDialog({body:view}) will show your view.
Keep admin views and pages inside the src/admin folder.

WE USE MUSTACHE for our templates.
We should break out our templates into child views if we think that area of the template would need rendering when the entire template does not.

Our Mustache version support built in data formatter via pipes. {{user.name|uppercase}} no need to call dataformatter directly

A views template renders with the view itself as the root context.
Mustache Partials can easily be provided by just overriding the views getPartials function.

IMPORTANT do not write tests or examples unless asked to.
