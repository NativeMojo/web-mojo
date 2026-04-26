# Admin Extension

**Pre-built admin pages, views, and an LLM-backed Assistant for `PortalWebApp`-based applications.**

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [`registerAdminPages(app, addToMenu)`](#registeradminpagesapp-addtomenu)
  - [`registerAssistant(app)`](#registerassistantapp)
- [The `system` Sidebar Menu](#the-system-sidebar-menu)
- [Topbar Wiring](#topbar-wiring)
- [Permissions](#permissions)
- [Importing Individual Pages & Views](#importing-individual-pages--views)
- [Convenience Helpers (`Class.show(...)`)](#convenience-helpers-classshow)
- [Admin Assistant](#admin-assistant)
- [Context-Scoped Assistant Chat](#context-scoped-assistant-chat)
- [Admin Models](#admin-models)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

---

## Overview

The admin extension ships ~50 pre-built admin pages plus an LLM-backed Assistant chat panel, all designed to drop into a `PortalWebApp`. It is published as its own subpath export so it stays out of your default bundle until you opt in.

**What you get:**

- **Account** — users, members, groups, devices, GeoIP, API keys, admin dashboard.
- **Security** — incidents, tickets, events, rule sets, blocked IPs, IP sets, firewall log, bouncer signals/devices, bot signatures, GeoIP.
- **Job engine** — dashboard, runners, jobs, scheduled tasks.
- **Messaging** — email domains/mailboxes/templates/sent, public (contact-form) messages, SMS phone numbers, SMS log.
- **Push notifications** — dashboard, configurations, templates, deliveries, devices.
- **Storage** — file managers, files, S3 buckets.
- **Shortlinks** — links table, click history.
- **Monitoring** — logs, metrics permissions, CloudWatch dashboard.
- **System** — settings, API keys.
- **AI Assistant** — skills, memory, conversations admin pages, plus a topbar-triggered chat panel (`AssistantPanelView` on wide viewports, `AssistantView` fullscreen modal on narrow viewports).

**Two integration helpers do the heavy lifting:**

| Helper | What it does |
|--------|--------------|
| `registerAdminPages(app, addToMenu)` | Registers every `system/*` page on the app and (optionally) injects a fully-wired sidebar menu into your `system` menu config. |
| `registerAssistant(app)` | Adds a `bi-robot` topbar button that opens the Assistant chat panel/modal. Lazy-loads `AssistantPanelView` / `AssistantView` so they aren't in your initial bundle. |

**Import path:**

```js
import { registerAdminPages, registerAssistant } from 'web-mojo/admin';
```

> ✅ Always import from `web-mojo/admin`. Never deep-import `web-mojo/src/extensions/admin/...` — those paths are not part of the public surface.

---

## Quick Start

Minimal portal wiring with admin pages and the Assistant. The full working reference lives in [`examples/portal/app.js`](../../examples/portal/app.js) — copy from there if you want a paste-ready starting point.

```js
import { PortalWebApp, User } from 'web-mojo';
import { registerAdminPages, registerAssistant } from 'web-mojo/admin';

const app = new PortalWebApp({
    name: 'Acme Portal',
    container: '#app',
    pageContainer: '#page-container',
    defaultRoute: 'home',

    api: { baseUrl: 'https://api.example.com' },

    sidebar: {
        defaultMenu: 'default',
        menus: [
            { name: 'default', items: [ /* your app's items */ ] },
            // The `system` menu MUST exist — registerAdminPages will inject the
            // full admin tree into items[] (see "The system Sidebar Menu" below).
            {
                name: 'system',
                className: 'sidebar sidebar-light sidebar-admin',
                header: '<div class="pt-3 text-center fw-bold"><i class="bi bi-wrench pe-2"></i>System</div>',
                items: [
                    { spacer: true },
                    { text: 'Exit Admin', action: 'exit-admin', icon: 'bi-arrow-bar-left',
                      handler: async () => app.sidebar.setActiveMenu('default') },
                ],
            },
        ],
    },

    topbar: {
        rightItems: [
            // Wrench icon flips the sidebar to the system menu
            { id: 'admin', icon: 'bi-wrench', tooltip: 'Open admin', buttonClass: 'btn btn-link',
              handler: () => app.sidebar.setActiveMenu('system') },
        ],
    },
});

app.registerPage('home', HomePage);

// 1) Start the app first — sidebar/topbar must exist before injecting items
await app.start();

// 2) Register admin pages + sidebar items
registerAdminPages(app, true);

// 3) Register the Assistant topbar button (lazy-loads on click)
registerAssistant(app);
```

**Order matters.** `app.start()` builds the sidebar and topbar; `registerAdminPages` and `registerAssistant` then mutate them. Calling either before `start()` either no-ops the menu injection or registers items that your topbar never renders.

---

## API Reference

### `registerAdminPages(app, addToMenu)`

```js
import { registerAdminPages } from 'web-mojo/admin';

registerAdminPages(app, true);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `app` | `WebApp` / `PortalApp` / `PortalWebApp` | The running app instance. |
| `addToMenu` | `boolean` (default `true`) | If `true` and a sidebar menu named `system` exists, the helper unshifts a fully-wired admin tree into that menu's `items` array. If `false`, only `registerPage` calls happen — you handle the menu yourself. |

**What it registers:** every page under `system/*` — Account (`system/dashboard`, `system/users`, `system/groups`, `system/members`, `system/api-keys`), Job Engine (`system/jobs/dashboard`, `system/jobs/runners`, `system/jobs/list`, `system/jobs/scheduled-tasks`), Security (`system/incidents`, `system/tickets`, `system/events`, `system/rulesets`, `system/security/*`, `system/system/geoip`), Messaging (`system/email/*`, `system/messaging/public-messages`, `system/phonehub/*`), Push (`system/push/*`), Storage (`system/s3buckets`, `system/filemanagers`, `system/files`), Shortlinks (`system/shortlinks/links`, `system/shortlinks/clicks`), Monitoring (`system/logs`, `system/metrics/permissions`, `system/cloudwatch`), Settings (`system/settings`), and Assistant admin (`system/assistant/skills`, `system/assistant/memory`, `system/assistant/conversations`).

> ℹ️ The complete `(route, page-class, permissions)` mapping lives in [`src/admin.js`](../../src/admin.js). It is the single source of truth — read it directly when you need the exact list.

`registerAdminPages` is also exported as `registerSystemPages`. Both names refer to the same function.

### `registerAssistant(app)`

```js
import { registerAssistant } from 'web-mojo/admin';

registerAssistant(app);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `app` | `WebApp` / `PortalApp` / `PortalWebApp` | The running app instance. Must have `app.ws` and `app.rest` configured. |

**What it does:**

1. Adds a `bi-robot` button to `topbar.rightItems` (or `topbarConfig.rightItems` if called pre-`start()`).
2. The button is permission-gated to `view_admin` — users without it never see it.
3. On click, picks the display mode based on viewport width:
   - `>= 1000 px` → mounts `AssistantPanelView` as a right sidebar inside `.portal-layout`.
   - `<  1000 px` → opens `AssistantView` in a fullscreen `Modal`.
4. `AssistantPanelView`, `AssistantView`, and `Modal` are loaded with dynamic `import()` — they are not in your initial bundle.
5. Adds a debounced `resize` listener: if the panel is open and the viewport drops below 1000 px, it auto-switches to the fullscreen modal. The active conversation is preserved across mode switches via `app._assistantConversationId`.

> ✅ Calling `registerAssistant` before `app.start()` is fine — it falls back to mutating `app.topbarConfig.rightItems` so the button shows up the moment the topbar mounts. Calling it after `start()` works the same way and re-renders the topbar if needed.

---

## The `system` Sidebar Menu

For `registerAdminPages(app, true)` to inject items, your sidebar config must declare a menu named `system`. Anything you put in its `items` array is preserved — `registerAdminPages` calls `items.unshift(...)` to put the admin tree on top.

**Canonical shape (matches `examples/portal/app.js`):**

```js
{
    name: 'system',
    className: 'sidebar sidebar-light sidebar-admin',
    header: '<div class="pt-3 text-center fs-5 fw-bold sidebar-collapse-hide"><i class="bi bi-wrench pe-2"></i>System</div>',
    items: [
        // The admin tree gets unshifted ABOVE this point.

        { spacer: true },
        {
            text: 'Exit Admin',
            action: 'exit-admin',
            icon: 'bi-arrow-bar-left',
            handler: async () => app.sidebar.setActiveMenu('default'),
        },
    ],
}
```

| Item field | Purpose |
|------------|---------|
| `header` | Optional HTML rendered above the items. Use `sidebar-collapse-hide` so it disappears when the sidebar is collapsed. |
| `{ spacer: true }` | Pushes everything below it to the bottom of the sidebar. |
| `text` / `route` / `icon` / `permissions` / `children` | Standard sidebar item fields. |
| `action` + `handler` | Inline handler. `'exit-admin'` is the convention used by the examples portal to switch back to the default menu. |

> ⚠️ **Without a `system` menu, the admin items have nowhere to go.** `registerAdminPages` checks for it via `app.sidebar.getMenuConfig('system')` and silently skips menu injection if it is missing. The pages will still be registered (so URL routing works), but nothing will appear in the sidebar.

---

## Topbar Wiring

The standard pattern is a wrench icon on the right side of the topbar that flips the sidebar to the `system` menu. The Assistant button (`bi-robot`) is added separately by `registerAssistant`.

```js
topbar: {
    rightItems: [
        // ... your other items ...

        // Admin shortcut — flips sidebar to the `system` menu.
        // Permission-gate it so it doesn't show up for non-admins.
        {
            id: 'admin',
            icon: 'bi-wrench',
            action: 'open-admin',
            tooltip: 'Open admin / system menu',
            buttonClass: 'btn btn-link',
            permissions: ['view_admin'],
            handler: () => app.sidebar.setActiveMenu('system'),
        },
    ],
}
```

If you prefer the central event bus over inline handlers:

```js
app.events.on('portal:action', ({ action }) => {
    switch (action) {
        case 'open-admin': app.sidebar.setActiveMenu('system'); break;
        case 'exit-admin': app.sidebar.setActiveMenu('default'); break;
    }
});
```

`registerAssistant(app)` adds its own `bi-robot` topbar button. You do not need to add it manually.

---

## Permissions

Every admin page is registered with a `permissions:` requirement. The framework's sidebar and router check these against `app.user.hasPermission(...)` and silently hide / 403 anything the user lacks.

**Common permission keys (high level):**

- `security` / `view_security` / `manage_security` — admin dashboard, incidents, tickets, events, rule engine, blocked IPs, firewall log, bouncer, bot signatures
- `view_admin` / `assistant` — AI Assistant admin pages and the topbar Assistant button
- `view_users` / `manage_users` — users, user devices, GeoIP
- `view_groups` / `manage_groups` — groups, members, API keys
- `view_jobs` / `manage_jobs` / `view_scheduled_tasks` / `manage_scheduled_tasks` — job engine
- `manage_aws` — S3 buckets, email mailboxes / domains / sent / templates, CloudWatch
- `view_fileman` / `manage_files` — file managers and file table
- `manage_shortlinks` — shortlinks and click history
- `manage_notifications` / `manage_push_config` / `view_notifications` / `view_devices` / `manage_devices` — push notifications and devices
- `view_phone_numbers` / `manage_phone_numbers` / `view_sms` / `manage_sms` — phone hub
- `view_logs` / `manage_settings` / `manage_metrics` — system pages
- `view_support` / `support` — contact-form messages

> ℹ️ The complete `(route, permissions)` mapping lives in [`src/admin.js`](../../src/admin.js) as the single source of truth. Don't duplicate it here — read the source.

---

## Importing Individual Pages & Views

If you only want a couple of pages and prefer to wire them yourself instead of using `registerAdminPages`, every class is also exported from `web-mojo/admin`.

```js
import {
    // Pages — Table/Dashboard pages, one per admin area
    AdminDashboardPage, UserTablePage, GroupTablePage, MemberTablePage, ApiKeyTablePage,
    IncidentDashboardPage, IncidentTablePage, EventTablePage, TicketTablePage, RuleSetTablePage,
    JobDashboardPage, JobRunnersPage, JobsTablePage, ScheduledTaskTablePage,
    EmailDomainTablePage, EmailTemplateTablePage, SentMessageTablePage, PublicMessageTablePage,
    PhoneNumberTablePage, SMSTablePage,
    PushDashboardPage, PushConfigTablePage, PushTemplateTablePage, PushDeliveryTablePage, PushDeviceTablePage,
    FileManagerTablePage, FileTablePage, S3BucketTablePage,
    ShortLinkTablePage, ShortLinkClickTablePage,
    BlockedIPsTablePage, FirewallLogTablePage, BouncerSignalTablePage, BouncerDeviceTablePage, BotSignatureTablePage, IPSetTablePage,
    LogTablePage, MetricsPermissionsTablePage, SettingTablePage, CloudWatchDashboardPage,
    AssistantSkillTablePage, AssistantConversationTablePage, AssistantMemoryPage,

    // Views — Detail/dialog views (composable, often opened via row clicks)
    DeviceView, GeoIPView, GroupView, MemberView, UserView, ApiKeyView,
    IncidentView, EventView, TicketView, RuleSetView,
    JobDetailsView, JobHealthView, JobStatsView, RunnerDetailsView, ScheduledTaskView,
    EmailTemplateView, EmailView, PublicMessageView, PhoneNumberView, PushDeliveryView, PushDeviceView,
    ShortLinkView, BouncerSignalView, BouncerDeviceView, IPSetView,
    LogView, MetricsPermissionsView, SettingView, FileView, CloudWatchResourceView, CloudWatchChart,
    AssistantView, AssistantSkillView, AssistantConversationView,
} from 'web-mojo/admin';
```

The complete export list is in [`src/admin.js`](../../src/admin.js).

---

## Convenience Helpers (`Class.show(...)`)

A handful of admin views expose a static `show()` helper that wraps the view in a `Dialog` — useful when you have an ID or model in hand and just want the detail view to pop up:

- `GeoIPView.show(ip)` — look up an IP via the GeoIP API and show its details
- `DeviceView.show(duid)` — look up a user device by DUID
- `JobDetailsView.show(job, options?)` / `RunnerDetailsView.show(runner, options?)` / `ScheduledTaskView.show(task, options?)` — show job-engine details (status-aware action buttons)
- `CloudWatchResourceView.show(account, slug, resource)` — show all metric categories for one CloudWatch resource

```js
import { GeoIPView, JobDetailsView } from 'web-mojo/admin';

await GeoIPView.show('8.8.8.8');
await JobDetailsView.show(job, { size: 'xl', scrollable: true });
```

---

## Admin Assistant

The Admin Assistant is an LLM-powered chat interface for natural-language queries against your data. It is registered with `registerAssistant(app)`.

### Display modes

`registerAssistant()` automatically selects the display mode based on viewport width each time the topbar button is clicked:

| Viewport width | Display mode |
|----------------|--------------|
| `>= 1000 px` | Right sidebar panel (`AssistantPanelView`) — reflows `.portal-layout` via CSS flex |
| `< 1000 px` | Fullscreen modal (`AssistantView`) |

Clicking the button while the sidebar is open closes it. A debounced `resize` listener watches for crossing the 1000 px threshold and auto-switches modes if needed. The active conversation ID is preserved on `app._assistantConversationId`.

### `AssistantView` (fullscreen modal)

Two-panel layout inside a fullscreen `Modal`:

- **Left** — `AssistantConversationListView`: conversation list from `GET /api/assistant/conversation`, grouped by date (Today / Yesterday / Earlier), with debounced search and "Load more" pagination.
- **Right** — `ChatView` with `AssistantMessageView` for rich blocks, plus a connection-status indicator.

You can also instantiate and show it manually:

```js
import { AssistantView } from 'web-mojo/admin';
import { Modal } from 'web-mojo';

const view = new AssistantView({ app });
Modal.show(view, { size: 'fullscreen', title: ' ', noBodyPadding: true, buttons: [] });
```

### `AssistantPanelView` (sidebar panel)

Compact right-sidebar variant. `registerAssistant` mounts it into a `#assistant-panel` div appended to `.portal-layout`. CSS reflow keeps the page content usable.

**Header bar actions:**

| Button | Action |
|--------|--------|
| `bi-list` hamburger | Toggle between chat and conversation history |
| Conversation title | Display only (truncated) |
| `bi-plus-lg` | Start a new conversation |
| `bi-x-lg` | Close the panel (emits `panel:close`) |

The view also emits `panel:fullscreen` (switch to the modal) and `panel:popout` (open the chat in a popup window).

### WebSocket events

Messages stream through `app.ws` as typed events, each filtered by `conversation_id`:

| Event | Triggered when |
|-------|----------------|
| `message:assistant_thinking` | Backend starts processing — shows a thinking indicator, disables input. |
| `message:assistant_tool_call` | Backend calls a tool — updates thinking text to "Calling {tool}...". |
| `message:assistant_response` | Final response — hides indicator, appends an assistant message, re-enables input. |
| `message:assistant_error` | Backend error — shows error as a system message, re-enables input. |

Falls back to `POST /api/assistant` when WebSocket is unavailable.

### Structured response blocks

Assistant responses can include `blocks` rendered inline:

| Block type | Rendered as |
|------------|-------------|
| `table` | `TableView` (non-paginated, non-sortable) |
| `chart` (line/bar/area) | `SeriesChart` |
| `chart` (pie) | `PieChart` |
| `stat` | Bootstrap stat cards in a flex row |
| `file` | Downloadable card. Requires `filename` and `url`; only `https://`, `http://`, and `/`-rooted URLs accepted. |

### REST endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/assistant/conversation` | List user conversations (`search`, `start` query params). |
| `GET` | `/api/assistant/conversation/{id}` | Load full message history. |
| `DELETE` | `/api/assistant/conversation/{id}` | Delete a conversation. |
| `POST` | `/api/assistant` | REST fallback when WebSocket is unavailable. |

> Cross-link: see [ChatView](../components/ChatView.md) for the underlying chat UI used by the Assistant — adapter-driven messages, file drop, and streaming hooks.

---

## Context-Scoped Assistant Chat

`TicketView` and `IncidentView` each ship an **Ask AI** button that opens a single-conversation Assistant chat scoped to that model instance. It opens in an `xl` `Dialog` so the underlying view stays visible, always shows a single conversation, and the backend gets full model context.

On first open, `POST /api/assistant/context` is called with `{ model, pk }`; the returned `conversation_id` is stored on `metadata.assistant_conversation_id` (via a partial save — the backend auto-merges JSON fields). Subsequent opens resume the same thread; a stale (404) conversation triggers automatic re-creation. Messages stream over the same WebSocket events as the global Assistant.

To add **Ask AI** to your own view:

```js
import { openAssistantChat } from '@ext/admin/assistant/AssistantContextChat.js';

async onActionAskAi() {
    await openAssistantChat(this, 'myapp.MyModel');
}
```

Requirements: `this.model` is set with an `id`; `this.model.get('metadata')` is readable/writable; `this.getApp()` returns the running app. The endpoints used are `POST /api/assistant/context`, `GET /api/assistant/conversation/{id}?graph=detail`, and `POST /api/assistant` (fallback).

---

## Admin Models

Fourteen Model/Collection sets are coupled to the admin extension. They ship from a **separate, UI-free entry** so a Node script, an API client, or a different UI framework can use them without pulling in the admin pages from `web-mojo/admin`.

```js
import { Job, JobList, JobForms } from 'web-mojo/admin-models';
import { Incident, RuleSet } from 'web-mojo/admin-models';
import { Email, Mailbox, EmailDomain } from 'web-mojo/admin-models';
import { Push, PushDevice, PushTemplate } from 'web-mojo/admin-models';
```

### What's in `web-mojo/admin-models`

| Model | Purpose | Endpoint |
|---|---|---|
| `AWS` (S3Bucket) | S3 buckets | `/api/aws/...` |
| `Assistant` | Assistant conversations + skills | `/api/assistant/...` |
| `Bouncer` | Fraud-detection device/signal/signature | `/api/account/bouncer/...` |
| `Email` | Email domain / mailbox / template / sent message | `/api/aws/email/...` |
| `Incident` | Incident / event / rule set / rule | `/api/incident/...` |
| `IPSet` | IP allow/block sets | `/api/incident/ipset` |
| `Job` | Background job + log + event + stats | `/api/jobs/job` |
| `JobRunner` | Job runner control (ping/shutdown) | `/api/jobs/runners` |
| `LoginEvent` | Geolocated login history | `/api/account/logins` |
| `PublicMessage` | Contact form / public-facing messages | `/api/messaging/public` |
| `Push` | Push device / template / config / delivery | `/api/account/devices/push/...` |
| `Phonehub` | Phone numbers + SMS | `/api/phonehub/...` |
| `ScheduledTask` | Cron-style task definitions | `/api/jobs/scheduled_task` |
| `Tickets` | Ticket + ticket notes (cross-references Incident, User) | `/api/incident/ticket` |

### Two-entry split

| Entry | What's in it | Pulls UI deps? |
|---|---|---|
| `web-mojo/admin` | Pages + views (sidebar, dashboards, table pages, detail views) | **Yes** (Sidebar, TableView, ContextMenu, Bootstrap, …) |
| `web-mojo/admin-models` | The 14 Model/Collection classes only — pure data | **No** |

Use `web-mojo/admin` when you're building an admin portal that registers admin pages. Use `web-mojo/admin-models` when you need just the data shapes and REST methods.

### Cross-references to core models

Some admin models reference still-core models. Those imports work transparently — `Tickets` imports `User` from `web-mojo/models`, `Push` imports `Group` from `web-mojo/models`, etc. You don't need to do anything special; the bundler resolves the chain.

### Why this split?

Before this version, admin models lived in `src/core/models/` and were re-exported from `'web-mojo'`, which meant every consumer paid the bytes for them whether they used the admin extension or not. Splitting models into a UI-free entry lets non-admin apps stay lean while admin apps still get a clean import path.

---

## Common Pitfalls

### ❌ Calling `registerAdminPages` before `app.start()`

The sidebar is constructed during `start()`. Calling the registrar before that means `app.sidebar` is undefined and the menu-injection branch silently skips. Routes still register, but the admin tree never appears in the sidebar.

✅ **Fix:** always call after `start()`.

```js
await app.start();
registerAdminPages(app, true);
registerAssistant(app);
```

### ❌ Forgetting the `system` menu in your sidebar config

```js
sidebar: {
    menus: [
        { name: 'default', items: [ ... ] }
        // no `system` menu!
    ]
}
```

`registerAdminPages(app, true)` calls `app.sidebar.getMenuConfig('system')`. If that returns `undefined`, the helper skips menu injection entirely. The user clicks the wrench icon, the sidebar switches to a non-existent menu, and the rail looks blank.

✅ **Fix:** declare a `system` menu (it can start nearly empty — see [The `system` Sidebar Menu](#the-system-sidebar-menu)). The registrar appends the admin tree above whatever items you've put in it.

### ❌ Empty admin menu in dev because of permissions

Every admin item is permission-gated. If your local dev user has no permissions, every item is filtered out — and the resulting admin menu looks empty even though `registerAdminPages` ran successfully.

✅ **Fix (dev only):** wildcard the user's permission check. Production code should never do this.

```js
const demoUser = new User({ id: 1, username: 'demo' });
demoUser.hasPermission = () => true;   // dev/demo only!
app.setActiveUser(demoUser);
```

The examples portal (`examples/portal/app.js`) does exactly this for the offline demo.

### ❌ Calling `registerAssistant` without configuring `app.ws`

The Assistant streams responses over WebSocket via `app.ws`. If you instantiate `WebApp` (not `PortalWebApp`) and don't enable WebSocket, the panel still opens but every message takes the REST fallback path with no streaming and no tool-call indicator.

✅ **Fix:** prefer `PortalWebApp`, which auto-wires `app.ws`. If you stay on `WebApp`, set `ws: { url: '...' }` in the constructor options.

### ❌ Deep-importing internal admin paths

```js
import IncidentView from 'web-mojo/src/extensions/admin/incidents/IncidentView.js';   // ❌
```

Internal paths under `src/extensions/admin/...` are not part of the public surface and may move at any time. The package's `exports` map only blesses `web-mojo` and `web-mojo/admin`.

✅ **Fix:**

```js
import { IncidentView } from 'web-mojo/admin';   // ✅
```

### ⚠️ Pre-`start()` registration of the Assistant button

`registerAssistant(app)` does support being called before `start()` — it falls back to mutating `app.topbarConfig.rightItems`. It works, but the recommended pattern is post-`start()` so the button appears alongside any other dynamic items.

---

## Related Docs

- [PortalWebApp](../core/PortalWebApp.md) — auth-gated portal shell that auto-wires `app.ws` for the Assistant
- [PortalApp](../core/PortalApp.md) — the underlying portal class with sidebar, topbar, and group switching
- [Sidebar & TopNav](../components/SidebarTopNav.md) — sidebar menu shape, topbar items, `setActiveMenu` API
- [ChatView](../components/ChatView.md) — base chat UI used by the Admin Assistant
- [WebSocketClient](../services/WebSocketClient.md) — the transport the Assistant uses for streaming responses
- [Built-in Models](../models/BuiltinModels.md) — `User`, `Group`, `Incident`, `Ticket`, `Job`, `File`, etc. (every admin page is backed by one of these)
- [`src/admin.js`](../../src/admin.js) — single source of truth for routes, page classes, and permissions
- [`examples/portal/app.js`](../../examples/portal/app.js) — working reference integration
