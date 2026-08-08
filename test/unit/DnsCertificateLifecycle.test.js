module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const path = require('path');
    const { pathToFileURL } = require('url');
    const dnsDir = path.join(__dirname, '../../src/extensions/admin/dns');
    const certificateModule = await import(pathToFileURL(path.join(dnsDir, 'certificateData.js')).href);
    const pollerModule = await import(pathToFileURL(path.join(dnsDir, 'CertificateLifecyclePoller.js')).href);
    const CertificateLifecyclePoller = pollerModule.default;
    const {
        certificateReadiness,
        normalizeCertificateSans,
        projectCertificate,
        sanitizeCertificateError
    } = certificateModule;

    describe('DNS certificate lifecycle safety', () => {
    it('positively projects certificate data and strips every material-shaped field', () => {
        const projected = projectCertificate({
            id: 7,
            common_name: 'example.com',
            sans: ['EXAMPLE.COM.', '*.Example.com.'],
            cert_pem: 'CERT',
            chain_pem: 'CHAIN',
            private_key_pem: 'KEY',
            material_url: '/api/dnsman/certificate/material/7',
            export: { url: 'javascript:alert(1)' },
            domain: { id: 2, name: 'example.com', provider: 'route53', unsafe: { key: 'x' } }
        });

        expect(projected).toEqual({
            id: 7,
            common_name: 'example.com',
            sans: ['example.com', '*.example.com'],
            domain: { id: 2, name: 'example.com', provider: 'route53' }
        });
    });

    it('redacts credentials, strips controls, and caps last_error', () => {
        const value = `failed\u0000 Authorization: Bearer abc token=secret password:'hunter2' ${'x'.repeat(3000)}`;
        const safe = sanitizeCertificateError(value);
        expect(safe).not.toContain('abc');
        expect(safe).not.toContain('secret');
        expect(safe).not.toContain('hunter2');
        expect(safe.length).toBeLessThanOrEqual(2000);
        expect(safe).not.toMatch(/[\x00-\x1f\x7f]/);
    });

    it('normalizes SANs and enforces delegated apex_wildcard exactly', () => {
        expect(normalizeCertificateSans(
            ['EXAMPLE.com.', '*.example.com', 'example.com'],
            { apex: 'example.com', profile: 'apex_wildcard' }
        )).toEqual({ ok: true, names: ['example.com', '*.example.com'], errors: [] });

        const invalid = normalizeCertificateSans(
            ['example.com', 'www.example.com'],
            { apex: 'example.com', profile: 'apex_wildcard' }
        );
        expect(invalid.ok).toBe(false);
        expect(invalid.errors[0]).toContain('exactly');
    });

    it('fails closed on unknown delegation and permits only explicit legacy direct fallback', () => {
        const domain = { id: 1, name: 'example.com', provider: 'route53', status: 'active' };
        const caps = { delegated_acme: { available: false, profile: null } };
        expect(certificateReadiness({ caps, capabilitiesLoaded: true, domain }).ready).toBe(false);
        expect(certificateReadiness({
            caps, capabilitiesLoaded: true, domain, delegationUnsupported: true
        }).mode).toBe('legacy-direct');
        expect(certificateReadiness({
            caps: { delegated_acme: { available: true, profile: 'apex_wildcard' } },
            capabilitiesLoaded: true,
            domain: { ...domain, provider: 'mojo' },
            delegation: { id: 3, state: 'verified' },
            delegationLoaded: true
        }).mode).toBe('delegated');
    });

    it('uses one bounded non-overlapping timer and stops on terminal state', async () => {
        let callback = null;
        let scheduled = 0;
        let fetches = 0;
        const poller = new CertificateLifecyclePoller({
            interval: 10000,
            maxTicks: 36,
            setTimer(fn) { scheduled += 1; callback = fn; return scheduled; },
            clearTimer() {}
        });
        poller.start({
            domainId: 4,
            snapshot: { id: 9, domain: 4, status: 'issuing' },
            fetch: async () => {
                fetches += 1;
                return { id: 9, domain: 4, status: 'failed', last_error: 'CA refusal' };
            }
        });
        expect(scheduled).toBe(1);
        await callback();
        expect(fetches).toBe(1);
        expect(poller.active).toBe(false);
        expect(scheduled).toBe(1);
    });
    });
};
