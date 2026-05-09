---
status: open
type: request
scope: src/extensions/admin
created: 2026-05-08
---

# DetailView migration — redesign plan for 10 admin views

## Context

`src/core/views/data/DetailView.js` is the new record-detail primitive
(header + side-nav + sections + chips + active-toggle + context-menu),
proven out by `src/extensions/admin/incidents/RuleSetView.js`. We want
the rest of the admin record screens to share this shape — and the
migration is a chance to **rethink** what an admin actually wants to
see and do, not just port the existing layout into a new shell.

## Design principles (drawn from RuleSetView)

1. **Front-load decisions, not data.** The Overview section opens with
   4 KPI cards stating *current state* (active? recent count? last
   activity? primary configuration?) — not a 30-row attribute table.
2. **Tell the story.** Where the record describes a process (incident
   triage, rule firing, job execution), use a left-to-right flow strip
   (`STEP 1 → STEP 2 → STEP 3`) instead of a flat field list.
3. **Inline edit affordances.** Every section gets a pencil that opens
   a focused 3–6 field mini-form (`Modal.modelForm`). The full record
   form survives only as a power-user escape hatch in the context menu.
4. **Promote known fields, hide raw.** Metadata sections expose the
   keys the framework knows about as a `DataView`, with raw JSON
   collapsed below. Same for `ip_info`, `device_info`, etc.
5. **Live sidebar badges.** Counts that matter (open incidents, member
   count, active sessions, hits) live as `setBadge()` on the side-nav
   so the user sees them without navigating.
6. **Group by intent, not by table.** Side-nav dividers should read
   *Overview / Configuration / Activity / Detail*, not *Tab1 / Tab2 /
   Tab3*. Activity sections always cluster behind one divider.
7. **Drop the metadata catch-all.** Almost every current view has a
   raw-JSON tab nobody opens. Keep it under a `Detail` divider, but
   don't make it co-equal with content tabs.
8. **Cross-record navigation is a chip, not a button.** When a record
   refers to another record (User → Group, File → Owner, Incident →
   RuleSet), make it a clickable chip in the header — opens a nested
   `Modal.detail` of that record.

## Shared primitives we'll likely need

Already shipped with RuleSetView:
- `MetricCard` — KPI tile with label/value/icon/tone/action
- `SegmentControl` — 7d/30d/90d range picker
- `SideNavView` with badge support, dividers, responsive
- `DetailHeaderView` standalone (when not in a modal)

Additions worth landing alongside this migration:
- **`StatusPanel`** — big colored hero panel for the *current* state of a
  record (Incident status, Job status, Runner alive/dead). Shows state
  + duration in state + primary action button. Used in `Overview` of
  IncidentView, JobDetailsView, RunnerDetailsView.
- **`Timeline`** — vertical event timeline (icon + label + relative
  time) for incident history, job lifecycle events, login activity.
- **`FlowStrip`** — the `STEP 1 → STEP 2` layout extracted from
  `RuleSetTriggeringSection` into a reusable component.
- **`KnownFieldsCard`** — promote known keys of a JSON blob (metadata,
  ip_info, device_info) into a 2-col `DataView` with raw JSON below.
  Three views need this.

## Migration order

Recommended phasing — start where the value is highest:

| # | View                | Effort | Value | Notes |
|---|---------------------|--------|-------|-------|
| 1 | **IncidentView**    | L      | ★★★   | Most-used; biggest delta from current |
| 2 | **JobDetailsView**  | M      | ★★★   | Status panel + timeline pattern proves Phase A primitives |
| 3 | **UserView**        | L      | ★★    | 12 sections collapse to 7 — large readability win |
| 4 | **RunnerDetailsView** | M    | ★★    | Migrates off TabView; brings runners into the family |
| 5 | **GeoIPView**       | M      | ★★    | Already SideNav — mostly cosmetic + section regroup |
| 6 | **GroupView**       | S      | ★     | Already close to the pattern |
| 7 | **FileView**        | S      | ★     | Already close to the pattern |
| 8 | **ShortLinkView**   | S      | ★     | Polish; preview card stays as-is |
| 9 | **DeviceView**      | S      | ★     | Two-section view → grow to 5 |
|10 | **MemberView**      | XS     | ★     | Smallest; do last as a warm-up exercise |

---

## Per-view redesigns

### 1. IncidentView — security incident record

**Today:** 7–12 sections (conditional). Header is a custom HTML block,
not `DetailHeaderView`. Lots of investigation surface; status is just
two badges in the header.

