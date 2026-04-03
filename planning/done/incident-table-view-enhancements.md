# Incident Table & View Enhancements

| Field | Value |
|-------|-------|
| Type | request |
| Status | done |
| Date | 2026-04-03 |
| Priority | high |

## Description

Multiple improvements to `IncidentTablePage` and `IncidentView` covering advanced filtering, rule engine bug fix, smarter rule creation, and events table compaction.

## Context

The incident management UI needs better filtering for SOC workflows (priority ranges, metadata drill-down, modified date visibility) and has a bug where the Rule Engine tab says "No RuleSet Linked" even when the API returns a populated `rule_set` object. Additionally, creating rules from OSSEC incidents should pre-fill intelligent defaults, and the events table overflows the modal width.

## Acceptance Criteria

### 1. Advanced table filters
- [ ] `priority__gt` and `priority__lt` filters available (number inputs)
- [ ] `modified` column replaces `created` in table (epoch|datetime, daterange filter)
- [ ] `metadata__rule_id` filter available (text input)
- [ ] `metadata__<key>` filter available (text input for arbitrary metadata key lookup)
- [ ] `category__not` filter already exists — keep it

### 2. Rule Engine tab — bug fix (field name mismatch)
- [ ] Fix: the API returns the nested object as `rule_set` (underscore) but `RuleEngineSection` reads `this.incident.get('ruleset')` (no underscore) at line 582
- [ ] When `rule_set` is a nested object (not just an ID), extract the id from it: `rule_set.id`
- [ ] `hasRuleset` renders correctly when `rule_set` is populated in the incident payload

### 3. Always allow "Create Rule" even when ruleset exists
- [ ] When a ruleset IS linked, still show a "Create New Rule" button (secondary style) alongside the existing ruleset display
- [ ] Creating a new ruleset replaces the link on the incident

### 4. Smart rule creation for OSSEC incidents
- [ ] When `scope === 'ossec'` and `metadata.rule_id` exists, auto-create a rule condition: `field_name: 'rule_id'`, `comparator: '=='`, `value: metadata.rule_id`, `value_type: 'int'`
- [ ] Pre-fill the RuleSet `category` as `'ossec'`
- [ ] After creating the RuleSet, automatically save the rule condition (no extra user step for the auto-detected match)

### 5. Compact events table for modal
- [ ] Reduce column count or use column `template` to combine related fields into multi-line cells
- [ ] Suggested approach: combine Date + Category into one cell, combine Host + Source IP into one cell, keeping ID, Title, and Level as standalone columns
- [ ] Table should not overflow the `xl` dialog width

## Investigation

### What exists

**IncidentTablePage** (`src/extensions/admin/incidents/IncidentTablePage.js`):
- 7 columns: id, status, created, scope, category, priority, title
- 1 additional filter: `category__not`
- Default query: `sort: '-id', status: 'new'`
- Priority filter is plain `type: 'text'` — no range support

**IncidentView** (`src/extensions/admin/incidents/IncidentView.js`):
- `RuleEngineSection` (line 574) reads `this.incident.get('ruleset')` — this is the **bug**
- The API sample shows the field is `rule_set` with a nested object `{ id: 1, name: "OSSEC - Bot/Scanner...", ... }`
- The "Create Rule from Incident" action (line 711) creates a RuleSet but does NOT auto-create any rule conditions — user must manually add them via the RuleSetView dialog
- Events table (line 1024) has 7 columns: ID, Date, Source IP, Category, Title, Level, Host — total width ~690px+ before Title flex, tight in xl modal

**Column template support**: `TableRow.js:170` — columns accept a `template` string property for custom cell Mustache rendering

**Model** (`src/core/models/Incident.js`):
- `RuleSet` endpoint: `/api/incident/event/ruleset`
- `Rule` endpoint: `/api/incident/event/ruleset/rule`
- `RuleForms.create` accepts: name, field_name, index, comparator, value_type, value

### What changes

| File | Change |
|------|--------|
| `src/extensions/admin/incidents/IncidentTablePage.js` | Replace `created` column with `modified`, add `priority__gt`, `priority__lt`, `metadata__rule_id`, `metadata__key` filters |
| `src/extensions/admin/incidents/IncidentView.js` — `RuleEngineSection` | Fix field name `rule_set` vs `ruleset`, handle nested object, add "Create New Rule" button when ruleset exists |
| `src/extensions/admin/incidents/IncidentView.js` — `onActionCreateRuleFromIncident` | Add OSSEC smart defaults: auto-create rule condition with `rule_id` match after RuleSet creation |
| `src/extensions/admin/incidents/IncidentView.js` — events table | Compact columns using `template` property to combine Date+Category and Host+IP into multi-line cells |

