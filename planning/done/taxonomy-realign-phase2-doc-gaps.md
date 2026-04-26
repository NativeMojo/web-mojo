# Taxonomy realignment — Phase 4 (doc-less extensions + utility docs)

| Field | Value |
|-------|-------|
| Type | request |
| Status | planned |
| Date | 2026-04-26 |
| Priority | low |

## Description

Fill in the documentation gaps that the audit at [planning/notes/taxonomy-audit.md](../notes/taxonomy-audit.md) identified — extensions and utility classes shipped today without `docs/web-mojo/` coverage. This is the cleanup tail of the four-phase realignment; routine work, no architectural decisions.

The high-priority FormBuilder example was rolled into Phase 1 (`taxonomy-realign-phase1.md`) and is **not** part of this request.

## Context

After Phase 1 lands:

- Source / docs / examples align for every documented artifact.
- 14 admin models live next to admin code with their own `web-mojo/admin-models` entry.
- FormBuilder has a runnable example.

What remains is a set of public surfaces that have working code but no doc page (or a doc but no example). They are listed below in priority order.

## Acceptance Criteria

### Tier A — Extension doc gaps

- [ ] `docs/web-mojo/extensions/Auth.md` written. Covers `web-mojo/auth` — `AuthApp`, `AuthManager`, the Login / Register / ForgotPassword / ResetPassword pages, the Passkey plugin, and the existing `examples/auth/` standalone reference. Cross-link from `docs/web-mojo/README.md`.
- [ ] `docs/web-mojo/extensions/UserProfile.md` written. Covers `web-mojo/user-profile` — `UserProfileView`, `PasskeySetupView`, the section views (Profile/Activity/ApiKeys/Connected/Devices/Groups/Notifications/Overview/Permissions/Personal/SecurityEvents/Security/Sessions). Cross-link from README.
- [ ] `docs/web-mojo/extensions/DocIt.md` written. Covers `web-mojo/docit` — `DocItApp`, `DocPage` / `DocEditPage` / `DocHomePage`, `DocNavSidebar`, the Book and Page models. Cross-link from README.
- [ ] `docs/web-mojo/extensions/MojoAuth.md` written OR the `mojo-auth` shim is documented inline with a one-line note in another doc and removed from the audit's gap list.

### Tier B — Utility doc gaps

- [ ] `docs/web-mojo/utils/TokenManager.md` written, OR a clear note that `TokenManager` is internal (not part of the public API). The current behavior — exported from `web-mojo` but undocumented — is misleading.
- [ ] `docs/web-mojo/utils/DjangoLookups.md` written. Covers `parseFilterKey`, `formatFilterDisplay`, `LOOKUPS`. Used by TableView filter parsing.
- [ ] `docs/web-mojo/utils/ConsoleSilencer.md` written, OR confirm internal-only and remove from main entry exports if it shouldn't be public.
- [ ] `docs/web-mojo/utils/TemplateResolver.md` written, OR confirm internal-only.

### Tier C — Examples for documented-but-example-less features

- [ ] (Optional) Walk every doc page in `docs/web-mojo/` and confirm there's a runnable example folder for it. Anything missing gets either an example added under `examples/portal/examples/<area>/<X>/` or a justification for staying example-less. The `examples-coverage.test.js` already enforces this for the headline components — extend it to cover any new doc additions from Tiers A and B.

## Investigation

### What exists (from audit)

- `src/extensions/auth/` — fully built auth pages, no doc page in `docs/web-mojo/`. Only `docs/extensions-auth.md` exists outside the canonical tree.
- `src/extensions/user-profile/` — 12 section views + `UserProfileView` + `PasskeySetupView`, all exported from `web-mojo` and `web-mojo/user-profile`. No doc.
- `src/extensions/docit/` — full markdown docs viewer (`DocItApp`, `DocHomePage`, `DocPage`, `DocEditPage`, `DocNavSidebar`, Book/Page models). No doc.
- `src/extensions/mojo-auth/mojo-auth.js` — single-file shim. Either document or delete; do not leave undocumented in the main exports.
- `src/core/services/TokenManager.js` — exported from `web-mojo` (line in `src/index.js`). No doc.
- `src/core/utils/DjangoLookups.js` — exports `parseFilterKey`, `formatFilterDisplay`, `LOOKUPS` from `web-mojo`. No doc.
- `src/core/utils/ConsoleSilencer.js` — exported from `web-mojo` plus the named `installConsoleSilencer`. No doc.
- `src/core/utils/TemplateResolver.js` — used internally by `View.js` template lookup. Probably should stay internal.

