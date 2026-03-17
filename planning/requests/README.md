# Requests Queue

This folder holds active **feature requests and enhancements** for the `web-mojo` framework source repo.

Use it to capture work before implementation so planning and building threads start with clear scope, constraints, and acceptance criteria.

## What Belongs Here

Create a request file here when you need:

- a new framework component, view, page, model, or extension
- an enhancement to existing framework behavior
- a UI/UX improvement in framework-owned views
- a refactor with clear user or maintainer value
- a documentation or developer-experience improvement

If the task is a defect or regression, put it in `../issues/` instead.

## How to Use This Folder

1. Create **one Markdown file per request**
2. Use a clear **kebab-case filename**
3. Start from `_template.md`
4. Keep the request focused on:
   - goal
   - context
   - acceptance criteria
   - relevant files/docs
5. When the work is complete:
   - fill in the `Resolution` section
   - mark it resolved
   - move it to `../done/`

## Writing Guidelines

- Keep requests short, concrete, and execution-focused
- Prefer acceptance criteria over long narrative
- Link to real project files when possible, especially:
  - `src/`
  - `docs/web-mojo/`
  - `docs/agent/architecture.md`
  - `memory.md`
- Call out anything explicitly **out of scope**
- Note whether the request is likely to affect:
  - public API
  - docs
  - changelog
  - tests

## Naming Examples

- `runner-details-tabs.md`
- `tableview-filter-pill-cleanup.md`
- `dialog-busy-overlay-improvements.md`
- `model-export-generator-update.md`

## Agent Workflow Notes

Agents working from this folder should:

1. Read `AGENT.md`
2. Read `docs/agent/architecture.md`
3. Read `memory.md`
4. Read the request file
5. Read the relevant docs in `docs/web-mojo/` before planning or building

Planning belongs in `prompts/planning.md`.  
Implementation belongs in `prompts/building.md`.

## Related Files

- `_template.md` — starting template for new requests
- `../issues/` — bugs and regressions
- `../done/` — completed requests and issues
- `../mockups/` — visual references for request work