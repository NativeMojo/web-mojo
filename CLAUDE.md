# WEB-MOJO

This file is loaded automatically by Claude Code.

## Project

A browser-side JavaScript framework/library with core runtime classes (`src/core/`), optional extensions (`src/extensions/`), Mustache templates, and Bootstrap 5.3 styling. Published to npm as `web-mojo`.

## How to Work Here

- **Rules** are in `.claude/rules/` and load automatically. Follow them.
- **Skills** are in `.claude/skills/` — invoked with `/<name>` (e.g., `/bug`, `/request`, `/plan`, `/build`, `/memory`).
- **Agents** are in `.claude/agents/` — spawned automatically by the `/build` skill.
- See `AI_DEV.md` for the full developer workflow.
- Start with `docs/web-mojo/README.md` for framework docs, then read the exact topic docs you need.
- Read `docs/agent/architecture.md` for the repo layout and source map.

## Planning

Active work is tracked as files in `planning/`:
- `planning/issues/` — open bugs
- `planning/requests/` — open feature requests
- `planning/done/` — resolved items
- `planning/future/` — deferred ideas
- `planning/rejected/` — declined items

## Trust Order

When docs and code conflict:
1. `docs/web-mojo/` (authoritative framework docs)
2. Existing code patterns in the target area
3. `CHANGELOG.md` for behavioral intent
