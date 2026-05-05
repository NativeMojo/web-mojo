/**
 * Calendar — internal picker engine.
 *
 * Renders day-grid / month-grid / year-grid based on `precision` and
 * the current `view` (zoom level). Supports single-value and range
 * selection at every precision. Same engine, three precisions.
 *
 * Cross-page anchor persistence: once a range start is committed,
 * paging with prev/next or keyboard does not clear it. Hover preview
 * tints visible cells up to the cursor regardless of where the anchor
 * sits.
 *
 * Drill-down zoom: clicking the header label moves up one level
 * (day → month → year). Selecting a tile at or below the configured
 * `precision` either commits (when at precision) or drills back down.
 *
 * Emits:
 *   'select'        — value committed at picker precision
 *   'range:select'  — range committed { start, end } at precision
 *   'range:start'   — first anchor placed (no commit yet)
 *   'view:change'   — zoom level changed
 *   'navigate'      — page changed (prev/next)
 */

import View from '@core/View.js';
import {
  parseByPrecision, parseYmd, parseYm, parseYear,
  formatByPrecision, formatYmd, formatYm,
  daysInMonth, weekdayWithFirstDay,
  addMonths, addYears,
  compareByPrecision, compareYmd, compareYm,
  unitsBetweenInclusive,
  today, monthNames, weekdayNames,
} from '@core/utils/dateFns.js';

const PRECISION_RANK = { year: 0, month: 1, day: 2 };

class Calendar extends View {
  constructor(options = {}) {
    const {
      precision = 'day',
      mode = 'single',                    // 'single' | 'range'
      months = 1,                         // 1 | 2 panes (day view only)
      value = null,                       // single mode initial value (string or {y,m,d})
      startValue = null, endValue = null, // range mode initial
      min = null, max = null,
      disabledDates = [],
      firstDay = 1,
      locale = 'en-US',
      excludeDisabledFromRange = false,
      // Initial focused page
      year = null, month = null,
      class: containerClass = '',
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: `mojo-calendar mojo-calendar-${precision} ${containerClass}`.trim(),
      ...viewOptions,
    });

    this.precision = precision;
    this.mode = mode;
    this.months = Math.max(1, Math.min(2, months | 0));
    this.firstDay = firstDay;
    this.locale = locale;
    this.excludeDisabledFromRange = excludeDisabledFromRange;

    // Constraints
    this.min = parseByPrecision(min, precision) || (min ? parseYmd(min) : null);
    this.max = parseByPrecision(max, precision) || (max ? parseYmd(max) : null);
    this.disabledDates = (disabledDates || []).map((s) => formatYmd(parseYmd(s) || null)).filter(Boolean);

    // Current selection state
    if (mode === 'single') {
      this.selected = parseByPrecision(value, precision);
    } else {
      this.start = parseByPrecision(startValue, precision);
      this.end = parseByPrecision(endValue, precision);
      this._anchor = null;     // in-progress range anchor
    }

    // Hover state for range preview
    this._hover = null;

    // Current view/zoom — defaults to precision unless higher precision needed for nav
    this.view = precision;

    // Initial page anchor (the first visible month/decade)
    const t = today();
    const seed = (mode === 'single' ? this.selected : (this.start || this.end)) || t;
    this.pageY = year != null ? Number(year) : (seed.y ?? t.y);
    this.pageM = month != null ? Number(month) : (seed.m ?? t.m);

