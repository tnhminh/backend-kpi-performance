import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const source = async path => readFile(new URL(path, root), 'utf8');

test('all production scripts are loaded in deterministic order', async () => {
  const html = await source('index.html');
  const scripts = ['app.js', 'tour-fix.js', 'production-fixes.js', 'jira-mapping.js', 'jira-fields.js', 'motion-effects.js', 'production-suite.js', 'jira-filters.js', 'jira-task-filters.js'];
  let previous = -1;
  for (const script of scripts) {
    const index = html.indexOf(`src="${script}"`);
    assert.ok(index > previous, `${script} must be loaded after the previous script`);
    previous = index;
  }
});

test('production hardening suite includes RBAC, persistence and formula versioning', async () => {
  const suite = await source('production-suite.js');
  assert.match(suite, /productionCanAccess/);
  assert.match(suite, /\/api\/state/);
  assert.match(suite, /persistFormulaVersion/);
  assert.match(suite, /renderDataQualityDashboard/);
  assert.match(suite, /backend-kpi-motion/);
  assert.match(suite, /completion: \.30, effort: \.35, qualityKpi: \.25, predictability: \.10/);
});

test('member evaluation slider keeps the original state update handler', async () => {
  const app = await source('app.js');
  assert.match(app, /previousInputHandler=input\.oninput/);
  assert.match(app, /previousInputHandler\?\.\(\)/);
  assert.match(app, /state\[m\.id\]\[group\]\.scores/);
});

test('evaluation modal cannot be blocked or dimmed by the backdrop', async () => {
  const css = await source('styles.css');
  assert.match(css, /\.editor-modal-backdrop\{pointer-events:none!important;background:transparent!important;opacity:0!important\}/);
  assert.match(css, /\.editor-card\.editor-modal-open\{pointer-events:auto!important/);
});

test('Jira fields support multi-select, title fallback and color coding', async () => {
  const fields = await source('jira-fields.js');
  const css = await source('styles.css');
  assert.match(fields, /type="checkbox" data-jira-field/);
  assert.match(fields, /task\.title\|\|task\.summary/);
  for (const name of ['key', 'summary', 'member', 'issueType', 'status', 'priority', 'labels', 'storyPoints', 'deadline']) {
    assert.ok(css.includes(`.jira-field-${name}`), `missing color style for ${name}`);
  }
});

test('cross-team comparison shows the live fairness formula beside the ranking', async () => {
  const html = await source('index.html');
  const panel = await source('comparison-formula.js');
  const css = await source('styles.css');
  assert.match(html, /src="comparison-formula\.js"/);
  assert.match(panel, /Hoàn thành × 30%/);
  assert.match(panel, /Effort × 35%/);
  assert.match(panel, /KPI × 25%/);
  assert.match(panel, /Ổn định × 10%/);
  assert.match(panel, /Điểm tuyệt đối × 75%/);
  assert.match(panel, /Chỉ số team × 25%/);
  assert.match(panel, /workloadResult\(member\)/);
  assert.match(css, /#evaluationContent\.comparison-layout/);
});

test('Jira simulator can preview and persist Story Point autofill', async () => {
  const html = await source('index.html');
  const ui = await source('jira-storypoint-autofill.js');
  const server = await source('backend/server.js');
  const worker = await source('sites-worker.js');
  assert.match(html, /src="jira-storypoint-autofill\.js"/);
  assert.match(ui, /\/api\/jira\/autofill-story-points/);
  assert.match(ui, /dryRun/);
  assert.match(ui, /Auto-fill vào DB/);
  assert.match(server, /suggestedStoryPoints/);
  assert.match(server, /updateJiraIssues/);
  assert.match(worker, /\/api\/jira\/autofill-story-points/);
  assert.match(worker, /storyPointSource: 'auto-fill'/);
});

test('Jira task filters index data, preserve state and clear safely', async () => {
  const filters = await source('jira-task-filters.js');
  for (const control of ['jiraListTeam', 'jiraListAssignee', 'jiraListType', 'jiraListPriority', 'jiraListLabel', 'jiraListQuality']) {
    assert.match(filters, new RegExp(`#${control}`), `${control} filter is missing`);
  }
  assert.match(filters, /const indexedIssues = issues\.map/);
  assert.match(filters, /const membersById = new Map/);
  assert.match(filters, /const membersByName = new Map/);
  assert.match(filters, /searchTimer = setTimeout/);
  assert.match(filters, /}, 250\)/);
  assert.match(filters, /assigneeMatches/);
  assert.match(filters, /count\.textContent = `\$\{matches\.length\}\/\$\{issues\.length\} task`/);
  assert.match(filters, /clearJiraListFilters/);
});

test('Jira task list renders only the current filtered page', async () => {
  const filters = await source('jira-task-filters.js');
  const fields = await source('jira-fields.js');
  for (const control of ['jiraPageSize', 'jiraPagePrev', 'jiraPageNext']) {
    assert.match(filters, new RegExp(`#${control}`), `${control} pagination control is missing`);
  }
  assert.match(filters, /Math\.ceil\(matches\.length \/ listState\.pageSize\)/);
  assert.match(filters, /matches\.slice\(start, start \+ listState\.pageSize\)/);
  assert.match(filters, /list\.innerHTML = pageIssues\.length/);
  assert.match(filters, /jiraTaskRowHtml\(issue, selectedFields\)/);
  assert.match(fields, /initialTasks=tasks\.slice\(0,20\)/);
});

