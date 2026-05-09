---
status: in-progress
type: request
scope: src/extensions/admin
created: 2026-05-08
parent: detailview-migration.md
---

# DetailView migration — rethink

The first pass of the DetailView migration ([detailview-migration.md](detailview-migration.md))
landed all 9 admin views structurally on `DetailView`, but several layers of
the implementation drifted from the framework's existing patterns. This
request captures the rethink so the next session can resume cleanly.

## What's wrong with the current pass

### 1. Templates are hand-rolled instead of Mustache + DataFormatter

The framework has two well-documented mechanisms that the migration is
ignoring:

- **[Mustache templates](../../docs/web-mojo/core/Templates.md)** — bound to
  `this` (the view) and `this.model` automatically. `{{model.email}}`,
  `{{model.created|relative}}`, `{{#model.is_active|bool}}…{{/}}`.
- **[DataFormatter pipe syntax](../../docs/web-mojo/core/DataFormatter.md)** —
  80+ built-in formatters: `currency`, `relative`, `relative_short`,
  `datetime`, `default`, `truncate`, `badge`, `status`, `status_icon`,
  `yesnoicon`, `phone`, `clipboard`, `email`, `bool`. `{{{value|clipboard}}}`
  produces a copy-to-clipboard button. `{{{model.email|email}}}` produces
  a mailto link.

Instead, the new section views use:

```js
template = () => this._buildTemplate();

_buildTemplate() {
    return `
        <div class="detail-field-row">
            <div class="detail-field-label">Email</div>
            <div class="detail-field-value">
                ${escapeHtml(this.model.get('email') || '—')}
                ${verifiedEmail
                    ? '<span class="badge text-bg-success">…verified</span>'
                    : '<span class="badge text-bg-warning">unverified</span>'}
            </div>
        </div>
    `;
}
```

When it could have been:

```html
<div class="detail-field-row">
    <div class="detail-field-label">Email</div>
    <div class="detail-field-value">
        {{{model.email|email}}}
        {{#model.is_email_verified|bool}}<span class="badge text-bg-success">verified</span>{{/model.is_email_verified|bool}}
        {{^model.is_email_verified|bool}}<span class="badge text-bg-warning">unverified</span>{{/model.is_email_verified|bool}}
    </div>
</div>
```

**Why this matters:** the hand-rolled approach is verbose, escapes by hand
(easy to miss a spot — XSS risk), reinvents what `|relative` / `|default` /
`|datetime` / `|status` / `|email` / `|clipboard` already do, and breaks
the convention every other view in the framework follows.

**Worst offender right now:** `JobDetailsView`'s `JobExecutionCard`,
`JobLifecycleCard`, `JobStatusPanel` — all hand-rolled `_buildTemplate()`
with `escapeHtml()`. This was the example I propagated to every parallel
agent, so the same pattern is in `IncidentView`, `RunnerDetailsView`,
`UserView`, `GeoIPView`, `ShortLinkView`. RuleSetView (the original
canonical example) also has hand-rolled string templates, but at least it
was the first one shipped — the new migrations should not have followed
its lead, they should have followed the rest of the framework.

**Required rewrite:** every section view template should be a Mustache
string template. Use `getter` properties on the section view for any
display fields that need computation. Use DataFormatter pipes for every
date / relative / status / icon / boolean. Use `this.model` directly
(no need to interpolate). No more `_buildTemplate()` returning concatenated
strings.

### 2. Audit / Click-history / Logs are NOT TableViews

`UserView`'s Audit section is a hand-built `<ul class="detail-audit-list">`
with a custom in-section pagination ("Show 25 more"), a custom search input
with debounce, and a custom refresh button. It has client-side filtering
that's blind to backend pagination — typing in the search only filters
the 25 already-loaded entries.

[TableView](../../docs/web-mojo/components/TableView.md) already provides:
- Server-side pagination (proper, with page numbers)
- Server-side search (sends `?q=` to the backend)
- Per-column filters (multiselect / range / text)
- Sorting per column
- Refresh button
- "Active filter" pills above the table
- `clickAction: 'view'` to open a row in a modal
- Per-column formatters via `formatter: 'datetime'` / `formatter: 'badge'` / etc.
- Per-column custom row templates

**Required rewrite:** `UserView` Audit, `UserView` API Keys, `UserView`
Devices unified table, `ShortLinkView` Click History, `IncidentView`
Events, `JobDetailsView` Events / Logs, `GeoIPView` Events / Logs,
`GroupView` Members / Sub-Groups / API Keys, `DeviceView` Locations /
Sessions, `RunnerDetailsView` Active Jobs / Job History — every list of
records — must be a `TableView`, not a hand-rolled list. The custom audit
visual style is fine, but TableView supports `columns: [{ template: '<custom-row-html>' }]`
for that. Pagination, search, refresh come for free.

### 3. TabView is missing where it should be used

[TabView](../../docs/web-mojo/components/TabView.md) is the framework's
tabbed-content primitive. Several places in the migration use ad-hoc
`btn-group` segments that should be TabViews:

- **UserView Permissions** — Common / Advanced / Effective is a `btn-group`,
  should be TabView (each mode is a meaningfully different *view*, not a
  filter).
- **UserView Audit** — Incidents / Activity / Object changes is a
  `btn-group`, should be TabView. Each tab fetches its own collection,
  has its own pagination and search.
- **UserView Devices** — All / Browser / Push is a `btn-group`, should be
  TabView (or a TableView column filter).
- **GeoIPView Events vs Logs** — could have been a TabView under one
  "Activity" section instead of two separate sections.

**RunnerDetailsView** previously used TabView and was migrated **off** it
to SideNavView — that's fine, side nav for top-level sections is correct.
But the *inner* segmentation of a section is what TabView is for.

### 4. Visual: too many cards, not minimalist enough

The user shared a reference screenshot showing the old `AdminProfileSection`
style: **labeled section eyebrows + flat field rows, no card wrappers**.
The new `UserView` Profile section wraps each group in a `.detail-field-card`
which adds a header row with a pencil button and a body with rows. That's
heavier than the original.

The minimalist target:

```
CONTACT & VERIFICATION                                          [pencil]
Email     it@foraylabs.net  [Unverified]              [✓verify] [✏ edit]
Phone     0000000000        [Unverified]              [✓verify] [✏ edit] [✕]

ACCOUNT
Username  admin                                                 [✏]
Status    [Active]
Role      User
MFA       [Not required]
Member Since
Last Login  1 month ago
```

No card borders. Just labeled-section + rows. The pencil for "edit this
group" can go inline at the section-eyebrow level (right-aligned).

**Required rewrite:** drop `.detail-field-card` in favor of a flatter
"labeled-section + flat rows" pattern. The legacy `AdminPersonalSection`
and `AdminProfileSection` already had this — re-import them or restore
their layout in the new section views.

### 5. Header right side is too busy

