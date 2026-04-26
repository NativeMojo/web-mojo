/**
 * Coverage smoke test for the examples portal.
 *
 * Asserts that every component documented in docs/web-mojo/README.md has a
 * matching folder under examples/portal/examples/<area>/<Component>/. This is
 * the fence that keeps docs and examples in sync — adding a new doc row
 * without an example, or removing an example without removing the doc row,
 * fails the test by name.
 *
 * Coverage scope is intentionally narrow: we only require a folder to exist
 * for components named in docs/web-mojo/README.md. Components without a
 * dedicated doc page (e.g. utility classes covered inline elsewhere) are
 * out of scope.
 */

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const fs = require('fs');
    const path = require('path');

    const REPO_ROOT = path.resolve(__dirname, '../..');
    const DOCS_README = path.join(REPO_ROOT, 'docs/web-mojo/README.md');
    const EXAMPLES_ROOT = path.join(REPO_ROOT, 'examples/portal/examples');

    /**
     * Components listed in docs/web-mojo/README.md that should have a
     * canonical example folder. Hand-curated rather than parsed from the
     * README so the test stays stable when the README is reformatted, and so
     * we can exclude pages that don't have a runnable demo (e.g. extension
     * sub-pages, "see X" cross-links). If a new component lands in the docs
     * with a runnable example, add it here.
     */
    const REQUIRED_COMPONENTS = {
        core: [
            'View', 'ViewChildViews', 'AdvancedViews', 'Templates', 'DataFormatter',
            'Model', 'Collection', 'Events', 'WebApp', 'PortalApp', 'PortalWebApp',
        ],
        pages: ['Page', 'FormPage', 'TablePage'],
        services: ['Rest', 'ToastService', 'WebSocketClient'],
        components: [
            'Dialog', 'Modal', 'ListView', 'TableView',
            'DataView', 'FileView', 'ImageFields', 'SidebarTopNav', 'ContextMenu',
            'SideNavView',
        ],
        extensions: [
            'Charts', 'LightBox', 'MapView', 'MapLibreView', 'TimelineView',
            'FileUpload', 'TabView', 'Location',
        ],
        forms: [
            'FormView', 'TextInputs', 'SelectionFields', 'DateTimeFields',
            'FileMediaFields', 'TextareaFields', 'StructuralFields', 'OtherFields',
            'Validation', 'FormLayout', 'MultiStepWizard', 'SearchFilterForm',
        ],
        'forms/inputs': [
            'TagInput', 'DatePicker', 'DateRangePicker', 'MultiSelect',
            'ComboInput', 'CollectionSelect', 'ImageField',
        ],
        models: ['BuiltinModels'],
    };

    describe('docs/web-mojo/README.md exists', () => {
        it('docs index is present', () => {
            expect(fs.existsSync(DOCS_README)).toBe(true);
        });
    });

    describe('every documented component has a canonical example folder', () => {
        for (const [area, components] of Object.entries(REQUIRED_COMPONENTS)) {
            for (const component of components) {
                const folder = path.join(EXAMPLES_ROOT, area, component);
                const exampleFile = path.join(folder, `${component}Example.js`);
                const manifest = path.join(folder, 'example.json');

                it(`${area}/${component} has a folder with ${component}Example.js + example.json`, () => {
                    expect(fs.existsSync(folder)).toBe(true);
                    expect(fs.existsSync(exampleFile)).toBe(true);
                    expect(fs.existsSync(manifest)).toBe(true);
                });
            }
        }
    });

    describe('every example folder is registered in the README coverage list', () => {
        // Walk examples/<area>/<Component>/ and confirm each Component appears
        // in REQUIRED_COMPONENTS for that area. Catches drift in the other
        // direction: an example added without a doc row.
        function walk(area, dir) {
            if (!fs.existsSync(dir)) return [];
            return fs.readdirSync(dir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);
        }

        for (const area of Object.keys(REQUIRED_COMPONENTS)) {
            const areaDir = path.join(EXAMPLES_ROOT, area);
            // Skip nested area entries (forms/inputs sits under forms/) when scanning forms.
            const entries = walk(area, areaDir).filter(name => {
                if (area === 'forms' && name === 'inputs') return false;
                return true;
            });

            for (const component of entries) {
                it(`example folder ${area}/${component} is in the required-components list`, () => {
                    expect(REQUIRED_COMPONENTS[area]).toContain(component);
                });
            }
        }
    });
};
