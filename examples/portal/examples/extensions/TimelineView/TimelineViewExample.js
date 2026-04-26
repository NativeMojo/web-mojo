import { Page, Collection } from 'web-mojo';
import { TimelineView } from 'web-mojo/timeline';

/**
 * TimelineViewExample — canonical demo of the TimelineView extension.
 *
 * Doc:    docs/web-mojo/extensions/TimelineView.md
 * Route:  extensions/timeline-view
 *
 * TimelineView extends ListView and renders a Collection of events as a
 * vertical, dotted timeline. Each model needs `id`, `date`, and at minimum a
 * `title` or `description`; optional `icon` (Bootstrap icon class) and
 * `color` (Bootstrap variant) drive the dot. We seed an in-memory Collection
 * inline (no backend) and the "Add event" button appends a fresh model — the
 * timeline re-renders only the new item, not the whole list.
 *
 * Copy-paste recipe: build a Collection, hand it to TimelineView with
 * `containerId`, addChild() into the page, and use `collection.add(...)` for
 * live updates.
 */
class TimelineViewExample extends Page {
    static pageName = 'extensions/timeline-view';
    static route = 'extensions/timeline-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TimelineViewExample.pageName,
            route: TimelineViewExample.route,
            title: 'TimelineView — chronological events',
            template: TimelineViewExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        const now = Date.now();
        const hour = 60 * 60 * 1000;

        this.timelineEvents = new Collection([
            { id: 1, date: new Date(now - 24 * hour).toISOString(),
                title: 'Project kicked off', description: 'Charter approved by stakeholders.',
                icon: 'bi-rocket-takeoff', color: 'primary' },
            { id: 2, date: new Date(now - 6 * hour).toISOString(),
                title: 'Backend deployed', description: 'v2.1 live on staging — all checks green.',
                icon: 'bi-cloud-upload', color: 'success' },
            { id: 3, date: new Date(now - 90 * 60 * 1000).toISOString(),
                title: 'Tests failing on CI', description: 'Investigating flaky integration suite.',
                icon: 'bi-exclamation-triangle', color: 'warning' },
            { id: 4, date: new Date(now - 5 * 60 * 1000).toISOString(),
                title: 'Hotfix shipped', description: 'Patch 2.1.1 rolled out to all nodes.',
                icon: 'bi-check2-circle', color: 'success' },
        ]);

        this.timeline = new TimelineView({
            containerId: 'timeline-slot',
            collection: this.timelineEvents,
            position: 'left',
            dateFormat: 'relative',
            dotStyle: 'icon',
        });
        this.addChild(this.timeline);
    }

    onActionAddEvent() {
        const id = (this.timelineEvents.length || 0) + 100;
        this.timelineEvents.add({
            id,
            date: new Date().toISOString(),
            title: `Manual event #${id}`,
            description: 'Appended live via collection.add() — note the dot animates in.',
            icon: 'bi-stars',
            color: 'info',
        });
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TimelineView</h1>
            <p class="example-summary">
                ListView-based timeline bound to a Collection. Each item re-renders independently.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/extensions/TimelineView.md">
                    docs/web-mojo/extensions/TimelineView.md
                </a>
            </p>

            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span>Activity</span>
                    <button class="btn btn-sm btn-outline-primary" data-action="add-event">
                        <i class="bi bi-plus-lg"></i> Add event
                    </button>
                </div>
                <div class="card-body">
                    <div data-container="timeline-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default TimelineViewExample;
