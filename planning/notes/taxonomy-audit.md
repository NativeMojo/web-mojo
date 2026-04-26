# Taxonomy Audit — Source vs Docs vs Examples

**Date**: 2026-04-26
**Status**: reference — informs follow-up reorg work
**Scope**: every component / model / utility that has a doc page or an example

This audit cross-references three locations for every framework artifact:

1. **Source** — where the file actually lives in `src/`.
2. **Docs** — which folder under `docs/web-mojo/` documents it.
3. **Examples** — which folder under `examples/portal/examples/<area>/` demonstrates it (and the route the registry assigns).

Mismatches between these three locations confuse both humans and LLMs scanning the registry. The goal of this audit is to decide a canonical home for each item, then realign source / docs / example so they all point to the same area.

---

## Legend

- ✅ **Aligned** — source, docs, and example all agree on the area.
- ⚠️ **Mismatch** — at least one of the three is in a different area than the others.
- 🪦 **Dead code / stale** — duplicate files, empty folders, or docs without examples.
- ❓ **Ambiguous** — reasonable people would disagree on which area is correct.

---

## Components

| Component       | Source                                           | Docs                              | Example                          | Status |
|-----------------|--------------------------------------------------|-----------------------------------|----------------------------------|--------|
| Dialog          | `src/core/views/feedback/Dialog.js`              | `components/Dialog.md`            | `components/Dialog/`             | ✅ |
| Modal           | `src/core/views/feedback/Modal.js`               | `components/Modal.md`             | `components/Modal/`              | ✅ |
| ContextMenu     | `src/core/views/feedback/ContextMenu.js`         | `components/ContextMenu.md`       | `components/ContextMenu/`        | ✅ |
| ListView        | `src/core/views/list/ListView.js`                | `components/ListView.md`          | `components/ListView/`           | ✅ |
| TableView       | `src/core/views/table/TableView.js`              | `components/TableView.md`         | `components/TableView/`          | ✅ |
| DataView        | `src/core/views/data/DataView.js`                | `components/DataView.md`          | `components/DataView/`           | ✅ |
| FileView        | `src/core/views/data/FileView.js`                | `components/FileView.md`          | `components/FileView/`           | ✅ |
| ImageFields     | (FormView image inputs)                          | `components/ImageFields.md`       | `components/ImageFields/`        | ✅ |
| ChatView        | `src/core/views/chat/ChatView.js`                | `components/ChatView.md`          | `components/ChatView/`           | ✅ |
| Sidebar/TopNav  | `src/core/views/navigation/{Sidebar,TopNav}.js`  | `components/SidebarTopNav.md`     | `components/SidebarTopNav/`      | ✅ |
| SideNavView     | `src/core/views/navigation/SideNavView.js`       | `components/SideNavView.md`       | `components/SideNavView/`        | ✅ |
| **TabView**     | **`src/core/views/navigation/TabView.js`**       | **`extensions/TabView.md`**       | **`extensions/TabView/`**        | ⚠️ Source is core; docs+example say extension. Should move to `components/`. |
| **TablePage**   | **`src/core/pages/TablePage.js`**                | **`components/TablePage.md`**     | **`pages/TablePage/`**           | ⚠️ Source is in `pages/`; example is in `pages/`; doc is in `components/`. Doc should move to `pages/`. |

---

## Pages

| Component | Source                            | Docs                | Example              | Status |
|-----------|-----------------------------------|---------------------|----------------------|--------|
| Page      | `src/core/Page.js`                | `pages/Page.md`     | `pages/Page/`        | ✅ |
| FormPage  | `src/core/forms/FormPage.js`      | `pages/FormPage.md` | `pages/FormPage/`    | ✅ |
| TablePage | `src/core/pages/TablePage.js`     | `components/TablePage.md` (⚠️) | `pages/TablePage/` | ⚠️ See above. |

---

## Services

| Component        | Source                                | Docs                          | Example                       | Status |
|------------------|---------------------------------------|-------------------------------|-------------------------------|--------|
| Rest             | `src/core/Rest.js`                    | `services/Rest.md`            | `services/Rest/`              | ✅ |
| ToastService     | `src/core/services/ToastService.js`   | `services/ToastService.md`    | `services/ToastService/`      | ✅ |
| WebSocketClient  | `src/core/services/WebSocketClient.js`| `services/WebSocketClient.md` | `services/WebSocketClient/`   | ✅ |
| **FileUpload**   | **`src/core/services/FileUpload.js`** | **`extensions/FileUpload.md`**| **`extensions/FileUpload/`**  | ⚠️ Source is in `core/services/`; docs+example say extension. Should move to `services/` (or `components/`). |
| TokenManager     | `src/core/services/TokenManager.js`   | — (no doc, no example)        | —                             | 🪦 Undocumented. Either doc it or treat as private. |

---

## Core