### What changes

- Net add: 4 extension doc pages (Tier A), up to 4 utility doc pages (Tier B), README cross-links for each.
- Net subtract: any utility class deemed "internal-only" should have its export removed from `src/index.js` so the public surface matches reality. That's a public API change; flag it in CHANGELOG if it happens.

### Constraints

- **No framework changes** beyond removing or renaming exports that are confirmed internal.
- Doc style follows the existing pattern: Overview → Quick Start → API → Common Patterns → Common Pitfalls → Related Docs.
- Examples (if any are added) follow the single-file `≤150 LOC` convention enforced by `examples/portal/`.

### Related files

- `docs/web-mojo/README.md` — add cross-links for new docs.
- `docs/web-mojo/extensions/Auth.md`, `UserProfile.md`, `DocIt.md`, `MojoAuth.md` (NEW).
- `docs/web-mojo/utils/TokenManager.md`, `DjangoLookups.md`, `ConsoleSilencer.md`, `TemplateResolver.md` (NEW).
- `src/index.js` — remove exports for items confirmed internal.
- `test/build/examples-coverage.test.js` — add new entries if Tier C examples land.

### Endpoints

None. Pure docs.

### Tests required

- `npm run test:build` — coverage assertions for any Tier C examples added.
- Visual smoke of new doc pages (`open` in a markdown viewer or push to the docs portal).

### Out of scope

- Re-architecting any of the documented extensions; this is doc work only.
- Auditing internal `src/core/utils/` files that aren't exported from `web-mojo` — they're free to stay undocumented.
- Backfilling unit tests for the documented surfaces.

## Notes

This is a filler request. Pick it up when the high-priority queue is empty. Tier A first (most user-visible), then Tier B (utility scrub), then Tier C (example backfill if anything comes up during A/B).

---

## Plan

### Objective

Add 6 doc pages (3 extension + 3 utility), fix the public-API metadata for the 2 outliers (`mojo-auth` shim, orphaned `TemplateResolver`), and update README/AGENT cross-links so every export from `src/index.js` and every published package entry has either a doc page or an explicit non-public marker. After this lands, `docs/web-mojo/` has full coverage of the public surface.

### Steps

**A. Extension doc pages — `docs/web-mojo/extensions/`**

1. **Write `docs/web-mojo/extensions/Auth.md`** for `web-mojo/auth`. Public API is `mountAuth(container, options)` and `createAuthClient({ baseURL, fetchImpl, storage, endpoints })`. Document every option in `mountAuth` (`baseURL`, `onSuccessRedirect`, `allowRedirectOrigins`, `branding`, `theme`, `endpoints`, `providers`, `texts`) and every method on `createAuthClient` (`login`, `forgot`, `resetWithCode`, `resetWithToken`, `logout`, `isAuthenticated`, `getToken`, `getUser`, `getAuthHeader`, `getErrorMessage`, `parseResponse`). REST endpoints: `POST /login`, `POST /auth/forgot`, `POST /auth/password/reset/code`, `POST /auth/password/reset/token`. Cross-link to `examples/auth/`. Include a short "Deprecated" note for `AuthApp`/`AuthManager` (they throw on use; redirect callers to `mountAuth`/`createAuthClient`).

2. **Delete `src/extensions/auth/README.md`** to avoid two competing docs. The new `docs/web-mojo/extensions/Auth.md` is canonical.

