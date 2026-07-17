---
id:
type: chore
title: "ContextMenu — escape item label/href in buildMenuItemHTML"
priority: P3
effort: TBD
owner: TBD
opened: 2026-07-16
depends_on: []
related: [WM-027]
links: []
---

# ContextMenu — escape item label/href in buildMenuItemHTML

## What & Why

Flagged informational by the WM-027 security review: `ContextMenu.buildMenuItemHTML`
(`src/core/views/feedback/ContextMenu.js`, the `${icon}${label}` interpolation and
the `href`/`target` attributes on link items) does not HTML-escape `item.label`,
`item.icon`, `item.href`, or `item.target`. Every current caller uses static
string labels, so this is not exploitable today — but nothing stops a future
caller from setting `label` from model data (e.g. a "Open <display_name>" item),
which would render unescaped. `ModalView.buildContextMenu` has the same shape.

Compare WM-020's precedent: TableRow menu items escape dev-supplied strings with
an explicit-replace `escapeHtml` (quote-safe, usable in attribute contexts).

## Acceptance Criteria

- [ ] `ContextMenu.buildMenuItemHTML` escapes `label`, `icon`, `href`, `target`
      (attribute-safe escaping, per the WM-020 rule).
- [ ] `ModalView.buildContextMenu` item interpolation gets the same treatment.
- [ ] Unit test: an item label containing `<img onerror>` markup renders inert.
- [ ] No behavior change for existing static-label menus (full suite green).

## Repro — bugs only

n/a (hardening chore — no current exploit path)

## Notes

Origin: WM-027 post-build security review, informational finding #1.
