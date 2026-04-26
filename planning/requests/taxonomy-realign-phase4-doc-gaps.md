# Taxonomy realignment — Phase 4 (doc-less extensions + utility docs)

| Field | Value |
|-------|-------|
| Type | request |
| Status | open |
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