User complaint: "I don't need magic link or reset password buttons
there, in the context menu is fine. But last active, are they online or
not, active or not."

Reference screenshot:

```
                                            ● Online   ● Active
                                            Last active 4 minutes ago
```

Currently `UserView` puts Magic-link and Reset-password as primary
header buttons (`actions: [...]`). Those should move to the context
menu. The header right gutter should become a small status block:

- Presence dot + "Online" / "Offline" (computed from `last_activity`
  within 5 min)
- Active toggle (existing `dh-active-switch`)
- Below: "Last active 4 min ago" muted small text

**Required:** add an `auxFn(model) -> htmlString` (or a more structured
`presence` config) option to `DetailHeaderView` that renders a small
right-gutter block. UserView opts into it. Magic link / Reset password
move to the context menu where they belong.

### 6. Metadata is buried under "Detail"

Already fixed in the most recent pass — section renamed to "Metadata"
and uses `AdminMetadataSection`. The old metadata view was good. Keep it.

### 7. Old features got dropped

Already partially restored in the most recent pass:
- ✅ AdminPersonalSection re-imported (DOB / Timezone / Address)
- ✅ AdminSecuritySection re-imported (full security center)
- ✅ AdminConnectedSection re-imported (OAuth providers, separate)
- ✅ Force-verify email/phone (added inline in Profile section)
- ✅ Detail → Metadata rename

But these legacy sections render with their **own** inline `<style>`
blocks using hardcoded light-theme hex colors (`#f0f0f0`, `#6c757d`,
`#212529`). They look out of place against the new minimalist dark
admin. They need to be ported to use Bootstrap tokens (`var(--bs-...)`)
and dropped from the inline `<style>` block (per
[.claude/rules/theming.md](../../.claude/rules/theming.md)).

## Action items for the rethink

This work doesn't fit in one continuation — it's a full re-pass of the 9
migrated views. Spawn it as a fresh session, with these as the
acceptance criteria:

### Framework conventions

- [ ] **Replace every `template = () => this._buildTemplate()` with a
      Mustache template string.** Use `{{model.field}}`, `{{field|formatter}}`,
      `{{#flag|bool}}…{{/}}`. Compute extras as `getter` properties on the
      section view.
- [ ] **Use DataFormatter pipes** everywhere there's a date/relative/
      datetime/badge/status/email/phone/clipboard. No more hand-rolled
      `formatRelative()` / `formatDateTime()` helpers.
- [ ] **Use `getter` properties** for derived values that need to be
      bound in templates (replaces the hand-rolled `_buildTemplate()`
      string concatenation).

### Components

- [ ] **Replace every hand-rolled list with TableView.** Custom row
      visuals via `columns[].template`. Pagination, search, refresh
      come from the primitive.
- [ ] **Use TabView** for inner segmentation: UserView Permissions
      modes, UserView Audit sources, UserView Devices kinds, GeoIPView
      activity, anywhere a `btn-group` is currently swapping between
      meaningful sub-views.
- [ ] **`Modal.detail()`** for opening DetailView subclasses (already
      done, just confirm).

### Design

- [ ] **Drop `.detail-field-card`** in favor of flat labeled sections
      with horizontal-rule rows. Match the reference screenshot layout.
      Keep section pencils at the eyebrow / right-gutter level only.
- [ ] **Header right gutter — Online + Active + Last-active block.**
      Add `auxFn` (or a structured `presence` option) to
      DetailHeaderView. Move magic-link / reset-password to context menu.
- [ ] **Theme: drop legacy inline `<style>` blocks** in
      AdminPersonalSection / AdminProfileSection / AdminSecuritySection /
      AdminConnectedSection. Migrate hardcoded light-theme hex to
      Bootstrap tokens. Ensure dark theme works.
- [ ] The Modals are too wide, make them use the 'lg' ie 'modal-lg' as the default

### Per-view sweep

For each view, audit and rewrite:
- [ ] JobDetailsView (the original sin — set the bad precedent)
- [ ] RunnerDetailsView
- [ ] IncidentView
- [ ] UserView
- [ ] MemberView
- [ ] GroupView
- [ ] DeviceView
- [ ] GeoIPView
- [ ] ShortLinkView

For each: read every section view, replace hand-rolled templates with
Mustache + DataFormatter, replace hand-rolled lists with TableView,
flatten the card stacking.

## What I learned to brief the next session

1. **Don't use RuleSetView as the only canonical example.** RuleSetView
   shipped first but is the most hand-rolled. Better starting points:
   any pre-existing TablePage subclass, or AdminProfileSection's old
   labeled-row layout.
2. **Read [docs/web-mojo/core/Templates.md](../../docs/web-mojo/core/Templates.md)
   AND [DataFormatter.md](../../docs/web-mojo/core/DataFormatter.md) before
   spawning agents.** The first migration pass briefed agents on
   "follow RuleSetView" without pointing them at the framework's
   composition primitives. They got the structural shape right but
   missed the internal idioms.
3. **For every list, default to TableView.** It is *almost never* worth
   hand-rolling a list, even for a custom visual style — TableView's
   `columns[].template` handles that.
4. **For every segmented sub-view, default to TabView.** A `btn-group`
   should be a hint that you're doing the framework's job manually.
5. **Card wrappers are the exception, not the rule.** Default to flat
   labeled sections with rule-line rows. Only wrap in a `.card` when
   the content really is a peer block (Identity vs. Recent activity in
   Overview is reasonable; Personal vs. Account vs. Linked-accounts
   stacking three cards in Profile is not).

## Resume from

A new session that opens this file, then takes one view at a time. The
proposed order:

1. **JobDetailsView first** — the precedent to fix. Once it's clean,
   it's the new template every other migration follows.
2. **UserView second** — most user-visible problems.
3. The other 7 in any order, in parallel agents (this time briefed
   correctly per the learnings above).

## See also

- [detailview-migration.md](detailview-migration.md) — the original plan + per-view spec
- [planning/mockups/detailview-migration/](../mockups/detailview-migration/) — visual mockups
- [docs/web-mojo/core/Templates.md](../../docs/web-mojo/core/Templates.md)
- [docs/web-mojo/core/DataFormatter.md](../../docs/web-mojo/core/DataFormatter.md)
- [docs/web-mojo/components/TableView.md](../../docs/web-mojo/components/TableView.md)
- [docs/web-mojo/components/TabView.md](../../docs/web-mojo/components/TabView.md)
- [.claude/rules/views.md](../../.claude/rules/views.md)
- [.claude/rules/theming.md](../../.claude/rules/theming.md)

---

## Plan

### Objective

Re-pass the 9 admin DetailView migrations so they conform to the framework's
existing primitives **AND** finish the parent migration plan's new-section
adds in the same pass:

- **Templates**: Mustache + DataFormatter pipes (no `_buildTemplate()` string
  concat, no `escapeHtml()` by hand).
