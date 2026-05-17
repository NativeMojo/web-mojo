/**
 * SMSTablePage - PhoneHub SMS management using TablePage component
 * Mirrors the GeoLocatedIPTablePage pattern with minimal, consistent configuration.
 */

import TablePage from '@core/pages/TablePage.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { SMS, SMSList } from '@ext/admin/models/Phonehub.js';
import SMSView from './SMSView.js';

SMS.VIEW_CLASS = SMSView;

// Friendly labels for the SMS `error_code` cell. Mojo-bridge codes
// (timeout / http_* / remote_*) get short human prose; unknown codes fall
// through as-is so we never swallow a new backend value.
const ERROR_CODE_LABELS = {
    timeout:         'Remote timeout',
    remote_error:    'Remote error',
    remote_failed:   'Remote failed',
    config_error:    'Config error',
    invalid_credentials: 'Invalid credentials',
    missing_credentials: 'Missing credentials',
    connection_failed:   'Connection failed'
};

function formatErrorCode(value) {
    if (value === null || value === undefined || value === '') return '—';
    const v = String(value);
    if (ERROR_CODE_LABELS[v]) return ERROR_CODE_LABELS[v];
    const m = v.match(/^http_(\d+)$/);
    if (m) return `HTTP ${m[1]}`;
    return MOJOUtils.escapeHtml(v);
}

const PROVIDER_BADGE_COLORS = { twilio: 'info', aws: 'warning', mojo: 'primary' };

/**
 * Render the Provider chip. Mojo rows get a clickable anchor that
 * opens the Phone Config page filtered by the SMS's group — twilio/aws
 * stay as plain badges.
 */
function renderProviderCell(value, ctx) {
    if (value === null || value === undefined || value === '') return '—';
    const v = String(value);
    const color = PROVIDER_BADGE_COLORS[v] || 'secondary';
    const label = MOJOUtils.escapeHtml(v);
    if (v === 'mojo') {
        const g = ctx?.model?.get?.('group');
        const rawGid = g && typeof g === 'object' ? g.id : (g || '');
        const gid = MOJOUtils.escapeHtml(rawGid);
        return `<a class="badge bg-${color} text-decoration-none"
                   href="#"
                   data-action="open-phone-config"
                   data-group="${gid}"
                   title="Open Phone Config">${label}</a>`;
    }
    return `<span class="badge bg-${color}">${label}</span>`;
}

class SMSTablePage extends TablePage {
  constructor(options = {}) {
    super({
      ...options,

      // Identity
      name: 'admin_phonehub_sms',
      pageName: 'SMS Messages',
      router: 'admin/phonehub/sms',

      // Data source
      Collection: SMSList,

      dayRangeFilter: true,
      searchPlaceholder: 'Search number, body, or provider',

      defaultQuery: {
        sort: '-created'
      },

      viewDialogOptions: {
        header: false,
        size: 'xl'
      },

      // Column definitions
      columns: [
        { key: 'direction', label: 'Direction', sortable: true },
        { key: 'from_number', label: 'From', sortable: true, formatter: "default('—')" },
        { key: 'to_number', label: 'To', sortable: true, formatter: "default('—')" },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'provider', label: 'Provider', sortable: true, formatter: renderProviderCell, visibility: 'lg' },
        { key: 'body', label: 'Message', formatter: "default('—')" },
        { key: 'error_code', label: 'Error', formatter: formatErrorCode, visibility: 'xl' },
        { key: 'sent_at', label: 'Sent At', sortable: true, formatter: 'datetime', visibility: 'xl' },
        { key: 'delivered_at', label: 'Delivered At', sortable: true, formatter: 'datetime', visibility: 'xl' },
        { key: 'created', label: 'Created', sortable: true, formatter: 'datetime' }
      ],

      // Table features
      selectable: true,
      searchable: true,
      sortable: true,
      filterable: true,
      paginated: true,

      // Row action
      clickAction: 'view',

      // Toolbar
      showRefresh: true,
      showAdd: false,
      showExport: true,

      // Empty state
      emptyMessage: 'No SMS messages found.',

      // Table display options
      tableOptions: {
        striped: true,
        bordered: false,
        hover: true,
        responsive: false
      }
    });
  }

  /**
   * Cross-link: clicking the mojo provider chip on an SMS row jumps to the
   * Phone Config page filtered by the same group, so the operator lands on
   * the config that produced (or failed to produce) the message.
   */
  async onActionOpenPhoneConfig(event, element) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const group = element?.dataset?.group;
    const query = { provider: 'mojo' };
    if (group) query.group = group;
    await this.getApp().navigate('system/phonehub/config', query);
  }
}

export default SMSTablePage;