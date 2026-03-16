/**
 * CloudWatchChart - MetricsChart configured for CloudWatch endpoints
 *
 * Extends MetricsChart with:
 * - CloudWatch endpoint defaults (/api/aws/cloudwatch/fetch)
 * - `stat` parameter support (avg, max, min, sum)
 * - Response format normalization (periods → labels, {slug,values} → {slug: values})
 *
 * NOTE: The CloudWatch API currently returns a slightly different format
 * than the standard metrics API (periods vs labels, array vs dict).
 * processMetricsData normalizes this until the backend aligns.
 */
import MetricsChart from '@ext/charts/MetricsChart.js';

export default class CloudWatchChart extends MetricsChart {
    constructor(options = {}) {
        super({
            endpoint: '/api/aws/cloudwatch/fetch',
            account: options.resourceType || options.account || 'ec2',
            category: options.category || null,
            slugs: options.slugs || (options.slug ? [options.slug] : null),
            granularity: options.granularity || 'hours',
            title: options.title || 'CloudWatch',
            defaultDateRange: options.defaultDateRange || '24h',
            showDateRange: false,
            ...options
        });

        this.stat = options.stat || 'avg';
        this.resourceType = options.resourceType || options.account || 'ec2';
    }

    buildApiParams() {
        const params = super.buildApiParams();
        // CloudWatch uses 'stat' parameter
        params.stat = this.stat;
        return params;
    }

    setStat(stat) {
        this.stat = stat;
        return this.fetchData();
    }
}
