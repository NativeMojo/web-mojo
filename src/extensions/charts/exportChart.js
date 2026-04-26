/**
 * exportChartPng — serialise a native SVG chart to a PNG download.
 *
 * Generic SVG-to-PNG; not chart-specific. Pass any View instance whose root
 * contains an <svg>, or pass an <svg>/HTMLElement directly.
 *
 * Usage:
 *   import { exportChartPng } from 'web-mojo/charts/exportChart';
 *   exportChartPng(myChart);                          // default filename
 *   exportChartPng(myChart, { filename: 'my.png' });
 */

export function exportChartPng(viewOrElement, { filename } = {}) {
    const root = viewOrElement?.element || viewOrElement;
    if (!root) {
        console.warn('exportChartPng: no element provided');
        return;
    }
    const svg = (root.tagName && root.tagName.toLowerCase() === 'svg')
        ? root
        : root.querySelector?.('svg');
    if (!svg) {
        console.warn('exportChartPng: no <svg> found in target');
        return;
    }

    const rect = svg.getBoundingClientRect();
    const vb = svg.getAttribute('viewBox')?.split(/\s+/).map(Number);
    const width  = (vb && vb.length === 4) ? vb[2] : Math.round(rect.width || 600);
    const height = (vb && vb.length === 4) ? vb[3] : Math.round(rect.height || 400);

    // Inline as a data URL (avoid CORS for cross-origin font/image refs).
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (!clone.getAttribute('width'))  clone.setAttribute('width', width);
    if (!clone.getAttribute('height')) clone.setAttribute('height', height);

    const xml = new XMLSerializer().serializeToString(clone);
    const svg64 = typeof btoa === 'function'
        ? btoa(unescape(encodeURIComponent(xml)))
        : Buffer.from(xml, 'utf-8').toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${svg64}`;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // White backdrop so transparent SVGs render on light pages.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);

        const png = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = png;
        a.download = filename || `chart-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };
    img.onerror = (err) => {
        console.error('exportChartPng: image load failed', err);
    };
    img.src = dataUrl;
}

export default exportChartPng;
