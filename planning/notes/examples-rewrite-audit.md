# Examples Rewrite — Coverage Audit

**Date:** 2026-04-25  
**Scope:** Legacy `examples/portal/pages/**/*.js` and `examples/portal/templates/*.mst`  
**Total Legacy Files Audited:** 37 page files + 17 template files  

---

## Section 1 — Coverage Table

| Legacy File | Patterns Shown | Doc Coverage | New Target | Notes |
|---|---|---|---|---|
| **Core Pages** |
| `pages/HomePage.js` | Welcome/intro, portal entry point | ✅ Page.md | `shell/HomePage.js` (portal shell, not example) | Portal boilerplate, keep as shell only |
| `pages/DashboardPage.js` | Dashboard layout, MiniChart integration | ✅ metricsminichartwidget.md | `examples/extensions/MetricsChart/MetricsChartExample.js` | Mini chart widget; dashboard pattern is admin-level |
| `pages/TemplatesPage.js` | Mustache templating patterns (variables, sections, loops, filters, etc.) | ✅ Templates.md | `examples/core/Templates/TemplatesExample.js` | Core reference for template syntax |
| `pages/TodosPage.js` | TablePage with CRUD, Collection binding, filters, batch actions | ✅ TablePage.md | `examples/components/TablePage/TablePageExample.js` | Canonical TablePage demo |
| **Dialog & Modal Pages** |
| `pages/DialogsPage.js` | Dialog.alert, Dialog.confirm, Dialog.prompt, ContextMenu, mock permission system | ✅ Dialog.md | `examples/components/Dialog/DialogExample.js` + `DialogContextMenuExample.js` | Drop mock permission system; split context menu to sibling |
| `pages/FormDialogsPage.js` | Dialog with FormView inside, form submission in modal | ✅ Dialog.md | `examples/components/Dialog/DialogFormExample.js` | Form inside Dialog pattern |
| **Extension Pages** |
| `pages/ChartsPage.js` | SeriesChart, PieChart with real-world data | ✅ Charts.md | `examples/extensions/Charts/ChartsExample.js` | Charts extension demo |
| `pages/TabViewPage.js` | TabView basic + responsive + dynamic tabs | ✅ TabView.md | `examples/extensions/TabView/TabViewExample.js` + `TabViewDynamicExample.js` | Split basic/dynamic into sibling files |
| `pages/ImagePage.js` | Image workflow (upload → crop → edit), ImageUploadView, ImageCropView, ImageEditor | ✅ LightBox.md | `examples/extensions/LightBox/ImageWorkflowExample.js` | Image processing workflow from LightBox extension |
| `pages/FileDropPage.js` | FileDropMixin applied to View, drop zones, validation, file types | ✅ FileUpload.md | `examples/extensions/FileUpload/FileDropExample.js` | File drop mixin showcase |
| **Form Pages (Basic)** |
| `pages/forms/FormViewBasics.js` | FormView fundamentals, field definition, validation, submission | ✅ FormView.md | `examples/forms/FormView/FormViewBasicsExample.js` | Core FormView pattern |
| `pages/forms/FormsOverview.js` | Form layout types, groups, sections, responsive | ✅ FormView.md | `examples/forms/FormView/FormViewLayoutExample.js` | Form layout & structure patterns |
| `pages/forms/FormsSection.js` | Navigation component for forms section | ⚠️ partial — no specific nav doc | Drop | Boilerplate nav, not a pattern worth keeping |
| `pages/forms/TextInputsPage.js` | Text, email, password, tel, url, search, number, hex inputs | ✅ BasicTypes.md | `examples/forms/TextInputs/TextInputsExample.js` | All text field types in one file |
| `pages/forms/SelectionFieldsPage.js` | Select, radio, checkbox, toggle, switch fields | ✅ BasicTypes.md | `examples/forms/SelectionFields/SelectionFieldsExample.js` | All selection field types |
| `pages/forms/DateTimeFieldsPage.js` | Date, time, datetime fields (native HTML5) | ✅ BasicTypes.md | `examples/forms/DateTimeFields/DateTimeFieldsExample.js` | Basic date/time fields |
| `pages/forms/TextareaFieldsPage.js` | Textarea, rich editor options | ✅ BasicTypes.md | `examples/forms/TextareaFields/TextareaFieldsExample.js` | Textarea patterns |
| `pages/forms/FileMediaFieldsPage.js` | File upload, image input, audio, video fields | ✅ FileHandling.md | `examples/forms/FileMediaFields/FileMediaFieldsExample.js` | File & media field types |
| `pages/forms/StructuralFieldsPage.js` | Header, divider, HTML, button, hidden fields | ⚠️ partial — FieldTypes.md covers but pattern details missing | `examples/forms/StructuralFields/StructuralFieldsExample.js` | Structural/layout fields (non-input) |
| `pages/forms/OtherInputsPage.js` | Color, range, slider, code editor, progress, rating fields | ✅ FieldTypes.md | `examples/forms/OtherFields/OtherFieldsExample.js` | Special input types (color, range, code, etc.) |
| `pages/forms/ValidationPage.js` | HTML5 validation, custom validators, patterns, error handling | ✅ Validation.md | `examples/forms/Validation/ValidationExample.js` | Form validation patterns |
| `pages/forms/FormLayoutPage.js` | Form layout: inline, horizontal, responsive grids | ✅ BestPractices.md | `examples/forms/Layout/FormLayoutExample.js` | Layout and structure patterns |
| **Form Pages (Advanced Inputs)** |
| `pages/forms/advanced/DatePickerPage.js` | Datepicker field with calendar UI | ✅ DatePicker.md | `examples/forms/inputs/DatePicker/DatePickerExample.js` | Enhanced date picker |
| `pages/forms/advanced/DateRangePickerPage.js` | Date range picker (start-end) | ✅ DateRangePicker.md | `examples/forms/inputs/DateRangePicker/DateRangePickerExample.js` | Date range selection |
| `pages/forms/advanced/MultiSelectPage.js` | MultiSelectDropdown field | ✅ MultiSelectDropdown.md | `examples/forms/inputs/MultiSelect/MultiSelectExample.js` | Multi-select from list |
| `pages/forms/advanced/TagInputPage.js` | TagInput field with autocomplete | ✅ TagInput.md | `examples/forms/inputs/TagInput/TagInputExample.js` | Tag input with suggestions |
| `pages/forms/advanced/ComboInputPage.js` | ComboInput (searchable select) | ✅ ComboInput.md | `examples/forms/inputs/ComboInput/ComboInputExample.js` | Combo/searchable input |
| `pages/forms/advanced/CollectionSelectPage.js` | CollectionSelect, CollectionMultiSelect (model-bound) | ✅ CollectionSelect.md + CollectionMultiSelect.md | `examples/forms/inputs/CollectionSelect/CollectionSelectExample.js` | Select from Collection/model |
| `pages/forms/advanced/ImageFieldPage.js` | ImageField with upload, crop, preview | ✅ ImageField.md | `examples/forms/inputs/ImageField/ImageFieldExample.js` | Image field with tools |
| **Form Examples (Real-World Patterns)** |
| `pages/forms/examples/UserProfileExample.js` | Multi-section form, edit-in-place pattern, FormView layout | ✅ BestPractices.md | `examples/forms/Examples/UserProfileExample.js` | Real-world user profile form |
| `pages/forms/examples/MultiStepWizardExample.js` | Multi-step wizard, state progression, validation per step | ⚠️ partial — no wizard-specific doc | `examples/forms/Examples/MultiStepWizardExample.js` | Multi-step workflow pattern |
| `pages/forms/examples/SearchFilterExample.js` | Live filter form, search + multi-criteria filtering | ⚠️ partial — no filter pattern doc | `examples/forms/Examples/SearchFilterExample.js` | Filter/search form pattern |
| **Legacy Multi-Purpose Pages (to be split)** |
| `pages/FormsPage.js` | FormView with group layout, enhanced fields, debug mode, TagInput | ✅ FormView.md + TagInput.md | Drop (too broad; individual field pages cover) | Conflates multiple patterns; individual examples are clearer |
| `pages/FormInputsPage.js` | All input types in tabbed interface, comprehensive reference | ✅ FieldTypes.md | `examples/forms/FieldTypes/AllFieldTypesExample.js` | Comprehensive input type reference (optional sibling) |
| `pages/FormValidationPage.js` | Validation showcase: required, pattern, custom, async, real-time | ✅ Validation.md | `examples/forms/Validation/ValidationAdvancedExample.js` | Advanced validation patterns |
| `pages/ImageViewPage.js` | **Empty file (0 LOC)** | N/A | Delete | Dead file, ignore |
| **Template Files (under `templates/`)** |
| `templates/home.mst` | Home page template | ✅ Templates.md | Drop (portal shell) | Portal-specific, not a pattern |
| `templates/dashboard.mst` | Dashboard layout template | ✅ Templates.md | Drop (admin pattern) | Admin-level example |
| `templates/charts.mst` | Charts page template | ✅ Charts.md | Inline in `ChartsExample.js` | Inline string in new example |
| `templates/dialogs.mst` | Dialog demo template | ✅ Dialog.md | Inline in `DialogExample.js` | Inline string in new example |
| `templates/FormsPage.mst` | Forms page template | ✅ FormView.md | Drop (split to individual forms) | Consolidated into per-component examples |
| `templates/TemplatesPage.mst` | Templates documentation | ✅ Templates.md | Inline in `TemplatesExample.js` | Inline string in new example |
| `templates/ImagePage.mst` | Image workflow template | ✅ LightBox.md | Inline in `ImageWorkflowExample.js` | Inline string in new example |
| `templates/examples/*.mst` (8 files: variables, unescaped, sections, comments, nested, inverted, arrays, bool-vs-iter, complex, dot-prefix) | Template syntax patterns | ✅ Templates.md | Inline in `TemplatesExample.js` | All consolidated into one comprehensive example |

