/* Checklist — a reusable list for repeated routines you don't want to memorise. */
CA.Tools.register({
  id: 'checklist',
  name: 'Checklist',
  icon: 'checklist',
  description: 'Build a routine once, tick it off each time, then reset it and start again.',

  build: function (root, api) {
    var el = api.el;
    var items = api.collection('items');

    var input = el('input', {
      class: 'input', type: 'text', placeholder: 'Add a step…', maxlength: '140'
    });

    var list = el('div', { class: 'list mt-4' });
    var summary = el('p', { class: 'dim small mt-4 mb-0' });

    function add() {
      var text = input.value.trim();
      if (!text) { input.focus(); return; }
      items.create({ text: text, checked: false });
      input.value = '';
      render();
      input.focus();
    }

    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });

    function render() {
      var rows = items.all();
      list.innerHTML = '';

      if (!rows.length) {
        list.appendChild(el('p', { class: 'dim small mb-0', text: 'No steps yet. Add your first one above.' }));
        summary.textContent = '';
        return;
      }

      rows.forEach(function (item) {
        var box = el('input', { type: 'checkbox', 'aria-label': item.text });
        box.checked = !!item.checked;
        box.addEventListener('change', function () {
          items.update(item.id, { checked: box.checked });
          render();
        });

        list.appendChild(
          el('div', { class: 'list__item' }, [
            box,
            el('div', { class: 'list__item__main' }, [
              el('div', {
                class: 'list__item__title',
                style: item.checked ? 'text-decoration:line-through;opacity:.55' : '',
                text: item.text
              })
            ]),
            el('button', {
              class: 'icon-btn icon-btn--danger', type: 'button', title: 'Remove step', 'aria-label': 'Remove step',
              onclick: function () { items.remove(item.id); render(); }
            }, [api.icon('close')])
          ])
        );
      });

      var done = rows.filter(function (r) { return r.checked; }).length;
      summary.textContent = done + ' of ' + rows.length + ' ticked off';
    }

    root.appendChild(el('div', { class: 'form-row' }, [
      el('div', { class: 'form-row__grow' }, [input]),
      el('div', { style: 'flex:0 0 auto' }, [
        el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Add', onclick: add })
      ])
    ]));
    root.appendChild(list);
    root.appendChild(summary);
    root.appendChild(
      el('div', { class: 'row mt-4' }, [
        el('button', {
          class: 'btn btn--ghost btn--sm', type: 'button', text: 'Untick all',
          onclick: function () {
            items.all().forEach(function (i) { items.update(i.id, { checked: false }); });
            render();
            api.toast('Checklist reset.', 'success');
          }
        }),
        el('button', {
          class: 'btn btn--ghost btn--sm', type: 'button', text: 'Delete all steps',
          onclick: function () {
            api.confirm({
              title: 'Delete every step?',
              message: 'This clears the whole checklist.',
              confirmLabel: 'Delete',
              danger: true
            }).then(function (yes) {
              if (!yes) return;
              items.clear();
              render();
            });
          }
        })
      ])
    );

    render();
  }
});
