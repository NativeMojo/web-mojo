
import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/* =========================
 * IncidentEvent
 * ========================= */
 class IncidentStats extends Model {
     constructor(data = {}) {
         super(data, {
             endpoint: '/api/incident/stats',
             requiresId: false
         });
     }
 }


class IncidentEvent extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/incident/event',
        });
    }
}

class IncidentEventList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: IncidentEvent,
            endpoint: '/api/incident/event',
            size: 10,
            ...options,
        });
    }
}

const IncidentEventForms = {
    edit: {
        title: 'Edit Incident Event',
        fields: [
            {
                name: 'category',
                type: 'select',
                label: 'Category',
                placeholder: 'Select category',
                options: () => Incident.COMPONENTS,
                editable: true,
                force_top: true,
                cols: 6,
            },
            {
                name: 'incident',
                type: 'text',
                label: 'Incident',
                placeholder: 'Enter Incident ID',
                cols: 6,
            },
            {
                name: 'description',
                type: 'textarea',
                label: 'Description',
                placeholder: 'Enter Description',
                cols: 12,
            },
            {
                name: 'details',
                type: 'textarea',
                label: 'Details',
                placeholder: 'Enter Details',
                cols: 12,
            },
            {
                name: 'component',
                type: 'text',
                label: 'Component',
                placeholder: 'Enter Component',
                cols: 8,
            },
            {
                name: 'component_id',
                type: 'text',
                label: 'Component ID',
                placeholder: 'Enter Component ID',
                cols: 4,
            },
        ],
    },
};

/* =========================
 * Incident
 * ========================= */
class Incident extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/incident/incident',
        });
    }
}

class IncidentList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: Incident,
            endpoint: '/api/incident/incident',
            size: 10,
            ...options,
        });
    }
}

const IncidentForms = {
    create: {
        title: 'Create Incident',
        fields: [
            {
              type: 'tabset',
              name: 'settingsTabs',
              tabs: [
                {
                  label: 'General',
                  fields: [
                      {
                          name: 'title',
                          type: 'text',
                          label: 'Title',
                          required: true,
                          columns: 12
                      },
                      {
                          name: 'details',
                          type: 'textarea',
                          label: 'Details',
                          required: true,
                          columns: 12
                      },

                  ]
                },
                {
                  label: 'Advanced',
                  fields: [
                      {
                          name: 'priority',
                          type: 'select',
                          label: 'Priority',
                          options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                          value: 5,
                          columns: 6
                      },
                      {
                          name: 'status',
                          type: 'select',
                          label: 'Status',
                          value: 'open',
                          options: ['open', 'investigating', 'resolved', 'closed', "paused", "ignored"],
                          columns: 6
                      },
                      {
                          name: 'category',
                          type: 'text',
                          label: 'Category',
                          value: 'manual',
                          columns: 6
                      },
                  ]
                },
                {
                  label: 'Metadata',
                  fields: [
                      {
                          name: 'metadata',
                          type: 'json',
                          label: 'Metadata',
                          value: { "example": "hello world" },
                          rows: 15,
                          columns: 12
                      }
                  ]
                }
              ]
            },

        ]
    },
    edit: {
        title: 'Edit Incident',
        fields: [
            {
                name: 'category',
                type: 'text',
                label: 'Category',
                cols: 6,
            },
            {
                name: 'status',
                type: 'select',
                label: 'Status',
                placeholder: 'Select Status',
                options: ['open', 'investigating', 'resolved', 'closed', 'paused', 'ignored'],
                cols: 3,
            },
            {
                name: 'priority',
                type: 'text',
                label: 'Priority',
            },
            {
                name: 'details',
                type: 'textarea',
                label: 'Description',
                placeholder: 'Enter Name',
                cols: 12,
            },
            {
                name: 'model_name',
                type: 'text',
                label: 'Model',
                placeholder: 'Enter Model',
                cols: 8,
            },
            {
                name: 'model_id',
                type: 'text',
                label: 'Model ID',
                placeholder: 'Enter Model ID',
                cols: 4,
            },
        ],
    },
};

