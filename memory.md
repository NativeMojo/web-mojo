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
- **Agent boot path** — `CLAUDE.md` → `memory.md` → `scripts/board.sh`, then `/scope` (triage+intake) or `/build` (implement). Work items live in `planning/{inbox,confirmed,done}/`; ids come from `scripts/intake.sh`.
- **Docs source of truth** — local `docs/web-mojo/` is authoritative when inside this repo; never rely on `docs/pending_update/`.
- **Consumer agent file** — `docs/web-mojo/AGENT.md` is a drop-in for downstream projects and is intentionally separate from the internal `AGENT.md`.
- **Contributor guide** — `DEV_GUIDE.md` is contributor-facing and not part of the default agent boot path.
- **Chrome UI testing** — use `find` + `computer left_click` (real mouse clicks) for UI interaction testing. Never use `.click()` via `javascript_tool` — it bypasses the event pipeline and causes 404s on `<a>` tags. Use `javascript_tool` only for DOM assertions. Full protocol in `prompts/testing.md`.
- **View modules: trailing `export default X;`, not inline** — the test harness's `SimpleModuleLoader` only transforms a trailing `export default Name;` (like `DetailView`/`JobDetailsView`); an inline `export default class X extends View {…}` loads as `undefined`, so unit tests can't `Object.create(Cls.prototype)`. Use the trailing form for any view you want behavioral (non-source-text) tests on. (ITEM-015)
- **`admin` permission semantics** — User-record `admin` is the system-wide full-access wildcard (superuser-equivalent; name-checked in `hasPermission()`, deliberately **not** in `CATEGORY_GRANULAR_MAP`); surfaced as **"System Admin"** leading `User.CATEGORY_PERMISSIONS`. Member-record `admin` (**"Group Admin"**, leads `Member.BASE_PERMISSIONS`) is full access within that group only, never `sys.*`. `manage_group` (**"Manage Group"**) is a literal group-management perm, not an admin grant. Three distinct things: `admin` (system), member `admin` (group), `view_admin` (admin-panel entry). (ITEM-019)
- **`skipRender` model-change option** — `model.set(data, null, { skipRender: true })` / `model.save(data, { skipRender: true })` emit `change` normally but suppress the automatic `View` rerender (options are forwarded to listeners: `emit('change', model, options)`). FormView inline autosave uses it so saving one field doesn't rebuild parent views (was resetting tab state). Any view that hand-rolls its own `model.on('change', …)` rerender listener (e.g. DataView) must check the flag itself. (ITEM-016)

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