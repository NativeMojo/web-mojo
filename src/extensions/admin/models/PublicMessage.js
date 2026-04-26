import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/* =========================
 * Constants
 * ========================= */

const PublicMessageKindOptions = [
    { value: 'contact_us', label: 'Contact Us' },
    { value: 'support', label: 'Support' },
];

const PublicMessageStatusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
];

const PublicMessageSeverityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
];

const PublicMessageCategoryOptions = [
    { value: 'billing', label: 'Billing' },
    { value: 'account', label: 'Account' },
    { value: 'bug', label: 'Bug' },
    { value: 'other', label: 'Other' },
];

// Friendly labels for known metadata keys. Unknown keys are humanized at render time.
const PublicMessageMetadataLabels = {
    company: 'Company',
    category: 'Category',
    severity: 'Severity',
    referrer: 'Referrer',
    landing_page: 'Landing Page',
    utm_source: 'UTM Source',
    utm_medium: 'UTM Medium',
    utm_campaign: 'UTM Campaign',
    utm_term: 'UTM Term',
    utm_content: 'UTM Content',
};

/* =========================
 * PublicMessage Model
 * ========================= */

class PublicMessage extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/account/public_message',
        });
    }
}

/* =========================
 * PublicMessage Collection
 * ========================= */

class PublicMessageList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: PublicMessage,
            endpoint: '/api/account/public_message',
            size: 25,
            ...options,
        });
    }
}

export {
    PublicMessage,
    PublicMessageList,
    PublicMessageKindOptions,
    PublicMessageStatusOptions,
    PublicMessageSeverityOptions,
    PublicMessageCategoryOptions,
    PublicMessageMetadataLabels,
};
