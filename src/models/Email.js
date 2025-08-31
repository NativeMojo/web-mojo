import Collection from '../core/Collection.js';
import Model from '../core/Model.js';

/**
 * EmailDomain - SES/SNS/S3-backed email domain model
 * Maps to REST endpoints under /api/aws/email/domain
 *
 * Key operations:
 * - Create/Update/Delete domains
 * - Onboard: DNS records + SNS + optional receiving
 * - Audit: Drift report (verification/DKIM, topics, receipt rules)
 * - Reconcile: Safe, idempotent fixes (no DNS writes)
 *
 * Notes:
 * - Management endpoints require "manage_aws" permission server-side.
 * - Error handling follows the MOJO Rest response contract.
 */
class EmailDomain extends Model {
  constructor(data = {}, options = {}) {
    super(data, {
      endpoint: '/api/aws/email/domain',
      ...options
    });
  }

  /**
   * Onboard the domain (DNS/SNS/receiving orchestration).
   * POST /api/aws/email/domain/<id>/onboard
   *
   * @param {object} data
   *  receiving_enabled?: boolean
   *  s3_inbound_bucket?: string
   *  s3_inbound_prefix?: string
   *  ensure_mail_from?: boolean
   *  mail_from_subdomain?: string
   *  dns_mode?: "manual" | "godaddy"
   *  godaddy_key?: string
   *  godaddy_secret?: string
   *  endpoints?: { bounce, complaint, delivery, inbound }
   * @param {object} options - Optional { params?: object }
   * @returns {Promise<object>} REST response
   */
  async onboard(data = {}, options = {}) {
    if (!this.id) {
      await this.showError('Cannot onboard domain without ID');
      return {
        success: false,
        status: 400,
        error: 'Missing domain id'
      };
    }

    try {
      const url = `${this.buildUrl(this.id)}/onboard`;
      const response = await this.rest.POST(url, data, options.params);

      // No guaranteed shape to merge; response contains DNS records, topics, notes, etc.
      // If backend returns updated domain fields, you can call this.set(response.data.data).
      return response;
    } catch (err) {
      return {
        success: false,
        status: err?.status || 500,
        error: err?.message || 'Failed to onboard domain'
      };
    }
  }

  /**
   * Audit domain configuration for drift.
   * GET or POST /api/aws/email/domain/<id>/audit
   *
   * @param {object} options
   *  method?: 'GET'|'POST' (default 'GET')
   *  data?: object (when method is POST)
   *  params?: object (query params for GET)
   * @returns {Promise<object>} REST response
   */
  async audit(options = {}) {
    if (!this.id) {
      await this.showError('Cannot audit domain without ID');
      return {
        success: false,
        status: 400,
        error: 'Missing domain id'
      };
    }

    const method = (options.method || 'GET').toUpperCase();
    const url = `${this.buildUrl(this.id)}/audit`;

    try {
      if (method === 'POST') {
        return await this.rest.POST(url, options.data || {}, options.params);
      }
      return await this.rest.GET(url, options.params);
    } catch (err) {
      return {
        success: false,
        status: err?.status || 500,
        error: err?.message || 'Failed to audit domain'
      };
    }
  }

  /**
   * Reconcile domain configuration (safe fixes; no DNS writes).
   * POST /api/aws/email/domain/<id>/reconcile
   *
   * @param {object} data - Optional payload (usually none required)
   * @param {object} options - Optional { params?: object }
   * @returns {Promise<object>} REST response
   */
  async reconcile(data = {}, options = {}) {
    if (!this.id) {
      await this.showError('Cannot reconcile domain without ID');
      return {
        success: false,
        status: 400,
        error: 'Missing domain id'
      };
    }

    try {
      const url = `${this.buildUrl(this.id)}/reconcile`;
      return await this.rest.POST(url, data, options.params);
    } catch (err) {
      return {
        success: false,
        status: err?.status || 500,
        error: err?.message || 'Failed to reconcile domain'
      };
    }
  }

  /**
   * Convenience: Onboard by id without creating a separate instance.
   * @param {string|number} id
   * @param {object} data
   * @param {object} options
   */
  static async onboardById(id, data = {}, options = {}) {
    const model = new EmailDomain({ id }, options);
    return await model.onboard(data, options);
  }