### Constraints
- The backend API field name is `rule_set` (underscore) — confirmed from sample data. The fix must match the API contract.
- `rule_set` may be a nested object or an integer ID depending on serialization depth — handle both cases
- Column `template` uses Mustache syntax — `{{model.field}}` with formatters
- Backend must support `priority__gt`, `priority__lt`, `metadata__rule_id` query params (standard Django filter pattern — should already work)
- `metadata__<key>` filtering relies on backend JSONB lookup support

### Related files
- `src/extensions/admin/incidents/IncidentTablePage.js`
- `src/extensions/admin/incidents/IncidentView.js`
- `src/core/models/Incident.js` (RuleSet, Rule, RuleForms)
- `src/core/views/table/TableRow.js` (column template support)
- `src/extensions/admin/incidents/RuleSetView.js` (opened after rule creation)

### Endpoints
- No new endpoints — uses existing CRUD with query params
- `GET /api/incident/incident?priority__gt=5&priority__lt=10` — range filtering
- `GET /api/incident/incident?metadata__rule_id=31153` — metadata filtering
- `POST /api/incident/event/ruleset/rule` — auto-create rule condition

### Tests required
- None required — extension UI code, no public framework API changes

### Out of scope
- Backend API changes (filter params assumed to be supported by Django)
- Changes to RuleSetTablePage or RuleSetView
- LLM analysis workflow changes
- New model classes or endpoints

## Plan

### Objective
Enhance `IncidentTablePage` with advanced filtering (priority range, modified date, metadata) and fix + improve `IncidentView`'s Rule Engine tab (field name bug, always-available rule creation, OSSEC smart defaults, compact events table).

### Steps

**1. `src/extensions/admin/incidents/IncidentTablePage.js` — Advanced filters + modified date**

- Replace the `created` column (line 50-56) with a `modified` column using the same `epoch|datetime` formatter and `daterange` filter
- Change the `priority` column filter (line 70-73) from `{type:"text"}` to a proper column filter, and add `priority__gt` / `priority__lt` as additional `filters` entries with `{type:"number"}` (matching the `filters` array pattern at line 81-87)
- Add `metadata__rule_id` filter to the `filters` array with `{type:"text"}` (same pattern as `EventTablePage` line 124-128)
- Add a generic `metadata__key` filter to the `filters` array with `{type:"text"}` — labeled "Metadata Key" for arbitrary key lookup

**2. `src/extensions/admin/incidents/IncidentView.js` — Fix `RuleEngineSection` field name bug**

- Line 582: Change `this.incident.get('ruleset')` to `this.incident.get('rule_set')` to match the API field name
- Add handling for when `rule_set` is a nested object: extract `rule_set.id` if it's an object, use directly if it's a number
- Line 787: Change `this.incident.save({ ruleset: ruleset.id })` to `this.incident.save({ rule_set: ruleset.id })` to match the API field name

**3. `src/extensions/admin/incidents/IncidentView.js` — "Create New Rule" always available**

- In the `RuleEngineSection` template (line 586-622): Add a "Create New Rule" button (btn-outline-primary, btn-sm) inside the `{{#hasRuleset|bool}}` block, next to the existing Edit/View buttons
- This reuses the existing `onActionCreateRuleFromIncident` handler — no new action needed, just a new button wired to `data-action="create-rule-from-incident"`

**4. `src/extensions/admin/incidents/IncidentView.js` — OSSEC smart rule creation**

- Add `Rule` to the import on line 15 (already exported from `Incident.js`)
- In `onActionCreateRuleFromIncident` (line 711), after the RuleSet is saved successfully (line 783):
  - If `scope === 'ossec'` and `metadata.rule_id` exists, auto-create a `Rule` with: `{ parent: ruleset.id, name: 'Match rule_id ' + metadata.rule_id, field_name: 'rule_id', comparator: '==', value: String(metadata.rule_id), value_type: 'int', index: 0 }`
  - Save it via `new Rule().save({...})`
  - Update the toast message to reflect that a rule condition was auto-created

**5. `src/extensions/admin/incidents/IncidentView.js` — Compact events table**

