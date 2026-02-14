/**
 * WEB-MOJO Lite Entry (script-tag friendly)
 *
 * Goal:
 * - Provide a single browser bundle entry that attaches a "lite" set of core
 *   components to `window.MOJO` for drop-in usage (no npm/build required for consumers).
 *
 * Notes:
 * - This file is intended to be bundled (IIFE/UMD) by the build pipeline.
 * - We "merge" into `window.MOJO` to reduce the chance of collisions if consumers
 *   load other MOJO bundles (though typically they'd load one or the other).
 * - Bootstrap is expected to be provided by the consuming app (CSS + Icons + JS bundle).
 */

// Core
import WebApp from '@core/WebApp.js';
import View from '@core/View.js';
import Page from '@core/Page.js';
import Router from '@core/Router.js';
import Model from '@core/Model.js';
import Collection from '@core/Collection.js';
import Rest from '@core/Rest.js';

// Forms
import FormBuilder from '@core/forms/FormBuilder.js';
import FormView from '@core/forms/FormView.js';
import FormPage from '@core/forms/FormPage.js';
// Basic UI Views
import Dialog from '@core/views/feedback/Dialog.js';
import ProgressView from '@core/views/feedback/ProgressView.js';
import ListView from '@core/views/list/ListView.js';
import ListViewItem from '@core/views/list/ListViewItem.js';
import TableView from '@core/views/table/TableView.js';
import TableRow from '@core/views/table/TableRow.js';

// Utilities that are commonly useful in "lite" contexts
import DataFormatter from '@core/utils/DataFormatter.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';

/**
 * Get (or create) the global MOJO namespace.
 * We merge to avoid clobbering an existing MOJO object.
 */
function getGlobalMOJO() {
  if (typeof window === 'undefined') return null;
  if (!window.MOJO || typeof window.MOJO !== 'object') {
    window.MOJO = {};
  }
  return window.MOJO;
}

/**
 * Attach lite exports onto window.MOJO.
 * Keep this list intentionally small and "basic".
 */
function attachLite(MOJO) {
  // If already attached, do nothing (idempotent).
  if (MOJO.__lite && MOJO.__lite.version) {
    return MOJO;
  }

  // Core
  MOJO.WebApp = WebApp;
  MOJO.View = View;
  MOJO.Page = Page;
  MOJO.Router = Router;
  MOJO.Model = Model;
  MOJO.Collection = Collection;
  MOJO.Rest = Rest;

  // Forms
  MOJO.FormBuilder = FormBuilder;
  MOJO.FormView = FormView;

  // Basic UI
  MOJO.Dialog = Dialog;
  MOJO.ProgressView = ProgressView;
  MOJO.ListView = ListView;
  MOJO.ListViewItem = ListViewItem;
  MOJO.TableView = TableView;
  MOJO.TableRow = TableRow;

  // Utils
  MOJO.DataFormatter = DataFormatter;
  MOJO.MOJOUtils = MOJOUtils;

  // Metadata (useful for debugging)
  MOJO.__lite = {
    version: 'dev', // build can optionally replace this
    build: 'web-mojo.lite'
  };

  /**
   * Convenience helper for "embed-style" usage where you just want to mount a view.
   * This is intentionally minimal and does not require WebApp or routing.
   *
   * @param {View} view - A MOJO View instance (or subclass instance)
   * @param {HTMLElement|string} container - DOM element or selector
   */
  MOJO.mount = async function mount(view, container) {
    if (!view) throw new Error('MOJO.mount(view, container) requires a view');
    const el =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!el) throw new Error('MOJO.mount(view, container) container not found');

    // Render/mount lifecycle is handled by the View implementation.
    // We call render() then mount().
    if (typeof view.render !== 'function' || typeof view.mount !== 'function') {
      throw new Error('MOJO.mount expects a View instance with render() and mount() methods');
    }

    await view.render();
    await view.mount(el);

    return view;
  };

  return MOJO;
}

// Attach immediately in the browser
const MOJO = getGlobalMOJO();
if (MOJO) {
  attachLite(MOJO);
}

// Also export for ESM consumers (tree-shaking depends on bundler config)
export {
  // Core
  WebApp,
  View,
  Page,
  Router,
  Model,
  Collection,
  Rest,

  // Forms
  FormBuilder,
  FormView,
  FormPage,

  // Basic UI
  Dialog,
  ProgressView,
  ListView,
  ListViewItem,
  TableView,
  TableRow,

  // Utils
  DataFormatter,
  MOJOUtils
};

export default MOJO;
