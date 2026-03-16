/**
 * ProfilePersonalSection - Personal information tab
 *
 * Editable fields: first name, last name, DOB, timezone, address.
 * DOB is a top-level user field with is_dob_verified badge.
 * Address fields are stored in user.metadata.
 */
import View from '@core/View.js';
import Dialog from '@core/views/feedback/Dialog.js';

export default class ProfilePersonalSection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-personal-section',
            template: `
                <style>
                    .pp-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.75rem; }
                    .pp-section-label:first-child { margin-top: 0; }
                    .pp-field-row { display: flex; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid #f0f0f0; }
                    .pp-field-row:last-child { border-bottom: none; }
                    .pp-field-label { width: 130px; font-size: 0.8rem; color: #6c757d; flex-shrink: 0; }
                    .pp-field-value { flex: 1; font-size: 0.88rem; color: #212529; display: flex; align-items: center; gap: 0.4rem; }
                    .pp-field-action { color: #6c757d; cursor: pointer; font-size: 0.8rem; margin-left: auto; padding: 0.15rem 0.4rem; border-radius: 4px; background: none; border: none; }
                    .pp-field-action:hover { background: #f0f0f0; color: #0d6efd; }
                    .pp-badge-ok { font-size: 0.65rem; padding: 0.15em 0.45em; background: #d1e7dd; color: #0f5132; border-radius: 3px; }
                    .pp-badge-warn { font-size: 0.65rem; padding: 0.15em 0.45em; background: #fff3cd; color: #856404; border-radius: 3px; }
                    .pp-not-set { color: #adb5bd; font-style: italic; font-size: 0.85rem; }
                </style>

                <!-- Name -->
                <div class="pp-section-label">Name</div>
                <div class="pp-field-row">
                    <div class="pp-field-label">Display Name</div>
                    <div class="pp-field-value">
                        {{#model.display_name}}{{model.display_name}}{{/model.display_name}}
                        {{^model.display_name}}<span class="pp-not-set">Not set</span>{{/model.display_name}}
                    </div>
                    <button type="button" class="pp-field-action" data-action="edit-display-name" title="Edit"><i class="bi bi-pencil"></i></button>
                </div>
                <div class="pp-field-row">
                    <div class="pp-field-label">First Name</div>
                    <div class="pp-field-value">
                        {{#model.first_name}}{{model.first_name}}{{/model.first_name}}
                        {{^model.first_name}}<span class="pp-not-set">Not set</span>{{/model.first_name}}
                    </div>
                    <button type="button" class="pp-field-action" data-action="edit-first-name" title="Edit"><i class="bi bi-pencil"></i></button>
                </div>
                <div class="pp-field-row">
                    <div class="pp-field-label">Last Name</div>
                    <div class="pp-field-value">
                        {{#model.last_name}}{{model.last_name}}{{/model.last_name}}
                        {{^model.last_name}}<span class="pp-not-set">Not set</span>{{/model.last_name}}
                    </div>
                    <button type="button" class="pp-field-action" data-action="edit-last-name" title="Edit"><i class="bi bi-pencil"></i></button>
                </div>

                <!-- Details -->
                <div class="pp-section-label">Details</div>
                <div class="pp-field-row">
                    <div class="pp-field-label">Date of Birth</div>
                    <div class="pp-field-value">
                        {{#hasDob|bool}}
                            {{dobFormatted}}
                            {{#model.is_dob_verified|bool}}<span class="pp-badge-ok">Verified</span>{{/model.is_dob_verified|bool}}
                            {{^model.is_dob_verified|bool}}<span class="pp-badge-warn">Unverified</span>{{/model.is_dob_verified|bool}}
                        {{/hasDob|bool}}
                        {{^hasDob|bool}}<span class="pp-not-set">Not set</span>{{/hasDob|bool}}
                    </div>
                    <button type="button" class="pp-field-action" data-action="edit-dob" title="Edit"><i class="bi bi-pencil"></i></button>
                </div>
                <div class="pp-field-row">
                    <div class="pp-field-label">Timezone</div>
                    <div class="pp-field-value">{{timezoneDisplay}}</div>
                    <button type="button" class="pp-field-action" data-action="edit-timezone" title="Edit"><i class="bi bi-pencil"></i></button>
                </div>

                <!-- Address -->
                <div class="pp-section-label">Address</div>
                <div class="pp-field-row">
                    <div class="pp-field-label">Address</div>
                    <div class="pp-field-value">
                        {{#hasAddress|bool}}
                            {{addressSummary}}
                        {{/hasAddress|bool}}
                        {{^hasAddress|bool}}
                            <span class="pp-not-set">Not set</span>
                        {{/hasAddress|bool}}
                    </div>
                    <button type="button" class="pp-field-action" data-action="edit-address" title="Edit"><i class="bi bi-pencil"></i></button>
                </div>
            `,
            ...options
        });
    }

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
        const parts = [meta.street, meta.city, meta.state, meta.zip, meta.country].filter(Boolean);
        return parts.join(', ');
    }

    async onActionEditDisplayName() {
        const name = await Dialog.prompt(
            'Enter your display name:',
            'Display Name',
            { defaultValue: this.model.get('display_name') || '' }
        );
        if (name !== null && name.trim()) {
            const resp = await this.model.save({ display_name: name.trim() });
            if (resp.status === 200) {
                this.getApp()?.toast?.success('Display name updated');
                await this.render();
            } else {
                this.getApp()?.toast?.error('Failed to update display name');
            }
        }
        return true;
    }

    async onActionEditFirstName() {
        const name = await Dialog.prompt(
            'Enter your first name:',
            'First Name',
            { defaultValue: this.model.get('first_name') || '' }
        );
        if (name !== null) {
            const resp = await this.model.save({ first_name: name.trim() });
            if (resp.status === 200) {
                this.getApp()?.toast?.success('First name updated');
                await this.render();
            } else {
                this.getApp()?.toast?.error('Failed to update first name');
            }
        }
        return true;
    }

    async onActionEditLastName() {
        const name = await Dialog.prompt(
            'Enter your last name:',
            'Last Name',
            { defaultValue: this.model.get('last_name') || '' }
        );
        if (name !== null) {
            const resp = await this.model.save({ last_name: name.trim() });
            if (resp.status === 200) {
                this.getApp()?.toast?.success('Last name updated');
                await this.render();
            } else {
                this.getApp()?.toast?.error('Failed to update last name');
            }
        }
        return true;
    }

    async onActionEditDob() {
        const data = await Dialog.showForm({
            title: 'Date of Birth',
            size: 'sm',
            fields: [{
                name: 'dob',
                type: 'date',
                label: 'Date of Birth',
                cols: 12
            }],
            data: { dob: this.model.get('dob') || '' }
        });
        if (!data) return true;

        const resp = await this.model.save({ dob: data.dob || null });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Date of birth updated');
            await this.render();
        } else {
            this.getApp()?.toast?.error('Failed to update date of birth');
        }
        return true;
    }

    async onActionEditTimezone() {
        const meta = this.model.get('metadata') || {};
        const data = await Dialog.showForm({
            title: 'Change Timezone',
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
            data: { timezone: meta.timezone || '' },
            size: 'sm'
        });
        if (!data) return true;

        const updatedMeta = { ...meta, timezone: data.timezone };
        const resp = await this.model.save({ metadata: updatedMeta });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Timezone updated');
            await this.render();
        } else {
            this.getApp()?.toast?.error('Failed to update timezone');
        }
        return true;
    }

    async onActionEditAddress() {
        const meta = this.model.get('metadata') || {};
        const data = await Dialog.showForm({
            title: 'Edit Address',
            size: 'md',
            fields: [
                { name: 'street', type: 'text', label: 'Street', placeholder: '123 Main St', cols: 12 },
                { name: 'city', type: 'text', label: 'City', cols: 6 },
                { name: 'state', type: 'text', label: 'State / Province', cols: 6 },
                { name: 'zip', type: 'text', label: 'Zip / Postal Code', cols: 6 },
                { name: 'country', type: 'text', label: 'Country', cols: 6 }
            ],
            data: {
                street: meta.street || '',
                city: meta.city || '',
                state: meta.state || '',
                zip: meta.zip || '',
                country: meta.country || ''
            }
        });

        if (!data) return true;

        const updatedMeta = {
            ...meta,
            street: data.street || '',
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
            country: data.country || ''
        };
        const resp = await this.model.save({ metadata: updatedMeta });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Address updated');
            await this.render();
        } else {
            this.getApp()?.toast?.error('Failed to update address');
        }
        return true;
    }
}
