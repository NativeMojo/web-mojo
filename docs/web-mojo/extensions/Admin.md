# Admin Extension

**Pre-built admin pages, views, and an LLM-backed Assistant for `PortalWebApp`-based applications.**

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [`registerAdminPages(app, addToMenu)`](#registeradminpagesapp-addtomenu)
  - [`registerAssistant(app)`](#registerassistantapp)
  - [`registerTicketPanel(app)`](#registerticketpanelapp)
- [The `system` Sidebar Menu](#the-system-sidebar-menu)
- [Topbar Wiring](#topbar-wiring)
- [Permissions](#permissions)
- [Phone Hub — Config Page (`system/phonehub/config`)](#phone-hub--config-page-systemphonehubconfig)
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
- **Security Dashboard** — top-level mission-control link (incident dashboard).
- **System Security** — tickets, incidents, events, rules.
- **Network Security** — IPs, IP sets, blocked, firewall log, geofencing (`system/security/geofencing`: platform rules editor, what-if simulator, blocks log with metrics, exemptions audit; needs django-mojo ≥ v1.2.42). A per-group **Geofencing** section on `GroupView` edits `Group.metadata.geofence` over a read-only platform floor.
- **Bouncer** — signals, devices, bots.
- **Job engine** — dashboard, runners, jobs, scheduled tasks.
- **Messaging** — email domains/mailboxes/templates/sent, public (contact-form) messages, SMS phone numbers, SMS log, SMS provider configs (Twilio / AWS SNS / Mojo Remote).
- **Push notifications** — dashboard, configurations, templates, deliveries, devices.
- **DNS / Edge** — domains, DNS records, delegated/direct ACME certificate status, provider credentials, purchase ledger (`system/dns/*`, over django-mojo's `dnsman` app). Certificate responses are positively projected to status metadata only; no PEM, key, material URL, export, or download control is accepted or rendered. Delegated issuance requires an exact capability load plus an authoritative delegation read, and the `apex_wildcard` profile accepts exactly the apex and wildcard. Ambiguous record, certificate, and credential mutations reconcile from the authoritative resource in `finally`; if reconciliation fails, that resource remains locked until an explicit successful Refresh. Record confirmation is invalidated when either the exact set or any same-owner row changes, including a new CNAME conflict. Credential links let global managers choose an eligible group while tenant managers retain their active group; rotation retains the row's group/provider and clears typed secrets after one attempt. Buying a domain is a search→quote→confirm→register wizard; the TLD comparison grid and similar-name suggestions need django-mojo ≥ v1.2.55 (older backends fall back to a single-name check with a note). **Registrant Contact** (`system/dns/registrant`) edits the ICANN contact registrations are filed under, in two scopes: the *house* contact used by every group without one of its own, and a specific *group's* contact. A group that merely inherits a contact is told so and never shown its values — that contact is the operator's personal name, address and phone. Needs django-mojo's portal-managed registrant API; an older backend says so and points at `DNSMAN_REGISTRANT_CONTACT` instead of erroring. **Edge** adds structured VHosts and declared Upstreams (`system/dns/vhosts`, `system/dns/upstreams`), WebApps and immutable release history (`system/dns/webapps`), global exact-revision fleet deploy (`system/edge/deploy`), and the fleet-wide blocklist (`system/edge/blocklist`). VHosts follow django-mojo's template-kind system (≥ 1.6.0): every vhost is one of `api` / `site` / `site_api` / `redirect`, **creation is a four-shape wizard** (shape cards → that shape's knobs only → review), and editing offers exactly the current kind's knobs with no kind control anywhere — changing shape is delete-and-recreate, and deleting a vhost that serves a WebApp warns by name (the link is severed and the site goes dark until re-linked). `site_api` vhosts manage proxied path prefixes in a Routes section (quiet paths must sit under a declared prefix, so they are added after routes exist); the review step pre-checks duplicate enabled server names client-side because the server answers that unique-constraint race with an opaque 500. `claims_reserved` is read-only and moves only through the claim/release kebab, rendered solely for a literal superuser on a house domain. The blocklist (`ip`/`ua` rows, mode `allow|off|log|enforce`, log-first) is fleet-scoped: its page, nav, and write gates are all `sys.`-prefixed because the backend counts global security grants only. WebApp creation takes its group from the active portal context and accepts a constrained bucket name only at create time; the backend allowlist remains authoritative. No nginx text, free-text proxy destination, CI transfer, node control, or fleet material is exposed.
- **Storage** — file managers, files, S3 buckets. Uploads on the Files page (`system/files`) are capped client-side at **1 GB by default** — override app-wide with the WebApp config key `max_upload_size` (bytes) or per registration via the `maxFileSize` page option (option wins). The cap is a UX guard; the server still enforces its own limits.
- **Shortlinks** — links table, click history.
- **Monitoring** — logs, metrics permissions, CloudWatch dashboard.
- **System** — settings, API keys.
- **AI Assistant** — skills, memory, conversations admin pages, plus a topbar-triggered chat panel (`AssistantPanelView` on wide viewports, `AssistantView` fullscreen modal on narrow viewports).

**Three integration helpers do the heavy lifting:**

| Helper | What it does |
|--------|--------------|
| `registerAdminPages(app, addToMenu)` | Registers every `system/*` page on the app and (optionally) injects a fully-wired sidebar menu into your `system` menu config. |
| `registerAssistant(app)` | Adds a `bi-robot` topbar button that opens the Assistant chat panel/modal. Lazy-loads `AssistantPanelView` / `AssistantView` so they aren't in your initial bundle. |
| `registerTicketPanel(app)` | Adds app-shell-level ticket slide-over support — attaches `app.openTicketPanel(id)` and `app.closeTicketPanel()`. The panel persists across page navigation, exactly like the Assistant panel. |

**Import path:**

```js
import { registerAdminPages, registerAssistant, registerTicketPanel } from 'web-mojo/admin';
```

> ✅ Always import from `web-mojo/admin`. Never deep-import `web-mojo/src/extensions/admin/...` — those paths are not part of the public surface.

---

## Quick Start

Minimal portal wiring with admin pages and the Assistant. The full working reference lives in [`examples/portal/app.js`](../../examples/portal/app.js) — copy from there if you want a paste-ready starting point.

```js
import { PortalWebApp, User } from 'web-mojo';
import { registerAdminPages, registerAssistant, registerTicketPanel } from 'web-mojo/admin';

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

// 4) Register the ticket slide-over panel (optional — omit if you don't use tickets)
registerTicketPanel(app);
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

**What it registers:** every page under `system/*` — DNS (`system/dns/domains`, `system/dns/records`, `system/dns/certificates`, `system/dns/credentials`, `system/dns/purchases`, `system/dns/registrant`, `system/dns/vhosts`, `system/dns/upstreams`), Account (`system/dashboard`, `system/users`, `system/groups`, `system/members`, `system/api-keys`), Job Engine (`system/jobs/dashboard`, `system/jobs/runners`, `system/jobs/list`, `system/jobs/scheduled-tasks`), Security (`system/incidents`, `system/tickets`, `system/events`, `system/rulesets`, `system/security/*`, `system/system/geoip`, `system/edge/blocklist`), Messaging (`system/email/*`, `system/messaging/public-messages`, `system/phonehub/*`), Push (`system/push/*`), Storage (`system/s3buckets`, `system/filemanagers`, `system/files`), Shortlinks (`system/shortlinks/links`, `system/shortlinks/clicks`), Monitoring (`system/logs`, `system/metrics/permissions`, `system/cloudwatch`), Settings (`system/settings`), and Assistant admin (`system/assistant/skills`, `system/assistant/memory`, `system/assistant/conversations`).

> ℹ️ The complete `(route, page-class, permissions)` mapping lives in [`src/admin.js`](../../src/admin.js). It is the single source of truth — read it directly when you need the exact list.

`registerAdminPages` is also exported as `registerSystemPages`. Both names refer to the same function.

In addition to page and menu registration, `registerAdminPages` calls `app.registerModelRef` for each built-in admin model that declares a `MODEL_REF` static property (`Incident`, `IncidentEvent`, `RuleSet`, `Ticket`, `GeoLocatedIP`). This wires the model-ref registry so generic UI (action cards in `TicketPanelView`, etc.) can resolve backend type strings to concrete classes and open the correct detail dialog.

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

### `registerTicketPanel(app)`

```js
import { registerTicketPanel } from 'web-mojo/admin';

registerTicketPanel(app);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `app` | `WebApp` / `PortalApp` / `PortalWebApp` | The running app instance. |

**What it does:**

1. Attaches `app.openTicketPanel(ticketId)` — fetches the ticket, then mounts `TicketPanelView` as a 460 px flex child of `.portal-layout` (appended as `#ticket-panel`). If the panel is already mounted, switches to the new ticket without reopening.
2. Attaches `app.closeTicketPanel()` — removes the panel element and clears `app._ticketPanel`.
3. `TicketPanelView` and the `Ticket` model are loaded with dynamic `import()` — not in your initial bundle.

The panel persists across page navigation because it lives at the app-shell level (`.portal-layout`), not inside any individual page. This is the same pattern used by `AssistantPanelView`.

**`TicketTablePage`** calls `app.openTicketPanel(id)` automatically when a table row is clicked — no additional wiring is needed on the page side. Calling `registerTicketPanel` before `TicketTablePage` loads is fine (the import is asynchronous).

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
- `sys.view_geofence` / `sys.manage_geofence` / `sys.security` — the Geofencing page and the GroupView Geofencing section. `sys.`-prefixed deliberately: geofence config is platform-wide, so only **global** user grants count — group/member grants never open it (the backend enforces the same rule). `view_geofence` alone renders read-only; write controls additionally need `manage_geofence`/`security`.
- `view_admin` / `assistant` — AI Assistant admin pages and the topbar Assistant button
- `view_users` / `manage_users` — users, user devices, GeoIP
- `view_groups` / `manage_groups` — groups, members, API keys
- `view_jobs` / `manage_jobs` / `view_scheduled_tasks` / `manage_scheduled_tasks` — job engine
- `manage_aws` — S3 buckets, email mailboxes / domains / sent / templates, CloudWatch
- `view_fileman` / `manage_files` — file managers and file table
- `manage_shortlinks` — shortlinks and click history
- `view_dns` / `manage_dns` — the `system/dns/*` pages. `view_dns` renders read-only; every write control needs `manage_dns`. The `security` category covers both (mirroring dnsman's `VIEW_PERMS`/`SAVE_PERMS`). **Four surfaces are stricter than they look and the UI matches each deliberately:** *adopting a hosted zone* checks the literal `is_superuser` attribute, not the `admin` wildcard, because adoption hands a group control of a zone in the house account; *certificate key material* is never exposed by this UI at any permission level (that endpoint exists for serving hosts pulling with their own API key after a `certificate_updated` broadcast); **WHOIS is gated on `manage_dns`, not `view_dns`** — the registrar returns the real registrant name, address, phone and email regardless of WHOIS privacy, so a read-only operator does not see the section at all; and the **Registrant Contact** page is `manage_dns` only (`view_dns` does not reach it), with its *house* scope stricter still — the backend gates that on the literal `is_superuser`, the same reasoning as adoption, so the scope selector is only rendered for a superuser and everyone else is pinned to their active group.

- `manage_webapp` plus `manage_dns` or `security` — the named conjunctive gate for linking a site's one-time CI key and promoting or rolling back releases. Neither grant alone renders or executes those actions.
- `sys.manage_deploy` — global-only access to `system/edge/deploy`; a deploy-only operator still sees the distinct **Edge** parent. Member/API-key permissions never satisfy this route.

  Edge adds three more literal-superuser boundaries. A VHost's owning Domain is fetched separately before detail or mutation because the embedded basic graph cannot identify house ownership; a group-less Domain refuses non-superusers. Upstream declaration and retirement are literal-superuser actions, never generic CRUD or an active switch. The reserved-name claim (`claim_reserved`) is rendered only for a literal superuser viewing a house-domain VHost — the backend additionally refuses API-key sessions outright. Non-superuser lists always carry the active group while a literal superuser's platform inventory remains unscoped.

- `sys.view_security` / `sys.manage_security` / `sys.security` — the **Edge Blocklist** (`system/edge/blocklist`). The blocklist is fleet-scoped and group-less on the backend, which counts global security grants only, so every gate here is `sys.`-prefixed (the geofencing precedent): a member-scoped `view_security` grant neither sees the page nor its write controls.

  Two properties of the Registrant Contact page are load-bearing rather than cosmetic. **A group that inherits a contact is never shown its values, and never its validation problems either** — the inherited contact belongs to the operator (or to a parent group), and a problem list would otherwise tell a tenant which of its fields are malformed. And **the keys the form does not render (`Fax`, `ExtraParams`) are carried across a save but never across a scope change**: the backend replaces the stored contact rather than merging, so dropping them destroys a ccTLD deployment's registry parameters, while carrying them between scopes writes one scope's private data into another's record.
- `manage_notifications` / `manage_push_config` / `view_notifications` / `view_devices` / `manage_devices` — push notifications and devices
- `view_phone_numbers` / `manage_phone_numbers` / `view_sms` / `manage_sms` — phone hub numbers and SMS log
- `manage_phone_config` / `manage_groups` — phone hub provider config (`system/phonehub/config`)
- `view_logs` / `manage_settings` / `manage_metrics` — system pages
- `view_support` / `support` — contact-form messages

> ℹ️ The complete `(route, permissions)` mapping lives in [`src/admin.js`](../../src/admin.js) as the single source of truth. Don't duplicate it here — read the source.

---

## Phone Hub — Config Page (`system/phonehub/config`)

`PhoneConfigTablePage` (route `system/phonehub/config`) lists per-group SMS provider configurations and appears under **Phonehub → Config** in the admin sidebar. Each row is one `PhoneConfig` with a provider (Twilio, AWS SNS, or Mojo Remote) and its encrypted credentials. Clicking a row opens `PhoneConfigView` — a read-only detail panel (header badges + Configuration / provider-settings / Metadata sections) with a three-dots context menu. All mutations live on the context menu.

Both the table **Add** button and the context-menu **Edit** action open one combined form whose credential fields (`showWhen`) appear or hide based on the selected provider. Blank credential inputs are stripped before save so existing stored secrets are never accidentally cleared. `PhoneConfig.FORM_DIALOG_CONFIG` opens the dialog at `lg` width.

From the context menu, operators can:

- **Edit** — opens the combined provider form; on submit, blank secrets are stripped and the row is saved.
- **Test connection** — sends `POST /api/phonehub/config/<id>` with `{ test_connection: 1 }` and shows the result inline in the detail view (green banner on success, red banner with a friendly-mapped error on failure).
- **Provision downstream API key** (Mojo provider only, visible to superusers and users with `manage_groups`) — opens a focused form to create an `ApiKey` with fixed `send_sms` + `comms` permissions, then displays the raw token in a one-time `Modal.alert` with a copy button.
- **Delete** — issues `DELETE /api/phonehub/config/<id>` after a `Modal.confirm` prompt.

The `SMSTablePage` provider chip now links directly to `system/phonehub/config` for quick navigation.

---

## Webhook Subscriptions — per-group + standalone (`system/webhook-subscriptions`)

`WebhookSubscriptionTablePage` (route `system/webhook-subscriptions`) is the cross-group view for system admins (filterable by `?group=`); the per-group surface lives inside `GroupView` as a **Webhooks** side-nav entry under the **Access** divider, right after **API Keys**. Both surfaces are gated by `manage_groups` / `manage_group`.

The per-group section is a composite of two parts, stacked vertically inside one rail:

1. **Signing secret panel** — `Reveal Secret` and `Rotate` buttons that call `POST /api/group/webhook_secret`. The panel does **not** auto-fetch on mount: the backend auto-mints on first POST, so a render-time call would silently generate a secret the operator never asked for. Reveal opens a static-backdrop `Modal.dialog` with the monospaced `user-select-all` value plus an inline copy button (uses the framework's `clipboard` `data-action` — no custom JS). Rotate fires the same dialog after a destructive confirm (the old secret is invalidated immediately).
2. **Subscriptions list** — a `ListView` of `WebhookSubscriptionListItem` cards. Each row shows the URL (mono, truncated), event chips, status badge, inline active toggle, and a trash button. Create / Delete / Edit are wired through `onAdd` / `onItemDelete` / `clickAction: 'view'` so the GroupView owns the confirm copy and refetch — the standalone TablePage uses the generic add path.

Events are entered via the framework's `TagInput` (`type: 'tags'`). `WebhookSubscriptionForms.normalizePayload(formData)` is the single source of truth that converts the TagInput's comma-string output into the array shape the server expects; both surfaces call it before `model.save(payload)`.

---

## Auth Config — per-group editor (`GroupView` → Auth Config)

`GroupView` exposes a permission-gated **Configure Auth** context-menu action. It opens an `xxl` workspace with `GroupAuthConfigSection` beside a private hosted-page visual preview. On wide screens the editor scrolls independently while the preview stays sticky; narrow screens stack the two surfaces. Desktop (`1280 × 800`) and phone (`390 × 844`) frames retain their real dimensions and are scaled inside a measured viewport. When a side-by-side frame would become too small to read, **Focus preview** temporarily gives it the full workspace.

The hosted-page location is app configuration, not inferred from django settings:

```js
const app = new PortalApp({
    hosted_auth_origin: 'https://app.example.com',
    hosted_auth_paths: {
        login: '/auth',
        registration: '/register',
        passkey: '/passkey'
    }
});
```

`hosted_auth_origin` must be an exact HTTP(S) origin without credentials, path, query, or hash. When omitted, the workspace uses the configured REST `baseURL` origin, then `window.location.origin`. `hosted_auth_paths` values must be root-relative, query/hash-free, and dot-segment-safe; defaults are `/auth`, `/register`, and `/passkey`. Apps must set these paths when django-mojo's `BOUNCER_LOGIN_PATH`, `BOUNCER_REGISTER_PATH`, or `BOUNCER_PASSKEY_PATH` differs. Every destination URL is built fresh with a closed query allowlist: `group_uuid` plus canonical `auth_theme` / `auth_appearance` only. Unsaved comparison is intentionally limited to known layout and appearance enums; every other visual remains the saved server-resolved value.

Inline display is an honest best-effort boundary, not a supported auth iframe integration. The workspace probes only an exact same-origin URL with same-origin credentials, no cache, no application Authorization header, manual redirect refusal, and a bounded timeout. It requires an unredirected 2xx `text/html` response with the expected hosted-auth shell/page sentinel. A bouncer challenge or decoy, mismatched response URL, enforcing `frame-ancestors`, `X-Frame-Options`, ambiguous/multiple CSP, disabled saved registration, timeout, and network/content failures all produce a named external fallback. Report-only CSP is ignored. django-mojo normally sends `frame-ancestors 'none'` on its credential-bearing hosted pages, so external fallback is expected on hardened deployments.

Only a passed representation is navigated in an empty `sandbox` iframe with no referrer, no tab stop, pointer events disabled, and a noninteractive overlay. The workspace never reads or manipulates credential DOM. A frame load means only that loading completed; it is not proof that authentication works. The comparison is the static server-rendered first paint: JavaScript-driven extra registration rows, passkey/session behavior, and all credential interactions are omitted. The exact current URL is always offered as a `noopener noreferrer` external action. A confirmed save refreshes the resolved config and probes again; failed and no-op saves leave both the draft and visual unchanged.

`GroupAuthConfigSection` covers the complete current public contract across four tabs:

1. **Appearance** — all 20 public `theme` leaves: branding/provider copy, default/light/dark hero images and crop position, back-link copy and destination, terms, the `minimal` / `compact` / `branded-panel` / `editorial` layouts plus legacy `card` / `fullscreen`, `light` / `dark` / `system` appearance, accent color, API/redirect values, and inline/external CSS.
2. **Login** — heading, supporting copy, and `password` / `sms` / `passkey` / `magic` / `google` / `apple` / `github` methods.
3. **Registration** — enabled state, passkey prompt, identity, age, GitHub-aware signup methods, and the canonical registration schema. `registration.fields: []` remains a legal explicit value and is displayed as django-mojo's default email + password schema; a non-empty schema may omit password only when it includes a phone field verified by SMS.
4. **Advanced** — API base, success redirect, and custom CSS controls.

`registration.extra_fields` uses ordered structured rows for `name`, `label`, and `required`. Existing legacy string entries remain strings until edited, object entries retain their shape when untouched, and row order is preserved. Invalid identifiers, canonical-name collisions, duplicates, and blank names are shown on the affected row instead of being silently discarded.

Inheritance is explicit rather than inferred from placeholders. The section fetches `GET /api/auth/config` once **without** a group UUID for the deployment default, then walks raw ancestor `Group` rows by parent id and merges deployment → root → parent → this group. It does not use the public UUID endpoint for ancestors, so inactive and UUID-less ancestors still participate. Explicit `false`, `""`, `0`, and `[]` values are real overrides. Every leaf identifies its source and an owned leaf has its own **Reset** action; Reset queues only that leaf as `null` for the next Save. If the complete ancestor chain cannot be read safely (missing row, read failure, cycle, or depth guard), affected resets are disabled rather than claiming an uncertain inherited result. There is no tab-wide or global reset.

Save remains explicit because django-mojo validates the merged cross-field contract. The client mirrors the actionable rules (non-empty login methods and required copy, `#RRGGBB` accent, safe back link, HTTPS external CSS, inline CSS restrictions, registration identity/passwordless constraints) while preserving configured unknown select, identity, verify, and method tokens as visible dynamic options instead of coercing or dropping them.

Before writing, the editor fetches a detached latest raw Group row, prunes reset deletions that are already absent, and sends only the remaining sparse leaf patch. The server's deep merge therefore preserves concurrent sibling and unknown keys. The editor verifies the raw row after save; if a reset's `null` survives because its nested branch disappeared after the read and was re-materialized, it retries that cleanup once. A failed refresh/save keeps the draft intact. A verified success refreshes inheritance/provenance, rebaselines the form, and restores the active tab.

---

## Importing Individual Pages & Views

If you only want a couple of pages and prefer to wire them yourself instead of using `registerAdminPages`, every class is also exported from `web-mojo/admin`.

```js
import {
    // Pages — Table/Dashboard pages, one per admin area
    AdminDashboardPage, UserTablePage, GroupTablePage, MemberTablePage, ApiKeyTablePage, WebhookSubscriptionTablePage,
    IncidentDashboardPage, IncidentTablePage, EventTablePage, TicketTablePage, RuleSetTablePage,
    JobDashboardPage, JobRunnersPage, JobsTablePage, ScheduledTaskTablePage,
    EmailDomainTablePage, EmailTemplateTablePage, SentMessageTablePage, PublicMessageTablePage,
    PhoneNumberTablePage, SMSTablePage, PhoneConfigTablePage,
    PushDashboardPage, PushConfigTablePage, PushTemplateTablePage, PushDeliveryTablePage, PushDeviceTablePage,
    FileManagerTablePage, FileTablePage, S3BucketTablePage,
    ShortLinkTablePage, ShortLinkClickTablePage,
    VhostTablePage, UpstreamTablePage, WebAppTablePage, EdgeDeployPage,
    BlockedIPsTablePage, FirewallLogTablePage, BouncerSignalTablePage, BouncerDeviceTablePage, BotSignatureTablePage, IPSetTablePage,
    LogTablePage, MetricsPermissionsTablePage, SettingTablePage, CloudWatchDashboardPage,
    AssistantSkillTablePage, AssistantConversationTablePage, AssistantMemoryPage,

    // Views — Detail/dialog views (composable, often opened via row clicks)
    DeviceView, GeoIPView, GroupView, MemberView, UserView, ApiKeyView, WebhookSubscriptionView,
    IncidentView, EventView, TicketView, TicketPanelView, ActionCardView, ResolvedActionsSummaryView, RuleSetView,
    JobDetailsView, JobHealthView, JobStatsView, RunnerDetailsView, ScheduledTaskView,
    EmailTemplateView, EmailView, PublicMessageView, PhoneNumberView, PhoneConfigView, PushDeliveryView, PushDeviceView,
    ShortLinkView, BouncerSignalView, BouncerDeviceView, IPSetView,
    VhostView, UpstreamView, WebAppView,
    LogView, MetricsPermissionsView, SettingView, FileView, FileManagerView, CloudWatchResourceView, CloudWatchChart,
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
| `message:assistant_text` | Intermediate prose emitted before tool calls in the same turn — appends an assistant bubble without clearing the thinking indicator or re-enabling input. |
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
| `context` | Clickable model-reference chips. Each entry in `references` renders as a compact chip with a label and display name. Chips are clickable when the model type is registered via `app.registerModelRef` and the class declares a `VIEW_CLASS` — clicking opens `Modal.showModel`. Unknown types render as plain text. |

### REST endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/assistant/conversation` | List user conversations (`search`, `start` query params). |
| `GET` | `/api/assistant/conversation/{id}` | Load full message history. |
| `DELETE` | `/api/assistant/conversation/{id}` | Delete a conversation. |
| `POST` | `/api/assistant` | REST fallback when WebSocket is unavailable. |

> Cross-link: see [ChatView](../components/ChatView.md) for the underlying chat UI used by the Assistant — adapter-driven messages, file drop, and streaming hooks.

---

## Ticket Slide-Over Panel

`TicketTablePage` opens ticket details in a 460 px slide-over panel (`TicketPanelView`) anchored to the right of the table, replacing the previous modal-based detail view. The panel includes:

- A compact header with status pill (clickable — inline status selector), priority, assignee, category, and group fields. All fields are editable in-place via context menus or modals.
- A kebab `⋯` menu for edit, refresh notes, and close window. The AI-enable toggle was moved to the ticket edit form (`TicketForms`) — it is no longer in the panel header.
- A chat conversation (via `ChatView` + `TicketNoteAdapter`) with a note-input bar at the bottom.
- **Action blocks** — LLM agent notes that include a `metadata.action` payload render as `ActionCardView` cards below the chat. Approval-type actions show Approve/Deny buttons. Context-type actions show clickable model-reference links that open the referenced object's detail dialog (using `app.getModelByRef`). Resolved actions collapse behind a `ResolvedActionsSummaryView` bar.
- A linked-incident strip when the ticket is associated with an incident.

The panel opens when a table row is clicked (via `onItemView`) and closes via the `panel:close` event. Clicking a different row switches the panel to that ticket. The previous `TicketView` modal is still exported and usable standalone.

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

Sixteen Model/Collection modules are coupled to the admin extension. They ship from a **separate, UI-free entry** so a Node script, an API client, or a different UI framework can use them without pulling in the admin pages from `web-mojo/admin`.

```js
import { Job, JobList, JobForms } from 'web-mojo/admin-models';
import { Incident, RuleSet } from 'web-mojo/admin-models';
import { Email, Mailbox, EmailDomain } from 'web-mojo/admin-models';
import { Push, PushDevice, PushTemplate } from 'web-mojo/admin-models';
import { Vhost, VhostList, Upstream, UpstreamList, WebApp, WebAppList, WebAppRelease, WebAppReleaseList } from 'web-mojo/admin-models';
```

### What's in `web-mojo/admin-models`

| Model | Purpose | Endpoint |
|---|---|---|
| `AWS` (S3Bucket) | S3 buckets | `/api/aws/...` |
| `Assistant` | Assistant conversations + skills | `/api/assistant/...` |
| `Bouncer` | Fraud-detection device/signal/signature | `/api/account/bouncer/...` |
| `Dns` | Domains, records, certificates, credentials, purchases | `/api/dnsman/...` |
| `Edge` | Structured VHosts/Upstreams, safe WebApps, immutable release history, exact-SHA deploy helper | `/api/edge/...` |
| `Email` | Email domain / mailbox / template / sent message | `/api/aws/email/...` |
| `Incident` | Incident / event / rule set / rule | `/api/incident/...` |
| `IPSet` | IP allow/block sets | `/api/incident/ipset` |
| `Job` | Background job + log + event + stats | `/api/jobs/job` |
| `JobRunner` | Job runner control (ping/shutdown) | `/api/jobs/runners` |
| `LoginEvent` | Geolocated login history | `/api/account/logins` |
| `PublicMessage` | Contact form / public-facing messages | `/api/messaging/public` |
| `Push` | Push device / template / config / delivery | `/api/account/devices/push/...` |
| `Phonehub` | Phone numbers + SMS + provider configs (`PhoneConfig` / `PhoneConfigList`) | `/api/phonehub/...` |
| `ScheduledTask` | Cron-style task definitions | `/api/jobs/scheduled_task` |
| `Tickets` | Ticket + ticket notes (cross-references Incident, User) | `/api/incident/ticket` |

### Two-entry split

| Entry | What's in it | Pulls UI deps? |
|---|---|---|
| `web-mojo/admin` | Pages + views (sidebar, dashboards, table pages, detail views) | **Yes** (Sidebar, TableView, ContextMenu, Bootstrap, …) |
| `web-mojo/admin-models` | The 16 Model/Collection modules only — pure data | **No** |

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
