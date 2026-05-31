/**
 * QMF CDN All-in-One Entry Point
 * Combines core + header + footer + loading-screen into a single IIFE bundle.
 *
 * Following QMF Architecture Guide — Plugin Pattern:
 *   QMF.use(createHeaderPlugin({...}));
 *   QMF.use(createFooterPlugin({...}));
 *   QMF.init({ appId: '...' });
 *
 * Global API surface:
 *   window.QMF                    — Framework singleton (from @qmf/core)
 *   window.createHeaderPlugin     — Header plugin factory
 *   window.createFooterPlugin     — Footer plugin factory
 *   window.createLoadingScreenPlugin — Loading screen plugin factory
 *   window.QMFHeader              — Header class (direct usage)
 *   window.QMFFooter              — Footer class (direct usage)
 *   window.QMFLoadingScreen       — Loading screen class (direct usage)
 */

// Re-export core
export { QMF } from '@qmf/core';

// Re-export header
export { QMFHeader, createHeaderPlugin } from '@qmf/header';

// Re-export footer
export { QMFFooter, createFooterPlugin } from '@qmf/footer';

// Re-export loading screen
export { QMFLoadingScreen, createLoadingScreenPlugin } from '@qmf/loading-screen';

// Re-export auth shell
export { AuthShell, createAuthShellPlugin } from '@qmf/auth-shell';

// === Expose full plugin API on window ===
import { QMF } from '@qmf/core';
import { QMFHeader, createHeaderPlugin } from '@qmf/header';
import { QMFFooter, createFooterPlugin } from '@qmf/footer';
import { QMFLoadingScreen, createLoadingScreenPlugin } from '@qmf/loading-screen';
import { AuthShell, createAuthShellPlugin } from '@qmf/auth-shell';

if (typeof window !== 'undefined') {
  // Plugin factories (recommended — follows QMF lifecycle)
  window.createHeaderPlugin = createHeaderPlugin;
  window.createFooterPlugin = createFooterPlugin;
  window.createLoadingScreenPlugin = createLoadingScreenPlugin;
  window.createAuthShellPlugin = createAuthShellPlugin;

  // Classes for direct instantiation
  window.QMFHeader = QMFHeader;
  window.QMFFooter = QMFFooter;
  window.QMFLoadingScreen = QMFLoadingScreen;
  window.AuthShell = AuthShell;

  // --- Patch QMF.use() to support pre-init plugin registration ---
  // Core's use() throws if called before init(). We queue plugins and
  // flush them at the start of init() so the Architecture-Guide pattern
  //   QMF.use(plugin); QMF.init({...});
  // works correctly.
  var _pendingPlugins = [];
  var _origInit = QMF.init.bind(QMF);

  function _hasPlugin(arr, name) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] && arr[i].name === name) return true;
    }
    return false;
  }

  QMF.use = function(plugin) {
    // If plugin loader is already available, register directly
    try {
      QMF.plugins.register(plugin);
    } catch (_) {
      // Not initialized yet — queue
      _pendingPlugins.push(plugin);
    }
    return QMF;
  };

  QMF.init = function(opts) {
    // Call original init to create plugin loader, store, etc.
    return _origInit(opts).then(function() {
      // Flush any plugins that were queued via QMF.use() before init
      if (_pendingPlugins.length) {
        var pending = _pendingPlugins.splice(0);

        // Auto-satisfy header dependency when callers only register header.
        // This keeps Architecture.md plugin flow working in CDN usage.
        if (_hasPlugin(pending, 'header') && !_hasPlugin(pending, 'auth-shell')) {
          pending.unshift(createAuthShellPlugin({}));
        }

        for (var i = 0; i < pending.length; i++) {
          QMF.plugins.register(pending[i]);
        }
        // Init the newly registered plugins
        return QMF.plugins.initAll();
      }
    });
  };

  // Convenience: QMF.createHeader for backward compat
  QMF.createHeader = function(selector, config) {
    var header = new QMFHeader(config || {});
    header.mount(selector || '#qmf-header');
    return header;
  };
  QMF.createFooter = function(selector, config) {
    var footer = new QMFFooter(config || {});
    footer.mount(selector || '#qmf-footer');
    return footer;
  };
}
