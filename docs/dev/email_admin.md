# Admin Email Manager — IA/UX Design and High-level Plan

Owner: Admin Console
Audience: MOJO developers building the Admin Email Manager
Last updated: (fill on commit)

Purpose
- Define information architecture, UX flows, and a phased implementation plan for the Admin Email Manager.
- Maximize reuse of existing MOJO components (TablePage, Dialog, TabView, Charts, Forms).
- Map UI operations directly to the provided Email REST API, abstracting AWS complexity.

Guiding Principles
- Keep It Simple: Mirror existing Admin/Task/Files patterns and Bootstrap 5 styles.
- Reuse First: Prefer `TablePage`, `Dialog`, `TabView`, existing mixins, and patterns over new abstractions.
- Follow MOJO Conventions:
  - View instance is the Mustache context; expose state via `this.*` and format via pipes.
  - Use `onInit` for data setup; avoid data fetching in `onAfterRender`.
  - Use `data-action` with `onAction*` handlers; maintain consistent naming.
- Clear Feedback: Toasts for success/error, disabled buttons and spinner icons during long operations.
- Error Handling: Respect Rest response contract (HTTP success vs. server `status` boolean). Show actionable errors.

Information Architecture (IA)
- Sidebar navigation with dedicated pages:
  1) Domains
  2) Mailboxes
  3) Sending
  4) Inbound
  5) Sent
  6) Templates
  7) Health & Drift
  8) Webhooks & Settings

- Routes:
  - /admin/email/domains
  - /admin/email/mailboxes
  - /admin/email/sending
  - /admin/email/incoming
  - /admin/email/sent
  - /admin/email/templates
  - /admin/email/health
  - /admin/email/settings
  - Internally address tabs via hash (#domains, #mailboxes, etc.) if desired.

Entity to API Mapping
- EmailDomain
  - List: GET /api/aws/email/domain
  - CRUD: POST|GET|PUT|DELETE /api/aws/email/domain[/<id>]
  - Actions:
    - Onboard: POST /api/aws/email/domain/<id>/onboard
    - Audit: GET|POST /api/aws/email/domain/<id>/audit
    - Reconcile: POST /api/aws/email/domain/<id>/reconcile
- Mailbox
  - List: GET /api/aws/email/mailbox
  - CRUD: POST|GET|PUT|DELETE /api/aws/email/mailbox[/<id>]
- Sending
  - Send: POST /api/aws/email/send
- IncomingEmail
  - List: GET /api/aws/email/incoming
  - Detail: GET /api/aws/email/incoming/<id>
- SentMessage
  - List: GET /api/aws/email/sent
  - Detail: GET /api/aws/email/sent/<id>
- EmailTemplate (DB templates)
  - List: GET /api/aws/email/template
  - CRUD: POST|GET|PUT|DELETE /api/aws/email/template[/<id>]

UX Overview and Reuse Strategy

Top-level structure
- Each area is a dedicated Page reachable via the sidebar. Use `Dialog.showDialog({ body: view })` to present rich, non-table interactions (details, onboarding, editors). Match styles used across existing Admin pages:
  - Title, subtitle, and toolbar with:
    - Refresh All (data-action="refresh-all"): refresh the active tab’s data; optionally all tabs with care.
    - Export (data-action="export"): export data where applicable (tables/charts).
    - Settings (data-action="open-settings"): shortcut to Webhooks & Settings tab/dialog.

Pages

1) Domains
- Reuse: `TablePage`
- Columns (guideline, final set mapped to backend fields):
  - id, name, region (default if missing), receiving_enabled (badge), created (epoch|datetime)
- Table features:
  - Search, sort, filter (text on name/region, boolean toggle for receiving_enabled), pagination.
  - Row actions: View Details, Onboard, Audit, Reconcile, Edit, Delete.
  - Batch actions (future): Audit Selected, Reconcile Selected (safe idempotent operations).
- Dialogs and views:
  - DomainDetailsView (new): Modal with SNS topic ARNs, receiving rule info, verification status/drift hints, action buttons (Onboard, Audit, Reconcile).
  - DomainOnboardDialog (new): Wizard-like or single form using `Dialog.showForm`:
    - receiving_enabled, s3_inbound_bucket, s3_inbound_prefix
    - ensure_mail_from, mail_from_subdomain
    - dns_mode: manual | godaddy
    - godaddy_key, godaddy_secret (conditional)
    - endpoints: bounce, complaint, delivery, inbound (prefilled by Webhooks base URL)
  - Output:
    - Display returned `dns_records`, `topic_arns`, receipt_rule, rule_set, and notes in a results step with copy-to-clipboard buttons.

2) Mailboxes
- Reuse: `TablePage`
- Columns (guideline):
  - id, email, domain (name), allow_inbound (badge), allow_outbound (badge), async_handler, created (epoch|datetime)
- Row actions: Edit, Delete
- Create/Edit form fields:
  - domain (select or FK), email, allow_inbound, allow_outbound, async_handler (text or select from a whitelist when available)

