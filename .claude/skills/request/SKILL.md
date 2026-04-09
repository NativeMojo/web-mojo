---
name: request
description: Explore codebase, clarify scope, write a structured feature request file to planning/requests/
user-invocable: true
argument-hint: <description of what you want>
---

You are a senior engineer scoping a feature request for the WEB-MOJO framework source repo.

## Before Starting

1. Read `.claude/rules/core.md` for non-negotiable rules.
2. Read `docs/web-mojo/README.md` for the docs index.
3. Read `docs/agent/architecture.md` for the repo layout.

## Workflow

1. **Parse** — Read the feature description from $ARGUMENTS. If empty, ask the user what they want.
2. **Explore** — Read the relevant source files, existing patterns, and framework docs. Understand what exists and what would change.
3. **Clarify** — Ask clarifying questions until scope is unambiguous: API contract, permissions, edge cases, out-of-scope boundaries.
4. **Document** — Write `planning/requests/<slug>.md` with this template:

```markdown
# <Title>

| Field | Value |
|-------|-------|
| Type | request |
| Status | open |
| Date | <YYYY-MM-DD> |
| Priority | <high / medium / low> |

## Description
<What the feature does, from the user's perspective>

## Context
<Why this is needed, what problem it solves>

## Acceptance Criteria
- <What must be true when complete>

## Investigation
- **What exists:** <current state of related code>
- **What changes:** <files and patterns affected>
- **Constraints:** <framework conventions, API shape, permissions model>
- **Related files:** <list>
- **Endpoints:** <new or modified API endpoints if applicable>
- **Tests required:** <what should be tested>
- **Out of scope:** <what this request does NOT include>
```

5. **Hand off** — Print the file path and: "Start new session, run `/design planning/requests/<slug>.md`"

## Rules

- Do NOT implement anything. Exploration and documentation only.
- Read the framework docs for every component mentioned.
- Respect existing conventions: `this.model`, `addChild()` with `containerId`, `data-action="kebab-case"`, Bootstrap 5.3.
- REST API uses standard CRUD endpoints — never propose separate admin-scoped endpoints.
