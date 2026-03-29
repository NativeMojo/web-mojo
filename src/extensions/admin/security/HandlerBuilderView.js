/**
 * HandlerBuilderView - Guided handler string builder for incident rules
 *
 * Replaces the plain-text handler input with a dropdown to select handler
 * type and per-type configuration fields. Generates the handler URI string
 * automatically (e.g., block://?ttl=86400, email://perm@manage_security).
 */

import View from '@core/View.js';

const HANDLER_TYPES = [
    {
        value: 'block',
        label: 'Block IP',
        icon: 'bi-slash-circle',
        description: 'Block the source IP address for a specified duration',
        fields: [
            {
                name: 'ttl', type: 'select', label: 'Duration',
                options: [
                    { value: '3600', label: '1 hour' },
                    { value: '21600', label: '6 hours' },
                    { value: '86400', label: '24 hours' },
                    { value: '604800', label: '7 days' },
                    { value: '2592000', label: '30 days' },
                    { value: '0', label: 'Permanent' },
                ],
                default: '86400'
            }
        ],
        build: (opts) => `block://?ttl=${opts.ttl || 86400}`,
        preview: (opts) => {
            const labels = { '3600': '1 hour', '21600': '6 hours', '86400': '24 hours', '604800': '7 days', '2592000': '30 days', '0': 'permanently' };
            return `Block source IP for ${labels[opts.ttl] || opts.ttl + 's'}`;
        }
    },
    {
        value: 'email',
        label: 'Email',
        icon: 'bi-envelope',
        description: 'Send an email notification to users with a permission',
        fields: [
            { name: 'target', type: 'text', label: 'Target (perm@permission or key@name)', default: 'perm@manage_security' }
        ],
        build: (opts) => `email://${opts.target || 'perm@manage_security'}`,
        preview: (opts) => `Email notification to ${opts.target || 'perm@manage_security'}`
    },
    {
        value: 'sms',
        label: 'SMS',
        icon: 'bi-chat-dots',
        description: 'Send an SMS notification to users with a permission',
        fields: [
            { name: 'target', type: 'text', label: 'Target (perm@permission)', default: 'perm@manage_security' }
        ],
        build: (opts) => `sms://${opts.target || 'perm@manage_security'}`,
        preview: (opts) => `SMS notification to ${opts.target || 'perm@manage_security'}`
    },
    {
        value: 'notify',
        label: 'Push Notification',
        icon: 'bi-bell',
        description: 'Send a push notification to users with a permission',
        fields: [
            { name: 'target', type: 'text', label: 'Target (perm@permission)', default: 'perm@manage_security' }
        ],
        build: (opts) => `notify://${opts.target || 'perm@manage_security'}`,
        preview: (opts) => `Push notification to ${opts.target || 'perm@manage_security'}`
    },
    {
        value: 'ticket',
        label: 'Create Ticket',
        icon: 'bi-ticket-detailed',
        description: 'Automatically create a support ticket',
        fields: [
            {
                name: 'priority', type: 'select', label: 'Priority',
                options: [
                    { value: '1', label: '1 - Low' },
                    { value: '3', label: '3 - Normal' },
                    { value: '5', label: '5 - Medium' },
                    { value: '8', label: '8 - High' },
                    { value: '10', label: '10 - Critical' },
                ],
                default: '5'
            }
        ],
        build: (opts) => `ticket://?priority=${opts.priority || 5}`,
        preview: (opts) => {
            const labels = { '1': 'Low', '3': 'Normal', '5': 'Medium', '8': 'High', '10': 'Critical' };
            return `Create ticket with ${labels[opts.priority] || 'priority ' + opts.priority} priority`;
        }
    },
    {
        value: 'job',
        label: 'Run Job',
        icon: 'bi-gear-wide-connected',
        description: 'Run an async job (Python module path)',
        fields: [
            { name: 'func', type: 'text', label: 'Module Path', placeholder: 'myapp.security.handlers.on_incident' }
        ],
        build: (opts) => `job://${opts.func || ''}`,
        preview: (opts) => `Run job: ${opts.func || '(no function specified)'}`
    },
    {
        value: 'llm',
        label: 'LLM Triage',
        icon: 'bi-stars',
        description: 'Use LLM to analyze and triage the incident',
        fields: [],
        build: () => 'llm://',
        preview: () => 'LLM-powered incident triage and analysis'
    }
];

export default class HandlerBuilderView extends View {
    constructor(options = {}) {
        super({
            className: 'handler-builder-view',
            ...options
        });

        // Current handler string (from model or passed in)
        this.handlerString = options.value || '';
        this._parseExisting();

        this.template = `
            <style>
                .hb-container { border: 1px solid #dee2e6; border-radius: 8px; padding: 1rem; background: #f8f9fa; }
                .hb-type-select { margin-bottom: 0.75rem; }
                .hb-fields { margin-bottom: 0.75rem; }
                .hb-preview { padding: 0.5rem 0.75rem; background: #e9ecef; border-radius: 6px; font-size: 0.85rem; }
                .hb-preview code { font-size: 0.8rem; }
                .hb-preview .hb-desc { color: #495057; margin-bottom: 0.25rem; }
                .hb-preview .hb-raw { color: #6c757d; font-family: ui-monospace, monospace; }
            </style>
            <div class="hb-container">
                <div class="hb-type-select">
                    <label class="form-label fw-semibold small">Handler Type</label>
                    <select class="form-select form-select-sm" data-action="change-type" id="hb-type-select">
                        <option value="">— Select handler type —</option>
                        ${HANDLER_TYPES.map(h => `<option value="${h.value}">${h.label}</option>`).join('')}
                    </select>
                </div>
                <div id="hb-fields" class="hb-fields"></div>
                <div id="hb-preview" class="hb-preview" style="display:none;"></div>
            </div>
        `;
    }

