/* Colour Palette — generate a harmonious set, click to copy, save favourites. */
CA.Tools.register({
  id: 'palette',
  name: 'Colour Palette',
  icon: 'palette',
  description: 'Generate matching colours, click one to copy its code, save the sets you like.',

  build: function (root, api) {
    var el = api.el;
    var favourites = api.collection('saved');
    var current = [];

    var swatches = el('div', { class: 'swatches' });
    var savedWrap = el('div', { class: 'mt-5' });

    function hslToHex(h, s, l) {
      s /= 100; l /= 100;
      var k = function (n) { return (n + h / 30) % 12; };
      var a = s * Math.min(l, 1 - l);
      var f = function (n) {
        return l - a * Math.max(-1, Math.min(Math.min(k(n) - 3, 9 - k(n)), 1));
      };
      var toHex = function (v) { return Math.round(v * 255).toString(16).padStart(2, '0'); };
      return '#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
    }

    function generate() {
      var baseHue = Math.floor(Math.random() * 360);
      var sat = 62 + Math.floor(Math.random() * 22);
      current = [];
      for (var i = 0; i < 5; i++) {
        var hue = (baseHue + i * 24) % 360;
        var light = 34 + i * 11;
        current.push(hslToHex(hue, sat, light));
      }
      paint();
    }

    function copy(hex) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(hex).then(
          function () { api.toast(hex + ' copied.', 'success'); },
          function () { api.toast('Could not copy.', 'error'); }
        );
      } else {
        api.toast('Copying is not supported in this browser.', 'error');
      }
    }

    function paint() {
      swatches.innerHTML = '';
      current.forEach(function (hex) {
        swatches.appendChild(
          el('button', {
            class: 'swatch',
            type: 'button',
            style: 'background:' + hex,
            title: 'Copy ' + hex,
            'aria-label': 'Copy colour ' + hex,
            onclick: function () { copy(hex); }
          }, [el('span', { text: hex })])
        );
      });
    }

    function renderSaved() {
      var rows = favourites.all().sort(function (a, b) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      savedWrap.innerHTML = '';
      if (!rows.length) {
        savedWrap.appendChild(el('p', { class: 'dim small mb-0', text: 'No saved palettes yet.' }));
        return;
      }

      savedWrap.appendChild(el('div', { class: 'stat__label', text: 'Saved palettes' }));

      rows.forEach(function (p) {
        var strip = el('div', { class: 'row', style: 'gap:4px;flex:1' },
          (p.colors || []).map(function (hex) {
            return el('button', {
              type: 'button',
              class: 'swatch',
              style: 'background:' + hex + ';width:26px;aspect-ratio:1;border-radius:6px',
              title: 'Copy ' + hex,
              'aria-label': 'Copy colour ' + hex,
              onclick: function () { copy(hex); }
            });
          })
        );

        savedWrap.appendChild(
          el('div', { class: 'list__item mt-4' }, [
            strip,
            el('button', {
              class: 'icon-btn', type: 'button', title: 'Load this palette', 'aria-label': 'Load this palette',
              onclick: function () { current = (p.colors || []).slice(); paint(); }
            }, [api.icon('restore')]),
            el('button', {
              class: 'icon-btn icon-btn--danger', type: 'button', title: 'Delete palette', 'aria-label': 'Delete palette',
              onclick: function () { favourites.remove(p.id); renderSaved(); }
            }, [api.icon('close')])
          ])
        );
      });
    }

    root.appendChild(swatches);
    root.appendChild(
      el('div', { class: 'row mt-4' }, [
        el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Generate', onclick: generate }),
        el('button', {
          class: 'btn btn--ghost btn--sm', type: 'button', text: 'Save this set',
          onclick: function () {
            if (!current.length) return;
            favourites.create({ colors: current.slice() });
            api.toast('Palette saved.', 'success');
            renderSaved();
          }
        })
      ])
    );
    root.appendChild(savedWrap);

    generate();
    renderSaved();
  }
});
