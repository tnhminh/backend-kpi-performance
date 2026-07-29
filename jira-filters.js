(function installJiraFilters() {
  const storageKey = 'backend-kpi-jira-filters';
  const readFilters = () => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  };
  const escapeJql = value => String(value || '').replaceAll('"', '\\"');
  const buildJql = filters => {
    const clauses = [];
    if (filters.project) clauses.push(`project = "${escapeJql(filters.project)}"`);
    if (filters.from) clauses.push(`updated >= "${filters.from}"`);
    if (filters.to) clauses.push(`updated < "${filters.to}"`);
    if (filters.sprint) clauses.push(`sprint = ${/^\d+$/.test(filters.sprint) ? filters.sprint : `"${escapeJql(filters.sprint)}"`}`);
    if (filters.assignee) clauses.push(`assignee = "${escapeJql(filters.assignee)}"`);
    if (filters.extra) clauses.push(`(${filters.extra})`);
    return clauses.join(' AND ');
  };
  const saveFilters = root => {
    const filters = {
      project: root.querySelector('#jiraFilterProject').value.trim(),
      from: root.querySelector('#jiraFilterFrom').value,
      to: root.querySelector('#jiraFilterTo').value,
      sprint: root.querySelector('#jiraFilterSprint').value.trim(),
      assignee: root.querySelector('#jiraFilterAssignee').value.trim(),
      maxIssues: Number(root.querySelector('#jiraFilterMax').value) || 1000,
      extra: root.querySelector('#jiraFilterExtra').value.trim()
    };
    localStorage.setItem(storageKey, JSON.stringify(filters));
    return filters;
  };
  const syncWithFilters = async () => {
    const base = (localStorage.getItem('backend-kpi-api-base') || location.origin).replace(/\/$/, '');
    const filters = readFilters();
    const params = new URLSearchParams({ maxResults: '100', maxIssues: String(filters.maxIssues || 1000) });
    const jql = buildJql(filters);
    if (jql) params.set('jql', jql);
    const button = document.querySelector('#syncRealJira');
    if (button) { button.disabled = true; button.textContent = 'Đang đồng bộ...'; }
    try {
      const response = await fetch(`${base}/api/sync?${params}`);
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Backend không phản hồi');
      state.jiraIssues = data.issues || [];
      members.forEach(member => {
        const matched = state.jiraIssues.filter(task => personKey(task.member) === personKey(member.name) || task.accountId === member.id);
        if (!matched.length) return;
        const committed = matched.length;
        const closed = matched.filter(task => task.done).length;
        const committedPoints = matched.reduce((sum, task) => sum + task.storyPoints, 0);
        const deliveredPoints = matched.filter(task => task.done).reduce((sum, task) => sum + task.storyPoints, 0);
        const rate = committed ? closed / committed : 0;
        const group = evalGroup(member);
        const criteria = criteriaFor(group);
        state[member.id] ??= {};
        state[member.id].workload = { committed, closed, committedPoints, deliveredPoints };
        state[member.id][group] ??= {};
        state[member.id][group].scores ??= [];
        if (criteria.length) {
          const max = criteria[0][1];
          state[member.id][group].scores[0] = rate >= .9 ? max : rate >= .75 ? max * .6 : rate >= .6 ? max * .267 : 0;
        }
        state[member.id][group].taskLinks ??= [];
        state[member.id][group].taskLinks[0] = matched.map(task => task.key);
      });
      localStorage.setItem(key(), JSON.stringify(state));
      save(`Đồng bộ ${state.jiraIssues.length} task Jira`);
      render();
      toast(`Đã sync ${state.jiraIssues.length} task · ${data.total || state.jiraIssues.length} task trong phạm vi lọc`);
    } catch (error) {
      toast(`Không đồng bộ được Jira: ${error.message}`);
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Đồng bộ Jira Data Center'; }
    }
  };
  const baseRenderSettings = renderSettings;
  renderSettings = function renderSettingsWithJiraFilters() {
    baseRenderSettings();
    const box = document.querySelector('#settingsRoot .backend-api-config');
    if (!box) return;
    box.querySelector('.jira-filter-panel')?.remove();
    const filters = readFilters();
    box.insertAdjacentHTML('beforeend', `<div class="jira-filter-panel"><b>Bộ lọc Jira</b><span>Chọn phạm vi sync thay vì kéo toàn bộ project.</span><div class="jira-filter-grid"><label>Project<input id="jiraFilterProject" value="${filters.project || 'BE'}" placeholder="BE"></label><label>Updated từ ngày<input id="jiraFilterFrom" type="date" value="${filters.from || ''}"></label><label>Updated trước ngày<input id="jiraFilterTo" type="date" value="${filters.to || ''}"></label><label>Sprint<input id="jiraFilterSprint" value="${filters.sprint || ''}" placeholder="26 hoặc Sprint 26"></label><label>Assignee<input id="jiraFilterAssignee" value="${filters.assignee || ''}" placeholder="minhtnh2"></label><label>Max issues<input id="jiraFilterMax" type="number" min="1" max="10000" value="${filters.maxIssues || 1000}"></label></div><label>JQL nâng cao<input id="jiraFilterExtra" value="${filters.extra || ''}" placeholder="issuetype in (Story, Bug)"></label><small class="jira-filter-preview">JQL: ${buildJql(filters) || 'chưa có bộ lọc'}</small></div>`);
    ['Project', 'From', 'To', 'Sprint', 'Assignee', 'Max', 'Extra'].forEach(name => {
      box.querySelector(`#jiraFilter${name}`)?.addEventListener('change', () => {
        saveFilters(box);
        renderSettings();
      });
    });
    box.querySelector('#syncRealJira').onclick = syncWithFilters;
  };
  const style = document.createElement('style');
  style.textContent = '.jira-filter-panel{margin-top:12px;padding:14px;border:1px solid #d8e1f2;border-radius:12px;background:#fff;display:grid;gap:8px}.jira-filter-panel>span,.jira-filter-panel small{color:#6b7b9c}.jira-filter-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.jira-filter-panel label{display:grid;gap:5px;font-size:12px;color:#536789}.jira-filter-panel input{min-width:0}@media(max-width:760px){.jira-filter-grid{grid-template-columns:1fr}}';
  document.head.appendChild(style);
  renderSettings();
})();
