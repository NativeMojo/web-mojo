# WEB-MOJO Framework Guide for AI Agents

You are an expert web developer specializing in WEB-MOJO - a modern, component-based JavaScript framework for building data-driven web applications.

> **Part of the MOJO Framework Family** - WEB-MOJO is the browser-based framework. Use this guide to build robust web applications using WEB-MOJO's architecture and patterns.

---

## 📚 Documentation

**Human-Readable Portal:** https://nativemojo.com/web-mojo/

**AI Agent Documentation (Raw Markdown - Read These):**

### Application Layer (Read First for New Projects)
- **WebApp:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/core/WebApp.md
- **PortalApp:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/core/PortalApp.md

### Core Concepts (Read Before Building Views)
- **Views:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/core/View.md
- **Templates:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/core/Templates.md ⚠️ **READ PITFALLS SECTION**
- **Models:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/core/Model.md
- **Collections:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/core/Collection.md
- **Events:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/core/Events.md
- **DataFormatter:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/core/DataFormatter.md

### Pages (Routed Screens)
- **Page:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/pages/Page.md

### Services (Read When Needed)
- **Rest:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/services/Rest.md
- **ToastService:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/services/ToastService.md
- **WebSocketClient:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/services/WebSocketClient.md

### Components (Read When Needed)
- **Dialog:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/components/Dialog.md
- **Sidebar & TopNav:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/components/SidebarTopNav.md
- **ListView:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/components/ListView.md
- **TableView:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/components/TableView.md
- **TablePage:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/components/TablePage.md
- **DataView:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/components/DataView.md

### Extensions (Read When Needed)
- **Charts:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/extensions/Charts.md
- **FileUpload:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/extensions/FileUpload.md
- **LightBox:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/extensions/LightBox.md
- **TimelineView:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/extensions/TimelineView.md
- **TabView:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/extensions/TabView.md
- **MapView:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/extensions/MapView.md
- **MapLibreView:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/extensions/MapLibreView.md
- **Location:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/extensions/Location.md
- **Admin:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/extensions/Admin.md

### Built-in Models (Read When Working with Portal Data)
- **Built-in Models (User, Group, Job, etc.):** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/models/BuiltinModels.md

### Utilities
- **MOJOUtils:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/utils/MOJOUtils.md

### Mixins
- **EventEmitter & EventDelegate:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/mixins/EventEmitter.md

### Advanced Topics (Read When Needed)
- **Child Views:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/core/ViewChildViews.md
- **Advanced Views:** https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/core/AdvancedViews.md

### When to Read What
- **Building a simple app?** → Read WebApp.md + View.md + Templates.md
- **Charts / data visualization?** → Read Charts.md (extensions)
- **Admin pages?** → Read Admin.md (extensions)
- **Maps / geolocation?** → Read MapView.md + Location.md (extensions)
- **Tab navigation?** → Read TabView.md (extensions)
- **Image lightbox?** → Read LightBox.md (extensions)
- **File uploads?** → Read FileUpload.md (extensions)
- **Timeline visualization?** → Read TimelineView.md (extensions)
- **Sidebar / TopNav / navigation?** → Read SidebarTopNav.md (components)
- **Homeless pages (page not in any sidebar menu)?** → Read SidebarTopNav.md#homeless-pages
- **Building a portal with auth + sidebar?** → Read PortalApp.md + Page.md + SidebarTopNav.md
- **Building a view?** → Read View.md + Templates.md
- **Working with data?** → Read Model.md or Collection.md
- **Adding child components?** → Read ViewChildViews.md
- **Creating a routed page?** → Read Page.md
- **HTTP requests / REST API?** → Read Rest.md
- **Modal dialogs?** → Read Dialog.md
- **Toast notifications?** → Read ToastService.md
- **Real-time / WebSocket?** → Read WebSocketClient.md
- **Data tables?** → Read TableView.md + TablePage.md
- **List components?** → Read ListView.md
- **Built-in User/Group/Job models?** → Read BuiltinModels.md
- **Complex patterns (Canvas/WebGL)?** → Read AdvancedViews.md
- **Event handling?** → Read Events.md + EventEmitter.md

**⚠️ CRITICAL: Always read Templates.md "Common Pitfalls" section to avoid mistakes!**

---

## 🎯 Core Principles (Quick Reference)

### KISS - Keep It Simple, Stupid
- Simple patterns over complex abstractions
- Readable code over clever code
- Convention over configuration
- Let the framework handle complexity

### Model-First Approach
- Use models directly in templates: `{{model.property}}`
- Avoid creating custom data structures
- Let formatters handle presentation: `{{model.price|currency}}`
- View methods only for complex computations

### Logic-Less Templates
- Business logic in views, not templates
- Formatters for display formatting
- View methods for computed values
- View instance IS the Mustache context

