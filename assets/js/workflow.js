/* ==========================================================================
   Creative Assistance — Workflow board
   Projects, tasks, and moving tasks between stages (drag or buttons).
   ========================================================================== */
(function (window, document) {
  'use strict';

  var CA = window.CA;
  var UI = CA.ui;
  var el = UI.el;

  var projects = [];
  var tasks = [];
  var filter = null;      // project id, or null for "all"
  var editingId = null;   // task being edited, if any

  var dom = {};

  CA.start('workflow', function () {
    [
      'addProjectBtn', 'projectForm', 'projectName', 'cancelProject', 'projectChips',
      'taskForm', 'taskTitle', 'taskProject', 'taskStage', 'taskPriority', 'taskDue',
      'taskNotes', 'taskSubmit', 'taskHint', 'boardHost', 'boardSummary', 'clearDoneBtn'
    ].forEach(function (id) { dom[id] = document.getElementById(id); });

    projects = CA.data.projects();
    tasks = CA.data.tasks();
    filter = CA.storage.get('ui.projectFilter', null);
    if (filter && !projects.some(function (p) { return p.id === filter; })) filter = null;

    fillSelect(dom.taskStage, CA.STAGES);
    fillSelect(dom.taskPriority, CA.PRIORITIES);
    dom.taskPriority.value = 'normal';

    wireProjects();
    wireTasks();
    renderAll();
  });

  function fillSelect(select, items) {
    UI.clear(select);
    items.forEach(function (i) {
      select.appendChild(el('option', { value: i.id, text: i.label }));
    });
  }

  function save() {
    CA.data.saveProjects(projects);
    CA.data.saveTasks(tasks);
  }

  function renderAll() {
    renderProjectChips();
    renderProjectOptions();
    renderBoard();
  }

  /* -------------------------------------------------------------- projects */

  function wireProjects() {
    dom.addProjectBtn.addEventListener('click', function () {
      dom.projectForm.hidden = false;
      dom.projectName.focus();
    });

    dom.cancelProject.addEventListener('click', function () {
      dom.projectForm.hidden = true;
      dom.projectName.value = '';
    });

    dom.projectForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = dom.projectName.value.trim();
      if (!name) return;

      var taken = projects.some(function (p) { return p.name.toLowerCase() === name.toLowerCase(); });
      if (taken) { UI.toast('You already have a project with that name.'); return; }

      var project = {
        id: UI.id('proj'),
        name: name,
        color: CA.PROJECT_COLORS[projects.length % CA.PROJECT_COLORS.length],
        createdAt: new Date().toISOString()
      };
      projects.push(project);
      save();

      dom.projectName.value = '';
      dom.projectForm.hidden = true;
      filter = project.id;
      CA.storage.set('ui.projectFilter', filter);
      renderAll();
      dom.taskProject.value = project.id;
      UI.toast('Project "' + project.name + '" added.');
    });
  }

  function renderProjectChips() {
    var host = UI.clear(dom.projectChips);

    if (!projects.length) {
      host.appendChild(el('p', { class: 'muted small', text: 'No projects yet. Add one to begin.' }));
      return;
    }

    host.appendChild(el('button', {
      class: 'project-chip', type: 'button',
      'aria-pressed': String(filter === null),
      onclick: function () { setFilter(null); }
    }, ['All projects ', el('span', { class: 'n', text: String(tasks.length) })]));

    projects.forEach(function (p) {
      var mine = tasks.filter(function (t) { return t.projectId === p.id; });
      host.appendChild(el('button', {
        class: 'project-chip', type: 'button',
        'aria-pressed': String(filter === p.id),
        onclick: function () { setFilter(p.id); }
      }, [
        el('span', { class: 'swatch', style: { background: p.color } }),
        p.name + ' ',
        el('span', { class: 'n', text: String(mine.length) })
      ]));
    });

    if (filter) {
      var current = projects.filter(function (p) { return p.id === filter; })[0];
      host.appendChild(el('button', {
        class: 'btn btn-sm btn-danger', type: 'button',
        text: 'Delete "' + current.name + '"',
        onclick: function () { deleteProject(current); }
      }));
    }
  }

  function setFilter(id) {
    filter = id;
    CA.storage.set('ui.projectFilter', id);
    renderAll();
  }

  function deleteProject(project) {
    var mine = tasks.filter(function (t) { return t.projectId === project.id; });
    var message = mine.length
      ? 'Delete "' + project.name + '" and its ' + mine.length + ' task' + (mine.length === 1 ? '' : 's') + '?\n\nThis cannot be undone.'
      : 'Delete the project "' + project.name + '"?';
    if (!window.confirm(message)) return;

    projects = projects.filter(function (p) { return p.id !== project.id; });
    tasks = tasks.filter(function (t) { return t.projectId !== project.id; });
    if (filter === project.id) filter = null;
    CA.storage.set('ui.projectFilter', filter);
    save();
    if (editingId && !tasks.some(function (t) { return t.id === editingId; })) resetTaskForm();
    renderAll();
    UI.toast('Project deleted.');
  }

  function renderProjectOptions() {
    var keep = dom.taskProject.value;
    UI.clear(dom.taskProject);

    if (!projects.length) {
      dom.taskProject.appendChild(el('option', { value: '', text: 'No projects yet' }));
      dom.taskProject.disabled = true;
      dom.taskSubmit.disabled = true;
      dom.taskTitle.disabled = true;
      dom.taskHint.textContent = 'Add a project above, then you can add tasks to it.';
      return;
    }

    dom.taskProject.disabled = false;
    dom.taskSubmit.disabled = false;
    dom.taskTitle.disabled = false;
    dom.taskHint.textContent = editingId
      ? 'Editing a task — save your changes or cancel.'
      : 'Tasks appear on the board below.';

    projects.forEach(function (p) {
      dom.taskProject.appendChild(el('option', { value: p.id, text: p.name }));
    });

    var preferred = keep || filter || projects[0].id;
    if (projects.some(function (p) { return p.id === preferred; })) dom.taskProject.value = preferred;
  }

  /* ----------------------------------------------------------------- tasks */

  function wireTasks() {
    dom.taskForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var title = dom.taskTitle.value.trim();
      if (!title || !dom.taskProject.value) return;

      if (editingId) {
        tasks.forEach(function (t) {
          if (t.id !== editingId) return;
          t.title = title;
          t.projectId = dom.taskProject.value;
          t.stage = dom.taskStage.value;
          t.priority = dom.taskPriority.value;
          t.due = dom.taskDue.value || '';
          t.notes = dom.taskNotes.value.trim();
        });
        UI.toast('Task updated.');
      } else {
        tasks.push({
          id: UI.id('task'),
          projectId: dom.taskProject.value,
          title: title,
          notes: dom.taskNotes.value.trim(),
          stage: dom.taskStage.value,
          priority: dom.taskPriority.value,
          due: dom.taskDue.value || '',
          createdAt: new Date().toISOString()
        });
        UI.toast('Task added.');
      }

      save();
      resetTaskForm();
      renderAll();
    });

    dom.taskForm.addEventListener('reset', function () {
      window.setTimeout(function () { resetTaskForm(); renderProjectOptions(); }, 0);
    });
  }

  function resetTaskForm() {
    editingId = null;
    dom.taskTitle.value = '';
    dom.taskNotes.value = '';
    dom.taskDue.value = '';
    dom.taskPriority.value = 'normal';
    dom.taskStage.value = CA.STAGES[0].id;
    dom.taskSubmit.textContent = 'Add task';
  }

  function startEdit(task) {
    editingId = task.id;
    dom.taskTitle.value = task.title;
    dom.taskNotes.value = task.notes || '';
    dom.taskDue.value = task.due || '';
    dom.taskPriority.value = task.priority || 'normal';
    dom.taskStage.value = task.stage;
    dom.taskProject.value = task.projectId;
    dom.taskSubmit.textContent = 'Save changes';
    dom.taskHint.textContent = 'Editing a task — save your changes or press Clear.';
    dom.taskTitle.focus();
    dom.taskForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function moveTask(task, direction) {
    var order = CA.STAGES.map(function (s) { return s.id; });
    var next = order.indexOf(task.stage) + direction;
    if (next < 0 || next >= order.length) return;
    task.stage = order[next];
    save();
    renderBoard();
  }

  function deleteTask(task) {
    tasks = tasks.filter(function (t) { return t.id !== task.id; });
    if (editingId === task.id) resetTaskForm();
    save();
    renderAll();
    UI.toast('Task deleted.');
  }

  /* ----------------------------------------------------------------- board */

  function renderBoard() {
    var host = UI.clear(dom.boardHost);

    var visible = filter
      ? tasks.filter(function (t) { return t.projectId === filter; })
      : tasks.slice();

    var doneCount = visible.filter(function (t) { return t.stage === 'done'; }).length;
    dom.clearDoneBtn.hidden = doneCount === 0;
    dom.clearDoneBtn.onclick = function () {
      if (!window.confirm('Remove the ' + doneCount + ' finished task' + (doneCount === 1 ? '' : 's') + ' from the Done column?')) return;
      tasks = tasks.filter(function (t) {
        if (t.stage !== 'done') return true;
        return filter ? t.projectId !== filter : false;
      });
      save();
      renderAll();
      UI.toast('Done column cleared.');
    };

    dom.boardSummary.textContent = visible.length
      ? visible.length + (visible.length === 1 ? ' task' : ' tasks') + ' · ' + doneCount + ' done'
      : '';

    if (!projects.length) {
      host.appendChild(el('div', { class: 'empty' }, [
        el('strong', { text: 'Your board is empty' }),
        el('p', { text: 'Add a project above and the four stage columns will appear here.' })
      ]));
      return;
    }

    var byId = {};
    projects.forEach(function (p) { byId[p.id] = p; });

    var board = el('div', { class: 'board' });

    CA.STAGES.forEach(function (stage, index) {
      var inStage = visible.filter(function (t) { return t.stage === stage.id; });
      var body = el('div', { class: 'column-body' });

      if (!inStage.length) {
        body.appendChild(el('div', { class: 'column-empty', text: 'Nothing here' }));
      } else {
        sortTasks(inStage).forEach(function (task) {
          body.appendChild(taskCard(task, byId[task.projectId], index));
        });
      }

      var column = el('div', {
        class: 'column',
        dataset: { stage: stage.id },
        ondragover: function (event) {
          event.preventDefault();
          column.classList.add('drag-over');
        },
        ondragleave: function () { column.classList.remove('drag-over'); },
        ondrop: function (event) {
          event.preventDefault();
          column.classList.remove('drag-over');
          var id = event.dataTransfer.getData('text/plain');
          var moved = false;
          tasks.forEach(function (t) {
            if (t.id === id && t.stage !== stage.id) { t.stage = stage.id; moved = true; }
          });
          if (moved) { save(); renderBoard(); }
        }
      }, [
        el('div', { class: 'column-head' }, [
          el('span', { class: 'badge-dot', style: { background: stage.accent } }),
          el('span', { text: stage.label }),
          el('span', { class: 'count', text: String(inStage.length) })
        ]),
        body
      ]);

      board.appendChild(column);
    });

    host.appendChild(board);
  }

  /** High priority first, then by due date, then newest last. */
  function sortTasks(list) {
    var rank = { high: 0, normal: 1, low: 2 };
    return list.sort(function (a, b) {
      var pa = rank[a.priority] === undefined ? 1 : rank[a.priority];
      var pb = rank[b.priority] === undefined ? 1 : rank[b.priority];
      if (pa !== pb) return pa - pb;
      var da = UI.parseDate(a.due);
      var db = UI.parseDate(b.due);
      if (da && db && da - db !== 0) return da - db;
      if (da && !db) return -1;
      if (!da && db) return 1;
      return String(a.createdAt).localeCompare(String(b.createdAt));
    });
  }

  function taskCard(task, project, stageIndex) {
    var due = task.due ? UI.daysUntil(task.due) : null;
    var priority = task.priority || 'normal';

    var card = el('div', {
      class: 'task',
      draggable: 'true',
      style: project ? { borderLeftColor: project.color } : null,
      ondragstart: function (event) {
        event.dataTransfer.setData('text/plain', task.id);
        event.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
      },
      ondragend: function () { card.classList.remove('dragging'); }
    }, [
      el('div', { class: 'task-title', text: task.title }),
      task.notes ? el('div', { class: 'task-notes', text: task.notes }) : null,

      el('div', { class: 'task-meta' }, [
        project ? el('span', { class: 'badge task-project' }, [
          el('span', { class: 'badge-dot', style: { background: project.color } }),
          project.name
        ]) : null,
        priority !== 'normal' ? el('span', {
          class: 'badge badge-' + priority,
          text: priority === 'high' ? 'High' : 'Low'
        }) : null,
        task.due && task.stage !== 'done' ? el('span', {
          class: 'badge ' + (due < 0 ? 'badge-over' : due <= 2 ? 'badge-due' : ''),
          text: UI.describeDue(task.due)
        }) : null
      ]),

      el('div', { class: 'task-actions' }, [
        el('button', {
          class: 'btn btn-icon btn-sm', type: 'button',
          title: 'Move left', 'aria-label': 'Move "' + task.title + '" back a stage',
          disabled: stageIndex === 0,
          html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
          onclick: function () { moveTask(task, -1); }
        }),
        el('button', {
          class: 'btn btn-icon btn-sm', type: 'button',
          title: 'Move right', 'aria-label': 'Move "' + task.title + '" on a stage',
          disabled: stageIndex === CA.STAGES.length - 1,
          html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
          onclick: function () { moveTask(task, 1); }
        }),
        el('span', { class: 'grow' }),
        el('button', {
          class: 'btn btn-icon btn-sm', type: 'button',
          title: 'Edit', 'aria-label': 'Edit "' + task.title + '"',
          html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
          onclick: function () { startEdit(task); }
        }),
        el('button', {
          class: 'btn btn-icon btn-sm btn-danger', type: 'button',
          title: 'Delete', 'aria-label': 'Delete "' + task.title + '"',
          html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
          onclick: function () { deleteTask(task); }
        })
      ])
    ]);

    return card;
  }

})(window, document);
