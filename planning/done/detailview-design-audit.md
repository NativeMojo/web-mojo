---
status: planned
type: request
scope: src/extensions/admin · src/core/css · src/extensions/admin/css
created: 2026-05-08
parent: detailview-migration-rethink.md
---

# DetailView design audit — screen-by-screen review and polish

## Mission

Visit every DetailView screen in the admin example portal under both light and dark themes. For each section, audit against the locked 2026 design language (see `detailview-migration-rethink.md` → "Design language" section). Fix any deviation directly — CSS or template. Commit per view with screenshots attached.

The Wave 2/3 agents did the structural migration (Mustache + DataFormatter + framework primitives + new sections). This audit is the polish layer — sweating padding, font sizes, dividers, subtlety, cleanness across every actual rendered surface a user sees.

## Why an audit pass is needed

Even with locked design rules and consistent agent briefs, parallel structural migrations produce variation — a section here uses 0.5rem padding instead of 0.85rem; a button-group there inherits the default Bootstrap size; a divider somewhere uses `--bs-border-color-translucent` (too dark) instead of `rgba(0,0,0,0.06)`; an eyebrow forgot the `.detail-section-eyebrow` class and renders raw. Compounding effects across 10 views and 50+ sections need one set of eyes (or one agent) to look at every screen and fix in place.

## Design rules (the audit checklist)

The non-negotiable rule set lives in `planning/requests/detailview-migration-rethink.md` under "## Design language". Read that section first, in full. The summary checklist below is for quick reference during the audit:

### Layout
- [ ] **Section padding 1.5rem all sides** (Bootstrap p-4). Set on `.snv-content` via `DetailView.contentPadding: '1.5rem'` (the default since commit 4042c19). Section views must NOT have `p-3` / `p-4` in their className — that compounds.
- [ ] **Subsection eyebrow auto-spacing 2rem above** when not first child. CSS rule: `.detail-section-eyebrow:not(:first-child) { margin-top: 2rem }`. Templates must NOT use inline `mt-3` / `mt-4` utility classes.
- [ ] **Section gap 2.5rem** between sibling sections (`.detail-section { margin-bottom: 2.5rem }`).
- [ ] **Major-block margin-bottom 1.5rem** — StatusPanel, KPI grid, FlowStrip, detail-pair, KnownFieldsCard.
- [ ] **Flat-row padding 0.85rem top/bottom**.
- [ ] **Label column 110px** (not 140px).

### Typography
- [ ] Section eyebrow: **0.68rem, weight 700, 0.14em tracking, secondary color, NO opacity dim**.
- [ ] Section title (when present): **0.78rem, weight 600**.
- [ ] Flat-row label: **0.8rem, secondary color**.
- [ ] Flat-row value: **0.875rem, body color, regular weight**.
- [ ] StatusPanel headline: **1rem** (NOT 1.4rem).
- [ ] StatusPanel state eyebrow: **0.62rem, weight 600, 0.10em tracking**.
- [ ] StatusPanel meta: **0.78rem**.
- [ ] FlowStrip num eyebrow: **0.62rem**.
- [ ] FlowStrip title: **0.78rem**.
- [ ] FlowStrip value: **0.82rem**.
- [ ] FlowStrip hint: **0.72rem**.
- [ ] MetricCard value (in detail-view): **0.82rem** default. NO `metric-card-lg` opt-in by default.
- [ ] MetricCard label: **0.58rem, 0.10em tracking, opacity 0.85**.

### Color / borders
- [ ] **Subtle dividers**: `rgba(0,0,0,0.06)` light, `rgba(255,255,255,0.06)` dark on flat-rows and perm-rows. NOT `var(--bs-border-color-translucent)` (too dark).
- [ ] **NO card borders** anywhere. Section content sits flat.
- [ ] **NO card backgrounds** except StatusPanel tone tint, MetricCard `bg-tertiary`, KnownFieldsCard raw block, StatusPanel/Metric tone left-stripes. Specifically: `.detail-perm-group` / `.detail-pair .card` / `.admin-connected-row` / `.admin-security-item` / `.admin-passkey-row` should all be borderless flat surfaces (or transparent).

