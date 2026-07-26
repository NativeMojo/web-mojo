/* ====================================================================
   DatePicker Rebuild — Mockup runtime
   --------------------------------------------------------------------
   Hand-rolled, framework-free. Just enough date math + DOM rendering
   to show what the production engine will look and feel like.
   ==================================================================== */

(function () {
  'use strict';

  // Frozen "today" so screenshots are stable for review.
  // Real engine uses live Date(); this mock locks today to 2026-05-04 (per session date).
  const TODAY = ymd(2026, 5, 4);

  const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // first day = Monday

  // ── small date helpers ─────────────────────────────────────────────

  function ymd(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  function ym(y, m) {
    return `${y}-${String(m).padStart(2, '0')}`;
  }
  function parseYmd(s) {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    return { y, m, d };
  }
  function parseYm(s) {
    if (!s) return null;
    const [y, m] = s.split('-').map(Number);
    return { y, m };
  }
  function daysInMonth(year, month) {
    // month is 1-indexed
    return new Date(year, month, 0).getDate();
  }
  function weekdayMonStart(year, month, day) {
    // 0..6 with 0 = Monday
    const d = new Date(year, month - 1, day).getDay(); // 0..6 with 0 = Sunday
    return (d + 6) % 7;
  }
  function dayDiff(a, b) {
    const A = new Date(a.y, a.m - 1, a.d);
    const B = new Date(b.y, b.m - 1, b.d);
    return Math.round((B - A) / 86400000);
  }
  function monthDiff(a, b) {
    return (b.y - a.y) * 12 + (b.m - a.m);
  }
  function compareYmd(a, b) {
    if (a.y !== b.y) return a.y - b.y;
    if (a.m !== b.m) return a.m - b.m;
    return a.d - b.d;
  }
  function compareYm(a, b) {
    if (a.y !== b.y) return a.y - b.y;
    return a.m - b.m;
  }

  // ── Calendar renderer ──────────────────────────────────────────────

  /**
   * Render into a host element annotated with data-cal attributes.
   *   data-cal-mode        = "single" | "range"
   *   data-cal-precision   = "day" | "month" | "year"
   *   data-cal-view        = "day" | "month" | "year"  (defaults to precision)
   *   data-cal-months      = "1" | "2"                 (day view only)
   *   data-cal-anchor-*    = various seed values per view/mode
   *   data-cal-tooltip-day = an iso date to show a "N days" tooltip on
   */
  function renderCalendar(host) {
    const mode = host.getAttribute('data-cal-mode') || 'single';
    const precision = host.getAttribute('data-cal-precision') || 'day';
    const view = host.getAttribute('data-cal-view') || precision;
    const months = parseInt(host.getAttribute('data-cal-months') || '1', 10);

    host.classList.add('dp-cal');
    host.innerHTML = '';

    if (view === 'day') {
      renderDayView(host, mode, months);
    } else if (view === 'month') {
      renderMonthView(host, mode);
    } else if (view === 'year') {
      renderYearView(host, mode);
    }
  }

  // ── Day view ───────────────────────────────────────────────────────

  function renderDayView(host, mode, months) {
    const start = host.getAttribute('data-cal-anchor-start');
    const end = host.getAttribute('data-cal-anchor-end');
    const selected = host.getAttribute('data-cal-selected');
    const tooltipDay = host.getAttribute('data-cal-tooltip-day');

    let baseY = 2026, baseM = 5;
    if (start) {
      const p = parseYmd(start);
      baseY = p.y; baseM = p.m;
    } else if (selected) {
      const p = parseYmd(selected);
      baseY = p.y; baseM = p.m;
    }

    const wrap = document.createElement('div');
    wrap.className = months > 1 ? 'dp-cal-multi' : '';

    for (let i = 0; i < months; i++) {
      let y = baseY, m = baseM + i;
      while (m > 12) { m -= 12; y += 1; }

      const pane = document.createElement('div');
      pane.className = 'dp-cal-pane';

      pane.appendChild(buildHead(y, m, i === 0, i === months - 1));
      pane.appendChild(buildWeekdayHeader());
      pane.appendChild(buildDayGrid(y, m, mode, parseYmd(start), parseYmd(end), parseYmd(selected), tooltipDay));

      wrap.appendChild(pane);
    }

    host.appendChild(wrap);
  }

  function buildHead(year, month, showPrev, showNext) {
    const head = document.createElement('div');
    head.className = 'dp-cal-head';

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'dp-cal-head-label';
    label.innerHTML = `${MONTH_NAMES_FULL[month - 1]}<span class="dp-cal-year">${year}</span>`;
    head.appendChild(label);

    const nav = document.createElement('div');
    nav.className = 'dp-cal-nav';
    if (showPrev) {
      nav.appendChild(navBtn('chevron-left'));
    }
    if (showNext) {
      nav.appendChild(navBtn('chevron-right'));
    }
    head.appendChild(nav);

    return head;
  }

  function navBtn(icon) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dp-cal-nav-btn';
    b.innerHTML = `<i class="bi bi-${icon}"></i>`;
    return b;
  }

  function buildWeekdayHeader() {
    const grid = document.createElement('div');
    grid.className = 'dp-cal-grid';
    WEEKDAY_NAMES.forEach((w) => {
      const wd = document.createElement('div');
      wd.className = 'dp-cal-weekday';
      wd.textContent = w;
      grid.appendChild(wd);
    });
    return grid;
  }

  function buildDayGrid(year, month, mode, start, end, selected, tooltipDay) {
    const grid = document.createElement('div');
    grid.className = 'dp-cal-grid';
    grid.style.position = 'relative';

    const firstWeekday = weekdayMonStart(year, month, 1);
    const totalDays = daysInMonth(year, month);

    for (let i = 0; i < firstWeekday; i++) {
      const blank = document.createElement('div');
      blank.className = 'dp-cal-cell dp-cal-cell-blank';
      grid.appendChild(blank);
    }

    let tooltipAnchorEl = null;

    for (let d = 1; d <= totalDays; d++) {
      const cellYmd = ymd(year, month, d);
      const cur = { y: year, m: month, d };

      const cell = document.createElement('div');
      cell.className = 'dp-cal-cell';
      cell.dataset.ymd = cellYmd;

      // Today
      if (cellYmd === TODAY) {
        cell.classList.add('dp-cal-cell-today');
      }

      // Range styling
      if (mode === 'range' && start && end) {
        const cmpStart = compareYmd(cur, start);
        const cmpEnd = compareYmd(cur, end);
        if (cmpStart > 0 && cmpEnd < 0) {
          cell.classList.add('dp-cal-cell-in-range');
        }
        if (cmpStart === 0) {
          cell.classList.add('dp-cal-cell-anchor', 'dp-cal-cell-anchor-start');
          if (compareYmd(start, end) === 0) cell.classList.add('dp-cal-cell-anchor-solo');
          else cell.classList.add('dp-cal-cell-in-range'); // ensure fill extends to right edge
        }
        if (cmpEnd === 0 && compareYmd(start, end) !== 0) {
          cell.classList.add('dp-cal-cell-anchor', 'dp-cal-cell-anchor-end');
          cell.classList.add('dp-cal-cell-in-range');
        }
      }

      // Single-mode selected
      if (mode === 'single' && selected && compareYmd(cur, selected) === 0) {
        cell.classList.add('dp-cal-cell-selected');
      }

      const inner = document.createElement('span');
      inner.className = 'dp-cal-cell-inner';
      inner.textContent = String(d);
      cell.appendChild(inner);

      grid.appendChild(cell);

      if (tooltipDay && cellYmd === tooltipDay) {
        tooltipAnchorEl = cell;
      }
    }

    if (tooltipAnchorEl && start && end) {
      const tip = document.createElement('div');
      tip.className = 'dp-cal-tooltip';
      const days = Math.abs(dayDiff(start, end)) + 1;
      tip.textContent = `${days} days`;
      // Append to the cell — tooltip uses transform to float above it.
      tooltipAnchorEl.appendChild(tip);
      tip.style.left = '50%';
      tip.style.top = '0';
    }

    return grid;
  }

  // ── Month view ─────────────────────────────────────────────────────

  function renderMonthView(host, mode) {
    const year = parseInt(host.getAttribute('data-cal-anchor-year') || '2026', 10);
    const year2 = host.getAttribute('data-cal-anchor-year-2');
    const startMonth = parseYm(host.getAttribute('data-cal-anchor-start-month') || '');
    const endMonth = parseYm(host.getAttribute('data-cal-anchor-end-month') || '');
    const selectedMonth = parseYm(host.getAttribute('data-cal-selected-month') || '');

    const years = year2 ? [year, parseInt(year2, 10) + (year2 === String(year) ? 1 : 0)] : [year];

    const wrap = document.createElement('div');
    wrap.className = years.length > 1 ? 'dp-cal-multi' : '';

    years.forEach((y, idx) => {
      const pane = document.createElement('div');
      pane.className = 'dp-cal-pane';

      pane.appendChild(buildYearHead(y, idx === 0, idx === years.length - 1));
      pane.appendChild(buildMonthGrid(y, mode, startMonth, endMonth, selectedMonth));

      wrap.appendChild(pane);
    });

    host.appendChild(wrap);
  }

  function buildYearHead(year, showPrev, showNext) {
    const head = document.createElement('div');
    head.className = 'dp-cal-head';

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'dp-cal-head-label';
    label.textContent = String(year);
    head.appendChild(label);

    const nav = document.createElement('div');
    nav.className = 'dp-cal-nav';
    if (showPrev) nav.appendChild(navBtn('chevron-left'));
    if (showNext) nav.appendChild(navBtn('chevron-right'));
    head.appendChild(nav);

    return head;
  }

  function buildMonthGrid(year, mode, startMonth, endMonth, selectedMonth) {
    const grid = document.createElement('div');
    grid.className = 'dp-cal-grid dp-cal-grid-month';

    for (let m = 1; m <= 12; m++) {
      const cell = document.createElement('div');
      cell.className = 'dp-cal-cell';
      cell.dataset.ym = ym(year, m);

      const cur = { y: year, m };

      if (mode === 'range' && startMonth && endMonth) {
        const cmpS = compareYm(cur, startMonth);
        const cmpE = compareYm(cur, endMonth);
        if (cmpS > 0 && cmpE < 0) cell.classList.add('dp-cal-cell-in-range');
        if (cmpS === 0) {
          cell.classList.add('dp-cal-cell-anchor', 'dp-cal-cell-anchor-start');
          if (compareYm(startMonth, endMonth) !== 0) cell.classList.add('dp-cal-cell-in-range');
        }
        if (cmpE === 0 && compareYm(startMonth, endMonth) !== 0) {
          cell.classList.add('dp-cal-cell-anchor', 'dp-cal-cell-anchor-end');
          cell.classList.add('dp-cal-cell-in-range');
        }
      }

      if (mode === 'single' && selectedMonth && compareYm(cur, selectedMonth) === 0) {
        cell.classList.add('dp-cal-cell-selected');
      }

      const inner = document.createElement('span');
      inner.className = 'dp-cal-cell-inner';
      inner.textContent = MONTH_NAMES_SHORT[m - 1];
      cell.appendChild(inner);

      grid.appendChild(cell);
    }

    return grid;
  }

  // ── Year view ──────────────────────────────────────────────────────

  function renderYearView(host, mode) {
    const decade = parseInt(host.getAttribute('data-cal-anchor-decade') || '2020', 10);
    const decade2 = host.getAttribute('data-cal-anchor-decade-2');
    const startYear = host.getAttribute('data-cal-anchor-start-year');
    const endYear = host.getAttribute('data-cal-anchor-end-year');
    const selectedYear = host.getAttribute('data-cal-selected-year');

    const decades = decade2 ? [decade, parseInt(decade2, 10) + 10] : [decade];

    const wrap = document.createElement('div');
    wrap.className = decades.length > 1 ? 'dp-cal-multi' : '';

    decades.forEach((dec, idx) => {
      const pane = document.createElement('div');
      pane.className = 'dp-cal-pane';

      pane.appendChild(buildDecadeHead(dec, idx === 0, idx === decades.length - 1));
      pane.appendChild(buildYearGrid(dec, mode, startYear, endYear, selectedYear));

      wrap.appendChild(pane);
    });

    host.appendChild(wrap);
  }

  function buildDecadeHead(decade, showPrev, showNext) {
    const head = document.createElement('div');
    head.className = 'dp-cal-head';

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'dp-cal-head-label';
    label.textContent = `${decade} – ${decade + 11}`;
    head.appendChild(label);

    const nav = document.createElement('div');
    nav.className = 'dp-cal-nav';
    if (showPrev) nav.appendChild(navBtn('chevron-left'));
    if (showNext) nav.appendChild(navBtn('chevron-right'));
    head.appendChild(nav);

    return head;
  }

  function buildYearGrid(decade, mode, startYear, endYear, selectedYear) {
    const grid = document.createElement('div');
    grid.className = 'dp-cal-grid dp-cal-grid-year';

    for (let i = 0; i < 12; i++) {
      const yr = decade + i;
      const cell = document.createElement('div');
      cell.className = 'dp-cal-cell';
      cell.dataset.year = String(yr);

      if (mode === 'range' && startYear && endYear) {
        const s = parseInt(startYear, 10), e = parseInt(endYear, 10);
        if (yr > s && yr < e) cell.classList.add('dp-cal-cell-in-range');
        if (yr === s) {
          cell.classList.add('dp-cal-cell-anchor', 'dp-cal-cell-anchor-start');
          if (s !== e) cell.classList.add('dp-cal-cell-in-range');
        }
        if (yr === e && s !== e) {
          cell.classList.add('dp-cal-cell-anchor', 'dp-cal-cell-anchor-end');
          cell.classList.add('dp-cal-cell-in-range');
        }
      }

      if (mode === 'single' && selectedYear && yr === parseInt(selectedYear, 10)) {
        cell.classList.add('dp-cal-cell-selected');
      }

      const inner = document.createElement('span');
      inner.className = 'dp-cal-cell-inner';
      inner.textContent = String(yr);
      cell.appendChild(inner);

      grid.appendChild(cell);
    }

    return grid;
  }

  // ── Wheel renderer ─────────────────────────────────────────────────

  function renderWheel(host) {
    const kind = host.getAttribute('data-wheel');
    let items = [];
    let selectedIdx = 0;

    if (kind === 'month') {
      items = MONTH_NAMES_SHORT.slice();
      selectedIdx = 4; // May
    } else if (kind === 'year-narrow') {
      for (let y = 2020; y <= 2032; y++) items.push(String(y));
      selectedIdx = items.indexOf('2026');
    } else if (kind === 'hours-24') {
      for (let h = 0; h < 24; h++) items.push(String(h).padStart(2, '0'));
      selectedIdx = 14;
    } else if (kind === 'minutes-5') {
      for (let m = 0; m < 60; m += 5) items.push(String(m).padStart(2, '0'));
      selectedIdx = items.indexOf('30');
    }

    host.innerHTML = '';
    items.forEach((it, i) => {
      const el = document.createElement('div');
      el.className = 'dp-wheel-item' + (i === selectedIdx ? ' is-selected' : '');
      el.textContent = it;
      host.appendChild(el);
    });

    // Snap to selected
    requestAnimationFrame(() => {
      const sel = host.querySelector('.is-selected');
      if (sel) {
        host.scrollTop = sel.offsetTop - host.clientHeight / 2 + sel.clientHeight / 2;
      }
    });
  }

  // ── Year scroll variant ────────────────────────────────────────────

  function renderYearScroll(host) {
    host.innerHTML = '';
    const startYear = 1980;
    const endYear = 2030;
    const selected = 2026;
    let lastDecade = -1;
    for (let y = endYear; y >= startYear; y--) {
      const dec = Math.floor(y / 10) * 10;
      if (dec !== lastDecade) {
        const dh = document.createElement('div');
        dh.className = 'dp-year-scroll-decade';
        dh.textContent = `${dec}s`;
        host.appendChild(dh);
        lastDecade = dec;
      }
      const row = document.createElement('div');
      row.className = 'dp-year-scroll-row' + (y === selected ? ' is-active' : '');
      row.innerHTML = `<span>${y}</span><span class="dp-tz-offset">${y === selected ? 'Selected' : ''}</span>`;
      host.appendChild(row);
    }
  }

  // ── Time list (type-ahead variant C) ───────────────────────────────

  function renderTimeList(host) {
    host.innerHTML = '';
    const target = '14:30';
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const t24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const ampm = h < 12 ? 'am' : 'pm';
        const hr12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
        const t12 = `${hr12}:${String(m).padStart(2, '0')} ${ampm}`;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'dp-time-list-item' + (t24 === target ? ' is-active' : '');
        item.innerHTML = `<span>${t24}</span> <span style="color: var(--bs-secondary-color); margin-left: 12px;">${t12}</span>`;
        host.appendChild(item);
      }
    }
    requestAnimationFrame(() => {
      const sel = host.querySelector('.is-active');
      if (sel) host.scrollTop = sel.offsetTop - host.clientHeight / 2;
    });
  }

  // ── Stage / variant routing ────────────────────────────────────────

  const VARIANT_LABELS = {
    'day-single-a': 'Day · Single · Variant A · Stripe popover',
    'day-single-b': 'Day · Single · Variant B · Linear inline',
    'day-single-c': 'Day · Single · Variant C · Notion type-ahead',
    'day-range-a':  'Day · Range · Variant A · Easepick clone',
    'day-range-b':  'Day · Range · Variant B · Stripe presets + two months',
    'day-range-c':  'Day · Range · Variant C · Linear condensed',
    'month-single-a': 'Month · Single · Variant A · Tile grid',
    'month-single-b': 'Month · Single · Variant B · Wheel columns',
    'month-range-a':  'Month · Range · Variant A · Two-year frames',
    'month-range-b':  'Month · Range · Variant B · Presets',
    'year-single-a':  'Year · Single · Variant A · Decade grid',
    'year-single-b':  'Year · Single · Variant B · Scroll list',
    'year-range-a':   'Year · Range · Variant A · Two decades',
    'year-range-b':   'Year · Range · Variant B · Single decade',
    'time-a':   'Time · Variant A · Wheel columns',
    'time-b':   'Time · Variant B · Stepper buttons',
    'time-c':   'Time · Variant C · Type-ahead',
    'time-tz-a':'Time + TZ · Variant A · Stacked',
    'time-tz-b':'Time + TZ · Variant B · Side-by-side',
    'dt-a':     'Date + Time · Variant A · Calendar + strip',
    'dt-b':     'Date + Time · Variant B · Tabs',
  };

  function showVariant(name) {
    const tpl = document.getElementById('tpl-' + name);
    const stage = document.getElementById('stage-frame');
    if (!tpl || !stage) return;

    stage.innerHTML = '';
    stage.appendChild(tpl.content.cloneNode(true));

    document.getElementById('active-label').textContent = VARIANT_LABELS[name] || name;

    // Hydrate any embedded calendars / wheels / lists.
    stage.querySelectorAll('[data-cal]').forEach(renderCalendar);
    stage.querySelectorAll('[data-wheel]').forEach(renderWheel);
    stage.querySelectorAll('[data-year-scroll]').forEach(renderYearScroll);
    stage.querySelectorAll('[data-time-list]').forEach(renderTimeList);
  }

  function setupRail() {
    document.querySelectorAll('.dp-rail-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dp-rail-link').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        showVariant(btn.getAttribute('data-variant'));
      });
    });
  }

  function setupTheme() {
    document.querySelectorAll('[data-theme-set]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-theme-set');
        document.documentElement.setAttribute('data-bs-theme', t);
        document.querySelectorAll('[data-theme-set]').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });
  }

  function init() {
    setupTheme();
    setupRail();
    showVariant('day-range-a');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