**Pain:** No clear "what's the current status and what do I do next"
read. Forensic surface (HTTP request, IP intel, stack trace) lives at
the same level as response surface (rule engine, tickets) — admins
have to mentally re-group while triaging. Metadata key fields are
tucked at the bottom.

**Redesign:**

```
HEADER
  icon: severity-color shield  (red/amber/blue by status×priority)
  title: incident.title  (or category if title empty)
  subtitle: rule_set.name  →  click navigates to RuleSetView
  chips:
    [P{n}]  [status]  [scope]  [hostname]  [{event_count} events]
    [Protected] when metadata.do_not_delete
  actions:
    Resolve   Assign   Add note     ⋮ context menu
  context menu:
    Re-run handler chain · View source IP · View user ·
    Mark as duplicate · Delete (with do_not_delete guard)

SECTIONS
  Overview                     — StatusPanel + 4 KPIs + at-a-glance card
  Events                       — table (badge: count)
  ──── Investigation ────
  Source                       — IP intel + geo + recent activity for this IP
  Request                      — HTTP req/res capture (when http_method present)
  Stack Trace                  — code-frame style (when stack_trace present)
  ──── Response ────
  Rule Engine                  — what fired and why
  Tickets                      — linked tickets (badge: open count)
  History                      — chat-style activity timeline
  ──── Related ────
  Related Incidents            — same source / rule / user (badge: count)
  Detail                       — metadata, raw fields
```

**Overview shape:**

```
┌──────────────────────────────────────────────────────────┐
│ STATUS PANEL                                             │
│ ▣ Active · 2h 14m   →   [ Resolve ]  [ Assign to me ]   │
│   Last event 4 min ago · 47 events from 3 sources        │
└──────────────────────────────────────────────────────────┘

┌────────────┬────────────┬────────────┬────────────┐
│ Events     │ Sources    │ Last fired │ Related    │
│ 47         │ 3 IPs      │ 4m ago     │ 12         │
└────────────┴────────────┴────────────┴────────────┘

┌─────────────────────────┬─────────────────────────┐
│ ▶ What triggered this   │ ▶ What happened next    │
│ Rule: «Brute force»     │ Handler: block://?ttl=… │
│ Category: auth.failed   │ Ticket: #4821 (open)    │
│ Source: 198.51.100.42   │ Last action: 4m ago     │
└─────────────────────────┴─────────────────────────┘
```

**Key changes:**
- Migrate to `DetailView` — header gets `DetailHeaderView`
- New `StatusPanel` primitive in Overview (also used by JobDetailsView)
- "HTTP Request" and "IP Intel" promoted out of investigation overflow,
  given clear divider
- Drop "Metadata" as a co-equal section — it becomes the `Detail` group's
  only entry, with `KnownFieldsCard` promoting the ~20 keys we know
- History uses ChatView already; wrap it in a section with eyebrow

---

### 2. JobDetailsView — background job record

**Today:** 5 sections, status as badge in header, error block as red
mono-pre in Details.

**Pain:** The single most important question — *did this job run, and
how is it now* — is buried in a column of fields. Retry/cancel are
small icon buttons. Scheduled jobs and finished-with-error jobs read
the same.

**Redesign:**

```
HEADER
  icon: status-colored gear (running=blue spin, success=green check,
        error=red exclamation, scheduled=amber clock, cancelled=gray)
  title: func    (monospace)
  subtitle: «Running on runner-7 since 4m ago» (state-aware)
  chips:
    [#{id}]  [channel]  [attempt n/m]  [duration]
    [Cancel requested] when cancel_requested
  actions:
    Retry   Cancel   Refresh    ⋮ context menu

SECTIONS
  Overview                 — StatusPanel + KPIs + error block (if any)
  Payload                  — JSON (collapsible large fields)
  ──── Activity ────
  Events                   — job lifecycle timeline (Timeline primitive)
  Logs                     — log stream with kind filter
  ──── Related ────
  Retry History            — previous attempts of this same job
  Similar Jobs             — same func, recent runs (badge: count)
  Detail                   — raw record + metadata
```

**Status panel content per state:**

| Status     | Headline                      | Action surface |
|------------|-------------------------------|----------------|
| Scheduled  | Scheduled in 2h 14m           | [Run now] [Cancel] |
| Running    | Running on runner-7 · 4m 12s  | [Cancel] |
| Success    | Completed in 1m 38s · 4m ago  | [Retry] |
| Failed     | Failed after 38s · 12m ago    | [Retry] [View error] |
| Cancelled  | Cancelled by user · 1h ago    | [Retry] |

