module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const fs = require('fs');
    const path = require('path');

    const root = path.join(__dirname, '../..');
    const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
    const stripComments = text => text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n').map(line => line.replace(/(^|\s)\/\/.*$/, '$1')).join('\n');
    const source = relative => stripComments(read(relative));
    const viewFiles = [
        'src/extensions/admin/dns/VhostForm.js',
        'src/extensions/admin/dns/VhostTablePage.js',
        'src/extensions/admin/dns/VhostView.js',
        'src/extensions/admin/dns/UpstreamTablePage.js',
        'src/extensions/admin/dns/UpstreamView.js'
    ];

    describe('Edge admin surfaces', () => {
        it('registers and labels the two exact DNS routes with DNS gates', () => {
            const admin = source('src/admin.js');
            expect(admin).toContain("registerPage('system/dns/vhosts', VhostTablePageClass, {permissions: [\"view_dns\", \"manage_dns\"]})");
            expect(admin).toContain("registerPage('system/dns/upstreams', UpstreamTablePageClass, {permissions: [\"view_dns\", \"manage_dns\"]})");
            expect(admin).toContain("{ text: 'VHosts', route: '?page=system/dns/vhosts'");
            expect(admin).toContain("{ text: 'Upstreams', route: '?page=system/dns/upstreams'");
        });

        it('exports both pages and views through both runtime barrels', () => {
            for (const barrel of ['src/admin.js', 'src/extensions/admin/index.js']) {
                const text = source(barrel);
                ['VhostTablePage', 'VhostView', 'UpstreamTablePage', 'UpstreamView']
                    .forEach(name => expect(text).toContain(`as ${name}`));
            }
            const models = source('src/extensions/admin/models/index.js');
            expect(models).toContain("export * from './Edge.js'");
            expect(models).toContain("default as Edge");
        });

        it('scopes non-superuser lists to the active group and leaves literal superusers unscoped', () => {
            for (const file of ['VhostTablePage.js', 'UpstreamTablePage.js']) {
                const text = source(`src/extensions/admin/dns/${file}`);
                expect(text).toContain('isLiteralSuperuser(app)');
                expect(text).toContain('{ group }');
                expect(text).toContain('this.query.group = group');
                expect(text).toContain('delete this.query.group');
                expect(text.indexOf('this.query.group = group')).toBeLessThan(text.indexOf('await super.onInit()'));
                expect(text).toContain('this.options.requiresGroup = false');
            }
        });

        it('resolves VHost deep links through a scoped list before detail hydration', () => {
            const table = source('src/extensions/admin/dns/VhostTablePage.js');
            const start = table.indexOf('async _openDeepLinkedItem(itemId)');
            const end = table.indexOf('async showItemDialog(model)', start);
            const method = table.slice(start, end);
            expect(start).not.toBe(-1);
            expect(method).toContain('new VhostList');
            expect(method).toContain('superuser ? {} : { group }');
            expect(method).not.toContain('fetchOne');
            expect(method.indexOf('scoped.fetch()')).toBeLessThan(method.indexOf('showItemDialog(model)'));
        });

        it('hydrates Domain before VHost detail, edit, and delete', () => {
            const table = source('src/extensions/admin/dns/VhostTablePage.js');
            const view = source('src/extensions/admin/dns/VhostView.js');
            const form = source('src/extensions/admin/dns/VhostForm.js');
            expect(table.indexOf('VhostForm.resolveDomain')).toBeLessThan(table.indexOf('model.fetch()'));
            expect(view).toContain('async resolveOwningDomain()');
            expect(view).toContain('if (!await this.resolveOwningDomain())');
            expect(form).toContain("domain.get('group') === null && !isLiteralSuperuser(app)");
        });

        it('offers Upstream declaration and retirement only behind literal-superuser checks', () => {
            const table = source('src/extensions/admin/dns/UpstreamTablePage.js');
            const view = source('src/extensions/admin/dns/UpstreamView.js');
            expect(table).toContain('if (superuser)');
            expect(table).toContain('if (!isLiteralSuperuser(app)) return true');
            expect(view).toContain('isLiteralSuperuser(m._edgeApp)');
            expect(view).toContain('if (!isLiteralSuperuser(app)');
            expect(view).not.toContain('activeField');
            expect(view).not.toContain('.save(');
            expect(view).not.toContain('.destroy(');
        });

        it('classifies resolved failures before success effects and refreshes successful mutations', () => {
            for (const file of ['VhostForm.js', 'VhostView.js', 'UpstreamTablePage.js', 'UpstreamView.js']) {
                const text = source(`src/extensions/admin/dns/${file}`);
                expect(text).toContain('classifyActionResponse');
                expect(text).toContain('.fetch');
            }
        });

        it('contains no browser route or control for forbidden Edge surfaces', () => {
            for (const file of viewFiles) {
                const text = source(file);
                expect(text).not.toContain('/api/edge/desired_state');
                expect(text).not.toContain('/api/edge/material');
                expect(text).not.toContain('certificate/material');
                expect(text).not.toContain("action: 'edit-destination'");
                expect(text).not.toContain("action: 'edit-nginx'");
                expect(text).not.toContain("name: 'proxy_target'");
                expect(text).not.toContain("name: 'nginx'");
            }
        });
    });
};
