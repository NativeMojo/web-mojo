/**
 * PresetSidebar — the left rail of preset ranges in DateRangePicker.
 *
 * `presets` is either:
 *   - 'default' / true → use the precision-appropriate default list
 *   - an array of { label, range: () => ({ start, end }) }
 *
 * Emits 'preset:select' with the resolved range.
 */

import View from '@core/View.js';
import { today, addMonths, addYears, formatYmd, formatYm, formatYear } from '@core/utils/dateFns.js';

function dayPresets() {
  return [
    { label: 'Today', range: () => { const t = today(); return { start: t, end: t }; } },
    { label: 'Yesterday', range: () => { const t = today(); const y = addDays(t, -1); return { start: y, end: y }; } },
    { label: 'Last 7 days', range: () => { const t = today(); return { start: addDays(t, -6), end: t }; } },
    { label: 'Last 30 days', range: () => { const t = today(); return { start: addDays(t, -29), end: t }; } },
    { label: 'Last 90 days', range: () => { const t = today(); return { start: addDays(t, -89), end: t }; } },
    { divider: true },
    { label: 'This month', range: () => { const t = today(); return { start: { y: t.y, m: t.m, d: 1 }, end: t }; } },
    { label: 'Last month', range: () => { const t = today(); const prev = addMonths({ y: t.y, m: t.m, d: 1 }, -1); const last = addMonths(prev, 1); last.d = 0; const lastDay = new Date(last.y, last.m, 0).getDate(); return { start: { ...prev, d: 1 }, end: { ...prev, d: lastDay } }; } },
    { label: 'This year', range: () => { const t = today(); return { start: { y: t.y, m: 1, d: 1 }, end: t }; } },
  ];
}

function monthPresets() {
  return [
    { label: 'This month', range: () => { const t = today(); return { start: { y: t.y, m: t.m }, end: { y: t.y, m: t.m } }; } },
    { label: 'Last month', range: () => { const t = today(); const prev = addMonths({ y: t.y, m: t.m }, -1); return { start: prev, end: prev }; } },
    { label: 'Last 3 months', range: () => { const t = today(); return { start: addMonths({ y: t.y, m: t.m }, -2), end: { y: t.y, m: t.m } }; } },
    { label: 'Last 6 months', range: () => { const t = today(); return { start: addMonths({ y: t.y, m: t.m }, -5), end: { y: t.y, m: t.m } }; } },
    { label: 'YTD', range: () => { const t = today(); return { start: { y: t.y, m: 1 }, end: { y: t.y, m: t.m } }; } },
    { label: 'Last 12 months', range: () => { const t = today(); return { start: addMonths({ y: t.y, m: t.m }, -11), end: { y: t.y, m: t.m } }; } },
  ];
}

function yearPresets() {
  return [
    { label: 'This year', range: () => { const t = today(); return { start: { y: t.y }, end: { y: t.y } }; } },
    { label: 'Last year', range: () => { const t = today(); return { start: { y: t.y - 1 }, end: { y: t.y - 1 } }; } },
    { label: 'Last 3 years', range: () => { const t = today(); return { start: { y: t.y - 2 }, end: { y: t.y } }; } },
    { label: 'Last 5 years', range: () => { const t = today(); return { start: { y: t.y - 4 }, end: { y: t.y } }; } },
    { label: 'Last 10 years', range: () => { const t = today(); return { start: { y: t.y - 9 }, end: { y: t.y } }; } },
  ];
}

function addDays(p, n) {
  if (!p) return null;
  const d = new Date(p.y, p.m - 1, p.d + n);
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

function defaultPresets(precision) {
  if (precision === 'year') return yearPresets();
  if (precision === 'month') return monthPresets();
  return dayPresets();
}

class PresetSidebar extends View {
  constructor(options = {}) {
    const {
      precision = 'day',
      presets = 'default',
      eyebrow = 'Quick range',
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: 'mojo-calendar-presets',
      ...viewOptions,
    });

    this.precision = precision;
    this.eyebrow = eyebrow;
    this.activeIndex = -1;

    this.presets = (presets === true || presets === 'default')
      ? defaultPresets(precision)
      : Array.isArray(presets) ? presets : defaultPresets(precision);
  }

  setActive(index) {
    this.activeIndex = index;
    this._highlight();
  }

  async renderTemplate() { return ''; }

  async onAfterRender() {
    this._renderInto(this.element);
  }

  _renderInto(host) {
    host.innerHTML = '';
    if (this.eyebrow) {
      const eb = document.createElement('div');
      eb.className = 'mojo-calendar-presets-eyebrow';
      eb.textContent = this.eyebrow;
      host.appendChild(eb);
    }

    this.presets.forEach((p, i) => {
      if (p.divider) {
        const d = document.createElement('div');
        d.className = 'mojo-calendar-presets-divider';
        host.appendChild(d);
        return;
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mojo-calendar-preset' + (this.activeIndex === i ? ' is-active' : '');
      btn.dataset.presetIndex = String(i);
      btn.textContent = p.label;
      host.appendChild(btn);
    });

    host.addEventListener('click', (event) => {
      const btn = event.target.closest('.mojo-calendar-preset');
      if (!btn) return;
      const idx = parseInt(btn.dataset.presetIndex, 10);
      const p = this.presets[idx];
      if (!p || typeof p.range !== 'function') return;
      const range = p.range();
      this.activeIndex = idx;
      this._highlight();
      const fmt = this.precision === 'year' ? formatYear
                : this.precision === 'month' ? formatYm
                : formatYmd;
      this.emit('preset:select', {
        index: idx,
        label: p.label,
        start: fmt(range.start),
        end: fmt(range.end),
        parsed: range,
      });
    });
  }

  _highlight() {
    if (!this.element) return;
    this.element.querySelectorAll('.mojo-calendar-preset').forEach((b) => {
      const idx = parseInt(b.dataset.presetIndex, 10);
      b.classList.toggle('is-active', idx === this.activeIndex);
    });
  }
}

export default PresetSidebar;
export { PresetSidebar, dayPresets, monthPresets, yearPresets };
