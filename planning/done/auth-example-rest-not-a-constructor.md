# examples/auth: `Rest is not a constructor` — login page never mounts

| Field | Value |
|-------|-------|
| Type | bug |
| Status | resolved |
| Date | 2026-04-27 |
| Severity | high |

## Description

`examples/auth/` is intended to be a standalone login page that is reachable
at `http://localhost:3000/examples/auth/`. As of the current example
rewrite, the page renders nothing — `<div id="app"></div>` stays empty and
the form is never visible.

Root cause: `examples/auth/login.js` does

```js
import { Page, FormView, Rest } from 'web-mojo';
...
const rest = new Rest();
```

at the top of the module. The named export `Rest` from the `web-mojo`
package barrel is **not** the class — it is the singleton **instance**.
`new Rest()` throws

```
TypeError: Rest is not a constructor
    at examples/auth/login.js:27
```

Because the throw happens at module top-level evaluation, `await
page.render()` and `document.getElementById('app').appendChild(page.element)`
at the bottom of the file never run, so nothing is mounted into `#app`.

## Context

Affected files:
- `examples/auth/login.js` — uses `new Rest()` at module scope (line 27).
- `src/index.js:32` — `export { default as Rest } from '@core/Rest.js';`
  re-exports the *default* export of `Rest.js`, which is the singleton
  instance, under the name `Rest`. The class is only exported as a *named*
  export from `src/core/Rest.js` and is not surfaced by the package barrel.

User flow that triggers it: visit `/examples/auth/` in the dev server. The
HTML shell loads, the login form never appears, and the browser console
shows the `Rest is not a constructor` TypeError.

The portal example sidesteps this — it uses `this.getApp().rest`
(`examples/portal/examples/services/Rest/RestExample.js:37,54`) and a
comment there explicitly says: *"Use `this.getApp().rest` — never construct
your own."* But the auth example is standalone and has no `WebApp`, so it
cannot use `getApp().rest` without further restructuring.

`docs/web-mojo/services/Rest.md` (line 47) shows the canonical singleton
import: `import rest from 'web-mojo/Rest';`.

`vite.config.js` does not define a `web-mojo/Rest` alias — only the bare
`web-mojo`, `web-mojo/charts`, `web-mojo/auth`, etc. So the docs-recommended
`web-mojo/Rest` import path is itself unavailable in examples without a
new alias.

## Acceptance Criteria

- Loading `http://localhost:3000/examples/auth/` renders the login form
  (heading, two inputs, Sign in button) with no console errors.
- Submitting valid credentials POSTs `{username, password}` to
  `<API_BASE>/login`, stores `access_token` (and `refresh_token` / `user`
  if present) in `localStorage`, and redirects to `/examples/portal/`.
- Submitting bad credentials shows the inline error in the alert band and
  re-enables the button.
- The fix should not regress any other example or any consumer that
  imports `Rest` from `web-mojo`.

## Investigation

- **Likely root cause:** Mismatch between what `examples/auth/login.js`
  expects (`Rest` as a class) and what the `web-mojo` barrel actually
  exports (the `rest` singleton, re-exported under the name `Rest`). The
  module fails at top-level eval, so the `page.render()` + `appendChild`
  bootstrap never runs and `#app` stays empty.
- **Confidence:** high — reproduced in the dev server. The thrown error
  was captured directly from a fresh dynamic import of `login.js`:
  `TypeError: Rest is not a constructor at .../examples/auth/login.js:27:14`.
  Confirmed `src/core/Rest.js` exports `default rest` (instance, line 882)
  and named `Rest` (class, line 881); confirmed `src/index.js:32` re-exports
  only the default.
- **Code path:**
  - `examples/auth/login.js:1` — `import { Page, FormView, Rest } from 'web-mojo'`
  - `examples/auth/login.js:27` — `const rest = new Rest();` ← throws
  - `examples/auth/login.js:129-131` — never reached, so `#app` stays empty
  - `src/index.js:32` — `export { default as Rest } from '@core/Rest.js';`
  - `src/core/Rest.js:879-882` — `const rest = new Rest(); export { Rest }; export default rest;`
- **Regression test:** not feasible in the current harness. The custom
  test runner (`test/test-runner.js`) loads modules through
  `simple-module-loader.js`, which transforms `@core/...` aliases — it
  does not exercise the package barrel `web-mojo` or the `vite` alias
  layer that the example actually consumes. A pure-Node test would not
  reproduce the failure path. The natural place for coverage is a
  build-suite smoke test that imports the package barrel and asserts
  `typeof Rest === 'function'` (class) or `typeof Rest === 'object'`
  (singleton), depending on which contract we choose. Worth adding
  alongside the fix.
