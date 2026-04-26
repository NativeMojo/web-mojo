# Examples Index

> **Generated** by `examples/portal/scripts/build-registry.js`. Do not edit by hand.

Single canonical example per documented component. Pages are organized by topic — the same taxonomy that drives the portal sidebars. Each link below points at the runnable, copy-paste reference file.

## Architecture

### Core

| Component | Summary | Doc |
|---|---|---|
| [View](../../examples/portal/examples/core/View/ViewExample.js) | Base component: lifecycle, templates, data-action, child views. | [core/View.md](../../docs/web-mojo/core/View.md) |
| [View — child views](../../examples/portal/examples/core/ViewChildViews/ViewChildViewsExample.js) | Full child-view tour: containers, collection iteration, events, action bubbling, remount. | [core/ViewChildViews.md](../../docs/web-mojo/core/ViewChildViews.md) |
| [Advanced Views — Canvas](../../examples/portal/examples/core/AdvancedViews/AdvancedViewsExample.js) | Canvas inside a View with onAfterRender setup and onBeforeDestroy cleanup. | [core/AdvancedViews.md](../../docs/web-mojo/core/AdvancedViews.md) |
| [Templates](../../examples/portal/examples/core/Templates/TemplatesExample.js) | Live Mustache playground: edit template + JSON, see the framework render it. | [core/Templates.md](../../docs/web-mojo/core/Templates.md) |
| [DataFormatter](../../examples/portal/examples/core/DataFormatter/DataFormatterExample.js) | Live formatter playground — apply or chain any registered pipe formatter. | [core/DataFormatter.md](../../docs/web-mojo/core/DataFormatter.md) |
| [Model](../../examples/portal/examples/core/Model/ModelExample.js) | REST-backed entity with attribute access, change events, dirty tracking, and CRUD. | [core/Model.md](../../docs/web-mojo/core/Model.md) |
| [Collection](../../examples/portal/examples/core/Collection/CollectionExample.js) | Model set with setParams/updateParams, where() filtering, and events. | [core/Collection.md](../../docs/web-mojo/core/Collection.md) |
| [Events](../../examples/portal/examples/core/Events/EventsExample.js) | EventBus for global pub/sub and per-instance on/emit on Models and Views. | [core/Events.md](../../docs/web-mojo/core/Events.md) |

### App Shells

| Component | Summary | Doc |
|---|---|---|
| [WebApp](../../examples/portal/examples/core/WebApp/WebAppExample.js) | Minimal app shell: routing, page registry, REST client, global event bus. | [core/WebApp.md](../../docs/web-mojo/core/WebApp.md) |
| [PortalApp](../../examples/portal/examples/core/PortalApp/PortalAppExample.js) | WebApp plus sidebar, topbar, auth, multi-tenant group, and toast notifications. | [core/PortalApp.md](../../docs/web-mojo/core/PortalApp.md) |
| [PortalWebApp](../../examples/portal/examples/core/PortalWebApp/PortalWebAppExample.js) | Opinionated portal: auth-gated router, automatic WebSocket, lifecycle events. | [core/PortalWebApp.md](../../docs/web-mojo/core/PortalWebApp.md) |

### Pages

| Component | Summary | Doc |
|---|---|---|
| [Page](../../examples/portal/examples/pages/Page/PageExample.js) | Routed screen base: onEnter/onExit, URL params, permissions. | [pages/Page.md](../../docs/web-mojo/pages/Page.md) |
| [FormPage](../../examples/portal/examples/pages/FormPage/FormPageExample.js) | Page wrapped around a FormView with model load/save. | [pages/FormPage.md](../../docs/web-mojo/pages/FormPage.md) |
| [TablePage](../../examples/portal/examples/pages/TablePage/TablePageExample.js) | URL-synced table over a seeded Collection — sort, filter, search, pagination. | [pages/TablePage.md](../../docs/web-mojo/pages/TablePage.md) |
| [TablePage — with forms](../../examples/portal/examples/pages/TablePage/TablePageWithFormsExample.js) | Toolbar Add and row-edit open Modal.form dialogs that persist to the Collection. | [pages/TablePage.md](../../docs/web-mojo/pages/TablePage.md) |
| [TablePage — with detail view](../../examples/portal/examples/pages/TablePage/TablePageWithDetailViewExample.js) | itemView opens a custom detail View in a Modal, with deep-linkable _item URL param. | [pages/TablePage.md](../../docs/web-mojo/pages/TablePage.md) |

