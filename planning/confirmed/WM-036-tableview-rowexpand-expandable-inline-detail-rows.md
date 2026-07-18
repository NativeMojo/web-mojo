---
id: WM-036
type: feature
title: "TableView `rowExpand:` — expandable inline detail rows"
priority: P2
effort: M
owner: core
opened: 2026-07-18
depends_on: []
related: [WM-038]
links: []
---

# TableView `rowExpand:` — expandable inline detail rows

## What & Why
Add an opt-in `rowExpand:` option to TableView: a chevron cell toggles an
inline detail row under the data row, rendering author-supplied content for
that row's model. Kills the "open a modal to read one more field" flow for
quick-look cases; complements (does not replace) the `_item` deep-link modal
for full record detail.

## Acceptance Criteria
- [ ] `rowExpand: (model) => string | View` on TableView — string (template)
      or View instance rendered into a full-width detail row
      (`colspan` spanning selection + data + actions columns, mirroring the
      existing colspan handling at `TableView.js:~741`).
- [ ] Chevron toggle cell renders as the first column when `rowExpand` is set;
      `data-action="toggle-expand"` per row; chevron rotates when open.
- [ ] One-at-a-time by default; `rowExpandMultiple: true` allows several open.
- [ ] Expanded state survives a re-render of the same page of rows (e.g.
      pill removal refetch collapses is acceptable — but a pure re-render,
      e.g. selection change, must not collapse). Page change collapses all.
- [ ] View-returning form uses `addChild()` lifecycle correctly (child added
      post-render needs explicit `render()` per ViewChildViews.md — follow
      the documented Dynamic Children pattern).
- [ ] Option absent → zero change (no chevron column, no markup delta).
- [ ] Forwarded through TablePage whitelist + forwarding test assertion.
- [ ] Detail-row surface uses Bootstrap tokens (`var(--bs-tertiary-bg)` or
      similar), light+dark correct from day one.
- [ ] Unit tests: chevron renders per row, toggle expands/collapses, single
      vs multiple mode, colspan math with/without selection column, string vs
      View content, omitted → current markup.
- [ ] Docs: `TableView.md` section; `CHANGELOG.md`.

## Notes
Pre-scoped in the WM-EPIC session (2026-07-18):
- Implementation surface is mostly `TableRow.js` (+ small TableView plumbing) —
  deliberately disjoint from the toolbar work, which is why this runs in epic
  wave 1 in parallel with feedback-states, auto-refresh, and WM-032.
- Reuse the inline-edit precedent in TableRow (`editingCells` state tracking,
  `TableRow.js:34-35`) as the pattern for `expandedRows` state.
- Interaction with row `data-action`/context menus: the chevron cell must not
  trigger row-level click actions (stopPropagation like the `.btn-group`
  guard at `TableRow.js:440`).
- Mockup gate: expanded-row mockup (light+dark) in epic phase 0.

## Resolution
- closed: YYYY-MM-DD
- branch:
- files changed:
- tests added:
