import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/**
 * WebhookSubscription - Group-scoped webhook receiver registration.
 * Maps to REST endpoints under /api/group/webhook_subscriptions.
 *
 * Fields:
 *   - id          : Number
 *   - group       : { id, name } | Number   (FK → account.Group)
 *   - url         : String (https-only, enforced server-side)
 *   - events      : String[] (free-form event names, no central registry)
 *   - is_active   : Boolean (default true)
 *   - metadata    : Object  (optional free-form JSON)
 *   - created     : Number  (epoch seconds)
 *   - modified    : Number  (epoch seconds)
 *
 * Endpoints:
 *   GET    /api/group/webhook_subscriptions          - List (filter by ?group=<id>)
 *   POST   /api/group/webhook_subscriptions          - Create
 *   GET    /api/group/webhook_subscriptions/<id>     - Get details
 *   POST   /api/group/webhook_subscriptions/<id>     - Update
 *   DELETE /api/group/webhook_subscriptions/<id>     - Delete
 *
 * Permission threshold: manage_group / manage_groups / groups
 * (same as ApiKey CRUD).
 *
 * Signing secret (separate endpoint, per-Group HMAC, not per-subscription):
 *   POST /api/group/webhook_secret                 - Reveal current secret
 *   POST /api/group/webhook_secret {"rotate":true} - Rotate (invalidates old)
 */
class WebhookSubscription extends Model {
    constructor(data = {}, options = {}) {
        super(data, {
            endpoint: '/api/group/webhook_subscriptions',
            ...options
        });
    }

    /**
     * Convenience: toggle `is_active` and PUT the change.
     * Used by the inline switch wiring in the GroupView Webhooks
     * section and by the ContextMenu in WebhookSubscriptionView.
     */
    toggleActive() {
        return this.save({ is_active: !this.get('is_active') });
    }
}

/**
 * WebhookSubscriptionList - Collection of WebhookSubscription rows.
 * Filter by group: new WebhookSubscriptionList({ params: { group: groupId } }).
 */
class WebhookSubscriptionList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: WebhookSubscription,
            endpoint: '/api/group/webhook_subscriptions',
            size: 25,
            ...options
        });
    }
}

/**
 * Forms configuration for WebhookSubscription.
 *
 * The `events` field uses the framework's TagInput (`type: 'tags'`).
 * TagInput emits a comma-separated string in its `change` payload — the
 * shared `normalizePayload` helper below converts that into the array
 * shape the server expects. Both GroupView and WebhookSubscriptionTablePage
 * call `normalizePayload` before `model.save(payload)` so the transform
 * lives in exactly one place.
 */
const WebhookSubscriptionForms = {
    create: {
        title: 'Create Webhook Subscription',
        fields: [
            {
                name: 'url',
                type: 'url',
                label: 'URL',
                placeholder: 'https://example.com/webhooks/mojo',
                required: true,
                columns: 12,
                help: 'Must use https://. Embedded credentials are rejected server-side.'
            },
            {
                name: 'events',
                type: 'tags',
                label: 'Events',
                placeholder: 'Press Enter or comma to add',
                columns: 12,
                help: 'Free-form event names published by the emitting service (e.g. invoice.paid, verification.completed). See your service’s documentation for the supported names.'
            },
            {
                name: 'is_active',
                type: 'switch',
                label: 'Active',
                value: true,
                columns: 12,
                help: 'Inactive subscriptions are skipped during fan-out.'
            },
            {
                name: 'group',
                type: 'number',
                label: 'Group ID',
                required: true,
                columns: 12,
                help: 'The group this subscription is scoped to.'
            }
        ]
    },

    edit: {
        title: 'Edit Webhook Subscription',
        fields: [
            {
                name: 'url',
                type: 'url',
                label: 'URL',
                required: true,
                columns: 12,
                help: 'Must use https://.'
            },
            {
                name: 'events',
                type: 'tags',
                label: 'Events',
                columns: 12,
                help: 'Free-form event names published by the emitting service.'
            },
            {
                name: 'is_active',
                type: 'switch',
                label: 'Active',
                columns: 12,
                help: 'Deactivate to suspend deliveries without deleting.'
            },
            {
                name: 'metadata',
                type: 'textarea',
                label: 'Metadata (JSON)',
                placeholder: '{}',
                columns: 12,
                help: 'Optional. Free-form JSON object stored alongside the subscription.'
            }
        ]
    },

    /**
     * Normalize a raw form payload into the shape the server expects.
     *
     * The only transform today is `events`: TagInput hands us a
     * comma-separated string (its `change` event's `value` field), but
     * the backend stores `events` as a JSON list. We split, trim, and
     * drop empties. Arrays pass through unchanged so callers can hand
     * us either shape without thinking about it.
     *
     * Returns a NEW object — does not mutate the input.
     */
    normalizePayload(formData) {
        const payload = { ...(formData || {}) };
        const events = payload.events;
        if (typeof events === 'string') {
            payload.events = events
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);
        }
        return payload;
    }
};

export { WebhookSubscription, WebhookSubscriptionList, WebhookSubscriptionForms };
