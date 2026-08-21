/* ==========================================================================
   Creative Assistance — shared foundation
   Config, saving to the browser, small UI helpers, header and footer.
   Loaded by every page before that page's own script.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var CA = (window.CA = window.CA || {});

  /* ---------------------------------------------------------------- config */

  CA.SITE = {
    name: 'Creative Assistance',
    initials: 'CA',
    tagline: 'Plan projects, track tasks and use handy creative tools — right in your browser.'
  };

  CA.NAV = [
    { id: 'home',     label: 'Home',            href: 'index.html' },
    { id: 'workflow', label: 'Workflow',        href: 'workflow.html' },
    { id: 'tools',    label: 'Essential Tools', href: 'essential-tools.html' }
  ];

  CA.STAGES = [
    { id: 'idea',   label: 'Ideas',       accent: '#8b5cf6' },
    { id: 'active', label: 'In Progress', accent: '#6366f1' },
    { id: 'review', label: 'Review',      accent: '#f59e0b' },
    { id: 'done',   label: 'Done',        accent: '#10b981' }
  ];

  CA.PRIORITIES = [
    { id: 'low',    label: 'Low' },
    { id: 'normal', label: 'Normal' },
    { id: 'high',   label: 'High' }
  ];

  CA.PROJECT_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'
  ];

  /* --------------------------------------------------------------- storage
     Everything is kept in the visitor's own browser. If localStorage is
     unavailable (private mode, blocked cookies) we fall back to memory so
     the pages still work for the session instead of throwing errors.      */

  var PREFIX = 'ca.';
  var memory = {};
  var canPersist = (function () {
    try {
      var k = '__ca_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  var Storage = CA.storage = {
    available: canPersist,

    get: function (key, fallback) {
      var raw;
      try {
        raw = canPersist ? window.localStorage.getItem(PREFIX + key) : memory[key];
      } catch (e) {
        raw = memory[key];
      }
      if (raw === null || raw === undefined) return fallback;
      try {
        var parsed = JSON.parse(raw);
        return parsed === null || parsed === undefined ? fallback : parsed;
      } catch (e) {
        return fallback;
      }
    },

    set: function (key, value) {
      var raw;
      try {
        raw = JSON.stringify(value);
      } catch (e) {
        return false;
      }
      memory[key] = raw;
      if (!canPersist) return false;
      try {
        window.localStorage.setItem(PREFIX + key, raw);
        return true;
      } catch (e) {
        // Usually a full quota. Keep the value in memory and warn once.
        if (!Storage._warned) {
          Storage._warned = true;
          CA.ui.toast('Storage is full — recent changes may not be kept.');
        }
        return false;
      }
    },

    remove: function (key) {
      delete memory[key];
      if (!canPersist) return;
      try { window.localStorage.removeItem(PREFIX + key); } catch (e) {}
    },

    keys: function () {
      var out = [];
      if (!canPersist) return Object.keys(memory);
      try {
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length));
        }
      } catch (e) {}
      return out;
    }
  };

  /* ------------------------------------------------------------------ data */

  var Data = CA.data = {
    projects: function () { return Storage.get('projects', []); },
    tasks:    function () { return Storage.get('tasks', []); },
    saveProjects: function (list) { Storage.set('projects', list); },
    saveTasks:    function (list) { Storage.set('tasks', list); },

    /** Everything the visitor has created, for the backup file. */
    exportAll: function () {
      var bundle = { app: 'Creative Assistance', version: 1, savedAt: new Date().toISOString(), data: {} };
      Storage.keys().forEach(function (k) { bundle.data[k] = Storage.get(k, null); });
      return bundle;
    },

    importAll: function (bundle) {
      if (!bundle || typeof bundle !== 'object' || !bundle.data || typeof bundle.data !== 'object') {
        throw new Error('That file is not a Creative Assistance backup.');
      }
      Object.keys(bundle.data).forEach(function (k) { Storage.set(k, bundle.data[k]); });
      return true;
    },

    clearAll: function () {
      Storage.keys().forEach(function (k) { Storage.remove(k); });
    }
  };

  /* -------------------------------------------------------------------- ui */

  var UI = CA.ui = {

    id: function (prefix) {
      return (prefix || 'id') + '-' +
        Date.now().toString(36) + '-' +
        Math.random().toString(36).slice(2, 7);
    },

    /** Build an element. attrs supports class, text, html, dataset and on* handlers. */
    el: function (tag, attrs, children) {
      var node = document.createElement(tag);
      attrs = attrs || {};
      Object.keys(attrs).forEach(function (key) {
        var val = attrs[key];
        if (val === null || val === undefined || val === false) return;
        if (key === 'class') node.className = val;
        else if (key === 'text') node.textContent = val;
        else if (key === 'html') node.innerHTML = val;
        else if (key === 'dataset') Object.keys(val).forEach(function (d) { node.dataset[d] = val[d]; });
        else if (key === 'style' && typeof val === 'object') Object.assign(node.style, val);
        else if (key.indexOf('on') === 0 && typeof val === 'function') node.addEventListener(key.slice(2), val);
        else node.setAttribute(key, val === true ? '' : val);
      });
      UI.append(node, children);
      return node;
    },

    append: function (parent, children) {
      if (children === null || children === undefined) return parent;
      (Array.isArray(children) ? children : [children]).forEach(function (child) {
        if (child === null || child === undefined || child === false) return;
        parent.appendChild(typeof child === 'string' || typeof child === 'number'
          ? document.createTextNode(String(child))
          : child);
      });
      return parent;
    },

    clear: function (node) {
      while (node && node.firstChild) node.removeChild(node.firstChild);
      return node;
    },

    toast: function (message) {
      var host = document.querySelector('.toast-host');
      if (!host) {
        host = UI.el('div', { class: 'toast-host', 'aria-live': 'polite' });
        document.body.appendChild(host);
      }
      var t = UI.el('div', { class: 'toast', text: message });
      host.appendChild(t);
      window.setTimeout(function () {
        t.style.transition = 'opacity .25s ease';
        t.style.opacity = '0';
        window.setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
      }, 2400);
    },

    copy: function (text) {
      var done = function () { UI.toast('Copied ' + text); };
      if (window.navigator.clipboard && window.navigator.clipboard.writeText) {
        window.navigator.clipboard.writeText(text).then(done, function () { UI.fallbackCopy(text, done); });
      } else {
        UI.fallbackCopy(text, done);
      }
    },

    fallbackCopy: function (text, done) {
      var ta = UI.el('textarea', { style: { position: 'fixed', opacity: '0', top: '0' } });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { UI.toast('Could not copy.'); }
      document.body.removeChild(ta);
    },

    /* ---- dates ---- */

    today: function () {
      var d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    },

    /** Parse a yyyy-mm-dd value as a local date (avoids timezone drift). */
    parseDate: function (value) {
      if (!value) return null;
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
      if (!m) return null;
      var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return isNaN(d.getTime()) ? null : d;
    },

    daysUntil: function (value) {
      var d = UI.parseDate(value);
      if (!d) return null;
      return Math.round((d - UI.today()) / 86400000);
    },

    formatDate: function (value) {
      var d = UI.parseDate(value);
      if (!d) return '';
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    },

    /** "Overdue", "Today", "Tomorrow", or a short date. */
    describeDue: function (value) {
      var n = UI.daysUntil(value);
      if (n === null) return '';
      if (n < 0) return Math.abs(n) === 1 ? '1 day overdue' : Math.abs(n) + ' days overdue';
      if (n === 0) return 'Due today';
      if (n === 1) return 'Due tomorrow';
      if (n <= 7) return 'Due in ' + n + ' days';
      return 'Due ' + UI.formatDate(value);
    },

    formatWhen: function (iso) {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      var mins = Math.round((Date.now() - d.getTime()) / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return mins + (mins === 1 ? ' minute ago' : ' minutes ago');
      var hrs = Math.round(mins / 60);
      if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    },

    /** Save a JavaScript object to the visitor's downloads as a .json file. */
    download: function (filename, contents) {
      var blob = new Blob([contents], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = UI.el('a', { href: url, download: filename });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
  };

  /* ------------------------------------------------------- header / footer */

  CA.chrome = function (activeId) {
    var head = document.querySelector('[data-site-head]');
    var foot = document.querySelector('[data-site-foot]');

    if (head) {
      var nav = UI.el('nav', { class: 'site-nav', id: 'siteNav', 'aria-label': 'Main' },
        CA.NAV.map(function (item) {
          return UI.el('a', {
            href: item.href,
            text: item.label,
            'aria-current': item.id === activeId ? 'page' : null
          });
        })
      );

      var toggle = UI.el('button', {
        class: 'nav-toggle', type: 'button',
        'aria-label': 'Menu', 'aria-expanded': 'false', 'aria-controls': 'siteNav',
        html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
        onclick: function () {
          var open = nav.hasAttribute('hidden');
          if (open) nav.removeAttribute('hidden'); else nav.setAttribute('hidden', '');
          toggle.setAttribute('aria-expanded', String(open));
        }
      });

      var applyViewport = function () {
        if (window.matchMedia('(max-width: 640px)').matches) {
          nav.setAttribute('hidden', '');
          toggle.setAttribute('aria-expanded', 'false');
        } else {
          nav.removeAttribute('hidden');
        }
      };

      UI.append(UI.clear(head), UI.el('div', { class: 'wrap' }, [
        UI.el('a', { class: 'brand', href: 'index.html' }, [
          UI.el('span', { class: 'brand-mark', text: CA.SITE.initials, 'aria-hidden': 'true' }),
          UI.el('span', { class: 'brand-name', text: CA.SITE.name })
        ]),
        UI.el('div', { class: 'row', style: { gap: '6px' } }, [nav, toggle])
      ]));

      applyViewport();
      window.addEventListener('resize', applyViewport);
    }

    if (foot) {
      UI.append(UI.clear(foot), UI.el('div', { class: 'wrap' }, [
        UI.el('span', { text: CA.SITE.name + ' — your work stays in your own browser.' }),
        UI.el('a', { href: 'privacy.html', text: 'Privacy' })
      ]));
    }
  };

  /** Every page calls this: draws the chrome, then runs the page's own setup. */
  CA.start = function (activeId, setup) {
    var run = function () {
      CA.chrome(activeId);
      try {
        if (typeof setup === 'function') setup();
      } catch (e) {
        if (window.console) window.console.error(e);
        UI.toast('Something went wrong loading this page.');
      }
      if (!Storage.available) {
        UI.toast('Your browser is blocking storage, so work will not be kept.');
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  };

})(window, document);
