/* ==========================================================================
   App — starts every page: titles, menu, warnings, then the page's own code.
   --------------------------------------------------------------------------
   A page registers itself with:  CA.App.page('workflow', function () { ... });
   ========================================================================== */
(function (window, document) {
  'use strict';

  var CA = (window.CA = window.CA || {});
  var UI = CA.UI;
  var pages = Object.create(null);
  var booted = false;

  /* Put the product name into the tab title and any [data-site-name] slot. */
  function applyBranding() {
    var site = CA.SITE;
    var pageTitle = document.title || '';

    if (document.body && document.body.dataset.title) {
      pageTitle = document.body.dataset.title;
    }
    document.title = pageTitle ? pageTitle + ' · ' + site.name : site.name;

    UI.qsa('[data-site-name]').forEach(function (node) { node.textContent = site.name; });
    UI.qsa('[data-site-tagline]').forEach(function (node) { node.textContent = site.tagline; });
    UI.qsa('[data-site-description]').forEach(function (node) { node.textContent = site.description; });
    UI.qsa('[data-site-year]').forEach(function (node) { node.textContent = new Date().getFullYear(); });
  }

  /* Let people know if their browser is refusing to save (private mode). */
  function warnIfNoStorage() {
    if (CA.Storage.available) return;
    var banner = UI.el('div', { class: 'banner banner--warn' }, [
      UI.el('strong', { text: 'Saving is turned off. ' }),
      document.createTextNode(
        'Your browser is blocking local saving — often because of private browsing. ' +
        'You can still use everything, but your work will disappear when you close this tab.'
      )
    ]);
    var main = UI.qs('main');
    if (main) main.insertBefore(banner, main.firstChild);
  }

  /* Tell people clearly if the device runs out of room. */
  function watchForFullStorage() {
    CA.Storage.subscribe(function (event) {
      if (event.type === 'error' && event.full) {
        UI.toast('Your device is out of storage space. Try removing old projects or notes.', 'error', 6000);
      }
    });
  }

  function boot() {
    if (booted) return;
    booted = true;

    applyBranding();

    var pageId = (document.body && document.body.dataset.page) || '';
    CA.Nav.mount(pageId);

    warnIfNoStorage();
    watchForFullStorage();

    runPage(pageId);
  }

  function runPage(id) {
    if (!pages[id]) return;
    try {
      pages[id]();
    } catch (e) {
      if (window.console && console.error) console.error('[' + id + '] failed to start:', e);
      UI.toast('Something went wrong loading this page.', 'error', 5000);
    }
  }

  CA.App = {
    /**
     * Register the code that runs for a given page.
     * If the page has already started, this runs straight away — so the
     * order of the <script> tags can't quietly break a page.
     */
    page: function (id, fn) {
      pages[id] = fn;
      var currentPage = (document.body && document.body.dataset.page) || '';
      if (booted && id === currentPage) runPage(id);
    },
    boot: boot
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);
