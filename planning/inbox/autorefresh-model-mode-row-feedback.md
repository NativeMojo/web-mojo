---
id:
type: feature
title: "autoRefresh mode: 'models' — in-place model refresh (id__in batch) + per-row change feedback"
priority: P2
effort: M
owner: core
opened: 2026-07-18
depends_on: []
related: [WM-034, WM-033, WM-038]
links: []
---

# autoRefresh mode: 'models' — in-place model refresh (id__in batch) + per-row change feedback

## What & Why
WM-034 shipped `autoRefresh: <seconds>` as a full collection refetch — right
for discovering new rows, but disruptive when you only want to watch the
*visible* rows' fields change (incident status, job progress): membership can
churn, pagination can shift.

Ian's direction (2026-07-18, reviewing the epic): split refresh into two modes:

1. **`mode: 'collection'`** (default — today's behavior): full
   `collection.fetch()` under current params; discovers new/removed rows.
2. **`mode: 'models'`**: one batched fetch scoped to the models already in
   the collection — `id__in=<current ids>` (standard django-mojo lookup, no
   new endpoint) — merged into the existing model instances via
   `model.set(..., { skipRender })`-style updates. No membership change, no
   pagination shift, no scroll jump.

Plus the per-row feedback WM-033 deliberately didn't cover: a quiet visual
flash/tint on rows whose data actually changed during a refresh — the
row-level counterpart to the collection-level skeleton.

## Acceptance Criteria
- [ ] `autoRefresh` accepts the object form `{ every: <seconds>, mode:
      'collection' | 'models', indicator?: boolean }`; bare number stays
      supported and means `{ every: n, mode: 'collection' }`.
- [ ] `mode: 'models'`: single batched request (`id__in` of current model
      ids, chunked if very long), responses merged into existing models
      in place; models missing from the response are left untouched (not
      removed) — documented.
- [ ] Merge must not re-render the whole list; changed rows update via the
      model-change path. Sort order is NOT re-derived mid-watch (stability
      over strict sort correctness — documented).
- [ ] Per-row change feedback: rows whose merged data differed get a subtle,
      theme-correct flash (token-based, dark companion, reduced-motion
      guard); opt-out flag. Also fires for mode 'collection' refreshes where
      row identity persists, if cheap.
- [ ] All WM-034 pause conditions (hidden/blur, selection, inline edit, open
      menu) apply to both modes; teardown guarantees unchanged.
- [ ] Opt-in/back-compat: existing `autoRefresh: 30` behavior byte-identical.
- [ ] TablePage forwarding untouched (same `autoRefresh` key) — object form
      passes through the existing line; forwarding test extended for it.
- [ ] Tests: mode routing, id__in request shape + chunking, in-place merge
      (no reset/add/remove events storm), missing-id untouched, changed-row
      flash + opt-out, bare-number back-compat.
- [ ] Docs: ListView.md auto-refresh section reworked for both modes;
      CHANGELOG.

## Notes
- Backend: `id__in` is a standard django-lookup on list endpoints — verify
  against django-mojo conventions during /scope; if a gap exists, file the
  DM-side item and add `depends_on`.
- Naming discussion for /scope: `{ every, mode }` vs `{ interval, mode }` —
  pick one and keep the bare-number shorthand.
- Related decision context in `memory.md` (WM-038 epic entry) — composition
  contracts and the cached-page unmount seam (WM-034's timer patterns must
  be preserved).

## Resolution
- closed: YYYY-MM-DD
- branch:
- files changed:
- tests added:
