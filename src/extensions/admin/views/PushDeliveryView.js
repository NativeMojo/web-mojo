import View from '@core/View.js';

class PushDeliveryView extends View {
    constructor(options = {}) {
        super({
            className: 'push-delivery-view',
            ...options
        });
        this.model = options.model;
    }

    getTemplate() {
        return `
            <div class="p-3">
                <div class="phone-mockup">
                    <div class="phone-screen">
                        <div class="notification">
                            <div class="notification-header">
                                <i class="bi bi-app-indicator"></i>
                                <strong>Your App</strong>
                                <span class="ms-auto small text-muted">now</span>
                            </div>
                            <div class="notification-body">
                                <div class="fw-bold">{{model.title}}</div>
                                <div>{{model.body}}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-3">
                    <h5>Delivery Details</h5>
                    <p><strong>Status:</strong> <span class="badge {{model.status|badge}}">{{model.status}}</span></p>
                    <p><strong>Error:</strong> {{model.error_message|default('None')}}</p>
                </div>
            </div>
        `;
    }
}

export default PushDeliveryView;