- **Lists**: every record list is a `TableView` (server-side pagination,
  search, filters, refresh, `clickAction: 'view'`).
- **Inner segmentation**: `TabView` instead of ad-hoc `btn-group` toggles
  when each segment is a meaningfully different sub-view.
- **Layout**: flat "labeled section + rule-line rows" — drop
  `.detail-field-card` wrappers; reuse the `AdminProfileSection` shape.
- **Header**: add a right-gutter presence/aux block (`auxFn`); move
  magic-link / reset-password to context menu (already done in UserView,
  confirm elsewhere).
- **Theming**: scrub hardcoded hex literals from the 4 inherited Admin*
  sections; move CSS to admin.css with Bootstrap tokens +
  `[data-bs-theme="dark"]` overrides.
- **Modal width**: `Modal.detail()` defaults to `lg`, not `xl`.
- **New `@core` primitives**: extract `StatusPanel`, `Timeline`, `FlowStrip`,
  `KnownFieldsCard` from JobDetailsView/RuleSetView/etc. into `@core/views/data/`.
- **TabView on RuleSetView** — audit + retrofit if it has inner segmentation.
- **Backend work** — new admin-extension collections (`RetryHistoryList`,
  `SimilarJobsList`, `RelatedIncidentsList`, `IncidentHistoryList`,
  `HeartbeatList`, `ClickMetricsList`, etc.) under `.claude/rules/api.md` —
  no separate admin endpoints; standard CRUD + filters.
- **New sections per view** as specified in the parent
  [detailview-migration.md](detailview-migration.md) — distributed across
  Wave 2 (JobDetailsView precedent) and Wave 3 (per-view sweeps).
- **Tests**: unit test per new `@core` primitive; one regression test per
  Wave 3 PR.

### Design language (NON-NEGOTIABLE for every Wave 2/3 agent)

The Wave 1 styling pass settled on a 2026 minimal aesthetic. Every
section view, primitive, and admin consumer must follow these rules:

1. **No card borders. No card backgrounds.** Section content sits flat
   on the page surface. The `.detail-section-eyebrow` (UPPERCASE label,
   tracked, muted) is the only visual subsection separator. Drop
   `.card`, `.detail-field-card`, bordered `.detail-perm-group`-style
   wrappers. Bg-tint is acceptable ONLY for tone-state primitives
   (StatusPanel hero, KPI tone left-stripe, info alerts) — never as
   "this is a section" decoration.
2. **Subtle dividers.** Hairlines between flat rows are
   `rgba(0,0,0,0.06)` light / `rgba(255,255,255,0.06)` dark — barely
   visible, not Bootstrap's default `--bs-border-color-translucent`
   which is too dark. Use the framework `.detail-flat-row` family;
   it has the right divider already.
3. **Generous, predictable vertical rhythm.** Every block sits on a
   1.5rem minimum gap from the next. Sections separate at 2.5rem.
   Subsection eyebrows after content auto-space at 2rem
   (`.detail-section-eyebrow:not(:first-child)`). Don't add inline
   `mt-3` / `mt-4` / `pt-*` utility classes to templates — the layout
   owns spacing.
4. **Tight, quiet typography hierarchy.**
   - Section eyebrow: 0.68rem, weight 700, letter-spacing 0.14em,
     `var(--bs-secondary-color)`, no opacity dim.
   - Section title (when used): 0.78rem, weight 600.
   - Flat-row label: 0.8rem, secondary color, 110px column.
   - Flat-row value: 0.875rem, body color, regular weight.
   - StatusPanel headline: 1rem (was 1.4rem — now restrained).
   - MetricCard value: 0.82rem (no `metric-card-lg` by default).
5. **Tiny buttons inside DetailView.** Scoped CSS at
   `.detail-view .btn-group .btn` reduces every button-group inside a
   DetailView to 0.72rem font / 0.2rem 0.55rem padding. Never use
   default-size Bootstrap btn-groups for segment toggles (Common /
   Advanced / Effective, All / Browser / Push, etc.). Even better:
   prefer `TabView` for inner segmentation (per the rethink spec).
6. **Section content padding is owned by the layout.**
   `DetailView.contentPadding` defaults to `'1.5rem'` (Bootstrap p-4)
   on `.snv-content`. Section view classNames must NOT include
   `p-3` / `p-4` — that compounds with the layout padding.
7. **Edit affordances recede until interacted with.**
   `.detail-section-action` (the eyebrow pencil) defaults to opacity
   0.7, brightens to 1.0 on hover. No solid-color buttons for edit;
   just a small outline pencil icon.
8. **`Modal.detail()` opens at `'lg'`.** Per-view `viewDialogOptions`
   must NOT include `size: 'xl'`. Stack content vertically when an
   `lg` modal isn't wide enough — never rely on extra horizontal
   room. Use container queries (not viewport media queries) so
   nested elements stack based on their actual container width.
9. **Trusted-HTML slots stay trusted.** When wiring `auxFn`,
   `meta`, `headline`, `Timeline.items[].detail`, `FlowStrip.value`,
   `KnownFieldsCard.formatter` — the framework does NOT escape these.
   Caller must escape any model field / user data before
   interpolating. Use `MOJOUtils.escapeHtml()` defensively.
10. **Mustache-first templates.** Section views use Mustache string
    templates with DataFormatter pipes. Compute extras as `getter`
    properties on the view, not inline `_buildTemplate()` string
    concatenation. The view IS the Mustache context — `{{model.foo}}`
    reads model data; `{{computedGetter}}` reads getter.

### Parallelization

```
Wave 1 (5 parallel agents, 1 PR — foundations)
    ↓
    ├─→ B1 theme      ┐
    ├─→ B2 models ──┬─→ B4 JobDetailsView (precedent)
    └─→ B3 RuleSet  │
                    ↓
            Wave 3 (8 parallel agents, 8 PRs — per-view sweeps)
```

**Worst-case throughput:** ~3.5 agent-cycles total instead of ~12 serial.

**Conflict zones across waves:**
- `src/core/css/core.css` — 4 of 5 Wave 1 tracks append. Mitigation:
  each new primitive ships its CSS in `src/core/css/_StatusPanel.css` etc.
  and is `@import`-ed from `core.css`. Or run those tracks in a single agent.
- `src/extensions/admin/css/admin.css` — touched by Wave 2 B1, B4 and every
  Wave 3 track. Mitigation: each view has its own clearly-marked section
  block; agents append within their own block only.
- `src/index.js` (or whichever file re-exports framework primitives) —
  4 Wave 1 tracks add exports. Run as a serialization step at PR review.

### Wave 1 — Foundations (5 parallel tracks, 1 PR)

All tracks file-disjoint except `core.css` and `src/index.js` exports.
Bundle into one PR so downstream waves have a stable foundation.

**Track A1 — DetailHeader / Modal / CSS**

