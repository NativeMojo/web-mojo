---
id: WM-038
type: chore
title: "EPIC: ListView/TableView UX power pass — orchestrate WM-032..WM-037"
priority: P2
effort: XL
owner: core
opened: 2026-07-18
depends_on: []
related: [WM-032, WM-033, WM-034, WM-035, WM-036, WM-037]
links: []
---

# EPIC: ListView/TableView UX power pass — orchestrate WM-032..WM-037

## What & Why
Coordinating item for a single orchestrated build session that ships six
opt-in ListView/TableView features. Children (each closes independently):

| Item | Feature | Wave |
|---|---|---|
| WM-032 | Filter presets (`filterPresets:`) | 1 |
| WM-033 | Feedback states (empty states / skeletons / result count) | 1 |
| WM-034 | Auto-refresh (`autoRefresh:`) | 1 |
| WM-036 | Expandable detail rows (`rowExpand:`) | 1 |
| WM-035 | View persistence (`persistState:`) + column chooser | 2 (sequential) |
| WM-037 | Stat strip (`stats:`) | 3 — **trails; blocked on django-mojo dep** |

This epic is done when waves 1–2 children are closed; WM-037 trails on its
backend dependency and does not block epic closure.

## Acceptance Criteria
- [ ] Phase 0 complete: light+dark mockups produced for every UI-bearing
      child (WM-032 chips, WM-033 empty/skeleton, WM-035 chooser, WM-036
      expanded row, WM-037 strip) and approved by Ian before any feature code.
- [ ] Wave 1 built (4 parallel sub-agents), integrated, full unit suite green.
- [ ] Wave 2 built (persistence → chooser, sequential), suite green.
- [ ] Every feature strictly opt-in: with no new options passed, rendering
      and behavior are unchanged — locked by "omitted → undefined/no-op"
      tests per feature + TablePage forwarding tests.
- [ ] Cross-feature interaction checks: presets × persistence restore,
      auto-refresh × selection pause, empty-state × preset zero-results,
      chooser × responsive columns.
- [ ] Docs updated per child; single coherent CHANGELOG block for the release.
- [ ] Both themes eyeballed per `.claude/rules/theming.md` before close.
- [ ] Children closed via `scripts/close.sh` individually; epic closes last
      (except trailing WM-037).

## Notes
Orchestration plan (agreed with Ian 2026-07-18):

- **Session model mix**: Fable orchestrates (main loop) — wave integration,
  ListView.js merge resolution, cross-feature review. **Opus sub-agents as
  feature coders** (`model: 'opus'` per spawn); Opus/Sonnet for mockups and
  docs; test-runner passes at low effort.
- **File-contention rule**: ListView.js toolbar + constructor option block and
  the TablePage forwarding whitelist are the shared hot spots. Wave-1 children
  were chosen for disjoint surfaces (body render / lifecycle / TableRow /
  toolbar). Constructor-option and whitelist additions are append-only; the
  orchestrator integrates them. Wave 2 is sequential because both halves
  touch the toolbar and share the storage layer.
- **Gates**: Ian approves phase-0 mockups (batch review); suite must be green
  between waves; commit per feature (with permission) — no mega-diff.
- **Git**: work on current branch; commits only with Ian's explicit go.
- **WM-037**: mockup in phase 0, code trails until the django-mojo
  aggregation item (`table-stats-aggregation` in that repo's inbox) is done.
- Dropped from the epic by decision: saved views (user-defined presets) and
  WebSocket live rows — revisit on demand.
- **Phase 0 mockups delivered 2026-07-18** (repo convention:
  `planning/mockups/{component}/`):
  - `planning/mockups/filter-presets/wm-032-filter-presets.html`
  - `planning/mockups/feedback-states/wm-033-feedback-states.html`
  - `planning/mockups/column-chooser/wm-035-column-chooser.html`
  - `planning/mockups/row-expand/wm-036-row-expand.html`
  - `planning/mockups/stat-strip/wm-037-stat-strip.html`
  Each: self-contained HTML, light/dark toggle, mission-control dark palette,
  token-based CSS written as the implementation would ship it. Awaiting Ian's
  batch approval — the wave-1 gate.

## Resolution
- closed: YYYY-MM-DD
- branch:
- files changed:
- tests added:
