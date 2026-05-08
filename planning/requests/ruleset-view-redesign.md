# RuleSetView Redesign + Supporting Framework Primitives

| Field | Value |
|-------|-------|
| Type | request |
| Status | planned |
| Date | 2026-05-08 |
| Priority | high |

## Description

Redesign [`src/extensions/admin/incidents/RuleSetView.js`](src/extensions/admin/incidents/RuleSetView.js) into a modern, security-operator-grade detail view that matches the polish of [`IncidentView.js`](src/extensions/admin/incidents/IncidentView.js) and adds three critical capabilities the current view is missing:

1. **`metadata.agent_prompt`** — editable LLM agent prompt used by the `llm://` handler when triaging incidents created by this RuleSet. This is the highest-value missing field; without it operators cannot tune how their LLM handler reasons about the rule.
2. **"Incidents" section** — a TableView of recent incidents this RuleSet has actually fired against, so an operator can validate that a rule is doing what they expect.
3. **Coherent visual layout** — replace the 2-tab `TabView` (Configuration | Rules) with a `SideNavView`-based section layout that mirrors `IncidentView`. The current "Configuration" tab is a flat 13-field `DataView` grid that buries the most important information (handler chain, thresholds, agent prompt). The Thresholds editor screen ([screenshot in request](planning/requests/ruleset-view-redesign.md)) packs three tiny inputs across one cramped row — needs visual hierarchy and inline explanation.
4. **Full metadata visibility** — every key on `ruleset.metadata` should be visible to the operator (today, only `delete_on_resolution` is reachable via the form; `reasoning`, `assistant_proposed`, `agent_prompt`, and any future / custom keys are invisible). Mirror the structured-known-fields-plus-raw-JSON pattern that `IncidentView` already uses for its metadata section.
5. **Ship the framework primitives this design needs** — three small additions/extensions to `src/core/` so the RuleSetView (and future detail views) can compose this look without one-off implementations. See [Framework Primitives](#framework-primitives) below.

## Framework Primitives

Three small primitives live in this same request so the RuleSetView build doesn't have to ship temporary implementations and migrate later. Each is additive — no breaking change to existing callers.

### 1. `SideNavView` — badge support
- **Schema addition.** Section entries gain an optional `badge` key: either a string/number (`badge: 42`) or an object (`badge: { text: '42', variant: 'primary' | 'muted' | 'warning' | 'danger' }`). Default variant is `muted`. Falsy values render no badge.
- **Dynamic update.** New instance method `sideNav.setBadge(key, value)` — accepts the same shapes as the schema, re-renders just the affected nav link. Critical because counts (Incidents, Conditions) aren't known until the section view fetches.
- **Visual.** Right-aligned pill inside the rail link; mono font for numbers; the active section's badge inverts (white on primary) to mirror the active-link color treatment.
- **File:** [`src/core/views/navigation/SideNavView.js`](src/core/views/navigation/SideNavView.js).
- **Doc:** update [`docs/web-mojo/components/SideNavView.md`](docs/web-mojo/components/SideNavView.md) Section Schema table.

### 2. `SegmentControl` — new component
- **Purpose.** A small horizontal pill-button group bound to a single value, like the 7d / 30d / 90d picker on the Incidents section. Generic enough for any one-of-N filter (range pickers, view modes, status segments).
- **Constructor:**
  ```js
  new SegmentControl({
      options: [{ value: '7d', label: '7d' }, { value: '30d', label: '30d' }, { value: '90d', label: '90d' }],
      value: '30d',
      size: 'sm', // 'sm' | 'md'
  })
  ```
- **Events:** emits `change` with `{ value, previous }`. Caller is responsible for translating that into a collection params update — no auto-binding, keeps the component dumb.
- **Theming.** Uses Bootstrap tokens (`--bs-tertiary-bg`, `--bs-primary`, `--bs-border-color`); dark-aware from day one.
- **File (new):** `src/core/views/forms/SegmentControl.js` (the closest existing neighbor to where toggle-style inputs live; verify the right path against `src/core/forms/` during design).
- **Doc (new):** `docs/web-mojo/components/SegmentControl.md` and a row in `docs/web-mojo/README.md`.

### 3. `MetricCard` — new component
- **Purpose.** The 4-card "At a glance" row pattern used in the mockup's Overview section. Same shape appears in `IncidentView`'s overview today (hand-rolled) and across the security dashboard. Lifting it DRYs three views.
- **Constructor:**
  ```js
  new MetricCard({
      label: 'Incidents (30d)',
      value: 42,           // string, number, or { text, formatter }
      icon: 'bi-shield',   // optional
      tone: 'default',     // 'default' | 'success' | 'warning' | 'danger' | 'info'
      hint: '14 minutes ago', // optional secondary line
      action: 'view-incidents', // optional — emits action via standard data-action pipeline
  })
  ```
- **Layout:** a flex row of MetricCards composes naturally — no built-in grid; caller arranges. Avoids re-inventing layout primitives.
- **File (new):** `src/core/views/data/MetricCard.js` (sibling to `DataView.js`, `StackTraceView.js`).
- **Doc (new):** `docs/web-mojo/components/MetricCard.md`.

### What stays out of scope (intentionally)

- **TableView extensions.** The "section head with toolbar above + table below" pattern is already idiomatic via parent View + child containers. TableView's existing `showAdd` already handles the right-justified add button. Adding toolbar slots to TableView would leak presentation concerns into a data component.
- **Rebuilding `IncidentView` to use `MetricCard`.** Worth doing eventually but out of scope for this request — let the new component prove itself in RuleSetView first, then migrate.

## Context

### Why operators look at a RuleSet
A RuleSet is the operator's primary tool for tuning incident generation in production. When they open one, they are typically trying to answer one of:

| Question | Today | After redesign |
|---|---|---|
| "Is this rule actually firing?" | No way to see — must navigate away to incidents page and filter manually | Incidents section shows last N hits |
| "What does the LLM agent say when it gets one of these?" | Field doesn't exist | Agent Prompt section, dedicated editor |
| "How does this rule trigger, exactly?" | Must read 6 numeric fields scattered in a grid and infer the relationship | Triggering section with a single visual diagram: Match → Bundle → Threshold → Handler |
| "What handlers fire?" | A raw URI string in a grid row | Handler section showing the parsed chain as cards with icons |
| "Why does this rule exist?" | `metadata.reasoning` is invisible | Header subtitle / Overview panel |

### What's missing right now
- No surfacing of `metadata.reasoning`, `metadata.assistant_proposed`, `metadata.delete_on_resolution`, or `metadata.agent_prompt` (the last one isn't even editable in the form).
- No incidents view — operator can't validate behavior without leaving the screen.
- Header is plain, no description, no active/inactive pill, no quick toggle.
- Handler chain is shown as a raw URI; the existing [`HandlerBuilderView`](src/extensions/admin/security/HandlerBuilderView.js) is only reachable via a context-menu action.
- Thresholds editor (see attached screenshot) has no visual flow — three numeric inputs sit beside each other with terse placeholders.

### Existing patterns to reuse
- [`IncidentView.js:1407–1416`](src/extensions/admin/incidents/IncidentView.js:1407) — section-based layout with `SideNavView`, conditional sections, contextual actions
- [`SideNavView`](docs/web-mojo/components/SideNavView.md) — preferred over `TabView` for 3+ sections per the docs
- [`HandlerBuilderView`](src/extensions/admin/security/HandlerBuilderView.js) — already does parsed handler editing; can be embedded read-only in a Handler section
- [`RuleEngineSection`](src/extensions/admin/incidents/IncidentView.js:808) — rules table + ruleset summary; the redesigned RuleSetView should be a richer version of this
- `metadata.delete_on_resolution` already wired through `RuleSetForms.create/edit` with dotted field paths — `metadata.agent_prompt` follows the same pattern

## Acceptance Criteria

- [ ] `RuleSetView` uses `SideNavView` (not `TabView`) with the section layout listed under **Investigation → What changes**.
- [ ] A header card sits above the SideNavView showing: icon, name (large), `metadata.reasoning` as subtitle (when present), category badge, priority pill, active/inactive switch, and an `assistant_proposed` indicator.
- [ ] **Agent Prompt** section: textarea-style editor for `metadata.agent_prompt` with a Save button. When the handler chain contains `llm://`, the section shows a "Used by LLM Triage" hint; when it does not, the section shows a "Add `llm://` to your handler chain to use this prompt" notice (still editable).
- [ ] **Incidents** section: `TableView` of `IncidentList` filtered by `rule_set=<id>`, with columns `id, created, status, priority, title, event_count`. Includes click-through to the existing `IncidentView` modal.
- [ ] **Triggering** section presents bundling + thresholds together as a labeled visual flow (Match → Bundle → Threshold → Re-trigger), with each step inline-editable via a small "Edit" pencil that opens the existing `RuleSetForms.edit` form pinned to the matching tab. Empty / immediate values render as friendly text ("Fire on first event", "All events count").
- [ ] **Handler** section parses the handler chain and renders each step as a card with the `HANDLER_TYPES` icon + label (reuse the metadata from `HandlerBuilderView`), plus a single "Edit Chain" button that opens the existing `HandlerBuilderView` modal flow already wired in `onActionEditHandler`.
- [ ] **Rules** section preserves today's `TableView` of rule conditions and its add/edit/delete/duplicate actions.
- [ ] **Overview** section shows: status badges, key counts (event_count_30d, last_fired_at — use what the API returns; fall back to "—" if absent), `metadata.reasoning`, and audit info (created/modified/assistant_proposed).
- [ ] **Metadata** section shows the full `metadata` object — known keys (`reasoning`, `assistant_proposed`, `delete_on_resolution`, `agent_prompt`) rendered as a structured `DataView` with friendly labels, plus a raw JSON dump for any other / future keys. Mirror the [`IncidentView` metadata section pattern](src/extensions/admin/incidents/IncidentView.js:1423) so an operator can see *every* key on the RuleSet's metadata, not just the ones the UI knows about. Section is hidden when `metadata` is empty.
- [ ] `RuleSetForms.create` and `RuleSetForms.edit` in [`src/extensions/admin/models/Incident.js`](src/extensions/admin/models/Incident.js) gain a new tab labeled "Agent" containing `metadata.agent_prompt` (textarea, full width, with helper text describing how it interacts with the `llm://` handler). The Thresholds tab visual is improved (see Constraints).
- [ ] All sections render correctly in light and dark theme (Bootstrap tokens, see `.claude/rules/theming.md`).
- [ ] `RuleSetView` continues to work hosted in a Modal (`size: 'xl', header: false`) and bounded-height — see [`SideNavView` modal-bounding pattern](docs/web-mojo/components/SideNavView.md).
- [ ] Existing context menu actions (`edit-ruleset`, `edit-handler`, `disable-ruleset`, `delete-ruleset`) are preserved; add `edit-agent-prompt` and `view-incidents`.
- [ ] **Framework primitive — `SideNavView` badges:** schema accepts `badge: <string|number|object>`; `setBadge(key, value)` instance method updates dynamically; existing callers (no badge specified) render unchanged. Doc updated.
- [ ] **Framework primitive — `SegmentControl`:** new component shipped with constructor options described above, emits `change`, themed via Bootstrap tokens, used by the Incidents section's 7d/30d/90d picker. Doc + README index updated.
- [ ] **Framework primitive — `MetricCard`:** new component shipped, used by the Overview section's 4 at-a-glance cards. Doc + README index updated.
- [ ] Both new primitives have at least a smoke unit test (mount + render + emit on change for SegmentControl; mount + render + action emit for MetricCard) per `.claude/rules/testing.md` ("behavior changes in a reusable framework primitive").
- [ ] `CHANGELOG.md` entry covering the two new components and the `SideNavView` badge addition.

## Investigation

- **What exists:**
  - [`RuleSetView.js`](src/extensions/admin/incidents/RuleSetView.js) — 261 lines, `TabView` with `Configuration` (flat DataView) + `Rules` (TableView). Context menu has 4 actions. Handler edit flow already uses [`HandlerBuilderView`](src/extensions/admin/security/HandlerBuilderView.js).
  - [`RuleSet`, `Rule`, `RuleList`, `RuleSetForms`, option arrays](src/extensions/admin/models/Incident.js:415-919) — endpoint `/api/incident/event/ruleset`. Forms already use dotted `metadata.*` paths for `delete_on_resolution`.
  - [`IncidentList`](src/extensions/admin/models/Incident.js:101) — endpoint `/api/incident/incident`, accepts query params; `IncidentTablePage` already filters by `metadata__rule_id`. The incident model has a `rule_set` foreign key (referenced at [`IncidentView.js:816`](src/extensions/admin/incidents/IncidentView.js:816)) — assumed filter param: `rule_set=<id>`.
  - [`SideNavView`](src/core/views/navigation/SideNavView.js) — section pattern proven by `IncidentView`, `FileView`, `IPSetView`.

- **What changes:**
  - **Rewrite** [`src/extensions/admin/incidents/RuleSetView.js`](src/extensions/admin/incidents/RuleSetView.js): replace the `TabView` shell with a header card + `SideNavView`. Extract per-section View classes inside the file (mirror `IncidentView` structure: `RuleSetOverviewSection`, `TriggeringSection`, `HandlerChainSection`, `AgentPromptSection`, `RuleSetIncidentsSection`).
  - **Edit** [`src/extensions/admin/models/Incident.js`](src/extensions/admin/models/Incident.js): add an "Agent" tab to `RuleSetForms.create` and `RuleSetForms.edit` containing `metadata.agent_prompt` (textarea, ~10 rows). Improve the Thresholds tab — keep the alert, but render the three threshold fields each at `columns: 12` with a small inline diagram or numbered step labels (`1. Count`, `2. Within window`, `3. Re-fire every`).
  - **Edit** [`src/core/views/navigation/SideNavView.js`](src/core/views/navigation/SideNavView.js) — add `badge` schema key + `setBadge()` method (see [Framework Primitives](#framework-primitives)).
  - **Add** `src/core/views/forms/SegmentControl.js` and `src/core/views/data/MetricCard.js` (see [Framework Primitives](#framework-primitives)). Verify final paths against existing neighbors during design.
  - No new model/collection classes required.

- **Constraints:**
  - Per `.claude/rules/api.md`: standard CRUD, no admin-scoped endpoints. The Incidents section uses the same `IncidentList` collection that the public IncidentTablePage uses.
  - Per `.claude/rules/views.md`: `this.model` is the binding, `data-action="kebab-case"` → `onActionKebabCase`, child views via `addChild()` + `containerId`, no manual `render()` after first mount.
  - Per `.claude/rules/theming.md`: tokens not hex literals; if a `<style>` block is emitted, both light + dark rules must coexist.
  - Hosted inside a Modal — must respect bounded height; `SideNavView` content panel scrolls within that envelope.
  - Save semantics: `metadata.agent_prompt` is a partial nested save. Per the user's existing memory (`feedback_backend_json_merge`), the backend merges JSONFields server-side, so the client can `save({ 'metadata.agent_prompt': value })` (or whatever shape `Model.save` uses for dotted paths in this repo — verify against the existing `metadata.delete_on_resolution` flow before implementing).
  - Permissions: gating not required (operators reaching this view already have `manage_security` per the handler defaults), but the `permissions` key on SideNavView sections is available if needed later.

- **Related files:**
  - [`src/extensions/admin/incidents/RuleSetView.js`](src/extensions/admin/incidents/RuleSetView.js) — primary rewrite target
  - [`src/extensions/admin/models/Incident.js`](src/extensions/admin/models/Incident.js) — form additions
  - [`src/extensions/admin/incidents/IncidentView.js`](src/extensions/admin/incidents/IncidentView.js) — reference for section/SideNav pattern
  - [`src/extensions/admin/security/HandlerBuilderView.js`](src/extensions/admin/security/HandlerBuilderView.js) — reused for handler editing + parsed icons/labels
  - [`docs/web-mojo/components/SideNavView.md`](docs/web-mojo/components/SideNavView.md), [`docs/web-mojo/components/DataView.md`](docs/web-mojo/components/DataView.md), [`docs/web-mojo/components/TableView.md`](docs/web-mojo/components/TableView.md)

- **Endpoints:**
  - No new endpoints. Uses existing `/api/incident/event/ruleset` (CRUD), `/api/incident/event/ruleset/rule` (rules), `/api/incident/incident?rule_set=<id>` (incidents-by-ruleset filter — verify this query param is honored by the backend before relying on it; if not, fall back to `metadata__rule_set=<id>` or whatever filter the backend exposes).

- **Tests required:**
  - Manual verification under light + dark theme via `npm run dev` and the example portal (the current `RuleSetView` has no unit tests; framework rule is to add tests when reusable framework primitives change — this is an extension view, so visual sign-off is the gate).
  - Smoke: open a RuleSet from the RuleSet table, every section mounts, agent_prompt save round-trips, incidents section loads.

- **Out of scope:**
  - Backend changes — adding `agent_prompt` consumption to the `llm://` handler is server work, not framework work. The client just writes the field; the server-side LLM handler will need a parallel change, tracked separately.
  - A timeline / "fired over time" chart on the RuleSet — interesting but defer until the simpler Incidents list is in.
  - Bulk rule import / cloning between RuleSets.
  - Permission gating sections — not needed today; operators reaching this view already have access.
  - Refactoring `IncidentView.RuleEngineSection` to share code with the new `RuleSetView` sections — tempting, but the embedded vs. full-screen contexts differ enough that a shared base class would be premature. Revisit after the rewrite stabilizes.

## Open Questions for Design Phase

1. **Agent prompt format** — plain textarea, or should we offer a "load template" affordance (e.g., default prompts per category)? Default to plain textarea for v1.
2. **Conditional Agent Prompt section** — show always (editable even when no `llm://` handler) or hide when not applicable? Recommendation: always show, with the "add `llm://` to use this" hint when not wired up.
3. **Inline-edit vs. modal-edit** for Triggering — the criteria above propose modal-edit (small pencil opens the existing form on the right tab). An inline edit would be richer but adds form state management. Defer.
4. **Incidents filter param** — confirm `rule_set=<id>` is the supported query param on `/api/incident/incident`. Otherwise fall back to `metadata__rule_set` or extend the backend.

---

**Next step:** Start a new session and run `/design planning/requests/ruleset-view-redesign.md` to produce the implementation plan, or just say "continue".

---

## Plan

### Objective

Land all four pieces of work in a single coherent change set:

1. Three additive framework primitives in `src/core/`: `SideNavView` badge support (+ overdue dark-theme migration), new `SegmentControl`, new `MetricCard`.
2. Form additions in `src/extensions/admin/models/Incident.js`: an "Agent" tab with `metadata.agent_prompt`, plus a Thresholds tab visual cleanup.
3. A complete rewrite of [`src/extensions/admin/incidents/RuleSetView.js`](src/extensions/admin/incidents/RuleSetView.js) using a header card + `SideNavView` with seven sections matching the [mockup](planning/mockups/ruleset/index.html).
4. Doc + CHANGELOG updates.

### Order of implementation

Build the primitives first so the rewrite consumes the real components, not stubs:

```
Step 1  → SideNavView badges + dark-theme migration
Step 2  → SegmentControl (new)
Step 3  → MetricCard (new)
Step 4  → Incident.js form updates (RuleSetForms.create/edit)
Step 5  → RuleSetView.js rewrite
Step 6  → Docs + CHANGELOG
Step 7  → Smoke tests for the two new primitives
```

Each step is independently committable but ships in the same PR.

### Steps

**1. `src/core/views/navigation/SideNavView.js` — badge support + dark-theme migration**

- Extend `_addSectionConfig` and `_buildSidebarNav` / `_buildDropdownNav` to honor an optional `badge` field on each section config. Accept three shapes:
  - `badge: 42` (number) or `badge: "42"` (string) — defaults to the `muted` variant
  - `badge: { text, variant }` — variants: `'muted' | 'primary' | 'warning' | 'danger' | 'success'`
  - falsy → no badge rendered
- Render badges as a right-aligned `<span class="snv-badge snv-badge-${variant}">…</span>` inside the link, using `escapeHtml` on `text`.
- Add `setBadge(key, value)`: updates the in-memory `sectionConfigs` entry for that key, then re-paints just the affected link (`querySelector('[data-section="${key}"] .snv-badge')`) without re-rendering the whole component. If the badge element doesn't exist yet (was falsy before), insert it; if `value` is falsy, remove it. Same logic for the dropdown variant — use `data-section` selectors to find both forms.
- **Dark-theme migration of the existing `<style>` block** (required, not bonus):
  - Swap hex literals to Bootstrap tokens where they map cleanly: `#f8f9fc` → `var(--bs-tertiary-bg)`, `#495057` → `var(--bs-body-color)`, `#e9ecef` → `var(--bs-secondary-bg)`, `#dee2e6` → `var(--bs-border-color)`, `#adb5bd` → `var(--bs-secondary-color)`.
  - Active link state (`background: #e7f1ff; color: #0d6efd`) needs an explicit `[data-bs-theme="dark"] .snv-nav a.active { background: rgba(77, 139, 255, 0.16); color: var(--bs-primary); }` — the `#e7f1ff` tint is too washed-out on dark.
  - Add a `[data-bs-theme="dark"]` block at the bottom of the `<style>` template (per `.claude/rules/theming.md`) clustering all dark overrides — even when most rules now use tokens, the active-state tint and the badge variants need explicit dark values.
- New CSS for badges (within the same `<style>` block):
  ```
  .snv-badge { margin-left: auto; font-size: 0.7rem; font-weight: 600;
               padding: 0.05rem 0.4rem; border-radius: 999px;
               font-family: var(--bs-font-monospace, monospace); }
  .snv-badge-muted   { background: var(--bs-secondary-bg); color: var(--bs-secondary-color); }
  .snv-badge-primary { background: var(--bs-primary); color: #fff; }
  …warning / danger / success follow the same shape using --bs-* tokens
  .snv-nav a.active .snv-badge-muted { background: var(--bs-primary); color: #fff; }
  ```
- Surgical scope: do not restructure `_buildSidebarNav`, do not change responsive behavior, do not touch `addSection` / `removeSection` other than what the badge field needs.

**2. `src/core/views/navigation/SegmentControl.js` — new component (sibling of `TabView.js`)**

- Reason for placement: `TabView` is in `views/navigation/` and is the conceptually closest neighbor (both are "pick one of N"). `forms/inputs/` is for FormView-bound inputs with validation/value plumbing; `SegmentControl` is a standalone view that emits `change`, not a form input. If FormBuilder integration is wanted later, register it via `INPUT_TYPES` in `forms/inputs/index.js` then.
- Constructor:
  ```
  new SegmentControl({
      options: [{ value, label, icon? }, …],   // required
      value: 'thirty',                          // default-selected value
      size: 'sm' | 'md',                        // default 'sm'
      ariaLabel: 'Time range',                  // optional
      ...viewOptions
  })
  ```
- Template emits a Bootstrap-flavored `btn-group` with `data-action="select"` and `data-value` on each button. Active button gets `btn-primary`; inactive get `btn-outline-secondary`. Wrap in `<div class="btn-group btn-group-${size}" role="group" aria-label="${ariaLabel}">`.
- `onActionSelect(event, element)` reads `element.dataset.value`, updates `this.value`, re-paints button classes (no full re-render — toggle classes only), then `this.emit('change', { value, previous })`.
- Public API:
  - `setValue(v, { silent: false })` — programmatic update
  - `getValue()` — current value
  - getter `value` for read access
- No styling overrides needed beyond what Bootstrap provides — `btn-outline-secondary` + `btn-primary` already have correct dark-theme treatment via Bootstrap tokens.
- Smoke test (`test/unit/SegmentControl.test.js`): mount, render, click an option, assert `change` event payload + `getValue()` reflects the new state, `setValue` with `silent: true` does not emit.

**3. `src/core/views/data/MetricCard.js` — new component (sibling of `DataView.js`)**

- Constructor:
  ```
  new MetricCard({
      label: 'Incidents (30d)',          // required
      value: 42,                          // required — string|number|object {text}
      icon: 'bi-shield-exclamation',     // optional
      tone: 'default',                    // 'default'|'success'|'warning'|'danger'|'info'
      hint: '14 minutes ago',             // optional secondary line
      action: 'view-incidents',           // optional — sets data-action on outer button
      ...viewOptions
  })
  ```
- Template:
  - When `action` is set: outer element is a `<button data-action="${action}">` (uses the standard `data-action` pipeline, parent receives `onActionViewIncidents` per the views.md rule).
  - When `action` is not set: outer element is a `<div>`.
  - Inner structure: optional small icon row, label (uppercase eyebrow), big value, optional hint.
- Bootstrap tokens for surface (`--bs-tertiary-bg`), border, text. Tone applies a small left-border accent (`border-left-width: 3px; border-left-color: var(--bs-${tone})`) — keeps it subtle, dark-aware, no per-tone hex literals.
- Smoke test (`test/unit/MetricCard.test.js`): mount, render, label/value visible; with `action` set, clicking emits via the parent's action handler; without `action` set, clicking does nothing; setter `setValue(v)` updates the visible number.

**4. `src/extensions/admin/models/Incident.js` — form updates**

- In both `RuleSetForms.create` and `RuleSetForms.edit`: add a new tab object **between** the existing `Handler` tab and any closing structure:
  ```
  {
      label: 'Agent',
      fields: [
          {
              type: 'html', columns: 12,
              html: `<div class="alert alert-info small mb-3">
                       <i class="bi bi-stars me-1"></i>
                       Used by the <code>llm://</code> handler when triaging incidents created by this rule.
                       Saved either way — even if no <code>llm://</code> step is in the chain.
                     </div>`
          },
          {
              name: 'metadata.agent_prompt',
              type: 'textarea',
              label: 'Agent Prompt',
              rows: 12,
              columns: 12,
              placeholder: 'You are a security analyst triaging…',
              tooltip: 'Free-form prompt the LLM handler receives alongside the structured incident summary.'
          }
      ]
  }
  ```
  - Dotted-path `metadata.agent_prompt` follows the existing `metadata.delete_on_resolution` precedent at [`Incident.js:505`](src/extensions/admin/models/Incident.js:505) and [`Incident.js:668`](src/extensions/admin/models/Incident.js:668) — no model-side change needed.
- **Thresholds tab visual cleanup** in both forms:
  - Replace the existing `columns: 4` triplet (which produced the cramped row in the screenshot) with full-width fields, each prefixed by an HTML step label:
  ```
  { type: 'html', columns: 12, html: '<div class="text-muted small fw-semibold mb-1">1. Count — events before fire</div>' },
  { name: 'trigger_count', type: 'number', label: '', placeholder: 'Empty = fire immediately', columns: 12 },
  { type: 'html', columns: 12, html: '<div class="text-muted small fw-semibold mt-3 mb-1">2. Within window — count only events in this many minutes</div>' },
  { name: 'trigger_window', …, columns: 12 },
  { type: 'html', columns: 12, html: '<div class="text-muted small fw-semibold mt-3 mb-1">3. Re-trigger — re-fire every N additional events</div>' },
  { name: 'retrigger_every', …, columns: 12 },
  ```
  - Keep the existing alert at the top of the tab.
- No new model classes, no endpoint changes.

**5. `src/extensions/admin/incidents/RuleSetView.js` — full rewrite**

- File structure mirrors [`IncidentView.js`](src/extensions/admin/incidents/IncidentView.js) (section views as classes inside the same file, `RuleSetView` at the bottom assembling them):
  - `parseHandlerChain(handlerString)` — small module-level helper that splits on `,`, then maps each fragment to the matching entry in `HandlerBuilderView`'s `HANDLER_TYPES` array via the `value` prefix; returns `[{ type, label, icon, raw, params }]`. Reuses the existing exported types — do **not** duplicate the array.
  - `RuleSetHeader extends View` — header card. `model` is the RuleSet. Renders icon, name, `metadata.reasoning`, chips (category badge, `Priority N`, `# ID`, `AI-proposed` if `metadata.assistant_proposed`, `Modified <relative>`), `Active` switch (toggles `is_active` via `data-action="toggle-active"`), Edit button, and a `ContextMenu` instance.
  - `RuleSetOverviewSection extends View` — uses 4× `MetricCard` for the at-a-glance row, plus two summary `<div>` blocks ("What triggers this rule" / "What happens when it fires") built from already-known values.
  - `RuleSetConditionsSection extends View` — wraps a `TableView` in a section-head + table layout. Uses the existing `RuleList` collection filtered by `parent: rulesetId`, columns + actions copied from the current implementation. The Add button is right-justified via the section head, not via a TableView toolbar slot — no TableView changes.
  - `TriggeringSection extends View` — emits the four-card visual flow using inline HTML in the template (no new component for this; it's view-specific). Each card has a small `data-action="edit-step-N"` pencil that opens `RuleSetForms.edit` via `Modal.modelForm` (the form's own tab structure handles which tab is shown — inline tab-pinning is out of scope, defer).
  - `HandlerChainSection extends View` — runs `parseHandlerChain(model.get('handler'))`, emits a card per step with the matching icon from `HANDLER_TYPES`. "Edit chain" button reuses the existing `onActionEditHandler` flow already in the current `RuleSetView`.
  - `AgentPromptSection extends View` — `<textarea data-action="prompt-input">` bound to local state, Save button (`data-action="save-prompt"`), char counter, and a contextual banner: amber if the parsed handler chain doesn't contain `llm://`, info-blue if it does. `onActionSavePrompt` calls `this.model.save({ 'metadata.agent_prompt': this.promptValue })`. **Build-time verification:** confirm that `Model.save` accepts dotted-path keys for nested writes — read the form's existing `metadata.delete_on_resolution` round-trip if it works there it works here (per `feedback_backend_json_merge` memory: backend merges JSONFields server-side, so partial writes are safe). If the client-side `Model.save` does NOT accept dotted paths, send `{ metadata: { agent_prompt: value } }` instead — backend merge handles it.
  - `RuleSetIncidentsSection extends View` — embeds a `SegmentControl` (7d / 30d / 90d, default 30d) and a `TableView` over `IncidentList`. **Open question (build-time):** the filter param. Try `IncidentList({ params: { rule_set: rulesetId } })` first; if the backend ignores the filter, fall back to `metadata__rule_id: rulesetId` (the precedent at [`IncidentTablePage.js:99`](src/extensions/admin/incidents/IncidentTablePage.js:99)). The segment-control change handler updates the collection's `created__gte` param using `dr_start` semantics — but per `feedback_no_dr_start_today` memory, do not pass `dr_start=today`; compute the absolute date in the client and pass `created__gte=<epoch>` directly.
  - `RuleSetMetadataSection extends View` — known-keys structured `DataView` over a synthetic model (mirror the `_buildMetadataSection` pattern at [`IncidentView.js:1423`](src/extensions/admin/incidents/IncidentView.js:1423)) plus a `<pre>` raw JSON dump using `{{{model.metadata|json}}}`. Hidden section if `Object.keys(metadata).length === 0`.
  - `RuleSetView extends View` — assembles the above:
    - `template`: header container + `data-container="ruleset-sidenav"`.
    - `onInit`: instantiates each section view and calls `addChild()`. Builds the `SideNavView` config with the new `badge` keys (`Conditions: <ruleCount>`, `Incidents: <recentIncidentCount>`); uses `setBadge` after each section's collection fetches to update the live count. Same context-menu actions as today, plus `edit-agent-prompt` (jumps to Agent section + focuses textarea) and `view-incidents` (jumps to Incidents section).
- Preserve the current `RuleSetView.VIEW_CLASS` and `RuleSet.MODEL_REF` exports at the bottom.
- Hosting under `Modal.show(view, { size: 'xl', header: false })` continues to work — `SideNavView` already handles the bounded-height case.

**6. Docs + `CHANGELOG.md`**

- `docs/web-mojo/components/SideNavView.md` — Section Schema table gains a `badge` row; new "Dynamic Badges" subsection covering `setBadge(key, value)` + the four variants. Quick Start example gains a `badge: 42` to one section.
- `docs/web-mojo/components/SegmentControl.md` — new file, follow the `TabView.md` shape.
- `docs/web-mojo/components/MetricCard.md` — new file, follow the `DataView.md` shape.
- `docs/web-mojo/README.md` — add two rows under **Components** for `SegmentControl` and `MetricCard`.
- `CHANGELOG.md` — single `## Unreleased` entry covering: SideNavView badges + dark-theme migration, two new components, RuleSetView redesign + new agent_prompt field. Match the existing voice (descriptive subheading, then bullet list of Behavior/Added/Changed).

**7. Tests**

- `test/unit/SegmentControl.test.js` — mount, render, click change, `setValue` programmatic, `silent` flag.
- `test/unit/MetricCard.test.js` — mount, render, action-click emits, no-action variant inert, `setValue` updates.
- No regression test added for `SideNavView` badges beyond what the existing test file covers — they're additive and visual; a manual eyeball pass under both themes is the gate per `.claude/rules/testing.md` guidance ("behavior changes in a reusable framework primitive" — badges are a render-only addition).
- No new test for the RuleSetView rewrite itself — it's an extension view assembled from already-tested primitives. Manual verification per Acceptance Criteria.

### Design Decisions

- **Dark-theme migration of `SideNavView` is in scope, not a follow-up.** The component is touched anyway, the doc already promised the behavior, and `.claude/rules/theming.md` requires both themes to read at sign-off. Splitting this out is more work than just doing it.
- **`SegmentControl` lives in `views/navigation/`, not `forms/inputs/`.** It's a standalone view that emits `change`, not a FormView-bound input with validation/value plumbing. `TabView`'s neighbor placement matches the conceptual model (pick one of N).
- **No tab-pinning when opening `RuleSetForms.edit`.** Modal.modelForm doesn't have a `defaultTab` parameter today; adding one is a separate request. The "Edit" pencil on each Triggering step opens the form at the General tab and the user navigates — acceptable v1.
- **`parseHandlerChain` is colocated in `RuleSetView.js`, not extracted yet.** Two callers exist (RuleSetView and would-be IncidentView's RuleEngineSection), but extracting prematurely creates the wrong abstraction. Revisit once the rewrite stabilizes.
- **No `MetricCard` migration of `IncidentView` in this PR.** Out of scope per the request — let the new component prove itself in RuleSetView first.
- **`metadata.agent_prompt` is a partial save.** Per `feedback_backend_json_merge` memory the backend auto-merges JSONFields, so we don't need a client-side spread. Test the existing form behavior to confirm dotted-path Model.save semantics during build (small risk, easy verification).

### Edge Cases

- **Empty handler chain** — `parseHandlerChain('')` returns `[]`. HandlerChainSection shows an empty state with a "Configure handler chain" button that opens `HandlerBuilderView`.
- **Unknown handler scheme** — if a handler URI doesn't match any `HANDLER_TYPES.value` prefix, render a generic `<i class="bi bi-question-circle">` card with the raw URI as the label. Don't crash, don't drop it.
- **No `metadata.reasoning`** — header omits the subtitle paragraph (don't render an empty `<p>`).
- **`metadata` empty** — Metadata section is hidden from the SideNav (use `permissions: '__none__'` trick, OR conditionally exclude from the sections array — prefer the latter for clarity).
- **Section collection fetch failure** — TableView's existing empty/error state handles it; don't crash the entire RuleSetView. Failed collection means `setBadge('Incidents', '?')` rather than a number.
- **`SegmentControl` change while collection fetch is in flight** — debounce on the collection level (existing TableView behavior), or rely on `Collection.fetch` cancelling the prior promise. Verify during build.
- **Switching themes mid-view** — Bootstrap tokens auto-update; no manual re-render required.
- **Save round-trip on Agent Prompt** — disable the Save button while `model.save` is in flight; toast on success/error using `getApp().toast.*` like the existing `RuleSetView.onActionEditHandler`.
- **`is_active` toggle race** — disable the switch while save is in flight; revert visual state on error.
- **Modal-hosted height** — `SideNavView`'s content panel already scrolls within a bounded modal; the new header card sits above it inside the same bounded shell, so total height = header + sidenav-min-height. Verify under `Modal.show(view, { size: 'xl', header: false })`.

### Open Questions resolved at build time

1. **`Model.save` dotted-path semantics** — verify by inspecting how the existing `metadata.delete_on_resolution` form field round-trips. If it works in the form, it works for direct `save({ 'metadata.agent_prompt': value })`. Fallback: `save({ metadata: { agent_prompt: value } })` since backend merges JSONFields.
2. **Incidents-by-RuleSet filter param** — try `rule_set=<id>` first; fall back to `metadata__rule_id=<id>` (known-supported per `IncidentTablePage.js:99`). If neither works, file a backend follow-up; UI degrades to "Incidents section unavailable" but still ships.
3. **Tab-pinning** — confirmed out of scope; pencil opens the form at default tab.

### Testing

Narrowest commands:

- `npm run test:unit` — runs the two new smoke tests + any framework regressions
- `npm run lint` — catches ESLint issues in the new + edited files
- Manual verification:
  - Open a RuleSet from the existing `RuleSetTablePage` route in the example portal under `npm run dev`
  - Verify all 7 sections render in light theme
  - Toggle to dark theme via the example portal's theme dropdown — verify all 7 sections + header still read (this is where the SideNavView dark migration is exercised)
  - Click each section's primary action: edit handler, save agent prompt, click an incident row, edit a condition, toggle Active
  - Confirm `setBadge('Incidents', n)` updates after the fetch

### Docs Impact

- `docs/web-mojo/components/SideNavView.md` — schema table + new Dynamic Badges section (small)
- `docs/web-mojo/components/SegmentControl.md` — new file (~150 lines)
- `docs/web-mojo/components/MetricCard.md` — new file (~150 lines)
- `docs/web-mojo/README.md` — two new component rows
- `CHANGELOG.md` — one combined entry under `## Unreleased`

---

**Next step:** Start a new session, run `/build planning/requests/ruleset-view-redesign.md`, or just say "continue".
