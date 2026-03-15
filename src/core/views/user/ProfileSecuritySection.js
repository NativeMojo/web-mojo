/**
 * ProfileSecuritySection - Security dashboard tab
 *
 * Compact card rows. Password and Passkeys are actions (dialog/flow).
 * Sessions, Devices, Activity navigate to their own nav sections.
 */
import View from '@core/View.js';
import Dialog from '@core/views/feedback/Dialog.js';
import { Passkey, PasskeyList, PasskeyForms } from '@core/models/Passkeys.js';

export default class ProfileSecuritySection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-security-section',
            template: `
                <style>
                    .ps-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.75rem; }
                    .ps-section-label:first-child { margin-top: 0; }
                    .ps-item { display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem 1rem; border: 1px solid #f0f0f0; border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
                    .ps-item:hover { border-color: #dee2e6; background: #fafbfd; }
                    .ps-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
                    .ps-info { flex: 1; min-width: 0; }
                    .ps-title { font-weight: 600; font-size: 0.88rem; }
                    .ps-desc { font-size: 0.78rem; color: #6c757d; }
                    .ps-badge { font-size: 0.72rem; padding: 0.15em 0.5em; border-radius: 3px; flex-shrink: 0; }
                    .ps-chevron { color: #ced4da; font-size: 0.8rem; flex-shrink: 0; }
                </style>

                <div class="ps-section-label">Authentication</div>

                <div class="ps-item" data-action="change-password">
                    <div class="ps-icon bg-primary bg-opacity-10 text-primary"><i class="bi bi-lock"></i></div>
                    <div class="ps-info">
                        <div class="ps-title">Password</div>
                        <div class="ps-desc">Change your account password</div>
                    </div>
                    <span class="ps-badge bg-light text-muted border">Change</span>
                </div>

                <div class="ps-item" data-action="manage-passkeys">
                    <div class="ps-icon bg-success bg-opacity-10 text-success"><i class="bi bi-fingerprint"></i></div>
                    <div class="ps-info">
                        <div class="ps-title">Passkeys</div>
                        <div class="ps-desc">Passwordless sign-in with biometrics</div>
                    </div>
                    <i class="bi bi-chevron-right ps-chevron"></i>
                </div>

                <div class="ps-section-label">Sessions & Devices</div>

                <div class="ps-item" data-action="navigate" data-section="sessions">
                    <div class="ps-icon bg-info bg-opacity-10 text-info"><i class="bi bi-clock-history"></i></div>
                    <div class="ps-info">
                        <div class="ps-title">Active Sessions</div>
                        <div class="ps-desc">Manage where you're signed in</div>
                    </div>
                    <i class="bi bi-chevron-right ps-chevron"></i>
                </div>

                <div class="ps-item" data-action="navigate" data-section="devices">
                    <div class="ps-icon bg-warning bg-opacity-10 text-warning"><i class="bi bi-laptop"></i></div>
                    <div class="ps-info">
                        <div class="ps-title">Devices</div>
                        <div class="ps-desc">Registered devices</div>
                    </div>
                    <i class="bi bi-chevron-right ps-chevron"></i>
                </div>

                <div class="ps-section-label">Activity</div>

                <div class="ps-item" data-action="navigate" data-section="activity">
                    <div class="ps-icon bg-secondary bg-opacity-10 text-secondary"><i class="bi bi-activity"></i></div>
                    <div class="ps-info">
                        <div class="ps-title">Recent Activity</div>
                        <div class="ps-desc">Sign-in history and account events</div>
                    </div>
                    <i class="bi bi-chevron-right ps-chevron"></i>
                </div>
            `,
            ...options
        });
    }

    // --- Actions ---

    async onActionChangePassword() {
        const app = this.getApp();
        if (app && app.changePassword) {
            await app.changePassword();
        }
        return true;
    }

    async onActionManagePasskeys() {
        const collection = new PasskeyList({ params: { user: this.model.id } });
        try {
            await collection.fetch();
        } catch (e) {
            // ignore fetch errors
        }

        const items = collection.models || [];
        const view = new View({
            template: `
                <style>
                    .pk-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; border: 1px solid #f0f0f0; border-radius: 8px; margin-bottom: 0.4rem; }
                    .pk-icon { width: 32px; height: 32px; background: #e7f1ff; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #0d6efd; font-size: 0.9rem; flex-shrink: 0; }
                    .pk-info { flex: 1; min-width: 0; }
                    .pk-name { font-weight: 600; font-size: 0.85rem; }
                    .pk-meta { font-size: 0.73rem; color: #6c757d; }
                    .pk-actions { display: flex; gap: 0.25rem; }
                    .pk-actions .btn { padding: 0.2rem 0.4rem; font-size: 0.75rem; }
                    .pk-empty { text-align: center; padding: 2rem 1rem; color: #6c757d; }
                    .pk-empty i { font-size: 2rem; color: #ced4da; display: block; margin-bottom: 0.5rem; }
                </style>
                {{#passkeys}}
                    <div class="pk-row">
                        <div class="pk-icon"><i class="bi bi-fingerprint"></i></div>
                        <div class="pk-info">
                            <div class="pk-name">{{.friendly_name|default:'Unnamed Passkey'}}</div>
                            <div class="pk-meta">Created {{.created|date}} &middot; Last used {{.last_used|relative|default:'never'}} &middot; {{.sign_count}} uses</div>
                        </div>
                        <div class="pk-actions">
                            <button type="button" class="btn btn-outline-secondary" data-action="edit-passkey" data-id="{{.id}}" title="Edit"><i class="bi bi-pencil"></i></button>
                            <button type="button" class="btn btn-outline-danger" data-action="delete-passkey" data-id="{{.id}}" title="Delete"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                {{/passkeys}}
                {{^passkeys|bool}}
                    <div class="pk-empty">
                        <i class="bi bi-fingerprint"></i>
                        No passkeys registered yet
                    </div>
                {{/passkeys|bool}}
            `
        });
        view.passkeys = items.map(p => p.toJSON ? p.toJSON() : p);

        view.onActionEditPasskey = async (event, el) => {
            const id = el.dataset.id;
            const passkey = items.find(p => String(p.id) === String(id));
            if (passkey) {
                await Dialog.showModelForm({
                    title: 'Edit Passkey',
                    model: passkey,
                    fields: PasskeyForms.edit.fields,
                    size: 'sm'
                });
            }
            return true;
        };

        view.onActionDeletePasskey = async (event, el) => {
            const id = el.dataset.id;
            const confirmed = await Dialog.confirm('Delete this passkey? You won\'t be able to use it to sign in anymore.', 'Delete Passkey');
            if (confirmed) {
                const passkey = items.find(p => String(p.id) === String(id));
                if (passkey) {
                    await passkey.destroy();
                    this.getApp()?.toast?.success('Passkey deleted');
                }
            }
            return true;
        };

        const result = await Dialog.showDialog({
            title: 'Passkeys',
            body: view,
            size: 'md',
            buttons: [
                { text: 'Add Passkey', icon: 'bi-plus-lg', class: 'btn-primary', value: 'add' },
                { text: 'Close', class: 'btn-outline-secondary', dismiss: true }
            ]
        });

        if (result === 'add') {
            await this._registerPasskey();
        }
        return true;
    }

    _base64urlToBytes(base64url) {
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
    }

    async _registerPasskey() {
        try {
            const beginResp = await Passkey.registerBegin();
            if (!beginResp.success || !beginResp.data) {
                this.getApp()?.toast?.error('Failed to start passkey registration');
                return;
            }

            const options = beginResp.data.data || beginResp.data;
            const publicKey = options.publicKey;

            // Override rp.id to match current domain (server may return production domain)
            if (publicKey.rp) {
                publicKey.rp.id = window.location.hostname;
            }

            if (publicKey.challenge && typeof publicKey.challenge === 'string') {
                publicKey.challenge = this._base64urlToBytes(publicKey.challenge);
            }
            if (publicKey.user && publicKey.user.id && typeof publicKey.user.id === 'string') {
                publicKey.user.id = this._base64urlToBytes(publicKey.user.id);
            }
            if (publicKey.excludeCredentials) {
                publicKey.excludeCredentials = publicKey.excludeCredentials.map(cred => ({
                    ...cred,
                    id: typeof cred.id === 'string' ? this._base64urlToBytes(cred.id) : cred.id
                }));
            }

            const credential = await navigator.credentials.create({ publicKey });
            if (!credential) {
                this.getApp()?.toast?.error('Passkey creation was cancelled');
                return;
            }

            const friendlyName = await Dialog.prompt('Name this passkey:', 'Passkey Name', {
                defaultValue: '',
                placeholder: 'e.g., My MacBook'
            });

            const credentialData = {
                id: credential.id,
                rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
                type: credential.type,
                response: {
                    clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
                    attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject)))
                }
            };

            if (credential.response.getTransports) {
                credentialData.transports = credential.response.getTransports();
            }

            const completeResp = await Passkey.registerComplete({
                challenge_id: options.challenge_id,
                credential: credentialData,
                friendly_name: friendlyName || 'My Passkey'
            });

            if (completeResp.success) {
                this.getApp()?.toast?.success('Passkey registered successfully');
            } else {
                this.getApp()?.toast?.error(completeResp.error || 'Failed to register passkey');
            }
        } catch (err) {
            if (err.name === 'NotAllowedError') return;
            if (err.name === 'SecurityError') {
                this.getApp()?.toast?.error('Passkeys are not supported on this domain');
            } else {
                console.error('Passkey registration error:', err);
                this.getApp()?.toast?.error('Passkey registration failed');
            }
        }
    }

    // Navigate to sections in the parent UserProfileView
    async onActionNavigate(event, el) {
        if (this.parent && this.parent.onActionNavigate) {
            return this.parent.onActionNavigate(event, el);
        }
        return true;
    }
}
