# DetailView

**The standard "record viewer in a modal" layout.** A flat header card on top (icon, title, optional subtitle, chips, optional active toggle, inline actions, context menu, X close) followed by a `SideNavView` that fills the rest of the space.

If you've been hand-rolling a `SideNavView` + custom header for a `Modal.show(view, { size: 'xl' })` flow, this is the abstraction you wanted. Pair with [`Modal.detail()`](Modal.md#modaldetail) to get the matching modal envelope (no body padding, no footer, dismiss via the header X / Esc / backdrop).

> **When to use DetailView vs your own composition:**
> Reach for `DetailView` whenever you'd put a record-detail view inside `Modal.show(view, { size: 'xl', header: false })`. If your view needs a totally different shape (full-page edit form, wizard with explicit Next/Back, dashboard mosaic), compose primitives directly.

---

## Quick Start

```js
import DetailView from 'web-mojo/DetailView';
import Modal from 'web-mojo/Modal';

class RuleSetView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new RuleSet(options.data || {});

        super({
            ...options,
            model,
            header: {
                icon: 'bi-gear-wide-connected',
                titleField: 'name',                       // model.get('name') for the <h2>
                subtitlePath: 'metadata.reasoning',       // dotted path on model.attributes
                chips: [
                    { icon: 'bi-tag-fill', textPath: 'category', variant: 'primary' },
                    { icon: 'bi-flag', text: m => `Priority ${m.get('priority')}` },
                    { icon: 'bi-stars', text: 'AI-proposed', variant: 'warning',
                      when: m => m.get('metadata')?.assistant_proposed }
                ],
                activeField: 'is_active',                 // null = no toggle
                actions: [
                    { label: 'Edit', icon: 'bi-pencil', action: 'edit-header' }
                ],
                contextMenu: {
                    items: [
                        { label: 'Edit Handler Chain', action: 'edit-handler', icon: 'bi-tools' },
                        { type: 'divider' },
                        { label: 'Delete RuleSet', action: 'delete-ruleset', icon: 'bi-trash', danger: true }
                    ]
                }
            },
            sections: [
                { key: 'Overview',   label: 'Overview',   icon: 'bi-grid-1x2', view: this.overviewSection },
                { key: 'Conditions', label: 'Conditions', icon: 'bi-funnel',   view: this.conditionsSection },
                /* ... */
            ],
            activeSection: 'Overview'
        });
    }

    // Subclasses implement the action handlers their config refers to:
    async onActionEditHeader()    { /* ... */ }
    async onActionEditHandler()   { /* ... */ }
    async onActionDeleteRuleset() { /* ... */ }
}

// Open it:
await Modal.detail(new RuleSetView({ model }));
```

---

## Constructor Options

```js
new DetailView({
    model,           // the record instance — required
    header: {...},   // header config — see below
    sections: [...], // SideNavView sections — see SideNavView.md
    activeSection,   // initial section key
    navWidth,        // default 200
    minWidth,        // default 600 — below this the rail collapses to a dropdown
    contentPadding,  // default '0' (sections own their padding)
    // …plus any standard View options
})
```

### `header` config

