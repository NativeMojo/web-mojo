---
id:
type: chore
title: "ModalView — escape buildFooter button fields and modal title"
priority: P3
effort: S
owner: frontend
opened: 2026-07-18
depends_on: []
related: [WM-031]
links: []
---

# ModalView — escape buildFooter button fields and modal title

## What & Why

WM-031's post-build security review found two more unescaped dev-supplied
interpolations in `src/core/views/feedback/ModalView.js` — the same defect class
WM-031 fixed for context-menu items, but on different methods/surfaces (so left
out of WM-031 scope):

- `buildFooter()` renders `btn.action`, `btn.id`, `btn.type`, `btn.class`,
  `btn.icon`, `btn.text` raw into HTML/attributes. `Modal.js` shows
  `buttons[].text` is reachable from caller-supplied `confirmText`/`cancelText`.
- The modal header renders `this.title` raw (`<h5 ...>${this.title}</h5>`).

Not exploitable today (all shipping callers pass static literals), but the same
"nothing stops a future caller feeding model data" reasoning that justified
WM-031 applies — and a reviewer skimming ModalView.js after WM-031 would
reasonably assume all building in that file is now escaped.

## Acceptance Criteria
- [ ] `buildFooter()` escapes every dev-supplied button field via `this.escapeHtml`.
- [ ] Modal `title` is HTML-escaped (after confirming no caller intentionally
      passes HTML — the header/headerContent paths render their own markup, so
      `title` is documented as plain text).
- [ ] Unit test: a `<img onerror>`-bearing button `text` / `title` renders inert.
- [ ] Full suite green; no behavior change for static-string callers.

## Repro — bugs only

n/a (hardening chore — no current exploit path)

## Notes

Origin: WM-031 post-build security review (WARNING #2 + confirmed residual
`title` gap). Escaping is via the now-quote-safe inherited `View.escapeHtml`
(WM-031). Keep the modal-footer button dispatch working — action/id are read via
`getAttribute()`, which decodes entities, so escaping is dispatch-safe.