- At the events table (line 1024-1046), reduce from 7 columns to 5 by using column `template` to combine cells:
  - **Date + Category column**: Use `template` with multi-line cell — date on first line, category badge on second: `<div>{{model.created|epoch|datetime}}</div><div class="text-muted small">{{model.category|badge}}</div>`
  - **Source column**: Combine Host + Source IP — hostname on first line, IP on second: `<div>{{model.hostname}}</div><div class="text-muted small">{{model.source_ip}}</div>`
  - Keep ID, Title, and Level as standalone columns
  - Remove the dedicated `hostname` and `category` columns

### Design Decisions

- **Use `filters` array (not column filters) for priority range** — `priority__gt` and `priority__lt` are separate query params, not the column's own filter. They belong in the `filters` array like `category__not` already does. The column's existing text filter stays for exact match.
- **Handle `rule_set` as object or int** — The API may return the full nested object (as seen in sample data) or just an ID. Use `typeof ruleSet === 'object' ? ruleSet.id : ruleSet` pattern.
- **Auto-create rule condition inline** — Rather than opening the RuleSetView and requiring the user to manually add a condition, save the `Rule` directly via API after creating the RuleSet. The RuleSetView dialog still opens for further editing.
- **Column template for compaction** — `TableRow.js:170` returns `column.template` directly as Mustache. Note: when `template` is set, the `formatter` property is checked first (line 159-168), so we must NOT set both `formatter` and `template` on the same column.

### Edge Cases

- **`rule_set` is `null` or `0`** — treated as no ruleset, shows "No RuleSet Linked" + create button. No change from current falsy check.
- **`rule_set` is a nested object with no `id`** — fallback to falsy, won't attempt fetch. Defensive check: `ruleSet?.id || ruleSet`.
- **Auto-created rule save fails** — Don't block the RuleSet creation flow. Log the error and toast a warning that the rule condition failed but the RuleSet was created. User can still add rules manually via the RuleSetView dialog.
- **Column template Mustache with formatters** — The `template` string uses `{{{...}}}` (triple braces) for HTML output from formatters like `badge`. Epoch formatter needs pipe syntax inside the template string.
- **`metadata__key` backend support** — This relies on Django JSONB lookup. If the backend doesn't support arbitrary `metadata__<key>`, the filter will simply be ignored. No frontend error.

### Testing

- `npm run lint` — verify no syntax errors
- Manual verification: Open incident table, confirm modified column, apply priority range filters, metadata filters
- Manual verification: Open an incident with `rule_set` populated, confirm Rule Engine tab shows the linked ruleset
- Manual verification: Create rule from an OSSEC incident, confirm rule condition auto-created

### Docs Impact

- No framework docs changes — all changes are in extension code
- `CHANGELOG.md` — add entry for incident table filtering, rule engine bug fix, and OSSEC smart rule creation

## Resolution

### What was implemented
All 5 plan steps completed:
1. **IncidentTablePage** — Replaced `created` with `modified` column; added `priority__gt`, `priority__lt`, `metadata__rule_id`, `metadata__key` filters
2. **RuleEngineSection bug fix** — Changed `ruleset` → `rule_set` field name, added nested object handling (`typeof === 'object' ? .id : direct`), fixed save call
3. **Create New Rule always available** — Added `btn-outline-success` button in the `hasRuleset` template block
4. **OSSEC smart rule creation** — Auto-creates `rule_id` match condition after RuleSet save; includes `parseInt` + `Number.isFinite` guard per security review
5. **Compact events table** — Reduced from 7 to 5 columns using multi-line `template` cells (Date/Category, Source/Host)

### Files changed
- `src/extensions/admin/incidents/IncidentTablePage.js` — filters and modified column
- `src/extensions/admin/incidents/IncidentView.js` — rule_set bug fix, create button, OSSEC auto-rule, compact events table, Rule import

### Commits
- `c4f3134` — Main implementation (all 5 steps)
- `16c6103` — Security hardening (parseInt guard on metadata.rule_id)

### Tests run
- `npm run lint` — clean (no new errors; 16 pre-existing errors in core files)
- `npm test` — all failures pre-existing (missing DataList.js, browser globals); no regressions from our changes

### Agent findings
- **docs-updater** — Updated CHANGELOG.md with Added/Fixed entries
- **security-review** — 1 WARNING (badge formatter doesn't HTML-escape — pre-existing pattern, category is server-validated enum), 2 INFO findings on rule_id validation (addressed in commit `16c6103`), remaining findings informational/safe
