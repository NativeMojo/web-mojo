/**
 * ListView `stats:` — live stat strip (WM-037 / #300)
 *
 * An opt-in inset track of KPI blocks above the toolbar. Each block shows a
 * count computed SERVER-SIDE under the table's current filters (one batched
 * `_mode=count` + `_stats` request against the same list endpoint), and
 * clicking one applies its param bundle through the WM-032 preset rails.
 *
 * The load-bearing facts pinned here:
 *   - the aggregation response is FLAT (`resp.data.{count, stats}`), NOT
 *     `resp.data.data` — reading it wrong yields a permanently degraded strip
 *   - base params exclude the ACTIVE stat's own keys, mirroring BOTH branches
 *     of `setFilter()` (plain triple AND the `dr_*` daterange triple), so a
 *     chip's count equals the row count you get after clicking it
 *   - the seed count comes from `onAfterMount()`, so a view that reaches the
 *     DOM later than the debounce window still gets its counts
 *   - `params-changed` also fires for page / page-size / sort, which cannot
 *     change a count — a signature memo suppresses those requests
 *   - an old server answers 200 with no `stats` key (it does not error), so
 *     the "unsupported" latch is what stops an endless full-page pull
 *
 * There are no fake timers in this harness; the debounce is shortened
 * per-instance (`_statsDebounceMs`) instead.
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

  const DEBOUNCE = 5;
  const settle = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

  const STATS = [
    { key: 'open', label: 'Open', params: { status: 'open' } },
    { key: 'high', label: 'High priority', params: { priority: 'high' }, critical: true },
    { key: 'stale', label: 'Stale > 24h', params: { age__gte: 24 } }
  ];

  /**
   * A REST-backed collection whose `rest.GET` answers the DM-051 aggregation
   * contract. `rest` is an INSTANCE property on Collection, so stubbing it is
   * per-collection — nothing global to leak into a later test file.
   */
  function statsCollection(stats = { open: 12, high: 3, stale: 5 }, total = 40) {
    const collection = new Collection([{ id: 1, name: 'A' }]);
    collection.endpoint = '/api/incidents';
    collection.restEnabled = true;
    collection.lastFetchTime = Date.now();     // suppress the onAfterMount fetch
    collection.fetch = jest.fn(async () => ({ success: true, data: { status: 'ok' } }));
    collection.rest = {
      GET: jest.fn(async () => ({
        success: true,
        status: 200,
        // FLAT — the count path returns JsonResponse(body), never
        // response.success(data), so there is no `.data.data` nesting.
        data: { count: total, stats: { ...stats }, took_ms: 3 }
      }))
    };
    return collection;
  }

  async function makeView(stats = STATS, collection = null, extra = {}) {
    const c = collection || statsCollection();
    const view = new ListView({
      collection: c,
      itemTemplate: '<div>{{model.name}}</div>',
      stats,
      ...extra
    });
    view._statsDebounceMs = DEBOUNCE;   // before render — onAfterMount seeds
    await view.render(true, host);
    await settle();
    return { view, collection: c };
  }

  function blocks(view) {
    return Array.from(view.element.querySelectorAll('.mojo-stat-block'));
  }

  function countText(view, key) {
    const el = view.element.querySelector(`.mojo-stat-block[data-stat-key="${key}"] .mojo-stat-block__count`);
    return el ? el.textContent.trim() : null;
  }

  let host;
  let warnSpy;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    if (warnSpy) warnSpy.mockRestore();
    if (host && host.parentNode) host.parentNode.removeChild(host);
  });

  // --------------------------------------------------------------
  describe('ListView stats — rendering', () => {
    it('renders one block per stat with an apply-stat data-action', async () => {
      const { view } = await makeView();

      expect(view.element.querySelector('.mojo-stat-strip')).not.toBeNull();
      const all = blocks(view);
      expect(all.length).toBe(3);

      const buttons = view.element.querySelectorAll('[data-action="apply-stat"]');
      expect(buttons.length).toBe(3);
      expect(Array.from(buttons).map((b) => b.getAttribute('data-stat-key')))
        .toEqual(['open', 'high', 'stale']);
      expect(view.element.innerHTML).toContain('High priority');
    });

    it('enables the toolbar even when stats are the only feature', async () => {
      const { view } = await makeView();
      expect(view._isToolbarEnabled()).toBe(true);
      expect(view.element.innerHTML).toContain('table-action-buttons');
    });

    it('no stats option → no strip, no style, no request (opt-in guarantee)', async () => {
      const collection = statsCollection();
      const view = new ListView({ collection, itemTemplate: '<div>{{model.name}}</div>' });
      view._statsDebounceMs = DEBOUNCE;
      await view.render(true, host);
      await settle();

      expect(view.stats).toEqual([]);
      expect(view.element.querySelector('.mojo-stat-strip')).toBeNull();
      expect(view.element.querySelector('[data-container="stat-strip"]')).toBeNull();
      expect(view.element.innerHTML).not.toContain('mojo-stat-block');
      expect(collection.rest.GET).not.toHaveBeenCalled();
    });

    it('paints the fetched counts into each block', async () => {
      const { view } = await makeView();
      expect(countText(view, 'open')).toBe('12');
      expect(countText(view, 'high')).toBe('3');
      expect(countText(view, 'stale')).toBe('5');
    });

    it('renders exactly one danger dot, on the critical stat only', async () => {
      const { view } = await makeView();
      expect(view.element.querySelectorAll('.mojo-stat-dot').length).toBe(1);
      const critical = view.element.querySelector('.mojo-stat-block[data-stat-key="high"]');
      expect(critical.querySelector('.mojo-stat-dot')).not.toBeNull();
    });

    it('suppresses the dot when the critical count is 0 or unknown', async () => {
      const zero = await makeView(STATS, statsCollection({ open: 12, high: 0, stale: 5 }));
      expect(zero.view.element.querySelectorAll('.mojo-stat-dot').length).toBe(0);
      // 0 is information — it renders as `0`, not an em-dash.
      expect(countText(zero.view, 'high')).toBe('0');

      const unknown = await makeView(STATS, statsCollection({ open: 12, high: null, stale: 5 }));
      expect(unknown.view.element.querySelectorAll('.mojo-stat-dot').length).toBe(0);
    });
  });

  // --------------------------------------------------------------
  describe('ListView stats — the count request', () => {
    it('carries _mode=count and the _stats bundle map', async () => {
      const { view, collection } = await makeView();
      expect(collection.rest.GET).toHaveBeenCalledTimes(1);

      const [url, params] = collection.rest.GET.mock.calls[0];
      expect(url).toBe('/api/incidents');
      expect(params._mode).toBe('count');
      expect(JSON.parse(params._stats)).toEqual({
        open: { status: 'open' },
        high: { priority: 'high' },
        stale: { age__gte: 24 }
      });
      expect(view._statsSupported).toBe(true);
    });

    it('drops start / size / sort and targets buildUrl()', async () => {
      const collection = statsCollection();
      collection.params = { start: 20, size: 25, sort: '-created', team: 'ops' };
      const { } = await makeView(STATS, collection);

      const [url, params] = collection.rest.GET.mock.calls[0];
      expect(url).toBe(collection.buildUrl());
      expect(params.start).toBeUndefined();
      expect(params.sort).toBeUndefined();
      expect(params.size).toBe(1);        // insurance for a pre-aggregation server
      expect(params.team).toBe('ops');
    });

    it('base params exclude the ACTIVE stat\'s own keys', async () => {
      const collection = statsCollection();
      collection.params = { status: 'open', team: 'ops' };   // "open" is active
      const { view } = await makeView(STATS, collection);

      expect(view.getActiveStat()?.key).toBe('open');
      const [, params] = collection.rest.GET.mock.calls[0];
      // Leaving `status=open` in the base would advertise `open AND high`
      // for a click on "high" that actually yields `high` alone.
      expect(params.status).toBeUndefined();
      expect(params.team).toBe('ops');
    });

    it('a bundle keyed on a registered daterange filter excludes the dr_* triple', async () => {
      const collection = statsCollection();
      collection.params = {
        dr_field: 'created', dr_start: '2026-01-01', dr_end: '2026-01-31', team: 'ops'
      };
      const dateStats = [
        { key: 'window', label: 'This month', params: { created: { start: '2026-01-01', end: '2026-01-31' } } },
        { key: 'high', label: 'High', params: { priority: 'high' } }
      ];
      const { view } = await makeView(dateStats, collection, {
        filters: [{ name: 'created', label: 'Created', type: 'daterange' }]
      });

      expect(view.getActiveStat()?.key).toBe('window');
      const [, params] = collection.rest.GET.mock.calls[0];
      // `_clearPresetParams` goes through setFilter, which takes the DATERANGE
      // branch for this key — so the base exclusion has to mirror that branch
      // or the count and the post-click row count disagree.
      expect(params.dr_start).toBeUndefined();
      expect(params.dr_end).toBeUndefined();
      expect(params.dr_field).toBeUndefined();
      expect(params.team).toBe('ops');
    });

    it('resolves the `@me` token inside the bundle map', async () => {
      const collection = statsCollection({ mine: 4 });
      const { view } = await makeView([{ key: 'mine', label: 'Mine', params: { owner: '@me' } }], collection);
      view.getApp = () => ({ activeUser: { id: 77 } });

      collection.rest.GET.mockClear();
      view.collection.params.team = 'ops';    // move the signature
      await view._fetchStatCounts();

      const [, params] = collection.rest.GET.mock.calls[0];
      expect(JSON.parse(params._stats)).toEqual({ mine: { owner: 77 } });
    });

    it('debounce collapses a burst of params-changed into one request', async () => {
      const { view, collection } = await makeView();
      collection.rest.GET.mockClear();

      for (let i = 0; i < 5; i++) {
        view.collection.params.team = `ops-${i}`;
        view.emit('params-changed');
      }
      await settle();

      expect(collection.rest.GET).toHaveBeenCalledTimes(1);
    });

    it('changing page / page size / sort does not re-issue the count request', async () => {
      const { view, collection } = await makeView();
      expect(collection.rest.GET).toHaveBeenCalledTimes(1);

      // What onActionPage / onChangePageSize / onActionSortOption (and
      // TableView's column-header sort) actually mutate — all stripped from
      // the base params, so the request would be byte-identical.
      view.collection.params.start = 25;
      view.emit('params-changed');
      await settle();
      view.collection.params.size = 50;
      view.emit('params-changed');
      await settle();
      view.collection.params.sort = '-created';
      view.emit('params-changed');
      await settle();

      expect(collection.rest.GET).toHaveBeenCalledTimes(1);

      // A real filter change still goes through.
      view.collection.params.team = 'ops';
      view.emit('params-changed');
      await settle();
      expect(collection.rest.GET).toHaveBeenCalledTimes(2);
    });

    it('a superseded response cannot overwrite newer counts', async () => {
      const collection = statsCollection();
      const pending = [];
      collection.rest.GET = jest.fn(() => new Promise((resolve) => pending.push(resolve)));

      const { view } = await makeView(STATS, collection);
      expect(pending.length).toBe(1);          // the seed, still in flight

      view.collection.params.team = 'ops';     // new signature → generation 2
      view._fetchStatCounts();                 // fire-and-forget — it can't settle yet
      await settle(5);
      expect(pending.length).toBe(2);

      const ok = (n) => ({ success: true, status: 200, data: { count: n, stats: { open: n, high: 1, stale: 1 } } });
      pending[1](ok(5));                        // newest lands first
      await settle(10);
      expect(countText(view, 'open')).toBe('5');

      pending[0](ok(99));                       // stale response arrives late
      await settle(10);
      expect(countText(view, 'open')).toBe('5');
      expect(view._statCounts.open).toBe(5);
    });

    it('a view that reaches the DOM later than the debounce window still seeds', async () => {
      const detached = document.createElement('div');    // deliberately not in the document
      const collection = statsCollection();
      const view = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        stats: STATS
      });
      view._statsDebounceMs = DEBOUNCE;

      await view.render(true, detached);
      await settle();
      // The tick's isMounted() guard correctly self-terminated — nothing to
      // count into yet.
      expect(collection.rest.GET).not.toHaveBeenCalled();

      // The container joins the document late; the framework re-mounts, which
      // fires onAfterMount again. (A seed scheduled from onInit runs once,
      // pre-mount, and would have latched the strip at em-dashes here.)
      document.body.appendChild(detached);
      await view.onAfterMount();
      await settle();

      expect(collection.rest.GET).toHaveBeenCalledTimes(1);
      expect(countText(view, 'open')).toBe('12');

      detached.remove();
    });
  });

  // --------------------------------------------------------------
  describe('ListView stats — degradation', () => {
    it('a 200 with no stats key degrades every chip AND latches off', async () => {
      const collection = statsCollection();
      // Exactly what a pre-aggregation server returns: `_mode` / `_stats` are
      // unknown filter keys, silently dropped, so it answers a normal list page.
      collection.rest.GET = jest.fn(async () => ({
        success: true, status: 200, data: { status: true, size: 1, data: [{ id: 1 }] }
      }));

      const { view } = await makeView(STATS, collection);
      expect(view._statsSupported).toBe(false);
      expect(blocks(view).length).toBe(3);
      expect(view.element.querySelectorAll('.mojo-stat-block--degraded').length).toBe(3);
      expect(view.element.querySelectorAll('[data-action="apply-stat"]').length).toBe(0);
      expect(countText(view, 'open')).toBe('—');

      // Latched: a further filter change issues no second request.
      view.collection.params.team = 'ops';
      view.emit('params-changed');
      await settle();
      expect(collection.rest.GET).toHaveBeenCalledTimes(1);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('a null bundle value degrades only that chip', async () => {
      const { view } = await makeView(STATS, statsCollection({ open: 12, high: 3, stale: null }));

      expect(view._statsSupported).toBe(true);
      expect(view.element.querySelectorAll('.mojo-stat-block--degraded').length).toBe(1);
      expect(countText(view, 'stale')).toBe('—');
      expect(countText(view, 'open')).toBe('12');
    });

    it('an HTTP error degrades, warns at most once, and does NOT latch', async () => {
      const collection = statsCollection();
      collection.rest.GET = jest.fn(async () => ({ success: false, status: 500, data: {} }));

      const { view } = await makeView(STATS, collection);
      expect(view.element.querySelectorAll('.mojo-stat-block--degraded').length).toBe(3);
      expect(view._statsSupported).toBe(true);         // retryable, not latched
      expect(warnSpy).toHaveBeenCalledTimes(1);

      view.collection.params.team = 'ops';
      view.emit('params-changed');
      await settle();
      expect(collection.rest.GET).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledTimes(1);        // still just the one
    });

    it('a 404 latches the feature off silently', async () => {
      const collection = statsCollection();
      collection.rest.GET = jest.fn(async () => ({ success: false, status: 404, data: {} }));

      const { view } = await makeView(STATS, collection);
      expect(view._statsSupported).toBe(false);
      expect(view.element.querySelectorAll('.mojo-stat-block--degraded').length).toBe(3);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('a non-REST collection renders label-only chips and issues no request', async () => {
      const collection = statsCollection();
      collection.restEnabled = false;

      const { view } = await makeView(STATS, collection);
      expect(collection.rest.GET).not.toHaveBeenCalled();
      expect(view.element.querySelectorAll('.mojo-stat-block--degraded').length).toBe(3);
      expect(view.element.innerHTML).toContain('Stale &gt; 24h');
    });
  });

  // --------------------------------------------------------------
  describe('ListView stats — normalization', () => {
    it('caps the bundle list at STATS_MAX_BUNDLES with a warning', async () => {
      const many = Array.from({ length: 15 }, (_, i) => ({
        key: `s${i}`, label: `S${i}`, params: { n: i }
      }));
      const view = new ListView({ collection: new Collection([]), stats: many });
      expect(ListView.STATS_MAX_BUNDLES).toBe(12);
      expect(view.stats.length).toBe(12);
      expect(warnSpy).toHaveBeenCalledTimes(3);
    });

    it('warns and drops duplicate keys', async () => {
      const view = new ListView({
        collection: new Collection([]),
        stats: [
          { key: 'open', label: 'Open', params: { status: 'open' } },
          { key: 'open', label: 'Open again', params: { status: 'other' } }
        ]
      });
      expect(view.stats.length).toBe(1);
      expect(view.stats[0].label).toBe('Open');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('keeps only the first `critical` flag and warns on the second', async () => {
      const view = new ListView({
        collection: new Collection([]),
        stats: [
          { key: 'a', label: 'A', params: { x: 1 }, critical: true },
          { key: 'b', label: 'B', params: { x: 2 }, critical: true }
        ]
      });
      expect(view.stats[0].critical).toBe(true);
      expect(view.stats[1].critical).toBe(false);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('drops entries with no key and defaults label / params', async () => {
      const view = new ListView({
        collection: new Collection([]),
        stats: [{ label: 'No key' }, { key: 'bare' }]
      });
      expect(view.stats.length).toBe(1);
      expect(view.stats[0]).toEqual({
        key: 'bare', label: 'bare', params: {}, critical: false, description: null
      });
    });
  });

  // --------------------------------------------------------------
  describe('ListView stats — clicking', () => {
    it('applies the bundle through setFilter + applyFilters', async () => {
      const { view, collection } = await makeView();
      collection.fetch.mockClear();

      await view.applyStat('high');

      expect(collection.params.priority).toBe('high');
      expect(collection.params.start).toBe(0);
      expect(collection.fetch).toHaveBeenCalled();
      expect(view.getActiveStat()?.key).toBe('high');

      const active = view.element.querySelector('.mojo-stat-block.is-active');
      expect(active.getAttribute('data-stat-key')).toBe('high');
      expect(active.getAttribute('aria-pressed')).toBe('true');
    });

    it('mutual exclusion: a second stat clears the first one\'s params', async () => {
      const { view } = await makeView();
      await view.applyStat('open');
      expect(view.collection.params.status).toBe('open');

      await view.applyStat('stale');
      expect(view.collection.params.status).toBeUndefined();
      expect(view.collection.params.age__gte).toBe(24);
      expect(view.getActiveStat()?.key).toBe('stale');
    });

    it('clicking the active stat toggles it off', async () => {
      const { view } = await makeView();
      await view.applyStat('high');
      expect(view.getActiveStat()?.key).toBe('high');

      await view.applyStat('high');
      expect(view.collection.params.priority).toBeUndefined();
      expect(view.getActiveStat()).toBeNull();
      expect(view.element.querySelector('.mojo-stat-block.is-active')).toBeNull();
    });

    it('the data-action handler routes through applyStat', async () => {
      const { view } = await makeView();
      const button = view.element.querySelector('[data-stat-key="open"]');
      await view.onActionApplyStat({ preventDefault: () => {} }, button);
      expect(view.collection.params.status).toBe('open');
    });

    it('active state is derived — editing a param de-highlights the chip', async () => {
      const { view } = await makeView();
      await view.applyStat('open');
      expect(view.element.querySelector('.mojo-stat-block.is-active')).not.toBeNull();

      view.setFilter('status', 'closed');    // manual pill edit
      view.renderStatStrip();

      expect(view.getActiveStat()).toBeNull();
      expect(view.element.querySelector('.mojo-stat-block.is-active')).toBeNull();
    });

    it('an empty bundle is the "All" chip: active when nothing else is, clears on click', async () => {
      const withAll = [{ key: 'all', label: 'All', params: {} }, ...STATS];
      const { view } = await makeView(withAll, statsCollection({ all: 40, open: 12, high: 3, stale: 5 }));

      // Nothing applied → the All chip is the active one.
      let active = view.element.querySelector('.mojo-stat-block.is-active');
      expect(active.getAttribute('data-stat-key')).toBe('all');
      expect(view.getActiveStat()).toBeNull();
      // Its count is the response's top-level total.
      expect(countText(view, 'all')).toBe('40');

      await view.applyStat('open');
      active = view.element.querySelector('.mojo-stat-block.is-active');
      expect(active.getAttribute('data-stat-key')).toBe('open');

      await view.applyStat('all');           // back to All
      expect(view.collection.params.status).toBeUndefined();
      active = view.element.querySelector('.mojo-stat-block.is-active');
      expect(active.getAttribute('data-stat-key')).toBe('all');
    });

    it('emits stat:change on apply and on clear, and returns false for an unknown key', async () => {
      const { view } = await makeView();
      const seen = [];
      view.on('stat:change', (payload) => seen.push(payload));

      expect(await view.applyStat('nope')).toBe(false);
      expect(seen.length).toBe(0);

      await view.applyStat('high');
      expect(seen[0]).toEqual({ key: 'high', params: { priority: 'high' } });

      await view.clearStat();
      expect(seen[1]).toBeNull();
    });

    it('a plain stat click needs no recount — the base params are invariant', async () => {
      // Because the ACTIVE bundle is excluded from the base params, switching
      // between stats leaves the base exactly as it was: same counts, same
      // signature, no request. The memo turns that into zero server COUNTs.
      const { view, collection } = await makeView();
      collection.rest.GET.mockClear();

      await view.applyStat('high');
      await settle();
      await view.applyStat('stale');
      await settle();

      expect(collection.rest.GET).not.toHaveBeenCalled();
      expect(countText(view, 'open')).toBe('12');
    });

    it('a click that displaces a manual filter DOES recount', async () => {
      const collection = statsCollection();
      collection.params = { status: 'closed' };     // manual filter, no stat active
      const { view } = await makeView(STATS, collection);
      expect(view.getActiveStat()).toBeNull();
      collection.rest.GET.mockClear();

      await view.applyStat('open');                 // overwrites status=closed
      await settle();

      expect(collection.rest.GET).toHaveBeenCalledTimes(1);
      const [, params] = collection.rest.GET.mock.calls[0];
      expect(params.status).toBeUndefined();        // the active bundle is excluded
    });
  });

  // --------------------------------------------------------------
  describe('ListView stats — composition + teardown', () => {
    it('renderStatStrip repaints only its own container', async () => {
      const { view } = await makeView();
      const toolbar = view.element.querySelector('.table-action-buttons');
      const pills = view.element.querySelector('[data-container="filter-pills"]');

      view._statCounts = { open: 99, high: 1, stale: 1 };
      view.renderStatStrip();

      expect(view.element.querySelector('.table-action-buttons')).toBe(toolbar);
      expect(view.element.querySelector('[data-container="filter-pills"]')).toBe(pills);
      expect(countText(view, 'open')).toBe('99');
    });

    it('TableView inherits the strip and emits its style exactly once', async () => {
      const collection = statsCollection();
      const tv = new TableView({
        collection,
        columns: [{ key: 'name', label: 'Name' }],
        stats: STATS
      });
      tv._statsDebounceMs = DEBOUNCE;
      await tv.render(true, host);
      await settle();

      const html = tv.element.innerHTML;
      expect(tv.element.querySelectorAll('.mojo-stat-strip').length).toBe(1);
      let occurrences = 0;
      let idx = 0;
      while ((idx = html.indexOf('.mojo-stat-strip {', idx)) !== -1) { occurrences++; idx += 1; }
      expect(occurrences).toBe(1);
      expect(countText(tv, 'open')).toBe('12');

      await tv.destroy();
    });

    it('teardown cancels the pending recount', async () => {
      const { view, collection } = await makeView();
      collection.rest.GET.mockClear();

      view.collection.params.team = 'ops';
      view.emit('params-changed');
      expect(view._statsTimer).not.toBeNull();

      await view.onBeforeUnmount();
      expect(view._statsTimer).toBeNull();

      await settle();
      expect(collection.rest.GET).not.toHaveBeenCalled();
    });

    it('an auto-refresh tick recounts even though the params did not change', async () => {
      const collection = statsCollection();
      const view = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        stats: STATS,
        autoRefresh: 10
      });
      view._statsDebounceMs = DEBOUNCE;
      await view.render(true, host);
      await settle();
      expect(collection.rest.GET).toHaveBeenCalledTimes(1);

      view._autoRefreshTick();       // same params — the memo must be bypassed
      await settle();

      expect(collection.rest.GET).toHaveBeenCalledTimes(2);
      await view.destroy();
    });
  });
};
