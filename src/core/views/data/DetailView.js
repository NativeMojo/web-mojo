/**
 * DetailView - Reusable record-detail layout
 *
 * The standard "record viewer in a modal" shape used across web-mojo:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ icon  Name                              [active] [edit] x│ ← DetailHeaderView
 *   │       Optional reasoning / subtitle                      │
 *   │       [chips] [chips] [chips]                            │
 *   ├────────┬─────────────────────────────────────────────────┤
 *   │ Rail   │                                                 │
 *   │  link  │  Active section content                         │ ← SideNavView
 *   │  link  │                                                 │
 *   │  link  │                                                 │
 *   └────────┴─────────────────────────────────────────────────┘
 *
 * Subclass `DetailView` and pass config; override action handlers as needed.
 * Pair with `Modal.detail(view)` to get the right modal envelope (no body
 * padding, no footer, X close handled by the header).
 *
 * @example
 * class RuleSetView extends DetailView {
 *   constructor(options = {}) {
 *     super({
 *       ...options,
 *       header: {
 *         icon: 'bi-gear-wide-connected',
 *         titleField: 'name',
 *         subtitlePath: 'metadata.reasoning',
 *         chips: [
 *           { icon: 'bi-tag-fill', textPath: 'category', variant: 'primary' },
 *           { icon: 'bi-flag', text: m => `Priority ${m.get('priority')}` },
 *           { icon: 'bi-stars', text: 'AI-proposed', variant: 'warning',
 *             when: m => m.get('metadata')?.assistant_proposed }
 *         ],
 *         activeField: 'is_active',
 *         actions: [
 *           { label: 'Edit', icon: 'bi-pencil', action: 'edit-header' }
 *         ],
 *         contextMenu: { items: [...] }
 *       },
 *       sections: [ ... ],   // SideNavView shape
 *       activeSection: 'Overview'
 *     });
 *   }
 *
 *   async onActionEditHeader() { ... }
 * }
 *
 * await Modal.detail(new RuleSetView({ model }));
 */

import View from '@core/View.js';
import SideNavView from '@core/views/navigation/SideNavView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';

// ── DetailHeaderView ──────────────────────────────────────

/**
 * The flat record-header card used at the top of `DetailView`.
 * Exported separately for cases where you want this header without the
 * full DetailView (e.g. on a Page rather than a Modal).
 *
 * The right-side action cluster reads, left-to-right:
 *   [auxFn output] · [active switch] · [actions[]] · | · [⋮ context] · [✕]
 *
 * `auxFn(model) -> htmlString` is the slot for inline state read-outs
 * that don't fit the chip/badge model — presence dots, "Last seen 4m
 * ago" lines, attempt counters, etc. The string is rendered as TRUSTED
 * HTML (it comes from source code, not user input). Returning falsy
 * omits the wrapper entirely.
 */
class DetailHeaderView extends View {
    constructor(options = {}) {
        const {
            icon,
            iconTone,               // optional: primary | success | warning | danger | info — toned dh-icon
            iconToneFn,             // optional: (model) => tone, for state-driven icons
            titleField,
            titleFn,
            subtitlePath,
            subtitleFn,             // optional: (model) => string, takes precedence over subtitlePath
            subtitlePlaceholder,    // optional muted text shown when subtitle is empty
            subtitleEditAction,     // action name for click-to-edit on the empty placeholder
            chips = [],
            activeField,
            auxFn,                  // optional: (model) => htmlString — right-gutter aux block (presence, last-seen, etc.)
            actions = [],
            closable = true,
            contextMenu,            // { items: [...] } | null
            ...viewOptions
        } = options;

        super({
            tagName: 'div',
            className: 'detail-header',
            ...viewOptions
        });

        this.icon = icon || 'bi-file-earmark';
        this.iconTone = iconTone || null;
        this.iconToneFn = iconToneFn || null;
        this.titleField = titleField || null;
        this.titleFn = titleFn || null;
        this.subtitlePath = subtitlePath || null;
        this.subtitleFn = subtitleFn || null;
        this.subtitlePlaceholder = subtitlePlaceholder || null;
        this.subtitleEditAction = subtitleEditAction || null;
        this.chips = chips;
        this.activeField = activeField || null;
        this.auxFn = typeof auxFn === 'function' ? auxFn : null;
        this.actions = actions;
        this.closable = closable;
        this.contextMenuConfig = contextMenu || null;

        this.template = () => this._buildTemplate();
    }

    _resolveTitle() {
        if (this.titleFn) return this.titleFn(this.model) || '';
        if (this.titleField) return this.model?.get?.(this.titleField) || '';
        return '';
    }

    _resolveSubtitle() {
        if (this.subtitleFn) return this.subtitleFn(this.model) || '';
        if (!this.subtitlePath) return '';
        return MOJOUtils.getNestedValue(this.model?.attributes || {}, this.subtitlePath) || '';
    }

    _resolveIconTone() {
        if (this.iconToneFn) return this.iconToneFn(this.model) || null;
        return this.iconTone;
    }