/* =========================
 * RuleSet / Rule
 * ========================= */
class IncidentRuleSet extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/incident/event/ruleset',
        });
    }
}

class IncidentRuleSetList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: IncidentRuleSet,
            endpoint: '/api/incident/event/ruleset',
            size: 10,
            ...options,
        });
    }
}

class IncidentRule extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/incident/event/ruleset/rule',
        });
    }
}

class IncidentRuleList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: IncidentRule,
            endpoint: '/api/incident/event/ruleset/rule',
            size: 10,
            ...options,
        });
    }
}

/* =========================
 * IncidentHistory
 * ========================= */
class IncidentHistory extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/incident/incident/history',
        });
    }
}

class IncidentHistoryList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: IncidentHistory,
            endpoint: '/api/incident/incident/history',
            size: 10,
            ...options,
        });
    }
}


export {
    IncidentEvent,
    IncidentEventList,
    IncidentEventForms,
    Incident,
    IncidentList,
    IncidentForms,
    IncidentRuleSet,
    IncidentRuleSetList,
    IncidentRule,
    IncidentRuleList,
    IncidentHistory,
    IncidentHistoryList
};

/* =========================
 * RuleSet
 * ========================= */

// Bundle By Options
const BundleByOptions = [
    { value: 0, label: 'No Bundling' },
    { value: 1, label: 'By Hostname' },
    { value: 2, label: 'By Model Name' },
    { value: 3, label: 'By Model Name + ID' },
    { value: 4, label: 'By Source IP' },
    { value: 5, label: 'By Hostname + Model Name' },
    { value: 6, label: 'By Hostname + Model Name + ID' },
    { value: 7, label: 'By Source IP + Model Name' },
    { value: 8, label: 'By Source IP + Model Name + ID' },
    { value: 9, label: 'By Source IP + Hostname' }
];

// Match By Options
const MatchByOptions = [
    { value: 0, label: 'ALL (must match all rules)' },
    { value: 1, label: 'ANY (match any rule)' }
];

// Comparator Options
const ComparatorOptions = [
    { value: '==', label: 'Equal (==)' },
    { value: 'eq', label: 'Equal (eq)' },
    { value: '>', label: 'Greater Than (>)' },
    { value: '>=', label: 'Greater Than or Equal (>=)' },
    { value: '<', label: 'Less Than (<)' },
    { value: '<=', label: 'Less Than or Equal (<=)' },
    { value: 'contains', label: 'Contains' },
    { value: 'regex', label: 'Regular Expression' }
];

// Value Type Options
const ValueTypeOptions = [
    { value: 'str', label: 'String' },
    { value: 'int', label: 'Integer' },
    { value: 'float', label: 'Float' },
    { value: 'bool', label: 'Boolean' }
];

