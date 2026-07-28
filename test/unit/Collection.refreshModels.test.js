/**
 * Collection.refreshModels() — in-place batched model refresh (#297)
 *
 * The data seam behind `autoRefresh: { mode: 'models' }`. It must:
 *   - issue ONE `id__in` request per chunk under the current params,
 *     overriding start/size so a "Show more"-grown list isn't truncated;
 *   - merge into the EXISTING model instances (no add/remove/reset, same
 *     object identity) and never touch meta / params / lastFetchTime;
 *   - report only genuinely-changed keys — an object field that re-serializes
 *     identically is NOT a change (otherwise every tick flashes every row);
 *   - leave ids the server didn't return untouched;
 *   - no-op when REST is disabled or there's nothing to refresh.
 */

module.exports = async function (testContext) {
  const { describe, it, expect } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();
  const jest = global.jest;

  const Collection = loadModule('Collection');

  // A REST-ish collection whose transport is a spy. `rows` is the fixture the
  // fake server answers with (filtered to the requested id__in set).
  function fixture(rows, { serverRows = null } = {}) {
    const collection = new Collection(rows.map((r) => ({ ...r })));
    collection.endpoint = '/api/thing';
    collection.restEnabled = true;
    collection.params = { start: 0, size: 10 };
    collection.meta = { count: 99, start: 0, size: 10, status: 'ok' };
    collection.lastFetchTime = 12345;

    const answers = serverRows || rows;
    collection.rest = {
      GET: jest.fn(async (_url, params) => {
        const wanted = String(params.id__in).split(',');
        return {
          success: true,
          data: {
            status: 'ok',
            count: 999,
            size: 1,
            start: 77,
            data: answers.filter((r) => wanted.includes(String(r.id)))
          }
        };
      })
    };
    return collection;
  }

  describe('#297 refreshModels — request shape', () => {
    it('issues one id__in request with start=0 and size=ids.length', async () => {
      const collection = fixture([{ id: 1, status: 'ok' }, { id: 2, status: 'ok' }]);
      // Simulate a "Show more": more models than params.size.
      collection.params = { start: 20, size: 1 };

      await collection.refreshModels([1, 2]);

      expect(collection.rest.GET).toHaveBeenCalledTimes(1);
      const [url, params] = collection.rest.GET.mock.calls[0];
      expect(url).toBe('/api/thing');
      expect(params.id__in).toBe('1,2');
      expect(params.start).toBe(0);
      expect(params.size).toBe(2);
    });

    it('preserves the collection filters / sort / graph on the request', async () => {
      const collection = fixture([{ id: 1, status: 'ok' }]);
      collection.params = { start: 0, size: 10, sort: '-created', status: 'error', graph: 'detail' };

      await collection.refreshModels([1]);

      const params = collection.rest.GET.mock.calls[0][1];
      expect(params.sort).toBe('-created');
      expect(params.status).toBe('error');
      expect(params.graph).toBe('detail');
    });

    it('chunks past chunkSize and merges every chunk', async () => {
      const rows = [];
      for (let i = 1; i <= 250; i++) rows.push({ id: i, status: 'ok' });
      const updated = rows.map((r) => ({ ...r, status: 'error' }));
      const collection = fixture(rows, { serverRows: updated });

      const result = await collection.refreshModels(rows.map((r) => r.id));

      expect(collection.rest.GET).toHaveBeenCalledTimes(2);
      const sizes = collection.rest.GET.mock.calls.map((c) => c[1].size);
      expect(sizes).toEqual([200, 50]);
      expect(result.changed.size).toBe(250);
      expect(collection.get(1).get('status')).toBe('error');
      expect(collection.get(250).get('status')).toBe('error');
    });
  });

  describe('#297 refreshModels — in-place merge', () => {
    it('mutates the existing instances and emits no add/remove/reset', async () => {
      const collection = fixture(
        [{ id: 1, status: 'ok' }, { id: 2, status: 'ok' }],
        { serverRows: [{ id: 1, status: 'error' }, { id: 2, status: 'ok' }] }
      );
      const before = collection.models.slice();
      const events = [];
      ['add', 'remove', 'reset', 'update', 'fetch:start', 'fetch:end'].forEach((name) => {
        collection.on(name, () => events.push(name));
      });

      const result = await collection.refreshModels([1, 2]);

      // Same instances, same order — no rebuild.
      expect(collection.models[0]).toBe(before[0]);
      expect(collection.models[1]).toBe(before[1]);
      expect(collection.models.length).toBe(2);
      expect(events).toEqual([]);

      expect(before[0].get('status')).toBe('error');
      expect(before[1].get('status')).toBe('ok');
      expect(result.changed.get(1)).toEqual(['status']);
      expect(result.changed.has(2)).toBe(false);
      expect(result.ok).toBe(true);
    });

    it('leaves ids the server did not return untouched and reports them missing', async () => {
      const collection = fixture(
        [{ id: 1, status: 'ok' }, { id: 2, status: 'ok' }],
        { serverRows: [{ id: 1, status: 'error' }] } // id 2 filtered out server-side
      );

      const result = await collection.refreshModels([1, 2]);

      expect(collection.get(2)).toBeDefined();
      expect(collection.get(2).get('status')).toBe('ok');
      expect(result.missing).toEqual(['2']);
    });

    it('never mutates meta, params, or lastFetchTime', async () => {
      const collection = fixture(
        [{ id: 1, status: 'ok' }],
        { serverRows: [{ id: 1, status: 'error' }] }
      );
      const meta = { ...collection.meta };
      const params = { ...collection.params };

      await collection.refreshModels([1]);

      // parse() would have rewritten meta from the response's count/size/start.
      expect(collection.meta).toEqual(meta);
      expect(collection.params).toEqual(params);
      expect(collection.lastFetchTime).toBe(12345);
    });
  });

  describe('#297 refreshModels — change detection', () => {
    it('an object field that re-serializes identically is NOT a change', async () => {
      // Key order differs (a model touched by an earlier merge/inline edit can
      // legitimately diverge) but the content is the same — must not "change",
      // or every tick would flash every row forever.
      const collection = fixture(
        [{ id: 1, status: 'ok', metadata: { a: 1, b: 2 }, tags: ['x', 'y'] }],
        { serverRows: [{ id: 1, status: 'ok', metadata: { b: 2, a: 1 }, tags: ['x', 'y'] }] }
      );

      const result = await collection.refreshModels([1]);

      expect(result.ok).toBe(true);
      expect(result.changed.size).toBe(0);
    });

    it('reports only the keys that genuinely differ', async () => {
      const collection = fixture(
        [{ id: 1, status: 'ok', count: 3, metadata: { a: 1 } }],
        { serverRows: [{ id: 1, status: 'error', count: 3, metadata: { a: 2 } }] }
      );

      const result = await collection.refreshModels([1]);

      expect(result.changed.get(1)).toEqual(['status', 'metadata']);
      expect(collection.get(1).get('count')).toBe(3);
      expect(collection.get(1).get('metadata')).toEqual({ a: 2 });
    });
  });

  describe('#297 refreshModels — no-op cases', () => {
    it('does nothing when REST is disabled, when there is no endpoint, or with no usable ids', async () => {
      const disabled = fixture([{ id: 1 }]);
      disabled.restEnabled = false;
      expect((await disabled.refreshModels([1])).ok).toBe(false);
      expect(disabled.rest.GET).not.toHaveBeenCalled();

      const noEndpoint = fixture([{ id: 1 }]);
      noEndpoint.endpoint = '';
      expect((await noEndpoint.refreshModels([1])).ok).toBe(false);
      expect(noEndpoint.rest.GET).not.toHaveBeenCalled();

      const empty = fixture([{ id: 1 }]);
      expect((await empty.refreshModels([])).ok).toBe(false);
      // Unusable ids (null / comma-bearing) are skipped — here that leaves none.
      expect((await empty.refreshModels([null, undefined, 'a,b'])).ok).toBe(false);
      expect(empty.rest.GET).not.toHaveBeenCalled();
    });
  });
};