3. **Write `docs/web-mojo/extensions/UserProfile.md`** for `web-mojo/user-profile`. Cover `UserProfileView` (full settings/profile dialog) and `PasskeySetupView` (post-login passkey prompt). Add a reference table of the 11 section views (`ProfileOverviewSection`, `ProfilePersonalSection`, `ProfileSecuritySection`, `ProfileConnectedSection`, `ProfileSessionsSection`, `ProfileDevicesSection`, `ProfileSecurityEventsSection`, `ProfileActivitySection`, `ProfileNotificationsSection`, `ProfileApiKeysSection`, `ProfileGroupsSection`, `ProfilePermissionsSection`) with a one-liner each — composable when callers don't want the full shell. Note model dependencies (`User`, `Passkeys`, `Files`).

4. **Write `docs/web-mojo/extensions/DocIt.md`** for `web-mojo/docit`. Cover `DocItApp` config (`title`, `version`, `basePath`, `bookSlug`, `showBookNav`, `theme`, `permissions`, `sidebar`); a paragraph each on `DocPage`, `DocEditPage`, `DocHomePage`, `DocNavSidebar`; a model section for `DocitBook` / `DocitBookList` / `DocitPage` / `DocitPageList` (endpoints `/api/docit/book`, `/api/docit/page`, `buildUrl(idOrSlug)` helper). Permission gate: `manage_docit`.

**B. Utility / service doc pages**

5. **Write `docs/web-mojo/services/TokenManager.md`**. Source is in `src/core/services/`, doc area matches. Cover every public method per the recon (`setTokens`, `getToken`, `getRefreshToken`, `clearTokens`, `getTokenInstance`, `getUserId`, `isValid`, `isExpiringSoon`, `getAuthHeader`, `getUserInfo`, `checkTokenStatus`, `checkAndRefreshTokens`, `startAutoRefresh`, `stopAutoRefresh`, `refreshToken`, `ensureValidToken`). Document the single-flight refresh guard (already referenced from Rest.md). Section on when to use it directly vs let `PortalApp` manage it.