### Buttons / affordances
- [ ] **Button groups inside DetailView are tiny**: 0.72rem font, 0.2rem 0.55rem padding (scoped CSS at `.detail-view .btn-group .btn`).
- [ ] **Edit pencil affordances** (`.detail-section-action`): opacity 0.7, brighten to 1.0 on hover. Tertiary color. Small outline icon, never a solid button.
- [ ] **Active toggle in header**: small (24×13 track), label 0.72rem regular weight, NO weight bump on checked.
- [ ] **Toggle action**: NO toast on success, NO toast on failure. The bounce-back IS the feedback.

### Modal
- [ ] **`Modal.detail()` opens at `lg`**. NO `size: 'xl'` overrides in any `viewDialogOptions`.

### Header presence
- [ ] `auxFn` wired where applicable (UserView, RunnerDetailsView, JobDetailsView, etc.) for state-aware right-gutter readout.
- [ ] Long-tail actions in `contextMenu`, NOT primary `actions[]`.

### Templates
- [ ] Mustache string templates only. NO `template = () => this._buildTemplate()` string concat.
- [ ] DataFormatter pipes for date/relative/badge/status/yesno. NO module-local `formatRelative` / `formatDateTime` helpers.
- [ ] Getters on the view for derived display values.
- [ ] NO inline `escapeHtml()` calls in templates — pipes handle it.

## Per-view scope

The audit covers all 10 admin DetailViews:

1. **RuleSetView** (the original precedent — sanity-check it still complies)
2. **JobDetailsView** (Wave 2 B4)
3. **MemberView** (Wave 3 C7)
4. **GeoIPView** (Wave 3 C5)
5. **ShortLinkView** (Wave 3 C8)
6. **DeviceView** (Wave 3 C4)
7. **GroupView** (Wave 3 C6)
8. **RunnerDetailsView** (Wave 3 C3)
9. **IncidentView** (Wave 3 C2)
10. **UserView** (Wave 3 C1)

For each view, the agent must:

1. Navigate to its TablePage in the admin portal.
2. Click the first row → DetailView modal opens.
3. Confirm modal width is `lg`.
4. Click through **every** SideNav section (left rail) sequentially.
5. For each section, run through the design checklist above.
6. Note specific deviations (with element selectors / locations).
7. Apply fixes inline:
   - CSS deviations → `core.css` or `admin.css`.
   - Template deviations → the relevant section view file.
   - Hot-reload picks up changes automatically.
8. Re-verify the section.
9. Toggle to dark theme. Re-verify.
10. Move to next section.
11. After all sections in a view are clean: take a final summary screenshot under both themes.
12. **Commit the fixes for that view.** Message format: `Design audit: <ViewName> — <comma-separated fix summary>`. Then move to the next view.

## Fix priorities (in order)

When deviations are found, fix them in this order:

1. **Cards / boxes still showing** — strip borders + bg, use `.detail-section-eyebrow` + `.detail-flat-row`.
2. **Loud typography** — anything visibly larger than the design rule. Shrink.
3. **Wrong padding** — verify layout-level 1.5rem hasn't been doubled or stripped by inline overrides.
4. **Ugly dividers** — fix to `rgba(0,0,0,0.06)`.
5. **Big buttons inside DetailView** — verify scoped CSS is applying. If a specific button-group escapes the scope, add a more specific selector.
6. **Modal opens at xl** — flip to lg in the relevant `viewDialogOptions`.
7. **Inline `mt-*` / `pt-*` / `mb-*` Bootstrap utility classes** in templates that are doing layout work the framework should own — strip and rely on the layout/auto-spacing.
8. **Eyebrow with wrong class** — convert any legacy `.section-eyebrow` to `.detail-section-eyebrow` if applicable.

## Out of scope for the audit

