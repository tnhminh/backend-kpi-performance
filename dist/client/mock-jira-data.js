// Deterministic Jira Data Center-shaped fixture for local KPI testing.
(function installCompleteJiraMock() {
  const pad = value => String(value).padStart(3, '0');
  const date = (day, offset = 0) => `2026-07-${String(day + offset).padStart(2, '0')}`;

  function buildMockIssues() {
    let sequence = 1;
    const templates = [
      { type: 'Story', title: 'Implement feature theo acceptance criteria', points: 5, status: 'Done', deadline: 10, completed: 9 },
      { type: 'Bug', title: 'Fix production issue và regression test', points: 3, status: 'Done', deadline: 12, completed: 15 },
      { type: 'Task', title: 'Refactor và bổ sung monitoring', points: 2, status: 'In Progress', deadline: 18 },
      { type: 'Support', title: 'Hỗ trợ team liên quan xử lý incident', points: 0, status: 'Done', deadline: 20, completed: 19 },
      { type: 'Maintain', title: 'Theo dõi vận hành và cập nhật runbook', points: 1, status: 'Blocked' },
      { type: 'Story', title: 'Tích hợp API và bàn giao kỹ thuật', points: 8, status: 'Resolved', deadline: 24, completed: 23 }
    ];
    return members.flatMap((member, memberIndex) => templates.map((template, taskIndex) => {
      const key = `MOCK-BE-${pad(sequence++)}`;
      const createdDay = 1 + ((memberIndex * 2 + taskIndex) % 8);
      const issue = {
        key,
        title: `${template.title} · ${member.group}`,
        url: `http://jira.local/browse/${key}`,
        member,
        accountId: member.id,
        status: template.status,
        done: ['Done', 'Closed', 'Resolved'].includes(template.status),
        points: template.points,
        storyPoints: template.points,
        deadline: template.deadline ? date(template.deadline, memberIndex % 2) : null,
        completedAt: template.completed ? date(template.completed, memberIndex % 2) : null,
        resolvedAt: template.completed ? `${date(template.completed, memberIndex % 2)}T10:00:00+07:00` : null,
        issueType: template.type,
        priority: taskIndex === 1 ? 'High' : taskIndex === 4 ? 'Low' : 'Medium',
        labels: [`Sprint26`, `team-${member.group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`],
        projectKey: 'BE',
        sprint: 'Sprint 26',
        created: `${date(createdDay)}T09:00:00+07:00`,
        updated: `${date(template.completed || 28, memberIndex % 2)}T16:00:00+07:00`
      };
      return issue;
    }));
  }

  runJiraSimulation = function runCompleteJiraSimulation() {
    mockJiraTasks = buildMockIssues();
    renderJiraSim();
  };

  const baseSyncJiraSimulation = syncJiraSimulation;
  syncJiraSimulation = function syncCompleteJiraSimulation() {
    state.jiraIssues = mockJiraTasks.map(task => ({
      ...task,
      member: task.member.name,
      memberId: task.member.id,
      storyPoints: task.points,
      done: ['Done', 'Closed', 'Resolved'].includes(task.status)
    }));
    baseSyncJiraSimulation();
  };

  const baseRenderJiraSim = renderJiraSim;
  renderJiraSim = function renderCompleteJiraSimulation() {
    baseRenderJiraSim();
    const root = document.querySelector('#jiraSimRoot');
    if (!root || !mockJiraTasks.length) return;
    const missingPoints = mockJiraTasks.filter(task => !task.points).length;
    const missingDeadline = mockJiraTasks.filter(task => !task.deadline).length;
    const late = mockJiraTasks.filter(task => task.done && task.deadline && task.completedAt > task.deadline).length;
    const byType = [...new Set(mockJiraTasks.map(task => task.issueType))].map(type => `${type}: ${mockJiraTasks.filter(task => task.issueType === type).length}`).join(' · ');
    root.insertAdjacentHTML('beforeend', `<div class="mock-quality-summary"><b>Data quality mock</b><span>${byType}</span><span>${late} task hoàn thành trễ</span><span>${missingPoints} task thiếu Story Point</span><span>${missingDeadline} task thiếu deadline</span></div>`);
  };
})();
