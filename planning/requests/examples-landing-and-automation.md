# Examples landing page, legacy removal, and automated example smoke tests

| Field | Value |
|-------|-------|
| Type | request |
| Status | planned |
| Date | 2026-05-03 |
| Priority | medium |

## Description

Three coupled cleanups around `examples/`:

1. **Fix the dead `/examples/` URL.** Visiting `http://localhost:3000/examples/` currently returns an empty page because there is no `examples/index.html`. Replace it with a minimal landing page that links to the canonical Portal and the standalone Auth demo.
2. **Delete `examples/legacy/` entirely.** The legacy directory is already frozen and marked "do not port from." Keeping it confuses humans and LLMs that walk the tree. Portal is the single source of truth.
3. **Add automated example testing.** Today the build suite only validates the registry schema and the docs↔examples folder fence. Nothing verifies the examples actually load. Add a static import-symbol check that runs on every test, plus an opt-in headless browser smoke run that boots Vite and visits every registry route.

## Context

- Vite is configured with `server.open: '/examples/'` (and `preview.open: '/examples/'`). With `examples/index.html` missing, the dev experience after `npm run dev` is a blank page.
- The repo-root `index.html` does a meta-refresh to `./examples/`, compounding the dead-end.
- `examples/legacy/README.md` already says: frozen, APIs may have drifted, don't port from. The directory exists only for git-blame continuity, which is preserved by git history regardless of whether the working tree contains the files.
- The existing examples-coverage and examples-registry tests catch missing folders and bad manifests but cannot catch "this example imports a symbol that no longer exists" or "this example throws on mount." Both happen during framework refactors.
- 80 canonical examples already exist under `examples/portal/examples/` (coverage enforced by `test/build/examples-coverage.test.js`).

## Acceptance Criteria

**Landing page**
- [ ] `examples/index.html` exists. Plain static HTML, Bootstrap 5.3 + Bootstrap Icons (CDN), matches the visual style of `examples/portal/index.html`.
- [ ] Links: a primary card/button to `./portal/` ("Examples Portal — canonical demos for every documented component"), and a secondary card/button to `./auth/` ("Auth — standalone login flow demo").
- [ ] No JS, no build step required. Static file Vite can serve as-is.
- [ ] `vite.config.js` `server.open` and `preview.open` continue to point at `/examples/` (no change needed once the index exists).
- [ ] Repo-root `index.html` continues to redirect to `./examples/` (no change).

**Legacy removal**
- [ ] `examples/legacy/` deleted in its entirety (the directory and every file under it).
- [ ] Any reference to `examples/legacy/` in docs, READMEs, scripts, or comments is removed or updated. Notably:
  - `examples/portal/README.md` "What's not here" section currently points at `examples/legacy/portal/`.
  - Any other live reference surfaced by `grep -r "examples/legacy"`.
- [ ] `planning/notes/examples-rewrite-audit.md` (if present) is left in place — it's a historical artifact, not a live pointer.
- [ ] `git log` still resolves blame on legacy files (preserved by git history; no action needed beyond the delete).

**Static import-symbol check (always on)**
- [ ] New test under `test/build/` (suggested name: `examples-imports.test.js`).
- [ ] For every `*Example.js` under `examples/portal/examples/`, parse its `import` statements. For each symbol imported from `'web-mojo'` or `'web-mojo/<subpath>'`, verify the symbol is actually exported by the corresponding source-tree entry point (`src/index.js`, `src/extensions/*/index.js`, etc.).
- [ ] Test fails with a clear message naming the offending file, symbol, and entry point.
- [ ] Runs in the default `npm test` and `npm run test:build` flows. Pure Node, no browser.

