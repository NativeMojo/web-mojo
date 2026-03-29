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
- **REST API — standard CRUD, no admin endpoints** — the permission system (User → Group → Member) handles access control per Model. All API access uses the same CRUD endpoints; admins filter with query params (e.g., `/api/account/api_keys?user=123`). Never create or assume separate admin-scoped endpoints like `/api/user/{id}/resource`.
- **Agent boot path** — `AGENT.md` → `docs/agent/architecture.md` → `memory.md`.
- **Docs source of truth** — local `docs/web-mojo/` is authoritative when inside this repo; never rely on `docs/pending_update/`.
- **Consumer agent file** — `docs/web-mojo/AGENT.md` is a drop-in for downstream projects and is intentionally separate from the internal `AGENT.md`.
- **Contributor guide** — `DEV_GUIDE.md` is contributor-facing and not part of the default agent boot path.
- **Chrome UI testing** — use `find` + `computer left_click` (real mouse clicks) for UI interaction testing. Never use `.click()` via `javascript_tool` — it bypasses the event pipeline and causes 404s on `<a>` tags. Use `javascript_tool` only for DOM assertions. Full protocol in `prompts/testing.md`.

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