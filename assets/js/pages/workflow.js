/* ==========================================================================
   Workflow page — projects and their tasks, saved on this device.
   ========================================================================== */
CA.App.page('workflow', function () {
  'use strict';

  var UI = CA.UI;
  var el = UI.el;
  var projects = CA.Store.collection('projects');
  var tasks = CA.Store.collection('tasks');
  var activeProject = CA.Store.value('activeProject', null);

  var filters = { text: '', priority: 'all' };
  var editingTaskId = null;

  var refs = {
    projectBar: UI.qs('#projectBar'),
    projectPanel: UI.qs('#projectPanel'),
    taskPanel: UI.qs('#taskPanel'),
    board: UI.qs('#board')
  };

  /* ---- Helpers ---------------------------------------------------------- */

  function stage(id) {
    for (var i = 0; i < CA.STAGES.length; i++) if (CA.STAGES[i].id === id) return CA.STAGES[i];
    return CA.STAGES[0];
  }

  function currentProject() {
    var id = activeProject.get();
    var found = id ? projects.find(id) : null;
    if (found) return found;
    var all = projects.all();
    if (!all.length) return null;
    activeProject.set(all[0].id);
    return all[0];
  }

  function projectTasks(projectId) {
    return tasks.where(function (t) { return t.projectId === projectId; });
  }

  function visibleTasks(projectId) {
    var text = filters.text.trim().toLowerCase();
    return projectTasks(projectId).filter(function (t) {
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (!text) return true;
      return (
        (t.title || '').toLowerCase().indexOf(text) > -1 ||
        (t.note || '').toLowerCase().indexOf(text) > -1
      );
    });
  }

  /* ---- Project switcher ------------------------------------------------- */

  function renderProjectBar() {
    var all = projects.all();
    var active = currentProject();
    refs.projectBar.innerHTML = '';

    if (!all.length) {
      refs.projectBar.appendChild(
        el('p', { class: 'dim small mb-0', text: 'No projects yet — create your first one below.' })
      );
      return;
    }

    var chips = all.map(function (p) {
      var count = projectTasks(p.id).length;
      return el('button', {
        class: 'chip' + (active && p.id === active.id ? ' is-active' : ''),
        type: 'button',
        text: p.name + ' (' + count + ')',
        onclick: function () {
          activeProject.set(p.id);
          editingTaskId = null;
          render();
        }
      });
    });

    refs.projectBar.appendChild(el('div', { class: 'chips' }, chips));
  }

  /* ---- Create / manage project ----------------------------------------- */

  function renderProjectPanel() {
    var active = currentProject();
    refs.projectPanel.innerHTML = '';

    var nameInput = el('input', { class: 'input', type: 'text', placeholder: 'Project name', maxlength: '80' });
    var descInput = el('input', { class: 'input', type: 'text', placeholder: 'Short description (optional)', maxlength: '160' });

    var colorSelect = el('select', { class: 'select', 'aria-label': 'Project colour' },
      CA.PROJECT_COLORS.map(function (c, i) {
        return el('option', { value: c, text: 'Colour ' + (i + 1) });
      })
    );

    function createProject() {
      var name = nameInput.value.trim();
      if (!name) {
        UI.toast('Give the project a name first.', 'error');
        nameInput.focus();
        return;
      }
      var created = projects.create({
        name: name,
        description: descInput.value.trim(),
        color: colorSelect.value
      });
      activeProject.set(created.id);
      nameInput.value = '';
      descInput.value = '';
      UI.toast('Project "' + created.name + '" created.', 'success');
      render();
    }

    nameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') createProject(); });
    descInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') createProject(); });

    var form = el('div', { class: 'card card--pad-sm' }, [
      el('h3', { class: 'mb-0', text: 'New project' }),
      el('p', { class: 'dim small', text: 'Group related work together.' }),
      el('div', { class: 'form-row mt-4' }, [
        el('div', { class: 'form-row__grow' }, [nameInput]),
        el('div', {}, [colorSelect])
      ]),
      el('div', { class: 'form-row mt-4' }, [el('div', { class: 'form-row__grow' }, [descInput])]),
      el('div', { class: 'row row--end mt-4' }, [
        el('button', { class: 'btn btn--primary', type: 'button', text: 'Create project', onclick: createProject })
      ])
    ]);

    refs.projectPanel.appendChild(form);

    if (!active) return;

    /* Details of the project currently being viewed. */
    var all = projectTasks(active.id);
    var done = all.filter(function (t) { return t.stage === 'done'; }).length;
    var pct = all.length ? Math.round((done / all.length) * 100) : 0;

    var renameInput = el('input', { class: 'input', type: 'text', value: active.name, maxlength: '80' });

    function saveRename() {
      var name = renameInput.value.trim();
      if (!name) { UI.toast('The name cannot be empty.', 'error'); return; }
      projects.update(active.id, { name: name });
      UI.toast('Project renamed.', 'success');
      render();
    }

    renameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveRename(); });

    function deleteProject() {
      UI.confirm({
        title: 'Delete "' + active.name + '"?',
        message: 'This also removes its ' + all.length + (all.length === 1 ? ' task' : ' tasks') + '. This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true
      }).then(function (yes) {
        if (!yes) return;
        tasks.removeWhere(function (t) { return t.projectId === active.id; });
        projects.remove(active.id);
        activeProject.set(null);
        UI.toast('Project deleted.', 'success');
        render();
      });
    }

    refs.projectPanel.appendChild(
      el('div', { class: 'card card--pad-sm mt-4', style: '--project-color:' + (active.color || '#6366f1') }, [
        el('h3', { class: 'mb-0', text: 'Current project' }),
        el('p', { class: 'dim small', text: 'You are viewing this project on the board.' }),
        el('div', { class: 'mt-4' }, [renameInput]),
        active.description ? el('p', { class: 'muted small mt-4 mb-0', text: active.description }) : null,
        el('div', { class: 'project__stats' }, [
          el('span', { text: done + ' of ' + all.length + ' done' }),
          el('span', { text: pct + '%' })
        ]),
        el('div', { class: 'progress' }, [el('div', { class: 'progress__bar', style: 'width:' + pct + '%' })]),
        el('div', { class: 'row mt-5' }, [
          el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Save name', onclick: saveRename }),
          el('button', { class: 'btn btn--danger btn--sm', type: 'button', text: 'Delete project', onclick: deleteProject })
        ])
      ])
    );
  }

  /* ---- Add task + filters ---------------------------------------------- */

  function renderTaskPanel() {
    var active = currentProject();
    refs.taskPanel.innerHTML = '';
    if (!active) return;

    var titleInput = el('input', { class: 'input', type: 'text', placeholder: 'What needs doing?', maxlength: '140' });
    var prioritySelect = el('select', { class: 'select', 'aria-label': 'Priority' },
      CA.PRIORITIES.map(function (p) {
        return el('option', { value: p.id, text: p.label, selected: p.id === 'normal' ? 'selected' : null });
      })
    );
    var stageSelect = el('select', { class: 'select', 'aria-label': 'Stage' },
      CA.STAGES.map(function (s) { return el('option', { value: s.id, text: s.label }); })
    );
    var dueInput = el('input', { class: 'input', type: 'date', 'aria-label': 'Due date' });
    var noteInput = el('input', { class: 'input', type: 'text', placeholder: 'Extra notes (optional)', maxlength: '400' });

    function addTask() {
      var title = titleInput.value.trim();
      if (!title) {
        UI.toast('Type what needs doing first.', 'error');
        titleInput.focus();
        return;
      }
      tasks.create({
        projectId: active.id,
        title: title,
        note: noteInput.value.trim(),
        stage: stageSelect.value,
        priority: prioritySelect.value,
        due: dueInput.value || ''
      });
      titleInput.value = '';
      noteInput.value = '';
      dueInput.value = '';
      UI.toast('Task added.', 'success');
      render();
      titleInput.focus();
    }

    titleInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') addTask(); });
    noteInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') addTask(); });

    /* Search + priority filter */
    var searchInput = el('input', {
      class: 'input', type: 'search', placeholder: 'Search tasks…', value: filters.text
    });
    searchInput.addEventListener('input', UI.debounce(function () {
      filters.text = searchInput.value;
      renderBoard();
    }, 180));

    var priorityChips = [{ id: 'all', label: 'All' }].concat(CA.PRIORITIES).map(function (p) {
      return el('button', {
        class: 'chip' + (filters.priority === p.id ? ' is-active' : ''),
        type: 'button',
        text: p.label,
        onclick: function () {
          filters.priority = p.id;
          renderTaskPanel();
          renderBoard();
        }
      });
    });

    refs.taskPanel.appendChild(
      el('div', { class: 'card' }, [
        el('div', { class: 'card__title' }, [el('h2', { text: 'Add a task to ' + active.name })]),
        el('div', { class: 'form-row' }, [
          el('div', { class: 'form-row__grow' }, [titleInput]),
          el('div', {}, [prioritySelect]),
          el('div', {}, [stageSelect]),
          el('div', {}, [dueInput])
        ]),
        el('div', { class: 'form-row mt-4' }, [el('div', { class: 'form-row__grow' }, [noteInput])]),
        el('div', { class: 'row row--end mt-4' }, [
          el('button', { class: 'btn btn--primary', type: 'button', text: 'Add task', onclick: addTask })
        ]),
        el('div', { class: 'form-row mt-5' }, [
          el('div', { class: 'form-row__grow' }, [searchInput]),
          el('div', { class: 'chips', style: 'flex:2 1 220px' }, priorityChips)
        ])
      ])
    );
  }

  /* ---- Task card ------------------------------------------------------- */

  function taskCard(task) {
    if (editingTaskId === task.id) return taskEditCard(task);

    var meta = [];
    var priority = task.priority || 'normal';
    if (priority !== 'low') {
      meta.push(el('span', { class: 'badge badge--' + priority, text: priority === 'high' ? 'High' : 'Normal' }));
    }
    if (task.due) {
      var days = UI.daysUntil(task.due);
      var isDone = task.stage === 'done';
      var label = UI.formatDate(task.due + 'T00:00:00');
      var cls = 'badge';
      if (!isDone && days !== null && days < 0) { cls = 'badge badge--overdue'; label = 'Overdue · ' + label; }
      else if (!isDone && days !== null && days <= 3) { cls = 'badge badge--due'; label = (days === 0 ? 'Today · ' : 'Soon · ') + label; }
      meta.push(el('span', { class: cls, text: label }));
    }

    var stageSelect = el('select', { class: 'select', 'aria-label': 'Move task to stage' },
      CA.STAGES.map(function (s) {
        return el('option', { value: s.id, text: s.label, selected: s.id === task.stage ? 'selected' : null });
      })
    );
    stageSelect.addEventListener('change', function () {
      tasks.update(task.id, { stage: stageSelect.value });
      render();
    });

    return el('article', {
      class: 'task',
      style: 'border-left-color:' + stage(task.stage).accent
    }, [
      el('div', { class: 'task__top' }, [
        el('div', { class: 'task__title' + (task.stage === 'done' ? ' is-done' : ''), text: task.title })
      ]),
      task.note ? el('p', { class: 'task__note', text: task.note }) : null,
      meta.length ? el('div', { class: 'task__meta' }, meta) : null,
      el('div', { class: 'task__actions' }, [
        stageSelect,
        el('button', {
          class: 'icon-btn', type: 'button', title: 'Edit task', 'aria-label': 'Edit task',
          onclick: function () { editingTaskId = task.id; renderBoard(); }
        }, [UI.icon('edit')]),
        el('button', {
          class: 'icon-btn icon-btn--danger', type: 'button', title: 'Delete task', 'aria-label': 'Delete task',
          onclick: function () {
            UI.confirm({
              title: 'Delete this task?',
              message: task.title,
              confirmLabel: 'Delete',
              danger: true
            }).then(function (yes) {
              if (!yes) return;
              tasks.remove(task.id);
              UI.toast('Task deleted.', 'success');
              render();
            });
          }
        }, [UI.icon('close')])
      ])
    ]);
  }

  function taskEditCard(task) {
    var titleInput = el('input', { class: 'input', type: 'text', value: task.title, maxlength: '140' });
    var noteInput = el('input', { class: 'input', type: 'text', value: task.note || '', placeholder: 'Notes', maxlength: '400' });
    var dueInput = el('input', { class: 'input', type: 'date', value: task.due || '' });
    var prioritySelect = el('select', { class: 'select' },
      CA.PRIORITIES.map(function (p) {
        return el('option', { value: p.id, text: p.label, selected: p.id === (task.priority || 'normal') ? 'selected' : null });
      })
    );

    function save() {
      var title = titleInput.value.trim();
      if (!title) { UI.toast('The task needs a name.', 'error'); return; }
      tasks.update(task.id, {
        title: title,
        note: noteInput.value.trim(),
        due: dueInput.value || '',
        priority: prioritySelect.value
      });
      editingTaskId = null;
      UI.toast('Task updated.', 'success');
      render();
    }

    titleInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') { editingTaskId = null; renderBoard(); }
    });

    var card = el('article', { class: 'task', style: 'border-left-color:' + stage(task.stage).accent }, [
      titleInput,
      el('div', { class: 'mt-4' }, [noteInput]),
      el('div', { class: 'form-row mt-4' }, [el('div', {}, [prioritySelect]), el('div', {}, [dueInput])]),
      el('div', { class: 'row row--end mt-4' }, [
        el('button', {
          class: 'btn btn--ghost btn--sm', type: 'button', text: 'Cancel',
          onclick: function () { editingTaskId = null; renderBoard(); }
        }),
        el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Save', onclick: save })
      ])
    ]);

    window.setTimeout(function () { titleInput.focus(); titleInput.select(); }, 0);
    return card;
  }

  /* ---- Board ----------------------------------------------------------- */

  function renderBoard() {
    var active = currentProject();
    refs.board.innerHTML = '';

    if (!active) {
      refs.board.appendChild(
        UI.emptyState(
          'No project selected',
          'Create a project above and your board will appear here.',
          null, null
        )
      );
      return;
    }

    var rows = visibleTasks(active.id);
    var total = projectTasks(active.id).length;

    if (!total) {
      refs.board.appendChild(
        UI.emptyState(
          'This project has no tasks yet',
          'Add your first task using the form above.',
          null, null
        )
      );
      return;
    }

    var columns = CA.STAGES.map(function (s) {
      var inStage = rows.filter(function (t) { return t.stage === s.id; });

      /* Newest first, but high priority floats up. */
      var weight = { high: 0, normal: 1, low: 2 };
      inStage.sort(function (a, b) {
        var pa = weight[a.priority || 'normal'], pb = weight[b.priority || 'normal'];
        if (pa !== pb) return pa - pb;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      return el('section', { class: 'column' }, [
        el('div', { class: 'column__head' }, [
          el('span', { class: 'column__dot', style: 'background:' + s.accent }),
          el('span', { class: 'column__label', text: s.label }),
          el('span', { class: 'column__count', text: String(inStage.length) })
        ]),
        el('div', { class: 'column__body' },
          inStage.length
            ? inStage.map(taskCard)
            : [el('p', { class: 'column__empty', text: 'Nothing here' })]
        )
      ]);
    });

    refs.board.appendChild(el('div', { class: 'board' }, columns));

    if (!rows.length) {
      refs.board.appendChild(
        el('p', { class: 'dim small center mt-4', text: 'No tasks match your search or filter.' })
      );
    }
  }

  /* ---- Render everything ----------------------------------------------- */

  function render() {
    renderProjectBar();
    renderProjectPanel();
    renderTaskPanel();
    renderBoard();
  }

  /* First visit: give people something to look at instead of a blank page. */
  if (!projects.count()) {
    var demo = projects.create({
      name: 'My First Project',
      description: 'A sample project so you can see how the board works. Delete it whenever you like.',
      color: CA.PROJECT_COLORS[0]
    });
    activeProject.set(demo.id);
    tasks.create({ projectId: demo.id, title: 'Sketch out the main idea', stage: 'idea', priority: 'normal', note: 'Rough thoughts go here.', due: '' });
    tasks.create({ projectId: demo.id, title: 'Build the first version', stage: 'active', priority: 'high', note: '', due: '' });
    tasks.create({ projectId: demo.id, title: 'Ask someone for feedback', stage: 'review', priority: 'normal', note: '', due: '' });
    tasks.create({ projectId: demo.id, title: 'Set up my workspace', stage: 'done', priority: 'low', note: '', due: '' });
  }

  render();
});
