import FormView from './FormView.js';
import Page from '@core/Page.js';

export default class FormPage extends Page {
    constructor(options = {}) {
        super({
            title: 'Form Page',
            description: 'A page for submitting forms',
            icon: 'form',
            fields: [],
            template: '<div data-container="form-view-container"></div>',
            className: "form-page container-sm",
            ...options
        });
    }

    async onInit() {
        await super.onInit();
        this.formView = new FormView({
            containerId: 'form-view-container',
            fields: this.options.fields,
            autosaveModelField: true
        });
        this.addChild(this.formView);
        if (this.getApp().activeGroup) {
            this.formView.setModel(this.getApp().activeGroup);
        }
    }

    async onEnter() {
        await super.onEnter();
        if (this.formView) {
            // Recreate formView to ensure clean slate with new model
            await this.recreateFormView();
        }
    }

    async onGroupChange(group) {
        if (this.formView) {
            // Recreate formView to ensure clean slate with new model
            await this.recreateFormView();
        }
    }

    async recreateFormView() {
        // Destroy old formView
        if (this.formView) {
            await this.formView.destroy();
            this.removeChild(this.formView);
        }

        // Create new formView with current model
        this.formView = new FormView({
            containerId: 'form-view-container',
            fields: this.options.fields,
            autosaveModelField: true
        });
        this.addChild(this.formView);

        if (this.getApp().activeGroup) {
            this.formView.setModel(this.getApp().activeGroup);
        }

        // await this.formView.render();
    }
}
