import {
    certificateLifecycleSignature,
    certificateNeedsPolling,
    isTerminalCertificate,
    projectCertificate
} from './certificateData.js';

/** One non-overlapping, bounded certificate lifecycle timer per surface. */
class CertificateLifecyclePoller {
    constructor(options = {}) {
        this.interval = options.interval || 10000;
        this.maxTicks = options.maxTicks || 36;
        this.setTimer = options.setTimer || setTimeout;
        this.clearTimer = options.clearTimer || clearTimeout;
        this.onUpdate = options.onUpdate || (() => {});
        this.onStop = options.onStop || (() => {});
        this.reset();
    }

    reset() {
        this.stop('reset', false);
        this.ticks = 0;
        this.domainId = null;
        this.baseline = null;
        this.trackedIds = new Set();
        this.fetch = null;
        this.active = false;
    }

    start({ domainId = null, snapshot = null, fetch } = {}) {
        this.reset();
        if (typeof fetch !== 'function') return false;
        const rows = this._rows(snapshot);
        const pollingRows = rows.filter(row => certificateNeedsPolling(row));
        if (!pollingRows.length) return false;
        this.domainId = domainId === null || domainId === undefined ? null : String(domainId);
        this.trackedIds = new Set(pollingRows.map(row => String(row.id)));
        this.baseline = pollingRows.map(certificateLifecycleSignature).sort().join('|');
        this.fetch = fetch;
        this.active = true;
        this._schedule();
        return true;
    }

    _rows(value) {
        const rows = Array.isArray(value) ? value : (value ? [value] : []);
        return rows.map(row => projectCertificate(row?.attributes || row));
    }

    _schedule() {
        if (!this.active || this.timer) return;
        this.timer = this.setTimer(() => this._tick(), this.interval);
    }

    async _tick() {
        this.timer = null;
        if (!this.active) return;
        this.ticks += 1;
        let value;
        try {
            value = await this.fetch();
        } catch (error) {
            this.stop('error');
            return;
        }
        if (!this.active) return;
        const rows = this._rows(value);
        if (this.domainId !== null && rows.some(row => {
            const id = row.domain?.id || row.domain;
            return id !== null && id !== undefined && String(id) !== this.domainId;
        })) {
            this.stop('domain-changed');
            return;
        }
        const tracked = rows.filter(row => this.trackedIds.has(String(row.id)));
        this.onUpdate(rows);
        const signature = tracked.map(certificateLifecycleSignature).sort().join('|');
        if (!tracked.length) {
            this.stop('complete');
            return;
        }
        if (tracked.some(isTerminalCertificate)) {
            this.stop('terminal');
            return;
        }
        if (signature !== this.baseline && !tracked.some(row => certificateNeedsPolling(row))) {
            this.stop('changed');
            return;
        }
        if (this.ticks >= this.maxTicks) {
            this.stop('timeout');
            return;
        }
        if (!tracked.some(row => certificateNeedsPolling(row))) {
            this.stop('complete');
            return;
        }
        this._schedule();
    }

    stop(reason = 'stopped', notify = true) {
        if (this.timer) this.clearTimer(this.timer);
        this.timer = null;
        const wasActive = this.active;
        this.active = false;
        if (notify && wasActive) this.onStop(reason);
    }
}

export default CertificateLifecyclePoller;