- **Design question for `/design`:** which contract do we want?
  1. Treat `Rest` from `web-mojo` as the **class** (export the class from
     the barrel and add a separate `rest` singleton export). Lowest churn
     for the example; most consistent with capitalized-name = class.
  2. Treat `Rest` from `web-mojo` as the **singleton** (current behavior),
     fix the example to import the singleton, and add a `web-mojo/Rest`
     vite alias so `import rest from 'web-mojo/Rest'` works as documented.
  3. Add a small `createRest()` factory and use it in the example.

  Option 1 best matches the example's intent (a per-example client with its
  own `baseURL`) and matches the testing rule already in
  `.claude/rules/testing.md`: *"`Rest` is exported two ways from
  `src/core/Rest.js`: ... `import { Rest } from '...'` (class, for
  `new Rest()` in tests)"* — the package barrel currently breaks that
  promise.
- **Related files:**
  - `examples/auth/login.js`
  - `examples/auth/README.md`
  - `src/index.js`
  - `src/core/Rest.js`
  - `docs/web-mojo/services/Rest.md`
  - `vite.config.js`
  - `.claude/rules/testing.md` (documents the class-vs-singleton split)

## Plan

### Objective
Make `http://localhost:3000/examples/auth/` render the standalone login page
with no console errors, submit credentials to `<API_BASE>/login`, and redirect
to `/examples/portal/` on success — without changing the public `web-mojo`
barrel API or breaking other examples.

### Root cause recap
- `examples/auth/login.js:1` imports `Rest` from `web-mojo`. The barrel at
  `src/index.js:32` re-exports `Rest.js`'s **default** export — which is the
  *singleton instance*, not the class. So `new Rest()` at line 27 throws
  `TypeError: Rest is not a constructor` during module top-level eval, and
  the bootstrap at the bottom (`page.render()` + `appendChild`) never runs.
  Every other use site in the repo treats `Rest` from the barrel as the
  singleton (e.g. `src/lite/index.js:22`, `src/core/models/index.js:49`); the
  example was the outlier.
- Secondary noise: the page is constructed with no `containerId`, so
  `View.mount()` falls through to the final `else` branch and logs
  `"Container not found for null"` (`src/core/View.js:386–417`). The manual
  `document.getElementById('app').appendChild(page.element)` at the bottom of
  the file makes it work in spite of the error, but the error log is real
  and avoidable.

### Steps

1. **`examples/auth/login.js`** — three surgical edits:
   - **Line 1**: change `import { Page, FormView, Rest } from 'web-mojo';` to
     `import { Page, FormView, Rest as rest } from 'web-mojo';`. Use
     rename-on-import to bind the singleton to a lower-cased local name that
     matches the rest of the codebase (`src/core/Model.js:35`,
     `src/core/Collection.js:49`, every `extensions/admin/**` site).
   - **Lines 27–28**: delete `const rest = new Rest();`. Keep
     `rest.configure({ baseURL: API_BASE });` exactly as it is — the
     singleton accepts `configure()` and the example owns the page's
     lifetime, so reconfiguring the global instance is safe (no other code
     on this page touches `rest`, and the success path navigates away with
     `window.location.href`).
   - **Constructor super-call (around line 35)**: add `containerId: 'app'`
     to the options passed to `super(...)`. With a `containerId` set and no
     parent, `View.getContainer()` resolves
     `document.body.querySelector('#app')` and `mount()` does
     `container.replaceChildren(this.element)`. That removes the
     `"Container not found for null"` console error and lets us drop the
     manual append below.
   - **Bottom of file (lines 129–131)**: simplify to
     ```js
     const page = new LoginPage();
     await page.render();
     ```
     Remove the `document.getElementById('app').appendChild(page.element)`
     — render now mounts via the framework path.

2. **`examples/auth/README.md`** — no functional changes, but add a one-line
   "Files" note that the example uses the shared `rest` singleton (matches
   the docs convention at `docs/web-mojo/services/Rest.md:47`). One sentence;
   do not document anti-patterns.

3. **No changes to** `src/index.js`, `src/core/Rest.js`, `vite.config.js`, or
   `package.json`. The `Rest`-class-vs-singleton question (issue's "Design
   question" Option 1) and the missing `web-mojo/Rest` alias (Option 2's
   variant) are deliberately deferred — see Out of Scope.