### Services

| Component | Summary | Doc |
|---|---|---|
| [Rest](../../examples/portal/examples/services/Rest/RestExample.js) | HTTP client: GET/POST/PUT/DELETE, file upload/download, interceptors. | [services/Rest.md](../../docs/web-mojo/services/Rest.md) |
| [ToastService](../../examples/portal/examples/services/ToastService/ToastServiceExample.js) | Bootstrap 5 toasts: success/warn/error/info, view-as-toast. | [services/ToastService.md](../../docs/web-mojo/services/ToastService.md) |
| [WebSocketClient](../../examples/portal/examples/services/WebSocketClient/WebSocketClientExample.js) | WebSocket client with auto-reconnect and heartbeat. | [services/WebSocketClient.md](../../docs/web-mojo/services/WebSocketClient.md) |
| [FileUpload](../../examples/portal/examples/services/FileUpload/FileUploadExample.js) | Drag-and-drop file handling via applyFileDropMixin with validation. | [services/FileUpload.md](../../docs/web-mojo/services/FileUpload.md) |

### Models

| Component | Summary | Doc |
|---|---|---|
| [Built-in Models](../../examples/portal/examples/models/BuiltinModels/BuiltinModelsExample.js) | Catalog of built-in Model/Collection classes (User, Group, Job, …) plus a UserList demo. | [models/BuiltinModels.md](../../docs/web-mojo/models/BuiltinModels.md) |

## Components

### Modals & Dialogs

| Component | Summary | Doc |
|---|---|---|
| [Dialog](../../examples/portal/examples/components/Dialog/DialogExample.js) | alert / confirm / prompt / showBusy / showDialog — promise-based modal helpers. | [components/Dialog.md](../../docs/web-mojo/components/Dialog.md) |
| [Dialog — forms](../../examples/portal/examples/components/Dialog/DialogFormExample.js) | showForm and showModelForm — host a FormView inside a Dialog. | [components/Dialog.md](../../docs/web-mojo/components/Dialog.md) |
| [Dialog — context menu](../../examples/portal/examples/components/Dialog/DialogContextMenuExample.js) | Header dropdown menu with permission-gated items. | [components/Dialog.md](../../docs/web-mojo/components/Dialog.md) |
| [Dialog — custom body](../../examples/portal/examples/components/Dialog/DialogCustomBodyExample.js) | Mount any View as the dialog body; read its state when the dialog closes. | [components/Dialog.md](../../docs/web-mojo/components/Dialog.md) |
| [Modal](../../examples/portal/examples/components/Modal/ModalExample.js) | Modal.show(view) — size matrix (sm/md/lg/xl/xxl/fullscreen), scrollable, static backdrop. | [components/Modal.md](../../docs/web-mojo/components/Modal.md) |
| [Modal — showModel](../../examples/portal/examples/components/Modal/ModalShowModelExample.js) | Modal.showModel and showModelById — open a model in its VIEW_CLASS automatically. | [components/Modal.md](../../docs/web-mojo/components/Modal.md) |
| [Modal — form](../../examples/portal/examples/components/Modal/ModalFormExample.js) | Modal.form — host a FormView in a modal, resolve with the submitted data. | [components/Modal.md](../../docs/web-mojo/components/Modal.md) |

### Lists & Tables

