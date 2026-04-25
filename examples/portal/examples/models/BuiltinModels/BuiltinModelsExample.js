import { Page, User, UserList } from 'web-mojo';

/**
 * BuiltinModelsExample — showcase of the built-in Model/Collection classes.
 *
 * Doc:    docs/web-mojo/models/BuiltinModels.md
 * Route:  models/builtin-models
 *
 * What this shows:
 *   1. The roster of built-in entities exported from `web-mojo` — User, Group,
 *      Member, Job, Email, Files, Incident, Tickets, Log, Metrics, ApiKey,
 *      etc. — rendered as a quick-reference grid.
 *   2. One concrete usage demo: fetch the current user's `UserList` and
 *      render the first page of results in a small card. This is the simplest
 *      model in the catalog and stands in for the rest — they all follow the
 *      same `new Collection(); await coll.fetch(filters);` pattern.
 *
 * Backend: needs the NativeMojo backend at `localhost:9009`. Without it, the
 * page renders the catalog but the User demo card shows an error state.
 */
class BuiltinModelsExample extends Page {
    static pageName = 'models/builtin-models';
    static route = 'models/builtin-models';

    constructor(options = {}) {
        super({
            ...options,
            pageName: BuiltinModelsExample.pageName,
            route: BuiltinModelsExample.route,
            title: 'Built-in Models — User, Group, Job, …',
            template: BuiltinModelsExample.TEMPLATE,
        });

        this.catalog = [
            { name: 'User',     list: 'UserList',     icon: 'bi-person',       endpoint: '/api/user',     summary: 'User accounts. Has hasPermission(), Forms, DataView.' },
            { name: 'Group',    list: 'GroupList',    icon: 'bi-diagram-3',    endpoint: '/api/group',    summary: 'Tenants/orgs/teams. GroupKinds enum + Forms.' },
            { name: 'Member',   list: 'MemberList',   icon: 'bi-people',       endpoint: '/api/member',   summary: 'User membership in a group + role/perms.' },
            { name: 'Job',      list: 'JobList',      icon: 'bi-cpu',          endpoint: '/api/job',      summary: 'Background tasks; status, progress, result.' },
            { name: 'Email',    list: 'EmailList',    icon: 'bi-envelope',     endpoint: '/api/email',    summary: 'Queued / sent email messages.' },
            { name: 'Files',    list: 'FilesList',    icon: 'bi-files',        endpoint: '/api/files',    summary: 'Uploaded files / media assets.' },
            { name: 'Incident', list: 'IncidentList', icon: 'bi-exclamation-octagon', endpoint: '/api/incident', summary: 'Outage/issue records with severity + status.' },
            { name: 'Tickets',  list: 'TicketList',   icon: 'bi-ticket-detailed', endpoint: '/api/ticket',  summary: 'Support / task tickets with priority.' },
            { name: 'Log',      list: 'LogList',      icon: 'bi-journal-text', endpoint: '/api/log',      summary: 'Audit log: actor, action, target, details.' },
            { name: 'Metrics',  list: 'MetricsList',  icon: 'bi-graph-up',     endpoint: '/api/metrics',  summary: 'Time-series metrics for monitoring.' },
            { name: 'ApiKey',   list: 'ApiKeyList',   icon: 'bi-key',          endpoint: '/api/apikey',   summary: 'API keys for programmatic access.' },
        ];
        this.users = null;
        this.userError = null;
        this.loading = true;
    }

    async onEnter() {
        await super.onEnter();
        this.loading = true;
        // Per-visit fetch; the small demo proves the pattern works against a real backend.
        try {
            const list = new UserList();
            const resp = await list.fetch({ size: 5 });
            if (resp && resp.success !== false) {
                this.users = list.toJSON().map(u => ({
                    id: u.id,
                    display_name: u.display_name || u.username || `(user ${u.id})`,
                    email: u.email || '',
                }));
                this.userError = null;
            } else {
                this.users = null;
                this.userError = 'Backend returned an error.';
            }
        } catch (err) {
            this.users = null;
            this.userError = err?.message || 'Failed to reach /api/user.';
        }
        this.loading = false;
        await this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Built-in Models</h1>
            <p class="example-summary">
                Pre-built <code>Model</code> + <code>Collection</code> classes for the common
                entities in a multi-tenant app. All follow the same fetch / save / destroy shape.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/models/BuiltinModels.md" target="_blank">
                    docs/web-mojo/models/BuiltinModels.md
                </a>
            </p>

            <div class="row g-3">
                {{#catalog}}
                    <div class="col-md-6 col-xl-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <h6 class="card-title mb-1">
                                    <i class="bi {{.icon}}"></i> {{.name}} / {{.list}}
                                </h6>
                                <code class="small text-muted">{{.endpoint}}</code>
                                <p class="card-text small mt-2 mb-0">{{.summary}}</p>
                            </div>
                        </div>
                    </div>
                {{/catalog}}
            </div>

            <div class="card mt-4">
                <div class="card-header">
                    <i class="bi bi-person"></i> UserList demo — <code>await new UserList().fetch({ size: 5 })</code>
                </div>
                <div class="card-body">
                    {{#loading|bool}}
                        <p class="text-muted mb-0">Loading…</p>
                    {{/loading|bool}}
                    {{#users|bool}}
                        <ul class="list-group list-group-flush">
                            {{#users}}
                                <li class="list-group-item d-flex justify-content-between">
                                    <span><strong>{{.display_name}}</strong> <span class="text-muted small">#{{.id}}</span></span>
                                    <span class="text-muted small">{{.email}}</span>
                                </li>
                            {{/users}}
                        </ul>
                    {{/users|bool}}
                    {{#userError|bool}}
                        <div class="alert alert-warning mb-0">
                            <i class="bi bi-exclamation-triangle"></i>
                            Could not load users: <code>{{userError}}</code>.
                            Make sure the NativeMojo backend is running at <code>localhost:9009</code>.
                        </div>
                    {{/userError|bool}}
                </div>
            </div>
        </div>
    `;
}

export default BuiltinModelsExample;
