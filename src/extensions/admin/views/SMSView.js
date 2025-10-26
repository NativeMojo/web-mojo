/**
 * SMSView - Detailed view for a PhoneHub SMS record
 *
 * Mirrors GeoIPView structure:
 * - Header with key info (direction, from/to, status)
 * - Tabbed content using TabView and DataView sections
 * - Minimal context menu for refresh and delete
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import Dialog from '@core/views/feedback/Dialog.js';
import { SMS } from '@core/models/Phonehub.js';

class SMSView extends View {
  constructor(options = {}) {
    super({
      className: 'sms-view',
      ...options
    });

    this.model = options.model || new SMS(options.data || {});

    this.template = `
      <div class="sms-view-container">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
          <!-- Left Side: Icon & Info -->
          <div class="d-flex align-items-center gap-3">
            <div class="fs-1 text-primary">
              <i class="bi bi-chat-dots"></i>
            </div>
            <div>
              <h3 class="mb-1">
                {{#model.direction}}{{model.direction|capitalize}}{{/model.direction}}
                {{^model.direction}}Message{{/model.direction}}
                <small class="text-muted ms-2">
                  {{#model.status}}[{{model.status|capitalize}}]{{/model.status}}
                </small>
              </h3>
              <div class="text-muted small">
                {{#model.from_number}}From: {{model.from_number}}{{/model.from_number}}
                {{#model.to_number}} · To: {{model.to_number}}{{/model.to_number}}
              </div>
              <div class="text-muted small mt-1">
                {{#model.provider}}Provider: {{model.provider|capitalize}}{{/model.provider}}
                {{#model.provider_message_id}} · SID: {{model.provider_message_id}}{{/model.provider_message_id}}
              </div>
            </div>
          </div>

          <!-- Right Side: Actions -->
          <div class="d-flex align-items-center gap-4">
            <div data-container="sms-context-menu"></div>
          </div>
        </div>

        <!-- Tabs -->
        <div data-container="sms-tabs"></div>
      </div>
    `;
  }

  async onInit() {
    // Message Tab
    this.messageView = new DataView({
      model: this.model,
      className: 'p-3',
      showEmptyValues: true,
      emptyValueText: '—',
      columns: 2,
      fields: [
        { name: 'direction', label: 'Direction', formatter: 'capitalize', cols: 4 },
        { name: 'status', label: 'Status', formatter: 'capitalize', cols: 4 },
        { name: 'from_number', label: 'From', cols: 6 },
        { name: 'to_number', label: 'To', cols: 6 },
        { name: 'body', label: 'Message Body', cols: 12 }
      ]
    });

    // Delivery Tab
    this.deliveryView = new DataView({
      model: this.model,
      className: 'p-3',
      showEmptyValues: true,
      emptyValueText: '—',
      columns: 2,
      fields: [
        { name: 'provider', label: 'Provider', formatter: 'capitalize', cols: 6 },
        { name: 'provider_message_id', label: 'Provider Message ID', cols: 6 },
        { name: 'sent_at', label: 'Sent At', formatter: 'datetime', cols: 6 },
        { name: 'delivered_at', label: 'Delivered At', formatter: 'datetime', cols: 6 },
        { name: 'error_code', label: 'Error Code', cols: 6 },
        { name: 'error_message', label: 'Error Message', cols: 12 }
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
      'Message': this.messageView,
      'Delivery': this.deliveryView,
      'Metadata': this.metadataView
    };

    this.tabView = new TabView({
      containerId: 'sms-tabs',
      tabs,
      activeTab: 'Message'
    });
    this.addChild(this.tabView);

    // ContextMenu (minimal)
    const menuItems = [
      { label: 'Refresh', action: 'refresh-sms', icon: 'bi-arrow-repeat' },
      { type: 'divider' },
      { label: 'Delete Message', action: 'delete-sms', icon: 'bi-trash', danger: true }
    ];

    const ctxMenu = new ContextMenu({
      containerId: 'sms-context-menu',
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

  async onActionRefreshSms() {
    try {
      this.getApp()?.toast?.info?.('Refreshing message...');
      await this.model.fetch();
      await this.render();
      this.getApp()?.toast?.success?.('Message refreshed');
    } catch (e) {
      this.getApp()?.toast?.error?.(e.message || 'Refresh failed');
    }
  }

  async onActionDeleteSms() {
    const title = 'Confirm Deletion';
    const msg = `Are you sure you want to delete this message?`;
    const confirmed = await Dialog.confirm(msg, title, {
      confirmClass: 'btn-danger',
      confirmText: 'Delete'
    });

    if (!confirmed) return;

    try {
      const resp = await this.model.destroy();
      if (resp?.success) {
        this.emit('sms:deleted', { model: this.model });
      } else {
        this.getApp()?.toast?.error?.('Delete failed');
      }
    } catch (e) {
      this.getApp()?.toast?.error?.(e.message || 'Delete failed');
    }
  }
}

SMSView.MODEL_CLASS = SMS;

export default SMSView;