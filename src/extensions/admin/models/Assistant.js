
import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/* =========================
 * AssistantConversation
 * ========================= */
class AssistantConversation extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/assistant/conversation',
        });
    }
}

class AssistantConversationList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: AssistantConversation,
            endpoint: '/api/assistant/conversation',
            size: 50,
            ...options,
        });
    }
}

/* =========================
 * AssistantSkill
 * ========================= */
class AssistantSkill extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/assistant/skill',
        });
    }
}

class AssistantSkillList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: AssistantSkill,
            endpoint: '/api/assistant/skill',
            size: 50,
            ...options,
        });
    }
}

export {
    AssistantConversation,
    AssistantConversationList,
    AssistantSkill,
    AssistantSkillList
};

export default AssistantConversation;
