/**
 * RegistrantContactPage - Admin > DNS > Registrant Contact
 * (route: system/dns/registrant, #952).
 *
 * The ICANN contact that domain registrations are filed under. Two scopes on
 * one page, backed by django-mojo's GET/POST /api/dnsman/registrant (#951):
 * the HOUSE contact, used by every group that has none of its own, and a
 * specific GROUP's contact.
 *
 * Things here that look like detail but are not:
 *
 *  - **The house scope gates on the LITERAL `is_superuser`.** The backend's
 *    `require_platform_admin` checks that attribute, not a permission, so
 *    gating on `hasPermission('manage_dns')` — or even `admin` — would render
 *    a control that 403s. Same reasoning and same answer as the Adopt button
 *    on DomainTablePage. Everyone else is pinned to their active group.
 *  - **We never read another scope to fill this one.** A group with no contact
 *    of its own gets `contact: null` and a statement, never the inherited
 *    values: that contact is the operator's personal name, address and phone.
 *    A 403 is never papered over with a fallback read.
 *  - **`_raw` is bound to the loaded scope.** It carries the keys the form
 *    does not render (`Fax`, `ExtraParams`) across a save, because the backend
 *    REPLACES the stored value. Carrying it across a SCOPE CHANGE would write
 *    the house contact's private keys into a tenant's row, invisibly — none of
 *    them is on screen. So it is cleared on every scope change and only
 *    repopulated from a `source: "database"` load of the current scope.
 *  - **The scope switch is a plain page control, not a form field.** A
 *    FormView `buttongroup` cannot drive `showWhen` (its handler never calls
 *    `handleFieldChange`), so a picker toggled that way renders hidden and
 *    stays hidden. Presence, not visibility.
 *
 * Page lifecycle (WM-023): `onEnter` must await super (the base clears the
 * render guard) and must NOT await the fetch — showPage renders only after
 * onEnter returns.
 */

import Page from '@core/Page.js';
import FormView from '@core/forms/FormView.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { GroupList } from '@core/models/Group.js';
import { registrar, registrantContact } from '@ext/admin/models/Dns.js';
import { COUNTRIES } from '@ext/admin/security/geofence/GeofenceRuleForm.js';
import {
    buildContactFields,
    buildContactPayload,
    contactToForm,
    preservedKeys,
    validateContact
} from './registrantData.js';

const escapeHtml = MOJOUtils.escapeHtml;

class RegistrantContactPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            title: 'Registrant Contact',
            className: 'registrant-contact-page',
            template: `
                <div class="container-lg py-3">
                    <div class="d-flex align-items-start gap-3 mb-3">
                        <span class="d-grid" style="width:44px;height:44px;border-radius:11px;place-items:center;
                              background:rgba(var(--bs-primary-rgb),.12); color:var(--bs-primary)">
                            <i class="bi bi-person-vcard fs-5"></i>
                        </span>
                        <div>
                            <h4 class="mb-0">Registrant Contact</h4>
                            <div class="text-secondary small">
                                The ICANN contact domain registrations are filed under. Registries require a
                                complete one before a domain can be purchased.
                            </div>
                        </div>
                    </div>

                    {{#isUnsupported|bool}}
                    <div class="card">
                        <div class="card-body">
                            <h6 class="mb-2"><i class="bi bi-plug me-2"></i>This server manages the contact in its deployment settings</h6>
                            <p class="text-secondary small mb-0">
                                It does not expose the portal-managed registrant-contact API, so there is nothing to
                                edit here. Set <code>DNSMAN_REGISTRANT_CONTACT</code> in the deployment's server
                                settings instead, or upgrade django-mojo.
                            </p>
                        </div>
                    </div>
                    {{/isUnsupported|bool}}

                    {{^isUnsupported}}
                    {{#canChooseScope|bool}}
                    <div class="card mb-3">
                        <div class="card-body d-flex align-items-center gap-3 flex-wrap">
                            <span class="text-secondary small">Editing</span>
                            <div class="btn-group btn-group-sm" role="group" aria-label="Contact scope">
                                <button type="button" data-action="scope-changed" data-scope="house"
                                        class="btn {{#scopeIsHouse|bool}}btn-primary{{/scopeIsHouse|bool}}{{^scopeIsHouse}}btn-outline-secondary{{/scopeIsHouse}}">
                                    <i class="bi bi-buildings me-1"></i>House contact
                                </button>
                                <button type="button" data-action="scope-changed" data-scope="group"
                                        class="btn {{^scopeIsHouse}}btn-primary{{/scopeIsHouse}}{{#scopeIsHouse|bool}}btn-outline-secondary{{/scopeIsHouse|bool}}">
                                    <i class="bi bi-people me-1"></i>A specific group
                                </button>
                            </div>
                            <div data-container="group-picker" class="flex-grow-1" style="min-width:18rem"></div>
                        </div>
                    </div>
                    {{/canChooseScope|bool}}

                    {{^canChooseScope}}
                    <div class="alert alert-secondary py-2 px-3 small">
                        <i class="bi bi-people me-1"></i>
                        {{#groupLabel}}Editing the registrant contact for <b>{{groupLabel}}</b>.{{/groupLabel}}
                        {{^groupLabel}}Editing the registrant contact for your active group.{{/groupLabel}}
                        Managing the house contact used by groups without one is restricted to platform
                        administrators.
                    </div>
                    {{/canChooseScope}}

                    {{#isLoading|bool}}
                    <div class="card"><div class="card-body text-secondary small">
                        <span class="spinner-border spinner-border-sm me-2"></span>Loading the contact for this scope…
                    </div></div>
                    {{/isLoading|bool}}

                    {{#isForbidden|bool}}
                    <div class="card"><div class="card-body">
                        <h6 class="mb-2"><i class="bi bi-shield-lock me-2"></i>Not permitted</h6>
                        <p class="text-secondary small mb-0">{{forbiddenMessage}}</p>
                    </div></div>
                    {{/isForbidden|bool}}

                    {{#isReady|bool}}
                    {{#needsGroup|bool}}
                    <div class="card"><div class="card-body text-secondary small">
                        {{#canChooseScope|bool}}
                        <i class="bi bi-arrow-up me-1"></i>Pick a group to edit its registrant contact.
                        {{/canChooseScope|bool}}
                        {{^canChooseScope}}
                        <i class="bi bi-info-circle me-1"></i>
                        No group is currently selected, so there is no contact to edit. Choose a group first —
                        the registrant contact is per group, and the house contact used by groups without one
                        is managed by platform administrators.
                        {{/canChooseScope}}
                    </div></div>
                    {{/needsGroup|bool}}

                    {{^needsGroup}}
                    <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
                        <span class="badge {{configuredClass}}">
                            <i class="bi {{configuredIcon}} me-1"></i>{{configuredText}}
                        </span>
                        {{#purchaseDisabled|bool}}
                        <span class="text-secondary small">
                            Purchasing is turned off for this deployment, so a contact here will not enable buying
                            until that is changed on the server.
                        </span>
                        {{/purchaseDisabled|bool}}
                    </div>

                    {{#isInherited|bool}}
                    <div class="alert alert-info py-2 px-3 small">
                        <i class="bi bi-diagram-2 me-1"></i>
                        This group has no contact of its own — domain purchases for it use the contact inherited
                        from its parent group, or the house contact. Those details are not shown here.
                        Filling this form in gives the group its own.
                    </div>
                    {{/isInherited|bool}}

                    {{#isSettingsFile|bool}}
                    <div class="alert alert-info py-2 px-3 small">
                        <i class="bi bi-lock me-1"></i>
                        This contact comes from the <b>deployment file</b>. Saving here creates a portal-managed
                        record that takes precedence over it.
                    </div>
                    {{/isSettingsFile|bool}}

                    {{#hasProblems|bool}}
                    <div class="alert alert-warning py-2 px-3 small">
                        <i class="bi bi-exclamation-triangle me-1"></i>
                        This contact is saved but incomplete — purchases for this scope are refused until it is fixed:
                        <ul class="mb-0 mt-1">{{{problemItems}}}</ul>
                    </div>
                    {{/hasProblems|bool}}

                    {{#hasPreserved|bool}}
                    <div class="alert alert-secondary py-2 px-3 small">
                        <i class="bi bi-box me-1"></i>
                        This contact also carries registrar parameters that are not editable here
                        (<code>{{preservedList}}</code>). They are preserved when you save.
                    </div>
                    {{/hasPreserved|bool}}

                    <div class="card">
                        <div class="card-body">
                            <div data-container="contact-form"></div>
                            <div class="rcp-errors"></div>
                            <div class="d-flex align-items-center gap-2 border-top pt-3 mt-3 flex-wrap">
                                <button type="button" class="btn btn-primary btn-sm" data-action="save-contact">
                                    <i class="bi bi-check-lg me-1"></i>Save contact
                                </button>
                                <button type="button" class="btn btn-outline-secondary btn-sm" data-action="discard-contact">
                                    Discard changes
                                </button>
                                <span class="rcp-status small text-secondary"></span>
                                {{#canClear|bool}}
                                <button type="button" class="btn btn-link btn-sm text-danger ms-auto px-1"
                                        data-action="clear-contact">
                                    Remove this group's contact…
                                </button>
                                {{/canClear|bool}}
                            </div>
                        </div>
                    </div>
                    {{/needsGroup}}
                    {{/isReady|bool}}
                    {{/isUnsupported}}
                </div>
            `
        });

        // 'house' | 'group'
        this.scope = 'house';
        this.groupId = null;
        this.groupLabel = '';

        // 'loading' | 'ready' | 'unsupported' | 'forbidden'
        this.state = 'loading';
        this.forbiddenMessage = '';

        this.payload = null;
        this.problems = [];
        this.preserved = [];
        this.caps = {};

        // The stashed contact for THE CURRENTLY LOADED SCOPE, or null. See the
        // class docstring — this is the field that leaks PII if it outlives a
        // scope change.
        this._raw = null;

        this.canChooseScope = false;
        this.contactForm = null;
        this.groupForm = null;
        this._pending = null;
    }

    // ── Template accessors ─────────────────────────────────────────────

    get isLoading() { return this.state === 'loading'; }
    get isReady() { return this.state === 'ready'; }
    get isUnsupported() { return this.state === 'unsupported'; }
    get isForbidden() { return this.state === 'forbidden'; }
    get scopeIsHouse() { return this.scope === 'house'; }
    get needsGroup() { return this.scope === 'group' && !this.groupId; }
    get isInherited() { return !!(this.payload && this.payload.inherited && !this.payload.contact); }
    get isSettingsFile() { return !!(this.payload && this.payload.source === 'settings_file'); }
    get hasProblems() { return this.problems.length > 0; }
    get hasPreserved() { return this.preserved.length > 0; }
    get preservedList() { return this.preserved.join(', '); }
    get purchaseDisabled() { return this.caps.purchase_enabled === false; }

    /** Group scope with a record of its own — there is something to remove. */
    get canClear() {
        return this.scope === 'group' && !!this.groupId
            && !!(this.payload && this.payload.source === 'database');
    }

    get configuredText() {
        if (this.payload && this.payload.effective_configured) return 'Purchases can proceed for this scope';
        return 'Purchases are blocked for this scope';
    }

    get configuredClass() {
        return this.payload && this.payload.effective_configured
            ? 'bg-success bg-opacity-25 text-body'
            : 'bg-warning bg-opacity-25 text-body';
    }

    get configuredIcon() {
        return this.payload && this.payload.effective_configured ? 'bi-check-circle' : 'bi-exclamation-triangle';
    }

    /** Trusted HTML: the server's problem strings are escaped individually. */
    get problemItems() {
        return this.problems.map(text => `<li>${escapeHtml(String(text))}</li>`).join('');
    }

    // ── Lifecycle ──────────────────────────────────────────────────────

    async onInit() {
        // The LITERAL attribute, not a permission — see the class docstring.
        this.canChooseScope = !!this.getApp()?.activeUser?.get?.('is_superuser');
        if (!this.canChooseScope) {
            this.scope = 'group';
            this.groupId = this.getApp()?.activeGroup?.id || null;
            this.groupLabel = this.getApp()?.activeGroup?.get?.('name') || '';
        }
    }

    async onEnter() {
        // Base Page.onEnter maintains the isActive/_wasExited render guard —
        // skipping it blanks the page on every revisit.
        await super.onEnter();

        const requested = this.getApp()?.router?.getParam?.('group')
            || new URLSearchParams(window.location.search).get('group');
        if (requested) {
            this.scope = 'group';
            this.groupId = requested;
        }

        // Fire-and-forget: awaiting here would leave the page blank until the
        // API answers. On the FIRST visit onEnter also runs before the first
        // render, so stash and let onAfterMount apply it.
        this.state = 'loading';
        this.loadScope().then(result => {
            if (this.element) return this.applyPayload(result);
            this._pending = result;
        }).catch(() => {});
    }

    async onAfterMount() {
        if (this._pending) {
            const result = this._pending;
            this._pending = null;
            await this.applyPayload(result);
        }
    }

    // ── Loading ────────────────────────────────────────────────────────

    /** Read the current scope. Never reads a scope other than the current one. */
    async loadScope() {
        // Cleared BEFORE the request, not after it resolves: an in-flight load
        // must never leave the previous scope's keys reachable by a save.
        this._raw = null;

        if (this.scope === 'group' && !this.groupId) {
            return { state: 'ready', payload: null };
        }

        const group = this.scope === 'group' ? this.groupId : null;
        let resp = null;
        try {
            resp = await registrantContact.get(group);
        } catch {
            resp = null;
        }

        // Capabilities drive the purchase-disabled note only, but they are
        // awaited rather than fired off: loadScope() resolves BEFORE the render
        // that would show the note, so a fire-and-forget assignment lands after
        // its own paint and the note misses the render it belongs to. Cached
        // per scope, and a failure here is never allowed to block the editor.
        try {
            this.caps = (await registrar.capabilities(group)) || {};
        } catch {
            this.caps = {};
        }

        if (resp && resp.success) {
            return { state: 'ready', payload: (resp.data && resp.data.data) || {} };
        }
        if (resp && resp.status === 404) {
            return { state: 'unsupported' };
        }
        if (resp && resp.status === 403) {
            // A house-scope refusal means our is_superuser read disagreed with
            // the server. Demote to the group scope rather than stranding the
            // user on a dead end — but never fall back to READING another scope.
            if (this.scope === 'house') {
                return { state: 'demote' };
            }
            return {
                state: 'forbidden',
                message: (resp.data && resp.data.error)
                    || 'You do not have permission to manage this group\'s registrant contact.'
            };
        }
        return {
            state: 'forbidden',
            message: (resp && resp.data && resp.data.error) || (resp && resp.message)
                || 'The registrant contact could not be loaded.'
        };
    }

    /** Apply a loadScope() result: set state, rebuild the embedded forms. */
    async applyPayload(result) {
        if (!result) return;

        if (result.state === 'demote') {
            this.canChooseScope = false;
            this.scope = 'group';
            this.groupId = this.getApp()?.activeGroup?.id || null;
            this.groupLabel = this.getApp()?.activeGroup?.get?.('name') || '';
            await this.applyPayload(await this.loadScope());
            return;
        }

        this.state = result.state;
        this.forbiddenMessage = result.message || '';
        this.payload = result.payload || null;

        const contact = this.payload && this.payload.contact;
        // The scope-bound rule: only a record belonging to THIS scope may seed
        // the preserved-key carrier. Inherited and absent both leave it null.
        this._raw = (this.payload && this.payload.source === 'database' && contact) ? contact : null;
        this.preserved = preservedKeys(this._raw);
        this.problems = (this.payload && this.payload.inherited)
            ? []            // never report on a contact this scope only inherits
            : ((this.payload && this.payload.problems) || []);

        if (this.contactForm) { this.removeChild(this.contactForm); this.contactForm = null; }
        if (this.groupForm) { this.removeChild(this.groupForm); this.groupForm = null; }

        await this.render();

        if (this.canChooseScope && this.scope === 'group') await this.mountGroupPicker();
        if (this.state === 'ready' && !this.needsGroup) await this.mountContactForm(contact);
    }

    async mountGroupPicker() {
        this.groupForm = new FormView({
            containerId: 'group-picker',
            fields: [{
                name: 'group',
                type: 'collection',
                label: null,
                Collection: GroupList,
                labelField: 'name',
                valueField: 'id',
                placeholder: 'Search groups…',
                emptyFetch: false,
                debounceMs: 300,
                columns: 12
            }],
            data: { group: this.groupId || '' }
        });
        this.groupForm.on('field:change', ({ value }) => { this.selectGroup(value); });
        this.addChild(this.groupForm);
        await this.groupForm.render();
    }

    async mountContactForm(contact) {
        this.contactForm = new FormView({
            containerId: 'contact-form',
            fields: buildContactFields(COUNTRIES),
            data: contactToForm(contact)
        });
        this.addChild(this.contactForm);
        await this.contactForm.render();
    }

    async selectGroup(value) {
        const id = value || null;
        if (String(id || '') === String(this.groupId || '')) return;
        this.groupId = id;
        this.state = 'loading';
        this._raw = null;
        await this.applyPayload(await this.loadScope());
    }

    // ── Actions ────────────────────────────────────────────────────────

    async onActionScopeChanged(event, element) {
        const scope = element.dataset.scope === 'group' ? 'group' : 'house';
        if (scope === this.scope) return true;
        if (!(await this.confirmDiscardIfDirty())) return true;

        this.scope = scope;
        // Cleared here as well as in loadScope: the invariant is worth stating
        // at every boundary that could violate it.
        this._raw = null;
        this.payload = null;
        this.problems = [];
        this.preserved = [];
        this.state = 'loading';
        await this.applyPayload(await this.loadScope());
        return true;
    }

    async onActionSaveContact(event, element) {
        if (!this.contactForm) return true;
        if (element) element.disabled = true;
        try {
            const form = await this.contactForm.getFormData();
            const contact = buildContactPayload(this._raw, form);

            const problems = validateContact(contact);
            if (problems.length) {
                this.showProblems(problems);
                this.setStatus('Not saved — fix the fields listed above.', 'danger');
                return true;
            }
            this.clearProblems();

            const app = this.getApp();
            this.setStatus('Saving…');
            app?.showLoading?.();
            let resp;
            try {
                resp = await registrantContact.save(contact, this.scope === 'group' ? this.groupId : null);
            } catch {
                resp = null;
            } finally {
                app?.hideLoading?.();
            }

            if (resp && resp.success) {
                // The effective answer changed for this scope — and, when the
                // house contact changed, for every group that inherits it.
                registrar.resetCapabilities();
                app?.toast?.success('Registrant contact saved');
                await this.applyPayload(await this.loadScope());
                this.setStatus('Saved.', 'success');
            } else {
                this.fail((resp && resp.data && resp.data.error) || (resp && resp.message)
                    || 'The contact could not be saved.');
            }
            return true;
        } finally {
            const button = this.element?.querySelector('[data-action="save-contact"]');
            if (button) button.disabled = false;
        }
    }

    async onActionDiscardContact() {
        this.clearProblems();
        this.state = 'loading';
        await this.applyPayload(await this.loadScope());
        return true;
    }

    async onActionClearContact() {
        if (!this.canClear) return true;
        const ok = await Modal.confirm(
            'Remove this group\'s own registrant contact? Its domain purchases will fall back to the contact '
            + 'it inherits from its parent group, or the house contact. Domains already registered keep the '
            + 'contact they were filed with.',
            'Remove group contact',
            { confirmText: 'Remove contact', confirmClass: 'btn-danger' }
        );
        if (!ok) return true;

        const app = this.getApp();
        app?.showLoading?.();
        let resp;
        try {
            resp = await registrantContact.clear(this.groupId);
        } catch {
            resp = null;
        } finally {
            app?.hideLoading?.();
        }

        if (resp && resp.success) {
            // Clearing changes this group's effective answer too — it becomes
            // whatever it inherits, which may be nothing.
            registrar.resetCapabilities();
            app?.toast?.success('Group contact removed');
            await this.applyPayload(await this.loadScope());
        } else {
            this.fail((resp && resp.data && resp.data.error) || (resp && resp.message)
                || 'The contact could not be removed.');
        }
        return true;
    }

    // ── Helpers ────────────────────────────────────────────────────────

    /** True to proceed. Only asks when the form actually differs from what loaded. */
    async confirmDiscardIfDirty() {
        if (!this.contactForm) return true;
        let form;
        try {
            form = await this.contactForm.getFormData();
        } catch {
            return true;
        }
        const loaded = contactToForm(this.payload && this.payload.contact);
        const dirty = Object.keys(loaded).some(key =>
            String(form[key] ?? '').trim() !== String(loaded[key] ?? '').trim());
        if (!dirty) return true;
        return Modal.confirm(
            'You have unsaved changes to this contact. Switching scope discards them.',
            'Discard changes',
            { confirmText: 'Discard', confirmClass: 'btn-danger' }
        );
    }

    showProblems(problems) {
        const box = this.element?.querySelector('.rcp-errors');
        if (box) {
            box.innerHTML = `
                <div class="alert alert-danger py-2 px-3 small mt-3 mb-0">
                    <div class="fw-semibold mb-1">This contact is not complete:</div>
                    <ul class="mb-0">
                        ${problems.map(p => `<li>${escapeHtml(String(p.message))}</li>`).join('')}
                    </ul>
                </div>`;
        }
        const formEl = this.contactForm?.getFormElement?.();
        if (!formEl) return;
        formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        problems.forEach(problem => {
            const input = formEl.elements ? formEl.elements[problem.field] : null;
            if (input && input.classList) input.classList.add('is-invalid');
        });
    }

    clearProblems() {
        const box = this.element?.querySelector('.rcp-errors');
        if (box) box.innerHTML = '';
        const formEl = this.contactForm?.getFormElement?.();
        if (formEl) formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }

    fail(message) {
        this.setStatus(message, 'danger');
        this.getApp()?.toast?.error(message);
    }

    setStatus(text, tone) {
        const el = this.element?.querySelector('.rcp-status');
        if (!el) return;
        el.textContent = text || '';
        el.className = 'rcp-status small '
            + (tone === 'danger' ? 'text-danger'
                : tone === 'success' ? 'text-success'
                    : 'text-secondary');
    }
}

export default RegistrantContactPage;
