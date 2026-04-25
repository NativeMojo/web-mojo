import { Page } from 'web-mojo';

/**
 * HomePage — landing page for the examples portal.
 *
 * Lists every example in the registry grouped by area. The list is generated
 * from `examples.registry.json` so it stays in sync automatically.
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
        this.areas = (this.options.areas || []).filter(a => a.pages && a.pages.length);
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

            {{#areas}}
            <section class="mt-4">
                <h4 class="text-uppercase text-muted small fw-bold">{{section}}</h4>
                <div class="row g-2">
                    {{#pages}}
                    <div class="col-md-6 col-lg-4">
                        <a class="card text-decoration-none h-100"
                           href="?page={{route}}">
                            <div class="card-body py-2 px-3">
                                <div class="d-flex align-items-center">
                                    <i class="bi {{icon}} me-2 text-primary"></i>
                                    <strong class="text-body">{{title}}</strong>
                                </div>
                                <div class="small text-muted">{{summary}}</div>
                            </div>
                        </a>
                    </div>
                    {{/pages}}
                </div>
            </section>
            {{/areas}}
        </div>
    `;
}

export default HomePage;
