import { Page, View, SideNavView } from 'web-mojo';

/**
 * SideNavViewExample — section-based side navigation.
 *
 * Doc:    docs/web-mojo/components/SideNavView.md (TBD — surfaced as a doc gap)
 * Route:  components/side-nav-view
 *
 * SideNavView is the layout used by detail screens (FileView, IPSetView,
 * UserView, …) to host multiple sections behind a left rail. It collapses
 * to a dropdown below `minWidth` so the same component works inside a
 * Modal or a narrow card.
 *
 * What this shows:
 *   1. Three section views, each a tiny `View` subclass with its own
 *      template + behavior. Sections receive `key`, `label`, `icon`, `view`.
 *   2. A divider between the navigable groups (`{ type: 'divider', label }`).
 *   3. Programmatic switching via `showSection(key)` from buttons in
 *      the parent Page — useful when an external action should focus a
 *      specific section ("Edit details" → jump to Settings).
 *   4. Responsive collapse to dropdown — resize the window narrower than
 *      `minWidth` (default 500px) and the rail becomes a dropdown.
 *
 * Copy-paste recipe: build one View per section, hand them in via the
 * `sections: [...]` config, and let SideNavView own which one is visible.
 */

class DetailsSection extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: `
                <div>
                    <h5>Details</h5>
                    <p class="text-muted small">Each section is a regular View — render whatever you want.</p>
                    <dl class="row mb-0">
                        <dt class="col-sm-3">Created</dt><dd class="col-sm-9">2026-04-25</dd>
                        <dt class="col-sm-3">Status</dt><dd class="col-sm-9"><span class="badge text-bg-success">Active</span></dd>
                        <dt class="col-sm-3">Owner</dt><dd class="col-sm-9">ian@nativemojo.com</dd>
                    </dl>
                </div>
            `,
        });
    }
}

class SettingsSection extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: `
                <div>
                    <h5>Settings</h5>
                    <p class="text-muted small">
                        Sections can carry their own state. Toggle below — clicking back to Details
                        and returning preserves it because SideNavView keeps the section view alive.
                    </p>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="snv-notify" data-action="toggle-notify" {{#notifyChecked|bool}}checked{{/notifyChecked|bool}}>
                        <label class="form-check-label" for="snv-notify">Enable email notifications</label>
                    </div>
                    <p class="small mt-2">Notifications: <strong>{{notifyState}}</strong></p>
                </div>
            `,
        });
        this.notifyChecked = false;
    }
    get notifyState() { return this.notifyChecked ? 'on' : 'off'; }
    onActionToggleNotify() {
        this.notifyChecked = !this.notifyChecked;
        this.render();
    }
}

class ActivitySection extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: `
                <div>
                    <h5>Activity</h5>
                    <ul class="list-unstyled small mb-0">
                        <li><code>10:14</code> — config saved</li>
                        <li><code>09:58</code> — user signed in</li>
                        <li><code>09:31</code> — record created</li>
                    </ul>
                </div>
            `,
        });
    }
}

class SideNavViewExample extends Page {
    static pageName = 'components/side-nav-view';
    static route = 'components/side-nav-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: SideNavViewExample.pageName,
            route: SideNavViewExample.route,
            title: 'SideNavView — sectioned detail layout',
            template: SideNavViewExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.nav = new SideNavView({
            containerId: 'side-nav-slot',
            sections: [
                { key: 'details',  label: 'Details',  icon: 'bi-info-circle', view: new DetailsSection() },
                { key: 'settings', label: 'Settings', icon: 'bi-sliders',     view: new SettingsSection() },
                { type: 'divider', label: 'History' },
                { key: 'activity', label: 'Activity', icon: 'bi-clock-history', view: new ActivitySection() },
            ],
            activeSection: 'details',
            navWidth: 180,
            minWidth: 520,
        });
        this.addChild(this.nav);
    }

    onActionGoSettings() { this.nav.showSection('settings'); }
    onActionGoActivity() { this.nav.showSection('activity'); }

    static TEMPLATE = `
        <div class="example-page">
            <h1>SideNavView</h1>
            <p class="example-summary">
                Section-based detail layout — left rail of sections, right pane of content. Collapses
                to a dropdown on narrow viewports. The standard chrome inside FileView, IPSetView,
                UserView, and other Modal-hosted record viewers.
            </p>
            <p class="example-docs-link">
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/SideNavView.md">
                    <i class="bi bi-book"></i> docs/web-mojo/components/SideNavView.md
                </a>
            </p>

            <div class="card mb-3"><div class="card-body py-2">
                <span class="me-2 small text-muted">Programmatic switching:</span>
                <button class="btn btn-sm btn-outline-primary" data-action="go-settings">Jump to Settings</button>
                <button class="btn btn-sm btn-outline-primary" data-action="go-activity">Jump to Activity</button>
            </div></div>

            <div class="card" style="min-height: 320px;">
                <div data-container="side-nav-slot"></div>
            </div>

            <p class="text-muted small mt-3">
                <i class="bi bi-arrows-angle-expand"></i>
                Drag the window narrower than ~520px to see the rail collapse into a dropdown.
            </p>
        </div>
    `;
}

export default SideNavViewExample;
