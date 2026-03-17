/**
 * ProfileNotificationsSection - Notification preferences tab
 *
 * Per-kind, per-channel toggle grid. Kinds are dynamically loaded
 * from the API. Channels: in_app, email, push.
 */
import View from '@core/View.js';
import rest from '@core/Rest.js';

const CHANNEL_LABELS = {
    in_app: 'In-App',
    email: 'Email',
    push: 'Push'
};

const CHANNELS = ['in_app', 'email', 'push'];

export default class ProfileNotificationsSection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-notifications-section',
            template: `
                <style>
                    .pn-table { width: 100%; border-collapse: collapse; }
                    .pn-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; padding: 0.5rem 0.75rem; border-bottom: 2px solid #e9ecef; }
                    .pn-table th:first-child { text-align: left; }
                    .pn-table th:not(:first-child) { text-align: center; width: 80px; }
                    .pn-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid #f0f0f0; }
                    .pn-table td:first-child { font-size: 0.88rem; font-weight: 500; text-transform: capitalize; }
                    .pn-table td:not(:first-child) { text-align: center; }
                    .pn-table tr:last-child td { border-bottom: none; }
                    .pn-empty { text-align: center; padding: 2rem 1rem; color: #6c757d; }
                    .pn-empty i { font-size: 2rem; color: #ced4da; display: block; margin-bottom: 0.5rem; }
                </style>

                {{#hasPreferences|bool}}
                <table class="pn-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            {{#channels}}
                                <th>{{.label}}</th>
                            {{/channels}}
                        </tr>
                    </thead>
                    <tbody>
                        {{#preferenceRows}}
                        <tr>
                            <td>{{.kindLabel}}</td>
                            {{#.toggles}}
                                <td>
                                    <input type="checkbox" class="form-check-input"
                                        data-action="toggle-pref"
                                        data-kind="{{.kind}}"
                                        data-channel="{{.channel}}"
                                        {{#.checked}}checked{{/.checked}}>
                                </td>
                            {{/.toggles}}
                        </tr>
                        {{/preferenceRows}}
                    </tbody>
                </table>
                {{/hasPreferences|bool}}
                {{^hasPreferences|bool}}
                <div class="pn-empty">
                    <i class="bi bi-bell"></i>
                    No notification preferences configured
                    <div style="font-size: 0.78rem; margin-top: 0.5rem;">
                        Preferences will appear here once notification types are defined.
                    </div>
                </div>
                {{/hasPreferences|bool}}
            `,
            ...options
        });
        this.preferences = {};
    }

    get channels() {
        return CHANNELS.map(ch => ({ key: ch, label: CHANNEL_LABELS[ch] || ch }));
    }

    get hasPreferences() {
        return Object.keys(this.preferences).length > 0;
    }

    get preferenceRows() {
        return Object.keys(this.preferences).sort().map(kind => ({
            kind,
            kindLabel: kind.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            toggles: CHANNELS.map(channel => ({
                kind,
                channel,
                checked: this.preferences[kind]?.[channel] !== false
            }))
        }));
    }

    async onBeforeRender() {
        try {
            const resp = await rest.GET('/api/account/notification/preferences', {}, { dataOnly: true });
            this.preferences = resp?.data?.preferences || resp?.data || {};
        } catch (e) {
            this.preferences = {};
        }
    }

    async onActionTogglePref(event, el) {
        const kind = el.dataset.kind;
        const channel = el.dataset.channel;
        const checked = el.checked;

        // Update local state
        if (!this.preferences[kind]) {
            this.preferences[kind] = {};
        }
        this.preferences[kind][channel] = checked;

        // Save to API
        try {
            const resp = await rest.POST('/api/account/notification/preferences', {
                preferences: { [kind]: { [channel]: checked } }
            });
            if (!resp.success) {
                this.getApp()?.toast?.error(resp.message || 'Failed to update preference');
                el.checked = !checked; // revert
            }
        } catch (e) {
            this.getApp()?.toast?.error('Failed to update preference');
            el.checked = !checked; // revert
        }
        return true;
    }
}
