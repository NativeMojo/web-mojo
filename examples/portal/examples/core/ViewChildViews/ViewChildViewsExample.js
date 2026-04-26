import { Page, View, Collection, Model } from 'web-mojo';

/**
 * ViewChildViewsExample — full tour of child-view composition.
 *
 * Doc:    docs/web-mojo/core/ViewChildViews.md
 * Route:  core/view-child-views
 *
 * Six sections in one page:
 *   1. Containers + addChild — two named slots holding two child types.
 *   2. Iteration over a Collection — one child view per model.
 *   3. Bidirectional events — parent broadcasts; children subscribe.
 *   4. Child → parent action bubbling — children emit; parent listens.
 *   5. Removing/replacing children — fresh remount loses state; held ref keeps it.
 *   6. Inline rule callouts — never child.render() after addChild(); fetch in
 *      onInit, not onAfterRender; use containerId, not direct DOM manipulation.
 */
class StatsCardView extends View {
    constructor(o = {}) {
        super({ ...o, template: StatsCardView.TPL, className: 'p-3 bg-light' });
        this.label = o.label || 'Stat'; this.value = o.value ?? 0;
    }
    static TPL = `<div><div class="text-muted small">{{label}}</div><div class="fs-4 fw-bold">{{value}}</div></div>`;
}

class ActionsCardView extends View {
    constructor(o = {}) { super({ ...o, template: ActionsCardView.TPL, className: 'p-3' }); }
    onActionPing() { this.parent.totalPings++; this.parent.refreshStats(); }
    static TPL = `<div><div class="text-muted small mb-2">Actions card child</div><button class="btn btn-sm btn-outline-primary" data-action="ping"><i class="bi bi-broadcast"></i> Ping parent</button></div>`;
}

class TodoItemView extends View {
    constructor(o = {}) { super({ ...o, template: TodoItemView.TPL, className: 'd-flex gap-2 align-items-center mb-1' }); }
    get title() { return this.model?.get('title'); }
    get done() { return this.model?.get('done'); }
    onActionToggle() { this.model.set({ done: !this.model.get('done') }); this.render(); }
    static TPL = `<button class="btn btn-sm {{#done|bool}}btn-success{{/done|bool}}{{^done|bool}}btn-outline-secondary{{/done|bool}}" data-action="toggle"><i class="bi {{#done|bool}}bi-check-circle-fill{{/done|bool}}{{^done|bool}}bi-circle{{/done|bool}}"></i></button> <span class="{{#done|bool}}text-decoration-line-through text-muted{{/done|bool}}">{{title}}</span>`;
}

class BroadcastListenerView extends View {
    constructor(o = {}) {
        super({ ...o, template: BroadcastListenerView.TPL, className: 'p-2 border rounded mb-2' });
        this.name = o.name || 'Listener'; this.lastHeard = '(nothing yet)'; this.greetCount = 0;
    }
    async onInit() {
        // Subscribe to parent broadcasts via the EventEmitter mixin (this.parent.on).
        this.parent.on('parent:broadcast', this.handleBroadcast, this);
    }
    handleBroadcast(payload) {
        this.lastHeard = payload?.message ?? '(empty)';
        this.greetCount++;
        if (this.isMounted()) this.render();
    }
    onActionSayHi() {
        // Bubble up — parent has subscribed via child.on('child:said-hi', ...).
        this.emit('child:said-hi', { from: this.name });
    }
    async onBeforeDestroy() {
        // Tear down listener so we don't leak after removeChild().
        this.parent?.off?.('parent:broadcast', this.handleBroadcast, this);
    }
    static TPL = `<div class="d-flex justify-content-between align-items-center"><div><strong>{{name}}</strong> <span class="text-muted small ms-2">heard <strong>{{greetCount}}</strong> broadcasts; last: <em>{{lastHeard}}</em></span></div><button class="btn btn-sm btn-outline-success" data-action="say-hi"><i class="bi bi-arrow-up"></i> Say hi to parent</button></div>`;
}

class TransientCounterView extends View {
    constructor(o = {}) {
        super({ ...o, template: TransientCounterView.TPL, className: 'p-2' });
        this.label = o.label || 'Counter'; this.count = 0;
    }
    onActionInc() { this.count++; this.render(); }
    static TPL = `<div class="d-flex align-items-center gap-2"><span class="badge text-bg-secondary">{{label}}</span> <span>Clicks: <strong>{{count}}</strong></span> <button class="btn btn-sm btn-outline-primary" data-action="inc"><i class="bi bi-plus-lg"></i></button></div>`;
}

