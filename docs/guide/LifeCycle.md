# View and Page Lifecycle Guide

## Overview

MOJO is an **MVC framework** with a strict lifecycle pattern. Understanding when to perform different operations is critical for building robust applications.

## Core Principle

**Create children in `onInit()`, update state in `onBeforeRender()`, let the framework handle rendering.**

## View/Page Lifecycle Hooks

The lifecycle proceeds in this order:

```
Constructor
    ↓
onInit()           ← CREATE CHILD VIEWS HERE
    ↓
onBeforeRender()   ← UPDATE STATE/MODELS HERE
    ↓
render() [framework]
    ↓
onAfterRender()    ← DOM manipulation, plugin init
    ↓
onBeforeMount()
    ↓
mount() [framework]
    ↓
onAfterMount()     ← Focus elements, start animations
    ↓
... user interaction ...
    ↓
onBeforeDestroy()  ← Cleanup, save state
    ↓
destroy() [framework]
    ↓
onAfterDestroy()   ← Final cleanup
```

## Lifecycle Hooks Explained

### `onInit()`

**Purpose**: Create and register child views

**When**: Called once during construction

**Use for**:
- Creating child views
- Adding child views with `this.addChild()`
- Setting up initial component structure
- Registering event listeners on the eventBus

**NEVER**:
- Set models on child views (do in `onBeforeRender`)
- Render child views (framework handles this)
- Make API calls (do in `onEnter` for Pages)
- Manipulate DOM (do in `onAfterRender`)

```javascript
class DashboardPage extends Page {
  constructor(options = {}) {
    super({
      template: `
        <div>
          <div id="stats-container"></div>
          <div id="table-container"></div>
        </div>
      `,
      ...options
    });
  }

  async onInit() {
    await super.onInit();

    // Create child views once
    this.statsView = new StatsView({
      containerId: 'stats-container'
    });
    this.addChild(this.statsView);

    this.tableView = new TableView({
      containerId: 'table-container'
    });
    this.addChild(this.tableView);
  }

  async onBeforeRender() {
    await super.onBeforeRender();

    // Update models/collections before each render
    const data = await this.fetchDashboardData();
    this.statsView.setData(data.stats);
    this.tableView.setCollection(data.collection);
  }
}
```

### `onBeforeRender()`

**Purpose**: Update state and data before rendering

**When**: Called before every render operation

**Use for**:
- Setting/updating models on views with `setModel()`
- Setting/updating collections on views with `setCollection()`
- Setting data with `setData()`
- Preparing render data
- Validation before render

**Example**:

```javascript
class UserProfileView extends View {
  async onInit() {
    await super.onInit();

    this.formView = new FormView({
      containerId: 'form-container',
      formConfig: { fields: [...] }
    });
    this.addChild(this.formView);
  }

  async onBeforeRender() {
    await super.onBeforeRender();

    // Update the form's model before each render
    const user = this.getApp().currentUser;
    this.formView.setModel(user);
  }
}
```

### `onAfterRender()`

**Purpose**: DOM manipulation and plugin initialization after rendering

**When**: Called after every render operation, DOM is ready

**Use for**:
- Initializing third-party plugins
- DOM manipulation
- Binding custom event listeners
- Setting up charts, maps, rich text editors

```javascript
class ChartView extends View {
  async onAfterRender() {
    await super.onAfterRender();

    // Initialize chart after DOM is ready
    const canvas = this.element.querySelector('canvas');
    this.chart = new Chart(canvas, this.chartConfig);
  }

  async onBeforeDestroy() {
    await super.onBeforeDestroy();

    // Clean up chart
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
```

### `onBeforeMount()` / `onAfterMount()`

**Purpose**: Operations related to mounting into DOM

**When**: Called when view is attached to document

**Use for**:
- `onBeforeMount`: Pre-mount setup
- `onAfterMount`: Focus management, animations, scroll position

```javascript
class ModalView extends View {
  async onAfterMount() {
    await super.onAfterMount();

    // Focus first input after modal is mounted
    const firstInput = this.element.querySelector('input');
    if (firstInput) {
      firstInput.focus();
    }
  }
}
```

### `onBeforeDestroy()` / `onAfterDestroy()`

**Purpose**: Cleanup before and after destruction

**When**: Called when view is being destroyed

