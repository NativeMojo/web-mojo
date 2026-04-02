---
globs: ["test/**/*.js", "test/**/*.html"]
---

# Testing Rules

## Test Framework
- This repo uses a custom test runner: `node test/test-runner.js`.
- Do not assume standard Jest CLI flow even though many tests use Jest-style globals.
- Test suites live in `test/unit/`, `test/integration/`, and `test/build/`.

## Running Tests
- `npm test` — full custom test runner
- `npm run test:unit` — unit suite
- `npm run test:integration` — integration suite
- `npm run test:build` — build suite
- `npm run lint` — ESLint
- Pick the narrowest command that proves the change.

## Test Conventions
- For bug fixes, add a regression test when practical. The regression must fail before the fix and pass after.
- Never write a test that passes while the bug still exists.
- Never "fix" a test to hide a bug — fix the production code.
- Keep regression tests narrow and easy to understand.
- If the bug is not testable with current harnesses, say so explicitly.

## Chrome UI Testing
- When Chrome MCP tools are available, use `find` + `computer left_click` for real mouse interaction.
- **Never use `.click()` via `javascript_tool`** on `<a>` tags or `data-action` elements — it bypasses the event pipeline and causes spurious 404s.
- Use `javascript_tool` only for DOM assertions (reading state, checking for errors, verifying text content).
- Call `tabs_context_mcp` once at the start to get a valid tab ID.

## When to Add Tests
- Behavior changes in a reusable framework primitive
- A regression is being prevented
- The request explicitly asks for test coverage