### Component Architecture
- Views are the building blocks
- Parent-child hierarchies via `addChild()`
- Event delegation with `data-action` attributes
- Lifecycle hooks for initialization and cleanup

---

## ⚡ Critical Rules (Must Follow)

### ❌ DO NOT
- **NO `getViewData()` or `get()` on views** - View instance IS the context passed to Mustache
- **NO `data-action` on `<form>` elements** - Use on submit button with `type="button"`
- **NO fetching data in `onAfterRender` or `onAfterMount`** - Causes re-render loops
- **NO manual render/mount when using `addChild()`** - Framework handles it
- **NO formatters in Chart.js config** - Use callbacks instead
- **NO missing `containerId` for child views** - Required for mounting
- **NO complex template logic** - Keep templates simple, logic in views
- **NO direct DOM manipulation outside lifecycle hooks** - Use framework patterns
- **NO manual event binding** - Use `data-action` attributes

### ✅ DO
- **USE `onInit()`** - For child views and initial setup (called once, lazy)
- **USE `data-action="action-name"`** - For all user interactions
- **USE `{{property|formatter}}`** - For data formatting in templates
- **USE View instance properties** - `this.property = value` exposes to templates
- **USE `addChild(childView)`** - With `containerId` for child components
- **USE triple braces `{{{html}}}`** - When formatters return HTML
- **USE Bootstrap 5.3** - For styling and components
- **USE Bootstrap Icons** - For icons

---

## 🏗️ Framework Architecture

### Core Components

**View** - Base component class
- Lifecycle hooks: `onInit`, `onBeforeRender`, `onAfterRender`, `onBeforeMount`, `onAfterMount`, `onBeforeDestroy`
- Template rendering with Mustache
- Event delegation via `data-action`
- Child view composition

**Model** - Single resource with CRUD operations
- REST API integration
- Validation and dirty tracking
- Event emitter (change, sync, destroy events)
- Automatic serialization

**Collection** - Ordered set of Models
- Fetch lists with pagination
- Query and filter methods
- Bulk operations
- Model lifecycle management

**Templates** - Mustache with 70+ formatters
- View instance as context
- Pipe syntax for formatters: `{{value|formatter:arg}}`
- Partials via `getPartials()`
- Logic-less by design

**EventDelegate** - Convention-based event handling
- `data-action="action-name"` in templates
- `onAction[ActionName](event, element)` handlers
- Automatic kebab-case to camelCase conversion
- Catch-all `onActionDefault(action, event, element)`

---

## 📝 Common Patterns

### View Setup Pattern

```javascript
import { View } from 'web-mojo';

class UserProfileView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="profile">
          <h2>{{model.name}}</h2>
          <p>{{model.email}}</p>
          <p>Member since: {{model.created_at|date}}</p>
          <button data-action="edit-profile">Edit</button>
        </div>
      `,
      ...options
    });
  }
  
  async onInit() {
    await super.onInit();
    // Initialize child views
    // Setup initial state
    // Called once before first render
  }
  
  async onBeforeRender() {
    await super.onBeforeRender();
    // Prepare data before each render
  }
  
  async onAfterRender() {
    await super.onAfterRender();
    // DOM is ready, query elements
    // Initialize plugins
    // NO DATA FETCHING HERE
  }
  
  async onActionEditProfile(event, element) {
    // Handle edit action
  }
}
```

### Child Views Pattern

```javascript
class ParentView extends View {
  template = `
    <div>
      <div data-container="header"></div>
      <div data-container="content"></div>
    </div>
  `;
  
  async onInit() {
    await super.onInit();
    
    // Create and add child views
    this.headerView = new HeaderView({ 
      model: this.model,
      containerId: 'header' // Maps to data-container="header"
    });
    this.addChild(this.headerView);
    
    this.contentView = new ContentView({ 
      model: this.model,
      containerId: 'content'
    });
    this.addChild(this.contentView);
    
    // Framework handles render/mount automatically
  }
}
```

### Template Patterns

```html
<!-- Property access -->
<h1>{{title}}</h1>
<p>{{description}}</p>

<!-- Model data with formatters -->
<p>{{model.price|currency}}</p>
<p>{{model.created_at|date:'MMM dd, YYYY'}}</p>
<p>{{model.description|truncate:100}}</p>

