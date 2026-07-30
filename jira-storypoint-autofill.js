// Story Point autofill for Jira issues already persisted in the application database.
(function installStoryPointAutofill() {
  let preview = null;
  let busy = false;

  function apiBase() {
    if (typeof productionApiBase === 'function') return productionApiBase();
    return (localStorage.getItem('backend-kpi-api-base') || window.location.origin).replace(/\/$/, '');
  }

  function apiHeaders() {
    return {
      'content-type': 'application/json',
      'x-user-id': typeof productionState !== 'undefined' ? productionState.actorId : 'demo-admin',
      'x-user-role': currentRole
    };
  }

  function persistedIssues() {
    return Array.isArray(state.jiraIssues) ? state.jiraIssues : [];
  }

  function missingStoryPoints() {
    return persistedIssues().filter(issue => !Number(issue.storyPoints)).length;
  }

  async function requestAutofill(dryRun) {
    const strategy = document.querySelector('#storyPointStrategy')?.value || 'balanced';
    busy = true;
    renderJiraSim();
    try {
      const response = await fetch(`${apiBase()}/api/jira/autofill-story-points`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ strategy, dryRun })
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Không thể cập nhật Story Point');
      preview = data;

      if (!dryRun) {
        const storedResponse = await fetch(`${apiBase()}/api/jira/stored-issues?limit=10000`, { headers: apiHeaders() });
        const stored = await storedResponse.json();
        if (storedResponse.ok && Array.isArray(stored.issues)) {
          state.jiraIssues = stored.issues;
          localStorage.setItem(key(), JSON.stringify(state));
        }
        toast(`Đã auto-fill Story Point cho ${data.updated} task`);
      }
    } catch (error) {
      toast(`Auto-fill thất bại: ${error.message}`);
    } finally {
      busy = false;
      renderJiraSim();
    }
  }

  function renderAutofillPanel() {
    const root = document.querySelector('#jiraSimRoot');
    if (!root) return;
    root.querySelector('.storypoint-autofill')?.remove();

    const total = persistedIssues().length;
    const missing = missingStoryPoints();
    const sample = preview?.sample || [];
    const panel = document.createElement('section');
    panel.className = 'storypoint-autofill';
    panel.innerHTML = `
      <div class="storypoint-autofill-copy">
        <div class="storypoint-autofill-title">
          <span class="storypoint-icon">SP</span>
          <div>
            <b>Auto-fill Story Point từ DB</b>
            <span>Gán Story Point cho task Jira đang thiếu; không ghi ngược lên Jira.</span>
          </div>
        </div>
        <div class="storypoint-stats">
          <span><b>${total}</b> task trong DB</span>
          <span class="${missing ? 'warning' : 'complete'}"><b>${missing}</b> task thiếu Story Point</span>
          ${preview ? `<span class="ready"><b>${preview.eligible}</b> task sẵn sàng cập nhật</span>` : ''}
        </div>
      </div>
      <div class="storypoint-autofill-actions">
        <label>Quy tắc gán
          <select id="storyPointStrategy" ${busy ? 'disabled' : ''}>
            <option value="balanced" ${preview?.strategy === 'balanced' ? 'selected' : ''}>Theo loại task (khuyến nghị)</option>
            <option value="1" ${preview?.strategy === '1' ? 'selected' : ''}>Cố định 1 SP</option>
            <option value="2" ${preview?.strategy === '2' ? 'selected' : ''}>Cố định 2 SP</option>
            <option value="3" ${preview?.strategy === '3' ? 'selected' : ''}>Cố định 3 SP</option>
            <option value="5" ${preview?.strategy === '5' ? 'selected' : ''}>Cố định 5 SP</option>
          </select>
        </label>
        <button class="btn btn-ghost" id="previewStoryPoints" ${busy ? 'disabled' : ''}>${busy ? 'Đang xử lý...' : 'Xem trước'}</button>
        <button class="btn btn-primary" id="applyStoryPoints" ${busy || !missing ? 'disabled' : ''}>Auto-fill vào DB</button>
      </div>
      ${preview ? `
        <div class="storypoint-preview">
          <div>
            <b>${preview.dryRun ? 'Bản xem trước' : 'Đã cập nhật thành công'}</b>
            <span>${preview.eligible} task thiếu SP · ${preview.skipped} task đã có SP được giữ nguyên</span>
          </div>
          ${sample.length ? `<div class="storypoint-samples">${sample.map(issue => `
            <span><b>${issue.key}</b><em>${issue.issueType || 'Task'}</em><strong>${issue.storyPoints} SP</strong></span>
          `).join('')}</div>` : '<span class="storypoint-none">Không còn task nào cần auto-fill.</span>'}
        </div>` : ''}
      <div class="storypoint-rule-note">
        <b>Quy tắc khuyến nghị:</b>
        Sub-task / Support / Maintain = 2 SP · Bug / Task = 3 SP · Story / Feature = 5 SP · Epic = 8 SP.
      </div>`;

    root.appendChild(panel);
    panel.querySelector('#previewStoryPoints').onclick = () => requestAutofill(true);
    panel.querySelector('#applyStoryPoints').onclick = () => {
      if (confirm(`Auto-fill Story Point cho ${missing} task đang thiếu trong DB?`)) requestAutofill(false);
    };
    panel.querySelector('#storyPointStrategy').onchange = () => { preview = null; renderJiraSim(); };
  }

  const baseRenderJiraSim = renderJiraSim;
  renderJiraSim = function renderJiraSimWithStoryPoints() {
    const output = baseRenderJiraSim();
    renderAutofillPanel();
    return output;
  };

  renderJiraSim();
})();
