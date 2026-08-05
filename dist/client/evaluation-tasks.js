(function installEvaluationTaskPicker() {
  const baseRenderEditor = renderEditor;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

  function taskBelongsToMember(task, member) {
    const mapped = typeof jiraTaskMember === 'function' ? jiraTaskMember(task) : null;
    if (mapped) return mapped.id === member.id;
    return task.accountId === member.id || personKey(task.member) === personKey(member.name);
  }

  function tasksForMember(member) {
    const jiraTasks = (state.jiraIssues || [])
      .filter(task => taskBelongsToMember(task, member))
      .map(task => ({
        key: task.key,
        title: task.title || task.summary || 'Không có tiêu đề',
        status: task.done ? 'Done' : task.status || 'Open',
        points: Number(task.storyPoints || 0),
        deadline: task.deadline || '',
        done: Boolean(task.done)
      }));
    const localTasks = (state.tasks || [])
      .filter(task => task.assignee === member.id)
      .map(task => ({
        key: task.jiraKey || `TASK-${task.id}`,
        title: task.title,
        status: 'Local',
        points: Number(task.points || 0),
        deadline: task.deadline || '',
        done: false
      }));
    return [...new Map([...jiraTasks, ...localTasks].map(task => [task.key, task])).values()];
  }

  function updateTaskLinks(member, group, criterionIndex, menu, toggle) {
    state[member.id] ??= {};
    state[member.id][group] ??= {};
    state[member.id][group].taskLinks ??= {};
    const selected = [...menu.querySelectorAll('[data-task-key]:checked')].map(input => input.dataset.taskKey);
    state[member.id][group].taskLinks[criterionIndex] = selected;
    localStorage.setItem(key(), JSON.stringify(state));
    toggle.firstChild.textContent = selected.length ? `${selected.length} task đã chọn ` : 'Chọn task liên quan ';
    window.recalculateDeliveryScore?.(member.id, group, criterionIndex);
  }

  function refreshTaskPickers() {
    const member = members.find(item => item.id === selectedId);
    if (!member) return;
    const group = evalGroup(member);
    const record = state[member.id]?.[group] || {};
    const tasks = tasksForMember(member);

    document.querySelectorAll('#editor .task-picker').forEach((picker, criterionIndex) => {
      const menu = picker.querySelector('.task-picker-menu');
      const toggle = picker.querySelector('.task-picker-toggle');
      if (!menu || !toggle) return;
      const selected = record.taskLinks?.[criterionIndex] || [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const selectedTasks = tasks.filter(task => selected.includes(task.key));
      const summary = {
        selected: selectedTasks.length,
        done: selectedTasks.filter(task => task.done).length,
        late: selectedTasks.filter(task => !task.done && task.deadline && new Date(`${task.deadline}T23:59:59`) < today).length,
        missingPoints: selectedTasks.filter(task => !task.points).length,
        missingDeadline: selectedTasks.filter(task => !task.deadline).length
      };
      menu.innerHTML = tasks.length
        ? `<div class="task-picker-summary"><b>${summary.selected} đã chọn</b><span>${summary.done} Done</span><span>${summary.late} trễ</span><span>${summary.missingPoints} thiếu SP</span><span>${summary.missingDeadline} thiếu hạn</span></div><div class="task-picker-filters"><input class="task-search" placeholder="Tìm theo mã hoặc tên task" aria-label="Tìm task liên quan"><select class="task-filter" aria-label="Lọc task"><option value="all">Tất cả task</option><option value="done">Done</option><option value="late">Trễ hạn</option><option value="missing-points">Thiếu Story Point</option><option value="missing-deadline">Thiếu deadline</option></select></div>${tasks.map(task => { const late = !task.done && task.deadline && new Date(`${task.deadline}T23:59:59`) < today; const missingPoints = !task.points; const missingDeadline = !task.deadline; const filters = ['all', task.done ? 'done' : '', late ? 'late' : '', missingPoints ? 'missing-points' : '', missingDeadline ? 'missing-deadline' : ''].filter(Boolean).join(' '); return `<label class="${task.status === 'Done' ? 'task-done' : task.status === 'Local' ? 'task-local' : 'task-progress'}" data-task-filters="${filters}"><input type="checkbox" data-task-key="${escapeHtml(task.key)}" ${selected.includes(task.key) ? 'checked' : ''}><span><b>${escapeHtml(task.key)}</b> ${escapeHtml(task.title)}<small>${escapeHtml(task.status)} · ${task.points} SP · ${task.deadline || 'Không có deadline'}</small></span></label>`; }).join('')}`
        : '<em>Member này chưa có task Jira được gán hoặc task local.</em>';
      toggle.firstChild.textContent = selected.length ? `${selected.length} task đã chọn ` : 'Chọn task liên quan ';

      const search = menu.querySelector('.task-search');
      if (search) {
        const filter = () => {
          const query = personKey(search.value);
          const mode = menu.querySelector('.task-filter')?.value || 'all';
          menu.querySelectorAll('label[data-task-filters]').forEach(label => {
            label.hidden = (Boolean(query) && !personKey(label.textContent).includes(query)) || (mode !== 'all' && !label.dataset.taskFilters.split(' ').includes(mode));
          });
        };
        search.oninput = filter;
        menu.querySelector('.task-filter')?.addEventListener('change', filter);
      }
      menu.querySelectorAll('[data-task-key]').forEach(input => {
        input.onchange = () => updateTaskLinks(member, group, criterionIndex, menu, toggle);
      });
    });
  }

  renderEditor = function renderEditorWithStoredJiraTasks() {
    const output = baseRenderEditor();
    refreshTaskPickers();
    return output;
  };

  if (selectedId) renderEditor();
})();
