# WEB-MOJO Working Memory

## Memory Hygiene Rules
- Keep compact and current.
- Cap each section to 5 active bullets max.
- Prefer outcomes and decisions over narrative.
- Move completed items to Archive.

## Current Focus
- (empty)

## Key Decisions
- **Model+View pattern** — the primary record on a view is always `this.model`; JS reads via `this.model.get('field')`; templates read via `{{model.field}}`; child views receive `model: this.model`.
- **Agent boot path** — `AGENT.md` → `docs/agent/architecture.md` → `memory.md`.
- **Docs source of truth** — local `docs/web-mojo/` is authoritative when inside this repo; never rely on `docs/pending_update/`.
- **Consumer agent file** — `docs/web-mojo/AGENT.md` is a drop-in for downstream projects and is intentionally separate from the internal `AGENT.md`.
- **Contributor guide** — `DEV_GUIDE.md` is contributor-facing and not part of the default agent boot path.

## In-Progress Work
- (empty)

## Open Questions
- (empty)

## Archive
- `RunnerDetailsView.js` was refactored from `this.runner` to `this.model` to match framework patterns.
- Agent context restructure completed: `AGENT.md`, `docs/agent/architecture.md`, `memory.md`, `prompts/building.md`, `prompts/planning.md`.
- MultiSelectDropdown + Django lookups filter system shipped.
- Auth, Wiki, Cloud Push Notifications, Metrics permissions, and Firebase support shipped.
- Chart rendering flow and Series Chart refresh button fixed.