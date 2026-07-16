---
id: WM-015
type: feature
title: GroupAuthConfigSection — edit registration.extra_fields (extra signup fields)
priority: P2
effort: S
owner: frontend
opened: 2026-06-06
depends_on: []
related: []
links: []
---

# GroupAuthConfigSection — edit registration.extra_fields

## What & Why
django-mojo now supports per-group **extra (non-canonical) registration
fields** via `auth_config.registration.extra_fields` (e.g. `promo`, `ref`,
`tracking`). The admin UI's `GroupAuthConfigSection` (the Registration tab of the
Group auth-config editor) edits `registration.fields` but has no way to set
`extra_fields`, so operators can't enable promo/referral capture per group from
the admin.

Add a control to the Registration tab that edits `registration.extra_fields`.

## Acceptance Criteria
- [ ] The Registration tab lets an admin set the list of extra signup field names.
- [ ] Loading shows the group's own override if present, else the resolved/inherited value, else empty.
- [ ] Save writes `registration.extra_fields` (only when changed) as `[{name}]`, deep-merged via `model.save({ metadata: { auth_config: {...} } })`.
- [ ] Empty list → no behavior change (other groups/tabs unaffected).

## Notes

### Goal
Add a tag-input to `GroupAuthConfigSection`'s **Registration** tab that edits
`registration.extra_fields` (names only), serialized to `[{name}]`.

### What exists
- `src/extensions/admin/account/groups/GroupAuthConfigSection.js` is the editor
  for `metadata.auth_config`. The Registration tab is built in
  `_registrationFields()` (~line 385); the canonical-field grid round-trips
  through `_gridValuesFromArray` (line 287) / `_assembleRegFields` (line 606).
  Baseline built in `_buildBaseline` (line 247); diff/save in `_diffPayload`
  (line 561) + `onActionSaveAuthConfig` (line 479). `registration.fields` is
  handled as a **special array field** (NOT via the flat `FIELD_DESCRIPTORS`
  list at line 127) — baseline at lines 267-271, diff at lines 574-579. Save is
  explicit; deep-merged via `model.save({ metadata: { auth_config: payload } })`.
- `STATIC_DEFAULTS.registration` (line 98) is the offline fallback for resolved
  values; `_fetchResolved()` (line 226) GETs `/api/auth/config?group_uuid=`.
- `FormView` maps `type: 'tags'` (and `'tag'`) → `TagInput`
  (`src/core/forms/inputs/index.js:64-65`). `getFormData()` reads custom
  components via `component.getValue()` (`FormView.js:1787-1791`); `TagInput.getValue()`
  returns `getTagString()` — a **comma-separated string** (`TagInput.js:581`,
  `:452`). Seed value is passed via the FormView `data` map as a comma string —
  the same mechanism the existing `multiselect` `login_methods`/`reg_methods`
  fields in this section already round-trip successfully.

### What changes
1. `src/extensions/admin/account/groups/GroupAuthConfigSection.js` (only source file):
   - `STATIC_DEFAULTS.registration`: add `extra_fields: []`.
   - `_registrationFields()`: append a field `{ name: 'reg_extra_fields',
     type: 'tags', label: 'Extra fields', help: 'Extra signup fields captured
     per-group (e.g. promo, ref, tracking). Values reach the registration
     handler and are stored on user.metadata.registration. Names only —
     lowercase letters/digits/underscore.', columns: 12, value:
     this._baseline.reg_extra_fields || '' }` after the canonical-field groups.
     (Pass `value:` like the multiselect fields do, in case the tags init reads
     it from the field config rather than `data`.)
   - `_buildBaseline(own, resolved)`: after the `registration.fields` block, set
     `base.reg_extra_fields` = comma-joined names from own override
     `registration.extra_fields`, else resolved, else `[]`. Use a helper
     `_extraNamesFromArray(arr)` → `(arr||[]).map(e => e && e.name).filter(Boolean).join(',')`.
   - New `_assembleExtraFields(fd)`: take `fd.reg_extra_fields` (comma string OR
     already-array — guard both), split on comma, trim, drop blanks, dedupe,
     drop names in `CANONICAL_REG_FIELDS` or failing `/^[A-Za-z][A-Za-z0-9_]*$/`,
     map to `[{ name }]`.
   - `_diffPayload(fd)`: after the `registration.fields` compare, JSON-compare
     `_assembleExtraFields(fd)` vs `_assembleExtraFields(this._baseline)`; if
     different, `setPath(payload, 'registration.extra_fields', curExtra)` and set
     `changed = true`.
   - Do NOT add a `FIELD_DESCRIPTORS` entry — those handle scalars/string-arrays
     via the generic flat diff; this serializes a comma string into an
     array-of-objects, so it follows the `registration.fields` special path.
   - Re-baseline after save already does `this._baseline = { ...fd }`; since
     `reg_extra_fields` lives in `fd` as a flat string, no extra work needed.
