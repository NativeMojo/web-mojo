
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
                name: 'state',
                type: 'select',
                label: 'State',
                placeholder: 'Select State',
                options: ['new', 'opened', 'paused', 'ignore', 'resolved'],
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

const CommonScopeOptions = [
    { value: 'global', label: 'Global' },
    { value: 'account', label: 'Account' },
    { value: 'incident', label: 'Incident' },
    { value: 'ossec', label: 'OSSEC' },
    { value: 'fileman', label: 'File Manager' },
    { value: 'metrics', label: 'Metrics' },
    { value: 'jobs', label: 'Jobs' },
    { value: 'realtime', label: 'Realtime' },
    { value: 'aws', label: 'AWS' }
];

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

const RuleSetForms = {
    create: {
        title: 'Create RuleSet',
        size: 'lg',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Name',
                required: true,
                placeholder: 'Enter ruleset name',
                cols: 12
            },
            {
                name: 'category',
                type: 'combo',
                label: 'Scope',
                required: true,
                options: CommonScopeOptions,
                placeholder: 'e.g., ossec, auth, api_error',
                cols: 6
            },
            {
                name: 'priority',
                type: 'number',
                label: 'Priority',
                value: 10,
                required: true,
                cols: 6
            },
            {
                name: 'match_by',
                type: 'select',
                label: 'Match Logic',
                value: 0,
                options: MatchByOptions,
                cols: 12
            },
            {
                name: 'bundle_by',
                type: 'select',
                label: 'Bundle By',
                value: 0,
                options: BundleByOptions,
                cols: 12
            },
            {
                name: 'bundle_minutes',
                type: 'number',
                label: 'Bundle Minutes',
                value: 10,
                placeholder: 'Time window for bundling',
                cols: 12
            },
            {
                name: 'handler',
                type: 'text',
                label: 'Handler',
                placeholder: 'e.g., email://user@company.com, task://name',
                cols: 12
            },
            {
                name: 'is_active',
                type: 'switch',
                label: 'Is Active',
                value: true,
                cols: 6
            },
            {
                name: 'bundle_by_rule_set',
                type: 'switch',
                label: 'Bundle by Rule Set',
                value: true,
                cols: 6
            }
        ]
    },
    edit: {
        title: 'Edit RuleSet',
        size: 'lg',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Name',
                required: true,
                placeholder: 'Enter ruleset name',
                cols: 12
            },
            {
                name: 'category',
                type: 'combo',
                label: 'Scope',
                options: CommonScopeOptions,
                required: true,
                placeholder: 'e.g., ossec, auth, api_error',
                cols: 6
            },
            {
                name: 'priority',
                type: 'number',
                label: 'Priority',
                required: true,
                cols: 6
            },
            {
                name: 'match_by',
                type: 'select',
                label: 'Match Logic',
                options: MatchByOptions,
                cols: 12
            },
            {
                name: 'bundle_by',
                type: 'select',
                label: 'Bundle By',
                options: BundleByOptions,
                cols: 12
            },
            {
                name: 'bundle_minutes',
                type: 'select',
                label: 'Bundle Minutes',
                placeholder: 'Time window for bundling',
                "options": [
                  {"value": 0, "label": "Disabled - don't bundle by time"},
                  {"value": 5, "label": "5 minutes"},
                  {"value": 10, "label": "10 minutes"},
                  {"value": 15, "label": "15 minutes"},
                  {"value": 30, "label": "30 minutes"},
                  {"value": 60, "label": "1 hour"},
                  {"value": 120, "label": "2 hours"},
                  {"value": 360, "label": "6 hours"},
                  {"value": 720, "label": "12 hours"},
                  {"value": 1440, "label": "1 day"},
                  {"value": null, "label": "No limit - bundle forever"}
                ],
                cols: 12
            },
            {
                name: 'handler',
                type: 'text',
                label: 'Handler',
                placeholder: 'e.g., email://user@company.com, task://name',
                cols: 12
            },
            {
                name: 'is_active',
                type: 'switch',
                label: 'Is Active',
                value: true,
                cols: 6
            },
            {
                name: 'bundle_by_rule_set',
                type: 'switch',
                label: 'Bundle by Rule Set',
                value: true,
                cols: 6
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
    CommonScopeOptions
};
