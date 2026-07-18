# Build Baseline — Establish Green BEFORE Touching Code

Non-negotiable. Before writing ANY code for a build/fix task, capture a baseline
test run so that every later failure is unambiguously attributable to your change.
This eliminates the wasteful "is this failure mine?" investigation after the fact.

## The rule
1. **Before the first edit**, run the full suite:
   `npm test`
   (the custom runner — `node test/test-runner.js`; unit + integration + build).
   The narrow commands (`npm run test:unit`, …) are for the edit loop, not the
   baseline — the baseline must match what you'll compare against at the end.
2. Record the baseline in the work item (under `## Notes`): total / passed /
   failed from the runner's summary, and the names of any pre-existing failures.
3. **Interpret the baseline:**
   - **All green** → every failure you see after your change is YOURS. Fix all of
     them before closing. No exceptions, no "pre-existing" excuses.
   - **Some red at baseline** → STOP and tell the user the suite is already failing
     before you started. Do not build on a red baseline unless the user explicitly
     says to proceed; if they do, the recorded pre-existing set is the ONLY thing
     you may attribute to "not mine."
4. After implementing, run the full suite again and compare against the baseline.
   The only acceptable end state is: baseline failures (if any the user accepted)
   and nothing new.

## Lint baseline
`npm run lint` (= `eslint src`) has a tracked baseline of **0 errors** (warnings
are known debt — see `memory.md`). New errors are yours; new warnings need a
reason.

## Why
- Attribution must be decided UP FRONT, by evidence, not reconstructed later by
  stashing/guessing. Re-running clean HEAD after the fact to ask "was it me?" is
  exactly the waste this rule removes.
- A green baseline turns "we can never have failing tests" into a checkable
  invariant: green before → green after.

## Notes
- One entity runs tests per build (see the build skill's test-lock invariant) —
  results must be attributable to exactly one set of edits.
- The runner prints a per-suite summary; read that, not scrollback guesses. To
  isolate one file there is no `--grep` — temporarily move the others (see
  `.claude/rules/testing.md`).
