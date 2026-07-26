/**
 * DnsRecordEditor - the structured, per-type DNS record form (#394).
 *
 * DNS record editing is where people break production, so this form is
 * deliberately not a free-text values box. `RECORD_SPECS` drives one input per
 * field of the selected type — MX renders (priority, target), SRV four fields,
 * CAA (flags, tag, value) — which deletes the entire "wrong number of fields"
 * error class before it can happen.
 *
 * Three layers sit on top of that, all of them pure functions in dnsData.js:
 *
 *   1. **Autofix** on paste/blur, and never silently: every change is listed
 *      above the fields. The one that matters most strips user-added quotes
 *      from a TXT value — Route53 re-quotes and 255-chunks TXT itself, so a
 *      double-quoted value breaks SPF/DKIM and ACME validation with no error
 *      surfaced anywhere.
 *   2. **Blocking validation** that mirrors the backend's rules (so the user
 *      never round-trips a 400) and adds the value-syntax checks the backend
 *      deliberately does not make. Errors attach to their field, and where a
 *      one-click correction exists — an IPv6 address in an A record is the
 *      right value with the wrong type — it is offered as a button.
 *   3. **Warnings** that do not block, surfaced in the save confirm.
 *
 * The server remains the authority throughout: every check here mirrors a
 * backend rule or fills a gap it leaves open, and a server rejection is always
 * shown verbatim.
 */

import View from '@core/View.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import {
    RECORD_SPECS,
    DNS_RECORD_TYPES,
    specFor,
    blankValue,
    parseRecordValue,
    formatRecordValue,
    autofixFieldValue,
    validateRecordSet,
    normalizeRecordValues
} from './dnsData.js';

const escapeHtml = MOJOUtils.escapeHtml;

class DnsRecordEditor extends View {
    /**
     * @param {object} options
     *   zone     - the domain name, e.g. "example.com"
     *   record   - existing record set being edited, or null to add
     *   existing - every record set in the zone, for collision checks
     *   caps     - GET /api/dnsman/config
     */
    constructor(options = {}) {
        super({ className: 'dns-record-editor', ...options });

        this.zone = options.zone || '';
        this.existing = Array.isArray(options.existing) ? options.existing : [];
        this.caps = options.caps || {};
        this.isNew = !options.record;

        const record = options.record || null;
        this.recordType = record ? String(record.type || '').toUpperCase() : 'A';
        this.recordName = record ? this.relativeName(record.name) : '';
        this.ttl = record && record.ttl ? String(record.ttl) : '300';
        this.before = record ? normalizeRecordValues(record.record_values) : [];

        // Structured rows, one per value.
        this.rows = this.before.length
            ? this.before.map(wire => parseRecordValue(this.recordType, wire))
            : [blankValue(this.recordType)];

        this.fixes = [];
        this.errors = [];
    }

    /** Show the in-zone shorthand while editing; the wire form stays FQDN. */
    relativeName(name) {
        const raw = String(name || '').toLowerCase().replace(/\.+$/, '');
        const zone = String(this.zone || '').toLowerCase().replace(/\.+$/, '');
        if (!zone || raw === zone) return '@';
        return raw.endsWith(`.${zone}`) ? raw.slice(0, -(zone.length + 1)) : raw;
    }

    get allowedTypes() {
        const list = this.caps && this.caps.allowed_record_types;
        return (list && list.length ? list : DNS_RECORD_TYPES).map(t => String(t).toUpperCase());
    }

    get spec() {
        return specFor(this.recordType) || RECORD_SPECS.A;
    }

    /** The wire values the form currently describes. */
    get values() {
        return this.rows
            .map(row => formatRecordValue(this.recordType, row))
            .filter(value => value !== '');
    }

    /** Everything a caller needs to write the record set. */
    payload() {
        return {
            type: this.recordType,
            name: this.recordName === '' ? '@' : this.recordName,
            record_values: this.values,
            ttl: Number(this.ttl) || 300
        };
    }

    validate() {
        this.errors = validateRecordSet({
            type: this.recordType,
            name: this.recordName,
            values: this.values,
            ttl: this.ttl,
            zone: this.zone,
            existingRecords: this.existing.filter(r => {
                // Editing a record must not collide with itself.
                if (this.isNew) return true;
                const sameType = String(r.type || '').toUpperCase() === this.recordType;
                return !(sameType && this.relativeName(r.name) === this.recordName);
            }),
            caps: this.caps
        });
        return this.errors;
    }

