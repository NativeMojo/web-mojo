# WEB-MOJO — Agent Entry Point

> **`CLAUDE.md` is the single source of truth for agent workflow in this repo.**
> Claude Code auto-loads it every session. This file is a thin pointer kept for
> tools/humans that look for an `AGENT.md`; it intentionally duplicates nothing.

## Start Every Thread Here
1. Read `CLAUDE.md` in full.
2. Read `memory.md`.
3. Run `scripts/board.sh` — the planning pipeline at a glance.
4. Pick your mode and invoke its skill:
   - Triaging / planning an item → `/scope`
   - Implementing a scoped item  → `/build`
5. Read the item: new/unscoped → `planning/inbox/`; scoped/active → `planning/confirmed/`.
6. Read `docs/web-mojo/README.md`, then the exact topic docs for what you touch.

## Work Item Model
One kind of work item, distinguished by `type` (`feature | bug | chore`). The
folder is the stage — `inbox/ → confirmed/ → done/` — advanced only by the
scripts. IDs (`ITEM-###`) come only from `/scope` via `scripts/intake.sh`.
See `planning/README.md`.

## Source of Truth
| File | Use |
|---|---|
| `CLAUDE.md` | Master agent contract — thread start, rules, done criteria |
| `.claude/rules/*.md` | Layer conventions (views, api, testing, theming, docs, core) |
| `.claude/skills/{scope,build}/SKILL.md` | The `/scope` and `/build` mode instructions |
| `scripts/{intake,board,ready,close}.sh` | Planning pipeline helpers |
| `planning/` | Work items (`inbox/ → confirmed/ → done/`, plus `future/`, `rejected/`) |
| `memory.md` | Active decisions, gotchas, current work |
| `docs/web-mojo/**` | Authoritative framework docs (index: `README.md`) |
| `docs/agent/architecture.md` | Repo layout, source map, extension map |
| `prompts/testing.md` | Chrome UI testing protocol |
| `CHANGELOG.md` | Release-facing behavior changes |
