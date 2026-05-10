/**
 * ListView `rowStripe:` callback — severity-coded left-edge color.
 *
 * Covers the constructor option + class application + token mapping +
 * custom-class passthrough + automatic re-eval on model change (via
 * View's built-in `model:change → render()` chain) + the explicit
 * `refreshStripes()` escape hatch for external-state callbacks.
 */

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();

  const Collection = loadModule('Collection');
  const ListView = loadModule('ListView');

  function seed() {
    return new Collection([
      { id: 1, name: 'A', level: 3 },
      { id: 2, name: 'B', level: 4 },
      { id: 3, name: 'C', level: 5 }
    ]);
  }

  function bySeverity(model) {
    const level = model.get('level');
    if (level >= 5) return 'danger';
    if (level >= 4) return 'warning';
    if (level >= 3) return 'info';
    return null;
  }

  describe('ListView rowStripe — token mapping', () => {
    let listView;
    beforeEach(async () => {
      listView = new ListView({
        collection: seed(),
        itemTemplate: '<div>{{model.name}}</div>',
        rowStripe: bySeverity
      });
      await listView.render();
    });

    it('applies list-row-stripe-info on a level-3 row', () => {
      const item = listView.itemViews.get(1);
      expect(item.element.classList.contains('list-row-stripe-info')).toBe(true);
    });

    it('applies list-row-stripe-warning on a level-4 row', () => {
      const item = listView.itemViews.get(2);
      expect(item.element.classList.contains('list-row-stripe-warning')).toBe(true);
    });

    it('applies list-row-stripe-danger on a level-5 row', () => {
      const item = listView.itemViews.get(3);
      expect(item.element.classList.contains('list-row-stripe-danger')).toBe(true);
    });
  });

  describe('ListView rowStripe — null / no-class', () => {
    it('applies no stripe class when callback returns null', async () => {
      const lv = new ListView({
        collection: new Collection([{ id: 1, name: 'X', level: 1 }]),
        itemTemplate: '<div>{{model.name}}</div>',
        rowStripe: () => null
      });
      await lv.render();
      const item = lv.itemViews.get(1);
      const stripes = Array.from(item.element.classList).filter(c => c.startsWith('list-row-stripe'));
      expect(stripes).toEqual([]);
    });

    it('applies no stripe class when callback returns undefined', async () => {
      const lv = new ListView({
        collection: new Collection([{ id: 1, name: 'X' }]),
        itemTemplate: '<div>{{model.name}}</div>',
        rowStripe: () => undefined
      });
      await lv.render();
      const item = lv.itemViews.get(1);
      const stripes = Array.from(item.element.classList).filter(c => c.startsWith('list-row-stripe'));
      expect(stripes).toEqual([]);
    });

    it('applies no stripe class when no rowStripe is configured', async () => {
      const lv = new ListView({
        collection: new Collection([{ id: 1, name: 'X' }]),
        itemTemplate: '<div>{{model.name}}</div>'
      });
      await lv.render();
      const item = lv.itemViews.get(1);
      const stripes = Array.from(item.element.classList).filter(c => c.startsWith('list-row-stripe'));
      expect(stripes).toEqual([]);
    });
  });

  describe('ListView rowStripe — all six Bootstrap variant tokens', () => {
    const tokens = ['danger', 'warning', 'success', 'info', 'primary', 'secondary'];
    tokens.forEach((token) => {
      it(`maps '${token}' to list-row-stripe-${token}`, async () => {
        const lv = new ListView({
          collection: new Collection([{ id: 1, name: 'X' }]),
          itemTemplate: '<div>{{model.name}}</div>',
          rowStripe: () => token
        });
        await lv.render();
        const item = lv.itemViews.get(1);
        expect(item.element.classList.contains(`list-row-stripe-${token}`)).toBe(true);
      });
    });
  });

  describe('ListView rowStripe — custom class passthrough', () => {
    it('applies a non-token string as a class name verbatim', async () => {
      const lv = new ListView({
        collection: new Collection([{ id: 1, name: 'X' }]),
        itemTemplate: '<div>{{model.name}}</div>',
        rowStripe: () => 'my-custom-stripe'
      });
      await lv.render();
      const item = lv.itemViews.get(1);
      expect(item.element.classList.contains('my-custom-stripe')).toBe(true);
    });
  });

  describe('ListView rowStripe — auto re-eval on model change', () => {
    it('re-applies the stripe class when the model changes', async () => {
      // Attach to the DOM so View's `_onModelChange → render()` path
      // (gated on `isMounted()`) actually fires when model.set runs.
      const host = document.createElement('div');
      document.body.appendChild(host);
      const lv = new ListView({
        collection: new Collection([{ id: 1, name: 'X', level: 3 }]),
        itemTemplate: '<div>{{model.name}}</div>',
        rowStripe: bySeverity
      });
      host.appendChild(lv.element);
      await lv.render();
      const item = lv.itemViews.get(1);
      // Initial state: level 3 → info
      expect(item.element.classList.contains('list-row-stripe-info')).toBe(true);
      // Flip to level 5 → danger. View.setModel binds model:change to
      // render(), so the row re-renders and the stripe re-applies via
      // onAfterRender — no explicit refresh call.
      item.model.set('level', 5);
      // Allow the async render cycle to finish.
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(item.element.classList.contains('list-row-stripe-info')).toBe(false);
      expect(item.element.classList.contains('list-row-stripe-danger')).toBe(true);
      document.body.removeChild(host);
    });
  });

  describe('ListView refreshStripes()', () => {
    it('re-evaluates stripes when external state changes', async () => {
      let threshold = 5;
      const lv = new ListView({
        collection: new Collection([{ id: 1, name: 'X', level: 4 }]),
        itemTemplate: '<div>{{model.name}}</div>',
        rowStripe: (m) => (m.get('level') >= threshold ? 'danger' : null)
      });
      await lv.render();
      const item = lv.itemViews.get(1);
      expect(item.element.classList.contains('list-row-stripe-danger')).toBe(false);
      // External state changes; consumer triggers re-eval explicitly.
      threshold = 4;
      lv.refreshStripes();
      expect(item.element.classList.contains('list-row-stripe-danger')).toBe(true);
    });

    it('is a no-op when no rowStripe is configured', async () => {
      const lv = new ListView({
        collection: new Collection([{ id: 1, name: 'X' }]),
        itemTemplate: '<div>{{model.name}}</div>'
      });
      await lv.render();
      // Should not throw and should leave classes untouched.
      expect(() => lv.refreshStripes()).not.toThrow();
    });
  });

  describe('ListView rowStripe — defensive', () => {
    it('treats a throwing callback as no stripe (does not break render)', async () => {
      const lv = new ListView({
        collection: new Collection([{ id: 1, name: 'X' }]),
        itemTemplate: '<div>{{model.name}}</div>',
        rowStripe: () => { throw new Error('boom'); }
      });
      await lv.render();
      const item = lv.itemViews.get(1);
      const stripes = Array.from(item.element.classList).filter(c => c.startsWith('list-row-stripe'));
      expect(stripes).toEqual([]);
    });
  });
};
