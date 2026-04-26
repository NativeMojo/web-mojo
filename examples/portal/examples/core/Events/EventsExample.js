import { Page, Model, EventBus } from 'web-mojo';

/**
 * EventsExample — EventBus + per-instance events (Model).
 *
 * Doc:    docs/web-mojo/core/Events.md
 * Route:  core/events
 *
 * Two complementary event systems in web-mojo:
 *
 *   - EventBus — global pub/sub (`app.events` is one). Anyone with a
 *     reference can publish or subscribe. Used here as a local bus to
 *     keep the demo self-contained, but the API is identical.
 *   - Per-instance events — Models, Collections, and Views expose
 *     `on/off/emit`. `model.set(...)` automatically emits 'change' and
 *     'change:fieldName'.
 *
 * The page subscribes to both in `onInit()` and re-renders when either
 * fires. data-action buttons drive the events.
 */
class DemoModel extends Model {
    constructor(data = {}) {
        super(data, { endpoint: '/api/demo' });
    }
}

class EventsExample extends Page {
    static pageName = 'core/events';
    static route = 'core/events';

    constructor(options = {}) {
        super({
            ...options,
            pageName: EventsExample.pageName,
            route: EventsExample.route,
            title: 'Events — bus + per-instance',
            template: EventsExample.TEMPLATE,
        });

        this.bus = new EventBus();
        this.model = new DemoModel({ counter: 0 });
        this.busLog = [];
        this.modelLog = [];
    }

    async onInit() {
        await super.onInit();

        // Bus subscription — pub/sub between unrelated components.
        this.bus.on('ping', ({ note }) => {
            this.busLog.unshift(`bus 'ping' &rarr; ${note}`);
            this.busLog = this.busLog.slice(0, 5);
            this.render();
        });

        // Per-instance subscriptions on the model.
        this.model.on('change', (m) => {
            this.modelLog.unshift(`'change' &rarr; counter=${m.get('counter')}`);
            this.modelLog = this.modelLog.slice(0, 5);
            this.render();
        });
        this.model.on('change:counter', (value) => {
            this.modelLog.unshift(`'change:counter' &rarr; ${value}`);
            this.modelLog = this.modelLog.slice(0, 5);
            this.render();
        });
    }

    onActionEmitBus() {
        this.bus.emit('ping', { note: `at ${new Date().toLocaleTimeString()}` });
    }

    onActionBumpModel() {
        this.model.set('counter', this.model.get('counter') + 1);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Events</h1>
            <p class="example-summary">
                <code>EventBus</code> for global pub/sub and per-instance <code>on/emit</code> on
                Models, Collections, and Views.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/core/Events.md">
                    docs/web-mojo/core/Events.md
                </a>
            </p>

            <div class="row g-3">
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title"><i class="bi bi-broadcast"></i> EventBus</h5>
                            <p class="text-muted small">
                                <code>bus.emit('ping', payload)</code> fans out to every subscriber.
                            </p>
                            <button class="btn btn-sm btn-primary" data-action="emit-bus">
                                <i class="bi bi-send"></i> Emit ping
                            </button>
                            <ul class="list-unstyled small mt-3 mb-0">
                                {{#busLog}}<li class="text-muted">{{{.}}}</li>{{/busLog}}
                                {{^busLog|bool}}<li class="text-muted fst-italic">No events yet.</li>{{/busLog|bool}}
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title"><i class="bi bi-bullseye"></i> Per-instance (Model)</h5>
                            <p class="text-muted small">
                                <code>model.set()</code> fires <code>'change'</code> and <code>'change:counter'</code>.
                            </p>
                            <button class="btn btn-sm btn-primary" data-action="bump-model">
                                <i class="bi bi-plus-lg"></i> Bump counter ({{model.counter}})
                            </button>
                            <ul class="list-unstyled small mt-3 mb-0">
                                {{#modelLog}}<li class="text-muted">{{{.}}}</li>{{/modelLog}}
                                {{^modelLog|bool}}<li class="text-muted fst-italic">No events yet.</li>{{/modelLog|bool}}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default EventsExample;
