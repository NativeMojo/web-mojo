import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/**
 * BouncerDevice - A tracked device fingerprint in the Bouncer fraud-detection system.
 * Maps to REST endpoints under /api/account/bouncer/device
 *
 * Key fields: muid, duid, fingerprint_id, risk_tier, event_count,
 *             block_count, last_seen_ip, linked_muids, last_seen
 *
 * Endpoints:
 *   GET    /api/account/bouncer/device          - List devices
 *   GET    /api/account/bouncer/device/<id>     - Get device details
 *   POST   /api/account/bouncer/device/<id>     - Update device
 *   DELETE /api/account/bouncer/device/<id>     - Delete device
 */
class BouncerDevice extends Model {
    constructor(data = {}, options = {}) {
        super(data, {
            endpoint: '/api/account/bouncer/device',
            ...options
        });
    }
}

/**
 * BouncerDeviceList - Collection of BouncerDevice records.
 * Filter by account or risk tier via query params.
 */
class BouncerDeviceList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: BouncerDevice,
            endpoint: '/api/account/bouncer/device',
            size: 25,
            ...options
        });
    }
}

/**
 * BouncerSignal - A captured request signal evaluated by the Bouncer risk engine.
 * Maps to REST endpoints under /api/account/bouncer/signal
 *
 * Key fields: muid, stage, ip_address, page_type, risk_score,
 *             decision, triggered_signals, raw_signals, server_signals
 *
 * Endpoints:
 *   GET    /api/account/bouncer/signal          - List signals
 *   GET    /api/account/bouncer/signal/<id>     - Get signal details
 *   POST   /api/account/bouncer/signal/<id>     - Update signal
 *   DELETE /api/account/bouncer/signal/<id>     - Delete signal
 */
class BouncerSignal extends Model {
    constructor(data = {}, options = {}) {
        super(data, {
            endpoint: '/api/account/bouncer/signal',
            ...options
        });
    }
}

/**
 * BouncerSignalList - Collection of BouncerSignal records.
 * Filter by muid, decision, or risk_score via query params.
 */
class BouncerSignalList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: BouncerSignal,
            endpoint: '/api/account/bouncer/signal',
            size: 25,
            ...options
        });
    }
}

/**
 * BouncerSignature - A detection signature used by Bouncer to match known threat patterns.
 * Maps to REST endpoints under /api/account/bouncer/signature
 *
 * Key fields: sig_type, value, source, confidence, hit_count,
 *             block_count, is_active, expires_at, notes
 *
 * Endpoints:
 *   GET    /api/account/bouncer/signature          - List signatures
 *   POST   /api/account/bouncer/signature          - Create a signature
 *   GET    /api/account/bouncer/signature/<id>     - Get signature details
 *   POST   /api/account/bouncer/signature/<id>     - Update signature
 *   DELETE /api/account/bouncer/signature/<id>     - Delete signature
 */
class BouncerSignature extends Model {
    constructor(data = {}, options = {}) {
        super(data, {
            endpoint: '/api/account/bouncer/signature',
            ...options
        });
    }
}

/**
 * BouncerSignatureList - Collection of BouncerSignature records.
 * Filter by sig_type, is_active, or source via query params.
 */
class BouncerSignatureList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: BouncerSignature,
            endpoint: '/api/account/bouncer/signature',
            size: 25,
            ...options
        });
    }
}

/**
 * Forms configuration for BouncerSignature
 */
const BouncerSignatureForms = {
    create: {
        title: 'Create Signature',
        fields: [
            {
                name: 'sig_type',
                type: 'select',
                label: 'Signature Type',
                required: true,
                columns: 6,
                options: [
                    { value: 'user_agent', label: 'User Agent' },
                    { value: 'ip_pattern', label: 'IP Pattern' },
                    { value: 'fingerprint', label: 'Fingerprint' },
                    { value: 'behavior', label: 'Behavior' },
                    { value: 'header', label: 'Header' },
                    { value: 'cookie', label: 'Cookie' }
                ]
            },
            {
                name: 'value',
                type: 'text',
                label: 'Value',
                required: true,
                columns: 6,
                help: 'The pattern or value to match against.'
            },
            {
                name: 'confidence',
                type: 'number',
                label: 'Confidence',
                columns: 6,
                default: 80,
                min: 0,
                max: 100,
                help: 'Confidence level from 0 to 100.'
            },
            {
                name: 'notes',
                type: 'textarea',
                label: 'Notes',
                columns: 12,
                help: 'Optional notes about this signature.'
            },
            {
                name: 'is_active',
                type: 'switch',
                label: 'Active',
                columns: 6,
                default: true
            }
        ]
    },

    edit: {
        title: 'Edit Signature',
        fields: [
            {
                name: 'sig_type',
                type: 'select',
                label: 'Signature Type',
                required: true,
                columns: 6,
                options: [
                    { value: 'user_agent', label: 'User Agent' },
                    { value: 'ip_pattern', label: 'IP Pattern' },
                    { value: 'fingerprint', label: 'Fingerprint' },
                    { value: 'behavior', label: 'Behavior' },
                    { value: 'header', label: 'Header' },
                    { value: 'cookie', label: 'Cookie' }
                ]
            },
            {
                name: 'value',
                type: 'text',
                label: 'Value',
                required: true,
                columns: 6,
                help: 'The pattern or value to match against.'
            },
            {
                name: 'confidence',
                type: 'number',
                label: 'Confidence',
                columns: 6,
                default: 80,
                min: 0,
                max: 100,
                help: 'Confidence level from 0 to 100.'
            },
            {
                name: 'notes',
                type: 'textarea',
                label: 'Notes',
                columns: 12,
                help: 'Optional notes about this signature.'
            },
            {
                name: 'is_active',
                type: 'switch',
                label: 'Active',
                columns: 6,
                default: true
            }
        ]
    }
};

export { BouncerDevice, BouncerDeviceList, BouncerSignal, BouncerSignalList, BouncerSignature, BouncerSignatureList, BouncerSignatureForms };
