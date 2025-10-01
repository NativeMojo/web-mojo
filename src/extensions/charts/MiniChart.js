/**
 * MiniChart - Lightweight sparkline chart component
 * Renders simple line or bar charts with minimal configuration
 * Uses SVG for crisp rendering at any size
 */

import View from '@core/View.js';
import dataFormatter from '@core/utils/DataFormatter.js';

export default class MiniChart extends View {
  constructor(options = {}) {
    super({
      className: 'mini-chart',
      ...options
    });

    // Chart type: 'line' or 'bar'
    this.chartType = options.chartType || 'line';

    // Data
    this.data = options.data || [];

    // Dimensions
    this.width = options.width || '100%'; // Support both number and '100%'
    this.height = options.height || 30;
    this.maintainAspectRatio = options.maintainAspectRatio || false;

    // Styling
    this.color = options.color || 'rgba(54, 162, 235, 1)'; // Primary blue
    this.fillColor = options.fillColor || 'rgba(54, 162, 235, 0.1)'; // Light fill
    this.strokeWidth = options.strokeWidth || 2;
    this.barGap = options.barGap || 2;

    // Fill area under line
    this.fill = options.fill !== false; // Default true

    // Curve smoothing (0 = straight lines, 1 = very smooth)
    this.smoothing = options.smoothing || 0.3;

    // Padding
    this.padding = options.padding || 2;

    // Min/Max values (auto-calculated if not provided)
    this.minValue = options.minValue;
    this.maxValue = options.maxValue;

    // Show dots on line chart
    this.showDots = options.showDots || false;
    this.dotRadius = options.dotRadius || 2;

    // Animation
    this.animate = options.animate !== false;
    this.animationDuration = options.animationDuration || 300;

    // Tooltip
    this.showTooltip = options.showTooltip !== false;
    this.tooltipFormatter = options.tooltipFormatter || null;
    this.tooltipTemplate = options.tooltipTemplate || null; // Function returning HTML
    this.valueFormat = options.valueFormat || null; // DataFormatter string
    this.labelFormat = options.labelFormat || null; // DataFormatter string for labels

    // Crosshair
    this.showCrosshair = options.showCrosshair !== false;
    this.crosshairColor = options.crosshairColor || 'rgba(0, 0, 0, 0.2)';
    this.crosshairWidth = options.crosshairWidth || 1;

    // X-axis
    this.showXAxis = options.showXAxis || false;
    this.xAxisColor = options.xAxisColor || this.color;
    this.xAxisWidth = options.xAxisWidth || 1;
    this.xAxisDashed = options.xAxisDashed !== false;

    // Tooltip state
    this.tooltip = null;
    this.crosshair = null;
    this.hoveredIndex = -1;

    // DataFormatter instance
    this.dataFormatter = dataFormatter;

    // Labels array (can be set externally or from API)
    this.labels = options.labels || null;
  }

  getTemplate() {
    const widthStyle = typeof this.width === 'number' ? `${this.width}px` : this.width;
    const heightStyle = typeof this.height === 'number' ? `${this.height}px` : this.height;
    const preserveAspectRatio = this.maintainAspectRatio ? 'xMidYMid meet' : 'none';

    return `
      <div class="mini-chart-wrapper" style="position: relative; display: block; width: ${widthStyle}; height: ${heightStyle};">
        <svg
          class="mini-chart-svg"
          width="100%"
          height="100%"
          viewBox="0 0 100 ${this.height}"
          preserveAspectRatio="${preserveAspectRatio}"
          style="display: block;">
        </svg>
        ${this.showTooltip ? '<div class="mini-chart-tooltip" style="display: none;"></div>' : ''}
      </div>
    `;
  }

  async onAfterRender() {
    this.svg = this.element.querySelector('.mini-chart-svg');
    this.tooltip = this.element.querySelector('.mini-chart-tooltip');

    // Get actual rendered dimensions
    this.updateDimensions();

    if (this.data && this.data.length > 0) {
      this.renderChart();
    }

    // Setup hover interactions if tooltip enabled
    if (this.showTooltip && this.svg) {
      this.setupTooltip();
    }

    // Setup resize observer for responsive behavior
    this.setupResizeObserver();
  }

