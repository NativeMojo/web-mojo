# IPSet Admin Interface

**Type**: request
**Status**: done
**Date**: 2026-04-01
**Depends on**: `planning/requests/form-show-when.md`

## Description

Full admin interface for managing IPSets — kernel-level CIDR blocklists for countries, datacenters, abuse feeds, and custom ranges. The primary use case is "block all traffic from China" and should be achievable in 2 clicks: pick country, submit.

## Context

- **API endpoint**: `/api/incident/ipset`
- **No existing frontend code** — model, pages, views are all net-new
- **POST_SAVE_ACTIONS**: `sync`, `enable`, `disable`, `refresh_source` — all use `model.save({ action_name: 1 })`
- **Permissions**: `view_security` (read), `manage_security` (write/actions)
- **Country blocking**: When `kind=country`, backend auto-populates `source_url` from IPDeny. Frontend just needs to send `name: 'country_cn'` and `kind: 'country'`.
- **`source_key`**: Write-only, never returned in API responses
- **`data` field**: Excluded from default response, available via `?graph=detailed`
- **Fleet sync**: Distributes to all instances, loads kernel ipset, adds iptables DROP rule. Weekly cron auto-refreshes enabled sets.

### Reference patterns
- `src/extensions/admin/security/BlockedIPsTablePage.js` — TablePage pattern
- `src/extensions/admin/account/devices/GeoIPView.js` — detail view with model actions
- `src/core/models/Bouncer.js` — model + collection + forms pattern

## Acceptance Criteria

- [ ] Model file with IPSet, IPSetList, IPSetForms, constants
- [ ] Table page with columns, filters, batch actions
- [ ] Detail view with config tab + CIDR data tab
- [ ] Create form: kind selection drives visible fields (uses `showWhen`)
- [ ] Country creation: select country from dropdown of known abuse countries → auto-generates name
- [ ] All 4 POST_SAVE_ACTIONS work: sync, enable, disable, refresh_source
- [ ] Wired into Security nav, admin.js exports/imports/registration
- [ ] Lint clean

## Files

| File | Action | Description |
|------|--------|-------------|
| `src/core/models/IPSet.js` | **New** | Model, Collection, Forms, constants |
| `src/extensions/admin/security/IPSetTablePage.js` | **New** | TablePage with batch actions |
| `src/extensions/admin/security/IPSetView.js` | **New** | Detail view with TabView |
| `src/extensions/admin/index.js` | **Edit** | Export IPSetTablePage + IPSetView (after line 54) |
| `src/admin.js` | **Edit** | Export (line 49), import (line 150), registerPage (line 210), nav (line 261) |

## Design Decisions

### Model (`IPSet.js`)

```
Endpoint: /api/incident/ipset

Constants:
- IPSetKindOptions: country, datacenter, abuse, custom
- IPSetSourceOptions: ipdeny, abuseipdb, manual
- CommonBlockCountries: [
    { value: 'cn', label: 'China' },
    { value: 'ru', label: 'Russia' },
    { value: 'kp', label: 'North Korea' },
    { value: 'ir', label: 'Iran' },
    { value: 'ng', label: 'Nigeria' },
    { value: 'ro', label: 'Romania' },
    { value: 'br', label: 'Brazil' },
    { value: 'in', label: 'India' },
    { value: 'pk', label: 'Pakistan' },
    { value: 'id', label: 'Indonesia' },
    { value: 'vn', label: 'Vietnam' },
    { value: 'ua', label: 'Ukraine' },
    { value: 'th', label: 'Thailand' },
    { value: 'ph', label: 'Philippines' },
    { value: 'bd', label: 'Bangladesh' },
  ]
```

### Create Form — kind-driven UX with `showWhen`

Single form, `size: 'md'`. Kind selection at top drives which fields appear:

```
- kind (select, columns: 12) — "What do you want to block?"
    "Country — Block all traffic from a country"
    "Abuse Feed — Import known attacker IPs (AbuseIPDB)"
    "Datacenter — Block datacenter/hosting ranges"
    "Custom — Define your own CIDR list"

- country_code (select, columns: 8, showWhen: kind=country)
    Options: CommonBlockCountries list

- is_enabled (switch, columns: 4, default: true) — always visible

- name (text, columns: 6, showWhen: kind!=country)
    Country kind auto-generates name as "country_{cc}"

- description (text, columns: 6, showWhen: kind!=country)

- source_url (text, columns: 12, showWhen: kind=datacenter)

- source_key (text, columns: 12, showWhen: kind=abuse)
    placeholder: "Your AbuseIPDB API key"

- data (textarea, columns: 12, rows: 8, showWhen: kind=custom)
    placeholder: "One CIDR per line, e.g. 192.0.2.0/24"
```

On submit, if kind=country: set `name: 'country_{cc}'`, `source: 'ipdeny'` automatically.

### Edit Form

Simpler — kind is read-only (shown as badge), all relevant fields visible. No `showWhen` needed since kind is already determined.

### Table Page

- Columns: is_enabled (yesnoicon+filter), name, kind (badge+filter), description (truncate), cidr_count, last_synced (datetime), sync_error (truncate, danger)
- Default sort: name
- Batch: Enable, Disable, Sync to Fleet, Refresh Source, Delete
- Empty: "No IP sets configured. Create one to start blocking traffic at the network level."

### Detail View

- Header: name + kind badge + enabled/disabled badge
- TabView: Configuration (DataView) + CIDR Data (fetch ?graph=detailed, scrollable pre)
- Context menu: Sync to Fleet, Enable/Disable, Refresh Source, Edit, Delete
- All actions: `model.save({ action_name: 1 })`

### Nav

After "Blocked IPs" in Security sidebar. Icon: `bi-shield-shaded`. Label: "IP Sets". Permission: `view_security`.

## Edge Cases

- `source_key` write-only — edit form uses placeholder "Leave blank to keep current"
- `source_url` auto-populates for countries on backend — don't send it from frontend for country kind
- `sync_error` long messages — truncate in table, full in detail view
- `data` excluded from default response — CIDR tab fetches with `?graph=detailed`
- Empty CIDR data — "No CIDRs loaded. Click Refresh Source to fetch."
- `last_synced` null — show "Never"
- Duplicate country name — backend rejects, show error toast
- Country create: derive `name` and `source` from `country_code` before submitting

## Constraints

- Uses `showWhen` from dependency request — if not yet implemented, fall back to separate form configs per kind
- POST_SAVE_ACTIONS use `model.save({ action: 1 })` pattern, NOT `rest.POST({ action: 'name' })`
- Bootstrap 5.3 + Bootstrap Icons only

---
