/**
 * SMSTablePage - PhoneHub SMS management using TablePage component
 * Mirrors the GeoLocatedIPTablePage pattern with minimal, consistent configuration.
 */

import TablePage from '@core/pages/TablePage.js';
import { SMSList } from '@core/models/Phonehub.js';
import SMSView from './SMSView.js';

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

      // Item view configuration
      itemView: SMSView,
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
        { key: 'provider', label: 'Provider', sortable: true, formatter: "default('—')" },
        { key: 'body', label: 'Message', formatter: "default('—')" },
        { key: 'sent_at', label: 'Sent At', sortable: true, formatter: 'datetime' },
        { key: 'delivered_at', label: 'Delivered At', sortable: true, formatter: 'datetime' },
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
}

export default SMSTablePage;