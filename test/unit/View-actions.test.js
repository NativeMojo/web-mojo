/**
 * View Action Handling Tests
 * Tests for action handler method name resolution including kebab-case support
 */

import View from '../../src/core/View.js';

describe('View Action Handling', () => {
  let view;
  let container;

  beforeEach(() => {
    // Create test container
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    if (view && view.mounted) {
      view.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('capitalize method', () => {
    test('should capitalize single word', () => {
      view = new View();
      expect(view.capitalize('test')).toBe('Test');
      expect(view.capitalize('click')).toBe('Click');
      expect(view.capitalize('save')).toBe('Save');
    });

    test('should convert kebab-case to PascalCase', () => {
      view = new View();
      expect(view.capitalize('show-modal')).toBe('ShowModal');
      expect(view.capitalize('save-data')).toBe('SaveData');
      expect(view.capitalize('toggle-sidebar')).toBe('ToggleSidebar');
    });

    test('should handle multiple hyphens', () => {
      view = new View();
      expect(view.capitalize('show-large-modal')).toBe('ShowLargeModal');
      expect(view.capitalize('save-and-close-dialog')).toBe('SaveAndCloseDialog');
      expect(view.capitalize('open-file-browser-window')).toBe('OpenFileBrowserWindow');
    });

    test('should handle edge cases', () => {
      view = new View();
      expect(view.capitalize('')).toBe('');
      expect(view.capitalize('a')).toBe('A');
      expect(view.capitalize('a-b')).toBe('AB');
      expect(view.capitalize('test-')).toBe('Test');
      expect(view.capitalize('-test')).toBe('Test');
    });
  });

  describe('Action method resolution', () => {
    test('should call correct method for single word actions', async () => {
      class TestView extends View {
        constructor() {
          super();
          this.clickCalled = false;
          this.saveCalled = false;
        }

        async onActionClick(event, element) {
          this.clickCalled = true;
        }

        async onActionSave(event, element) {
          this.saveCalled = true;
        }

        getTemplate() {
          return `
            <div>
              <button data-action="click">Click</button>
              <button data-action="save">Save</button>
            </div>
          `;
        }
      }

      view = new TestView();
      container.innerHTML = view.getTemplate();
      await view.mount(container);

      // Test click action
      const clickButton = container.querySelector('[data-action="click"]');
      await view.handleAction('click', new Event('click'), clickButton);
      expect(view.clickCalled).toBe(true);

      // Test save action
      const saveButton = container.querySelector('[data-action="save"]');
      await view.handleAction('save', new Event('click'), saveButton);
      expect(view.saveCalled).toBe(true);
    });

    test('should call correct method for kebab-case actions', async () => {
      class TestView extends View {
        constructor() {
          super();
          this.showModalCalled = false;
          this.saveDataCalled = false;
          this.toggleSidebarCalled = false;
        }

        async onActionShowModal(event, element) {
          this.showModalCalled = true;
        }

        async onActionSaveData(event, element) {
          this.saveDataCalled = true;
        }

        async onActionToggleSidebar(event, element) {
          this.toggleSidebarCalled = true;
        }

        getTemplate() {
          return `
            <div>
              <button data-action="show-modal">Show Modal</button>
              <button data-action="save-data">Save Data</button>
              <button data-action="toggle-sidebar">Toggle</button>
            </div>
          `;
        }
      }

      view = new TestView();
      container.innerHTML = view.getTemplate();
      await view.mount(container);

      // Test show-modal action
      const showModalButton = container.querySelector('[data-action="show-modal"]');
      await view.handleAction('show-modal', new Event('click'), showModalButton);
      expect(view.showModalCalled).toBe(true);

      // Test save-data action
      const saveDataButton = container.querySelector('[data-action="save-data"]');
      await view.handleAction('save-data', new Event('click'), saveDataButton);
      expect(view.saveDataCalled).toBe(true);

      // Test toggle-sidebar action
      const toggleButton = container.querySelector('[data-action="toggle-sidebar"]');
      await view.handleAction('toggle-sidebar', new Event('click'), toggleButton);
      expect(view.toggleSidebarCalled).toBe(true);
    });

    test('should handle complex kebab-case actions', async () => {
      class TestView extends View {
        constructor() {
          super();
          this.showLargeModalCalled = false;
          this.saveAndCloseCalled = false;
        }

        async onActionShowLargeModal(event, element) {
          this.showLargeModalCalled = true;
        }

        async onActionSaveAndClose(event, element) {
          this.saveAndCloseCalled = true;
        }

        getTemplate() {
          return `
            <div>
              <button data-action="show-large-modal">Show Large</button>
              <button data-action="save-and-close">Save & Close</button>
            </div>
          `;
        }
      }

      view = new TestView();
      container.innerHTML = view.getTemplate();
      await view.mount(container);

      // Test show-large-modal action
      const showLargeButton = container.querySelector('[data-action="show-large-modal"]');
      await view.handleAction('show-large-modal', new Event('click'), showLargeButton);
      expect(view.showLargeModalCalled).toBe(true);

      // Test save-and-close action
      const saveCloseButton = container.querySelector('[data-action="save-and-close"]');
      await view.handleAction('save-and-close', new Event('click'), saveCloseButton);
      expect(view.saveAndCloseCalled).toBe(true);
    });

    test('should emit event when action method not found', async () => {
      view = new View();
      const actionSpy = jest.fn();
      view.on('action', actionSpy);

      const button = document.createElement('button');
      button.dataset.action = 'non-existent';

      await view.handleAction('non-existent', new Event('click'), button);

      expect(actionSpy).toHaveBeenCalledWith({
        action: 'non-existent',
        event: expect.any(Event),
        element: button
      });
    });

    test('should handle errors in action methods', async () => {
      class TestView extends View {
        async onActionError(event, element) {
          throw new Error('Test action error');
        }
      }

      view = new TestView();
      const button = document.createElement('button');
      button.dataset.action = 'error';

      // Should not throw, but log error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await view.handleAction('error', new Event('click'), button);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in action error:',
        expect.any(Error)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Action error in error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Event binding with kebab-case actions', () => {
    test('should bind click events with kebab-case actions', async () => {
      class TestView extends View {
        constructor() {
          super();
          this.actionsCalled = [];
        }

        async onActionShowModal() {
          this.actionsCalled.push('show-modal');
        }

        async onActionSaveData() {
          this.actionsCalled.push('save-data');
        }

        getTemplate() {
          return `
            <div>
              <button data-action="show-modal">Show</button>
              <button data-action="save-data">Save</button>
            </div>
          `;
        }
      }

      view = new TestView();
      await view.render();
      container.appendChild(view.element);
      await view.mount();

      // Click buttons
      const showButton = view.element.querySelector('[data-action="show-modal"]');
      const saveButton = view.element.querySelector('[data-action="save-data"]');

      showButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(view.actionsCalled).toContain('show-modal');

      saveButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(view.actionsCalled).toContain('save-data');
    });

    test('should handle mixed case action names', async () => {
      class TestView extends View {
        constructor() {
          super();
          this.methodsCalled = [];
        }

        async onActionSimple() {
          this.methodsCalled.push('simple');
        }

        async onActionComplexAction() {
          this.methodsCalled.push('complex-action');
        }

        async onActionVeryLongActionName() {
          this.methodsCalled.push('very-long-action-name');
        }

        getTemplate() {
          return `
            <div>
              <button data-action="simple">Simple</button>
              <button data-action="complex-action">Complex</button>
              <button data-action="very-long-action-name">Very Long</button>
            </div>
          `;
        }
      }

      view = new TestView();
      await view.render();
      container.appendChild(view.element);
      await view.mount();

      // Test all buttons
      const simpleBtn = view.element.querySelector('[data-action="simple"]');
      const complexBtn = view.element.querySelector('[data-action="complex-action"]');
      const veryLongBtn = view.element.querySelector('[data-action="very-long-action-name"]');

      simpleBtn.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(view.methodsCalled).toContain('simple');

      complexBtn.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(view.methodsCalled).toContain('complex-action');

      veryLongBtn.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(view.methodsCalled).toContain('very-long-action-name');
    });
  });

  describe('DialogsPage action compatibility', () => {
    test('should resolve dialog action names correctly', () => {
      view = new View();
      
      // Test actual DialogsPage action names
      expect(view.capitalize('show-small')).toBe('ShowSmall');
      expect(view.capitalize('show-default')).toBe('ShowDefault');
      expect(view.capitalize('show-large')).toBe('ShowLarge');
      expect(view.capitalize('show-xl')).toBe('ShowXl');
      expect(view.capitalize('show-fullscreen')).toBe('ShowFullscreen');
      expect(view.capitalize('show-centered')).toBe('ShowCentered');
      expect(view.capitalize('show-scrollable')).toBe('ShowScrollable');
      expect(view.capitalize('show-static')).toBe('ShowStatic');
      expect(view.capitalize('show-view-dialog')).toBe('ShowViewDialog');
      expect(view.capitalize('show-form-view')).toBe('ShowFormView');
      expect(view.capitalize('show-alert')).toBe('ShowAlert');
      expect(view.capitalize('show-confirm')).toBe('ShowConfirm');
      expect(view.capitalize('show-prompt')).toBe('ShowPrompt');
      expect(view.capitalize('show-wizard')).toBe('ShowWizard');
      expect(view.capitalize('show-loading')).toBe('ShowLoading');
      expect(view.capitalize('show-nested')).toBe('ShowNested');
    });
  });
});