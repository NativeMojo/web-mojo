/**
 * ListView filterPresets — WM-032
 *
 * Covers the compact joined btn-group preset segment: rendering, placement
 * branching (≤4 inline vs 5+ scrollable row), apply/toggle-off/mutual
 * exclusion, derived active state (strict param matching + manual-edit
 * deactivation), `'@me'` token resolution, and the opt-in guarantee
 * (no config → no markup).
 */

module.exports = async function (testContext) {
  const { describe, it, expect } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();

  const Collection = loadModule('Collection');
  const ListView = loadModule('ListView');

  // A REST-backed collection with a fetch spy so applyFilters() exercises
  // the refetch path (start reset + fetch) like a real page.
  function makeRestCollection(seed = [{ id: 1, name: 'A' }]) {
    const c = new Collection(seed);
    c.restEnabled = true;
    c.lastFetchTime = Date.now();
    c.fetch = jest.fn(async () => ({ success: true, data: { status: 'ok' } }));
    return c;
  }

  const FOUR_PRESETS = [
    { key: 'errors-24h', label: 'Errors 24h', icon: 'bi-exclamation-triangle', params: { level__gte: 4, created__gte: '1d' } },
    { key: 'auth', label: 'Auth', params: { path__icontains: '/auth' } },
    { key: 'api-errors', label: 'API errors', params: { path__icontains: '/api', level__gte: 4 } },
    { key: 'mine', label: 'Mine', icon: 'bi-person', params: { owner: '@me' } }
  ];

  const SIX_PRESETS = [
    ...FOUR_PRESETS,
    { key: 'webhooks', label: 'Webhooks', params: { path__icontains: '/webhooks' } },
    { key: 'rate-limited', label: 'Rate-limited', params: { status: 429 } }
  ];

  // Subset-shadowing case: `errors` params ⊂ `auth` params, and `errors`
  // comes FIRST in the array. Applying `auth` makes BOTH match, so a naive
  // first-match-wins would wrongly return `errors`.
  const SHADOW_PRESETS = [
    { key: 'errors', label: 'Errors', params: { level__gte: 4 } },
    { key: 'auth', label: 'Auth', params: { path__icontains: '/auth', level__gte: 4 } }
  ];

  // Two presets with identical resolved params → a match tie.
  const TIE_PRESETS = [
    { key: 'first', label: 'First', params: { level__gte: 4 } },
    { key: 'second', label: 'Second', params: { level__gte: 4 } }
  ];

  async function makeView(presets, collection) {
    const c = collection || makeRestCollection();
    const listView = new ListView({
      collection: c,
      itemTemplate: '<div>{{model.name}}</div>',
      filterPresets: presets
    });
    await listView.render();
    return { listView, collection: c };
  }

  // --------------------------------------------------------------
  describe('ListView filterPresets — rendering', () => {
    it('renders one segment button per preset with apply-preset data-action', async () => {
      const { listView } = await makeView(FOUR_PRESETS);

      const segment = listView.element.querySelector('.preset-segment');
      expect(segment).not.toBeNull();

      const buttons = listView.element.querySelectorAll('[data-action="apply-preset"]');
      expect(buttons.length).toBe(4);

      const keys = Array.from(buttons).map((b) => b.getAttribute('data-preset-key'));
      expect(keys).toEqual(['errors-24h', 'auth', 'api-errors', 'mine']);

      // Labels + icon markup carried through.
      expect(listView.element.innerHTML).toContain('Errors 24h');
      expect(listView.element.innerHTML).toContain('bi-exclamation-triangle');
    });

    it('enables the toolbar even when presets are the only feature', async () => {
      const { listView } = await makeView(FOUR_PRESETS);
      expect(listView._isToolbarEnabled()).toBe(true);
      expect(listView.element.innerHTML).toContain('table-action-buttons');
    });

    it('no filterPresets → no preset markup, no toolbar (opt-in guarantee)', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>'
      });
      await listView.render();

      expect(listView.filterPresets).toEqual([]);
      expect(listView.element.querySelector('.preset-segment')).toBeNull();
      expect(listView.element.querySelector('[data-container="filter-presets"]')).toBeNull();
      expect(listView.element.innerHTML).not.toContain('preset-segment');
      expect(listView.element.innerHTML).not.toContain('table-action-buttons');
    });
  });

  // --------------------------------------------------------------
  describe('ListView filterPresets — placement branching', () => {
    it('≤4 presets render inline (no scroll row)', async () => {
      const { listView } = await makeView(FOUR_PRESETS);
      expect(listView._presetsInline()).toBe(true);

      const slot = listView.element.querySelector('.preset-segment-slot[data-container="filter-presets"]');
      expect(slot).not.toBeNull();
      expect(listView.element.querySelector('.preset-scroll')).toBeNull();
    });

    it('5+ presets render on their own scrollable row above the filter pills', async () => {
      const { listView } = await makeView(SIX_PRESETS);
      expect(listView._presetsInline()).toBe(false);

      const row = listView.element.querySelector('.preset-scroll[data-container="filter-presets"]');
      expect(row).not.toBeNull();
      expect(listView.element.querySelector('.preset-segment-slot')).toBeNull();

      // Preset row must come BEFORE the filter-pills container in DOM order.
      const pills = listView.element.querySelector('[data-container="filter-pills"]');
      expect(pills).not.toBeNull();
      const pos = row.compareDocumentPosition(pills);
      // DOCUMENT_POSITION_FOLLOWING (4) — pills follow the preset row.
      expect(pos & 4).toBe(4);
    });
  });

  // --------------------------------------------------------------
  describe('ListView filterPresets — apply / active state', () => {
    it('applying a preset sets all params, resets start, and refetches', async () => {
      const { listView, collection } = await makeView(FOUR_PRESETS);
      collection.params.start = 50;
      collection.fetch.mockClear();

      await listView.applyPreset('errors-24h');

      expect(collection.params.level__gte).toBe(4);
      expect(collection.params.created__gte).toBe('1d');
      expect(collection.params.start).toBe(0);
      expect(collection.fetch).toHaveBeenCalled();
    });

    it('active preset button is btn-primary + aria-pressed when its params match', async () => {
      const { listView } = await makeView(FOUR_PRESETS);
      await listView.applyPreset('errors-24h');

      expect(listView.getActivePreset()?.key).toBe('errors-24h');

      const btn = listView.element.querySelector('[data-preset-key="errors-24h"]');
      expect(btn.classList.contains('btn-primary')).toBe(true);
      expect(btn.getAttribute('aria-pressed')).toBe('true');

      const other = listView.element.querySelector('[data-preset-key="auth"]');
      expect(other.classList.contains('btn-outline-secondary')).toBe(true);
      expect(other.getAttribute('aria-pressed')).toBe('false');
    });

    it('emits preset:change with { key, params } on apply', async () => {
      const { listView } = await makeView(FOUR_PRESETS);
      const captured = [];
      listView.on('preset:change', (p) => captured.push(p));

      await listView.applyPreset('auth');

      expect(captured).toHaveLength(1);
      expect(captured[0]).toEqual({ key: 'auth', params: { path__icontains: '/auth' } });
    });

    it('applyPreset returns false for an unknown key', async () => {
      const { listView } = await makeView(FOUR_PRESETS);
      const result = await listView.applyPreset('does-not-exist');
      expect(result).toBe(false);
    });
  });

  // --------------------------------------------------------------
  describe('ListView filterPresets — toggle-off / mutual exclusion', () => {
    it('re-clicking the active preset toggles it off (clears its params)', async () => {
      const { listView, collection } = await makeView(FOUR_PRESETS);
      const captured = [];
      listView.on('preset:change', (p) => captured.push(p));

      await listView.applyPreset('errors-24h');
      expect(listView.getActivePreset()?.key).toBe('errors-24h');

      await listView.applyPreset('errors-24h'); // toggle off

      expect(collection.params.level__gte).toBeUndefined();
      expect(collection.params.created__gte).toBeUndefined();
      expect(listView.getActivePreset()).toBeNull();
      // Second emit is the clear (null).
      expect(captured[captured.length - 1]).toBeNull();
    });

    it('applying a new preset clears the previously-active one (mutual exclusion)', async () => {
      const { listView, collection } = await makeView(FOUR_PRESETS);

      await listView.applyPreset('errors-24h');
      expect(collection.params.level__gte).toBe(4);
      expect(collection.params.created__gte).toBe('1d');

      await listView.applyPreset('auth');

      // errors-24h's params are gone; auth's are applied.
      expect(collection.params.level__gte).toBeUndefined();
      expect(collection.params.created__gte).toBeUndefined();
      expect(collection.params.path__icontains).toBe('/auth');
      expect(listView.getActivePreset()?.key).toBe('auth');
    });
  });

  // --------------------------------------------------------------
  describe('ListView filterPresets — derived deactivation', () => {
    it('a manual filter edit that breaks a param deactivates the preset', async () => {
      const { listView } = await makeView(FOUR_PRESETS);
      await listView.applyPreset('errors-24h');
      expect(listView.getActivePreset()?.key).toBe('errors-24h');

      // Simulate the user editing the level filter to a different value.
      listView.setFilter('level__gte', 9);
      await listView.render();

      expect(listView.getActivePreset()).toBeNull();
      const btn = listView.element.querySelector('[data-preset-key="errors-24h"]');
      expect(btn.classList.contains('btn-primary')).toBe(false);
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });

    it('removing one of a preset\'s params (pill removal) deactivates the chip', async () => {
      const { listView } = await makeView(FOUR_PRESETS);
      await listView.applyPreset('errors-24h');
      expect(listView.getActivePreset()?.key).toBe('errors-24h');

      listView.setFilter('created__gte', null); // one param gone → partial, not active
      expect(listView.getActivePreset()).toBeNull();
    });
  });

  // --------------------------------------------------------------
  describe('ListView filterPresets — @me token', () => {
    it('resolves @me to the active user id at apply and match time', async () => {
      const { listView, collection } = await makeView(FOUR_PRESETS);
      listView.app = { activeUser: { id: 42 } };

      await listView.applyPreset('mine');

      expect(collection.params.owner).toBe(42);
      expect(listView.getActivePreset()?.key).toBe('mine');

      const btn = listView.element.querySelector('[data-preset-key="mine"]');
      expect(btn.classList.contains('btn-primary')).toBe(true);
    });

    it('skips the @me param when no active user can be resolved', async () => {
      const { listView, collection } = await makeView(FOUR_PRESETS);
      // No app / activeUser set (jsdom window has no MOJO app).

      const captured = [];
      listView.on('preset:change', (p) => captured.push(p));
      await listView.applyPreset('mine');

      expect(collection.params.owner).toBeUndefined();
      // Nothing resolved → the preset never registers as active.
      expect(listView.getActivePreset()).toBeNull();
      expect(captured[0]).toEqual({ key: 'mine', params: {} });
    });
  });

  // --------------------------------------------------------------
  describe('ListView filterPresets — most-specific-match-wins (subset shadowing)', () => {
    it('applying the superset preset marks IT active, not the subset that also matches', async () => {
      const { listView, collection } = await makeView(SHADOW_PRESETS);

      await listView.applyPreset('auth');

      // Both presets' params are satisfied, but `auth` (2 keys) must win over
      // `errors` (1 key) even though `errors` is earlier in the array.
      expect(collection.params.path__icontains).toBe('/auth');
      expect(collection.params.level__gte).toBe(4);
      expect(listView.getActivePreset()?.key).toBe('auth');
    });

    it('applying the subset preset marks IT active (superset does not match)', async () => {
      const { listView, collection } = await makeView(SHADOW_PRESETS);

      await listView.applyPreset('errors');

      // Only `level__gte` is set → `auth` (which also needs `path__icontains`)
      // cannot match, so the subset is unambiguously active.
      expect(collection.params.level__gte).toBe(4);
      expect(collection.params.path__icontains).toBeUndefined();
      expect(listView.getActivePreset()?.key).toBe('errors');
    });

    it('clicking the subset chip while the superset is applied switches to the subset (not toggle-off)', async () => {
      const { listView, collection } = await makeView(SHADOW_PRESETS);

      await listView.applyPreset('auth');
      expect(listView.getActivePreset()?.key).toBe('auth');

      // Clicking `errors` must read as a switch (mutual exclusion clears the
      // superset's extra key), NOT a toggle-off that only drops the shared key.
      await listView.applyPreset('errors');

      expect(listView.getActivePreset()?.key).toBe('errors');
      expect(collection.params.level__gte).toBe(4);
      expect(collection.params.path__icontains).toBeUndefined();
    });

    it('ties (equal resolved param counts) resolve to the first matching preset', async () => {
      const { listView } = await makeView(TIE_PRESETS);

      await listView.applyPreset('second');

      // Both match with one key each → the earlier preset wins the tie.
      expect(listView.getActivePreset()?.key).toBe('first');
    });
  });

  // --------------------------------------------------------------
  describe('ListView filterPresets — normalization', () => {
    it('drops entries without a key and warns-and-drops duplicate keys', async () => {
      const { listView } = await makeView([
        { key: 'a', label: 'A', params: { x: 1 } },
        { label: 'No key', params: { y: 2 } },
        { key: 'a', label: 'Dup', params: { z: 3 } }
      ]);
      expect(listView.filterPresets.map((p) => p.key)).toEqual(['a']);
    });
  });
};