test('Jira sync filters build JQL from project, dates, sprint, assignee and advanced clauses', async () => {
  const filters = await source('jira-filters.js');
  for (const clause of ['project =', 'updated >=', 'updated <', 'sprint =', 'assignee =', 'filters.extra']) {
    assert.match(filters, new RegExp(clause.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${clause} filter is missing`);
  }
  assert.match(filters, /fetch\(`\$\{base\}\/api\/sync\?/);
});

test('Jira sync persists issues and reloads the latest stored snapshot', async () => {
  const server = await source('backend/server.js');
  const postgres = await source('backend/store-postgres.js');
  const sqlite = await source('backend/store.js');
  const filters = await source('jira-filters.js');
  assert.match(server, /store\.upsertJiraIssues\(result\.issues, syncKey\)/);
  assert.match(server, /\/api\/jira\/stored-issues/);
  assert.match(postgres, /CREATE TABLE IF NOT EXISTS jira_issues/);
  assert.match(postgres, /ON CONFLICT\(issue_key\) DO UPDATE/);
  assert.match(sqlite, /CREATE TABLE IF NOT EXISTS jira_issues/);
  assert.match(filters, /\/api\/jira\/stored-issues/);
  assert.match(filters, /state\.jiraIssues = data\.issues/);
});

test('evaluation task picker uses stored Jira tasks mapped to the selected member', async () => {
  const html = await source('index.html');
  const dockerfile = await source('infra/Dockerfile.web');
  const picker = await source('evaluation-tasks.js');
  assert.match(html, /src="evaluation-tasks\.js"/);
  assert.match(dockerfile, /evaluation-tasks\.js/);
  assert.match(picker, /state\.jiraIssues/);
  assert.match(picker, /jiraTaskMember\(task\)/);
  assert.match(picker, /taskBelongsToMember/);
  assert.match(picker, /data-task-key/);
  assert.match(picker, /refreshTaskPickers/);
});

test('quick guide covers every current product module and routes before highlighting', async () => {
  const tour = await source('tour-fix.js');
  const modules = ['dashboard', 'evaluation', 'comparison', 'tasks', 'jiraTasks', 'timeline', 'demo', 'formula', 'audit', 'criteria', 'settings'];
  for (const module of modules) {
    assert.ok(tour.includes(`module: '${module}'`), `quick guide is missing ${module}`);
  }
  assert.match(tour, /setModule\(step\.module\)/);
  assert.match(tour, /BƯỚC \$\{tourIndex \+ 1\} \/ \$\{guidedTourSteps\.length\}/);
  assert.match(tour, /prefers-reduced-motion/);
  assert.match(tour, /event\.key === 'Escape'/);
  assert.match(tour, /tourIndex < guidedTourSteps\.length - 1/);
});

test('backend and frontend entrypoints exist', async () => {
  const files = ['backend/server.js', 'backend/package.json', 'app.js', 'styles.css'];
  for (const file of files) {
    const content = await readFile(new URL(file, root), 'utf8');
    assert.ok(content.length > 100, `${file} should not be empty`);
  }
});

test('Sites worker exposes Jira sync, stored issues and D1 persistence', async () => {
  const worker = await source('sites-worker.js');
  const hosting = JSON.parse(await source('.openai/hosting.json'));
  const migration = await source('drizzle/0000_public_backend.sql');
  assert.equal(hosting.d1, 'DB');
  assert.match(worker, /\/api\/jira\/stored-issues/);
  assert.match(worker, /\/api\/jira\/import/);
  assert.match(worker, /\/api\/sync/);
  assert.match(worker, /db\.batch/);
  assert.match(worker, /JIRA_TOKEN/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS jira_issues/);
});

test('deployed frontend migrates stale local backend ports to same-origin API', async () => {
  const app = await source('app.js');
  assert.match(app, /localhost:878\[78\]/);
  assert.match(app, /localStorage\.setItem\('backend-kpi-api-base',defaultBackendApi\)/);
});

test('evaluation sliders update formulas without rerendering the modal', async () => {
  const html = await source('index.html');
  const formulas = await source('evaluation-formulas.js');
  assert.match(html, /src="evaluation-formulas\.js"/);
  assert.match(formulas, /slider\.onchange = \(\) =>/);
  assert.match(formulas, /updateFormulas\(\)/);
  assert.match(formulas, /--score-pct/);
  assert.match(formulas, /Điểm tiêu chí con = Mức đạt \(%\) × Trọng số/);
  assert.match(formulas, /criterion-group-live/);
  assert.doesNotMatch(formulas, /slider\.onchange[\s\S]{0,400}\brender\(\)/);
});

test('evaluation slider uses a custom percentage track', async () => {
  const css = await source('styles.css');
  assert.match(css, /::-webkit-slider-runnable-track/);
  assert.match(css, /var\(--score-pct,0%\)/);
  assert.match(css, /::-moz-range-progress/);
});

test('delivery scoring combines on-time Story Point and task completion', async () => {
  const html = await source('index.html');
  const scoring = await source('delivery-scoring.js');
  const dockerfile = await source('infra/Dockerfile.web');
  assert.match(html, /src="delivery-scoring\.js"/);
  assert.match(dockerfile, /delivery-scoring\.js/);
  assert.match(scoring, /pointRate \* \.7 \+ taskRate \* \.3/);
  assert.match(scoring, /missingPoints/);
  assert.match(scoring, /missingDeadline/);
  assert.match(scoring, /resolvedAt \|\| task\.updated/);
  assert.match(scoring, /state\[memberId\]\[group\]\.deliveryMetrics/);
  assert.match(scoring, /slider\.disabled = !canEdit\(\) \|\| metrics\.complete/);
  assert.match(scoring, /backend-kpi-scoring-version-/);
  assert.match(scoring, /V1 · Chấm thủ công/);
  assert.match(scoring, /V2 · Story Point 70\/30/);
  assert.match(scoring, /record\.scoringVersions/);
  assert.match(scoring, /switchScoringVersion/);
});
