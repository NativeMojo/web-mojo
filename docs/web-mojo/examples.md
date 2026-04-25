# Examples Index

> **Generated** by `examples/portal/scripts/build-registry.js`. Do not edit by hand.

Single canonical example per documented component. Folder taxonomy mirrors this docs tree. Each link below points at the runnable, copy-paste reference file in the new portal.

## Core

| Component | Summary | Doc |
|---|---|---|
| [View](../../examples/portal/examples/core/View/ViewExample.js) | Base component: lifecycle, templates, data-action, child views. | [core/View.md](../../docs/web-mojo/core/View.md) |
| [View](../../examples/portal/examples/core/View/ViewExample.js) | Compose a parent view from independent children using addChild + containerId. | [core/ViewChildViews.md](../../docs/web-mojo/core/ViewChildViews.md) |
| [Advanced](../../examples/portal/examples/core/Advanced/AdvancedExample.js) | Canvas inside a View with onAfterRender setup and onBeforeDestroy cleanup. | [core/AdvancedViews.md](../../docs/web-mojo/core/AdvancedViews.md) |
| [Templates](../../examples/portal/examples/core/Templates/TemplatesExample.js) | Mustache syntax reference: \|bool, triple braces, quoted args, dot-prefix, \|iter. | [core/Templates.md](../../docs/web-mojo/core/Templates.md) |
| [DataFormatter](../../examples/portal/examples/core/DataFormatter/DataFormatterExample.js) | Pipe formatters in templates plus dataFormatter.register and dataFormatter.apply. | [core/DataFormatter.md](../../docs/web-mojo/core/DataFormatter.md) |
| [Model](../../examples/portal/examples/core/Model/ModelExample.js) | REST-backed entity with attribute access, change events, dirty tracking, and CRUD. | [core/Model.md](../../docs/web-mojo/core/Model.md) |
| [Collection](../../examples/portal/examples/core/Collection/CollectionExample.js) | Model set with setParams/updateParams, where() filtering, and events. | [core/Collection.md](../../docs/web-mojo/core/Collection.md) |
| [Events](../../examples/portal/examples/core/Events/EventsExample.js) | EventBus for global pub/sub and per-instance on/emit on Models and Views. | [core/Events.md](../../docs/web-mojo/core/Events.md) |
| [WebApp](../../examples/portal/examples/core/WebApp/WebAppExample.js) | Minimal app shell: routing, page registry, REST client, global event bus. | [core/WebApp.md](../../docs/web-mojo/core/WebApp.md) |
| [PortalApp](../../examples/portal/examples/core/PortalApp/PortalAppExample.js) | WebApp plus sidebar, topbar, auth, multi-tenant group, and toast notifications. | [core/PortalApp.md](../../docs/web-mojo/core/PortalApp.md) |
| [PortalWebApp](../../examples/portal/examples/core/PortalWebApp/PortalWebAppExample.js) | Opinionated portal: auth-gated router, automatic WebSocket, lifecycle events. | [core/PortalWebApp.md](../../docs/web-mojo/core/PortalWebApp.md) |

## Pages

| Component | Summary | Doc |
|---|---|---|
| [Page](../../examples/portal/examples/pages/Page/PageExample.js) | Routed screen base: onEnter/onExit, URL params, permissions. | [pages/Page.md](../../docs/web-mojo/pages/Page.md) |
| [FormPage](../../examples/portal/examples/pages/FormPage/FormPageExample.js) | Page wrapped around a FormView with model load/save. | [pages/FormPage.md](../../docs/web-mojo/pages/FormPage.md) |

## Services

| Component | Summary | Doc |
|---|---|---|
| [Rest](../../examples/portal/examples/services/Rest/RestExample.js) | HTTP client: GET/POST/PUT/DELETE, file upload/download, interceptors. | [services/Rest.md](../../docs/web-mojo/services/Rest.md) |
| [ToastService](../../examples/portal/examples/services/ToastService/ToastServiceExample.js) | Bootstrap 5 toasts: success/warn/error/info, view-as-toast. | [services/ToastService.md](../../docs/web-mojo/services/ToastService.md) |
| [WebSocketClient](../../examples/portal/examples/services/WebSocketClient/WebSocketClientExample.js) | WebSocket client with auto-reconnect and heartbeat. | [services/WebSocketClient.md](../../docs/web-mojo/services/WebSocketClient.md) |

## Components