3) Sending
- Reuse: `View` + `Dialog.showForm` or embedded form layout (per Forms guide)
- SendTestView (new):
  - Fields:
    - from_email: select from Mailboxes with allow_outbound
    - to, cc, bcc (comma/array-friendly), subject, body_text, body_html
    - template_name, template_context (JSON), allow_unverified
  - Actions:
    - data-action="send-test": POST /api/aws/email/send; show result and link to Sent tab
  - Lightweight history pane (optional): recent sends with status, linking to Sent detail.

4) Inbound
- Reuse: `TablePage`
- Columns (suggested; dependent on backend payload):
  - id, to (recipient), from, subject, created (epoch|datetime), attachment_count, processing_status
- Filters:
  - Text search, date range (standard DR fields), mailbox filter.
- Row action: View Details
  - IncomingEmailDetailsView (new): show headers, text/html body (safe rendering), attachments (link if URL provided), processing errors if any.

5) Sent
- Reuse: `TablePage`
- Columns:
  - id, from_email, to (first or count), subject, status (badge), status_reason (truncate), created (epoch|datetime)
- Filters:
  - Text search, date range, status.
- Row action: View Details
  - SentMessageDetailsView (new): show SES message id, lifecycle updates, bounce/complaint info.

6) Templates
- Reuse: `TablePage`
- Columns:
  - id, name, created (epoch|datetime), modified (epoch|datetime)
- Create/Edit dialog:
  - name, subject_template, html_template, text_template, metadata (JSON)
- Note: REST does not expose DB template rendering. CRUD only; test send uses AWS SES managed templates via Sending tab.

7) Health & Drift
- Reuse: `View` + cards using Bootstrap
- Per-domain card summary:
  - status: pending|verified|error
  - receiving: on|off
  - drift: ok|drifted|conflict (derived from audit)
- Actions: Audit, Reconcile, Onboard (where appropriate)
- Batch: Audit All (safe), Reconcile All (safe)
- Notes: Display results/snippets from latest audit/reconcile

8) Webhooks & Settings
- Reuse: `Dialog.showForm` or dedicated `View`
- Display:
  - Webhook Base URL (used to compose endpoints for onboard)
  - Derived endpoints: bounce, complaint, delivery, inbound (read-only fields preview)
  - Read-only info: SNS cert cache TTL, last validation hints (if exposed by audit)
- Optionally persist webhook base URL via app settings endpoint; otherwise keep in app state.

UI Patterns and Behavior (Consistency with existing admin pages)
- Headers: Title, subtitle, small helper text with icon; toolbar aligned right.
- Buttons: Use Bootstrap outline variants; add spinner via `bi-spin` class toggling for long operations.
- Toasts: Use `getApp().toast` for succinct success/error messages.
- Data Fetching:
  - Initial load in `onInit`
  - “Refresh” actions call child view refresh methods or table refresh.
- Mustache and Pipes:
  - Use pipes for dates, numbers, booleans, badges. Keep template logic minimal.
- Dialogs:
  - Use `Dialog.showForm` for forms; `Dialog.showDialog` for structured views.
  - Map button actions to async handlers; return action payloads as needed.

Reuse Inventory (existing components to leverage)
- TablePage: Full CRUD tables with search/sort/filter/pagination, toolbar, batch actions, and row actions (as used in admin pages: Users, Files, Groups, Incidents).
- Dialog: Modal forms, confirmations, multi-step patterns (see docs/guide/Dialog.md).
- Forms: `FormBuilder` semantics (docs/guide/Forms.md) for onboarding and CRUD dialogs.
- TabView: For top-level segmentation (see TaskManagementPage usage).
- Toasts and Rest patterns: Standardized Rest response inspection already used across admin pages.
- MetricsChart (optional later): If we want email-specific charts (send rate, bounces), can be added in future phases.

New Components and Files (proposed)
- (No top-level EmailManagerPage; using sidebar pages and routes)
- Domains
  - src/admin/EmailDomainTablePage.js (extends TablePage)
  - src/admin/EmailDomainDetailsView.js (View in Dialog)
  - src/admin/EmailDomainOnboardDialog.js (Dialog builder/logic; or kept inline using Dialog.showForm)
- Mailboxes
  - src/admin/EmailMailboxTablePage.js (extends TablePage)
- Inbound
  - src/admin/IncomingEmailTablePage.js (extends TablePage)
  - src/admin/IncomingEmailDetailsView.js (View in Dialog)
- Sent
  - src/admin/SentMessageTablePage.js (extends TablePage)
  - src/admin/SentMessageDetailsView.js (View in Dialog)
- Templates
  - src/admin/EmailTemplateTablePage.js (extends TablePage)
  - src/admin/EmailTemplateEditorView.js (Dialog View)
- Sending
  - src/admin/SendTestView.js
- Models/Collections (single module for cohesion)
  - src/models/Email.js:
    - EmailDomain, EmailDomainList
    - Mailbox, MailboxList
    - IncomingEmail, IncomingEmailList
    - SentMessage, SentMessageList
    - EmailTemplate, EmailTemplateList
    - Helper methods: onboardDomain(id, data), auditDomain(id, data?), reconcileDomain(id, data?), sendEmail(data)