    _resolveChips() {
        return (this.chips || [])
            .filter(chip => !chip.when || chip.when(this.model))
            .map(chip => {
                let text;
                if (typeof chip.text === 'function') text = chip.text(this.model);
                else if (chip.textPath) text = this.model?.get?.(chip.textPath);
                else text = chip.text;

                return {
                    icon: chip.icon || null,
                    text: text != null ? String(text) : '',
                    variant: chip.variant || 'light'
                };
            })
            .filter(c => c.text !== '');
    }

    _buildTemplate() {
        const title = this._resolveTitle();
        const subtitle = this._resolveSubtitle();
        const chips = this._resolveChips();
        const isActive = this.activeField ? !!this.model?.get?.(this.activeField) : null;

        const chipsHtml = chips.map(c => {
            const iconHtml = c.icon ? `<i class="bi ${this.escapeHtml(c.icon)} me-1"></i>` : '';
            return `<span class="badge bg-${this.escapeHtml(c.variant)}">${iconHtml}${this.escapeHtml(c.text)}</span>`;
        }).join('');

        // Right-gutter aux slot — trusted HTML. Falsy result omits the wrapper.
        const auxResult = this.auxFn ? (this.auxFn(this.model) || '') : '';
        const auxHtml = auxResult ? `<div class="dh-aux">${auxResult}</div>` : '';

        const switchHtml = this.activeField ? `
            <label class="dh-active-switch me-1" data-bs-toggle="tooltip" title="Toggle ${this.escapeHtml(this.activeField)}">
                <input type="checkbox" data-action="toggle-active" ${isActive ? 'checked' : ''}>
                <span class="dh-track"></span>
                <span class="dh-track-label">${isActive ? 'Active' : 'Inactive'}</span>
            </label>
        ` : '';

        const actionsHtml = (this.actions || []).map(a => {
            const iconHtml = a.icon ? `<i class="bi ${this.escapeHtml(a.icon)}"></i>` : '';
            return `<button class="dh-action" data-action="${this.escapeHtml(a.action)}" title="${this.escapeHtml(a.title || a.label)}">${iconHtml} ${this.escapeHtml(a.label)}</button>`;
        }).join('');

        const closeHtml = this.closable ? `
            <button class="dh-action dh-close" data-bs-dismiss="modal" aria-label="Close" title="Close">
                <i class="bi bi-x-lg"></i>
            </button>
        ` : '';

        const contextMenuHtml = this.contextMenuConfig ? `<div data-container="detail-context-menu"></div>` : '';

        // Group 2 (overflow + close) renders only when at least one of those is present.
        const hasGroup2 = !!this.contextMenuConfig || this.closable;

        const tone = this._resolveIconTone();
        const iconClass = tone ? `dh-icon dh-icon-tone-${this.escapeHtml(tone)}` : 'dh-icon';

        // Stylesheet lives in src/core/css/core.css under "DetailHeaderView".
        return `
            <div class="d-flex align-items-start gap-3">
                <div class="${iconClass}"><i class="bi ${this.escapeHtml(this.icon)}"></i></div>
                <div class="dh-meta" style="min-width: 0; flex: 1;">
                    <h2 class="dh-name">${this.escapeHtml(title)}</h2>
                    ${subtitle
                        ? `<p class="dh-subtitle">${this.escapeHtml(subtitle)}</p>`
                        : (this.subtitlePlaceholder
                            ? `<p class="dh-subtitle dh-subtitle-empty"${this.subtitleEditAction ? ` data-action="${this.escapeHtml(this.subtitleEditAction)}" role="button"` : ''}>${this.escapeHtml(this.subtitlePlaceholder)}</p>`
                            : '')
                    }
                    ${chips.length ? `<div class="dh-chips">${chipsHtml}</div>` : ''}
                </div>
            </div>
            <div class="dh-actions d-flex align-items-center gap-1">
                <!-- Group 0 — aux slot (presence, last-seen, attempt counter, …) -->
                ${auxHtml}
                <!-- Group 1 — record actions (state + primary edits) -->
                ${switchHtml}
                ${actionsHtml}
                ${hasGroup2 ? `
                    <span class="dh-group-sep" aria-hidden="true"></span>
                    <!-- Group 2 — modal chrome (overflow + close) -->
                    ${contextMenuHtml}
                    ${closeHtml}
                ` : ''}
            </div>
        `;
    }

    async onAfterRender() {
        await super.onAfterRender();
        // Mount context menu if configured
        if (this.contextMenuConfig && !this._contextMenuMounted) {
            const cm = new ContextMenu({
                containerId: 'detail-context-menu',
                context: this.model,
                config: {
                    icon: 'bi-three-dots-vertical',
                    ...this.contextMenuConfig
                }
            });
            this.addChild(cm);
            await cm.render();
            this._contextMenuMounted = true;
        }
    }

