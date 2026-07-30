(function installDeliveryScoring() {
  const baseRenderEditor = renderEditor;
  const deliveryTitlePattern = /(task.*dung.*han|xu.*ly.*dung.*han|hoan.*thanh.*dung.*deadline|dung.*han$)/;
  const doneStatusPattern = /^(done|closed|resolved|released)$/;
  const roundScore = value => Math.round(value * 100) / 100;

  const dateAtEndOfDay = value => {
    if (!value) return null;
    const text = String(value);
    const date = new Date(text.length <= 10 ? `${text}T23:59:59.999` : text);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  function taskIndex() {
    return new Map((state.jiraIssues || []).map(task => [task.key, task]));
  }

  function deliveryMetrics(taskKeys) {
    const byKey = taskIndex();
    const tasks = taskKeys.map(key => byKey.get(key)).filter(Boolean);
    const missingTasks = taskKeys.length - tasks.length;
    const missingPoints = tasks.filter(task => Number(task.storyPoints || 0) <= 0).length;
    const missingDeadline = tasks.filter(task => !dateAtEndOfDay(task.deadline)).length;
    let committedPoints = 0;
    let onTimePoints = 0;
    let onTimeTasks = 0;

    tasks.forEach(task => {
      const points = Number(task.storyPoints || 0);
      const deadline = dateAtEndOfDay(task.deadline);
      const completedAt = dateAtEndOfDay(task.resolvedAt || task.updated);
      const isDone = Boolean(task.done) || doneStatusPattern.test(String(task.status || '').trim().toLowerCase());
      const isOnTime = Boolean(isDone && deadline && completedAt && completedAt <= deadline);
      committedPoints += points;
      if (isOnTime) {
        onTimeTasks += 1;
        onTimePoints += points;
      }
    });

    const taskRate = tasks.length ? onTimeTasks / tasks.length : 0;
    const pointRate = committedPoints ? onTimePoints / committedPoints : 0;
    const rate = pointRate * .7 + taskRate * .3;
    return {
      tasks: tasks.length,
      taskKeys: [...taskKeys],
      onTimeTasks,
      committedPoints,
      onTimePoints,
      taskRate,
      pointRate,
      rate,
      missingTasks,
      missingPoints,
      missingDeadline,
      complete: Boolean(tasks.length && !missingTasks && !missingPoints && !missingDeadline)
    };
  }

  function renderMetric(row, metrics, maxScore) {
    row.querySelector('.delivery-score-card')?.remove();
    const card = document.createElement('div');
    card.className = `delivery-score-card ${metrics.complete ? 'is-ready' : metrics.tasks ? 'is-warning' : 'is-empty'}`;
    if (!metrics.tasks) {
      card.innerHTML = '<b>Điểm tiến độ tự động</b><span>Chọn task minh chứng để tính theo 70% Story Point + 30% số task đúng hạn.</span>';
    } else if (!metrics.complete) {
      const warnings = [
        metrics.missingPoints ? `${metrics.missingPoints} task thiếu Story Point` : '',
        metrics.missingDeadline ? `${metrics.missingDeadline} task thiếu deadline` : '',
        metrics.missingTasks ? `${metrics.missingTasks} task không còn trong dữ liệu Jira` : ''
      ].filter(Boolean);
      card.innerHTML = `<b>Chưa đủ dữ liệu để tự chấm</b><span>${warnings.join(' · ')}. Điểm hiện tại được giữ nguyên để người đánh giá xử lý.</span>`;
    } else {
      const score = roundScore(maxScore * metrics.rate);
      card.innerHTML = `<div><b>Điểm tiến độ tự động</b><span>70% SP đúng hạn + 30% số task đúng hạn</span></div><strong>${score.toFixed(2)} / ${Number(maxScore).toFixed(2)}</strong><small>SP: ${metrics.onTimePoints}/${metrics.committedPoints} · Task: ${metrics.onTimeTasks}/${metrics.tasks} · Mức đạt ${(metrics.rate * 100).toFixed(0)}%</small>`;
    }
    row.appendChild(card);
  }

  function recalculateDeliveryScore(memberId, group, criterionIndex) {
    const member = members.find(item => item.id === memberId);
    if (!member) return;
    const rows = [...document.querySelectorAll('#editor .criterion-child')];
    const row = rows[criterionIndex];
    const slider = row?.querySelector('input[data-score]');
    const title = row?.querySelector('.criterion-child-title')?.textContent || '';
    if (!row || !slider || !deliveryTitlePattern.test(personKey(title))) return;

    const record = state[memberId]?.[group] || {};
    const selected = record.taskLinks?.[criterionIndex] || [];
    const metrics = deliveryMetrics(selected);
    const maxScore = Number(slider.max || 0);
    renderMetric(row, metrics, maxScore);
    row.classList.toggle('delivery-auto-applied', metrics.complete);
    slider.disabled = !canEdit() || metrics.complete;

    state[memberId] ??= {};
    state[memberId][group] ??= {};
    state[memberId][group].deliveryMetrics ??= {};
    state[memberId][group].deliveryMetrics[criterionIndex] = metrics;
    if (metrics.complete) {
      const score = roundScore(maxScore * metrics.rate);
      state[memberId][group].scores ??= [];
      state[memberId][group].scores[criterionIndex] = score;
      slider.value = String(score);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
    localStorage.setItem(key(), JSON.stringify(state));
  }

  window.recalculateDeliveryScore = recalculateDeliveryScore;

  renderEditor = function renderEditorWithDeliveryScoring() {
    const output = baseRenderEditor();
    const member = members.find(item => item.id === selectedId);
    if (!member) return output;
    const group = evalGroup(member);
    document.querySelectorAll('#editor .criterion-child').forEach((row, index) => {
      const title = row.querySelector('.criterion-child-title')?.textContent || '';
      if (deliveryTitlePattern.test(personKey(title))) {
        recalculateDeliveryScore(member.id, group, index);
      }
    });
    return output;
  };

  if (selectedId) renderEditor();
})();