    // Bound handlers
    this._onCellMouseEnter = this._onCellMouseEnter.bind(this);
    this._onCellMouseLeave = this._onCellMouseLeave.bind(this);
  }

  // ── Public API ────────────────────────────────────────────────

  setMin(v) { this.min = parseByPrecision(v, this.precision); this._rerender(); }
  setMax(v) { this.max = parseByPrecision(v, this.precision); this._rerender(); }

  setValue(v) {
    this.selected = parseByPrecision(v, this.precision);
    if (this.selected) {
      this.pageY = this.selected.y;
      this.pageM = this.selected.m || this.pageM;
    }
    this._rerender();
  }

  setRange(startValue, endValue) {
    this.start = parseByPrecision(startValue, this.precision);
    this.end = parseByPrecision(endValue, this.precision);
    this._anchor = null;
    this._rerender();
  }

  getValue() {
    return this.selected ? formatByPrecision(this.selected, this.precision) : '';
  }

  getRange() {
    return {
      start: this.start ? formatByPrecision(this.start, this.precision) : '',
      end: this.end ? formatByPrecision(this.end, this.precision) : '',
    };
  }

  // ── Render ────────────────────────────────────────────────────

  async renderTemplate() {
    return ''; // we paint via _renderInto on the live element
  }

  async onAfterRender() {
    if (!this._eventsWired) {
      this._wireEvents(this.element);
      this._eventsWired = true;
    }
    this._renderInto(this.element);
  }

  _rerender() {
    if (this.element) this._renderInto(this.element);
  }

  _renderInto(host) {
    host.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = this.months > 1 && this.view === 'day' ? 'mojo-calendar-multi' : 'mojo-calendar-single';

    if (this.view === 'day') {
      const panes = this.months;
      for (let i = 0; i < panes; i++) {
        let y = this.pageY, m = this.pageM + i;
        while (m > 12) { m -= 12; y += 1; }
        wrap.appendChild(this._buildDayPane(y, m, i === 0, i === panes - 1));
      }
    } else if (this.view === 'month') {
      wrap.appendChild(this._buildMonthPane(this.pageY));
    } else if (this.view === 'year') {
      wrap.appendChild(this._buildYearPane(this._decadeStart(this.pageY)));
    }

    host.appendChild(wrap);
  }

  _decadeStart(year) { return Math.floor(year / 10) * 10; }

  // ── Day pane ──────────────────────────────────────────────────

  _buildDayPane(year, month, showPrev, showNext) {
    const pane = document.createElement('div');
    pane.className = 'mojo-calendar-pane';

    pane.appendChild(this._buildHead(this._dayHeadLabel(year, month), 'day', showPrev, showNext, year, month));
    pane.appendChild(this._buildWeekdayHeader());
    pane.appendChild(this._buildDayGrid(year, month));
    return pane;
  }

  _dayHeadLabel(year, month) {
    return { kind: 'day', year, month };
  }

  _buildWeekdayHeader() {
    const grid = document.createElement('div');
    grid.className = 'mojo-calendar-grid mojo-calendar-grid-day';
    weekdayNames(this.locale, this.firstDay, 'short').forEach((w) => {
      const wd = document.createElement('div');
      wd.className = 'mojo-calendar-weekday';
      wd.textContent = w;
      grid.appendChild(wd);
    });
    return grid;
  }

  _buildDayGrid(year, month) {
    const grid = document.createElement('div');
    grid.className = 'mojo-calendar-grid mojo-calendar-grid-day';

    const firstWeekday = weekdayWithFirstDay(year, month, 1, this.firstDay);
    const total = daysInMonth(year, month);
    const todayP = today();

    for (let i = 0; i < firstWeekday; i++) {
      const blank = document.createElement('div');
      blank.className = 'mojo-calendar-cell mojo-calendar-cell-blank';
      grid.appendChild(blank);
    }

    for (let d = 1; d <= total; d++) {
      const cur = { y: year, m: month, d };
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'mojo-calendar-cell';
      cell.dataset.ymd = formatYmd(cur);

      // Today marker
      if (cur.y === todayP.y && cur.m === todayP.m && cur.d === todayP.d) {
        cell.classList.add('mojo-calendar-cell-today');
      }

      // Disabled?
      if (this._isDisabledAt(cur, 'day')) {
        cell.classList.add('mojo-calendar-cell-disabled');
        cell.disabled = true;
      }

      // Range visuals
      if (this.mode === 'range') {
        this._applyRangeClasses(cell, cur, 'day');
      } else if (this.selected && compareYmd(cur, this.selected) === 0) {
        cell.classList.add('mojo-calendar-cell-selected');
      }

      const inner = document.createElement('span');
      inner.className = 'mojo-calendar-cell-inner';
      inner.textContent = String(d);
      cell.appendChild(inner);

      grid.appendChild(cell);
    }

    return grid;
  }

  // ── Month pane ────────────────────────────────────────────────

  _buildMonthPane(year) {
    const pane = document.createElement('div');
    pane.className = 'mojo-calendar-pane';

    pane.appendChild(this._buildHead(String(year), 'month', true, true, year, 1));
    pane.appendChild(this._buildMonthGrid(year));
    return pane;
  }

  _buildMonthGrid(year) {
    const grid = document.createElement('div');
    grid.className = 'mojo-calendar-grid mojo-calendar-grid-month';
    const names = monthNames(this.locale, 'short');

    for (let m = 1; m <= 12; m++) {
      const cur = { y: year, m };
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'mojo-calendar-cell';
      cell.dataset.ym = formatYm(cur);

      if (this._isDisabledAt(cur, 'month')) {
        cell.classList.add('mojo-calendar-cell-disabled');
        cell.disabled = true;
      }

      if (this.precision === 'month' && this.mode === 'range') {
        this._applyRangeClasses(cell, cur, 'month');
      } else if (this.precision === 'month' && this.mode === 'single' && this.selected
                 && compareYm(cur, this.selected) === 0) {
        cell.classList.add('mojo-calendar-cell-selected');
      }

      const inner = document.createElement('span');
      inner.className = 'mojo-calendar-cell-inner';
      inner.textContent = names[m - 1];
      cell.appendChild(inner);

      grid.appendChild(cell);
    }

    return grid;
  }

  // ── Year pane ─────────────────────────────────────────────────

  _buildYearPane(decade) {
    const pane = document.createElement('div');
    pane.className = 'mojo-calendar-pane';

    pane.appendChild(this._buildHead(`${decade} – ${decade + 11}`, 'year', true, true, decade, 1));
    pane.appendChild(this._buildYearGrid(decade));
    return pane;
  }

  _buildYearGrid(decade) {
    const grid = document.createElement('div');
    grid.className = 'mojo-calendar-grid mojo-calendar-grid-year';

    for (let i = 0; i < 12; i++) {
      const yr = decade + i;
      const cur = { y: yr };
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'mojo-calendar-cell';
      cell.dataset.year = String(yr);

      if (this._isDisabledAt(cur, 'year')) {
        cell.classList.add('mojo-calendar-cell-disabled');
        cell.disabled = true;
      }

      if (this.precision === 'year' && this.mode === 'range') {
        this._applyRangeClasses(cell, cur, 'year');
      } else if (this.precision === 'year' && this.mode === 'single' && this.selected
                 && this.selected.y === yr) {
        cell.classList.add('mojo-calendar-cell-selected');
      }

      const inner = document.createElement('span');
      inner.className = 'mojo-calendar-cell-inner';
      inner.textContent = String(yr);
      cell.appendChild(inner);

      grid.appendChild(cell);
    }

    return grid;
  }

  // ── Range visual helper ───────────────────────────────────────

  _applyRangeClasses(cell, cur, level) {
    // Resolve start/end (committed) and anchor+hover (in-progress)
    let start = this.start, end = this.end;
    if (this._anchor) {
      // Anchor is the only thing committed so far. Hover defines the other end.
      const other = this._hover || this._anchor;
      const cmp = compareByPrecision(this._anchor, other, level);
      start = cmp <= 0 ? this._anchor : other;
      end = cmp <= 0 ? other : this._anchor;
    }
    if (!start || !end) {
      // Single anchor with no hover yet — just highlight the anchor cell
      if (this._anchor && compareByPrecision(cur, this._anchor, level) === 0) {
        cell.classList.add('mojo-calendar-cell-anchor', 'mojo-calendar-cell-anchor-solo');
      }
      return;
    }

    const cmpS = compareByPrecision(cur, start, level);
    const cmpE = compareByPrecision(cur, end, level);
    if (cmpS > 0 && cmpE < 0) {
      cell.classList.add(this._anchor ? 'mojo-calendar-cell-in-preview' : 'mojo-calendar-cell-in-range');
    }
    if (cmpS === 0) {
      cell.classList.add('mojo-calendar-cell-anchor', 'mojo-calendar-cell-anchor-start');
      if (compareByPrecision(start, end, level) === 0) {
        cell.classList.add('mojo-calendar-cell-anchor-solo');
      } else {
        cell.classList.add(this._anchor ? 'mojo-calendar-cell-in-preview' : 'mojo-calendar-cell-in-range');
      }
    }
    if (cmpE === 0 && compareByPrecision(start, end, level) !== 0) {
      cell.classList.add('mojo-calendar-cell-anchor', 'mojo-calendar-cell-anchor-end');
      cell.classList.add(this._anchor ? 'mojo-calendar-cell-in-preview' : 'mojo-calendar-cell-in-range');
    }
  }

  // ── Header (label + nav) ──────────────────────────────────────

  _buildHead(labelSpec, level, showPrev, showNext) {
    const head = document.createElement('div');
    head.className = 'mojo-calendar-head';

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'mojo-calendar-head-label';
    label.dataset.level = level;
    label.dataset.action = 'zoom-out';

    if (typeof labelSpec === 'string') {
      label.textContent = labelSpec;
    } else if (labelSpec && labelSpec.kind === 'day') {
      const names = monthNames(this.locale, 'long');
      label.appendChild(document.createTextNode(`${names[labelSpec.month - 1]} `));
      const yearSpan = document.createElement('span');
      yearSpan.className = 'mojo-calendar-year';
      yearSpan.textContent = String(labelSpec.year);
      label.appendChild(yearSpan);
    }

    head.appendChild(label);

    const nav = document.createElement('div');
    nav.className = 'mojo-calendar-nav';
    if (showPrev) nav.appendChild(this._navBtn('prev'));
    if (showNext) nav.appendChild(this._navBtn('next'));
    head.appendChild(nav);

    return head;
  }

  _navBtn(dir) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mojo-calendar-nav-btn';
    b.dataset.action = `nav-${dir}`;
    b.setAttribute('aria-label', dir === 'prev' ? 'Previous' : 'Next');
    b.innerHTML = dir === 'prev' ? '&#x2039;' : '&#x203A;';
    return b;
  }

  // ── Events ────────────────────────────────────────────────────

  _wireEvents(host) {
    host.addEventListener('click', (event) => this._onClick(event));
    host.addEventListener('mouseover', this._onCellMouseEnter);
    host.addEventListener('mouseleave', this._onCellMouseLeave);
    host.addEventListener('keydown', (event) => this._onKeyDown(event));
  }

  _onClick(event) {
    const target = event.target.closest('[data-action], .mojo-calendar-cell');
    if (!target || target.classList.contains('mojo-calendar-cell-blank')) return;
    if (target.disabled) return;

    const action = target.dataset.action;
    if (action === 'nav-prev') return this._navigate(-1);
    if (action === 'nav-next') return this._navigate(1);
    if (action === 'zoom-out') return this._zoomOut(target.dataset.level);

    // Cell click
    if (target.classList.contains('mojo-calendar-cell')) {
      this._onCellClick(target);
    }
  }

  _onCellClick(cell) {
    if (this.view === 'year') {
      const yr = parseInt(cell.dataset.year, 10);
      if (!Number.isFinite(yr)) return;
      if (this.precision === 'year') return this._commitValue({ y: yr });
      // Drill down into that year
      this.pageY = yr;
      this.view = 'month';
      this.emit('view:change', { view: this.view });
      this._rerender();
      return;
    }

    if (this.view === 'month') {
      const ym = parseYm(cell.dataset.ym);
      if (!ym) return;
      if (this.precision === 'month') return this._commitValue(ym);
      // Drill down into that month
      this.pageY = ym.y; this.pageM = ym.m;
      this.view = 'day';
      this.emit('view:change', { view: this.view });
      this._rerender();
      return;
    }

    if (this.view === 'day') {
      const ymd = parseYmd(cell.dataset.ymd);
      if (!ymd) return;
      this._commitValue(ymd);
    }
  }

  _commitValue(value) {
    if (this.mode === 'single') {
      this.selected = value;
      this.emit('select', { value: formatByPrecision(value, this.precision), parsed: value });
      this._rerender();
      return;
    }
    // range
    if (!this._anchor) {
      this._anchor = value;
      this.start = null;
      this.end = null;
      this._hover = null;
      this.emit('range:start', { anchor: formatByPrecision(value, this.precision) });
      this._rerender();
      return;
    }
    // Second click — commit range, swapping if needed
    const a = this._anchor;
    const b = value;
    const cmp = compareByPrecision(a, b, this.precision);
    this.start = cmp <= 0 ? a : b;
    this.end = cmp <= 0 ? b : a;
    this._anchor = null;
    this._hover = null;
    this.emit('range:select', {
      start: formatByPrecision(this.start, this.precision),
      end: formatByPrecision(this.end, this.precision),
    });
    this._rerender();
  }

  _onCellMouseEnter(event) {
    if (this.mode !== 'range' || !this._anchor) return;
    const cell = event.target.closest('.mojo-calendar-cell');
    if (!cell || cell.classList.contains('mojo-calendar-cell-blank') || cell.disabled) return;

    let parsed = null;
    if (this.view === 'day' && cell.dataset.ymd) parsed = parseYmd(cell.dataset.ymd);
    else if (this.view === 'month' && cell.dataset.ym) parsed = parseYm(cell.dataset.ym);
    else if (this.view === 'year' && cell.dataset.year) parsed = { y: parseInt(cell.dataset.year, 10) };

    if (!parsed) return;
    if (this._hover && compareByPrecision(this._hover, parsed, this.view) === 0) return;
    this._hover = parsed;
    this._rerender();
  }

  _onCellMouseLeave() {
    if (this.mode !== 'range' || !this._anchor) return;
    if (this._hover) {
      this._hover = null;
      this._rerender();
    }
  }

  _navigate(delta) {
    if (this.view === 'day') {
      const next = addMonths({ y: this.pageY, m: this.pageM }, delta);
      this.pageY = next.y; this.pageM = next.m;
    } else if (this.view === 'month') {
      this.pageY += delta;
    } else if (this.view === 'year') {
      this.pageY = this._decadeStart(this.pageY) + delta * 10;
    }
    this.emit('navigate', { delta });
    this._rerender();
  }

  _zoomOut(currentLevel) {
    if (currentLevel === 'day') {
      this.view = 'month';
      this.emit('view:change', { view: this.view });
      this._rerender();
      return;
    }
    if (currentLevel === 'month') {
      this.view = 'year';
      this.emit('view:change', { view: this.view });
      this._rerender();
    }
    // year — already at top
  }

  _onKeyDown(event) {
    const key = event.key;
    if (key === 'Escape') {
      if (this._anchor) {
        this._anchor = null;
        this._hover = null;
        this.emit('range:cancel');
        this._rerender();
        event.preventDefault();
      }
      return;
    }
    if (key === 'PageUp') {
      this._navigate(-1);
      event.preventDefault();
      return;
    }
    if (key === 'PageDown') {
      this._navigate(1);
      event.preventDefault();
      return;
    }
  }

  // ── Disabled checks ───────────────────────────────────────────

  _isDisabledAt(cur, level) {
    if (this.min) {
      const cmp = compareByPrecision(cur, this.min, level);
      if (cmp < 0) return true;
    }
    if (this.max) {
      const cmp = compareByPrecision(cur, this.max, level);
      if (cmp > 0) return true;
    }
    if (level === 'day' && this.disabledDates.length) {
      const ymd = formatYmd(cur);
      if (this.disabledDates.includes(ymd)) return true;
    }
    return false;
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  async onBeforeDestroy() {
    if (this.element) {
      this.element.removeEventListener('mouseover', this._onCellMouseEnter);
      this.element.removeEventListener('mouseleave', this._onCellMouseLeave);
    }
    await super.onBeforeDestroy();
  }
}

export default Calendar;
export { Calendar, PRECISION_RANK };
