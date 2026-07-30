// Keep the cross-team score transparent beside the comparison ranking.
(function installComparisonFormulaPanel() {
  const comparisonLabel = 'So sánh liên nhóm';

  function percent(value) {
    return `${Math.round((Number(value) || 0) * 100)}%`;
  }

  function number(value) {
    return (Number(value) || 0).toFixed(2);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]);
  }

  function comparisonMember() {
    const selected = members.find(member => member.id === selectedId);
    if (selected) return selected;
    return members
      .map(member => ({ member, score: workloadResult(member).fairness }))
      .sort((left, right) => right.score - left.score)[0]?.member || null;
  }

  function renderComparisonFormulaPanel() {
    const layout = document.querySelector('#evaluationContent');
    const tableCard = layout?.querySelector('.table-card');
    if (!layout || !tableCard) return;

    const isComparison = selectedGroup === comparisonLabel;
    layout.classList.toggle('comparison-layout', isComparison);
    layout.querySelector('#comparisonFormulaPanel')?.remove();

    const subtitle = tableCard.querySelector('.card-head p');
    if (!isComparison) {
      if (subtitle) subtitle.textContent = 'Điểm /10 = Tổng điểm đạt ÷ Tổng điểm tối đa × 10';
      return;
    }

    if (subtitle) subtitle.textContent = 'Chuẩn hóa theo khối lượng, chất lượng và vị trí trong team';

    const member = comparisonMember();
    if (!member) return;
    const score = workloadResult(member);
    const memberName = escapeHtml(member.name);
    const memberMeta = `${escapeHtml(member.id)} · ${escapeHtml(member.group)}`;

    const panel = document.createElement('aside');
    panel.id = 'comparisonFormulaPanel';
    panel.className = 'card comparison-formula-panel';
    panel.innerHTML = `
      <div class="comparison-formula-head">
        <div>
          <span class="formula-kicker">CÔNG THỨC LIÊN NHÓM</span>
          <h2>Fairness Score</h2>
          <p>Điểm cuối cân bằng kết quả tuyệt đối và vị trí của member trong chính team.</p>
        </div>
        <span class="pill">/10</span>
      </div>

      <div class="comparison-formula-body">
        <section class="formula-step">
          <div class="formula-step-title"><span>1</span><b>Điểm tuyệt đối</b></div>
          <div class="formula-weight-grid">
            <div><strong>30%</strong><span>Hoàn thành</span></div>
            <div><strong>35%</strong><span>Effort</span></div>
            <div><strong>25%</strong><span>KPI chất lượng</span></div>
            <div><strong>10%</strong><span>Ổn định</span></div>
          </div>
          <code>(Hoàn thành × 30%) + (Effort × 35%) + (KPI × 25%) + (Ổn định × 10%)</code>
          <small>Ổn định = 1 − |Hoàn thành − Effort|</small>
        </section>

        <section class="formula-step">
          <div class="formula-step-title"><span>2</span><b>Chỉ số trong team</b></div>
          <code>5 + ((Điểm thô − TB team) ÷ Độ lệch chuẩn) × 1,5</code>
          <small>Kết quả được giới hạn từ 0 đến 10. Nếu team không có độ lệch đáng kể, dùng điểm tuyệt đối.</small>
        </section>

        <section class="formula-step formula-final-step">
          <div class="formula-step-title"><span>3</span><b>Fairness Score</b></div>
          <code>(Điểm tuyệt đối × 75%) + (Chỉ số team × 25%)</code>
        </section>

        <section class="formula-live-example">
          <div class="formula-example-head">
            <div><span>VÍ DỤ TRỰC TIẾP</span><b>${memberName}</b><small>${memberMeta}</small></div>
            <strong>${number(score.fairness)}</strong>
          </div>
          <div class="formula-live-values">
            <span>Hoàn thành <b>${percent(score.completion)}</b></span>
            <span>Effort <b>${percent(score.effort)}</b></span>
            <span>KPI <b>${percent(score.kpi)}</b></span>
            <span>Ổn định <b>${percent(score.predictability)}</b></span>
          </div>
          <div class="formula-calculation">
            <span>Điểm tuyệt đối</span>
            <code>(${percent(score.completion)} × 30%) + (${percent(score.effort)} × 35%) + (${percent(score.kpi)} × 25%) + (${percent(score.predictability)} × 10%) = <b>${number(score.rawScore)}</b></code>
          </div>
          <div class="formula-calculation formula-calculation-final">
            <span>Điểm cuối</span>
            <code>${number(score.rawScore)} × 75% + ${number(score.teamIndex)} × 25% = <b>${number(score.fairness)}</b></code>
          </div>
          <p>Bấm một member trong bảng để xem phép tính của người đó.</p>
        </section>
      </div>`;

    tableCard.insertAdjacentElement('afterend', panel);
  }

  const baseRender = render;
  render = function renderWithComparisonFormula() {
    const output = baseRender();
    renderComparisonFormulaPanel();
    return output;
  };

  renderComparisonFormulaPanel();
})();
