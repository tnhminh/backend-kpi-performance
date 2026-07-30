// Production hardening layer: persistence, RBAC, Jira quality, formula versions and UX controls.
const productionState = {
  actorId: localStorage.getItem('backend-kpi-actor-id') || 'demo-admin',
  backendState: 'idle'
};

function productionApiBase() {
  return (localStorage.getItem('backend-kpi-api-base') || 'http://localhost:8788').replace(/\/$/, '');
}

function productionApiHeaders(json = false) {
  return {
    ...(json ? { 'content-type': 'application/json' } : {}),
    'x-user-id': productionState.actorId,
    'x-user-role': currentRole
  };
}

function productionActorMember() {
  return members.find(member => member.id === productionState.actorId) || null;
}

function productionCanAccess(member) {
  if (!member || currentRole === 'Admin') return true;
  if (currentRole === 'Member') return member.id === productionState.actorId;
  const actor = productionActorMember();
  return Boolean(actor && member.group === actor.group);
}

function productionMemberStatus(memberId) {
  return state.memberStatuses?.[memberId] || 'draft';
}

const legacyCanEdit = canEdit;
canEdit = function () {
  if (currentStatus() === 'locked') return false;
  const member = members.find(item => item.id === selectedId);
  if (currentRole === 'Admin') return true;
  if (!member || !productionCanAccess(member)) return false;
  if (currentRole === 'Leader') return ['draft', 'submitted'].includes(productionMemberStatus(member.id));
  return productionMemberStatus(member.id) === 'draft';
};

function rawCrossTeamMetric(member) {
  const work = workload(member);
  const completion = work.committed ? Math.min(1, work.closed / work.committed) : 0;
  const effort = work.committedPoints ? Math.min(1, work.deliveredPoints / work.committedPoints) : 0;
  const kpi = result(member, member.group).score / 10;
  const predictability = work.committed && work.committedPoints ? Math.max(0, 1 - Math.abs(completion - effort)) : 0;
  const raw = completion * .30 + effort * .35 + kpi * .25 + predictability * .10;
  return { completion, effort, kpi, predictability, raw };
}

workloadResult = function (member) {
  const metric = rawCrossTeamMetric(member);
  const peers = members.filter(item => item.group === member.group).map(rawCrossTeamMetric);
  const mean = peers.reduce((sum, item) => sum + item.raw, 0) / Math.max(1, peers.length);
  const variance = peers.reduce((sum, item) => sum + (item.raw - mean) ** 2, 0) / Math.max(1, peers.length);
  const deviation = Math.sqrt(variance);
  const rawScore = metric.raw * 10;
  const relative = deviation > .01 ? Math.max(0, Math.min(10, 5 + ((metric.raw - mean) / deviation) * 1.5)) : rawScore;
  const fairness = rawScore * .75 + relative * .25;
  return { ...metric, fairness, rawScore, teamIndex: relative, teamMean: mean * 10 };
};

function formulaDefinition() {
  return {
    crossTeam: { completion: .30, effort: .35, qualityKpi: .25, predictability: .10, absoluteWeight: .75, teamIndexWeight: .25 },
    criteria: Object.fromEntries(Object.keys(groups).map(team => [team, criteriaFor(team).map(row => [row[0], Number(row[1])])]))
  };
}

