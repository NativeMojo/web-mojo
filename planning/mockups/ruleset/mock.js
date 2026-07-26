(function () {
    'use strict';

    // ── Section switching ───────────────────────────────
    const rail = document.getElementById('rail');
    const sections = document.querySelectorAll('.rs-section');
    const links = document.querySelectorAll('.rs-rail-link');

    function showSection(key) {
        sections.forEach(s => s.classList.toggle('is-active', s.dataset.section === key));
        links.forEach(l => l.classList.toggle('is-active', l.dataset.section === key));
        document.querySelector('.rs-content').scrollTop = 0;
    }

    rail.addEventListener('click', (e) => {
        const link = e.target.closest('.rs-rail-link');
        if (!link) return;
        showSection(link.dataset.section);
    });

    // Cross-section "go to" links inside copy
    document.body.addEventListener('click', (e) => {
        const go = e.target.closest('[data-go]');
        if (!go) return;
        e.preventDefault();
        showSection(go.dataset.go);
    });

    // ── Theme toggle ────────────────────────────────────
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
        const html = document.documentElement;
        const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
        html.dataset.theme = next;
        themeBtn.querySelector('i').className = next === 'dark' ? 'bi bi-moon-stars' : 'bi bi-sun';
    });

    // ── Render the example metadata as syntax-highlighted JSON ──
    const RULESET = {
        id: 74,
        created: 1777154534,
        modified: 1777154548,
        priority: 0,
        category: 'user_permission_denied',
        name: 'User Permission Denied - Bundle by IP',
        bundle_minutes: 1440,
        bundle_by: 4,
        bundle_by_rule_set: true,
        match_by: 0,
        handler: 'notify://?perm=manage_security',
        trigger_count: 6,
        trigger_window: null,
        retrigger_every: null,
        metadata: {
            reasoning: "Bundle permission denied events by source IP over 24 hours. If volume exceeds 6, raise a ticket for investigation — could indicate privilege escalation, misconfigured app, or a user hitting walls they shouldn't be.",
            assistant_proposed: true,
            delete_on_resolution: false,
            agent_prompt: '...truncated for display, see Agent Prompt section...'
        },
        is_active: true
    };

    function highlight(json) {
        return json
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"([^"\\]*(?:\\.[^"\\]*)*)"(\s*:)/g, '<span class="k">"$1"</span>$2')
            .replace(/: "([^"\\]*(?:\\.[^"\\]*)*)"/g, ': <span class="s">"$1"</span>')
            .replace(/: (true|false)/g, ': <span class="b">$1</span>')
            .replace(/: (-?\d+(?:\.\d+)?)/g, ': <span class="n">$1</span>')
            .replace(/: null/g, ': <span class="n">null</span>');
    }

    const rawEl = document.getElementById('raw-json');
    if (rawEl) {
        rawEl.innerHTML = highlight(JSON.stringify(RULESET.metadata, null, 2));
    }
})();