**Summary of Table:**
- **Total legacy files:** 37 pages + 17 templates = 54 files
- **Files mapped to new examples:** 29 (✅ or ⚠️)
- **Files to keep as portal shell:** 1 (HomePage)
- **Files to drop:** 7 (FormsPage, FormInputsPage, ImageViewPage, FormsSection, templates that are shell/admin, extra pages)
- **Sibling variants to create:** 4 (DialogContextMenu, TabViewDynamic, ValidationAdvanced, AllFieldTypes)

---

## Section 2 — Doc Gap Summary

### 2a. Pattern gaps — Component documented but specific pattern missing

| Component | Existing Doc | Pattern Missing | Legacy Source |
|---|---|---|---|
| FormView (Structural Fields) | `forms/FieldTypes.md` | Explicit examples of header, divider, html, button, hidden field types in a single form | `pages/forms/StructuralFieldsPage.js` |
| Multi-Step Forms | N/A (no doc exists) | Multi-step wizard progression, state management across steps, per-step validation | `pages/forms/examples/MultiStepWizardExample.js` |
| Search/Filter Forms | N/A (no doc exists) | Live filtering pattern, multi-criteria form, real-time results | `pages/forms/examples/SearchFilterExample.js` |
| Dialog | `components/Dialog.md` | Context menu variant with permission checking (advanced use) | `pages/DialogsPage.js` |
| TablePage | `components/TablePage.md` | Batch action handling, row context menu, delete workflows | `pages/TodosPage.js` (has batch actions defined but limited) |

