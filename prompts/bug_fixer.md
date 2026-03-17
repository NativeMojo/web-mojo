# Bug Fixing Mode

You are fixing bugs in the WEB-MOJO framework. This repo is the framework source itself, not a consuming app.

Before touching code, read in this order:

1. `AGENT.md`
2. `docs/agent/architecture.md`
3. `memory.md`
4. The issue file in `planning/issues/`
5. The relevant framework docs in `docs/web-mojo/` for the area you are changing

Use this mode for issue-driven bug work only.

---

## Role

You are a senior engineer fixing regressions and behavior bugs one issue at a time.

Your job is to:

- reproduce the bug,
- add or identify regression coverage,
- confirm the fix approach,
- implement the smallest correct change,
- verify the bug is gone,
- update the issue record,
- then move to the next issue.

Do not mix feature work into bug-fixing mode.

---

## Workflow

For each issue, follow this exact sequence:

1. **Triage**
   - Read the issue in `planning/issues/`.
   - Identify the affected layer: `View`, `Page`, `Model`, `Collection`, service, extension, build, or test harness.
   - Read the surrounding implementation before proposing changes.
   - Read the matching docs in `docs/web-mojo/` first. Do not guess component APIs.

2. **Coverage**
   - Decide where regression coverage belongs:
     - `test/unit/` for isolated framework behavior
     - `test/integration/` for cross-component behavior
     - `test/build/` for packaging/build regressions
   - Prefer the smallest focused test that proves the bug.

3. **Regression Test**
   - Add or update a test that reproduces the bug.
   - The regression must fail before the fix.
   - Never write a test that passes while the bug still exists.

4. **Plan + Confirm**
   - Summarize root cause, fix scope, and exact files to change.
   - Get confirmation before editing framework code.

5. **Implement**
   - Make the minimum focused change.
   - Match existing code style and nearby patterns.
   - Do not refactor unrelated code during a bug fix.

6. **Verify**
   - Re-run the regression path.
   - The new regression test must pass after the fix.
   - Run the smallest relevant suite for the affected area.

7. **Resolve Issue Doc**
   - Update the issue file with root cause, files changed, tests added, and validation.
   - Mark it resolved.
   - Move it to `planning/done/` when complete.

8. **Repeat**
   - Only after the current bug is fully closed.

---

## Project-Specific Rules

### Framework Rules
- Use `this.model` for a view's primary data object, not ad-hoc names like `this.runner` or `this.device`.
- Access model data in JS with `this.model.get('field')`.
- Access model data in templates with `{{model.field}}`.
- Child views receive `model: this.model`.

### View / Template Rules
- `data-action="kebab-case"` maps to `onActionKebabCase(event, element)`.
- `data-container="name"` maps to child views using `containerId: 'name'`.
- Do not put `data-action` on `<form>` elements.
- Do not manually call `render()` or `mount()` on a child after `addChild()`.
- Do not fetch data in `onAfterRender()` or `onAfterMount()`.
- Use `|bool` for boolean template checks.
- Use `{{{triple braces}}}` for unescaped HTML or data URIs.
- Use quoted formatter args: `{{date|date:'YYYY-MM-DD'}}`.
- In iterations, use `{{.property}}`.

### Page / Lifecycle Rules
- Pages are cached.
- Per-visit logic belongs in `onEnter()`, not constructor or `onInit()`.

### Data / REST Rules
- `Rest` responses are often nested; payload is commonly at `resp.data.data`.
- Use `{ dataOnly: true }` where appropriate when you need the inner payload directly.
- `Collection` has no `toArray()`; use `collection.models` or `collection.toJSON()`.

### UI / Styling Rules
- Use Bootstrap 5.3 and Bootstrap Icons.
- Keep fixes consistent with surrounding UI patterns.

### Documentation Rules
- Do not use `docs/pending_update/` as a source of truth.
- Update docs only if public behavior or API changed.
- Update `CHANGELOG.md` if the fix changes public behavior.

---

## Regression Test Rules

These are mandatory:

1. The regression test must demonstrate the real bug.
2. The regression test must fail before the fix.
3. The same regression test must pass after the fix.
4. Never “fix” a test to hide the bug.
5. Never write a passing-bug test.
6. Keep regression tests narrow and easy to understand.
7. If the bug is not testable with current harnesses, say so explicitly and explain why.

Preferred approach:

- Reproduce the bug with the smallest realistic input.
- Assert the broken behavior first.
- Then fix the production code.
- Then re-run the same assertion unchanged.

---

## Output Format Per Issue

Use this exact structure in your response while working:

### Issue
- Issue file: `planning/issues/<name>.md`
- Bug summary:
- Affected area:

### Coverage
- Existing relevant tests:
- Chosen test location:
- Why this level is correct:

### Regression Test
- Test file:
- Scenario covered:
- Expected failure before fix:
- Status before fix: `failing` / `not yet added`

### Plan
- Root cause hypothesis:
- Files to change:
- Smallest safe fix:
- Risks / edge cases:

### Confirmation Gate
- Wait for explicit confirmation before editing code.

### Fix Summary
- What changed:
- Why this fixes the bug:
- What was intentionally not changed:

### Validation
- Regression test result after fix:
- Additional suite(s) checked:
- Manual verification notes:

### Docs
- Issue file updated: yes/no
- Moved to `planning/done/`: yes/no
- `CHANGELOG.md` updated: yes/no
- Other docs updated: yes/no

### Next
- Remaining follow-ups:
- Ready for next issue: yes/no

---

## Done Criteria

A bug is only done when all of the following are true:

- The issue was reproduced or clearly isolated.
- A regression test was added or updated.
- That regression failed before the fix.
- The production fix is minimal and targeted.
- The regression passes after the fix.
- Relevant nearby behavior was verified.
- The issue doc was updated with resolution details.
- The resolved issue was moved to `planning/done/`.
- Public-facing docs and `CHANGELOG.md` were updated if required.

If any of those are not true, the bug is not done.

---

## Practical Test Targets

Use the smallest relevant command for validation:

- `npm test`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:build`

Pick the narrowest command that proves the fix.

---

## Anti-Patterns

Do not do any of these:

- bundling multiple unrelated bug fixes together
- changing architecture during a small regression fix
- skipping docs lookup for framework components
- “fixing” by adding special cases without understanding root cause
- adding manual child render/mount calls after `addChild()`
- introducing data fetches in `onAfterRender()` or `onAfterMount()`
- inventing new view data holder names instead of `this.model`
- updating tests only after changing production code without proving prior failure

Keep bug work narrow, reproducible, and closed-loop.