<!-- Boolean checks (MUST use |bool) -->
{{#model.is_active|bool}}
  <span class="badge-success">Active</span>
{{/model.is_active|bool}}

<!-- Iteration (use {{.property}} for current item) -->
{{#items}}
  <div>{{.name}} - {{.price|currency}}</div>
{{/items}}

<!-- HTML output (use triple braces) -->
{{{model.status|status}}}

<!-- Event handling -->
<button data-action="save-changes">Save</button>
<button data-action="delete-item" data-id="{{model.id}}">Delete</button>

<!-- Child view container -->
<div data-container="chart-container"></div>
```

### Model & Collection Pattern

```javascript
import { Model, Collection } from 'web-mojo';

class User extends Model {
  urlRoot = '/api/users';
  
  defaults() {
    return {
      name: '',
      email: '',
      is_active: true
    };
  }
  
  validate(attrs) {
    if (!attrs.email) {
      return 'Email is required';
    }
  }
}

class UserCollection extends Collection {
  url = '/api/users';
  model = User;
}

// Usage
const users = new UserCollection();
await users.fetch();

const user = new User({ id: 123 });
await user.fetch();
user.set('name', 'John Doe');
await user.save();
```

### Action Handler Patterns

```javascript
class MyView extends View {
  // Pattern 1: Specific action handler (preferred)
  async onActionSaveDraft(event, element) {
    const formData = this.getFormData();
    await this.model.save(formData);
  }
  
  // Pattern 2: Alternative naming
  async handleActionDeleteItem(event, element) {
    const id = element.getAttribute('data-id');
    await this.deleteItem(id);
  }
  
  // Pattern 3: Catch-all for unhandled actions
  async onActionDefault(action, event, element) {
    console.log('Unhandled action:', action);
  }
}
```

### Form Handling Pattern

```html
<!-- ✅ CORRECT: button type="button" with data-action -->
<form>
  <input type="text" name="username" required>
  <input type="email" name="email" required>
  <button type="button" data-action="submit-form">Submit</button>
</form>
```

```javascript
async onActionSubmitForm(event, element) {
  const form = element.closest('form');
  
  // Validate
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  // Get data
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  
  // Save
  this.model.set(data);
  await this.model.save();
}
```

---

## 🎨 Template Formatters

**70+ built-in formatters available via pipe syntax:**

```javascript
// Date & Time
{{date|date}}                          // Jan 15, 2024
{{date|date:'YYYY-MM-DD'}}            // 2024-01-15
{{date|datetime}}                      // Jan 15, 2024 2:30 PM
{{date|relative}}                      // 2 hours ago

// Numbers
{{count|number}}                       // 1,234
{{price|currency}}                     // $19.99
{{price|currency:'EUR'}}              // €19.99
{{ratio|percent}}                      // 75%
{{bytes|filesize}}                     // 1.2 MB

// Text
{{name|uppercase}}                     // JOHN DOE
{{name|lowercase}}                     // john doe
{{name|capitalize}}                    // John Doe
{{text|truncate:50}}                   // Truncate to 50 chars...
{{title|slug}}                         // my-blog-post

// HTML (use triple braces)
{{{html|nl2br}}}                      // Convert \n to <br>
{{{email|email}}}                      // Clickable email link
{{{url|url}}}                          // Clickable link
{{{status|status}}}                    // Status badge with icon

// Utility
{{value|default:'None'}}               // Fallback value
{{#items|bool}}Has items{{/items|bool}} // Boolean check
{{#obj|iter}}{{.key}}: {{.value}}{{/obj|iter}} // Object iteration
```

**⚠️ Critical Formatter Pitfalls:**
1. **Boolean checks NEED `|bool`** - Arrays/objects will iterate otherwise
2. **HTML output NEEDS `{{{}}}`** - Double braces escape HTML
3. **String args NEED quotes** - `{{date|date:'YYYY-MM-DD'}}`
4. **Iterations NEED `{{.}}`** - `{{.name}}` not `{{name}}`
5. **Objects NEED `|iter`** - To iterate key/value pairs

---

## 🗂️ Project Structure

```
web-mojo/
├── src/
│   ├── core/              # Core framework
│   │   ├── View.js
│   │   ├── Model.js
│   │   ├── Collection.js
│   │   └── ...
│   ├── extensions/        # Extensions (auth, charts, maps, etc.)
│   └── styles/           # CSS styles
├── docs/                  # Documentation
│   ├── core/             # Core concept docs
│   ├── features/         # Feature docs
│   └── components/       # Component docs
├── examples/             # Example projects
└── tests/                # Test suites
```

### File Naming Conventions

- **Classes:** PascalCase (UserView.js, HomePage.js)
- **Class names:** Match filename (class UserView extends View)
- **Actions:** kebab-case in HTML (data-action="my-action")
- **Handlers:** camelCase methods (onActionMyAction)
- **Containers:** kebab-case (data-container="my-container")

---

## 🛠️ Development Guidelines

### Code Style
- **Keep It Simple** - Don't overcomplicate things
- **Readable code** - Code should be self-documenting
- **Bootstrap 5.3** - Use Bootstrap CSS as much as possible
- **Bootstrap Icons** - Use for all icons
- **Framework patterns** - Let WEB-MOJO handle complexity

### What NOT to Write (Unless Asked)
- ❌ Tests (unless explicitly requested)
- ❌ Examples (unless explicitly requested)
- ❌ Documentation (unless explicitly requested)

### Directory Organization
- **Framework code** → `src/`
- **Example code** → `examples/`
- **Documentation** → `docs/`
- **Admin features** → `src/admin/`

### Best Practices
- **Child Views:** Use when part of template needs independent re-rendering
- **Partials:** Use `getPartials()` for reusable template fragments
- **Dialog:** Use `showDialog({body: view})` for modals
- **State:** Use WebApp state for global, local state for components
- **Async:** Use async/await consistently with proper error handling
- **Errors:** Always provide user feedback for operations

---

## 🚨 Common Mistakes to Avoid

### Template Mistakes
```javascript
// ❌ WRONG: Missing |bool on boolean check
{{#users}}
  <p>Has users</p>
{{/users}}

// ✅ CORRECT: Use |bool for boolean checks
{{#users|bool}}
  <p>Has users</p>
{{/users|bool}}

// ❌ WRONG: HTML escaped
{{status|status}}

// ✅ CORRECT: Use triple braces for HTML
{{{status|status}}}

// ❌ WRONG: Missing quotes on string arg
{{date|date:YYYY-MM-DD}}

// ✅ CORRECT: Wrap string args in quotes
{{date|date:'YYYY-MM-DD'}}

// ❌ WRONG: Missing {{.}} in iteration
{{#users}}
  <div>{{name}}</div>
{{/users}}

// ✅ CORRECT: Use {{.}} to access current item
{{#users}}
  <div>{{.name}}</div>
{{/users}}
```

### View Mistakes
```javascript
// ❌ WRONG: Fetching in onAfterRender causes re-render
async onAfterRender() {
  await super.onAfterRender();
  await this.fetchData(); // NO!
}

// ✅ CORRECT: Fetch in action or onInit
async onInit() {
  await super.onInit();
  await this.fetchData(); // OK
}

async onActionRefresh(event, element) {
  await this.fetchData(); // OK
}

// ❌ WRONG: Manual render/mount with addChild
const child = new ChildView();
this.addChild(child);
await child.render(); // NO! Framework does this
await child.mount(container); // NO!

// ✅ CORRECT: Let framework handle it
const child = new ChildView({ containerId: 'container' });
this.addChild(child); // Framework renders/mounts
```

### Form Mistakes
```html
<!-- ❌ WRONG: data-action on form -->
<form data-action="submit-form">
  <button type="submit">Submit</button>
</form>

<!-- ✅ CORRECT: data-action on button with type="button" -->
<form>
  <button type="button" data-action="submit-form">Submit</button>
</form>
```

---

## 🔧 REST Response Structure

The Rest class returns standardized responses:

```javascript
{
  success: boolean,    // HTTP success (200-299) vs failure (400+)
  status: number,      // HTTP status code (200, 404, 500, etc.)
  statusText: string,  // HTTP status text
  headers: object,     // Response headers
  data: object,        // Your API's JSON response
  errors: object,      // HTTP errors
  message: string      // HTTP error message
}
```

Your API response (in `response.data`):
```javascript
{
  status: boolean,  // Server success/failure
  data: object,     // Actual payload
  error: string,    // Server error message
  code: string      // Server error code
}
```

**Error handling pattern:**
```javascript
const response = await rest.POST('/api/endpoint', data);

// Check HTTP level
if (!response.success) {
  throw new Error(response.message || 'Network error');
}

// Check server response
if (!response.data.status) {
  throw new Error(response.data.error || 'Server error');
}

// Success - use the data
const result = response.data.data;
```

---

## 📖 Additional Resources

- **Main Documentation:** https://nativemojo.com/web-mojo/
- **GitHub Repository:** https://github.com/NativeMojo/web-mojo
- **NPM Package:** https://www.npmjs.com/package/web-mojo

---

## ⚡ Quick Troubleshooting

**Template not rendering?**
- Check if property exists on view: `console.log(this)`
- Model bound? Check `this.model`
- Using `{{model.property}}` syntax?

**Formatter not working?**
- Check spelling
- Using correct syntax: `{{value|formatter}}`
- String args in quotes: `{{date|date:'YYYY-MM-DD'}}`

**Child view not showing?**
- `containerId` matches `data-container` attribute?
- Called `addChild()`?
- Not calling manual render/mount?

**Action not firing?**
- `data-action` attribute present?
- Handler method exists: `onAction[ActionName]`?
- Handler is async?

---

**Remember: When in doubt, read the full documentation at the URLs above. The Templates.md "Common Pitfalls" section is especially important!**
