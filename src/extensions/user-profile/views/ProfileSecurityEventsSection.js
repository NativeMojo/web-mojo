/**
 * ProfileSecurityEventsSection - Security events feed
 *
 * TableView showing auth-relevant events: logins, failed attempts,
 * password changes, etc. Color-coded by severity.
 */
import View from '@core/View.js';
import Model from '@core/Model.js';
import Collection from '@core/Collection.js';
import TableView from '@core/views/table/TableView.js';
import TableRow from '@core/views/table/TableRow.js';

class SecurityEvent extends Model {
    constructor(data = {}, options = {}) {
        super(data, { endpoint: '/api/account/security-events', ...options });
    }
}

class SecurityEventList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: SecurityEvent,
            endpoint: '/api/account/security-events',
            size: 15,
            ...options
        });
    }
}

const DANGER_KINDS = [
    'invalid_password', 'totp:login_failed', 'totp:confirm_failed',
    'passkey:login_failed', 'sessions:revoke_failed',
    'email_change:invalid', 'email_change:expired'
];
const SUCCESS_KINDS = [
    'login', 'oauth', 'email_verify:confirmed', 'email_verify:confirmed_code',
    'phone_verify:confirmed', 'phone_change:confirmed', 'username:changed'
];

class SecurityEventRow extends TableRow {
    get kindBadgeClass() {
        const kind = this.model?.get('kind') || '';
        if (DANGER_KINDS.includes(kind)) return 'bg-danger';
        if (SUCCESS_KINDS.includes(kind)) return 'bg-success';
        return 'bg-secondary';
    }

    get kindLabel() {
        const kind = this.model?.get('kind') || '';
        return kind.replace(/[_:]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    get kindIcon() {
        const kind = this.model?.get('kind') || '';
        if (DANGER_KINDS.includes(kind)) return 'bi-exclamation-triangle';
        if (SUCCESS_KINDS.includes(kind)) return 'bi-check-circle';
        return 'bi-info-circle';
    }
}

export default class ProfileSecurityEventsSection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-security-events-section',
            template: `<div id="security-events-table"></div>`,
            ...options
        });
    }

    async onInit() {
        await super.onInit();
        this.tableView = new TableView({
            containerId: 'security-events-table',
            collection: new SecurityEventList(),
            defaultQuery: { sort: '-created' },
            hideActivePillNames: ['sort'],
            itemClass: SecurityEventRow,
            columns: [
                {
                    key: 'kind',
                    label: 'Event',
                    template: '<span class="badge {{kindBadgeClass}}"><i class="bi {{kindIcon}} me-1"></i>{{kindLabel}}</span>'
                },
                {
                    key: 'summary',
                    label: 'Details'
                },
                { key: 'ip', label: 'IP', visibility: 'lg' },
                { key: 'created|relative', label: 'Time', sortable: true }
            ],
            searchable: true,
            sortable: true,
            filterable: false,
            paginated: true,
            showAdd: false,
            showExport: false,
            tableOptions: {
                striped: false,
                hover: true,
                size: 'sm'
            },
            emptyMessage: 'No security events'
        });
        this.addChild(this.tableView);
    }
}
