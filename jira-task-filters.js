(function installJiraTaskFilters() {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const optionList = (values, label) => `<option value="">${label}</option>${[...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))).map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}`;
  const baseRenderJiraTasks = renderJiraTasks;
  renderJiraTasks = function renderJiraTasksWithFilters() {
    baseRenderJiraTasks();
    const root = document.querySelector('#jiraTasksRoot');
    const toolbar = root?.querySelector('.jira-task-toolbar');
    if (!root || !toolbar) return;
    root.querySelector('.jira-list-filters')?.remove();
    const issues = state.jiraIssues || [];
    const memberFor = issue => members.find(member => member.id === issue.accountId || personKey(member.name) === personKey(issue.member));
    const panel = document.createElement('div');
    panel.className = 'jira-list-filters';
    panel.innerHTML = `<label>Team<select id="jiraListTeam">${optionList(issues.map(issue => memberFor(issue)?.group), 'Tất cả team')}</select></label><label>Assignee<select id="jiraListAssignee">${optionList(issues.map(issue => issue.member), 'Tất cả assignee')}</select></label><label>Loại issue<select id="jiraListType">${optionList(issues.map(issue => issue.issueType), 'Tất cả loại')}</select></label><label>Priority<select id="jiraListPriority">${optionList(issues.map(issue => issue.priority), 'Tất cả priority')}</select></label><label>Label<select id="jiraListLabel">${optionList(issues.flatMap(issue => issue.labels || []), 'Tất cả label')}</select></label><label>Dữ liệu<select id="jiraListQuality"><option value="">Tất cả dữ liệu</option><option value="missing-points">Thiếu Story Point</option><option value="missing-deadline">Thiếu deadline</option><option value="ready">Đủ Story Point + deadline</option></select></label><button type="button" class="btn btn-ghost" id="clearJiraListFilters">Xóa bộ lọc</button>`;
    toolbar.insertAdjacentElement('afterend', panel);
    const filterRows = () => {
      const query = (root.querySelector('#jiraTaskSearch')?.value || '').toLowerCase();
      const status = root.querySelector('#jiraTaskStatus')?.value || 'all';
      const filters = { team: root.querySelector('#jiraListTeam').value, assignee: root.querySelector('#jiraListAssignee').value, type: root.querySelector('#jiraListType').value, priority: root.querySelector('#jiraListPriority').value, label: root.querySelector('#jiraListLabel').value, quality: root.querySelector('#jiraListQuality').value };
      root.querySelectorAll('.jira-task-row').forEach(row => {
        const key = row.querySelector('.jira-task-key b')?.textContent.trim();
        const issue = issues.find(item => item.key === key) || {};
        const member = memberFor(issue);
        const searchText = `${issue.key || ''} ${issue.title || ''} ${issue.member || ''}`.toLowerCase();
        const quality = !Number(issue.storyPoints) ? 'missing-points' : !issue.deadline ? 'missing-deadline' : 'ready';
        row.hidden = Boolean(query && !searchText.includes(query)) || (status !== 'all' && row.dataset.taskStatus !== status) || Boolean(filters.team && member?.group !== filters.team) || Boolean(filters.assignee && personKey(issue.member) !== personKey(filters.assignee)) || Boolean(filters.type && issue.issueType !== filters.type) || Boolean(filters.priority && issue.priority !== filters.priority) || Boolean(filters.label && !(issue.labels || []).includes(filters.label)) || Boolean(filters.quality && quality !== filters.quality);
      });
      const visible = [...root.querySelectorAll('.jira-task-row')].filter(row => !row.hidden).length;
      const count = root.querySelector('.jira-task-toolbar > span');
      if (count) count.textContent = `${visible}/${issues.length} task`;
    };
    root.querySelector('#jiraTaskSearch').oninput = filterRows;
    root.querySelector('#jiraTaskStatus').onchange = filterRows;
    panel.querySelectorAll('select').forEach(select => { select.onchange = filterRows; });
    panel.querySelector('#clearJiraListFilters').onclick = () => { panel.querySelectorAll('select').forEach(select => { select.value = ''; }); root.querySelector('#jiraTaskSearch').value = ''; root.querySelector('#jiraTaskStatus').value = 'all'; filterRows(); };
    filterRows();
  };
  const style = document.createElement('style');
  style.textContent = '.jira-list-filters{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:12px;padding:14px 0 16px;border-bottom:1px solid #e4eaf5;align-items:end}.jira-list-filters label{display:grid;gap:6px;font-size:11px;font-weight:600;color:#6b7b9c}.jira-list-filters select{width:100%;min-width:0;height:38px;padding:0 34px 0 12px;border:1px solid #d7e0ef;border-radius:10px;background:#fff;color:#243452;font:inherit;font-size:13px;outline:none}.jira-list-filters select:focus{border-color:#2d69dc;box-shadow:0 0 0 3px rgba(45,105,220,.12)}.jira-list-filters button{height:38px;border:1px solid #d7e0ef;border-radius:10px;background:#f7f9fd;color:#2d5fb9;font:inherit;font-size:13px;font-weight:600;cursor:pointer}.jira-list-filters button:hover{background:#edf3ff}.jira-task-row[hidden]{display:none!important}@media(max-width:1100px){.jira-list-filters{grid-template-columns:repeat(3,minmax(150px,1fr))}}@media(max-width:760px){.jira-list-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.jira-list-filters{grid-template-columns:1fr}}';
  document.head.appendChild(style);
  if (activeModule === 'jiraTasks') renderJiraTasks();
})();