### Design Decisions
- **Use the existing barrel singleton, don't add a new alias.** Every
  internal site uses the singleton; rename-on-import is the lowest-risk,
  zero-infrastructure fix and makes the example mirror the dominant
  convention. The documented `import rest from 'web-mojo/Rest'` path
  (`docs/web-mojo/services/Rest.md:47`) is currently broken in both dev
  (`vite.config.js`) and prod (`package.json` exports map) — fixing that is
  a larger consistency project, not part of this bug.
- **Don't change the public barrel contract.** Re-exporting the `Rest` class
  from `src/index.js:32` would silently break any external consumer
  currently relying on `import { Rest } from 'web-mojo'; Rest.GET(...)`
  (singleton-style). That migration belongs in its own PR with a CHANGELOG
  entry.
- **Use `containerId: 'app'`, not `allowAppendToBody: true` or manual
  append.** `containerId` is the documented Page/View pattern
  (`.claude/rules/views.md` § Actions and Containers,
  `docs/web-mojo/core/ViewChildViews.md`). It matches what every other Page
  in the repo does and removes the spurious `console.error`.
- **Keep `event.preventDefault()` in `onActionLogin`.** The button has
  `type="button"` so it isn't strictly needed, but it's harmless and clearer.

### Edge Cases
- **Backend not running on `localhost:9009`.** `rest.POST('/login', …)`
  returns `{ success: false, reason: 'not_reachable', … }`. The existing
  fallback chain
  `body?.message || body?.error || resp?.statusText || 'Invalid credentials…'`
  already handles this — verify the alert renders with a sensible message.
- **Server returns nested envelope (`resp.data.data`).** Already normalized
  via the `body` helper at line 80; leave as-is.
- **Server returns 401 / 403.** `resp.success` will be false; alert renders,
  `busy` resets to false, button re-enables. Verify the spinner clears.
- **`access_token` missing on a 200.** The
  `if (resp.success && body.access_token)` guard fails through to the error
  branch, which surfaces a sensible message instead of redirecting into a
  broken portal session.
- **Re-render lifecycle.** After the first render,
  `this.element.isConnected === true` (mounted into `#app`), so subsequent
  `await this.render()` calls during submission skip remount and just update
  innerHTML. Action delegation rebinds in `bindEvents()` at the end of each
  render — no manual rebind needed.
- **Page already exited / `_wasExited` guard.** Doesn't apply — there is no
  `onExit()` path on a single-page standalone (no router, no app).

### Testing
- **Manual (primary):** `npm run dev`, navigate to
  `http://localhost:3000/examples/auth/`, verify:
  1. Page renders the card, two inputs, and "Sign in" button.
  2. Browser console has no errors (no `TypeError`, no
     `Container not found`).
  3. Click "Sign in" with empty fields → form validation highlights the
     required fields, no network request goes out.
  4. With backend running and valid creds: `localStorage` gets
     `access_token` (and optionally `refresh_token` / `user`), browser
     navigates to `/examples/portal/`.
  5. With backend running and bad creds: red alert appears, button
     re-enables, no navigation.
  6. With backend off: red alert with a `not_reachable` /
     fetch-error-derived message, button re-enables.
- **Automated:** none. The harness can't reach this code path (per
  `.claude/rules/testing.md` and the issue's note — the test runner doesn't
  go through Vite aliases or the barrel). Don't add a build-suite
  Rest-typeof assertion in this PR; that belongs with the broader
  Rest-export-contract decision.
- **Lint:** `npm run lint` (only covers `src/`, but run it anyway since
  `src/` isn't being changed — the lint result should be unchanged from
  baseline).

### Docs Impact
- `docs/web-mojo/`: **no changes.** The fix aligns the example with what the
  docs already say (`docs/web-mojo/services/Rest.md` already shows the
  singleton pattern).
- `CHANGELOG.md`: **no entry needed.** This is a fix to an example, not a
  behavior change in the framework. Add an entry only if we later choose to
  also change the barrel export contract.
- `examples/auth/README.md`: minor — note that the example uses the shared
  `rest` singleton.

### Out of Scope (deliberate)
- Adding a `web-mojo/Rest` alias to `vite.config.js` and a `./Rest` entry
  to `package.json` exports (so the docs-recommended
  `import rest from 'web-mojo/Rest'` actually resolves). Worth doing as a
  separate "docs ↔ tooling consistency" PR.
