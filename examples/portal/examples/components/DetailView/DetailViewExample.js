import {
    Page, View, Model,
    DetailView, MetricCard, Modal, dataFormatter
} from 'web-mojo';

/**
 * DetailViewExample — the canonical Modal record-viewer shell.
 *
 * Doc:    docs/web-mojo/components/DetailView.md
 * Route:  components/detail-view
 *
 * `DetailView` is the standard "record viewer in a modal" shape used by
 * UserView, GroupView, IncidentView, FileView, ShortLinkView, GeoIPView,
 * and the rest of the admin extension. Subclass `DetailView`, hand it a
 * `header` config and a `sections: []` array, then open via `Modal.detail()`.
 *
 * What this shows:
 *   1. Header config — icon (Bootstrap or `iconHtml` slot), tone, title /
 *      subtitle, chips (with optional `tooltip`), `titleAffix` for inline
 *      icon-buttons, `auxFn` for a right-gutter readout (presence + active
 *      toggle + meta line), `actions: []` (gutter stays minimal), and
 *      `contextMenu` for long-tail actions.
 *   2. Sections — Overview leads with a MetricCard KPI grid + flat-row
 *      identity card; Details and Activity each render their own content.
 *   3. The locked Modal envelope — `Modal.detail(view)` opens the view
 *      with `noBodyPadding: true`, `buttons: []`, `header: false` so the
 *      DetailHeaderView IS the dialog header.
 */


// ── A throwaway model so the example is self-contained ──

class WidgetModel extends Model {}


// ── Sections ──────────────────────────────────────────────

class WidgetOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'widget-overview-section',
            template: `
                <div class="detail-section-eyebrow">Snapshot</div>
                <div class="detail-kpi-grid">
                    <div data-container="kpi-status"></div>
                    <div data-container="kpi-uses"></div>
                    <div data-container="kpi-rating"></div>
                    <div data-container="kpi-modified"></div>
                </div>

                <div class="detail-section-eyebrow">Identity</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Name</div>
                    <div class="detail-flat-row-value">{{model.name}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Slug</div>
                    <div class="detail-flat-row-value"><code>{{model.slug}}</code></div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Owner</div>
                    <div class="detail-flat-row-value">{{model.owner}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Description</div>
                    <div class="detail-flat-row-value">{{model.description}}</div>
                </div>
            `,
            ...options,
        });
    }

    async onInit() {
        const m = this.model;
        this.kpiStatus = new MetricCard({
            containerId: 'kpi-status', label: 'Status',
            value: m.get('is_active') ? 'Active' : 'Inactive',
            tone: m.get('is_active') ? 'success' : 'default',
        });
        this.kpiUses = new MetricCard({
            containerId: 'kpi-uses', label: 'Uses · 30d', value: String(m.get('uses_30d') || 0),
        });
        this.kpiRating = new MetricCard({
            containerId: 'kpi-rating', label: 'Rating',
            value: m.get('rating') != null ? `${m.get('rating')} / 5` : '—',
        });
        this.kpiModified = new MetricCard({
            containerId: 'kpi-modified', label: 'Modified',
            value: dataFormatter.apply('relative', m.get('modified')) || '—',
        });
        [this.kpiStatus, this.kpiUses, this.kpiRating, this.kpiModified]
            .forEach(c => this.addChild(c));
    }
}

class WidgetDetailsSection extends View {
    constructor(options = {}) {
        super({
            className: 'widget-details-section',
            template: `
                <div class="detail-section-eyebrow">Configuration</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Region</div>
                    <div class="detail-flat-row-value">{{model.region}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Capacity</div>
                    <div class="detail-flat-row-value">{{model.capacity}}</div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Visibility</div>
                    <div class="detail-flat-row-value">
                        {{#model.is_public|bool}}<span class="badge bg-success"><i class="bi bi-unlock me-1"></i>Public</span>{{/model.is_public|bool}}
                        {{^model.is_public|bool}}<span class="badge bg-secondary"><i class="bi bi-lock me-1"></i>Private</span>{{/model.is_public|bool}}
                    </div>
                </div>
            `,
            ...options,
        });
    }
}

class WidgetActivitySection extends View {
    constructor(options = {}) {
        super({
            className: 'widget-activity-section',
            template: `
                <div class="detail-section-eyebrow">Recent activity</div>
                <p class="text-secondary small mb-0">
                    Each section is a regular View — render whatever you want here.
                    In real consumers (UserView's Audit feed, ShortLinkView's Click History)
                    this is a <code>ListView</code> with an itemTemplate.
                </p>
            `,
            ...options,
        });
    }
}


// ── DetailView subclass ───────────────────────────────────

