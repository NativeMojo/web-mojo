import View from '@core/View.js';
import DataView from '@core/views/data/DataView.js';

class PushDeviceView extends View {
    constructor(options = {}) {
        super({
            className: 'push-device-view',
            ...options
        });
        this.model = options.model;
    }

    getTemplate() {
        return `
            <div class="p-3">
                <h3>{{model.device_name}}</h3>
                <p class="text-muted">{{model.user.display_name}}</p>
                <div data-container="data-view"></div>
            </div>
        `;
    }

    onInit() {
        this.dataView = new DataView({
            containerId: 'data-view',
            model: this.model,
            fields: [
                { name: 'platform', label: 'Platform', format: 'badge' },
                { name: 'push_enabled', label: 'Push Enabled', format: 'boolean' },
                { name: 'app_version', label: 'App Version' },
                { name: 'os_version', label: 'OS Version' },
                { name: 'last_seen', label: 'Last Seen', format: 'datetime' },
                { name: 'push_preferences', label: 'Preferences', format: 'json' },
            ]
        });
        this.addChild(this.dataView);
    }
}

export default PushDeviceView;
