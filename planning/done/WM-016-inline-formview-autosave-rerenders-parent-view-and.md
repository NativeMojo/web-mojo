---
id: WM-016
type: bug
title: Inline FormView autosave rerenders parent view and resets active tab
priority: P2
effort: S
owner: core
opened: 2026-06-11
depends_on: []
related: []
links: []
---

# Inline FormView autosave rerenders parent view and resets active tab

## What & Why
FormView with `autosaveModelField: true` is designed to save a single changed
field without disturbing the rest of the UI — it overrides `_onModelChange()`
to sync field values in place instead of rerendering. But when the FormView
shares its model with parent views (the normal composition: a section `View`
inside a `DetailView`), the autosave's `model.save()` fires a model `change`
event that the **parents** also listen to, and the base
`View._onModelChange()` blindly calls `this.render()`. The whole section —
including the FormView and any tab UI inside it — is destroyed and rebuilt,
and tab state resets to the first tab.

Concretely: in the admin `UserView`, toggling a permission switch in the
Permissions section (a FormView tabset) saves correctly, but the rerender
cascade snaps the tabs back to the first tab. Any view composing an
autosaving inline FormView under a model-sharing parent is affected.

## Acceptance Criteria
- [ ] Changing a field in an `autosaveModelField: true` FormView does not
      trigger a full rerender of ancestor views sharing the same model
      (or, at minimum, tab state — FormView tabsets and `TabView.activeTab`
      — survives the model-change cascade).
- [ ] In admin UserView → Permissions, toggling a switch on a non-first tab
      saves and leaves the same tab active.
- [ ] Field values elsewhere on the page that display the saved attribute
      still update (existing in-place sync behavior preserved).
- [ ] Regression test added that fails before the fix and passes after.
- [ ] Both light and dark themes unaffected (no visual change expected).

## Repro — bugs only
1. Run the dev portal, open Admin → Users → a user (UserView).
2. Go to the Permissions section; switch to a tab other than the first one
   in the permissions tabset.
3. Toggle any permission switch (FormView autosaves via `model.save()`).
- Expected: the toggle saves; the active tab stays put; only the changed
  control updates.
- Actual: the entire section rerenders and the tabset jumps back to the
  first tab.

## Investigation

**Root cause (confidence: high — confirmed by code reading, not yet by
runtime trace):** `View._onModelChange()` at `src/core/View.js:104-108`
calls `this.render()` whenever the shared model fires `change`. The
rerender cascade, hop by hop:

1. `src/extensions/admin/account/users/UserView.js:660-683` —
   `UserPermissionsSection extends View` wraps a `FormView` with
   `autosaveModelField: true` whose fields are a tabset; the section, the
   FormView, and the parent `UserView extends DetailView` all share the
   user model (`View.setModel()` propagates the model to children,
   `src/core/View.js:79-102`).
2. Toggling a field → `FormView` batch-save → `this.model.save(changes)`
   (`src/core/forms/FormView.js:945-949`) → model fires `change`.
3. `FormView._onModelChange()` (`src/core/forms/FormView.js:1836-1851`)
   correctly suppresses its own rerender via the `_isFormDrivenChange`
   flag and syncs values in place — **but the flag only protects the
   FormView itself**.
4. `UserPermissionsSection` and `UserView` (DetailView) use the base
   `View._onModelChange()` (`src/core/View.js:104-108`), which calls
   `this.render()` → children are rebuilt → the FormView (and its tabset
   markup) is regenerated with the default first tab active.

The same cascade resets `TabView` instances: `TabView` stores
`this.activeTab` and re-applies it in its own `onAfterRender()`
(`src/core/views/navigation/TabView.js:579-595`), which protects it from
*its own* rerenders — but a parent-driven rebuild constructs fresh DOM/
state where the restored tab is the initial one. FormView tabsets have no
persistence at all across a rebuild.

**Candidate fix directions (for /scope to weigh, not decided here):**
- Make the framework's model-change rerender smarter/suppressible (e.g. a
  way for a form-driven save to mark the change so ancestor views skip the
  automatic `render()`), and/or
- Have views that rebuild on model change preserve/restore tab state
  (TabView `activeTab`, FormView tabset active tab) across rerenders.

Note the layering: the broken behavior lives in core (`View.js`,
`FormView.js`, `TabView.js`); `UserView.js` is just an exhibit. A fix in
the admin view alone would not satisfy the framework contract documented
in `docs/web-mojo/forms/FormView.md` (autosave is presented as a
transparent, non-disruptive save flow).

**Other affected views:** `src/extensions/admin/account/users/MemberView.js`
(`MemberPermissionsSection`, same autosave-FormView-under-DetailView
pattern; single form so the tab jump may not be visible, but the wasteful
full rerender still happens). Any consumer composing an inline autosaving
FormView beneath a model-sharing parent is exposed.

