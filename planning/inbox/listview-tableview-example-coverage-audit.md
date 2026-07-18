---
id:
type: chore
title: "Audit ListView/TableView capabilities vs examples portal + docs — fill the gaps"
priority: P2
effort: M
owner: core
opened: 2026-07-18
depends_on: []
related: [WM-038]
links: []
---

# Audit ListView/TableView capabilities vs examples portal + docs — fill the gaps

## What & Why
While reviewing the WM-038 epic examples, Ian noticed the examples portal
does not cover everything ListView/TableView can do — e.g. **inline cell
editing** (`column.editable` + `editableOptions`, shipped long ago in
TableRow) has no example at all. If it's not in the examples portal, it's
effectively undiscoverable for consumers (and for the `find-example` skill's
LLM-facing registry).

Do a systematic audit:

1. Enumerate every public option/capability of `ListView`, `TableView`,
   `TableRow`, and `TablePage` from source + docs (constructor options,
   column config keys, toolbar features, events, public methods).
2. Cross-reference against `examples/portal/examples.registry.json` routes
   and against `docs/web-mojo/components/{ListView,TableView}.md` +
   `pages/TablePage.md`.
3. Produce the gap matrix (capability × has-doc × has-example), then fill:
   new example pages per the examples README (single-file rule, `pages:`
   variants, `TOPIC_TAXONOMY`, registry rebuild) and doc sections for
   anything undocumented.

Known gaps to seed the audit (non-exhaustive — the audit must be systematic):
- Inline cell editing (`editable`, `editableOptions`) — no example.
- Batch actions / selection modes — verify example depth.
- `rowStripe`, `groupBy`/`groupByDay`, footer totals, fullscreen, Export,
  `hideActivePillNames`, `dayRangeFilter` object form, context menus with
  `permissions`/`visible` gating, `_item` deep-linking on TablePage.

## Acceptance Criteria
- [ ] Gap matrix committed (in the item's Notes or a short doc) listing every
      capability with doc + example status.
- [ ] Every consumer-facing capability has at least one runnable example
      route (per `examples/portal/README.md` conventions) or a recorded
      won't-example rationale.
- [ ] Docs updated for anything found undocumented.
- [ ] `npm run examples:registry` green; registry/taxonomy/examples.md
      regenerated.
- [ ] Per the new Done Criteria rule, this closes the historical backlog the
      rule doesn't retro-cover.

## Notes
- Filed from the WM-038 epic session (2026-07-18) at Ian's direction.
- The examples rule (CLAUDE.md Done Criteria + rules/core.md) now covers
  FUTURE changes; this item is the retroactive sweep.
- `test:examples` smoke harness is broken independently (CJS script in ESM
  package + playwright chromium not installed) — fix or file separately
  during /scope.

## Resolution
- closed: YYYY-MM-DD
- branch:
- files changed:
- tests added:
