/**
 * ListView / TableView — `searchPlacement` resolution and render paths
 *
 * `searchPlacement: 'dropdown'` was documented on ListView, TableView and
 * TablePage for a long time with NO renderer behind it. The old gate was
 * `searchable && searchPlacement === 'toolbar'`, i.e. fail-CLOSED: any value
 * other than the single implemented one silently removed the search input,
 * with no console signal. `'dropdown'` was the visible instance; a typo like
 * `'Toolbar'` had exactly the same effect.
 *
 * This file pins the resolved contract:
 *
 *   1. absent  → 'toolbar'  (today's default, unchanged)
 *   2. 'toolbar' → the input-group, and NO dropdown toggle
 *   3. 'dropdown' → an icon-only toggle carrying data-bs-auto-close="outside",
 *      with the same input inside the menu
 *   4. 'dropdown' renders exactly ONE [data-filter="search"] input
 *   5. an unrecognized value falls back to 'toolbar' AND warns  ← the root-cause
 *      regression; fails on clean HEAD, where it rendered no search at all
 *   6. searchable: false wins over either placement
 *   7. updateSearchInputs() reaches the input through the dropdown
 *   8. the collapsed toggle reflects an active search term
 *   9. TableView inherits the resolution rather than re-deriving it
 */

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();
  const jest = global.jest;

  const Collection = loadModule('Collection');
  const ListView = loadModule('ListView');
  const TableView = loadModule('TableView');

  const COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'level', label: 'Level' }
  ];

  function seeded(n = 3) {
    const rows = [];
    for (let i = 1; i <= n; i++) rows.push({ id: i, name: `Row ${i}`, level: i });
    return new Collection(rows);
  }

  let host;
  let warnSpy;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    if (host && host.parentNode) host.parentNode.removeChild(host);
    if (warnSpy) warnSpy.mockRestore();
  });

  // Every case needs a rendered toolbar; `searchable` is what turns it on.
  async function mount(options = {}) {
    const tv = new TableView({
      collection: seeded(3),
      columns: COLUMNS,
      searchable: true,
      ...options
    });
    await tv.render(true, host);
    return tv;
  }

  const searchInputs = (tv) => tv.element.querySelectorAll('[data-filter="search"]');
  const searchToggle = (tv) => tv.element.querySelector('button[data-bs-toggle="dropdown"][aria-label="Search"]');

  // --------------------------------------------------------------
  // Resolution
  // --------------------------------------------------------------
  describe('searchPlacement — resolution', () => {
    it('defaults to toolbar when the option is absent', async () => {
      const tv = await mount();
      expect(tv.searchPlacement).toBe('toolbar');
      expect(searchInputs(tv).length).toBe(1);
      expect(searchToggle(tv)).toBeNull();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('passes through the two implemented values unchanged', async () => {
      const toolbar = await mount({ searchPlacement: 'toolbar' });
      expect(toolbar.searchPlacement).toBe('toolbar');

      const dropdown = await mount({ searchPlacement: 'dropdown' });
      expect(dropdown.searchPlacement).toBe('dropdown');

      expect(warnSpy).not.toHaveBeenCalled();
    });

    // THE REGRESSION. Before this change the gate was `=== 'toolbar'`, so an
    // unrecognized value rendered NO search input and said nothing about it.
    it('falls back to toolbar and warns on an unrecognized value', async () => {
      const tv = await mount({ searchPlacement: 'Toolbar' });

      expect(tv.searchPlacement).toBe('toolbar');
      // Fail-safe: search survives a bad option value.
      expect(searchInputs(tv).length).toBe(1);
      expect(searchToggle(tv)).toBeNull();

      expect(warnSpy).toHaveBeenCalled();
      const msg = warnSpy.mock.calls[0][0];
      expect(msg).toContain('searchPlacement');
      expect(msg).toContain('toolbar');
      expect(msg).toContain('dropdown');
    });

    it('treats an empty string as absent, without warning', async () => {
      const tv = await mount({ searchPlacement: '' });
      expect(tv.searchPlacement).toBe('toolbar');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('TableView inherits ListView resolution instead of re-deriving it', async () => {
      // TableView used to carry its own `options.searchPlacement || 'toolbar'`,
      // which overwrote the normalized value and bypassed the warning.
      const tv = await mount({ searchPlacement: 'nope' });
      expect(tv.searchPlacement).toBe('toolbar');
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------
  // Render paths
  // --------------------------------------------------------------
  describe('searchPlacement — render', () => {
    it("'toolbar' renders the input-group and no dropdown toggle", async () => {
      const tv = await mount({ searchPlacement: 'toolbar' });

      expect(tv.element.querySelectorAll('.input-group input[type="search"]').length).toBe(1);
      expect(searchToggle(tv)).toBeNull();
    });

    it("'dropdown' renders an icon-only toggle with the input inside the menu", async () => {
      const tv = await mount({ searchPlacement: 'dropdown' });

      const toggle = searchToggle(tv);
      expect(toggle).not.toBeNull();
      // Icon-only: a magnifier and no text label.
      expect(toggle.querySelector('i.bi-search')).not.toBeNull();
      expect(toggle.textContent.trim()).toBe('');

      const menu = toggle.parentElement.querySelector('.dropdown-menu');
      expect(menu).not.toBeNull();
      expect(menu.querySelector('input[type="search"][data-filter="search"]')).not.toBeNull();
    });

    // Load-bearing: without auto-close="outside" Bootstrap shuts the menu on
    // the first click inside, which makes the input impossible to type into.
    it("'dropdown' toggle sets data-bs-auto-close=outside", async () => {
      const tv = await mount({ searchPlacement: 'dropdown' });
      expect(searchToggle(tv).getAttribute('data-bs-auto-close')).toBe('outside');
    });

    it("'dropdown' renders exactly one search input", async () => {
      // Two inputs would make updateSearchInputs() ambiguous and could desync
      // the toolbar and menu copies.
      const tv = await mount({ searchPlacement: 'dropdown' });
      expect(searchInputs(tv).length).toBe(1);
    });

    it('searchable: false renders no search in either placement', async () => {
      const toolbar = await mount({ searchable: false, searchPlacement: 'toolbar' });
      expect(searchInputs(toolbar).length).toBe(0);

      const dropdown = await mount({ searchable: false, searchPlacement: 'dropdown' });
      expect(searchInputs(dropdown).length).toBe(0);
      expect(searchToggle(dropdown)).toBeNull();
    });
  });

  // --------------------------------------------------------------
  // Shared handler path
  // --------------------------------------------------------------
  describe('searchPlacement — shared handlers', () => {
    it('updateSearchInputs() reaches the input through the dropdown', async () => {
      const tv = await mount({ searchPlacement: 'dropdown' });

      tv.updateSearchInputs('hello');
      expect(searchInputs(tv)[0].value).toBe('hello');

      tv.updateSearchInputs('');
      expect(searchInputs(tv)[0].value).toBe('');
    });

    it('the dropdown input carries the same delegated action hooks as the toolbar one', async () => {
      const toolbar = await mount({ searchPlacement: 'toolbar' });
      const dropdown = await mount({ searchPlacement: 'dropdown' });

      const attrs = (el) => ({
        filter: el.getAttribute('data-filter'),
        change: el.getAttribute('data-change-action')
      });
      expect(attrs(searchInputs(dropdown)[0])).toEqual(attrs(searchInputs(toolbar)[0]));
    });

    it('the collapsed toggle reflects an active search term', async () => {
      // A collapsed control would otherwise hide an applied search completely.
      const tv = await mount({ searchPlacement: 'dropdown' });
      expect(searchToggle(tv).classList.contains('active')).toBe(false);

      tv.setFilter('search', 'boom');
      await tv.render();

      expect(searchToggle(tv).classList.contains('active')).toBe(true);
    });
  });
};
