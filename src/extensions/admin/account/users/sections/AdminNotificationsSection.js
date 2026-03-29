/**
 * AdminNotificationsSection - Admin view/edit of user notification preferences
 *
 * Per-kind, per-channel toggle grid. Uses admin-scoped endpoints.
 */
import View from '@core/View.js';
import rest from '@core/Rest.js';

const CHANNEL_LABELS = {
    in_app: 'In-App',
    email: 'Email',
    push: 'Push'
};

const CHANNELS = ['in_app', 'email', 'push'];

export default class AdminNotificationsSection extends View {
    constructor(options = {}) {
        super({
            className: 'admin-notifications-section',
            template: `
                <style>
                    .an-table { width: 100%; border-collapse: collapse; }
                    .an-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; padding: 0.5rem 0.75rem; border-bottom: 2px solid #e9ecef; }
                    .an-table th:first-child { text-align: left; }
                    .an-table th:not(:first-child) { text-align: center; width: 80px; }
                    .an-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid #f0f0f0; }
                    .an-table td:first-child { font-size: 0.88rem; font-weight: 500; text-transform: capitalize; }
                    .an-table td:not(:first-child) { text-align: center; }
                    .an-table tr:last-child td { border-bottom: none; }
                    .an-empty { text-align: center; padding: 2rem 1rem; color: #6c757d; }
                    .an-empty i { font-size: 2rem; color: #ced4da; display: block; margin-bottom: 0.5rem; }
                </style>

                {{#hasPreferences|bool}}
                <table class="an-table">
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
                <div class="an-empty">
                    <i class="bi bi-bell"></i>
                    No notification preferences configured
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
            const resp = await rest.GET('/api/account/notification/preferences', { user: this.model.id }, { dataOnly: true });
            this.preferences = resp?.data?.preferences || resp?.data || {};
        } catch (e) {
            this.preferences = {};
        }
    }

    async onActionTogglePref(event, el) {
        const kind = el.dataset.kind;
        const channel = el.dataset.channel;
        const checked = el.checked;

        if (!this.preferences[kind]) {
            this.preferences[kind] = {};
        }
        this.preferences[kind][channel] = checked;

        try {
            const resp = await rest.POST('/api/account/notification/preferences', {
                user: this.model.id,
                preferences: { [kind]: { [channel]: checked } }
            });
            if (!resp.success) {
                this.getApp()?.toast?.error(resp.message || 'Failed to update preference');
                el.checked = !checked;
            }
        } catch (e) {
            this.getApp()?.toast?.error('Failed to update preference');
            el.checked = !checked;
        }
        return true;
    }
}
