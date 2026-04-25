# Document Undocumented Public-API Exports

**Type**: request
**Status**: open
**Date**: 2026-04-25
**Priority**: medium

## Description

`src/index.js` exports several classes and utilities that have no doc file under `docs/web-mojo/`. Each appears in the public package surface but is invisible to the docs index. Add a doc file for each, matching the existing doc style.

Surfaced during the `examples-rewrite` audit (`planning/notes/examples-rewrite-audit.md`). The examples rewrite explicitly stays out of doc-writing scope; this request covers the cleanup.

## Context

A consumer who imports `{ X } from 'web-mojo'` should be able to find a doc page for `X`. Today they can't, for these symbols. Worse, the LLM-facing `find-example` skill cannot suggest these components because they're invisible to the docs taxonomy.

The examples rewrite covers ContextMenu, the multi-step wizard pattern, and the search/filter form pattern (the items the legacy portal actively demonstrated). The remaining gaps below are exports that aren't shown in any example today, so they slipped past that audit's "what's in the portal but missing from docs" cut.

## Acceptance Criteria

- [ ] One doc file added per item below, matching existing component/util doc style (Overview → Quick Start → API → Common Patterns → Common Pitfalls → Related Docs).
- [ ] Each doc imports examples from `web-mojo` only, follows project Mustache rules, and respects the lifecycle/data-action conventions in `.claude/rules/views.md`.
- [ ] `docs/web-mojo/README.md` index gets a new row for each so the doc is discoverable.
- [ ] If a class is referenced from another doc (e.g. `View.md` mentions `EventDelegate`), the existing reference is updated to link to the new doc.
- [ ] If a doc determines that the export is no longer needed (deprecated, internal), file a follow-up issue to remove it from `src/index.js` rather than documenting it.

## Items to Document

### Core
- **Router** → `docs/web-mojo/core/Router.md`
  - Source: `src/core/Router.js`
  - Hash-based router used internally by WebApp; its public API (navigate, addRoute, params) is not documented anywhere.

### Components
- **ProgressView** → `docs/web-mojo/components/ProgressView.md`
  - Source: `src/core/views/feedback/ProgressView.js`
  - Used by FileUpload toast — file-upload progress UI with percent, cancel button, and completion state.
- **SimpleSearchView** → `docs/web-mojo/components/SimpleSearchView.md`
  - Source: `src/core/views/navigation/SimpleSearchView.js`
  - Lightweight search input with debounce, clear button, and change events.
- **SideNavView** → `docs/web-mojo/components/SideNavView.md`
  - Source: `src/core/views/navigation/SideNavView.js`
  - Section-based side navigation used inside modal detail views (FileView, ShortLinkView, etc.).

### Services
- **TokenManager** → `docs/web-mojo/services/TokenManager.md`
  - Source: `src/core/services/TokenManager.js`
  - Auth token storage + refresh + expiration logic. Important for anyone wiring custom auth.

### Utilities
- **ConsoleSilencer** → `docs/web-mojo/utils/ConsoleSilencer.md`
  - Source: `src/core/utils/ConsoleSilencer.js`
  - Console-level suppression for production builds; exported as both default class and `installConsoleSilencer` function.
- **DjangoLookups** → `docs/web-mojo/utils/DjangoLookups.md`
  - Source: `src/core/utils/DjangoLookups.js`
  - Django ORM-style query lookup helpers (`__gte`, `__icontains`, etc.) used by Collection filters. Also exports `parseFilterKey`, `formatFilterDisplay`, `LOOKUPS`.
- **DataWrapper** → `docs/web-mojo/utils/DataWrapper.md`
  - Source: `src/core/utils/MOJOUtils.js` (named export alongside `MOJOUtils`)
  - Wrapper around plain objects giving Model-like get/set semantics without REST.
- **MustacheFormatter** → `docs/web-mojo/utils/MustacheFormatter.md`
  - Source: `src/core/utils/MustacheFormatter.js`
  - Lower-level formatter that powers `dataFormatter`. Document the pipe-syntax extension surface (registering custom formatters).

### Mixins
- **EventDelegate** → `docs/web-mojo/mixins/EventDelegate.md`
  - Source: `src/core/mixins/EventDelegate.js`
  - The `data-action` → `onActionKebabCase` machinery. Currently described inside `core/Events.md` but lacks its own page.
- **applyFileDropMixin** → `docs/web-mojo/mixins/FileDropMixin.md`
  - Source: `src/core/mixins/FileDropMixin.js`
  - Drag-and-drop file mixin applied to any View. Demonstrated in legacy `FileDropPage.js`; the API itself is undocumented.

### Extension surface
- **UserProfileView** and **PasskeySetupView** → `docs/web-mojo/extensions/UserProfile.md` (single doc covering both)
  - Source: `src/extensions/user-profile/index.js`
  - Re-exported from the main package surface but documented nowhere.

## Constraints

- Each doc must verify the API against the source file before publishing — no hallucinated options.
- Match the `Documentation Standards` section in `docs/web-mojo/README.md` exactly.
- Do not re-export anything new; this is documentation only.
- If an export turns out to be unused/internal, prefer removing the export to documenting it.

## Out of Scope

- Documenting components that already have docs.
- The examples rewrite itself (`planning/requests/examples-rewrite.md`).
- Any source-code changes other than removing genuinely-dead exports.

## Notes

This request is **parallelizable** — each item is a self-contained doc agent task. Hand it to `/build` once the examples rewrite is far enough along that the doc style is locked.

---

## Resolution
**Status**: open