class ViewChildViewsExample extends Page {
    static pageName = 'core/view-child-views';
    static route = 'core/view-child-views';

    constructor(options = {}) {
        super({ ...options,
            pageName: ViewChildViewsExample.pageName, route: ViewChildViewsExample.route,
            title: 'View — child views', template: ViewChildViewsExample.TEMPLATE });
        this.totalPings = 0; this.parentBroadcastCount = 0;
        this.childHellos = 0; this.lastHello = '(none yet)';
        this.preservedCounter = null; this.preservedMountCount = 0;
        // §2 — Collection of todos (no REST; preloaded data).
        this.todos = new Collection({ preloaded: true, ModelClass: Model });
        this.todos.add([
            { id: 1, title: 'Read the View docs', done: true },
            { id: 2, title: 'Try a child view', done: false },
            { id: 3, title: 'Wire parent ↔ child events', done: false },
        ]);
        this.todoSlots = this.todos.models.map(m => ({ slot: `todo-${m.id}` }));
    }

    async onInit() {
        await super.onInit();
        // §1 — two children of different classes in two slots.
        this.statsCard = new StatsCardView({ id: 'stats-1', containerId: 'stats-slot', label: 'Total pings', value: this.totalPings });
        this.addChild(this.statsCard);
        this.addChild(new ActionsCardView({ id: 'actions-1', containerId: 'actions-slot' }));
        // §2 — iterate over collection, one child per model, each into its own slot.
        this.todos.models.forEach(m => this.addChild(new TodoItemView({ id: `todo-${m.id}`, containerId: `todo-${m.id}`, model: m })));
        // §3 + §4 — two listeners, both bubble.
        this.listenerA = new BroadcastListenerView({ id: 'listener-a', containerId: 'listener-a-slot', name: 'Listener A' });
        this.listenerB = new BroadcastListenerView({ id: 'listener-b', containerId: 'listener-b-slot', name: 'Listener B' });
        this.addChild(this.listenerA); this.addChild(this.listenerB);
        this.listenerA.on('child:said-hi', this.handleHello, this);
        this.listenerB.on('child:said-hi', this.handleHello, this);
        // §5 — fresh transient counter on first mount.
        this._mountTransient();
    }

    handleHello(payload) {
        this.childHellos++;
        this.lastHello = payload?.from ?? '(unknown)';
        if (this.isActive) this.render();
    }

    refreshStats() {
        // Update the stats child without rebuilding it.
        this.statsCard.value = this.totalPings;
        this.statsCard.render();
    }

    onActionBroadcast() {
        this.parentBroadcastCount++;
        this.emit('parent:broadcast', { message: `hello #${this.parentBroadcastCount}` });
    }

    onActionRemoveTransient() {
        this.removeChild('transient-counter');
        const slot = this.element?.querySelector('[data-container="transient-slot"]');
        if (slot) slot.innerHTML = '<em class="text-muted small">(removed)</em>';
    }

    async onActionRemountFresh() { this.removeChild('transient-counter'); await this._mountTransient(); }

    async onActionRemountPreserved() {
        this.removeChild('transient-counter');
        if (!this.preservedCounter) {
            this.preservedCounter = new TransientCounterView({ id: 'transient-counter', containerId: 'transient-slot', label: 'Preserved' });
        } else {
            this.preservedCounter.containerId = 'transient-slot'; // re-using same instance keeps state
        }
        this.preservedMountCount++;
        this.addChild(this.preservedCounter);
        await this.preservedCounter.render(); // dynamic add — render explicitly
        if (this.isActive) await this.render();
    }

