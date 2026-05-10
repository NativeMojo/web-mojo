---
status: open
type: request
scope: src/extensions/admin
created: 2026-05-09
parent: detailview-audit-round-2.md (R6)
---

# DetailView TableView → ListView sweep — per-view inventory + classification

`Modal.detail` is width-constrained (default `lg`), and TableViews with 5–7 columns render cramped inside that envelope — UserView's round-1 audit redesign (and the round-2 R1/R2 work) demonstrated that ListView with feed/card item templates uses the available width better and degrades more gracefully on narrow viewports.

This request is the per-view inventory deferred out of [`detailview-audit-round-2.md`](detailview-audit-round-2.md) R6. Each in-modal `TableView` is classified as either:

- **convert (quick-glance)** — operators read the row as "this happened, then this, then this" and click into a detail modal. ListView wins.
- **keep (primary-deep-dive)** — operators compare columns side-by-side. TableView wins.

The conversions can be picked off view-by-view across multiple sessions; this file is the punch list. Use UserView's audit/devices/logins/groups conversion as the playbook (`paginationMode: 'pages'`, `pageSize: 5`, `clickAction: 'view'`, `viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] }`).

## Inventory

### MemberView · `src/extensions/admin/account/users/MemberView.js`

| Line | What | Recommendation | Why |
|---|---|---|---|
| 256 | Audit table (LogList) | **convert** | Chronological per-member audit; identical shape to UserView's Audit Log feed which is already a `.user-audit-row` ListView with day grouping |

### GroupView · `src/extensions/admin/account/groups/GroupView.js`

| Line | What | Recommendation | Why |
|---|---|---|---|
| 768 | Members (MemberList) | **convert** | Quick-glance "who's in this group"; row-click should open MemberView. Already has `clickAction: 'view'`. Two columns (User + Email + perms badge + Joined) read fine as a card. |
| 787 | Sub-Groups (GroupList) | **convert** | Same pattern as Members — quick-glance with click-through. Drop the table chrome. |
| 811 | API Keys (ApiKeyList) | **convert** | Quick-glance card per key (name + status + permissions chips + last-used). Primary actions live in row context menu. |
| 840 | Events (IncidentEventList) | **convert** | Chronological feed; matches the `.user-audit-row` shape. Add `groupByDay('created')` for free day separators. |

### IncidentView · `src/extensions/admin/incidents/IncidentView.js`

| Line | What | Recommendation | Why |
|---|---|---|---|
| 1258 | Rules table (RuleEngine section) | **keep** | Operators tune rule conditions side-by-side (priority, condition, value, value_type). Column comparison is the primary task — table is the right shape. |
| 1436 | Tickets (TicketList) | **convert** | Quick-glance "what tickets does this incident have"; click opens TicketView. Status + assignee + priority chips fit a card layout. |
| 1482 | Related incidents | **convert** | Quick-glance "is this part of a cluster"; click opens IncidentView. Title + count + last-fired reads cleanly as a card. |
| 1644 | Events table (IncidentEventList) | **convert** | Chronological event feed for the incident; matches the audit-row shape. Add `groupByDay('created')`. |

### RuleSetView · `src/extensions/admin/incidents/RuleSetView.js`

| Line | What | Recommendation | Why |
|---|---|---|---|
| 269 | Conditions table | **keep** | Same reasoning as IncidentView's rules table — operators compare rule conditions side-by-side. Table is the right shape; the existing column layout (priority / condition / value / type) is the primary surface. |
| 604 | Incidents table (incidents fired by this ruleset) | **convert** | Quick-glance "what's this rule firing on"; click opens IncidentView. Card layout (title + last-fired + event count chip) reads better than column rows. |

### DeviceView · `src/extensions/admin/account/devices/DeviceView.js`

| Line | What | Recommendation | Why |
|---|---|---|---|
| 643 | Locations table (LoginEventList scoped to device) | **convert** | Chronological login feed; identical use case to UserView's Logins timeline. Use `.user-login-row` template + `groupByDay('created')` for the same vertical-rail timeline treatment. |

