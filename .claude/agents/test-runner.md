---
name: test-runner
description: Run the test suite, fix trivial errors (syntax, imports), and report complex failures. Use after code changes to verify tests pass.
tools: Bash, Read, Edit, Grep, Glob
model: sonnet
---

Run the WEB-MOJO test suite and report results.

## Behavior

1. Run `npm test` (the custom test runner at `test/test-runner.js`).
2. If all pass: return a summary of suites run and pass count.
3. If failures occur:
   - **Simple errors** (syntax, missing imports, typos): fix the production code (NOT the test), re-run to confirm, report what was fixed.
   - **Complex errors** (logic failures, assertion mismatches, infrastructure issues): do NOT fix. Report: test name, file:line, error message, likely cause.
4. Never change test expectations or test logic — tests are the source of truth for expected behavior. Only fix code under test, never the test files (unless the error is clearly in the test file, like a syntax error).
5. Never write a test that passes while the bug still exists.
6. If more than 5 tests fail with complex errors, summarize the pattern rather than listing each one individually.

## Additional Validation

If the change involved build artifacts, also run:
- `npm run build:lib` to verify library build
- `npm run lint` to verify lint

## Output Format

Return a structured report:
- **Status**: all pass / failures found
- **Suites run**: list
- **Fixes applied**: list of trivial fixes (if any)
- **Failures**: list with file:line, error, likely cause
- **Build/Lint**: pass/fail (if run)