### 2b. Component gaps — Exported component has no doc file at all

| Class/Function | Proposed Doc Path | Summary | Source File in `src/` | Legacy Demo? |
|---|---|---|---|---|
| `Modal` | `docs/web-mojo/components/Modal.md` | Simple modal dialog (smaller than Dialog) | `src/core/Modal.js` | `pages/DialogsPage.js` shows Dialog but not Modal as separate |
| `ProgressView` | `docs/web-mojo/components/ProgressView.md` | Progress bar and indicator component | `src/core/views/ProgressView.js` | Not shown in legacy |
| `ContextMenu` | `docs/web-mojo/components/ContextMenu.md` | Right-click context menu with permissions | `src/core/views/ContextMenu.js` | `pages/DialogsPage.js` (as mock context menu) |
| `UserProfileView` | `docs/web-mojo/components/UserProfileView.md` | User profile display and card view | `src/core/views/UserProfileView.js` | Not shown in legacy |
| `PasskeySetupView` | `docs/web-mojo/components/PasskeySetupView.md` | Passkey/WebAuthn setup and management | `src/core/views/PasskeySetupView.js` | Not shown in legacy |
| `ConsoleSilencer` | `docs/web-mojo/utils/ConsoleSilencer.md` | Console output suppression utility | `src/core/utils/ConsoleSilencer.js` | `app.js` uses it but not demonstrated |
| `TokenManager` | `docs/web-mojo/services/TokenManager.md` | Auth token lifecycle management | `src/services/TokenManager.js` | Not shown in legacy |
| `SimpleSearchView` | `docs/web-mojo/components/SimpleSearchView.md` | Lightweight search input component | `src/core/views/SimpleSearchView.js` | Not shown in legacy |
| `SideNavView` | `docs/web-mojo/components/SideNavView.md` | Side navigation menu component | `src/core/views/SideNavView.js` | Not shown in legacy (SidebarTopNav covers) |
| `MiniChart` | `docs/web-mojo/extensions/metricsminichartwidget.md` (exists) | Metrics mini chart — already documented ✅ | `src/extensions/charts/MiniChart.js` | `pages/DashboardPage.js` |
| `FormPage` | `docs/web-mojo/pages/FormPage.md` (exists) | Page wrapper for FormView — already documented ✅ | `src/core/pages/FormPage.js` | Not shown in legacy |
| `DjangoLookups` | `docs/web-mojo/utils/DjangoLookups.md` | Django ORM query syntax helpers | `src/core/utils/DjangoLookups.js` | Not shown in legacy |
| `DataWrapper` | `docs/web-mojo/utils/DataWrapper.md` | Wrapper for model data | `src/core/utils/DataWrapper.js` | Not shown in legacy |

