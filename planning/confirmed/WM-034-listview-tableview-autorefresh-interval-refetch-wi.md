---
id: WM-034
type: feature
title: "ListView/TableView `autoRefresh:` — interval refetch with smart pause"
priority: P2
effort: S
owner: core
opened: 2026-07-18
depends_on: []
related: [WM-038]
links: []
---

# ListView/TableView `autoRefresh:` — interval refetch with smart pause

## What & Why
Monitoring-flavored admin pages (IncidentTablePage, LogTablePage,
EventTablePage) go stale until a manual reload. Add an opt-in
`autoRefresh: <seconds>` option to ListView (inherited by TableView) that
refetches the collection on an interval, with smart pauses so it never fights
the user.

## Acceptance Criteria
- [ ] `autoRefresh: <seconds>` (number) enables interval refetch via
      `collection.fetch()`; minimum enforced (≥5s) to prevent hammering.
- [ ] Pauses while the tab is blurred/hidden (WebApp already tracks
      focus/blur — `WebApp.js:794-795`; reuse that signal or
      `document.visibilityState`), resumes + immediate refetch on focus.
- [ ] Pauses while the user has an active selection (batch-action mode) or an
      open row context menu / inline cell editor — a refresh mid-selection
      resetting checkboxes is worse than staleness.
- [ ] Timer starts on mount / `onEnter`, fully torn down on unmount/`onExit`
      (no leaked intervals across cached page visits).
- [ ] Refetch preserves current `collection.params` (filters, sort, paging) —
      it is a silent re-fetch, not a reset; no scroll jump.
- [ ] Option absent → zero change (no timer created).
- [ ] Forwarded through TablePage whitelist + forwarding test assertion.
- [ ] Unit tests: timer created/cleared on lifecycle, pause on blur, pause on
      selection, min-interval clamp, params preserved, omitted → no timer.
- [ ] Docs: `ListView.md`/`TableView.md` + `CHANGELOG.md`. Optional small
      "auto-refresh" indicator (subtle spinner/dot) documented if included.

## Notes
Pre-scoped in the WM-EPIC session (2026-07-18):
- Opt-in, default off. Number-of-seconds API (`autoRefresh: 30`); object form
  (`{interval, indicator}`) only if the indicator is included — build phase
  decides, keep minimal.
- Use the collection's own dedup/cancel machinery (`Collection.fetch()`
  already dedups identical in-flight requests) — no extra guard needed.
- Epic wave 1 — lifecycle-only surface, disjoint from toolbar/body work.
- No mockup needed (no meaningful UI beyond optional indicator dot).

## Resolution
- closed: YYYY-MM-DD
- branch:
- files changed:
- tests added:
