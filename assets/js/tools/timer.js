/* Focus Timer — a countdown for working in blocks, plus a session tally. */
CA.Tools.register({
  id: 'timer',
  name: 'Focus Timer',
  icon: 'clock',
  description: 'Work in focused blocks. Counts how many you finish today.',

  build: function (root, api) {
    var el = api.el;
    var stats = api.value('stats', { date: '', completed: 0 });

    var LENGTHS = [15, 25, 45];
    var minutes = 25;
    var remaining = minutes * 60;
    var ticker = null;

    var display = el('div', { class: 'timer__display', text: '25:00' });
    var tally = el('p', { class: 'dim small center mb-0' });

    function today() { return new Date().toISOString().slice(0, 10); }

    function readStats() {
      var s = stats.get() || { date: '', completed: 0 };
      if (s.date !== today()) s = { date: today(), completed: 0 };
      return s;
    }

    function renderTally() {
      var s = readStats();
      tally.textContent = s.completed
        ? s.completed + (s.completed === 1 ? ' block finished today' : ' blocks finished today')
        : 'No blocks finished yet today';
    }

    function paint() {
      var mins = Math.floor(remaining / 60);
      var secs = remaining % 60;
      display.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    function stop() {
      if (ticker) { window.clearInterval(ticker); ticker = null; }
      startBtn.textContent = 'Start';
    }

    function finish() {
      stop();
      remaining = 0;
      paint();
      var s = readStats();
      s.completed += 1;
      stats.set(s);
      renderTally();
      api.toast('Block finished. Take a break.', 'success', 5000);
      /* A short beep, if the browser allows it. */
      try {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          var ctx = new Ctx();
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = 660;
          gain.gain.setValueAtTime(0.14, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
          osc.start(); osc.stop(ctx.currentTime + 0.7);
        }
      } catch (e) { /* silence is fine */ }
    }

    function tick() {
      remaining -= 1;
      if (remaining <= 0) { finish(); return; }
      paint();
    }

    var startBtn = el('button', {
      class: 'btn btn--primary btn--sm', type: 'button', text: 'Start',
      onclick: function () {
        if (ticker) { stop(); return; }
        if (remaining <= 0) remaining = minutes * 60;
        ticker = window.setInterval(tick, 1000);
        startBtn.textContent = 'Pause';
        paint();
      }
    });

    var resetBtn = el('button', {
      class: 'btn btn--ghost btn--sm', type: 'button', text: 'Reset',
      onclick: function () { stop(); remaining = minutes * 60; paint(); }
    });

    var lengthChips = el('div', { class: 'chips', style: 'justify-content:center' },
      LENGTHS.map(function (m) {
        var chip = el('button', {
          class: 'chip' + (m === minutes ? ' is-active' : ''),
          type: 'button',
          text: m + ' min',
          onclick: function () {
            minutes = m;
            stop();
            remaining = minutes * 60;
            paint();
            Array.prototype.forEach.call(lengthChips.children, function (c) { c.classList.remove('is-active'); });
            chip.classList.add('is-active');
          }
        });
        return chip;
      })
    );

    root.appendChild(display);
    root.appendChild(el('div', { class: 'timer__actions' }, [startBtn, resetBtn]));
    root.appendChild(el('div', { class: 'mt-4' }, [lengthChips]));
    root.appendChild(el('div', { class: 'mt-4' }, [tally]));

    paint();
    renderTally();

    /* Don't leave a timer running after the card is torn down. */
    root.addEventListener('ca:teardown', stop);
  }
});
