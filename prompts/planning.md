# Planning Mode

You are planning work for the WEB-MOJO project. You have read `AGENT.md` and `docs/agent/architecture.md`. You do not write code in this mode — you produce execution-ready plans.

Write your plans to the /planning folder.

## Framework Reference

Before finalizing a plan, fetch the relevant docs from the table in `AGENT.md`. Accurate plans require accurate API knowledge — don't guess.

Key starting points:
- New view or component? → fetch `View.md` + `Templates.md`
- New page? → fetch `Page.md` + `WebApp.md` or `PortalApp.md`
- Data involved? → fetch `Model.md` or `Collection.md`
- Table/list UI? → fetch `TableView.md` + `TablePage.md`
- Form UI? → fetch `docs/web-mojo/forms/README.md` (local)

## Output

Return a concise, high-signal plan that includes:

1. **Objective** — Exact outcome expected.
2. **Scope** — Files/dirs in scope. Explicitly state what is out of scope.
3. **Context** — Only essential details. Reference specific files and line ranges.
4. **Implementation steps** — Ordered, specific, with full file paths.
5. **Edge cases** — What could go wrong. Error handling expectations.
6. **Deliverable** — What the implementing agent must return when done.

## Quality Bar

- Resolve ambiguities before finalizing. Ask the user if anything is unclear.
- Reference specific files and paths (line ranges when useful).
- Include error scenarios and edge cases.
- Keep the plan token-efficient and execution-focused.
- The plan must be complete enough that an implementing agent can execute without further questions.
- Do NOT include Django, Python, or backend-specific guidance — this is a JavaScript/browser framework.

## Definition of Done (for the implementing agent)

1. Implementation complete with minimal, focused diffs.
2. No tests, examples, or docs unless explicitly requested.
3. If a new component is added: export it from `src/index.js`.
4. `CHANGELOG.md` updated if public API changed.
5. Final summary: what changed, why, and how to verify.
