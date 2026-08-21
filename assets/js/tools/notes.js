/* Quick Notes — jot something down, it stays put. */
CA.Tools.register({
  id: 'notes',
  name: 'Quick Notes',
  icon: 'note',
  description: 'Capture a thought before it escapes. Notes save as you type.',
  wide: true,

  build: function (root, api) {
    var el = api.el;
    var notes = api.collection('items');
    var draft = api.value('draft', '');

    var input = el('textarea', {
      class: 'textarea',
      placeholder: 'Type a note, then press Save…',
      maxlength: '4000'
    });
    input.value = draft.get() || '';

    /* Don't lose a half-written note if the page closes. */
    input.addEventListener('input', api.debounce(function () { draft.set(input.value); }, 400));

    var list = el('div', { class: 'list mt-5' });

    function save() {
      var text = input.value.trim();
      if (!text) { api.toast('Write something first.', 'error'); input.focus(); return; }
      notes.create({ text: text });
      input.value = '';
      draft.set('');
      api.toast('Note saved.', 'success');
      renderList();
      input.focus();
    }

    function renderList() {
      var rows = notes.all().sort(function (a, b) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      list.innerHTML = '';

      if (!rows.length) {
        list.appendChild(el('p', { class: 'dim small mb-0', text: 'No notes yet.' }));
        return;
      }

      rows.forEach(function (n) {
        list.appendChild(
          el('div', { class: 'list__item' }, [
            el('div', { class: 'list__item__main' }, [
              el('div', { class: 'list__item__title', style: 'white-space:pre-wrap', text: n.text }),
              el('div', { class: 'list__item__sub', text: api.relativeTime(n.createdAt) })
            ]),
            el('button', {
              class: 'icon-btn', type: 'button', title: 'Copy note', 'aria-label': 'Copy note',
              onclick: function () {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(n.text).then(
                    function () { api.toast('Copied.', 'success'); },
                    function () { api.toast('Could not copy.', 'error'); }
                  );
                } else {
                  api.toast('Copying is not supported in this browser.', 'error');
                }
              }
            }, [api.icon('copy')]),
            el('button', {
              class: 'icon-btn icon-btn--danger', type: 'button', title: 'Delete note', 'aria-label': 'Delete note',
              onclick: function () {
                notes.remove(n.id);
                renderList();
                api.toast('Note deleted.', 'success');
              }
            }, [api.icon('close')])
          ])
        );
      });
    }

    root.appendChild(input);
    root.appendChild(
      el('div', { class: 'row row--end mt-4' }, [
        el('button', {
          class: 'btn btn--ghost btn--sm', type: 'button', text: 'Clear box',
          onclick: function () { input.value = ''; draft.set(''); input.focus(); }
        }),
        el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Save note', onclick: save })
      ])
    );
    root.appendChild(list);

    renderList();
  }
});
