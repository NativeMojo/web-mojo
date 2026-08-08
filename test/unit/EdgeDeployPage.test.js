module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach } = testContext;
    const path = require('path');
    const { moduleLoader } = require('../utils/simple-module-loader');
    const { testHelpers } = require('../utils/test-helpers');
    await testHelpers.setup();
    const jest = global.jest;
    const restMock = { POST: jest.fn() };
    global.Rest = restMock;
    global.Collection = moduleLoader.loadModule('Collection');
    global.Model = moduleLoader.loadModule('Model');
    const Edge = moduleLoader.loadModuleFromFile(
        path.join(__dirname, '../../src/extensions/admin/models/Edge.js'), 'EdgeDeployModels'
    );
    delete global.Rest;
    delete global.Collection;
    delete global.Model;

    describe('flat fleet deploy contract', () => {
        beforeEach(() => restMock.POST.mockReset());

        it('normalizes exact 7-40 hex SHAs and rejects branch names', () => {
            expect(Edge.normalizeDeploySha(' ABCDEF1 ')).toBe('abcdef1');
            expect(Edge.normalizeDeploySha('a'.repeat(40))).toBe('a'.repeat(40));
            expect(() => Edge.normalizeDeploySha('main')).toThrow('7–40');
            expect(() => Edge.normalizeDeploySha('abcdef')).toThrow('7–40');
        });

        it('accepts flat queued true and queued false 202 bodies', () => {
            expect(Edge.classifyDeployResponse({ success: true, status: 202,
                data: { status: true, queued: true, sha: 'abcdef1' } })).toEqual({
                accepted: true, queued: true, sha: 'abcdef1', error: null
            });
            expect(Edge.classifyDeployResponse({ success: true, status: 202,
                data: { status: true, queued: false, sha: 'abcdef1' } }).accepted).toBe(true);
        });

        it('preserves the exact flat 503 coordination error', () => {
            const verdict = Edge.classifyDeployResponse({ success: false, status: 503,
                message: 'Server error', data: { status: false, error: 'deploy coordination unavailable' } });
            expect(verdict.accepted).toBe(false);
            expect(verdict.error).toBe('deploy coordination unavailable');
        });

        it('posts one normalized sha to the sole deploy endpoint', async () => {
            restMock.POST.mockResolvedValue({ success: true, status: 202,
                data: { status: true, queued: false, sha: 'abcdef1' } });
            const verdict = await Edge.requestFleetDeploy('ABCDEF1');
            expect(restMock.POST).toHaveBeenCalledTimes(1);
            expect(restMock.POST).toHaveBeenCalledWith('/api/edge/deploy', { sha: 'abcdef1' });
            expect(verdict.accepted).toBe(true);
        });
    });
};