1. **`src/core/views/feedback/Modal.js:354`** — flip `Modal.detail()`
   default `size` from `'xl'` to `'lg'`. Update the docblock at lines
   336-348.

2. **`src/core/views/data/DetailView.js`** — add `auxFn` to
   `DetailHeaderView`:
   - Constructor accepts `auxFn` (signature: `(model) => htmlString`).
   - In `_buildTemplate()` (lines 144-209), inject
     `<div class="dh-aux">…</div>` to the left of the active switch.
   - Aux is trusted HTML; document in docblock.
   - `_onModelChange()` already re-renders the header.

3. **`src/core/css/core.css`** — add `.dh-aux` block. Right-aligned column,
   `var(--bs-secondary-color)`, `.dh-aux-dot` (success/secondary).

4. **`src/extensions/admin/css/admin.css`** — flat-section primitive set
   replacing `.detail-field-card`:
   - `.detail-section-eyebrow` (uppercase label + optional action slot)
   - `.detail-flat-row` (flex row with hairline bottom border)
   - `.detail-flat-row-label` (140px, secondary)
   - `.detail-flat-row-value` (flex 1, body color, inline badges)
   - `.detail-flat-row-action` (right-pinned, hover-primary)
   - Light defaults + `[data-bs-theme="dark"]` overrides at bottom.
   - Mark `.detail-field-card*` (lines 2935-2957) deprecated by comment;
     deletion deferred to Wave 3.

5. **`docs/web-mojo/components/DetailView.md`**, **`Modal.md`**,
   **`CHANGELOG.md`** — document `auxFn` and the `Modal.detail()` default
   flip.

6. **`test/unit/DetailHeader.test.js`** — unit test for `auxFn`.

**Track A2 — `StatusPanel` @core**

7. **`src/core/views/data/StatusPanel.js`** (new) — extracted from current
   `JobStatusPanel` in `src/extensions/admin/jobs/JobDetailsView.js`
   (lines 208-305). Constructor options:
   - `tone` (success / info / warning / danger / secondary)
   - `state` (string — short status label, e.g. "Active · firing")
   - `headline` (string — primary line)
   - `meta` (string — secondary descriptor)
   - `actions` (array of `{ label, action, variant }`)
   - All passed as plain options or as functions of `this.model`.
   - Mustache template; getter properties for derived values.
8. **`src/core/css/_StatusPanel.css`** (new) — `.detail-status-panel`,
   `.tone-*` variants, dot, headline/state/meta/actions blocks. `@import`
   into `core.css`. Light + dark.
9. **`docs/web-mojo/components/StatusPanel.md`** (new).
10. **`src/index.js`** — re-export `StatusPanel`.
11. **Unit test** under `test/unit/StatusPanel.test.js`.

**Track A3 — `Timeline` @core**

12. **`src/core/views/data/Timeline.js`** (new) — extracted from current
    `JobLifecycleCard` in `src/extensions/admin/jobs/JobDetailsView.js`
    (lines 356-403). Constructor options:
    - `items` (array OR a getter on the view) of
      `{ tone, icon, headline, detail, when }`.
    - `emptyText` (string).
    - Mustache template iterates `{{#items}}…{{/items}}`.
13. **`src/core/css/_Timeline.css`** (new) — `.detail-timeline`,
    `.detail-timeline-item.tone-*`, `.detail-timeline-headline`,
    `.detail-timeline-detail`, `.detail-timeline-when`. Light + dark.
14. **`docs/web-mojo/components/Timeline.md`** (new).
15. **`src/index.js`** — re-export `Timeline`.
16. **Unit test** under `test/unit/Timeline.test.js`.

**Track A4 — `FlowStrip` @core**

17. **`src/core/views/data/FlowStrip.js`** (new) — extracted from
    `RuleSetTriggeringSection`. Constructor options:
    - `steps` (array of `{ icon, label, detail, tone, action }`) — STEP 1
      → STEP 2 → STEP 3 horizontal flow with arrow separators.
18. **`src/core/css/_FlowStrip.css`** (new). Light + dark.
19. **`docs/web-mojo/components/FlowStrip.md`** (new).
20. **`src/index.js`** — re-export `FlowStrip`.
21. **Unit test** under `test/unit/FlowStrip.test.js`.

**Track A5 — `KnownFieldsCard` @core**

22. **`src/core/views/data/KnownFieldsCard.js`** (new) — promotes known
    JSON keys to a 2-col `DataView`-style layout, raw JSON collapsed
    below. Constructor options:
    - `data` (object OR getter; the JSON blob to display)
    - `knownKeys` (array of `{ key, label, formatter }` — known fields to
      promote, in order)
    - `rawCollapsed` (default `true`)
23. **`src/core/css/_KnownFieldsCard.css`** (new). Light + dark.
24. **`docs/web-mojo/components/KnownFieldsCard.md`** (new).
25. **`src/index.js`** — re-export `KnownFieldsCard`.
26. **Unit test** under `test/unit/KnownFieldsCard.test.js`.

**Wave 1 verification (gates Wave 2):** lint, all unit tests pass, dev
server boots, `RuleSetView` still renders correctly (the Phase A change
is non-breaking for it), every new primitive has its example in its doc
working under both themes.

### Wave 2 — Models, theme, RuleSet, JobDetailsView (4 parallel tracks)

After Wave 1 lands. B4 imports from B2's new collections — recommended
to land B2 first, then run B1/B3/B4 in parallel.

**Track B1 — Theme + clean the 4 inherited Admin\* sections**

These are already idiomatic Mustache templates. Only problem is the
inline `<style>` block with hardcoded hex.

27. **`src/extensions/admin/account/users/sections/AdminPersonalSection.js`**
    — delete the `<style>` block (lines 15-27).
28. **`src/extensions/admin/account/users/sections/AdminProfileSection.js`**
    — delete the `<style>` block (lines 16-29).
29. **`src/extensions/admin/account/users/sections/AdminSecuritySection.js`**
    — delete the `<style>` block (lines 18-29) plus blocks at ~270 and
    ~345.
30. **`src/extensions/admin/account/users/sections/AdminConnectedSection.js`**
    — delete the `<style>` block (lines 26-37).

31. **`src/extensions/admin/css/admin.css`** — copy those rules once under
    `/* Admin* legacy section rows */`, replacing every hex:
    - `#adb5bd`, `#6c757d` → `var(--bs-secondary-color)`
    - `#212529` → `var(--bs-body-color)`
    - `#f0f0f0` → `var(--bs-border-color-translucent)`
    - `#fff` → `var(--bs-body-bg)`
    - `#0d6efd` → `var(--bs-primary)`
    - "ok"/"warn" badge tints → Bootstrap `text-bg-success` /
      `text-bg-warning` utility classes directly in templates.
    - `[data-bs-theme="dark"]` overrides at bottom of file.

