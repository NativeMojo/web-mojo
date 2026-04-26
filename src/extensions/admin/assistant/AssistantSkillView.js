/**
 * AssistantSkillView - Detail view for a single assistant skill
 *
 * Shows skill metadata, trigger phrases, and ordered step definitions.
 */

import View from '@core/View.js';
import { AssistantSkill } from '@ext/admin/models/Assistant.js';
import Dialog from '@core/views/feedback/Dialog.js';

const TIER_BADGE = {
    global: 'bg-primary',
    user: 'bg-info',
    group: 'bg-warning text-dark'
};

class AssistantSkillView extends View {
    constructor(options = {}) {
        super({
            className: 'assistant-skill-view',
            ...options
        });

        this.model = options.model || new AssistantSkill(options.data || {});

        this.template = `
            <div class="d-flex flex-column h-100">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="flex-grow-1" style="min-width: 0;">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            {{{tierBadge}}}
                            {{{statusBadge}}}
                            <span class="text-muted small">Skill #{{model.id}}</span>
                        </div>
                        <h4 class="mb-1">{{model.name}}</h4>
                        <p class="text-muted mb-2">{{model.description}}</p>
                        <div class="text-muted small d-flex align-items-center gap-3 flex-wrap">
                            {{#model.auto_execute|bool}}
                                <span><i class="bi bi-lightning-fill text-warning me-1"></i>Auto-execute enabled</span>
                            {{/model.auto_execute|bool}}
                            {{#model.created}}
                                <span><i class="bi bi-clock me-1"></i>{{model.created|relative}}</span>
                            {{/model.created}}
                            {{#model.modified}}
                                <span><i class="bi bi-pencil me-1"></i>{{model.modified|relative}}</span>
                            {{/model.modified}}
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-shrink-0">
                        <button class="btn btn-outline-danger btn-sm" data-action="delete-skill">
                            <i class="bi bi-trash me-1"></i>Delete
                        </button>
                    </div>
                </div>

                <!-- Auto-Execute Info -->
                {{#model.auto_execute|bool}}
                <div class="alert alert-warning small py-2 mb-3">
                    <i class="bi bi-lightning-fill me-1"></i>
                    <strong>Auto-execute:</strong> The assistant will run this skill without asking for confirmation when triggered.
                </div>
                {{/model.auto_execute|bool}}

                <!-- Triggers -->
                {{#hasTriggers|bool}}
                <div class="mb-3">
                    <h6 class="text-muted mb-2"><i class="bi bi-chat-quote me-1"></i>Trigger Phrases</h6>
                    <div class="d-flex flex-wrap gap-2">
                        {{#triggers}}
                            <span class="badge bg-light text-dark border px-2 py-1">{{.}}</span>
                        {{/triggers}}
                    </div>
                </div>
                {{/hasTriggers|bool}}

                <!-- Steps -->
                {{#hasSteps|bool}}
                <div class="mb-3">
                    <h6 class="text-muted mb-2"><i class="bi bi-list-ol me-1"></i>Steps ({{stepCount}})</h6>
                    <div class="skill-steps-list">
                        {{{stepsHtml}}}
                    </div>
                </div>
                {{/hasSteps|bool}}

                <!-- Metadata -->
                {{#hasMetadata|bool}}
                <div class="mb-3">
                    <h6 class="text-muted mb-2"><i class="bi bi-braces me-1"></i>Metadata</h6>
                    <pre class="bg-light p-3 rounded small mb-0"><code>{{metadataJson}}</code></pre>
                </div>
                {{/hasMetadata|bool}}
            </div>
        `;
    }

    async onInit() {
        // Fetch detail graph if steps not loaded
        if (!this.model.get('steps')) {
            try {
                await this.model.fetch({ params: { graph: 'detail' } });
            } catch (_e) {
                // Use whatever data we have
            }
        }
    }

    async onBeforeRender() {
        const tier = this.model.get('tier') || 'user';
        const tierCls = TIER_BADGE[tier] || 'bg-secondary';
        this.tierBadge = `<span class="badge ${tierCls}">${tier}</span>`;

        const isActive = this.model.get('is_active');
        this.statusBadge = isActive
            ? '<span class="badge bg-success">Active</span>'
            : '<span class="badge bg-secondary">Inactive</span>';

        this.triggers = this.model.get('triggers') || [];
        this.hasTriggers = this.triggers.length > 0;

        const steps = this.model.get('steps') || [];
        this.hasSteps = steps.length > 0;
        this.stepCount = steps.length;
        this.stepsHtml = this._buildStepsHtml(steps);

        const metadata = this.model.get('metadata');
        this.hasMetadata = metadata && Object.keys(metadata).length > 0;
        this.metadataJson = this.hasMetadata ? JSON.stringify(metadata, null, 2) : '';
    }

    _buildStepsHtml(steps) {
        return steps.map((step, index) => {
            const esc = this._escapeHtml;
            const paramsJson = step.params ? JSON.stringify(step.params, null, 2) : null;
            const collapseId = `step-params-${this.model.get('id')}-${index}`;

            let html = `
                <div class="skill-step-item d-flex gap-3 py-2 ${index < steps.length - 1 ? 'border-bottom' : ''}">
                    <div class="skill-step-number flex-shrink-0">
                        <span class="badge bg-dark rounded-pill">${index + 1}</span>
                    </div>
                    <div class="flex-grow-1" style="min-width: 0;">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <code class="small">${esc(step.tool || 'unknown')}</code>
                            ${step.description ? `<span class="text-muted small">— ${esc(step.description)}</span>` : ''}
                        </div>`;

            if (step.condition) {
                html += `
                        <div class="small text-warning">
                            <i class="bi bi-funnel me-1"></i>Condition: <code>${esc(step.condition)}</code>
                        </div>`;
            }

            if (paramsJson) {
                html += `
                        <div class="mt-1">
                            <a class="small text-muted" data-bs-toggle="collapse" href="#${collapseId}" role="button" aria-expanded="false">
                                <i class="bi bi-chevron-right me-1"></i>Parameters
                            </a>
                            <div class="collapse" id="${collapseId}">
                                <pre class="bg-light p-2 rounded small mt-1 mb-0"><code>${esc(paramsJson)}</code></pre>
                            </div>
                        </div>`;
            }

            html += `
                    </div>
                </div>`;
            return html;
        }).join('');
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async onActionDeleteSkill() {
        const confirmed = await Dialog.confirm(
            `Delete skill "${this.model.get('name')}"? This cannot be undone.`,
            'Delete Skill',
            { confirmText: 'Delete', confirmClass: 'btn-danger' }
        );
        if (!confirmed) return;

        try {
            await this.model.destroy();
            this.getApp()?.toast?.success('Skill deleted');
            this.emit('item:deleted', { id: this.model.get('id') });
        } catch (_e) {
            this.getApp()?.toast?.error('Failed to delete skill');
        }
    }
}

export default AssistantSkillView;