**Key changes:**
- New `StatusPanel` carries the lifecycle visually
- New `Timeline` for Events section (vertical, icon + label + when)
- "Retry History" promoted as its own section — admins regularly need
  to see "did it succeed on attempt 3?"
- Payload section gets JSON tree with collapse/expand for large blobs

---

### 3. UserView — user account

**Today:** 12 sections under 4 dividers. *Profile / Personal /
Security / OAuth / divider Access / Permissions / Adv Permissions /
Groups / API Keys / divider Activity / Events / Activity Log / Object
Logs / divider Devices / Locations / Push Devices / divider Settings /
Notifications / Metadata*.

**Pain:** 12 sections is too many for casual admin work. Personal vs
Profile, Permissions vs Adv Permissions, Activity Log vs Object Logs,
Devices vs Push Devices — each split is a research task for the user.

**Redesign — collapse to 9 sections:**

```
HEADER
  avatar (clickable to upload)
  title: display_name
  subtitle: email · phone (with verify icons inline)
  chips:
    [account_type]  [● online]  [Verified]  [Last seen 2h ago]
    [Locked] when account is locked
  active toggle: is_active
  actions:
    Send password reset   Magic link    ⋮
  context menu:
    Force verify email · Force verify phone · Revoke all sessions ·
    Impersonate (admin only) · Delete user · Clear avatar

SECTIONS
  Overview                   — KPIs + recent activity timeline
  Profile                    — name, email, phone, oauth, avatar
  ──── Access ────
  Groups                     — table (badge: count)
  Permissions                — flat + advanced toggle (replaces split)
  API Keys                   — table (badge: count)
  ──── Activity ────
  Devices                    — browser AND push, kind column (badge: count)
  Locations                  — login map + table
  Audit                      — events + activity log + object log unified
  ──── Settings ────
  Notifications              — channel preferences
  Detail                     — metadata
```

**Overview KPIs:** [Devices, Last login, Active sessions, Groups]

**Key consolidations:**
- *Profile + Personal + OAuth* → one **Profile** section
  (mini-form per concern via pencils)
- *Permissions + Adv Permissions* → one **Permissions** section
  with "Show advanced" segment toggle
- *Devices + Push Devices* → one **Devices** section, `kind` column
  distinguishes browser/push
- *Events + Activity Log + Object Log* → one **Audit** section with
  source filter ("All / Incidents / Activity / Object changes")
- Metadata moves under `Detail` divider (not its own group)

---

### 4. GroupView — access group

**Today:** 8 sections; details panel uses styled rows instead of
DataView. Hierarchy through parent link.

**Pain:** The Details section reinvents `DataView`. Sub-Groups vs
Members vs API Keys could share a *Members & Access* group.

**Redesign:**

```
HEADER
  icon: kind-aware (team / department / project / org)
  title: name
  subtitle: parent group breadcrumb (Group → Sub → This)
  chips:
    [kind]  [{n} members]  [{n} sub-groups]  [timezone]
    [Has portal] when metadata.portal
  active toggle: is_active
  actions: Edit  Invite member   ⋮

SECTIONS
  Overview                  — KPIs + hierarchy mini-tree
  Identity                  — name, kind, parent, timezone, eod_hour, domain, portal
  ──── Membership ────
  Members                   — table (badge: count)
  Sub-Groups                — table (badge: count)
  ──── Access ────
  API Keys                  — table (badge: count)
  Permissions               — group-scoped permissions if any
  ──── Activity ────
  Events
  Audit
  Detail                    — metadata
```

**Overview KPIs:** [Members, Sub-groups, API Keys, Last activity]
Plus a small hierarchy panel:

```
Engineering / Backend / Payments
└─ This group · 12 members · 3 sub-groups
   ├─ Payments-API (4)
   ├─ Payments-Web (5)
   └─ Payments-Ops (3)
```

---

### 5. MemberView — group membership

**Today:** 4 sections. Already small.

**Redesign:**

```
HEADER
  user avatar (clickable → opens UserView)
  title: «{user.display_name} in {group.name}»
  subtitle: «{role} · joined {created|relative}»
  chips:
    [user.email]  [group.kind]  [role]
  active toggle: is_active
  actions: Edit role   Remove from group (danger)   ⋮
  context menu: View user · View group · Audit log

SECTIONS
  Overview              — at-a-glance (who/where/role/since)
  Permissions           — autosave switch grid (existing)
  ──── Activity ────
  Audit                 — logs scoped to this membership
```

