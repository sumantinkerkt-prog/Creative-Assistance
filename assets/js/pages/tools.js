/* ==========================================================================
   Essential Tools page — draws a card for every registered tool.
   ========================================================================== */
CA.App.page('tools', function () {
  'use strict';

  var UI = CA.UI;
  var el = UI.el;
  var host = UI.qs('#toolGrid');
  var all = CA.Tools.all();

  if (!all.length) {
    host.appendChild(UI.emptyState('No tools loaded', 'Something went wrong loading the tools.', null, null));
    return;
  }

  all.forEach(function (def) {
    var body = el('div', { class: 'tool__panel', style: 'border-top:none;padding-top:0;margin-top:var(--sp-4)' });

    var card = el('section', {
      class: 'card tool',
      style: def.wide ? 'grid-column:1/-1' : '',
      id: 'tool-' + def.id
    }, [
      el('div', { class: 'tool__icon', 'aria-hidden': 'true' }, [UI.icon(def.icon, 20)]),
      el('h2', { class: 'tool__name', text: def.name }),
      el('p', { class: 'tool__desc', text: def.description || '' }),
      body
    ]);

    host.appendChild(card);

    /* One broken tool must never take the whole page down with it. */
    try {
      def.build(body, CA.Tools.apiFor(def));
    } catch (e) {
      if (window.console && console.error) console.error('Tool "' + def.id + '" failed:', e);
      body.innerHTML = '';
      body.appendChild(el('p', { class: 'dim small mb-0', text: 'This tool could not load.' }));
    }
  });
});
