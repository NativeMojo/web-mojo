import TablePage from '@core/pages/TablePage.js';
import { groupByField } from '@core/views/list/grouping.js';
import { RuleSet, RuleSetList, BundleByOptions, CommonCategoryOptions } from '@ext/admin/models/Incident.js';
import RuleSetView, { parseHandlerChain } from './RuleSetView.js';

// RuleSet.ADD_FORM / EDIT_FORM are registered on the model (Incident.js).
// Wire the page-level view dialog here.
RuleSet.VIEW_CLASS = RuleSetView;

// --- Cell helpers ---------------------------------------------------------

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, m => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
    ));
}

function bundleByShort(value) {
    if (!value) return null;
    const opt = BundleByOptions.find(o => o.value === value);
    return opt ? opt.label.replace(/^By\s+/i, '') : String(value);
}

// Priority pill — lower priority runs first, so visually we want low numbers
// to stand out (the front of the call order) and high numbers to fade out.
function _rulePriorityPill(value) {
    const p = parseInt(value, 10);
    if (Number.isNaN(p)) return `<span class="text-body-tertiary">—</span>`;
    let cls;
    if (p <= 3)      cls = 'text-bg-primary';
    else if (p <= 7) cls = 'text-bg-secondary';
    else             cls = 'bg-body-tertiary text-body-tertiary border';
    return `<span class="badge ${cls} font-monospace" title="Lower priority runs first">${p}</span>`;
}

// Rich "Rule" cell — priority pill + name + active state + #id reference,
// laid out as a two-line identity block. Replaces the four atomic columns
// (ID / Priority / Active / Name) so the eye lands on a single scan target.
function _ruleIdentityCell(model) {
    const id = model.get('id');
    const name = model.get('name') || '(unnamed)';
    const isActive = !!model.get('is_active');
    const priority = model.get('priority');
    const activeIcon = isActive ? 'bi-check-circle-fill' : 'bi-circle';
    const activeLabel = isActive ? 'Active' : 'Inactive';
    const activeClass = isActive ? 'is-active' : 'is-inactive';

    return `
        <div class="rs-row-identity">
            ${_rulePriorityPill(priority)}
            <div class="rs-row-identity-text">
                <div class="rs-row-identity-name">${escapeHtml(name)}</div>
                <div class="rs-row-identity-meta">
                    <span class="rs-row-identity-active ${activeClass}"><i class="bi ${activeIcon}"></i>${activeLabel}</span>
                    <span class="rs-row-identity-id">#${escapeHtml(String(id ?? ''))}</span>
                </div>
            </div>
        </div>
    `;
}

// Rich "Behavior" cell — handler chain chips + trigger/bundle one-liner.
function _ruleBehaviorCell(model) {
    const chain = parseHandlerChain(model.get('handler'));
    const chips = chain.length === 0
        ? `<span class="rs-row-chip rs-row-chip-empty"><i class="bi bi-dash-circle"></i>Record only</span>`
        : chain.map(s => `<span class="rs-row-chip tone-${s.tone}" title="${escapeHtml(s.label)}${s.detail ? ' — ' + escapeHtml(s.detail) : ''}"><i class="bi ${s.icon}"></i>${escapeHtml(s.label)}</span>`).join('');

    const tc = model.get('trigger_count');
    const tw = model.get('trigger_window');
    const bb = model.get('bundle_by');

    let trigger;
    if (!tc)           trigger = `<i class="bi bi-lightning-charge"></i>Fires immediately`;
    else if (!tw)      trigger = `<i class="bi bi-stopwatch"></i>${tc} events`;
    else               trigger = `<i class="bi bi-stopwatch"></i>${tc} events / ${tw} min`;

    const bundleShort = bundleByShort(bb);
    const bundle = bundleShort
        ? `<i class="bi bi-collection"></i>${escapeHtml(bundleShort)}`
        : `<i class="bi bi-collection"></i>No bundling`;

    return `
        <div class="rs-row-behavior">
            <div class="rs-row-chips">${chips}</div>
            <div class="rs-row-meta">${trigger}<span class="rs-row-sep">·</span>${bundle}</div>
        </div>
    `;
}


class RuleSetTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_rulesets',
            pageName: 'Rule Engine',
            router: "admin/rulesets",
            Collection: RuleSetList,

            viewDialogOptions: {
                header: false,
                noBodyPadding: true,
                buttons: []                  // RuleSetView is a DetailView — no footer; X / Esc / backdrop dismiss; size inherits TablePage's `lg` default
            },

            // Lowest priority runs first — surface it on top.
            defaultQuery: { sort: 'priority', size: 50},

            // Cluster rules by priority so the call-order bands are visually
            // obvious; with sort=priority asc, group headers appear 1, 3, 5, …
            // in the natural numeric order.
            ...groupByField('priority', { format: (key) => `Priority ${key}` }),

            columns: [
                {
                    key: 'name', label: 'Rule', sortable: true,
                    formatter: (_value, context) => _ruleIdentityCell(context.model)
                },
                {
                    key: 'category', label: 'Category', sortable: true, formatter: 'badge',
                    filter: {
                        type: 'combobox',
                        options: CommonCategoryOptions
                    }
                },
                {
                    key: 'handler', label: 'Behavior',
                    visibility: 'lg',
                    formatter: (_value, context) => _ruleBehaviorCell(context.model)
                }
            ],

            // is_active no longer has its own column (it's inline in the Rule
            // cell), so expose Active/Inactive filtering at the page level.
            filters: [
                {
                    key: 'is_active', label: 'Active',
                    filter: { type: 'boolean', trueLabel: 'Active', falseLabel: 'Inactive' }
                }
            ],

            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,
            showRefresh: true,
            showAdd: true,
            showExport: true,

            emptyMessage: 'No rule sets found. Create one to start matching events automatically.',

            batchBarLocation: 'top',
            batchActions: [
                { label: "Enable", icon: "bi bi-toggle-on", action: "enable" },
                { label: "Disable", icon: "bi bi-toggle-off", action: "disable" },
                { label: "Delete", icon: "bi bi-trash", action: "delete", danger: true }
            ],

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }

    onActionBatchEnable()  { return this.batchAction({ field: 'is_active', value: true,  label: 'Enable' }); }
    onActionBatchDisable() { return this.batchAction({ field: 'is_active', value: false, label: 'Disable' }); }
    onActionBatchDelete()  { return this.batchAction({ destroy: true,                    label: 'Delete' }); }
}

export default RuleSetTablePage;
