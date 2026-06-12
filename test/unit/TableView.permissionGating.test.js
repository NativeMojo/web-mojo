/**
 * ITEM-020 regression tests — TableView permission gating + row context menus.
 *
 * Two bugs:
 *  (A) checkPermissions() existed only as a `return true` stub on ListView,
 *      so toolbar buttons with a `permissions` key rendered for everyone.
 *      The real implementation now lives on View and delegates fail-closed
 *      to getApp().activeUser.hasPermission().
 *  (B) Nothing read `rowContextMenu`, and TableRow's contextMenu items were
 *      static — no per-item `permissions`, no per-row `visible(model)`, no
 *      callback `action(model, app)`. All three are now supported, and
 *      `rowContextMenu` is accepted as an alias for `contextMenu` on both
 *      TableView and TablePage.
 *
 * TableRow builds its template in the constructor, so the app is resolved
 * via View.getApp()'s window.__app__ fallback — tests install a stub there.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;

  await testHelpers.setup();

  const View = loadModule('View');
  const ListView = loadModule('ListView');
  const TableRow = loadModule('TableRow');
  const TableView = loadModule('TableView');
  const TablePage = loadModule('TablePage');
  const Collection = loadModule('Collection');

  const appWithPerms = (held) => ({
    showPage: () => {},
    activeUser: { hasPermission: (p) => (Array.isArray(p) ? p : [p]).some(x => held.includes(x)) }
  });

  describe('View.checkPermissions (fail-closed)', () => {
    const check = (ctx, perms) => View.prototype.checkPermissions.call(ctx, perms);

    it('returns true when no permissions are given', () => {
      expect(check({ getApp: () => null }, null)).toBe(true);
      expect(check({ getApp: () => null }, undefined)).toBe(true);
    });

    it('returns true when the active user holds the permission', () => {
      const ctx = { getApp: () => appWithPerms(['manage_games']) };
      expect(check(ctx, ['manage_games'])).toBe(true);
      expect(check(ctx, 'manage_games')).toBe(true);
    });

    it('returns false when the active user lacks the permission', () => {
      const ctx = { getApp: () => appWithPerms(['view_games']) };
      expect(check(ctx, ['manage_games'])).toBe(false);
    });

    it('fails closed with no app or no active user', () => {
      expect(check({ getApp: () => null }, ['manage_games'])).toBe(false);
      expect(check({ getApp: () => ({ showPage: () => {} }) }, ['manage_games'])).toBe(false);
    });
  });

  describe('ListView toolbar button gating', () => {
    function buildToolbar(toolbarButtons, app) {
      const ctx = Object.create(ListView.prototype);
      ctx.options = {};
      ctx.showRefresh = false;
      ctx.toolbarButtons = toolbarButtons;
      ctx.getApp = () => app;
      return ListView.prototype.buildActionButtonsTemplate.call(ctx);
    }

    const gated = { label: 'Sync Catalog', action: 'sync-catalog', permissions: ['manage_games'] };
    const ungated = { label: 'Open Thing', action: 'open-thing' };

    it('hides a gated button from a user lacking the permission', () => {
      const html = buildToolbar([gated, ungated], appWithPerms(['view_games']));
      expect(html).not.toContain('sync-catalog');
      expect(html).toContain('open-thing');
    });

    it('shows a gated button to a user holding the permission', () => {
      const html = buildToolbar([gated], appWithPerms(['manage_games']));
      expect(html).toContain('sync-catalog');
    });

    it('fails closed: gated button hidden when there is no active user', () => {
      const html = buildToolbar([gated, ungated], null);
      expect(html).not.toContain('sync-catalog');
      expect(html).toContain('open-thing');
    });
  });

  describe('TableRow context menu (permissions / visible / callback actions)', () => {
    let app;

    beforeEach(() => {
      app = appWithPerms(['manage_privacy']);
      global.window.__app__ = app;
    });

    afterEach(() => {
      delete global.window.__app__;
    });

    function makeRow(contextMenu, modelData = { id: 7, status: 'open' }) {
      const model = {
        id: modelData.id,
        get(key) { return modelData[key]; }
      };
      return new TableRow({
        model,
        tableView: { isSelectable: () => false, rowAction: null },
        columns: [{ key: 'id', label: 'ID' }],
        contextMenu
      });
    }

    it('filters items by permissions (fail-closed) and keeps permitted ones', async () => {
      const row = makeRow([
        { label: 'Approve Closure', action: 'approve', permissions: ['manage_privacy'] },
        { label: 'Force Close', action: 'force-close', permissions: ['sys.manage_groups'] },
        { label: 'View Details', action: 'view' }
      ]);
      await row.render(false);

      const actions = Array.from(row.element.querySelectorAll('.dropdown-menu a'))
        .map(a => a.getAttribute('data-action'));
      expect(actions).toContain('approve');
      expect(actions).toContain('view');
      expect(actions).not.toContain('force-close');
      await row.destroy();
    });

    it('evaluates visible(model) per row and hides falsy items', async () => {
      const seen = [];
      const row = makeRow([
        { label: 'Reopen', action: 'reopen', visible: (m) => { seen.push(m.get('status')); return m.get('status') === 'closed'; } },
        { label: 'Close', action: 'close', visible: (m) => m.get('status') === 'open' }
      ]);
      await row.render(false);

      const actions = Array.from(row.element.querySelectorAll('.dropdown-menu a'))
        .map(a => a.getAttribute('data-action'));
      expect(actions).not.toContain('reopen');
      expect(actions).toContain('close');
      expect(seen).toEqual(['open']); // visible() received this row's model
      await row.destroy();
    });

    it('hides an item whose visible() throws, without breaking the row', async () => {
      const row = makeRow([
        { label: 'Broken', action: 'broken', visible: () => { throw new Error('boom'); } },
        { label: 'Fine', action: 'fine' }
      ]);
      await row.render(false);

      const actions = Array.from(row.element.querySelectorAll('.dropdown-menu a'))
        .map(a => a.getAttribute('data-action'));
      expect(actions).not.toContain('broken');
      expect(actions).toContain('fine');
      await row.destroy();
    });

    it('dispatches callback actions with (model, app), using the original item index', async () => {
      const calls = [];
      const row = makeRow([
        { label: 'Hidden', action: 'hidden-action', permissions: ['sys.manage_groups'] },
        { label: 'Approve', icon: 'bi-person-x', action: async (model, theApp) => calls.push([model, theApp]) }
      ]);
      await row.render(false);

      const anchor = row.element.querySelector('[data-action="row-context-menu-item"]');
      expect(anchor).toBeDefined();
      // Original index 1 even though item 0 was filtered out.
      expect(anchor.getAttribute('data-menu-index')).toBe('1');

      await row.onActionRowContextMenuItem({ stopPropagation: () => {} }, anchor);
      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toBe(row.model);
      expect(calls[0][1]).toBe(app);
      await row.destroy();
    });

    it('still renders static items, dividers, and danger styling unchanged', async () => {
      const row = makeRow([
        { label: 'Edit', icon: 'bi-pencil', action: 'edit' },
        { divider: true },
        { label: 'Delete', action: 'delete' }
      ]);
      await row.render(false);

      const edit = row.element.querySelector('[data-action="edit"]');
      expect(edit).toBeDefined();
      expect(edit.getAttribute('data-id')).toBe('7');
      expect(row.element.querySelector('hr.dropdown-divider')).toBeDefined();
      expect(row.element.querySelector('[data-action="delete"]').className).toContain('text-danger');
      await row.destroy();
    });

    it('escapes label/icon/action strings flowing into menu HTML', async () => {
      const row = makeRow([
        { label: '<img src=x onerror=alert(1)>', icon: 'bi-x" onmouseover="x', action: 'edit" data-evil="1' }
      ]);
      await row.render(false);

      expect(row.element.querySelector('img')).toBeNull();
      const anchor = row.element.querySelector('.dropdown-menu a');
      expect(anchor.textContent).toContain('<img src=x onerror=alert(1)>');
      expect(anchor.getAttribute('data-evil')).toBeNull();
      await row.destroy();
    });

    it('renders no menu toggle at all when every actionable item is filtered out', async () => {
      const row = makeRow([
        { label: 'A', action: 'a', permissions: ['sys.manage_groups'] },
        { divider: true },
        { label: 'B', action: 'b', visible: () => false }
      ]);
      await row.render(false);

      expect(row.element.querySelector('[data-bs-toggle="dropdown"]')).toBeNull();
      await row.destroy();
    });
  });

  describe('rowContextMenu alias', () => {
    const items = [{ label: 'Approve', action: 'approve' }];

    it('TableView accepts rowContextMenu as an alias for contextMenu', () => {
      const tv = new TableView({
        collection: new Collection([]),
        columns: [{ key: 'id', label: 'ID' }],
        rowContextMenu: items
      });
      expect(tv.contextMenu).toBe(items);
    });

    it('explicit contextMenu wins over rowContextMenu', () => {
      const explicit = [{ label: 'X', action: 'x' }];
      const tv = new TableView({
        collection: new Collection([]),
        columns: [{ key: 'id', label: 'ID' }],
        contextMenu: explicit,
        rowContextMenu: items
      });
      expect(tv.contextMenu).toBe(explicit);
    });

    it('TablePage forwards rowContextMenu into tableViewConfig.contextMenu', () => {
      const page = new TablePage({
        pageName: 'fixture',
        collection: new Collection([]),
        columns: [{ key: 'id', label: 'ID' }],
        rowContextMenu: items
      });
      expect(page.tableViewConfig.contextMenu).toBe(items);
    });
  });
};
