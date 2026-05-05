/**
 * CalendarPopover — positioning, click-outside, focus management for the
 * picker popover. Mounts to document.body via portal so popovers escape
 * clipping containers (modals, overflow:hidden tables).
 *
 * Inline mode skips the portal: the calendar renders as a normal child.
 *
 * The popover does NOT own the calendar — callers pass content via
 * `setContent(node)`.
 */

class CalendarPopover {
  constructor(options = {}) {
    const {
      anchor = null,        // trigger element to anchor to
      placement = 'bottom-start',
      gap = 6,              // px between trigger and popover
      portal = true,        // mount into <body>
      onOutsideClick = null,
      classNames = '',
    } = options;

    this.anchor = anchor;
    this.placement = placement;
    this.gap = gap;
    this.portal = portal;
    this.onOutsideClick = onOutsideClick;

    this.element = document.createElement('div');
    this.element.className = `mojo-calendar-popover ${classNames}`.trim();
    this.element.style.position = 'absolute';
    this.element.style.zIndex = '10000';
    this.element.setAttribute('role', 'dialog');

    this._open = false;
    this._onDocClick = this._onDocClick.bind(this);
    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onKey = this._onKey.bind(this);
  }

  setAnchor(el) { this.anchor = el; if (this._open) this._reposition(); }

  setContent(node) {
    this.element.innerHTML = '';
    if (node) this.element.appendChild(node);
  }

  open() {
    if (this._open) return;
    this._open = true;
    if (this.portal && this.element.parentNode !== document.body) {
      document.body.appendChild(this.element);
    }
    this.element.classList.add('is-open');
    this._reposition();
    // Defer listeners so the click that opened the popover doesn't immediately close it.
    setTimeout(() => {
      document.addEventListener('mousedown', this._onDocClick, true);
      document.addEventListener('keydown', this._onKey, true);
      window.addEventListener('scroll', this._onScroll, true);
      window.addEventListener('resize', this._onResize);
    }, 0);
  }

  close() {
    if (!this._open) return;
    this._open = false;
    this.element.classList.remove('is-open');
    document.removeEventListener('mousedown', this._onDocClick, true);
    document.removeEventListener('keydown', this._onKey, true);
    window.removeEventListener('scroll', this._onScroll, true);
    window.removeEventListener('resize', this._onResize);
    if (this.portal && this.element.parentNode === document.body) {
      document.body.removeChild(this.element);
    }
  }

  isOpen() { return this._open; }

  destroy() {
    this.close();
    this.element = null;
  }

  // ── Internals ────────────────────────────────────────────────

  _onDocClick(event) {
    if (this.element.contains(event.target)) return;
    if (this.anchor && this.anchor.contains(event.target)) return;
    if (typeof this.onOutsideClick === 'function') {
      this.onOutsideClick(event);
    } else {
      this.close();
    }
  }

  _onKey(event) {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  _onScroll() { if (this._open) this._reposition(); }
  _onResize() { if (this._open) this._reposition(); }

  _reposition() {
    if (!this.anchor) return;
    const rect = this.anchor.getBoundingClientRect();
    const popRect = this.element.getBoundingClientRect();
    const sx = window.scrollX || window.pageXOffset || 0;
    const sy = window.scrollY || window.pageYOffset || 0;

    let top = rect.bottom + sy + this.gap;
    let left = rect.left + sx;

    if (this.placement === 'bottom-end') {
      left = rect.right + sx - popRect.width;
    } else if (this.placement === 'top-start') {
      top = rect.top + sy - popRect.height - this.gap;
    } else if (this.placement === 'top-end') {
      top = rect.top + sy - popRect.height - this.gap;
      left = rect.right + sx - popRect.width;
    }

    // Keep within viewport horizontally
    const vw = document.documentElement.clientWidth || window.innerWidth;
    if (left + popRect.width > sx + vw - 8) left = sx + vw - popRect.width - 8;
    if (left < sx + 8) left = sx + 8;

    // Flip vertically if no room below
    const vh = document.documentElement.clientHeight || window.innerHeight;
    if (top - sy + popRect.height > vh - 8 && rect.top - popRect.height - this.gap > 8) {
      top = rect.top + sy - popRect.height - this.gap;
    }

    this.element.style.top = `${top}px`;
    this.element.style.left = `${left}px`;
  }
}

export default CalendarPopover;
export { CalendarPopover };
