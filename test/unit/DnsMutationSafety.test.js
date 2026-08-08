module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const path = require('path');
    const { pathToFileURL } = require('url');
    const dnsDir = path.join(__dirname, '../../src/extensions/admin/dns');
    const coordinatorModule = await import(pathToFileURL(path.join(dnsDir, 'DnsMutationCoordinator.js')).href);
    const dnsData = await import(pathToFileURL(path.join(dnsDir, 'dnsData.js')).href);
    const DnsMutationCoordinator = coordinatorModule.default;
    const {
        classifyRecordMutation,
        recordMutationSnapshot,
        recordSnapshotMatches
    } = dnsData;

    describe('DNS mutation safety', () => {
    it('deduplicates the same mutation key and reconciles exactly once', async () => {
        const coordinator = new DnsMutationCoordinator();
        let release;
        let attempts = 0;
        let reconciles = 0;
        const mutate = () => new Promise(resolve => { attempts += 1; release = resolve; });
        const options = {
            mutate,
            reconcile: async () => { reconciles += 1; return { status: 'active' }; },
            classify: () => 'applied'
        };
        const first = coordinator.run('certificate:1', options);
        const second = coordinator.run('certificate:1', options);
        expect(second).toBe(first);
        release({ success: true });
        expect((await first).state).toBe('applied');
        expect(attempts).toBe(1);
        expect(reconciles).toBe(1);
    });

    it('reconciles in finally after a failed mutation attempt', async () => {
        const coordinator = new DnsMutationCoordinator();
        let reconciled = false;
        const result = await coordinator.run('dns:1:A|example.com', {
            mutate: async () => { throw new Error('timeout'); },
            reconcile: async () => { reconciled = true; return []; },
            classify: () => 'not-applied'
        });
        expect(reconciled).toBe(true);
        expect(result.state).toBe('not-applied');
        expect(result.mutationError.message).toBe('timeout');
    });

    it('latches an ambiguous resource until explicit successful refresh clears it', async () => {
        const coordinator = new DnsMutationCoordinator();
        const result = await coordinator.run('credential:4', {
            mutate: async () => ({ success: false }),
            reconcile: async () => null
        });
        expect(result.refreshRequired).toBe(true);
        expect(coordinator.isLatched('credential:4')).toBe(true);
        expect((await coordinator.run('credential:4', {})).attempted).toBe(false);
        coordinator.clear('credential:4');
        expect(coordinator.isLatched('credential:4')).toBe(false);
    });

    it('snapshots exact and same-owner records so CNAME drift blocks a stale confirmation', () => {
        const beforeRows = [{ type: 'A', name: 'www.example.com', record_values: ['1.1.1.1'], ttl: 300 }];
        const target = { type: 'A', name: 'www.example.com', record_values: ['2.2.2.2'], ttl: 300 };
        const before = recordMutationSnapshot(beforeRows, target);
        const drifted = recordMutationSnapshot([
            ...beforeRows,
            { type: 'CNAME', name: 'www.example.com', record_values: ['other.example.com'], ttl: 300 }
        ], target);
        expect(recordSnapshotMatches(before, drifted)).toBe(false);
        expect(classifyRecordMutation([target], { before, target })).toBe('applied');
        expect(classifyRecordMutation(beforeRows, { before, target })).toBe('not-applied');
    });
    });
};
