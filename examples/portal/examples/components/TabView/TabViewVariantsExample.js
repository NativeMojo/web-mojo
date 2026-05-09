import { Page, View, TabView, SegmentControl } from 'web-mojo';

/**
 * TabViewVariantsExample — flip through the five visual variants live.
 *
 * Doc:    docs/web-mojo/components/TabView.md
 * Route:  components/tab-view/variants
 *
 * `minimal` is the default. The other four — `underline`, `pills`,
 * `segmented`, `segmented-solid` — restyle the same TabView with one
 * constructor option and CSS hook classes (no markup changes).
 *
 * The picker is a SegmentControl. Picking a variant replaces the TabView
 * child entirely so the new tabsClass takes effect — variant is resolved
 * once at construction time.
 */
class TabViewVariantsExample extends Page {
    static pageName = 'components/tab-view/variants';
    static route = 'components/tab-view/variants';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TabViewVariantsExample.pageName,
            route: TabViewVariantsExample.route,
            title: 'TabView — variants',
            template: TabViewVariantsExample.TEMPLATE,
        });
        this.variant = 'minimal';
    }

    async onInit() {
        await super.onInit();

        this.picker = new SegmentControl({
            containerId: 'variant-picker',
            ariaLabel: 'TabView variant',
            options: [
                { value: 'minimal',         label: 'minimal' },
                { value: 'underline',       label: 'underline' },
                { value: 'pills',           label: 'pills' },
                { value: 'segmented',       label: 'segmented' },
                { value: 'segmented-solid', label: 'segmented-solid' }
            ],
            value: this.variant
        });
        this.picker.on('change', async ({ value }) => {
            this.variant = value;
            this._mountTabView();
        });
        this.addChild(this.picker);

        this._mountTabView();
    }

    _mountTabView() {
        if (this.tabs) {
            this.removeChild(this.tabs);
        }
        const overview = new View({
            template: '<h5>Style</h5><p class="mb-0">The active variant is <code>' + this.variant + '</code>.</p>',
        });
        const image = new View({
            template: '<h5>Image</h5><p class="mb-0">Try flipping the theme (top-right) to verify both light and dark read.</p>',
        });
        const arrange = new View({
            template: '<h5>Arrange</h5><p class="mb-0">Resize the window narrow to see the responsive dropdown collapse.</p>',
        });

        this.tabs = new TabView({
            containerId: 'tabs-slot',
            variant: this.variant,
            tabs: { 'Style': overview, 'Image': image, 'Arrange': arrange },
            activeTab: 'Style'
        });
        // Render directly because we're swapping after the page first rendered.
        // (Standard child lifecycle: addChild + render() since parent has already mounted.)
        this.addChild(this.tabs);
        if (this.isMounted()) {
            this.tabs.render();
        }
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TabView — variants</h1>
            <p class="example-summary">
                Five visual variants for TabView. Pick one with the segment control;
                the same tabs re-render with the new <code>variant</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/TabView.md">
                    docs/web-mojo/components/TabView.md
                </a>
            </p>

            <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <span class="text-body-secondary small fw-semibold">Variant:</span>
                <div data-container="variant-picker"></div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <div data-container="tabs-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default TabViewVariantsExample;