2. Tests — new `test/unit/GroupAuthConfigSection.test.js` (pure-method tests;
   instantiate the section, call methods directly — mirror the style of
   `test/unit/admin-model-statics.test.js`):
   - `_assembleExtraFields`: `'promo, ref ,promo,email,bad name!,'` →
     `[{name:'promo'},{name:'ref'}]` (trimmed, deduped, canonical `email`
     dropped, invalid `bad name!` dropped, blanks dropped).
   - `_buildBaseline`: own override `extra_fields:[{name:'promo'}]` → baseline
     `reg_extra_fields === 'promo'`; no own but resolved has it → resolved wins;
     neither → `''`.
   - `_diffPayload`: baseline `'promo'`, fd `'promo,ref'` →
     `payload.registration.extra_fields === [{name:'promo'},{name:'ref'}]`;
     unchanged → no `registration.extra_fields` key.
   - Clearing: baseline `'promo'`, fd `''` → payload sends `extra_fields: []`.
3. Docs — `docs/web-mojo/extensions/Admin.md` (GroupAuthConfigSection / auth
   config section): document the Extra fields control. `CHANGELOG.md` entry.

### Design decisions
- **Tag input, names only** (chosen UX): serializes to `[{name}]`; django-mojo
  humanizes the label and defaults `required=false`, matching the "extra fields
  shouldn't be required" steer and reusing an existing component (FormView has no
  repeater/dynamic-row type).
- **Special array field, not a FIELD_DESCRIPTOR** — same treatment as
  `registration.fields` because it serializes to an array of objects.
- **Client-side sanitize** to the backend's identifier rule
  (`[A-Za-z][A-Za-z0-9_]*`) + canonical-collision drop, so the UI never POSTs a
  config that `register_schema.validate_extra_fields_config` would 400 on.

### Edge cases
- Canonical-colliding / invalid-identifier / duplicate / whitespace names →
  dropped or normalized client-side (server also enforces).
- Empty tag list → assembled `[]`; included in the payload only when it differs
  from baseline (so clearing an inherited or own list explicitly sends `[]`).
- Seed round-trip: confirm `type:'tags'` initializes the TagInput with the comma
  seed (mirror the multiselect fields). If `'tags'` placeholders don't init, use
  `'tag'` (both map to TagInput; `initializeTagInputs` scans `[data-field-type="tag"]`).

### Tests needed
As listed in "What changes" #2. Run with `npm run test:unit`
(`node test/test-runner.js`). Add a focused regression for `_assembleExtraFields`.

### Docs affected
`docs/web-mojo/extensions/Admin.md`; `CHANGELOG.md`.

### Open questions
None. (Custom per-field labels intentionally out of scope — names only.)

## Resolution
- closed: 2026-06-06
- branch: main
- files changed: src/extensions/admin/account/groups/GroupAuthConfigSection.js, test/unit/GroupAuthConfigSection.test.js (new), docs/web-mojo/extensions/Admin.md, CHANGELOG.md
- tests added: test/unit/GroupAuthConfigSection.test.js — 9 unit tests covering `_assembleExtraFields` (comma→[{name}], trim/dedupe, drop canonical/invalid/blank, array+empty input), `_extraNamesFromArray` (join/drop empties), `_buildBaseline` (own override → resolved → empty), and `_diffPayload` (emit only when changed; clearing sends []). Run via `npm run test:unit` → 9/9 pass; full unit suite 1189/1198 (9 pre-existing failures unrelated: IncidentView/RelatedIncidentsList/FileManagerTablePage). Lint clean on changed files.
