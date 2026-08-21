/* Word & Character Counter — for captions, titles and briefs with limits. */
CA.Tools.register({
  id: 'counter',
  name: 'Word Counter',
  icon: 'hash',
  description: 'Paste any text to count words, characters, sentences and reading time.',
  wide: true,

  build: function (root, api) {
    var el = api.el;
    var saved = api.value('text', '');

    var input = el('textarea', {
      class: 'textarea',
      placeholder: 'Paste or type your text here…'
    });
    input.value = saved.get() || '';

    var cells = {};
    function cell(key, label) {
      var num = el('div', { class: 'counter-grid__num', text: '0' });
      cells[key] = num;
      return el('div', { class: 'counter-grid__cell' }, [num, el('div', { class: 'counter-grid__lbl', text: label })]);
    }

    var grid = el('div', { class: 'counter-grid' }, [
      cell('words', 'Words'),
      cell('chars', 'Characters'),
      cell('noSpaces', 'No spaces'),
      cell('sentences', 'Sentences'),
      cell('paragraphs', 'Paragraphs'),
      cell('readTime', 'Min to read')
    ]);

    function update() {
      var text = input.value;

      var words = text.trim() ? text.trim().split(/\s+/).length : 0;
      var chars = text.length;
      var noSpaces = text.replace(/\s/g, '').length;
      var sentences = text.trim() ? (text.match(/[^.!?]+[.!?]+/g) || [text]).length : 0;
      var paragraphs = text.trim()
        ? text.split(/\n{2,}/).filter(function (p) { return p.trim().length; }).length
        : 0;
      var readTime = Math.max(words ? 1 : 0, Math.round(words / 200));

      cells.words.textContent = words.toLocaleString();
      cells.chars.textContent = chars.toLocaleString();
      cells.noSpaces.textContent = noSpaces.toLocaleString();
      cells.sentences.textContent = sentences.toLocaleString();
      cells.paragraphs.textContent = paragraphs.toLocaleString();
      cells.readTime.textContent = String(readTime);
    }

    input.addEventListener('input', function () {
      update();
      persist();
    });

    var persist = api.debounce(function () { saved.set(input.value); }, 500);

    root.appendChild(input);
    root.appendChild(grid);
    root.appendChild(
      el('div', { class: 'row row--end mt-4' }, [
        el('button', {
          class: 'btn btn--ghost btn--sm', type: 'button', text: 'Clear',
          onclick: function () { input.value = ''; saved.set(''); update(); input.focus(); }
        })
      ])
    );

    update();
  }
});