**Key changes:** Tiny view. Treat it as a stress test for the
"DetailView for trivially small records" case — should feel right
even at 3 sections.

---

### 6. DeviceView — user device

**Today:** 2 sections (Details + Locations).

**Pain:** Underdeveloped. Admins investigating a security alert want
to know *what is this device, where has it been, is it suspicious*.

**Redesign — grow from 2 to 5 sections:**

```
HEADER
  icon: browser-specific (Chrome/Firefox/Safari/Edge) overlaid w/ OS
  title: «Chrome 122 on macOS Sonoma»
  subtitle: «Last seen 4h ago from 198.51.100.42»
  chips:
    [duid:f8c2…]  [{n} sessions]  [{n} locations]
    [Trusted] / [Blocked]   [VPN] [Tor] [Proxy] (any threat flag)
  active toggle: trusted (custom — saves to model.is_trusted)
  actions: View user   ⋮ context menu: Forget device · Block device

SECTIONS
  Overview              — KPIs + threat-signal panel
  Hardware              — full device_info (screen, lang, tz, color depth)
  ──── Activity ────
  Locations             — login locations table + map
  Sessions              — login sessions / token grants
  ──── Detail ────
  Metadata
```

---

### 7. FileView — uploaded file

**Today:** 5 sections (Preview, Details, Renditions, Shares, Metadata).
Already close to the pattern.

**Pain:** Mostly OK. Missing: who has actually downloaded this file?

**Redesign:**

```
HEADER
  icon: thumbnail-as-icon (or category icon if no preview)
  title: filename
  subtitle: «{size} · {dimensions or duration} · uploaded {when} by {user}»
  chips:
    [category]  [content_type]  [Public] / [Private]  [{n} renditions]
  active toggle: is_public
  actions: Download   Copy URL   Share   ⋮

SECTIONS
  Preview                   — large preview (current good)
  Details                   — file properties + ownership
  Renditions                — gallery grid (current good)
  ──── Sharing ────
  Shares                    — short links (badge: count)
  Access Log                — NEW: who downloaded, when, from where
  ──── Detail ────
  Metadata                  — EXIF / video probe / raw JSON (KnownFieldsCard)
```

**Key change:** Add **Access Log** — surfaces "this sensitive file was
downloaded by X 3 times yesterday".

---

### 8. ShortLinkView — short URL

**Today:** 5 sections. Already polished.

**Redesign — mostly polish:**

```
HEADER
  icon: link
  title: short_link  (monospace; with copy button INLINE in title)
  subtitle: url  (truncate; full on hover)
  chips:
    [source]  [{hit_count} hits]  [Tracked] / [Untracked]
    [Expires {when}]   [Protected] when is_protected
  active toggle: is_active
  actions: Copy   Open destination   Edit   ⋮

SECTIONS
  Overview                  — KPIs (hits 30d / 7d / today / top country)
                              + preview card (Slack/iMessage mock)
  Configuration             — original URL, source, tracking flags, expiry, password
  ──── Activity ────
  Click History             — table (badge: count if recent surge)
  Metrics                   — chart (if track_clicks)
  ──── Detail ────
  OG / Social               — og_*, twitter_* (current Metadata)
  Metadata                  — raw JSON
```

**Key change:** Split current Metadata into *OG/Social* (curated) +
*Metadata* (raw). Adds clarity without losing power.

---

### 9. RunnerDetailsView — job runner

**Today:** 5 *tabs* (TabView, not SideNav). Lazy-loaded. Migrate to
DetailView.

**Pain:** TabView puts everything visually equivalent. Health is the
question that brought you here, but you have to click "System Info" or
"Logs" to find it.

**Redesign:**

```
HEADER
  icon: gear with pulse animation when alive
  title: runner_id
  subtitle: «Up 3d 14h · processed 12,403 jobs · 0.4 % failure»
  chips:
    [channels: web, jobs, mail]   [v0.4.7]   [{n} active]
    [● Healthy] / [● Stale heartbeat] / [● Down]
  active toggle: enabled flag (if model has one)
  actions: Ping   Shutdown   Broadcast   ⋮

SECTIONS
  Overview                  — Big StatusPanel + KPIs + heartbeat sparkline
  System                    — CPU/memory/disk progress bars (current SysinfoTab)
  Channels                  — what this runner serves
  Active Jobs               — currently running (badge: count)
  ──── History ────
  Job History               — recent completed jobs
  Logs                      — filterable stream (current LogsTab)
  ──── Control ────
  Actions                   — shutdown / drain / broadcast / restart
```