**Use for**:
- Removing event listeners
- Cleaning up third-party plugins
- Saving state
- Clearing timers/intervals

```javascript
class LiveDataView extends View {
  async onInit() {
    await super.onInit();

    // Start polling
    this.pollInterval = setInterval(() => {
      this.refresh();
    }, 5000);
  }

  async onBeforeDestroy() {
    await super.onBeforeDestroy();

    // Clean up interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}
```

## Page-Specific Hooks

Pages extend View and add routing-specific hooks:

### `onEnter(params)`

**Purpose**: Setup when page is navigated to

**When**: Called when user navigates to this page

**Use for**:
- Fetching initial data
- Setting up page-specific listeners
- Reading URL parameters

```javascript
class UserDetailPage extends Page {
  async onEnter(params) {
    await super.onEnter(params);

    // Fetch user based on URL params
    this.user = new User({ id: params.id });
    await this.user.fetch();
  }
}
```

### `onExit()`

**Purpose**: Cleanup when leaving page

**When**: Called when user navigates away

**Use for**:
- Saving unsaved changes
- Removing page-specific listeners
- Cleanup

```javascript
class EditorPage extends Page {
  async onExit() {
    if (this.hasUnsavedChanges()) {
      const confirmed = await this.getApp().confirm('You have unsaved changes. Leave anyway?');
      if (!confirmed) {
        return false; // Prevent navigation
      }
    }

    await super.onExit();
  }
}
```

### `onParams(params)`

**Purpose**: Handle URL parameter changes without leaving page

**When**: Called when URL params change but page stays same

```javascript
class SearchPage extends Page {
  async onParams(params) {
    await super.onParams(params);

    // Update search when query parameter changes
    this.searchQuery = params.q || '';
    await this.performSearch();
  }
}
```

## Special Case: FormView

FormView is finicky and often needs recreation. Handle in `onBeforeRender`:

```javascript
class SettingsPage extends Page {
  async onInit() {
    await super.onInit();

    // Don't create FormView here - it may need to be recreated
  }

  async onBeforeRender() {
    await super.onBeforeRender();

    // Destroy old formView if it exists
    if (this.formView) {
      await this.formView.destroy();
      this.removeChild(this.formView);
    }

    // Create new formView with current model
    this.formView = new FormView({
      containerId: 'form-container',
      model: this.getApp().activeGroup,
      formConfig: {
        fields: [...]
      }
    });
    this.addChild(this.formView);
  }
}
```

## Common Patterns

### Pattern 1: Simple Page with Child Views

```javascript
class DashboardPage extends Page {
  constructor(options = {}) {
    super({
      template: '<div id="dashboard-content"></div>',
      ...options
    });
  }

  async onInit() {
    await super.onInit();

    // Create children once
    this.dashboardView = new DashboardView({
      containerId: 'dashboard-content'
    });
    this.addChild(this.dashboardView);
  }

  async onEnter() {
    await super.onEnter();

    // Fetch data when entering page
    const data = await this.fetchDashboardData();
    this.dashboardView.setData(data);
    await this.render();
  }
}
```

### Pattern 2: Page with Model-Bound Form

```javascript
class GroupSettingsPage extends Page {
  constructor(options = {}) {
    super({
      template: '<div id="settings-form"></div>',
      ...options
    });
  }

  async onInit() {
    await super.onInit();

    // Create form once
    this.formView = new GroupSettingsFormView({
      containerId: 'settings-form'
    });
    this.addChild(this.formView);
  }

  async onBeforeRender() {
    await super.onBeforeRender();

    // Update model before each render
    const group = this.getApp().activeGroup;
    this.formView.setModel(group);
  }

  async onGroupChange(group) {
    // When group changes, trigger re-render
    await this.render();
  }
}
```

### Pattern 3: View with Multiple Child Views

```javascript
class UserProfileView extends View {
  async onInit() {
    await super.onInit();

    // Create all child views
    this.headerView = new ProfileHeaderView({
      containerId: 'profile-header'
    });
    this.addChild(this.headerView);

    this.formView = new ProfileFormView({
      containerId: 'profile-form'
    });
    this.addChild(this.formView);

    this.activityView = new ActivityListView({
      containerId: 'profile-activity'
    });
    this.addChild(this.activityView);
  }

  async onBeforeRender() {
    await super.onBeforeRender();

    // Update all children with current model
    const user = this.model;
    this.headerView.setModel(user);
    this.formView.setModel(user);
    this.activityView.setCollection(user.activities);
  }
}
```