- Exposing the `Rest` *class* through the package barrel (issue's "Design
  question" Option 1). Public-API change, deserves its own design +
  CHANGELOG entry.
- Refactoring the example to use `createAuthClient()` from
  `src/extensions/auth/index.js`. That's a different (larger) example, not a
  bug fix.
- Cleaning up the unrelated `"Container not found for map"` console errors
  visible from another page in the dev session — different bug.

## Resolution

**Commit:** `9f4d527` — *examples/auth: use rest singleton + containerId, fix Rest is not a constructor*

### What was implemented
Plan executed exactly as specified — three surgical edits to
`examples/auth/login.js` plus a one-sentence README clarification:

1. `import { Page, FormView, Rest } from 'web-mojo'` →
   `import { Page, FormView, Rest as rest } from 'web-mojo'`
   (rename-on-import; `Rest` from the barrel is the singleton instance, not
   the class).
2. Removed `const rest = new Rest();`. Kept
   `rest.configure({ baseURL: API_BASE });`.
3. Added `containerId: 'app'` to the `super(...)` options in the
   `LoginPage` constructor — the framework now mounts into `#app` via
   `View.mount()`, removing the `"Container not found for null"` console
   error.
4. Removed the manual
   `document.getElementById('app').appendChild(page.element)` at the
   bottom; `await page.render()` now does the mount.
5. `examples/auth/README.md` — Files section now notes the example uses the
   shared `rest` singleton.

### Files changed
- `examples/auth/login.js` (4 lines net)
- `examples/auth/README.md` (1 sentence)
- `planning/issues/auth-example-rest-not-a-constructor.md` → moved to
  `planning/done/`

No `src/`, no public-API surfaces, no build/tooling files touched.

### Validation
- **Manual smoke (primary, per plan):** `http://localhost:3000/examples/auth/`
  via the running dev server.
  - Page renders the card, two inputs (`username`, `password`), and "Sign
    in" button — verified via `preview_eval` on the rendered DOM and a
    `preview_screenshot`.
  - No new console errors on this page (the residual
    `"Container not found for map"` lines are stale, from a prior
    SecurityDashboard navigation in the same browser session — explicitly
    out of scope per the plan; a fresh dynamic `import()` of the patched
    module returned `{ ok: true, errors: [] }`).
  - Empty-form submit: 2 inputs flagged invalid, `was-validated` class
    applied, no network request, no alert. ✓
  - Bad-cred submit (backend live): inline alert "Invalid username or
    password" appeared, button re-enabled, `localStorage.access_token`
    not set, no redirect. ✓
- **Lint:** `npm run lint` — pre-existing errors only (16 errors / 55
  warnings, all in `src/`). Baseline unchanged; ESLint scope is
  `src/**/*.js` and the diff doesn't touch `src/`.

### Agent findings

- **security-review:** Diff is clean. No new concerns. The removal of
  `new Rest()` strictly reduces attack surface (no second token-state
  object). No template content, API handling, or auth flow changed.
- **docs-updater:** No doc updates needed.
  `docs/web-mojo/services/Rest.md` already documents the singleton pattern
  the example now uses; `CHANGELOG.md` requires no entry (example-only
  fix, the project's bar is behavioral/API changes).
- **test-runner:** Pre-existing failures only — none caused by this
  commit.
  - Unit: 530/531 passed. The single failure is in
    `test/unit/MetricsChart.test.js:105`
    (`MetricsChart.buildApiParams` returning `undefined` where `["x","y"]`
    expected). Production-code logic bug in MetricsChart, unrelated to
    `examples/auth/`.
  - Integration: 0/3. All three are pre-existing harness/environment
    problems (`@core` alias not resolved in the integration runner;
    missing `src/mojo.js` entry path) — they fail at module load before
    any of our code runs.
  - Build: 2/10. Pre-existing structural/artifact issues (missing
    `dist/index.html`, `app.json`, oversized bundle, missing source
    mappings). All independent of the `examples/` diff.
  Two follow-up bugs worth filing separately: (a) MetricsChart unit-test
  regression, (b) integration & build harnesses broken from environment
  state. Neither blocks closing this issue.

### Follow-ups (not part of this fix)
- Add `web-mojo/Rest` alias in `vite.config.js` and a `./Rest` export in
  `package.json` so the docs-recommended `import rest from 'web-mojo/Rest'`
  path actually resolves in dev and prod.
- Decide whether to expose the `Rest` *class* via the package barrel
  (issue's "Design question" Option 1). Public-API change; deserves its
  own design + CHANGELOG entry.
- File issues for the MetricsChart unit failure and the integration/build
  harness breakage surfaced by test-runner.
