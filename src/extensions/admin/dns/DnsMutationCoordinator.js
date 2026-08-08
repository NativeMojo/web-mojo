/**
 * Keyed single-flight mutations with mandatory authoritative reconciliation.
 * No mutation is retried: a transport result is evidence only, never truth.
 */
class DnsMutationCoordinator {
    constructor() {
        this.inFlight = new Map();
        this.refreshRequired = new Set();
    }

    isLatched(key) {
        return this.refreshRequired.has(String(key));
    }

    clear(key) {
        this.refreshRequired.delete(String(key));
    }

    clearPrefix(prefix) {
        const value = String(prefix);
        [...this.refreshRequired].forEach(key => {
            if (key.startsWith(value)) this.refreshRequired.delete(key);
        });
    }

    run(key, options = {}) {
        const mutationKey = String(key);
        if (this.inFlight.has(mutationKey)) return this.inFlight.get(mutationKey);
        if (this.isLatched(mutationKey)) {
            return Promise.resolve({
                key: mutationKey,
                attempted: false,
                state: 'refresh-required',
                refreshRequired: true
            });
        }

        const promise = this._run(mutationKey, options)
            .finally(() => this.inFlight.delete(mutationKey));
        this.inFlight.set(mutationKey, promise);
        return promise;
    }

    async _run(key, { mutate, reconcile, classify } = {}) {
        let response = null;
        let mutationError = null;
        let observed = null;
        let reconcileError = null;
        try {
            response = await mutate();
        } catch (error) {
            mutationError = error;
        } finally {
            try {
                observed = await reconcile();
            } catch (error) {
                reconcileError = error;
            }
        }

        if (reconcileError || observed === null || observed === undefined || observed?.success === false) {
            this.refreshRequired.add(key);
            return {
                key, attempted: true, response, mutationError, reconcileError,
                observed, state: 'unconfirmed', refreshRequired: true
            };
        }

        let state = 'unconfirmed';
        try {
            state = typeof classify === 'function'
                ? classify(observed, response, mutationError)
                : (mutationError || response?.success === false ? 'not-applied' : 'applied');
        } catch {
            state = 'unconfirmed';
        }
        if (state !== 'applied' && state !== 'not-applied') state = 'unconfirmed';
        const refreshRequired = state === 'unconfirmed';
        if (refreshRequired) this.refreshRequired.add(key);
        return {
            key, attempted: true, response, mutationError, observed, state,
            refreshRequired
        };
    }
}

export const dnsMutations = new DnsMutationCoordinator();
export default DnsMutationCoordinator;
