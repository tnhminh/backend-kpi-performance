(function installEvaluationFormulas() {
  const baseRenderEditor = renderEditor;

  const formatScore = value => Number(value || 0).toFixed(2);

  function updateEvaluationSummary(member, group) {
    const calculated = result(member, group);
    const summaryValues = document.querySelectorAll('#editor .summary-box strong');
    if (summaryValues[0]) summaryValues[0].textContent = calculated.score.toFixed(2);
    if (summaryValues[1]) summaryValues[1].textContent = calculated.grade;
    if (summaryValues[2]) summaryValues[2].textContent = calculated.coef.toFixed(1);

    const breakdown = document.querySelector('#editor .formula-breakdown');
    if (breakdown) {
      breakdown.innerHTML = `<b>Vì sao ra ${calculated.score.toFixed(2)} điểm?</b><span>Điểm đạt: ${calculated.achieved.toFixed(2)} ÷ ${calculated.max.toFixed(2)} × 10 = ${calculated.base.toFixed(2)}</span><span>Thưởng/trừ: ${calculated.base.toFixed(2)} ${calculated.bonus >= 0 ? '+' : '−'} ${Math.abs(calculated.bonus).toFixed(2)} = ${calculated.score.toFixed(2)}</span><span>Hạng ${calculated.grade} → hệ số KPI ${calculated.coef.toFixed(1)}</span>`;
    }
  }

  function enhanceEvaluationEditor() {
    const member = members.find(item => item.id === selectedId);
    if (!member || selectedGroup === 'So sánh liên nhóm') return;
    const group = evalGroup(member);
    const rows = [...document.querySelectorAll('#editor .criterion-child')];
    if (!rows.length) return;

    const note = document.querySelector('#editor .criteria-detail-note');
    if (note) {
      note.innerHTML = '<b>Công thức:</b> Điểm tiêu chí con = Mức đạt (%) × Trọng số. Điểm hạng mục = tổng điểm các tiêu chí con. Điểm KPI = Tổng điểm đạt ÷ Tổng trọng số × 10.';
    }

    const updateFormulas = () => {
      rows.forEach(row => {
        const slider = row.querySelector('input[data-score]');
        const formula = row.querySelector('.criterion-live-formula');
        if (!slider || !formula) return;
        const value = Number(slider.value || 0);
        const max = Number(slider.max || 0);
        const percent = max ? Math.round(value / max * 100) : 0;
        formula.innerHTML = `<span>${percent}% × ${formatScore(max)}</span><b>= ${formatScore(value)} điểm</b>`;
      });

      document.querySelectorAll('#editor .criterion-group').forEach(section => {
        const sliders = [...section.querySelectorAll('input[data-score]')];
        const achieved = sliders.reduce((sum, slider) => sum + Number(slider.value || 0), 0);
        const maximum = sliders.reduce((sum, slider) => sum + Number(slider.max || 0), 0);
        const live = section.querySelector('.criterion-group-live');
        if (live) live.innerHTML = `<strong>${formatScore(achieved)} / ${formatScore(maximum)}</strong><small>Tổng điểm tiêu chí con</small>`;
      });
      updateEvaluationSummary(member, group);
    };

    document.querySelectorAll('#editor .criterion-group').forEach(section => {
      const head = section.querySelector('.criterion-group-head');
      if (head && !head.querySelector('.criterion-group-live')) {
        head.insertAdjacentHTML('beforeend', '<span class="criterion-group-live"></span>');
      }
    });

    rows.forEach(row => {
      const slider = row.querySelector('input[data-score]');
      const control = slider?.closest('.score-slider-control');
      if (!slider || !control) return;
      if (!row.querySelector('.criterion-live-formula')) {
        control.insertAdjacentHTML('afterend', '<div class="criterion-live-formula"></div>');
      }
      const previousInput = slider.oninput;
      slider.oninput = () => {
        previousInput?.();
        state[member.id] ??= {};
        state[member.id][group] ??= {};
        state[member.id][group].scores ??= [];
        state[member.id][group].scores[Number(slider.dataset.score)] = Number(slider.value || 0);
        localStorage.setItem(key(), JSON.stringify(state));
        updateFormulas();
      };
      slider.onchange = () => {
        state[member.id] ??= {};
        state[member.id][group] ??= {};
        state[member.id][group].scores ??= [];
        state[member.id][group].scores[Number(slider.dataset.score)] = Number(slider.value || 0);
        localStorage.setItem(key(), JSON.stringify(state));
        updateFormulas();
      };
    });

    updateFormulas();
  }

  renderEditor = function renderEditorWithoutScrollJump() {
    const previousBody = document.querySelector('#editor .editor-body');
    const previousScrollTop = previousBody?.scrollTop || 0;
    const output = baseRenderEditor();
    enhanceEvaluationEditor();
    const nextBody = document.querySelector('#editor .editor-body');
    if (nextBody && previousScrollTop) nextBody.scrollTop = previousScrollTop;
    return output;
  };

  if (selectedId) renderEditor();
})();