**Headless smoke run (opt-in)**
- [ ] New script: `npm run test:examples` (also discoverable via the existing `test:*` family).
- [ ] Implementation: spawn `vite` on an ephemeral port, load `examples/portal/examples.registry.json`, visit each `route` via Playwright (or Puppeteer — pick whichever is already in the tree; if neither, Playwright is the default).
- [ ] For each route: assert the page mounts (the portal shell renders the example's container) and no `console.error` / unhandled rejection fires within a short settle window (~1.5s).
- [ ] Failure output names the failing route, the URL, and the captured error.
- [ ] NOT wired into the default `npm test` — opt-in only, so the daily loop stays fast.
- [ ] Headless dependency added as a `devDependency`. Document the script in `examples/portal/README.md` Run section.

## Investigation

- **What exists:**
  - `examples/index.html` — does not exist; `/examples/` returns empty.
  - `examples/portal/` — active canonical showcase (80 examples, manifest-driven, coverage-fenced).
  - `examples/auth/` — small standalone `FormView`+`Rest` login demo.
  - `examples/legacy/` — frozen; ~13k LOC of old portal + one-off HTML demos.
  - `index.html` (repo root) — meta-refresh to `./examples/`.
  - `vite.config.js` — `server.open: '/examples/'`, `preview.open: '/examples/'`, custom `no-spa-fallback` middleware that 404s missing HTML paths instead of falling through.
  - Test infra: `test/build/examples-coverage.test.js` (docs↔folder fence), `test/build/examples-registry.test.js` (registry schema + idempotency). Neither loads the examples.

- **What changes:**
  - Add `examples/index.html` (new, static).
  - Delete `examples/legacy/` (rm -rf).
  - Update `examples/portal/README.md` to remove the legacy pointer.
  - Add `test/build/examples-imports.test.js` (new).
  - Add `test/build/examples-smoke.test.js` or `scripts/test-examples-smoke.js` (whichever fits the test-runner shape best — see `test/test-runner.js`).
  - Add `package.json` script `test:examples` and a Playwright (or Puppeteer) devDependency.
  - Possibly minor docs updates to `examples/portal/README.md` Run section.

- **Constraints:**
  - Test runner is custom (`node test/test-runner.js`), not vanilla Jest. Build-tier tests follow the CommonJS shape; new tests must too.
  - Static landing page must work without any JS framework — no `web-mojo` runtime, no module imports — so it's robust even if the build is broken.
  - The headless smoke test must boot Vite (because portal modules import `web-mojo` via aliases) and tear it down cleanly even on failure.
  - Default `npm test` must remain fast; the headless run is opt-in.

- **Related files:**
  - `examples/index.html` (new)
  - `examples/portal/README.md`
  - `examples/legacy/` (delete)
  - `vite.config.js` (no change expected)
  - `index.html` (repo root, no change expected)
  - `test/build/examples-coverage.test.js` (reference for shape)
  - `test/build/examples-registry.test.js` (reference for shape)
  - `test/test-runner.js` (matchers; add any missing matcher here, not via workaround)
  - `examples/portal/examples.registry.json` (input to the smoke test)
  - `package.json` (scripts + devDependency)
  - `src/index.js`, `src/extensions/*/index.js` (export sources for the static check)

- **Endpoints:** None. No REST API surface changes.

- **Tests required:**
  - `examples-imports.test.js` (new, default suite)
  - `examples-smoke.test.js` (new, opt-in via `test:examples`)
  - Existing `examples-coverage` and `examples-registry` tests must continue to pass.

- **Out of scope:**
  - No changes to individual portal examples (no rewrites, no new examples).
  - No changes to the registry schema or `build-registry.js`.
  - No changes to the `web-mojo` public API.
  - No port of any code from `examples/legacy/` — it is being deleted, not migrated.
  - No CI workflow changes (the opt-in script can be wired into CI later as a separate request).
  - No changes to `examples/auth/` beyond updating any incidental doc references.

## Plan

### Objective
Replace the dead `/examples/` URL with a clean static landing page, delete `examples/legacy/` entirely (including all live references), and add two layers of automated example testing — a fast static import-symbol check that runs on every test, plus an opt-in headless browser smoke run that loads every portal route.

### Steps

**Phase 1 — Landing page**
1. **Create `examples/index.html`** — static HTML, no JS framework. Bootstrap 5.3 + Bootstrap Icons via the same CDN URLs that `examples/portal/index.html` uses. Two cards: primary → `./portal/` ("Examples Portal — canonical demos for every documented component"), secondary → `./auth/` ("Auth — standalone login flow"). Match portal's `data-bs-theme="corporate"` for visual continuity. Self-contained file — no module imports, no `web-mojo` runtime — so it works even if the framework build is broken.
2. **No vite.config.js change.** `server.open: '/examples/'` and `preview.open: '/examples/'` resolve correctly once `examples/index.html` exists.
3. **Repo-root `index.html` unchanged.** Its meta-refresh to `./examples/` continues to work.

**Phase 2 — Legacy removal**
4. **Delete `examples/legacy/`** with `git rm -r examples/legacy/` (preserves history; tree no longer carries 2.1 MB of frozen code).
5. **Update `examples/portal/README.md:87`** — drop the "What's not here" paragraph that links to `examples/legacy/portal/`. The "single canonical demo" framing already stands without the legacy pointer.
6. **Update `CHANGELOG.md`** — add a new release entry describing landing-page + legacy removal + automation. Do NOT rewrite the historical 2026-04-25 entry that mentions `examples/legacy/` — that's a faithful record of what happened then.
7. **Leave `planning/done/*.md` untouched.** Those are historical artifacts of completed work; rewriting them falsifies the record. References in `planning/done/portal-deep-link-to-admin-pages-404s.md`, `planning/done/taxonomy-realign-phase2-doc-gaps.md`, `planning/done/portal-form-playground-and-collapsible-menus.md`, and `planning/done/examples-rewrite.md` will become broken links to deleted paths — that's correct, the work is done.
8. **Verify with `grep -r "examples/legacy" --include="*.md" --include="*.js" --include="*.json" --include="*.html"`** — only matches in `planning/done/` and `CHANGELOG.md` historical entries should remain.

**Phase 3 — Static import-symbol check (always on)**
9. **Add `test/build/examples-imports.test.js`** — CommonJS, follows the shape of `examples-coverage.test.js` and `examples-registry.test.js`. Logic:
   - Walk `examples/portal/examples/**/*Example.js`.
   - For each file, extract import statements with a small regex (named, default, namespace; `'web-mojo'` and `'web-mojo/<sub>'` only — ignore relative imports, there shouldn't be any per the single-file rule but the test will flag them).
   - For each `'web-mojo'` import, statically resolve the entry point on disk: `'web-mojo'` → `src/index.js`, `'web-mojo/charts'` → `src/extensions/charts/index.js`, etc. Use the alias map already declared in `vite.config.js` as the source of truth — read it once at the top of the test so the resolution stays in sync.
   - Parse exports out of each entry point with regex (`export { X }`, `export default …`, `export * from './foo'` recursing one level for re-exports). This is good enough for the framework's actual export style (verified by `grep "export" src/index.js`) and avoids pulling in a parser dependency.
   - Assert every imported symbol exists in the entry's exports. Failure: `examples/portal/examples/components/Modal/ModalExample.js imports {ModalX} from 'web-mojo' but src/index.js does not export ModalX`.
   - Also flag any non-`web-mojo` import (defensive — single-file rule says no relative imports inside example files).
10. **Test discovery** — the build runner already auto-picks up `test/build/*.test.js`. No package.json change.

**Phase 4 — Headless smoke run (opt-in)**
11. **Add `playwright` (chromium-only) as a `devDependency`.** Playwright over Puppeteer because it has cleaner async APIs and the Chromium binary it manages is a single `npx playwright install chromium` step we can document. Neither is currently in the tree.
12. **Add `test/build/examples-smoke.js`** (note: not `.test.js` — keep it out of the default `test:build` discovery). Standalone Node script:
    - Spawn `vite` programmatically (`vite.createServer({ server: { port: 0 } })`) — Vite is already a devDependency.
    - Wait for the server to be ready, then read `examples/portal/examples.registry.json`.
    - Launch chromium, open one page, iterate routes. For each route: navigate to `http://localhost:<port>/examples/portal/#/<route>` (verify routing style by reading `examples/portal/app.js` first); wait for `networkidle` + a 1.5s settle window; capture `console.error` and `pageerror`; assert the portal shell rendered something into the example container.
    - Aggregate failures and exit non-zero if any. Always tear down chromium and Vite on failure.
13. **Add `package.json` script `test:examples`** → `node test/build/examples-smoke.js`. Also add a one-liner in `examples/portal/README.md` Run section: "`npm run test:examples` — headless smoke test of every registry route (requires `npx playwright install chromium` once)."
14. **Do NOT wire into the default `npm test`.** Daily loop stays fast; CI can opt in later.

### Design Decisions

- **Static landing page, not a redirect.** A redirect leaves the user at `/examples/portal/` with no breadcrumb back to `/examples/auth/`. A 30-line HTML file is no harder to maintain and is more discoverable. It also survives if the framework build is broken — important because the portal depends on the build.
- **Legacy fully deleted, not partially preserved.** The user explicitly chose "kill off legacy, no confusing legacy stuff left in." `git log` preserves history forever; the tree doesn't need to carry 2.1 MB of frozen code. References in `planning/done/` are historical artifacts and stay (they describe what was done at the time, accurately).
- **Static check parses regex, not AST.** The framework's export style is uniform enough (`export { default as X } from '...'`, `export * from '...'`) that regex is reliable. Adds zero dependencies. If it ever stops being reliable, swapping in `@babel/parser` is a one-file change. KISS per `.claude/rules/core.md`.
- **Vite alias map as the single source of truth.** Reading `vite.config.js` for the alias list (or duplicating it in the test) keeps the static check honest when new extension entry points are added. Reading the actual config file is preferred to avoid drift.
- **Playwright over Puppeteer.** No existing browser-automation dep in the tree, so we pick fresh. Playwright's first-party Chromium management and built-in `pageerror`/`console` hooks are cleaner.
- **Smoke test is a script, not a `.test.js`.** The runner auto-discovers `*.test.js`; using a different filename keeps it out of the default suite by construction rather than by convention. Cleaner than guarding inside the test with an env var.
- **Smoke uses programmatic Vite + ephemeral port.** No flake from port collisions, no zombie servers if the script crashes (Vite's `close()` handles cleanup; we add a `finally` to be sure).
- **No CHANGELOG rewrite.** Add a forward-looking entry; never rewrite historical ones.

### Edge Cases

- **Vite's `no-spa-fallback` middleware** (vite.config.js plugin) 404s missing HTML paths. Once `examples/index.html` exists, `/examples/` resolves to it correctly. Verify by hitting the URL after Phase 1.
- **Portal hash routing.** Confirm by reading `examples/portal/app.js` whether routes are `#/<route>` or path-style. Adjust smoke test URL construction accordingly.
- **Backend-dependent examples.** Some portal examples expect `localhost:9009` (per `examples/portal/README.md`). The smoke test must NOT treat backend `fetch` errors as failures — only `pageerror`/uncaught exceptions and "the page didn't mount" as failures. Filter `console.error` to ignore network errors from the documented backend host.
- **Re-exports in `src/index.js`.** Lines like `export * from '@core/models/Files.js'` mean the static check has to recurse into the re-exported file to enumerate symbols. Limit recursion depth to 2 levels — anything deeper is a code smell.
- **Symbols from `'web-mojo/models'`** resolve to `src/core/models/index.js` per the alias. Make sure the alias resolver in the test handles subpaths.
- **Playwright not installed.** First run of `npm run test:examples` will fail with a clear "run `npx playwright install chromium`" message — Playwright's own CLI handles this; we just document it.
- **Empty `/examples/portal/` registry.** Smoke test should fail loudly if `pageCount === 0` rather than silently passing.
- **Console errors from the example itself vs. the portal shell.** Capture both, but tag which page they came from so the failure message is actionable.

### Testing

- After Phase 1: `npm run dev`, visit `http://localhost:3000/examples/` — see landing page; both links work.
- After Phase 2: `grep -r "examples/legacy" --include="*.md" --include="*.js" --include="*.json" --include="*.html"` returns only `planning/done/` and `CHANGELOG.md` historical hits. `npm run dev` still works.
- After Phase 3: `npm run test:build` — passes; the new `examples-imports` describe block reports per-file checks. Manually break one example by importing a fake symbol → test fails with the expected message → revert.
- After Phase 4: `npm run test:examples` — boots Vite, visits all 80 routes, reports pass/fail per route. Manually break one example with a runtime throw → test catches it → revert.
- Full regression: `npm test` (unit + integration + build) stays green and stays fast (no new browser launch in default flow).

### Docs Impact

- **`examples/portal/README.md`** — drop the "What's not here" legacy-pointer paragraph; add a one-liner about `npm run test:examples`.
- **`CHANGELOG.md`** — new entry: landing page added, `examples/legacy/` removed, examples-imports static check + `test:examples` smoke script added.
- **`docs/web-mojo/`** — no changes. No public framework API change.
- **`AI_DEV.md`** — no changes (workflow unaffected).
