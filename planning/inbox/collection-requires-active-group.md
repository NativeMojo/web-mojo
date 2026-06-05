---
id:
type: feature
title: "Collection — `requiresActiveGroup` option for tenant-scoped fetches"
priority: P2
effort: TBD
owner: TBD
opened: 2026-05-21
depends_on: []
related: []
links: []
---
# Collection — `requiresActiveGroup` option for tenant-scoped fetches

## Description

Add a `requiresActiveGroup` option to `Collection` so a collection of a
group/tenant-scoped resource automatically injects the active group's id into
every fetch — without each caller threading the group through `params`. A
collection class that is *always* tenant-scoped declares it on by default.

This is the fetch-side counterpart to the existing `addRequiresActiveGroup`
option on `ListView` / `TableView` (which injects the active group into the
Add modal's save payload). `Collection.requiresActiveGroup` does the
equivalent for reads.

## Context

Multi-tenant web-mojo apps scope most resources to the active group
(`app.activeGroup`). Two problems today:

1. **Per-page boilerplate.** Every page that lists a group-scoped resource
   calls `collection.setParams({ group: app.activeGroup.id })` in `onEnter`.
   It's repetitive, and a page that forgets it silently fetches unscoped
   (wrong tenant's data, or an empty/`400` result from a proxy that requires
   the group).

2. **Framework-instantiated collections can't be scoped at all.** The
   `CollectionSelect` form input (`type: 'collection'`) instantiates the
   configured `Collection` internally — there is no page, and no
   `onEnter`, on which to call `setParams`. The form schema is static while
   the active group is a runtime value, so there is currently no clean way
   to scope a `CollectionSelect` to the active group. This blocks using
   `CollectionSelect` for tenant-scoped foreign-key pickers — the exact use
   case it is best suited for.

The framework already owns this concept on the write/list side:
`ListView`/`TableView`'s `addRequiresActiveGroup` reads
`getApp().activeGroup.id` and injects `group` into the create payload. The
missing half is a read-side equivalent on `Collection`.

### Where it plugs in

`Collection.fetch()` assembles `fetchParams = { ...this.params,
...additionalParams }` and calls `rest.GET(url, fetchParams)` (see
`_performFetch` in `src/core/Collection.js`). `requiresActiveGroup` would
inject `group` into that param set at fetch time.

One open implementation question: `Collection` currently has no access to
the app or the active group (unlike a `View`, which has `getApp()`). The
implementation needs a `Collection`-reachable way to read the current active
group — e.g. a global app singleton accessor or a small `@core`
active-group module. Defining that accessor is part of this work.

## Acceptance Criteria

- [ ] `Collection` accepts a `requiresActiveGroup` option; when true, every
      `fetch()` / `fetchMore()` includes the active group's id as a `group`
      query param.
- [ ] A `Collection` subclass can set `requiresActiveGroup` as a default, so
      a permanently tenant-scoped collection declares it once in the class.
- [ ] `CollectionSelect` honors it: a `collection` form field bound to a
      `requiresActiveGroup` collection fetches scoped to the active group
      with no extra per-field config.
- [ ] An explicit `group` already present in `params` / `additionalParams`
      is respected — caller override wins, with documented precedence.
- [ ] Behavior when there is no active group is defined and documented
      (inject nothing / no-op rather than sending `group=undefined`).
- [ ] Backward compatible — collections without the flag are unchanged.
- [ ] Documented in `docs/web-mojo/` (Collection + CollectionSelect) and
      noted in `CHANGELOG.md`.

## Constraints

- Opt-in, default off — must not change existing collections' behavior.
- `Collection` must not take a hard dependency on a `View`; it needs a
  non-View path to the active group.
- Naming and semantics should mirror the existing `addRequiresActiveGroup`
  for a consistent framework vocabulary.
- Out of scope: how the app sets/persists the active group; per-request
  multi-tenant overrides; auto-refetching collections when the active group
  changes (could be a follow-up).

## Notes

- Counterpart feature: `addRequiresActiveGroup` on `ListView` / `TableView`.
- Relevant source: `src/core/Collection.js` (`fetch` / `_performFetch`
  param assembly), `src/core/forms/inputs/CollectionSelect.js` (internal
  collection instantiation).
- Once shipped, consuming apps can drop the per-page
  `collection.setParams({ group })` boilerplate for tenant-scoped
  collections, and adopt `CollectionSelect` freely for tenant-scoped
  foreign-key fields.

---

<!-- Fill in when the request is resolved, then move the file to planning/done/ -->
## Resolution
**Status**: Resolved — YYYY-MM-DD

**Files changed**:
- `src/...`

**Tests run**:
- `npm run ...`

**Docs updated**:
- `docs/...`
- `CHANGELOG.md` (if applicable)

**Validation**:
[How the final behavior was verified]