| Key | Type | Description |
|---|---|---|
| `icon` | `string` | Bootstrap Icons class for the left badge |
| `iconTone` | `string` | Optional tone keying — `primary` / `success` / `warning` / `danger` / `info`. Tints the icon's background and color via `.dh-icon-tone-<tone>` |
| `iconToneFn` | `(model) => string \| null` | Alternative to `iconTone` for state-driven tones (e.g. `m => m.get('is_active') ? 'primary' : null`) |
| `iconHtml` | `string \| (model) => string` | Optional trusted-HTML slot replacing the Bootstrap `<i>` icon — for avatar `<img>`, custom badges, or click-to-change buttons. See [Icon HTML slot](#icon-html-slot) below |
| `titleField` | `string` | Model field whose value is the `<h2>` |
| `titleFn` | `(model) => string` | Alternative to `titleField` for computed titles |
| `titleAffix` | `string \| (model) => string` | Optional trusted-HTML slot rendered inline next to the title — for copy buttons, edit pencils, or other context-relevant single-icon affordances. See [Title affix](#title-affix) below |
| `subtitlePath` | `string` | Dotted path on `model.attributes` (e.g. `'metadata.reasoning'`); falsy for no subtitle |
| `subtitleFn` | `(model) => string` | Alternative to `subtitlePath` for computed subtitles. Takes precedence when both are set |
| `subtitlePlaceholder` | `string` | Muted text shown when subtitle is empty — useful for "click to add" affordances |
| `subtitleEditAction` | `string` | When set with `subtitlePlaceholder`, makes the empty placeholder a button that dispatches this action |
| `chips` | `Array` | See [Chips](#chips) below |
| `activeField` | `string` | Model field that drives the active/inactive toggle. `null` (default) hides the toggle |
| `auxFn` | `(model) => string` | Optional. Returns trusted HTML for the right-gutter aux slot — see [Aux slot](#aux-slot) below |
| `actions` | `Array<{label, icon, action, title?}>` | Ghost-style buttons inline with the close X. `action` becomes `data-action`, dispatched on the parent `DetailView` subclass via the standard `onAction<KebabCase>` pipeline. **Default to `[]`** — primary actions belong on `StatusPanel` or section affordances, long-tail in `contextMenu` |
| `closable` | `boolean` | Default `true`. Renders an X with `data-bs-dismiss="modal"`. Set false for non-modal hosts |
| `contextMenu` | `{ items: [...] }` | Optional [`ContextMenu`](ContextMenu.md) config — items are dispatched on the parent view via `data-action` |

### Chips

Each chip resolves text and is filtered by an optional predicate:

```js
{
    icon: 'bi-tag-fill',                 // optional icon class
    text: 'AI-proposed',                 // string — literal
    text: m => `Priority ${m.get('p')}`, // OR function — receives model
    textPath: 'category',                // OR shortcut — model.get('category')
    variant: 'primary',                  // bg-* variant; defaults to 'light'
    when: m => m.get('flag'),            // optional — chip omitted when false
    tooltip: 'Source IP is on the allow list',  // optional — Bootstrap tooltip
    tooltip: m => `Verified by ${m.get('verified_by')}`  // OR function form
}
```

Variants pick up the global soft-badge styling (`primary`, `secondary`, `success`, `warning`, `danger`, `info`, `light`). When `tooltip` is set the badge gains `data-bs-toggle="tooltip" title="…"` and Bootstrap's auto-init wires up the hover. The default `enableTooltips: true` on `DetailHeaderView` keeps this working without per-consumer setup.

### Icon HTML slot

When the icon position needs to render something other than a Bootstrap glyph — a user avatar, a file thumbnail, a brand mark — pass `iconHtml` instead of (or alongside) `icon`. The framework drops the tone-tinted background and renders your trusted HTML inside the 44×44 frame with `overflow: hidden`. `<img>` children fill the box via `object-fit: cover`. Returning a falsy value falls through to the standard `icon` + `iconTone` path, so consumers can use the slot conditionally:

```js
header: {
    icon: 'bi-person-circle',                                // placeholder fallback
    iconToneFn: m => m.get('is_staff') ? 'info' : 'primary', // tones the placeholder
    iconHtml: m => {
        const avatar = m.get('avatar');
        if (!avatar?.url) return null;                        // → fall through to icon
        return `
            <button type="button" class="dh-icon-action"
                    data-action="change-avatar"
                    data-bs-toggle="tooltip" title="Change avatar">
                ${dataFormatter.apply('avatar', avatar)}
            </button>
        `;
    }
}
```

Caller is responsible for escaping any user-controlled values reaching the slot. The framework ships a `.dh-icon-action` ghost-button class for the click-to-change pattern; otherwise use any markup that fits the 44×44 frame.

### Title affix

`titleAffix` is the trusted-HTML slot for an inline icon affordance pinned next to the title text (copy-to-clipboard, edit pencil, link-out). Renders inside `.dh-title-affix` within a flex `.dh-name-row` that wraps the H2:

```js
header: {
    titleFn: m => m.get('short_link') || m.get('code'),
    titleAffix: () => `
        <button type="button" class="dh-name-action"
                data-action="copy-link"
                data-bs-toggle="tooltip" title="Copy short URL">
            <i class="bi bi-clipboard"></i>
        </button>
    `
}
```

The framework's `.dh-name-action` class is the standard ghost-icon-button treatment (transparent bg, secondary-text icon, hover deepens). Action bubbles to the parent `DetailView`'s `onActionCopyLink` (or whatever `data-action` you used) via the same pipeline as other header actions.

Same security contract as `auxFn`: any user-controlled values must be escaped by the caller.

### Aux slot

The right-side action cluster reads, left-to-right:

```
[ auxFn output ] · [ active switch ] · [ actions[] ] · | · [ ⋮ context ] · [ ✕ ]
```

`auxFn(model) -> htmlString` is the slot for inline state read-outs that don't fit the chip / badge model — presence dots, "Last seen 4m ago" lines, attempt counters, etc. The string is rendered as **trusted HTML** (it comes from source code, not user input). Returning falsy omits the wrapper entirely.

Re-renders along with the rest of the header on `model.set(...)` (the parent `DetailView`'s `_onModelChange` re-renders the header view), so reading `model.get('last_activity')` etc. inside `auxFn` is safe.

```js
header: {
    titleField: 'display_name',
    activeField: 'is_active',
    auxFn: (m) => {
        const last = m.get('last_activity');
        const online = last && (Date.now() - new Date(last).getTime()) < 5 * 60 * 1000;
        return `
            <div class="dh-aux-presence">
                <span class="dh-aux-dot ${online ? 'is-online' : ''}"></span>
                ${online ? 'Online' : 'Offline'}
            </div>
            <div class="dh-aux-meta">Last active ${last ? new Date(last).toLocaleString() : '—'}</div>
        `;
    }
}
```

The framework ships `.dh-aux-presence`, `.dh-aux-dot` (`.is-online` modifier), and `.dh-aux-meta` styles — see [`core.css`](../../src/core/css/core.css) under "DetailHeaderView". Component-specific aux markup is fine too — wrap your own classes inside the `.dh-aux` div emitted by the header.

---

## Instance Methods

### `setBadge(key, value)`

Update a section's badge in the rail without re-rendering. Same shape as [`SideNavView.setBadge`](SideNavView.md#setbadgekey-value).

```js
this.collection.on('fetch:success', () => {
    this.setBadge('Incidents', this.collection.models.length);
});
```

### `showSection(key)`

Programmatically switch to a section. Returns a Promise.

```js
await this.showSection('Agent');
```

---

## Lifecycle Hooks

`DetailView` calls these around its internal build, so subclasses can inject work without overriding `onInit` directly:

### `onBeforeBuild()`

Runs before the header + sidenav are constructed. Use it to pre-create shared collections or any other state the section views need at construction time.

### `onAfterBuild()`

Runs after the header + sidenav are added as children. Use it to wire cross-section listeners, subscribe to collection events for badge updates, etc.

```js
async onAfterBuild() {
    this.incidentsCollection.on('fetch:success', () => {
        const n = this.incidentsCollection.models.length;
        this.setBadge('Incidents', n > 0 ? n : null);
    });
}
```

You can still override `onInit` if needed — just remember to call `super.onInit()`.

---

## Active Toggle

When `activeField` is set, the header renders a small switch that toggles `model.attributes[activeField]`. The default `onActionToggleActive` implementation (provided by `DetailHeaderView`):

1. Sets the field on the model
2. Calls `model.save()`
3. On error: reverts both the model and the visible switch state, toasts the error
4. On success: toasts success, emits `detail:updated`

Subclasses override `onActionToggleActive` if they need different save semantics.

---

## Close Behavior

With `closable: true` (default), the header renders an X button at the top-right with `data-bs-dismiss="modal"`. Bootstrap auto-handles dismiss — no JS needed.

For non-modal hosts (e.g. embedding the view inside a Page), pass `closable: false`. Esc and backdrop click are unaffected — those are Modal-level features that work whether the X is shown or not.

---

## Modal Hosting (`Modal.detail()`)

`Modal.detail(view)` is the canonical helper for opening a `DetailView` in a modal. Defaults:

- `size: 'lg'` — balanced width for record viewers; pass `size: 'xl'` (or `'xxl'`) for unusually wide content (dense charts, multi-column dashboards). Width was previously `'xl'` by default and was tightened to `'lg'` to match the reference layout.
- `header: false` — the view supplies its own header
- `noBodyPadding: true` — the view content sits flush against the modal edges
- `buttons: []` — no footer; dismiss via X / Esc / backdrop

```js
await Modal.detail(new RuleSetView({ model }));
```

Override any default by passing it through:

```js
await Modal.detail(new RuleSetView({ model }), { size: 'xl' });
```

---

## Common Patterns

### Pre-fetching shared collections

```js
constructor(options = {}) {
    const model = options.model;
    const incidentsCollection = new IncidentList({ params: { rule_set: model.get('id') } });

    // Sections share the collection — Overview reads count, Incidents section renders rows
    const overview  = new OverviewSection({ model, incidentsCollection });
    const incidents = new IncidentsSection({ model, collection: incidentsCollection });

    super({
        ...options,
        model,
        header: { /* ... */ },
        sections: [
            { key: 'Overview', view: overview },
            { key: 'Incidents', view: incidents }
        ]
    });

    this.incidentsCollection = incidentsCollection;
    // Fire-and-forget so the badge populates before user opens the section
    incidentsCollection.fetch().catch(() => {});
}

async onAfterBuild() {
    this.incidentsCollection.on('fetch:success', () => {
        const n = this.incidentsCollection.models.length;
        this.setBadge('Incidents', n > 0 ? n : null);
    });
}
```

### Inline edit affordances

Sections emit edit-related events that bubble up to `DetailView` action handlers:

```js
// Inside a section view:
async onActionEditStep(event, element) {
    this.emit('action:edit-step', element.dataset.tab);
}

// In DetailView subclass:
async onAfterBuild() {
    this.triggeringSection.on('action:edit-step', step => {
        this.openMiniForm(step);
    });
}
```

### Hiding a section conditionally

Build the `sections` array conditionally before passing to `super()`:

```js
const sections = [{ key: 'Overview', view: overview }];
if (model.get('metadata') && Object.keys(model.get('metadata')).length) {
    sections.push({ key: 'Metadata', view: metadata });
}
```

---

## `DetailHeaderView` (standalone)

If you want the flat header without the SideNav (e.g. on a `Page` rather than in a Modal), import and use it directly:

```js
import { DetailHeaderView } from 'web-mojo/DetailView';

const header = new DetailHeaderView({
    model,
    icon: 'bi-person-circle',
    titleField: 'username',
    chips: [{ icon: 'bi-shield', text: 'Verified', variant: 'success' }],
    closable: false  // not in a modal
});
this.addChild(header, { containerId: 'page-header' });
```

The same options apply as the nested `header: {...}` config in `DetailView`.

---

## Notes

- **Function templates re-evaluate on every render.** `DetailHeaderView`'s template reads model state at render time, so subclasses can call `headerView.render()` to refresh after a save without dealing with a cached HTML string.
- **Action dispatch is by `data-action` convention.** All header-config `actions[]` entries and `contextMenu.items[]` entries fire through the standard MOJO event delegate, dispatched on the closest View with a matching `onAction<KebabCase>` handler — typically the `DetailView` subclass.
- **Section views are arbitrary.** Each section in `sections` is whatever `View` subclass you write. `DetailView` doesn't impose any shape on them.
