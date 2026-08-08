module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const fs = require('fs');
    const path = require('path');
    const root = path.join(__dirname, '../..');
    const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
    const stripComments = text => text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
        .map(line => line.replace(/(^|\s)\/\/.*$/, '$1')).join('\n');

    describe('WebApp operator surfaces', () => {
        it('registers exact routes and exports both runtime surfaces', () => {
            const admin = stripComments(read('src/admin.js'));
            expect(admin).toContain("registerPage('system/dns/webapps', WebAppTablePageClass");
            expect(admin).toContain("registerPage('system/edge/deploy', EdgeDeployPageClass, { permissions: [\"sys.manage_deploy\"] })");
            for (const file of ['src/admin.js', 'src/extensions/admin/index.js']) {
                const source = stripComments(read(file));
                ['WebAppTablePage', 'WebAppView', 'EdgeDeployPage']
                    .forEach(name => expect(source).toContain(`as ${name}`));
            }
            const models = stripComments(read('src/extensions/admin/models/index.js'));
            expect(models).toContain("export * from './Edge.js'");
        });

        it('gives deploy-only operators a distinct Edge parent', () => {
            const admin = stripComments(read('src/admin.js'));
            expect(admin).toContain("text: 'Edge'");
            expect(admin).toContain('permissions: ["view_dns", "manage_dns", "security", "sys.manage_deploy"]');
            expect(admin).toContain("{ text: 'Fleet Deploy', route: '?page=system/edge/deploy'");
        });

        it('uses the named conjunctive action predicate for visibility and execution', () => {
            const source = stripComments(read('src/extensions/admin/edge/WebAppView.js'));
            expect(source).toContain('when: m => canManageWebApp(m._edgeApp)');
            expect(source).toContain('canManageWebApp(this.webAppView?.getApp?.() || this.getApp())');
            expect((source.match(/if \(!canManageWebApp\(app\)\) return true/g) || []).length).toBe(2);
        });

        it('uses constrained bucket text and leaves allowlist authority on the server', () => {
            const source = stripComments(read('src/extensions/admin/edge/WebAppView.js'));
            expect(source).toContain("name: 'bucket', type: 'text'");
            expect(source).toContain('maxlength: WEBAPP_BUCKET_MAX_LENGTH');
            expect(source).not.toContain('edge_release_buckets');
            expect(source).not.toContain('allowedBuckets');
        });

        it('pins non-superuser URL scope to the active group before initialization', () => {
            const source = stripComments(read('src/extensions/admin/edge/WebAppTablePage.js'));
            expect(source).toContain('this.query.group = group');
            expect(source).toContain('delete this.query.group');
            expect(source.indexOf('this.query.group = group')).toBeLessThan(source.indexOf('await super.onInit()'));
        });

        it('renders named auto-promote states without pipe delimiters inside formatter arguments', () => {
            const source = stripComments(read('src/extensions/admin/edge/WebAppTablePage.js'));
            expect(source).toContain("value ? 'On' : 'Off'");
            expect(source).not.toContain("boolean('On|bg-success'");
        });

        it('resolves WebApp deep links through the selected tenant before detail hydration', () => {
            const table = stripComments(read('src/extensions/admin/edge/WebAppTablePage.js'));
            const start = table.indexOf('async _openDeepLinkedItem(itemId)');
            const end = table.indexOf('async showItemDialog(model)', start);
            const method = table.slice(start, end);
            expect(start).not.toBe(-1);
            expect(method).toContain('new WebAppList');
            expect(method).toContain('superuser ? {} : { group }');
            expect(method).not.toContain('fetchOne');
            expect(method.indexOf('scoped.fetch()')).toBeLessThan(method.indexOf('showItemDialog(model)'));
        });

        it('keeps the one-time key local and supplies an explicit selectable fallback', () => {
            const source = stripComments(read('src/extensions/admin/edge/WebAppView.js'));
            expect(source).toContain('await navigator.clipboard.writeText(token)');
            expect(source).toContain('Clipboard access failed. Select and copy this key before closing');
            expect(source).toContain('user-select-all');
            expect(source).toContain('token = null');
            expect(source).not.toMatch(/this\.[A-Za-z_]*token\s*=/i);
            expect(source).not.toContain('localStorage');
            expect(source).not.toContain('sessionStorage');
            expect(source).not.toContain('model.set(\'token\'');
        });

        it('contains no CI transfer, node, or material helper endpoints', () => {
            const files = ['src/extensions/admin/models/Edge.js', 'src/extensions/admin/edge/WebAppView.js',
                'src/extensions/admin/edge/WebAppTablePage.js', 'src/extensions/admin/edge/EdgeDeployPage.js'];
            for (const file of files) {
                const source = stripComments(read(file));
                expect(source).not.toContain('/api/edge/release/complete');
                expect(source).not.toContain('/api/edge/desired_state');
                expect(source).not.toContain('/api/edge/material');
                expect(source).not.toContain('/api/edge/edge_node');
                expect(source).not.toContain('release_webapp');
            }
        });
    });
};
