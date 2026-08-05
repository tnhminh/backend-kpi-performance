(function installKpiReconciliation() {
  let selectedReconciliationId = null;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const memberTasks = member => (state.jiraIssues || []).filter(task => task.accountId === member.id || personKey(task.member) === personKey(member.name));

  function renderReconciliation() {
    const root = document.querySelector('#reconciliationRoot');
    if (!root) return;
    const team = root.querySelector('#reconciliationTeam')?.value || 'all';
    const list = members.filter(member => team === 'all' || member.group === team || (team === 'Leader' && member.leader));
    const rows = list.map(member => {
      const score = result(member);
      const workloadData = workload(member);
      const tasks = memberTasks(member);
      const done = tasks.filter(task => task.done).length;
      const missing = tasks.filter(task => !task.storyPoints || !task.deadline).length;
      return { member, score, workloadData, tasks, done, missing };
    });
    const average = rows.length ? rows.reduce((sum, row) => sum + row.score.score, 0) / rows.length : 0;
    const allTasks = state.jiraIssues || [];
    const mapped = allTasks.filter(task => members.some(member => task.accountId === member.id || personKey(task.member) === personKey(member.name))).length;
    const snapshot = periodSnapshot();
    root.innerHTML = `<div class="reconciliation-toolbar"><label>Team<select id="reconciliationTeam"><option value="all">Tất cả team</option>${Object.keys(groups).map(group => `<option value="${escapeHtml(group)}" ${group === team ? 'selected' : ''}>${escapeHtml(group)}</option>`).join('')}</select></label><span>Kỳ ${escapeHtml(period.value)}</span><span class="reconciliation-snapshot">${snapshot ? '✓ Đã có snapshot khóa kỳ' : 'Chưa khóa kỳ'}</span></div><div class="reconciliation-stats"><div><small>Member</small><b>${rows.length}</b></div><div><small>Điểm trung bình</small><b>${average.toFixed(2)}/10</b></div><div><small>Task map được</small><b>${mapped}/${allTasks.length}</b></div><div><small>Thiếu dữ liệu</small><b>${rows.reduce((sum, row) => sum + row.missing, 0)}</b></div></div><div class="reconciliation-layout"><div class="reconciliation-table-wrap"><table class="reconciliation-table"><thead><tr><th>Member</th><th>KPI</th><th>Hạng</th><th>Task Done</th><th>Story Point</th><th>Cảnh báo</th></tr></thead><tbody>${rows.map(row => `<tr class="reconciliation-row ${row.member.id === selectedReconciliationId ? 'selected' : ''}" data-reconciliation-member="${escapeHtml(row.member.id)}"><td><b>${escapeHtml(row.member.name)}</b><small>${escapeHtml(row.member.group)} · ${escapeHtml(row.member.id)}</small></td><td><strong>${row.score.score.toFixed(2)}</strong>/10</td><td><span class="grade">${row.score.grade}</span></td><td>${row.done}/${row.tasks.length || row.workloadData.committed}</td><td>${row.workloadData.deliveredPoints}/${row.workloadData.committedPoints}</td><td>${row.missing ? `<span class="quality-warn">${row.missing} thiếu</span>` : '<span class="quality-good">Đủ dữ liệu</span>'}</td></tr>`).join('')}</tbody></table></div><div class="reconciliation-detail">${selectedReconciliationId ? detailHtml(rows.find(row => row.member.id === selectedReconciliationId)) : '<div class="empty">Chọn một member để xem breakdown và task evidence.</div>'}</div></div>`;
    root.querySelector('#reconciliationTeam').onchange = () => { selectedReconciliationId = null; renderReconciliation(); };
    root.querySelectorAll('[data-reconciliation-member]').forEach(row => row.onclick = () => { selectedReconciliationId = row.dataset.reconciliationMember; renderReconciliation(); });
  }

  function detailHtml(row) {
    if (!row) return '<div class="empty">Member không còn trong phạm vi đang lọc.</div>';
    const { member, score, workloadData, tasks } = row;
    const group = evalGroup(member);
    const criteria = criteriaFor(group);
    const record = state[member.id]?.[group] || {};
    const selectedKeys = Object.values(record.taskLinks || {}).flat();
    const evidence = tasks.filter(task => selectedKeys.includes(task.key));
    return `<div class="reconciliation-detail-head"><div><b>${escapeHtml(member.name)}</b><span>${escapeHtml(member.group)} · ${escapeHtml(member.id)}</span></div><strong>${score.score.toFixed(2)}/10 · ${score.grade}</strong></div><div class="reconciliation-formula"><b>Điểm nền ${score.base.toFixed(2)}</b> + <b>Thưởng/trừ ${score.bonus >= 0 ? '+' : ''}${score.bonus.toFixed(2)}</b> = <b>${score.score.toFixed(2)}</b><small>Formula tính lại từ bộ tiêu chí hiện hành · kỳ ${escapeHtml(period.value)}</small></div><h3>Breakdown tiêu chí</h3><div class="reconciliation-criteria">${criteria.map((criterion, index) => `<div><span>${escapeHtml(criterion[0])}</span><b>${Number(score.scores[index] || 0).toFixed(2)} / ${Number(criterion[1]).toFixed(2)}</b><small>${record.taskLinks?.[index]?.length || 0} task evidence</small></div>`).join('')}</div><h3>Task Jira được chọn làm minh chứng (${evidence.length})</h3><div class="reconciliation-evidence">${evidence.length ? evidence.map(task => `<div><b>${escapeHtml(task.key)}</b><span>${escapeHtml(task.title)} · ${escapeHtml(task.status || (task.done ? 'Done' : 'Open'))}</span><small>${Number(task.storyPoints || 0)} SP · Deadline ${escapeHtml(task.deadline || 'Thiếu')} · ${task.done ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</small></div>`).join('') : '<div class="empty">Chưa chọn task evidence trong màn hình đánh giá member.</div>'}</div><h3>Audit gần nhất</h3><div class="reconciliation-audit">${(state.audit || []).slice(0, 5).map(log => `<div><span>${escapeHtml(log.time)}</span><b>${escapeHtml(log.action)}</b></div>`).join('') || '<div class="empty">Chưa có audit local.</div>'}</div>`;
  }

  const baseToggleModules = toggleModules;
  toggleModules = function toggleModulesWithReconciliation() {
    baseToggleModules();
    if (activeModule !== 'reconciliation') return;
    document.querySelectorAll('.module-section').forEach(element => { element.style.display = element.id === 'reconciliationCard' ? '' : 'none'; });
    document.querySelectorAll('.module-btn').forEach(button => button.classList.toggle('active', button.dataset.module === activeModule));
  };
  const baseSetModule = setModule;
  setModule = function setModuleWithReconciliation(name) {
    baseSetModule(name);
    if (name === 'reconciliation') renderReconciliation();
  };
})();

// Export and print controls for the manager report.
(function installReconciliationExports() {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  function reportRows() {
    return members.map(member => {
      const tasks = (state.jiraIssues || []).filter(task => task.accountId === member.id || personKey(task.member) === personKey(member.name));
      const score = result(member);
      return { member: member.name, id: member.id, team: member.group, score: Number(score.score.toFixed(2)), grade: score.grade, tasks: tasks.length, done: tasks.filter(task => task.done).length, storyPoints: tasks.reduce((sum, task) => sum + Number(task.storyPoints || 0), 0), missingData: tasks.filter(task => !task.storyPoints || !task.deadline).length };
    });
  }
  function download(format) {
    const rows = reportRows();
    if (format === 'json') {
      const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([JSON.stringify({ period: period.value, status: currentStatus(), formula: typeof currentFormulaVersion === 'function' ? currentFormulaVersion() : null, generatedAt: new Date().toISOString(), members: rows, jiraIssues: state.jiraIssues || [] }, null, 2)], { type: 'application/json' })); anchor.download = `backend-kpi-reconciliation-${period.value}.json`; anchor.click(); return;
    }
    const table = `<table><tr><th>Member</th><th>Ma NV</th><th>Team</th><th>KPI /10</th><th>Hang</th><th>Tong task</th><th>Done</th><th>Story Point</th><th>Thieu du lieu</th></tr>${rows.map(row => `<tr>${Object.values(row).map(value => `<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</table>`;
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([`<html><meta charset="utf-8"><h2>Backend KPI - ${esc(period.value)}</h2>${table}`], { type: 'application/vnd.ms-excel' })); anchor.download = `backend-kpi-reconciliation-${period.value}.xls`; anchor.click();
  }
  function ensureButtons() {
    const toolbar = document.querySelector('#reconciliationRoot .reconciliation-toolbar');
    if (!toolbar || toolbar.querySelector('.reconciliation-export-actions')) return;
    const host = document.createElement('span'); host.className = 'reconciliation-export-actions'; host.innerHTML = '<button class="btn btn-outline" data-export="xls">Xuat Excel</button><button class="btn btn-outline" data-export="json">Xuat JSON</button><button class="btn btn-outline" data-export="print">In / PDF</button>';
    host.querySelectorAll('[data-export]').forEach(button => button.onclick = () => button.dataset.export === 'print' ? window.print() : download(button.dataset.export));
    toolbar.append(host);
  }
  const root = document.querySelector('#reconciliationRoot');
  if (root) new MutationObserver(ensureButtons).observe(root, { childList: true });
  document.addEventListener('click', ensureButtons);
})();
