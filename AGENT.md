# WEB-MOJO — Agent Entry Point

> **`CLAUDE.md` is the single source of truth for agent workflow in this repo.**
> Claude Code auto-loads it every session. This file is a thin pointer kept for
> tools/humans that look for an `AGENT.md`; it intentionally duplicates nothing.

## Start Every Thread Here
1. Read `CLAUDE.md` in full.
2. Read `memory.md`.
3. Pick your mode and invoke its skill:
   - Filing new work → `/maestro-task`
   - Triaging / planning an item → `/maestro-scope`
   - Implementing a planned item  → `/maestro-build`
4. Read the item from the board: `get_board_item(<id>)` via the maestro MCP.
5. Read `docs/web-mojo/README.md`, then the exact topic docs for what you touch.

## Work Item Model
Work lives on the **maestro board**, not in this repo. One kind of work item,
distinguished by a `Kind:` line (`feature | bug | chore`) in its markdown
workspec. Stage is a column value advanced via `update_board_item`:
`inbox → scoped → planned → building → review → done`. Items are referenced by
board id. Board resolution is `.claude/maestro.json` → workspace 17
(NativeMojo), board 11 (Backlog), project 14 (web-mojo). Board 11 is shared
with django-mojo (project 12).

## Source of Truth
| File | Use |
|---|---|
| `CLAUDE.md` | Master agent contract — thread start, rules, done criteria |
| `.claude/maestro.json` | Board resolution (workspace / board / project) |
| `.claude/rules/*.md` | Conventions (core, git, build-baseline, views, api, testing, theming, docs) |
| `.claude/skills/maestro-{task,scope,build}/SKILL.md` | The `/maestro-task`, `/maestro-scope`, `/maestro-build` mode instructions |
| maestro board 11 | Work items — the source of truth for all planned/in-flight work |
| `memory.md` | Active decisions, gotchas, current work |
| `docs/web-mojo/**` | Authoritative framework docs (index: `README.md`) |
| `docs/agent/architecture.md` | Repo layout, source map, extension map |
| `prompts/testing.md` | Chrome UI testing protocol |
| `CHANGELOG.md` | Release-facing behavior changes |