// Common Event Fields for ComboInput
const CommonEventFields = [
    { value: 'level', label: 'Level', description: 'Event level (error, warning, info, debug)', meta: { type: 'str' } },
    { value: 'source_ip', label: 'Source IP Address', description: 'IP address of the event source', meta: { type: 'str' } },
    { value: 'rule_id', label: 'Rule ID', description: 'Numeric rule identifier', meta: { type: 'int' } },
    { value: 'hostname', label: 'Hostname', description: 'Hostname where event occurred', meta: { type: 'str' } },
    { value: 'component', label: 'Component', description: 'System component name', meta: { type: 'str' } },
    { value: 'component_id', label: 'Component ID', description: 'Component identifier', meta: { type: 'str' } },
    { value: 'category', label: 'Category', description: 'Event category (ossec, auth, api_error, etc.)', meta: { type: 'str' } },
    { value: 'description', label: 'Description', description: 'Event description text', meta: { type: 'str' } },
    { value: 'details', label: 'Details', description: 'Additional event details', meta: { type: 'str' } },
    { value: 'alert_id', label: 'Alert ID', description: 'Numeric alert identifier', meta: { type: 'int' } },
    { value: 'severity', label: 'Severity', description: 'Numeric severity level', meta: { type: 'int' } },
    { value: 'user', label: 'User', description: 'Username associated with event', meta: { type: 'str' } },
    { value: 'action', label: 'Action', description: 'Action that triggered the event', meta: { type: 'str' } },
    { value: 'status', label: 'Status', description: 'Status value or code', meta: { type: 'str' } },
    { value: 'status_code', label: 'Status Code', description: 'Numeric status code (e.g., HTTP status)', meta: { type: 'int' } },
    { value: 'message', label: 'Message', description: 'Event message text', meta: { type: 'str' } },
    { value: 'path', label: 'Path', description: 'File path or URL path', meta: { type: 'str' } },
    { value: 'title', label: 'Title', description: 'OSSEC Title', meta: { type: 'str' } },
    { value: 'country_code', label: 'Country Code', description: 'Country code associated with event', meta: { type: 'str' } },
    { value: 'region', label: 'Region', description: 'Region associated with event', meta: { type: 'str' } },
    { value: 'city', label: 'City', description: 'City associated with event', meta: { type: 'str' } },
    { value: 'http_user_agent', label: 'HTTP User Agent', description: 'User agent string associated with event', meta: { type: 'str' } },
    { value: 'request_path', label: 'Request Path', description: 'Request path associated with event', meta: { type: 'str' } },
    { value: 'method', label: 'Method', description: 'HTTP method or function name', meta: { type: 'str' } }
];

const CommonCategoryOptions = [
    // Scopes
    'global', 'account', 'ossec', 'api', 'realtime',
    // Auth & Login
    'auth', 'login:unknown', 'invalid_password',
    'sms:login_unknown', 'totp:login_unknown',
    'reset:unknown', 'magic:unknown', 'token:unknown',
    // Permissions
    'api_denied', 'unauthenticated',
    'view_permission_denied', 'edit_permission_denied',
    'group_member_permission_denied', 'user_permission_denied',
    // Security
    'security_alert',
    // MFA
    'totp:confirm_failed', 'totp:login_failed', 'totp:recovery_used',
    'sms:otp_failed',
    // Email & SMS
    'email:no_mailbox', 'email:send_failed', 'sms:send_failed',
    // Account Changes
    'email_change:bad_password', 'email_change:requested',
    'account:deactivate_requested',
    'phone_verify:invalid', 'email_verify:invalid',
    // OAuth
    'oauth:unlink_guard_error',
    // Errors
    'rest_error', 'mojo_rest_error', 'rest_value_error'
];

// Keep backward compat alias
const CommonScopeOptions = CommonCategoryOptions;

class RuleSet extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/incident/event/ruleset',
        });
    }
}

class RuleSetList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: RuleSet,
            endpoint: '/api/incident/event/ruleset',
            ...options,
        });
    }
}

const BundleMinutesOptions = [
    { value: 0, label: "Disabled — each event gets its own incident" },
    { value: 5, label: "5 minutes" },
    { value: 10, label: "10 minutes" },
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
    { value: 360, label: "6 hours" },
    { value: 720, label: "12 hours" },
    { value: 1440, label: "1 day" },
    { value: null, label: "No limit — bundle forever" }
];