| Component | Summary | Doc |
|---|---|---|
| [Dialog](../../examples/portal/examples/components/Dialog/DialogExample.js) | Modal dialogs — alert, confirm, prompt, busy, and custom buttons. | [components/Dialog.md](../../docs/web-mojo/components/Dialog.md) |
| [Dialog](../../examples/portal/examples/components/Dialog/DialogExample.js) | Header dropdown menu inside a Dialog. Resolves Promise with selected value. | [components/Dialog.md](../../docs/web-mojo/components/Dialog.md) |
| [Modal](../../examples/portal/examples/components/Modal/ModalExample.js) | Static-only API for showing Views in modal dialogs (simpler than Dialog). | [components/Modal.md](../../docs/web-mojo/components/Modal.md) |
| [ListView](../../examples/portal/examples/components/ListView/ListViewExample.js) | Visual list bound to a Collection — per-row Views with selection support. | [components/ListView.md](../../docs/web-mojo/components/ListView.md) |
| [TableView](../../examples/portal/examples/components/TableView/TableViewExample.js) | Sortable, filterable, paginated table bound to a Collection. | [components/TableView.md](../../docs/web-mojo/components/TableView.md) |
| [TableView](../../examples/portal/examples/components/TableView/TableViewExample.js) | Multi-select rows + bulk action toolbar. | [components/TableView.md](../../docs/web-mojo/components/TableView.md) |
| [TablePage](../../examples/portal/examples/components/TablePage/TablePageExample.js) | Page wrapper for TableView with URL-synced sort, filter, search, and pagination. | [components/TablePage.md](../../docs/web-mojo/components/TablePage.md) |
| [DataView](../../examples/portal/examples/components/DataView/DataViewExample.js) | Structured key/value display with field types for email, URL, boolean, dates, and JSON. | [components/DataView.md](../../docs/web-mojo/components/DataView.md) |
| [FileView](../../examples/portal/examples/components/FileView/FileViewExample.js) | File record viewer — preview, details, renditions, and metadata sections. | [components/FileView.md](../../docs/web-mojo/components/FileView.md) |
| [Image](../../examples/portal/examples/components/Image/ImageExample.js) | FormView image input fields — five size variants, drag/drop, and rendition-aware preview. | [components/ImageFields.md](../../docs/web-mojo/components/ImageFields.md) |
| [Sidebar](../../examples/portal/examples/components/Sidebar/SidebarExample.js) | Portal navigation chrome — sidebar menus and topbar configured via PortalApp. | [components/SidebarTopNav.md](../../docs/web-mojo/components/SidebarTopNav.md) |
| [ContextMenu](../../examples/portal/examples/components/ContextMenu/ContextMenuExample.js) | Reusable Bootstrap-dropdown action menu — three-dots row menus, header menus, and inline handlers. | [components/ContextMenu.md](../../docs/web-mojo/components/ContextMenu.md) |

## Extensions

| Component | Summary | Doc |
|---|---|---|
| [Charts](../../examples/portal/examples/extensions/Charts/ChartsExample.js) | SeriesChart (line/bar) and PieChart driven from inline data. | [extensions/Charts.md](../../docs/web-mojo/extensions/Charts.md) |
| [LightBox](../../examples/portal/examples/extensions/LightBox/LightBoxExample.js) | ImageViewer, LightboxGallery, and ImageEditor opened via static dialogs. | [extensions/LightBox.md](../../docs/web-mojo/extensions/LightBox.md) |
| [MapView](../../examples/portal/examples/extensions/MapView/MapViewExample.js) | Leaflet marker map with auto-fit bounds and switchable tile layers. | [extensions/MapView.md](../../docs/web-mojo/extensions/MapView.md) |
| [MapLibreView](../../examples/portal/examples/extensions/MapLibreView/MapLibreViewExample.js) | Vector-tile MapLibre GL map with 3D pitch and bearing. | [extensions/MapLibreView.md](../../docs/web-mojo/extensions/MapLibreView.md) |
| [TimelineView](../../examples/portal/examples/extensions/TimelineView/TimelineViewExample.js) | Chronological event timeline backed by a Collection. | [extensions/TimelineView.md](../../docs/web-mojo/extensions/TimelineView.md) |
| [FileUpload](../../examples/portal/examples/extensions/FileUpload/FileUploadExample.js) | Drag-and-drop file handling via applyFileDropMixin with validation. | [extensions/FileUpload.md](../../docs/web-mojo/extensions/FileUpload.md) |
| [Location](../../examples/portal/examples/extensions/Location/LocationExample.js) | Browser geolocation: one-shot fix and live watch with permission handling. | [extensions/Location.md](../../docs/web-mojo/extensions/Location.md) |
| [TabView](../../examples/portal/examples/extensions/TabView/TabViewExample.js) | Tab navigation with static tabs and lazy mounting. | [extensions/TabView.md](../../docs/web-mojo/extensions/TabView.md) |
| [TabView](../../examples/portal/examples/extensions/TabView/TabViewExample.js) | Tabs added and removed at runtime. | [extensions/TabView.md](../../docs/web-mojo/extensions/TabView.md) |

## Forms

