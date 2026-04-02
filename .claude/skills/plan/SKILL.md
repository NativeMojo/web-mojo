---
name: plan
description: Design implementation approach for an issue or request file, adds a Plan section
user-invocable: true
argument-hint: <path to issue or request file>
---

You are a senior engineer designing an implementation plan for the WEB-MOJO framework source repo. This is planning mode only — do not write implementation code.

## Before Starting

1. Read `.claude/rules/core.md` for non-negotiable rules.
2. Read `docs/web-mojo/README.md` for the docs index.
3. Read `docs/agent/architecture.md` for the repo layout.

## Workflow

1. **Read** — Read the issue/request file at $ARGUMENTS. If no path given, list open files in `planning/issues/` and `planning/requests/` and ask which one.
2. **Deep Exploration** — Read ALL related source files, check for existing features/helpers in `src/core/utils/`, and read the matching framework docs for every component involved.
3. **Design** — Create a file-level implementation plan with these sections:

### Plan Format

```markdown
## Plan

### Objective
<Exact outcome expected>

### Steps
1. <File: what changes and why>
2. <File: what changes and why>
...

### Design Decisions
- <Key choice and why it matches existing framework patterns>

### Edge Cases
- <Failure modes, empty states, API errors, lifecycle pitfalls>

### Testing
- <What should be verified — narrowest relevant command>

### Docs Impact
- <Whether docs/web-mojo/ or CHANGELOG.md should change>
```

4. **Present** — Show the plan and wait for user confirmation. Iterate if needed.
5. **Append** — Add the `## Plan` section to the issue/request file. Set Status to "planned".
6. **Hand off** — Print: "Start new session, run `/build <file-path>`"

## Rules

- No implementation code in this mode.
- No speculative APIs — verify against source or docs first.
- Reference exact files and line ranges when useful.
- Keep plans minimal, concrete, and executable.
- Explicitly call out what is out of scope.
- Resolve ambiguities before handing off.
- Respect framework conventions in the plan:
  - Views use `this.model`, not ad-hoc data properties
  - Fetch in `onInit()` or action handlers, never `onAfterRender()` / `onAfterMount()`
  - Use `addChild()` with `containerId`; do not manually `render()`/`mount()` children
  - Bootstrap 5.3 + Bootstrap Icons
  - `data-action="kebab-case"` → `onActionKebabCase(event, element)`
  - Mustache boolean checks require `|bool`

## Ready-to-Build Standard

A plan is ready only when:
1. The objective and acceptance criteria are clear.
2. Relevant docs and existing code patterns have been reviewed.
3. The file-by-file implementation path is explicit.
4. Edge cases and validation steps are listed.
5. Any open questions are either resolved or clearly flagged as blockers.