  /**
   * Convenience: Audit by id without creating a separate instance.
   * @param {string|number} id
   * @param {object} options - see audit()
   */
  static async auditById(id, options = {}) {
    const model = new EmailDomain({ id }, options);
    return await model.audit(options);
  }

  /**
   * Convenience: Reconcile by id without creating a separate instance.
   * @param {string|number} id
   * @param {object} data
   * @param {object} options
   */
  static async reconcileById(id, data = {}, options = {}) {
    const model = new EmailDomain({ id }, options);
    return await model.reconcile(data, options);
  }
}

/**
 * EmailDomainList - Collection of EmailDomain
 * Supports standard MOJO list/search/sort/pagination patterns
 */
class EmailDomainList extends Collection {
  constructor(options = {}) {
    super(EmailDomain, {
      endpoint: '/api/aws/email/domain',
      size: 10,
      ...options
    });
  }
}

/**
 * Forms configuration for EmailDomain (for TablePage/Dialog integration)
 * NOTE: Conditional requirements (e.g., s3_inbound_bucket when receiving_enabled)
 * should be validated server-side; help text guides the admin.
 */
const EmailDomainForms = {
  create: {
    title: 'Add Email Domain',
    fields: [
      {
        name: 'name',
        type: 'text',
        label: 'Domain Name',
        placeholder: 'example.com',
        required: true,
        columns: 12,
        help: 'Enter the root domain to verify with SES (no protocol).'
      },
      {
        name: 'region',
        type: 'text',
        label: 'AWS Region',
        placeholder: 'us-east-1',
        columns: 12,
        help: 'Optional. Defaults to project AWS_REGION if omitted.'
      },
      {
        name: 'receiving_enabled',
        type: 'switch',
        label: 'Enable Inbound Receiving',
        columns: 12,
        help: 'Catch-all SES receipt rule to S3 + SNS; routing is done in-app.'
      },
      {
        name: 's3_inbound_bucket',
        type: 'text',
        label: 'Inbound S3 Bucket',
        placeholder: 'my-inbound-bucket',
        columns: 12,
        help: 'Required if receiving is enabled.'
      },
      {
        name: 's3_inbound_prefix',
        type: 'text',
        label: 'Inbound S3 Prefix',
        placeholder: 'inbound/example.com/',
        columns: 12,
        help: 'Optional S3 key prefix for inbound messages.'
      },
      {
        name: 'dns_mode',
        type: 'select',
        label: 'DNS Mode',
        options: [
          { value: 'manual', text: 'Manual (show records)' },
          { value: 'godaddy', text: 'GoDaddy (apply via API)' }
        ],
        value: 'manual',
        columns: 12
      }
    ]
  },

  edit: {
    title: 'Edit Email Domain',
    fields: [
      {
        name: 'name',
        type: 'text',
        label: 'Domain Name',
        placeholder: 'example.com',
        required: true,
        columns: 12,
        readonly: true,
        help: 'Domain name cannot be changed after creation.'
      },
      {
        name: 'region',
        type: 'text',
        label: 'AWS Region',
        placeholder: 'us-east-1',
        columns: 12
      },
      {
        name: 'receiving_enabled',
        type: 'switch',
        label: 'Enable Inbound Receiving',
        columns: 12
      },
      {
        name: 's3_inbound_bucket',
        type: 'text',
        label: 'Inbound S3 Bucket',
        placeholder: 'my-inbound-bucket',
        columns: 12
      },
      {
        name: 's3_inbound_prefix',
        type: 'text',
        label: 'Inbound S3 Prefix',
        placeholder: 'inbound/example.com/',
        columns: 12
      },
      {
        name: 'dns_mode',
        type: 'select',
        label: 'DNS Mode',
        options: [
          { value: 'manual', text: 'Manual (show records)' },
          { value: 'godaddy', text: 'GoDaddy (apply via API)' }
        ],
        columns: 12
      }
    ]
  },

  onboard: {
    title: 'Onboard Domain',
    fields: [
      {
        type: 'header',
        text: 'Receiving',
        level: 6,
        className: 'mt-2'
      },
      {
        name: 'receiving_enabled',
        type: 'switch',
        label: 'Enable Inbound Receiving',
        columns: 12
      },
      {
        name: 's3_inbound_bucket',
        type: 'text',
        label: 'Inbound S3 Bucket',
        placeholder: 'my-inbound-bucket',
        columns: 12,
        help: 'Required if receiving is enabled.'
      },
      {
        name: 's3_inbound_prefix',
        type: 'text',
        label: 'Inbound S3 Prefix',
        placeholder: 'inbound/example.com/',
        columns: 12
      },

      {
        type: 'header',
        text: 'MAIL FROM (optional)',
        level: 6,
        className: 'mt-3'
      },
      {
        name: 'ensure_mail_from',
        type: 'switch',
        label: 'Ensure MAIL FROM Setup',
        columns: 12
      },
      {
        name: 'mail_from_subdomain',
        type: 'text',
        label: 'MAIL FROM Subdomain',
        placeholder: 'feedback',
        columns: 12
      },

      {
        type: 'header',
        text: 'DNS',
        level: 6,
        className: 'mt-3'
      },
      {
        name: 'dns_mode',
        type: 'select',
        label: 'DNS Mode',
        options: [
          { value: 'manual', text: 'Manual (show records)' },
          { value: 'godaddy', text: 'GoDaddy (apply via API)' }
        ],
        value: 'manual',
        columns: 12
      },
      {
        name: 'godaddy_key',
        type: 'text',
        label: 'GoDaddy API Key',
        columns: 12,
        help: 'Required when DNS Mode = GoDaddy.'
      },
      {
        name: 'godaddy_secret',
        type: 'password',
        label: 'GoDaddy API Secret',
        columns: 12
      },

      {
        type: 'header',
        text: 'Webhook Endpoints',
        level: 6,
        className: 'mt-3'
      },
      {
        name: 'endpoints.bounce',
        type: 'text',
        label: 'Bounce Endpoint',
        placeholder: 'https://portal.example.com/api/aws/sns/bounce',
        columns: 12
      },
      {
        name: 'endpoints.complaint',
        type: 'text',
        label: 'Complaint Endpoint',
        placeholder: 'https://portal.example.com/api/aws/sns/complaint',
        columns: 12
      },
      {
        name: 'endpoints.delivery',
        type: 'text',
        label: 'Delivery Endpoint',
        placeholder: 'https://portal.example.com/api/aws/sns/delivery',
        columns: 12
      },
      {
        name: 'endpoints.inbound',
        type: 'text',
        label: 'Inbound Endpoint',
        placeholder: 'https://portal.example.com/api/aws/sns/inbound',
        columns: 12
      }
    ]
  }
};

