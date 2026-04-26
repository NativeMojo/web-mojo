import { Page, FormView } from 'web-mojo';

/**
 * MultiStepWizardExample — multi-step form wizard pattern.
 *
 * Doc:    docs/web-mojo/forms/MultiStepWizard.md
 * Route:  forms/multi-step-wizard
 *
 * The Page owns state (`currentStep`, `totalSteps`, `wizardData`) and renders
 * ONE FormView at a time into a single container. Next validates + merges;
 * Previous skips validation but still merges (partial input survives). The
 * final step is a read-only review. There is no built-in Wizard class.
 */
class MultiStepWizardExample extends Page {
    static pageName = 'forms/multi-step-wizard';
    static route = 'forms/multi-step-wizard';

    constructor(options = {}) {
        super({
            ...options,
            pageName: MultiStepWizardExample.pageName,
            route: MultiStepWizardExample.route,
            title: 'Multi-step wizard',
            template: MultiStepWizardExample.TEMPLATE,
        });
        this.totalSteps = 3;
        this.currentStep = 1;
        this.wizardData = {};
    }

    async onEnter(params) {
        // Reset per-visit — Pages are cached, so a returning user must land on step 1.
        await super.onEnter(params);
        this.currentStep = 1;
        this.wizardData = {};
        this.renderStep();
    }

    async onActionNextStep(event) {
        event.preventDefault();
        if (!this.currentForm.validate()) return this.currentForm.focusFirstError();
        Object.assign(this.wizardData, await this.currentForm.getFormData());
        this.currentStep++;
        this.renderStep();
    }

    async onActionPrevStep(event) {
        event.preventDefault();
        // No validation going back — capture partial input so it survives.
        Object.assign(this.wizardData, await this.currentForm.getFormData());
        this.currentStep--;
        this.renderStep();
    }

    async onActionSubmitWizard(event) {
        event.preventDefault();
        Object.assign(this.wizardData, await this.currentForm.getFormData());
        // In a real app this would POST the accumulated data.
        this.currentStep = this.totalSteps + 1;
        this.render();
    }

    onActionRestart(event) {
        event.preventDefault();
        this.currentStep = 1;
        this.wizardData = {};
        this.renderStep();
    }

    renderStep() {
        this.render();
        if (!this.element) return;
        if (this.currentForm) this.removeChild(this.currentForm);
        this.currentForm = new FormView({
            containerId: 'wizard-step',
            fields: this.getStepFields(this.currentStep),
        });
        this.addChild(this.currentForm);
    }

    /** Field array for each step. Pre-fill from wizardData so values survive nav. */
    getStepFields(step) {
        const d = this.wizardData;
        if (step === 1) return [
            { type: 'header', text: 'Step 1 — Account', level: 5 },
            { type: 'email', name: 'email', label: 'Email', required: true, value: d.email || '' },
            { type: 'password', name: 'password', label: 'Password', required: true,
                minlength: 8, autocomplete: 'new-password', value: d.password || '' },
        ];
        if (step === 2) return [
            { type: 'header', text: 'Step 2 — Profile', level: 5 },
            { type: 'text', name: 'first_name', label: 'First name', required: true, columns: 6, value: d.first_name || '' },
            { type: 'text', name: 'last_name', label: 'Last name', required: true, columns: 6, value: d.last_name || '' },
            { type: 'select', name: 'plan', label: 'Plan', required: true, value: d.plan || 'free', options: [
                { value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }, { value: 'team', label: 'Team' },
            ]},
        ];
        const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
        return [
            { type: 'header', text: 'Step 3 — Review', level: 5 },
            { type: 'html', html: `<dl class="row mb-0">
                <dt class="col-sm-4">Email</dt><dd class="col-sm-8">${esc(d.email)}</dd>
                <dt class="col-sm-4">Name</dt><dd class="col-sm-8">${esc(d.first_name)} ${esc(d.last_name)}</dd>
                <dt class="col-sm-4">Plan</dt><dd class="col-sm-8">${esc(d.plan)}</dd>
            </dl>` },
        ];
    }

    get progressPct() { return Math.max(0, Math.min(100, ((this.currentStep - 1) / (this.totalSteps - 1)) * 100)); }
    get isFirst() { return this.currentStep === 1; }
    get isLast() { return this.currentStep === this.totalSteps; }
    get isComplete() { return this.currentStep > this.totalSteps; }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Multi-step wizard</h1>
            <p class="example-summary">
                Compose a wizard from a Page + one FormView per step. The Page owns
                <code>currentStep</code> and a <code>wizardData</code> accumulator.
            </p>
            <p class="example-docs-link"><i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/MultiStepWizard.md">
                    docs/web-mojo/forms/MultiStepWizard.md
                </a></p>
            <div class="card"><div class="card-body">
                {{#isComplete|bool}}
                    <div class="alert alert-success"><i class="bi bi-check-circle"></i>
                        Wizard complete — data is in <code>this.wizardData</code>.</div>
                    <button type="button" class="btn btn-primary" data-action="restart">
                        <i class="bi bi-arrow-counterclockwise"></i> Start over</button>
                {{/isComplete|bool}}
                {{^isComplete|bool}}
                    <div class="d-flex justify-content-between mb-2">
                        <strong>Step {{currentStep}} of {{totalSteps}}</strong>
                        <span class="text-muted small">{{progressPct}}%</span></div>
                    <div class="progress mb-4" style="height:0.5rem;">
                        <div class="progress-bar" style="width: {{progressPct}}%;"></div></div>
                    <div data-container="wizard-step"></div>
                    <div class="d-flex justify-content-between mt-4">
                        <button type="button" class="btn btn-outline-secondary" data-action="prev-step" {{#isFirst|bool}}disabled{{/isFirst|bool}}>
                            <i class="bi bi-arrow-left"></i> Previous</button>
                        {{^isLast|bool}}<button type="button" class="btn btn-primary" data-action="next-step">Next <i class="bi bi-arrow-right"></i></button>{{/isLast|bool}}
                        {{#isLast|bool}}<button type="button" class="btn btn-success" data-action="submit-wizard"><i class="bi bi-check2"></i> Submit</button>{{/isLast|bool}}
                    </div>
                {{/isComplete|bool}}
            </div></div>
        </div>
    `;
}

export default MultiStepWizardExample;