    /**
     * ContextMenu dispatches actions to its immediate parent (this header)
     * via `parent.events.dispatch(...)`. The dropdown portals its `.dropdown-menu`
     * to `document.body`, so the click does NOT bubble through the header's
     * own DOM tree — the parent DetailView's listener never sees it.
     *
     * In that case, re-dispatch the action up to the DetailView so subclasses
     * can keep their handlers in one place. But when the click comes from an
     * in-tree element (a regular `dh-actions` button), the DOM event will
     * bubble to the parent's listener naturally — re-dispatching would cause
     * a second fire.
     */
    async onActionDefault(action, event, el) {
        const dest = this.parent;
        if (!dest || !dest.events || typeof dest.events.dispatch !== 'function') {
            return false;
        }
        // If the event will bubble to the parent's element naturally, skip
        // the programmatic re-dispatch — the parent's own listener catches it.
        const target = event?.target || el;
        if (target && dest.element?.contains(target)) {
            return false;
        }
        return await dest.events.dispatch(action, event, el);
    }

    /**
     * Default implementation of the active toggle. Overridable by subclasses.
     * Round-trips `model.save({ [activeField]: checked })`, reverts on error.
     */
    async onActionToggleActive(event, element) {
        if (!this.activeField) return;
        const checked = !!element.checked;
        element.disabled = true;
        const labelEl = this.element?.querySelector('.dh-track-label');
        try {
            this.model.set(this.activeField, checked);
            const resp = await this.model.save({ [this.activeField]: checked });
            if (resp && resp.status && resp.status >= 400) {
                throw new Error('Save failed');
            }
            if (labelEl) labelEl.textContent = checked ? 'Active' : 'Inactive';
            this.getApp()?.toast?.success(`${checked ? 'Enabled' : 'Disabled'}`);
            this.emit('detail:updated');
        } catch (err) {
            this.model.set(this.activeField, !checked);
            element.checked = !checked;
            this.getApp()?.toast?.error(`Failed to update: ${err.message}`);
        } finally {
            element.disabled = false;
        }
    }
}


// ── DetailView ────────────────────────────────────────────

class DetailView extends View {
    constructor(options = {}) {
        const {
            header = {},
            sections = [],
            activeSection,
            navWidth,
            minWidth,
            contentPadding,
            ...viewOptions
        } = options;

        // Always include `detail-view` as one of the classes so the framework's
        // DetailView-scoped CSS applies, even when subclasses pass their own
        // className (e.g. `user-view`, `runner-details-view`).
        const subclassClassName = viewOptions.className || '';
        const mergedClassName = subclassClassName.includes('detail-view')
            ? subclassClassName
            : (subclassClassName ? `detail-view ${subclassClassName}` : 'detail-view');

        super({
            ...viewOptions,
            className: mergedClassName
        });

        if (!this.model && options.model) {
            this.model = options.model;
        }

        this.headerConfig = header;
        this.sectionsConfig = sections;
        this.initialActiveSection = activeSection;
        this.navWidth = navWidth ?? 200;
        this.minWidth = minWidth ?? 600;
        this.contentPadding = contentPadding ?? '0';

        this.template = `
            <div class="detail-view-shell">
                <div data-container="detail-header"></div>
                <div data-container="detail-sidenav" class="detail-view-body"></div>
            </div>
        `;
    }

    async onInit() {
        await this.onBeforeBuild();

        this.headerView = new DetailHeaderView({
            containerId: 'detail-header',
            model: this.model,
            ...this.headerConfig
        });
        // Bubble header events up so subclasses can listen via `this.on(...)`
        this.headerView.on('detail:updated', () => this.emit('detail:updated'));
        this.addChild(this.headerView);

        this.sideNav = new SideNavView({
            containerId: 'detail-sidenav',
            sections: this.sectionsConfig,
            activeSection: this.initialActiveSection,
            navWidth: this.navWidth,
            minWidth: this.minWidth,
            contentPadding: this.contentPadding,
            enableResponsive: true
        });
        this.addChild(this.sideNav);

        await this.onAfterBuild();
    }

    /**
     * Hook for subclasses to do work BEFORE the header + sidenav are built
     * (e.g. pre-create shared collections, instantiate section views).
     */
    async onBeforeBuild() {}

    /**
     * Hook for subclasses to do work AFTER the header + sidenav are built
     * (e.g. wire cross-section listeners, register sidenav badges).
     */
    async onAfterBuild() {}

    /** Expose the SideNavView's setBadge for subclass convenience */
    setBadge(key, value) {
        return this.sideNav?.setBadge(key, value);
    }

    /** Switch to a section programmatically */
    showSection(key) {
        return this.sideNav?.showSection(key);
    }

    /**
     * Prevent a model `change` event from triggering a full re-render of the
     * shell. Section views and the header manage their own model reactivity
     * (re-rendering themselves directly when needed). Without this, any
     * `model.set` would wipe the SideNav's mounted section out of the DOM.
     */
    _onModelChange() {
        // Update the header so chips / switch / subtitle reflect the new state
        if (this.headerView?.isMounted()) {
            this.headerView.render().catch(() => {});
        }
    }
}

// Stylesheet for DetailView + DetailHeaderView lives in
// src/core/css/core.css under "DetailView / DetailHeaderView".

export { DetailView, DetailHeaderView };
export default DetailView;
