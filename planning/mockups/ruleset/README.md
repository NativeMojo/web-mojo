# RuleSet detail view — static mockup

Self-contained visual prototype for the RuleSet redesign request
(`planning/requests/ruleset-view-redesign.md`). Open `index.html` in any
browser — no build step, no backend, no framework. All data is fake, modeled
on the example payload in the request (RuleSet #74, "User Permission Denied
— Bundle by IP").

## What this is for

Communicate **layout, hierarchy, and where each piece of the schema lives**
before we start writing framework code. The biggest visual decisions:

1. **Header card** — turns the current plain `<h3>` into the operator's
   "what is this rule" answer: name, `metadata.reasoning` as subtitle,
   active switch, category + priority chips, `assistant_proposed` indicator.
2. **Left nav rail** (`SideNavView` shape) — replaces the 2-tab `TabView`.
   Sections in the order an operator actually uses them.
3. **Triggering section** — the cramped Thresholds row from the current
   form becomes a left-to-right flow: Match → Bundle → Threshold → Re-trigger.
   Each step renders empty / null values as friendly text instead of `—`.
4. **Handler chain** — parses the `handler` URI string into a row of cards
   with the `HANDLER_TYPES` icon + label from the existing `HandlerBuilderView`.
5. **Agent Prompt** — the new `metadata.agent_prompt` field gets first-class
   real estate (this is the headline missing feature).
6. **Incidents** — table of incidents this RuleSet has fired against,
   answering "is this rule actually doing what I think it is".
7. **Metadata** — known keys structured + raw JSON dump, mirroring the
   `IncidentView` metadata pattern so every key on the object is visible.

## Section ↔ request mapping

| # | Section in mock | Request criterion | Component in real build |
|---|---|---|---|
| 1 | Header card | Header acceptance criterion | inline `<div>` above `SideNavView` |
| 2 | Overview | "Overview section shows…" | `RuleSetOverviewSection` (new) |
| 3 | Conditions | "Rules section preserves…" | `TableView` over `RuleList` |
| 4 | Triggering | "Triggering section presents…" | `TriggeringSection` (new) |
| 5 | Handler | "Handler section parses…" | `HandlerChainSection` (new), reuses `HandlerBuilderView` types |
| 6 | Agent Prompt | "Agent Prompt section…" | `AgentPromptSection` (new) |
| 7 | Incidents | "Incidents section…" | `RuleSetIncidentsSection` (new), `IncidentList` filtered by `rule_set` |
| 8 | Metadata | "Metadata section shows the full…" | structured `DataView` + raw JSON, mirrors `IncidentView._buildMetadataSection` |

## Drill-down map (what each click would do in the real build)

| Click | Real-build behavior |
|---|---|
| Active switch | `model.save({ is_active: !is_active })` |
| Header context menu | `Modal.modelForm`/`Modal.confirm` for edit / disable / delete |
| Triggering "Edit" pencil | `Modal.modelForm` with `RuleSetForms.edit` pinned to the relevant tab |
| Conditions table row | `Modal.modelForm` with `RuleForms.edit` |
| Conditions "Add Rule" | `Modal.modelForm` with `RuleForms.create`, pre-filled `parent: ruleset.id` |
| Handler "Edit chain" | existing `HandlerBuilderView` modal flow (already wired in `RuleSetView.onActionEditHandler`) |
| Agent Prompt "Save" | `model.save({ 'metadata.agent_prompt': value })` (verify dotted-path save semantics during build) |
| Incidents row | mounts existing `IncidentView` in a Modal |

## Light vs dark

Toggle in the header (sun/moon icon). Both themes must read at sign-off —
this is a hard requirement in `.claude/rules/theming.md`. The mock uses
its own tokens (not Bootstrap) but mirrors the real palette so the
contrast story is honest.

## What is real vs stubbed

| Real | Stubbed |
|---|---|
| Layout, spacing, color, typography, density | All numbers, incident counts, agent prompt copy |
| Section switching (rail click) | "Save" / "Edit" buttons (no-op) |
| Light/dark toggle | No backend, no validation, no form submission |
| Handler chain parsing visual | Only shows the example chain; doesn't dynamically re-parse |
| `assistant_proposed` indicator | Synthetic data |

## Open questions still to resolve before build

Same four from the request:

1. Agent prompt format — plain textarea is shown; should there be a
   "load template" affordance? (Defer to v2.)
2. Show Agent Prompt section always, or only when `llm://` is in the
   handler chain? (Mock shows it always with a contextual hint.)
3. Inline-edit vs modal-edit for Triggering — mock shows modal-edit.
4. Confirm `/api/incident/incident?rule_set=<id>` is the right query
   param for the Incidents section.

## Files

- `index.html` — markup for header + 7 sections
- `mock.css` — ~500 lines, no Bootstrap CSS (intentional)
- `mock.js` — section switching, theme toggle, no fetches
- `README.md` — this file
