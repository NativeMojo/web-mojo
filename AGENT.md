# WEB-MOJO — Agent Entry Point

WEB-MOJO is a component-based JavaScript framework for building data-driven web applications using Views, Models, Collections, and Mustache templates.

---

## 🚀 Thread Start Protocol

1. Read this file first (you're doing it now).
2. Read `docs/agent/architecture.md` for project structure and source map.
3. Read `memory.md` for current work, gotchas, and decisions.
4. For the task at hand, fetch the relevant remote doc listed below — don't guess, read it.

---

## 📚 Framework Documentation (Remote — Fetch When Needed)

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
| TablePage | `docs/web-mojo/components/TablePage.md` |
| DataView | `docs/web-mojo/components/DataView.md` |
| BuiltinModels | `docs/web-mojo/models/BuiltinModels.md` |
| MOJOUtils | `docs/web-mojo/utils/MOJOUtils.md` |
| Charts | `docs/web-mojo/extensions/Charts.md` |
| TabView | `docs/web-mojo/extensions/TabView.md` |
| MapView / MapLibre | `docs/web-mojo/extensions/MapView.md` |
| FileUpload | `docs/web-mojo/extensions/FileUpload.md` |
| LightBox | `docs/web-mojo/extensions/LightBox.md` |
| TimelineView | `docs/web-mojo/extensions/TimelineView.md` |
| Location | `docs/web-mojo/extensions/Location.md` |
| Admin | `docs/web-mojo/extensions/Admin.md` |
| Forms overview | `docs/web-mojo/forms/README.md` |

**Human-readable portal:** https://nativemojo.com/web-mojo/

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
- **NO formatters in Chart.js config** — use JS callbacks instead

---

## 🛠️ Code Style

- Bootstrap 5.3 for all styling; Bootstrap Icons for all icons
- `data-action="kebab-case"` → handler `onActionKebabCase(event, element)`
- `data-container="name"` → child view `containerId: 'name'`
- Class names PascalCase, match filename; actions kebab-case; containers kebab-case
- No tests, examples, or docs unless explicitly asked

---

## 🧪 Build & Test

```sh
npm run dev          # development server
npm run build        # production build (full)
npm run build:lib    # library build
npm run lint         # ESLint
```

---

## 🗂️ Source of Truth

| File | Purpose |
|---|---|
| `AGENT.md` | This file — entry point, critical rules, doc index |
| `docs/agent/architecture.md` | Project structure, patterns, app map |
| `memory.md` | Current work, gotchas, decisions |
| `prompts/building.md` | Building-mode mindset and rules |
| `prompts/planning.md` | Planning-mode output format |
| `docs/web-mojo/AGENT.md` | Consumer drop-in — copy into other projects to give their agents web-mojo knowledge |
| `docs/web-mojo/README.md` | Full local docs index |
| `DEV_GUIDE.md` | Framework contributor guide (build system, extensions) |
| `docs/pending_update/` | Unreviewed docs — do not rely on these |