| Component       | Source                              | Docs                       | Example                | Status |
|-----------------|-------------------------------------|----------------------------|------------------------|--------|
| View            | `src/core/View.js`                  | `core/View.md`             | `core/View/`           | ✅ |
| ViewChildViews  | (subset of View)                    | `core/ViewChildViews.md`   | `core/ViewChildViews/` | ✅ |
| AdvancedViews   | (subset of View)                    | `core/AdvancedViews.md`    | `core/AdvancedViews/`  | ✅ |
| Templates       | `src/core/utils/mustache.js` etc.   | `core/Templates.md`        | `core/Templates/`      | ✅ |
| DataFormatter   | `src/core/utils/DataFormatter.js`   | `core/DataFormatter.md`    | `core/DataFormatter/`  | ✅ |
| Model           | `src/core/Model.js`                 | `core/Model.md`            | `core/Model/`          | ✅ |
| Collection      | `src/core/Collection.js`            | `core/Collection.md`       | `core/Collection/`     | ✅ |
| Events          | `src/core/utils/EventBus.js` + mixins | `core/Events.md`         | `core/Events/`         | ✅ |
| WebApp          | `src/core/WebApp.js`                | `core/WebApp.md`           | `core/WebApp/`         | ✅ |
| PortalApp       | `src/core/PortalApp.js`             | `core/PortalApp.md`        | `core/PortalApp/`      | ✅ |
| PortalWebApp    | `src/core/PortalWebApp.js`          | `core/PortalWebApp.md`     | `core/PortalWebApp/`   | ✅ |

---

## Extensions

| Component             | Source                                            | Docs                                | Example                         | Status |
|-----------------------|---------------------------------------------------|-------------------------------------|---------------------------------|--------|
| Charts (MiniChart, SeriesChart, PieChart, MetricsMiniChartWidget, CircularProgress) | `src/extensions/charts/` | `extensions/Charts.md`              | `extensions/Charts/`            | ✅ |
| LightBox              | `src/extensions/lightbox/`                        | `extensions/LightBox.md`            | `extensions/LightBox/`          | ✅ |
| MapView               | `src/extensions/map/MapView.js`                   | `extensions/MapView.md`             | `extensions/MapView/`           | ✅ |
| MapLibreView          | `src/extensions/map/MapLibreView.js`              | `extensions/MapLibreView.md`        | `extensions/MapLibreView/`      | ✅ |
| Location              | `src/extensions/map/location/`                    | `extensions/Location.md` + `Location_API.md` | `extensions/Location/` | ✅ |
| TimelineView          | `src/extensions/timeline/`                        | `extensions/TimelineView.md`        | `extensions/TimelineView/`      | ✅ |
| Admin                 | `src/extensions/admin/`                           | `extensions/Admin.md`               | (no example — registers in portal) | ✅ (no example by design — admin is its own portal) |
| Auth                  | `src/extensions/auth/`                            | — (no doc page in `docs/web-mojo/`) | (separate `examples/auth/` app) | ⚠️ Doc-less. |
| docit                 | `src/extensions/docit/`                           | — (no doc page)                     | (used internally for docs site) | ⚠️ Doc-less. |
| user-profile          | `src/extensions/user-profile/`                    | — (no doc page)                     | —                               | ⚠️ Doc-less. |
| mojo-auth             | `src/extensions/mojo-auth/mojo-auth.js`           | —                                   | —                               | ⚠️ Doc-less; one-file shim. |

---

## Forms

All correctly nested under `forms/` and `forms/inputs/`. ✅

| Topic           | Source                                            | Docs                       | Example                          | Status |
|-----------------|---------------------------------------------------|----------------------------|----------------------------------|--------|
| FormView        | `src/core/forms/FormView.js`                      | `forms/FormView.md`        | `forms/FormView/`                | ✅ |
| FormBuilder     | `src/core/forms/FormBuilder.js`                   | `forms/FormBuilder.md`     | — (no example)                   | ⚠️ Doc without example. |
| FieldTypes      | (built into FormView)                             | `forms/FieldTypes.md` + `BasicTypes.md` | `forms/{TextInputs,SelectionFields,…}/` | ✅ |
| Validation      | (built into FormView)                             | `forms/Validation.md`      | `forms/Validation/`              | ✅ |
| FileHandling    | (built into FormView)                             | `forms/FileHandling.md`    | `forms/FileMediaFields/`         | ✅ |
| MultiStepWizard | (pattern, not a class)                            | `forms/MultiStepWizard.md` | `forms/MultiStepWizard/`         | ✅ |
| SearchFilterForm | (pattern, not a class)                           | `forms/SearchFilterForms.md` | `forms/SearchFilterForm/`      | ✅ |
| BestPractices   | —                                                 | `forms/BestPractices.md`   | —                                | ⚠️ Doc-only (acceptable). |
| All Form Inputs | `src/core/forms/inputs/*.js`                      | `forms/inputs/<X>.md`      | `forms/inputs/<X>/`              | ✅ (TagInput, DatePicker, DateRangePicker, MultiSelect, ComboInput, CollectionSelect, ImageField) |

