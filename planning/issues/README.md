# Issues Queue

Use this folder for active bugs and regressions in the `web-mojo` framework source repo.

Each file should describe **one bug** at a time so it can be triaged, fixed, validated, and moved out cleanly.

## What Belongs Here

Use `planning/issues/` for problems such as:

- broken framework behavior in `src/`
- regressions introduced by refactors or releases
- lifecycle bugs in `View`, `Page`, `Model`, or `Collection`
- extension bugs in `src/extensions/`
- packaging, build, or export regressions
- test harness regressions when framework behavior can no longer be validated correctly

## What Does Not Belong Here

Put these elsewhere:

- new features or enhancements → `../requests/`
- resolved issues → `../done/`
- visual references or rough UI ideas → `../mockups/`
- long-form documentation changes with no bug attached → `docs/web-mojo/`

## One Issue Per File

Keep one bug per file.

Use clear kebab-case filenames, for example:

- `dialog-loading-overlay-stuck.md`
- `page-onenter-cache-regression.md`
- `tableview-filter-pill-leak.md`

## Required Issue Contents

Start from `_template.md` and keep the file concise.

Each issue should include:

- a clear title
- current status
- date opened
- short description of what is broken
- context and why it matters
- reproduction steps when available
- expected vs actual behavior
- acceptance criteria
- relevant source files, docs, or tests
- a completed resolution section when fixed

## Expected Workflow

1. Create a new issue from `_template.md`
2. Keep status as `open` or `in-progress`
3. Reproduce the bug before changing code
4. Add regression coverage when practical
5. Implement the smallest correct fix
6. Validate the fix
7. Fill in the resolution section
8. Move the resolved file to `../done/`

## Related Project Rules

When working an issue:

- read `AGENT.md` first
- follow `prompts/bug_fixer.md`
- read the relevant docs in `docs/web-mojo/` before changing framework behavior
- update `memory.md` if the fix reveals a reusable gotcha or non-obvious rule
- update `CHANGELOG.md` only if the fix changes public behavior

## Writing Guidelines

- prefer facts over narrative
- link to real files in `src/`, `test/`, or `docs/`
- keep the issue narrow and testable
- describe the bug in terms of observable behavior
- avoid mixing feature requests into bug files

This folder should stay focused on **active, unresolved bugs only**.