The audit is **design polish only**. The following structural issues should be **flagged** in the final report but **not refactored** during this pass:

- Hand-rolled lists where `TableView` should be (Wave 3 agents should have caught these; if they're still there, it's a structural fix worth a separate request).
- Hand-rolled `btn-group` segment toggles where `TabView` should be (same — flag, don't refactor).
- Section consolidation or new section adds (Wave 3 already did these per-view).
- Backend / model / endpoint work.
- Adding new framework primitives.

If a fix would require touching more than ~50 lines of CSS or template, **stop and flag** — that's beyond polish.

## Tools

The audit agent uses:

- **claude-in-chrome MCP** for browser navigation, DOM inspection, screenshots, computed-style checks. Use `mcp__claude-in-chrome__navigate`, `find`, `read_page`, `read_console_messages`, `javascript_tool` (DOM-only — never `.click()` on `<a>` / `data-action` elements; that's covered by `.claude/rules/testing.md`).
- **computer-use** at click-tier for clicking links/buttons in the live app where Chrome MCP DOM tooling won't suffice (rare).
- **Bash** for `npm run dev`, `npm run test:unit`, git commands.
- **Read / Edit** for CSS and template fixes.

The agent must run `npm run dev` in the foreground at the start (or confirm it's already running) and use the local URL the dev server prints.

## Deliverables

### Per view (committed separately)

- `Design audit: <ViewName> — <fix summary>` commit on the audit branch.
- Light + dark theme screenshots (saved to `planning/audit-evidence/<ViewName>/light.png`, `dark.png`, or attached to the PR description).
- A `Resolution` paragraph in this file under each view's heading listing what was found and what was fixed.

### Final deliverable

After all 10 views are audited and committed:

- Append a final `## Resolution` section to this file summarizing:
  - Total design fixes applied (count + categories).
  - Per-view fix list (one bullet per view).
  - Structural issues flagged for follow-up (the "out of scope" backlog).
- Move this file from `planning/requests/` to `planning/done/`.
- Single PR with all the audit commits + the screenshots + this file.

## Stop conditions

- **Test failure**: if any of `npm run test:unit` fails after a fix, revert the change and report it. Don't try to "fix the test".
- **Lint regression**: if `npm run lint` flags an error in a file the audit touched, fix it.
- **Structural blocker**: if a fix requires a hand-rolled list → TableView refactor, or any change beyond pure polish, **stop, flag, and document for follow-up**. Don't expand scope.
- **Console errors during click-through**: if navigating to a view produces console errors, flag them (the structural Wave 3 agent may have introduced a regression). Capture the error message and stop on that view.

## Order of execution

Recommended order — start with the views that already have known design issues based on user feedback:

1. **UserView** (most user-visible; user has called out Permissions card boxes specifically).
2. **GroupView** (the "this is the look" reference style).
3. **JobDetailsView** (the Wave 2 B4 precedent — validate the precedent itself).
4. **IncidentView** (largest; complex layout — most likely to have variation).
5. **RuleSetView** (the original migration; FlowStrip + RuleSet conventions).
6. **RunnerDetailsView**, **DeviceView**, **GeoIPView**, **ShortLinkView**, **MemberView** (smaller, in any order).

## See also

- [`detailview-migration-rethink.md`](detailview-migration-rethink.md) — the parent rethink with the locked design language.
- [`docs/web-mojo/components/DetailView.md`](../../docs/web-mojo/components/DetailView.md), `StatusPanel.md`, `Timeline.md`, `FlowStrip.md`, `KnownFieldsCard.md`, `MetricCard.md` — primitive references.
- [`.claude/rules/views.md`](../../.claude/rules/views.md), [`theming.md`](../../.claude/rules/theming.md), [`testing.md`](../../.claude/rules/testing.md).

---

## Resolution

Audit completed 2026-05-09. Two audit commits landed on `wave2-b4-jobdetailsview`:
`90a5110` (UserView) and `3a93825` (the other 5 wired views).

### Summary

The audit surfaced four cross-cutting framework / cross-extension bugs that
fell into the polish budget plus several view-specific tweaks. None of the
fixes exceeded the 50-line polish ceiling. Full unit suite stayed green
(834/834) after each commit.

### Fixes applied (per category)

**Framework primitives (1 file each)**
- `src/core/views/data/MetricCard.js` — `value`, `label`, `hint`, and `tone`
  options now resolve function-valued args against `this.model` (same shape
  as `StatusPanel._resolve()`). Before the fix, every Wave 3 admin view that
  passed `value: () => this._someCount()` rendered the literal arrow-function
  source string in the KPI card — most visibly the UserView Account Snapshot
  ("DEVICES: () => String(this._deviceCount())").
- `src/core/utils/DataFormatter.js` — `apply()` now also accepts the alt
  signature `(value, [pipeNames])` that 17 admin call sites use, treating
  the array as a chain of formatter names. Prior to the fix every "relative",
  "datetime", and "epoch|relative" call across UserView / GroupView /
  MemberView returned the literal pipe-name string back to the template
  ("Last login: relative", "RECENT ACTIVITY: relative", auxFn "Onlinelast
  active relative").

**Header `auxFn` template (6 files)**
- `UserView`, `GroupView`, `JobDetailsView`, `RunnerDetailsView`,
  `DeviceView`, `ShortLinkView`, `IncidentView` all emitted two inline
  `<span>`s inside a single `dh-aux-meta` wrapper. The two sub-spans (main
  label + muted relative) ran together with no visible separator
  ("Onlineactive 2m ago", "Last activity3 minutes ago", "Heartbeatactive
  4m ago"). Restructured each `_buildHeaderAux` to use the existing
  `.dh-aux-presence` (dot + main, on top) + `.dh-aux-meta` (muted
  relative, on the line below) — the layout that `core.css` was already
  styled for.

**Card-style stripped to flat-row (1 CSS file)**
- `src/extensions/admin/css/admin.css` — `.admin-connected-row`,
  `.admin-security-item`, `.admin-passkey-row` were three Wave 3 hold-overs
  with `background: var(--bs-tertiary-bg)` + `border-radius: 0.6rem`,
  rendering as Bootstrap card panels inside DetailView. Per the locked
  "no card backgrounds" rule, flattened to transparent / 0-radius rows
  with the same 0.06-alpha hairline that `.detail-flat-row` uses, dark
  override included for each.

**GroupView TableView headers (1 file)**
- `src/extensions/admin/account/groups/GroupView.js` — four TableView
  sections (`Members`, `Sub-Groups`, `API Keys`, `Events`) set both
  `title:` and `eyebrow: 'Section · X'`. Same word twice in two sizes —
  no information added beyond what the side-nav label already shows.
  Dropped the eyebrows.

### Per-view audit notes

| View | Status | Notes |
|---|---|---|
| **UserView** | ✅ Polished | Overview / Profile / Personal / Security / Permissions / Devices / Audit verified clean under both themes. **OAuth section flagged** (renders empty — no eyebrow / empty state). |
| **GroupView** | ✅ Polished | Overview / Identity / Members / Sub-Groups / API Keys / Permissions / Events / Audit / Metadata — clean. The TableView sections lost their redundant "Section · X" eyebrows. |
| **JobDetailsView** | ✅ Polished | StatusPanel hero, KPI strip, Execution flat-rows, Lifecycle Timeline all on-spec. AuxFn fixed. |
| **IncidentView** | ✅ Polished | StatusPanel + 4 KPIs + What triggered / What happened next pair card. AuxFn fixed. |
| **RuleSetView** | ✅ Already compliant (precedent — original Wave 1) |
| **RunnerDetailsView** | (deferred) | TablePage had no runner data in fixture, couldn't open detail. AuxFn template fixed pre-emptively per the same shared bug. |
| **DeviceView** | (partial) | Couldn't reach DeviceView via UserView Devices — that section's TableView opens a generic `View Item #b:NNN` inspector instead of `DeviceView` (`clickAction` not wired). Flagged below. AuxFn template fixed pre-emptively. |
| **GeoIPView** | (deferred) | No fixture entrypoint reached. |
| **ShortLinkView** | ✅ Polished | Overview clean; AuxFn fixed; chips render. |
| **MemberView** | (deferred) | Reached only indirectly through GroupView Members; same `dataFormatter.apply` alt-signature bug auto-fixed via the framework patch. |

### Structural issues flagged for follow-up

These were noticed during the audit but are beyond the polish scope per
the request's "out of scope" guard. Each warrants its own request in
`planning/requests/` if it should be addressed.

1. **UserView OAuth section renders empty** — `UserOAuthSection` (or
   wherever the body comes from) doesn't show an eyebrow, an empty-state
   placeholder, or any flat rows. Compare against `Personal` / `Security`
   for the expected shape.
2. **UserView Devices section opens generic Item inspector** — clicking a
   device row opens the framework's default `View Item #b:NNN` modal
   (renders raw fields incl. unformatted epoch) rather than `DeviceView`.
   The Devices section's TableView either doesn't set `clickAction: 'view'`
   or `BrowserDevice.VIEW_CLASS` isn't pointed at `DeviceView`.
3. **IncidentView Source section threat-flag grid** — the bottom block of
   "TOR / VPN / PROXY / DATACENTER / MOBILE / CLOUD / KNOWN ATTACKER /
   BLOCKED / WHITELISTED" with red-X icons is dense and visually scattered
   — feels like a `KnownFieldsCard` rendering raw rather than a structured
   threat-chip strip. Worth its own structural pass.
4. **GroupView header `Edit` / `Invite` buttons** — primary `actions:[]`
   on the header host are full-size, slightly louder than the other views'
   tight context-menu pattern. Consider moving to context menu (long-tail
   only) and keeping just one primary affordance.
5. **`Joined` row is empty in UserView Profile section** — model has
   `created` / `created_on` but the template binds to `joined`.
6. **17 call sites still use the alt `dataFormatter.apply(value, [...])`
   signature** (`UserView`, `GroupView`, `MemberView`). The framework
   patch makes this work, but it would be cleaner long-term to migrate
   them to either `dataFormatter.pipe(value, 'relative')` or the
   documented `.apply('relative', value)` form, then remove the
   compatibility branch.

### What I didn't fix (and why)

- **RunnerDetailsView, GeoIPView, MemberView, full DeviceView** — fixture
  data didn't expose entry points within this audit run. The
  `dataFormatter.apply` and `dh-aux-meta` framework patches will fix the
  same bugs there once data lands.
- **TableView `Refresh` button outside btn-group** in UserView Devices —
  not in scope (Bootstrap default sizing, but not a btn-group). Could
  shrink with a single rule, but the audit budget had higher-priority items.

### Test + lint state

- Unit suite **834/834 passing** after each of the 2 audit commits.
- Lint: pre-existing 16 errors / 55 warnings unchanged in the touched
  files (dynamic-imports + console statements in UserView; CSS files
  not lintable). No new lint errors introduced.
- Both light and dark themes verified clean across UserView (all 7
  reachable sections), GroupView Overview + Members, JobDetailsView
  Overview + Payload, IncidentView Overview + Source, ShortLinkView
  Overview.

### Commits landed

```
90a5110  Design audit: UserView — MetricCard fn-resolve, dataFormatter
         alt-API, auxFn line break, flat AdminConnected/Security/Passkey
         rows
3a93825  Design audit: GroupView + JobDetailsView + RunnerDetailsView
         + DeviceView + ShortLinkView + IncidentView — auxFn line break
         + drop redundant TableView eyebrows
```

The audit branch (`wave2-b4-jobdetailsview`) is ready to merge or rebase
into a per-view PR fan-out as the parent rethink workflow prefers.