---

## Models

`src/core/models/` contains **24 model files**. The framework treats these as "core" because they're pre-built models that can be used by any app. But many are tightly coupled to specific extensions (admin, auth) and are dead weight in apps that don't use those extensions.

| Model            | Source                          | Used by                                            | Suggested home |
|------------------|---------------------------------|----------------------------------------------------|----------------|
| **User**         | `src/core/models/User.js`       | Auth, admin, user-profile, every portal app        | core ✅ |
| **Group**        | `src/core/models/Group.js`      | PortalApp (group switching), admin, user-profile   | core ✅ |
| **Member**       | `src/core/models/Member.js`     | Group membership, admin, user-profile              | core ✅ |
| **ApiKey**       | `src/core/models/ApiKey.js`     | Admin, user-profile                                | core ✅ (security primitive) |
| **Files**        | `src/core/models/Files.js`      | FileView, file-upload, admin                       | core ✅ |
| **Settings**     | `src/core/models/Settings.js`   | admin/settings                                     | core ✅ (generic key/value) |
| Metrics          | `src/core/models/Metrics.js`    | charts/MetricsChart, admin                         | ❓ (could go to extensions/charts) |
| Email            | `src/core/models/Email.js`      | admin/messaging/email                              | ⚠️ → extensions/admin/messaging |
| Push             | `src/core/models/Push.js`       | admin/messaging/push                               | ⚠️ → extensions/admin/messaging |
| Phonehub         | `src/core/models/Phonehub.js`   | admin/messaging/sms (phone numbers)                | ⚠️ → extensions/admin/messaging |
| PublicMessage    | `src/core/models/PublicMessage.js` | admin/messaging                                 | ⚠️ → extensions/admin/messaging |
| Job              | `src/core/models/Job.js`        | admin/jobs                                         | ⚠️ → extensions/admin/jobs |
| JobRunner        | `src/core/models/JobRunner.js`  | admin/jobs                                         | ⚠️ → extensions/admin/jobs |
| ScheduledTask    | `src/core/models/ScheduledTask.js` | admin/jobs                                      | ⚠️ → extensions/admin/jobs |
| Incident         | `src/core/models/Incident.js`   | admin/incidents                                    | ⚠️ → extensions/admin/incidents |
| Tickets          | `src/core/models/Tickets.js`    | admin/incidents (ticketing)                        | ⚠️ → extensions/admin/incidents |
| LoginEvent       | `src/core/models/LoginEvent.js` | admin/security                                     | ⚠️ → extensions/admin/security (or auth) |
| Bouncer          | `src/core/models/Bouncer.js`    | admin/security                                     | ⚠️ → extensions/admin/security |
| IPSet            | `src/core/models/IPSet.js`      | admin/security                                     | ⚠️ → extensions/admin/security |
| Log              | `src/core/models/Log.js`        | admin/monitoring                                   | ⚠️ → extensions/admin/monitoring |
| ShortLink        | `src/core/models/ShortLink.js`  | admin/shortlinks                                   | ⚠️ → extensions/admin/shortlinks |
| AWS              | `src/core/models/AWS.js`        | admin/aws (CloudWatch dashboard)                   | ⚠️ → extensions/admin/aws |
| Assistant        | `src/core/models/Assistant.js`  | admin/assistant                                    | ⚠️ → extensions/admin/assistant |
| Passkeys         | `src/core/models/Passkeys.js`   | auth, user-profile                                 | ⚠️ → extensions/auth |
| System           | `src/core/models/System.js`     | (?)                                                | ❓ |

**Counted:**
- 6 truly-core models (User, Group, Member, ApiKey, Files, Settings)
- 1 ambiguous (Metrics)
- 1 ambiguous (System)
- 16 admin-extension-only models — currently shipped to **every** app that imports `web-mojo`

---

## Mixins / Utilities

| Item            | Source                                | Docs                       | Example | Status |
|-----------------|---------------------------------------|----------------------------|---------|--------|
| EventEmitter    | `src/core/mixins/EventEmitter.js`     | `mixins/EventEmitter.md` + `core/Events.md` | (covered by `core/Events/`) | ✅ |
| EventDelegate   | `src/core/mixins/EventDelegate.js`    | (covered in `core/Events.md`) | —     | ✅ |
| FileDropMixin   | `src/core/mixins/FileDropMixin.js`    | (covered in `extensions/FileUpload.md`) | (used in `extensions/FileUpload/`) | ✅ |
| MOJOUtils       | `src/core/utils/MOJOUtils.js`         | `utils/MOJOUtils.md`       | —       | ⚠️ Doc-only (likely fine — utilities are reference-only). |
| DjangoLookups   | `src/core/utils/DjangoLookups.js`     | —                          | —       | 🪦 Undocumented. |
| TemplateResolver| `src/core/utils/TemplateResolver.js`  | —                          | —       | 🪦 Undocumented (internal). |
| MustacheFormatter | `src/core/utils/MustacheFormatter.js` | (covered in `core/Templates.md`) | — | ✅ |
| ConsoleSilencer | `src/core/utils/ConsoleSilencer.js`   | —                          | —       | 🪦 Undocumented (internal). |

