/**
 * TableRow — post-edit cell repaint (#495)
 *
 * `exitEditMode` used to write `escapeHtml(dataFormatter.pipe(value, fmt))`,
 * so a column with an HTML-producing formatter (`badge:`) rendered correct
 * markup on first paint and LITERAL escaped markup after an inline save.
 *
 * The escaping protected nothing. Every branch of `buildCellTemplate` is
 * already unescaped — `{{{model.key|fmt}}}` for a string formatter,
 * `innerHTML = formatter(...)` for a function formatter (see
 * `TableRow.onAfterRender`), `{{{model.key}}}` for a bare value — so the same
 * value is emitted unescaped by the very next full render of the row. All the
 * escaping did was make one path disagree with the other.
 *
 * These pin that the repaint now mirrors the initial render branch-for-branch.
 * (Whether TableRow should emit raw model values unescaped at all is a real,
 * framework-wide question, filed separately. It is deliberately out of scope
 * here — this file only pins that the two paths AGREE.)
 */

module.exports = async function (testContext) {
  const { describe, it, expect } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();
  const jest = global.jest;

  const Collection = loadModule('Collection');
  const TableView = loadModule('TableView');

  function seed() {
    return new Collection([
      { id: 1, role: 'viewer', name: 'Alpha', level: 3 },
      { id: 2, role: 'admin', name: 'Beta', level: 5 }
    ]);
  }

  /** Open the editor on `id`'s `key` cell. */
  async function openEditor(tv, id, key, column) {
    const row = tv.itemViews.get(id);
    const cell = row.element.querySelector(`td[data-column="${key}"]`);
    await row.enterEditMode(key, column, cell);
    return { row, cell, editor: cell.querySelector('.cell-editor') };
  }

  describe('TableRow cell repaint after an inline save', () => {
    // THE REGRESSION. Before the fix this wrote escaped text, so the cell read
    // `<span class="badge …">admin</span>` as visible characters.
    it('repaints a string HTML formatter as markup, not literal text', async () => {
      const columns = [
        { key: 'role', label: 'Role', editable: true, editableOptions: { type: 'text' },
          formatter: 'badge:admin=danger,viewer=secondary' },
        { key: 'name', label: 'Name' }
      ];
      const tv = new TableView({ collection: seed(), columns });
      await tv.render();

      const { row, cell, editor } = await openEditor(tv, 1, 'role', columns[0]);
      editor.querySelector('.cell-input').value = 'admin';
      row.model.save = async function () { this.errors = {}; return { success: true }; };

      await row.saveCellEdit(editor, 'role', columns[0]);

      const content = cell.querySelector('.cell-content');
      // Real markup: a element node, not an escaped string.
      expect(content.querySelector('span.badge')).not.toBeNull();
      expect(content.textContent).not.toContain('<span');
      expect(content.textContent).toContain('admin');

      await tv.destroy();
    });

    it('repaints to exactly what the initial render produced for the same value', async () => {
      const columns = [
        { key: 'role', label: 'Role', editable: true, editableOptions: { type: 'text' },
          formatter: 'badge:admin=danger,viewer=secondary' },
        { key: 'name', label: 'Name' }
      ];

      // Row 2 is seeded with 'admin' already, so its FIRST paint is the
      // reference for what row 1 should look like after being edited to 'admin'.
      const tv = new TableView({ collection: seed(), columns });
      await tv.render();
      const referenceHtml = tv.itemViews.get(2)
        .element.querySelector('td[data-column="role"] .cell-content').innerHTML.trim();

      const { row, cell, editor } = await openEditor(tv, 1, 'role', columns[0]);
      editor.querySelector('.cell-input').value = 'admin';
      row.model.save = async function () { this.errors = {}; return { success: true }; };
      await row.saveCellEdit(editor, 'role', columns[0]);

      expect(cell.querySelector('.cell-content').innerHTML.trim()).toBe(referenceHtml);

      await tv.destroy();
    });

    it('re-applies a function formatter on repaint, with the documented context', async () => {
      const calls = [];
      const columns = [
        { key: 'role', label: 'Role', editable: true, editableOptions: { type: 'text' },
          formatter: (value, ctx) => { calls.push({ value, ctx }); return `<em>${value}</em>`; } },
        { key: 'name', label: 'Name' }
      ];
      const tv = new TableView({ collection: seed(), columns });
      await tv.render();
      calls.length = 0;  // drop the initial-render invocations

      const { row, cell, editor } = await openEditor(tv, 1, 'role', columns[0]);
      editor.querySelector('.cell-input').value = 'admin';
      row.model.save = async function () { this.errors = {}; return { success: true }; };
      await row.saveCellEdit(editor, 'role', columns[0]);

      expect(cell.querySelector('.cell-content').querySelector('em')).not.toBeNull();
      const last = calls[calls.length - 1];
      expect(last.value).toBe('admin');
      expect(last.ctx.model).toBe(row.model);
      expect(last.ctx.column).toBe(columns[0]);
      expect(last.ctx.table).toBe(tv);

      await tv.destroy();
    });

    it('leaves the cell intact when a function formatter throws', async () => {
      const columns = [
        { key: 'role', label: 'Role', editable: true, editableOptions: { type: 'text' },
          formatter: () => { throw new Error('boom'); } },
        { key: 'name', label: 'Name' }
      ];
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const tv = new TableView({ collection: seed(), columns });
      await tv.render();

      const { row, cell, editor } = await openEditor(tv, 1, 'role', columns[0]);
      const before = cell.querySelector('.cell-content').innerHTML;
      editor.querySelector('.cell-input').value = 'admin';
      row.model.save = async function () { this.errors = {}; return { success: true }; };

      // A throwing formatter must not take the save down with it.
      await row.saveCellEdit(editor, 'role', columns[0]);

      expect(cell.querySelector('.cell-content').innerHTML).toBe(before);
      expect(errSpy).toHaveBeenCalled();
      expect(row.editingCells.has('role')).toBe(false);

      errSpy.mockRestore();
      await tv.destroy();
    });

    it('repaints a plain value without a formatter', async () => {
      const columns = [
        { key: 'name', label: 'Name', editable: true, editableOptions: { type: 'text' } },
        { key: 'level', label: 'Level' }
      ];
      const tv = new TableView({ collection: seed(), columns });
      await tv.render();

      const { row, cell, editor } = await openEditor(tv, 1, 'name', columns[0]);
      editor.querySelector('.cell-input').value = 'Renamed';
      row.model.save = async function () { this.errors = {}; return { success: true }; };
      await row.saveCellEdit(editor, 'name', columns[0]);

      expect(cell.querySelector('.cell-content').textContent.trim()).toBe('Renamed');

      await tv.destroy();
    });
  });
};
