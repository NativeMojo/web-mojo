/**
 * TableView.buildFilterDialogField regression tests
 *
 * Background: filter configs registered as `additionalFilters` carry a
 * `name` field (resolved by `getAllAvailableFilters` via `f.name || f.key`).
 * If the dialog field-builder spreads `...filterConfig` AFTER setting
 * `name: 'filter_value'`, the spread silently overwrites the form field's
 * name with the filter-routing name. `extractFilterValue` then reads
 * `formResult.filter_value` and gets `undefined`, so `setFilter` clears
 * the filter on Apply — pill never appears, params never change.
 *
 * The fix strips `name` and `value` from the filter config before
 * spreading. This test locks that contract down.
 *
 * The method is pure — it doesn't touch `this`, the DOM, or any
 * dependencies — so we call it via `TableView.prototype.method.call({})`
 * without instantiating the view (which would pull in ListView, Modal,
 * FormView, etc.).
 */

const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
  const { describe, it, expect } = testContext;

  const TableView = loadModule('TableView');
  const buildField = TableView.prototype.buildFilterDialogField;

  describe('TableView.buildFilterDialogField', () => {
    it('keeps form-field name as "filter_value" even when filter config has its own name', () => {
      // Reproduces the bug from additionalFilters with a `name:` field
      const filterConfig = {
        name: 'period_start',
        label: 'Period',
        type: 'monthpicker',
        format: 'YYYY-MM',
        displayFormat: 'MMM YYYY',
      };
      const field = buildField.call({ errors: {} }, filterConfig, '', 'period_start');

      // The form field's name MUST be 'filter_value' so extractFilterValue
      // can read formResult.filter_value back out.
      expect(field.name).toBe('filter_value');
      // Type and other config still flow through.
      expect(field.type).toBe('monthpicker');
      expect(field.label).toBe('Period');
      expect(field.format).toBe('YYYY-MM');
      expect(field.displayFormat).toBe('MMM YYYY');
    });

    it('does not let filterConfig.value clobber currentValue', () => {
      const filterConfig = {
        name: 'foo',
        label: 'Foo',
        type: 'text',
        value: 'WRONG_DEFAULT',
      };
      const field = buildField.call({ errors: {} }, filterConfig, 'actual current value', 'foo');

      expect(field.value).toBe('actual current value');
      expect(field.name).toBe('filter_value');
    });

    it('preserves daterange routing fields through the spread', () => {
      // The daterange path on TableView assumes startName/endName/fieldName
      // flow through from the spread. Confirm they survive.
      const filterConfig = {
        name: 'created',
        type: 'daterange',
        startName: 'dr_start',
        endName: 'dr_end',
        fieldName: 'dr_field',
        label: 'Date Range',
        format: 'YYYY-MM-DD',
        displayFormat: 'MMM DD, YYYY',
        separator: ' to ',
      };
      const field = buildField.call({ errors: {} }, filterConfig, '', 'created');

      expect(field.name).toBe('filter_value');
      expect(field.startName).toBe('dr_start');
      expect(field.endName).toBe('dr_end');
      expect(field.fieldName).toBe('dr_field');
      expect(field.format).toBe('YYYY-MM-DD');
      expect(field.displayFormat).toBe('MMM DD, YYYY');
      expect(field.separator).toBe(' to ');
    });

    it('applies daterange defaults when fields are missing', () => {
      const filterConfig = { type: 'daterange', label: 'Range' };
      const field = buildField.call({ errors: {} }, filterConfig, '', 'created');

      expect(field.startName).toBe('dr_start');
      expect(field.endName).toBe('dr_end');
      expect(field.fieldName).toBe('dr_field');
      expect(field.format).toBe('YYYY-MM-DD');
    });

    it('normalizes daterange currentValue.start / currentValue.end to ISO strings', () => {
      const filterConfig = {
        type: 'daterange',
        startName: 'dr_start',
        endName: 'dr_end',
      };
      const currentValue = { start: '2026-05-01', end: '2026-05-31' };
      const field = buildField.call({ errors: {} }, filterConfig, currentValue, 'created');

      expect(field.startDate).toBe('2026-05-01');
      expect(field.endDate).toBe('2026-05-31');
    });

    it('converts comma-separated multiselect string to array', () => {
      const filterConfig = { name: 'tags', type: 'multiselect', label: 'Tags' };
      const field = buildField.call({ errors: {} }, filterConfig, 'one,two,three', 'tags');

      expect(field.value).toEqual(['one', 'two', 'three']);
      expect(field.name).toBe('filter_value');
    });

    it('passes placeholder through, supporting both casings', () => {
      const a = buildField.call({ errors: {} }, { name: 'a', type: 'text', placeholder: 'lower' }, '', 'a');
      const b = buildField.call({ errors: {} }, { name: 'b', type: 'text', placeHolder: 'camel' }, '', 'b');
      expect(a.placeholder).toBe('lower');
      expect(b.placeholder).toBe('camel');
    });
  });

  describe('TableView.onActionClearAllFilters', () => {
    const clearAll = TableView.prototype.onActionClearAllFilters;

    function makeCtx(params, opts = {}) {
      return {
        collection: { params: { ...params }, restEnabled: false },
        hideActivePillNames: opts.hideActivePillNames || [],
        getFilterConfig: opts.getFilterConfig || (() => null),
        updateSearchInputs: () => {},
        render: () => {},
        updateFilterPills: () => {},
        emit: () => {},
      };
    }

    it('clears all filters but preserves start, size, and sort', async () => {
      const ctx = makeCtx({
        start: 0, size: 25, sort: 'name',
        status: 'active', priority: 'high',
      });
      await clearAll.call(ctx);
      expect(ctx.collection.params).toEqual({ start: 0, size: 25, sort: 'name' });
    });

    it('preserves params whose keys are in hideActivePillNames', async () => {
      const ctx = makeCtx(
        { start: 0, size: 25, account: 'acme', tenant: 't1', status: 'active' },
        { hideActivePillNames: ['account', 'tenant'] },
      );
      await clearAll.call(ctx);
      expect(ctx.collection.params).toEqual({
        start: 0, size: 25, account: 'acme', tenant: 't1',
      });
      // user-visible filters were cleared
      expect(ctx.collection.params.status).toBeUndefined();
    });

    it('preserves dr_* trio when a hidden filter is daterange', async () => {
      const ctx = makeCtx(
        {
          start: 0, size: 25,
          dr_field: 'created', dr_start: '2026-05-01', dr_end: '2026-05-31',
          status: 'open',
        },
        {
          hideActivePillNames: ['created'],
          getFilterConfig: (key) => key === 'created'
            ? { type: 'daterange', startName: 'dr_start', endName: 'dr_end', fieldName: 'dr_field' }
            : null,
        },
      );
      await clearAll.call(ctx);
      expect(ctx.collection.params.dr_field).toBe('created');
      expect(ctx.collection.params.dr_start).toBe('2026-05-01');
      expect(ctx.collection.params.dr_end).toBe('2026-05-31');
      expect(ctx.collection.params.status).toBeUndefined();
    });

    it('honors custom startName/endName/fieldName on a hidden daterange', async () => {
      const ctx = makeCtx(
        {
          start: 0, size: 25,
          period_field: 'logged_at', period_from: '2026-01-01', period_to: '2026-12-31',
          status: 'open',
        },
        {
          hideActivePillNames: ['logged_at'],
          getFilterConfig: (key) => key === 'logged_at'
            ? { type: 'daterange', startName: 'period_from', endName: 'period_to', fieldName: 'period_field' }
            : null,
        },
      );
      await clearAll.call(ctx);
      expect(ctx.collection.params.period_field).toBe('logged_at');
      expect(ctx.collection.params.period_from).toBe('2026-01-01');
      expect(ctx.collection.params.period_to).toBe('2026-12-31');
      expect(ctx.collection.params.status).toBeUndefined();
    });

    it('emits filters:clear and params-changed', async () => {
      const events = [];
      const ctx = makeCtx({ start: 0, size: 25, status: 'open' });
      ctx.emit = (name) => events.push(name);
      await clearAll.call(ctx);
      expect(events).toContain('filters:clear');
      expect(events).toContain('params-changed');
    });

    it('no-ops when collection is null', async () => {
      const ctx = { collection: null };
      // should not throw
      await clearAll.call(ctx);
      expect(ctx.collection).toBeNull();
    });
  });
};
