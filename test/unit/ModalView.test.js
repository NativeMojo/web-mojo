/**
 * ModalView.buildContextMenu escaping (WM-031)
 *
 * The modal header kebab renders dev-supplied item strings
 * (label/icon/href/target/action + custom data-* values) into HTML. These
 * pin that every field is HTML-escaped so a future caller feeding model data
 * into a menu item can't inject markup.
 *
 * buildContextMenu delegates filtering to filterContextMenuItems(); we stub
 * that to return the items verbatim and exercise the HTML-building path
 * directly on an Object.create(ModalView.prototype) instance (skips the heavy
 * constructor — same pattern as the DetailView-based view tests).
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    const ModalView = loadModule('ModalView');

    function menuWith(items, extraConfig = {}) {
        const inst = Object.create(ModalView.prototype);
        inst.contextMenu = { items, ...extraConfig };
        inst.closeButton = false;
        inst.filterContextMenuItems = async () => items;
        return inst;
    }

    describe('ModalView.buildContextMenu escaping (WM-031)', () => {
        it('escapes a malicious action-item label so markup renders inert', async () => {
            const html = await menuWith([
                { label: '<img src=x onerror=alert(1)>', action: 'open' }
            ]).buildContextMenu();
            expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
            expect(html).not.toContain('<img');
        });

        it('escapes href/target on link items (no attribute breakout)', async () => {
            const html = await menuWith([
                { label: 'Open', href: '/x"><img src=y onerror=alert(1)>', target: '_blank" onmouseover="evil()' }
            ]).buildContextMenu();
            expect(html).not.toContain('"><img');
            expect(html).not.toContain('onmouseover="evil()');
        });

        it('escapes custom data-* attribute values', async () => {
            const html = await menuWith([
                { label: 'Go', action: 'go', 'data-id': '"><img src=x onerror=alert(1)>' }
            ]).buildContextMenu();
            expect(html).not.toContain('"><img');
            expect(html).toContain('data-id="&quot;&gt;&lt;img');
        });

        it('leaves a clean action item unescaped (no behavior change)', async () => {
            const html = await menuWith([
                { label: 'Edit', action: 'edit', icon: 'bi-pencil' }
            ]).buildContextMenu();
            expect(html).toContain('data-action="edit"');
            expect(html).toContain('<i class="bi-pencil me-2"></i>Edit');
            expect(html).not.toContain('&');
        });

        it('escapes the trigger icon and button class from menu config', async () => {
            const html = await menuWith(
                [{ label: 'Edit', action: 'edit' }],
                { icon: 'x"><img src=y onerror=alert(1)>', buttonClass: 'btn"><script>bad()</script>' }
            ).buildContextMenu();
            expect(html).not.toContain('"><img');
            expect(html).not.toContain('"><script>');
        });
    });
};