| Component | Summary | Doc |
|---|---|---|
| [ListView](../../examples/portal/examples/components/ListView/ListViewExample.js) | Visual list bound to a Collection — per-row Views with click-to-select. | [components/ListView.md](../../docs/web-mojo/components/ListView.md) |
| [ListView — custom item class](../../examples/portal/examples/components/ListView/ListViewCustomItemExample.js) | ListViewItem subclass with avatar, badges, and computed display fields. | [components/ListView.md](../../docs/web-mojo/components/ListView.md) |
| [ListView — live search filter](../../examples/portal/examples/components/ListView/ListViewLiveFilterExample.js) | Search input above the list, debounced via MOJOUtils.debounce + collection.where(). | [components/ListView.md](../../docs/web-mojo/components/ListView.md) |
| [TableView](../../examples/portal/examples/components/TableView/TableViewExample.js) | Sortable, filterable, paginated table over ~25 seeded user rows. | [components/TableView.md](../../docs/web-mojo/components/TableView.md) |
| [TableView — batch actions](../../examples/portal/examples/components/TableView/TableViewBatchActionsExample.js) | Multi-select rows + bulk actions wired to the in-memory Collection. | [components/TableView.md](../../docs/web-mojo/components/TableView.md) |
| [TableView — custom row class](../../examples/portal/examples/components/TableView/TableViewCustomRowExample.js) | Custom itemClass (TableRow subclass) with avatar, badges, and expand-on-click. | [components/TableView.md](../../docs/web-mojo/components/TableView.md) |
| [TableView — server collection](../../examples/portal/examples/components/TableView/TableViewServerExample.js) | Bound to UserList against the live backend, with fetch:error handling. | [components/TableView.md](../../docs/web-mojo/components/TableView.md) |
| [DataView](../../examples/portal/examples/components/DataView/DataViewExample.js) | Structured key/value display with field types for email, URL, boolean, dates, and JSON. | [components/DataView.md](../../docs/web-mojo/components/DataView.md) |

### Files

| Component | Summary | Doc |
|---|---|---|
| [FileView](../../examples/portal/examples/components/FileView/FileViewExample.js) | Modal-hosted file viewer — the canonical pattern for opening a File record. | [components/FileView.md](../../docs/web-mojo/components/FileView.md) |
| [FileView — inline](../../examples/portal/examples/components/FileView/FileViewInlineExample.js) | Rare alternative — embed FileView directly in a page instead of a Modal. | [components/FileView.md](../../docs/web-mojo/components/FileView.md) |
| [Image fields](../../examples/portal/examples/components/ImageFields/ImageFieldsExample.js) | FormView image input fields — five size variants, drag/drop, and rendition-aware preview. | [components/ImageFields.md](../../docs/web-mojo/components/ImageFields.md) |

### Navigation

| Component | Summary | Doc |
|---|---|---|
| [Sidebar & TopNav](../../examples/portal/examples/components/SidebarTopNav/SidebarTopNavExample.js) | Portal navigation chrome — sidebar menus and topbar configured via PortalApp. | [components/SidebarTopNav.md](../../docs/web-mojo/components/SidebarTopNav.md) |
| [Sidebar + Active Group](../../examples/portal/examples/components/ActiveGroup/ActiveGroupExample.js) | app.activeGroup, group:changed events, and sidebar menus filtered by groupKind. | [components/SidebarTopNav.md](../../docs/web-mojo/components/SidebarTopNav.md) |
| [SideNavView](../../examples/portal/examples/components/SideNavView/SideNavViewExample.js) | Section-based detail layout used inside Modal record viewers (FileView, IPSetView, …). | [components/SideNavView.md](../../docs/web-mojo/components/SideNavView.md) |
| [TabView](../../examples/portal/examples/components/TabView/TabViewExample.js) | Tab navigation with static tabs and lazy mounting. | [components/TabView.md](../../docs/web-mojo/components/TabView.md) |
| [TabView — dynamic](../../examples/portal/examples/components/TabView/TabViewDynamicExample.js) | Tabs added and removed at runtime. | [components/TabView.md](../../docs/web-mojo/components/TabView.md) |
| [ContextMenu](../../examples/portal/examples/components/ContextMenu/ContextMenuExample.js) | Three-dots row menu — items dispatch data-action handlers on the row View. | [components/ContextMenu.md](../../docs/web-mojo/components/ContextMenu.md) |
| [ContextMenu — right-click row](../../examples/portal/examples/components/ContextMenu/ContextMenuRowExample.js) | Right-click variant — the menu attaches to the row, not a trigger button. | [components/ContextMenu.md](../../docs/web-mojo/components/ContextMenu.md) |

### Other

| Component | Summary | Doc |
|---|---|---|
| [ChatView](../../examples/portal/examples/components/ChatView/ChatViewExample.js) | Chat thread with composer — ChatView + ChatMessageView + ChatInputView. | [components/ChatView.md](../../docs/web-mojo/components/ChatView.md) |

## Forms

### FormView

