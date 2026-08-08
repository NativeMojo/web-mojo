/**
 * DnsViews.test.js - construction-time configuration of the dnsman views (#394).
 *
 * Construction-only per WM-026: read the header/section config and drive
 * handlers directly rather than render(). What matters here is not markup but
 * the gates — a WHOIS section that leaks registrant PII to a read-only viewer,
 * or a certificate view that grows a "download key" control, would both be
 * invisible in a passing render test.
 */
module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const path = require('path');
    const fs = require('fs');
    const { moduleLoader } = require('../utils/simple-module-loader');

    const dnsDir = path.join(__dirname, '../../src/extensions/admin/dns');

    /**
     * Read a source file with comments stripped.
     *
     * These assertions pin invariants that are invisible in a render test — a
     * WHOIS section leaking registrant PII to a read-only viewer, a certificate
     * view growing a key-download control. Asserting on raw text would instead
     * pin the PROSE: every one of those files explains in a comment exactly why
     * it does not do the thing, and a naive grep flags its own documentation.
     */
    const stripComments = (text) => text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map(line => line.replace(/(^|\s)\/\/.*$/, '$1'))
        .join('\n');

    const read = (file) => stripComments(
        fs.readFileSync(path.join(dnsDir, file), 'utf8'));

    const dnsData = moduleLoader.loadModuleFromFile(path.join(dnsDir, 'dnsData.js'), 'dnsData');

    describe('dnsman views', () => {

        describe('DomainView section gating', () => {
            const source = read('DomainView.js');

            it('gates the WHOIS section on manage_dns, never view_dns', () => {
                // GET /api/dnsman/whois sits behind SAVE_PERMS on the backend
                // because the registrar returns the real registrant name,
                // address, phone and email regardless of WHOIS privacy.
                const whoisBlock = source.slice(source.indexOf("key: 'WHOIS'"));
                const sectionEnd = whoisBlock.indexOf('},');
                const section = whoisBlock.slice(0, sectionEnd);
                expect(section).toContain('permissions: MANAGE_PERMS');
                expect(section).not.toContain('view_dns');
            });

            it('defines MANAGE_PERMS without view_dns', () => {
                expect(source).toContain("const MANAGE_PERMS = ['manage_dns', 'security']");
                expect(source).not.toContain("MANAGE_PERMS = ['view_dns'");
            });

            it('has no active toggle — status is server-owned', () => {
                expect(source).not.toContain('activeField');
            });

            it("says the delete removes management, not the registration", () => {
                expect(source).toContain('remains registered');
            });

            it('reduces mojo domains to Overview and Certificates', () => {
                expect(source).toContain("model.get('provider') === 'mojo'");
                expect(source).toContain("activeSection: certificateOnly ? 'Overview' : 'Records'");
                expect(source).toContain('if (!certificateOnly)');
            });
        });

        describe('CertificateView never exposes key material', () => {
            const source = read('CertificateView.js');
            const table = read('CertificateTablePage.js');

            it('references no material endpoint and offers no download control', () => {
                [source, table].forEach(text => {
                    expect(text).not.toContain('certificate/material');
                    expect(text.toLowerCase()).not.toContain('private_key');
                    // Target the CONTROL, not the word: the view deliberately
                    // contains the sentence explaining that material is not
                    // downloadable from this panel, and that copy is the point.
                    expect(text).not.toMatch(/action:\s*'[^']*download/i);
                    expect(text).not.toMatch(/data-action="[^"]*download/i);
                });
            });

            it('explains the job-channel sync instead', () => {
                expect(source).toContain('certificate_updated');
            });

            it('offers revoke only, and only for an active certificate', () => {
                expect(source).toContain("action: 'revoke-certificate'");
                expect(source).toContain("when: m => m.get('status') === 'active'");
                // CAN_DELETE is False on the backend.
                expect(source).not.toContain("action: 'delete-certificate'");
            });

            it('resolves the owning Domain before detail and revoke gates', () => {
                expect(source).toContain('resolveOwningDomain');
                expect(source).toContain('isInteractiveSuperuser');
                expect(table).toContain('const domain = new Domain');
                expect(table).toContain('Certificate details are unavailable.');
            });
        });

        describe('models/Dns.js', () => {
            const source = stripComments(fs.readFileSync(
                path.join(__dirname, '../../src/extensions/admin/models/Dns.js'), 'utf8'));

            it('exposes no certificate material helper', () => {
                expect(source).not.toContain('material(');
            });

            it('routes credential creation through the verify-first link endpoint', () => {
                expect(source).toContain('credential/link');
            });

            it('resolves capabilities in exactly one place', () => {
                expect(source).toContain('async capabilities(');
                // Assert the invariant the name claims — ONE fetch site for
                // /config — rather than the method's arity. It grew an optional
                // group argument in #952 (registrant_contact_configured varies
                // per group since django-mojo #951), and a literal
                // `capabilities()` match would have failed on that alone.
                expect(source.match(/\/config/g)).toHaveLength(1);
            });

            it('keys the capability cache by group', () => {
                // A group-blind cache answers the HOUSE registrant-contact
                // question for a tenant, so a group whose own contact is
                // incomplete passes the buy gate and then fails at quote.
                expect(source).toContain('capabilityKey');
                expect(source).not.toContain('let _capabilities = null');
            });

            it('projects certificate constructor, merge, list, detail, and action ingress', () => {
                expect(source).toContain('super(projectCertificate(data)');
                expect(source).toContain('super.set(projectCertificate(key)');
                expect(source).toContain('super.parse(response).map(projectCertificate)');
                expect(source).toContain('projectCertificateResponse');
            });

            it('hydrates a group choice through ?id= instead of a detail URL', () => {
                expect(source).toContain('fetchChoice(id)');
                expect(source).toContain("credential/group-choice`, { id }");
                expect(source).not.toMatch(/credential\/group-choice\/\$\{/);
            });
        });

        describe('DnsCredential surfaces never reveal a secret', () => {
            const view = read('DnsCredentialView.js');
            const page = read('DnsCredentialTablePage.js');

            it('shows only masked values', () => {
                expect(view).toContain('api_key_masked');
                expect(view).toContain('api_secret_masked');
            });

            it('offers no reveal or copy-secret affordance', () => {
                [view, page].forEach(text => {
                    expect(text.toLowerCase()).not.toContain('reveal');
                    expect(text).not.toContain("get('api_key')");
                    expect(text).not.toContain("get('api_secret')");
                });
            });

            it('shares the functional link and rotation form', () => {
                expect(view).toContain('DnsCredentialLinkForm.open');
                expect(page).toContain('DnsCredentialLinkForm.open');
            });
        });

        describe('DomainTablePage onboarding gates', () => {
            const source = read('DomainTablePage.js');

            it('gates Adopt on the literal is_superuser attribute', () => {
                // The backend checks request.user.is_superuser. Gating on
                // hasPermission('admin') is broader and would render a button
                // that 403s for an admin-permissioned non-superuser.
                expect(source).toContain("activeUser?.get?.('is_superuser')");
                expect(source).not.toContain("hasPermission('admin')");
            });

            it('offers no Add button — domains are not creatable over REST', () => {
                expect(source).toContain('showAdd: false');
            });

            it('omits `failed` from the status filter', () => {
                // A failed registration deletes its domain row, so the filter
                // could only ever return an empty list.
                const options = dnsData.DEFAULT_CAPABILITIES; // touch the module
                expect(options).toBeDefined();
                expect(source).toContain('DomainStatusOptions');
                expect(source).not.toContain("value: 'failed'");
            });
        });

        describe('DnsRecordsView write path', () => {
            const source = read('DnsRecordsView.js');

            it('confirms before writing, using the value diff', () => {
                expect(source).toContain('confirmWrite');
                expect(source).toContain('diffRecordValues');
            });

            it('re-validates on save rather than trusting the modal button', () => {
                expect(source).toContain('editor.validate()');
                expect(source).toContain('if (!validation.ok)');
            });

            it('escapes provider-supplied strings in function formatters', () => {
                // Function-formatter output lands in cell.innerHTML raw.
                expect(source).toContain('escapeHtml');
                expect(source).toContain('MOJOUtils.escapeHtml');
            });

            it('renders the server error verbatim rather than inventing one', () => {
                expect(source).toContain('resp.data.error');
            });

            it('refetches exact and same-owner state before and after one write', () => {
                expect(source).toContain('recordMutationSnapshot');
                expect(source).toContain('recordSnapshotMatches');
                expect(source).toContain('classifyRecordMutation');
                expect(source).toContain('reconcile: () => this.refresh()');
            });
        });

        describe('DnsRecordEditor', () => {
            const source = read('DnsRecordEditor.js');

            it('builds its fields from RECORD_SPECS, not a free-text box', () => {
                expect(source).toContain('RECORD_SPECS');
                expect(source).toContain('spec.fields.map');
                expect(source).not.toContain('<textarea');
            });

            it('runs autofix on every field change', () => {
                expect(source).toContain('autofixFieldValue');
            });

            it('offers the change-type fix action', () => {
                expect(source).toContain("err.fix.action !== 'change-type'");
            });
        });
    });
};