    get isValid() {
        return this.validate().ok;
    }

    errorsFor(index, field) {
        const list = (this.errors && this.errors.errors) || [];
        return list.filter(err => err.index === index && err.field === field);
    }

    recordLevelErrors() {
        const list = (this.errors && this.errors.errors) || [];
        return list.filter(err => err.index === null || err.index === undefined);
    }

    // ── Rendering ──────────────────────────────────────────────────────

    getTemplate() {
        this.validate();
        const spec = this.spec;
        const canAdd = spec.multi !== false;

        return `
            <div class="mb-3">
                <label class="form-label small text-secondary">Type</label>
                <select class="form-select" data-action="type-changed">
                    ${this.allowedTypes.map(type => `
                        <option value="${escapeHtml(type)}"${type === this.recordType ? ' selected' : ''}>${escapeHtml(type)}</option>
                    `).join('')}
                </select>
            </div>

            <div class="mb-3">
                <label class="form-label small text-secondary">Name</label>
                <div class="input-group">
                    <input type="text" class="form-control font-monospace${this.recordLevelErrors().some(e => e.field === 'name') ? ' is-invalid' : ''}"
                           value="${escapeHtml(this.recordName)}" placeholder="@" data-action="name-changed">
                    <span class="input-group-text text-secondary">.${escapeHtml(this.zone)}</span>
                </div>
                <div class="form-text">Use <code>@</code> for the domain itself, or a label like <code>www</code>.</div>
            </div>

            ${this.renderFixes()}
            ${this.renderRecordErrors()}

            <div class="mb-3">
                <label class="form-label small text-secondary">${escapeHtml(spec.valuesLabel || 'Values')}</label>
                ${this.rows.map((row, index) => this.renderRow(row, index)).join('')}
                ${canAdd ? `
                    <button type="button" class="btn btn-sm btn-outline-secondary mt-1" data-action="add-row">
                        <i class="bi bi-plus-lg me-1"></i>Add value
                    </button>
                ` : `
                    <div class="form-text">A ${escapeHtml(this.recordType)} record holds exactly one value.</div>
                `}
            </div>

            <div class="mb-1" style="max-width: 160px">
                <label class="form-label small text-secondary">TTL (seconds)</label>
                <input type="number" class="form-control${this.recordLevelErrors().some(e => e.field === 'ttl') ? ' is-invalid' : ''}"
                       value="${escapeHtml(this.ttl)}" data-action="ttl-changed">
            </div>

            ${this.before.length > 1 ? `
                <div class="alert alert-warning py-2 px-3 small mt-3 mb-0">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Saving replaces <strong>every</strong> value on this record — you will see exactly
                    what changes before anything is written.
                </div>
            ` : ''}
        `;
    }

    renderRow(row, index) {
        const spec = this.spec;
        const canRemove = spec.multi !== false && this.rows.length > 1;
        return `
            <div class="d-flex gap-2 align-items-start mb-2">
                <div class="d-flex gap-2 flex-grow-1 flex-wrap">
                    ${spec.fields.map(field => this.renderField(field, row, index)).join('')}
                </div>
                ${canRemove ? `
                    <button type="button" class="btn btn-sm btn-link text-secondary px-2" title="Remove this value"
                            data-action="remove-row" data-index="${index}">
                        <i class="bi bi-x-lg"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }

