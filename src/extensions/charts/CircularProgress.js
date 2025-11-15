/**
 * CircularProgress - Modern circular progress indicator component
 * Supports single/multi-segment progress, animations, gradients, and tooltips
 * Uses SVG for crisp rendering at any size
 */

import View from '@core/View.js';
import dataFormatter from '@core/utils/DataFormatter.js';

export default class CircularProgress extends View {
  constructor(options = {}) {
    super({
      className: `circular-progress ${options.className || ''}`,
      ...options
    });

    // Size presets
    this.SIZE_PRESETS = {
      'xs': 40,
      'sm': 60,
      'md': 80,
      'lg': 120,
      'xl': 180
    };

    // Stroke width presets (auto-calculated based on size)
    this.STROKE_PRESETS = {
      'xs': 4,
      'sm': 6,
      'md': 8,
      'lg': 12,
      'xl': 16
    };

    // Core configuration
    this.value = options.value !== undefined ? options.value : 0;
    this.min = options.min !== undefined ? options.min : 0;
    this.max = options.max !== undefined ? options.max : 100;

    // Dimensions
    this.sizePreset = (typeof options.size === 'string' && this.SIZE_PRESETS[options.size]) ? options.size : null;
    this.size = this.resolveSize(options.size !== undefined ? options.size : 'md');
    this.strokeWidth = options.strokeWidth === 'auto' || options.strokeWidth === undefined
      ? this.getAutoStrokeWidth(options.size)
      : options.strokeWidth;

    // Colors & Styling
    this.theme = options.theme || 'basic'; // 'basic', '3d', 'dark', 'light'
    this.variant = options.variant || 'default';
    this.color = options.color; // Will be set by applyVariant if not provided
    this.trackColor = options.trackColor; // Will be set by applyTheme if not provided
    this.textColor = options.textColor; // Custom text color
    this.gradientColors = options.gradientColors || null;

    // Apply theme (sets colors based on theme)
    this.applyTheme();
    
    // Apply variant colors (sets this.color if not provided)
    this.applyVariant();

    // Arc configuration
    this.rotation = options.rotation !== undefined ? options.rotation : -90; // Start at top
    this.gap = options.gap || 0; // Gap in degrees (0 = full circle)

    // Center content
    this.showValue = options.showValue !== false;
    this.valueFormat = options.valueFormat || 'percentage';
    this.valueFormatter = options.valueFormatter || null;
    this.label = options.label || null;
    this.labelHtml = options.labelHtml || null;
    this.icon = options.icon || null;

    // Animation
    this.animate = options.animate !== false;
    this.animationDuration = options.animationDuration || 600;
    this.animationEasing = options.animationEasing || 'ease-out';

    // Visual options
    this.rounded = options.rounded !== false;
    this.shadow = options.shadow || false;

    // Interaction
    this.clickable = options.clickable || false;
    this.tooltip = options.tooltip || null;
    this.tooltipPlacement = options.tooltipPlacement || 'top';

    // Multi-segment mode
    this.segments = options.segments || null;
    this.segmentGap = options.segmentGap || 2; // Gap between segments in degrees

    // DataFormatter instance
    this.dataFormatter = dataFormatter;

    // Internal state
    this.svg = null;
    this.centerElement = null;
    this.popover = null;
    this.gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
  }

  resolveSize(size) {
    if (typeof size === 'string' && this.SIZE_PRESETS[size]) {
      return this.SIZE_PRESETS[size];
    }
    return typeof size === 'number' ? size : this.SIZE_PRESETS.md;
  }

  getAutoStrokeWidth(size) {
    if (typeof size === 'string' && this.STROKE_PRESETS[size]) {
      return this.STROKE_PRESETS[size];
    }
    // Auto-calculate based on size
    const actualSize = this.resolveSize(size);
    if (actualSize <= 40) return 4;
    if (actualSize <= 60) return 6;
    if (actualSize <= 80) return 8;
    if (actualSize <= 120) return 12;
    return 16;
  }