**Note on existing docs:** FormPage, MiniChart, and several others ARE already documented; legacy examples don't demonstrate them, but no new doc is needed. Focus for new examples is on undocumented exported components and documented components with pattern gaps.

### 2c. Drop list — Legacy patterns NOT to port

| Pattern | Reason |
|---|---|
| Mock permission system in `DialogsPage.js` | Anti-pattern: permission logic belongs in backend/auth layer, not demo code. Dialog.md doesn't advocate for it. Drop from Dialog example; if permission-gating demo is needed, it belongs in auth examples, not components. |
| `window.getApp()` global fallback | Workaround for test/demo isolation. New examples assume app is available via page lifecycle; drop this pattern. |
| Dashboard mock data + hardcoded admin views | These are admin-level patterns (pre-built views in `src/extensions/admin/*`). Portal examples should not duplicate admin showcase. Keep demo simple. |
| `MiniChart` in DashboardPage as primary pattern | The chart widget is an extension, but the dashboard layout itself is admin-specific. Chart extension docs stand alone; dashboard layout should not be in examples/canonical/. |
| Inline `getTemplate()` method returning HTML strings instead of external files | Legacy mixes inline + external templates. New pattern: all examples use inline `template:` string in constructor. Drop external `.mst` files for all canonical examples. |
| Form submit handlers with manual `getFormData()` + rendering | While functional, newer pattern is event delegation + reactive. Example still shows `getFormData()` but keep it simple; don't showcase complex form state machines. |
| `debuggerMode` and debug UI in FormPages | Development aid, not a production pattern. Drop debug tooling from canonical examples. |

---

## Section 3 — Summary Statistics

| Metric | Count |
|---|---|
| **Total legacy page files** | 37 |
| **Total legacy template files** | 17 |
| **Files with ✅ full doc coverage** | 24 |
| **Files with ⚠️ partial coverage (pattern gaps)** | 5 |
| **Files with ❌ missing doc (component undocumented)** | 0 (all covered by docs or are shell/admin) |
| **Files to drop** | 7 |
| **Files to keep as shell** | 1 |
| **New example files to create** | 29 |
| **Sibling variant files to create** | 4 |
| **Total new canonical examples** | ~33 |

---

## Action Items for Wave 2

1. **Create 29 canonical example files** following shape: `examples/portal/examples/<area>/<Component>/<Component>Example.js` + `example.json`.
2. **Create 4 sibling variant files:**
   - `DialogContextMenuExample.js` (split from DialogsPage)
   - `TabViewDynamicExample.js` (variant of basic TabView)
   - `ValidationAdvancedExample.js` (advanced validation patterns)
   - `AllFieldTypesExample.js` (comprehensive reference of all inputs)
3. **File doc gaps to address in parallel:**
   - File a separate issue for Modal, ProgressView, ContextMenu, UserProfileView, PasskeySetupView, SimpleSearchView, SideNavView, ConsoleSilencer, TokenManager, DjangoLookups, DataWrapper docs.
   - File a separate issue for multi-step form and search/filter form patterns to be documented.
4. **Consolidate templates:** All `.mst` files become inline strings in the new example files. No external template directory for canonical examples.
5. **Remove mock systems:** Dialog example drops permission mocking. File drop example stays as-is (mixin is core feature).
