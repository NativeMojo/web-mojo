# Planning Workspace

This folder is the lightweight queue and handoff area for feature work, bug work, and visual references in `web-mojo`.

Use it to keep requests structured, reduce repeated context in AI threads, and preserve decisions after work is complete.

## Folder Layout

### `requests/`
New feature requests and enhancements.

Use this folder when you want to describe:
- a new component or extension
- a UI enhancement
- a refactor with clear acceptance criteria
- a documentation or developer-experience improvement

**Expected contents**
- one Markdown file per request
- concise description
- context and constraints
- acceptance criteria
- references to relevant source files or docs

---

### `issues/`
Bugs, regressions, and broken behavior.

Use this folder when something:
- is failing
- regressed after a change
- behaves differently than expected
- needs reproduction steps and root-cause tracking

**Expected contents**
- one Markdown file per bug
- reproduction steps
- expected vs actual behavior
- affected files/components
- validation notes after the fix

---

### `done/`
Resolved requests and issues.

When work is complete:
1. update the request or issue with resolution notes
2. include files changed and validation performed
3. move it into `done/`

This keeps `requests/` and `issues/` focused on active work only.

---

### `mockups/`
Visual references and interaction sketches.

Use this folder for:
- HTML mockups
- rough UI experiments
- screenshots or notes that support a request
- layout references for planning

**Important:** mockups are reference material, not source of truth.  
The real source of truth is always the implementation in `src/` plus any relevant docs in `docs/web-mojo/`.

---

## Recommended Workflow

1. Create a file in `requests/` or `issues/`
2. Add enough context for planning:
   - goal
   - affected area
   - constraints
   - acceptance criteria
3. Add a mockup in `mockups/` if the task is UI-heavy
4. Plan the work before implementation
5. Implement the change in `src/`
6. Update docs/changelog only if the task requires it
7. Add resolution notes and move the file to `done/`

---

## Writing Guidelines

- Keep one item per file
- Prefer concrete acceptance criteria over long narrative
- Link to real project files when possible
- Keep planning files short and execution-focused
- Capture decisions and outcomes, not chat history
- Do not treat planning files as API documentation

---

## Naming Suggestions

Use clear, searchable filenames such as:

- `requests/runner-details-sysinfo-tabs.md`
- `requests/tableview-column-formatter-cleanup.md`
- `issues/dialog-loading-overlay-stuck.md`
- `issues/page-onenter-cache-regression.md`

Kebab-case filenames are preferred.

---

## What Belongs Elsewhere

- Framework source code → `src/`
- Published or reference docs → `docs/web-mojo/`
- Agent operating rules → `AGENT.md`
- Current running context / decisions → `memory.md`

This folder is for planning, triage, and handoff only.