---
status: open
type: request
scope: src/extensions/admin · src/core/utils
created: 2026-05-09
parent: detailview-design-audit.md
---

# DetailView audit follow-ups — structural issues flagged during the polish pass

The screen-by-screen design audit (see [`planning/done/detailview-design-audit.md`](../done/detailview-design-audit.md)) was strict polish only — CSS and template tweaks against the locked design language. The auditor correctly stayed in lane and flagged six structural / behavioral issues that warrant their own work. This request collects them.

These are not bugs in the rethink itself — most predate it or are integration gaps the rethink revealed. Each could be a separate request if you'd rather split them; bundling here so the backlog is visible in one place.

## Items

### 1. UserView · OAuth section renders empty

**File:** `src/extensions/admin/account/users/UserView.js` (or wherever the OAuth section view is wired)

**Symptom:** clicking the **OAuth Accounts** entry in the side rail produces a blank section — no `.detail-section-eyebrow`, no flat rows, no empty-state placeholder. By comparison the `Personal` and `Security` sections show their headers + content even when empty.

**Expected:** even with zero linked OAuth providers, the section should render:
- A `.detail-section-eyebrow` ("LINKED ACCOUNTS" or similar)
- One of:
  - the muted "No linked accounts" placeholder pattern (matches `AdminConnectedSection.js`'s empty state), OR
  - if the section was intentionally pulled out of `UserProfileSection`, restore an explicit `UserOAuthSection` view that mounts `AdminConnectedSection` (the existing standalone OAuth section view).

**Fix candidate:** ~10–20 lines in UserView. Either delete the empty-section sidebar entry, or wire up a real section view (preferred — the OAuth fetch already exists in `UserProfileSection`).

---

### 2. UserView · Devices section opens the generic Item inspector

**File:** `src/extensions/admin/account/users/UserView.js` — `UserDevicesSection` TableView config.

**Symptom:** clicking a device row in the unified Browser/Push table opens the framework's default `Modal.data({ title: 'View Item #b:NNN', ... })` modal (raw fields, unformatted epoch dates) instead of opening `DeviceView` in a `Modal.detail`.

**Root cause:** one of the two:
- `UserDevicesSection`'s TableView doesn't set `clickAction: 'view'` (so TablePage falls through to `Modal.data`).
- OR `BrowserDevice.VIEW_CLASS` isn't pointing at `DeviceView` (so even with `clickAction: 'view'`, the dispatcher can't find the view class).

**Expected:** clicking either a browser device row or a push device row opens the relevant detail view at `lg` width, with the standard flat-row layout.

**Fix candidate:** verify `clickAction: 'view'` on the TableView config in `UserDevicesSection` AND verify `UserDevice.VIEW_CLASS = DeviceView` (and `PushDevice.VIEW_CLASS = …` if push has its own detail view).

---

### 3. IncidentView · Source section threat-flag grid feels scattered

**File:** `src/extensions/admin/incidents/IncidentView.js` — `IncidentSourceSection`'s threat-flag block.

**Symptom:** the "TOR / VPN / PROXY / DATACENTER / MOBILE / CLOUD / KNOWN ATTACKER / BLOCKED / WHITELISTED" rows render as a dense vertical stack of label/❌ rows. Visually scattered; doesn't match the rest of the section's flat-row rhythm. Feels like a `KnownFieldsCard` falling through to its raw-blob rendering rather than the structured threat-chip strip the rethink mockup envisioned.

**Expected:** either
- (a) a tight horizontal strip of tone-coded chips (only flags that fired, with negative flags hidden — matches the GeoIPView header chip pattern), OR
- (b) two columns of `.detail-flat-row`s with the matching threat-tone badge instead of ❌/✓ icons.

**Fix candidate:** restructure the threat-flag rendering to follow GeoIPView's header-chip approach (Wave 3 C5 already solved this for GeoIPView) — promote truthy flags to a chip strip, drop falsy ones. Likely 30–60 lines in `IncidentSourceSection`.

---

### 4. GroupView · header buttons louder than other views

**File:** `src/extensions/admin/account/groups/GroupView.js` — header `actions:[]` config.

**Symptom:** the `Edit` and `Invite` buttons in the GroupView header render at full Bootstrap btn-sm size with primary fills — louder than the other rethink-9 views which only have `auxFn` + the active toggle + context menu in the header right gutter.

**Expected:** consistent with the other DetailView headers — primary action(s) live on a StatusPanel or contextual section affordance; long-tail actions live in the context menu. The header right gutter stays quiet.

**Fix candidate:** move `Edit` and `Invite` to the context menu; if either is genuinely high-frequency for groups, keep one as a single ghost-styled `.dh-action` instead of a primary button.

---

### 5. UserView · `Joined` row is empty

**File:** `src/extensions/admin/account/users/UserView.js` — `UserProfileSection` (or wherever the Account subsection is wired).

**Symptom:** the `Joined` row in the Profile section's Account subsection renders as empty — no date, no fallback `—`.

**Root cause:** template binds to a non-existent field. The User model carries `created` (or `created_on` / `date_joined`); the template uses something like `{{model.joined}}`.

**Expected:** the row shows the user's created/joined date formatted via DataFormatter pipe (e.g. `{{model.created|datetime}}` or `{{model.date_joined|date}}`), with `|default:'—'` fallback.

**Fix candidate:** one-line template fix once you confirm the actual model field name. Look at `Member.created` for the convention — likely `model.date_joined` or `model.created`.

---

### 6. Migrate 17 call sites off the alt `dataFormatter.apply(value, [...])` signature

**File:** the design audit added a compat branch in `src/core/utils/DataFormatter.js`'s `apply()` to handle the alt signature `apply(value, [pipeNames])`. 17 call sites in `UserView.js`, `GroupView.js`, `MemberView.js` (and possibly a few others) use that form.

**Tech debt:** the compat branch works, but the documented signature is `apply(name, value, ...args)`. Long-term we want to:
- Migrate every alt-signature call site to either `dataFormatter.pipe(value, 'relative')` (multi-pipe) or `dataFormatter.apply('relative', value)` (single).
- Remove the compat branch from `apply()`.

**Fix candidate:** one targeted grep + sed-style migration pass. Roughly:
```
grep -rn "dataFormatter\.apply(.*\[" src/extensions/admin/
```
Each match → swap to the canonical form. Run `npm run test:unit` after — the 824/834+ tests cover the hot paths.

After all call sites migrate, delete the compat branch. Add a doc note in `docs/web-mojo/core/DataFormatter.md` calling out the canonical signatures.

---

## Suggested order

If addressed individually, recommended order:

1. **#5 (Joined row)** — one-line bug fix, immediate user-visible value. Do first.
2. **#2 (Devices clickAction)** — small wiring fix, restores the proper DeviceView modal flow.
3. **#1 (OAuth empty section)** — small fix, removes a visible "is this broken?" surface.
4. **#4 (GroupView header buttons)** — design polish, ~30 minutes.
5. **#6 (DataFormatter alt-API)** — tech debt cleanup, batchable, no UI impact.
6. **#3 (IncidentView Source threat-grid)** — biggest of the six, structural rework, save for last.

## Out of scope

- Fixture data wiring so the audit's deferred views (RunnerDetailsView, GeoIPView, MemberView, full DeviceView) can be visually verified end-to-end. That's a separate "test data" request.
- Anything beyond the six items listed.

## See also

- [`planning/done/detailview-design-audit.md`](../done/detailview-design-audit.md) — the audit that flagged these.
- [`planning/done/detailview-migration-rethink.md`](../done/detailview-migration-rethink.md) — the parent rethink (moved to done alongside this request).
