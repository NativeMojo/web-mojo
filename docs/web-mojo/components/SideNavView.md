# SideNavView

**SideNavView** is a sectioned detail layout — a left rail of nav links beside a content panel that mounts one child view at a time. It's the standard chrome inside Modal-hosted record viewers like [`FileView`](FileView.md), `IPSetView`, `ShortLinkView`, and `UserView`. Below a configurable `minWidth`, the rail collapses into a Bootstrap dropdown so the same component works inside narrow modals or cards.

> **When to use SideNavView vs [TabView](../components/TabView.md):**
> Use `SideNavView` for record detail screens with **3+ sections**, permission gating, and where you want a persistent left rail. Use `TabView` for short tab strips (2–4 tabs) without responsive collapse.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Section Schema](#section-schema)
- [Constructor Options](#constructor-options)
- [Instance Methods](#instance-methods)
- [Events](#events)
- [Section View Hooks](#section-view-hooks)
- [Common Patterns](#common-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## Overview

`SideNavView` extends [`View`](../core/View.md) and provides:

- **Sectioned layout** — left rail of nav links, right pane that hosts one section view at a time
- **Lazy mount / persistent state** — section views are mounted on first activation and kept alive on switch, so per-section state (form input, scroll position) is preserved
- **Permission-aware** — sections with a `permissions` string are silently skipped when the active user lacks the permission
- **Group dividers** — `{ type: 'divider', label }` entries draw an uppercase label between groups of links
- **Responsive collapse** — when the container drops below `minWidth`, the rail becomes a dropdown selector
- **Dynamic add/remove** — `addSection()` and `removeSection()` rebuild the nav at runtime
- **Lifecycle hook** — section views can implement `onSectionActivated()` to react to becoming visible
- **Dark theme** — rail and dropdown button adapt automatically to `data-bs-theme="dark"` via Bootstrap dark-mode tokens

---

## Quick Start

```js
import { View, SideNavView } from 'web-mojo';

class DetailsSection extends View {
    constructor(options = {}) {
        super({ ...options, template: '<div class="p-3"><h5>Details</h5>…</div>' });
    }
}

class SettingsSection extends View {
    constructor(options = {}) {
        super({ ...options, template: '<div class="p-3"><h5>Settings</h5>…</div>' });
    }
}

const sideNav = new SideNavView({
    sections: [
        { key: 'details',  label: 'Details',  icon: 'bi-info-circle', view: new DetailsSection({ model }) },
        { key: 'settings', label: 'Settings', icon: 'bi-sliders',     view: new SettingsSection({ model }) },
        { type: 'divider', label: 'History' },
        { key: 'activity', label: 'Activity', icon: 'bi-clock-history', view: new ActivitySection({ model }) },
    ],
    activeSection: 'details',
    navWidth: 200,
    minWidth: 500,
});

// Mount it inside a parent view via `containerId` + `addChild` (preferred):
this.addChild(sideNav);

// …or render directly into a container:
await sideNav.render(true, document.getElementById('detail-host'));
```

> **Sizing:** SideNavView uses `flex` + `overflow-y: auto` on its content panel, which needs a **bounded height** on its parent to scroll. Wrap it in a container with an explicit `max-height` (e.g. `max-height: 70vh`) inside Modals — see the [FileView pattern](#wrap-in-a-bounded-container-when-hosted-in-a-modal).

---

## Section Schema

Each entry in the `sections` array is either a **navigable section** or a **divider**.

### Navigable Section

```js
{
    key:         'details',          // unique string id used by showSection() / dataset
    label:       'Details',          // text shown in the rail link
    icon:        'bi-info-circle',   // optional Bootstrap Icons class
    view:        viewInstance,        // any View instance — mounted into the content panel
    permissions: 'manage_users',     // optional permission string — section hidden if user lacks it
}
```

| Key | Type | Required | Description |
|---|---|---|---|
| `key` | `string` | ✅ | Unique section identifier |
| `label` | `string` | ✅ | Link text |
| `icon` | `string` | — | Bootstrap Icons class (e.g. `bi-shield-lock`) |
| `view` | `View` | ✅ | View instance — mounted on first activation |
| `permissions` | `string` | — | Permission name — section is omitted if `app.activeUser.hasPerm()` returns false |

### Divider

```js
{ type: 'divider', label: 'Activity' }
```

Renders an uppercase group label between sections. Dividers are visual only — they have no `key` and cannot be activated.

---

## Constructor Options

```js
new SideNavView({
    sections,
    activeSection,
    navWidth,
    contentPadding,
    enableResponsive,
    minWidth,
    // …plus any standard View options (className, containerId, model, …)
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `sections` | `Array` | `[]` | Section configs — see [Section Schema](#section-schema) |
| `activeSection` | `string` | first navigable key | The section visible on initial render |
| `navWidth` | `number` | `200` | Left rail width in pixels |
| `contentPadding` | `string` | `'1.5rem 2.5rem'` | CSS padding for the content panel |
| `enableResponsive` | `boolean` | `true` | If `true`, collapses to a dropdown below `minWidth` |
| `minWidth` | `number` | `500` | Pixel threshold below which the rail becomes a dropdown |
| `containerId` | `string` | — | Standard View option — render inside a parent's `data-container` |
| `className` | `string` | `'side-nav-view'` | Root element class |

---

## Instance Methods

### `showSection(key)`

Activate a section by key. Unmounts the previous section, mounts the new one, updates the rail's active state, and emits `section:changed`. Returns a Promise that resolves when the new section is mounted.

```js
await sideNav.showSection('settings');
```

If `key` is unknown, logs a warning and returns `false`.

> **Aliases:** Many host views (`FileView`, `UserView`, `GroupView`, `ShortLinkView`) expose their own `showSection(key)` that delegates to the SideNavView — call those when you have the host view but not the SideNavView.

### `getActiveSection()`

Returns the currently active section's `key`, or `null` if no section is active.

```js
if (sideNav.getActiveSection() === 'preview') { … }
```

### `getSection(key)`

Returns the View instance registered for `key`, or `null` if not found.

```js
const renditionsView = sideNav.getSection('renditions');
renditionsView?.refresh?.();
```

### `getSectionKeys()`

Returns a copy of the navigable section keys (in declared order, excluding dividers).

```js
sideNav.getSectionKeys();   // ['preview', 'details', 'renditions']
```

### `addSection(config, makeActive = false)`

Add a section dynamically. Re-renders the rail. If `makeActive` is `true`, also activates the new section.

```js
await sideNav.addSection(
    { key: 'audit', label: 'Audit Log', icon: 'bi-journal', view: new AuditSection({ model }) },
    true
);
```

Returns `false` (and warns) if `config.key` already exists.

### `removeSection(key)`

Destroy a section's view, remove it from the rail, and re-render. If the removed section was active, falls back to the first remaining section.

```js
await sideNav.removeSection('debug');
```

Returns `false` (and warns) if `key` is unknown.

---

## Events

`SideNavView` extends [`EventEmitter`](../core/Events.md). Listen with `.on(name, handler)`.

| Event | Payload | Emitted when |
|---|---|---|
| `section:changed` | `{ activeSection, previousSection }` | A new section is activated |
| `section:added` | `{ config }` | A section is added via `addSection()` |
| `section:removed` | `{ key }` | A section is removed via `removeSection()` |
| `navigation:modeChanged` | `{ mode, containerWidth }` | Switched between `'sidebar'` and `'dropdown'` |

```js
sideNav.on('section:changed', ({ activeSection }) => {
    history.replaceState(null, '', `#${activeSection}`);
});
```

---

## Section View Hooks

### `onSectionActivated()` *(optional)*

If a section view defines this method, SideNavView calls it after the section becomes visible (after mount, after the rail's active state updates). Use it for "the user just looked at this tab" work like analytics, fetching expensive data, or focusing a control.

```js
class MetricsSection extends View {
    async onSectionActivated() {
        // Refresh chart data each time the user opens this tab
        await this.chart?.refresh?.();
    }
}
```

> **Don't** fetch in `onAfterRender()` for this purpose — `onAfterRender` runs on every re-render and creates loops. Use `onInit()` for one-time setup and `onSectionActivated()` for per-activation work.

---

## Common Patterns

### Record detail viewer (FileView shape)

The canonical pattern: a header block + ContextMenu over a SideNavView, hosted inside a [Modal](Modal.md). All four built-in detail viewers (`FileView`, `IPSetView`, `ShortLinkView`, `UserView`) follow this shape. Note the `min-height` / `max-height` on the SideNavView container — the content panel scrolls and needs a bounded parent.

```js
import { View, SideNavView, ContextMenu } from 'web-mojo';

class FileView extends View {
    constructor(options = {}) {
        super({ className: 'file-view', ...options });
        this.model = options.model;

        this.template = `
            <div class="d-flex flex-column" style="min-height: 0;">
                <div class="d-flex justify-content-between align-items-start mb-3 flex-shrink-0">
                    <div data-container="file-header" style="flex: 1; min-width: 0;"></div>
                    <div data-container="file-context-menu" class="ms-3 flex-shrink-0"></div>
                </div>
                <div data-container="file-sidenav" class="flex-grow-1"
                     style="min-height: 400px; max-height: 70vh;"></div>
            </div>
        `;
    }

    async onInit() {
        this.sideNavView = new SideNavView({
            containerId:   'file-sidenav',
            activeSection: 'preview',
            navWidth:      200,
            sections: [
                { key: 'preview',    label: 'Preview',    icon: 'bi-image',
                  view: new FilePreviewSection({ model: this.model }) },
                { key: 'details',    label: 'Details',    icon: 'bi-info-circle',
                  view: new DataView({ model: this.model, fields: detailFields }) },
                { key: 'renditions', label: 'Renditions', icon: 'bi-layers',
                  view: new FileRenditionsSection({ model: this.model }) },
            ],
        });
        this.addChild(this.sideNavView);

        this.contextMenu = new ContextMenu({
            containerId: 'file-context-menu',
            context:     this.model,
            config:      { icon: 'bi-three-dots-vertical', items: [/*…*/] },
        });
        this.addChild(this.contextMenu);
    }
}
```

### Permission-gated sections

Add a `permissions` string and let SideNavView filter the section out for users who lack it. No manual `if` blocks needed.

```js
new SideNavView({
    sections: [
        { key: 'details',  label: 'Details',  view: detailsView },
        { key: 'audit',    label: 'Audit Log', view: auditView,
          permissions: 'view_audit_log' },          // hidden from non-auditors
        { key: 'billing',  label: 'Billing', view: billingView,
          permissions: 'manage_billing' },
    ],
});
```

The check uses `this.getApp().activeUser.hasPerm(permission)`. If the app isn't available yet, the section is allowed through — re-checking happens lazily.

### Programmatic switching from a parent action

A common UX pattern: a button in one section jumps to another. Host views (`FileView`, `UserView`, …) typically expose their own `showSection(name)` that delegates to the SideNavView so callers don't need to reach through.

```js
class FileView extends View {
    async showSection(name) {
        if (this.sideNavView) await this.sideNavView.showSection(name);
    }
}

// From a parent action handler
async onActionEditDetails() {
    await this.fileView.showSection('details');
}
```

### Reacting to section changes

```js
this.sideNavView = new SideNavView({ sections, activeSection: 'preview' });
this.sideNavView.on('section:changed', ({ activeSection, previousSection }) => {
    this.getApp()?.events?.emit('record:section-viewed', {
        recordId: this.model.get('id'),
        section:  activeSection,
        previous: previousSection,
    });
});
this.addChild(this.sideNavView);
```

### Building section views from `DataView`

Most detail sections are just a [`DataView`](DataView.md) over the same model — no custom subclass needed.

```js
const detailsView = new DataView({
    model: this.model,
    className: 'p-3',
    columns: 2,
    fields: [
        { name: 'id',       label: 'ID' },
        { name: 'filename', label: 'Filename' },
        { name: 'created',  label: 'Created', format: 'datetime' },
    ],
});

new SideNavView({
    sections: [
        { key: 'details', label: 'Details', icon: 'bi-info-circle', view: detailsView },
    ],
});
```

---

## Common Pitfalls

### ⚠️ Calling `render()` / `mount()` on section views manually

SideNavView mounts the active section automatically and unmounts the previous one on switch. Calling `view.render()` or `view.mount()` yourself causes duplicate mounts and orphaned DOM.

```js
// ❌ WRONG
const sectionView = new DetailsSection({ model });
await sectionView.render(true, container);    // mounted once here…
new SideNavView({ sections: [{ key: 'details', view: sectionView, /*…*/ }] });
// …and SideNavView will try to mount it again on first activation.

// ✅ CORRECT — just hand the unrendered view to SideNavView
new SideNavView({
    sections: [{ key: 'details', view: new DetailsSection({ model }) }],
});
```

### ⚠️ No bounded height on the SideNavView container

The content panel uses `overflow-y: auto`. If the parent has no height ceiling, content stretches the layout instead of scrolling.

```html
<!-- ❌ WRONG — no height bounds, content overflows the modal -->
<div data-container="my-sidenav"></div>

<!-- ✅ CORRECT — let the panel scroll inside a bounded box -->
<div data-container="my-sidenav" class="flex-grow-1"
     style="min-height: 400px; max-height: 70vh;"></div>
```

### ⚠️ Re-rendering the host view on every `model.change`

If the host view re-renders its template on every model change, it tears down and recreates the SideNavView and all its sections — destroying per-section state (open form fields, scroll positions). Override `_onModelChange()` to a no-op when section views handle their own reactivity.

```js
class FileView extends View {
    // ✅ Section views manage their own model reactivity
    _onModelChange() {
        // no-op — same pattern as UserView, ShortLinkView
    }
}
```

### ⚠️ `data-action` on a `<form>` element inside a section

Standard MOJO rule applies inside section views: `data-action` belongs on the submit `<button type="button">`, never on the `<form>` itself.

```html
<!-- ❌ WRONG -->
<form data-action="save-settings">…</form>

<!-- ✅ CORRECT -->
<form>
    <!-- inputs -->
    <button type="button" data-action="save-settings" class="btn btn-primary">Save</button>
</form>
```

### ⚠️ Fetching data in `onAfterRender()` of a section view

`onAfterRender()` runs on every re-render and causes fetch loops. Fetch in `onInit()` for one-time loads, or in `onSectionActivated()` if you specifically want the fetch to happen each time the section is activated.

```js
// ❌ WRONG
class HistorySection extends View {
    async onAfterRender() {
        await this.collection.fetch();   // re-fetches on every render
    }
}

// ✅ CORRECT
class HistorySection extends View {
    async onInit() {
        await this.collection.fetch();   // once
    }
    async onSectionActivated() {
        await this.collection.fetch();   // each time the user opens the tab
    }
}
```

### ⚠️ Reusing the same section view in multiple SideNavViews

A View instance can only be mounted in one place at a time. Sharing a single `view:` reference across two SideNavViews causes DOM conflicts.

```js
// ❌ WRONG
const shared = new SettingsSection({ model });
sideNavA.addSection({ key: 's', label: 'Settings', view: shared });
sideNavB.addSection({ key: 's', label: 'Settings', view: shared });   // ⚠️

// ✅ CORRECT — one instance per host
sideNavA.addSection({ key: 's', label: 'Settings', view: new SettingsSection({ model }) });
sideNavB.addSection({ key: 's', label: 'Settings', view: new SettingsSection({ model }) });
```

### ⚠️ Expecting events from sections to bubble to the host view

SideNavView assigns `section.parent = this` (the SideNavView itself), not the host view. If a section's action handler needs to call back into the host view, walk the `parent` chain explicitly — the same pattern `FileRenditionsSection` and `FileSharesSection` use.

```js
// Inside a section view
async onActionRegenerateFromSection() {
    let node = this.parent;
    while (node) {
        if (typeof node.onActionRegenerateRenditions === 'function') {
            return node.onActionRegenerateRenditions();
        }
        node = node.parent;
    }
}
```

---

## Related Documentation

- **[View](../core/View.md)** — base class; section views are regular Views
- **[Modal](Modal.md)** — typical host for record-detail SideNavViews
- **[FileView](FileView.md)** — canonical SideNavView host (preview / details / renditions / shares)
- **[DataView](DataView.md)** — drop into a section to display model fields without a custom subclass
- **[ContextMenu](ContextMenu.md)** — header companion in detail viewers
- **[TabView](../components/TabView.md)** — simpler tab strip alternative for short tab counts
- **[Events](../core/Events.md)** — `section:changed`, `navigation:modeChanged` listeners

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/components/SideNavView/SideNavViewExample.js`](../../../examples/portal/examples/components/SideNavView/SideNavViewExample.js) — Section-based detail layout used inside Modal record viewers (FileView, IPSetView, …).

<!-- examples:cross-link end -->
