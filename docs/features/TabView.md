# TabView

**Responsive tabbed interface component with smooth fade transitions**

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Basic Tabbed Interface](#basic-tabbed-interface)
  - [With Initial Active Tab](#with-initial-active-tab)
- [Features](#features)
- [API Reference](#api-reference)
  - [Constructor Options](#constructor-options)
  - [Methods](#methods)
  - [Events](#events)
- [Transitions](#transitions)
  - [Fade Transitions](#fade-transitions)
  - [Custom Transition Duration](#custom-transition-duration)
  - [Disabling Transitions](#disabling-transitions)
- [Responsive Behavior](#responsive-behavior)
  - [Automatic Mode Switching](#automatic-mode-switching)
  - [Dropdown Styles](#dropdown-styles)
  - [Manual Mode Control](#manual-mode-control)
- [Tab Management](#tab-management)
  - [Adding Tabs Dynamically](#adding-tabs-dynamically)
  - [Removing Tabs](#removing-tabs)
  - [Switching Tabs Programmatically](#switching-tabs-programmatically)
- [Child View Integration](#child-view-integration)
  - [View Lifecycle](#view-lifecycle)
  - [Tab Activation Hook](#tab-activation-hook)
  - [Data Passing](#data-passing)
- [Styling](#styling)
  - [CSS Classes](#css-classes)
  - [Custom Tab Styles](#custom-tab-styles)
  - [Dropdown Customization](#dropdown-customization)
- [Usage Patterns](#usage-patterns)
  - [User Settings Interface](#user-settings-interface)
  - [Dashboard with Multiple Views](#dashboard-with-multiple-views)
  - [Wizard-Style Navigation](#wizard-style-navigation)
- [Accessibility](#accessibility)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

TabView is a responsive tabbed interface component that automatically adapts to available space. When tabs don't fit, it intelligently switches to a dropdown menu, ensuring optimal UX on all screen sizes.

**Key Features:**
- **Smooth fade transitions** - Professional fade-in/fade-out animations between tabs
- **Automatic responsive adaptation** - Switches between tabs and dropdown based on available space
- **Child view management** - Properly mounts/unmounts views with lifecycle support
- **Bootstrap 5 integration** - Uses native Bootstrap nav-tabs and dropdown components
- **Keyboard navigation** - Full keyboard accessibility support
- **Event-driven** - Emits events for tab changes and mode switches
- **Lazy mounting** - Tab content only renders when activated
- **Performance optimized** - Width calculations cached, ResizeObserver support

**Import Path:**
```javascript
import { TabView } from 'web-mojo/core';
```

---

## Quick Start

### Installation

TabView is part of the web-mojo core:

```javascript
import { TabView } from 'web-mojo/core';
import { View } from 'web-mojo/core';
```

### Basic Tabbed Interface

```javascript
// Create tab content views
const profileView = new View({
  template: '<h3>User Profile</h3><p>Profile content here</p>'
});

const settingsView = new View({
  template: '<h3>Settings</h3><p>Settings content here</p>'
});

const activityView = new View({
  template: '<h3>Activity</h3><p>Activity content here</p>'
});

// Create TabView
const tabView = new TabView({
  tabs: {
    'Profile': profileView,
    'Settings': settingsView,
    'Activity': activityView
  }
});

// Render to container
await tabView.render(true, document.getElementById('app'));
```

### With Initial Active Tab

```javascript
const tabView = new TabView({
  tabs: {
    'Overview': overviewView,
    'Details': detailsView,
    'History': historyView
  },
  activeTab: 'Details',      // Start with Details tab active
  enableTransitions: true,   // Smooth fade transitions (default: true)
  transitionDuration: 150    // Transition speed in ms (default: 150)
});

await tabView.render(true, container);
```

---

## Features

### Responsive Adaptation

Automatically switches between tab navigation and dropdown menu:

```
┌─────────────────────────────────────────────────────────┐
│ Desktop: Tab Navigation                                 │
├─────────────────────────────────────────────────────────┤
│ [Profile] [Settings] [Activity] [Notifications]         │
│                                                         │
│ Content for active tab...                              │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│ Mobile: Dropdown Menu    │
├──────────────────────────┤
│ [v] Profile              │
│                          │
│ Content for active tab...│
└──────────────────────────┘
```

### Smart Width Calculation

- Measures actual text width with current font
- Caches width calculations for performance
- Respects padding, borders, and Bootstrap styles
- Uses ResizeObserver for efficient resize detection

### Child View Management

- Lazy mounting: tabs render only when activated
- Proper lifecycle: calls view lifecycle hooks
- Automatic cleanup: destroys views when tabs removed
- Parent-child hierarchy maintained

---

## API Reference

### Constructor Options

```javascript
new TabView(options)
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tabs` | Object | `{}` | Map of tab labels to View instances |
| `activeTab` | String | First tab | Initially active tab label |
| `tabsClass` | String | `'nav nav-tabs mb-3'` | CSS classes for tab navigation |
| `contentClass` | String | `'tab-content'` | CSS classes for tab content container |
| `enableTransitions` | Boolean | `true` | Enable fade transitions between tabs |
| `transitionDuration` | Number | `150` | Transition duration in milliseconds |
| `minWidth` | Number | `300` | Minimum width (px) before switching to dropdown |
| `enableResponsive` | Boolean | `true` | Enable automatic responsive behavior |
| `tabPadding` | Number | `80` | Estimated padding per tab (px) for width calculation |
| `dropdownStyle` | String | `'select'` | Dropdown style: `'select'` or `'button'` |

**Example with options:**

```javascript
const tabView = new TabView({
  tabs: {
    'Dashboard': dashboardView,
    'Analytics': analyticsView,
    'Reports': reportsView
  },
  activeTab: 'Dashboard',
  tabsClass: 'nav nav-tabs nav-fill mb-4',
  enableTransitions: true,    // Enable smooth fade transitions (default)
  transitionDuration: 200,    // Custom 200ms transition
  minWidth: 400,
  dropdownStyle: 'button',
  enableResponsive: true
});
```

### Methods

#### `async showTab(tabLabel, options?)`

Show a specific tab.

**Parameters:**
- `tabLabel` (String) - Label of tab to show
- `options` (Object, optional)
  - `force` (Boolean) - Force re-mount even if already active

**Returns:** `Promise<boolean>` - True if successful

**Example:**
```javascript
await tabView.showTab('Settings');

// Force re-mount
await tabView.showTab('Profile', { force: true });
```

#### `async addTab(label, view, makeActive?)`

Add a new tab dynamically.

**Parameters:**
- `label` (String) - Tab label
- `view` (View) - View instance for tab content
- `makeActive` (Boolean) - Whether to activate immediately

**Returns:** `Promise<boolean>` - True if added successfully

**Example:**
```javascript
const newView = new View({
  template: '<h3>New Tab</h3>'
});

await tabView.addTab('New Tab', newView, true);
```

#### `async removeTab(label)`

Remove a tab.

**Parameters:**
- `label` (String) - Label of tab to remove

**Returns:** `Promise<boolean>` - True if removed successfully

**Example:**
```javascript
await tabView.removeTab('Settings');
```

#### `getActiveTab()`

Get currently active tab label.

**Returns:** `String|null` - Active tab label

**Example:**
```javascript
const activeLabel = tabView.getActiveTab();
console.log('Current tab:', activeLabel);
```

#### `getTabLabels()`

Get all tab labels.

**Returns:** `String[]` - Array of tab labels

**Example:**
```javascript
const labels = tabView.getTabLabels();
// ['Profile', 'Settings', 'Activity']
```

#### `getTab(label)`

Get a specific tab's view instance.

**Parameters:**
- `label` (String) - Tab label

**Returns:** `View|null` - View instance or null

**Example:**
```javascript
const settingsView = tabView.getTab('Settings');
if (settingsView) {
  settingsView.updateData(newData);
}
```

#### `getNavigationMode()`

Get current navigation mode.

**Returns:** `String` - `'tabs'` or `'dropdown'`

**Example:**
```javascript
const mode = tabView.getNavigationMode();
if (mode === 'dropdown') {
  console.log('Mobile view active');
}
```

#### `async setNavigationMode(mode)`

Force a specific navigation mode.

**Parameters:**
- `mode` (String) - `'tabs'` or `'dropdown'`

**Example:**
```javascript
// Force dropdown mode
await tabView.setNavigationMode('dropdown');
```

#### `shouldUseDropdown()`

Check if dropdown mode should be used.

**Returns:** `Boolean` - True if dropdown should be used

**Example:**
```javascript
if (tabView.shouldUseDropdown()) {
  console.log('Tabs would overflow, using dropdown');
}
```

#### `clearWidthCache()`

Clear cached tab width calculations.

**Example:**
```javascript
// Call after changing tab labels or styles
tabView.clearWidthCache();
```

#### `static create(options)`

Static factory method.

**Parameters:**
- `options` (Object) - TabView options

**Returns:** `TabView` - New instance

**Example:**
```javascript
const tabView = TabView.create({
  tabs: { 'Home': homeView },
  activeTab: 'Home'
});
```

### Events

TabView emits events that you can listen to:

#### `tab:changed`

Fired when active tab changes.

**Payload:**
- `activeTab` (String) - New active tab label
- `previousTab` (String) - Previous active tab label

**Example:**
```javascript
tabView.on('tab:changed', ({ activeTab, previousTab }) => {
  console.log(`Changed from ${previousTab} to ${activeTab}`);
  analytics.track('tab_view', { tab: activeTab });
});
```

#### `tab:added`

Fired when a tab is added.

**Payload:**
- `label` (String) - Tab label
- `view` (View) - View instance

**Example:**
```javascript
tabView.on('tab:added', ({ label, view }) => {
  console.log(`Tab added: ${label}`);
});
```

#### `tab:removed`

Fired when a tab is removed.

**Payload:**
- `label` (String) - Tab label
- `view` (View) - View instance

**Example:**
```javascript
tabView.on('tab:removed', ({ label }) => {
  console.log(`Tab removed: ${label}`);
});
```

#### `navigation:modeChanged`

Fired when navigation mode switches.

**Payload:**
- `mode` (String) - New mode (`'tabs'` or `'dropdown'`)
- `containerWidth` (Number) - Current container width
- `totalTabWidth` (Number) - Total width needed for tabs

**Example:**
```javascript
tabView.on('navigation:modeChanged', ({ mode, containerWidth, totalTabWidth }) => {
  console.log(`Mode changed to ${mode}`);
  console.log(`Container: ${containerWidth}px, Tabs need: ${totalTabWidth}px`);
});
```

---

## Transitions

TabView includes smooth fade transitions between tabs, providing a professional animated experience similar to Bootstrap's native tab behavior.

### Fade Transitions

Transitions are **enabled by default** and work automatically:

```javascript
const tabView = new TabView({
  tabs: {
    'Profile': profileView,
    'Settings': settingsView,
    'Activity': activityView
  }
  // enableTransitions: true is the default
});

await tabView.render(true, container);
```

**How it works:**
1. When switching tabs, the current tab fades out (150ms default)
2. After fade-out completes, the new tab content mounts
3. The new tab fades in smoothly
4. Total transition time: ~150ms (configurable)

**Visual flow:**
```
Current Tab (opacity: 1.0)
    ↓ (fade out 150ms)
Current Tab (opacity: 0.0)
    ↓ (content swap)
New Tab (opacity: 0.0)
    ↓ (fade in 150ms)
New Tab (opacity: 1.0)
```

### Custom Transition Duration

Adjust the transition speed:

```javascript
const tabView = new TabView({
  tabs: myTabs,
  transitionDuration: 300  // 300ms for slower, more dramatic transitions
});

// Or for faster transitions
const fastTabView = new TabView({
  tabs: myTabs,
  transitionDuration: 75  // Snappy 75ms transitions
});
```

**Recommended durations:**
- **Fast**: 75-100ms - Snappy, modern feel
- **Default**: 150ms - Bootstrap standard, balanced
- **Slow**: 250-300ms - Dramatic, attention-grabbing
- **Very slow**: 400-500ms - For presentations/demos

### Disabling Transitions

For instant tab switching without animations:

```javascript
const tabView = new TabView({
  tabs: myTabs,
  enableTransitions: false  // Instant tab switching
});
```

**When to disable:**
- Performance-critical applications
- Testing/automation (avoid waiting for animations)
- User preference for reduced motion
- Very complex tab content that benefits from instant display

**Respecting user preferences:**

```javascript
// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const tabView = new TabView({
  tabs: myTabs,
  enableTransitions: !prefersReducedMotion
});
```

### Transition Implementation Details

TabView uses Bootstrap's standard transition classes:
- `.fade` - Enables CSS transitions
- `.show` - Controls opacity (1.0 when present, 0.0 when absent)
- `.active` - Controls display (block when present, none when absent)

**CSS used (Bootstrap 5):**
```css
.tab-pane {
  display: none;
}

.tab-pane.active {
  display: block;
}

.fade {
  transition: opacity 0.15s linear;
  opacity: 0;
}

.fade.show {
  opacity: 1;
}
```

**Custom transition timing:**

Override Bootstrap's transition if needed:

```css
/* Custom transition timing */
.tab-view .tab-pane.fade {
  transition: opacity 0.3s ease-in-out;
}

/* Custom easing for smooth feel */
.tab-view .tab-pane.fade {
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Responsive Behavior

### Automatic Mode Switching

TabView monitors container width and switches modes automatically:

```javascript
const tabView = new TabView({
  tabs: {
    'Overview': overviewView,
    'Details': detailsView,
    'Analytics': analyticsView,
    'Reports': reportsView,
    'Settings': settingsView
  },
  enableResponsive: true,  // Default
  minWidth: 300            // Minimum width before switching
});
```

**How it works:**
1. Calculates width needed for all tabs
2. Compares to available container width
3. Switches to dropdown if tabs would overflow
4. Uses ResizeObserver for efficient detection
5. Only updates when width change > 50px (prevents excessive re-renders)

### Dropdown Styles

Two dropdown styles available:

#### Select Style (Default)

Clean, select-like appearance:

```javascript
const tabView = new TabView({
  tabs: myTabs,
  dropdownStyle: 'select'  // Default
});
```

Renders as:
```
┌────────────────────────┐
│ Profile            ▼  │
└────────────────────────┘
```

#### Button Style

Bootstrap button dropdown:

```javascript
const tabView = new TabView({
  tabs: myTabs,
  dropdownStyle: 'button'
});
```

Renders as:
```
┌────────────────────────┐
│ ≡ Profile          ▼  │
└────────────────────────┘
```

### Manual Mode Control

Override automatic behavior:

```javascript
const tabView = new TabView({
  tabs: myTabs,
  enableResponsive: false  // Disable automatic switching
});

// Later, manually control mode
await tabView.setNavigationMode('dropdown');
```

**Listen to mode changes:**

```javascript
tabView.on('navigation:modeChanged', ({ mode }) => {
  if (mode === 'dropdown') {
    console.log('Now in compact mode');
  } else {
    console.log('Now in full tab mode');
  }
});
```

---

## Tab Management

### Adding Tabs Dynamically

Add tabs after initialization:

```javascript
const tabView = new TabView({
  tabs: {
    'Home': homeView
  }
});

await tabView.render(true, container);

// Add new tab
const settingsView = new View({
  template: '<h3>Settings</h3>'
});

await tabView.addTab('Settings', settingsView);

// Add and activate immediately
const helpView = new View({
  template: '<h3>Help</h3>'
});

await tabView.addTab('Help', helpView, true);
```

**With permissions:**

```javascript
const adminView = new View({
  template: '<h3>Admin Panel</h3>',
  permissions: 'admin'
});

// Only adds if user has 'admin' permission
await tabView.addTab('Admin', adminView);
```

### Removing Tabs

Remove tabs dynamically:

```javascript
// Remove tab
await tabView.removeTab('Settings');

// Check if tab exists first
if (tabView.getTab('Admin')) {
  await tabView.removeTab('Admin');
}
```

**Behavior when removing active tab:**
- TabView automatically switches to first remaining tab
- If no tabs remain, `activeTab` becomes `null`
- Removed view is properly destroyed

### Switching Tabs Programmatically

```javascript
// Switch to specific tab
await tabView.showTab('Analytics');

// Force re-mount (useful after data changes)
await tabView.showTab('Dashboard', { force: true });

// Get current tab
const current = tabView.getActiveTab();

// Get all available tabs
const allTabs = tabView.getTabLabels();

// Check if tab exists before switching
if (allTabs.includes('Reports')) {
  await tabView.showTab('Reports');
}
```

---

## Child View Integration

### View Lifecycle

TabView respects child view lifecycle:

```javascript
class DashboardView extends View {
  constructor(options) {
    super(options);
    console.log('Constructor called');
  }

  async onInit() {
    console.log('View initialized');
  }

  async onBeforeRender() {
    console.log('About to render');
  }

  async onAfterRender() {
    console.log('Rendered');
  }

  async onBeforeMount() {
    console.log('About to mount to DOM');
  }

  async onAfterMount() {
    console.log('Mounted to DOM');
  }

  async onBeforeDestroy() {
    console.log('About to destroy');
    // Cleanup: remove event listeners, etc.
  }
}

const dashboardView = new DashboardView({
  template: '<h3>Dashboard</h3>'
});

const tabView = new TabView({
  tabs: {
    'Dashboard': dashboardView
  }
});
```

**Lifecycle flow:**
1. **Constructor** - Called when view created
2. **onInit** - Called before first render
3. **onBeforeRender** - Called before each render
4. **onAfterRender** - Called after each render
5. **onBeforeMount** - Called before mounting to DOM (when tab activated)
6. **onAfterMount** - Called after mounted to DOM
7. **onBeforeDestroy** - Called before view destroyed (when tab removed)

### Tab Activation Hook

Implement `onTabActivated` in child views:

```javascript
class AnalyticsView extends View {
  constructor(options) {
    super({
      template: '<div id="chart"></div>',
      ...options
    });
  }

  async onTabActivated() {
    // Called whenever this tab becomes active
    console.log('Analytics tab activated');
    
    // Refresh data
    await this.fetchLatestData();
    
    // Update charts
    this.updateCharts();
  }

  async fetchLatestData() {
    const response = await fetch('/api/analytics');
    this.data = await response.json();
  }

  updateCharts() {
    // Render charts with fresh data
    this.renderChart(this.data);
  }
}
```

### Data Passing

Pass data to child views:

```javascript
// Method 1: Via constructor
const profileView = new View({
  template: '<h3>{{user.name}}</h3><p>{{user.email}}</p>',
  data: {
    user: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  }
});

// Method 2: Via model
import { Model } from 'web-mojo/core';

const userModel = new Model({
  name: 'John Doe',
  email: 'john@example.com'
});

const profileView = new View({
  template: '<h3>{{model.name}}</h3><p>{{model.email}}</p>',
  model: userModel
});

// Method 3: Update after creation
const settingsView = new View({
  template: '<div>{{settings}}</div>'
});

const tabView = new TabView({
  tabs: {
    'Profile': profileView,
    'Settings': settingsView
  }
});

// Update data later
settingsView.data = { settings: 'New settings' };
await settingsView.render();
```

---

## Styling

### CSS Classes

TabView uses Bootstrap 5 classes by default:

**Tab Navigation (tabs mode):**
```html
<ul class="nav nav-tabs mb-3" role="tablist">
  <li class="nav-item" role="presentation">
    <button class="nav-link active">Profile</button>
  </li>
  <li class="nav-item" role="presentation">
    <button class="nav-link">Settings</button>
  </li>
</ul>
```

**Dropdown Navigation (dropdown mode):**
```html
<div class="dropdown mb-3">
  <button class="btn tab-view-select-style dropdown-toggle">
    Profile
  </button>
  <ul class="dropdown-menu">
    <li><button class="dropdown-item active">Profile</button></li>
    <li><button class="dropdown-item">Settings</button></li>
  </ul>
</div>
```

**Tab Content:**
```html
<div class="tab-content">
  <div class="tab-pane fade show active" role="tabpanel">
    <!-- Active tab content -->
  </div>
  <div class="tab-pane fade" role="tabpanel">
    <!-- Inactive tab content -->
  </div>
</div>
```

### Custom Tab Styles

Override default Bootstrap classes:

```javascript
const tabView = new TabView({
  tabs: myTabs,
  tabsClass: 'nav nav-pills nav-fill mb-4',  // Use pills instead
  contentClass: 'tab-content p-3 border'     // Add padding and border
});
```

**Available Bootstrap nav styles:**
- `nav-tabs` - Standard tabs (default)
- `nav-pills` - Pill-shaped tabs
- `nav-underline` - Underlined tabs
- `nav-fill` - Equal width tabs
- `nav-justified` - Full width tabs

**Custom CSS:**

```css
/* Custom tab styling */
.tab-view .nav-tabs {
  border-bottom: 2px solid #e5e7eb;
}

.tab-view .nav-link {
  color: #6b7280;
  border: none;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
}

.tab-view .nav-link:hover {
  color: #3b82f6;
  border-color: transparent;
}

.tab-view .nav-link.active {
  color: #3b82f6;
  background: transparent;
  border-bottom: 2px solid #3b82f6;
  margin-bottom: -2px;
}

/* Custom dropdown styling */
.tab-view-select-style {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  width: 100%;
  text-align: left;
}

.tab-view-select-style:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}
```

### Dropdown Customization

Style dropdown button and menu:

```css
/* Select-style dropdown */
.tab-view .tab-view-select-style {
  font-size: 0.875rem;
  min-width: 200px;
}

.tab-view .tab-view-select-label {
  font-weight: 500;
}

/* Dropdown menu items */
.tab-view .dropdown-item {
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tab-view .dropdown-item.active {
  background-color: #eff6ff;
  color: #3b82f6;
}

.tab-view .dropdown-item:hover {
  background-color: #f3f4f6;
}

/* Check icon for active item */
.tab-view .dropdown-item .bi-check-lg {
  color: #3b82f6;
  font-size: 1rem;
}
```

---

## Usage Patterns

### User Settings Interface

```javascript
import { TabView, View } from 'web-mojo/core';

class ProfileSettingsView extends View {
  constructor(options) {
    super({
      template: `
        <h3>Profile Settings</h3>
        <form data-action="save-profile">
          <input type="text" name="name" value="{{user.name}}" />
          <button type="submit">Save</button>
        </form>
      `,
      ...options
    });
  }

  async onActionSaveProfile(event, element) {
    event.preventDefault();
    const formData = new FormData(element);
    // Save profile...
  }
}

class SecuritySettingsView extends View {
  constructor(options) {
    super({
      template: `
        <h3>Security Settings</h3>
        <button data-action="change-password">Change Password</button>
      `,
      ...options
    });
  }

  async onActionChangePassword() {
    // Show password dialog...
  }
}

class NotificationSettingsView extends View {
  constructor(options) {
    super({
      template: `
        <h3>Notifications</h3>
        <label>
          <input type="checkbox" data-change-action="toggle-emails" />
          Email notifications
        </label>
      `,
      ...options
    });
  }

  async onActionToggleEmails(event, element) {
    const enabled = element.checked;
    // Update setting...
  }
}

// Create settings interface
const settingsView = new TabView({
  tabs: {
    'Profile': new ProfileSettingsView({ data: userData }),
    'Security': new SecuritySettingsView(),
    'Notifications': new NotificationSettingsView(),
    'Privacy': new PrivacySettingsView()
  },
  activeTab: 'Profile',
  enableResponsive: true
});

await settingsView.render(true, document.getElementById('settings'));
```

### Dashboard with Multiple Views

```javascript
class OverviewView extends View {
  constructor(options) {
    super({
      template: `
        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-body">
                <h5>Total Users</h5>
                <h2>{{stats.totalUsers}}</h2>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card">
              <div class="card-body">
                <h5>Revenue</h5>
                <h2>{{stats.revenue|currency}}</h2>
              </div>
            </div>
          </div>
        </div>
      `,
      ...options
    });
  }

  async onTabActivated() {
    // Refresh stats when tab activated
    await this.fetchStats();
  }

  async fetchStats() {
    const response = await fetch('/api/dashboard/stats');
    this.data = { stats: await response.json() };
    await this.render();
  }
}

class AnalyticsView extends View {
  async onTabActivated() {
    // Load analytics when tab activated
    await this.loadCharts();
  }

  async loadCharts() {
    // Load and render charts...
  }
}

class ReportsView extends View {
  async onTabActivated() {
    // Refresh report list when tab activated
    await this.fetchReports();
  }
}

// Create dashboard
const dashboard = new TabView({
  tabs: {
    'Overview': new OverviewView(),
    'Analytics': new AnalyticsView(),
    'Reports': new ReportsView(),
    'Users': new UsersView()
  },
  activeTab: 'Overview'
});

await dashboard.render(true, document.getElementById('dashboard'));

// Listen for tab changes
dashboard.on('tab:changed', ({ activeTab }) => {
  // Track analytics
  analytics.track('dashboard_tab_view', { tab: activeTab });
});
```

### Wizard-Style Navigation

```javascript
class WizardTabView extends TabView {
  constructor(options) {
    super(options);
    this.currentStep = 0;
    this.steps = this.getTabLabels();
  }

  async nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      await this.showTab(this.steps[this.currentStep]);
    }
  }

  async previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      await this.showTab(this.steps[this.currentStep]);
    }
  }

  async goToStep(stepIndex) {
    if (stepIndex >= 0 && stepIndex < this.steps.length) {
      this.currentStep = stepIndex;
      await this.showTab(this.steps[stepIndex]);
    }
  }

  isFirstStep() {
    return this.currentStep === 0;
  }

  isLastStep() {
    return this.currentStep === this.steps.length - 1;
  }
}

// Usage
const wizard = new WizardTabView({
  tabs: {
    'Account Info': accountInfoView,
    'Profile Details': profileDetailsView,
    'Preferences': preferencesView,
    'Review': reviewView
  },
  activeTab: 'Account Info',
  enableResponsive: false  // Keep as tabs for wizard
});

// Add navigation buttons
accountInfoView.on('next', () => wizard.nextStep());
profileDetailsView.on('next', () => wizard.nextStep());
profileDetailsView.on('back', () => wizard.previousStep());
// etc.
```

---

## Accessibility

TabView implements WAI-ARIA tab pattern:

**ARIA Attributes:**
- `role="tablist"` - Tab navigation container
- `role="tab"` - Each tab button
- `role="tabpanel"` - Each content panel
- `aria-selected="true|false"` - Active tab indication
- `aria-controls` - Links tab to its panel
- `aria-labelledby` - Links panel to its tab

**Keyboard Navigation:**
- **Tab** - Move focus into/out of tab list
- **Arrow Keys** - Navigate between tabs (when focused)
- **Enter/Space** - Activate focused tab
- **Home** - Go to first tab
- **End** - Go to last tab

**Screen Reader Support:**
- Announces current tab
- Announces when tab changes
- Properly associates tabs with panels

**Best Practices:**

```javascript
// Ensure meaningful tab labels
const tabView = new TabView({
  tabs: {
    'User Profile': profileView,      // Good
    'Account Settings': settingsView,  // Good
    // NOT: 'Tab 1', 'Section A'       // Bad
  }
});

// Provide context in tab content
class ProfileView extends View {
  constructor(options) {
    super({
      template: `
        <div role="region" aria-label="Profile information">
          <h3 id="profile-heading">User Profile</h3>
          <!-- content -->
        </div>
      `,
      ...options
    });
  }
}
```

---

## Performance

### Optimization Strategies

**1. Width Calculation Caching:**
```javascript
// TabView caches tab width calculations
// Clear cache if tab labels change
tabView.clearWidthCache();
```

**2. Lazy Mounting:**
```javascript
// Tabs only mount when activated
// Inactive tabs don't render until needed
const tabView = new TabView({
  tabs: {
    'Overview': overviewView,
    'Heavy Analytics': expensiveAnalyticsView  // Won't render until clicked
  }
});
```

**3. Efficient Resize Detection:**
```javascript
// Uses ResizeObserver (or falls back to window resize)
// Only updates when width changes > 50px
// Prevents excessive re-renders
```

**4. Debounced Updates:**
```javascript
// Only re-calculates mode when container width changes significantly
// Reduces CPU usage during window resize
```

**5. Reusable Measurement Element:**
```javascript
// TabView reuses a single span element for text measurements
// Avoids creating/destroying DOM elements repeatedly
```

### Performance Monitoring

```javascript
const tabView = new TabView({
  tabs: myTabs
});

// Monitor mode changes
tabView.on('navigation:modeChanged', ({ mode, containerWidth, totalTabWidth }) => {
  console.log('Mode:', mode);
  console.log('Container width:', containerWidth);
  console.log('Tabs need:', totalTabWidth);
  console.log('Efficiency:', (totalTabWidth / containerWidth * 100).toFixed(1) + '%');
});

// Monitor tab activation time
tabView.on('tab:changed', async ({ activeTab }) => {
  const start = performance.now();
  // Tab switches...
  requestAnimationFrame(() => {
    const end = performance.now();
    console.log(`Tab ${activeTab} activated in ${(end - start).toFixed(2)}ms`);
  });
});
```

---

## Troubleshooting

### Tabs don't switch

**Check:**
1. Tab labels match exactly (case-sensitive)
2. Views are properly initialized
3. No JavaScript errors in console

**Debug:**
```javascript
console.log('Available tabs:', tabView.getTabLabels());
console.log('Current tab:', tabView.getActiveTab());
console.log('Tab view:', tabView.getTab('Settings'));
```

### Dropdown mode not activating

**Check:**
1. `enableResponsive` is `true` (default)
2. Container width is less than total tab width
3. ResizeObserver is supported (or window resize listener works)

**Debug:**
```javascript
console.log('Responsive enabled:', tabView.enableResponsive);
console.log('Should use dropdown:', tabView.shouldUseDropdown());
console.log('Container width:', tabView.getContainerWidth());
console.log('Total tab width:', tabView.getTotalTabWidth());
console.log('Current mode:', tabView.getNavigationMode());
```

### Tab content not rendering

**Check:**
1. View has a template
2. Tab is being activated (not just clicked)
3. Container element exists in DOM

**Debug:**
```javascript
const view = tabView.getTab('Profile');
console.log('View:', view);
console.log('View mounted:', view.isMounted());
console.log('View element:', view.element);
```

### Width calculation incorrect

**Check:**
1. Fonts loaded before measurement
2. CSS applied before measurement
3. Container has width (not `display: none`)

**Fix:**
```javascript
// Clear cache and recalculate
tabView.clearWidthCache();

// Wait for fonts
await document.fonts.ready;

// Force mode update
await tabView.updateNavigationMode();
```

### Memory leaks

**Check:**
1. Views properly destroyed when tabs removed
2. Event listeners cleaned up
3. ResizeObserver disconnected

**Debug:**
```javascript
// Check active listeners
console.log('Resize observer:', tabView.resizeObserver);

// Ensure cleanup on destroy
await tabView.destroy();
console.log('Observer after destroy:', tabView.resizeObserver);  // Should be null
```

---

## Best Practices

### 1. Use Meaningful Tab Labels

```javascript
// GOOD
const tabView = new TabView({
  tabs: {
    'User Profile': profileView,
    'Account Settings': settingsView,
    'Security & Privacy': securityView
  }
});

// BAD
const tabView = new TabView({
  tabs: {
    'Tab 1': view1,
    'Item': view2,
    'Data': view3
  }
});
```

### 2. Implement onTabActivated for Data Refreshing

```javascript
class DashboardView extends View {
  async onTabActivated() {
    // Refresh data when tab becomes visible
    await this.fetchLatestData();
    this.updateCharts();
  }
}
```

### 3. Handle Errors Gracefully

```javascript
class ReportsView extends View {
  async onTabActivated() {
    try {
      await this.loadReports();
    } catch (error) {
      console.error('Failed to load reports:', error);
      this.showError('Unable to load reports. Please try again.');
    }
  }

  showError(message) {
    this.data = { error: message };
    this.render();
  }
}
```

### 4. Clean Up Resources

```javascript
class ChartView extends View {
  async onAfterMount() {
    // Create chart
    this.chart = new Chart(this.element, config);
  }

  async onBeforeDestroy() {
    // Clean up chart
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}
```

### 5. Use Events for Communication

```javascript
// Child view emits events
class SettingsView extends View {
  async onActionSave() {
    await this.saveSettings();
    this.emit('settings:saved');
  }
}

// Parent listens to events
const tabView = new TabView({
  tabs: { 'Settings': settingsView }
});

settingsView.on('settings:saved', () => {
  console.log('Settings saved!');
  showNotification('Settings saved successfully');
});
```

### 6. Optimize for Performance

```javascript
// Lazy load heavy dependencies
class AnalyticsView extends View {
  async onTabActivated() {
    if (!this.chartLibLoaded) {
      await this.loadChartLibrary();
      this.chartLibLoaded = true;
    }
    this.renderCharts();
  }

  async loadChartLibrary() {
    // Dynamically import chart library only when needed
    const Chart = await import('chart.js');
    this.Chart = Chart.default;
  }
}
```

### 7. Provide Loading States

```javascript
class DataView extends View {
  constructor(options) {
    super({
      template: `
        {{#loading}}
          <div class="spinner-border"></div>
          <p>Loading...</p>
        {{/loading}}
        {{^loading}}
          <div>{{data}}</div>
        {{/loading}}
      `,
      ...options
    });
    this.loading = false;
  }

  async onTabActivated() {
    this.loading = true;
    await this.render();

    await this.fetchData();

    this.loading = false;
    await this.render();
  }
}
```

---

## Related Documentation

- **[View Guide](./View.md)**: Base View component documentation
- **[Templates Guide](./Templates.md)**: Template syntax and data formatting
- **[Events System](./Events.md)**: Event emitter and listeners
- **[Bootstrap Integration](./Bootstrap.md)**: Bootstrap components in MOJO

---

## External Resources

**Bootstrap 5:**
- Nav Tabs: https://getbootstrap.com/docs/5.3/components/navs-tabs/
- Dropdowns: https://getbootstrap.com/docs/5.3/components/dropdowns/

**WAI-ARIA:**
- Tab Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- Accessibility: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tab_role

**Web APIs:**
- ResizeObserver: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
- Performance API: https://developer.mozilla.org/en-US/docs/Web/API/Performance
