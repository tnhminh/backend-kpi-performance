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
        points: Number(task.storyPoints || 0)
      }));
    const localTasks = (state.tasks || [])
      .filter(task => task.assignee === member.id)
      .map(task => ({
        key: task.jiraKey || `TASK-${task.id}`,
        title: task.title,
        status: 'Local',
        points: Number(task.points || 0)
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
      menu.innerHTML = tasks.length
        ? `<input class="task-search" placeholder="Tìm theo mã hoặc tên task" aria-label="Tìm task liên quan">${tasks.map(task => `<label class="${task.status === 'Done' ? 'task-done' : task.status === 'Local' ? 'task-local' : 'task-progress'}"><input type="checkbox" data-task-key="${escapeHtml(task.key)}" ${selected.includes(task.key) ? 'checked' : ''}><span><b>${escapeHtml(task.key)}</b> ${escapeHtml(task.title)}<small>${escapeHtml(task.status)} · ${task.points} SP</small></span></label>`).join('')}`
        : '<em>Member này chưa có task Jira được gán hoặc task local.</em>';
      toggle.firstChild.textContent = selected.length ? `${selected.length} task đã chọn ` : 'Chọn task liên quan ';

      const search = menu.querySelector('.task-search');
      if (search) {
        search.oninput = () => {
          const query = personKey(search.value);
          menu.querySelectorAll('label').forEach(label => {
            label.hidden = Boolean(query) && !personKey(label.textContent).includes(query);
          });
        };
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
