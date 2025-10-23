/**
 * SectionedFormView - Compose multiple FormView sections as tabs or a wizard.
 *
 * Features:
 * - Tabs mode: non-linear navigation between sections using TabView
 * - Wizard mode: linear Next/Back/Finish with per-step validation
 * - Shared model/data across sections with per-section FormView instances
 * - showAsDialog helper that opens the sectioned form inside Dialog (dynamic import)
 *
 * Usage:
 *   const view = new SectionedFormView({
 *     sections: [
 *       { label: 'General', fields: [...] },
 *       { label: 'Advanced', fields: [...] }
 *     ],
 *     model,
 *     mode: 'tabs', // or 'wizard'
 *   });
 *   await view.render(true, container);
 *
 *   // Or show in a dialog:
 *   await view.showAsDialog({ title: 'Edit', mode: 'wizard' });
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import FormView from '@core/forms/FormView.js';
import Dialog from '@core/views/feedback/Dialog.js';

class SectionedFormView extends View {
  constructor(options = {}) {
    const {
      sections = [],           // [{ label, fields }]
      model = null,
      data = undefined,
      defaults = undefined,
      formOptions = {},
      tabOptions = {},
      mode = 'tabs',           // 'tabs' | 'wizard'
      autosaveModelField = false,
      fileHandling = 'base64',
      // Button labels for non-dialog usage (when rendering standalone)
      backText = 'Back',
      nextText = 'Next',
      finishText = 'Finish',
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: `sectioned-form sectioned-form-${mode}`,
      ...viewOptions
    });

    this.mode = mode;
    this.sections = sections;
    this.model = model;
    this.sharedData = data;
    this.sharedDefaults = defaults;
    this.autosaveModelField = autosaveModelField;
    this.fileHandling = fileHandling;

    this.forms = {};
    this._dialog = null; // Only set when used via showAsDialog

    // Build per-section FormViews reusing shared model/data/defaults
    const tabs = {};
    for (const section of sections) {
      const fv = new FormView({
        model,
        data: this.sharedData,
        defaults: this.sharedDefaults,
        autosaveModelField,
        fileHandling,
        formConfig: {
          fields: section.fields,
          submitButton: false,
          resetButton: false
        },
        ...formOptions
      });
      this.forms[section.label] = fv;
      tabs[section.label] = fv;
    }

    // If wizard mode, hide TabView nav by default (can be overridden by tabOptions)
    const effectiveTabOptions = {
      ...(this.mode === 'wizard'
        ? { tabsClass: `${tabOptions.tabsClass || 'nav nav-tabs mb-3'} d-none` }
        : {}),
      ...tabOptions
    };

    this.tabView = new TabView({
      tabs,
      activeTab: sections[0]?.label,
      ...effectiveTabOptions
    });

    this.addChild(this.tabView);

    // Store default button labels for standalone wizard controls
    this._labels = { backText, nextText, finishText };
  }

  getLabels() {
    return this.tabView.getTabLabels();
  }

  getActiveLabel() {
    return this.tabView.getActiveTab();
  }

  async renderTemplate() {
    // In wizard mode, render inline controls so this view can be used standalone (outside dialogs)
    const controls = this.mode === 'wizard' ? `
      <div class="d-flex gap-2 mt-3" data-wizard-controls>
        <button class="btn btn-secondary" data-action="wizard-prev">${this._labels.backText}</button>
        <button class="btn btn-primary" data-action="wizard-next">${this._labels.nextText}</button>
        <button class="btn btn-outline-primary ms-auto" data-action="wizard-finish">${this._labels.finishText}</button>
      </div>
    ` : '';

    // Hook for CSS to hide tabs if needed (we also hide via tabsClass in constructor)
    const hideTabs = this.mode === 'wizard' ? 'data-hide-tabs="true"' : '';

    return `
      <div class="sectioned-form-container">
        <div data-child="tabView" ${hideTabs}></div>
        ${controls}
      </div>
    `;
  }

  // =========================
  // Wizard actions (standalone)
  // =========================

  async onActionWizardPrev() {
    const labels = this.getLabels();
    const idx = labels.indexOf(this.getActiveLabel());
    if (idx > 0) {
      await this.tabView.showTab(labels[idx - 1]);
      this.updateInlineWizardButtons();
    }
  }

  async onActionWizardNext() {
    const labels = this.getLabels();
    const active = this.getActiveLabel();
    const idx = labels.indexOf(active);
    if (idx === -1) return;

    const currentForm = this.forms[active];
    if (!currentForm.validate()) {
      currentForm.focusFirstError();
      return;
    }
    if (idx < labels.length - 1) {
      await this.tabView.showTab(labels[idx + 1]);
      this.updateInlineWizardButtons();
    }
  }

  async onActionWizardFinish() {
    // Validate current step first
    const active = this.getActiveLabel();
    const currentForm = this.forms[active];
    if (!currentForm.validate()) {
      currentForm.focusFirstError();
      return;
    }

    // Validate all steps before finishing
    for (const label of this.getLabels()) {
      const f = this.forms[label];
      if (!f.validate()) {
        await this.tabView.showTab(label);
        f.focusFirstError();
        return;
      }
    }

    // Gather data and save if model.save exists
    const allData = {};
    for (const f of Object.values(this.forms)) {
      Object.assign(allData, await f.getFormData());
    }
    if (typeof this.model?.save === 'function') {
      await this.model.save(allData);
    }

    this.emit('wizard:finished', { data: allData });
  }

  updateInlineWizardButtons() {
    if (this.mode !== 'wizard' || !this.element) return;
    const labels = this.getLabels();
    const idx = labels.indexOf(this.getActiveLabel());

    const backBtn = this.element.querySelector('[data-action="wizard-prev"]');
    const nextBtn = this.element.querySelector('[data-action="wizard-next"]');
    const finishBtn = this.element.querySelector('[data-action="wizard-finish"]');

    if (backBtn) backBtn.style.visibility = idx <= 0 ? 'hidden' : 'visible';
    if (nextBtn) nextBtn.style.visibility = idx >= labels.length - 1 ? 'hidden' : 'visible';
    if (finishBtn) finishBtn.style.visibility = idx >= labels.length - 1 ? 'visible' : 'hidden';
  }

  async onAfterRender() {
    await super.onAfterRender();

    if (this.mode === 'wizard') {
      // Keep inline wizard buttons up-to-date
      this.tabView.on('tab:changed', () => this.updateInlineWizardButtons());
      this.updateInlineWizardButtons();
    }
  }

  // =====================
  // Dialog presentation
  // =====================

  /**
   * Present this SectionedFormView inside a Dialog with appropriate controls.
   * Dialog is loaded via dynamic import.
   *
   * @param {object} options
   * @param {string} [options.title='Form']
   * @param {string} [options.size='lg']
   * @param {boolean} [options.centered=true]
   * @param {string} [options.cancelText='Cancel']
   * @param {string} [options.nextText='Next']
   * @param {string} [options.backText='Back']
   * @param {string} [options.finishText='Finish']
   * @param {string} [options.submitText='Save'] - Used in tabs mode
   * @param {boolean} [options.validateAllOnFinish=true] - Wizard mode: validate all before finish
   * @param {boolean} [options.autoCloseOnFinish=true]
   * @param {string} [options.busyLabel='Saving...']
   * @param {...any} dialogOptions - Additional options forwarded to Dialog
   * @returns {Promise<object|null>} Resolves with data (or result) or null if cancelled/closed
   */
  async showAsDialog({
    title = 'Form',
    size = 'lg',
    centered = true,
    cancelText = 'Cancel',
    nextText = 'Next',
    backText = 'Back',
    finishText = 'Finish',
    submitText = 'Save',
    validateAllOnFinish = true,
    autoCloseOnFinish = true,
    busyLabel = 'Saving...',
    ...dialogOptions
  } = {}) {
    // Dialog imported statically

    const isWizard = this.mode === 'wizard';
    const buttons = isWizard
      ? [
          { text: cancelText, class: 'btn-secondary', action: 'cancel' },
          { text: backText, class: 'btn-outline-secondary', action: 'wizard-prev' },
          { text: nextText, class: 'btn-primary', action: 'wizard-next' },
          { text: finishText, class: 'btn-outline-primary', action: 'wizard-finish' }
        ]
      : [
          { text: cancelText, class: 'btn-secondary', action: 'cancel' },
          { text: submitText, class: 'btn-primary', action: 'submit' }
        ];

    const dialog = new Dialog({
      title,
      body: this,
      size,
      centered,
      buttons,
      ...dialogOptions
    });
    this._dialog = dialog;

    // Render and mount dialog
    const fullscreenElement = document.querySelector('.table-fullscreen');
    const targetContainer = fullscreenElement || document.body;
    await dialog.render(true, targetContainer);
    dialog.show();

    // Wizard button state sync
    const updateWizardButtons = () => {
      if (!isWizard || !dialog.element) return;
      const labels = this.getLabels();
      const idx = labels.indexOf(this.getActiveLabel());
      const backBtn = dialog.element.querySelector('[data-action="wizard-prev"]');
      const nextBtn = dialog.element.querySelector('[data-action="wizard-next"]');
      const finishBtn = dialog.element.querySelector('[data-action="wizard-finish"]');
      if (backBtn) backBtn.style.visibility = idx <= 0 ? 'hidden' : 'visible';
      if (nextBtn) nextBtn.style.visibility = idx >= labels.length - 1 ? 'hidden' : 'visible';
      if (finishBtn) finishBtn.style.visibility = idx >= labels.length - 1 ? 'visible' : 'hidden';
    };
    this.tabView.on('tab:changed', updateWizardButtons);
    updateWizardButtons();

    // Wire dialog actions to this view
    dialog.on('action:wizard-prev', () => this.onActionWizardPrev());
    dialog.on('action:wizard-next', () => this.onActionWizardNext());
    dialog.on('action:wizard-finish', async () => {
      if (validateAllOnFinish) {
        await this.onActionWizardFinish();
      } else {
        // Only validate active step
        const active = this.getActiveLabel();
        const f = this.forms[active];
        if (!f.validate()) {
          f.focusFirstError();
          return;
        }

        // Gather data for a partial finish if desired
        const allData = {};
        for (const form of Object.values(this.forms)) {
          Object.assign(allData, await form.getFormData());
        }
        this.emit('wizard:finished', { data: allData });
      }
    });

    // Tabs-mode submit: validate all, gather, save if model.save exists
    dialog.on('action:submit', async () => {
      dialog.setLoading(true, busyLabel);
      try {
        for (const label of this.getLabels()) {
          const f = this.forms[label];
          if (!f.validate()) {
            await this.tabView.showTab(label);
            f.focusFirstError();
            dialog.setLoading(false);
            return;
          }
        }
        const allData = {};
        for (const f of Object.values(this.forms)) {
          Object.assign(allData, await f.getFormData());
        }
        if (typeof this.model?.save === 'function') {
          await this.model.save(allData);
        }
        dialog.hide();
      } catch (e) {
        dialog.setLoading(false);
        this.getApp().toast?.error?.(e.message || 'Save failed');
      }
    });

    return new Promise((resolve) => {
      let resolved = false;

      this.on('wizard:finished', ({ data }) => {
        if (autoCloseOnFinish && dialog.isShown()) dialog.hide();
        if (!resolved) {
          resolved = true;
          resolve(data);
        }
      });

      dialog.on('action:cancel', () => {
        if (resolved) return;
        resolved = true;
        dialog.hide();
        resolve(null);
      });

      dialog.on('hidden', () => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
        // Cleanup
        setTimeout(() => {
          this.destroy();
          dialog.destroy();
          dialog.element?.remove();
          this._dialog = null;
        }, 100);
      });
    });
  }
}

export default SectionedFormView;