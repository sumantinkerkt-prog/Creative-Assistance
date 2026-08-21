/* ==========================================================================
   Storage — saves everything on the visitor's own device.
   --------------------------------------------------------------------------
   No server, no accounts, no data leaving the browser.
   Handles the awkward real-world cases:
     - private/incognito mode where saving is blocked
     - storage being full
     - corrupted or hand-edited values
     - full backup export / restore
   ========================================================================== */
(function (window) {
  'use strict';

  var CA = (window.CA = window.CA || {});
  var PREFIX = 'ca:';
  var META_KEY = PREFIX + '__meta';

  /* ---- Is real storage usable? ------------------------------------------ */
  var available = (function () {
    try {
      var probe = '__ca_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  })();

  /* Fallback so the app still runs (just doesn't persist) when blocked. */
  var memory = Object.create(null);

  var backend = available
    ? {
        get: function (k) { return window.localStorage.getItem(k); },
        set: function (k, v) { window.localStorage.setItem(k, v); },
        remove: function (k) { window.localStorage.removeItem(k); },
        keys: function () {
          var out = [];
          for (var i = 0; i < window.localStorage.length; i++) {
            out.push(window.localStorage.key(i));
          }
          return out;
        }
      }
    : {
        get: function (k) { return k in memory ? memory[k] : null; },
        set: function (k, v) { memory[k] = String(v); },
        remove: function (k) { delete memory[k]; },
        keys: function () { return Object.keys(memory); }
      };

  var listeners = [];

  function emit(event) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](event); } catch (e) { /* never let one listener break others */ }
    }
  }

  var Storage = {
    available: available,

    /** Read a value. Returns fallback when missing or unreadable. */
    get: function (key, fallback) {
      var raw;
      try {
        raw = backend.get(PREFIX + key);
      } catch (e) {
        return fallback;
      }
      if (raw === null || raw === undefined) return fallback;
      try {
        var parsed = JSON.parse(raw);
        return parsed === null || parsed === undefined ? fallback : parsed;
      } catch (e) {
        // Value was corrupted — discard it rather than crashing the page.
        try { backend.remove(PREFIX + key); } catch (e2) {}
        return fallback;
      }
    },

    /** Save a value. Returns true on success, false if storage refused it. */
    set: function (key, value) {
      var payload;
      try {
        payload = JSON.stringify(value);
      } catch (e) {
        return false;
      }
      try {
        backend.set(PREFIX + key, payload);
        emit({ type: 'set', key: key });
        return true;
      } catch (e) {
        var full =
          e && (e.name === 'QuotaExceededError' ||
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                e.code === 22 || e.code === 1014);
        emit({ type: 'error', key: key, full: !!full, error: e });
        return false;
      }
    },

    remove: function (key) {
      try { backend.remove(PREFIX + key); } catch (e) {}
      emit({ type: 'remove', key: key });
    },

    /** All app keys, without the internal prefix. */
    keys: function () {
      var out = [];
      var all;
      try { all = backend.keys(); } catch (e) { return out; }
      for (var i = 0; i < all.length; i++) {
        var k = all[i];
        if (k && k.indexOf(PREFIX) === 0 && k !== META_KEY) {
          out.push(k.slice(PREFIX.length));
        }
      }
      return out;
    },

    /** Wipe every piece of app data. Leaves other sites' data alone. */
    clearAll: function () {
      var keys = Storage.keys();
      for (var i = 0; i < keys.length; i++) Storage.remove(keys[i]);
      try { backend.remove(META_KEY); } catch (e) {}
      emit({ type: 'cleared' });
    },

    /** Rough size of stored data, in kilobytes. */
    usageKB: function () {
      var bytes = 0;
      var keys = Storage.keys();
      for (var i = 0; i < keys.length; i++) {
        var raw;
        try { raw = backend.get(PREFIX + keys[i]); } catch (e) { raw = null; }
        if (raw) bytes += (PREFIX + keys[i]).length + raw.length;
      }
      return Math.round((bytes * 2) / 1024); // ~2 bytes per character
    },

    /** Everything, as one plain object — used for backups. */
    exportAll: function () {
      var data = {};
      var keys = Storage.keys();
      for (var i = 0; i < keys.length; i++) data[keys[i]] = Storage.get(keys[i], null);
      return {
        app: CA.SITE ? CA.SITE.name : 'Creative Assistance',
        version: CA.SITE ? CA.SITE.dataVersion : 1,
        exportedAt: new Date().toISOString(),
        data: data
      };
    },

    /**
     * Restore from a backup object.
     * mode 'replace' wipes current data first; 'merge' keeps what isn't in the file.
     */
    importAll: function (bundle, mode) {
      if (!bundle || typeof bundle !== 'object' || !bundle.data || typeof bundle.data !== 'object') {
        return { ok: false, error: 'That file does not look like a backup from this app.' };
      }
      if (mode === 'replace') Storage.clearAll();
      var count = 0;
      for (var key in bundle.data) {
        if (Object.prototype.hasOwnProperty.call(bundle.data, key)) {
          if (Storage.set(key, bundle.data[key])) count++;
        }
      }
      emit({ type: 'imported', count: count });
      return { ok: true, count: count };
    },

    /** Be told whenever anything changes. Returns an unsubscribe function. */
    subscribe: function (fn) {
      if (typeof fn !== 'function') return function () {};
      listeners.push(fn);
      return function () {
        var i = listeners.indexOf(fn);
        if (i > -1) listeners.splice(i, 1);
      };
    }
  };

  /* Record which data version this device is on, ready for future upgrades. */
  (function stampVersion() {
    if (!available) return;
    var target = (CA.SITE && CA.SITE.dataVersion) || 1;
    var meta;
    try { meta = JSON.parse(backend.get(META_KEY) || 'null'); } catch (e) { meta = null; }
    if (!meta || meta.dataVersion !== target) {
      try {
        backend.set(META_KEY, JSON.stringify({ dataVersion: target, updatedAt: new Date().toISOString() }));
      } catch (e) {}
    }
  })();

  /* Keep two open tabs in sync. */
  if (available && window.addEventListener) {
    window.addEventListener('storage', function (e) {
      if (e && e.key && e.key.indexOf(PREFIX) === 0) {
        emit({ type: 'external', key: e.key.slice(PREFIX.length) });
      }
    });
  }

  CA.Storage = Storage;
})(window);
