
import Collection from '../core/Collection.js';
import Model from '../core/Model.js';

/* =========================
 * IncidentEvent
 * ========================= */
class IncidentEvent extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/incident/event',
        });
    }
}

class IncidentEventList extends Collection {
    constructor(options = {}) {
        super(IncidentEvent, {
            endpoint: '/api/incident/event',
            size: 20,
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
        super(Incident, {
            endpoint: '/api/incident/incident',
            size: 20,
            ...options,
        });
    }
}

const IncidentForms = {
    create: {
        title: 'Create Incident',
        fields: [
            { name: 'title', type: 'text', label: 'Title', required: true, cols: 12 },
            { name: 'details', type: 'textarea', label: 'Details', required: true, cols: 12 },
            { name: 'priority', type: 'number', label: 'Priority', value: 5, cols: 6 },
            { name: 'state', type: 'select', label: 'State', value: 'open', options: ['open', 'investigating', 'resolved', 'closed'], cols: 6 },
            { name: 'category', type: 'text', label: 'Category', value: 'manual', cols: 12 },
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
            endpoint: '/api/event/ruleset',
        });
    }
}

class IncidentRuleSetList extends Collection {
    constructor(options = {}) {
        super(IncidentRuleSet, {
            endpoint: '/api/event/ruleset',
            size: 20,
            ...options,
        });
    }
}

class IncidentRule extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/event/ruleset/rule',
        });
    }
}

class IncidentRuleList extends Collection {
    constructor(options = {}) {
        super(IncidentRule, {
            endpoint: '/api/event/ruleset/rule',
            size: 20,
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
        super(IncidentHistory, {
            endpoint: '/api/incident/incident/history',
            size: 20,
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
class RuleSet extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/event/ruleset',
        });
    }
}

class RuleSetList extends Collection {
    constructor(options = {}) {
        super(RuleSet, {
            endpoint: '/api/event/ruleset',
            ...options,
        });
    }
}

/* =========================
 * Rule
 * ========================= */
class Rule extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/event/ruleset/rule',
        });
    }
}

class RuleList extends Collection {
    constructor(options = {}) {
        super(Rule, {
            endpoint: '/api/event/ruleset/rule',
            ...options,
        });
    }
}

export { RuleSet, RuleSetList, Rule, RuleList };
