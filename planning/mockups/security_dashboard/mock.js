/* ============================================================
   Security Dashboard — mock data + tiny SVG renderers
   No framework. Pure DOM + inline SVG so the mockup works as a
   single static page. Real implementation will use SeriesChart /
   PieChart from web-mojo/charts.
   ============================================================ */

(() => {

  /* ─── synthetic data ─────────────────────────────────── */

  const todayMs = Date.UTC(2026, 3, 26);
  const days = (n) => Array.from({ length: n }, (_, i) => new Date(todayMs - (n - 1 - i) * 86400000));

  // 30-day stacked composition. Realistic-ish variability.
  const COMPOSITION = days(30).map((d, i) => {
    const wd = d.getUTCDay();
    const weekendDamp = (wd === 0 || wd === 6) ? 0.55 : 1;
    const burst = (i === 21) ? 2.4 : (i === 17 ? 1.6 : 1);
    const base = 80 + Math.round(Math.sin(i * 0.7) * 30) + Math.round(Math.random() * 20);
    return {
      date: d.toISOString().slice(0, 10),
      events:   Math.round(base * 1.4 * weekendDamp * burst),
      firewall: Math.round((6 + (i % 7) + Math.random() * 6) * weekendDamp * burst),
      bouncer:  Math.round((22 + Math.sin(i) * 8 + Math.random() * 12) * weekendDamp * burst),
      auth:     Math.round((14 + (i === 21 ? 36 : 0) + Math.random() * 10) * weekendDamp),
    };
  });

  // 30-day auth-only series
  const AUTH = COMPOSITION.map(d => ({ date: d.date, value: d.auth + Math.round(d.events * 0.04) }));

  // sparkline templates (7-day)
  const SPARKS = {
    'open-inc': [12, 14, 13, 17, 19, 21, 23],
    'auth':     [98, 87, 113, 124, 96, 134, 147],
    'inc':      [9, 8, 11, 12, 7, 14, 12],
    'events':   [3812, 3900, 3600, 4100, 3950, 4188, 4219],
    'fw':       [42, 39, 50, 48, 41, 36, 38],
    'bouncer':  [780, 712, 845, 902, 798, 850, 812],
    'newctry':  [4, 6, 5, 8, 6, 7, 7],
    'active':   [1240, 1252, 1260, 1268, 1271, 1278, 1284],
  };

  const PRIORITY_ITEMS = [
    { pri: 12, sev: 'critical', title: 'Brute force burst from 185.220.101.7', age: '4m ago', src: '185.220.101.7', events: 47 },
    { pri: 11, sev: 'critical', title: 'Credential stuffing: 14 accounts, 3 IPs', age: '12m ago', src: '45.155.205.0/24', events: 32 },
    { pri:  9, sev: 'high',     title: 'TOTP failure spike on shared workspace', age: '38m ago', src: 'multi', events: 21 },
    { pri:  9, sev: 'high',     title: 'New-country login: admin@acme.io from CN', age: '1h ago', src: '120.27.144.3', events: 1 },
    { pri:  8, sev: 'high',     title: 'Bouncer pre-screen catches uptick from PT', age: '2h ago', src: 'multi', events: 18 },
    { pri:  7, sev: 'warn',     title: 'Repeated 401 on /api/account/users', age: '3h ago', src: '194.26.135.18', events: 14 },
    { pri:  6, sev: 'warn',     title: 'Honeypot endpoint hit (3 attempts)', age: '4h ago', src: '46.243.151.10', events: 3 },
    { pri:  5, sev: 'warn',     title: 'Magic link reuse attempt', age: '5h ago', src: '24.51.62.193', events: 2 },
  ];

  const GEO = [
    { cc: 'US', name: 'United States', n: 234, x: 18, y: 38 },
    { cc: 'RU', name: 'Russia',        n: 187, x: 62, y: 28 },
    { cc: 'CN', name: 'China',         n: 142, x: 78, y: 42 },
    { cc: 'BR', name: 'Brazil',        n:  96, x: 32, y: 68 },
    { cc: 'IN', name: 'India',         n:  74, x: 70, y: 52 },
    { cc: 'DE', name: 'Germany',       n:  58, x: 50, y: 32 },
    { cc: 'GB', name: 'United Kingdom',n:  41, x: 47, y: 30 },
    { cc: 'NG', name: 'Nigeria',       n:  37, x: 51, y: 60 },
    { cc: 'PT', name: 'Portugal',      n:  29, x: 46, y: 38 },
    { cc: 'VN', name: 'Vietnam',       n:  24, x: 80, y: 55 },
  ];

  const STATUS_DIST = [
    { label: 'New',           value: 18, color: 'var(--sd-info)' },
    { label: 'Open',          value: 23, color: 'var(--sd-accent)' },
    { label: 'Investigating', value: 11, color: 'var(--sd-warn)' },
    { label: 'Resolved',      value: 64, color: 'var(--sd-good)' },
    { label: 'Closed',        value: 42, color: 'var(--sd-text-faint)' },
  ];

  const PRIORITY_BUCKETS = [
    { label: 'Critical', range: '12+',  value: 4,  color: 'var(--sd-critical)' },
    { label: 'High',     range: '8–11', value: 18, color: 'var(--sd-high)' },
    { label: 'Warn',     range: '4–7',  value: 41, color: 'var(--sd-warn)' },
    { label: 'Info',     range: '0–3',  value: 95, color: 'var(--sd-info)' },
  ];

  const FUNNEL = [
    { label: 'Assessments', value: 4218, color: 'var(--sd-info)' },
    { label: 'Monitors',    value: 1842, color: 'var(--sd-warn)' },
    { label: 'Blocks',       value:  812, color: 'var(--sd-critical)' },
  ];

  const TOP_IPS = [
    { name: '185.220.101.7',   n: 84 },
    { name: '45.155.205.233',  n: 62 },
    { name: '194.26.135.18',   n: 41 },
    { name: '120.27.144.3',    n: 34 },
    { name: '46.243.151.10',   n: 27 },
    { name: '24.51.62.193',    n: 22 },
    { name: '91.219.236.18',   n: 18 },
    { name: '5.39.91.4',       n: 14 },
  ];

  const TOP_CATS = [
    { name: 'invalid_password',   n: 147 },
    { name: 'login:unknown',      n:  88 },
    { name: 'totp:login_failed',  n:  31 },
    { name: 'rest_error',         n:  29 },
    { name: 'view_permission_denied', n: 22 },
    { name: 'api_denied',         n:  18 },
    { name: 'unauthenticated',    n:  14 },
    { name: 'security_alert',     n:   9 },
  ];

  const HEALTH = [
    { cat: 'system:health:runner',    level: 4,  detail: 'All workers idle; queue depth 0',   when: '32s ago', dot: 'good' },
    { cat: 'system:health:scheduler', level: 8,  detail: 'Scheduler 7s behind on cron tick',  when: '2m ago',  dot: 'warn' },
    { cat: 'system:health:tcp',       level: 3,  detail: 'TCP gateway responding < 12ms p95', when: '14s ago', dot: 'good' },
  ];

  /* ─── helpers ────────────────────────────────────────── */

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  const SPARK_COLORS = {
    critical: 'var(--sd-critical)',
    high:     'var(--sd-high)',
    warn:     'var(--sd-warn)',
    info:     'var(--sd-accent)',
  };

  function renderSpark(svg, values, color) {
    const w = 200, h = 36, pad = 2;
    const min = Math.min(...values), max = Math.max(...values);
    const range = max - min || 1;
    const step = (w - pad * 2) / (values.length - 1);
    const yFor = v => h - pad - ((v - min) / range) * (h - pad * 2);
    const points = values.map((v, i) => `${pad + i * step},${yFor(v).toFixed(2)}`).join(' ');
    const area   = `M ${pad},${h} L ${points.split(' ').join(' L ')} L ${w - pad},${h} Z`;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = `
      <path d="${area}" fill="${color}" fill-opacity="0.12"/>
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${pad + (values.length - 1) * step}" cy="${yFor(values[values.length - 1]).toFixed(2)}" r="2.5" fill="${color}"/>
    `;
  }

  function renderStackedBar(svg, data, keys, colors, opts = {}) {
    const w = 600, h = 200, padTop = 14, padBottom = 22, padLR = 10;
    const innerH = h - padTop - padBottom;
    const innerW = w - padLR * 2;
    const n = data.length;
    const barGap = 2;
    const barW = (innerW - barGap * (n - 1)) / n;

    const totals = data.map(d => keys.reduce((s, k) => s + d[k], 0));
    const max = Math.max(...totals) * 1.05;
    const yScale = v => (v / max) * innerH;

    // grid lines (4 horizontal)
    const grid = [0.25, 0.5, 0.75, 1].map(f => {
      const y = padTop + innerH * (1 - f);
      return `<line x1="${padLR}" y1="${y}" x2="${w - padLR}" y2="${y}" />`;
    }).join('');

    let bars = '';
    data.forEach((d, i) => {
      const x = padLR + i * (barW + barGap);
      let yTop = padTop + innerH;
      let segments = '';
      keys.forEach((k, ki) => {
        const segH = yScale(d[k]);
        if (segH <= 0.4) return;
        yTop -= segH;
        segments += `<rect x="${x}" y="${yTop}" width="${barW}" height="${segH}" fill="${colors[ki]}" rx="0.5"/>`;
      });
      bars += `<g class="sd-bar-day" data-day="${d.date}" data-total="${totals[i]}">${segments}</g>`;
    });

    // sparse x labels
    const labelEvery = Math.ceil(n / 6);
    let labels = '';
    data.forEach((d, i) => {
      if (i % labelEvery !== 0 && i !== n - 1) return;
      const x = padLR + i * (barW + barGap) + barW / 2;
      const dt = new Date(d.date);
      const txt = `${dt.toLocaleString('en', { month: 'short' })} ${dt.getUTCDate()}`;
      labels += `<text x="${x}" y="${h - 6}" text-anchor="middle">${txt}</text>`;
    });

    svg.innerHTML = `
      <g class="sd-chart-grid">${grid}</g>
      ${bars}
      <g class="sd-chart-axis">${labels}</g>
    `;

    // hover tooltip
    if (opts.tooltip !== false) {
      let hover = svg.parentElement.querySelector('.sd-bar-hover');
      if (!hover) {
        hover = el('div', 'sd-bar-hover');
        svg.parentElement.style.position = 'relative';
        svg.parentElement.appendChild(hover);
      }
      $$('.sd-bar-day', svg).forEach((g, i) => {
        g.addEventListener('mouseenter', (e) => {
          const d = data[i];
          hover.innerHTML = `
            <strong>${new Date(d.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</strong><br>
            ${keys.map((k, ki) => `<span style="color:${colors[ki]}">■</span> ${k}: <span class="sd-mono">${d[k]}</span>`).join('<br>')}
          `;
          hover.style.opacity = '1';
        });
        g.addEventListener('mousemove', (e) => {
          const r = svg.parentElement.getBoundingClientRect();
          hover.style.left = (e.clientX - r.left + 12) + 'px';
          hover.style.top  = (e.clientY - r.top  - 30) + 'px';
        });
        g.addEventListener('mouseleave', () => { hover.style.opacity = '0'; });
        g.addEventListener('click', () => openModal('day'));
      });
    }
  }

  function renderDonut(svg, data) {
    const cx = 80, cy = 80, r = 60, ring = 14;
    const total = data.reduce((s, d) => s + d.value, 0);
    let acc = 0;
    const arcs = data.map(d => {
      const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += d.value;
      const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
      const large = (end - start) > Math.PI ? 1 : 0;
      return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}"
                fill="none" stroke="${d.color}" stroke-width="${ring}" stroke-linecap="butt"/>`;
    }).join('');
    svg.setAttribute('viewBox', '0 0 160 160');
    svg.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="${ring}"/>
      ${arcs}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--sd-text)" font-family="var(--sd-font-mono)" font-size="20" font-variant-numeric="tabular-nums">${total}</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="var(--sd-text-mute)" font-family="var(--sd-font-disp)" font-size="9" letter-spacing="1.2">TOTAL</text>
    `;
  }

  /* ─── init ───────────────────────────────────────────── */

  function init() {

    // sparklines
    $$('[data-spark]').forEach(svg => {
      const key = svg.dataset.spark;
      const color = SPARK_COLORS[svg.dataset.color] || SPARK_COLORS.info;
      renderSpark(svg, SPARKS[key], color);
    });

    // priority queue
    const list = $('#priority-list');
    PRIORITY_ITEMS.forEach(item => {
      const li = el('li', 'sd-pri-row');
      li.dataset.modal = 'incident';
      li.innerHTML = `
        <span class="sd-pri sd-pri-${item.sev}">${item.sev === 'critical' ? 'CRIT' : item.sev.toUpperCase()} ${item.pri}</span>
        <div class="sd-pri-body">
          <span class="sd-pri-title">${item.title}</span>
          <span class="sd-pri-meta">${item.age} · <span class="sd-mono">${item.src}</span> · ${item.events} events</span>
        </div>
        <span class="sd-pri-actions">
          <button class="sd-icon-btn" title="Resolve" onclick="event.stopPropagation()"><i class="bi bi-check2"></i></button>
          <button class="sd-icon-btn" title="Pause"   onclick="event.stopPropagation()"><i class="bi bi-pause"></i></button>
          <button class="sd-icon-btn" title="Block IP" onclick="event.stopPropagation()"><i class="bi bi-shield-fill-x"></i></button>
        </span>
      `;
      list.appendChild(li);
    });

    // composition stacked bar
    renderStackedBar(
      $('#composition-chart'),
      COMPOSITION,
      ['events', 'firewall', 'bouncer', 'auth'],
      ['var(--sd-c-events)', 'var(--sd-c-firewall)', 'var(--sd-c-bouncer)', 'var(--sd-c-auth)']
    );

    // auth chart (single-series stacked = just one segment per bar)
    const authData = AUTH.slice(-30).map(d => ({ date: d.date, auth: d.value }));
    renderStackedBar(
      $('#auth-chart'),
      authData,
      ['auth'],
      ['var(--sd-c-auth)'],
      { tooltip: true }
    );

    // geo bubbles
    const bubbles = $('#geo-bubbles');
    const maxN = Math.max(...GEO.map(g => g.n));
    GEO.forEach(g => {
      const size = 18 + (g.n / maxN) * 56;
      const b = el('div', 'sd-geo-bubble');
      b.dataset.cc = g.cc;
      b.style.left = `${g.x}%`;
      b.style.top = `${g.y}%`;
      b.style.width = `${size}px`;
      b.style.height = `${size}px`;
      b.title = `${g.name} · ${g.n} events`;
      b.addEventListener('click', () => openModal('country', { cc: g.cc, name: g.name }));
      bubbles.appendChild(b);
    });

    const leader = $('#geo-leader');
    GEO.forEach(g => {
      const li = el('li', null);
      li.innerHTML = `
        <span class="sd-geo-cc">${g.cc}</span>
        <span class="sd-geo-name">${g.name}</span>
        <span class="sd-geo-num">${g.n}</span>
      `;
      li.addEventListener('click', () => openModal('country', { cc: g.cc, name: g.name }));
      leader.appendChild(li);
    });

    // status donut + legend
    renderDonut($('#status-donut'), STATUS_DIST);
    const totalStatus = STATUS_DIST.reduce((s, d) => s + d.value, 0);
    const sl = $('#status-legend');
    STATUS_DIST.forEach(d => {
      const li = el('li', null);
      li.innerHTML = `
        <i style="background:${d.color}"></i>
        <span>${d.label}</span>
        <span class="num">${d.value}</span>
        <span class="pct">${Math.round(d.value / totalStatus * 100)}%</span>
      `;
      sl.appendChild(li);
    });

    // priority buckets
    const pb = $('#priority-buckets');
    const maxPB = Math.max(...PRIORITY_BUCKETS.map(b => b.value));
    PRIORITY_BUCKETS.forEach(b => {
      const li = el('li', null);
      li.innerHTML = `
        <span class="sd-bucket-label" style="color:${b.color}">${b.label}<br><span style="font-weight:400; opacity:0.6; font-size:10px; letter-spacing:0.04em">${b.range}</span></span>
        <span class="sd-bucket-bar"><span style="width:${(b.value / maxPB) * 100}%; background:${b.color}"></span></span>
        <span class="sd-bucket-num">${b.value}</span>
      `;
      pb.appendChild(li);
    });

    // bouncer funnel
    const fn = $('#bouncer-funnel');
    const fmax = FUNNEL[0].value;
    FUNNEL.forEach(f => {
      const row = el('div', 'sd-funnel-row');
      row.innerHTML = `
        <div class="sd-funnel-bar">
          <span style="width:${(f.value / fmax) * 100}%; background:${f.color}">${f.label}</span>
        </div>
        <span class="sd-funnel-num">${f.value.toLocaleString()}</span>
      `;
      fn.appendChild(row);
    });

    // top IPs / categories
    const ipMax = Math.max(...TOP_IPS.map(i => i.n));
    const ipsList = $('#top-ips');
    TOP_IPS.forEach((ip, i) => {
      const li = el('li', null);
      li.innerHTML = `
        <span class="sd-rank-no">${i + 1}</span>
        <span class="sd-rank-name sd-mono">${ip.name}</span>
        <span class="sd-rank-bar"><span style="width:${(ip.n / ipMax) * 100}%; background:var(--sd-critical)"></span></span>
        <span class="sd-rank-num">${ip.n}</span>
      `;
      ipsList.appendChild(li);
    });

    const catMax = Math.max(...TOP_CATS.map(c => c.n));
    const catList = $('#top-cats');
    TOP_CATS.forEach((c, i) => {
      const li = el('li', null);
      li.innerHTML = `
        <span class="sd-rank-no">${i + 1}</span>
        <span class="sd-rank-name sd-mono">${c.name}</span>
        <span class="sd-rank-bar"><span style="width:${(c.n / catMax) * 100}%; background:var(--sd-c-auth)"></span></span>
        <span class="sd-rank-num">${c.n}</span>
      `;
      catList.appendChild(li);
    });

    // health list
    const hl = $('#health-list');
    HEALTH.forEach(h => {
      const li = el('li', null);
      li.innerHTML = `
        <span class="sd-dot sd-dot-${h.dot}"></span>
        <div>
          <div class="sd-health-cat">${h.cat}</div>
          <div class="sd-health-detail">${h.detail}</div>
        </div>
        <span class="sd-health-when">${h.when}</span>
        <span class="sd-health-level">level ${h.level}</span>
      `;
      hl.appendChild(li);
    });

    // country detail chart (sparkline-style stacked of last 30)
    const countryData = COMPOSITION.slice(-14).map(d => ({ date: d.date, events: Math.round(d.events * 0.18) }));
    renderStackedBar(
      $('#country-chart'),
      countryData,
      ['events'],
      ['var(--sd-critical)'],
      { tooltip: false }
    );

    // wire modal triggers
    document.body.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-modal]');
      if (!trigger) return;
      const id = trigger.dataset.modal;
      if (['incident', 'day', 'country'].includes(id)) {
        openModal(id);
      }
    });
    $$('[data-close]').forEach(b => b.addEventListener('click', closeAll));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

    // live toggle visual only
    $('#live-toggle').addEventListener('click', () => {
      const t = $('#live-toggle');
      t.classList.toggle('sd-toggle-on');
      const isOn = t.classList.contains('sd-toggle-on');
      t.querySelector('span:last-child').textContent = isOn ? 'Live' : 'Paused';
    });

    // segmented buttons — visual only
    $$('.sd-segments').forEach(group => {
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('.sd-seg');
        if (!btn) return;
        $$('.sd-seg', group).forEach(b => b.classList.remove('sd-seg-active'));
        btn.classList.add('sd-seg-active');
      });
    });

    // updated-ago counter
    let secs = 14;
    setInterval(() => {
      secs += 1;
      const span = $('#updated-ago');
      if (!span) return;
      span.textContent = secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
    }, 1000);
  }

  function openModal(id, ctx) {
    const m = document.querySelector(`[data-modal-id="${id}"]`);
    if (!m) return;
    if (id === 'country' && ctx) {
      m.querySelector('#country-flag').textContent = ctx.cc;
      m.querySelector('#country-name').textContent = ctx.name;
    }
    m.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeAll() {
    $$('.sd-modal').forEach(m => m.hidden = true);
    document.body.style.overflow = '';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