class WidgetView extends DetailView {
    constructor(options = {}) {
        const model = options.model;

        const overviewSection = new WidgetOverviewSection({ model });
        const detailsSection = new WidgetDetailsSection({ model });
        const activitySection = new WidgetActivitySection({ model });

        super({
            ...options,
            model,
            header: {
                // Bootstrap icon + tone — falls back when iconHtml returns null.
                icon: 'bi-gear-wide-connected',
                iconToneFn: m => (m.get('is_active') ? 'primary' : null),

                // Title + subtitle.
                titleField: 'name',
                subtitleFn: m => `Owned by ${m.get('owner')} · region ${m.get('region')}`,

                // Inline icon button next to the title — copy-the-slug.
                titleAffix: () => `
                    <button type="button" class="dh-name-action"
                        data-action="copy-slug"
                        data-bs-toggle="tooltip" title="Copy slug">
                        <i class="bi bi-clipboard"></i>
                    </button>
                `,

                // Chips with optional tooltips.
                chips: [
                    { icon: 'bi-tag-fill', textPath: 'category', variant: 'primary' },
                    { icon: 'bi-shield-check', text: 'Verified', variant: 'success',
                      tooltip: 'Owner identity verified',
                      when: m => !!m.get('is_verified') },
                    { icon: 'bi-stars', text: 'Featured', variant: 'warning',
                      tooltip: 'Promoted on the home dashboard',
                      when: m => !!m.get('is_featured') },
                ],

                // Right-gutter aux — toggle on row 1, muted meta line on row 2.
                // The toggle bubbles `toggle-active` up to onActionToggleActive.
                auxFn: m => {
                    const isActive = !!m.get('is_active');
                    const modified = m.get('modified');
                    const rel = modified ? dataFormatter.apply('relative', modified) : '';
                    return `
                        <div class="dh-aux-top">
                            <label class="dh-active-switch">
                                <input type="checkbox" data-change-action="toggle-active" ${isActive ? 'checked' : ''}>
                                <span class="dh-track"></span>
                                <span class="dh-track-label">${isActive ? 'Active' : 'Inactive'}</span>
                            </label>
                        </div>
                        ${rel ? `<span class="dh-aux-meta">Modified ${rel}</span>` : ''}
                    `;
                },

                // Header gutter stays minimal — primary actions live elsewhere.
                actions: [],

                // Long-tail actions in the kebab menu.
                contextMenu: {
                    items: [
                        { label: 'Edit Widget', action: 'edit-widget', icon: 'bi-pencil' },
                        { label: 'Duplicate', action: 'duplicate-widget', icon: 'bi-files' },
                        { type: 'divider' },
                        { label: 'Archive', action: 'archive-widget', icon: 'bi-archive', danger: true },
                    ],
                },
            },
            sections: [
                { key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2',       view: overviewSection },
                { key: 'Details',  label: 'Details',  icon: 'bi-info-circle',    view: detailsSection },
                { type: 'divider', label: 'Activity' },
                { key: 'Activity', label: 'Activity', icon: 'bi-clock-history',  view: activitySection },
            ],
            activeSection: 'Overview',
        });
    }

    // Action handlers — DetailHeaderView re-dispatches unhandled actions
    // up to the parent DetailView, so handlers live here on the view.

    async onActionToggleActive(event, element) {
        const checked = !!element.checked;
        this.model.set('is_active', checked);
        // No backend round-trip in the example; real consumers call model.save().
        if (this.headerView?.isMounted()) await this.headerView.render();
    }

    async onActionCopySlug() {
        try {
            await navigator.clipboard.writeText(this.model.get('slug'));
            this.getApp()?.toast?.success?.('Slug copied');
        } catch { /* no-op */ }
    }

    async onActionEditWidget() {
        Modal.alert('Pretend an edit form opened. In real consumers, Modal.modelForm() runs here.');
    }
    async onActionDuplicateWidget() {
        this.getApp()?.toast?.info?.('Pretend a duplicate was minted.');
    }
    async onActionArchiveWidget() {
        const ok = await Modal.confirm('Archive this widget?', 'Confirm Archive');
        if (ok) this.getApp()?.toast?.success?.('Widget archived');
    }
}


// ── Page wrapper ──────────────────────────────────────────

class DetailViewExample extends Page {
    static pageName = 'components/detail-view';
    static route = 'components/detail-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DetailViewExample.pageName,
            route: DetailViewExample.route,
            title: 'DetailView — Modal record viewer',
            template: DetailViewExample.TEMPLATE,
        });
    }

    async onActionOpenDetail() {
        const model = new WidgetModel({
            id: 42,
            name: 'Inventory Sync',
            slug: 'inventory-sync',
            description: 'Mirrors warehouse stock counts to the storefront every 5 minutes.',
            category: 'Integration',
            owner: 'ops@example.com',
            region: 'us-east',
            capacity: '500 ops/min',
            is_active: true,
            is_public: false,
            is_verified: true,
            is_featured: true,
            uses_30d: 1284,
            rating: 4.6,
            modified: Math.floor(Date.now() / 1000) - 1800,
        });
        await Modal.detail(new WidgetView({ model }));
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>DetailView</h1>
            <p class="example-summary">
                Canonical Modal record-viewer shell — flat header (icon, title, chips,
                active toggle, kebab menu, X close) plus a left-rail SideNavView for
                sections. Subclass <code>DetailView</code>, hand it a header config and
                a <code>sections: []</code> array, open via <code>Modal.detail()</code>.
            </p>
            <p class="example-docs-link">
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/DetailView.md">
                    <i class="bi bi-book"></i> docs/web-mojo/components/DetailView.md
                </a>
            </p>

            <div class="card mb-3"><div class="card-body">
                <button class="btn btn-primary" data-action="open-detail">
                    <i class="bi bi-box-arrow-up-right me-1"></i> Open DetailView
                </button>
                <p class="text-muted small mb-0 mt-3">
                    The opened modal demonstrates: <code>iconToneFn</code>,
                    <code>titleAffix</code> (clipboard next to title),
                    <code>chip.tooltip</code>, <code>auxFn</code> with the
                    two-row toggle+meta layout, an empty <code>actions: []</code>
                    gutter, a <code>contextMenu</code>, and three sections
                    (Overview KPIs + flat-rows, Details, Activity).
                </p>
            </div></div>

            <p class="text-muted small">
                <i class="bi bi-arrows-angle-expand"></i>
                Open the modal then resize the window narrower than 576px to see the
                mobile reflow — the <code>⋮ ✕</code> pair stays pinned top-right and
                muted aux content (the "Modified Xm ago" line, presence labels) hides
                to keep the cluster compact.
            </p>
        </div>
    `;
}

export default DetailViewExample;
