/**
 * PhoneNumberView - Detailed view for a PhoneHub PhoneNumber record
 *
 * Mirrors GeoIPView structure:
 * - Header with primary identifier and quick info
 * - Tabbed content using TabView and DataView sections
 * - Minimal context menu for refresh and delete
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import Dialog from '@core/views/feedback/Dialog.js';
import { PhoneNumber } from '@core/models/Phonehub.js';

class PhoneNumberView extends View {
  constructor(options = {}) {
    super({
      className: 'phone-number-view',
      ...options
    });

    this.model = options.model || new PhoneNumber(options.data || {});

    this.template = `
      <div class="phone-number-view-container">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
          <!-- Left Side: Icon & Info -->
          <div class="d-flex align-items-center gap-3">
            <div class="fs-1 text-primary">
              <i class="bi bi-telephone"></i>
            </div>
            <div>
              <h3 class="mb-1">{{model.phone_number|default('Unknown Number')}}</h3>
              <div class="text-muted small">
                {{model.carrier|default('—')}} {{#model.line_type}}· {{model.line_type|capitalize}}{{/model.line_type}}
              </div>
              <div class="text-muted small mt-1">
                {{#model.country_code}}Country: {{model.country_code}}{{/model.country_code}}
                {{#model.region}} · Region: {{model.region}}{{/model.region}}
                {{#model.state}} · State: {{model.state}}{{/model.state}}
              </div>
            </div>
          </div>

          <!-- Right Side: Actions -->
          <div class="d-flex align-items-center gap-4">
            <div data-container="phone-context-menu"></div>
          </div>
        </div>

        <!-- Tabs -->
        <div data-container="phone-tabs"></div>
      </div>
    `;
  }

  async onInit() {
    // Overview Tab
    this.overviewView = new DataView({
      model: this.model,
      className: 'p-3',
      showEmptyValues: true,
      emptyValueText: '—',
      columns: 2,
      fields: [
        { name: 'phone_number', label: 'Phone Number', cols: 6 },
        { name: 'country_code', label: 'Country Code', cols: 6 },
        { name: 'region', label: 'Region', cols: 6 },
        { name: 'state', label: 'State', cols: 6 },
        { name: 'registered_owner', label: 'Registered Owner', cols: 6 },
        { name: 'owner_type', label: 'Owner Type', formatter: 'capitalize', cols: 6 },
        { name: 'is_valid', label: 'Valid', formatter: 'yesnoicon', cols: 4 },
        { name: 'is_mobile', label: 'Mobile', formatter: 'yesnoicon', cols: 4 },
        { name: 'is_voip', label: 'VOIP', formatter: 'yesnoicon', cols: 4 },
      ]
    });

    // Carrier & Status Tab
    this.carrierView = new DataView({
      model: this.model,
      className: 'p-3',
      showEmptyValues: true,
      emptyValueText: '—',
      columns: 2,
      fields: [
        { name: 'carrier', label: 'Carrier', cols: 6 },
        { name: 'line_type', label: 'Line Type', formatter: 'capitalize', cols: 6 },
        { name: 'lookup_provider', label: 'Lookup Provider', formatter: 'capitalize', cols: 6 },
        { name: 'lookup_count', label: 'Lookup Count', cols: 6 },
        { name: 'last_lookup_at', label: 'Last Lookup', formatter: 'datetime', cols: 6 },
        { name: 'lookup_expires_at', label: 'Cache Expires', formatter: 'datetime', cols: 6 }
      ]
    });

    // Address Tab
    this.addressView = new DataView({
      model: this.model,
      className: 'p-3',
      showEmptyValues: true,
      emptyValueText: '—',
      columns: 2,
      fields: [
        { name: 'address_line1', label: 'Address Line 1', cols: 12 },
        { name: 'address_city', label: 'City', cols: 4 },
        { name: 'address_state', label: 'State', cols: 4 },
        { name: 'address_zip', label: 'ZIP', cols: 4 },
        { name: 'address_country', label: 'Country', cols: 6 }
      ]
    });

    // Metadata Tab
    this.metadataView = new DataView({
      model: this.model,
      className: 'p-3',
      showEmptyValues: true,
      emptyValueText: '—',
      columns: 2,
      fields: [
        { name: 'id', label: 'Record ID', cols: 6 },
        { name: 'created', label: 'Created', formatter: 'datetime', cols: 6 },
        { name: 'modified', label: 'Last Modified', formatter: 'datetime', cols: 6 }
      ]
    });

    const tabs = {
      'Overview': this.overviewView,
      'Carrier': this.carrierView,
      'Address': this.addressView,
      'Metadata': this.metadataView
    };

    this.tabView = new TabView({
      containerId: 'phone-tabs',
      tabs,
      activeTab: 'Overview'
    });
    this.addChild(this.tabView);

    // Minimal ContextMenu
    const menuItems = [
      { label: 'Refresh Lookup', action: 'refresh-lookup', icon: 'bi-arrow-repeat' },
      { type: 'divider' },
      { label: 'Delete Record', action: 'delete-phone', icon: 'bi-trash', danger: true }
    ];

    const ctxMenu = new ContextMenu({
      containerId: 'phone-context-menu',
      className: 'context-menu-view header-menu-absolute',
      context: this.model,
      config: {
        icon: 'bi-three-dots-vertical',
        items: menuItems
      }
    });
    this.addChild(ctxMenu);
  }

  // Actions

  async onActionRefreshLookup() {
    const number = this.model.get('phone_number');
    if (!number) {
      this.getApp()?.toast?.warning?.('No phone number to lookup');
      return;
    }

    try {
      this.getApp()?.toast?.info?.('Refreshing lookup...');
      // Force refresh lookup and update current model
      const resp = await PhoneNumber.lookup(number, { force_refresh: true });
      if (resp.success && resp.data) {
        this.model.set(resp.data);
        await this.render();
        this.getApp()?.toast?.success?.('Lookup refreshed');
      } else {
        const msg = resp.error || 'Lookup failed';
        this.getApp()?.toast?.error?.(msg);
      }
    } catch (e) {
      this.getApp()?.toast?.error?.(e.message || 'Lookup failed');
    }
  }

  async onActionDeletePhone() {
    const confirmed = await Dialog.confirm(
      `Are you sure you want to delete the record for "${this.model.get('phone_number') || 'this number'}"?`,
      'Confirm Deletion',
      { confirmClass: 'btn-danger', confirmText: 'Delete' }
    );

    if (!confirmed) return;

    try {
      const resp = await this.model.destroy();
      if (resp?.success) {
        this.emit('phone:deleted', { model: this.model });
      } else {
        this.getApp()?.toast?.error?.('Delete failed');
      }
    } catch (e) {
      this.getApp()?.toast?.error?.(e.message || 'Delete failed');
    }
  }

  static async show(phone_number) {
      const resp = await PhoneNumber.lookup(phone_number);
      if (resp?.model) {
          const view = new PhoneNumberView({ model: resp.model });
          const dialog = new Dialog({
              header: false,
              size: 'lg',
              body: view,
              buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
          });
          await dialog.render(true, document.body);
          dialog.show();
          return dialog;
      }
      Dialog.alert({ message: `Could not find phone data for number: ${phone_number}`, type: 'warning' });
      return null;
  }
}

PhoneNumberView.MODEL_CLASS = PhoneNumber;

export default PhoneNumberView;
