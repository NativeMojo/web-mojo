import Collection from '@core/Collection.js';
import Model from '@core/Model.js';
import { GroupList } from './Group.js';

// =========================
// PushDevice
// =========================
class PushDevice extends Model {
    constructor(data = {}) {
        super(data, { endpoint: '/api/account/devices/push' });
    }
}

class PushDeviceList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: PushDevice, endpoint: '/api/account/devices/push', ...options });
    }
}

// =========================
// PushTemplate
// =========================
class PushTemplate extends Model {
    constructor(data = {}) {
        super(data, { endpoint: '/api/account/devices/push/templates' });
    }
}

class PushTemplateList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: PushTemplate, endpoint: '/api/account/devices/push/templates', ...options });
    }
}

// =========================
// PushConfig
// =========================
class PushConfig extends Model {
    constructor(data = {}) {
        super(data, { endpoint: '/api/account/devices/push/config' });
    }
}

class PushConfigList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: PushConfig, endpoint: '/api/account/devices/push/config', ...options });
    }
}

// =========================
// PushDelivery
// =========================
class PushDelivery extends Model {
    constructor(data = {}) {
        super(data, { endpoint: '/api/account/devices/push/deliveries' });
    }
}

class PushDeliveryList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: PushDelivery, endpoint: '/api/account/devices/push/deliveries', ...options });
    }
}

// =========================
// Forms
// =========================
const PushConfigForms = {
    create: {
        title: 'Create Push Configuration',
        fields: [
            { name: 'name', label: 'Name', required: true },
            { type: 'collection', name: 'group', label: 'Group (optional)', Collection: GroupList, labelField: 'name', valueField: 'id' },
            { name: 'fcm_sender_id', label: 'FCM Sender ID' },
            { name: 'fcm_server_key', label: 'FCM Server Key', type: "textarea" },
        ]
    },
    edit: {
        title: 'Edit Push Configuration',
        fields: [
            { name: 'name', label: 'Name', required: true },
            { type: 'collection', name: 'group', label: 'Group (optional)', Collection: GroupList, labelField: 'name', valueField: 'id' },
            { name: 'fcm_sender_id', label: 'FCM Sender ID' },
            { name: 'fcm_server_key', label: 'FCM Server Key', type: "textarea" },
            { name: 'is_active', label: 'Is Active', type: 'switch', value: true },
        ]
    }
};

const PushTemplateForms = {
    edit: {
        title: 'Edit Push Template',
        fields: [
            { name: 'name', label: 'Name', required: true },
            { name: 'category', label: 'Category', required: true },
            { type: 'collection', name: 'group', label: 'Group (optional)', Collection: GroupList, labelField: 'name', valueField: 'id' },
            { name: 'title_template', label: 'Title Template', required: true },
            { name: 'body_template', label: 'Body Template', type: 'textarea', required: true },
            { name: 'action_url', label: 'Action URL' },
            { name: 'priority', label: 'Priority', type: 'select', options: ['high', 'normal'] },
            { name: 'variables', label: 'Variables', type: 'json', help: 'JSON format' },
            { name: 'is_active', label: 'Is Active', type: 'switch' },
        ]
    }
};

PushConfigForms.create = PushConfigForms.edit;
PushTemplateForms.create = PushTemplateForms.edit;


export {
    PushDevice, PushDeviceList,
    PushTemplate, PushTemplateList,
    PushConfig, PushConfigList,
    PushDelivery, PushDeliveryList,
    PushConfigForms, PushTemplateForms
};
