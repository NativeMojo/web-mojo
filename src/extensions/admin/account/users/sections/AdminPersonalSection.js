/**
 * AdminPersonalSection - Personal information editing
 *
 * Admin can view/edit name fields, DOB, timezone, and address.
 * Uses model.save() against /api/user/<id> (admin endpoint).
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';

export default class AdminPersonalSection extends View {
    constructor(options = {}) {
        super({
            className: 'admin-personal-section',
            enableTooltips: true,
            template: `
                <!-- Name -->
                <div class="detail-section-eyebrow">Name</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Display Name</div>
                    <div class="detail-flat-row-value">
                        {{#model.display_name}}{{model.display_name}}{{/model.display_name}}
                        {{^model.display_name}}<span class="text-secondary fst-italic">Not set</span>{{/model.display_name}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-display-name" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">First Name</div>
                    <div class="detail-flat-row-value">
                        {{#model.first_name}}{{model.first_name}}{{/model.first_name}}
                        {{^model.first_name}}<span class="text-secondary fst-italic">Not set</span>{{/model.first_name}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-first-name" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Last Name</div>
                    <div class="detail-flat-row-value">
                        {{#model.last_name}}{{model.last_name}}{{/model.last_name}}
                        {{^model.last_name}}<span class="text-secondary fst-italic">Not set</span>{{/model.last_name}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-last-name" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>

                <!-- Details -->
                <div class="detail-section-eyebrow">Details</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Date of Birth</div>
                    <div class="detail-flat-row-value">
                        {{#hasDob|bool}}
                            {{dobFormatted}}
                            {{#model.is_dob_verified|bool}}<span class="badge text-bg-success">Verified</span>{{/model.is_dob_verified|bool}}
                            {{^model.is_dob_verified|bool}}<span class="badge text-bg-warning">Unverified</span>{{/model.is_dob_verified|bool}}
                        {{/hasDob|bool}}
                        {{^hasDob|bool}}<span class="text-secondary fst-italic">Not set</span>{{/hasDob|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        {{#hasDob|bool}}
                            {{#model.is_dob_verified|bool}}
                                <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="unverify-dob" title="Mark as unverified"><i class="bi bi-x-circle"></i></button>
                            {{/model.is_dob_verified|bool}}
                            {{^model.is_dob_verified|bool}}
                                <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="force-verify-dob" title="Force verify"><i class="bi bi-patch-check"></i></button>
                            {{/model.is_dob_verified|bool}}
                        {{/hasDob|bool}}
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-dob" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Timezone</div>
                    <div class="detail-flat-row-value">{{timezoneDisplay}}</div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-timezone" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>

                <!-- Address -->
                <div class="detail-section-eyebrow">Address</div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Address</div>
                    <div class="detail-flat-row-value">
                        {{#hasAddress|bool}}{{addressSummary}}{{/hasAddress|bool}}
                        {{^hasAddress|bool}}<span class="text-secondary fst-italic">Not set</span>{{/hasAddress|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button type="button" class="detail-section-action" data-bs-toggle="tooltip" data-action="edit-address" title="Edit"><i class="bi bi-pencil"></i></button>
                    </div>
                </div>
            `,
            ...options
        });
    }

    // ── Computed properties ─────────────────────────

    get hasDob() {
        return !!this.model?.get('dob');
    }

    get dobFormatted() {
        const dob = this.model?.get('dob');
        if (!dob) return '';
        try {
            const [year, month, day] = dob.split('-');
            return `${month}/${day}/${year}`;
        } catch {
            return dob;
        }
    }

    get timezoneDisplay() {
        const meta = this.model?.get('metadata') || {};
        return meta.timezone || 'Not set';
    }

    get hasAddress() {
        const meta = this.model?.get('metadata') || {};
        return !!(meta.street || meta.city || meta.state || meta.zip || meta.country);
    }

    get addressSummary() {
        const meta = this.model?.get('metadata') || {};
        return [meta.street, meta.city, meta.state, meta.zip, meta.country].filter(Boolean).join(', ');
    }

    // ── Verification overrides ────────────────────────

    async onActionForceVerifyDob() {
        const confirmed = await Modal.confirm(
            'Mark date of birth as verified?',
            'Force Verify DOB'
        );
        if (!confirmed) return true;
        await this._saveField({ is_dob_verified: true }, 'DOB marked as verified');
        return true;
    }

    async onActionUnverifyDob() {
        const confirmed = await Modal.confirm(
            'Mark date of birth as unverified?',
            'Unverify DOB'
        );
        if (!confirmed) return true;
        await this._saveField({ is_dob_verified: false }, 'DOB marked as unverified');
        return true;
    }

    // ── Action handlers ─────────────────────────────

    async onActionEditDisplayName() {
        const name = await Modal.prompt(
            'Display name:',
            'Edit Display Name',
            { defaultValue: this.model.get('display_name') || '' }
        );
        if (typeof name === 'string' && name.trim()) {
            await this._saveField({ display_name: name.trim() }, 'Display name');
        }
        return true;
    }

    async onActionEditFirstName() {
        const name = await Modal.prompt(
            'First name:',
            'Edit First Name',
            { defaultValue: this.model.get('first_name') || '' }
        );
        if (typeof name === 'string' && name.trim()) {
            await this._saveField({ first_name: name.trim() }, 'First name');
        }
        return true;
    }

    async onActionEditLastName() {
        const name = await Modal.prompt(
            'Last name:',
            'Edit Last Name',
            { defaultValue: this.model.get('last_name') || '' }
        );
        if (typeof name === 'string' && name.trim()) {
            await this._saveField({ last_name: name.trim() }, 'Last name');
        }
        return true;
    }

    async onActionEditDob() {
        const data = await Modal.form({
            title: 'Date of Birth',
            size: 'sm',
            fields: [{ name: 'dob', type: 'date', label: 'Date of Birth', cols: 12 }],
            data: { dob: this.model.get('dob') || '' }
        });
        if (!data) return true;
        await this._saveField({ dob: data.dob || null }, 'Date of birth');
        return true;
    }

    async onActionEditTimezone() {
        const meta = this.model.get('metadata') || {};
        const data = await Modal.form({
            title: 'Change Timezone',
            size: 'sm',
            fields: [{
                name: 'timezone',
                type: 'select',
                label: 'Timezone',
                cols: 12,
                options: [
                    { value: 'America/New_York', text: 'Eastern Time (ET)' },
                    { value: 'America/Chicago', text: 'Central Time (CT)' },
                    { value: 'America/Denver', text: 'Mountain Time (MT)' },
                    { value: 'America/Los_Angeles', text: 'Pacific Time (PT)' },
                    { value: 'America/Anchorage', text: 'Alaska Time (AKT)' },
                    { value: 'Pacific/Honolulu', text: 'Hawaii Time (HT)' },
                    { value: 'UTC', text: 'UTC' },
                    { value: 'Europe/London', text: 'London (GMT/BST)' },
                    { value: 'Europe/Paris', text: 'Paris (CET/CEST)' },
                    { value: 'Europe/Berlin', text: 'Berlin (CET/CEST)' },
                    { value: 'Asia/Tokyo', text: 'Tokyo (JST)' },
                    { value: 'Asia/Shanghai', text: 'Shanghai (CST)' },
                    { value: 'Australia/Sydney', text: 'Sydney (AEST)' }
                ]
            }],
            data: { timezone: meta.timezone || '' }
        });
        if (!data) return true;
        await this._saveField({ metadata: { ...meta, timezone: data.timezone } }, 'Timezone');
        return true;
    }

    async onActionEditAddress() {
        const meta = this.model.get('metadata') || {};
        const data = await Modal.form({
            title: 'Edit Address',
            size: 'md',
            fields: [
                { name: 'street', type: 'text', label: 'Street', placeholder: '123 Main St', cols: 12 },
                { name: 'city', type: 'text', label: 'City', cols: 6 },
                { name: 'state', type: 'text', label: 'State / Province', cols: 6 },
                { name: 'zip', type: 'text', label: 'Zip / Postal Code', cols: 6 },
                { name: 'country', type: 'text', label: 'Country', cols: 6 }
            ],
            data: { street: meta.street || '', city: meta.city || '', state: meta.state || '', zip: meta.zip || '', country: meta.country || '' }
        });
        if (!data) return true;

        const updatedMeta = { ...meta, street: data.street || '', city: data.city || '', state: data.state || '', zip: data.zip || '', country: data.country || '' };
        await this._saveField({ metadata: updatedMeta }, 'Address');
        return true;
    }

    // ── Helpers ─────────────────────────────────────

    async _saveField(fields, label) {
        const resp = await this.model.save(fields);
        if (resp.status === 200) {
            this.getApp()?.toast?.success(`${label} updated`);
            await this.render();
        } else {
            this.getApp()?.toast?.error(resp.message || `Failed to update ${label.toLowerCase()}`);
        }
    }
}
