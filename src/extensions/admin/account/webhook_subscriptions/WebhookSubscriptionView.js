/**
 * WebhookSubscriptionView - Group-scoped webhook subscription detail and
 * management interface.
 *
 * Mirrors the shape of `ApiKeyView` — a flat header with a kebab menu
 * for Edit / Activate-Deactivate / Delete, followed by URL / Events /
 * Metadata details.
 */

import View from '@core/View.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import {
    WebhookSubscription,
    WebhookSubscriptionForms
} from '@core/models/WebhookSubscription.js';

class WebhookSubscriptionView extends View {
    constructor(options = {}) {
        super({
            className: 'webhook-subscription-view',
            ...options
        });

        this.model = options.model || new WebhookSubscription(options.data || {});

        this.template = `
            <div class="webhook-subscription-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 text-primary">
                            <i class="bi bi-broadcast"></i>
                        </div>
                        <div class="min-width-0">
                            <h3 class="mb-1 text-break font-monospace">{{model.url|default('—')}}</h3>
                            <div class="text-muted small">
                                ID: {{model.id}}
                                <span class="mx-2">|</span>
                                Group: {{model.group.name|default(model.group)}}
                            </div>
                            <div class="mt-1">
                                <span class="badge {{model.is_active|boolean('bg-success','bg-secondary')}}">
                                    {{model.is_active|boolean('Active','Inactive')}}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex align-items-start gap-4">
                        <div class="text-end">
                            <div class="text-muted small">Created</div>
                            <div>{{model.created|datetime}}</div>
                        </div>
                        <div data-container="webhook-subscription-context-menu"></div>
                    </div>
                </div>

                <!-- Details -->
                <div class="list-group mb-3">
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Events</h6>
                        {{#hasEvents|bool}}
                            {{#eventsList}}<code class="badge text-bg-light border me-1">{{key}}</code>{{/eventsList}}
                        {{/hasEvents|bool}}
                        {{^hasEvents|bool}}
                            <span class="text-secondary fst-italic small">No events configured</span>
                        {{/hasEvents|bool}}
                    </div>
                    {{#hasMetadata|bool}}
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Metadata</h6>
                        <pre class="mb-0 small">{{model.metadata|json}}</pre>
                    </div>
                    {{/hasMetadata|bool}}
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Delivery</h6>
                        <p class="mb-0 small text-muted">
                            Active subscriptions receive HMAC-signed POSTs with
                            the per-group webhook secret. Consumers verify the
                            signature using the secret available from the
                            group's <em>Webhooks</em> panel.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    // ── Computed properties bound by Mustache ─────────

    get _eventsRaw() {
        return this.model?.get?.('events');
    }

    /**
     * Coerce `events` into a `[{ key }]` shape suitable for Mustache
     * iteration. Returning raw strings would trigger a pipe-formatter
     * lookup on the value (e.g. "Formatter 'invoice.paid' not found")
     * — same gotcha called out in ApiKeyListItem.permsList.
     */
    get eventsList() {
        const raw = this._eventsRaw;
        if (Array.isArray(raw)) return raw.filter(Boolean).map(key => ({ key }));
        if (typeof raw === 'string') {
            return raw.split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .map(key => ({ key }));
        }
        return [];
    }

    get hasEvents() {
        return this.eventsList.length > 0;
    }

    get hasMetadata() {
        const m = this.model?.get?.('metadata');
        return !!(m && typeof m === 'object' && Object.keys(m).length > 0);
    }

    async onInit() {
        const isActive = this.model.get('is_active');

        const menu = new ContextMenu({
            containerId: 'webhook-subscription-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit', action: 'edit-subscription', icon: 'bi-pencil' },
                    isActive
                        ? { label: 'Deactivate', action: 'deactivate-subscription', icon: 'bi-x-circle' }
                        : { label: 'Activate',   action: 'activate-subscription',   icon: 'bi-check-circle' },
                    { type: 'divider' },
                    { label: 'Delete Subscription', action: 'delete-subscription', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(menu);
    }

    async onActionEditSubscription() {
        const app = this.getApp();
        const resp = await app.showModelForm({
            title: `Edit Webhook Subscription — ${this.model.get('url') || '#' + this.model.get('id')}`,
            model: this.model,
            formConfig: WebhookSubscriptionForms.edit,
            onSubmit: async (data) => {
                const payload = WebhookSubscriptionForms.normalizePayload(data);
                return this.model.save(payload);
            }
        });
        if (resp) {
            this.render();
        }
    }

    async onActionDeactivateSubscription() {
        const app = this.getApp();
        app.showLoading();
        const resp = await this.model.save({ is_active: false });
        app.hideLoading();
        if (resp && resp.success !== false) {
            app.toast.success('Subscription deactivated');
            this.render();
        } else {
            app.toast.error('Failed to deactivate subscription');
        }
    }

    async onActionActivateSubscription() {
        const app = this.getApp();
        app.showLoading();
        const resp = await this.model.save({ is_active: true });
        app.hideLoading();
        if (resp && resp.success !== false) {
            app.toast.success('Subscription activated');
            this.render();
        } else {
            app.toast.error('Failed to activate subscription');
        }
    }

    async onActionDeleteSubscription() {
        const app = this.getApp();
        const confirmed = await app.confirm({
            title: 'Delete Subscription',
            message: `Permanently delete the subscription to "${this.model.get('url')}"? Future events will no longer be delivered to this URL.`,
            confirmLabel: 'Delete',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return;

        app.showLoading();
        const resp = await this.model.destroy();
        app.hideLoading();
        if (resp && resp.success !== false) {
            app.toast.success('Subscription deleted');
            this.emit('deleted', { model: this.model });
        } else {
            app.toast.error('Failed to delete subscription');
        }
    }
}

WebhookSubscription.VIEW_CLASS = WebhookSubscriptionView;
export default WebhookSubscriptionView;
