/* ==========================================================================
   Dashboard — the overview page, plus backup and restore.
   ========================================================================== */
CA.App.page('dashboard', function () {
  'use strict';

  var UI = CA.UI;
  var el = UI.el;
  var projects = CA.Store.collection('projects');
  var tasks = CA.Store.collection('tasks');

  var refs = {
    stats: UI.qs('#stats'),
    attention: UI.qs('#attention'),
    projectList: UI.qs('#projectList'),
    dataPanel: UI.qs('#dataPanel')
  };

  /* ---- Numbers at the top ---------------------------------------------- */

  function renderStats() {
    var allTasks = tasks.all();
    var done = allTasks.filter(function (t) { return t.stage === 'done'; }).length;
    var openTasks = allTasks.length - done;
    var pct = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0;

    var overdue = allTasks.filter(function (t) {
      if (t.stage === 'done' || !t.due) return false;
      var d = UI.daysUntil(t.due);
      return d !== null && d < 0;
    }).length;

    var cards = [
      { label: 'Projects', value: projects.count(), hint: projects.count() === 1 ? 'project on the go' : 'projects on the go' },
      { label: 'Open tasks', value: openTasks, hint: openTasks === 1 ? 'task still to do' : 'tasks still to do' },
      { label: 'Completed', value: done, hint: pct + '% of everything' },
      { label: 'Overdue', value: overdue, hint: overdue ? 'needs attention' : 'nothing late' }
    ];

    refs.stats.innerHTML = '';
    cards.forEach(function (c) {
      refs.stats.appendChild(
        el('div', { class: 'stat' }, [
          el('div', { class: 'stat__label', text: c.label }),
          el('div', { class: 'stat__value', text: String(c.value) }),
          el('div', { class: 'stat__hint', text: c.hint })
        ])
      );
    });
  }

  /* ---- What needs looking at ------------------------------------------- */

  function renderAttention() {
    refs.attention.innerHTML = '';

    var upcoming = tasks.all().filter(function (t) {
      return t.stage !== 'done' && t.due;
    }).map(function (t) {
      t._days = UI.daysUntil(t.due);
      return t;
    }).filter(function (t) {
      return t._days !== null && t._days <= 7;
    }).sort(function (a, b) { return a._days - b._days; }).slice(0, 6);

    var body;
    if (!upcoming.length) {
      body = el('p', { class: 'dim small mb-0', text: 'Nothing is due in the next week. Add due dates on the Workflow page to see reminders here.' });
    } else {
      body = el('ul', { class: 'list' }, upcoming.map(function (t) {
        var project = projects.find(t.projectId);
        var label, cls;
        if (t._days < 0) { label = Math.abs(t._days) + (Math.abs(t._days) === 1 ? ' day late' : ' days late'); cls = 'badge badge--overdue'; }
        else if (t._days === 0) { label = 'Due today'; cls = 'badge badge--due'; }
        else { label = 'In ' + t._days + (t._days === 1 ? ' day' : ' days'); cls = 'badge badge--due'; }

        return el('li', { class: 'list__item' }, [
          el('div', { class: 'list__item__main' }, [
            el('div', { class: 'list__item__title', text: t.title }),
            el('div', { class: 'list__item__sub', text: project ? project.name : 'No project' })
          ]),
          el('span', { class: cls, text: label })
        ]);
      }));
    }

    refs.attention.appendChild(
      el('div', { class: 'card' }, [
        el('div', { class: 'card__title' }, [
          el('h2', { text: 'Coming up' }),
          el('a', { class: 'btn btn--ghost btn--sm', href: 'workflow.html', text: 'Open Workflow' })
        ]),
        body
      ])
    );
  }

  /* ---- Project overview ------------------------------------------------ */

  function renderProjects() {
    refs.projectList.innerHTML = '';
    var all = projects.all();

    if (!all.length) {
      refs.projectList.appendChild(
        el('div', { style: 'grid-column:1/-1' }, [
          UI.emptyState(
            'No projects yet',
            'Head to the Workflow page to create your first project and start adding tasks.',
            'Go to Workflow',
            function () { window.location.href = 'workflow.html'; }
          )
        ])
      );
      return;
    }

    all.sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });

    all.forEach(function (p) {
      var mine = tasks.where(function (t) { return t.projectId === p.id; });
      var done = mine.filter(function (t) { return t.stage === 'done'; }).length;
      var pct = mine.length ? Math.round((done / mine.length) * 100) : 0;

      refs.projectList.appendChild(
        el('a', {
          class: 'card project',
          href: 'workflow.html',
          style: '--project-color:' + (p.color || '#6366f1') + ';color:inherit;text-decoration:none'
        }, [
          el('div', { class: 'project__head' }, [el('div', { class: 'project__name', text: p.name })]),
          p.description ? el('p', { class: 'project__desc', text: p.description }) : null,
          el('div', { class: 'project__stats' }, [
            el('span', { text: mine.length ? done + ' of ' + mine.length + ' done' : 'No tasks yet' }),
            el('span', { text: pct + '%' })
          ]),
          el('div', { class: 'progress' }, [el('div', { class: 'progress__bar', style: 'width:' + pct + '%' })])
        ])
      );
    });
  }

  /* ---- Backup and restore --------------------------------------------- */

  function renderDataPanel() {
    refs.dataPanel.innerHTML = '';

    var usage = CA.Storage.usageKB();
    var fileInput = el('input', { type: 'file', accept: '.json,application/json', class: 'visually-hidden' });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var bundle;
        try {
          bundle = JSON.parse(String(reader.result));
        } catch (e) {
          UI.toast('That file could not be read. Make sure it is a backup file.', 'error', 5000);
          fileInput.value = '';
          return;
        }
        UI.confirm({
          title: 'Restore this backup?',
          message: 'Your current projects, tasks and notes will be replaced by the contents of this file.',
          confirmLabel: 'Restore',
          danger: true
        }).then(function (yes) {
          fileInput.value = '';
          if (!yes) return;
          var result = CA.Storage.importAll(bundle, 'replace');
          if (!result.ok) { UI.toast(result.error, 'error', 5000); return; }
          CA.Store.resetCache();
          UI.toast('Backup restored.', 'success');
          renderAll();
        });
      };
      reader.onerror = function () {
        UI.toast('That file could not be read.', 'error');
        fileInput.value = '';
      };
      reader.readAsText(file);
    });

    function backup() {
      var stamp = new Date().toISOString().slice(0, 10);
      UI.downloadJSON('creative-assistance-backup-' + stamp + '.json', CA.Storage.exportAll());
      UI.toast('Backup file saved to your downloads.', 'success');
    }

    function eraseAll() {
      UI.confirm({
        title: 'Erase everything?',
        message: 'This permanently removes all projects, tasks and notes from this device. Consider saving a backup first.',
        confirmLabel: 'Erase everything',
        danger: true
      }).then(function (yes) {
        if (!yes) return;
        CA.Storage.clearAll();
        CA.Store.resetCache();
        UI.toast('All data erased.', 'success');
        renderAll();
      });
    }

    refs.dataPanel.appendChild(
      el('div', { class: 'card' }, [
        el('div', { class: 'card__title' }, [el('h2', { text: 'Your data' })]),
        el('p', { class: 'muted small' }, [
          document.createTextNode(
            'Everything you create stays inside this browser on this device — it is never sent anywhere. ' +
            'That also means clearing your browser data will remove it, so save a backup now and then. '
          ),
          el('strong', { text: 'Currently using about ' + usage + ' KB.' })
        ]),
        el('div', { class: 'row mt-4' }, [
          el('button', { class: 'btn btn--primary', type: 'button', text: 'Save a backup', onclick: backup }),
          el('button', {
            class: 'btn btn--ghost', type: 'button', text: 'Restore a backup',
            onclick: function () { fileInput.click(); }
          }),
          el('button', { class: 'btn btn--ghost', type: 'button', text: 'Erase everything', onclick: eraseAll })
        ]),
        fileInput
      ])
    );
  }

  function renderAll() {
    renderStats();
    renderAttention();
    renderProjects();
    renderDataPanel();
  }

  renderAll();
});
