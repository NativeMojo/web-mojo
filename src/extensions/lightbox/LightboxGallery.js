/**
 * LightboxGallery - Simple fullscreen image gallery
 * Clean, minimal lightbox for viewing single images or galleries
 */

import View from '@core/View.js';

export default class LightboxGallery extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: `lightbox-gallery ${options.className || ''}`,
      tagName: 'div'
    });

    // Handle single image or array of images and normalize to objects
    const rawImages = Array.isArray(options.images) ? options.images : [options.images || options.src].filter(Boolean);
    this.images = rawImages.map(img => {
      if (typeof img === 'string') {
        return { src: img, alt: '' };
      }
      return { src: img.src, alt: img.alt || '' };
    });
    this.currentIndex = options.startIndex || 0;
    this.showNavigation = options.showNavigation !== false && this.images.length > 1;
    this.showCounter = options.showCounter !== false && this.images.length > 1;
    this.allowKeyboard = options.allowKeyboard !== false;
    this.closeOnBackdrop = options.closeOnBackdrop !== false;
    this.fitToScreen = options.fitToScreen !== false; // Start in fit-to-screen mode

    // Bind keyboard handler for cleanup
    this._keyboardHandler = this.handleKeyboard.bind(this);

    // Set template properties directly on view instance
    this.updateTemplateProperties();
  }

  updateTemplateProperties() {
    this.currentImage = this.images[this.currentIndex] || { src: '', alt: '' };
    this.currentNumber = this.currentIndex + 1;
    this.total = this.images.length;
    this.isFirst = this.currentIndex === 0;
    this.isLast = this.currentIndex === this.images.length - 1;
    this.imageStyle = this.fitToScreen
      ? 'width: 90vw; max-height: 100%; object-fit: contain; user-select: none; cursor: zoom-in;'
      : 'max-width: none; max-height: none; user-select: none; cursor: zoom-out;';
    this.containerStyle = this.fitToScreen
      ? ''
      : 'overflow: auto;';
    this.modeIndicator = this.fitToScreen ? 'Fit to Screen' : 'Original Size';
  }

  async getTemplate() {
    const currentImage = this.images[this.currentIndex];
    const hasMultiple = this.images.length > 1;

    return `
      <div class="lightbox-overlay position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
           style="background: rgba(0,0,0,0.9); z-index: 9999;"
           data-action="backdrop-click">

        <!-- Close button -->
        <button type="button" class="btn-close btn-close-white position-absolute top-0 end-0 m-4"
                data-action="close"
                style="z-index: 10001;"
                title="Close"></button>

        <!-- Counter -->
        {{#showCounter}}
        <div class="lightbox-counter position-absolute top-0 start-50 translate-middle-x mt-4 text-white"
             style="z-index: 10001; font-size: 1.1rem;">
          {{currentNumber}} of {{total}}
        </div>
        {{/showCounter}}

        <!-- Mode Indicator -->
        <div class="lightbox-mode-indicator position-absolute bottom-0 start-50 translate-middle-x mb-4 text-white bg-dark bg-opacity-75 px-3 py-2 rounded"
             style="z-index: 10001; font-size: 0.9rem;">
          {{modeIndicator}} • Click image to toggle
        </div>

        <!-- Navigation -->
        {{#showNavigation}}
        <button type="button" class="btn btn-light btn-lg position-absolute start-0 top-50 translate-middle-y ms-4"
                data-action="prev"
                style="z-index: 10001;"
                title="Previous"
                {{#isFirst}}disabled{{/isFirst}}>
          <i class="bi bi-chevron-left"></i>
        </button>

        <button type="button" class="btn btn-light btn-lg position-absolute end-0 top-50 translate-middle-y me-4"
                data-action="next"
                style="z-index: 10001;"
                title="Next"
                {{#isLast}}disabled{{/isLast}}>
          <i class="bi bi-chevron-right"></i>
        </button>
        {{/showNavigation}}

        <!-- Image container -->
        <div class="lightbox-image-container w-100 h-100 d-flex align-items-center justify-content-center p-5"
             style="{{containerStyle}}">
          {{#currentImage}}
          <img src="{{src}}"
               alt="{{alt}}"
               class="lightbox-image img-fluid"
               style="{{imageStyle}}"
               data-action="image-click">
          {{/currentImage}}
        </div>

        <!-- Loading spinner -->
        <div class="lightbox-loading position-absolute top-50 start-50 translate-middle text-white"
             style="display: none;">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    `;
  }



  async onAfterRender() {
    // Add to body for fullscreen
    document.body.appendChild(this.element);
    document.body.style.overflow = 'hidden';

    // Set up keyboard navigation
    if (this.allowKeyboard) {
      document.addEventListener('keydown', this._keyboardHandler);
    }

    // Preload next/previous images
    this.preloadAdjacentImages();
  }

  // Action handlers
  async handleActionClose() {
    this.close();
  }

  async handleActionBackdropClick(e) {
    // Only close if clicked on backdrop, not image
    if (this.closeOnBackdrop && e.target === e.currentTarget) {
      this.close();
    }
  }

  async handleActionPrev() {
    this.showPrevious();
  }

  async handleActionNext() {
    this.showNext();
  }

  async handleActionImageClick() {
    this.toggleImageMode();
  }

  // Navigation methods
  showPrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateImage();
      this.preloadAdjacentImages();
    }
  }

  showNext() {
    if (this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
      this.updateImage();
      this.preloadAdjacentImages();
    }
  }

  goToImage(index) {
    if (index >= 0 && index < this.images.length && index !== this.currentIndex) {
      this.currentIndex = index;
      this.updateImage();
      this.preloadAdjacentImages();
    }
  }

  // Update image without full re-render
  async updateImage() {
    const currentImage = this.images[this.currentIndex];
    const imgElement = this.element.querySelector('.lightbox-image');
    const counterElement = this.element.querySelector('.lightbox-counter');
    const prevBtn = this.element.querySelector('[data-action="prev"]');
    const nextBtn = this.element.querySelector('[data-action="next"]');

    if (imgElement) {
      // Show loading
      this.showLoading();

      // Update image
      imgElement.src = currentImage.src;
      imgElement.alt = currentImage.alt;

      // Wait for image to load
      await this.waitForImageLoad(imgElement);

      // Hide loading
      this.hideLoading();
    }

    // Update counter
    if (counterElement) {
      counterElement.textContent = `${this.currentIndex + 1} of ${this.images.length}`;
    }

    // Update navigation buttons
    if (prevBtn) {
      prevBtn.disabled = this.currentIndex === 0;
    }
    if (nextBtn) {
      nextBtn.disabled = this.currentIndex === this.images.length - 1;
    }

    // Update template properties
    this.updateTemplateProperties();

    // Update image display mode
    this.updateImageDisplay();

    // Emit event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('lightbox:image-changed', {
        gallery: this,
        index: this.currentIndex,
        image: currentImage
      });
    }
  }

  showLoading() {
    const loading = this.element.querySelector('.lightbox-loading');
    if (loading) {
      loading.style.display = 'block';
    }
  }

  hideLoading() {
    const loading = this.element.querySelector('.lightbox-loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  waitForImageLoad(imgElement) {
    return new Promise((resolve) => {
      if (imgElement.complete) {
        resolve();
      } else {
        imgElement.onload = resolve;
        imgElement.onerror = resolve; // Still resolve on error
      }
    });
  }

  // Preload adjacent images for smooth navigation
  preloadAdjacentImages() {
    const preloadIndexes = [];

    // Previous image
    if (this.currentIndex > 0) {
      preloadIndexes.push(this.currentIndex - 1);
    }

    // Next image
    if (this.currentIndex < this.images.length - 1) {
      preloadIndexes.push(this.currentIndex + 1);
    }

    preloadIndexes.forEach(index => {
      const image = this.images[index];

      // Create image element to trigger browser caching
      const preloadImg = new Image();
      preloadImg.src = image.src;
    });
  }

  // Keyboard navigation
  handleKeyboard(e) {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.showPrevious();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.showNext();
        break;
      case 'Home':
        e.preventDefault();
        this.goToImage(0);
        break;
      case 'End':
        e.preventDefault();
        this.goToImage(this.images.length - 1);
        break;
    }
  }

  // Toggle between fit-to-screen and original size
  toggleImageMode() {
    this.fitToScreen = !this.fitToScreen;
    this.updateTemplateProperties();
    this.updateImageDisplay();

    // Emit mode change event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('lightbox:mode-changed', {
        gallery: this,
        fitToScreen: this.fitToScreen
      });
    }
  }

  // Update image display without full re-render
  updateImageDisplay() {
    const imgElement = this.element.querySelector('.lightbox-image');
    const containerElement = this.element.querySelector('.lightbox-image-container');
    const indicatorElement = this.element.querySelector('.lightbox-mode-indicator');

    if (imgElement) {
      if (this.fitToScreen) {
        imgElement.style.maxWidth = '100%';
        imgElement.style.maxHeight = '100%';
        imgElement.style.objectFit = 'contain';
        imgElement.style.cursor = 'zoom-in';
      } else {
        imgElement.style.maxWidth = 'none';
        imgElement.style.maxHeight = 'none';
        imgElement.style.objectFit = 'none';
        imgElement.style.cursor = 'zoom-out';
      }
      imgElement.style.userSelect = 'none';
    }

    if (containerElement) {
      containerElement.style.overflow = this.fitToScreen ? '' : 'auto';
    }

    if (indicatorElement) {
      indicatorElement.textContent = `${this.modeIndicator} • Click image to toggle`;
    }
  }

  // Close lightbox
  close() {
    // Emit close event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('lightbox:closed', { gallery: this });
    }

    this.destroy();
  }

  async onBeforeDestroy() {
    // Restore body overflow
    document.body.style.overflow = '';

    // Remove keyboard listener
    if (this.allowKeyboard) {
      document.removeEventListener('keydown', this._keyboardHandler);
    }

    // Remove from body
    if (this.element.parentNode === document.body) {
      document.body.removeChild(this.element);
    }
  }

  // Static method to show lightbox
  static show(images, options = {}) {
    const lightbox = new LightboxGallery({
      images,
      ...options
    });

    lightbox.render().then(() => {
      lightbox.mount();
    });

    return lightbox;
  }
}

window.LightboxGallery = LightboxGallery;