| Component | Summary | Doc |
|---|---|---|
| [FormView](../../examples/portal/examples/forms/FormView/FormViewExample.js) | FormView fundamentals: fields, validation, submission. | [forms/FormView.md](../../docs/web-mojo/forms/FormView.md) |
| [FormView — all field types](../../examples/portal/examples/forms/FormView/AllFieldTypesExample.js) | Comprehensive reference of every supported field type. | [forms/FormView.md](../../docs/web-mojo/forms/FormView.md) |
| [FormBuilder — pure HTML generation](../../examples/portal/examples/forms/FormBuilder/FormBuilderExample.js) | Generate Bootstrap form HTML directly from a fields config — no FormView, no lifecycle, no validation. | [forms/FormBuilder.md](../../docs/web-mojo/forms/FormBuilder.md) |

### Field Types

| Component | Summary | Doc |
|---|---|---|
| [Text inputs](../../examples/portal/examples/forms/TextInputs/TextInputsExample.js) | Text, email, password, tel, url, search, hex, number fields. | [forms/BasicTypes.md](../../docs/web-mojo/forms/BasicTypes.md) |
| [Selection fields](../../examples/portal/examples/forms/SelectionFields/SelectionFieldsExample.js) | Select, radio, checkbox, toggle/switch, and button group. | [forms/BasicTypes.md](../../docs/web-mojo/forms/BasicTypes.md) |
| [Date & time fields](../../examples/portal/examples/forms/DateTimeFields/DateTimeFieldsExample.js) | Native HTML5 date, time, and datetime-local pickers. | [forms/BasicTypes.md](../../docs/web-mojo/forms/BasicTypes.md) |
| [File & media fields](../../examples/portal/examples/forms/FileMediaFields/FileMediaFieldsExample.js) | File upload, image preview, audio/video file inputs. | [forms/FileHandling.md](../../docs/web-mojo/forms/FileHandling.md) |
| [Textarea fields](../../examples/portal/examples/forms/TextareaFields/TextareaFieldsExample.js) | Multi-line text plus htmlpreview and json variants. | [forms/BasicTypes.md](../../docs/web-mojo/forms/BasicTypes.md) |
| [Structural fields](../../examples/portal/examples/forms/StructuralFields/StructuralFieldsExample.js) | Header, divider, html, button, and hidden — non-input field types. | [forms/BasicTypes.md](../../docs/web-mojo/forms/BasicTypes.md) |
| [Other fields](../../examples/portal/examples/forms/OtherFields/OtherFieldsExample.js) | Color, range, and hex-color fields with live previews. | [forms/BasicTypes.md](../../docs/web-mojo/forms/BasicTypes.md) |

### Specialized Inputs

| Component | Summary | Doc |
|---|---|---|
| [TagInput](../../examples/portal/examples/forms/inputs/TagInput/TagInputExample.js) | Tag/chip input with autocomplete suggestions. | [forms/inputs/TagInput.md](../../docs/web-mojo/forms/inputs/TagInput.md) |
| [DatePicker](../../examples/portal/examples/forms/inputs/DatePicker/DatePickerExample.js) | Calendar date picker with min/max, inline mode, and custom formats. | [forms/inputs/DatePicker.md](../../docs/web-mojo/forms/inputs/DatePicker.md) |
| [DateRangePicker](../../examples/portal/examples/forms/inputs/DateRangePicker/DateRangePickerExample.js) | Start/end date range in a single combined picker. | [forms/inputs/DateRangePicker.md](../../docs/web-mojo/forms/inputs/DateRangePicker.md) |
| [MultiSelectDropdown](../../examples/portal/examples/forms/inputs/MultiSelect/MultiSelectExample.js) | Compact multi-select dropdown with optional search and select-all. | [forms/inputs/MultiSelectDropdown.md](../../docs/web-mojo/forms/inputs/MultiSelectDropdown.md) |
| [ComboInput](../../examples/portal/examples/forms/inputs/ComboInput/ComboInputExample.js) | Searchable text + dropdown; toggle allowCustom for strict mode. | [forms/inputs/ComboInput.md](../../docs/web-mojo/forms/inputs/ComboInput.md) |
| [CollectionSelect / MultiSelect](../../examples/portal/examples/forms/inputs/CollectionSelect/CollectionSelectExample.js) | Single + multi select bound to a Collection (built-in UserList). | [forms/inputs/CollectionSelect.md](../../docs/web-mojo/forms/inputs/CollectionSelect.md) |
| [ImageField](../../examples/portal/examples/forms/inputs/ImageField/ImageFieldExample.js) | Image upload with drag-and-drop, preview, and configurable size. | [forms/inputs/ImageField.md](../../docs/web-mojo/forms/inputs/ImageField.md) |