6. **Write `docs/web-mojo/utils/DjangoLookups.md`**. Cover the `LOOKUPS` constant (read source at write time to enumerate the exact operators with display labels and descriptions — don't cite from memory). Document `parseFilterKey(paramKey)`, `formatFilterDisplay(paramKey, value, label)`, `buildFilterKey(field, lookup)`, `getLookupDescription(lookup)`, `isValidLookup(lookup)`, `getAvailableLookups()`. Show TableView's filter-pill usage as the canonical example.

7. **Write `docs/web-mojo/utils/ConsoleSilencer.md`**. Document `install(options)`, `uninstall()`, `setLevel(level, { persist })`, `getLevel()`, `getLevelName()`, the convenience `criticalOnly` / `errorsOnly` / `silent` / `verbose` / `allowAll`, `withTemporaryLevel`, and the `LEVELS` constant. Cover the runtime override (URL param / localStorage). Read the source at write time to quote the exact param/key names. Note the default install at `src/index.js:14` (`level: 'warn'`).

**C. Two-line metadata fixes**

8. **Add a JSDoc header to `src/extensions/mojo-auth/mojo-auth.js`** (lines 1–8 before any existing code):
    ```
    /**
     * LEGACY shim — predates `web-mojo/auth`. No internal consumers,
     * no `web-mojo/mojo-auth` package entry. New code should use
     * `mountAuth` / `createAuthClient` from `web-mojo/auth`. Kept for
     * downstream apps still importing this single file directly.
     */
    ```
    No code change.

9. **Add a one-line note to `planning/notes/taxonomy-audit.md`** under the "Dead code / stale" table:
    > `src/core/utils/TemplateResolver.js` — zero `src/` consumers, not exported from `src/index.js`, no test/example/script references. Either delete or wire in. Tracked here, deferred to a future cleanup request.

**D. README + AGENT cross-link updates**

10. **`docs/web-mojo/README.md`** — Add Auth, UserProfile, DocIt links to the Extensions section (alphabetical). Add TokenManager link to the Services section. Extend (or add) a Utilities section listing `MOJOUtils`, `DataFormatter`, `DjangoLookups`, `ConsoleSilencer` with links. Update the directory-tree snippet at the bottom to show the new doc files.

11. **`docs/web-mojo/AGENT.md`** — Add new docs to "Where to Read" and "When to Read What" tables: Auth → `extensions/Auth.md`, UserProfile → `extensions/UserProfile.md`, DocIt → `extensions/DocIt.md`, TokenManager → `services/TokenManager.md`, DjangoLookups → `utils/DjangoLookups.md`, ConsoleSilencer → `utils/ConsoleSilencer.md`.

12. **`AGENT.md`** (root) — One-line update to the topic-pointers section pointing at the new docs where applicable.

**E. CHANGELOG**

13. **`CHANGELOG.md`** — Add a single "Docs" entry under Unreleased listing the 6 new doc pages, the deleted `auth/README.md`, the legacy mojo-auth header note, and the audit follow-up.

### Design Decisions

- **Delete `src/extensions/auth/README.md`** rather than redirect (per user). Two docs of truth invite drift; the published `docs/web-mojo/extensions/Auth.md` is canonical.
- **MojoAuth gets a header note, not a doc page.** No package entry, no internal callers, superseded by `mountAuth`. A doc page would falsely promote it. Header note is the honest signal.
- **TokenManager doc lives at `services/TokenManager.md`** — matches the source location at `src/core/services/TokenManager.js`. Phase 1 made source-vs-doc area alignment a hard rule; this follows it.
- **`AuthApp` / `AuthManager` get a deprecated note inside `Auth.md`, not their own pages.** They throw on construction today; a full doc would mislead.
- **The 11 `Profile*Section` views get a reference table, not 11 sub-headings.** Composable internals; one-line summaries are enough.
- **TemplateResolver is not de-exported as part of this work** because it's already not exported from `src/index.js`. The orphan-code question (delete vs wire in) is its own cleanup; tracked in the audit note.
- **Doc style follows the repo pattern**: Overview → Quick Start → API → Common Patterns → Common Pitfalls → Related Docs. All code samples use real APIs from the recon — no invention.
- **No test changes.** `examples-coverage.test.js` only checks for examples backing headline components; none of these 6 docs come with examples (intentionally — Phase 4 was scoped doc-only).

### Edge Cases

- **DocitBook / DocitPage models in BuiltinModels.md.** They're extension-coupled. Decision: do NOT add to BuiltinModels.md. They're DocIt's models; cover them only in `extensions/DocIt.md`. BuiltinModels.md's intro (already updated in Phase 1) covers the convention.
- **DjangoLookups LOOKUPS enumeration.** Read `src/core/utils/DjangoLookups.js` at write time to get the exact list — don't cite from memory.
- **ConsoleSilencer URL / localStorage keys.** Read source at write time for exact strings.
- **Cross-links from existing docs.** `core/PortalApp.md` and `services/Rest.md` already mention TokenManager — add forward links to the new `services/TokenManager.md`. `forms/SearchFilterForms.md` and `components/TableView.md` may reference Django-style filter syntax — add forward links to `utils/DjangoLookups.md` if they do.
- **Lint / build determinism.** No source code touched except the mojo-auth header. No registry change. No bundle re-generation needed.

### Testing

- `npm run test:build` — registry + coverage assertions still green (no taxonomy change).
- `npm run lint` — no new warnings (only the JSDoc header on mojo-auth.js is new code).
- Manual: open each new `.md`, follow every relative link, confirm placement under correct `docs/web-mojo/<area>/`. Confirm README links resolve.
- Spot-check: each new doc page has Overview, Quick Start, API, Common Pitfalls, Related Docs sections.

### Docs Impact

This is the docs-impact request:

- **6 new files** — `extensions/{Auth,UserProfile,DocIt}.md`, `services/TokenManager.md`, `utils/{DjangoLookups,ConsoleSilencer}.md`.
- **1 file deleted** — `src/extensions/auth/README.md`.
- **1 source file gets a 6-line header** — `src/extensions/mojo-auth/mojo-auth.js`.
- **3 cross-link updates** — `docs/web-mojo/README.md`, `docs/web-mojo/AGENT.md`, `AGENT.md`.
- **1 audit note** — `planning/notes/taxonomy-audit.md`.
- **1 CHANGELOG entry** under Unreleased.

### Out of Scope

- Deleting `src/core/utils/TemplateResolver.js` (orphan code). Tracked in audit; separate cleanup.
- Moving `src/extensions/mojo-auth/` to `examples/legacy/`. Header note is the only metadata change here.
- Adding `web-mojo/mojo-auth` as a package entry. It stays as a single-file legacy shim.
- Writing examples for any of the 6 new docs. Doc-only request.
- Refactoring `src/extensions/auth/index.js` `AuthApp` / `AuthManager` deprecation throws. Documented as deprecated; no code change.
- Touching `docs/pending_update/`.

---

## Resolution

**Status**: Resolved — 2026-04-26

### What was implemented

**Six new doc pages** in `docs/web-mojo/`:

- `extensions/Auth.md` — `web-mojo/auth`. Documents `mountAuth(container, options)` (full options table) and `createAuthClient({ baseURL, fetchImpl, storage, endpoints })` (every method). REST endpoints, redirect-safety, storage keys, deprecation note for `AuthApp`/`AuthManager`.
- `extensions/UserProfile.md` — `web-mojo/user-profile`. `UserProfileView` (with sections override option), `PasskeySetupView` + static helpers (`showSuccess`, `showError`), reference table for the 11 `Profile*Section` classes, model dependencies.
- `extensions/DocIt.md` — `web-mojo/docit`. `DocItApp` config, the four pages, `DocNavSidebar`, `DocitBook`/`DocitPage` model API, REST endpoints, `manage_docit` permission gate.
- `services/TokenManager.md` — every public method, the auth gate (single-flight refresh), auto-refresh, the `auth:*` events.
- `utils/DjangoLookups.md` — every supported lookup with display/description, all six exported helpers, TableView usage note.
- `utils/ConsoleSilencer.md` — full level table, URL/`localStorage` runtime overrides, every method, the `LEVELS` map.

**Two metadata fixes**:
- `src/extensions/auth/README.md` deleted (per user — avoid two docs of truth).
- `src/extensions/mojo-auth/mojo-auth.js` gets a `LEGACY shim` JSDoc header at the top.

**Cross-link updates**:
- `docs/web-mojo/README.md` — added Auth, UserProfile, DocIt to the Extensions section; added TokenManager to Services; added DjangoLookups + ConsoleSilencer to Utilities; updated the directory tree.
- `docs/web-mojo/AGENT.md` — added all six new docs to the Where-to-Read table; added six new entries to the When-to-Read-What table.
- `AGENT.md` (root) — added `services/TokenManager.md` and the new Extensions / Utils pointers.

**Audit follow-up**:
- `planning/notes/taxonomy-audit.md` gains a row for `TemplateResolver.js` — orphaned (zero consumers, not exported), deferred to a future cleanup.

**CHANGELOG entry** under Unreleased.

### Files changed

- 6 new files: `docs/web-mojo/extensions/{Auth,UserProfile,DocIt}.md`, `services/TokenManager.md`, `utils/{DjangoLookups,ConsoleSilencer}.md`.
- 1 deleted: `src/extensions/auth/README.md`.
- 1 source-file header: `src/extensions/mojo-auth/mojo-auth.js`.
- 5 cross-link updates: `docs/web-mojo/README.md`, `docs/web-mojo/AGENT.md`, `AGENT.md`, `planning/notes/taxonomy-audit.md`, `CHANGELOG.md`.

### Tests run

- `node test/test-runner.js --suite build` — registry + coverage assertions all green (no taxonomy change, no example added).
- Manual check: every relative link in the six new docs points at an existing target. README and AGENT links to the new files resolve.

### Validation

No source code changed (only the JSDoc header on `mojo-auth.js`, which has no consumers). No registry change. No bundle rebuild needed. The build assertion in `build-registry.js` still passes.