**Track B2 — Client-side `Collection` classes for new sections**

Per `.claude/rules/api.md` — standard CRUD endpoints with admin filters,
no separate admin endpoints. **Zero backend HTTP API changes** — every
collection below targets an endpoint that the backend already supports
(verified). Add to existing model files where possible.

32. **`src/extensions/admin/models/Job.js`**:
    - `SimilarJobsList` — endpoint `/api/jobs/job`, filters
      `?func=<func>&ordering=-created`. Collection of recent runs of
      the same `func`.
    - **No `RetryHistoryList`** — use the existing `JobEventList`
      filtered by `?job=<id>&event=retry` (count) or
      `?job=<id>&ordering=-at&graph=timeline` (full lifecycle
      timeline). For "Attempt 3 of 5" displays use the Job's existing
      `attempt` / `max_retries` fields directly.
33. **`src/extensions/admin/models/Incident.js`**:
    - `RelatedIncidentsList` — endpoint `/api/incident/incident`,
      filter combinations from `?source_ip=`, `?rule_set=`, `?group=`,
      `?hostname=`, `?category=`, `?status=`. **No `user` filter** —
      Incident has no user FK, only `group`.
    - `IncidentHistoryList` — endpoint `/api/incident/event` with
      `?incident=<id>` for the raw event timeline. For status / priority
      / merge audit trail specifically, use
      `/api/incident/incident/history` instead.
    - `TicketList` — already exists; confirm it accepts
      `?incident=<id>` filter.
34. **`src/extensions/admin/models/Runner.js`**:
    - `ActiveJobsList` — endpoint `/api/jobs/job` with
      `?runner_id=<id>&status=running`. Thin subclass of `JobList`.
    - **No `HeartbeatList`** — dropped. Live state from
      `/api/jobs/runners` already answers "is the runner alive"; a
      history chart would just be a flat line. The Wave 3 C3
      RunnerDetailsView heartbeat-sparkline section is dropped
      accordingly (see Wave 3 C3 below).
35. **`src/extensions/admin/models/ShortLink.js`**:
    - `ShortlinkHistoryList` — endpoint `/api/shortlink/history` with
      `?shortlink=<id>`. Per-click rows; only populated when the
      ShortLink has `track_clicks=true`. Drives the Click History
      `TableView` in ShortLinkView.
    - **No `ClickMetricsList`** — the chart in ShortLinkView's Metrics
      section uses the existing metrics-fetch endpoint directly:
      `GET /api/metrics/fetch?slug=sl:click:<code>` returns
      time-bucketed data ready for `MetricsChart`. No new collection
      needed.
    - OG/Social fields — already on `ShortLinkModel`; no new model.
36. **`src/extensions/admin/models/index.js`** — re-export
    `SimilarJobsList`, `RelatedIncidentsList`, `IncidentHistoryList`,
    `ActiveJobsList`, `ShortlinkHistoryList`.
37. **Confirm** all models follow `class XList extends Collection { static
    ModelClass = ...; static endpoint = '...' }` per
    `.claude/rules/api.md`.

**Endpoint paths to mind:** `/api/jobs/job` (singular),
`/api/incident/incident` (singular), `/api/incident/event`,
`/api/shortlink/history`, `/api/metrics/fetch`.

**Track B3 — RuleSetView TabView retrofit**

38. **`src/extensions/admin/incidents/RuleSetView.js`** — audit for any
    `btn-group` swapping between sub-views. If found, convert to
    `TabView` per the rethink criteria. If RuleSetView has none, this
    track becomes a no-op (close as confirmed).

**Track B4 — JobDetailsView (the precedent)**

[src/extensions/admin/jobs/JobDetailsView.js](../../src/extensions/admin/jobs/JobDetailsView.js).

39. **JobOverviewSection** (lines 106-203) — keep structural layout
    (`detail-kpi-grid`, `detail-pair`). Replace the per-KPI `_kpi()`
    factory (lines 193-202) with a Mustache-templated child class
    or `MetricCard` from `@core` if it fits.

40. **JobStatusPanel** (lines 208-305) — **delete** the local class.
    Replace with `StatusPanel` from `@core` (Wave 1 track A2). Configure
    via constructor options driven by getters
    (`tone`, `state`, `headline`, `meta`, `actions`).

41. **JobExecutionCard** (lines 310-351) — replace the hand-built `<li>`
    list with flat-row Mustache:
    ```
    <div class="detail-flat-row">
      <div class="detail-flat-row-label">Function</div>
      <div class="detail-flat-row-value"><code>{{model.func}}</code></div>
    </div>
    ```
    Pipes: `{{model.created|relative}}`, `{{model.started|datetime}}`.
    Conditional rows: `{{#flag|bool}}…{{/}}`. Error block via getter
    `hasError()`.

42. **JobLifecycleCard** (lines 356-403) — **delete** the local class.
    Replace with `Timeline` from `@core` (Wave 1 track A3). Pass
    `items` as a getter mapping `recent_events` to
    `{ tone, icon, headline, detail, when }`.

43. **Events / Logs TableViews** (lines 443-471) — already TableView;
    swap any column formatters that hand-roll HTML to per-column
    `formatter:` strings or `template:` Mustache snippets.

44. **NEW Retry History section** — uses the existing `JobEventList`
    filtered by `?job=<id>&event=retry` (or
    `?job=<id>&ordering=-at&graph=timeline` for the full lifecycle).
    Render as a `Timeline` (from `@core` Wave 1 A3) rather than a
    table — the events are inherently a timeline shape. Side-nav
    badge: count of retry events. For the simple "Attempt 3 of 5"
    glance, use `Job.attempt` / `Job.max_retries` directly in the
    Overview (no fetch).

45. **NEW Similar Jobs section** — uses `SimilarJobsList` from B2.
    `TableView` with `clickAction: 'view'` opening nested
    JobDetailsView modals. Side-nav badge with count of runs in last
    7 days.

46. **Header** — verify `actions:` are minimal (Retry / Cancel only);
    long-tail to `contextMenu`. Add `auxFn` rendering state-aware
    metadata ("Running on runner-7 · 4m ago" / "Failed 12m ago").

47. **Regression test** under `test/unit/JobDetailsView.test.js` — opens
    a fixture Job model, asserts the StatusPanel renders the right
    tone for each status state, asserts at least one section is a
    `TableView` instance.

**Wave 2 verification (gates Wave 3):** open Jobs → JobDetailsView
canonical → StatusPanel + Timeline imported from `@core` and reused
elsewhere → Retry History + Similar Jobs sections live → use this file
as the briefing example for Wave 3.

### Wave 3 — Per-view sweep (8 parallel tracks, 1 PR each)

Each track owns one view file plus its admin.css region. Each agent gets
the same briefing template pointing at JobDetailsView (from Wave 2) as
the canonical example.

