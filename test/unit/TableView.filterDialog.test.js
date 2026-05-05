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
};
