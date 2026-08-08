/** Exact-revision fleet deploy control (route: system/edge/deploy). */

import Page from '@core/pages/Page.js';
import Modal from '@core/views/feedback/Modal.js';
import { normalizeDeploySha, requestFleetDeploy } from '@ext/admin/models/Edge.js';

class EdgeDeployPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_edge_deploy', pageName: 'Fleet Deploy', router: 'admin/edge/deploy',
            className: 'edge-deploy-page',
            template: `
              <div class="container-fluid py-4">
                <div class="edge-deploy-card card border-0 shadow-sm mx-auto">
                  <div class="card-body p-4 p-lg-5">
                    <div class="d-flex align-items-center gap-3 mb-4"><div class="edge-deploy-icon"><i class="bi bi-cloud-arrow-up"></i></div><div><h1 class="h3 mb-1">Fleet Deploy</h1><p class="text-secondary mb-0">Queue one exact Git commit across the Edge fleet.</p></div></div>
                    <label for="edge-deploy-sha" class="form-label fw-semibold">Commit SHA</label>
                    <div class="input-group"><input id="edge-deploy-sha" class="form-control font-monospace" data-sha-input minlength="7" maxlength="40" pattern="[0-9A-Fa-f]{7,40}" placeholder="7–40 hexadecimal characters"><button class="btn btn-primary" data-action="deploy"><i class="bi bi-cloud-arrow-up me-1"></i>Deploy</button></div>
                    <div class="form-text">Branch names are not accepted. The server records the normalized lowercase SHA.</div>
                    {{#outcome}}<div class="alert {{outcomeClass}} mt-4 mb-0">{{outcome}}</div>{{/outcome}}
                    <div class="border-top mt-4 pt-3 small text-secondary">This control queues an exact revision only; fleet progress remains in the incident stream.</div>
                  </div>
                </div>
              </div>`
        });
        this.outcome = '';
        this.outcomeClass = 'alert-info';
        this._deploying = false;
    }

    async onActionDeploy() {
        const app = this.getApp();
        if (this._deploying || !app?.activeUser?.hasPermission?.('sys.manage_deploy')) return true;
        let sha;
        try { sha = normalizeDeploySha(this.element?.querySelector('[data-sha-input]')?.value); }
        catch (error) { Modal.showError(error.message); return true; }
        const confirmed = await app.confirm({
            title: 'Deploy exact revision', message: `Queue exact commit ${sha} across the Edge fleet?`,
            confirmLabel: 'Queue deploy', confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;
        this._deploying = true;
        app.showLoading?.();
        try {
            const verdict = await requestFleetDeploy(sha);
            if (verdict.accepted) {
                this.outcome = verdict.queued
                    ? `Deploy queued for ${sha}.`
                    : `${sha} was recorded behind the deploy already in flight.`;
                this.outcomeClass = 'alert-success';
            } else {
                this.outcome = verdict.error;
                this.outcomeClass = 'alert-danger';
            }
            await this.render();
        } finally {
            this._deploying = false;
            app.hideLoading?.();
        }
        return true;
    }
}

export default EdgeDeployPage;