Each Wave 3 PR delivers (in one go): cleanup (Mustache + DataFormatter +
TableView + TabView + flat-row layout) **AND** new sections from the
parent migration plan **AND** a regression test or visual proof.

**Per-agent briefing template** (substitute `<view-file>`):

> Open `<view-file>`. Apply the recipe from `JobDetailsView.js` (the new
> canonical example after Wave 2):
> 1. Convert every section view from `template = () => this._buildTemplate()`
>    to a Mustache template string with `{{model.field}}`,
>    `{{field|formatter}}`, `{{#flag|bool}}…{{/}}`. Use getter properties
>    for derived values.
> 2. Use DataFormatter pipes (`|relative`, `|datetime`, `|date`,
>    `|default`, `|truncate`, `|badge`, `|status`, `|email`, `|phone`,
>    `|clipboard`, `|bool`, `|yesno`) — never `escapeHtml()` by hand.
> 3. Replace every hand-rolled record list with a `TableView`. Custom row
>    visuals via `columns[].template`.
> 4. Replace every `btn-group` that swaps between sub-views with a
>    `TabView`. A `btn-group` filtering rows in one table stays.
> 5. Drop `.detail-field-card` wrappers; use the flat
>    `.detail-section-eyebrow` + `.detail-flat-row` pattern from Wave 1.
> 6. Add the new sections listed for this view in the Wave 3 entry below.
>    Use `@core` `StatusPanel` / `Timeline` / `FlowStrip` /
>    `KnownFieldsCard` (Wave 1 primitives) where they fit.
> 7. Wire `auxFn` on the header when there's presence/state info.

**Track C1 — UserView**
File: `src/extensions/admin/account/users/UserView.js`
- **UserAuditSection** (lines 895-1103) — delete hand-rolled list +
  pagination + search + sourceFilter btn-group. Replace with `TabView`
  of 3 `TableView`s (Activity / Incidents / Object changes). Each table
  uses its own collection with server-side `?q=` search.
