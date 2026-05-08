/**
 * RuleSetView smoke harness — mounts a real RuleSetView with synthetic data.
 * Used to visually verify the redesigned view + new framework primitives.
 *
 * No real backend; the model's collection fetches will fail silently and
 * the view will render the empty/loading states for those sections.
 */

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
const host = document.getElementById('host');
view.render(true, host);

// Theme toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    const html = document.documentElement;
    html.dataset.bsTheme = html.dataset.bsTheme === 'dark' ? 'light' : 'dark';
});
