---
id:
type: chore
title: "ContextMenu / ModalView — sanitize href scheme on link menu items"
priority: P3
effort: S
owner: frontend
opened: 2026-07-18
depends_on: []
related: [WM-031]
links: []
---

# ContextMenu / ModalView — sanitize href scheme on link menu items

## What & Why

WM-031 HTML-escapes `item.href` on link menu items
(`ContextMenu.buildMenuItemHTML`, `ModalView.buildContextMenu`), which prevents
attribute breakout — but does NOT validate the URL scheme. A
`href: 'javascript:alert(1)'` still renders as a clickable `javascript:` URI.
Escaping and scheme-safety are different concerns; this was explicitly deferred
from WM-031 because a naive scheme filter risks breaking legitimate hrefs.

## Acceptance Criteria
- [ ] Link menu items neutralize dangerous schemes (`javascript:`, `data:`,
      `vbscript:`) — e.g. drop the href or fall back to `#`.
- [ ] Legitimate hrefs still work: `http(s):`, `mailto:`, `tel:`,
      protocol-relative (`//host`), relative (`/x`, `x`), and hash (`#`).
- [ ] Prefer a shared helper (e.g. in `MOJOUtils`) so ContextMenu + ModalView
      apply one identical rule.
- [ ] Unit tests covering allowed + blocked schemes.

## Repro — bugs only

n/a (hardening chore — no current exploit path)

## Notes

Origin: WM-031 post-build security review (confirmed residual gap, disclosed as
out-of-scope). Care needed not to break `mailto:`/`tel:`/relative hrefs — this is
why it was deferred rather than bundled into WM-031.