    async _mountTransient() {
        const fresh = new TransientCounterView({ id: 'transient-counter', containerId: 'transient-slot', label: 'Fresh' });
        this.addChild(fresh);
        // Dynamic adds need an explicit child.render(); the initial parent render in onInit walks children for us.
        if (this.isMounted()) await fresh.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>View — Child Views (full tour)</h1>
            <p class="example-summary">
                Six patterns for composing parent and child views: containers, collection
                iteration, bidirectional events, action bubbling, and remount semantics.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/core/ViewChildViews.md">
                    docs/web-mojo/core/ViewChildViews.md
                </a>
            </p>

            <div class="card mb-3"><div class="card-body">
                <h5 class="card-title">1. Containers + <code>addChild</code></h5>
                <p class="text-muted small mb-2">Two child classes mounted into two named slots via <code>containerId</code>. Parent never calls <code>render()</code> on them.</p>
                <div class="row g-2">
                    <div class="col-md-6"><div class="border rounded" data-container="stats-slot"></div></div>
                    <div class="col-md-6"><div class="border rounded" data-container="actions-slot"></div></div>
                </div>
            </div></div>

            <div class="card mb-3"><div class="card-body">
                <h5 class="card-title">2. Iteration over a <code>Collection</code></h5>
                <p class="text-muted small mb-2">One <code>TodoItemView</code> per model, each bound to its own <code>this.model</code>. The parent template emits one <code>data-container</code> per model, then <code>onInit</code> mounts a child into each. Toggle one — only that child re-renders.</p>
                {{#todoSlots}}
                    <div data-container="{{.slot}}"></div>
                {{/todoSlots}}
            </div></div>

            <div class="card mb-3"><div class="card-body">
                <h5 class="card-title">3 &amp; 4. Bidirectional events</h5>
                <p class="text-muted small mb-2">
                    <strong>Parent → children</strong> via <code>this.emit('parent:broadcast')</code>; children subscribe in <code>onInit</code> with <code>this.parent.on(...)</code>.
                    <strong>Children → parent</strong> by emitting on <code>this</code>; parent subscribed via <code>child.on(...)</code>.
                </p>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <button class="btn btn-sm btn-primary" data-action="broadcast">
                        <i class="bi bi-megaphone"></i> Parent broadcast (#{{parentBroadcastCount}})
                    </button>
                    <span class="text-muted small">Parent has heard <strong>{{childHellos}}</strong> hellos (last from <em>{{lastHello}}</em>)</span>
                </div>
                <div data-container="listener-a-slot"></div>
                <div data-container="listener-b-slot"></div>
            </div></div>

            <div class="card mb-3"><div class="card-body">
                <h5 class="card-title">5. Removing &amp; replacing children</h5>
                <p class="text-muted small mb-2">Click the counter, then remount fresh (state resets) or remount the held reference (state survives — same instance is re-mounted). Mounted via held ref: <strong>{{preservedMountCount}}</strong>.</p>
                <div class="border rounded p-2 mb-2" data-container="transient-slot"></div>
                <div class="d-flex flex-wrap gap-2">
                    <button class="btn btn-sm btn-outline-danger" data-action="remove-transient"><i class="bi bi-trash"></i> removeChild</button>
                    <button class="btn btn-sm btn-outline-primary" data-action="remount-fresh"><i class="bi bi-arrow-clockwise"></i> Remount (fresh — state lost)</button>
                    <button class="btn btn-sm btn-outline-success" data-action="remount-preserved"><i class="bi bi-shield-check"></i> Remount (preserved — held ref)</button>
                </div>
            </div></div>

            <div class="card"><div class="card-body small text-muted">
                <h5 class="card-title text-body">6. Framework rules — read these</h5>
                <ul class="mb-0">
                    <li>Children added in <code>onInit()</code> are rendered automatically by the parent's first <code>render()</code> — don't call <code>child.render()</code> there.</li>
                    <li>Children added <em>dynamically</em> (after the parent has rendered) need an explicit <code>await child.render()</code>, because <code>addChild()</code> alone does not mount.</li>
                    <li>Fetch data in <code>onInit()</code> (or <code>onEnter()</code> on cached pages). Never in <code>onAfterRender()</code> / <code>onAfterMount()</code>.</li>
                    <li>Use <code>data-container="name"</code> + <code>containerId: 'name'</code>. Never insert child elements with direct DOM manipulation.</li>
                    <li>Use <code>this.emit</code> / <code>parent.on</code> for cross-view events — don't reach across the tree with custom DOM events.</li>
                    <li>Guard async re-renders with <code>if (this.isActive) this.render()</code> on Pages — the user may have navigated away.</li>
                </ul>
            </div></div>
        </div>
    `;
}

export default ViewChildViewsExample;
