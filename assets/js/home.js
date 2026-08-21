/* ==========================================================================
   Creative Assistance — Home page
   Shows counts, what is due soon, the project list, and backup tools.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var CA = window.CA;
  var UI = CA.ui;
  var el = UI.el;

  CA.start('home', function () {
    render();
    wireBackup();
    storageNote();

    // If another tab changes the data, refresh what we show.
    window.addEventListener('storage', render);
  });

  /* ------------------------------------------------------------- rendering */

  function render() {
    var projects = CA.data.projects();
    var tasks = CA.data.tasks();
    renderStats(projects, tasks);
    renderUpcoming(projects, tasks);
    renderProjects(projects, tasks);
  }

  function renderStats(projects, tasks) {
    var host = UI.clear(document.getElementById('statGrid'));

    var open = tasks.filter(function (t) { return t.stage !== 'done'; }).length;
    var done = tasks.filter(function (t) { return t.stage === 'done'; }).length;
    var overdue = tasks.filter(function (t) {
      if (t.stage === 'done' || !t.due) return false;
      var n = UI.daysUntil(t.due);
      return n !== null && n < 0;
    }).length;

    var pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

    [
      { value: projects.length, label: projects.length === 1 ? 'Project' : 'Projects' },
      { value: open, label: 'Tasks to do' },
      { value: done, label: 'Completed', bar: pct },
      { value: overdue, label: 'Overdue', danger: overdue > 0 }
    ].forEach(function (s) {
      host.appendChild(el('div', { class: 'stat' }, [
        el('div', {
          class: 'stat-value',
          text: String(s.value),
          style: s.danger ? { color: 'var(--danger)' } : null
        }),
        el('div', { class: 'stat-label', text: s.label }),
        s.bar === undefined ? null : el('div', { class: 'stat-bar' }, [
          el('span', { style: { width: s.bar + '%' } })
        ])
      ]));
    });
  }

  function renderUpcoming(projects, tasks) {
    var host = UI.clear(document.getElementById('upcoming'));

    var dated = tasks
      .filter(function (t) { return t.stage !== 'done' && UI.parseDate(t.due); })
      .sort(function (a, b) { return UI.parseDate(a.due) - UI.parseDate(b.due); })
      .slice(0, 5);

    if (!dated.length) {
      host.appendChild(el('div', { class: 'empty' }, [
        el('strong', { text: 'Nothing scheduled' }),
        el('p', { text: 'Give a task a date on the Workflow board and it will show up here.' })
      ]));
      return;
    }

    var byId = {};
    projects.forEach(function (p) { byId[p.id] = p; });

    var list = el('div', { class: 'stack' });
    dated.forEach(function (t) {
      var n = UI.daysUntil(t.due);
      var project = byId[t.projectId];
      list.appendChild(el('div', { class: 'note-item' }, [
        el('div', { class: 'row-between' }, [
          el('span', { class: 'task-title grow', text: t.title }),
          el('span', {
            class: 'badge ' + (n < 0 ? 'badge-over' : n <= 2 ? 'badge-due' : ''),
            text: UI.describeDue(t.due)
          })
        ]),
        project ? el('div', { class: 'task-meta' }, [
          el('span', { class: 'badge' }, [
            el('span', { class: 'badge-dot', style: { background: project.color } }),
            project.name
          ])
        ]) : null
      ]));
    });
    host.appendChild(list);
  }

  function renderProjects(projects, tasks) {
    var host = UI.clear(document.getElementById('projectList'));

    if (!projects.length) {
      host.appendChild(el('div', { class: 'empty' }, [
        el('strong', { text: 'No projects yet' }),
        el('p', { text: 'Create your first project on the Workflow board to get started.' }),
        el('a', { class: 'btn btn-primary btn-sm', href: 'workflow.html', text: 'Create a project', style: { marginTop: '14px' } })
      ]));
      return;
    }

    var list = el('div', { class: 'stack' });
    projects.slice(0, 6).forEach(function (p) {
      var mine = tasks.filter(function (t) { return t.projectId === p.id; });
      var done = mine.filter(function (t) { return t.stage === 'done'; }).length;
      var pct = mine.length ? Math.round((done / mine.length) * 100) : 0;

      list.appendChild(el('div', { class: 'note-item' }, [
        el('div', { class: 'row-between' }, [
          el('span', { class: 'row grow', style: { gap: '8px' } }, [
            el('span', { class: 'badge-dot', style: { background: p.color, width: '10px', height: '10px', flex: '0 0 10px' } }),
            el('span', { class: 'task-title', text: p.name })
          ]),
          el('span', { class: 'small muted', text: mine.length ? done + ' of ' + mine.length + ' done' : 'No tasks' })
        ]),
        el('div', { class: 'stat-bar', style: { marginTop: '9px' } }, [
          el('span', { style: { width: pct + '%', background: p.color } })
        ])
      ]));
    });

    if (projects.length > 6) {
      list.appendChild(el('p', { class: 'small muted', text: '+ ' + (projects.length - 6) + ' more on the board' }));
    }
    host.appendChild(list);
  }

  /* ---------------------------------------------------------------- backup */

  function wireBackup() {
    var file = document.getElementById('importFile');

    document.getElementById('exportBtn').addEventListener('click', function () {
      var stamp = new Date().toISOString().slice(0, 10);
      UI.download('creative-assistance-backup-' + stamp + '.json',
        JSON.stringify(CA.data.exportAll(), null, 2));
      UI.toast('Backup saved to your downloads.');
    });

    document.getElementById('importBtn').addEventListener('click', function () {
      file.click();
    });

    file.addEventListener('change', function () {
      var chosen = file.files && file.files[0];
      if (!chosen) return;

      var reader = new FileReader();
      reader.onload = function () {
        try {
          CA.data.importAll(JSON.parse(String(reader.result)));
          render();
          UI.toast('Backup restored.');
        } catch (e) {
          UI.toast(e && e.message ? e.message : 'That file could not be read.');
        }
        file.value = '';
      };
      reader.onerror = function () {
        UI.toast('That file could not be read.');
        file.value = '';
      };
      reader.readAsText(chosen);
    });

    document.getElementById('resetBtn').addEventListener('click', function () {
      var ok = window.confirm(
        'This deletes every project, task, note and list saved in this browser.\n\n' +
        'This cannot be undone. Continue?'
      );
      if (!ok) return;
      CA.data.clearAll();
      render();
      UI.toast('Everything cleared.');
    });
  }

  function storageNote() {
    var note = document.getElementById('storageNote');
    note.textContent = CA.storage.available
      ? 'Saved automatically in this browser. Clearing your browsing data will remove it, so keep a backup.'
      : 'This browser is blocking storage, so anything you add will be lost when you close the tab.';
  }

})(window, document);
