import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/* =========================
 * Constants
 * ========================= */

const SHORTLINK_SOURCE_OPTIONS = [
    { value: 'admin', label: 'Admin' },
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS' },
    { value: 'push', label: 'Push' },
    { value: 'fileman', label: 'File Manager' },
    { value: 'api', label: 'API' },
    { value: 'other', label: 'Other' },
];

const TWITTER_CARD_OPTIONS = [
    { value: '', label: '— None —' },
    { value: 'summary', label: 'summary' },
    { value: 'summary_large_image', label: 'summary_large_image' },
];

/* =========================
 * Metadata helpers
 * ========================= */

/**
 * Flatten a ShortLink metadata object (keys like "og:title") into sibling form
 * fields (og_title, twitter_card, ...). Used to seed edit dialogs.
 */
function flattenShortLinkMetadata(metadata = {}) {
    const m = metadata || {};
    return {
        og_title:            m['og:title']         || '',
        og_description:      m['og:description']   || '',
        og_image:            m['og:image']         || '',
        twitter_card:        m['twitter:card']     || '',
        twitter_title:       m['twitter:title']    || '',
        twitter_description: m['twitter:description'] || '',
        twitter_image:       m['twitter:image']    || '',
    };
}

/**
 * Inverse of flattenShortLinkMetadata — combines og_ and twitter_ form fields
 * into a flat metadata object with colon-keyed keys. Empty values are dropped.
 */
function buildShortLinkMetadata(formData = {}) {
    const map = {
        og_title: 'og:title',
        og_description: 'og:description',
        og_image: 'og:image',
        twitter_card: 'twitter:card',
        twitter_title: 'twitter:title',
        twitter_description: 'twitter:description',
        twitter_image: 'twitter:image',
    };
    const metadata = {};
    for (const [flatKey, targetKey] of Object.entries(map)) {
        const v = formData[flatKey];
        if (v !== undefined && v !== null && v !== '') {
            metadata[targetKey] = v;
        }
    }
    return metadata;
}

/**
 * Pull og_ and twitter_ fields out of a form-data object and collapse them into
 * `metadata`. Returns a new object safe to send to the REST API. If no OG or
 * Twitter fields are set, `metadata` is omitted entirely so the backend's
 * auto-scraper can fill in the gaps.
 */
function extractShortLinkPayload(formData = {}) {
    const flatKeys = [
        'og_title', 'og_description', 'og_image',
        'twitter_card', 'twitter_title', 'twitter_description', 'twitter_image',
    ];
    const payload = { ...formData };
    for (const k of flatKeys) delete payload[k];
    const metadata = buildShortLinkMetadata(formData);
    if (Object.keys(metadata).length > 0) {
        payload.metadata = metadata;
    }
    return payload;
}

/* =========================
 * ShortLink Model
 * ========================= */

class ShortLink extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/shortlink/link',
        });
    }
}

/* =========================
 * ShortLink Collection
 * ========================= */

class ShortLinkList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: ShortLink,
            endpoint: '/api/shortlink/link',
            ...options,
        });
    }
}

/* =========================
 * ShortLinkClick (read-only)
 * ========================= */

class ShortLinkClick extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/shortlink/history',
        });
    }
}

class ShortLinkClickList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: ShortLinkClick,
            endpoint: '/api/shortlink/history',
            ...options,
        });
    }
}

/* =========================
 * Forms
 * ========================= */

const _shortLinkSharedFields = [
    { name: 'url', type: 'url', label: 'Destination URL', required: true, placeholder: 'https://example.com/page', cols: 12 },
    { name: 'source', type: 'select', label: 'Source', options: SHORTLINK_SOURCE_OPTIONS, value: 'admin', cols: 6 },
    { name: 'expire_days', type: 'number', label: 'Expire (days)', value: 3, min: 0, cols: 3, help: '0 = never' },
    { name: 'expire_hours', type: 'number', label: 'Expire (hours)', value: 0, min: 0, cols: 3 },
    { name: 'track_clicks', type: 'switch', label: 'Track clicks', value: false, cols: 4, help: 'Record per-click history and per-link metrics.' },
    { name: 'bot_passthrough', type: 'switch', label: 'Bypass bot preview', value: false, cols: 4, help: 'Bots receive a plain redirect (use for transactional links).' },
    { name: 'is_protected', type: 'switch', label: 'Protected', value: false, cols: 4, help: 'Prevents accidental deletion.' },
    // ── OG Metadata (optional) ──
    { type: 'heading', label: 'OpenGraph Preview (optional)', cols: 12 },
    { name: 'og_title', type: 'text', label: 'og:title', placeholder: 'Shown in Slack/iMessage preview', cols: 12 },
    { name: 'og_description', type: 'textarea', label: 'og:description', rows: 2, cols: 12 },
    { name: 'og_image', type: 'url', label: 'og:image', placeholder: 'https://example.com/preview.jpg', cols: 12 },
];

const ShortLinkForms = {
    create: {
        title: 'Create Shortlink',
        size: 'md',
        fields: [
            ..._shortLinkSharedFields,
        ],
        help: 'Leave OG fields blank to let the server scrape the destination automatically.',
    },

    edit: {
        title: 'Edit Shortlink',
        size: 'md',
        fields: [
            { name: 'is_active', type: 'switch', label: 'Active', cols: 4 },
            ..._shortLinkSharedFields,
            { name: 'twitter_card', type: 'select', label: 'twitter:card', options: TWITTER_CARD_OPTIONS, cols: 6 },
            { name: 'twitter_title', type: 'text', label: 'twitter:title', cols: 6 },
            { name: 'twitter_description', type: 'textarea', label: 'twitter:description', rows: 2, cols: 12 },
            { name: 'twitter_image', type: 'url', label: 'twitter:image', cols: 12 },
        ],
    },
};

ShortLink.EDIT_FORM = ShortLinkForms.edit;

export {
    ShortLink,
    ShortLinkList,
    ShortLinkClick,
    ShortLinkClickList,
    ShortLinkForms,
    SHORTLINK_SOURCE_OPTIONS,
    TWITTER_CARD_OPTIONS,
    flattenShortLinkMetadata,
    buildShortLinkMetadata,
    extractShortLinkPayload,
};
