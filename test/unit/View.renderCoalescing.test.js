/**
 * View render coalescing — regression for the "stranded loading visual" bug.
 *
 * View.render() runs one pass at a time; a second render() requested while a
 * pass is in flight used to be dropped outright by the canRender() guard,
 * leaving the view stuck on whatever state the in-flight pass captured.
 *
 * This bit fire-and-forget re-renders that race — most visibly a collection
 * that emits `fetch:start` then `fetch:end` synchronously (both handlers call
 * `this.render()`), or those events arriving while the initial mount render is
 * still running (a rest-enabled collection sets `loading = true` at init, so
 * the first render paints the loading visual and the dropped re-renders never
 * clear it → a forever-spinner / forever-skeleton).
 *
 * The fix coalesces: a render requested mid-flight is remembered (latest args
 * only) and run exactly once after the current pass completes.
 */

module.exports = async function (testContext) {
  const { describe, it, expect } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();

  const View = loadModule('View');
  const Collection = loadModule('Collection');
  const TableView = loadModule('TableView');

  // --------------------------------------------------------------
  describe('View.render() coalescing — a mid-flight render() is queued, not dropped', () => {
    it('runs exactly ONE trailing render when render() is called during an in-flight pass', async () => {
      let renderCount = 0;
      let releaseGate;

      class GatedView extends View {
        async onBeforeRender() { if (this._gate) await this._gate; }
        async renderTemplate() { renderCount++; return '<div>x</div>'; }
      }

      const view = new GatedView({ template: '<div>x</div>' });
      document.body.appendChild(view.element); // connected → mount() is skipped

      view._gate = new Promise((r) => { releaseGate = r; });
      const p1 = view.render();  // suspends at onBeforeRender (gate pending); isRendering = true
      view._gate = null;         // the queued pass won't gate
      view.render();             // isRendering → coalesced (queued), NOT dropped
      view.render();             // collapses into the same single queue slot
      releaseGate();             // let the in-flight pass finish
      await p1;                  // awaits the pass AND its one trailing drained render

      // Initial pass + exactly one trailing render — the two extra requests
      // collapse to one, so this is 2 (not 1 = dropped, not 3 = a storm).
      expect(renderCount).toBe(2);

      view.element.remove();
    });

    it('adds NO trailing render when nothing is requested mid-flight', async () => {
      let renderCount = 0;
      class ProbeView extends View {
        async renderTemplate() { renderCount++; return '<div>x</div>'; }
      }
      const view = new ProbeView({ template: '<div>x</div>' });
      document.body.appendChild(view.element);

      await view.render();
      expect(renderCount).toBe(1);
      expect(view._renderQueued).toBe(false);

      view.element.remove();
    });
  });

  // --------------------------------------------------------------
  describe('sync fetch:start/end no longer strands the loading visual', () => {
    it('a TableView whose collection emits fetch:start/end synchronously ends loaded + not loading', async () => {
      const host = document.createElement('div');
      document.body.appendChild(host);

      const ROWS = [
        { id: 1, name: 'Alpha', level: 1 },
        { id: 2, name: 'Beta', level: 2 },
        { id: 3, name: 'Gamma', level: 3 }
      ];

      // Reproduces the real bug: rest-enabled + no lastFetchTime → the initial
      // mount render paints the loading visual, and fetch() emits start+end
      // synchronously inside onAfterMount (while that render is still in
      // flight). Without coalescing both re-renders are dropped and the view
      // stays stuck on the loading visual.
      class SyncCollection extends Collection {
        constructor(rows) { super(); this.restEnabled = true; this._rows = rows; }
        async fetch() {
          this.emit('fetch:start');
          this.meta = { count: this._rows.length };
          this.reset(this._rows);
          this.emit('fetch:end');
          this.emit('fetch:success', { data: this.models, meta: this.meta });
          return { success: true, data: this.models, meta: this.meta };
        }
      }

      const tv = new TableView({
        collection: new SyncCollection(ROWS),
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'level', label: 'Level' }
        ]
      });

      await tv.render(true, host); // onAfterMount fires fetch() synchronously

      // The coalesced trailing render clears loading and paints the rows.
      expect(tv.loading).toBe(false);
      expect(tv.element.querySelector('.mojo-skeleton-row')).toBeNull();
      expect(tv.element.querySelector('.spinner-border')).toBeNull();

      // The items <tbody> only exists in the not-loading / not-empty branch,
      // so its presence + child count proves the loaded state actually stuck.
      const itemsBody = tv.element.querySelector('tbody[data-container="items"]');
      expect(itemsBody).not.toBeNull();
      expect(itemsBody.childElementCount).toBe(ROWS.length);

      host.remove();
    });
  });
};