function formulaChecksum(value) {
  let hash = 2166136261;
  for (const char of JSON.stringify(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function currentFormulaVersion() {
  const formula = formulaDefinition();
  return { version: `${period.value}-${formulaChecksum(formula)}`, checksum: formulaChecksum(formula), formula };
}

async function persistFormulaVersion() {
  const payload = currentFormulaVersion();
  localStorage.setItem(`backend-kpi-formula-version-${period.value}`, JSON.stringify({ ...payload, createdAt: new Date().toISOString() }));
  if (currentRole !== 'Admin') return payload;
  try {
    await fetch(`${productionApiBase()}/api/formulas`, {
      method: 'POST',
      headers: productionApiHeaders(true),
      body: JSON.stringify(payload)
    });
  } catch {}
  return payload;
}

async function pushPeriodToBackend(showToast = true) {
  productionState.backendState = 'syncing';
  try {
    const response = await fetch(`${productionApiBase()}/api/state`, {
      method: 'PUT',
      headers: productionApiHeaders(true),
      body: JSON.stringify({
        period: period.value,
        status: currentStatus(),
        state,
        formulaVersionId: null
      })
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Backend không phản hồi');
    productionState.backendState = 'synced';
    if (showToast) toast('Đã lưu dữ liệu lên backend');
    return true;
  } catch (error) {
    productionState.backendState = 'offline';
    if (showToast) toast(`Chưa lưu được lên backend: ${error.message}`);
    return false;
  }
}

async function pullPeriodFromBackend() {
  try {
    const response = await fetch(`${productionApiBase()}/api/state?period=${encodeURIComponent(period.value)}`, {
      headers: productionApiHeaders()
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Backend không phản hồi');
    if (!data.period) {
      toast('Backend chưa có dữ liệu cho kỳ này');
      return;
    }
    state = data.period.state || {};
    localStorage.setItem(key(), JSON.stringify(state));
    localStorage.setItem(statusKey(), data.period.status || 'draft');
    toast('Đã tải dữ liệu kỳ từ backend');
    render();
  } catch (error) {
    toast(`Không tải được dữ liệu backend: ${error.message}`);
  }
}

const productionSaveBase = save;
let productionSaveTimer = 0;
save = function (action) {
  productionSaveBase(action);
  clearTimeout(productionSaveTimer);
  productionSaveTimer = setTimeout(() => void pushPeriodToBackend(false), 350);
};

function ensureActorSelector() {
  const roleSelect = document.querySelector('#roleSelect');
  const host = document.querySelector('.top-actions');
  if (!roleSelect || !host) return;
  let wrapper = document.querySelector('#productionActor');
  const options = currentRole === 'Admin'
    ? [{ id: 'demo-admin', name: 'Admin hệ thống' }]
    : members.filter(member => currentRole === 'Member' || member.leader).map(member => ({ id: member.id, name: member.name }));
  if (!options.some(option => option.id === productionState.actorId)) {
    productionState.actorId = options[0]?.id || 'demo-admin';
    localStorage.setItem('backend-kpi-actor-id', productionState.actorId);
  }
  if (!wrapper) {
    wrapper = document.createElement('label');
    wrapper.id = 'productionActor';
    wrapper.className = 'compact-select actor-select';
    roleSelect.closest('label')?.insertAdjacentElement('afterend', wrapper);
  }
  wrapper.innerHTML = `<span>Người dùng</span><select id="actorSelect">${options.map(option => `<option value="${option.id}" ${option.id === productionState.actorId ? 'selected' : ''}>${option.name}</option>`).join('')}</select>`;
  wrapper.querySelector('select').onchange = event => {
    productionState.actorId = event.target.value;
    localStorage.setItem('backend-kpi-actor-id', productionState.actorId);
    selectedId = null;
    render();
  };
  if (!roleSelect.dataset.productionRbac) {
    roleSelect.dataset.productionRbac = 'true';
    roleSelect.onchange = event => {
      currentRole = event.target.value;
      localStorage.setItem('backend-kpi-role', currentRole);
      const choices = currentRole === 'Admin' ? [{ id: 'demo-admin' }] : members.filter(member => currentRole === 'Member' || member.leader);
      productionState.actorId = choices[0]?.id || 'demo-admin';
      localStorage.setItem('backend-kpi-actor-id', productionState.actorId);
      selectedId = null;
      render();
    };
  }
}

function enforceRbacUi() {
  document.querySelectorAll('.member-row').forEach(row => {
    const member = members.find(item => item.id === row.dataset.id);
    const allowed = productionCanAccess(member);
    row.classList.toggle('rbac-locked', !allowed);
    if (!allowed) {
      row.title = currentRole === 'Member' ? 'Member chỉ được đánh giá chính mình' : 'Leader chỉ được review member cùng team';
      row.onclick = () => toast(row.title);
    }
  });
  const criteria = document.querySelector('#criteriaRoot');
  if (criteria && currentRole !== 'Admin') {
    criteria.querySelectorAll('input,select,button').forEach(element => element.disabled = true);
  }
  const status = document.querySelector('#statusSelect');
  if (status) status.disabled = currentRole === 'Member';
}

function renderRoleBanner() {
  const container = document.querySelector('#evaluationContent');
  if (!container) return;
  container.querySelector('.role-scope-banner')?.remove();
  const actor = productionActorMember();
  const scope = currentRole === 'Admin' ? 'Toàn bộ phòng Backend' : currentRole === 'Leader' ? `Team ${actor?.group || 'chưa xác định'}` : actor?.name || 'Chưa chọn member';
  container.insertAdjacentHTML('afterbegin', `<div class="role-scope-banner"><b>${currentRole}</b><span>Phạm vi thao tác: ${scope}</span><small>${currentRole === 'Member' ? 'Tự đánh giá và gửi minh chứng' : currentRole === 'Leader' ? 'Review member cùng team' : 'Cấu hình, phê duyệt và khóa kỳ'}</small></div>`);
}

function enhanceEvaluationWorkflow() {
  const button = document.querySelector('#completeEvaluation');
  const member = members.find(item => item.id === selectedId);
  if (!button || !member) return;
  const label = currentRole === 'Member' ? 'Gửi Leader review' : currentRole === 'Leader' ? 'Duyệt đánh giá' : 'Hoàn tất đánh giá';
  button.textContent = label;
  button.onclick = () => {
    state.memberStatuses ??= {};
    if (currentRole === 'Member') state.memberStatuses[member.id] = 'submitted';
    else if (currentRole === 'Leader') state.memberStatuses[member.id] = 'approved';
    else localStorage.setItem(statusKey(), 'submitted');
    save(label);
    render();
  };
}

function jiraQuality() {
  const issues = state.jiraIssues || [];
  const unmapped = issues.filter(issue => !jiraTaskMember(issue));
  return {
    total: issues.length,
    unmapped: unmapped.length,
    missingStoryPoints: issues.filter(issue => !Number(issue.storyPoints)).length,
    missingDeadline: issues.filter(issue => !issue.deadline).length,
    missingLabels: issues.filter(issue => !(issue.labels || []).length).length
  };
}

const productionJiraSyncBase = syncRealJiraFromBackend;
syncRealJiraFromBackend = async function () {
  await productionJiraSyncBase();
  const quality = jiraQuality();
  state.jiraSyncWarnings = [
    { code: 'unmapped', label: 'Task chưa map member', count: quality.unmapped },
    { code: 'missing_story_points', label: 'Task thiếu Story Point', count: quality.missingStoryPoints },
    { code: 'missing_deadline', label: 'Task thiếu deadline', count: quality.missingDeadline },
    { code: 'missing_labels', label: 'Task thiếu labels', count: quality.missingLabels }
  ].filter(item => item.count);
  state.jiraLastSync = { syncedAt: new Date().toISOString(), total: quality.total };
  localStorage.setItem(key(), JSON.stringify(state));
  render();
};

function renderDataQualityDashboard() {
  const root = document.querySelector('#dashboardRoot');
  if (!root) return;
  root.querySelector('.production-quality-panel')?.remove();
  const quality = jiraQuality();
  const missingScores = members.filter(member => result(member).score === 0).length;
  const invalidFormula = Object.keys(groups).filter(team => Math.abs(criteriaFor(team).reduce((sum, row) => sum + Number(row[1]), 0) - 10) > .001).length;
  const cards = [
    ['Task Jira', quality.total, 'blue'],
    ['Chưa map member', quality.unmapped, quality.unmapped ? 'warn' : 'good'],
    ['Thiếu Story Point', quality.missingStoryPoints, quality.missingStoryPoints ? 'warn' : 'good'],
    ['Thiếu deadline', quality.missingDeadline, quality.missingDeadline ? 'warn' : 'good'],
    ['Member chưa có điểm', missingScores, missingScores ? 'warn' : 'good'],
    ['Bộ công thức sai tổng', invalidFormula, invalidFormula ? 'danger' : 'good']
  ];
  root.insertAdjacentHTML('afterbegin', `<section class="production-quality-panel"><div class="quality-panel-head"><div><b>Chất lượng dữ liệu kỳ ${period.value}</b><span>Phát hiện sớm dữ liệu thiếu trước khi chốt KPI</span></div><small>${state.jiraLastSync?.syncedAt ? `Jira sync: ${new Date(state.jiraLastSync.syncedAt).toLocaleString('vi-VN')}` : 'Chưa có lần sync Jira'}</small></div><div class="quality-kpis">${cards.map(([label, value, tone]) => `<div class="quality-kpi ${tone}"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div></section>`);
}

function renderFormulaVersionUi() {
  const root = document.querySelector('#formulaExplainer');
  if (!root) return;
  root.querySelector('.cross-team-formula')?.remove();
  const version = currentFormulaVersion();
  root.insertAdjacentHTML('beforeend', `<div class="cross-team-formula"><div><b>So sánh liên nhóm · ${version.version}</b><span>30% hoàn thành cam kết + 35% effort/Story Point + 25% KPI chất lượng + 10% độ ổn định. Kết quả gồm 75% điểm tuyệt đối và 25% vị trí tương đối trong team.</span></div><div class="formula-version-actions"><code>${version.checksum}</code><button type="button" class="btn btn-ghost" id="snapshotFormula">Tạo snapshot</button></div></div>`);
  root.querySelector('#snapshotFormula').onclick = async () => {
    await persistFormulaVersion();
    toast(`Đã tạo snapshot công thức ${version.version}`);
  };
}

function renderJiraLegend() {
  const root = document.querySelector('#jiraTasksRoot');
  if (!root || root.querySelector('.jira-color-legend')) return;
  const fields = [
    ['Mã issue', 'key'], ['Tiêu đề', 'summary'], ['Assignee', 'member'], ['Loại issue', 'issueType'],
    ['Trạng thái', 'status'], ['Priority', 'priority'], ['Labels', 'labels'], ['Story Point', 'storyPoints'], ['Deadline', 'deadline']
  ];
  root.querySelector('.jira-task-toolbar')?.insertAdjacentHTML('afterend', `<div class="jira-color-legend">${fields.map(([label, key]) => `<span class="legend-${key}"><i></i>${label}</span>`).join('')}</div>`);
}

const productionRenderJiraTasksBase = renderJiraTasks;
renderJiraTasks = function () {
  const output = productionRenderJiraTasksBase();
  renderJiraLegend();
  return output;
};

const productionRenderSettingsBase = renderSettings;
renderSettings = function () {
  productionRenderSettingsBase();
  const root = document.querySelector('#settingsRoot');
  if (!root) return;
  root.querySelector('.production-settings')?.remove();
  const motionEnabled = localStorage.getItem('backend-kpi-motion') !== 'off';
  root.insertAdjacentHTML('beforeend', `<section class="production-settings"><div class="production-setting-block"><div><b>Dữ liệu backend</b><span>Đồng bộ kỳ đánh giá với SQLite qua KPI Backend.</span></div><div class="production-setting-actions"><button type="button" class="btn btn-ghost" id="pullBackendState">Tải từ backend</button><button type="button" class="btn btn-primary" id="pushBackendState">Lưu lên backend</button></div></div><div class="production-setting-block"><div><b>Hiệu ứng chuyển động</b><span>Tắt animation/parallax trên máy cấu hình thấp hoặc khi nhập liệu dài.</span></div><label class="motion-toggle"><input type="checkbox" id="motionToggle" ${motionEnabled ? 'checked' : ''}><span>${motionEnabled ? 'Đang bật' : 'Đang tắt'}</span></label></div></section>`);
  root.querySelector('#pullBackendState').onclick = pullPeriodFromBackend;
  root.querySelector('#pushBackendState').onclick = () => pushPeriodToBackend(true);
  root.querySelector('#motionToggle').onchange = event => {
    const enabled = event.target.checked;
    localStorage.setItem('backend-kpi-motion', enabled ? 'on' : 'off');
    document.documentElement.classList.toggle('motion-off', !enabled);
    event.target.nextElementSibling.textContent = enabled ? 'Đang bật' : 'Đang tắt';
    toast(enabled ? 'Đã bật hiệu ứng' : 'Đã tắt hiệu ứng');
  };
};

const productionRenderBase = render;
render = function () {
  productionRenderBase();
  ensureActorSelector();
  enforceRbacUi();
  renderRoleBanner();
  enhanceEvaluationWorkflow();
  renderDataQualityDashboard();
  renderFormulaVersionUi();
  renderJiraLegend();
};

const productionStatusSelect = document.querySelector('#statusSelect');
productionStatusSelect?.addEventListener('change', () => {
  if (currentStatus() === 'locked') void persistFormulaVersion();
});

render();