  updateDimensions() {
    if (!this.svg) return;

    const rect = this.svg.getBoundingClientRect();
    this.actualWidth = rect.width || 100;
    this.actualHeight = rect.height || this.height;

    // Update viewBox to match aspect ratio
    this.svg.setAttribute('viewBox', `0 0 ${this.actualWidth} ${this.actualHeight}`);
  }

  setupResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      this.updateDimensions();
      if (this.data && this.data.length > 0) {
        this.renderChart();
      }
    });

    if (this.svg) {
      this.resizeObserver.observe(this.svg);
    }
  }

  renderChart() {
    if (!this.svg || !this.data || this.data.length === 0) return;

    // Clear previous content
    this.svg.innerHTML = '';

    // Calculate bounds
    const { min, max } = this.calculateBounds();

    // Add x-axis line if enabled (render first so it's behind chart)
    if (this.showXAxis) {
      this.renderXAxis(min, max);
    }

    if (this.chartType === 'line') {
      this.renderLine(min, max);
    } else if (this.chartType === 'bar') {
      this.renderBar(min, max);
    }

    // Add crosshair line (initially hidden)
    if (this.showCrosshair) {
      const height = this.getActualHeight();
      this.crosshair = this.createSVGElement('line', {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: height,
        stroke: this.crosshairColor,
        'stroke-width': this.crosshairWidth,
        'stroke-dasharray': '3,3',
        style: 'display: none; pointer-events: none;'
      });
      this.svg.appendChild(this.crosshair);
    }

    // Setup tooltip hit areas after rendering chart
    if (this.showTooltip && this.tooltip) {
      this.setupTooltip();
    }

    // Apply animation if enabled
    if (this.animate) {
      this.applyAnimation();
    }
  }

  renderXAxis(min, max) {
    const width = this.getActualWidth();
    const height = this.getActualHeight();

    // Calculate y position for x-axis (at zero if data crosses zero, otherwise at bottom)
    let yPos;
    if (min <= 0 && max >= 0) {
      // Data crosses zero, place axis at zero
      const range = max - min;
      const yScale = (height - this.padding * 2) / range;
      yPos = height - this.padding - ((0 - min) * yScale);
    } else {
      // Place at bottom
      yPos = height - this.padding;
    }

    const xAxis = this.createSVGElement('line', {
      x1: this.padding,
      y1: yPos,
      x2: width - this.padding,
      y2: yPos,
      stroke: this.xAxisColor,
      'stroke-width': this.xAxisWidth,
      'stroke-dasharray': this.xAxisDashed ? '2,2' : 'none',
      'stroke-opacity': '0.5'
    });

    this.svg.appendChild(xAxis);
  }

  calculateBounds() {
    const values = this.data.map(d => typeof d === 'object' ? d.value : d);

    let min = this.minValue !== undefined ? this.minValue : Math.min(...values);
    let max = this.maxValue !== undefined ? this.maxValue : Math.max(...values);

    // Add padding to range
    const range = max - min;
    if (range === 0) {
      min = min - 1;
      max = max + 1;
    }

    return { min, max };
  }

  getActualWidth() {
    return this.actualWidth || this.width || 100;
  }

  getActualHeight() {
    return this.actualHeight || this.height || 30;
  }

  renderLine(min, max) {
    const values = this.data.map(d => typeof d === 'object' ? d.value : d);
    const points = this.calculatePoints(values, min, max);

    // Create filled area under line
    if (this.fill) {
      const areaPath = this.createAreaPath(points);
      const area = this.createSVGElement('path', {
        d: areaPath,
        fill: this.fillColor,
        stroke: 'none'
      });
      this.svg.appendChild(area);
    }

    // Create line path
    const linePath = this.smoothing > 0
      ? this.createSmoothPath(points)
      : this.createLinePath(points);

    const line = this.createSVGElement('path', {
      d: linePath,
      fill: 'none',
      stroke: this.color,
      'stroke-width': this.strokeWidth,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    });
    this.svg.appendChild(line);

    // Add dots if enabled
    if (this.showDots) {
      points.forEach(point => {
        const dot = this.createSVGElement('circle', {
          cx: point.x,
          cy: point.y,
          r: this.dotRadius,
          fill: this.color
        });
        this.svg.appendChild(dot);
      });
    }
  }

  renderBar(min, max) {
    const values = this.data.map(d => typeof d === 'object' ? d.value : d);
    const points = this.calculatePoints(values, min, max);

    const width = this.getActualWidth();
    const height = this.getActualHeight();
    const barWidth = (width - this.padding * 2 - (this.barGap * (values.length - 1))) / values.length;

    points.forEach((point, index) => {
      const barHeight = height - this.padding * 2 - point.y + this.padding;
      const x = point.x - barWidth / 2;
      const y = point.y;

      const bar = this.createSVGElement('rect', {
        x: x,
        y: y,
        width: barWidth,
        height: barHeight,
        fill: this.color,
        rx: 1, // Slight rounding
        'data-bar-index': index,
        class: 'mini-chart-bar'
      });
      this.svg.appendChild(bar);
    });
  }

  calculatePoints(values, min, max) {
    const range = max - min;
    const width = this.getActualWidth();
    const height = this.getActualHeight();
    const xStep = (width - this.padding * 2) / (values.length - 1 || 1);
    const yScale = (height - this.padding * 2) / range;

    return values.map((value, index) => ({
      x: this.padding + (index * xStep),
      y: height - this.padding - ((value - min) * yScale)
    }));
  }

  createLinePath(points) {
    if (points.length === 0) return '';

    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x},${points[i].y}`;
    }
    return path;
  }

  createSmoothPath(points) {
    if (points.length < 2) return this.createLinePath(points);

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      // Calculate control points for cubic bezier curve
      const cp1x = current.x + (next.x - current.x) * this.smoothing;
      const cp1y = current.y;
      const cp2x = next.x - (next.x - current.x) * this.smoothing;
      const cp2y = next.y;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }

    return path;
  }

  createAreaPath(points) {
    if (points.length === 0) return '';

    const linePath = this.smoothing > 0
      ? this.createSmoothPath(points)
      : this.createLinePath(points);

    // Close the path along the bottom
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const height = this.getActualHeight();

    return `${linePath} L ${lastPoint.x},${height - this.padding} L ${firstPoint.x},${height - this.padding} Z`;
  }

  createSVGElement(tag, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  }

  applyAnimation() {
    const paths = this.svg.querySelectorAll('path');
    paths.forEach(path => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
      path.style.animation = `mini-chart-draw ${this.animationDuration}ms ease-out forwards`;
    });

    const bars = this.svg.querySelectorAll('rect');
    bars.forEach((bar, index) => {
      bar.style.transformOrigin = 'bottom';
      bar.style.animation = `mini-chart-bar-grow ${this.animationDuration}ms ease-out ${index * 20}ms forwards`;
      bar.style.transform = 'scaleY(0)';
    });
  }

  setupTooltip() {
    if (!this.svg || !this.tooltip) return;

    // Create invisible overlay rects for hover detection
    const values = this.data.map(d => typeof d === 'object' ? d.value : d);
    const points = this.calculatePoints(values, ...Object.values(this.calculateBounds()));

    const width = this.getActualWidth();
    const height = this.getActualHeight();
    const barWidth = width / values.length;

    points.forEach((point, index) => {
      const hitArea = this.createSVGElement('rect', {
        x: index * barWidth,
        y: 0,
        width: barWidth,
        height: height,
        fill: 'transparent',
        style: 'cursor: pointer;'
      });

      hitArea.addEventListener('mouseenter', (e) => {
        this.showTooltipAtIndex(index, e);
      });

      hitArea.addEventListener('mousemove', (e) => {
        this.updateTooltipPosition(e);
      });

      hitArea.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });

      this.svg.appendChild(hitArea);
    });
  }

  showTooltipAtIndex(index, event) {
    if (!this.tooltip) return;

    this.hoveredIndex = index;
    const value = typeof this.data[index] === 'object' ? this.data[index].value : this.data[index];
    const dataLabel = typeof this.data[index] === 'object' ? this.data[index].label : null;
    const label = this.labels ? this.labels[index] : dataLabel;

    // Build tooltip content using priority system
    let content;

    if (this.tooltipTemplate && typeof this.tooltipTemplate === 'function') {
      // 1. Custom template function (highest priority)
      content = this.tooltipTemplate({ value, label, index, data: this.data[index] });
    } else {
      // 2. Format value with DataFormatter or custom formatter
      let displayValue = value;

      if (this.valueFormat && this.dataFormatter) {
        // Use DataFormatter with format string
        displayValue = this.dataFormatter.pipe(value, this.valueFormat);
      } else if (this.tooltipFormatter && typeof this.tooltipFormatter === 'function') {
        // Use custom formatter function
        displayValue = this.tooltipFormatter(value, index);
      } else {
        // Default formatting
        displayValue = typeof value === 'number' ? value.toLocaleString() : value;
      }

      // Format label if formatter provided
      let displayLabel = label;
      if (label && this.labelFormat && this.dataFormatter) {
        displayLabel = this.dataFormatter.pipe(label, this.labelFormat);
      }

      // Build default tooltip HTML
      content = `<strong>${displayValue}</strong>`;
      if (displayLabel) {
        content = `<div class="mini-chart-tooltip-label">${displayLabel}</div>${content}`;
      }
    }

    this.tooltip.innerHTML = content;
    this.tooltip.style.display = 'block';
    this.updateTooltipPosition(event);

    // Highlight bar if in bar chart mode
    if (this.chartType === 'bar') {
      this.highlightBar(index);
    }

    // Show crosshair at the hovered position
    if (this.crosshair && this.showCrosshair) {
      const width = this.getActualWidth();
      const barWidth = width / this.data.length;
      const x = (index * barWidth) + (barWidth / 2);
      this.crosshair.setAttribute('x1', x);
      this.crosshair.setAttribute('x2', x);
      this.crosshair.style.display = 'block';
    }
  }

  updateTooltipPosition(event) {
    if (!this.tooltip || this.tooltip.style.display === 'none') return;

    const rect = this.svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Position tooltip above cursor
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y - 10}px`;
    this.tooltip.style.transform = 'translate(-50%, -100%)';
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
      this.hoveredIndex = -1;
    }

    // Remove bar highlight
    if (this.chartType === 'bar') {
      this.unhighlightBars();
    }

    // Hide crosshair
    if (this.crosshair) {
      this.crosshair.style.display = 'none';
    }
  }

  highlightBar(index) {
    if (!this.svg) return;

    // Remove previous highlights
    this.unhighlightBars();

    // Highlight the hovered bar
    const bar = this.svg.querySelector(`rect.mini-chart-bar[data-bar-index="${index}"]`);
    if (bar) {
      bar.style.opacity = '0.7';
    }
  }

  unhighlightBars() {
    if (!this.svg) return;

    const bars = this.svg.querySelectorAll('rect.mini-chart-bar');
    bars.forEach(bar => {
      bar.style.opacity = '1';
    });
  }

  // Public API
  setData(data) {
    this.data = data;
    if (this.svg) {
      this.renderChart();
    }
  }

  setColor(color) {
    this.color = color;
    if (this.svg) {
      this.renderChart();
    }
  }

  setType(type) {
    if (['line', 'bar'].includes(type)) {
      this.chartType = type;
      if (this.svg) {
        this.renderChart();
      }
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.updateDimensions();
    if (this.svg) {
      this.renderChart();
    }
  }

  async onBeforeDestroy() {
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    await super.onBeforeDestroy();
  }
}