- **UserDevicesSection** (lines 754-890) — replace All/Browser/Push
  btn-group. Per parent plan §3 ("kind column distinguishes
  browser/push") prefer one unified `TableView` with a `kind` column
  filter; fall back to `TabView` of 3 tables only if the unified shape
  feels crowded.
- **UserPermissionsSection** (lines 566-749) — replace
  Common/Advanced/Effective btn-group with a `TabView` of 3 child views.
- **UserApiKeysSection** (lines 1108-1278) — replace card-list with
  `TableView`. Generate Key → `toolbarButtons`; Revoke / Copy Token →
  row actions.
- **UserView header** (lines 1453-1481) — `auxFn` for online/offline +
  last-active relative.
- **NEW Recent-activity timeline in Overview** — uses `Timeline` from
  `@core`.
- **NEW KPIStrip in Overview** — Devices / Last login / Active sessions /
  Groups (use `KPIStrip` from `web-mojo/charts` if it fits, else 4
  `MetricCard`s in a `detail-kpi-grid`).
- Drop helper functions (lines 53-91, 100-117) — `formatRelative()`,
  `formatDate()`, `formatDateTime()`, `escapeHtml()`. Keep `isOnline()`.
- Convert `UserOverviewSection` `_buildTemplate()` to Mustache.

**Track C2 — IncidentView (+ EventView bundled)**
Files: `src/extensions/admin/incidents/IncidentView.js`,
`src/extensions/admin/incidents/EventView.js`
- StatusPanel hero in Overview (uses `StatusPanel` from `@core`).
- 4 KPIs in Overview (Events / Sources / Last fired / Related).
- "What triggered this" + "What happened next" cards in Overview
  (the second card uses `Timeline` from `@core`).
- New Source / Request / Stack Trace / Rule Engine / Tickets sections
  per parent plan §1.
- History section uses `Timeline` from `@core` or wraps existing ChatView.
- Related Incidents section — `TableView` from `RelatedIncidentsList`.
- Metadata section uses `KnownFieldsCard` from `@core`.
- EventView (small) — convert templates to Mustache; no lists.

**Track C3 — RunnerDetailsView**
File: `src/extensions/admin/jobs/RunnerDetailsView.js`
- StatusPanel hero in Overview (uses `StatusPanel` from `@core`).
  Drives "is the runner alive" from the existing `/api/jobs/runners`
  state — no new heartbeat collection.
- KPIs in Overview (Uptime / Jobs processed / Failure rate /
  Active jobs).
- **No heartbeat sparkline** — dropped per backend verification.
  `/api/jobs/runners` answers the live question; a history chart would
  just be a flat line.
- NEW Channels section.
- Active Jobs section uses `ActiveJobsList` from B2 → `TableView`
  (`/api/jobs/job?runner_id=<id>&status=running`).
- Job History section split from existing Logs → `TableView`.
- Logs section stays — `TableView`.
- NEW Actions section (shutdown / drain / broadcast / restart).

**Track C4 — DeviceView**
File: `src/extensions/admin/account/devices/DeviceView.js`
- Grow 2 sections to 5: Overview (KPIs + threat-signal panel),
  Hardware (full `device_info`), Locations (existing — `TableView`),
  Sessions (NEW — `TableView`), Metadata (uses `KnownFieldsCard`).
- Header chips: `[Trusted]` / `[Blocked]` / `[VPN]` / `[Tor]` / `[Proxy]`
  with `when:` callbacks.

**Track C5 — GeoIPView**
File: `src/extensions/admin/account/devices/GeoIPView.js`
- Collapse 8 → 7 sections.
- Embedded map in Overview (lazy-init on first paint via
  `onAfterMount` once mounted — exception to the no-fetch-in-after-mount
  rule because it's render-time map setup, not data fetching).
- NEW Risk & Reputation section with flag breakdown.
- Combine Events / Logs under one **Activity** section with a `TabView`
  (per rethink request §3).
- Threat flags promoted to header chips; only render when truthy.
- Metadata uses `KnownFieldsCard`.

**Track C6 — GroupView**
File: `src/extensions/admin/account/groups/GroupView.js`
- KPIs in Overview (Members / Sub-Groups / API Keys / Last activity).
- NEW Hierarchy mini-tree in Overview (small DOM-only render — no
  new primitive worth extracting yet).
- Members / Sub-Groups / API Keys → `TableView` each.
- Permissions section if present.
- Audit section uses `Timeline` from `@core`.

**Track C7 — MemberView**
File: `src/extensions/admin/account/users/MemberView.js`
- Smallest. Cleanup-only. Audit section uses `Timeline` from `@core`.
- Confirm 4 sections render correctly under both themes.

**Track C8 — ShortLinkView**
File: `src/extensions/admin/shortlinks/ShortLinkView.js`
- KPIs in Overview (Hits 30d / 7d / today / top country).
- NEW preview card in Overview (Slack/iMessage mock — small templated
  card; no extraction).
- NEW Metrics chart section using `MetricsChart` from `web-mojo/charts`
  pointed at the existing endpoint
  `/api/metrics/fetch?slug=sl:click:<code>` (already time-bucketed).
  No new collection required.
- Click History → `TableView` backed by `ShortlinkHistoryList` from B2
  (`/api/shortlink/history?shortlink=<id>`). Only meaningful when the
  ShortLink has `track_clicks=true`; render an empty-state when not.
- NEW OG/Social section split from Metadata.
- Metadata section uses `KnownFieldsCard`.

### Design Decisions

- **No new framework primitives beyond `auxFn`.** The lightest fit, same
  shape as `titleFn` / `subtitleFn`. Per `.claude/rules/core.md` — match
  existing patterns.
- **Mustache template = string OR function returning Mustache string.**
  Both are fine as long as the body is Mustache, not concatenated HTML.
  Don't churn existing `() => "string-with-mustache"`.
- **Phase A goes first.** Modal width and the new flat-row CSS are
  referenced by every subsequent file edit.
- **Phase B (theming) runs in parallel with Phase A.** Independent files.
- **Phase C before D** because precedent: once `JobDetailsView` is clean,
  agent briefings reference it instead of `RuleSetView`.
- **Per-row TableView templates** — for custom visual styles, use
  `columns: [{ key: '_row', template: '<full-row-html>' }]` rather than
  hand-rolling.
- **`btn-group` → `TabView`** only when each segment is a meaningfully
  different sub-view. A `btn-group` filtering rows of one table stays.
- **Don't over-refactor on the parallel pass.** Keep section view class
  names and file locations stable.

### Edge Cases

- **Mustache + null values**: `{{model.last_login|relative}}` returns
  `''` for null. Use `{{model.last_login|relative|default:'—'}}` or a
  pre-computed getter.
- **Boolean checks**: always `{{#flag|bool}}` — plain `{{#flag}}`
  iterates arrays/objects.
- **`{{{triple-brace}}}`** required for trusted HTML (`|email`,
  `|clipboard`, `|badge`). Single-braces will display literal HTML.
- **TableView `clickAction: 'view'`** needs `Model.VIEW_CLASS`. Confirm
  on each row's model class before flipping.
- **Section views inside TabView** — children mounted before parent's
  first render render automatically. TabView already handles
  `onTabActivated` for lazy tabs.
- **Modal width regression risk**: flipping `Modal.detail()` to `lg`
  visually shrinks any caller that doesn't override. Audit grep
  `Modal.detail(` across `src/`. Per request, "Modals are too wide" —
  accept the visual change. If a specific view needs `xl`, pass
  `{ size: 'xl' }` at the call-site.
- **Inline `<style>` blocks in `getTemplate()`** — easy to miss while
  sweeping; theming.md and the request both forbid them.
- **`onAfterMount` / `onAfterRender` data fetches** — confirm during each
  sweep; per `.claude/rules/core.md` Forbidden Actions, fetch in
  `onInit()` only.
- **Header re-render after `model.set`** — `_onModelChange()` re-renders
  the header, so `auxFn` re-renders. But if `auxFn` reads time-relative
  state ("4m ago"), it stales — out of scope to add a periodic
  re-render; document as aux is rendered on header re-render only.

### Out of Scope

- FileView migration — FileView is not in the rethink-9 list.
- Extension docs reorganization or new top-level docs.
- **Backend HTTP API changes** — every endpoint and filter referenced
  in B2 has been verified to exist. No server-side work required.
- `RetryHistoryList` as a new collection — replaced with the existing
  `JobEventList` filtered by `?event=retry`.
- `HeartbeatList` and the runner heartbeat sparkline — dropped;
  `/api/jobs/runners` already answers the live question and a history
  chart of heartbeats would be a flat line.
- `ClickMetricsList` as a new collection — replaced with a direct
  `MetricsChart` pointed at the existing
  `/api/metrics/fetch?slug=sl:click:<code>` endpoint.

### Testing

- **Wave 1**: unit test per new primitive (`auxFn`, `StatusPanel`,
  `Timeline`, `FlowStrip`, `KnownFieldsCard`) under `test/unit/`.
  `npm run lint` + `npm run test:unit` green.
- **Wave 2**:
  - B1 (theme): visual smoke under light/dark.
  - B2 (models): unit tests for new `Collection` shapes if behavior
    diverges from the base; otherwise rely on integration coverage.
  - B3 (RuleSet): visual confirmation; RuleSet integration test still
    green.
  - B4 (JobDetailsView): regression test asserting StatusPanel tone per
    state, Retry History + Similar Jobs sections render.
- **Wave 3**: each PR adds a regression test or attaches visual proof
  (screenshot under both themes).
  - `npm run dev`, open the example portal, navigate to each view.
  - Light/dark theme parity (topbar Theme settings dropdown).
  - Modal opens at `lg`; `xl` on RuleSetView (where it stays).
  - Each TableView searches/paginates against the backend (network tab
    shows `?q=` and `?page=` requests).
  - Each TabView swaps content without unmounting siblings unnecessarily.
  - Header presence/aux block updates after toggling `is_active`
    (UserView).
- **Cross-view regression after Wave 1**: open RuleSetView and confirm
  it still renders correctly — Wave 1 is non-breaking for it.

### Docs Impact

- **`docs/web-mojo/components/DetailView.md`** — document `auxFn` (Wave
  1 A1).
- **`docs/web-mojo/components/Modal.md`** — `Modal.detail()` size
  default flip (Wave 1 A1).
- **`docs/web-mojo/components/StatusPanel.md`** (new) — Wave 1 A2.
- **`docs/web-mojo/components/Timeline.md`** (new) — Wave 1 A3.
- **`docs/web-mojo/components/FlowStrip.md`** (new) — Wave 1 A4.
- **`docs/web-mojo/components/KnownFieldsCard.md`** (new) — Wave 1 A5.
- **`docs/web-mojo/README.md`** — add the 4 new primitives under
  Components index (Wave 1 — coordinate as part of A1's PR).
- **`CHANGELOG.md`** — one bullet per Wave 1 track + one per Wave 2
  track + one per Wave 3 track.
- No docs changes for per-view sweeps themselves — they're admin
  extension, not framework API.

---

## Resolution (Partial — Wave 1 done, Wave 2 partial, Wave 3 pending)

### Status

- **Wave 1 — Foundations: ✅ COMPLETE** (5 of 5 tracks)
- **Wave 2 — Models, theme, RuleSet, JobDetailsView: 3 of 4 tracks complete**
  - B1 ✅ (theme cleanup)
  - B2 ✅ (admin model collections)
  - B3 ✅ (no-op — RuleSetView has no `btn-group` segmentation; already
    uses SideNavView at top level)
  - B4 ⏳ **PENDING** (JobDetailsView precedent migration)
- **Wave 3 — Per-view sweep: ⏳ NOT STARTED** (8 tracks pending)

### Commits landed (8)

```
1f7d79e  Wave 2 B1: theme cleanup of Admin* sections
0ff9847  Wave 2 B2: admin model collections
d394879  Wave 1 A5: KnownFieldsCard @core
1254511  Wave 1 A4: FlowStrip @core
74fcec5  Wave 1 A3: Timeline @core
cb91c4d  Wave 1 A2: StatusPanel @core
d997411  Wave 1 A1: foundations
```

### What was implemented

- **`Modal.detail()` default size** flipped from `'xl'` to `'lg'`. Behavior change — callers expecting `xl` now need to pass `{ size: 'xl' }` explicitly. Documented in CHANGELOG.
- **`DetailHeaderView.auxFn(model) -> htmlString`** — new right-gutter slot for inline state read-outs (presence dots, "Last seen 4m ago" lines, attempt counters). Trusted HTML; falsy result omits wrapper. Re-renders with the rest of the header on `model.set(...)`. Three unit tests added.
- **`StatusPanel`** (`@core/views/data/StatusPanel.js`) — hero "current state" panel extracted from `JobStatusPanel`. All options (`tone`, `state`, `headline`, `meta`, `icon`, `actions`) accept static value OR `(model) => value`. CSS moved from admin.css → core.css. 6 unit tests, full doc.
- **`Timeline`** (`@core/views/data/Timeline.js`) — vertical event-feed extracted from `JobLifecycleCard`. Items array OR `(model) => array`. CSS moved from admin.css → core.css. `setItems()` for live updates. 8 unit tests, full doc.
- **`FlowStrip`** (`@core/views/data/FlowStrip.js`) — horizontal STEP 1 → STEP 2 layout extracted from `RuleSetTriggeringSection`. Steps array OR `(model) => array`. CSS new in core.css under `.detail-flow-strip` namespace. Existing `.rs-flow*` rules in admin.css preserved for current `RuleSetView` (it migrates onto FlowStrip later). 9 unit tests, full doc.
- **`KnownFieldsCard`** (`@core/views/data/KnownFieldsCard.js`) — promotes known JSON keys to a 2-col label/value grid + collapsible raw `<details>` block. String/function formatters. Dotted-path key lookup. Reuses the flat-row primitives. 12 unit tests, full doc.
- **Flat-row primitives moved** to core.css (were briefly in admin.css after A1; KnownFieldsCard depends on them so they're framework-level). `.detail-section`, `.detail-section-eyebrow`, `.detail-section-action`, `.detail-flat-row*`. `.detail-field-card*` deprecated by comment in admin.css; not deleted yet — call-sites cleared in Wave 3.
- **`SimilarJobsList`**, **`ActiveJobsList`** (Job.js), **`RelatedIncidentsList`** (Incident.js) — thin Collection subclasses with default filter params for the new sections in B4 + Wave 3. Zero backend HTTP API changes — every endpoint and filter is verified existing.
- **Admin user sections theme cleanup** — deleted inline `<style>` blocks (with hardcoded `#adb5bd`/`#f0f0f0`/`#6c757d`/`#212529`/`#0d6efd` light-only values) from `AdminPersonalSection`, `AdminProfileSection`, `AdminConnectedSection`, `AdminSecuritySection` (3 blocks across 4 files). Templates now use `.detail-section-eyebrow` + `.detail-flat-row` framework primitives plus Bootstrap utility badges (`text-bg-success`, `text-bg-warning`, `text-secondary fst-italic`). Structural CSS for AdminConnectedSection (OAuth rows), AdminSecuritySection (action items), and the two inner `Modal.dialog` views (passkey list, recovery codes) moved to admin.css using Bootstrap tokens — dark theme works automatically.
- **Test loader** (`test/utils/simple-module-loader.js`) registered all 4 new primitives.
- **CHANGELOG.md** has one section per commit.

### Tests

- Full unit suite: **801/801 passing** (35 new cases added across the 4 primitives + auxFn).
- Lint: clean on every file touched. 9 pre-existing lint-failing files unchanged.

### What's still pending

- **Wave 2 B4 — JobDetailsView precedent migration**. Swap `JobStatusPanel` and `JobLifecycleCard` for `@core` `StatusPanel` / `Timeline`; convert section views from `_buildTemplate()` to Mustache + DataFormatter; add Retry History section (using existing `JobEventList` filtered by `?event=retry`); add Similar Jobs section (using `SimilarJobsList`). Also: header `auxFn` for state-aware metadata. Regression test recommended.
- **Wave 3 — 8 per-view sweeps**. Each gets its own session/PR using JobDetailsView as the canonical example after B4 lands. Briefing template documented in this file's Phase E section. Distribute as parallel worktree agents or sequential focused sessions.

### Recommended next session

Either:

1. `/build planning/requests/detailview-migration-rethink.md` — focused on Wave 2 B4 only.
2. Spawn a worktree agent: `Agent({ description: 'Wave 2 B4: JobDetailsView precedent', subagent_type: 'general-purpose', isolation: 'worktree', prompt: '<self-contained brief pointing at the plan>' })`.

After B4 lands, Wave 3 fans out as 8 parallel worktree agents using the briefing template in this file.

### Validation agents dispatched

Three background agents reviewed the partial-completion checkpoint:

- **test-runner** ✅ — confirmed full `npm test` introduces no new
  failures over the prior commit. Pre-existing infrastructure
  failures (integration ESM alias resolution, build artifact paths,
  bundle-size cap, missing source maps) are unchanged. 801/801
  unit suite remains green.
- **docs-updater** ✅ — added the 4 new primitives to
  `docs/web-mojo/README.md` (Components list + directory tree) and
  `docs/agent/architecture.md` (`views/data/` source-map row).
  Committed as `04914cd Index Wave 1 primitives in docs README +
  architecture map`.
- **security-review** ✅ — two findings, both addressed:
  1. **LOW** — `RuleSetView.js:378` STEP 1 `matchValue` interpolated
     without `escapeHtml()` while sibling cells did. Pre-existing
     inconsistency, not introduced by this work, but fixed for
     hygiene.
  2. **INFO** — JSDoc on the 4 trusted-HTML slots
     (`StatusPanel.meta`, `Timeline.items[].detail`,
     `FlowStrip.steps[].value`/`.hint`, `DetailHeaderView.auxFn`)
     said "trusted HTML" but didn't explicitly tell callers to
     escape user-controlled data. Each docblock now has a
     "Security note:" paragraph naming the slot and recommending
     `MOJOUtils.escapeHtml(...)`.

  Both fixes committed as `b737cfd Address security review findings`.

  Other security checks (prototype-traversal hardening in
  `KnownFieldsCard._lookup`, `dataFormatter.apply` pipe-lookup
  surface, raw JSON `<details>` block escaping, all admin consumer
  call sites of the trusted-HTML slots) came back clean.