**Regression-test feasibility:** yes, medium complexity, with the custom
runner (`test/unit/`, CommonJS shape + `loadModule`). Sketch: build a
parent `View` (or `DetailView`) sharing a mock model with a child
`FormView` (`autosaveModelField: true`, tabset fields); render; activate a
non-first tab; trigger a field save (mock `model.save()` that fires
`change`); assert the active tab is unchanged and/or the parent did not
fully rerender. Must fail before the fix.

## Notes

### Scoped plan (proposed 2026-06-11 — pending user sign-off)

**Goal:** an inline-autosave `model.save()` must not trigger automatic
rerenders of other views sharing the model; tab state stays put.

**Mechanism — thread a `skipRender` option through the existing event
pipeline (4 small edits, all core):**

1. `src/core/Model.js` `set()` (~line 121): forward the existing `options`
   object to listeners — `this.emit('change', this, options)`. Extra arg is
   ignored by all current listeners, so fully backward compatible.
2. `src/core/Model.js` `save()` (~line 396): forward request options into the
   post-save set — `this.set(response.data.data, null, options)` — so a
   caller's `skipRender` survives the round trip.
3. `src/core/View.js` `_onModelChange(model, options)` (~line 104): skip the
   automatic `this.render()` when `options?.skipRender` is true. Everything
   else (manual `setModel`, normal `set()`/`save()`) renders exactly as today.
4. `src/core/forms/FormView.js` autosave paths (`executeBatchSave` ~line 949,
   and the second autosave save at ~line 2097): pass
   `this.model.save(changes, { skipRender: true })`. FormView already updates
   its own DOM in place (`_isFormDrivenChange` flag), so nothing visual is
   lost.

**Why this shape:** opt-in per save call — zero behavior change for every
other `set()`/`save()` in the app; no new global state; uses the options
plumbing `Model.set()` already has (`silent`). `change:` per-field events
still fire, so views that genuinely track a field (`model.on('change:x')`)
keep working. Explicit-submit FormView saves are NOT flagged — a full-form
submit keeping the current rerender behavior is intentional.

**Known tradeoff (accepted):** sibling views that display the same saved
field and rely on the automatic full rerender will not refresh for that one
change. That is the documented intent of inline autosave ("only the changed
input updates"); such views can listen to `change:<field>` if they need
live updates.

**Out of scope (optional follow-up item if wanted):** making
`TabView`/FormView tabsets restore their active tab across parent-driven
rebuilds — defense in depth, not needed once the cascade is stopped.

**Tests (regression, custom runner, test/unit/ CommonJS + loadModule):**
- `Model.set(data, null, opts)` forwards `opts` to `change` listeners.
- `View._onModelChange(model, { skipRender: true })` does not call
  `render()`; without the flag it does (fails before fix).
- Integration: parent View + child FormView (`autosaveModelField: true`)
  sharing a mock model whose `save()` resolves success and re-`set()`s data;
  spy on parent `render()` — not called during autosave (fails before fix).

**Docs affected:** `docs/web-mojo/core/Model.md` (set/save options),
`docs/web-mojo/forms/FormView.md` (autosave behavior note),
`CHANGELOG.md`.

### Build deviations from the scoped plan (2026-06-11)

1. The plan's "second autosave save at ~FormView.js:2097" was a misread —
   that's `saveModel()`, the explicit-submit path (called by
   `handleSubmit()`), which per the plan's own intent keeps the rerender.
   Only `executeBatchSave()` (and its no-`save()` fallback `set()`) got the
   flag.
2. `src/core/views/data/DataView.js` added to the fix: the post-build
   security review found it wires its own anonymous `change` listener
   (bypassing `View.setModel`), which ignored `skipRender`. It now honors
   the flag; covered by a dedicated regression test (verified fails
   before / passes after).
3. Test infra: added a `FileDropMixin` rule to
   `test/utils/simple-module-loader.js` so the real `FormView` class can be
   loaded in unit tests (its module body calls `applyFileDropMixin(FormView)`
   at load time; tests stub `global.FileDropMixin = (cls) => cls`).
4. `docs/web-mojo/core/View.md` also updated (docs-updater): the
   "Automatic Re-rendering" section documents `skipRender`, and the model
   `change` listener example shows the `(model, options)` signature.

## Resolution
- closed: 2026-06-11
- branch: main
- files changed: docs/web-mojo/admin/Admin-Dashboard-Page.md,docs/web-mojo/admin/Admin-Model-Page.md,planning/inbox/tableview-row-context-menu-and-permission-gating.md,src/core/views/feedback/ModalView.js
- tests added: test/unit/FormView.autosaveSkipRender.test.js — 7 tests
  (Model option forwarding ×2, View/DataView render suppression ×3,
  FormView autosave batch path ×2); all verified failing before the fix
  and passing after; suite back to the 9 pre-existing baseline failures.
