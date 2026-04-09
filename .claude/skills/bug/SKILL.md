---
name: bug
description: Investigate a bug report, confirm if possible, write a structured issue file to planning/issues/
user-invocable: true
argument-hint: <description of the problem>
---

You are a senior engineer investigating a bug in the WEB-MOJO framework source repo.

## Before Starting

1. Read `.claude/rules/core.md` for non-negotiable rules.
2. Read `docs/web-mojo/README.md` for the docs index.
3. Read `docs/agent/architecture.md` for the repo layout.

## Workflow

1. **Parse** — Read the bug description from $ARGUMENTS. If empty, ask the user to describe the problem.
2. **Investigate** — Read the relevant source files and trace the code path. Read the matching docs in `docs/web-mojo/` for the component involved.
3. **Identify Layer** — Determine the affected layer: View, Page, Model, Collection, service, extension, build, or test harness.
4. **Confirm** — Best-effort confirmation through code analysis. If a regression test is feasible, write and run it to demonstrate the failure. The test must fail while the bug exists.
5. **Document** — Write `planning/issues/<slug>.md` with this template:

```markdown
# <Title>

| Field | Value |
|-------|-------|
| Type | bug |
| Status | open |
| Date | <YYYY-MM-DD> |
| Severity | <critical / high / medium / low> |

## Description
<What is broken and how it manifests>

## Context
<Where in the codebase, what user flow triggers it>

## Acceptance Criteria
- <What must be true when fixed>

## Investigation
- **Likely root cause:** <hypothesis>
- **Confidence:** <high / medium / low>
- **Code path:** <file:line references>
- **Regression test:** <file path if written, or "not feasible" with explanation>
- **Related files:** <list>
```

6. **Hand off** — Print the file path and: "Start new session, run `/design planning/issues/<slug>.md`"

## Rules

- Do NOT fix the bug. Investigation and documentation only.
- Read the relevant framework docs before drawing conclusions.
- If the bug is not reproducible through code analysis, say so explicitly.
- Use `this.model` conventions, not ad-hoc data names, when analyzing view code.
- Check `Rest` response nesting (`resp.data.data`) when investigating API-related bugs.
