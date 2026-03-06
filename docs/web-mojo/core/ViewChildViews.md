# Child Views

**Composing complex UIs with parent-child view hierarchies**

Child views enable you to build complex UIs by composing smaller, reusable components. MOJO automatically manages the lifecycle of child views, ensuring they render, mount, and destroy in sync with their parents.

---

## Table of Contents

### Overview
- [What are Child Views?](#what-are-child-views)
- [Key Benefits](#key-benefits)
- [When to Use Child Views](#when-to-use-child-views)

### Quick Start
- [Basic Child View](#basic-child-view)
- [Multiple Children](#multiple-children)

### Core Concepts
- [Parent-Child Relationship](#parent-child-relationship)
- [Container Mapping](#container-mapping)
- [Automatic Lifecycle](#automatic-lifecycle)

### Adding Child Views
- [In onInit() (Recommended)](#in-oninit-recommended)
- [In Constructor (Alternative)](#in-constructor-alternative)
- [Setting containerId](#setting-containerid)

### API Reference
- [addChild()](#addchild)
- [removeChild()](#removechild)
- [getChild()](#getchild)

### Patterns
- [Composite Views](#composite-views)
- [appendChild Pattern](#appendchild-pattern)
- [Dynamic Children](#dynamic-children)
- [Conditional Children](#conditional-children)

### Template Requirements
- [Container Elements](#container-elements)
- [ID Matching](#id-matching)
- [Empty Templates](#empty-templates)

### Advanced Topics
- [Accessing Child Elements](#accessing-child-elements)
- [Child Communication](#child-communication)
- [Shared Models](#shared-models)

### Best Practices
- [Recommended Patterns](#recommended-patterns)
- [Performance Tips](#performance-tips-1)

### Common Pitfalls
- [Container Mismatches](#container-mismatches)
- [Lifecycle Timing](#lifecycle-timing)
- [Manual Rendering](#manual-rendering)

### Troubleshooting
- [Common Issues](#common-issues)

---

## What are Child Views?

**Child views** are View instances managed by a parent View. The parent controls when children render, mount, and destroy, creating a hierarchical component structure.

**Example hierarchy:**
```
DashboardView (parent)
├── HeaderView (child)
├── SidebarView (child)
└── ContentView (child)
    ├── ChartView (grandchild)
    └── TableView (grandchild)
```

---

## Key Benefits

- **Automatic lifecycle** - Children render/destroy with parent
- **Clean composition** - Build complex UIs from simple parts
- **Reusability** - Use same child in multiple parents
- **Encapsulation** - Each view manages its own logic
- **Memory safety** - Automatic cleanup prevents leaks

---

## When to Use Child Views

Use child views when:
- Building composite UIs (headers, sidebars, content areas)
- Reusing components across pages
- Managing complex state in isolated components
- Creating dashboard widgets
- Implementing tabs, accordions, or modal content

---

## Basic Child View

Create a parent with a single child:

```javascript
import { View } from 'web-mojo/core';

class HeaderView extends View {
  constructor(options = {}) {
    super({
      template: `
        <header>
          <h1>{{title}}</h1>
        </header>
      `,
      ...options
    });
    
    this.title = 'My App';
  }
}

class PageView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="page">
          <div id="header-container"></div>
          <main>Page content</main>
        </div>
      `,
      ...options
    });
  }
  
  async onInit() {
    await super.onInit();
    
    // Add child view
    const header = new HeaderView({ containerId: 'header-container' });
    this.addChild(header);
  }
}

// Usage
const page = new PageView();
await page.render();
await page.mount(document.body);
// HeaderView automatically renders inside PageView!
```

---

## Multiple Children

Add multiple children to create composite UIs:

```javascript
class DashboardView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="dashboard">
          <div id="header"></div>
          <div id="sidebar"></div>
          <div id="content"></div>
        </div>
      `,
      ...options
    });
  }
  
  async onInit() {
    await super.onInit();
    
    // Add multiple children
    const header = new HeaderView({ containerId: 'header' });
    this.addChild(header);
    
    const sidebar = new SidebarView({ containerId: 'sidebar' });
    this.addChild(sidebar);
    
    const content = new ContentView({ containerId: 'content' });
    this.addChild(content);
  }
}
```

---

## Parent-Child Relationship

When you add a child view:
1. Child's `parent` property set to parent view
2. Parent's `children` object gains the child (by ID)
3. Child inherits parent's `app` reference (if any)
4. Child inherits parent's `model` (if any)

```javascript
class ParentView extends View {
  async onInit() {
    const child = new ChildView({ containerId: 'container' });
    this.addChild(child);
    
    console.log(child.parent === this);  // true
    console.log(this.children[child.id] === child);  // true
  }
}
```

---

## Container Mapping

**Children need containers in parent's template.**

Each child's `containerId` must match an element ID in the parent's template:

```javascript
// Parent template defines containers
template = `
  <div>
    <div id="header-slot"></div>
    <div id="content-slot"></div>
  </div>
`;

// Children map to containers
async onInit() {
  const header = new HeaderView({ containerId: 'header-slot' });
  this.addChild(header);
  
  const content = new ContentView({ containerId: 'content-slot' });
  this.addChild(content);
}
```

**How it works:**
1. Parent renders its template
2. Parent finds `<div id="header-slot">`
3. Child's element replaces container's children
4. Child is now visible in parent's DOM

---

## Automatic Lifecycle

Children automatically follow parent's lifecycle:

```javascript
const parent = new ParentView();
// Parent constructs

await parent.onInit();
// Parent's onInit() → adds children

await parent.render();
// 1. Parent renders its template
// 2. Children render automatically
// 3. Children mount into parent's containers

await parent.destroy();
// 1. Children destroy automatically
// 2. Parent destroys
```

**You never manually call:**
- `child.render()` - Parent does this
- `child.mount()` - Parent does this
- `child.destroy()` - Parent does this

---

## In onInit() (Recommended)

**Recommended: Add children in `onInit()` for lazy loading.**

```javascript
class DashboardView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="dashboard">
          <div id="header"></div>
          <div id="sidebar"></div>
          <div id="content"></div>
        </div>
      `,
      ...options
    });
  }
  
  async onInit() {
    await super.onInit();
    
    // ✅ PREFERRED - Lazy loading
    // Children only created when view is about to render
    const header = new HeaderView({ 
      containerId: 'header'
    });
    this.addChild(header);
    
    const sidebar = new SidebarView({ 
      containerId: 'sidebar'
    });
    this.addChild(sidebar);
    
    const content = new ContentView({ 
      model: this.model,  // Share parent's model
      containerId: 'content'
    });
    this.addChild(content);
  }
}
```

**Why `onInit()`?**
- Called once, right before first render
- Lazy loading - children only created when needed
- Prevents creating unused views
- Recommended for views with many or expensive children

---

## In Constructor (Alternative)

**Alternative: Add children in constructor for simple cases.**

```javascript
class SimpleView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div>
          <div id="header"></div>
        </div>
      `,
      ...options
    });
    
    // ✅ Also valid - Simpler for basic cases
    const header = new HeaderView({ containerId: 'header' });
    this.addChild(header);
  }
}
```

**When to use constructor:**
- Simple views with few children
- Children are always needed
- No async setup required

**When to use onInit():**
- Many children
- Expensive child creation
- Async setup needed
- Lazy loading optimization desired

---

## Setting containerId

**Preferred: Set `containerId` in constructor options.**

```javascript
// ✅ BEST - Clean and explicit
const child = new ChildView({ 
  containerId: 'container',
  model: this.model
});
this.addChild(child);

// ✅ Also works - But less clean
const child = new ChildView();
this.addChild(child);
child.containerId = 'container';
```

**Constructor options is preferred because:**
- All configuration in one place
- More readable
- Follows MOJO conventions
- Easier to refactor

---

## addChild()

Adds a child view with automatic lifecycle management.

**Signature:**
```javascript
addChild(childView) → View
```

**Parameters:**
- `childView` (View) - Child view instance

**Returns:**
- `View` - The child view instance

**Example:**
```javascript
async onInit() {
  const child = new ChildView({ 
    containerId: 'child-container',
    model: this.model
  });
  this.addChild(child);
  
  // Store reference if needed
  this.headerView = child;
}
```

**What happens:**
- Child's `parent` set to this view
- Child added to `this.children[child.id]`
- Child inherits parent's `app` and `model` (if set)
- Child will render when parent renders

---

## removeChild()

Removes and destroys a child view.

**Signature:**
```javascript
removeChild(idOrView) → View
```

**Parameters:**
- `idOrView` (String | View) - Child view ID or instance

**Returns:**
- `View` - The parent view instance

**Example:**
```javascript
// Remove by instance
this.removeChild(this.headerView);

// Remove by ID
this.removeChild('child-view-123');

// Remove from action handler
async onActionClosePanel() {
  if (this.panelView) {
    this.removeChild(this.panelView);
    this.panelView = null;
  }
  return true;
}
```

**What happens:**
- Child is destroyed (calls `child.destroy()`)
- Child removed from `this.children`
- Child's element removed from DOM

---

## getChild()

Gets a child view by ID.

**Signature:**
```javascript
getChild(id) → View | undefined
```

**Parameters:**
- `id` (String) - Child view ID

**Returns:**
- `View | undefined` - The child view or undefined if not found

**Example:**
```javascript
// Get child by ID
const header = this.getChild('header-view-123');
if (header) {
  header.addClass('highlighted');
}

// Check if child exists
if (this.getChild('sidebar-id')) {
  console.log('Sidebar is present');
}

// Iterate all children
for (const id in this.children) {
  const child = this.children[id];
  console.log('Child:', child.constructor.name);
}
```

---

## Composite Views

Build complex UIs from smaller, focused components:

```javascript
class UserProfileView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="user-profile">
          <div id="avatar"></div>
          <div id="info"></div>
          <div id="activity"></div>
        </div>
      `,
      ...options
    });
  }
  
  async onInit() {
    await super.onInit();
    
    // Each child handles its own logic
    this.avatarView = new UserAvatarView({ 
      model: this.model,
      containerId: 'avatar'
    });
    this.addChild(this.avatarView);
    
    this.infoView = new UserInfoView({ 
      model: this.model,
      containerId: 'info'
    });
    this.addChild(this.infoView);
    
    this.activityView = new UserActivityView({ 
      model: this.model,
      containerId: 'activity'
    });
    this.addChild(this.activityView);
  }
}
```

**Benefits:**
- Each view is focused and testable
- Easy to reuse components
- Clear separation of concerns
- Model changes update all children automatically

---

## appendChild Pattern

For dynamic children without fixed containers, append directly:

```javascript
class NotificationCenterView extends View {
  constructor(options = {}) {
    super({
      template: `<div class="notifications"></div>`,
      ...options
    });
    
    this.notifications = [];
  }
  
  async onInit() {
    await super.onInit();
    
    // Listen for new notifications
    this.on('notification:new', (data) => {
      this.addNotification(data);
    });
  }
  
  addNotification(data) {
    const notif = new NotificationView({ data });
    this.addChild(notif);
    
    // No containerId - append directly
    this.element.appendChild(notif.element);
    notif.render();
    
    this.notifications.push(notif);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeChild(notif);
      this.notifications = this.notifications.filter(n => n !== notif);
    }, 5000);
  }
}
```

**When to use:**
- Dynamic lists of items
- Notifications/toasts
- Items without fixed positions
- Full control over DOM insertion needed

---

## Dynamic Children

Add/remove children based on state:

```javascript
class ConditionalPanelView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div>
          <button data-action="toggle-advanced">Toggle Advanced</button>
          <div id="basic-panel"></div>
          <div id="advanced-panel"></div>
        </div>
      `,
      ...options
    });
    
    this.showAdvanced = false;
  }
  
  async onInit() {
    await super.onInit();
    
    // Always show basic
    this.basicPanel = new BasicPanelView({ containerId: 'basic-panel' });
    this.addChild(this.basicPanel);
    
    // Conditionally show advanced
    if (this.showAdvanced) {
      this.showAdvancedPanel();
    }
  }
  
  showAdvancedPanel() {
    if (!this.advancedPanel) {
      this.advancedPanel = new AdvancedPanelView({ 
        containerId: 'advanced-panel' 
      });
      this.addChild(this.advancedPanel);
      this.advancedPanel.render();
    }
  }
  
  hideAdvancedPanel() {
    if (this.advancedPanel) {
      this.removeChild(this.advancedPanel);
      this.advancedPanel = null;
    }
  }
  
  async onActionToggleAdvanced() {
    this.showAdvanced = !this.showAdvanced;
    
    if (this.showAdvanced) {
      this.showAdvancedPanel();
    } else {
      this.hideAdvancedPanel();
    }
    
    return true;
  }
}
```

---

## Conditional Children

Show/hide children based on permissions or state:

```javascript
class DashboardView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="dashboard">
          <div id="header"></div>
          <div id="content"></div>
          <div id="admin-panel"></div>
        </div>
      `,
      ...options
    });
  }
  
  async onInit() {
    await super.onInit();
    
    // Always add header and content
    const header = new HeaderView({ containerId: 'header' });
    this.addChild(header);
    
    const content = new ContentView({ containerId: 'content' });
    this.addChild(content);
    
    // Conditionally add admin panel
    if (this.isAdmin()) {
      const adminPanel = new AdminPanelView({ containerId: 'admin-panel' });
      this.addChild(adminPanel);
    }
  }
  
  isAdmin() {
    return this.model?.get('role') === 'admin';
  }
}
```

---

## Container Elements

**Parent templates MUST have container elements for children.**

```javascript
// ✅ CORRECT - Has container elements
class ParentView extends View {
  template = `
    <div class="parent">
      <div id="child1-container"></div>
      <div id="child2-container"></div>
    </div>
  `;
  
  async onInit() {
    const child1 = new ChildView({ containerId: 'child1-container' });
    this.addChild(child1);
    
    const child2 = new ChildView({ containerId: 'child2-container' });
    this.addChild(child2);
  }
}
```

---

## ID Matching

**`containerId` must exactly match template element ID.**

```javascript
// ✅ CORRECT - IDs match
template = `<div id="sidebar-container"></div>`;

async onInit() {
  const sidebar = new SidebarView({ 
    containerId: 'sidebar-container'  // ✓ Matches
  });
  this.addChild(sidebar);
}

// ❌ WRONG - IDs don't match
template = `<div id="sidebar"></div>`;

async onInit() {
  const sidebar = new SidebarView({ 
    containerId: 'sidebar-container'  // ✗ No match! Error!
  });
  this.addChild(sidebar);
}
```

**Case sensitive:** `header` ≠ `Header` ≠ `HEADER`

---

## Empty Templates

**For `appendChild()` only, template can be empty string.**

```javascript
// ✅ CORRECT - Empty template for appendChild-only
class ListContainerView extends View {
  template = ``;  // Empty string OK
  
  async onInit() {
    // Add children with appendChild
    for (const item of this.items) {
      const itemView = new ItemView({ data: item });
      this.addChild(itemView);
      this.element.appendChild(itemView.element);
      itemView.render();
    }
  }
}

// ❌ WRONG - Template is null/undefined
template = null;  // ERROR!
template = undefined;  // ERROR!

// ✅ CORRECT - Minimal template if needed
template = `<div class="container"></div>`;
```

**Template rules:**
- Template MUST be defined (not null/undefined)
- Can be empty string `""` if using `appendChild()` only
- Must have container elements if using `containerId` pattern

---

## Accessing Child Elements

Get container elements after render (in `onAfterRender` or later):

```javascript
class ParentView extends View {
  template = `
    <div>
      <div id="header-container"></div>
      <div data-container="content"></div>
      <div id="footer-container"></div>
    </div>
  `;
  
  async onAfterRender() {
    await super.onAfterRender();
    
    // ✅ Get elements AFTER render (DOM exists)
    const header = this.getChildElementById('header-container');
    const content = this.getChildElement('content');
    const footer = this.getChildElementById('footer-container');
    
    // Use elements for manual DOM manipulation
    if (header) {
      header.classList.add('initialized');
    }
  }
  
  // ❌ WRONG - Elements don't exist in onInit
  async onInit() {
    const el = this.getChildElementById('header');  // Won't work!
  }
}
```

**Important:** DOM queries only work after `render()` completes.

---

## Child Communication

Children can communicate with parents via events:

```javascript
class ChildView extends View {
  async onActionItemClicked() {
    // Emit event to parent
    this.parent.emit('child:item-clicked', { 
      itemId: this.itemId 
    });
    return true;
  }
}

class ParentView extends View {
  async onInit() {
    await super.onInit();
    
    // Listen for child events
    this.on('child:item-clicked', ({ itemId }) => {
      console.log('Child clicked item:', itemId);
      this.handleItemClick(itemId);
    });
    
    // Add child
    const child = new ChildView({ containerId: 'child' });
    this.addChild(child);
  }
  
  handleItemClick(itemId) {
    // Handle the click
  }
}
```

---

## Shared Models

Share parent's model with children:

```javascript
class ParentView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div>
          <div id="details"></div>
          <div id="activity"></div>
        </div>
      `,
      model: options.model,  // Parent has model
      ...options
    });
  }
  
  async onInit() {
    await super.onInit();
    
    // Children automatically get parent's model
    const details = new DetailsView({ 
      model: this.model,  // Share parent's model
      containerId: 'details'
    });
    this.addChild(details);
    
    const activity = new ActivityView({ 
      model: this.model,  // Share parent's model
      containerId: 'activity'
    });
    this.addChild(activity);
  }
}

// When parent's model changes, all children re-render
parent.model.set('status', 'active');  // All children update!
```

---

## Recommended Patterns

1. **Add children in `onInit()`** for lazy loading
2. **Set `containerId` in constructor** for clarity
3. **Store references** if you need to interact with children
4. **Share models** for consistency
5. **Let parent manage lifecycle** - don't manually render/destroy children

```javascript
// ✅ BEST PRACTICES
class BestPracticeView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div>
          <div id="header"></div>
          <div id="content"></div>
        </div>
      `,
      ...options
    });
  }
  
  async onInit() {
    await super.onInit();
    
    // ✅ Lazy loading in onInit
    // ✅ containerId in constructor
    // ✅ Share model
    // ✅ Store reference
    this.headerView = new HeaderView({ 
      model: this.model,
      containerId: 'header'
    });
    this.addChild(this.headerView);
    
    this.contentView = new ContentView({ 
      model: this.model,
      containerId: 'content'
    });
    this.addChild(this.contentView);
  }
  
  // ✅ Interact with child when needed
  async onActionRefresh() {
    // Model change will automatically update children
    await this.model.fetch();
    return true;
  }
}
```

---

## Performance Tips

1. **Use `onInit()` for expensive children**
   ```javascript
   async onInit() {
     // Only created when view renders
     this.addChild(new ExpensiveChartView({ containerId: 'chart' }));
   }
   ```

2. **Conditional loading**
   ```javascript
   async onInit() {
     if (this.needsAdvanced) {
       this.addChild(new AdvancedView({ containerId: 'advanced' }));
     }
   }
   ```

3. **Reuse children instead of recreating**
   ```javascript
   // ✅ Good - Reuse
   showPanel() {
     if (!this.panelView) {
       this.panelView = new PanelView({ containerId: 'panel' });
       this.addChild(this.panelView);
     }
     this.panelView.element.style.display = 'block';
   }
   
   // ❌ Avoid - Recreate every time
   showPanel() {
     this.panelView = new PanelView({ containerId: 'panel' });
     this.addChild(this.panelView);
   }
   ```

---

## Container Mismatches

```javascript
// ❌ WRONG - containerId doesn't match template
class BadView extends View {
  template = `<div id="wrong-id"></div>`;
  
  async onInit() {
    const child = new ChildView({ containerId: 'child-container' });
    this.addChild(child);  // ERROR: Element not found!
  }
}

// ✅ CORRECT - IDs match
class GoodView extends View {
  template = `<div id="child-container"></div>`;
  
  async onInit() {
    const child = new ChildView({ containerId: 'child-container' });
    this.addChild(child);  // ✓ Works!
  }
}
```

---

## Lifecycle Timing

```javascript
// ❌ WRONG - DOM queries in onInit
class BadView extends View {
  async onInit() {
    const el = this.getChildElementById('test');  // Won't work!
    // Template not rendered yet
  }
}

// ✅ CORRECT - DOM queries in onAfterRender
class GoodView extends View {
  async onAfterRender() {
    const el = this.getChildElementById('test');  // ✓ Works!
    // Template is rendered, DOM exists
  }
}
```

---

## Manual Rendering

```javascript
// ❌ WRONG - Manually rendering children
class BadView extends View {
  async onAfterRender() {
    await this.childView.render();  // Don't do this!
  }
}

// ✅ CORRECT - Let parent handle it
class GoodView extends View {
  async onInit() {
    const child = new ChildView({ containerId: 'container' });
    this.addChild(child);
    // Child renders automatically when parent renders
  }
}
```

---

## Common Issues

### Child doesn't render

**Check:**
- `containerId` matches template element ID
- Parent template has container element
- Parent is rendering
- No errors in console

```javascript
console.log('Child containerId:', child.containerId);
console.log('Parent template:', this.template);
console.log('Children:', this.children);
```

---

### "Element not found" error

**Cause:** `containerId` doesn't match any element in parent's template.

**Fix:** Ensure IDs match exactly (case-sensitive):
```javascript
// Template
template = `<div id="my-container"></div>`;

// Child
const child = new ChildView({ containerId: 'my-container' });
```

---

### Changes to child not visible

**Check:**
- Child is actually added: `console.log(parent.children)`
- Parent has rendered: `console.log(parent.isMounted())`
- Child template is correct
- No CSS hiding the child

---

## Summary

Child views enable clean component composition in MOJO:

**Key Points:**
- Add children in `onInit()` for lazy loading
- Set `containerId` in constructor options
- Parent template must have matching container elements
- Children render/destroy automatically with parent
- Share models for automatic updates

**Recommended Pattern:**
```javascript
class ParentView extends View {
  template = `<div id="child-container"></div>`;
  
  async onInit() {
    const child = new ChildView({ 
      model: this.model,
      containerId: 'child-container'
    });
    this.addChild(child);
  }
}
```

For core View concepts, see [View.md](./View.md).  
For advanced patterns, see [AdvancedViews.md](./AdvancedViews.md).
