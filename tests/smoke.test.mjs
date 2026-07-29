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

test('Jira task filters wire controls, hide non-matching rows and clear safely', async () => {
  const filters = await source('jira-task-filters.js');
  for (const control of ['jiraListTeam', 'jiraListAssignee', 'jiraListType', 'jiraListPriority', 'jiraListLabel', 'jiraListQuality']) {
    assert.match(filters, new RegExp(`#${control}`), `${control} filter is missing`);
  }
  assert.match(filters, /select\.onchange\s*=\s*filterRows/);
  assert.match(filters, /row\.hidden\s*=\s*hidden/);
  assert.match(filters, /row\.style\.display\s*=\s*hidden \? 'none' : ''/);
  assert.match(filters, /displayedAssignee/);
  assert.match(filters, /assigneeMatches/);
  assert.match(filters, /count\.textContent\s*=\s*`\$\{visible\}\/\$\{issues\.length\} task`/);
  assert.match(filters, /clearJiraListFilters/);
});

test('Jira sync filters build JQL from project, dates, sprint, assignee and advanced clauses', async () => {
  const filters = await source('jira-filters.js');
  for (const clause of ['project =', 'updated >=', 'updated <', 'sprint =', 'assignee =', 'filters.extra']) {
    assert.match(filters, new RegExp(clause.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${clause} filter is missing`);
  }
  assert.match(filters, /fetch\(`\$\{base\}\/api\/sync\?/);
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
