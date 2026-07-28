/**
 * TableView inline-cell-editing event forwarding (#298).
 *
 * `TableRow` emits `cell:edit` / `cell:save` / `cell:save:error` /
 * `cell:cancel` on itself; `TableView._createItemView` re-emits each on the
 * table so consumers can listen once instead of wiring every row.
 *
 * `cell:save:error` was the odd one out — emitted by the row (the rejected
 * `model.save()` branch) but never forwarded, so the error branch was
 * unreachable from a table-level listener. These tests pin all four.
 *
 * Follows the TableView.rowExpand.test.js pattern: a preloaded (non-REST)
 * Collection renders synchronously and rows are reachable via
 * `tv.itemViews.get(id)`.
 */

module.exports = async function (testContext) {
  const { describe, it, expect } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();

  const Collection = loadModule('Collection');
  const TableView = loadModule('TableView');

  const COLUMNS = [
    { key: 'name', label: 'Name', editable: true, editableOptions: { type: 'text' } },
    { key: 'level', label: 'Level' }
  ];

  function seed() {
    return new Collection([
      { id: 1, name: 'Alpha', level: 3 },
      { id: 2, name: 'Beta', level: 5 }
    ]);
  }

  /** Open the inline editor on `id`'s `name` cell and return { row, cell, editor }. */
  async function openEditor(tv, id) {
    const row = tv.itemViews.get(id);
    const cell = row.element.querySelector('td[data-column="name"]');
    await row.enterEditMode('name', COLUMNS[0], cell);
    return { row, cell, editor: cell.querySelector('.cell-editor') };
  }

  /**
   * Run `fn` with `setTimeout` neutered. `saveCellEdit`'s failure branch arms a
   * 3 s timer to strip `.saving-error`; letting it stand would hold the test
   * process open for three seconds. The awaited work in `saveCellEdit` is
   * microtask-only, so swallowing macrotasks for the duration is safe.
   */
  async function withoutTimers(fn) {
    const realSetTimeout = global.setTimeout;
    global.setTimeout = () => 0;
    try {
      return await fn();
    } finally {
      global.setTimeout = realSetTimeout;
    }
  }

  describe('TableView cell:* event forwarding', () => {
    it('forwards cell:save:error from the row to the table with the payload intact', async () => {
      const tv = new TableView({ collection: seed(), columns: COLUMNS });
      await tv.render();

      const { row, editor } = await openEditor(tv, 1);
      editor.querySelector('.cell-input').value = 'Renamed';

      const failure = new Error('rejected by server');
      row.model.save = async () => { throw failure; };

      const tableEvents = [];
      tv.on('cell:save:error', (e) => tableEvents.push(e));

      await withoutTimers(() => row.saveCellEdit(editor, 'name', COLUMNS[0]));

      expect(tableEvents).toHaveLength(1);
      const payload = tableEvents[0];
      expect(payload.row).toBe(row);
      expect(payload.model).toBe(row.model);
      expect(payload.column).toBe('name');
      expect(payload.oldValue).toBe('Alpha');
      expect(payload.newValue).toBe('Renamed');
      expect(payload.error).toBe(failure);

      await tv.destroy();
    });

    it('leaves the row in edit mode when the save rejects', async () => {
      const tv = new TableView({ collection: seed(), columns: COLUMNS });
      await tv.render();

      const { row, editor } = await openEditor(tv, 1);
      row.model.save = async () => { throw new Error('nope'); };

      await withoutTimers(() => row.saveCellEdit(editor, 'name', COLUMNS[0]));

      expect(row.editingCells.has('name')).toBe(true);
      expect(editor.classList.contains('saving-error')).toBe(true);

      await tv.destroy();
    });

    it('forwards cell:edit, cell:save and cell:cancel as well', async () => {
      const tv = new TableView({ collection: seed(), columns: COLUMNS });
      await tv.render();

      const seen = [];
      ['cell:edit', 'cell:save', 'cell:cancel'].forEach((name) => {
        tv.on(name, (e) => seen.push({ name, e }));
      });

      const { row, editor } = await openEditor(tv, 1);
      expect(seen.map((s) => s.name)).toEqual(['cell:edit']);
      expect(seen[0].e.originalValue).toBe('Alpha');

      editor.querySelector('.cell-input').value = 'Renamed';
      row.model.save = async () => ({ success: true });
      await row.saveCellEdit(editor, 'name', COLUMNS[0]);

      expect(seen.map((s) => s.name)).toEqual(['cell:edit', 'cell:save']);
      expect(seen[1].e.oldValue).toBe('Alpha');
      expect(seen[1].e.newValue).toBe('Renamed');

      const second = await openEditor(tv, 2);
      second.row.cancelCellEdit(second.editor, 'name');

      expect(seen.map((s) => s.name)).toEqual(['cell:edit', 'cell:save', 'cell:edit', 'cell:cancel']);
      expect(seen[3].e.column).toBe('name');

      await tv.destroy();
    });
  });

  /**
   * #495 — `Model.save()` NEVER rejects. It catches transport errors and
   * resolves `{success:false}`, and on a `{status:false}` body it stores the
   * body in `model.errors` and still resolves `success:true`. So inspecting
   * only rejections meant a server-rejected edit exited edit mode showing the
   * new value as though it had saved — silent data loss.
   *
   * These drive the three resolved failure shapes through the stock-Model
   * contract, with no subclass that throws.
   */
  describe('cell save — resolved failures (no rejection)', () => {
    it('treats a resolved {success:false} response as a failure', async () => {
      const tv = new TableView({ collection: seed(), columns: COLUMNS });
      await tv.render();

      const { row, editor } = await openEditor(tv, 1);
      editor.querySelector('.cell-input').value = 'Renamed';

      // Shape (a): Model.save()'s transport-error catch.
      row.model.save = async () => ({ success: false, error: 'Network down', status: 500 });

      const seen = [];
      tv.on('cell:save', (e) => seen.push({ name: 'cell:save', e }));
      tv.on('cell:save:error', (e) => seen.push({ name: 'cell:save:error', e }));

      await withoutTimers(() => row.saveCellEdit(editor, 'name', COLUMNS[0]));

      expect(seen.map((s) => s.name)).toEqual(['cell:save:error']);
      expect(seen[0].e.newValue).toBe('Renamed');
      expect(seen[0].e.error.message).toBe('Network down');
      // The row must stay editable so the edit isn't silently lost.
      expect(row.editingCells.has('name')).toBe(true);
      expect(editor.classList.contains('saving-error')).toBe(true);

      await tv.destroy();
    });

    it('treats a success:true body that populates model.errors as a failure', async () => {
      const tv = new TableView({ collection: seed(), columns: COLUMNS });
      await tv.render();

      const { row, editor } = await openEditor(tv, 1);
      editor.querySelector('.cell-input').value = 'Renamed';

      // Shape (b): server validation failure. Model.save() stores the body in
      // `errors` and STILL resolves success:true — the subtlest of the three.
      row.model.save = async function () {
        this.errors = { status: false, error: 'Name already taken' };
        return { success: true, data: { status: false, error: 'Name already taken' } };
      };

      const seen = [];
      tv.on('cell:save', () => seen.push('cell:save'));
      tv.on('cell:save:error', (e) => seen.push(e));

      await withoutTimers(() => row.saveCellEdit(editor, 'name', COLUMNS[0]));

      expect(seen).toHaveLength(1);
      expect(seen[0].error.message).toBe('Name already taken');
      // The model's own error payload reaches the listener so it can render
      // per-field messages.
      expect(seen[0].error.errors).toEqual({ status: false, error: 'Name already taken' });
      expect(row.editingCells.has('name')).toBe(true);

      await tv.destroy();
    });

    it('does not exit edit mode or repaint the cell on a resolved failure', async () => {
      const tv = new TableView({ collection: seed(), columns: COLUMNS });
      await tv.render();

      const { row, cell, editor } = await openEditor(tv, 1);
      editor.querySelector('.cell-input').value = 'Renamed';
      row.model.save = async () => ({ success: false, error: 'nope' });

      await withoutTimers(() => row.saveCellEdit(editor, 'name', COLUMNS[0]));

      // Editor still present, and the cell never took the new value.
      expect(cell.querySelector('.cell-editor')).not.toBeNull();
      expect(cell.querySelector('.cell-content').innerHTML).not.toContain('Renamed');

      await tv.destroy();
    });

    // Guards the other direction: the new check must not turn clean saves into
    // failures. `{success:true}` with no `data` is a common fake/stub shape.
    it('still treats a clean save as a success', async () => {
      const tv = new TableView({ collection: seed(), columns: COLUMNS });
      await tv.render();

      const { row, editor } = await openEditor(tv, 1);
      editor.querySelector('.cell-input').value = 'Renamed';

      const seen = [];
      tv.on('cell:save', () => seen.push('cell:save'));
      tv.on('cell:save:error', () => seen.push('cell:save:error'));

      row.model.save = async function () {
        this.errors = {};
        return { success: true, data: { status: true, data: {} } };
      };

      await row.saveCellEdit(editor, 'name', COLUMNS[0]);

      expect(seen).toEqual(['cell:save']);
      expect(row.editingCells.has('name')).toBe(false);

      await tv.destroy();
    });
  });
};
