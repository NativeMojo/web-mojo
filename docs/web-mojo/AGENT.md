# WEB-MOJO — Framework Reference for AI Agents

> **Copy this file into your project** as `AGENT.md` or append it to your existing agent context.
> It gives agents everything they need to use web-mojo correctly.

WEB-MOJO is a component-based JavaScript framework for building data-driven web applications using Views, Models, Collections, and Mustache templates.

---

## ⚡ Critical Rules (Violations Cause Bugs)

- **NO `data-action` on `<form>` elements** — put it on `<button type="button">` inside the form
- **NO data fetching in `onAfterRender()` or `onAfterMount()`** — causes infinite re-render loops; fetch in `onInit()` or action handlers
- **NO manual `render()`/`mount()` after `addChild()`** — the framework handles it; only set `containerId`
- **NO `getViewData()` or `get()` on views** — the view instance IS the Mustache context; use `this.property`
- **`|bool` required for boolean checks** — `{{#flag}}` iterates arrays; `{{#flag|bool}}` does a boolean check
- **`{{{triple braces}}}` required for HTML output** — double braces always escape
- **String formatter args need quotes** — `{{date|date:'YYYY-MM-DD'}}` not `{{date|date:YYYY-MM-DD}}`
- **`{{.property}}` in iterations** — not `{{property}}`; objects need `|iter` to iterate key/value pairs
- **Pages are cached** — per-visit logic belongs in `onEnter()`, not the constructor or `onInit()`
- **NO formatters in chart config** — use plain JS callbacks instead

---

## 📚 Framework Documentation (Fetch When Needed)

**Base URL:** `https://raw.githubusercontent.com/NativeMojo/web-mojo/main/`

| Topic | URL path (append to base) |
|---|---|
| WebApp | `docs/web-mojo/core/WebApp.md` |
| PortalApp | `docs/web-mojo/core/PortalApp.md` |
| View | `docs/web-mojo/core/View.md` |
| Templates ⚠️ | `docs/web-mojo/core/Templates.md` |
| DataFormatter | `docs/web-mojo/core/DataFormatter.md` |
| Model | `docs/web-mojo/core/Model.md` |
| Collection | `docs/web-mojo/core/Collection.md` |
| Events | `docs/web-mojo/core/Events.md` |
| Child Views | `docs/web-mojo/core/ViewChildViews.md` |
| Advanced Views | `docs/web-mojo/core/AdvancedViews.md` |
| Page | `docs/web-mojo/pages/Page.md` |
| FormPage | `docs/web-mojo/pages/FormPage.md` |
| Rest | `docs/web-mojo/services/Rest.md` |
| ToastService | `docs/web-mojo/services/ToastService.md` |
| WebSocketClient | `docs/web-mojo/services/WebSocketClient.md` |
| Dialog | `docs/web-mojo/components/Dialog.md` |
| Sidebar & TopNav | `docs/web-mojo/components/SidebarTopNav.md` |
| ListView | `docs/web-mojo/components/ListView.md` |
| TableView | `docs/web-mojo/components/TableView.md` |
| TabView | `docs/web-mojo/components/TabView.md` |
| TablePage | `docs/web-mojo/pages/TablePage.md` |
| DataView | `docs/web-mojo/components/DataView.md` |
| BuiltinModels | `docs/web-mojo/models/BuiltinModels.md` |
| MOJOUtils | `docs/web-mojo/utils/MOJOUtils.md` |
| Charts | `docs/web-mojo/extensions/Charts.md` |
| MapView / MapLibre | `docs/web-mojo/extensions/MapView.md` |
| FileUpload | `docs/web-mojo/services/FileUpload.md` |
| LightBox | `docs/web-mojo/extensions/LightBox.md` |
| TimelineView | `docs/web-mojo/extensions/TimelineView.md` |
| Location | `docs/web-mojo/extensions/Location.md` |
| Admin | `docs/web-mojo/extensions/Admin.md` |
| Forms overview | `docs/web-mojo/forms/README.md` |

**Human-readable portal:** https://nativemojo.com/web-mojo/

---

## 🗺️ When to Read What

| Task | Fetch these docs |
|---|---|
| Building a simple app | `WebApp.md` + `View.md` + `Templates.md` |
| Building a portal (auth + sidebar) | `PortalApp.md` + `Page.md` + `SidebarTopNav.md` |
| Any view or component | `View.md` + `Templates.md` ⚠️ read pitfalls |
| Adding child components | `ViewChildViews.md` |
| Working with data | `Model.md` or `Collection.md` |
| Creating a routed page | `Page.md` |
| Edit form as a routed page | `FormPage.md` |
| Group / org settings page | `FormPage.md` — override `getModel()` or rely on `activeGroup` |
| HTTP requests / REST API | `Rest.md` |
| Modal dialogs | `Dialog.md` |
| Toast notifications | `ToastService.md` |
| Real-time / WebSocket | `WebSocketClient.md` |
| Data tables | `components/TableView.md` + `pages/TablePage.md` |
| List components | `ListView.md` |
| Charts / data visualization | `Charts.md` |
| Tab navigation | `TabView.md` |
| Maps / geolocation | `MapView.md` + `Location.md` |
| Image lightbox | `LightBox.md` |
| File uploads | `FileUpload.md` |
| Timeline visualization | `TimelineView.md` |
| Admin pages / CRUD scaffolding | `Admin.md` |
| Built-in models (User, Group…) | `BuiltinModels.md` |
| Sidebar / TopNav / homeless pages | `SidebarTopNav.md` |
| Template formatters (80+) | `DataFormatter.md` |
| Event handling | `Events.md` |
| Complex rendering (Canvas, WebGL) | `AdvancedViews.md` |
| Utility helpers | `MOJOUtils.md` |

---

## 🔑 Key Patterns (Quick Reference)

- **View instance IS the Mustache context** — `this.myProp = value` → `{{myProp}}` in template
- **`data-action="kebab-case"`** → method `onActionKebabCase(event, element)` on the view
- **`data-container="name"`** in template + `containerId: 'name'` on child view → `addChild(child)`
- **`onInit()`** — one-time setup (child views, initial fetch); runs lazily before first render
- **`onEnter()`** (Page only) — runs on every navigation to the page; use for data refresh
- **`app.events`** — global EventBus for cross-component communication
- **`app.rest`** — shared HTTP client; configured once, used automatically by all models

### REST response shape

```javascript
// response from rest.GET / POST / etc.
{
  success: boolean,   // true = HTTP 2xx
  status: number,     // HTTP status code
  data: {             // your API's JSON body
    status: boolean,  // server-level success flag
    data: object,     // actual payload
    error: string     // server error message
  }
}
```

### Bootstrap 5.3 + Bootstrap Icons

Use Bootstrap 5.3 for all layout and styling. Use Bootstrap Icons (`bi-*`) for all icons. Do not introduce other CSS frameworks or icon sets.