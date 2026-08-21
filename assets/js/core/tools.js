/* ==========================================================================
   Tools registry — how new tools get added.
   --------------------------------------------------------------------------
   To add a tool: create a file in assets/js/tools/, call CA.Tools.register(),
   then add one <script> line to essential-tools.html. Nothing else changes.

   CA.Tools.register({
     id: 'my-tool',            // unique, used for saved data
     name: 'My Tool',
     icon: 'note',             // an icon name from CA.UI.icon
     description: 'What it does, in one line.',
     wide: false,              // true = takes a full-width card
     build: function (root, api) { ... }
   });

   api.store   — a private space to save this tool's data
   api.toast   — show a short message
   api.el      — build elements
   ========================================================================== */
(function (window) {
  'use strict';

  var CA = (window.CA = window.CA || {});
  var registry = [];

  CA.Tools = {
    register: function (def) {
      if (!def || !def.id || typeof def.build !== 'function') {
        if (window.console && console.warn) console.warn('Tool skipped — needs an id and a build function.', def);
        return;
      }
      for (var i = 0; i < registry.length; i++) {
        if (registry[i].id === def.id) {
          if (window.console && console.warn) console.warn('Tool id already used:', def.id);
          return;
        }
      }
      registry.push(def);
    },

    all: function () { return registry.slice(); },

    /** Build the helper object each tool receives. */
    apiFor: function (def) {
      var prefix = 'tool:' + def.id + ':';
      return {
        el: CA.UI.el,
        qs: CA.UI.qs,
        icon: CA.UI.icon,
        toast: CA.UI.toast,
        confirm: CA.UI.confirm,
        debounce: CA.UI.debounce,
        formatDate: CA.UI.formatDate,
        relativeTime: CA.UI.relativeTime,
        /** A saved list belonging only to this tool. */
        collection: function (name) { return CA.Store.collection(prefix + (name || 'items')); },
        /** A single saved value belonging only to this tool. */
        value: function (name, fallback) { return CA.Store.value(prefix + (name || 'state'), fallback); }
      };
    }
  };
})(window);
