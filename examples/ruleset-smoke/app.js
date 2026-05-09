/**
 * RuleSetView smoke harness — mounts a real RuleSetView with synthetic data.
 * Used to visually verify the redesigned view + new framework primitives.
 *
 * No real backend; the model's collection fetches will fail silently and
 * the view will render the empty/loading states for those sections.
 */

import '@core/css/core.css';
import '@core/css/table.css';
import '@ext/admin/css/admin.css';
import Modal from '@core/views/feedback/Modal.js';
import RuleSetView from '@ext/admin/incidents/RuleSetView.js';
import { RuleSet } from '@ext/admin/models/Incident.js';

// Synthetic ruleset matching the example payload from the request
const SAMPLE = {
    id: 74,
    created: 1777154534,
    modified: Math.floor(Date.now() / 1000) - 7200,  // ~2h ago
    priority: 0,
    category: 'user_permission_denied',
    name: 'User Permission Denied — Bundle by IP',
    bundle_minutes: 1440,
    bundle_by: 4,
    bundle_by_rule_set: true,
    match_by: 0,
    handler: 'notify://?perm=manage_security, ticket://?priority=8, llm://',
    trigger_count: 6,
    trigger_window: null,
    retrigger_every: null,
    metadata: {
        reasoning: "Bundle permission denied events by source IP over 24 hours. If volume exceeds 6, raise a ticket for investigation — could indicate privilege escalation, misconfigured app, or a user hitting walls they shouldn't be.",
        assistant_proposed: true,
        delete_on_resolution: false,
        agent_prompt: `You are a security analyst triaging a permission-denied incident.

Context to consider:
- The user attempted an action they don't have permission for.
- Events have been bundled by source IP over the last 24h.
- A volume of 6+ such events from the same source crossed the threshold.

Decide:
1. Is this likely a misconfigured app or stale role assignment? (low risk)
2. A user repeatedly probing endpoints? (medium risk)
3. Credential abuse / privilege escalation attempt? (high risk)

Output:
- A 2-sentence summary aimed at an on-call engineer.
- A risk score from 1–10.
- A recommended action: dismiss, ticket, or block IP.`
    },
    is_active: true
};

const model = new RuleSet(SAMPLE);

const view = new RuleSetView({ model });

// Expose for in-browser inspection / synthetic-data injection
window.__rs = view;

// Render the view inline AND offer a Modal.detail() launcher so we can exercise
// the modal envelope (no body padding, no footer) end-to-end.
const host = document.getElementById('host');
view.render(true, host);

window.__openInModal = async () => {
    // Re-instantiate so the same model isn't double-mounted
    const modalView = new RuleSetView({ model });
    window.__modalView = modalView;
    return Modal.detail(modalView);
};
window.__seedIncidents = () => {
    const list = view.incidentsCollection;
    if (!list) return null;
    const synthetic = [
        { id: 8842, created: Math.floor(Date.now()/1000) - 14*60,    status: 'new',       priority: 5, title: 'Permission denied burst from 198.51.100.42 — 9 events',  event_count: 9 },
        { id: 8801, created: Math.floor(Date.now()/1000) - 5*3600,   status: 'open',      priority: 8, title: 'Permission denied burst from 203.0.113.7 — 14 events',  event_count: 14 },
        { id: 8744, created: Math.floor(Date.now()/1000) - 1*86400,  status: 'resolved',  priority: 3, title: 'Permission denied burst from 192.0.2.18 — 6 events',    event_count: 6 },
        { id: 8702, created: Math.floor(Date.now()/1000) - 1.4*86400,status: 'resolved',  priority: 5, title: 'Permission denied burst from 198.51.100.42 — 8 events', event_count: 8 },
        { id: 8651, created: Math.floor(Date.now()/1000) - 2*86400,  status: 'pending',   priority: 3, title: 'Permission denied accumulating from 203.0.113.55 — 4 events', event_count: 4 }
    ];
    list.reset(synthetic);
    list.totalCount = synthetic.length;
    list.emit?.('fetch:success', list);
    return synthetic.length;
};
window.__seedConditions = () => {
    const list = view.conditionsCollection;
    if (!list) return null;
    const synthetic = [
        { id: 412, name: 'Match category',  field_name: 'category',   comparator: '==',    value: 'user_permission_denied', value_type: 'str' },
        { id: 413, name: 'Has source IP',   field_name: 'source_ip',  comparator: 'regex', value: '^.+$',                   value_type: 'str' },
        { id: 414, name: 'Severity floor',  field_name: 'severity',   comparator: '>=',    value: '3',                      value_type: 'int' }
    ];
    list.reset(synthetic);
    list.totalCount = synthetic.length;
    list.emit?.('fetch:success', list);
    return synthetic.length;
};
window.__seedAll = () => ({ incidents: window.__seedIncidents(), conditions: window.__seedConditions() });

// Theme toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    const html = document.documentElement;
    html.dataset.bsTheme = html.dataset.bsTheme === 'dark' ? 'light' : 'dark';
});
