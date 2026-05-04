/**
 * PasskeySetupView - Post-login passkey setup prompt
 *
 * Compact centered dialog body shown after login to encourage
 * users to register a passkey. Create / Skip / Don't ask again.
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import { Passkey } from '@core/models/Passkeys.js';

export default class PasskeySetupView extends View {
    constructor(options = {}) {
        super({
            className: 'passkey-setup-view',
            template: `
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

    async _askPasskeyName() {
        const suggested = Passkey.suggestName();
        return Modal.dialog({
            title: '<i class="bi bi-fingerprint me-2"></i>Register a Passkey',
            size: 'sm',
            centered: true,
            body: `
                <div style="text-align:center; padding: 0.5rem 0 1rem;">
                    <div class="up-hero-circle-primary">
                        <i class="bi bi-fingerprint"></i>
                    </div>
                    <p class="up-help-text">
                        Passkeys use your device's biometrics — fingerprint, face, or PIN — instead of a password.
                        They're <strong>phishing-resistant</strong> and the private key never leaves your device.
                    </p>
                    <div class="text-start" style="margin-bottom:0.25rem;">
                        <label class="form-label fw-semibold" style="font-size:0.82rem;">Name this passkey</label>
                        <input type="text" class="form-control" id="pks-name-input" value="${suggested}" placeholder="e.g., My MacBook" style="border-radius:8px;">
                        <div class="form-text">A label so you can identify this passkey later.</div>
                    </div>
                </div>`,
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', dismiss: true },
                {
                    text: '<i class="bi bi-fingerprint me-1"></i>Continue',
                    class: 'btn-primary',
                    handler: ({ dialog }) => {
                        const input = dialog.element?.querySelector('#pks-name-input');
                        return input?.value?.trim() || suggested;
                    }
                }
            ]
        });
    }

    static showSuccess(name) {
        return Modal.dialog({
            title: '<span class="text-success"><i class="bi bi-check-circle-fill me-2"></i>Passkey Registered</span>',
            size: 'sm',
            centered: true,
            body: `
                <div style="text-align:center; padding: 0.5rem 0 0.75rem;">
                    <div class="up-hero-circle-success">
                        <i class="bi bi-shield-lock-fill"></i>
                    </div>
                    <h6 class="fw-bold mb-2">${name || 'Your passkey'} is ready</h6>
                    <p class="up-help-text-bottom">
                        Next time you sign in, choose <strong>"Login with Passkey"</strong> — no username or password needed.
                        Just your fingerprint, face, or device PIN.
                    </p>
                </div>`,
            buttons: [
                { text: 'Done', class: 'btn-success', value: true }
            ]
        });
    }

    static showError(message) {
        return Modal.alert({
            title: 'Passkey Error',
            message: message || 'Something went wrong during passkey registration.',
            type: 'error'
        });
    }

    async onActionCreatePasskey() {
        try {
            // 1. Ask for friendly name
            const friendlyName = await this._askPasskeyName();
            if (!friendlyName) return true;

            // 2. Full WebAuthn flow (begin → biometric → complete)
            const result = await Passkey.register(friendlyName);

            if (result.success) {
                localStorage.setItem('passkey_setup_dismissed', '1');
                await PasskeySetupView.showSuccess(friendlyName);
                this.emit('dismiss');
            } else {
                PasskeySetupView.showError(result.error);
            }
        } catch (err) {
            if (err.name === 'NotAllowedError') return true;
            if (err.name === 'SecurityError') {
                PasskeySetupView.showError('Passkeys are not supported on this domain. Ensure you are using HTTPS.');
            } else {
                console.error('Passkey registration error:', err);
                PasskeySetupView.showError(err.message || 'An unexpected error occurred.');
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