### Patterns

| Component | Summary | Doc |
|---|---|---|
| [Validation](../../examples/portal/examples/forms/Validation/ValidationExample.js) | HTML5 + custom validators, patterns, and error handling. | [forms/Validation.md](../../docs/web-mojo/forms/Validation.md) |
| [Validation — advanced](../../examples/portal/examples/forms/Validation/ValidationAdvancedExample.js) | Async validators, real-time feedback, cross-field rules. | [forms/Validation.md](../../docs/web-mojo/forms/Validation.md) |
| [Form layout](../../examples/portal/examples/forms/FormLayout/FormLayoutExample.js) | Column grids, responsive widths, and grouped sub-grids. | [forms/BestPractices.md](../../docs/web-mojo/forms/BestPractices.md) |
| [Multi-step wizard](../../examples/portal/examples/forms/MultiStepWizard/MultiStepWizardExample.js) | Page + one FormView per step, with progress, navigation, and review. | [forms/MultiStepWizard.md](../../docs/web-mojo/forms/MultiStepWizard.md) |
| [Search & filter form](../../examples/portal/examples/forms/SearchFilterForm/SearchFilterFormExample.js) | Live filter form driving a result list, with debounced changes. | [forms/SearchFilterForms.md](../../docs/web-mojo/forms/SearchFilterForms.md) |

## Extensions

### Charts

| Component | Summary | Doc |
|---|---|---|
| [MiniChart (sparkline)](../../examples/portal/examples/extensions/Charts/ChartsExample.js) | Single-series sparkline — line/bar with crosshair, tooltip, value formatter. | [extensions/Charts.md](../../docs/web-mojo/extensions/Charts.md) |
| [SeriesChart (multi-dataset)](../../examples/portal/examples/extensions/Charts/SeriesChartExample.js) | Multi-dataset line/bar/area — stacked-by-default bars, dynamic colors, legend toggle, animated setData. | [extensions/Charts.md](../../docs/web-mojo/extensions/Charts.md) |
| [PieChart](../../examples/portal/examples/extensions/Charts/PieChartExample.js) | Native pie + doughnut, slice labels, click drill-down, animated updates. | [extensions/Charts.md](../../docs/web-mojo/extensions/Charts.md) |
| [CircularProgress](../../examples/portal/examples/extensions/Charts/CircularProgressExample.js) | Sizes, variants, themes, multi-segment, and live setValue updates. | [extensions/Charts.md](../../docs/web-mojo/extensions/Charts.md) |
| [MetricsMiniChartWidget](../../examples/portal/examples/extensions/Charts/MetricsMiniChartExample.js) | Backend-driven sparkline tiles with header, trending, and settings popover. | [extensions/Charts.md](../../docs/web-mojo/extensions/Charts.md) |

### Maps & Location

| Component | Summary | Doc |
|---|---|---|
| [MapView](../../examples/portal/examples/extensions/MapView/MapViewExample.js) | Leaflet marker map with auto-fit bounds and switchable tile layers. | [extensions/MapView.md](../../docs/web-mojo/extensions/MapView.md) |
| [MapLibreView](../../examples/portal/examples/extensions/MapLibreView/MapLibreViewExample.js) | Vector-tile MapLibre GL map with 3D pitch and bearing. | [extensions/MapLibreView.md](../../docs/web-mojo/extensions/MapLibreView.md) |
| [Location](../../examples/portal/examples/extensions/Location/LocationExample.js) | Browser geolocation: one-shot fix and live watch with permission handling. | [extensions/Location.md](../../docs/web-mojo/extensions/Location.md) |

### Media

| Component | Summary | Doc |
|---|---|---|
| [LightBox](../../examples/portal/examples/extensions/LightBox/LightBoxExample.js) | ImageViewer, LightboxGallery, and ImageEditor opened via static dialogs. | [extensions/LightBox.md](../../docs/web-mojo/extensions/LightBox.md) |

### UI

| Component | Summary | Doc |
|---|---|---|
| [TimelineView](../../examples/portal/examples/extensions/TimelineView/TimelineViewExample.js) | Chronological event timeline backed by a Collection. | [extensions/TimelineView.md](../../docs/web-mojo/extensions/TimelineView.md) |