### Pattern 4: Dynamic Child Views

If you need to dynamically create/destroy children based on state:

```javascript
class TabContainerView extends View {
  async onInit() {
    await super.onInit();

    this.currentTabView = null;
  }

  async onBeforeRender() {
    await super.onBeforeRender();

    const activeTab = this.data.activeTab;

    // Destroy old tab view
    if (this.currentTabView) {
      await this.currentTabView.destroy();
      this.removeChild(this.currentTabView);
    }

    // Create new tab view based on state
    this.currentTabView = this.createTabView(activeTab);
    this.addChild(this.currentTabView);
  }

  createTabView(tabName) {
    switch (tabName) {
      case 'overview':
        return new OverviewTabView({ containerId: 'tab-content' });
      case 'settings':
        return new SettingsTabView({ containerId: 'tab-content' });
      default:
        return new DefaultTabView({ containerId: 'tab-content' });
    }
  }
}
```

## Anti-Patterns (DON'T DO THIS)

### ❌ Creating children in `onEnter` or `onBeforeRender`

```javascript
// BAD
class BadPage extends Page {
  async onEnter() {
    // DON'T: Creating children on every page enter
    this.childView = new ChildView();
    this.addChild(this.childView);
  }
}

// GOOD
class GoodPage extends Page {
  async onInit() {
    // DO: Create children once in onInit
    this.childView = new ChildView();
    this.addChild(this.childView);
  }
}
```

### ❌ Setting models in `onInit`

```javascript
// BAD
class BadView extends View {
  async onInit() {
    this.formView = new FormView();
    this.formView.setModel(this.model); // DON'T: Model may not be set yet
    this.addChild(this.formView);
  }
}

// GOOD
class GoodView extends View {
  async onInit() {
    this.formView = new FormView();
    this.addChild(this.formView);
  }

  async onBeforeRender() {
    // DO: Set model before render
    this.formView.setModel(this.model);
  }
}
```

### ❌ Manual rendering of children

```javascript
// BAD
class BadView extends View {
  async onInit() {
    this.childView = new ChildView();
    this.addChild(this.childView);
    await this.childView.render(); // DON'T: Framework handles this
  }
}

// GOOD
class GoodView extends View {
  async onInit() {
    this.childView = new ChildView();
    this.addChild(this.childView); // DO: Just add, framework renders
  }
}
```

### ❌ DOM manipulation in `onInit` or `onBeforeRender`

```javascript
// BAD
class BadView extends View {
  async onInit() {
    const element = this.element.querySelector('.some-class'); // DON'T: DOM not ready
    element.classList.add('active');
  }
}

// GOOD
class GoodView extends View {
  async onAfterRender() {
    const element = this.element.querySelector('.some-class'); // DO: DOM is ready
    element.classList.add('active');
  }
}
```

## Summary Cheat Sheet

| Hook | When | Use For | Don't Use For |
|------|------|---------|---------------|
| `onInit` | Once, at construction | Create children, add event listeners | Set models, render, DOM manipulation, API calls |
| `onBeforeRender` | Before each render | Update models/data on children, prepare state | Create children, DOM manipulation |
| `onAfterRender` | After each render | DOM manipulation, plugin init | Create children, heavy computation |
| `onBeforeMount` | Before mount to DOM | Pre-mount setup | Heavy operations |
| `onAfterMount` | After mount to DOM | Focus, animations | Create children |
| `onBeforeDestroy` | Before destruction | Cleanup, save state | Nothing - too late |
| `onEnter` (Page) | Enter page route | Fetch data, read params | Create children (use onInit) |
| `onExit` (Page) | Leave page route | Save changes, cleanup | Nothing - leaving page |
| `onParams` (Page) | URL params change | Update based on params | Navigate away |

## Key Takeaways

1. **`onInit()` is for structure** - Create your component hierarchy once
2. **`onBeforeRender()` is for state** - Update data/models before each render
3. **Let the framework render** - Don't manually call `render()` on children
4. **`onAfterRender()` is for DOM** - Manipulate DOM after it's ready
5. **Always call `super.hookName()`** - Let parent classes do their work
6. **FormView is special** - May need recreation in `onBeforeRender()`