| Component | Summary | Doc |
|---|---|---|
| [FormView](../../examples/portal/examples/forms/FormView/FormViewExample.js) | FormView fundamentals: fields, validation, submission. | [forms/FormView.md](../../docs/web-mojo/forms/FormView.md) |
| [FormView](../../examples/portal/examples/forms/FormView/FormViewExample.js) | Comprehensive reference of every supported field type. | [forms/FormView.md](../../docs/web-mojo/forms/FormView.md) |
| [Text](../../examples/portal/examples/forms/Text/TextExample.js) | Text, email, password, tel, url, search, hex, number fields. | [forms/BasicTypes.md](../../docs/web-mojo/forms/BasicTypes.md) |
| [Selection](../../examples/portal/examples/forms/Selection/SelectionExample.js) | Select, radio, checkbox, toggle/switch, and button group. | [forms/BasicTypes.md](../../docs/web-mojo/forms/BasicTypes.md) |
| [Date](../../examples/portal/examples/forms/Date/DateExample.js) | Native HTML5 date, time, and datetime-local pickers. | [forms/BasicTypes.md](../../docs/web-mojo/forms/BasicTypes.md) |
| [File](../../examples/portal/examples/forms/File/FileExample.js) | File upload, image preview, audio/video file inputs. | [forms/FileHandling.md](../../docs/web-mojo/forms/FileHandling.md) |
| [Textarea](../../examples/portal/examples/forms/Textarea/TextareaExample.js) | Multi-line text plus htmlpreview and json variants. | [forms/BasicTypes.md](../../docs/web-mojo/forms/BasicTypes.md) |
| [Structural](../../examples/portal/examples/forms/Structural/StructuralExample.js) | Header, divider, html, button, and hidden — non-input field types. | [forms/BasicTypes.md](../../docs/web-mojo/forms/BasicTypes.md) |
| [Other](../../examples/portal/examples/forms/Other/OtherExample.js) | Color, range, and hex-color fields with live previews. | [forms/BasicTypes.md](../../docs/web-mojo/forms/BasicTypes.md) |
| [Validation](../../examples/portal/examples/forms/Validation/ValidationExample.js) | HTML5 + custom validators, patterns, and error handling. | [forms/Validation.md](../../docs/web-mojo/forms/Validation.md) |
| [Validation](../../examples/portal/examples/forms/Validation/ValidationExample.js) | Async validators, real-time feedback, cross-field rules. | [forms/Validation.md](../../docs/web-mojo/forms/Validation.md) |
| [Form](../../examples/portal/examples/forms/Form/FormExample.js) | Column grids, responsive widths, and grouped sub-grids. | [forms/BestPractices.md](../../docs/web-mojo/forms/BestPractices.md) |
| [Multi-step](../../examples/portal/examples/forms/Multi-step/Multi-stepExample.js) | Page + one FormView per step, with progress, navigation, and review. | [forms/MultiStepWizard.md](../../docs/web-mojo/forms/MultiStepWizard.md) |
| [Search](../../examples/portal/examples/forms/Search/SearchExample.js) | Live filter form driving a result list, with debounced changes. | [forms/SearchFilterForms.md](../../docs/web-mojo/forms/SearchFilterForms.md) |

## Form Inputs

| Component | Summary | Doc |
|---|---|---|
| [TagInput](../../examples/portal/examples/forms/inputs/TagInput/TagInputExample.js) | Tag/chip input with autocomplete suggestions. | [forms/inputs/TagInput.md](../../docs/web-mojo/forms/inputs/TagInput.md) |
| [DatePicker](../../examples/portal/examples/forms/inputs/DatePicker/DatePickerExample.js) | Calendar date picker with min/max, inline mode, and custom formats. | [forms/inputs/DatePicker.md](../../docs/web-mojo/forms/inputs/DatePicker.md) |
| [DateRangePicker](../../examples/portal/examples/forms/inputs/DateRangePicker/DateRangePickerExample.js) | Start/end date range in a single combined picker. | [forms/inputs/DateRangePicker.md](../../docs/web-mojo/forms/inputs/DateRangePicker.md) |
| [MultiSelectDropdown](../../examples/portal/examples/forms/inputs/MultiSelectDropdown/MultiSelectDropdownExample.js) | Compact multi-select dropdown with optional search and select-all. | [forms/inputs/MultiSelectDropdown.md](../../docs/web-mojo/forms/inputs/MultiSelectDropdown.md) |
| [ComboInput](../../examples/portal/examples/forms/inputs/ComboInput/ComboInputExample.js) | Searchable text + dropdown; toggle allowCustom for strict mode. | [forms/inputs/ComboInput.md](../../docs/web-mojo/forms/inputs/ComboInput.md) |
| [CollectionSelect](../../examples/portal/examples/forms/inputs/CollectionSelect/CollectionSelectExample.js) | Single + multi select bound to a Collection (built-in UserList). | [forms/inputs/CollectionSelect.md](../../docs/web-mojo/forms/inputs/CollectionSelect.md) |
| [ImageField](../../examples/portal/examples/forms/inputs/ImageField/ImageFieldExample.js) | Image upload with drag-and-drop, preview, and configurable size. | [forms/inputs/ImageField.md](../../docs/web-mojo/forms/inputs/ImageField.md) |

## Models

| Component | Summary | Doc |
|---|---|---|
| [Built-in](../../examples/portal/examples/models/Built-in/Built-inExample.js) | Catalog of built-in Model/Collection classes (User, Group, Job, …) plus a UserList demo. | [models/BuiltinModels.md](../../docs/web-mojo/models/BuiltinModels.md) |

