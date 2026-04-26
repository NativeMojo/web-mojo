import { Page } from 'web-mojo';

/**
 * HomePage — landing page for the examples portal.
 *
 * Renders the same topic taxonomy that drives the portal sidebars:
 *   - "Start Here" strip pinned at the top (the canonical learning path).
 *   - Per-topic sections (Architecture, Components, Forms, Extensions),
 *     each with group sub-headings and a card grid.
 *
 * Variant subroutes (e.g. components/dialog/form, components/table-view/batch-actions)
 * are rendered as flat cards in the same group as their parent so the home
 * page is a complete index in one scroll.
 */
class HomePage extends Page {
    static pageName = 'home';
    static route = 'home';

    constructor(options = {}) {
        super({
            ...options,
            pageName: HomePage.pageName,
            route: HomePage.route,
            title: 'web-mojo — Examples Portal',
            template: HomePage.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        const topics = this.options.topics || [];
        // Flatten each group's items + their children into a single card list,
        // since variants are independent runnable examples.
        this.topics = topics.map(t => ({
            name: t.name,
            label: t.label,
            icon: t.icon,
            groups: t.groups.map(g => ({
                label: g.label,
                items: g.items.flatMap(i => [i, ...(i.children || [])]),
            })),
        }));
        this.startHere = this.options.startHere || [];
    }

    static TEMPLATE = `
        <div class="example-page shell-home">
            <h1>web-mojo Examples</h1>
            <p class="lead">
                Single canonical example per documented component. Folder layout mirrors
                <code>docs/web-mojo/</code>. Every page here is the copy-paste reference for that
                component &mdash; one file, inline template, imports from <code>web-mojo</code>.
            </p>
            <p class="text-muted small">
                Backend: <code>localhost:9009</code> &middot; Registry:
                <code>examples/portal/examples.registry.json</code>
            </p>

            {{#startHere.length|bool}}
            <section class="start-here mt-4">
                <h4 class="text-uppercase text-muted small fw-bold mb-2">Start Here</h4>
                <div class="row g-2">
                    {{#startHere}}
                    <div class="col-6 col-md-4 col-lg-2">
                        <a class="card text-decoration-none h-100" href="?page={{route}}">
                            <div class="card-body py-2 px-3 d-flex align-items-center">
                                <i class="bi {{icon}} me-2 text-primary"></i>
                                <strong class="text-body">{{text}}</strong>
                            </div>
                        </a>
                    </div>
                    {{/startHere}}
                </div>
            </section>
            {{/startHere.length|bool}}

            {{#topics}}
            <section class="topic-section mt-4">
                <h3 class="d-flex align-items-center"><i class="bi {{icon}} me-2"></i>{{label}}</h3>
                {{#groups}}
                <h4 class="text-uppercase text-muted small fw-bold mt-3 mb-2">{{label}}</h4>
                <div class="row g-2">
                    {{#items}}
                    <div class="col-md-6 col-lg-4">
                        <a class="card text-decoration-none h-100" href="?page={{route}}">
                            <div class="card-body py-2 px-3">
                                <div class="d-flex align-items-center">
                                    <i class="bi {{icon}} me-2 text-primary"></i>
                                    <strong class="text-body">{{title}}</strong>
                                </div>
                                <div class="small text-muted">{{summary}}</div>
                            </div>
                        </a>
                    </div>
                    {{/items}}
                </div>
                {{/groups}}
            </section>
            {{/topics}}
        </div>
    `;
}

export default HomePage;
