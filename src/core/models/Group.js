
import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/**
 * Group Model - Represents an organization, team, or group entity
 *
 * Features:
 * - Hierarchical group support (parent/child relationships)
 * - Member management
 * - Search and filtering capabilities
 * - Role-based permissions within groups
 * - Metadata and settings management
 */
class Group extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/group'
        });
    }
}

/**
 * GroupCollection - Enhanced collection for managing groups with advanced search and filtering
 */
class GroupList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: Group,
            endpoint: '/api/group',
            size: 10,
            ...options
        });
    }
}

const GroupKinds = {
    'org': 'Organization',
    'platform': 'Platform',
    'division': 'Division',
    'department': 'Department',
    'team': 'Team',
    'merchant': 'Merchant',
    'partner': 'Partner',
    'client': 'Client',
    'iso': 'ISO',
    'sales': 'Sales',
    'reseller': 'Reseller',
    'location': 'Location',
    'region': 'Region',
    'route': 'Route',
    'project': 'Project',
    "inventory": "Inventory",
    'test': 'Testing',
    'misc': 'Miscellaneous',
    'qa': 'Quality Assurance'
};

// Convert GroupKinds to select options
const GroupKindOptions = Object.entries(GroupKinds).map(([key, label]) => ({
    value: key,
    label: label
}));

// Canonical timezone list — single source of truth shared by the edit form
// and the inline "Edit Timezone" pencil so the two can never drift apart.
const TimezoneOptions = [
    { value: 'America/New_York',    label: 'Eastern Time (ET)' },
    { value: 'America/Chicago',     label: 'Central Time (CT)' },
    { value: 'America/Denver',      label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage',   label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu',    label: 'Hawaii Time (HT)' },
    { value: 'UTC',                 label: 'UTC' },
    { value: 'Europe/London',       label: 'London (GMT/BST)' },
    { value: 'Europe/Paris',        label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin',       label: 'Berlin (CET/CEST)' },
    { value: 'Asia/Tokyo',          label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai',       label: 'Shanghai (CST)' },
    { value: 'Australia/Sydney',    label: 'Sydney (AEST)' }
];

// Canonical end-of-day hour list (0–23 with 12-hour labels).
const EodHourOptions = Array.from({ length: 24 }, (_, h) => {
    let label;
    if (h === 0) label = 'Midnight';
    else if (h === 12) label = 'Noon';
    else label = `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
    return { value: h, label };
});

/**
 * Shared field fragments for Group forms.
 *
 * Returns FRESH field objects on every call so two form configs never share a
 * mutable field reference — FormBuilder writes `columns`/`cols` onto the field
 * objects it renders, and sharing one object across forms would let those
 * writes leak. The option arrays (kinds, timezones, eod hours) ARE shared by
 * reference on purpose: that's the single source of truth that stops the quick
 * edit form, the detailed form, and the inline pencils from drifting.
 */
function groupFields() {
    return {
        avatar:        { type: 'image', name: 'avatar', size: 'lg', imageSize: { width: 200, height: 200 }, placeholder: 'Upload your avatar', help: 'Square images work best', columns: 12 },
        name:          { name: 'name', type: 'text', label: 'Group Name', required: true, placeholder: 'Enter group name', columns: 12 },
        kind:          { name: 'kind', type: 'combo', label: 'Group Kind', required: true, placeholder: 'Type or select kind...', options: GroupKindOptions, columns: 12 },
        parent:        { type: 'collection', name: 'parent', label: 'Parent Group', Collection: GroupList, labelField: 'name', valueField: 'id', maxItems: 10, placeholder: 'Search groups...', emptyFetch: false, debounceMs: 300, columns: 12 },
        isActive:      { name: 'is_active', type: 'switch', label: 'Is Active', columns: 12 },
        uuid:          { name: 'uuid', type: 'text', label: 'UUID', placeholder: '32-character hex string', columns: 12 },
        shortName:     { name: 'metadata.short_name', type: 'text', label: 'Short Name', placeholder: 'Enter short name', columns: 6 },
        domain:        { name: 'metadata.domain', type: 'text', label: 'Default Domain', placeholder: 'Enter domain', columns: 6 },
        authDomain:    { name: 'metadata.auth_domain', type: 'text', label: 'Auth Domain', placeholder: 'auth.example.com', help: 'Used for white-label login pages.', columns: 6 },
        portal:        { name: 'metadata.portal', type: 'text', label: 'Default Portal', placeholder: 'https://…', columns: 6 },
        timezone:      { name: 'metadata.timezone', type: 'select', label: 'Timezone', options: TimezoneOptions, columns: 6 },
        eodHour:       { name: 'metadata.eod_hour', type: 'select', label: 'End of Day Hour', options: EodHourOptions, columns: 6 },
        emailTemplate: { name: 'metadata.email_template', type: 'text', label: 'Email Template (Prefix)', placeholder: 'Enter template prefix', columns: 12 }
    };
}

/**
 * Form configurations for group management.
 *
 * `create`, `edit`, and `detailed` all compose their fields from
 * `groupFields()`, so a field's type/label/options are defined exactly once.
 * Getters return a fresh config on each access — cheap, and it guarantees each
 * modal open starts from clean field objects.
 */
const GroupForms = {
    // Minimal "Add Group" flow.
    get create() {
        const f = groupFields();
        return {
            title: 'Create Group',
            fields: [f.name, f.kind, f.parent]
        };
    },

    // Row-edit from the groups table is the SAME universal form as the detail
    // page — `edit` is an alias of `detailed` (just retitled "Edit Group") so
    // `Group.EDIT_FORM` and any external consumer resolve to the one tabset.
    get edit() {
        return { ...this.detailed, title: 'Edit Group' };
    },

    // Full editor from the group detail page — every editable field, organized
    // into tabs. Covers everything the inline pencils edit (incl. short_name /
    // auth_domain, which previously lived only as inline editors).
    get detailed() {
        const f = groupFields();
        return {
            title: 'Group Details',
            fields: [{
                type: 'tabset',
                name: 'group-detail',
                tabs: [
                    { label: 'Profile',      fields: [f.name, f.kind, f.parent, f.isActive] },
                    { label: 'Identity',     fields: [f.uuid, f.shortName, f.domain, f.authDomain, f.portal] },
                    { label: 'Localization', fields: [f.timezone, f.eodHour] },
                    { label: 'Branding',     fields: [f.emailTemplate] },
                    { label: 'Avatar',       fields: [f.avatar] }
                ]
            }]
        };
    }
};

Group.EDIT_FORM = GroupForms.edit;
Group.ADD_FORM = GroupForms.create;
Group.CREATE_FORM = GroupForms.create; // Alias for compatibility
// The edit form is the multi-tab universal form — give the row-edit modal room.
Group.FORM_DIALOG_CONFIG = { size: 'lg' };
Group.GroupKindOptions = GroupKindOptions;
Group.GroupKinds = GroupKinds;
Group.TimezoneOptions = TimezoneOptions;
Group.EodHourOptions = EodHourOptions;
export { Group, GroupList, GroupForms, GroupKindOptions, TimezoneOptions, EodHourOptions };