/**
 * Mailbox - Represents a single email address within a domain.
 * Endpoint: /api/aws/email/mailbox
 * Fields (typical):
 *  - domain: FK (domain id) or name (server may accept name)
 *  - email: full address
 *  - allow_inbound: boolean
 *  - allow_outbound: boolean
 *  - async_handler: "package.module:function" for task dispatch on inbound
 */
class Mailbox extends Model {
  constructor(data = {}, options = {}) {
    super(data, {
      endpoint: '/api/aws/email/mailbox',
      ...options
    });
  }
}

/**
 * MailboxList - Collection of Mailboxes
 */
class MailboxList extends Collection {
  constructor(options = {}) {
    super(Mailbox, {
      endpoint: '/api/aws/email/mailbox',
      size: 10,
      ...options
    });
  }
}

/**
 * Forms configuration for Mailbox CRUD
 */
const MailboxForms = {
  create: {
    title: 'Add Mailbox',
    fields: [
      {
          type: 'collection',
          name: 'domain',
          label: 'Domain',
          Collection: EmailDomainList,  // Collection class
          labelField: 'name',          // Field to display in dropdown
          valueField: 'id',            // Field to use as value
          maxItems: 10,                // Max items to show in dropdown
          placeholder: 'Search domains...',
          emptyFetch: false,
          required: true,
          debounceMs: 300,             // Search debounce delay
          columns: 12
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'support@example.com',
        required: true,
        columns: 12
      },
      {
        name: 'allow_inbound',
        type: 'switch',
        label: 'Allow Inbound',
        columns: 6
      },
      {
        name: 'allow_outbound',
        type: 'switch',
        label: 'Allow Outbound',
        defaultValue: true,
        columns: 6
      },
      {
        name: 'async_handler',
        type: 'text',
        label: 'Async Handler (optional)',
        placeholder: 'myapp.handlers.process_support',
        columns: 12,
        help: 'Module:function to process inbound messages via task system'
      }
    ]
  },

  edit: {
    title: 'Edit Mailbox',
    fields: [
      {
        name: 'domain',
        type: 'text',
        label: 'Domain (ID or Name)',
        placeholder: 'example.com or 42',
        required: true,
        columns: 12,
        readonly: true
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email Address',
        required: true,
        columns: 12
      },
      {
        name: 'allow_inbound',
        type: 'switch',
        label: 'Allow Inbound',
        columns: 6
      },
      {
        name: 'allow_outbound',
        type: 'switch',
        label: 'Allow Outbound',
        columns: 6
      },
      {
        name: 'async_handler',
        type: 'text',
        label: 'Async Handler (optional)',
        placeholder: 'myapp.handlers.process_support',
        columns: 12
      }
    ]
  }
};

