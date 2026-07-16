---
id: WM-018
type: chore
title: Write docs/web-mojo/forms/AutoSave.md (dangling link in FormView.md)
priority: P3
effort: XS
owner: core
opened: 2026-06-11
depends_on: []
related: []
links: []
---

# Write docs/web-mojo/forms/AutoSave.md

## What & Why
`docs/web-mojo/forms/FormView.md:221` says "See [AutoSave.md](./AutoSave.md)
for details." under the `autosaveModelField` option, but the file does not
exist — the only dangling doc link in the authoritative `docs/web-mojo/`
tree. Autosave now has subtle documented semantics (300ms batching,
`skipRender` non-disruptive saves from WM-016, error-revert path) that
deserve the dedicated page the link promises.

## Acceptance Criteria
- [ ] `docs/web-mojo/forms/AutoSave.md` exists and accurately documents the
      real flow in `src/core/forms/FormView.js`: field change →
      `handleFieldSave` 300ms batch → `executeBatchSave` →
      `model.save(changes, { skipRender: true })`; per-field saving/saved/
      error status; `revertFields` on failure; explicit submits unaffected.
- [ ] `docs/web-mojo/forms/README.md` index updated to list the new page.
- [ ] No other dangling references remain (grep `AutoSave`).

## Notes
Content sourced from FormView.js (handleFieldChange ~796, handleFieldSave
~904, executeBatchSave ~930, revertFields ~1007) and the WM-016 skipRender
contract documented in Model.md / FormView.md / memory.md.

## Resolution
- closed: 2026-06-11
- branch: main
- files changed: docs/web-mojo/admin/Admin-Dashboard-Page.md,docs/web-mojo/admin/Admin-Model-Page.md,planning/inbox/tableview-row-context-menu-and-permission-gating.md,src/core/views/feedback/ModalView.js
- tests added: n/a (docs only). Verified: AutoSave.md content matches
  FormView.js behavior (300ms batch, status timings 2.5s/6s, revertFields,
  skipRender); grep shows no dangling AutoSave references; indexed in
  forms/README.md and master docs README.