const RuleSetForms = {
    create: {
        title: 'Create RuleSet',
        size: 'lg',
        fields: [
            {
                type: 'tabset',
                name: 'rulesetTabs',
                tabs: [
                    {
                        label: 'General',
                        fields: [
                            {
                                name: 'name',
                                type: 'text',
                                label: 'Name',
                                required: true,
                                placeholder: 'e.g., Brute Force Detection',
                                columns: 6
                            },
                            {
                                name: 'match_by',
                                type: 'select',
                                label: 'Match Logic',
                                value: 0,
                                options: MatchByOptions,
                                tooltip: 'ALL = every condition must match. ANY = at least one',
                                columns: 6
                            },
                            {
                                name: 'category',
                                type: 'combo',
                                label: 'Scope / Category',
                                required: true,
                                options: CommonCategoryOptions,
                                allowCustom: true,
                                placeholder: 'Type or select...',
                                tooltip: 'Scope or event category to match. Use * as a catch-all',
                                columns: 6
                            },
                            {
                                name: 'priority',
                                type: 'number',
                                label: 'Evaluation Priority',
                                value: 10,
                                required: true,
                                tooltip: 'Lower number = evaluated first',
                                columns: 6
                            },
                            {
                                name: 'is_active',
                                type: 'switch',
                                label: 'Active',
                                value: true,
                                tooltip: 'Inactive rules are skipped during event processing',
                                columns: 6
                            },
                            {
                                name: 'metadata.delete_on_resolution',
                                type: 'switch',
                                label: 'Delete on Resolution',
                                value: false,
                                tooltip: 'Incidents are permanently deleted when resolved or closed (CASCADE)',
                                columns: 6
                            }
                        ]
                    },
                    {
                        label: 'Bundling',
                        fields: [
                            {
                                name: 'bundle_by',
                                type: 'select',
                                label: 'Bundle By',
                                value: 4,
                                options: BundleByOptions,
                                tooltip: 'How to group related events into one incident',
                                columns: 6
                            },
                            {
                                name: 'bundle_minutes',
                                type: 'select',
                                label: 'Bundle Window',
                                value: 30,
                                options: BundleMinutesOptions,
                                tooltip: 'Events outside this window create a new incident',
                                columns: 6
                            },
                            {
                                name: 'bundle_by_rule_set',
                                type: 'switch',
                                label: 'Bundle by RuleSet',
                                value: true,
                                tooltip: 'Group events matched by this rule into the same incident',
                                columns: 6
                            }
                        ]
                    },
                    {
                        label: 'Thresholds',
                        fields: [
                            {
                                type: 'html',
                                columns: 12,
                                html: `<div class="alert alert-info small mb-3">
                                    <i class="bi bi-info-circle me-1"></i>
                                    <strong>How thresholds work:</strong> Events accumulate in "pending" status.
                                    Once trigger count is reached, the handler fires and the incident becomes "new".
                                    Leave empty to fire immediately on the first event.
                                </div>`
                            },
                            {
                                name: 'trigger_count',
                                type: 'number',
                                label: 'Trigger Count',
                                placeholder: 'Empty = immediate',
                                tooltip: 'Number of events before the handler fires',
                                columns: 4
                            },
                            {
                                name: 'trigger_window',
                                type: 'number',
                                label: 'Trigger Window (min)',
                                placeholder: 'Empty = all events',
                                tooltip: 'Only count events within this many minutes',
                                columns: 4
                            },
                            {
                                name: 'retrigger_every',
                                type: 'number',
                                label: 'Re-trigger Every',
                                placeholder: 'Empty = once',
                                tooltip: 'Re-fire handler every N additional events after initial trigger',
                                columns: 4
                            }
                        ]
                    },
                    {
                        label: 'Handler',
                        fields: [
                            {
                                name: 'handler',
                                type: 'text',
                                label: 'Handler Chain',
                                placeholder: 'e.g., block://?ttl=3600,ticket://?priority=8',
                                tooltip: 'Chain multiple handlers with commas',
                                columns: 12
                            },
                            {
                                type: 'html',
                                columns: 12,
                                html: `<div class="alert alert-light border small mb-0">
                                    <code>block://?ttl=3600</code> — Block source IP<br>
                                    <code>ticket://?priority=8</code> — Create ticket<br>
                                    <code>email://perm@manage_security</code> — Email notification<br>
                                    <code>sms://perm@manage_security</code> — SMS notification<br>
                                    <code>notify://perm@manage_security</code> — In-app + push<br>
                                    <code>llm://</code> — LLM triage agent<br>
                                    <code>job://myapp.module.function</code> — Async job
                                </div>`
                            }
                        ]
                    }
                ]
            }
        ]
    },
    edit: {
        title: 'Edit RuleSet',
        size: 'lg',
        fields: [
            {
                type: 'tabset',
                name: 'rulesetTabs',
                tabs: [
                    {
                        label: 'General',
                        fields: [
                            {
                                name: 'name',
                                type: 'text',
                                label: 'Name',
                                required: true,
                                placeholder: 'e.g., Brute Force Detection',
                                columns: 6
                            },
                            {
                                name: 'match_by',
                                type: 'select',
                                label: 'Match Logic',
                                options: MatchByOptions,
                                tooltip: 'ALL = every condition must match. ANY = at least one',
                                columns: 6
                            },
                            {
                                name: 'category',
                                type: 'combo',
                                label: 'Scope / Category',
                                options: CommonCategoryOptions,
                                allowCustom: true,
                                required: true,
                                placeholder: 'Type or select...',
                                tooltip: 'Scope or event category to match. Use * as a catch-all',
                                columns: 6
                            },
                            {
                                name: 'priority',
                                type: 'number',
                                label: 'Evaluation Priority',
                                required: true,
                                tooltip: 'Lower number = evaluated first',
                                columns: 6
                            },
                            {
                                name: 'is_active',
                                type: 'switch',
                                label: 'Active',
                                tooltip: 'Inactive rules are skipped during event processing',
                                columns: 6
                            },
                            {
                                name: 'metadata.delete_on_resolution',
                                type: 'switch',
                                label: 'Delete on Resolution',
                                tooltip: 'Incidents are permanently deleted when resolved or closed (CASCADE)',
                                columns: 6
                            }
                        ]
                    },
                    {
                        label: 'Bundling',
                        fields: [
                            {
                                name: 'bundle_by',
                                type: 'select',
                                label: 'Bundle By',
                                options: BundleByOptions,
                                tooltip: 'How to group related events into one incident',
                                columns: 6
                            },
                            {
                                name: 'bundle_minutes',
                                type: 'select',
                                label: 'Bundle Window',
                                options: BundleMinutesOptions,
                                tooltip: 'Events outside this window create a new incident',
                                columns: 6
                            },
                            {
                                name: 'bundle_by_rule_set',
                                type: 'switch',
                                label: 'Bundle by RuleSet',
                                tooltip: 'Group events matched by this rule into the same incident',
                                columns: 6
                            }
                        ]
                    },
                    {
                        label: 'Thresholds',
                        fields: [
                            {
                                type: 'html',
                                columns: 12,
                                html: `<div class="alert alert-info small mb-3">
                                    <i class="bi bi-info-circle me-1"></i>
                                    <strong>How thresholds work:</strong> Events accumulate in "pending" status.
                                    Once trigger count is reached, the handler fires and the incident becomes "new".
                                    Leave empty to fire immediately on the first event.
                                </div>`
                            },
                            {
                                name: 'trigger_count',
                                type: 'number',
                                label: 'Trigger Count',
                                placeholder: 'Empty = immediate',
                                tooltip: 'Number of events before the handler fires',
                                columns: 4
                            },
                            {
                                name: 'trigger_window',
                                type: 'number',
                                label: 'Trigger Window (min)',
                                placeholder: 'Empty = all events',
                                tooltip: 'Only count events within this window toward the trigger count',
                                columns: 4
                            },
                            {
                                name: 'retrigger_every',
                                type: 'number',
                                label: 'Re-trigger Every',
                                placeholder: 'Empty = once',
                                tooltip: 'Re-fire handler every N additional events after initial trigger',
                                columns: 4
                            }
                        ]
                    },
                    {
                        label: 'Handler',
                        fields: [
                            {
                                name: 'handler',
                                type: 'text',
                                label: 'Handler Chain',
                                placeholder: 'e.g., block://?ttl=3600,ticket://?priority=8',
                                tooltip: 'Chain multiple handlers with commas',
                                columns: 12
                            },
                            {
                                type: 'html',
                                columns: 12,
                                html: `<div class="alert alert-light border small mb-0">
                                    <code>block://?ttl=3600</code> — Block source IP<br>
                                    <code>ticket://?priority=8</code> — Create ticket<br>
                                    <code>email://perm@manage_security</code> — Email notification<br>
                                    <code>sms://perm@manage_security</code> — SMS notification<br>
                                    <code>notify://perm@manage_security</code> — In-app + push<br>
                                    <code>llm://</code> — LLM triage agent<br>
                                    <code>job://myapp.module.function</code> — Async job
                                </div>`
                            }
                        ]
                    }
                ]
            }
        ]
    }
};