    renderField(field, row, index) {
        const value = row && row[field.key] !== undefined ? String(row[field.key]) : '';
        const errors = this.errorsFor(index, field.key);
        const invalid = errors.length ? ' is-invalid' : '';
        const style = field.grow ? 'flex:1 1 220px; min-width:0' : `flex:0 0 ${field.width || '110px'}`;

        const control = field.kind === 'enum'
            ? `<select class="form-select form-select-sm${invalid}" data-action="field-changed"
                       data-index="${index}" data-field="${escapeHtml(field.key)}">
                   ${(field.options || []).map(option => `
                       <option value="${escapeHtml(option)}"${option === value ? ' selected' : ''}>${escapeHtml(option)}</option>
                   `).join('')}
               </select>`
            : `<input type="text" class="form-control form-control-sm${invalid}${field.kind === 'hostname' || field.kind === 'ipv4' || field.kind === 'ipv6' ? ' font-monospace' : ''}"
                      value="${escapeHtml(value)}" data-action="field-changed"
                      data-index="${index}" data-field="${escapeHtml(field.key)}">`;

        return `
            <div style="${style}">
                <label class="form-label text-uppercase text-secondary mb-1" style="font-size:.66rem; letter-spacing:.06em; font-weight:650">
                    ${escapeHtml(field.label)}
                </label>
                ${control}
                ${errors.map(err => `
                    <div class="invalid-feedback d-block">
                        ${escapeHtml(err.message)}
                        ${err.fix ? `
                            <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2 ms-1"
                                    style="font-size:.72rem"
                                    data-action="apply-fix" data-index="${index}" data-field="${escapeHtml(err.field)}">
                                ${escapeHtml(err.fix.label)}
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderFixes() {
        if (!this.fixes.length) return '';
        return `
            <div class="alert alert-warning py-2 px-3 small">
                <strong>Cleaned up ${this.fixes.length === 1 ? 'one thing' : `${this.fixes.length} things`} in what you pasted:</strong>
                <ul class="mb-0 mt-1 ps-3">
                    ${this.fixes.map(fix => `<li>${escapeHtml(fix)}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    renderRecordErrors() {
        const errors = this.recordLevelErrors().filter(err => err.field !== 'ttl' && err.field !== 'name');
        if (!errors.length) return '';
        return `
            <div class="alert alert-danger py-2 px-3 small">
                ${errors.map(err => `
                    <div class="d-flex align-items-start gap-2">
                        <i class="bi bi-exclamation-triangle mt-1"></i>
                        <div>
                            ${escapeHtml(err.message)}
                            ${err.fix && err.fix.action === 'set-name' ? `
                                <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2 ms-1"
                                        style="font-size:.72rem" data-action="apply-name-fix">
                                    ${escapeHtml(err.fix.label)}
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ── Actions ────────────────────────────────────────────────────────

    onActionTypeChanged(event, element) {
        const next = String(element.value || '').toUpperCase();
        if (next === this.recordType) return;
        // Carry values across where the shapes allow it; a CNAME target and an
        // NS target are the same string, and losing it on a mistyped select
        // would be gratuitous.
        const wires = this.values;
        this.recordType = next;
        this.rows = wires.length
            ? wires.map(wire => parseRecordValue(next, wire))
            : [blankValue(next)];
        if (specFor(next) && specFor(next).multi === false) this.rows = this.rows.slice(0, 1);
        this.fixes = [];
        this.render();
        this.emit('changed');
    }

    onActionNameChanged(event, element) {
        this.recordName = String(element.value || '').trim();
        this.emit('changed');
    }

    onActionTtlChanged(event, element) {
        this.ttl = String(element.value || '').trim();
        this.emit('changed');
    }

    onActionFieldChanged(event, element) {
        const index = Number(element.dataset.index);
        const key = element.dataset.field;
        const field = this.spec.fields.find(f => f.key === key);
        if (!this.rows[index] || !field) return;

        const result = autofixFieldValue(field.kind, element.value);
        this.rows[index][key] = result.value;

        if (result.fixes.length) {
            this.fixes = result.fixes;
            this.render();
        } else if (element.value !== result.value) {
            element.value = result.value;
            this.renderValidation();
        } else {
            this.renderValidation();
        }
        this.emit('changed');
    }

    onActionAddRow() {
        this.rows.push(blankValue(this.recordType));
        this.render();
        this.emit('changed');
    }

    onActionRemoveRow(event, element) {
        const index = Number(element.dataset.index);
        if (this.rows.length <= 1) return;
        this.rows.splice(index, 1);
        this.render();
        this.emit('changed');
    }

    /** "Change type to AAAA" — the value is right, the type is wrong. */
    onActionApplyFix(event, element) {
        const index = Number(element.dataset.index);
        const key = element.dataset.field;
        const err = this.errorsFor(index, key).find(e => e.fix);
        if (!err || err.fix.action !== 'change-type') return;
        const wires = this.values;
        this.recordType = err.fix.type;
        this.rows = wires.map(wire => parseRecordValue(this.recordType, wire));
        this.fixes = [];
        this.render();
        this.emit('changed');
    }

    onActionApplyNameFix() {
        const err = this.recordLevelErrors().find(e => e.fix && e.fix.action === 'set-name');
        if (!err) return;
        this.recordName = this.relativeName(err.fix.name);
        this.fixes = [];
        this.render();
        this.emit('changed');
    }

    /** Re-render just enough to move the error state without stealing focus. */
    renderValidation() {
        this.validate();
        this.emit('validity', { ok: this.errors.ok });
    }

    onAfterRender() {
        this.emit('validity', { ok: this.validate().ok });
    }
}

export default DnsRecordEditor;
