(function installJiraTaskFilters() {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const optionList = (values, label) => `<option value="">${label}</option>${[...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))).map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}`;
  const listState = {
    page: 1,
    pageSize: Number(localStorage.getItem('kpi-jira-page-size')) || 20,
    query: '',
    status: 'all',
    team: '',
    assignee: '',
    type: '',
    priority: '',
    label: '',
    quality: ''
  };
  const baseRenderJiraTasks = renderJiraTasks;

  renderJiraTasks = function renderJiraTasksWithFilters() {
    baseRenderJiraTasks();
    const root = document.querySelector('#jiraTasksRoot');
    const toolbar = root?.querySelector('.jira-task-toolbar');
    const list = root?.querySelector('.jira-task-list');
    if (!root || !toolbar || !list) return;

    const issues = state.jiraIssues || [];
    const membersById = new Map(members.map(member => [member.id, member]));
    const membersByName = new Map(members.map(member => [personKey(member.name), member]));
    const memberFor = issue => membersById.get(issue.accountId) || membersByName.get(personKey(issue.member));
    const indexedIssues = issues.map(issue => {
      const member = memberFor(issue);
      return {
        issue,
        member,
        searchText: `${issue.key || ''} ${issue.title || issue.summary || ''} ${issue.member || ''} ${issue.issueType || ''} ${issue.priority || ''} ${(issue.labels || []).join(' ')}`.toLowerCase(),
        assigneeKey: personKey(issue.member),
        quality: !Number(issue.storyPoints) ? 'missing-points' : !issue.deadline ? 'missing-deadline' : 'ready'
      };
    });

    const panel = document.createElement('div');
    panel.className = 'jira-list-filters';
    panel.innerHTML = `<div class="jira-filter-head"><div><b>Bộ lọc task</b><span>Thu hẹp danh sách theo dữ liệu Jira</span></div><button type="button" class="jira-filter-clear" id="clearJiraListFilters">↺ Đặt lại</button></div><div class="jira-filter-grid"><label>Team<select id="jiraListTeam">${optionList(issues.map(issue => memberFor(issue)?.group), 'Tất cả team')}</select></label><label>Assignee<select id="jiraListAssignee">${optionList(issues.map(issue => issue.member), 'Tất cả assignee')}</select></label><label>Loại issue<select id="jiraListType">${optionList(issues.map(issue => issue.issueType), 'Tất cả loại')}</select></label><label>Priority<select id="jiraListPriority">${optionList(issues.map(issue => issue.priority), 'Tất cả priority')}</select></label><label>Label<select id="jiraListLabel">${optionList(issues.flatMap(issue => issue.labels || []), 'Tất cả label')}</select></label><label>Dữ liệu<select id="jiraListQuality"><option value="">Tất cả dữ liệu</option><option value="missing-points">Thiếu Story Point</option><option value="missing-deadline">Thiếu deadline</option><option value="ready">Đủ Story Point + deadline</option></select></label></div>`;
    toolbar.insertAdjacentElement('afterend', panel);

    const pagination = document.createElement('div');
    pagination.className = 'jira-pagination';
    pagination.innerHTML = '<label>Hiển thị<select id="jiraPageSize"><option value="20">20/trang</option><option value="50">50/trang</option><option value="100">100/trang</option></select></label><span class="jira-page-info"></span><div><button type="button" class="btn btn-ghost" id="jiraPagePrev">‹ Trước</button><button type="button" class="btn btn-ghost" id="jiraPageNext">Sau ›</button></div>';
    list.insertAdjacentElement('afterend', pagination);

    const searchInput = root.querySelector('#jiraTaskSearch');
    const statusInput = root.querySelector('#jiraTaskStatus');
    searchInput.value = listState.query;
    statusInput.value = listState.status;
    panel.querySelector('#jiraListTeam').value = listState.team;
    panel.querySelector('#jiraListAssignee').value = listState.assignee;
    panel.querySelector('#jiraListType').value = listState.type;
    panel.querySelector('#jiraListPriority').value = listState.priority;
    panel.querySelector('#jiraListLabel').value = listState.label;
    panel.querySelector('#jiraListQuality').value = listState.quality;
    pagination.querySelector('#jiraPageSize').value = String(listState.pageSize);

    const readFilters = () => {
      listState.query = searchInput.value.trim().toLowerCase();
      listState.status = statusInput.value;
      listState.team = panel.querySelector('#jiraListTeam').value;
      listState.assignee = panel.querySelector('#jiraListAssignee').value;
      listState.type = panel.querySelector('#jiraListType').value;
      listState.priority = panel.querySelector('#jiraListPriority').value;
      listState.label = panel.querySelector('#jiraListLabel').value;
      listState.quality = panel.querySelector('#jiraListQuality').value;
    };

    const renderPage = () => {
      const selectedAssigneeKey = personKey(listState.assignee);
      const matches = indexedIssues.filter(({ issue, member, searchText, assigneeKey, quality }) => {
        const assigneeMatches = !listState.assignee || assigneeKey === selectedAssigneeKey || member?.id === listState.assignee || issue.accountId === listState.assignee;
        return (!listState.query || searchText.includes(listState.query))
          && (listState.status === 'all' || (issue.done ? 'done' : 'open') === listState.status)
          && (!listState.team || member?.group === listState.team)
          && assigneeMatches
          && (!listState.type || issue.issueType === listState.type)
          && (!listState.priority || issue.priority === listState.priority)
          && (!listState.label || (issue.labels || []).includes(listState.label))
          && (!listState.quality || quality === listState.quality);
      });
      const pageCount = Math.max(1, Math.ceil(matches.length / listState.pageSize));
      listState.page = Math.max(1, Math.min(listState.page, pageCount));
      const start = (listState.page - 1) * listState.pageSize;
      const pageIssues = matches.slice(start, start + listState.pageSize).map(item => item.issue);
      const selectedFields = jiraVisibleFields();
      list.innerHTML = pageIssues.length
        ? pageIssues.map(issue => jiraTaskRowHtml(issue, selectedFields)).join('')
        : '<div class="jira-empty"><b>Không có task phù hợp</b><span>Thử thay đổi hoặc xóa bộ lọc.</span></div>';

      const count = root.querySelector('.jira-task-toolbar > span');
      if (count) count.textContent = `${matches.length}/${issues.length} task`;
      pagination.querySelector('.jira-page-info').textContent = matches.length
        ? `Trang ${listState.page}/${pageCount} · ${start + 1}–${Math.min(start + listState.pageSize, matches.length)} trong ${matches.length}`
        : 'Không có task phù hợp';
      pagination.querySelector('#jiraPagePrev').disabled = listState.page <= 1;
      pagination.querySelector('#jiraPageNext').disabled = listState.page >= pageCount;
    };

    let searchTimer;
    searchInput.oninput = () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        readFilters();
        listState.page = 1;
        renderPage();
      }, 250);
    };
    statusInput.onchange = () => { readFilters(); listState.page = 1; renderPage(); };
    panel.querySelectorAll('select').forEach(select => {
      select.onchange = () => { readFilters(); listState.page = 1; renderPage(); };
    });
    pagination.querySelector('#jiraPageSize').onchange = event => {
      listState.pageSize = Number(event.target.value) || 20;
      localStorage.setItem('kpi-jira-page-size', String(listState.pageSize));
      listState.page = 1;
      renderPage();
    };
    pagination.querySelector('#jiraPagePrev').onclick = () => { listState.page -= 1; renderPage(); };
    pagination.querySelector('#jiraPageNext').onclick = () => { listState.page += 1; renderPage(); };
    panel.querySelector('#clearJiraListFilters').onclick = () => {
      Object.assign(listState, { page: 1, query: '', status: 'all', team: '', assignee: '', type: '', priority: '', label: '', quality: '' });
      searchInput.value = '';
      statusInput.value = 'all';
      panel.querySelectorAll('select').forEach(select => { select.value = ''; });
      renderPage();
    };
    renderPage();
  };

  const style = document.createElement('style');
  style.textContent = '.jira-list-filters{margin:12px 18px 10px;padding:12px 14px 14px;border:1px solid #e2e9f5;border-radius:14px;background:linear-gradient(180deg,#fbfcff 0%,#f6f9ff 100%);box-shadow:0 5px 16px rgba(39,71,132,.05)}.jira-filter-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:10px}.jira-filter-head>div{display:flex;align-items:baseline;gap:9px;min-width:0}.jira-filter-head b{color:#263754;font-size:12px}.jira-filter-head span{color:#8a98ae;font-size:10px}.jira-filter-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.jira-list-filters label{display:grid;gap:5px;min-width:0;color:#6b7b9c;font-size:9px;font-weight:800;letter-spacing:.025em;text-transform:uppercase}.jira-list-filters select{width:100%;min-width:0;height:36px;padding:0 30px 0 10px;border:1px solid #d8e2f1;border-radius:9px;background:#fff;color:#2d3d5c;font:inherit;font-size:11px;font-weight:700;text-transform:none;letter-spacing:0;outline:none;transition:border-color .16s,box-shadow .16s,background .16s}.jira-list-filters select:hover{border-color:#bfcdea}.jira-list-filters select:focus{border-color:#4d77e6;box-shadow:0 0 0 3px rgba(77,119,230,.11)}.jira-filter-clear{height:30px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:#3565d6;font:inherit;font-size:10px;font-weight:800;cursor:pointer}.jira-filter-clear:hover{background:#eaf0ff}.jira-pagination button{height:38px;border:1px solid #d7e0ef;border-radius:10px;background:#f7f9fd;color:#2d5fb9;font:inherit;font-size:13px;font-weight:600;cursor:pointer}.jira-pagination button:hover:not(:disabled){background:#edf3ff}.jira-color-legend{margin-top:0!important}.jira-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px 18px;border-top:1px solid #e4eaf5;color:#70809b;font-size:11px}.jira-pagination label{display:flex;align-items:center;gap:7px;font-weight:700}.jira-pagination select{height:34px;padding:0 26px 0 9px;border:1px solid #d7e0ef;border-radius:8px;background:#fff;color:#344767;font:inherit}.jira-pagination>div{display:flex;gap:7px}.jira-pagination button{height:34px;padding:0 10px}.jira-pagination button:disabled{cursor:not-allowed;opacity:.45}@media(max-width:1350px){.jira-filter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:760px){.jira-list-filters{margin:10px 12px}.jira-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.jira-filter-head span{display:none}.jira-pagination{align-items:stretch;flex-wrap:wrap}.jira-pagination .jira-page-info{order:3;width:100%;text-align:center}}@media(max-width:560px){.jira-filter-grid{grid-template-columns:1fr}.jira-pagination{font-size:10px}.jira-pagination>div{width:100%}.jira-pagination button{flex:1}}';
  document.head.appendChild(style);
  if (activeModule === 'jiraTasks') renderJiraTasks();
})();
