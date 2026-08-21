/* ==========================================================================
   UI — small shared helpers so every page behaves consistently.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var CA = (window.CA = window.CA || {});

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var key in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
        var val = attrs[key];
        if (val === null || val === undefined || val === false) continue;
        if (key === 'class') node.className = val;
        else if (key === 'html') node.innerHTML = val;
        else if (key === 'text') node.textContent = val;
        else if (key === 'dataset') { for (var d in val) node.dataset[d] = val[d]; }
        else if (key.indexOf('on') === 0 && typeof val === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), val);
        } else node.setAttribute(key, val);
      }
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---- Icons -------------------------------------------------------------
     Drawn as SVG rather than emoji or symbol characters, because those
     render as empty boxes on any device missing the right font.
     ---------------------------------------------------------------------- */
  var ICON_PATHS = {
    edit:      '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    close:     '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
    copy:      '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    restore:   '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    note:      '<path d="M4 4h16v12l-4 4H4Z"/><path d="M8 9h8"/><path d="M8 13h5"/>',
    hash:      '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/>',
    clock:     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    palette:   '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9.5" r="1.3"/><circle cx="14.5" cy="9" r="1.3"/><circle cx="9.5" cy="15" r="1.3"/><circle cx="15" cy="14" r="1.3"/>',
    checklist: '<path d="M4 6.5 6 8.5 10 4.5"/><path d="M4 17.5 6 19.5 10 15.5"/><path d="M13 7h7"/><path d="M13 18h7"/>'
  };

  /** An icon element. Falls back to a neutral dot for an unknown name. */
  function icon(name, size) {
    var box = document.createElement('span');
    box.className = 'ico';
    box.setAttribute('aria-hidden', 'true');
    var s = size || 15;
    box.innerHTML =
      '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'focusable="false" aria-hidden="true">' +
      (ICON_PATHS[name] || '<circle cx="12" cy="12" r="8"/>') +
      '</svg>';
    return box;
  }

  /* ---- Toast messages --------------------------------------------------- */
  var toastHost = null;

  function toast(message, kind, ms) {
    if (!toastHost) {
      toastHost = el('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastHost);
    }
    var node = el('div', { class: 'toast toast--' + (kind || 'info'), text: message });
    toastHost.appendChild(node);
    window.setTimeout(function () { node.classList.add('is-leaving'); }, ms || 2600);
    window.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, (ms || 2600) + 320);
  }

  /* ---- Confirm dialog (replaces the ugly browser popup) ----------------- */
  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var settings = Object.assign(
        { title: 'Are you sure?', message: '', confirmLabel: 'Confirm', cancelLabel: 'Cancel', danger: false },
        opts || {}
      );

      function close(result) {
        document.removeEventListener('keydown', onKey);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') close(false);
        if (e.key === 'Enter') close(true);
      }

      var confirmBtn = el('button', {
        class: 'btn ' + (settings.danger ? 'btn--danger' : 'btn--primary'),
        text: settings.confirmLabel,
        onclick: function () { close(true); }
      });

      var overlay = el('div', { class: 'overlay', onclick: function (e) { if (e.target === overlay) close(false); } }, [
        el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true' }, [
          el('h3', { class: 'dialog__title', text: settings.title }),
          settings.message ? el('p', { class: 'dialog__body', text: settings.message }) : null,
          el('div', { class: 'dialog__actions' }, [
            el('button', { class: 'btn btn--ghost', text: settings.cancelLabel, onclick: function () { close(false); } }),
            confirmBtn
          ])
        ])
      ]);

      document.body.appendChild(overlay);
      document.addEventListener('keydown', onKey);
      confirmBtn.focus();
    });
  }

  /* ---- Dates ------------------------------------------------------------ */
  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function relativeTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var secs = Math.round((Date.now() - d.getTime()) / 1000);
    if (secs < 60) return 'just now';
    var mins = Math.round(secs / 60);
    if (mins < 60) return mins + (mins === 1 ? ' minute ago' : ' minutes ago');
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
    var days = Math.round(hrs / 24);
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
    return formatDate(iso);
  }

  /** Days until a date. Negative means overdue. */
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var target = new Date(dateStr + 'T00:00:00');
    if (isNaN(target.getTime())) return null;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }

  function todayInputValue() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function debounce(fn, wait) {
    var timer;
    return function () {
      var args = arguments, self = this;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { fn.apply(self, args); }, wait || 200);
    };
  }

  /** Offer a file for download — how backups leave the browser. */
  function downloadJSON(filename, data) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = el('a', { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function emptyState(title, message, actionLabel, onAction) {
    return el('div', { class: 'empty' }, [
      el('p', { class: 'empty__title', text: title }),
      message ? el('p', { class: 'empty__text', text: message }) : null,
      actionLabel ? el('button', { class: 'btn btn--primary', text: actionLabel, onclick: onAction }) : null
    ]);
  }

  CA.UI = {
    el: el, qs: qs, qsa: qsa,
    icon: icon,
    escapeHtml: escapeHtml,
    toast: toast,
    confirm: confirmDialog,
    formatDate: formatDate,
    relativeTime: relativeTime,
    daysUntil: daysUntil,
    todayInputValue: todayInputValue,
    debounce: debounce,
    downloadJSON: downloadJSON,
    emptyState: emptyState
  };
})(window, document);