**Key changes:**
- Migrates off TabView onto SideNav — consistent with rest of admin
- Adds a heartbeat sparkline to Overview (live, polled)
- Splits "Logs vs Job History" — they answer different questions
- Lazy-load preserved via `onAfterRender` in section views

---

### 10. GeoIPView — IP geolocation record

**Today:** 8 sections, already SideNav.

**Pain:** Too many small sections. Map deserves to live IN Overview,
not as its own tab.

**Redesign — collapse from 8 to 7:**

```
HEADER
  icon: globe with country flag inset
  title: ip_address  (monospace)
  subtitle: «{city}, {region}, {country} · ASN {asn} ({isp})»
  chips:
    [country flag]  [Threat: {level}]  [Risk score]
    [VPN] [Tor] [Proxy] [Cloud] [Datacenter]   (only when true)
  active toggle: is_blocked  (custom: toggling opens duration picker)
  actions: Block   Whitelist   Refresh geolocation   ⋮

SECTIONS
  Overview                  — KPIs + EMBEDDED MAP + threat panel
  Network                   — ASN, ISP, hosting flags, reverse DNS
  Risk & Reputation         — flag breakdown with sources
  ──── Enforcement ────
  Block & Whitelist         — current state + history
  ──── Activity ────
  Events                    — incident events from this IP
  Logs                      — request logs + audit log unified
  ──── Detail ────
  Metadata
```

**Key changes:**
- Map embedded in Overview (lazy-init on first paint)
- *Traffic + Logs* unified into one **Logs** section (kind filter)
- Block/Whitelist tightened to one section ("Enforcement")
- Threat flags promoted to header chips (only when true), so the badge
  pile is informative not decorative

---

## Implementation notes

### Header conventions
- All headers extend `DetailHeaderView` via `DetailView`
- Icons follow Bootstrap Icons; severity-colored variants only on
  status-driven views (Incident, Job, Runner)
- Chips: ≤6 visible, use `when:` callbacks to hide irrelevant ones
- Cross-record chips (e.g. Incident → Rule, User → Group) become
  clickable in a follow-up — `DetailHeaderView` doesn't support
  clickable chips today; a small extension lands during Phase A
- Active toggle: only when there's a meaningful boolean state
  (`is_active`, `is_blocked`, `is_public`, `trusted`)

### Section conventions
- Every section view extends `View` and lives in the same file as the
  parent `DetailView` subclass (RuleSetView's pattern)
- Pencils on individual concerns open `Modal.modelForm` mini-forms
  (3–6 fields each). Full record form remains accessible via the
  header context menu's "Edit ___" item
- Tables inside sections use `TableView` with `eyebrow` for live
  counts; `setEyebrow()` from `fetch:success`
- Metadata is always the last section, under a `Detail` divider
- Every section that reads from a shared collection takes it via
  `options.collection` (don't construct your own — the parent owns
  it so the sidebar badge stays in sync)

### Cross-section navigation
- Section views emit `'navigate'` with a section key
- Parent `DetailView` subclass wires those to `this.showSection(key)`
- Same pattern as RuleSetView for "view incidents from this rule"

### Permissions
- `view_logs` and similar permission gates live on each section, not
  the parent — sections can refuse to render or render an empty state
- Use `getApp().auth.canView('admin.logs')` etc. — match what
  UserView and GroupView already do

### Theming
- All new component CSS lives in `src/extensions/admin/css/admin.css`
  with explicit `[data-bs-theme="dark"]` overrides at the bottom of
  the file (per `.claude/rules/theming.md`)
- Reuse the surface tokens already defined in `core.css`; only new
  hex literals for record-status colors (the red/amber/green hero
  panel backgrounds)

## Open questions

1. **StatusPanel** — is this a generic primitive worth shipping in
   `@core/views/data/`, or admin-extension-only? Probably core, since
   any line-of-business app has lifecycle records.
2. **Timeline** — same question. Likely core.
3. **Clickable chips in DetailHeaderView** — small spec needed:
   `chip.action` triggers a parent action handler, or `chip.onClick`
   for inline. Either works.
4. **JSON tree for large payloads** in JobDetailsView — do we have a
   primitive? If not, a small one is worth landing during Phase A.

## Suggested first PR

Land the Phase A primitives first (StatusPanel, Timeline, FlowStrip,
KnownFieldsCard, clickable header chips), then **JobDetailsView** as
the first migration — small enough to validate the primitives end to
end, structurally similar enough to RuleSetView that the diff is
readable, and high enough value to demonstrate the redesign is real.

After that, **IncidentView** is the marquee migration.
