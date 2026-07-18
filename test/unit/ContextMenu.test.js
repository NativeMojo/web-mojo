/**
 * ContextMenu Unit Tests
 *
 * Focused coverage for the right-click helpers:
 *   - openAt(x, y, contextItem)
 *   - ContextMenu.attachToRightClick(element, getContextItem, options)
 *   - detachRightClick()
 *
 * The Bootstrap Dropdown class is not available in jsdom, so we install a
 * minimal stub on `window.bootstrap.Dropdown` that records show() calls.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    await testHelpers.setup();
    const ContextMenu = loadModule('ContextMenu');

    // --- Bootstrap Dropdown stub ----------------------------------------
    let shownTriggers;
    let createdInstances;
    let originalBootstrap;

    function installBootstrapStub() {
        shownTriggers = [];
        createdInstances = new Map();
        const stub = {
            Dropdown: {
                getOrCreateInstance(el) {
                    if (!createdInstances.has(el)) {
                        createdInstances.set(el, {
                            show: () => { shownTriggers.push(el); },
                            hide: () => {}
                        });
                    }
                    return createdInstances.get(el);
                },
                getInstance(el) {
                    return createdInstances.get(el) || null;
                }
            }
        };
        originalBootstrap = window.bootstrap;
        window.bootstrap = stub;
    }

    function restoreBootstrapStub() {
        if (typeof originalBootstrap === 'undefined') {
            delete window.bootstrap;
        } else {
            window.bootstrap = originalBootstrap;
        }
    }

    function makeMenu(extra = {}) {
        return new ContextMenu({
            config: {
                items: [
                    { label: 'Edit',   action: 'edit',   icon: 'bi-pencil' },
                    { label: 'Delete', action: 'delete', icon: 'bi-trash', danger: true }
                ]
            },
            ...extra
        });
    }

    describe('ContextMenu.openAt', () => {
        beforeEach(() => { installBootstrapStub(); });
        afterEach(()  => { restoreBootstrapStub(); });

        it('renders the menu, positions the dropdown at (x, y), and shows it', async () => {
            const menu = makeMenu();
            await menu.openAt(123, 456);

            const menuEl = document.body.querySelector(`[aria-labelledby="context-menu-${menu.id}"]`);
            expect(menuEl).toBeDefined();
            expect(menuEl.parentElement).toBe(document.body);
            expect(menuEl.style.position).toBe('fixed');
            expect(menuEl.style.left).toBe('123px');
            expect(menuEl.style.top).toBe('456px');
            expect(menuEl.classList.contains('show')).toBe(true);

            menu.element.remove();
            menuEl.remove();
        });

        it('updates menu.context with the contextItem argument', async () => {
            const menu = makeMenu({ context: { initial: true } });
            const row = { id: 'apollo', name: 'Project Apollo' };

            await menu.openAt(10, 20, row);

            expect(menu.context).toBe(row);
        });

        it('leaves menu.context unchanged when contextItem is omitted', async () => {
            const initial = { id: 'keep-me' };
            const menu = makeMenu({ context: initial });

            await menu.openAt(5, 5);

            expect(menu.context).toBe(initial);
        });

        it('appends to document.body when the menu has no parent or container', async () => {
            const menu = makeMenu();

            await menu.openAt(50, 60);

            expect(menu.element.isConnected).toBe(true);
            expect(document.body.contains(menu.element)).toBe(true);

            // cleanup so the body isn't polluted across tests
            menu.element.remove();
        });

        it('does not throw when window.bootstrap is missing', async () => {
            restoreBootstrapStub();
            window.bootstrap = undefined;

            const menu = makeMenu();
            let threw = false;
            try {
                await menu.openAt(1, 2);
            } catch (e) {
                threw = true;
            }
            expect(threw).toBe(false);
            installBootstrapStub();
        });
    });

    describe('ContextMenu.attachToRightClick', () => {
        beforeEach(() => { installBootstrapStub(); });
        afterEach(()  => { restoreBootstrapStub(); });

        it('wires a contextmenu listener that prevents default and opens the menu at the cursor', async () => {
            const host = document.createElement('div');
            document.body.appendChild(host);

            const row = { id: 'borealis' };
            const menu = ContextMenu.attachToRightClick(host, () => row, {
                config: { items: [{ label: 'Edit', action: 'edit' }] }
            });

            expect(menu).toBeInstanceOf(ContextMenu);

            // Wrap openAt so we can await the underlying promise it creates.
            let openPromise = null;
            const originalOpenAt = menu.openAt.bind(menu);
            menu.openAt = (...args) => {
                openPromise = originalOpenAt(...args);
                return openPromise;
            };

            // Synthesize a right-click event with viewport coords.
            let prevented = false;
            const event = new window.MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: 200,
                clientY: 300
            });
            const origPreventDefault = event.preventDefault.bind(event);
            event.preventDefault = () => { prevented = true; origPreventDefault(); };

            host.dispatchEvent(event);

            expect(prevented).toBe(true);
            expect(menu.context).toBe(row);

            await openPromise;

            const menuEl = document.body.querySelector(`[aria-labelledby="context-menu-${menu.id}"]`);
            expect(menuEl.style.left).toBe('200px');
            expect(menuEl.style.top).toBe('300px');
            expect(menuEl.classList.contains('show')).toBe(true);

            host.remove();
            if (menu.element.parentNode) menu.element.remove();
            if (menuEl.parentNode) menuEl.remove();
        });

        it('reuses a pre-built ContextMenu when passed via { menu }', () => {
            const host = document.createElement('div');
            document.body.appendChild(host);

            const existing = makeMenu();
            const returned = ContextMenu.attachToRightClick(host, () => ({ id: 'x' }), { menu: existing });

            expect(returned).toBe(existing);
            host.remove();
        });

        it('throws when called without an element', () => {
            let threw = null;
            try {
                ContextMenu.attachToRightClick(null, () => ({}));
            } catch (e) {
                threw = e;
            }
            expect(threw).toBeInstanceOf(Error);
            expect(threw.message).toContain('element is required');
        });

        it('detachRightClick removes the contextmenu listener', () => {
            const host = document.createElement('div');
            document.body.appendChild(host);

            let openCalls = 0;
            const menu = ContextMenu.attachToRightClick(host, () => null, {
                config: { items: [{ label: 'X', action: 'x' }] }
            });
            // Wrap openAt to count invocations.
            const originalOpenAt = menu.openAt.bind(menu);
            menu.openAt = (...args) => { openCalls++; return originalOpenAt(...args); };

            menu.detachRightClick();

            const event = new window.MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: 1,
                clientY: 1
            });
            host.dispatchEvent(event);

            expect(openCalls).toBe(0);
            host.remove();
        });
    });

    // ── WM-027: item gating (`permissions` fail-closed + `when(context)`) ──
    //
    // Before WM-027 the DetailView kebab path rendered every configured item
    // — `permissions` keys were only honored by ModalView's own header
    // filter, which DetailViews opened with `header: false` never hit.
    describe('ContextMenu item gating (WM-027)', () => {
        function gatedMenu(items, { app = null, context } = {}) {
            const menu = new ContextMenu({ config: { items }, context });
            menu.getApp = () => app;
            return menu;
        }

        const adminApp = {
            activeUser: {
                hasPermission: (perms) =>
                    (Array.isArray(perms) ? perms : [perms]).includes('manage_users')
            }
        };

        it('permissions are fail-closed: gated items hidden when no active user resolves', async () => {
            const menu = gatedMenu([
                { label: 'Edit', action: 'edit', permissions: ['manage_users'] },
                { label: 'Open', action: 'open' }
            ]);
            const html = await menu.renderTemplate();
            expect(html).not.toContain('data-item-action="edit"');
            expect(html).toContain('data-item-action="open"');
        });

        it('permissions show the item when the active user holds any listed permission', async () => {
            const menu = gatedMenu(
                [{ label: 'Edit', action: 'edit', permissions: ['users', 'manage_users'] }],
                { app: adminApp }
            );
            const html = await menu.renderTemplate();
            expect(html).toContain('data-item-action="edit"');
        });

        it('when(context) hides items and re-evaluates on each render', async () => {
            const record = { flag: true };
            const menu = gatedMenu(
                [{ label: 'Flag', action: 'flag', when: (c) => !!c.flag }],
                { context: record }
            );
            expect(await menu.renderTemplate()).toContain('data-item-action="flag"');
            record.flag = false;
            expect(await menu.renderTemplate()).not.toContain('data-item-action="flag"');
        });

        it('dividers collapse when their group is fully filtered out', async () => {
            const menu = gatedMenu([
                { label: 'A', action: 'a' },
                { type: 'divider' },
                { label: 'B', action: 'b', permissions: ['manage_users'] }
            ]);
            const html = await menu.renderTemplate();
            expect(html).toContain('data-item-action="a"');
            expect(html).not.toContain('dropdown-divider');
        });

        it('renders nothing when every item is filtered out', async () => {
            const menu = gatedMenu([
                { label: 'B', action: 'b', permissions: ['manage_users'] }
            ]);
            expect(await menu.renderTemplate()).toBe('');
        });

        it('filtered-out items cannot be dispatched through onActionMenuItemClick', async () => {
            let handled = 0;
            const menu = gatedMenu([
                { label: 'B', action: 'b', permissions: ['manage_users'], handler: () => { handled += 1; } }
            ]);
            const anchor = document.createElement('a');
            anchor.setAttribute('data-item-action', 'b');
            await menu.onActionMenuItemClick(new window.Event('click', { cancelable: true }), anchor);
            expect(handled).toBe(0);
        });
    });

    // ── WM-031: buildMenuItemHTML escapes dev-supplied item strings ──
    describe('buildMenuItemHTML escaping (WM-031)', () => {
        const menu = () => new ContextMenu({ config: { items: [] } });

        it('escapes a malicious label so injected markup renders inert', () => {
            const html = menu().buildMenuItemHTML({
                label: '<img src=x onerror=alert(1)>', action: 'open'
            });
            expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
            expect(html).not.toContain('<img');
            expect(html).not.toContain('onerror=alert(1)>');
        });

        it('escapes href/target/icon on link items (no attribute breakout)', () => {
            const html = menu().buildMenuItemHTML({
                label: 'Open',
                icon: 'bi-box"><script>bad()</script>',
                href: '/x"><img src=y onerror=alert(1)>',
                target: '_blank" onmouseover="evil()'
            });
            expect(html).not.toContain('"><img');
            expect(html).not.toContain('"><script>');
            expect(html).not.toContain('onmouseover="evil()');
            expect(html).toContain('&quot;');
        });

        it('escapes the action attribute but keeps dispatch matching intact', () => {
            const html = menu().buildMenuItemHTML({ label: 'X', action: 'a"b' });
            expect(html).toContain('data-item-action="a&quot;b"');
            // getAttribute() decodes entities, so the handler still matches item.action.
        });

        it('leaves clean static-label items unescaped (no behavior change)', () => {
            const html = menu().buildMenuItemHTML({ label: 'Edit', action: 'edit', icon: 'bi-pencil' });
            expect(html).toContain('data-item-action="edit"');
            expect(html).toContain('<i class="bi-pencil me-2"></i>Edit');
            expect(html).not.toContain('&');
        });

        it('escapes the trigger icon and button class from menu config', async () => {
            const m = new ContextMenu({ config: {
                icon: 'x"><img src=y onerror=alert(1)>',
                buttonClass: 'btn"><script>bad()</script>',
                items: [{ label: 'Edit', action: 'edit' }]
            } });
            const html = await m.renderTemplate();
            expect(html).not.toContain('"><img');
            expect(html).not.toContain('"><script>');
        });
    });
};