/* =========================
 * Rule
 * ========================= */
class Rule extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/incident/event/ruleset/rule',
        });
    }
}

class RuleList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: Rule,
            endpoint: '/api/incident/event/ruleset/rule',
            ...options,
        });
    }
}

const RuleForms = {
    create: {
        title: 'Create Rule',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Name',
                required: true,
                placeholder: 'Enter rule name',
                cols: 12
            },
            {
                name: 'field_name',
                type: 'combo',
                label: 'Field Name',
                required: true,
                placeholder: 'Select or enter field name...',
                options: CommonEventFields,
                allowCustom: true,
                showDescription: true,
                help: 'Select a common field or type a custom field name',
                cols: 8
            },
            {
                name: 'index',
                type: 'select',
                label: 'Index',
                required: true,
                start: 0,
                end: 14,
                step: 1,
                cols: 4
            },
            {
                name: 'comparator',
                type: 'select',
                label: 'Comparator',
                required: true,
                options: ComparatorOptions,
                cols: 6
            },
            {
                name: 'value_type',
                type: 'select',
                label: 'Value Type',
                required: true,
                options: ValueTypeOptions,
                value: 'str',
                cols: 6
            },
            {
                name: 'value',
                type: 'textarea',
                label: 'Value',
                required: true,
                placeholder: 'Enter comparison value',
                cols: 12
            }
        ]
    },
    edit: {
        title: 'Edit Rule',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Name',
                required: true,
                placeholder: 'Enter rule name',
                cols: 12
            },
            {
                name: 'field_name',
                type: 'combo',
                label: 'Field Name',
                required: true,
                placeholder: 'Select or enter field name...',
                options: CommonEventFields,
                allowCustom: true,
                showDescription: true,
                help: 'Select a common field or type a custom field name',
                cols: 12
            },
            {
                name: 'comparator',
                type: 'select',
                label: 'Comparator',
                required: true,
                options: ComparatorOptions,
                cols: 6
            },
            {
                name: 'value_type',
                type: 'select',
                label: 'Value Type',
                required: true,
                options: ValueTypeOptions,
                cols: 6
            },
            {
                name: 'value',
                type: 'text',
                label: 'Value',
                required: true,
                placeholder: 'Enter comparison value',
                cols: 12
            }
        ]
    }
};

// Attach forms to models
RuleSet.EDIT_FORM = RuleSetForms.edit;
RuleSet.ADD_FORM = RuleSetForms.create;
RuleSet.CREATE_FORM = RuleSetForms.create; // Alias for compatibility
RuleSet.BundleByOptions = BundleByOptions;
RuleSet.MatchByOptions = MatchByOptions;

Rule.EDIT_FORM = RuleForms.edit;
Rule.ADD_FORM = RuleForms.create;
Rule.CREATE_FORM = RuleForms.create; // Alias for compatibility
Rule.ComparatorOptions = ComparatorOptions;
Rule.ValueTypeOptions = ValueTypeOptions;

export {
    RuleSet,
    RuleSetList,
    RuleSetForms,
    Rule,
    RuleList,
    RuleForms,
    IncidentStats,
    BundleByOptions,
    MatchByOptions,
    ComparatorOptions,
    ValueTypeOptions,
    CommonEventFields,
    CommonCategoryOptions,
    CommonScopeOptions
};
