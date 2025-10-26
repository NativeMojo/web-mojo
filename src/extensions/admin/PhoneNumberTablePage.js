/**
 * PhoneNumberTablePage - PhoneHub numbers management using TablePage component
 * Mirrors the GeoLocatedIPTablePage pattern with minimal, consistent configuration.
 */

import TablePage from '@core/pages/TablePage.js';
import { PhoneNumberList, PhoneNumber } from '@core/models/Phonehub.js';
import PhoneNumberView from './views/PhoneNumberView.js';

class PhoneNumberTablePage extends TablePage {
  constructor(options = {}) {
    super({
      ...options,

      // Identity
      name: 'admin_phonehub_numbers',
      pageName: 'Phone Numbers',
      router: 'admin/phonehub/numbers',

      // Data source
      Collection: PhoneNumberList,

      // Item view configuration
      itemView: PhoneNumberView,
      viewDialogOptions: {
        header: false,
        // size: 'xl'
      },

      // Column definitions
      columns: [
        { key: 'phone_number', label: 'Phone Number', sortable: true },
        { key: 'carrier', label: 'Carrier', sortable: true, formatter: "default('—')" },
        { key: 'line_type', label: 'Line Type', sortable: true, formatter: "capitalize" },
        { key: 'is_mobile', label: 'Mobile', formatter: 'yesnoicon' },
        { key: 'is_voip', label: 'VOIP', formatter: 'yesnoicon' },
        { key: 'is_valid', label: 'Valid', formatter: 'yesnoicon' },
        { key: 'registered_owner', label: 'Owner', sortable: true, formatter: "default('—')" },
        { key: 'owner_type', label: 'Owner Type', formatter: "capitalize" },
        { key: 'last_lookup_at|relative', label: 'Last Lookup', sortable: true},
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
      showAdd: true,
      showExport: true,

      // Empty state
      emptyMessage: 'No phone numbers found.',

      // Table display options
      tableOptions: {
        striped: true,
        bordered: false,
        hover: true,
        responsive: false
      },

      tableViewOptions: {
          addButtonLabel: "Lookup",
          addButtonIcon: 'bi-search',
          onAdd: (evt) => {
              evt.preventDefault();
              // Implement the logic for adding a new record
              this.onLookup();
          }
      }
    });
  }

  async onLookup() {
      // Implement the logic for adding a new record
      const data = await this.getApp().showForm({
          title: "Lookup Phone Number",
          fields: [
              {
                  name: 'number',
                  type: 'text',
                  required: true
              }
          ]
      });
      if (data && data.number) {
          const resp = await PhoneNumber.lookup(data.number);
          if (resp.model) {
              this.tableView._onRowView(resp);
          }
      }
  }
}

export default PhoneNumberTablePage;
