# UserView permissions section ignores the app-level permission extension points

**Type**: bug
**Status**: resolved
**Date**: 2026-05-30

## Description

`User.js` exposes an app-level permission extension API so apps can register their own
domain permissions once and have them appear wherever user permissions are edited:
`User.registerPermissions()`, `User.APP_CATEGORY_PERMISSIONS`,
`User.APP_GRANULAR_PERMISSIONS`, and `User.rebuildPermissions()` (which assembles the
cached field arrays `User.PERMISSION_FIELDS`, `User.CATEGORY_PERMISSION_FIELDS`,
`User.GRANULAR_PERMISSION_FIELDS` — the latter two already include an "App" tab when the
`APP_*` arrays are non-empty).

`UserView`'s permissions section never consumes this. It re-derives its own tabset from
the framework *source* arrays, so app-registered permissions are dropped in the user
detail view even though they render correctly in the user table's "Edit Permissions"
modal.

## Context

This breaks the intended pattern where an app configures permissions at the User
"system level" (and Member "group level") once and they appear in every permission
editor. Today the User detail view and the User table modal disagree about which
permissions exist, and the documented `User.registerPermissions(...)` extension API is
effectively dead for the detail view. Affects any app that adds its own permission keys
(e.g. MojoVerify's verify/wallet/docsign).

## Reproduction

```js
// in an app, before opening the admin user screens:
User.registerPermissions({
    categories: [{ name: 'verify', label: 'Verify' }],
    granularPermissions: [{ name: 'manage_verify', label: 'Manage Verify' }]
});
```

1. Open **user table → row → Edit Permissions** → `verify` / `manage_verify` toggles appear.
2. Open **user detail (`UserView`) → Permissions section**.
3. Observe the `verify` / `manage_verify` toggles are missing.

## Expected Behavior

Permissions registered via `User.registerPermissions({ categories, granularPermissions, granularTabs })`
render as editable, autosaving toggles in `UserView`, matching the table-row "Edit
Permissions" modal.

## Actual Behavior

App-registered `categories` and `granularPermissions` are dropped in `UserView`. Only
`granularTabs` happen to show, because they mutate `User.GRANULAR_PERMISSION_TABS`
directly — so behavior is inconsistent even across the three `registerPermissions`
inputs. The table modal shows all of them, so the two entry points disagree.

Root cause — `UserPermissionsSection.onInit()` builds its tabs from the source arrays
instead of the rebuilt caches:

```js
// src/extensions/admin/account/users/UserView.js:670-687
const _ps = User._permSwitch;
const tabs = [
    { label: 'Categories', fields: (User.CATEGORY_PERMISSIONS || []).map(_ps) },
    ...(User.GRANULAR_PERMISSION_TABS || []).map(tab => ({
        label: tab.label,
        fields: (tab.permissions || []).map(_ps)
    }))
];
this.formView = new FormView({ containerId: 'user-permissions-form',
    fields: [{ type: 'tabset', tabs }], model: this.model, autosaveModelField: true });
```

It never reads `User.APP_CATEGORY_PERMISSIONS` / `User.APP_GRANULAR_PERMISSIONS`, nor the
prebuilt `User.CATEGORY_PERMISSION_FIELDS` / `User.GRANULAR_PERMISSION_FIELDS` caches
(assembled in `src/core/models/User.js:205-223`). The stale comment at
`UserView.js:649-653` references only the source arrays, indicating this section predates
the `APP_*` / `rebuildPermissions()` enhancement and was never updated.

Suggested fix — point the section at the prebuilt caches:

```js
this.formView = new FormView({
    containerId: 'user-permissions-form',
    fields: [...User.CATEGORY_PERMISSION_FIELDS, ...User.GRANULAR_PERMISSION_FIELDS],
    model: this.model,
    autosaveModelField: true
});
```

(Each cache is already a `{ type: 'tabset', tabs }`; adjust labels/merging if a single
combined tabset is preferred.) Refresh the stale comment at `UserView.js:642-655` too.

## Affected Area

- **Files / classes**:
  - `src/extensions/admin/account/users/UserView.js:657-688` (defect — `UserPermissionsSection`)
  - `src/core/models/User.js:151-293` (extension points, `registerPermissions`, `rebuildPermissions`, field caches)
  - `src/extensions/admin/account/users/UserTablePage.js:180` (working reference path — `User.PERMISSION_FIELDS`)
  - `src/extensions/admin/account/users/MemberView.js:234-242` (correct consumption — `Member.PERMISSION_FIELDS`)
  - `src/core/models/Member.js:87-121` (Member extension array; lacks a `registerPermissions()` helper / grouping)
- **Layer**: Extension (View)
- **Related docs**: downstream app-side wiring tracked in `mverify_portal/planning/issues/app-level-permissions-not-surfaced-in-user-member-views.md`

## Acceptance Criteria

- [x] Bug is reproduced or clearly isolated
- [x] Root cause is identified
- [x] Permissions registered via `User.registerPermissions(...)` render as editable, autosaving toggles in `UserView`
- [x] `UserView` and the `UserTablePage` "Edit Permissions" modal show the same permission set (no drift)
- [x] Stale comment at `UserView.js:642-655` updated
- [x] (Optional) `Member.registerPermissions()` added to mirror the User API for group-level perms
- [x] Fix is verified with the relevant test/build/manual check

---

## Plan

### Objective
`UserPermissionsSection` (in `UserView`) renders **every** permission registered via
`User.registerPermissions({ categories, granularPermissions, granularTabs })` — including
`APP_CATEGORY_PERMISSIONS` and `APP_GRANULAR_PERMISSIONS` — as editable, autosaving toggles,
by consuming the prebuilt cache arrays the framework already maintains instead of
re-deriving its tabs from the source arrays. After the fix, the `UserView` Permissions
section and the `UserTablePage` "Edit Permissions" modal show the same permission set (no
drift). Additionally, add a `Member.registerPermissions()` helper mirroring the User API so
group-level perms get the same one-call registration.

Root cause is confirmed: the model layer is correct and already unit-tested
(`test/unit/User.test.js:119-207` covers `rebuildPermissions()`, the "App" tab emission, and
in-place cache mutation). The defect is purely in view consumption — `UserPermissionsSection`
is the only consumer that re-derives instead of reading the caches (`MemberView` reads
`Member.PERMISSION_FIELDS` correctly; the table modal reads `User.PERMISSION_FIELDS`).

### Steps

1. **`src/extensions/admin/account/users/UserView.js` — `UserPermissionsSection.onInit()` (lines 670–687).**
   Replace the hand-built tab derivation (which maps `User.CATEGORY_PERMISSIONS` /
   `User.GRANULAR_PERMISSION_TABS` via `User._permSwitch`) with a single autosave `FormView`
   fed from the prebuilt caches, with two sub-headings for legibility:
   ```js
   this.formView = new FormView({
       containerId: 'user-permissions-form',
       fields: [
           { type: 'header', level: 6, text: 'Categories', class: 'detail-section-eyebrow' },
           ...User.CATEGORY_PERMISSION_FIELDS,   // [{ type:'tabset', tabs:[System (+App)] }]
           { type: 'header', level: 6, text: 'Advanced',   class: 'detail-section-eyebrow' },
           ...User.GRANULAR_PERMISSION_FIELDS    // [{ type:'tabset', tabs:[domains… (+App)] }]
       ],
       model: this.model,
       autosaveModelField: true
   });
   this.addChild(this.formView);
   ```
   Keep the existing single container (`data-container="user-permissions-form"`, template
   line 664) and `autosaveModelField: true`. Drop the now-unused local `_ps`/`tabs` block.
   Rationale for one FormView (not two): zero autosave-coordination risk, smallest delta from
   the current structure. The two cache arrays stay as two separate tabsets (one per
   sub-heading), so an app that registers *both* category and granular perms gets a clean
   "App" tab inside each group rather than two colliding "App" tabs in one bar.
   - *Alternative (if exact eyebrow styling is preferred over the `header` field):* mirror
     `MemberPermissionsSection`'s two-container template — two `data-container`s with
     `detail-section-eyebrow` divs, one `FormView` per cache. Both autosave the same model on
     disjoint field sets; verify no clobber if this path is taken.

2. **`src/extensions/admin/account/users/UserView.js` — stale comment (lines 642–655).**
   Rewrite to describe cache consumption: the section reads `User.CATEGORY_PERMISSION_FIELDS`
   + `User.GRANULAR_PERMISSION_FIELDS` (rebuilt by `User.rebuildPermissions()`), so
   app-registered permissions appear automatically and the section never drifts from the
   table modal. Drop the "predates the APP_* enhancement" wording. Also fix the file-overview
   line 10 (`Permissions — TabView (Common / Advanced / Effective)`) to match reality
   (FormView tabsets: Categories / Advanced; no "Effective" view exists).

3. **`src/core/models/Member.js` — add `Member.registerPermissions()` (after `rebuildPermissions`, ~line 118, before the initial `Member.rebuildPermissions()` call at line 121).**
   Mirror `User.registerPermissions` for Member's single extension array:
   ```js
   // One-shot registration of app group-level permissions. Appends to
   // APP_PERMISSIONS and rebuilds caches in one call.
   //   Member.registerPermissions({ permissions: [{ name: 'manage_x', label: 'Manage X' }] });
   Member.registerPermissions = function(spec) {
       if (!spec) return;
       if (Array.isArray(spec.permissions)) {
           Member.APP_PERMISSIONS.push(...spec.permissions);
       }
       Member.rebuildPermissions();
   };
   ```
   No `MemberView` change needed — it already consumes `Member.PERMISSION_FIELDS`.

4. **`docs/web-mojo/models/BuiltinModels.md` — Member section (~line 488–497).**
   Add a short note + example for the new `Member.registerPermissions({ permissions })` helper,
   matching the existing User `registerPermissions` documentation (line 208–215). The User
   docs and cache-contract text are already accurate — no correction needed there.

5. **`CHANGELOG.md` — Unreleased entry.**
   Note the fix (UserView Permissions section now surfaces app-registered permissions; matches
   the table "Edit Permissions" modal) and the new `Member.registerPermissions()` API.

6. **Tests.**
   - Add a unit test in `test/unit/Member.test.js`: after `Member.registerPermissions({ permissions: [{ name:'manage_x', label:'Manage X' }] })`, assert `Member.PERMISSION_FIELDS` contains `permissions.manage_x`; restore `APP_PERMISSIONS` + rebuild in `afterEach` (mirror the save/restore pattern in `User.test.js:26-48`).
   - UserView regression: attempt a narrow test that constructs `UserPermissionsSection` and asserts its `FormView` fields include an app-registered perm. **Flagged risk:** `UserView`'s import graph is heavy (DetailView, ListView, many models); if it won't load cleanly under the runner, fall back to manual verification (the issue's repro steps) and rely on the existing cache coverage in `User.test.js`. State this explicitly in the handoff rather than forcing a brittle test.

### Design Decisions
- **Consume the caches, never re-derive** — the root-cause fix. The whole point of
  `rebuildPermissions()` + the `*_PERMISSION_FIELDS` caches is to be the single source of
  truth; re-deriving in the view is exactly what dropped the `APP_*` perms. This matches
  `MemberPermissionsSection` (reads `Member.PERMISSION_FIELDS`) and the table modal (reads
  `User.PERMISSION_FIELDS`).
- **Two labeled tabsets (chosen)** over a single merged tab bar: avoids the duplicate-"App"-tab
  collision that a merged `[...catTabs, ...granTabs]` would produce when both app arrays are
  populated, and keeps category vs granular conceptually distinct.
- **One FormView with `header` separators** over two FormViews: smallest change to the existing
  section, no dual-autosave coordination. (Two-container/eyebrow noted as an alternative.)
- **`autosaveModelField: true` unchanged** — toggles still batch into
  `model.save({ "permissions.<name>": true })`; the backend merges the dotted key.

### Edge Cases
- **No app perms registered (default):** caches hold only the framework System tab + framework
  granular tabs, so content is unchanged except the deliberate, accepted layout shift (two
  sub-headed tabsets instead of one combined tab bar). Verify the baseline still renders and
  autosaves.
- **App registers both categories *and* granular perms:** an "App" tab appears inside *each*
  tabset — fine, because they're separate tab bars (no label collision). This is the reason
  two-tabsets beats single-merged.
- **Shared cache field objects across consumers:** each cache is built with its own
  `.map(_ps)` instances (category switches ≠ granular switches ≠ flat `PERMISSION_FIELDS`),
  and `_permSwitch` already sets `columns: 6`, so `FormBuilder`'s column normalization is a
  no-op — no cross-mutation between the detail view and the table modal. Re-opening the view
  re-reads the live caches (in-place mutated), so a perm registered before the view opens is
  always present.
- **Section permission gate** (`permissions: ['users','manage_users']`, line 1349) is
  unchanged — visibility behavior is unaffected.

### Testing
- `npm run test:unit` — must stay green; `User.test.js` already guards the caches, plus the
  new `Member.test.js` assertion.
- `npm run lint`.
- **Manual (authoritative for the View fix):** run the issue's repro — `User.registerPermissions({ categories:[{name:'verify',label:'Verify'}], granularPermissions:[{name:'manage_verify',label:'Manage Verify'}] })`, open **user table → Edit Permissions** (toggles present) and **UserView → Permissions** (same toggles now present under Categories/Advanced). Confirm a toggle autosaves.

### Docs Impact
- `docs/web-mojo/models/BuiltinModels.md`: **+** `Member.registerPermissions()` note/example
  (new public API). User permission docs already accurate — no change.
- `CHANGELOG.md`: Unreleased entry (behavioral fix + new Member API).
- Code comments refreshed (`UserView.js:642-655` and the line-10 overview) — not published docs.

### Out of Scope
- The read-only "Effective permissions" view referenced in the old stale comment (never
  implemented).
- Any change to backend permission semantics or the `permissions` JSONField merge.
- Redesigning the permissions UX beyond consuming the caches + the chosen two-tabset layout.
- `MemberView`'s read-only system-perms panel (already correct).

---
<!-- Filled in on resolution -->
## Resolution
**Status**: Resolved

Root cause was view-side only: `UserPermissionsSection` re-derived its tabs from the framework
*source* arrays and never read the `APP_*` arrays, so app-registered permissions were dropped.
The model layer (`rebuildPermissions()` and its caches) was already correct and unit-tested.

The fix landed in two iterations (the second driven by UX review — the first attempt stacked two
tab rows in one section, which read as cluttered):

**UserView — two clean side-nav sections.** Replaced the single "Permissions" section with
**Sys Perms** (framework: System category + granular domains, one row of tabs) and **App Perms**
(app-registered: Categories + Permissions; registered only when an app added any). Each is one
autosaving `FormView` over a single tabset. `UserPermissionsSection` is now parameterized
(`{ eyebrow, fields }`) and instantiated twice. Both consume new section-aligned live caches —
never re-derived — so app permissions appear automatically and can't drift from the table's
"Edit Permissions" modal (which still reads the flat `User.PERMISSION_FIELDS`).

**User model — two additive caches.** `rebuildPermissions()` now also builds
`User.SYSTEM_PERMISSION_FIELDS` (one tabset: System + granular domains) and
`User.APP_PERMISSION_FIELDS` (one tabset: Categories + Permissions, or `[]`). The existing
`CATEGORY_/GRANULAR_PERMISSION_FIELDS` and flat `PERMISSION_FIELDS` are untouched (no breakage).
Routing rule: `registerPermissions({ categories, granularPermissions })` → App Perms;
`granularTabs` → a framework granular tab (Sys Perms), per the existing tested contract.

**MemberView — group-perms-only, tabbed.** Dropped the read-only "System permissions" panel
entirely (system perms are viewed/edited from the user's detail view). The section is now a
single autosaving tabset: **Standard** (framework group perms) + an **App** tab and/or one tab
per registered app domain. `Member.registerPermissions({ permissions, tabs })` gained a
`tabs: [{ label, permissions }]` form for **multiple** app tabs; new `Member.APP_PERMISSION_TABS`
source + `Member.PERMISSION_TABSET` cache back it (flat `permissions` still → a single "App" tab).

**Examples portal** registers a demo vocabulary so the API is exercised live: User
`verify`/`wallet` categories + 5 granular app perms + a category→granular map; Member `Verify`
and `Wallet` tabs.

**Files changed:**
- `src/core/models/User.js` — `SYSTEM_PERMISSION_FIELDS` / `APP_PERMISSION_FIELDS` caches
- `src/extensions/admin/account/users/UserView.js` — two sections (Sys Perms / App Perms); comments refreshed
- `src/core/models/Member.js` — `registerPermissions({ tabs })`, `APP_PERMISSION_TABS`, `PERMISSION_TABSET`
- `src/extensions/admin/account/users/MemberView.js` — system panel removed; single tabset section
- `examples/portal/app.js` — demo `User`/`Member` permission registration
- `docs/web-mojo/models/BuiltinModels.md` — new caches + `tabs` registration documented
- `CHANGELOG.md` — Unreleased entry
- `test/unit/User.test.js`, `test/unit/Member.test.js` — regression tests for the new caches/tabs

**Verification:**
- `npm run test:unit` — 1168 passed (5 new User/Member tests); the 8 failures are pre-existing,
  unrelated Incident-view suites (identical count on a clean tree).
- `npm run test:build` — 142/142. `npm run lint` (src only) — clean.
- Live portal (screenshots captured): **Sys Perms** = `[System · Account · Communication ·
  Platform]`; **App Perms** = `[Categories · Permissions]` with verify/wallet + the granular app
  perms; **MemberView** = `[Standard · Verify · Wallet]`, no system panel. Each is one row of tabs.
