/**
 * PasskeySetupView - Post-login passkey setup prompt
 *
 * Compact centered dialog body shown after login to encourage
 * users to register a passkey. Create / Skip / Don't ask again.
 */
import View from '@core/View.js';
import Dialog from '@core/views/feedback/Dialog.js';
import { Passkey } from '@core/models/Passkeys.js';

export default class PasskeySetupView extends View {
    constructor(options = {}) {
        super({
            className: 'passkey-setup-view',
            template: `
                <style>
                    .pks-body { padding: 2rem 1.75rem 1rem; text-align: center; }
                    .pks-icon { width: 56px; height: 56px; background: #e7f1ff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #0d6efd; margin-bottom: 1rem; }
                    .pks-body h5 { font-weight: 700; font-size: 1.05rem; margin-bottom: 0.35rem; }
                    .pks-body p { font-size: 0.83rem; color: #6c757d; margin-bottom: 1.25rem; line-height: 1.45; }
                    .pks-footer { padding: 0 1.75rem 1.5rem; display: flex; flex-direction: column; gap: 0.4rem; }
                    .pks-footer .btn-create { padding: 0.6rem; font-weight: 600; font-size: 0.9rem; border-radius: 8px; }
                    .pks-footer .btn-skip { background: none; border: none; color: #6c757d; font-size: 0.82rem; padding: 0.4rem; cursor: pointer; }
                    .pks-footer .btn-skip:hover { color: #495057; }
                    .pks-dont-show { text-align: center; padding: 0 1.75rem 1.25rem; }
                    .pks-dont-show label { font-size: 0.73rem; color: #adb5bd; cursor: pointer; }
                </style>

                <div class="pks-body">
                    <div class="pks-icon"><i class="bi bi-fingerprint"></i></div>
                    <h5>Add a Passkey</h5>
                    <p>Sign in faster with Face ID, Touch ID, or your device PIN. No passwords needed.</p>
                </div>
                <div class="pks-footer">
                    <button class="btn btn-primary btn-create" data-action="create-passkey"><i class="bi bi-fingerprint me-1"></i>Create Passkey</button>
                    <button class="btn-skip" data-action="skip">Not now</button>
                </div>
                <div class="pks-dont-show">
                    <label><input type="checkbox" class="form-check-input form-check-input-sm me-1" data-action="dont-ask"> Don't ask again</label>
                </div>
            `,
            ...options
        });
    }

    _base64urlToBytes(base64url) {
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
    }

    async onActionCreatePasskey() {
        try {
            const beginResp = await Passkey.registerBegin();
            if (!beginResp.success || !beginResp.data) {
                this.getApp()?.toast?.error('Failed to start passkey registration');
                return true;
            }

            const options = beginResp.data.data || beginResp.data;
            const publicKey = options.publicKey;

            // Override rp.id to match current domain (server may return production domain)
            if (publicKey.rp) {
                publicKey.rp.id = window.location.hostname;
            }

            // Decode challenge and user.id from base64url
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
                return true;
            }

            // Prompt for friendly name
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
                // Dismiss after successful registration
                localStorage.setItem('passkey_setup_dismissed', '1');
                this.emit('dismiss');
            } else {
                this.getApp()?.toast?.error(completeResp.error || 'Failed to register passkey');
            }
        } catch (err) {
            if (err.name === 'NotAllowedError') return true;
            if (err.name === 'SecurityError') {
                this.getApp()?.toast?.error('Passkeys are not supported on this domain');
            } else {
                console.error('Passkey registration error:', err);
                this.getApp()?.toast?.error('Passkey registration failed');
            }
        }
        return true;
    }

    async onActionSkip() {
        this.emit('dismiss');
        return true;
    }

    async onActionDontAsk() {
        const checkbox = this.element?.querySelector('.pks-dont-show input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
            localStorage.setItem('passkey_setup_dismissed', '1');
            this.emit('dismiss');
        } else {
            localStorage.removeItem('passkey_setup_dismissed');
        }
        return true;
    }
}
