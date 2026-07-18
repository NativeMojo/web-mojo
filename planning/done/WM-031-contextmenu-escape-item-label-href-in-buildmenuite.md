---
id: WM-031
type: chore
title: "ContextMenu — escape item label/href in buildMenuItemHTML"
priority: P3
effort: S
owner: frontend
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

### Agreed plan (scoped WM-031 — 2026-07-18, approved with "merge others in")

**Scope expanded** past the original two methods: the user approved fixing the
root-cause quote-unsafe escapers framework-wide, not just adding escaping to the
two menu builders.

**Recon correction:** the original write-up (and my first pass) suspected
`TableRow`'s escaper was quote-unsafe. It is NOT — `TableRow.escapeHtml`
(TableRow.js:843) is already an explicit-replace `& < > " '` escaper ("same as
ListView's ... used in attribute contexts"). The item's premise was correct.

**Root cause:** several classes define their OWN `escapeHtml` using
`div.textContent`/`innerHTML`, which escapes `& < >` but NOT quotes — unsafe in
attribute contexts. The genuinely quote-unsafe self-defined escapers are:
`View` (root), `FormBuilder`, `TagInput`, `ComboInput`, `ChatInputView`.
Already-safe (leave alone): `TableRow`, `WebApp`, `DataFormatter`, `MOJOUtils`,
`mustache.js` (the `{{…}}` engine escaper is quote-safe).

**Production changes**
1. Make these 5 escapers quote-safe, matching TableRow's exact form
   (`& → &amp;`, `< → &lt;`, `> → &gt;`, `" → &quot;`, `' → &#39;`; null/undefined → ''):
   `View.js:712`, `FormBuilder.js:2858`, `inputs/TagInput.js:570`,
   `inputs/ComboInput.js:724`, `views/chat/ChatInputView.js:334`.
   Fixing `View.escapeHtml` transitively fixes every inheriting caller that
   escapes into attributes (ListView `data-format`/icon `class`, TabView,
   SideNavView, ToastService, MetricCard, assistant/geofence views, …).
2. `ContextMenu.buildMenuItemHTML` — wrap `label`, `icon`, `href`, `target`,
   `action` in `this.escapeHtml(...)` (inherited from View; no new import).
3. `ModalView.buildContextMenu` — same for `label`, `icon`, `href`, `target`,
   `action`, PLUS the custom `data-*` attribute VALUES (`item[key]`).

**Design decisions**
- Use inherited `this.escapeHtml` in ContextMenu/ModalView (no MOJOUtils import,
  no loader change) — clean once View's escaper is quote-safe.
- Minimal `& < > " '` set (matches TableRow/WebApp/DataFormatter), NOT MOJOUtils'
  aggressive `/ = \`` set — purely additive vs. current behavior, minimal churn.
- Escaping `action`/`data-*` is dispatch-safe: handlers read via `getAttribute()`
  which decodes entities, so values round-trip to the original string.

**Out of scope (flagged, not done)**
- `href` scheme sanitization (`javascript:`/`data:`) — escaping stops
  attribute-breakout only; sanitizing schemes risks breaking `mailto:`/`tel:`/
  relative hrefs. Possible separate item.
- Unifying all escapers into one shared util — repo already tolerates multiple
  copies; a future cleanup chore.

**Tests**
- `ContextMenu.test.js`: new block — `<img onerror>` label + quote-bearing href
  render inert; static-label menus unchanged (AC).
- `ModalView.test.js` (new) + `'ModalView'` loader registration — buildContextMenu
  escaping incl. a malicious custom `data-*` value.
- View escaper quote-safety regression (pins the root fix).
- Verified `FormBuilder.escaping.test.js` stays green (its inputs contain no
  quotes, so explicit-replace output is byte-identical).
- Full `npm run test:unit` green + `npm run lint` clean (AC).

**Docs/memory:** CHANGELOG security-hardening entry; memory note for WM-031
(the WM-020 note needs no correction — TableRow really is quote-safe).

### Build outcome (2026-07-18)

Scope grew once more during the post-build security review: the menu **trigger**
`icon`/`buttonClass` config strings (ContextMenu.renderTemplate + the same in
ModalView.buildContextMenu) were still raw — closed here since they're inside the
two menu builders this item owns. Two genuinely separate surfaces the review
found were filed as follow-ups instead of expanding scope further:
`planning/inbox/modalview-escape-footer-buttons-and-title.md` (ModalView
buildFooter button fields + modal title) and
`planning/inbox/menu-link-href-scheme-sanitization.md` (`javascript:`/`data:`
scheme validation on link items). Reviews: test-runner (full runner 1517/1517),
docs-updater (added ModalView.md escaping note), security-review (core change
sound; the two follow-ups above).

## Resolution
- closed: 2026-07-18
- branch: main
- files changed: CHANGELOG.md, docs/web-mojo/components/ContextMenu.md, docs/web-mojo/components/ModalView.md, src/core/View.js, src/core/forms/FormBuilder.js, src/core/forms/inputs/ComboInput.js, src/core/forms/inputs/TagInput.js, src/core/views/chat/ChatInputView.js, src/core/views/feedback/ContextMenu.js, src/core/views/feedback/ModalView.js, test/unit/ContextMenu.test.js, test/unit/ModalView.test.js (new), test/unit/View.test.js, test/utils/simple-module-loader.js
- tests added: test/unit/View.test.js (+3: quote-safe escapeHtml, `<img onerror>` inert, non-string passthrough); test/unit/ContextMenu.test.js (+5: buildMenuItemHTML label/icon/href/target/action + renderTemplate trigger config); test/unit/ModalView.test.js (new, +5: buildContextMenu label/href/target + custom data-* + trigger config)