    _parseExisting() {
        if (!this.handlerString) {
            this.selectedType = null;
            this.fieldValues = {};
            return;
        }

        // Parse handler URI like "block://?ttl=86400" or "email://perm@manage_security"
        const match = this.handlerString.match(/^(\w+):\/\/(.*)$/);
        if (!match) {
            this.selectedType = null;
            this.fieldValues = {};
            return;
        }

        const [, type, rest] = match;
        this.selectedType = type;
        this.fieldValues = {};

        const handlerDef = HANDLER_TYPES.find(h => h.value === type);
        if (!handlerDef) return;

        if (rest.startsWith('?')) {
            // Query params: block://?ttl=86400
            const params = new URLSearchParams(rest);
            for (const field of handlerDef.fields) {
                const val = params.get(field.name);
                if (val !== null) this.fieldValues[field.name] = val;
            }
        } else if (handlerDef.fields.length === 1) {
            // Path value: email://perm@manage_security
            this.fieldValues[handlerDef.fields[0].name] = rest;
        }
    }

    onAfterRender() {
        // Set the select to current type
        const select = this.element?.querySelector('#hb-type-select');
        if (select && this.selectedType) {
            select.value = this.selectedType;
            this._renderFields();
            this._updatePreview();
        }
    }

    onActionChangeType(event) {
        const select = event.target;
        this.selectedType = select.value || null;
        this.fieldValues = {};

        // Set defaults
        const handlerDef = HANDLER_TYPES.find(h => h.value === this.selectedType);
        if (handlerDef) {
            for (const field of handlerDef.fields) {
                if (field.default !== undefined) {
                    this.fieldValues[field.name] = field.default;
                }
            }
        }

        this._renderFields();
        this._updatePreview();
        this._emitChange();
        return true;
    }

    _renderFields() {
        const container = this.element?.querySelector('#hb-fields');
        if (!container) return;

        const handlerDef = HANDLER_TYPES.find(h => h.value === this.selectedType);
        if (!handlerDef || !handlerDef.fields.length) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = handlerDef.fields.map(field => {
            const value = this.fieldValues[field.name] || field.default || '';
            if (field.type === 'select') {
                const opts = field.options.map(o =>
                    `<option value="${o.value}" ${o.value === String(value) ? 'selected' : ''}>${o.label}</option>`
                ).join('');
                return `
                    <div class="mb-2">
                        <label class="form-label small">${field.label}</label>
                        <select class="form-select form-select-sm" data-field="${field.name}" data-action="field-change">${opts}</select>
                    </div>`;
            }
            return `
                <div class="mb-2">
                    <label class="form-label small">${field.label}</label>
                    <input type="text" class="form-control form-control-sm" data-field="${field.name}" data-action="field-change"
                           value="${value}" placeholder="${field.placeholder || ''}">
                </div>`;
        }).join('');
    }

    onActionFieldChange(event) {
        const el = event.target;
        const fieldName = el.dataset.field;
        if (fieldName) {
            this.fieldValues[fieldName] = el.value;
            this._updatePreview();
            this._emitChange();
        }
        return true;
    }

    _updatePreview() {
        const container = this.element?.querySelector('#hb-preview');
        if (!container) return;

        const handlerDef = HANDLER_TYPES.find(h => h.value === this.selectedType);
        if (!handlerDef) {
            container.style.display = 'none';
            return;
        }

        const handlerString = handlerDef.build(this.fieldValues);
        const description = handlerDef.preview(this.fieldValues);

        container.style.display = 'block';
        container.innerHTML = `
            <div class="hb-desc"><i class="bi ${handlerDef.icon} me-1"></i>${description}</div>
            <div class="hb-raw"><code>${handlerString}</code></div>
        `;
    }

    _emitChange() {
        const value = this.getValue();
        this.emit('change', value);
    }

    /**
     * Get the generated handler string
     */
    getValue() {
        const handlerDef = HANDLER_TYPES.find(h => h.value === this.selectedType);
        if (!handlerDef) return '';
        return handlerDef.build(this.fieldValues);
    }

    /**
     * Set handler string and parse it
     */
    setValue(handlerString) {
        this.handlerString = handlerString || '';
        this._parseExisting();
        if (this.isMounted()) {
            const select = this.element?.querySelector('#hb-type-select');
            if (select) select.value = this.selectedType || '';
            this._renderFields();
            this._updatePreview();
        }
    }
}
