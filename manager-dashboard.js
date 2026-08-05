(function installManagerDashboard() {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const taskFor = member => (state.jiraIssues || []).filter(task => task.accountId === member.id || personKey(task.member) === personKey(member.name));
  function renderManagerDashboard() {
    const root = document.querySelector('#managerDashboardRoot');
    if (!root) return;
    const rows = Object.keys(groups).map(team => {
      const list = members.filter(member => team === 'Leader' ? member.leader : member.group === team);
      const scores = list.map(member => result(member, team).score);
      const tasks = list.flatMap(taskFor);
      const done = tasks.filter(task => task.done).length;
      return { team, members: list.length, score: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0, done, tasks: tasks.length, points: tasks.reduce((sum, task) => sum + Number(task.storyPoints || 0), 0) };
    });
    const allScores = members.map(member => result(member, member.group).score);
    const avg = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    const tasks = state.jiraIssues || [];
    const done = tasks.filter(task => task.done).length;
    const missing = tasks.filter(task => !task.accountId || !Number(task.storyPoints) || !task.deadline).length;
    const grades = ['A+', 'A', 'B+', 'B', 'C', 'D', 'E'];
    const gradeCounts = grades.map(grade => members.filter(member => result(member, member.group).grade === grade).length);
    const maxGrade = Math.max(1, ...gradeCounts);
    const scoreBars = rows.map(row => `<div class="manager-bar-row"><b>${esc(row.team)}</b><div><i style="width:${Math.min(100, row.score * 10)}%"></i></div><strong>${row.score.toFixed(2)}</strong></div>`).join('');
    const completionBars = rows.map(row => `<div class="manager-bar-row manager-green"><b>${esc(row.team)}</b><div><i style="width:${row.tasks ? Math.round(row.done / row.tasks * 100) : 0}%"></i></div><strong>${row.tasks ? Math.round(row.done / row.tasks * 100) : 0}%</strong></div>`).join('');
    const gradeBars = grades.map((grade, index) => `<div class="manager-grade-row"><b>${grade}</b><div><i style="width:${gradeCounts[index] / maxGrade * 100}%"></i></div><span>${gradeCounts[index]}</span></div>`).join('');
    root.innerHTML = `<div class="manager-kpi-cards"><div><small>Điểm trung bình</small><strong>${avg.toFixed(2)}<em>/10</em></strong><span>Kỳ ${esc(period.value)}</span></div><div><small>Task hoàn thành</small><strong>${done}<em>/${tasks.length}</em></strong><span>${tasks.length ? Math.round(done / tasks.length * 100) : 0}% completion</span></div><div><small>Story Point</small><strong>${tasks.reduce((sum, task) => sum + Number(task.storyPoints || 0), 0)}</strong><span>${members.length} member</span></div><div class="${missing ? 'manager-warning' : 'manager-ok'}"><small>Chất lượng dữ liệu</small><strong>${missing}</strong><span>${missing ? 'cần kiểm tra' : 'đầy đủ'}</span></div></div><div class="manager-chart-grid"><section class="manager-chart-panel manager-wide"><h3>Điểm KPI theo team</h3><p>Điểm cuối cùng sau công thức và thưởng/trừ</p><div class="manager-bars">${scoreBars}</div></section><section class="manager-chart-panel"><h3>Phân bố xếp hạng</h3><p>Số member theo grade</p><div class="manager-grade-bars">${gradeBars}</div></section><section class="manager-chart-panel manager-wide"><h3>Completion task theo team</h3><p>Tỷ lệ issue Done trên tổng issue Jira đã map</p><div class="manager-bars">${completionBars}</div></section><section class="manager-chart-panel"><h3>Điểm cần truy soát</h3><p>Click module Đối soát KPI để xem chi tiết</p><ul class="manager-quality-list"><li><b>${tasks.filter(task => !task.accountId).length}</b> task chưa map member</li><li><b>${tasks.filter(task => !Number(task.storyPoints)).length}</b> task thiếu Story Point</li><li><b>${tasks.filter(task => !task.deadline).length}</b> task thiếu deadline</li><li><b>${rows.filter(row => !row.tasks).length}</b> team chưa có Jira task</li></ul></section></div>`;
  }
  const baseToggle = toggleModules;
  toggleModules = function managerToggle() { baseToggle(); if (activeModule === 'managerDashboard') { document.querySelectorAll('.module-section').forEach(element => { element.style.display = element.id === 'managerDashboardCard' ? '' : 'none'; }); document.querySelectorAll('.module-btn').forEach(button => button.classList.toggle('active', button.dataset.module === activeModule)); } };
  const baseSetModule = setModule;
  setModule = function managerSetModule(name) { baseSetModule(name); if (name === 'managerDashboard') renderManagerDashboard(); };
  const baseRender = render;
  render = function managerRender() { baseRender(); if (activeModule === 'managerDashboard') renderManagerDashboard(); };
  window.renderManagerDashboard = renderManagerDashboard;
})();