Data Shapes and Columns (guidelines)
- EmailDomain
  - id, name, region, receiving_enabled, created
- Mailbox
  - id, email, domain (name or id), allow_inbound, allow_outbound, async_handler, created
- IncomingEmail
  - id, to, from, subject, created, attachment_count, processing_status
- SentMessage
  - id, from_email, to (count or first), subject, status, status_reason, created
- EmailTemplate
  - id, name, created, modified

Actions and Flows

Domain Onboarding (manual and GoDaddy)
- Trigger: Row action “Onboard” or from details modal
- Input fields:
  - receiving_enabled, s3_inbound_bucket, s3_inbound_prefix
  - ensure_mail_from, mail_from_subdomain
  - dns_mode: manual | godaddy; conditional fields for GoDaddy creds
  - endpoints: bounce, complaint, delivery, inbound (derived from Webhook Base URL)
- API: POST /api/aws/email/domain/<id>/onboard
- Output: Show `dns_records`, `topic_arns`, `receipt_rule`, `rule_set`, `notes`. Provide copy-to-clipboard and “Mark as Done” acknowledgement.

Audit and Reconcile
- Trigger: Row actions or Health tab
- API:
  - Audit: GET|POST /api/aws/email/domain/<id>/audit
  - Reconcile: POST /api/aws/email/domain/<id>/reconcile
- Output: Show drift report summary and “fixed” notes.

Send Test Email
- Trigger: Sending tab submit
- API: POST /api/aws/email/send
- Success: Show `id`, `ses_message_id`, and link to Sent tab detail; toast success.
- Error: Show `response.data.error` or `response.message`.

Inbound/Sent Details
- Trigger: Row action “View Details”
- API:
  - Inbound: GET /api/aws/email/incoming/<id>
  - Sent: GET /api/aws/email/sent/<id>
- Display: Headers, bodies, attachments (inbound), lifecycle and SES info (sent)

Security
- All management endpoints require permission “manage_aws”.
- Public webhooks are not manipulated here; onboarding only passes endpoints to backend.
- Handle PII carefully: do not inline raw MIME; show parsed, safe fields. For attachments, use provided URLs or metadata only.

Errors and Edge Cases
- Domain verification delays: encourage Audit to check current status.
- Receiving misconfig: advise Audit/Reconcile; surface notes clearly.
- Send failures: surface `status_reason` or backend error message.
- Attachment URLs not provided: display filename and a note; follow-up backend work item if necessary.

Phased Plan (deliver incrementally; confirm before each phase)

Phase 1 — IA/UX and Plan (this document)
- Acceptance: Architecture and roadmap approved.

Phase 2 — Domains MVP
- Email models (Domain + List) and DomainTablePage.
- DomainDetailsView and onboard/audit/reconcile actions via Dialogs.
- Minimal, clean columns and filters. Copyable DNS outputs.
- Acceptance: End-to-end domain onboarding (manual and GoDaddy UI fields), audit, reconcile work in UI and map to API.

Phase 3 — Mailboxes
- Mailbox models and TablePage with create/edit/delete.
- Domain linkage display.
- Acceptance: Full mailbox CRUD and status toggles.

Phase 4 — Sending
- SendTestView form; POST /send; link to Sent tab on success.
- Acceptance: Successful send with clear success/error feedback.

Phase 5 — Sent Messages
- Sent list with filters and details dialog.
- Acceptance: View delivery lifecycle, bounce/complaint info.

Phase 6 — Inbound Monitoring
- Inbound list with filters and details dialog (headers/body/attachments).
- Acceptance: Able to inspect inbound messages and attachments metadata/links.

Phase 7 — Templates
- Template CRUD via TablePage + editor dialog.
- Acceptance: Manage DB EmailTemplate entries.

Phase 8 — Health & Drift
- Domain health cards; Audit/Reconcile All.
- Acceptance: Clear health dashboard integrated.

Phase 9 — Webhooks & Settings
- Webhook Base URL and derived endpoints preview.
- Acceptance: Onboard pre-fills endpoints; settings easily discoverable.

Phase 10 — Polish and Hardening
- UX refinements, tooltips, empty states, spinners, consistent icons, permission gates.
- Acceptance: Stable, cohesive admin experience.

Acceptance Criteria Summary
- Consistent with MOJO patterns and admin styling (Bootstrap 5 + Icons).
- Actions provide immediate, clear feedback and are idempotent where applicable.
- Minimal new abstractions; maximize reuse of TablePage, Dialog, TabView, Forms.
- Sensitive operations gated with confirmations; long-running operations show busy states.
- Errors surfaced from both HTTP layer and server application `status` layer.

Open Questions / Assumptions
- Attachment signed URLs: expect detail API to provide them; otherwise show metadata.
- Webhook Base URL persistence: if no server settings endpoint, store in app state for now.
- Template rendering preview: not available via REST; consider future server endpoint if needed.
- Regions: if not provided on create, show default region (from server data) as read-only.

Next Steps
- Confirm this plan.
- Start Phase 2: EmailDomain models, EmailDomainsPage (TablePage), DomainDetailsView and DomainOnboardView dialogs; small, reviewable changes.