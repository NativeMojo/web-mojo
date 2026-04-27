# WEB-MOJO Architecture

> Project structure, source map, and key reference for the web-mojo framework itself.
> This is the **framework source repo** — not a consuming application.

---

## 📁 Repository Layout

```
web-mojo/
├── src/                        # Framework source code
│   ├── core/                   # Core framework classes
│   ├── extensions/             # Optional add-on modules
│   └── styles/                 # Global CSS
├── docs/                       # Documentation
│   ├── web-mojo/               # Published docs (source of truth)
│   │   ├── README.md           # Docs index — start here
│   │   ├── core/               # Core concept docs
│   │   ├── pages/              # Page-level routing docs
│   │   ├── services/           # HTTP, WebSocket, Toast docs
│   │   ├── components/         # UI component docs
│   │   ├── extensions/         # Extension docs (charts, maps, etc.)
│   │   ├── forms/              # Form system docs (FormView, inputs, validation)
│   │   ├── models/             # Built-in model docs
│   │   ├── mixins/             # Mixin docs
│   │   └── utils/              # Utility class docs
│   └── pending_update/         # ⚠️ Drafts awaiting review — DO NOT use as authoritative
├── examples/                   # Standalone example apps
├── test/                       # Test suites
├── prompts/                    # AI agent mode prompts
│   ├── building.md             # Mindset + rules for implementation work
│   └── planning.md             # Mindset + output format for planning work
├── AGENT.md                    # Agent entry point (rules, boot protocol, doc index)
├── architecture.md             # This file
├── memory.md                   # Working memory (in-progress, gotchas, decisions)
├── DEV_GUIDE.md                # Framework contributor guide (build system, extensions)
├── QUICK_START.md              # End-user quick-start guide (not agent-facing)
└── CHANGELOG.md                # Version history
```

---

## 🔧 Source Directory Map (`src/`)

### `src/core/`
The non-optional heart of the framework. Every app depends on these.

| File/Dir | Purpose |
|---|---|
| `View.js` | Base component class — lifecycle, templates, event delegation |
| `Model.js` | Single resource with REST CRUD and dirty tracking |
| `Collection.js` | Ordered set of Models with pagination and querying |
| `WebApp.js` | Top-level app container: routing, REST, state, EventBus |
| `PortalApp.js` | Extends WebApp: auth, sidebar, topbar, group switching |
| `Router.js` | Hash-based URL routing |
| `EventBus.js` | Global event bus (`app.events`) |
| `Rest.js` | HTTP client with interceptors and file support |
| `DataFormatter.js` | 80+ pipe formatters used in Mustache templates |
| `forms/` | FormView, FormBuilder, and all input components |
| `views/navigation/` | Sidebar, TopNav, SideNavView, **TabView** |
| `views/table/` | TableView, column/filter system |
| `views/list/` | ListView component |
| `pages/` | TablePage, NotFound/Denied/Error pages |
| `services/` | Rest, ToastService, WebSocketClient, **FileUpload** |
| `utils/` | MOJOUtils, DjangoLookups, and other helpers |

### `src/extensions/`
Optional modules. Each is a self-contained entry point with its own registration function.

| Extension | Purpose |
|---|---|
| `charts/` | Native SVG charts (SeriesChart, PieChart, MetricsChart) |
| `admin/` | Pre-built admin pages and CRUD scaffolding (`web-mojo/admin`) |
| `admin/models/` | Admin-coupled models (`web-mojo/admin-models`, no UI deps) |
| `map/` | Leaflet `MapView`, MapLibre GL `MapLibreView`, geolocation |
| `timeline/` | Timeline / activity feed visualization |
| `lightbox/` | Image lightbox viewer |
| `auth/` | Auth pages and AuthManager |
| `user-profile/` | Profile + settings views |
| `docit/` | Markdown docs viewer |

---

## 📄 Key Pages and Services

| Class | File | One-liner |
|---|---|---|
| `Page` | `src/core/Page.js` | Extends View with routing lifecycle (`onEnter`/`onExit`), URL params, permissions |
| `FormPage` | `src/core/FormPage.js` | Extends Page for edit-form screens; auto-loads model from URL param |
| `TablePage` | `src/core/pages/TablePage.js` | Page wrapper for TableView with URL-synced filters/pagination |
| `ToastService` | `src/core/ToastService.js` | Bootstrap 5 toast notifications, auto-dismiss |
| `WebSocketClient` | `src/core/WebSocketClient.js` | WS client with auto-reconnect, heartbeat, auth header injection |
| `Modal` | `src/core/views/feedback/Modal.js` | Canonical static API for modals: alert, confirm, prompt, dialog, show, form, code, htmlPreview, loading |
| `ModalView` | `src/core/views/feedback/ModalView.js` | Underlying View class behind every modal — Bootstrap 5 mechanics, sizing, stacking |
| `Dialog` | `src/core/views/feedback/Dialog.js` | Compat shim — re-exports `ModalView`, every static routes through `Modal.*` |

---

## 🏗️ Build System

Three build targets — see `DEV_GUIDE.md` for full detail.

| Command | Output | Purpose |
|---|---|---|
| `npm run build` | `dist/web-mojo.js` | Full bundle (all extensions) |
| `npm run build:lib` | `dist/web-mojo.esm.js` | ESM library for npm consumers |
| `npm run build:lite` | `dist/web-mojo.lite.js` | Core only, no extensions |

**Dev server:** `npm run dev` — runs `index.html` example app via Vite.

---

## 📐 File Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Class files | PascalCase | `UserProfileView.js` |
| Class name | Matches filename | `class UserProfileView extends View` |
| `data-action` values | kebab-case | `data-action="save-draft"` |
| Action handler methods | `onAction` + PascalCase | `onActionSaveDraft()` |
| `data-container` values | kebab-case | `data-container="chart-area"` |
| CSS files | kebab-case | `multiselect.css` |
| Extension entry points | PascalCase | `Charts.js` |

---

## 🔗 Documentation Quick-Access

The docs at `docs/web-mojo/` mirror the published GitHub raw URLs used in AGENT.md.
When the local and remote docs differ, **the local `docs/web-mojo/` folder is more current**.

| Topic | Local path | Remote URL |
|---|---|---|
| Docs index | `docs/web-mojo/README.md` | — |
| View lifecycle | `docs/web-mojo/core/View.md` | `https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/web-mojo/core/View.md` |
| Templates & formatters | `docs/web-mojo/core/Templates.md` | `https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/web-mojo/core/Templates.md` |
| Forms system | `docs/web-mojo/forms/README.md` | — (local only) |
| Built-in models | `docs/web-mojo/models/BuiltinModels.md` | `https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/web-mojo/models/BuiltinModels.md` |

For the full doc index and all component/extension links, see [`docs/web-mojo/README.md`](docs/web-mojo/README.md).