### JobDetailsView · `src/extensions/admin/jobs/JobDetailsView.js`

| Line | What | Recommendation | Why |
|---|---|---|---|
| 559 | Events table | **convert** | Chronological job-event feed; audit-row shape with day grouping. |
| 575 | Logs table | **keep** | Operators filter logs by level + kind + date range and read them column-aligned for grep-like scanning. Table's filter pills + column-sortable headers are load-bearing. |
| 597 | Similar jobs | **convert** | Quick-glance "what other jobs look like this one"; click opens JobDetailsView. Card layout (name + state badge + duration + last-run) reads better. |

### RunnerDetailsView · `src/extensions/admin/jobs/RunnerDetailsView.js`

| Line | What | Recommendation | Why |
|---|---|---|---|
| 667 | Active jobs | **convert** | Quick-glance "what's this runner working on right now"; click opens JobDetailsView. Card layout (name + state + age) fits. |
| 695 | Job history | **convert** | Chronological completed-jobs feed; audit-row shape with day grouping. |
| 734 | Logs table | **keep** | Same reasoning as JobDetailsView · Logs — column-aligned operator workflow. Keep TableView. |

## Summary

| Action | Count |
|---|---|
| Convert to ListView | 14 |
| Keep TableView | 4 |
| **Total in scope** | **18** |

Roughly 78% of in-modal TableViews convert. The 4 that stay (RuleEngine conditions, RuleSetView conditions, JobDetails logs, RunnerDetails logs) are all "operator filters and reads columns" surfaces where row density + column alignment is load-bearing.

## Per-conversion playbook

Each conversion follows this shape (mirroring the UserView round-1 + round-2 work):

```js
new ListView({
    collection: someCollection,
    paginated: true,
    paginationMode: 'pages',
    pageSize: 5,
    clickAction: 'view',
    viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] },
    hideActivePillNames: ['<scope-fields-already-shown-in-header>'],
    emptyMessage: '...',
    // Add for chronological feeds:
    ...groupByDay('created'),
    itemTemplate: `
        <div class="user-audit-row user-audit-row-{{model.level|levelTone}}">  <!-- audit shape -->
            <div class="user-audit-icon"><i class="bi {{model.level|levelIcon}}"></i></div>
            ...
        </div>
    `
});
```

For non-chronological lists (Members, Sub-Groups, API Keys, Tickets, Related, Similar jobs, Active jobs), drop `groupByDay` and use a card-style itemTemplate per the existing UserView Groups ListView at `UserView.js:1162` — the `.user-feed-row` flat-strip shape works for these.

## Suggested order

Knock off the cheapest, highest-value conversions first:

1. **MemberView L256 — Audit** (single conversion, biggest visual impact per line of code)
2. **DeviceView L643 — Locations** (gets the logins-timeline treatment for free)
3. **GroupView × 4** (Members / Sub-Groups / API Keys / Events — all in one file, formulaic)
4. **IncidentView × 3** (Tickets / Related / Events — Rules table stays)
5. **RuleSetView L604 — Incidents fired** (Conditions stays)
6. **JobDetailsView × 2 + RunnerDetailsView × 2** (Logs in both stays)

## Out of scope

- TableViews on top-level pages (TablePage / FormPage surfaces) — those are not Modal.detail-constrained and column layouts work fine.
- Layout polish on the `keep` TableViews — that's a separate concern.
- Adding new columns / filters / sorts to the converted ListViews — preserve existing data shape, just change the rendering primitive.

## See also

- [`planning/done/detailview-audit-round-2.md`](../done/detailview-audit-round-2.md) — round-2 R6 (this is its follow-up).
- [`planning/requests/listview-grouped-rows.md`](listview-grouped-rows.md) — the `groupByDay` primitive every chronological conversion uses.
- UserView's reference conversions — `src/extensions/admin/account/users/UserView.js` (audit feeds at L797/L824/L851, logins timeline at L1199, groups list at L1162).
