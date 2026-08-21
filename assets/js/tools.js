/* ==========================================================================
   Creative Assistance — Essential Tools
   Quick Notes · Word Counter · Focus Timer · Colour Palette · Checklist
   ========================================================================== */
(function (window, document) {
  'use strict';

  var CA = window.CA;
  var UI = CA.ui;
  var el = UI.el;

  var TOOLS = [
    { id: 'notes',     label: 'Quick Notes' },
    { id: 'counter',   label: 'Word Counter' },
    { id: 'timer',     label: 'Focus Timer' },
    { id: 'palette',   label: 'Colour Palette' },
    { id: 'checklist', label: 'Checklist' }
  ];

  CA.start('tools', function () {
    Notes.init();
    Counter.init();
    Timer.init();
    Palette.init();
    Checklist.init();
    tabs();
  });

  /* ------------------------------------------------------------------ tabs */

  function tabs() {
    var host = UI.clear(document.getElementById('toolNav'));
    var wanted = (window.location.hash || '').replace('#', '');
    var active = TOOLS.some(function (t) { return t.id === wanted; })
      ? wanted
      : CA.storage.get('ui.tool', TOOLS[0].id);
    if (!TOOLS.some(function (t) { return t.id === active; })) active = TOOLS[0].id;

    var buttons = {};

    TOOLS.forEach(function (tool) {
      buttons[tool.id] = el('button', {
        class: 'tool-tab', type: 'button', role: 'tab',
        id: 'tab-' + tool.id, text: tool.label,
        'aria-controls': 'panel-' + tool.id,
        onclick: function () { show(tool.id); }
      });
      host.appendChild(buttons[tool.id]);
    });

    function show(id) {
      TOOLS.forEach(function (tool) {
        var on = tool.id === id;
        buttons[tool.id].setAttribute('aria-selected', String(on));
        var panel = document.getElementById('panel-' + tool.id);
        if (panel) panel.hidden = !on;
      });
      CA.storage.set('ui.tool', id);
      if (id === 'timer') Timer.refresh();
    }

    show(active);

    window.addEventListener('hashchange', function () {
      var next = (window.location.hash || '').replace('#', '');
      if (TOOLS.some(function (t) { return t.id === next; })) show(next);
    });
  }

  /* ----------------------------------------------------------- Quick Notes */

  var Notes = {
    init: function () {
      this.form = document.getElementById('noteForm');
      this.input = document.getElementById('noteInput');
      this.list = document.getElementById('noteList');
      this.count = document.getElementById('noteCount');
      this.hint = document.getElementById('noteDraftHint');
      var self = this;

      this.input.value = CA.storage.get('notes.draft', '');

      // Keep whatever is half-typed, so a refresh does not lose it.
      var timer;
      this.input.addEventListener('input', function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          CA.storage.set('notes.draft', self.input.value);
          self.hint.textContent = self.input.value.trim() ? 'Draft kept' : '';
        }, 400);
      });

      this.form.addEventListener('submit', function (event) {
        event.preventDefault();
        var body = self.input.value.trim();
        if (!body) { UI.toast('Type something first.'); return; }
        var notes = CA.storage.get('notes.items', []);
        notes.unshift({ id: UI.id('note'), body: body, at: new Date().toISOString() });
        CA.storage.set('notes.items', notes);
        self.input.value = '';
        CA.storage.remove('notes.draft');
        self.hint.textContent = '';
        self.render();
        UI.toast('Note saved.');
      });

      this.render();
    },

    render: function () {
      var self = this;
      var notes = CA.storage.get('notes.items', []);
      var host = UI.clear(this.list);

      this.count.textContent = notes.length
        ? notes.length + (notes.length === 1 ? ' note' : ' notes')
        : 'Empty';

      if (!notes.length) {
        host.appendChild(el('div', { class: 'empty' }, [
          el('strong', { text: 'No notes yet' }),
          el('p', { text: 'Anything you save appears here, newest first.' })
        ]));
        return;
      }

      notes.forEach(function (note) {
        host.appendChild(el('div', { class: 'note-item' }, [
          el('div', { class: 'body', text: note.body }),
          el('div', { class: 'row-between', style: { marginTop: '8px' } }, [
            el('span', { class: 'when', text: UI.formatWhen(note.at) }),
            el('span', { class: 'row', style: { gap: '2px' } }, [
              el('button', {
                class: 'btn btn-sm btn-ghost', type: 'button', text: 'Copy',
                onclick: function () { UI.copy(note.body); }
              }),
              el('button', {
                class: 'btn btn-sm btn-ghost btn-danger', type: 'button', text: 'Delete',
                onclick: function () {
                  CA.storage.set('notes.items', CA.storage.get('notes.items', []).filter(function (n) {
                    return n.id !== note.id;
                  }));
                  self.render();
                  UI.toast('Note deleted.');
                }
              })
            ])
          ])
        ]));
      });
    }
  };

  /* ---------------------------------------------------------- Word Counter */

  var Counter = {
    init: function () {
      this.input = document.getElementById('counterInput');
      this.stats = document.getElementById('counterStats');
      var self = this;

      this.input.value = CA.storage.get('counter.text', '');

      var timer;
      this.input.addEventListener('input', function () {
        self.render();
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          CA.storage.set('counter.text', self.input.value);
        }, 500);
      });

      document.getElementById('counterClear').addEventListener('click', function () {
        self.input.value = '';
        CA.storage.remove('counter.text');
        self.render();
        self.input.focus();
      });

      document.getElementById('counterCopy').addEventListener('click', function () {
        var text = self.input.value;
        if (!text.trim()) { UI.toast('There is nothing to copy.'); return; }
        UI.copy(text);
      });

      this.render();
    },

    render: function () {
      var text = this.input.value;
      var trimmed = text.trim();

      var words = trimmed ? trimmed.split(/\s+/).length : 0;
      var chars = text.length;
      var noSpaces = text.replace(/\s/g, '').length;
      var sentences = trimmed ? (trimmed.match(/[^.!?]+[.!?]*/g) || []).length : 0;
      var paragraphs = trimmed ? trimmed.split(/\n{2,}/).filter(function (p) { return p.trim(); }).length : 0;

      // Average reading pace, about 200 words a minute.
      var mins = words / 200;
      var reading = words === 0 ? '—'
        : mins < 1 ? 'under 1 min'
        : Math.round(mins) + ' min';

      var host = UI.clear(this.stats);
      [
        { n: words, l: 'Words' },
        { n: chars, l: 'Characters' },
        { n: noSpaces, l: 'No spaces' },
        { n: sentences, l: 'Sentences' },
        { n: paragraphs, l: 'Paragraphs' },
        { n: reading, l: 'Reading time' }
      ].forEach(function (s) {
        host.appendChild(el('div', { class: 'count-box' }, [
          el('b', { text: typeof s.n === 'number' ? s.n.toLocaleString() : s.n }),
          el('span', { text: s.l })
        ]));
      });
    }
  };

  /* ----------------------------------------------------------- Focus Timer */

  var Timer = {
    init: function () {
      var self = this;
      this.display = document.getElementById('timerDisplay');
      this.bar = document.getElementById('timerBar');
      this.modeBadge = document.getElementById('timerMode');
      this.roundsBadge = document.getElementById('timerRounds');
      this.startBtn = document.getElementById('timerStart');
      this.resetBtn = document.getElementById('timerReset');
      this.skipBtn = document.getElementById('timerSkip');
      this.focusInput = document.getElementById('focusMins');
      this.breakInput = document.getElementById('breakMins');

      var saved = CA.storage.get('timer.settings', { focus: 25, brk: 5 });
      this.focusMins = clamp(saved.focus, 1, 180, 25);
      this.breakMins = clamp(saved.brk, 1, 60, 5);
      this.focusInput.value = this.focusMins;
      this.breakInput.value = this.breakMins;

      this.mode = 'focus';
      this.running = false;
      this.remaining = this.focusMins * 60;
      this.endAt = 0;
      this.rounds = CA.storage.get('timer.rounds', 0);

      this.startBtn.addEventListener('click', function () {
        if (self.running) self.pause(); else self.start();
      });
      this.resetBtn.addEventListener('click', function () { self.reset(); });
      this.skipBtn.addEventListener('click', function () { self.switchMode(true); });

      var onSetting = function () {
        self.focusMins = clamp(self.focusInput.value, 1, 180, 25);
        self.breakMins = clamp(self.breakInput.value, 1, 60, 5);
        self.focusInput.value = self.focusMins;
        self.breakInput.value = self.breakMins;
        CA.storage.set('timer.settings', { focus: self.focusMins, brk: self.breakMins });
        if (!self.running) self.reset();
      };
      this.focusInput.addEventListener('change', onSetting);
      this.breakInput.addEventListener('change', onSetting);

      this.refresh();
    },

    total: function () {
      return (this.mode === 'focus' ? this.focusMins : this.breakMins) * 60;
    },

    start: function () {
      var self = this;
      this.running = true;
      this.endAt = Date.now() + this.remaining * 1000;
      this.startBtn.textContent = 'Pause';
      this.display.setAttribute('aria-live', 'off');

      this.tick = window.setInterval(function () {
        self.remaining = Math.max(0, Math.round((self.endAt - Date.now()) / 1000));
        self.refresh();
        if (self.remaining <= 0) self.finish();
      }, 250);
    },

    pause: function () {
      this.running = false;
      window.clearInterval(this.tick);
      this.startBtn.textContent = 'Start';
      this.refresh();
    },

    reset: function () {
      this.pause();
      this.remaining = this.total();
      this.refresh();
    },

    finish: function () {
      this.pause();
      chime();
      if (this.mode === 'focus') {
        this.rounds += 1;
        CA.storage.set('timer.rounds', this.rounds);
        UI.toast('Focus session done — time for a break.');
      } else {
        UI.toast('Break over — ready for another round?');
      }
      this.switchMode(false);
    },

    switchMode: function (manual) {
      if (manual && this.running) this.pause();
      this.mode = this.mode === 'focus' ? 'break' : 'focus';
      this.remaining = this.total();
      this.refresh();
    },

    refresh: function () {
      if (!this.display) return;
      var total = this.total();
      var left = Math.min(this.remaining, total);
      var mins = Math.floor(left / 60);
      var secs = left % 60;
      var label = pad(mins) + ':' + pad(secs);

      this.display.textContent = label;
      this.bar.style.width = total ? (((total - left) / total) * 100) + '%' : '0%';
      this.modeBadge.textContent = this.mode === 'focus' ? 'Focus time' : 'Break time';
      this.modeBadge.className = 'badge ' + (this.mode === 'focus' ? 'badge-normal' : 'badge-due');
      this.roundsBadge.textContent = this.rounds
        ? this.rounds + (this.rounds === 1 ? ' session done' : ' sessions done')
        : 'No sessions yet';
      this.skipBtn.textContent = this.mode === 'focus' ? 'Skip to break' : 'Skip to focus';
      document.title = this.running
        ? label + ' — Creative Assistance'
        : 'Essential Tools — Creative Assistance';
    }
  };

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function clamp(value, min, max, fallback) {
    var n = parseInt(value, 10);
    if (isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  /** A short two-note chime, built on the fly so there is no audio file. */
  function chime() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      [0, 0.18].forEach(function (offset, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i === 0 ? 660 : 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.34);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.36);
      });
      window.setTimeout(function () { if (ctx.close) ctx.close(); }, 1200);
    } catch (e) { /* sound is a nicety, never a blocker */ }
  }

  /* --------------------------------------------------------- Colour Palette */

  var Palette = {
    init: function () {
      var self = this;
      this.host = document.getElementById('paletteHost');
      this.saved = document.getElementById('savedPalettes');
      this.mood = document.getElementById('paletteMood');
      this.mood.value = CA.storage.get('palette.mood', 'harmony');

      this.colors = CA.storage.get('palette.current', null) || this.make();

      document.getElementById('paletteNew').addEventListener('click', function () {
        self.colors = self.make();
        CA.storage.set('palette.current', self.colors);
        self.render();
      });

      this.mood.addEventListener('change', function () {
        CA.storage.set('palette.mood', self.mood.value);
        self.colors = self.make();
        CA.storage.set('palette.current', self.colors);
        self.render();
      });

      document.getElementById('paletteCopyAll').addEventListener('click', function () {
        UI.copy(self.colors.join(', '));
      });

      document.getElementById('paletteSave').addEventListener('click', function () {
        var list = CA.storage.get('palette.saved', []);
        if (list.length >= 12) list.pop();
        list.unshift({ id: UI.id('pal'), colors: self.colors.slice() });
        CA.storage.set('palette.saved', list);
        self.renderSaved();
        UI.toast('Palette kept.');
      });

      this.render();
      this.renderSaved();
    },

    /** Five colours generated around a random base hue. */
    make: function () {
      var mood = this.mood.value;
      var base = Math.floor(Math.random() * 360);
      var out = [];
      var i;

      if (mood === 'mono') {
        for (i = 0; i < 5; i++) out.push(hsl(base, 42 + i * 6, 88 - i * 15));
        return out;
      }
      if (mood === 'pastel') {
        for (i = 0; i < 5; i++) out.push(hsl((base + i * 34) % 360, 52, 84 - i * 3));
        return out;
      }
      if (mood === 'bold') {
        for (i = 0; i < 5; i++) out.push(hsl((base + i * 68) % 360, 84, 52 - i * 2));
        return out;
      }
      if (mood === 'warm') {
        for (i = 0; i < 5; i++) out.push(hsl((15 + i * 16 + Math.random() * 8) % 360, 74 - i * 4, 62 - i * 8));
        return out;
      }
      if (mood === 'cool') {
        for (i = 0; i < 5; i++) out.push(hsl((185 + i * 20 + Math.random() * 8) % 360, 62 - i * 3, 64 - i * 8));
        return out;
      }
      // harmony: base, two neighbours, plus a complement and a light tint
      var offsets = [0, 28, -28, 172, 14];
      var lights = [58, 66, 46, 60, 86];
      for (i = 0; i < 5; i++) {
        out.push(hsl((base + offsets[i] + 360) % 360, 58 + (i % 2 ? 10 : 0), lights[i]));
      }
      return out;
    },

    render: function () {
      var host = UI.clear(this.host);
      this.colors.forEach(function (hex) {
        host.appendChild(el('button', {
          class: 'swatch-card', type: 'button',
          'aria-label': 'Copy ' + hex,
          onclick: function () { UI.copy(hex); }
        }, [
          el('span', { class: 'fill', style: { background: hex, display: 'block' } }),
          el('span', { class: 'hex' }, [hex.toUpperCase(), el('small', { text: 'copy' })])
        ]));
      });
    },

    renderSaved: function () {
      var self = this;
      var list = CA.storage.get('palette.saved', []);
      var host = UI.clear(this.saved);
      if (!list.length) return;

      host.appendChild(el('h3', { class: 'small muted', text: 'Kept palettes', style: { marginBottom: '10px' } }));

      list.forEach(function (entry) {
        host.appendChild(el('div', { class: 'row-between', style: { marginBottom: '8px' } }, [
          el('span', { class: 'row', style: { gap: '4px' } }, entry.colors.map(function (hex) {
            return el('button', {
              class: 'badge-dot', type: 'button', title: hex, 'aria-label': 'Copy ' + hex,
              style: { background: hex, width: '24px', height: '24px', borderRadius: '7px', border: '1px solid var(--border)', cursor: 'pointer', flex: '0 0 24px' },
              onclick: function () { UI.copy(hex); }
            });
          })),
          el('span', { class: 'row', style: { gap: '2px' } }, [
            el('button', {
              class: 'btn btn-sm btn-ghost', type: 'button', text: 'Use',
              onclick: function () {
                self.colors = entry.colors.slice();
                CA.storage.set('palette.current', self.colors);
                self.render();
              }
            }),
            el('button', {
              class: 'btn btn-sm btn-ghost btn-danger', type: 'button', text: 'Remove',
              onclick: function () {
                CA.storage.set('palette.saved', CA.storage.get('palette.saved', []).filter(function (p) {
                  return p.id !== entry.id;
                }));
                self.renderSaved();
              }
            })
          ])
        ]));
      });
    }
  };

  /** HSL to a #rrggbb string. */
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.min(100, Math.max(0, s)) / 100;
    l = Math.min(100, Math.max(0, l)) / 100;

    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var seg = Math.floor(h / 60) % 6;
    var rgb = [
      [c, x, 0], [x, c, 0], [0, c, x],
      [0, x, c], [x, 0, c], [c, 0, x]
    ][seg];

    return '#' + rgb.map(function (v) {
      var n = Math.round((v + m) * 255);
      return (n < 16 ? '0' : '') + Math.min(255, Math.max(0, n)).toString(16);
    }).join('');
  }

  /* ------------------------------------------------------------- Checklist */

  var Checklist = {
    init: function () {
      var self = this;
      this.form = document.getElementById('checkForm');
      this.input = document.getElementById('checkInput');
      this.list = document.getElementById('checkList');
      this.count = document.getElementById('checkCount');

      this.form.addEventListener('submit', function (event) {
        event.preventDefault();
        var text = self.input.value.trim();
        if (!text) return;
        var items = CA.storage.get('checklist.items', []);
        items.push({ id: UI.id('chk'), text: text, done: false });
        CA.storage.set('checklist.items', items);
        self.input.value = '';
        self.input.focus();
        self.render();
      });

      document.getElementById('checkClearDone').addEventListener('click', function () {
        var items = CA.storage.get('checklist.items', []);
        var left = items.filter(function (i) { return !i.done; });
        if (left.length === items.length) { UI.toast('Nothing is ticked yet.'); return; }
        CA.storage.set('checklist.items', left);
        self.render();
        UI.toast('Ticked items removed.');
      });

      document.getElementById('checkClearAll').addEventListener('click', function () {
        if (!CA.storage.get('checklist.items', []).length) return;
        if (!window.confirm('Clear the whole checklist?')) return;
        CA.storage.set('checklist.items', []);
        self.render();
      });

      this.render();
    },

    render: function () {
      var self = this;
      var items = CA.storage.get('checklist.items', []);
      var host = UI.clear(this.list);
      var done = items.filter(function (i) { return i.done; }).length;

      this.count.textContent = items.length ? done + ' of ' + items.length + ' done' : 'Empty';

      if (!items.length) {
        host.appendChild(el('div', { class: 'empty' }, [
          el('strong', { text: 'Nothing on the list' }),
          el('p', { text: 'Add your first item above.' })
        ]));
        return;
      }

      items.forEach(function (item) {
        var box = el('input', {
          type: 'checkbox', id: 'chk-' + item.id,
          checked: item.done ? true : null,
          onchange: function () {
            var all = CA.storage.get('checklist.items', []);
            all.forEach(function (i) { if (i.id === item.id) i.done = box.checked; });
            CA.storage.set('checklist.items', all);
            self.render();
          }
        });

        host.appendChild(el('div', { class: 'check-item' + (item.done ? ' done' : '') }, [
          box,
          el('label', { class: 'txt', for: 'chk-' + item.id, text: item.text }),
          el('button', {
            class: 'btn btn-icon btn-sm btn-ghost btn-danger', type: 'button',
            'aria-label': 'Remove "' + item.text + '"', title: 'Remove',
            html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
            onclick: function () {
              CA.storage.set('checklist.items', CA.storage.get('checklist.items', []).filter(function (i) {
                return i.id !== item.id;
              }));
              self.render();
            }
          })
        ]));
      });
    }
  };

})(window, document);