/**
 * SentMessage - Outbound messages sent via SES; read-only in UI
 * Endpoint: /api/aws/email/sent
 */
class SentMessage extends Model {
  constructor(data = {}, options = {}) {
    super(data, {
      endpoint: '/api/aws/email/sent',
      ...options
    });
  }
}

/**
 * SentMessageList - Collection of SentMessage
 */
class SentMessageList extends Collection {
  constructor(options = {}) {
    super(SentMessage, {
      endpoint: '/api/aws/email/sent',
      size: 10,
      ...options
    });
  }
}

/**
 * Forms for SentMessage (read-only details)
 */
const SentMessageForms = {
  view: {
    title: 'Sent Message Details',
    fields: [
      { name: 'id', type: 'text', label: 'ID', readonly: true, cols: 6 },
      { name: 'ses_message_id', type: 'text', label: 'SES Message ID', readonly: true, cols: 6 },
      { name: 'from_email', type: 'text', label: 'From', readonly: true, cols: 12 },
      { name: 'to', type: 'textarea', label: 'To', readonly: true, rows: 2, cols: 12 },
      { name: 'cc', type: 'textarea', label: 'CC', readonly: true, rows: 2, cols: 12 },
      { name: 'bcc', type: 'textarea', label: 'BCC', readonly: true, rows: 2, cols: 12 },
      { name: 'subject', type: 'text', label: 'Subject', readonly: true, cols: 12 },
      { name: 'status', type: 'text', label: 'Status', readonly: true, cols: 6 },
      { name: 'status_reason', type: 'textarea', label: 'Status Reason', readonly: true, rows: 3, cols: 12 },
      { name: 'created', type: 'text', label: 'Created', readonly: true, cols: 6 }
    ]
  }
};

/**
 * EmailTemplate - DB template entries (Django templated), CRUD supported
 * Endpoint: /api/aws/email/template
 */
class EmailTemplate extends Model {
  constructor(data = {}, options = {}) {
    super(data, {
      endpoint: '/api/aws/email/template',
      ...options
    });
  }
}

/**
 * EmailTemplateList - Collection of EmailTemplate
 */
class EmailTemplateList extends Collection {
  constructor(options = {}) {
    super(EmailTemplate, {
      endpoint: '/api/aws/email/template',
      size: 10,
      ...options
    });
  }
}

/**
 * Forms configuration for EmailTemplate CRUD
 */
const EmailTemplateForms = {
  create: {
    title: 'Add Email Template',
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true, cols: 12 },
      { name: 'subject_template', type: 'text', label: 'Subject Template', cols: 12 },
      { name: 'html_template', type: 'textarea', label: 'HTML Template', rows: 8, cols: 12 },
      { name: 'text_template', type: 'textarea', label: 'Text Template', rows: 6, cols: 12 },
      { name: 'metadata', type: 'textarea', label: 'Metadata (JSON)', rows: 4, cols: 12, help: 'Optional JSON metadata' }
    ]
  },
  edit: {
    title: 'Edit Email Template',
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true, cols: 12 },
      { name: 'subject_template', type: 'text', label: 'Subject Template', cols: 12 },
      { name: 'html_template', type: 'textarea', label: 'HTML Template', rows: 8, cols: 12 },
      { name: 'text_template', type: 'textarea', label: 'Text Template', rows: 6, cols: 12 },
      { name: 'metadata', type: 'textarea', label: 'Metadata (JSON)', rows: 4, cols: 12 }
    ]
  }
};

export {
  EmailDomain,
  EmailDomainList,
  EmailDomainForms,
  Mailbox,
  MailboxList,
  MailboxForms,
  SentMessage,
  SentMessageList,
  SentMessageForms,
  EmailTemplate,
  EmailTemplateList,
  EmailTemplateForms
};