  applyTheme() {
    const themes = {
      'basic': {
        trackColor: '#e9ecef',
        textColor: null, // Use default
        backgroundColor: null
      },
      'shadowed': {
        trackColor: '#d1d5db',
        textColor: null,
        backgroundColor: null,
        shadow: true
      },
      'dark': {
        trackColor: '#374151',
        textColor: '#e5e7eb',
        backgroundColor: '#1f2937'
      },
      'light': {
        trackColor: '#f3f4f6',
        textColor: '#111827',
        backgroundColor: '#ffffff'
      }
    };

    const themeConfig = themes[this.theme] || themes.basic;
    
    // Apply theme defaults if not explicitly set
    if (!this.trackColor) {
      this.trackColor = themeConfig.trackColor;
    }
    if (!this.textColor && themeConfig.textColor) {
      this.textColor = themeConfig.textColor;
    }
    if (themeConfig.shadow && this.shadow === false) {
      this.shadow = themeConfig.shadow;
    }
  }

  applyVariant() {
    const variants = {
      'success': { color: '#198754', trackColor: 'rgba(25, 135, 84, 0.1)' },
      'danger': { color: '#dc3545', trackColor: 'rgba(220, 53, 69, 0.1)' },
      'warning': { color: '#ffc107', trackColor: 'rgba(255, 193, 7, 0.1)' },
      'info': { color: '#0dcaf0', trackColor: 'rgba(13, 202, 240, 0.1)' },
      'default': { color: '#0d6efd' } // Default blue color
    };

    if (variants[this.variant]) {
      const variantColors = variants[this.variant];
      if (!this.color) {
        this.color = variantColors.color;
      }
      if (variantColors.trackColor && this.trackColor === this.applyTheme.trackColor) {
        this.trackColor = variantColors.trackColor;
      }
    }
    
    // Fallback if no color is set
    if (!this.color) {
      this.color = '#0d6efd';
    }
  }

  getTemplate() {
    const sizeClass = this.sizePreset ? `circular-progress-${this.sizePreset}` : '';
    const variantClass = this.variant !== 'default' ? `circular-progress-${this.variant}` : '';
    const themeClass = this.theme !== 'basic' ? `circular-progress-theme-${this.theme}` : '';
    const clickableClass = this.clickable ? 'circular-progress-clickable' : '';
    const shadowClass = this.shadow ? 'circular-progress-shadow' : '';
    
    const textColorStyle = this.textColor ? `color: ${this.textColor};` : '';

    return `
      <div class="circular-progress-container ${sizeClass} ${variantClass} ${themeClass} ${clickableClass} ${shadowClass}"
           style="width: ${this.size}px; height: ${this.size}px;">
        <svg class="circular-progress-svg" 
             width="${this.size}" 
             height="${this.size}"
             viewBox="0 0 ${this.size} ${this.size}">
        </svg>
        <div class="circular-progress-center" style="${textColorStyle}">
          <div class="circular-progress-content"></div>
        </div>
      </div>
    `;
  }

  async onAfterRender() {
    this.svg = this.element.querySelector('.circular-progress-svg');
    this.centerElement = this.element.querySelector('.circular-progress-content');
    this.containerElement = this.element.querySelector('.circular-progress-container');

    // Render the progress circle
    this.renderProgress();

    // Render center content
    this.renderCenterContent();

    // Setup interactions
    if (this.clickable) {
      this.setupClickHandler();
    }

    // Setup tooltip
    if (this.tooltip && this.clickable) {
      this.setupTooltip();
    }
  }