---

## Dead code / stale

| What | Where | Note |
|------|-------|------|
| Duplicate `MapView` | `src/core/views/map/MapView.js` AND `src/extensions/map/MapView.js` | The extension version is the canonical one (exported from `web-mojo/map`). The core version is older and different — likely dead code. **Action**: delete `src/core/views/map/`. |
| In-progress example folder | `examples/portal/examples/components/ActiveGroup/` | Empty directory; `'components/active-group'` is in `TOPIC_TAXONOMY` (Components → Navigation) but no `example.json` or example file yet. The build will fail until the example lands. **Action**: finish writing the example, or remove the taxonomy entry until ready. |
| Unreferenced `mustache.js` warning | `src/utils/mustache.js` | ESLint says "ignored by pattern". Check whether it's still needed. |
| `extensions/metricsminichartwidget.md` (lowercase) vs registry route `extensions/charts/metrics-mini-chart` | filename casing mismatch | **Action**: rename doc to `MetricsMiniChartWidget.md` to match other doc filenames. |
| `extensions/Map.md` | This is a README-style overview that overlaps with `MapView.md` and `MapLibreView.md` | **Action**: delete or fold into one of the others. |
| `extensions/Location_API.md` | Possibly redundant with `Location.md` | Review and merge if duplicative. |
| `forms/FORMS_DOCUMENTATION_PLAN.md` | Internal planning doc that snuck into published docs | **Action**: move to `planning/notes/`. |

---

## Mismatches summary — actionable

The mismatches that drove this audit, in priority order. Each is a small, safe move (folder rename + path updates + registry regen + tests).

### Priority 1 — clear "wrong area" (4 items)

1. **TabView**: source is `core/views/navigation/`. Move docs from `extensions/` → `components/`. Move example from `extensions/TabView/` → `components/TabView/`. Route changes from `extensions/tab-view` → `components/tab-view`. Update `TOPIC_TAXONOMY` (already in `Components → Navigation`, just needs route update).
2. **TablePage**: source is `core/pages/`. Move doc from `components/` → `pages/`. Example is already in `pages/TablePage/`. Update `TOPIC_TAXONOMY` (already in Architecture → Pages, no change). Update README cross-link.
3. **FileUpload**: source is `core/services/`. Move doc from `extensions/` → `services/`. Move example from `extensions/FileUpload/` → `services/FileUpload/`. Route changes from `extensions/file-upload` → `services/file-upload`. Update `TOPIC_TAXONOMY`.
4. **MetricsMiniChartWidget doc filename casing** — rename `extensions/metricsminichartwidget.md` → `extensions/MetricsMiniChartWidget.md`.

### Priority 2 — model location (16 items, big rename)

Move 16 admin-only models out of `src/core/models/` and into `src/extensions/admin/<sub-area>/models/`. This is a much bigger change because:

- Every admin file currently imports them via `@core/models/<X>.js` aliases.
- Tests reference them.
- Public API may change (anything in `web-mojo` that re-exports `User`, `Group`, etc. is a separate concern from these admin-coupled models).

This is large enough to justify its own request file. **Out of scope for the immediate cleanup.**

### Priority 3 — dead code & doc cleanup

- Delete `src/core/views/map/` (duplicate MapView).
- Delete `examples/portal/examples/components/ActiveGroup/` (empty folder).
- Move `forms/FORMS_DOCUMENTATION_PLAN.md` to `planning/notes/`.
- Decide fate of `extensions/Map.md` (delete or fold).
- Document the truly-core utilities or accept them as private.

### Priority 4 — doc-without-example or example-without-doc gaps

- `forms/FormBuilder.md` — write an example if FormBuilder is public API.
- `extensions/{Auth,docit,user-profile,mojo-auth}` — write doc pages.

---

## Recommended approach

**Phase 1 (this work):** Priority 1 + Priority 3. Single PR. Low risk, high readability win, fixes the issue the user noticed (TabView). Bumps the registry, regenerates docs index, regenerates sidebar — all automatic.

**Phase 2 (separate request):** Priority 2 model relocation. Touches `src/`, public exports, and tests. Worth its own design pass.

**Phase 3 (separate request):** Priority 4 doc/example gaps. Backlog work.