  renderProgress() {
    if (!this.svg) return;

    // Clear previous content
    this.svg.innerHTML = '';

    const center = this.size / 2;
    const radius = (this.size - this.strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Create gradient definition if needed
    if (this.gradientColors && this.gradientColors.length > 1) {
      this.createGradient();
    }

    // Determine if we're using segments or single progress
    if (this.segments && Array.isArray(this.segments) && this.segments.length > 0) {
      this.renderSegments(center, radius, circumference);
    } else {
      this.renderSingleProgress(center, radius, circumference);
    }
  }

  renderSingleProgress(center, radius, circumference) {
    // Calculate arc length
    const arcLength = this.gap > 0 ? (360 - this.gap) : 360;
    const arcCircumference = (arcLength / 360) * circumference;

    // Create track (background circle/arc)
    const track = this.createCircle(center, radius, {
      stroke: this.trackColor,
      strokeWidth: this.strokeWidth,
      fill: 'none',
      strokeLinecap: this.rounded ? 'round' : 'butt',
      strokeDasharray: this.gap > 0 ? `${arcCircumference} ${circumference}` : 'none',
      transform: `rotate(${this.rotation} ${center} ${center})`
    });
    this.svg.appendChild(track);

    // Create progress circle
    const percentage = this.getPercentage();
    const progressLength = (percentage / 100) * arcCircumference;
    const dashOffset = arcCircumference - progressLength;

    const strokeColor = this.gradientColors ? `url(#${this.gradientId})` : this.color;

    const progress = this.createCircle(center, radius, {
      stroke: strokeColor,
      strokeWidth: this.strokeWidth,
      fill: 'none',
      strokeLinecap: this.rounded ? 'round' : 'butt',
      strokeDasharray: `${arcCircumference} ${circumference}`,
      strokeDashoffset: this.animate ? arcCircumference : dashOffset,
      transform: `rotate(${this.rotation} ${center} ${center})`,
      class: 'circular-progress-bar'
    });

    this.svg.appendChild(progress);

    // Apply animation
    if (this.animate) {
      this.animateProgress(progress, dashOffset);
    }
  }

  renderSegments(center, radius, circumference) {
    // Calculate arc length
    const arcLength = this.gap > 0 ? (360 - this.gap) : 360;
    const arcCircumference = (arcLength / 360) * circumference;

    // Create track
    const track = this.createCircle(center, radius, {
      stroke: this.trackColor,
      strokeWidth: this.strokeWidth,
      fill: 'none',
      strokeLinecap: this.rounded ? 'round' : 'butt',
      strokeDasharray: this.gap > 0 ? `${arcCircumference} ${circumference}` : 'none',
      transform: `rotate(${this.rotation} ${center} ${center})`
    });
    this.svg.appendChild(track);

    // Validate segments total
    const total = this.segments.reduce((sum, seg) => sum + (seg.value || 0), 0);
    if (total > this.max) {
      console.warn('CircularProgress: Segment total exceeds max value. Clamping to max.');
    }

    // Render each segment
    let currentOffset = 0;

    this.segments.forEach((segment, index) => {
      const segmentPercentage = ((segment.value || 0) / (this.max - this.min)) * 100;
      const segmentLength = (segmentPercentage / 100) * arcCircumference;

      // Gap between segments (in circumference units)
      const gapLength = (this.segmentGap / 360) * circumference;

      if (segmentLength > 0) {
        const segmentCircle = this.createCircle(center, radius, {
          stroke: segment.color || this.color,
          strokeWidth: this.strokeWidth,
          fill: 'none',
          strokeLinecap: this.rounded ? 'round' : 'butt',
          strokeDasharray: `${segmentLength} ${circumference}`,
          strokeDashoffset: this.animate ? arcCircumference : -(currentOffset),
          transform: `rotate(${this.rotation} ${center} ${center})`,
          class: `circular-progress-segment circular-progress-segment-${index}`,
          'data-segment-index': index
        });

        this.svg.appendChild(segmentCircle);

        // Apply animation
        if (this.animate) {
          this.animateProgress(segmentCircle, -(currentOffset), index * 100);
        }

        // Update offset for next segment
        currentOffset += segmentLength + gapLength;
      }
    });
  }

  createCircle(cx, cy, attributes = {}) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cx); // Use cx for cy since we pass center for both
    circle.setAttribute('r', cy); // cy parameter is actually the radius

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'strokeWidth') {
        circle.setAttribute('stroke-width', value);
      } else if (key === 'strokeLinecap') {
        circle.setAttribute('stroke-linecap', value);
      } else if (key === 'strokeDasharray') {
        circle.setAttribute('stroke-dasharray', value);
      } else if (key === 'strokeDashoffset') {
        circle.setAttribute('stroke-dashoffset', value);
      } else {
        circle.setAttribute(key, value);
      }
    });

    return circle;
  }

  createGradient() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', this.gradientId);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');

    this.gradientColors.forEach((color, index) => {
      const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      const offset = (index / (this.gradientColors.length - 1)) * 100;
      stop.setAttribute('offset', `${offset}%`);
      stop.setAttribute('stop-color', color);
      gradient.appendChild(stop);
    });

    defs.appendChild(gradient);
    this.svg.appendChild(defs);
  }

  animateProgress(circle, targetOffset, delay = 0) {
    setTimeout(() => {
      circle.style.transition = `stroke-dashoffset ${this.animationDuration}ms ${this.animationEasing}`;
      circle.style.strokeDashoffset = targetOffset;
    }, delay);
  }

  renderCenterContent() {
    if (!this.centerElement) return;

    // Priority: labelHtml > icon > value/label
    if (this.labelHtml) {
      this.centerElement.innerHTML = this.labelHtml;
    } else if (this.icon) {
      this.centerElement.innerHTML = `<i class="${this.icon}"></i>`;
    } else if (this.showValue) {
      const formattedValue = this.getFormattedValue();
      let html = `<div class="circular-progress-value">${formattedValue}</div>`;
      
      if (this.label) {
        html += `<div class="circular-progress-label">${this.label}</div>`;
      }

      this.centerElement.innerHTML = html;
    }
  }

  getFormattedValue() {
    const value = this.value;
    const min = this.min;
    const max = this.max;

    // Custom formatter function takes precedence
    if (this.valueFormatter && typeof this.valueFormatter === 'function') {
      return this.valueFormatter(value, min, max);
    }

    // Built-in formats
    switch (this.valueFormat) {
      case 'percentage':
        return `${Math.round(this.getPercentage())}%`;
      
      case 'fraction':
        return `${value}/${max}`;
      
      case 'value':
        return value.toString();
      
      default:
        // Try DataFormatter
        if (this.dataFormatter) {
          try {
            return this.dataFormatter.pipe(value, this.valueFormat);
          } catch (error) {
            console.warn('CircularProgress: DataFormatter error, falling back to percentage', error);
            return `${Math.round(this.getPercentage())}%`;
          }
        }
        return `${Math.round(this.getPercentage())}%`;
    }
  }

  getPercentage() {
    const range = this.max - this.min;
    if (range === 0) return 0;
    return ((this.value - this.min) / range) * 100;
  }

  setupClickHandler() {
    if (!this.containerElement) return;

    this.containerElement.style.cursor = 'pointer';
    
    this.containerElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const percentage = this.getPercentage();
      
      this.emit('progress:clicked', {
        value: this.value,
        percentage,
        min: this.min,
        max: this.max
      });

      // Toggle popover if tooltip is configured
      if (this.tooltip) {
        this.togglePopover();
      }
    });
  }

  setupTooltip() {
    // Bootstrap popover will be initialized on first click
    // We'll create the popover content dynamically
  }

  togglePopover() {
    if (!this.containerElement || typeof window.bootstrap === 'undefined') {
      console.warn('CircularProgress: Bootstrap is required for tooltip support');
      return;
    }

    // Get or create popover instance
    if (!this.popover) {
      const content = this.getTooltipContent();
      const title = typeof this.tooltip === 'object' && this.tooltip.title ? this.tooltip.title : undefined;

      // Build config object, omitting title if undefined
      const popoverConfig = {
        content: content,
        html: true,
        placement: this.tooltipPlacement,
        trigger: 'manual',
        container: 'body'
      };
      
      // Only add title if it exists
      if (title) {
        popoverConfig.title = title;
      }

      this.popover = new window.bootstrap.Popover(this.containerElement, popoverConfig);
    }

    // Toggle visibility
    const popoverElement = window.bootstrap.Popover.getInstance(this.containerElement);
    if (popoverElement && this.containerElement.getAttribute('aria-describedby')) {
      this.popover.hide();
    } else {
      // Update content before showing
      this.popover.setContent({
        '.popover-body': this.getTooltipContent()
      });
      this.popover.show();
    }
  }

  getTooltipContent() {
    if (typeof this.tooltip === 'function') {
      return this.tooltip(this.value, {
        min: this.min,
        max: this.max,
        percentage: this.getPercentage()
      });
    }

    if (typeof this.tooltip === 'object') {
      return this.tooltip.html || this.tooltip.content || '';
    }

    return this.tooltip || '';
  }

  // Public API

  setValue(value, animate = true) {
    const oldValue = this.value;
    this.value = Math.max(this.min, Math.min(this.max, value));
    
    // Update center content
    this.renderCenterContent();
    
    // Update progress without full re-render
    if (this.svg && !this.segments) {
      const progressBar = this.svg.querySelector('.circular-progress-bar');
      if (progressBar) {
        const radius = (this.size / 2) - (this.strokeWidth / 2);
        const circumference = 2 * Math.PI * radius;
        const arcLength = this.gap > 0 ? (360 - this.gap) : 360;
        const arcCircumference = (arcLength / 360) * circumference;
        const percentage = this.getPercentage();
        const progressLength = (percentage / 100) * arcCircumference;
        const dashOffset = arcCircumference - progressLength;
        
        if (animate) {
          // Animate from current offset to new offset
          progressBar.style.transition = `stroke-dashoffset ${this.animationDuration}ms ${this.animationEasing}`;
          progressBar.style.strokeDashoffset = dashOffset;
        } else {
          // Update immediately without animation
          progressBar.style.transition = 'none';
          progressBar.style.strokeDashoffset = dashOffset;
        }
      }
    } else {
      // For segments or if no existing progress bar, do full re-render
      const oldAnimate = this.animate;
      this.animate = animate;
      this.renderProgress();
      this.animate = oldAnimate;
    }
  }

  setRange(min, max) {
    this.min = min;
    this.max = max;
    this.renderProgress();
    this.renderCenterContent();
  }

  increment(amount = 1) {
    this.setValue(this.value + amount);
  }

  decrement(amount = 1) {
    this.setValue(this.value - amount);
  }

  setColor(color) {
    this.color = color;
    this.gradientColors = null; // Clear gradient
    
    // Update color without full re-render
    if (this.svg && !this.segments) {
      const progressBar = this.svg.querySelector('.circular-progress-bar');
      if (progressBar) {
        progressBar.setAttribute('stroke', color);
      }
    } else {
      // For segments, need to re-render
      this.renderProgress();
    }
  }

  setGradient(colors) {
    if (Array.isArray(colors) && colors.length > 1) {
      this.gradientColors = colors;
      this.gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
      this.renderProgress();
    }
  }

  setSize(size) {
    // Remove old size class if it exists
    if (this.containerElement && this.sizePreset) {
      this.containerElement.classList.remove(`circular-progress-${this.sizePreset}`);
    }
    
    // Update size preset if the new size is a preset string
    this.sizePreset = (typeof size === 'string' && this.SIZE_PRESETS[size]) ? size : null;
    this.size = this.resolveSize(size);
    this.strokeWidth = this.getAutoStrokeWidth(size);
    
    // Add new size class if it's a preset
    if (this.containerElement) {
      this.containerElement.style.width = `${this.size}px`;
      this.containerElement.style.height = `${this.size}px`;
      
      if (this.sizePreset) {
        this.containerElement.classList.add(`circular-progress-${this.sizePreset}`);
      }
    }
    
    if (this.svg) {
      this.svg.setAttribute('width', this.size);
      this.svg.setAttribute('height', this.size);
      this.svg.setAttribute('viewBox', `0 0 ${this.size} ${this.size}`);
    }
    
    this.renderProgress();
  }

  animateTo(targetValue, duration = 1000) {
    const startValue = this.value;
    const diff = targetValue - startValue;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out function
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const newValue = startValue + (diff * easeProgress);
      this.setValue(newValue, false);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.setValue(targetValue, false);
      }
    };

    requestAnimationFrame(animate);
  }

  pulse() {
    if (!this.containerElement) return;

    this.containerElement.style.animation = 'none';
    setTimeout(() => {
      this.containerElement.style.animation = 'circular-progress-pulse 0.5s ease-out';
    }, 10);

    setTimeout(() => {
      this.containerElement.style.animation = '';
    }, 500);
  }

  complete() {
    this.variant = 'success';
    this.applyVariant();
    this.setValue(this.max);
    this.pulse();
  }

  reset() {
    this.setValue(this.min);
  }

  hide() {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  show() {
    if (this.element) {
      this.element.style.display = '';
    }
  }

  getValue() {
    return this.value;
  }

  getPercentageValue() {
    return this.getPercentage();
  }

  async onBeforeDestroy() {
    // Clean up popover
    if (this.popover) {
      this.popover.dispose();
      this.popover = null;
    }

    await super.onBeforeDestroy();
  }
}
